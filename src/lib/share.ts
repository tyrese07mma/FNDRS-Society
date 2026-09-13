import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Platform, Share } from 'react-native';

import { toast } from '@/state/toast';

/** Deep link into the app (fndrs://… in store builds, exp://… in Expo Go). */
export const appLink = (path: string) => Linking.createURL(path);

/** Native share sheet; on web uses the Web Share API or falls back to the clipboard. */
export async function shareText(message: string, url?: string) {
  const text = url ? `${message}\n${url}` : message;
  try {
    if (Platform.OS === 'web') {
      const nav = globalThis.navigator as (Navigator & { share?: (d: { text?: string; url?: string }) => Promise<void> }) | undefined;
      if (nav?.share) {
        await nav.share({ text: message, url });
        return;
      }
      await Clipboard.setStringAsync(text);
      toast.success('Copied to clipboard');
      return;
    }
    await Share.share(Platform.OS === 'ios' && url ? { message, url } : { message: text });
  } catch {
    // dismissed by the user
  }
}

export async function copy(text: string, label = 'Copied') {
  await Clipboard.setStringAsync(text);
  toast.success(label);
}
