import * as WebBrowser from 'expo-web-browser';
import { translateNow } from '@/i18n';
import { toast } from '@/state/toast';
import { openWebDestination } from './web-url';

export function openWeb(input: string | (() => string)) {
  return openWebDestination(input, WebBrowser.openBrowserAsync, () => {
    toast.error(translateNow('The page could not be opened.'));
  });
}
