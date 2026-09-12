/**
 * FNDRS SOCIETY v2 — design tokens.
 *
 * The brand stays the same as v1 (warm-black canvas, ivory ink, one champagne
 * accent, Michroma / Geist / Geist Mono) but v2 ships a second, light "Ivory"
 * scheme and semantic token names so every screen can be themed.
 * Never hard-code a color in a screen — read it from `useTheme().c`.
 */

export const palette = {
  ink990: '#050506',
  ink950: '#0A0A0C',
  ink900: '#0F0F12',
  ink850: '#141418',
  ink800: '#191920',
  ink750: '#1F1F27',
  ink700: '#26262F',
  ink600: '#32323C',
  ink500: '#45454F',
  ink400: '#5C5C67',
  ink300: '#7C7C87',
  ink200: '#A2A2AC',
  ink100: '#C9C9D0',
  ink050: '#E7E7EA',

  paper000: '#FFFFFF',
  paper050: '#FBF9F4',
  paper100: '#F5F2EA',
  paper200: '#EEEAE0',
  paper300: '#E4DFD3',

  ivory: '#F4F1E9',
  white: '#FFFFFF',

  gold300: '#EEDDB6',
  gold400: '#E4CD9B',
  gold500: '#CBA968',
  gold600: '#A9884B',
  gold700: '#8A6D35',
  goldInk: '#221A08',
} as const;

export interface ColorTokens {
  bg: string;
  bgElevated: string;
  card: string;
  cardAlt: string;
  input: string;

  text: string;
  textMuted: string;
  textSubtle: string;
  textFaint: string;

  border: string;
  borderStrong: string;
  hairline: string;
  hairlineStrong: string;

  tint04: string;
  tint08: string;
  tint12: string;
  tint20: string;

  action: string;
  actionText: string;

  accent: string;
  accentText: string;
  accentSoft: string;
  accentBorder: string;
  onAccent: string;

  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;

  scrim: string;
  glass: string;
  glassBorder: string;
  shadow: string;

  cover: [string, string];
  gold: [string, string];
}

const dark: ColorTokens = {
  bg: palette.ink950,
  bgElevated: palette.ink900,
  card: palette.ink850,
  cardAlt: palette.ink800,
  input: palette.ink800,

  text: palette.ivory,
  textMuted: palette.ink200,
  textSubtle: palette.ink300,
  textFaint: palette.ink400,

  border: palette.ink700,
  borderStrong: palette.ink600,
  hairline: 'rgba(244,241,233,0.08)',
  hairlineStrong: 'rgba(244,241,233,0.15)',

  tint04: 'rgba(244,241,233,0.04)',
  tint08: 'rgba(244,241,233,0.08)',
  tint12: 'rgba(244,241,233,0.12)',
  tint20: 'rgba(244,241,233,0.20)',

  action: palette.ivory,
  actionText: palette.ink950,

  accent: palette.gold500,
  accentText: palette.gold400,
  accentSoft: 'rgba(203,169,104,0.13)',
  accentBorder: 'rgba(203,169,104,0.38)',
  onAccent: palette.goldInk,

  success: '#5AA981',
  successSoft: 'rgba(90,169,129,0.15)',
  warning: '#D2A24E',
  warningSoft: 'rgba(210,162,78,0.15)',
  danger: '#E0705F',
  dangerSoft: 'rgba(224,112,95,0.15)',
  info: '#7C97C7',
  infoSoft: 'rgba(124,151,199,0.15)',

  scrim: 'rgba(5,5,6,0.66)',
  glass: 'rgba(18,18,22,0.72)',
  glassBorder: 'rgba(244,241,233,0.12)',
  shadow: '#000000',

  cover: ['#26262F', '#0F0F12'],
  gold: [palette.gold400, palette.gold600],
};

