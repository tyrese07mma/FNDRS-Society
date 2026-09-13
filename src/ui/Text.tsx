import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { typography, type ColorTokens, type TypeVariant } from '@/theme/tokens';

export type ColorName = {
  [K in keyof ColorTokens]: ColorTokens[K] extends string ? K : never;
}[keyof ColorTokens];

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  /** Semantic color token. */
  color?: ColorName;
  /** Raw color override (e.g. a hue ink). Wins over `color`. */
  tint?: string;
  align?: 'left' | 'center' | 'right';
  uppercase?: boolean;
}

/** The only text primitive screens should use — typography + theme aware. */
export function Text({
  variant = 'body',
  color = 'text',
  tint,
  align,
  uppercase,
  style,
  maxFontSizeMultiplier = 1.35,
  ...rest
}: AppTextProps) {
  const { c } = useTheme();
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        typography[variant],
        { color: tint ?? c[color] },
        align ? { textAlign: align } : null,
        uppercase ? { textTransform: 'uppercase' } : null,
        style,
      ]}
      {...rest}
    />
  );
}
