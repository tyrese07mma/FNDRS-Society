export type Language = 'de' | 'en';
export function interpolate(text: string, values: Record<string, string | number> = {}): string {
 return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => values[key] === undefined ? match : String(values[key]));
}
export function translate(language: Language, key: string, translations: Record<string, string>, values?: Record<string, string | number>): string {
 return interpolate(language === 'de' ? translations[key] ?? key : key, values);
}
