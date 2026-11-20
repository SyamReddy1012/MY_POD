import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMusicPlayer } from '../context/MusicPlayerContext';

interface ArtworkCoverProps {
  artworkUri?: string | null;
  size?: number;
}

export const ArtworkCover: React.FC<ArtworkCoverProps> = ({ artworkUri, size = 160 }) => {
  const { theme, playbackState } = useMusicPlayer();
  const { isPlaying } = playbackState;

  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    if (isPlaying) {
      animation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 12000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      animation.start();
    } else {
      rotateAnim.stopAnimation();
    }

    return () => {
      if (animation) animation.stop();
    };
  }, [isPlaying, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.outerShadow, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: 14,
            borderColor: theme.screenGlassBorder,
          },
        ]}
      >
        {artworkUri ? (
          <Image source={{ uri: artworkUri }} style={styles.image} resizeMode="cover" />
        ) : (
          /* Retro Vinyl Record with Grooves */
          <View style={styles.vinylContainer}>
            <Animated.View
              style={[
                styles.vinylDisc,
                {
                  width: size - 12,
                  height: size - 12,
                  borderRadius: (size - 12) / 2,
                  transform: [{ rotate: spin }],
                },
              ]}
            >
              <LinearGradient
                colors={['#1c1c1f', '#090a0c', '#1f2024', '#080809']}
                style={styles.vinylGradient}
              >
                {/* Vinyl Grooves */}
                <View style={[styles.grooveRing, { width: (size - 12) * 0.8, height: (size - 12) * 0.8, borderRadius: ((size - 12) * 0.8) / 2 }]} />
                <View style={[styles.grooveRing, { width: (size - 12) * 0.6, height: (size - 12) * 0.6, borderRadius: ((size - 12) * 0.6) / 2 }]} />
                
                {/* Center Label */}
                <View
                  style={[
                    styles.centerLabel,
                    {
                      width: (size - 12) * 0.38,
                      height: (size - 12) * 0.38,
                      borderRadius: ((size - 12) * 0.38) / 2,
                      backgroundColor: theme.accent,
                    },
                  ]}
                >
                  <Ionicons name="musical-notes" size={size * 0.12} color="#FFFFFF" />
                  {/* Spindle hole */}
                  <View style={styles.spindleHole} />
                </View>
              </LinearGradient>
            </Animated.View>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    alignSelf: 'center',
    marginVertical: 10,
  },
  container: {
    overflow: 'hidden',
    borderWidth: 1.5,
    backgroundColor: '#0a0a0c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  vinylContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  vinylDisc: {
    borderWidth: 1,
    borderColor: '#33363d',
    overflow: 'hidden',
  },
  vinylGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grooveRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  spindleHole: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000000',
    borderWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.5)',
  },
});
