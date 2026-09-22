import Constants from 'expo-constants';
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const BACKEND_CONFIGURED = /^https:\/\//.test(SUPABASE_URL) && !SUPABASE_URL.includes('YOUR-PROJECT') && !!SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.startsWith('your-');
export const APP_SCHEME = 'fndrs';
// UI rollout switches only: server authentication, quotas and billing remain authoritative.
export const AI_ENABLED = process.env.EXPO_PUBLIC_AI_ENABLED === 'true';
export const BILLING_ENABLED = process.env.EXPO_PUBLIC_BILLING_ENABLED === 'true';
const httpsPage = (value: string | undefined) => {
  try {
    const url = new URL(value ?? '');
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
};
export const LEGAL_URLS = {
  terms: httpsPage(process.env.EXPO_PUBLIC_TERMS_URL),
  privacy: httpsPage(process.env.EXPO_PUBLIC_PRIVACY_URL),
  imprint: httpsPage(process.env.EXPO_PUBLIC_IMPRINT_URL),
};
export const APP_VERSION = Constants.expoConfig?.version ?? '3.0.0';
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@fndrs.society';
