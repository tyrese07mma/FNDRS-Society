import React from 'react';

import { useTheme } from '@/theme/ThemeProvider';
import { font, radius } from '@/theme/tokens';
import type { IconType } from './icons';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconType;
  size?: 'sm' | 'md' | 'lg';
  /** Render as a static tag (no press state). */
  static?: boolean;
}

/** Selectable pill — filters, onboarding answers, skills. */
export function Chip({ label, selected, onPress, icon: Icon, size = 'md', static: isStatic }: ChipProps) {
  const { c } = useTheme();
  const pad = { sm: [6, 10], md: [8, 13], lg: [12, 17] }[size];
  const fs = { sm: 12.5, md: 13.5, lg: 15 }[size];
  const fg = selected ? c.actionText : c.textMuted;
  return (
    <PressableScale
      onPress={onPress}
      disabled={isStatic || !onPress}
      haptics={onPress ? 'selection' : false}
      scaleTo={0.95}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected: !!selected }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: pad[0],
        paddingHorizontal: pad[1],
        borderRadius: radius.pill,
        borderWidth: 1,
        backgroundColor: selected ? c.action : c.tint04,
        borderColor: selected ? c.action : c.hairline,
      }}
    >
      {Icon && <Icon size={fs + 1} color={fg} strokeWidth={2.1} />}
      <Text
        style={{ fontFamily: selected ? font.sansSemibold : font.sansMedium, fontSize: fs, lineHeight: fs * 1.3 }}
        tint={fg}
        numberOfLines={1}
      >
        {label}
      </Text>
    </PressableScale>
  );
}
