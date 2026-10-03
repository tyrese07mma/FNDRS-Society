import React, { createContext, useContext } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import { useSettings } from '@/state/settings';
import { schemes, type ColorTokens, type SchemeName } from './tokens';

export interface Theme {
  scheme: SchemeName;
  dark: boolean;
  c: ColorTokens;
}

const themes: Record<SchemeName, Theme> = {
  dark: { scheme: 'dark', dark: true, c: schemes.dark },
  light: { scheme: 'light', dark: false, c: schemes.light },
};

const ThemeContext = createContext<Theme>(themes.dark);

/** Resolves the user's appearance setting (system / dark / light) into a theme. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useSettings((s) => s.theme);
  const system = useColorScheme();
  // The brand is dark-first: an unknown system scheme falls back to dark.
  const scheme: SchemeName = mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;
  return <ThemeContext.Provider value={themes[scheme]}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Themed StyleSheet factory. Both schemes are compiled once at module load, the
 * hook just picks the right one — no per-render allocation.
 *
 *   const useStyles = makeStyles((t) => ({ root: { backgroundColor: t.c.bg } }));
 *   const s = useStyles();
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (t: Theme) => T) {
  const sheets: Record<SchemeName, T> = {
    dark: StyleSheet.create(factory(themes.dark)),
    light: StyleSheet.create(factory(themes.light)),
  };
  return function useStyles(): T {
    return sheets[useTheme().scheme];
  };
}
