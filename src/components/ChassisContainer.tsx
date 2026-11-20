import React, { useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar as RNStatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { ClickWheel } from './ClickWheel';
import { NowPlayingScreen } from '../screens/NowPlayingScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { SongListScreen } from '../screens/SongListScreen';
import { GroupingListScreen } from '../screens/GroupingListScreen';
import { PlaylistsScreen } from '../screens/PlaylistsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

export const ChassisContainer: React.FC = () => {
  const {
    theme,
    currentScreen,
    screenParams,
    tracks,
    favorites,
    recentlyPlayed,
    albums,
    artists,
    navigateTo,
    getPlaylistTracks,
  } = useMusicPlayer();

  const [detailTracks, setDetailTracks] = React.useState<any[]>([]);

  // Load playlist detail tracks if needed
  React.useEffect(() => {
    if (currentScreen === 'playlist_detail' && screenParams?.playlistId) {
      getPlaylistTracks(screenParams.playlistId).then(setDetailTracks);
    }
  }, [currentScreen, screenParams, getPlaylistTracks]);

  // Render active screen
  const screenContent = useMemo(() => {
    switch (currentScreen) {
      case 'now_playing':
        return <NowPlayingScreen />;

      case 'library':
        return <LibraryScreen />;

      case 'songs':
        return <SongListScreen title="All Songs" songList={tracks} />;

      case 'favorites':
        return <SongListScreen title="Favorites" songList={favorites} />;

      case 'recently_played':
        return <SongListScreen title="Recently Played" songList={recentlyPlayed} />;

      case 'albums':
        return (
          <GroupingListScreen
            title="Albums"
            icon="albums-outline"
            items={albums.map((a) => ({
              id: a.name,
              name: a.name,
              subtext: a.artist,
              count: a.trackCount,
            }))}
            onSelectItem={(item) => {
              navigateTo('album_detail', { albumName: item.name });
            }}
          />
        );

      case 'album_detail': {
        const filtered = tracks.filter((t) => t.album === screenParams?.albumName);
        return <SongListScreen title={screenParams?.albumName || 'Album'} songList={filtered} />;
      }

      case 'artists':
        return (
          <GroupingListScreen
            title="Artists"
            icon="people-outline"
            items={artists.map((a) => ({
              id: a.name,
              name: a.name,
              count: a.trackCount,
            }))}
            onSelectItem={(item) => {
              navigateTo('artist_detail', { artistName: item.name });
            }}
          />
        );

      case 'artist_detail': {
        const filtered = tracks.filter((t) => t.artist === screenParams?.artistName);
        return <SongListScreen title={screenParams?.artistName || 'Artist'} songList={filtered} />;
      }

      case 'playlists':
        return <PlaylistsScreen />;

      case 'playlist_detail':
        return (
          <SongListScreen
            title={screenParams?.playlistName || 'Playlist'}
            songList={detailTracks}
          />
        );

      case 'settings':
        return <SettingsScreen />;

      default:
        return <LibraryScreen />;
    }
  }, [
    currentScreen,
    screenParams,
    tracks,
    favorites,
    recentlyPlayed,
    albums,
    artists,
    detailTracks,
    navigateTo,
  ]);

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const statusBarHeight = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0;
  const availableHeight = windowHeight - statusBarHeight;

  // Responsive chassis bounding box
  const chassisWidth = Math.min(windowWidth * 0.96, 420);
  const chassisHeight = Math.min(availableHeight * 0.98, 860);

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: statusBarHeight }]}>
      <StatusBar style={theme.id === 'silver' ? 'dark' : 'light'} />

      {/* Main Handheld Chassis */}
      <View
        style={[
          styles.chassisOuter,
          {
            width: chassisWidth,
            height: chassisHeight,
            borderColor: theme.chassisBorder,
          },
        ]}
      >
        <LinearGradient
          colors={theme.chassisBackground as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.chassisGradient}
        >
          {/* Top Screen Section */}
          <View style={styles.screenSection}>
            <View
              style={[
                styles.screenBezel,
                {
                  borderColor: theme.screenGlassBorder,
                  backgroundColor: theme.bezelBackground,
                },
              ]}
            >
              <View
                style={[
                  styles.screenGlass,
                  {
                    backgroundColor: theme.screenBackground,
                  },
                ]}
              >
                {screenContent}
              </View>
            </View>
          </View>

          {/* Bottom Click Wheel Section */}
          <View style={styles.wheelSection}>
            <ClickWheel />
          </View>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0b0d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chassisOuter: {
    borderRadius: 36,
    borderWidth: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 20,
  },
  chassisGradient: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    justifyContent: 'space-between',
  },
  screenSection: {
    flex: 1.15,
    marginBottom: 4,
    overflow: 'hidden',
  },
  screenBezel: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 2.5,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  screenGlass: {
    flex: 1,
    borderRadius: 13,
    overflow: 'hidden',
  },
  wheelSection: {
    flex: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
});
