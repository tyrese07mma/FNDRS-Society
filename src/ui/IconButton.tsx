import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { CountBadge } from './Badge';
import type { IconType } from './icons';
import { PressableScale } from './PressableScale';

export interface IconButtonProps {
  icon: IconType;
  onPress?: () => void;
  variant?: 'tint' | 'plain' | 'solid' | 'glass' | 'outline';
  size?: number;
  iconSize?: number;
  color?: string;
  badge?: number;
  /** Small dot badge instead of a count. */
  dot?: boolean;
  disabled?: boolean;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  fill?: string;
}

export function IconButton({
  icon: Icon,
  onPress,
  variant = 'tint',
  size = 40,
  iconSize,
  color,
  badge,
  dot,
  disabled,
  accessibilityLabel,
  style,
  fill,
}: IconButtonProps) {
  const { c } = useTheme();
  const bg = {
    tint: c.tint08,
    plain: 'transparent',
    solid: c.action,
    glass: c.glass,
    outline: 'transparent',
  }[variant];
  const fg = color ?? (variant === 'solid' ? c.actionText : c.text);
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptics="selection"
      scaleTo={0.9}
      hitSlop={6}
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius.pill,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: variant === 'glass' || variant === 'outline' ? 1 : 0,
          borderColor: variant === 'outline' ? c.hairlineStrong : c.glassBorder,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      <Icon size={iconSize ?? Math.round(size * 0.47)} color={fg} strokeWidth={2} fill={fill ?? 'transparent'} />
      {!!badge && badge > 0 && (
        <View style={{ position: 'absolute', top: -4, right: -4 }}>
          <CountBadge count={badge} />
        </View>
      )}
      {dot && !badge && (
        <View
          style={{
            position: 'absolute',
            top: size * 0.2,
            right: size * 0.2,
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: c.danger,
            borderWidth: 2,
            borderColor: c.bg,
          }}
        />
      )}
    </PressableScale>
  );
}
