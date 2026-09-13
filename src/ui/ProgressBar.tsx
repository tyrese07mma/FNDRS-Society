import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Text } from './Text';

export function ProgressBar({
  value,
  max = 100,
  tone = 'default',
  height = 8,
  label,
  valueText,
}: {
  value: number;
  max?: number;
  tone?: 'default' | 'gold' | 'success';
  height?: number;
  label?: string;
  valueText?: string;
}) {
  const { c } = useTheme();
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(pct, { duration: 700, easing: Easing.bezier(0.16, 1, 0.3, 1) }));
  }, [pct, progress]);
  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={{ gap: 7 }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max, now: value }}>
      {(label || valueText) && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          {label ? <Text variant="footnote" color="textMuted">{label}</Text> : <View />}
          {valueText && <Text variant="mono" color="textSubtle">{valueText}</Text>}
        </View>
      )}
      <View style={{ height, borderRadius: radius.pill, backgroundColor: c.tint08, overflow: 'hidden' }}>
        <Animated.View style={[{ height: '100%', borderRadius: radius.pill, overflow: 'hidden' }, fill]}>
          {tone === 'gold' ? (
            <LinearGradient colors={[c.gold[1], c.gold[0]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: tone === 'success' ? c.success : c.text }]} />
          )}
        </Animated.View>
      </View>
    </View>
  );
}
