import { useSettings } from '@/state/settings';
import { translate } from './core';
import { de } from './de';

export function useTranslation() {
 const language = useSettings(state => state.language);
 return { language, locale: language === 'de' ? 'de-DE' : 'en-GB', t: (key: string, values?: Record<string,string|number>) => translate(language,key,de,values) };
}
export const currentLocale = () => useSettings.getState().language === 'de' ? 'de-DE' : 'en-GB';
export const translateNow = (key: string, values?: Record<string,string|number>) => translate(useSettings.getState().language, key, de, values);
