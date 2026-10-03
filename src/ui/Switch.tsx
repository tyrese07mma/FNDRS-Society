import React, { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';

export function Switch({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange?: (v: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  const progress = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    progress.set(withSpring(value ? 1 : 0, { damping: 16, stiffness: 240 }));
  }, [value, progress]);

  const off = c.tint20;
  const on = c.action;
  const knobOff = c.card;
  const knobOn = c.actionText;

  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [off, on]),
  }));
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: 3 + progress.value * 18 }],
    backgroundColor: interpolateColor(progress.value, [0, 1], [knobOff, knobOn]),
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        haptic.selection();
        onValueChange?.(!value);
      }}
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      <Animated.View style={[{ width: 44, height: 26, borderRadius: 13, justifyContent: 'center' }, track]}>
        <Animated.View
          style={[
            { width: 20, height: 20, borderRadius: 10, boxShadow: '0px 1px 3px rgba(0,0,0,0.25)' },
            knob,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}
