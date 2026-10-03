import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/** iOS 26+ gets real Liquid Glass; everything else gets a tuned blur + tint. */
const LIQUID = Platform.OS === 'ios' && isLiquidGlassAvailable();

export function Glass({
  style,
  children,
  radius = 0,
  intensity = 55,
}: {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  radius?: number;
  intensity?: number;
}) {
  const { dark, c } = useTheme();
  if (LIQUID) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={dark ? 'dark' : 'light'}
        style={[{ borderRadius: radius, overflow: 'hidden' }, style]}
      >
        {children}
      </GlassView>
    );
  }
  // Android's native blur needs a BlurTargetView per screen; a solid elevated
  // tint reads cleaner there and keeps scrolling smooth.
  const android = Platform.OS === 'android';
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden', borderWidth: 1, borderColor: c.glassBorder }, style]}>
      {!android && <BlurView tint={dark ? 'dark' : 'light'} intensity={intensity} style={StyleSheet.absoluteFill} />}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: android ? c.bgElevated : c.glass }]} />
      {children}
    </View>
  );
}
