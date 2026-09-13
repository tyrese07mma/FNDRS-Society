import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { PressableScale } from './PressableScale';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** `true` = default padding, a number = custom padding, `false` = none. */
  padded?: boolean | number;
  variant?: 'default' | 'outline' | 'tint' | 'accent';
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
}

export function Card({ children, style, padded = true, variant = 'default', onPress, onLongPress, accessibilityLabel }: CardProps) {
  const s = useStyles();
  const composed: StyleProp<ViewStyle> = [
    s.card,
    variant === 'outline' && s.outline,
    variant === 'tint' && s.tint,
    variant === 'accent' && s.accent,
    padded !== false && { padding: typeof padded === 'number' ? padded : space[4] },
    style,
  ];
  if (onPress || onLongPress) {
    return (
      <PressableScale
        scaleTo={0.985}
        nestedInteractive
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityLabel={accessibilityLabel}
        style={composed}
      >
        {children}
      </PressableScale>
    );
  }
  return (
    <View style={composed} accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    backgroundColor: t.c.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.c.hairline,
    overflow: 'hidden',
    boxShadow: t.dark ? undefined : '0px 1px 2px rgba(42,36,21,0.05), 0px 6px 18px rgba(42,36,21,0.05)',
  },
  outline: { backgroundColor: 'transparent', borderColor: t.c.hairlineStrong, boxShadow: undefined },
  tint: { backgroundColor: t.c.tint04, borderColor: 'transparent', boxShadow: undefined },
  accent: { backgroundColor: t.c.accentSoft, borderColor: t.c.accentBorder, boxShadow: undefined },
}));
