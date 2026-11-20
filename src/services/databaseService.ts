import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Track, Playlist } from '../types';

let dbInstance: SQLiteDatabase | null = null;

// Keys for Web / AsyncStorage fallback
const STORAGE_KEYS = {
  TRACKS: '@mypod_tracks_web',
  PLAYLISTS: '@mypod_playlists_web',
  FAVORITES: '@mypod_favorites_web',
  HISTORY: '@mypod_history_web',
};

async function getDatabase(): Promise<SQLiteDatabase | null> {
  if (Platform.OS === 'web') {
    return null; // Use AsyncStorage fallback on web
  }

  if (!dbInstance) {
    const SQLite = require('expo-sqlite');
    dbInstance = await SQLite.openDatabaseAsync('mypod.db');
    if (dbInstance) {
      await initDatabase(dbInstance);
    }
  }
  return dbInstance;
}

async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      album TEXT NOT NULL,
      duration INTEGER NOT NULL,
      uri TEXT NOT NULL UNIQUE,
      artworkUri TEXT,
      fileSize INTEGER,
      format TEXT,
      dateAdded INTEGER NOT NULL,
      playCount INTEGER NOT NULL DEFAULT 0,
      lastPlayed INTEGER
    );

    CREATE TABLE IF NOT EXISTS favorites (
      track_id TEXT PRIMARY KEY NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS playlist_tracks (
      playlist_id TEXT NOT NULL,
      track_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      PRIMARY KEY (playlist_id, track_id),
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      track_id TEXT NOT NULL,
      played_at INTEGER NOT NULL,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
    );
  `);
}

// Helpers for Web AsyncStorage fallback
async function getWebItem<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const item = await AsyncStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

async function setWebItem(key: string, value: any): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Storage set error:', e);
  }
}

export const databaseService = {
  async init(): Promise<void> {
    if (Platform.OS !== 'web') {
      await getDatabase();
    }
  },

  async saveTrack(track: Track): Promise<void> {
    if (Platform.OS === 'web') {
      const tracks = await getWebItem<Track[]>(STORAGE_KEYS.TRACKS, []);
      const idx = tracks.findIndex((t) => t.id === track.id || t.uri === track.uri);
      if (idx >= 0) {
        tracks[idx] = { ...tracks[idx], ...track };
      } else {
        tracks.push(track);
      }
      await setWebItem(STORAGE_KEYS.TRACKS, tracks);
      return;
    }

    const db = await getDatabase();
    if (!db) return;
    await db.runAsync(
      `INSERT INTO tracks (id, title, artist, album, duration, uri, artworkUri, fileSize, format, dateAdded, playCount, lastPlayed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title=excluded.title,
         artist=excluded.artist,
         album=excluded.album,
         duration=excluded.duration,
         uri=excluded.uri,
         artworkUri=excluded.artworkUri,
         fileSize=excluded.fileSize,
         format=excluded.format;`,
      [
        track.id,
        track.title,
        track.artist,
        track.album,
        track.duration,
        track.uri,
        track.artworkUri || null,
        track.fileSize || 0,
        track.format || 'mp3',
        track.dateAdded || Date.now(),
        track.playCount || 0,
        track.lastPlayed || null,
      ]
    );
  },

  async saveTracks(newTracks: Track[]): Promise<void> {
    if (Platform.OS === 'web') {
      const tracks = await getWebItem<Track[]>(STORAGE_KEYS.TRACKS, []);
      for (const track of newTracks) {
        const idx = tracks.findIndex((t) => t.id === track.id || t.uri === track.uri);
        if (idx >= 0) {
          tracks[idx] = { ...tracks[idx], ...track };
        } else {
          tracks.push(track);
        }
      }
      await setWebItem(STORAGE_KEYS.TRACKS, tracks);
      return;
    }

    const db = await getDatabase();
    if (!db) return;
    for (const track of newTracks) {
      await db.runAsync(
        `INSERT INTO tracks (id, title, artist, album, duration, uri, artworkUri, fileSize, format, dateAdded, playCount, lastPlayed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(uri) DO UPDATE SET
           title=excluded.title,
           artist=excluded.artist,
           album=excluded.album,
           duration=excluded.duration;`,
        [
          track.id,
          track.title,
          track.artist,
          track.album,
          track.duration,
          track.uri,
          track.artworkUri || null,
          track.fileSize || 0,
          track.format || 'mp3',
          track.dateAdded || Date.now(),
          track.playCount || 0,
          track.lastPlayed || null,
        ]
      );
    }
  },

  async getAllTracks(): Promise<Track[]> {
    if (Platform.OS === 'web') {
      const tracks = await getWebItem<Track[]>(STORAGE_KEYS.TRACKS, []);
      const favs = new Set(await getWebItem<string[]>(STORAGE_KEYS.FAVORITES, []));
      return tracks
        .map((t) => ({ ...t, isFavorite: favs.has(t.id) }))
        .sort((a, b) => a.title.localeCompare(b.title));
    }

    const db = await getDatabase();
    if (!db) return [];
    const rows = await db.getAllAsync<{
      id: string;
      title: string;
      artist: string;
      album: string;
      duration: number;
      uri: string;
      artworkUri: string | null;
      fileSize: number;
      format: string;
      dateAdded: number;
      playCount: number;
      lastPlayed: number | null;
      isFav: number;
    }>(`
      SELECT t.*, CASE WHEN f.track_id IS NOT NULL THEN 1 ELSE 0 END as isFav
      FROM tracks t
      LEFT JOIN favorites f ON t.id = f.track_id
      ORDER BY t.title COLLATE NOCASE ASC;
    `);

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      artist: r.artist,
      album: r.album,
      duration: r.duration,
      uri: r.uri,
      artworkUri: r.artworkUri,
      fileSize: r.fileSize,
      format: r.format,
      dateAdded: r.dateAdded,
      playCount: r.playCount,
      lastPlayed: r.lastPlayed,
      isFavorite: r.isFav === 1,
    }));
  },

  async getTrackById(id: string): Promise<Track | null> {
    if (Platform.OS === 'web') {
      const tracks = await this.getAllTracks();
      return tracks.find((t) => t.id === id) || null;
    }

    const db = await getDatabase();
    if (!db) return null;
    const row = await db.getFirstAsync<{
      id: string;
      title: string;
      artist: string;
      album: string;
      duration: number;
      uri: string;
      artworkUri: string | null;
      fileSize: number;
      format: string;
      dateAdded: number;
      playCount: number;
      lastPlayed: number | null;
      isFav: number;
    }>(
      `SELECT t.*, CASE WHEN f.track_id IS NOT NULL THEN 1 ELSE 0 END as isFav
       FROM tracks t
       LEFT JOIN favorites f ON t.id = f.track_id
       WHERE t.id = ?;`,
      [id]
    );

    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      artist: row.artist,
      album: row.album,
      duration: row.duration,
      uri: row.uri,
      artworkUri: row.artworkUri,
      fileSize: row.fileSize,
      format: row.format,
      dateAdded: row.dateAdded,
      playCount: row.playCount,
      lastPlayed: row.lastPlayed,
      isFavorite: row.isFav === 1,
    };
  },

  async toggleFavorite(trackId: string): Promise<boolean> {
    if (Platform.OS === 'web') {
      const favs = await getWebItem<string[]>(STORAGE_KEYS.FAVORITES, []);
      const idx = favs.indexOf(trackId);
      if (idx >= 0) {
        favs.splice(idx, 1);
        await setWebItem(STORAGE_KEYS.FAVORITES, favs);
        return false;
      } else {
        favs.push(trackId);
        await setWebItem(STORAGE_KEYS.FAVORITES, favs);
        return true;
      }
    }

    const db = await getDatabase();
    if (!db) return false;
    const existing = await db.getFirstAsync<{ track_id: string }>(
      'SELECT track_id FROM favorites WHERE track_id = ?;',
      [trackId]
    );

    if (existing) {
      await db.runAsync('DELETE FROM favorites WHERE track_id = ?;', [trackId]);
      return false;
    } else {
      await db.runAsync('INSERT INTO favorites (track_id, created_at) VALUES (?, ?);', [
        trackId,
        Date.now(),
      ]);
      return true;
    }
  },

  async getFavoriteTracks(): Promise<Track[]> {
    if (Platform.OS === 'web') {
      const tracks = await this.getAllTracks();
      return tracks.filter((t) => t.isFavorite);
    }

    const db = await getDatabase();
    if (!db) return [];
    const rows = await db.getAllAsync<{
      id: string;
      title: string;
      artist: string;
      album: string;
      duration: number;
      uri: string;
      artworkUri: string | null;
      fileSize: number;
      format: string;
      dateAdded: number;
      playCount: number;
      lastPlayed: number | null;
    }>(`
      SELECT t.*
      FROM tracks t
      JOIN favorites f ON t.id = f.track_id
      ORDER BY f.created_at DESC;
    `);

    return rows.map((r) => ({
      ...r,
      isFavorite: true,
    }));
  },

  async recordPlay(trackId: string): Promise<void> {
    if (Platform.OS === 'web') {
      const history = await getWebItem<{ track_id: string; played_at: number }[]>(
        STORAGE_KEYS.HISTORY,
        []
      );
      history.unshift({ track_id: trackId, played_at: Date.now() });
      await setWebItem(STORAGE_KEYS.HISTORY, history.slice(0, 100));

      const tracks = await getWebItem<Track[]>(STORAGE_KEYS.TRACKS, []);
      const trk = tracks.find((t) => t.id === trackId);
      if (trk) {
        trk.playCount = (trk.playCount || 0) + 1;
        trk.lastPlayed = Date.now();
        await setWebItem(STORAGE_KEYS.TRACKS, tracks);
      }
      return;
    }

    const db = await getDatabase();
    if (!db) return;
    const now = Date.now();
    await db.runAsync(
      'UPDATE tracks SET playCount = playCount + 1, lastPlayed = ? WHERE id = ?;',
      [now, trackId]
    );
    await db.runAsync('INSERT INTO history (track_id, played_at) VALUES (?, ?);', [trackId, now]);
  },

  async getRecentlyPlayed(limit = 30): Promise<Track[]> {
    if (Platform.OS === 'web') {
      const history = await getWebItem<{ track_id: string; played_at: number }[]>(
        STORAGE_KEYS.HISTORY,
        []
      );
      const all = await this.getAllTracks();
      const trackMap = new Map(all.map((t) => [t.id, t]));
      const seen = new Set<string>();
      const result: Track[] = [];

      for (const item of history) {
        if (!seen.has(item.track_id) && trackMap.has(item.track_id)) {
          seen.add(item.track_id);
          result.push(trackMap.get(item.track_id)!);
          if (result.length >= limit) break;
        }
      }
      return result;
    }

    const db = await getDatabase();
    if (!db) return [];
    const rows = await db.getAllAsync<{
      id: string;
      title: string;
      artist: string;
      album: string;
      duration: number;
      uri: string;
      artworkUri: string | null;
      fileSize: number;
      format: string;
      dateAdded: number;
      playCount: number;
      lastPlayed: number | null;
      isFav: number;
    }>(
      `SELECT DISTINCT t.*, CASE WHEN f.track_id IS NOT NULL THEN 1 ELSE 0 END as isFav
       FROM history h
       JOIN tracks t ON h.track_id = t.id
       LEFT JOIN favorites f ON t.id = f.track_id
       ORDER BY h.played_at DESC
       LIMIT ?;`,
      [limit]
    );

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      artist: r.artist,
      album: r.album,
      duration: r.duration,
      uri: r.uri,
      artworkUri: r.artworkUri,
      fileSize: r.fileSize,
      format: r.format,
      dateAdded: r.dateAdded,
      playCount: r.playCount,
      lastPlayed: r.lastPlayed,
      isFavorite: r.isFav === 1,
    }));
  },

  async getPlaylists(): Promise<Playlist[]> {
    if (Platform.OS === 'web') {
      return await getWebItem<Playlist[]>(STORAGE_KEYS.PLAYLISTS, []);
    }

    const db = await getDatabase();
    if (!db) return [];
    const rows = await db.getAllAsync<{
      id: string;
      name: string;
      created_at: number;
      trackCount: number;
    }>(`
      SELECT p.*, COUNT(pt.track_id) as trackCount
      FROM playlists p
      LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
      GROUP BY p.id
      ORDER BY p.name COLLATE NOCASE ASC;
    `);

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.created_at,
      trackCount: r.trackCount,
    }));
  },

  async createPlaylist(name: string): Promise<Playlist> {
    const id = 'pl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const createdAt = Date.now();

    if (Platform.OS === 'web') {
      const playlists = await getWebItem<Playlist[]>(STORAGE_KEYS.PLAYLISTS, []);
      const newPl: Playlist = { id, name, createdAt, trackCount: 0 };
      playlists.push(newPl);
      await setWebItem(STORAGE_KEYS.PLAYLISTS, playlists);
      return newPl;
    }

    const db = await getDatabase();
    if (!db) return { id, name, createdAt, trackCount: 0 };
    await db.runAsync('INSERT INTO playlists (id, name, created_at) VALUES (?, ?, ?);', [
      id,
      name,
      createdAt,
    ]);
    return { id, name, createdAt, trackCount: 0 };
  },

  async deletePlaylist(id: string): Promise<void> {
    if (Platform.OS === 'web') {
      const playlists = await getWebItem<Playlist[]>(STORAGE_KEYS.PLAYLISTS, []);
      await setWebItem(
        STORAGE_KEYS.PLAYLISTS,
        playlists.filter((p) => p.id !== id)
      );
      return;
    }

    const db = await getDatabase();
    if (!db) return;
    await db.runAsync('DELETE FROM playlists WHERE id = ?;', [id]);
    await db.runAsync('DELETE FROM playlist_tracks WHERE playlist_id = ?;', [id]);
  },

  async addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
    if (Platform.OS === 'web') {
      const map = await getWebItem<Record<string, string[]>>('@mypod_pl_tracks_web', {});
      if (!map[playlistId]) map[playlistId] = [];
      if (!map[playlistId].includes(trackId)) {
        map[playlistId].push(trackId);
        await setWebItem('@mypod_pl_tracks_web', map);
      }
      return;
    }

    const db = await getDatabase();
    if (!db) return;
    const countRow = await db.getFirstAsync<{ pos: number }>(
      'SELECT COALESCE(MAX(position), 0) + 1 as pos FROM playlist_tracks WHERE playlist_id = ?;',
      [playlistId]
    );
    const nextPos = countRow ? countRow.pos : 1;
    await db.runAsync(
      `INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?);`,
      [playlistId, trackId, nextPos]
    );
  },

  async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
    if (Platform.OS === 'web') {
      const map = await getWebItem<Record<string, string[]>>('@mypod_pl_tracks_web', {});
      if (map[playlistId]) {
        map[playlistId] = map[playlistId].filter((t) => t !== trackId);
        await setWebItem('@mypod_pl_tracks_web', map);
      }
      return;
    }

    const db = await getDatabase();
    if (!db) return;
    await db.runAsync(
      'DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?;',
      [playlistId, trackId]
    );
  },

  async getPlaylistTracks(playlistId: string): Promise<Track[]> {
    if (Platform.OS === 'web') {
      const map = await getWebItem<Record<string, string[]>>('@mypod_pl_tracks_web', {});
      const trackIds = map[playlistId] || [];
      const all = await this.getAllTracks();
      const trackMap = new Map(all.map((t) => [t.id, t]));
      return trackIds.map((id) => trackMap.get(id)).filter(Boolean) as Track[];
    }

    const db = await getDatabase();
    if (!db) return [];
    const rows = await db.getAllAsync<{
      id: string;
      title: string;
      artist: string;
      album: string;
      duration: number;
      uri: string;
      artworkUri: string | null;
      fileSize: number;
      format: string;
      dateAdded: number;
      playCount: number;
      lastPlayed: number | null;
      isFav: number;
    }>(
      `SELECT t.*, CASE WHEN f.track_id IS NOT NULL THEN 1 ELSE 0 END as isFav
       FROM playlist_tracks pt
       JOIN tracks t ON pt.track_id = t.id
       LEFT JOIN favorites f ON t.id = f.track_id
       WHERE pt.playlist_id = ?
       ORDER BY pt.position ASC;`,
      [playlistId]
    );

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      artist: r.artist,
      album: r.album,
      duration: r.duration,
      uri: r.uri,
      artworkUri: r.artworkUri,
      fileSize: r.fileSize,
      format: r.format,
      dateAdded: r.dateAdded,
      playCount: r.playCount,
      lastPlayed: r.lastPlayed,
      isFavorite: r.isFav === 1,
    }));
  },

  async deleteTrack(id: string): Promise<void> {
    if (Platform.OS === 'web') {
      const tracks = await getWebItem<Track[]>(STORAGE_KEYS.TRACKS, []);
      await setWebItem(
        STORAGE_KEYS.TRACKS,
        tracks.filter((t) => t.id !== id)
      );
      return;
    }

    const db = await getDatabase();
    if (!db) return;
    await db.runAsync('DELETE FROM tracks WHERE id = ?;', [id]);
    await db.runAsync('DELETE FROM favorites WHERE track_id = ?;', [id]);
    await db.runAsync('DELETE FROM playlist_tracks WHERE track_id = ?;', [id]);
    await db.runAsync('DELETE FROM history WHERE track_id = ?;', [id]);
  },

  async clearLibrary(): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(STORAGE_KEYS.TRACKS);
      await AsyncStorage.removeItem(STORAGE_KEYS.FAVORITES);
      await AsyncStorage.removeItem(STORAGE_KEYS.PLAYLISTS);
      await AsyncStorage.removeItem(STORAGE_KEYS.HISTORY);
      await AsyncStorage.removeItem('@mypod_pl_tracks_web');
      return;
    }

    const db = await getDatabase();
    if (!db) return;
    await db.execAsync(`
      DELETE FROM history;
      DELETE FROM playlist_tracks;
      DELETE FROM favorites;
      DELETE FROM tracks;
    `);
  },
};
