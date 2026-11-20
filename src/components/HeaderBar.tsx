import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusicPlayer } from '../context/MusicPlayerContext';

interface HeaderBarProps {
  title: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ title }) => {
  const { theme, playbackState } = useMusicPlayer();
  const { isPlaying, isShuffle, repeatMode } = playbackState;

  return (
    <View style={[styles.headerContainer, { backgroundColor: theme.screenHeaderBg }]}>
      {/* Left indicator: Play/Pause */}
      <View style={styles.leftSection}>
        {isPlaying ? (
          <Ionicons name="play" size={13} color={theme.screenHeaderText} />
        ) : (
          <Ionicons name="pause" size={13} color={theme.screenHeaderText} />
        )}
      </View>

      {/* Center: Title */}
      <View style={styles.centerSection}>
        <Text style={[styles.headerTitle, { color: theme.screenHeaderText }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Right: Mode indicators & Battery */}
      <View style={styles.rightSection}>
        {isShuffle && (
          <Ionicons
            name="shuffle"
            size={12}
            color={theme.accent}
            style={styles.iconMargin}
          />
        )}
        {repeatMode !== 'off' && (
          <Ionicons
            name={repeatMode === 'one' ? 'repeat' : 'repeat-outline'}
            size={12}
            color={theme.accent}
            style={styles.iconMargin}
          />
        )}
        <Ionicons name="battery-charging" size={15} color={theme.screenHeaderText} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  leftSection: {
    width: 32,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 60,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  iconMargin: {
    marginRight: 4,
  },
});
