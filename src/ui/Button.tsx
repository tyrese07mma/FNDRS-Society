import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { font, radius } from '@/theme/tokens';
import type { IconType } from './icons';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconType;
  iconRight?: IconType;
  block?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const HEIGHT: Record<ButtonSize, number> = { sm: 34, md: 44, lg: 54 };
const PAD: Record<ButtonSize, number> = { sm: 14, md: 18, lg: 24 };
const FONT: Record<ButtonSize, number> = { sm: 13.5, md: 15, lg: 16 };
const ICON: Record<ButtonSize, number> = { sm: 15, md: 17, lg: 18 };

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  block,
  disabled,
  loading,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const { c } = useTheme();
  const v = {
    primary: { bg: c.action, fg: c.actionText, border: 'transparent' },
    secondary: { bg: c.tint08, fg: c.text, border: c.hairline },
    ghost: { bg: 'transparent', fg: c.textMuted, border: 'transparent' },
    accent: { bg: c.accent, fg: c.onAccent, border: 'transparent' },
    danger: { bg: c.dangerSoft, fg: c.danger, border: 'transparent' },
    outline: { bg: 'transparent', fg: c.text, border: c.hairlineStrong },
  }[variant];
  const inactive = disabled || loading;

  return (
    <PressableScale
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      haptics={inactive ? false : 'light'}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={[
        styles.base,
        { height: HEIGHT[size], paddingHorizontal: PAD[size], backgroundColor: v.bg, borderColor: v.border },
        block && styles.block,
        disabled && styles.disabled,
        style,
      ]}
    >
      {variant === 'accent' && (
        <LinearGradient
          colors={c.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]}
        />
      )}
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : (
        <View style={styles.row}>
          {Icon && <Icon size={ICON[size]} color={v.fg} strokeWidth={2.1} />}
          <Text numberOfLines={1} style={{ fontFamily: font.sansSemibold, fontSize: FONT[size], letterSpacing: -0.15, color: v.fg }}>
            {title}
          </Text>
          {IconRight && <IconRight size={ICON[size]} color={v.fg} strokeWidth={2.1} />}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  block: { alignSelf: 'stretch' },
  disabled: { opacity: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
