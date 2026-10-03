import React, { useEffect, useState } from 'react';
import { Pressable, View, type LayoutRectangle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius } from '@/theme/tokens';
import { Text } from './Text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  badge?: number;
}

/** Pill segmented control with a spring-animated selection indicator. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  const { c } = useTheme();
  const [rects, setRects] = useState<Partial<Record<T, LayoutRectangle>>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const active = rects[value];

  useEffect(() => {
    if (!active) return;
    const cfg = { damping: 20, stiffness: 260, mass: 0.8 };
    if (w.get() === 0) {
      x.set(active.x);
      w.set(active.width);
    } else {
      x.set(withSpring(active.x, cfg));
      w.set(withSpring(active.width, cfg));
    }
  }, [active, x, w]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: w.value }));
  const h = size === 'sm' ? 32 : 38;

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        padding: 3,
        borderRadius: radius.pill,
        backgroundColor: c.tint04,
        borderWidth: 1,
        borderColor: c.hairline,
      }}
    >
      {active && (
        <Animated.View
          style={[
            { position: 'absolute', top: 3, left: 0, height: h, borderRadius: radius.pill, backgroundColor: c.action },
            pill,
          ]}
        />
      )}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onLayout={(e) => {
              const layout = e.nativeEvent.layout;
              setRects((r) => ({ ...r, [o.value]: layout }));
            }}
            onPress={() => {
              if (on) return;
              haptic.selection();
              onChange(o.value);
            }}
            style={{ flex: 1, height: h, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 10 }}
          >
            <Text
              numberOfLines={1}
              style={{ fontFamily: on ? font.sansSemibold : font.sansMedium, fontSize: size === 'sm' ? 13 : 14 }}
              tint={on ? c.actionText : c.textSubtle}
            >
              {o.label}
            </Text>
            {!!o.badge && o.badge > 0 && (
              <View
                style={{
                  minWidth: 16,
                  height: 16,
                  paddingHorizontal: 4,
                  borderRadius: 8,
                  backgroundColor: on ? c.actionText : c.danger,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: font.monoMedium, fontSize: 9.5, lineHeight: 12 }} tint={on ? c.action : '#fff'}>
                  {o.badge}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
