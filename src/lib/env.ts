import Constants from 'expo-constants';
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const BACKEND_CONFIGURED = /^https:\/\//.test(SUPABASE_URL) && !SUPABASE_URL.includes('YOUR-PROJECT') && !!SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.startsWith('your-');
export const APP_SCHEME = 'fndrs';
export const APP_VERSION = Constants.expoConfig?.version ?? '3.0.0';
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@fndrs.society';
