import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeMode = 'system' | 'dark' | 'light';

export interface NotificationPrefs {
  matches: boolean;
  messages: boolean;
  events: boolean;
  digest: boolean;
}

interface SettingsState {
  theme: ThemeMode;
  haptics: boolean;
  notifications: NotificationPrefs;
  recentSearches: string[];
  hydrated: boolean;
  setTheme: (mode: ThemeMode) => void;
  setHaptics: (on: boolean) => void;
  setNotification: (key: keyof NotificationPrefs, on: boolean) => void;
  pushRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

/** Device-local preferences. Persisted to AsyncStorage (localStorage on web). */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      haptics: true,
      notifications: { matches: true, messages: true, events: true, digest: false },
      recentSearches: [],
      hydrated: false,
      setTheme: (theme) => set({ theme }),
      setHaptics: (haptics) => set({ haptics }),
      setNotification: (key, on) =>
        set((s) => ({ notifications: { ...s.notifications, [key]: on } })),
      pushRecentSearch: (query) =>
        set((s) => {
          const q = query.trim();
          if (q.length < 2) return s;
          return { recentSearches: [q, ...s.recentSearches.filter((x) => x !== q)].slice(0, 8) };
        }),
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: 'fndrs.settings.v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        theme: s.theme,
        haptics: s.haptics,
        notifications: s.notifications,
        recentSearches: s.recentSearches,
      }),
      onRehydrateStorage: () => () => {
        useSettings.setState({ hydrated: true });
      },
    },
  ),
);
