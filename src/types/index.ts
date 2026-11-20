export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in milliseconds
  uri: string;
  artworkUri?: string | null;
  fileSize?: number;
  format?: string;
  dateAdded: number;
  playCount: number;
  lastPlayed?: number | null;
  isFavorite?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  createdAt: number;
  trackCount?: number;
}

export type RepeatMode = 'off' | 'all' | 'one';

export type ScreenType = 
  | 'now_playing'
  | 'library'
  | 'songs'
  | 'albums'
  | 'artists'
  | 'album_detail'
  | 'artist_detail'
  | 'playlists'
  | 'playlist_detail'
  | 'favorites'
  | 'recently_played'
  | 'settings';

export type ThemeId = 'silver' | 'graphite' | 'stealth' | 'u2';

export interface ThemeColors {
  id: ThemeId;
  name: string;
  // Chassis
  chassisBackground: string[];
  chassisBorder: string;
  bezelBackground: string;
  // Screen
  screenBackground: string;
  screenGlassBorder: string;
  screenHeaderBg: string;
  screenHeaderText: string;
  screenText: string;
  screenSubtext: string;
  screenHighlightBar: string[];
  screenHighlightText: string;
  screenProgressBg: string;
  screenProgressFill: string;
  // Click Wheel
  wheelBackground: string[];
  wheelBorder: string;
  wheelTextColor: string;
  wheelCenterButton: string[];
  wheelCenterBorder: string;
  wheelIndicator: string;
  // Accents
  accent: string;
}

export interface PlayerSettings {
  theme: ThemeId;
  wheelHaptics: boolean;
  wheelSound: boolean;
  wheelSensitivity: 'low' | 'medium' | 'high';
  wheelActionMode: 'scroll' | 'volume';
}
