import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { font, radius } from '@/theme/tokens';
import type { IconType } from './icons';
import { Text } from './Text';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'solid' | 'outline';

export function Badge({
  children,
  tone = 'neutral',
  dot,
  icon: Icon,
  size = 'sm',
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  icon?: IconType;
  size?: 'sm' | 'md';
}) {
  const { c } = useTheme();
  const tones: Record<BadgeTone, { bg: string; fg: string; border: string }> = {
    neutral: { bg: c.tint08, fg: c.textMuted, border: 'transparent' },
    accent: { bg: c.accentSoft, fg: c.accentText, border: c.accentBorder },
    success: { bg: c.successSoft, fg: c.success, border: 'transparent' },
    warning: { bg: c.warningSoft, fg: c.warning, border: 'transparent' },
    danger: { bg: c.dangerSoft, fg: c.danger, border: 'transparent' },
    info: { bg: c.infoSoft, fg: c.info, border: 'transparent' },
    solid: { bg: c.action, fg: c.actionText, border: 'transparent' },
    outline: { bg: 'transparent', fg: c.textMuted, border: c.hairlineStrong },
  };
  const t = tones[tone];
  const md = size === 'md';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 5,
        paddingHorizontal: md ? 10 : 7,
        paddingVertical: md ? 5 : 3,
        borderRadius: radius.xs,
        borderWidth: 1,
        backgroundColor: t.bg,
        borderColor: t.border,
      }}
    >
      {dot && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.fg }} />}
      {Icon && <Icon size={md ? 13 : 11} color={t.fg} strokeWidth={2.2} />}
      <Text
        tint={t.fg}
        style={{ fontFamily: font.monoMedium, fontSize: md ? 11.5 : 10.5, lineHeight: md ? 14 : 13, letterSpacing: 0.8 }}
        uppercase
        numberOfLines={1}
      >
        {children}
      </Text>
    </View>
  );
}

export function CountBadge({ count, max = 99 }: { count: number; max?: number }) {
  const { c } = useTheme();
  if (count <= 0) return null;
  return (
    <View
      style={{
        minWidth: 18,
        height: 18,
        paddingHorizontal: 5,
        borderRadius: radius.pill,
        backgroundColor: c.danger,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: c.bg,
        boxSizing: 'content-box',
      }}
    >
      <Text style={{ fontFamily: font.monoMedium, fontSize: 10, lineHeight: 12, color: '#fff' }}>
        {count > max ? `${max}+` : count}
      </Text>
    </View>
  );
}

/** Small dot indicator (e.g. unread). */
export function Dot({ color, size = 8 }: { color?: string; size?: number }) {
  const { c } = useTheme();
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color ?? c.accent }} />;
}
