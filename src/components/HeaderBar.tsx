import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Battery from 'expo-battery';
import { useMusicPlayer } from '../context/MusicPlayerContext';

interface HeaderBarProps {
  title: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ title }) => {
  const { theme, playbackState, settings, setThemeId } = useMusicPlayer();
  const { isPlaying, isShuffle, repeatMode } = playbackState;

  // Real-time Device Battery State
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [batteryState, setBatteryState] = useState<Battery.BatteryState>(Battery.BatteryState.UNKNOWN);

  useEffect(() => {
    let isMounted = true;

    async function loadBattery() {
      try {
        const level = await Battery.getBatteryLevelAsync();
        const state = await Battery.getBatteryStateAsync();
        if (isMounted) {
          if (typeof level === 'number' && level >= 0) {
            setBatteryLevel(level);
          }
          setBatteryState(state);
        }
      } catch {
        // Fallback gracefully on devices/simulators where Battery API is restricted
        if (isMounted && batteryLevel === null) {
          setBatteryLevel(0.85);
        }
      }
    }

    loadBattery();

    let levelSub: Battery.Subscription | null = null;
    let stateSub: Battery.Subscription | null = null;

    try {
      levelSub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
        if (isMounted && typeof batteryLevel === 'number' && batteryLevel >= 0) {
          setBatteryLevel(batteryLevel);
        }
      });

      stateSub = Battery.addBatteryStateListener(({ batteryState }) => {
        if (isMounted) {
          setBatteryState(batteryState);
        }
      });
    } catch {
      // Ignore listener errors if unsupported
    }

    return () => {
      isMounted = false;
      levelSub?.remove();
      stateSub?.remove();
    };
  }, []);

  const isDarkMode = theme.id !== 'silver';

  const handleToggleTheme = () => {
    setThemeId(isDarkMode ? 'silver' : 'graphite');
  };

  // Compute accurate percentage & icon
  const batteryPct = batteryLevel !== null ? Math.round(batteryLevel * 100) : 85;
  const isCharging =
    batteryState === Battery.BatteryState.CHARGING ||
    batteryState === Battery.BatteryState.FULL;

  let batteryIconName: any = 'battery-half';
  if (isCharging) {
    batteryIconName = 'battery-charging';
  } else if (batteryPct >= 85) {
    batteryIconName = 'battery-full';
  } else if (batteryPct >= 35) {
    batteryIconName = 'battery-half';
  } else {
    batteryIconName = 'battery-dead';
  }

  const batteryColor =
    batteryPct <= 15 && !isCharging ? '#EF4444' : theme.screenHeaderText;

  return (
    <View style={[styles.headerContainer, { backgroundColor: theme.screenHeaderBg }]}>
      {/* Left section: Play/Pause Indicator */}
      <View style={styles.leftSection}>
        <Ionicons
          name={isPlaying ? 'play' : 'pause'}
          size={11}
          color={theme.screenHeaderText}
        />
      </View>

      {/* Center: Screen Title */}
      <View style={styles.centerSection}>
        <Text
          style={[styles.headerTitle, { color: theme.screenHeaderText }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
      </View>

      {/* Right: Quick Theme Toggle, Shuffle, Repeat & Real Battery */}
      <View style={styles.rightSection}>
        {/* Quick Dark Mode / Light Mode Toggle */}
        <TouchableOpacity
          onPress={handleToggleTheme}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.iconMargin}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isDarkMode ? 'sunny' : 'moon'}
            size={12}
            color={isDarkMode ? '#F59E0B' : '#475569'}
          />
        </TouchableOpacity>

        {isShuffle && (
          <Ionicons
            name="shuffle"
            size={11}
            color={theme.accent}
            style={styles.iconMargin}
          />
        )}

        {repeatMode !== 'off' && (
          <Ionicons
            name={repeatMode === 'one' ? 'repeat' : 'repeat-outline'}
            size={11}
            color={theme.accent}
            style={styles.iconMargin}
          />
        )}

        {/* Real Battery Indicator with Percentage */}
        <View style={styles.batteryContainer}>
          <Text style={[styles.batteryText, { color: batteryColor }]}>
            {batteryPct}%
          </Text>
          <Ionicons
            name={batteryIconName}
            size={13}
            color={batteryColor}
            style={styles.batteryIcon}
          />
        </View>
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
    width: 24,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  iconMargin: {
    marginRight: 6,
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  batteryIcon: {
    marginLeft: 2,
  },
});
