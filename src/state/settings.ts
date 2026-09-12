import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { MatchFilters } from '@/data/types';
import { switchAccountPreferences, type AccountPreferences } from '@/lib/account-preferences';

export type ThemeMode = 'system' | 'dark' | 'light';

export interface NotificationPrefs {
  matches: boolean;
  messages: boolean;
  events: boolean;
  digest: boolean;
}

interface SettingsState {
  savedAccounts: Record<string, AccountPreferences>;
  ownerId: string | null;
  dirty: boolean;
  filters: MatchFilters;
  setFilters: (filters: MatchFilters) => void;
  activateAccount: (ownerId: string | null) => void;
  forgetAccount: (ownerId: string) => void;
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
      savedAccounts: {},
      ownerId: null,
      dirty: false,
      filters: { roles: [], stages: [], industries: [], minScore: 0 },
      setFilters: (filters) => set({ filters, dirty: true }),
      activateAccount: (ownerId) => set(s => switchAccountPreferences(s, ownerId)),
      forgetAccount: (ownerId) => set(s => {
        const savedAccounts = { ...s.savedAccounts };
        delete savedAccounts[ownerId];
        if (s.ownerId !== ownerId) return { savedAccounts };
        const cleared = switchAccountPreferences(s, null);
        return { ...cleared, savedAccounts };
      }),
      theme: 'system',
      haptics: true,
      notifications: { matches: true, messages: true, events: true, digest: false },
      recentSearches: [],
      hydrated: false,
      setTheme: (theme) => set({ theme, dirty: true }),
      setHaptics: (haptics) => set({ haptics, dirty: true }),
      setNotification: (key, on) =>
        set((s) => ({ notifications: { ...s.notifications, [key]: on }, dirty: true })),
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
        savedAccounts: s.savedAccounts,
        ownerId: s.ownerId,
        dirty: s.dirty,
        filters: s.filters,
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
