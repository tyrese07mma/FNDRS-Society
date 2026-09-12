import React, { useEffect } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export function Skeleton({
  width = '100%',
  height = 14,
  r = 6,
  style,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  r?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const pulse = useSharedValue(0.45);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [pulse]);
  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: c.tint12 }, animated, style]} />;
}

function PostSkeleton() {
  const { c } = useTheme();
  return (
    <View style={{ backgroundColor: c.card, borderRadius: radius.lg, borderWidth: 1, borderColor: c.hairline, padding: space[4], gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Skeleton width={42} height={42} r={21} />
        <View style={{ flex: 1, gap: 7 }}>
          <Skeleton width="45%" height={12} />
          <Skeleton width="70%" height={10} />
        </View>
      </View>
      <Skeleton height={12} />
      <Skeleton height={12} width="92%" />
      <Skeleton height={12} width="60%" />
    </View>
  );
}

function RowSkeleton() {
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 10 }}>
      <Skeleton width={48} height={48} r={24} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="40%" height={12} />
        <Skeleton width="75%" height={10} />
      </View>
    </View>
  );
}

function CardSkeleton() {
  const { c } = useTheme();
  return (
    <View style={{ backgroundColor: c.card, borderRadius: radius.lg, borderWidth: 1, borderColor: c.hairline, overflow: 'hidden' }}>
      <Skeleton height={96} r={0} />
      <View style={{ padding: space[4], gap: 8 }}>
        <Skeleton width="55%" height={13} />
        <Skeleton width="85%" height={10} />
      </View>
    </View>
  );
}

/** A column of placeholder items shown while a list loads. */
export function SkeletonList({ variant = 'row', count = 5 }: { variant?: 'post' | 'row' | 'card'; count?: number }) {
  const Item = variant === 'post' ? PostSkeleton : variant === 'card' ? CardSkeleton : RowSkeleton;
  return (
    <View style={{ gap: variant === 'row' ? 4 : 14 }} accessibilityLabel="Loading">
      {Array.from({ length: count }, (_, i) => (
        <Item key={i} />
      ))}
    </View>
  );
}
