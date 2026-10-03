import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useSettings } from '@/state/settings';

const enabled = () => Platform.OS !== 'web' && useSettings.getState().haptics;
const swallow = () => {};

/** Fire-and-forget haptics that respect the user's "Haptics" setting. */
export const haptic = {
  selection() {
    if (enabled()) Haptics.selectionAsync().catch(swallow);
  },
  light() {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(swallow);
  },
  medium() {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(swallow);
  },
  heavy() {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(swallow);
  },
  success() {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(swallow);
  },
  warning() {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(swallow);
  },
  error() {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(swallow);
  },
};
