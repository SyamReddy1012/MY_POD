import React, { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMusicPlayer } from '../context/MusicPlayerContext';

const { width } = Dimensions.get('window');
// Calculate an ergonomic wheel diameter based on screen width
const WHEEL_SIZE = Math.min(width * 0.72, 280);
const CENTER_BUTTON_SIZE = WHEEL_SIZE * 0.38;

interface ClickWheelProps {
  onMenuPress?: () => void;
  onCenterPress?: () => void;
  onPlayPausePress?: () => void;
  onPrevPress?: () => void;
  onNextPress?: () => void;
}

export const ClickWheel: React.FC<ClickWheelProps> = ({
  onMenuPress,
  onCenterPress,
  onPlayPausePress,
  onPrevPress,
  onNextPress,
}) => {
  const {
    theme,
    wheelStep,
    wheelPressCenter,
    goBack,
    togglePlayPause,
    nextTrack,
    prevTrack,
    settings,
  } = useMusicPlayer();

  const [activeZone, setActiveZone] = useState<string | null>(null);

  // Wheel center reference & angle accumulator
  const accumulatedAngle = useRef(0);
  const lastAngle = useRef<number | null>(null);
  const isDragging = useRef(false);
  const dragStartPoint = useRef<{ x: number; y: number } | null>(null);

  // Sensitivity threshold in radians:
  // low: ~25 deg, medium: ~16 deg, high: ~10 deg
  const angleThreshold = useMemo(() => {
    switch (settings.wheelSensitivity) {
      case 'low':
        return 0.43; // ~25 deg
      case 'high':
        return 0.17; // ~10 deg
      case 'medium':
      default:
        return 0.28; // ~16 deg
    }
  }, [settings.wheelSensitivity]);

  const wheelRadius = WHEEL_SIZE / 2;
  const centerRadius = CENTER_BUTTON_SIZE / 2;

  const handleMenu = onMenuPress || goBack;
  const handleCenter = onCenterPress || wheelPressCenter;
  const handlePlayPause = onPlayPausePress || togglePlayPause;
  const handlePrev = onPrevPress || prevTrack;
  const handleNext = onNextPress || nextTrack;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
        },

        onPanResponderGrant: (evt: GestureResponderEvent) => {
          const { locationX, locationY } = evt.nativeEvent;
          dragStartPoint.current = { x: locationX, y: locationY };
          isDragging.current = false;
          accumulatedAngle.current = 0;

          // Calculate distance from center
          const dx = locationX - wheelRadius;
          const dy = locationY - wheelRadius;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // If within center button
          if (dist <= centerRadius) {
            setActiveZone('center');
            lastAngle.current = null;
          } else {
            // In wheel track
            lastAngle.current = Math.atan2(dy, dx);
            // Highlight quadrant tentatively
            const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
            if (angleDeg >= -135 && angleDeg <= -45) setActiveZone('menu');
            else if (angleDeg >= 45 && angleDeg <= 135) setActiveZone('playpause');
            else if (Math.abs(angleDeg) > 135) setActiveZone('prev');
            else setActiveZone('next');
          }
        },

        onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
          const { locationX, locationY } = evt.nativeEvent;
          const dx = locationX - wheelRadius;
          const dy = locationY - wheelRadius;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // If finger is strictly within center button, ignore rotational gesture
          if (dist <= centerRadius) {
            return;
          }

          // Mark that user is dragging/scrubbing
          if (Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4) {
            isDragging.current = true;
            setActiveZone(null);
          }

          const currentAngle = Math.atan2(dy, dx);

          if (lastAngle.current !== null) {
            let delta = currentAngle - lastAngle.current;

            // Handle wrap-around across the -PI to +PI boundary
            if (delta > Math.PI) {
              delta -= 2 * Math.PI;
            } else if (delta < -Math.PI) {
              delta += 2 * Math.PI;
            }

            accumulatedAngle.current += delta;

            if (Math.abs(accumulatedAngle.current) >= angleThreshold) {
              const direction: 1 | -1 = accumulatedAngle.current > 0 ? 1 : -1;
              wheelStep(direction);
              accumulatedAngle.current = 0;
            }
          }

          lastAngle.current = currentAngle;
        },

        onPanResponderRelease: (evt: GestureResponderEvent) => {
          const { locationX, locationY } = evt.nativeEvent;
          const dx = locationX - wheelRadius;
          const dy = locationY - wheelRadius;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // If user didn't drag extensively, treat as button press
          if (!isDragging.current) {
            if (dist <= centerRadius) {
              handleCenter();
            } else {
              const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
              if (angleDeg >= -135 && angleDeg <= -45) {
                handleMenu();
              } else if (angleDeg >= 45 && angleDeg <= 135) {
                handlePlayPause();
              } else if (Math.abs(angleDeg) > 135) {
                handlePrev();
              } else {
                handleNext();
              }
            }
          }

          setActiveZone(null);
          lastAngle.current = null;
          isDragging.current = false;
          dragStartPoint.current = null;
        },

        onPanResponderTerminate: () => {
          setActiveZone(null);
          lastAngle.current = null;
          isDragging.current = false;
        },
      }),
    [
      wheelRadius,
      centerRadius,
      angleThreshold,
      wheelStep,
      handleCenter,
      handleMenu,
      handlePlayPause,
      handlePrev,
      handleNext,
    ]
  );

  return (
    <View style={styles.container}>
      {/* Outer Click Wheel Disc */}
      <View
        {...panResponder.panHandlers}
        style={[
          styles.wheelDisc,
          {
            width: WHEEL_SIZE,
            height: WHEEL_SIZE,
            borderRadius: WHEEL_SIZE / 2,
            borderColor: theme.wheelBorder,
          },
        ]}
      >
        <LinearGradient
          colors={theme.wheelBackground as any}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.9, y: 0.9 }}
          style={styles.wheelGradient}
        >
          {/* Top: MENU */}
          <View
            style={[
              styles.labelZone,
              styles.topLabelZone,
              activeZone === 'menu' && styles.activeZoneGlow,
            ]}
          >
            <Text style={[styles.wheelText, { color: theme.wheelTextColor }]}>MENU</Text>
          </View>

          {/* Left: PREVIOUS */}
          <View
            style={[
              styles.labelZone,
              styles.leftLabelZone,
              activeZone === 'prev' && styles.activeZoneGlow,
            ]}
          >
            <Ionicons name="play-back" size={19} color={theme.wheelTextColor} />
          </View>

          {/* Right: NEXT */}
          <View
            style={[
              styles.labelZone,
              styles.rightLabelZone,
              activeZone === 'next' && styles.activeZoneGlow,
            ]}
          >
            <Ionicons name="play-forward" size={19} color={theme.wheelTextColor} />
          </View>

          {/* Bottom: PLAY/PAUSE */}
          <View
            style={[
              styles.labelZone,
              styles.bottomLabelZone,
              activeZone === 'playpause' && styles.activeZoneGlow,
            ]}
          >
            <Ionicons name="play-forward-outline" size={18} color={theme.wheelTextColor} />
          </View>

          {/* Center Button */}
          <View
            style={[
              styles.centerButton,
              {
                width: CENTER_BUTTON_SIZE,
                height: CENTER_BUTTON_SIZE,
                borderRadius: CENTER_BUTTON_SIZE / 2,
                borderColor: theme.wheelCenterBorder,
              },
              activeZone === 'center' && styles.activeCenterGlow,
            ]}
          >
            <LinearGradient
              colors={theme.wheelCenterButton as any}
              start={{ x: 0.2, y: 0.1 }}
              end={{ x: 0.8, y: 0.9 }}
              style={styles.centerGradient}
            >
              {/* Subtle inner tactile ring */}
              <View
                style={[
                  styles.innerCenterRing,
                  {
                    width: CENTER_BUTTON_SIZE * 0.75,
                    height: CENTER_BUTTON_SIZE * 0.75,
                    borderRadius: (CENTER_BUTTON_SIZE * 0.75) / 2,
                    borderColor: theme.wheelCenterBorder + '40',
                  },
                ]}
              />
            </LinearGradient>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  wheelDisc: {
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
  wheelGradient: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelZone: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  topLabelZone: {
    top: 14,
    left: 0,
    right: 0,
  },
  bottomLabelZone: {
    bottom: 15,
    left: 0,
    right: 0,
  },
  leftLabelZone: {
    left: 16,
    top: 0,
    bottom: 0,
  },
  rightLabelZone: {
    right: 16,
    top: 0,
    bottom: 0,
  },
  wheelText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  centerButton: {
    borderWidth: 1.2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  centerGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCenterRing: {
    borderWidth: 0.8,
  },
  activeZoneGlow: {
    opacity: 0.5,
  },
  activeCenterGlow: {
    transform: [{ scale: 0.96 }],
  },
});
