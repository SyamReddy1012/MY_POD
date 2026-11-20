import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { HeaderBar } from '../components/HeaderBar';
import { Playlist } from '../types';

export const PlaylistsScreen: React.FC = () => {
  const {
    theme,
    playlists,
    selectedIndex,
    setSelectedIndex,
    navigateTo,
    createPlaylist,
    deletePlaylist,
    registerCenterAction,
  } = useMusicPlayer();

  const [isModalVisible, setModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const clampedIndex = Math.min(Math.max(0, selectedIndex), Math.max(0, playlists.length - 1));

  useEffect(() => {
    registerCenterAction(() => {
      const selected = playlists[clampedIndex];
      if (selected) {
        handleSelectPlaylist(selected, clampedIndex);
      }
    });

    return () => {
      registerCenterAction(null);
    };
  }, [clampedIndex, playlists, registerCenterAction]);

  const handleCreate = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert('Required', 'Please enter a playlist name.');
      return;
    }
    await createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setModalVisible(false);
  };

  const handleSelectPlaylist = (playlist: Playlist, idx: number) => {
    setSelectedIndex(idx);
    navigateTo('playlist_detail', { playlistId: playlist.id, playlistName: playlist.name });
  };

  const handleDeletePlaylist = (playlist: Playlist) => {
    Alert.alert('Delete Playlist', `Are you sure you want to delete "${playlist.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePlaylist(playlist.id);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.screenBackground }]}>
      <HeaderBar title={`Playlists (${playlists.length})`} />

      {/* Create New Playlist Bar */}
      <TouchableOpacity
        style={[styles.createBar, { borderBottomColor: theme.screenGlassBorder }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="add-circle" size={18} color={theme.accent} style={{ marginRight: 6 }} />
        <Text style={[styles.createText, { color: theme.accent }]}>Create New Playlist</Text>
      </TouchableOpacity>

      {playlists.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="list-outline" size={48} color={theme.screenSubtext} />
          <Text style={[styles.emptyTitle, { color: theme.screenText }]}>No Playlists</Text>
          <Text style={[styles.emptyDesc, { color: theme.screenSubtext }]}>
            Create custom playlists to organize your favorite albums and songs.
          </Text>
        </View>
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const isSelected = index === clampedIndex;

            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleSelectPlaylist(item, index)}
                onLongPress={() => handleDeletePlaylist(item)}
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
                      <Ionicons
                        name="musical-notes"
                        size={15}
                        color={theme.screenHighlightText}
                        style={styles.iconMargin}
                      />
                      <Text
                        style={[styles.itemTitle, { color: theme.screenHighlightText }]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                    </View>

                    <View style={styles.rightRow}>
                      <Text
                        style={[styles.countText, { color: theme.screenHighlightText + 'CC' }]}
                      >
                        {item.trackCount || 0} tracks
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={theme.screenHighlightText} />
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={styles.normalBar}>
                    <View style={styles.leftRow}>
                      <Ionicons
                        name="musical-notes-outline"
                        size={15}
                        color={theme.screenSubtext}
                        style={styles.iconMargin}
                      />
                      <Text style={[styles.itemTitle, { color: theme.screenText }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>

                    <View style={styles.rightRow}>
                      <Text style={[styles.countText, { color: theme.screenSubtext }]}>
                        {item.trackCount || 0} tracks
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={theme.screenSubtext} />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Modal for Playlist Name */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.screenBackground, borderColor: theme.screenGlassBorder }]}>
            <Text style={[styles.modalTitle, { color: theme.screenText }]}>New Playlist</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.screenText,
                  borderColor: theme.screenGlassBorder,
                  backgroundColor: theme.screenHeaderBg,
                },
              ]}
              placeholder="Playlist Name"
              placeholderTextColor={theme.screenSubtext}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.screenHeaderBg }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: theme.screenText }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.accent }]}
                onPress={handleCreate}
              >
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  createBar: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  createText: {
    fontSize: 12,
    fontWeight: '700',
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
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconMargin: {
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 18,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
