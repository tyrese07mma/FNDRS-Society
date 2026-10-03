import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';

function Dot({ delay }: { delay: number }) {
  const { c } = useTheme();
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(
      withDelay(
        delay,
        withRepeat(withSequence(withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 320 })), -1),
      ),
    );
  }, [v, delay]);
  const style = useAnimatedStyle(() => ({ opacity: 0.35 + v.value * 0.65, transform: [{ translateY: -v.value * 3 }] }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.textMuted }, style]} />;
}

/** "…" bubble shown while the other person is typing (or Copilot is thinking). */
export function TypingBubble() {
  const { c } = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} accessibilityLabel="Typing">
      <View
        style={{
          alignSelf: 'flex-start',
          flexDirection: 'row',
          gap: 5,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 20,
          borderBottomLeftRadius: 6,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.hairline,
        }}
      >
        <Dot delay={0} />
        <Dot delay={140} />
        <Dot delay={280} />
      </View>
    </Animated.View>
  );
}
