import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Track } from '../types';
import { cleanTrackTitle } from '../utils/formatters';
import { databaseService } from './databaseService';

const SUPPORTED_MIME_TYPES = [
  'audio/*',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/m4a',
  'audio/x-m4a',
  'audio/flac',
  'audio/x-flac',
  'audio/aac',
  'audio/mp4',
  'audio/ogg',
];

export const fileImportService = {
  async pickAudioFiles(): Promise<{ importedCount: number; tracks: Track[] }> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: SUPPORTED_MIME_TYPES,
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { importedCount: 0, tracks: [] };
      }

      const importedTracks: Track[] = [];

      for (const asset of result.assets) {
        const { uri, name, size, mimeType } = asset;
        const { title, artist } = cleanTrackTitle(name);

        // Derive format from name or mime
        const ext = name.split('.').pop()?.toLowerCase() || 'mp3';
        
        let duration = 0;
        try {
          // Probe actual audio file duration using expo-av without starting playback
          const { sound, status } = await Audio.Sound.createAsync(
            { uri },
            { shouldPlay: false }
          );
          if (status.isLoaded && status.durationMillis) {
            duration = status.durationMillis;
          }
          await sound.unloadAsync();
        } catch {
          // Fallback duration if probe failed
          duration = 180000;
        }

        const id = 'trk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

        const newTrack: Track = {
          id,
          title,
          artist,
          album: 'Imported Music',
          duration,
          uri,
          artworkUri: null,
          fileSize: size,
          format: ext,
          dateAdded: Date.now(),
          playCount: 0,
          lastPlayed: null,
        };

        importedTracks.push(newTrack);
      }

      if (importedTracks.length > 0) {
        await databaseService.saveTracks(importedTracks);
      }

      return {
        importedCount: importedTracks.length,
        tracks: importedTracks,
      };
    } catch (err) {
      console.error('Error importing audio files:', err);
      throw err;
    }
  },

  async verifyTrackAccessible(track: Track): Promise<boolean> {
    try {
      const info = await FileSystem.getInfoAsync(track.uri);
      return info.exists;
    } catch {
      return false;
    }
  },
};
