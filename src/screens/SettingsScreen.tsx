import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { HeaderBar } from '../components/HeaderBar';
import { ThemeId } from '../types';
import { THEMES } from '../utils/theme';
import { databaseService } from '../services/databaseService';
import { formatFileSize } from '../utils/formatters';

export const SettingsScreen: React.FC = () => {
  const {
    theme,
    settings,
    updateSettings,
    setThemeId,
    tracks,
    refreshLibrary,
    importMusic,
  } = useMusicPlayer();

  const totalBytes = tracks.reduce((sum, t) => sum + (t.fileSize || 0), 0);

  const themeOptions: { id: ThemeId; name: string }[] = [
    { id: 'silver', name: 'Classic Silver (iPod Classic)' },
    { id: 'graphite', name: 'Space Graphite' },
    { id: 'stealth', name: 'Stealth Matte Black' },
    { id: 'u2', name: 'U2 Special Edition' },
  ];

  const handleClearLibrary = () => {
    Alert.alert(
      'Clear Music Library',
      'This will remove all imported songs, playlists, and favorites from MY POD database. Your original audio files on your device will NOT be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await databaseService.clearLibrary();
            await refreshLibrary();
            Alert.alert('Cleared', 'Your music library has been cleared.');
          },
        },
      ]
    );
  };

  const handleImportMore = async () => {
    try {
      const count = await importMusic();
      if (count > 0) {
        Alert.alert('Success', `Imported ${count} new songs.`);
      }
    } catch {
      Alert.alert('Notice', 'No files were imported.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.screenBackground }]}>
      <HeaderBar title="Settings" />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Section: Themes */}
        <Text style={[styles.sectionHeader, { color: theme.screenSubtext }]}>THEME & CASING</Text>
        <View style={[styles.sectionBox, { backgroundColor: theme.screenHeaderBg, borderColor: theme.screenGlassBorder }]}>
          {themeOptions.map((t, idx) => {
            const isSelected = settings.theme === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.rowItem,
                  idx < themeOptions.length - 1 && {
                    borderBottomWidth: 0.5,
                    borderBottomColor: theme.screenGlassBorder,
                  },
                ]}
                onPress={() => setThemeId(t.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.rowLabel, { color: theme.screenText }]}>{t.name}</Text>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={18} color={theme.accent} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Section: Click Wheel Behavior */}
        <Text style={[styles.sectionHeader, { color: theme.screenSubtext }]}>CLICK WHEEL</Text>
        <View style={[styles.sectionBox, { backgroundColor: theme.screenHeaderBg, borderColor: theme.screenGlassBorder }]}>
          {/* Haptics */}
          <View style={[styles.rowItem, { borderBottomWidth: 0.5, borderBottomColor: theme.screenGlassBorder }]}>
            <View>
              <Text style={[styles.rowLabel, { color: theme.screenText }]}>Haptic Feedback</Text>
              <Text style={[styles.rowSublabel, { color: theme.screenSubtext }]}>Vibrate on wheel notch ticks</Text>
            </View>
            <Switch
              value={settings.wheelHaptics}
              onValueChange={(val) => updateSettings({ wheelHaptics: val })}
              trackColor={{ false: '#767577', true: theme.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Sensitivity */}
          <View style={[styles.rowItem, { borderBottomWidth: 0.5, borderBottomColor: theme.screenGlassBorder }]}>
            <Text style={[styles.rowLabel, { color: theme.screenText }]}>Sensitivity</Text>
            <View style={styles.segmentContainer}>
              {(['low', 'medium', 'high'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.segmentBtn,
                    settings.wheelSensitivity === s && {
                      backgroundColor: theme.accent,
                    },
                  ]}
                  onPress={() => updateSettings({ wheelSensitivity: s })}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color:
                          settings.wheelSensitivity === s
                            ? '#FFFFFF'
                            : theme.screenSubtext,
                      },
                    ]}
                  >
                    {s.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Wheel Action Mode */}
          <View style={styles.rowItem}>
            <View>
              <Text style={[styles.rowLabel, { color: theme.screenText }]}>Rotation Mode</Text>
              <Text style={[styles.rowSublabel, { color: theme.screenSubtext }]}>
                {settings.wheelActionMode === 'scroll' ? 'Scroll Lists / Menus' : 'Direct Volume Adjustment'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.modeToggle, { backgroundColor: theme.accent }]}
              onPress={() =>
                updateSettings({
                  wheelActionMode: settings.wheelActionMode === 'scroll' ? 'volume' : 'scroll',
                })
              }
            >
              <Text style={styles.modeToggleText}>
                {settings.wheelActionMode === 'scroll' ? 'Scroll' : 'Volume'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Storage & Library */}
        <Text style={[styles.sectionHeader, { color: theme.screenSubtext }]}>STORAGE & FILES</Text>
        <View style={[styles.sectionBox, { backgroundColor: theme.screenHeaderBg, borderColor: theme.screenGlassBorder }]}>
          <View style={[styles.rowItem, { borderBottomWidth: 0.5, borderBottomColor: theme.screenGlassBorder }]}>
            <Text style={[styles.rowLabel, { color: theme.screenText }]}>Library Tracks</Text>
            <Text style={[styles.statValue, { color: theme.screenSubtext }]}>{tracks.length} songs</Text>
          </View>

          {totalBytes > 0 && (
            <View style={[styles.rowItem, { borderBottomWidth: 0.5, borderBottomColor: theme.screenGlassBorder }]}>
              <Text style={[styles.rowLabel, { color: theme.screenText }]}>Estimated Size</Text>
              <Text style={[styles.statValue, { color: theme.screenSubtext }]}>{formatFileSize(totalBytes)}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.rowItem, { borderBottomWidth: 0.5, borderBottomColor: theme.screenGlassBorder }]}
            onPress={handleImportMore}
          >
            <Text style={[styles.rowLabel, { color: theme.accent }]}>Import More Music...</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.accent} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.rowItem} onPress={handleClearLibrary}>
            <Text style={[styles.rowLabel, { color: '#E50914' }]}>Clear Library Data</Text>
            <Ionicons name="trash-outline" size={16} color="#E50914" />
          </TouchableOpacity>
        </View>

        {/* Section: Android Background Notice */}
        <Text style={[styles.sectionHeader, { color: theme.screenSubtext }]}>ANDROID BACKGROUND PLAYBACK</Text>
        <View style={[styles.infoBox, { backgroundColor: theme.screenHeaderBg, borderColor: theme.screenGlassBorder }]}>
          <Ionicons name="information-circle-outline" size={16} color={theme.accent} style={{ marginTop: 2, marginRight: 8 }} />
          <Text style={[styles.infoText, { color: theme.screenSubtext }]}>
            MY POD is configured with Android background audio services and lock-screen support. To ensure uninterrupted background playback during device sleep, allow "Unrestricted Battery" for MY POD in Android App Info settings.
          </Text>
        </View>

        <Text style={[styles.footerText, { color: theme.screenSubtext }]}>
          MY POD Offline Classic • v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 24,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 6,
    marginLeft: 4,
  },
  sectionBox: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  rowSublabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 6,
    padding: 2,
  },
  segmentBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  segmentText: {
    fontSize: 10,
    fontWeight: '800',
  },
  modeToggle: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  modeToggleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 10,
  },
});
