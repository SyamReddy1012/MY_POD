import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { HeaderBar } from '../components/HeaderBar';
import { ArtworkCover } from '../components/ArtworkCover';
import { TrackProgressBar } from '../components/TrackProgressBar';

export const NowPlayingScreen: React.FC = () => {
  const {
    theme,
    playbackState,
    toggleFavorite,
    toggleShuffle,
    cycleRepeat,
    navigateTo,
  } = useMusicPlayer();

  const { height: windowHeight } = useWindowDimensions();
  // Responsive artwork sizing to fit small screens without vertical clipping
  const artworkSize = Math.max(100, Math.min(windowHeight * 0.16, 140));

  const { currentTrack, isShuffle, repeatMode, volume } = playbackState;

  if (!currentTrack) {
    return (
      <View style={[styles.container, { backgroundColor: theme.screenBackground }]}>
        <HeaderBar title="Now Playing" />
        <View style={styles.emptyContainer}>
          <Ionicons name="disc-outline" size={54} color={theme.screenSubtext} />
          <Text style={[styles.emptyTitle, { color: theme.screenText }]}>No Track Selected</Text>
          <Text style={[styles.emptySubtitle, { color: theme.screenSubtext }]}>
            Select a song from your library or import music files from your device.
          </Text>
          <TouchableOpacity
            style={[styles.libraryButton, { backgroundColor: theme.accent }]}
            onPress={() => navigateTo('songs')}
            activeOpacity={0.8}
          >
            <Text style={styles.libraryButtonText}>Open Library</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.screenBackground }]}>
      <HeaderBar title="Now Playing" />

      <View style={styles.content}>
        {/* Album Artwork / Vinyl */}
        <ArtworkCover artworkUri={currentTrack.artworkUri} size={artworkSize} />

        {/* Track Details */}
        <View style={styles.trackDetails}>
          <Text style={[styles.trackTitle, { color: theme.screenText }]} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={[styles.artistName, { color: theme.screenSubtext }]} numberOfLines={1}>
            {currentTrack.artist}
          </Text>
          <Text style={[styles.albumName, { color: theme.screenSubtext }]} numberOfLines={1}>
            {currentTrack.album}
          </Text>
        </View>

        {/* Scrub Bar & Timers */}
        <TrackProgressBar />

        {/* Bottom Quick Controls & Indicators */}
        <View style={styles.controlRow}>
          {/* Favorite */}
          <TouchableOpacity
            onPress={() => toggleFavorite(currentTrack.id)}
            style={styles.controlButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={currentTrack.isFavorite ? 'heart' : 'heart-outline'}
              size={18}
              color={currentTrack.isFavorite ? '#E50914' : theme.screenSubtext}
            />
          </TouchableOpacity>

          {/* Shuffle */}
          <TouchableOpacity
            onPress={toggleShuffle}
            style={styles.controlButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="shuffle"
              size={18}
              color={isShuffle ? theme.accent : theme.screenSubtext}
            />
          </TouchableOpacity>

          {/* Repeat */}
          <TouchableOpacity
            onPress={cycleRepeat}
            style={styles.controlButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={repeatMode === 'one' ? 'repeat' : 'repeat-outline'}
              size={18}
              color={repeatMode !== 'off' ? theme.accent : theme.screenSubtext}
            />
          </TouchableOpacity>

          {/* Volume Indicator */}
          <View style={styles.volumeIndicator}>
            <Ionicons
              name={volume === 0 ? 'volume-mute' : volume < 0.5 ? 'volume-low' : 'volume-high'}
              size={16}
              color={theme.screenSubtext}
            />
            <Text style={[styles.volumeText, { color: theme.screenSubtext }]}>
              {Math.round(volume * 100)}%
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    paddingTop: 4,
  },
  trackDetails: {
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  artistName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  albumName: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.8,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '85%',
    marginTop: 4,
  },
  controlButton: {
    padding: 6,
  },
  volumeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  volumeText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  libraryButton: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
  },
  libraryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
