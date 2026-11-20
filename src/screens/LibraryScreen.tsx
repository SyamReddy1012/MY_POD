import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { HeaderBar } from '../components/HeaderBar';

interface MenuItem {
  id: string;
  title: string;
  count?: number;
  icon: keyof typeof Ionicons.glyphMap;
  action: () => void;
}

export const LibraryScreen: React.FC = () => {
  const {
    theme,
    selectedIndex,
    setSelectedIndex,
    navigateTo,
    tracks,
    playlists,
    favorites,
    artists,
    albums,
    recentlyPlayed,
    playbackState,
    importMusic,
    registerCenterAction,
  } = useMusicPlayer();

  const menuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [];

    if (playbackState.currentTrack) {
      items.push({
        id: 'now_playing',
        title: 'Now Playing',
        icon: 'disc-outline',
        action: () => navigateTo('now_playing'),
      });
    }

    items.push(
      {
        id: 'songs',
        title: 'All Songs',
        count: tracks.length,
        icon: 'musical-note-outline',
        action: () => navigateTo('songs'),
      },
      {
        id: 'playlists',
        title: 'Playlists',
        count: playlists.length,
        icon: 'list-outline',
        action: () => navigateTo('playlists'),
      },
      {
        id: 'favorites',
        title: 'Favorites',
        count: favorites.length,
        icon: 'heart-outline',
        action: () => navigateTo('favorites'),
      },
      {
        id: 'artists',
        title: 'Artists',
        count: artists.length,
        icon: 'people-outline',
        action: () => navigateTo('artists'),
      },
      {
        id: 'albums',
        title: 'Albums',
        count: albums.length,
        icon: 'albums-outline',
        action: () => navigateTo('albums'),
      },
      {
        id: 'recently_played',
        title: 'Recently Played',
        count: recentlyPlayed.length,
        icon: 'time-outline',
        action: () => navigateTo('recently_played'),
      },
      {
        id: 'import',
        title: 'Import Music Files',
        icon: 'cloud-download-outline',
        action: async () => {
          try {
            const count = await importMusic();
            if (count > 0) {
              Alert.alert('Import Complete', `Successfully imported ${count} song${count > 1 ? 's' : ''}!`);
            }
          } catch {
            Alert.alert('Import Failed', 'Unable to import selected audio files.');
          }
        },
      },
      {
        id: 'settings',
        title: 'Settings',
        icon: 'settings-outline',
        action: () => navigateTo('settings'),
      }
    );

    return items;
  }, [
    playbackState.currentTrack,
    tracks.length,
    playlists.length,
    favorites.length,
    artists.length,
    albums.length,
    recentlyPlayed.length,
    navigateTo,
    importMusic,
  ]);

  const clampedIndex = Math.min(Math.max(0, selectedIndex), Math.max(0, menuItems.length - 1));

  // Connect Click Wheel center button to execute the selected menu item
  useEffect(() => {
    registerCenterAction(() => {
      const selected = menuItems[clampedIndex];
      if (selected) {
        selected.action();
      }
    });

    return () => {
      registerCenterAction(null);
    };
  }, [clampedIndex, menuItems, registerCenterAction]);

  return (
    <View style={[styles.container, { backgroundColor: theme.screenBackground }]}>
      <HeaderBar title="MY POD" />

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {menuItems.map((item, idx) => {
          const isSelected = idx === clampedIndex;

          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              onPress={() => {
                setSelectedIndex(idx);
                item.action();
              }}
              style={styles.itemWrapper}
            >
              {isSelected ? (
                <LinearGradient
                  colors={theme.screenHighlightBar as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.highlightBar}
                >
                  <View style={styles.itemLeft}>
                    <Ionicons
                      name={item.icon}
                      size={16}
                      color={theme.screenHighlightText}
                      style={styles.itemIcon}
                    />
                    <Text style={[styles.itemText, { color: theme.screenHighlightText }]}>
                      {item.title}
                    </Text>
                  </View>

                  <View style={styles.itemRight}>
                    {item.count !== undefined && (
                      <Text style={[styles.countText, { color: theme.screenHighlightText + 'CC' }]}>
                        {item.count}
                      </Text>
                    )}
                    <Ionicons name="chevron-forward" size={14} color={theme.screenHighlightText} />
                  </View>
                </LinearGradient>
              ) : (
                <View style={styles.normalBar}>
                  <View style={styles.itemLeft}>
                    <Ionicons
                      name={item.icon}
                      size={16}
                      color={theme.screenSubtext}
                      style={styles.itemIcon}
                    />
                    <Text style={[styles.itemText, { color: theme.screenText }]}>{item.title}</Text>
                  </View>

                  <View style={styles.itemRight}>
                    {item.count !== undefined && (
                      <Text style={[styles.countText, { color: theme.screenSubtext }]}>
                        {item.count}
                      </Text>
                    )}
                    <Ionicons name="chevron-forward" size={14} color={theme.screenSubtext} />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 2,
  },
  itemWrapper: {
    height: 34,
    justifyContent: 'center',
  },
  highlightBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  normalBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    marginRight: 8,
  },
  itemText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
