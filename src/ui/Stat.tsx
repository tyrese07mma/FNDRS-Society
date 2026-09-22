import React from 'react';
import { View } from 'react-native';

import { font } from '@/theme/tokens';
import { Text } from './Text';

export function Stat({
  value,
  label,
  delta,
  size = 'md',
  align = 'left',
}: {
  value: string | number;
  label: string;
  delta?: number;
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'center';
}) {
  const fs = { sm: 18, md: 24, lg: 32 }[size];
  return (
    <View style={{ gap: 2, alignItems: align === 'center' ? 'center' : 'flex-start' }}>
      <Text style={{ fontFamily: font.monoMedium, fontSize: fs, lineHeight: fs * 1.2, letterSpacing: -0.5 }}>{value}</Text>
      <Text variant="caption" color="textSubtle" numberOfLines={1}>
        {label}
      </Text>
      {delta != null && (
        <Text variant="mono" color={delta >= 0 ? 'success' : 'danger'} style={{ marginTop: 2 }}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
        </Text>
      )}
    </View>
  );
}
