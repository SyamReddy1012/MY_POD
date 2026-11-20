import { Audio, AVPlaybackStatus, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
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
  private sound: Audio.Sound | null = null;
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

  async initAudioMode(): Promise<void> {
    if (this.isAudioModeConfigured) return;
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
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
      // Keep selected track at current position if possible
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
      if (this.sound) {
        await this.sound.stopAsync().catch(() => {});
        await this.sound.unloadAsync().catch(() => {});
        this.sound = null;
      }

      this.currentTrack = track;
      this.positionMillis = 0;
      this.durationMillis = track.duration || 0;
      this.isPlaying = shouldPlay;
      this.isBuffering = true;
      this.notify();

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.uri },
        {
          shouldPlay,
          volume: this.volume,
          progressUpdateIntervalMillis: 300,
        },
        this.onPlaybackStatusUpdate
      );

      this.sound = sound;
      this.isBuffering = false;

      // Record play count and last played in DB
      await databaseService.recordPlay(track.id);

      this.notify();
    } catch (err) {
      console.error('Error loading audio track:', err);
      this.isPlaying = false;
      this.isBuffering = false;
      this.notify();
    }
  }

  private onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.warn('Playback status error:', status.error);
      }
      return;
    }

    this.isPlaying = status.isPlaying;
    this.isBuffering = status.isBuffering;
    this.positionMillis = status.positionMillis;
    this.durationMillis = status.durationMillis || this.durationMillis;

    // Track finished
    if (status.didJustFinish && !status.isLooping) {
      this.handleTrackEnded();
    }

    this.notify();
  };

  private async handleTrackEnded() {
    if (this.repeatMode === 'one' && this.currentTrack) {
      if (this.sound) {
        await this.sound.replayAsync();
      }
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
    if (this.sound) {
      await this.sound.playAsync();
      this.isPlaying = true;
      this.notify();
    } else if (this.currentTrack) {
      await this.loadAndPlay(this.currentTrack, true);
    } else if (this.activeQueue.length > 0) {
      await this.setQueue(this.activeQueue, 0, true);
    }
  }

  async pause(): Promise<void> {
    if (this.sound) {
      await this.sound.pauseAsync();
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
    if (this.positionMillis > 3000 && this.sound) {
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
    if (this.sound) {
      const clamped = Math.max(0, Math.min(positionMillis, this.durationMillis));
      await this.sound.setPositionAsync(clamped);
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
    if (this.sound) {
      await this.sound.setVolumeAsync(clamped);
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
