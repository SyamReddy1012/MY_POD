import React, { useMemo } from 'react';
import { View, StyleSheet, SafeAreaView, Dimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { ClickWheel } from './ClickWheel';
import { NowPlayingScreen } from '../screens/NowPlayingScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { SongListScreen } from '../screens/SongListScreen';
import { GroupingListScreen } from '../screens/GroupingListScreen';
import { PlaylistsScreen } from '../screens/PlaylistsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const { height, width } = Dimensions.get('window');

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={theme.id === 'silver' ? 'dark-content' : 'light-content'} />

      {/* Main Handheld Chassis */}
      <View
        style={[
          styles.chassisOuter,
          {
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
    width: Math.min(width * 0.94, 430),
    height: Math.min(height * 0.96, 840),
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    justifyContent: 'space-between',
  },
  screenSection: {
    flex: 1,
    maxHeight: '52%',
    minHeight: 280,
    marginBottom: 8,
  },
  screenBezel: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 2.5,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  screenGlass: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  wheelSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
});
