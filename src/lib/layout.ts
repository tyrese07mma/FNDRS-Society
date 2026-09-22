import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_HEIGHT } from '@/theme/tokens';

/** Bottom padding that keeps scroll content clear of the floating tab bar. */
export function useTabBarPadding(extra = 24) {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, 12) + extra;
}

/** Content column width for tablets and the web. */
export const CONTENT_MAX = 680;

/**
 * KeyboardAvoidingView behaviour. Android runs edge-to-edge (the window is not
 * resized for the keyboard), so both native platforms use padding.
 */
export const KAV_BEHAVIOR: 'padding' | undefined = Platform.OS === 'web' ? undefined : 'padding';

/** True while the software keyboard is on screen. */
export function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}
