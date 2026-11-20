import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export async function triggerWheelTickHaptic() {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.selectionAsync();
  } catch {
    // Haptics not available or suppressed
  }
}

export async function triggerButtonPressHaptic() {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Suppress error
  }
}

export async function triggerSuccessHaptic() {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Suppress error
  }
}
