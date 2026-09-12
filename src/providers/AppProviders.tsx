import { focusManager, MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect, useMemo } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { isApiError } from '@/data/api';
import { toast } from '@/state/toast';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { AuthProvider } from './AuthProvider';

function describe(err: unknown) {
  return err instanceof Error ? err.message : 'Please try again in a moment.';
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      // Domain errors (not found, forbidden…) won't fix themselves on retry.
      retry: (count, err) => !isApiError(err) && count < 2,
    },
    mutations: { retry: 0 },
  },
  mutationCache: new MutationCache({
    onError: (err, _vars, _ctx, mutation) => {
      if (mutation.meta?.silent) return;
      toast.error(isApiError(err, 'VALIDATION') ? 'Check that again' : 'Something went wrong', describe(err));
    },
  }),
});

/** Feeds our tokens into the navigator so screen backgrounds never flash white. */
function NavigationTheme({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const value = useMemo(() => {
    const base = t.dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: t.c.accent,
        background: t.c.bg,
        card: t.c.bg,
        text: t.c.text,
        border: t.c.hairline,
        notification: t.c.danger,
      },
    };
  }, [t]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(t.c.bg).catch(() => {});
  }, [t]);

  return <NavigationThemeProvider value={value}>{children}</NavigationThemeProvider>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (s) => focusManager.setFocused(s === 'active'));
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <NavigationTheme>
              <AuthProvider>{children}</AuthProvider>
            </NavigationTheme>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
