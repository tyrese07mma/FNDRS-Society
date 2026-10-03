import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { hueGradient } from '@/lib/color';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/tokens';
import { Text } from './Text';

/** Muted hue gradient with a soft highlight — covers for startups, spaces, events. */
export function GradientCover({
  hue,
  height = 120,
  style,
  children,
}: {
  hue: number;
  height?: number | `${number}%`;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const { dark } = useTheme();
  const [a, b] = hueGradient(hue, dark);
  return (
    <View style={[{ height, overflow: 'hidden' }, style]}>
      <LinearGradient colors={[a, b]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.7, y: 0.8 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

/** Rounded monogram tile on a hue gradient (startup / community logos). */
export function Monogram({ label, hue, size = 48 }: { label: string; hue: number; size?: number }) {
  const { dark, c } = useTheme();
  const [a, b] = hueGradient(hue, dark);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: c.hairline,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <LinearGradient colors={[a, b]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Text style={{ fontFamily: font.display, fontSize: size * 0.36, lineHeight: size * 0.5 }} maxFontSizeMultiplier={1}>
        {label.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}
