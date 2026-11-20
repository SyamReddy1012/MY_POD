import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { HeaderBar } from '../components/HeaderBar';
import { Track } from '../types';
import { formatTime } from '../utils/formatters';

interface SongListScreenProps {
  title?: string;
  songList?: Track[];
}

export const SongListScreen: React.FC<SongListScreenProps> = ({ title = 'All Songs', songList }) => {
  const {
    theme,
    tracks,
    selectedIndex,
    setSelectedIndex,
    playTrack,
    playbackState,
    importMusic,
    registerCenterAction,
  } = useMusicPlayer();

  const listData = songList || tracks;
  const flatListRef = useRef<FlatList>(null);

  const clampedIndex = Math.min(Math.max(0, selectedIndex), Math.max(0, listData.length - 1));

  // Connect Click Wheel center button to play the selected song
  useEffect(() => {
    registerCenterAction(() => {
      const selected = listData[clampedIndex];
      if (selected) {
        handleSelectSong(selected, clampedIndex);
      }
    });

    return () => {
      registerCenterAction(null);
    };
  }, [clampedIndex, listData, registerCenterAction]);

  // Auto scroll FlatList to keep selected item in view
  useEffect(() => {
    if (listData.length > 0 && clampedIndex >= 0 && flatListRef.current) {
      try {
        flatListRef.current.scrollToIndex({
          index: clampedIndex,
          animated: true,
          viewPosition: 0.5,
        });
      } catch {
        // Suppress scroll error if layout not ready
      }
    }
  }, [clampedIndex, listData.length]);

  const handleSelectSong = (track: Track, idx: number) => {
    setSelectedIndex(idx);
    playTrack(track, listData);
  };

  const handleImport = async () => {
    try {
      const count = await importMusic();
      if (count > 0) {
        Alert.alert('Imported', `Imported ${count} songs successfully!`);
      }
    } catch {
      Alert.alert('Error', 'Failed to import music files.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.screenBackground }]}>
      <HeaderBar title={`${title} (${listData.length})`} />

      {listData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes-outline" size={48} color={theme.screenSubtext} />
          <Text style={[styles.emptyTitle, { color: theme.screenText }]}>No Songs Found</Text>
          <Text style={[styles.emptyDesc, { color: theme.screenSubtext }]}>
            Import your offline MP3, WAV, FLAC, M4A or AAC tracks directly from your device.
          </Text>
          <TouchableOpacity
            style={[styles.importButton, { backgroundColor: theme.accent }]}
            onPress={handleImport}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.importButtonText}>Import Music</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={listData}
          keyExtractor={(item) => item.id}
          getItemLayout={(_, index) => ({
            length: 38,
            offset: 38 * index,
            index,
          })}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const isSelected = index === clampedIndex;
            const isCurrentlyPlaying = playbackState.currentTrack?.id === item.id;

            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleSelectSong(item, index)}
                style={styles.itemWrapper}
              >
                {isSelected ? (
                  <LinearGradient
                    colors={theme.screenHighlightBar as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.highlightBar}
                  >
                    <View style={styles.leftRow}>
                      {isCurrentlyPlaying ? (
                        <Ionicons
                          name={playbackState.isPlaying ? 'volume-high' : 'pause'}
                          size={14}
                          color={theme.screenHighlightText}
                          style={styles.trackIcon}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.indexNum,
                            { color: theme.screenHighlightText + 'AA' },
                          ]}
                        >
                          {index + 1}
                        </Text>
                      )}
                      <View style={styles.textContainer}>
                        <Text
                          style={[styles.songTitle, { color: theme.screenHighlightText }]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={[styles.artistName, { color: theme.screenHighlightText + 'CC' }]}
                          numberOfLines={1}
                        >
                          {item.artist}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[styles.durationText, { color: theme.screenHighlightText + 'EE' }]}
                    >
                      {formatTime(item.duration)}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.normalBar}>
                    <View style={styles.leftRow}>
                      {isCurrentlyPlaying ? (
                        <Ionicons
                          name={playbackState.isPlaying ? 'volume-high' : 'pause'}
                          size={14}
                          color={theme.accent}
                          style={styles.trackIcon}
                        />
                      ) : (
                        <Text style={[styles.indexNum, { color: theme.screenSubtext }]}>
                          {index + 1}
                        </Text>
                      )}
                      <View style={styles.textContainer}>
                        <Text
                          style={[
                            styles.songTitle,
                            {
                              color: isCurrentlyPlaying ? theme.accent : theme.screenText,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={[styles.artistName, { color: theme.screenSubtext }]}
                          numberOfLines={1}
                        >
                          {item.artist}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.durationText, { color: theme.screenSubtext }]}>
                      {formatTime(item.duration)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 2,
  },
  itemWrapper: {
    height: 38,
    justifyContent: 'center',
  },
  highlightBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  normalBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  trackIcon: {
    width: 22,
    marginRight: 4,
  },
  indexNum: {
    width: 22,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginRight: 4,
    fontVariant: ['tabular-nums'],
  },
  textContainer: {
    flex: 1,
  },
  songTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  artistName: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  importButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