const light: ColorTokens = {
  bg: palette.paper100,
  bgElevated: palette.paper050,
  card: palette.paper000,
  cardAlt: palette.paper200,
  input: palette.paper000,

  text: '#121216',
  textMuted: '#4A4A55',
  textSubtle: '#7A7A85',
  textFaint: '#A6A6AE',

  border: 'rgba(18,18,22,0.12)',
  borderStrong: 'rgba(18,18,22,0.22)',
  hairline: 'rgba(18,18,22,0.08)',
  hairlineStrong: 'rgba(18,18,22,0.15)',

  tint04: 'rgba(18,18,22,0.035)',
  tint08: 'rgba(18,18,22,0.06)',
  tint12: 'rgba(18,18,22,0.10)',
  tint20: 'rgba(18,18,22,0.16)',

  action: '#121216',
  actionText: palette.ivory,

  accent: palette.gold600,
  accentText: palette.gold700,
  accentSoft: 'rgba(169,136,75,0.12)',
  accentBorder: 'rgba(169,136,75,0.40)',
  onAccent: palette.goldInk,

  success: '#2F8A5F',
  successSoft: 'rgba(47,138,95,0.12)',
  warning: '#B7822A',
  warningSoft: 'rgba(183,130,42,0.12)',
  danger: '#C0503F',
  dangerSoft: 'rgba(192,80,63,0.11)',
  info: '#4F6FA8',
  infoSoft: 'rgba(79,111,168,0.12)',

  scrim: 'rgba(18,18,22,0.42)',
  glass: 'rgba(251,249,244,0.78)',
  glassBorder: 'rgba(18,18,22,0.08)',
  shadow: '#2A2415',

  cover: ['#E9E3D5', '#F5F2EA'],
  gold: [palette.gold500, palette.gold700],
};

export const schemes = { dark, light } as const;
export type SchemeName = keyof typeof schemes;

export const space = {
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 28, 8: 32,
  10: 40, 12: 48, 16: 64, 20: 80, 24: 96,
} as const;

export const radius = {
  xs: 6, sm: 10, md: 14, lg: 18, xl: 24, xxl: 30, pill: 999,
} as const;

export const font = {
  display: 'Michroma_400Regular',
  sans: 'Geist_400Regular',
  sansMedium: 'Geist_500Medium',
  sansSemibold: 'Geist_600SemiBold',
  sansBold: 'Geist_700Bold',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
} as const;

/** Type scale. Each entry is a complete text style (size, line height, family, tracking). */
export const typography = {
  display: { fontFamily: font.display, fontSize: 28, lineHeight: 36, letterSpacing: 3 },
  largeTitle: { fontFamily: font.sansBold, fontSize: 30, lineHeight: 36, letterSpacing: -0.8 },
  title1: { fontFamily: font.sansBold, fontSize: 24, lineHeight: 30, letterSpacing: -0.5 },
  title2: { fontFamily: font.sansBold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  title3: { fontFamily: font.sansSemibold, fontSize: 17, lineHeight: 23, letterSpacing: -0.2 },
  headline: { fontFamily: font.sansSemibold, fontSize: 15, lineHeight: 20, letterSpacing: -0.1 },
  body: { fontFamily: font.sans, fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  bodyStrong: { fontFamily: font.sansMedium, fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  callout: { fontFamily: font.sans, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  footnote: { fontFamily: font.sans, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  caption: { fontFamily: font.sans, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
  mono: { fontFamily: font.mono, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  label: { fontFamily: font.monoMedium, fontSize: 11, lineHeight: 14, letterSpacing: 1 },
  number: { fontFamily: font.monoMedium, fontSize: 20, lineHeight: 24, letterSpacing: -0.4 },
} as const;
export type TypeVariant = keyof typeof typography;

/** Motion — durations (ms) and bezier control points for Reanimated. */
export const motion = {
  fast: 140,
  base: 220,
  slow: 340,
  sheet: 420,
  easeOut: [0.16, 1, 0.3, 1] as const,
  easeEmphasized: [0.32, 0.72, 0, 1] as const,
  spring: { damping: 18, stiffness: 220, mass: 0.9 },
  springSoft: { damping: 22, stiffness: 160, mass: 1 },
} as const;

/** Floating tab bar geometry — screens pad their scroll content by this. */
export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_GAP = 12;
