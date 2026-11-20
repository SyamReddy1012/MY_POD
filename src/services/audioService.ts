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

  // Non-repeating Shuffle Cycle Tracking
  private shuffleCycleOrder: string[] = [];
  private playedInCycle: Set<string> = new Set();
  private historyStack: Track[] = [];

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
      const selected = tracks[startIndex];
      this.initShuffleCycle(selected?.id);
    } else {
      this.activeQueue = [...tracks];
      this.currentIndex = startIndex;
    }

    if (this.activeQueue.length > 0 && this.currentIndex >= 0 && this.currentIndex < this.activeQueue.length) {
      return this.loadAndPlay(this.activeQueue[this.currentIndex], autoPlay);
    }
    return Promise.resolve();
  }

  /**
   * Initializes or refreshes a randomized shuffle cycle where each track
   * is guaranteed to play exactly once before any song repeats.
   */
  private initShuffleCycle(preserveTrackId?: string): void {
    if (this.originalQueue.length === 0) {
      this.shuffleCycleOrder = [];
      this.playedInCycle.clear();
      this.activeQueue = [];
      this.currentIndex = -1;
      return;
    }

    const allIds = this.originalQueue.map((t) => t.id);
    const shuffledIds = this.shuffleArray(allIds);

    if (preserveTrackId) {
      const idx = shuffledIds.indexOf(preserveTrackId);
      if (idx > -1) {
        shuffledIds.splice(idx, 1);
        shuffledIds.unshift(preserveTrackId);
      }
      this.playedInCycle = new Set([preserveTrackId]);
    } else {
      this.playedInCycle = new Set();
    }

    this.shuffleCycleOrder = shuffledIds;
    const trackMap = new Map(this.originalQueue.map((t) => [t.id, t]));
    this.activeQueue = this.shuffleCycleOrder
      .map((id) => trackMap.get(id))
      .filter((t): t is Track => !!t);

    this.currentIndex = 0;
  }

  /**
   * Synchronizes active playback queue and shuffle cycles when tracks
   * are imported, added, or deleted from the library.
   */
  syncLibraryTracks(allTracks: Track[]): void {
    const newTrackMap = new Map(allTracks.map((t) => [t.id, t]));

    // 1. Clean up deleted tracks
    this.originalQueue = this.originalQueue.filter((t) => newTrackMap.has(t.id));
    this.activeQueue = this.activeQueue.filter((t) => newTrackMap.has(t.id));
    this.shuffleCycleOrder = this.shuffleCycleOrder.filter((id) => newTrackMap.has(id));

    for (const id of this.playedInCycle) {
      if (!newTrackMap.has(id)) {
        this.playedInCycle.delete(id);
      }
    }

    // 2. Incorporate newly added tracks
    const currentIds = new Set(this.originalQueue.map((t) => t.id));
    const addedTracks = allTracks.filter((t) => !currentIds.has(t.id));

    if (addedTracks.length > 0) {
      this.originalQueue.push(...addedTracks);

      if (this.isShuffle) {
        // Distribute added track IDs randomly into unplayed remaining slice
        for (const track of addedTracks) {
          const insertPos = Math.floor(Math.random() * (this.shuffleCycleOrder.length + 1));
          this.shuffleCycleOrder.splice(insertPos, 0, track.id);
        }
        const fullMap = new Map(this.originalQueue.map((t) => [t.id, t]));
        this.activeQueue = this.shuffleCycleOrder
          .map((id) => fullMap.get(id))
          .filter((t): t is Track => !!t);
      } else {
        this.activeQueue.push(...addedTracks);
      }
    }

    // 3. Handle deletion of current playing track
    if (this.currentTrack && !newTrackMap.has(this.currentTrack.id)) {
      if (this.activeQueue.length > 0) {
        this.next();
      } else {
        this.currentTrack = null;
        this.isPlaying = false;
        if (this.player) {
          try {
            this.player.pause();
            this.player.release();
          } catch {
            // ignore
          }
          this.player = null;
        }
      }
    }

    this.notify();
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

    if (this.isShuffle) {
      await this.nextShuffleTrack();
    } else if (this.currentIndex < this.activeQueue.length - 1) {
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

    if (this.isShuffle) {
      await this.nextShuffleTrack();
      return;
    }

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

  private async nextShuffleTrack(): Promise<void> {
    if (this.originalQueue.length === 0) return;

    // Filter unplayed track IDs in current shuffle cycle
    let unplayedIds = this.shuffleCycleOrder.filter((id) => !this.playedInCycle.has(id));

    // If all songs in current cycle have been played without repeat, start a new cycle!
    if (unplayedIds.length === 0) {
      const lastId = this.currentTrack?.id;
      this.initShuffleCycle();

      // Ensure that if library has > 1 track, first track of new cycle doesn't duplicate last played track
      if (this.originalQueue.length > 1 && this.shuffleCycleOrder[0] === lastId) {
        const swapIdx = Math.floor(Math.random() * (this.shuffleCycleOrder.length - 1)) + 1;
        [this.shuffleCycleOrder[0], this.shuffleCycleOrder[swapIdx]] = [
          this.shuffleCycleOrder[swapIdx],
          this.shuffleCycleOrder[0],
        ];
        const trackMap = new Map(this.originalQueue.map((t) => [t.id, t]));
        this.activeQueue = this.shuffleCycleOrder
          .map((id) => trackMap.get(id))
          .filter((t): t is Track => !!t);
      }

      unplayedIds = this.shuffleCycleOrder.filter((id) => !this.playedInCycle.has(id));
    }

    const nextId = unplayedIds[0] || this.shuffleCycleOrder[0];
    const trackMap = new Map(this.originalQueue.map((t) => [t.id, t]));
    const nextTrack = trackMap.get(nextId);

    if (nextTrack) {
      if (this.currentTrack) {
        this.historyStack.push(this.currentTrack);
        if (this.historyStack.length > 50) this.historyStack.shift();
      }
      this.playedInCycle.add(nextTrack.id);
      const newIdx = this.activeQueue.findIndex((t) => t.id === nextTrack.id);
      this.currentIndex = newIdx >= 0 ? newIdx : 0;
      await this.loadAndPlay(nextTrack, true);
    }
  }

  async previous(): Promise<void> {
    if (this.activeQueue.length === 0) return;

    // If played more than 3 seconds, restart current track
    if (this.positionMillis > 3000 && this.player) {
      await this.seekTo(0);
      return;
    }

    if (this.isShuffle && this.historyStack.length > 0) {
      const prevTrack = this.historyStack.pop();
      if (prevTrack) {
        const idx = this.activeQueue.findIndex((t) => t.id === prevTrack.id);
        this.currentIndex = idx >= 0 ? idx : 0;
        await this.loadAndPlay(prevTrack, true);
        return;
      }
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
      this.initShuffleCycle(this.currentTrack?.id);
    } else {
      // Revert to original linear ordering
      this.activeQueue = [...this.originalQueue];
      if (this.currentTrack) {
        const newIdx = this.activeQueue.findIndex((t) => t.id === this.currentTrack!.id);
        this.currentIndex = newIdx >= 0 ? newIdx : 0;
      }
      this.shuffleCycleOrder = [];
      this.playedInCycle.clear();
      this.historyStack = [];
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

  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

export const audioService = new AudioService();
