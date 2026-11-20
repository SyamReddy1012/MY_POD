import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Track, Playlist, ScreenType, PlayerSettings, ThemeColors, ThemeId } from '../types';
import { THEMES } from '../utils/theme';
import { databaseService } from '../services/databaseService';
import { audioService, PlaybackState } from '../services/audioService';
import { fileImportService } from '../services/fileImportService';
import { storageService } from '../services/storageService';
import { triggerWheelTickHaptic, triggerButtonPressHaptic, triggerSuccessHaptic } from '../utils/haptics';

interface ScreenHistoryItem {
  screen: ScreenType;
  params?: any;
  selectedIndex: number;
}

interface MusicPlayerContextType {
  // Navigation
  currentScreen: ScreenType;
  screenParams: any;
  selectedIndex: number;
  setSelectedIndex: (idx: number) => void;
  navigateTo: (screen: ScreenType, params?: any) => void;
  goBack: () => void;
  toggleNowPlaying: () => void;
  wheelStep: (direction: 1 | -1) => void;
  wheelPressCenter: () => void;
  registerCenterAction: (action: (() => void) | null) => void;

  // Library & Content
  tracks: Track[];
  albums: { name: string; artist: string; trackCount: number; artworkUri?: string | null }[];
  artists: { name: string; trackCount: number }[];
  playlists: Playlist[];
  favorites: Track[];
  recentlyPlayed: Track[];
  isLoading: boolean;
  refreshLibrary: () => Promise<void>;
  importMusic: () => Promise<number>;

  // Playback
  playbackState: PlaybackState;
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  nextTrack: () => Promise<void>;
  prevTrack: () => Promise<void>;
  seekTo: (millis: number) => Promise<void>;
  adjustVolume: (delta: number) => Promise<void>;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleFavorite: (trackId: string) => Promise<boolean>;

  // Playlists
  createPlaylist: (name: string) => Promise<Playlist>;
  deletePlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  getPlaylistTracks: (playlistId: string) => Promise<Track[]>;

  // Settings & Theme
  settings: PlayerSettings;
  theme: ThemeColors;
  updateSettings: (newSettings: Partial<PlayerSettings>) => Promise<void>;
  setThemeId: (themeId: ThemeId) => Promise<void>;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | null>(null);

export const MusicPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('library');
  const [screenParams, setScreenParams] = useState<any>(null);
  const [screenStack, setScreenStack] = useState<ScreenHistoryItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [playbackState, setPlaybackState] = useState<PlaybackState>(audioService.getState());
  const [settings, setSettings] = useState<PlayerSettings>({
    theme: 'silver',
    wheelHaptics: true,
    wheelSound: true,
    wheelSensitivity: 'medium',
    wheelActionMode: 'scroll',
  });

  const centerActionRef = useRef<(() => void) | null>(null);

  const theme = useMemo(() => THEMES[settings.theme] || THEMES.silver, [settings.theme]);

  // Subscribe to audio changes
  useEffect(() => {
    const unsub = audioService.subscribe((state) => {
      setPlaybackState(state);
    });
    return unsub;
  }, []);

  // Initialize DB, load tracks & settings
  const refreshLibrary = useCallback(async () => {
    try {
      await databaseService.init();
      const all = await databaseService.getAllTracks();
      const favs = await databaseService.getFavoriteTracks();
      const rec = await databaseService.getRecentlyPlayed(30);
      const pls = await databaseService.getPlaylists();

      setTracks(all);
      setFavorites(favs);
      setRecentlyPlayed(rec);
      setPlaylists(pls);

      // Synchronize audio queue and shuffle cycles with current library state
      audioService.syncLibraryTracks(all);
    } catch (e) {
      console.error('Error refreshing library:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await databaseService.init();
      await audioService.initAudioMode();
      const savedSettings = await storageService.getSettings();
      setSettings(savedSettings);
      await refreshLibrary();
    })();
  }, [refreshLibrary]);

