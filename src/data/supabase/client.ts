import 'react-native-url-polyfill/auto';

import { sessionStorage } from '@/lib/session-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { BACKEND_CONFIGURED, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';

let client: SupabaseClient | null = null;

/**
 * Lazily created Supabase client — only instantiated when configured, so a
 * missing URL can't crash the app at import time.
 */
export function sb(): SupabaseClient {
  if (!BACKEND_CONFIGURED) throw new Error('The service is not configured yet. Please try again later.');
  if (client) return client;
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: sessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  if (Platform.OS !== 'web') {
    // Only refresh tokens while the app is in the foreground.
    AppState.addEventListener('change', (state) => {
      if (state === 'active') client?.auth.startAutoRefresh();
      else client?.auth.stopAutoRefresh();
    });
  }
  return client;
}
