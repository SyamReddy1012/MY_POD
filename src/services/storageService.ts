import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayerSettings } from '../types';

const SETTINGS_KEY = '@mypod_user_settings_v1';

const DEFAULT_SETTINGS: PlayerSettings = {
  theme: 'silver',
  wheelHaptics: true,
  wheelSound: true,
  wheelSensitivity: 'medium',
  wheelActionMode: 'scroll',
};

export const storageService = {
  async getSettings(): Promise<PlayerSettings> {
    try {
      const data = await AsyncStorage.getItem(SETTINGS_KEY);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Error reading settings:', e);
    }
    return DEFAULT_SETTINGS;
  },

  async saveSettings(settings: PlayerSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Error saving settings:', e);
    }
  },
};
