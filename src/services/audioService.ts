import {
  createAudioPlayer,
  setAudioModeAsync,
  AudioPlayer,
  AudioStatus,
} from 'expo-audio';
import { Track, RepeatMode } from '../types';
import { databaseService } from './databaseService';

export interface PlaybackState {
  currentTrack: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  positionMillis: number;
  durationMillis: number;
  volume: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  queue: Track[];
  currentIndex: number;
}

type PlaybackListener = (state: PlaybackState) => void;

class AudioService {
  private player: AudioPlayer | null = null;
  private currentTrack: Track | null = null;
  private isPlaying = false;
  private isBuffering = false;
  private positionMillis = 0;
  private durationMillis = 0;
  private volume = 1.0;
  private isShuffle = false;
  private repeatMode: RepeatMode = 'off';

  private originalQueue: Track[] = [];
  private activeQueue: Track[] = [];
  private currentIndex = -1;

  private listeners: Set<PlaybackListener> = new Set();
  private isAudioModeConfigured = false;
  private statusSubscription: any = null;

  async initAudioMode(): Promise<void> {
    if (this.isAudioModeConfigured) return;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'duckOthers',
      });
      this.isAudioModeConfigured = true;
    } catch (err) {
      console.warn('Audio mode setup warning:', err);
    }
  }

  subscribe(listener: PlaybackListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('Error in playback listener:', err);
      }
    });
  }

  getState(): PlaybackState {
    return {
      currentTrack: this.currentTrack,
      isPlaying: this.isPlaying,
      isBuffering: this.isBuffering,
      positionMillis: this.positionMillis,
      durationMillis: this.durationMillis || (this.currentTrack ? this.currentTrack.duration : 0),
      volume: this.volume,
      isShuffle: this.isShuffle,
      repeatMode: this.repeatMode,
      queue: this.activeQueue,
      currentIndex: this.currentIndex,
    };
  }

  setQueue(tracks: Track[], startIndex = 0, autoPlay = true): Promise<void> {
    this.originalQueue = [...tracks];
    if (this.isShuffle) {
      this.activeQueue = this.shuffleArray([...tracks]);
      const selected = tracks[startIndex];
      if (selected) {
        const newIndex = this.activeQueue.findIndex((t) => t.id === selected.id);
        this.currentIndex = newIndex >= 0 ? newIndex : 0;
      } else {
        this.currentIndex = 0;
      }
    } else {
      this.activeQueue = [...tracks];
      this.currentIndex = startIndex;
    }

    if (this.activeQueue.length > 0 && this.currentIndex >= 0 && this.currentIndex < this.activeQueue.length) {
      return this.loadAndPlay(this.activeQueue[this.currentIndex], autoPlay);
    }
    return Promise.resolve();
  }

  async loadAndPlay(track: Track, shouldPlay = true): Promise<void> {
    await this.initAudioMode();

    try {
      if (this.statusSubscription) {
        this.statusSubscription.remove();
        this.statusSubscription = null;
      }
      if (this.player) {
        try {
          this.player.pause();
          this.player.release();
        } catch {
          // ignore cleanup error
        }
        this.player = null;
      }

      this.currentTrack = track;
      this.positionMillis = 0;
      this.durationMillis = track.duration || 0;
      this.isPlaying = shouldPlay;
      this.isBuffering = true;
      this.notify();

      // Create new Expo Audio player
      const player = createAudioPlayer({ uri: track.uri }, { updateInterval: 250 });
      this.player = player;
      player.volume = this.volume;
      player.loop = this.repeatMode === 'one';

      // Set lock screen info if supported
      try {
        if ((player as any).setActiveForLockScreen) {
          (player as any).setActiveForLockScreen(true, {
            title: track.title,
            artist: track.artist,
            albumTitle: track.album,
          });
        }
      } catch {
        // Lock screen metadata optional
      }

      // Subscribe to player events
      this.statusSubscription = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
        this.onPlaybackStatusUpdate(status);
      });

      if (shouldPlay) {
        player.play();
        this.isPlaying = true;
      }

      this.isBuffering = false;

      // Record play count and last played in DB
      await databaseService.recordPlay(track.id);

      this.notify();
    } catch (err) {
      console.error('Error loading audio track with expo-audio:', err);
      this.isPlaying = false;
      this.isBuffering = false;
      this.notify();
    }
  }

  private onPlaybackStatusUpdate = (status: AudioStatus) => {
    this.isPlaying = status.playing;
    this.isBuffering = status.isBuffering || false;
    
    // Status timestamps are in seconds in expo-audio
    if (typeof status.currentTime === 'number') {
      this.positionMillis = Math.round(status.currentTime * 1000);
    }
    if (typeof status.duration === 'number' && status.duration > 0) {
      this.durationMillis = Math.round(status.duration * 1000);
    }

    // Track finished
    if (status.didJustFinish) {
      this.handleTrackEnded();
    }

    this.notify();
  };

  private async handleTrackEnded() {
    if (this.repeatMode === 'one' && this.currentTrack && this.player) {
      this.player.seekTo(0);
      this.player.play();
      return;
    }

    if (this.currentIndex < this.activeQueue.length - 1) {
      await this.next();
    } else if (this.repeatMode === 'all' && this.activeQueue.length > 0) {
      this.currentIndex = 0;
      await this.loadAndPlay(this.activeQueue[0], true);
    } else {
      this.isPlaying = false;
      this.positionMillis = 0;
      this.notify();
    }
  }

  async play(): Promise<void> {
    if (this.player) {
      this.player.play();
      this.isPlaying = true;
      this.notify();
    } else if (this.currentTrack) {
      await this.loadAndPlay(this.currentTrack, true);
    } else if (this.activeQueue.length > 0) {
      await this.setQueue(this.activeQueue, 0, true);
    }
  }

  async pause(): Promise<void> {
    if (this.player) {
      this.player.pause();
      this.isPlaying = false;
      this.notify();
    }
  }

  async togglePlayPause(): Promise<void> {
    if (this.isPlaying) {
      await this.pause();
    } else {
      await this.play();
    }
  }

  async next(): Promise<void> {
    if (this.activeQueue.length === 0) return;

    let nextIndex = this.currentIndex + 1;
    if (nextIndex >= this.activeQueue.length) {
      if (this.repeatMode === 'all') {
        nextIndex = 0;
      } else {
        return;
      }
    }

    this.currentIndex = nextIndex;
    await this.loadAndPlay(this.activeQueue[nextIndex], true);
  }

  async previous(): Promise<void> {
    if (this.activeQueue.length === 0) return;

    // If played more than 3 seconds, restart current track
    if (this.positionMillis > 3000 && this.player) {
      await this.seekTo(0);
      return;
    }

    let prevIndex = this.currentIndex - 1;
    if (prevIndex < 0) {
      if (this.repeatMode === 'all') {
        prevIndex = this.activeQueue.length - 1;
      } else {
        prevIndex = 0;
      }
    }

    this.currentIndex = prevIndex;
    await this.loadAndPlay(this.activeQueue[prevIndex], true);
  }

  async seekTo(positionMillis: number): Promise<void> {
    if (this.player) {
      const clamped = Math.max(0, Math.min(positionMillis, this.durationMillis));
      // expo-audio takes seconds
      this.player.seekTo(clamped / 1000);
      this.positionMillis = clamped;
      this.notify();
    }
  }

  async seekRelative(deltaMillis: number): Promise<void> {
    const target = this.positionMillis + deltaMillis;
    await this.seekTo(target);
  }

  async setVolume(vol: number): Promise<void> {
    const clamped = Math.max(0, Math.min(1, vol));
    this.volume = clamped;
    if (this.player) {
      this.player.volume = clamped;
    }
    this.notify();
  }

  async adjustVolume(delta: number): Promise<void> {
    await this.setVolume(this.volume + delta);
  }

  toggleShuffle(): void {
    const newShuffle = !this.isShuffle;
    this.isShuffle = newShuffle;

    if (newShuffle) {
      const cur = this.currentTrack;
      this.activeQueue = this.shuffleArray([...this.originalQueue]);
      if (cur) {
        const newIdx = this.activeQueue.findIndex((t) => t.id === cur.id);
        this.currentIndex = newIdx >= 0 ? newIdx : 0;
      }
    } else {
      const cur = this.currentTrack;
      this.activeQueue = [...this.originalQueue];
      if (cur) {
        const newIdx = this.activeQueue.findIndex((t) => t.id === cur.id);
        this.currentIndex = newIdx >= 0 ? newIdx : 0;
      }
    }

    this.notify();
  }

  cycleRepeat(): void {
    if (this.repeatMode === 'off') {
      this.repeatMode = 'all';
    } else if (this.repeatMode === 'all') {
      this.repeatMode = 'one';
    } else {
      this.repeatMode = 'off';
    }

    if (this.player) {
      this.player.loop = this.repeatMode === 'one';
    }

    this.notify();
  }

  private shuffleArray(array: Track[]): Track[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

export const audioService = new AudioService();
