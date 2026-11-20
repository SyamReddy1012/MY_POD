import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { formatTime } from '../utils/formatters';

export const TrackProgressBar: React.FC = () => {
  const { theme, playbackState, seekTo } = useMusicPlayer();
  const { positionMillis, durationMillis } = playbackState;

  const progress = durationMillis > 0 ? Math.min(1, Math.max(0, positionMillis / durationMillis)) : 0;
  const remainingMillis = Math.max(0, durationMillis - positionMillis);

  const handleBarPress = (evt: any) => {
    const { locationX } = evt.nativeEvent;
    // Calculate based on component width
    evt.target.measure((_x: number, _y: number, width: number) => {
      if (width > 0 && durationMillis > 0) {
        const ratio = Math.max(0, Math.min(1, locationX / width));
        seekTo(ratio * durationMillis);
      }
    });
  };

  return (
    <View style={styles.container}>
      {/* Time indicators */}
      <View style={styles.timeRow}>
        <Text style={[styles.timeText, { color: theme.screenSubtext }]}>
          {formatTime(positionMillis)}
        </Text>
        <Text style={[styles.timeText, { color: theme.screenSubtext }]}>
          -{formatTime(remainingMillis)}
        </Text>
      </View>

      {/* Progress Track */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleBarPress}
        style={[styles.progressTrack, { backgroundColor: theme.screenProgressBg }]}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${(progress * 100).toFixed(1)}%`,
              backgroundColor: theme.screenProgressFill,
            },
          ]}
        />
        {/* Diamond / Round scrubber head */}
        <View
          style={[
            styles.scrubberHead,
            {
              left: `${(progress * 100).toFixed(1)}%`,
              backgroundColor: theme.screenHeaderText,
              borderColor: theme.screenProgressBg,
            },
          ]}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
    overflow: 'visible',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  scrubberHead: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: -5,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1.5,
  },
});