  // Derived albums & artists
  const albums = useMemo(() => {
    const map = new Map<string, { name: string; artist: string; trackCount: number; artworkUri?: string | null }>();
    tracks.forEach((t) => {
      const albName = t.album || 'Unknown Album';
      const key = `${albName}_${t.artist}`;
      if (!map.has(key)) {
        map.set(key, {
          name: albName,
          artist: t.artist || 'Unknown Artist',
          trackCount: 1,
          artworkUri: t.artworkUri,
        });
      } else {
        const item = map.get(key)!;
        item.trackCount += 1;
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks]);

  const artists = useMemo(() => {
    const map = new Map<string, number>();
    tracks.forEach((t) => {
      const art = t.artist || 'Unknown Artist';
      map.set(art, (map.get(art) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, trackCount]) => ({ name, trackCount }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks]);

  // Navigation functions
  const navigateTo = useCallback(
    (screen: ScreenType, params?: any) => {
      setScreenStack((prev) => [...prev, { screen: currentScreen, params: screenParams, selectedIndex }]);
      setCurrentScreen(screen);
      setScreenParams(params || null);
      setSelectedIndex(0);
      centerActionRef.current = null;
      if (settings.wheelHaptics) triggerButtonPressHaptic();
    },
    [currentScreen, screenParams, selectedIndex, settings.wheelHaptics]
  );

  const goBack = useCallback(() => {
    if (settings.wheelHaptics) triggerButtonPressHaptic();
    centerActionRef.current = null;
    if (screenStack.length === 0) {
      if (currentScreen !== 'library') {
        setCurrentScreen('library');
        setSelectedIndex(0);
      }
      return;
    }
    const previous = screenStack[screenStack.length - 1];
    setScreenStack((prev) => prev.slice(0, prev.length - 1));
    setCurrentScreen(previous.screen);
    setScreenParams(previous.params || null);
    setSelectedIndex(previous.selectedIndex);
  }, [screenStack, currentScreen, settings.wheelHaptics]);

  const toggleNowPlaying = useCallback(() => {
    if (settings.wheelHaptics) triggerButtonPressHaptic();
    if (currentScreen === 'now_playing') {
      goBack();
    } else {
      navigateTo('now_playing');
    }
  }, [currentScreen, goBack, navigateTo, settings.wheelHaptics]);

  // Wheel step (clockwise = 1, counter-clockwise = -1)
  const wheelStep = useCallback(
    (direction: 1 | -1) => {
      if (settings.wheelHaptics) triggerWheelTickHaptic();

      if (currentScreen === 'now_playing' || settings.wheelActionMode === 'volume') {
        audioService.adjustVolume(direction * 0.05);
      } else {
        setSelectedIndex((prev) => Math.max(0, prev + direction));
      }
    },
    [currentScreen, settings.wheelActionMode, settings.wheelHaptics]
  );

  const registerCenterAction = useCallback((action: (() => void) | null) => {
    centerActionRef.current = action;
  }, []);

  // Wheel center press: dedicated Play/Pause
  const wheelPressCenter = useCallback(() => {
    if (settings.wheelHaptics) triggerButtonPressHaptic();
    audioService.togglePlayPause();
  }, [settings.wheelHaptics]);

  // Playback helpers
  const playTrack = useCallback(
    async (track: Track, newQueue?: Track[]) => {
      const q = newQueue || tracks;
      const idx = q.findIndex((t) => t.id === track.id);
      await audioService.setQueue(q, idx >= 0 ? idx : 0, true);
      if (currentScreen !== 'now_playing') {
        navigateTo('now_playing');
      }
      await refreshLibrary();
    },
    [tracks, currentScreen, navigateTo, refreshLibrary]
  );

  const togglePlayPause = useCallback(async () => {
    if (settings.wheelHaptics) triggerButtonPressHaptic();
    await audioService.togglePlayPause();
  }, [settings.wheelHaptics]);

  const nextTrack = useCallback(async () => {
    if (settings.wheelHaptics) triggerButtonPressHaptic();
    await audioService.next();
  }, [settings.wheelHaptics]);

  const prevTrack = useCallback(async () => {
    if (settings.wheelHaptics) triggerButtonPressHaptic();
    await audioService.previous();
  }, [settings.wheelHaptics]);

  const seekTo = useCallback(async (millis: number) => {
    await audioService.seekTo(millis);
  }, []);

  const adjustVolume = useCallback(async (delta: number) => {
    await audioService.adjustVolume(delta);
  }, []);

  const toggleShuffle = useCallback(() => {
    if (settings.wheelHaptics) triggerButtonPressHaptic();
    audioService.toggleShuffle();
  }, [settings.wheelHaptics]);

  const cycleRepeat = useCallback(() => {
    if (settings.wheelHaptics) triggerButtonPressHaptic();
    audioService.cycleRepeat();
  }, [settings.wheelHaptics]);

  const toggleFavorite = useCallback(
    async (trackId: string): Promise<boolean> => {
      const isFav = await databaseService.toggleFavorite(trackId);
      if (settings.wheelHaptics) triggerSuccessHaptic();
      await refreshLibrary();
      return isFav;
    },
    [refreshLibrary, settings.wheelHaptics]
  );

  // Import local music
  const importMusic = useCallback(async (): Promise<number> => {
    const result = await fileImportService.pickAudioFiles();
    if (result.importedCount > 0) {
      if (settings.wheelHaptics) triggerSuccessHaptic();
      await refreshLibrary();
    }
    return result.importedCount;
  }, [refreshLibrary, settings.wheelHaptics]);

  // Playlist handlers
  const createPlaylist = useCallback(
    async (name: string): Promise<Playlist> => {
      const pl = await databaseService.createPlaylist(name);
      await refreshLibrary();
      return pl;
    },
    [refreshLibrary]
  );

  const deletePlaylist = useCallback(
    async (id: string): Promise<void> => {
      await databaseService.deletePlaylist(id);
      await refreshLibrary();
    },
    [refreshLibrary]
  );

  const addTrackToPlaylist = useCallback(
    async (playlistId: string, trackId: string): Promise<void> => {
      await databaseService.addTrackToPlaylist(playlistId, trackId);
      await refreshLibrary();
    },
    [refreshLibrary]
  );

  const removeTrackFromPlaylist = useCallback(
    async (playlistId: string, trackId: string): Promise<void> => {
      await databaseService.removeTrackFromPlaylist(playlistId, trackId);
      await refreshLibrary();
    },
    [refreshLibrary]
  );

  const getPlaylistTracks = useCallback(async (playlistId: string): Promise<Track[]> => {
    return await databaseService.getPlaylistTracks(playlistId);
  }, []);

  // Settings
  const updateSettings = useCallback(
    async (newSettings: Partial<PlayerSettings>) => {
      const merged = { ...settings, ...newSettings };
      setSettings(merged);
      await storageService.saveSettings(merged);
    },
    [settings]
  );

  const setThemeId = useCallback(
    async (themeId: ThemeId) => {
      await updateSettings({ theme: themeId });
    },
    [updateSettings]
  );

  const value = {
    currentScreen,
    screenParams,
    selectedIndex,
    setSelectedIndex,
    navigateTo,
    goBack,
    toggleNowPlaying,
    wheelStep,
    wheelPressCenter,
    registerCenterAction,

    tracks,
    albums,
    artists,
    playlists,
    favorites,
    recentlyPlayed,
    isLoading,
    refreshLibrary,
    importMusic,

    playbackState,
    playTrack,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seekTo,
    adjustVolume,
    toggleShuffle,
    cycleRepeat,
    toggleFavorite,

    createPlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    getPlaylistTracks,

    settings,
    theme,
    updateSettings,
    setThemeId,
  };

  return <MusicPlayerContext.Provider value={value}>{children}</MusicPlayerContext.Provider>;
};

export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
};
