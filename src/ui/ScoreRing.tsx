import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/tokens';
import { Text } from './Text';

/** Circular 0–100 score (match fit, investor fit). Gold when `accent`. */
export function ScoreRing({
  value,
  size = 64,
  thickness = 5,
  label,
  accent,
}: {
  value: number;
  size?: number;
  thickness?: number;
  label?: string;
  accent?: boolean;
}) {
  const { c } = useTheme();
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const gid = `ring-${size}-${accent ? 'a' : 'n'}`;
  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessibilityLabel={`${Math.round(pct)} percent ${label ?? ''}`}
    >
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c.gold[0]} />
            <Stop offset="1" stopColor={c.gold[1]} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.tint12} strokeWidth={thickness} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={accent ? `url(#${gid})` : c.text}
          strokeWidth={thickness}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - pct / 100)}
        />
      </Svg>
      <Text style={{ fontFamily: font.monoMedium, fontSize: size * 0.27, lineHeight: size * 0.32 }} maxFontSizeMultiplier={1}>
        {Math.round(pct)}
        <Text style={{ fontFamily: font.mono, fontSize: size * 0.14 }} color="textSubtle" maxFontSizeMultiplier={1}>
          %
        </Text>
      </Text>
      {label && size >= 52 && (
        <Text style={{ fontFamily: font.monoMedium, fontSize: 8.5, letterSpacing: 0.9, marginTop: 1 }} color="textSubtle" maxFontSizeMultiplier={1}>
          {label}
        </Text>
      )}
    </View>
  );
}
