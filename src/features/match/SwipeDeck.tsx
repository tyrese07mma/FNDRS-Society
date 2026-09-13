import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { MatchCandidate, SwipeAction } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius } from '@/theme/tokens';
import { Text } from '@/ui';
import { CandidateCard } from './CandidateCard';

export interface DeckHandle {
  swipe: (action: SwipeAction) => void;
}

const SWIPE_X = 110;
const SWIPE_UP = 140;

function Stamp({ label, color, style }: { label: string; color: string; style: object }) {
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderWidth: 3,
          borderColor: color,
          borderRadius: radius.sm,
          backgroundColor: 'rgba(10,10,12,0.35)',
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: font.display, fontSize: 20, letterSpacing: 3, lineHeight: 28 }} tint={color} maxFontSizeMultiplier={1}>
        {label}
      </Text>
    </Animated.View>
  );
}

function DeckCard({
  candidate,
  index,
  onDone,
  onOpen,
  ref,
}: {
  candidate: MatchCandidate;
  index: number;
  onDone: (a: SwipeAction) => void;
  onOpen: () => void;
  ref?: React.Ref<DeckHandle>;
}) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const depth = useSharedValue(index);
  const flyX = width * 1.5;

  useEffect(() => {
    depth.set(withSpring(index, { damping: 18, stiffness: 180 }));
  }, [index, depth]);

  const fling = (action: SwipeAction) => {
    if (action === 'superlike') {
      y.set(
        withTiming(-1400, { duration: 320 }, (finished) => {
          if (finished) scheduleOnRN(onDone, action);
        }),
      );
    } else {
      x.set(
        withTiming((action === 'connect' ? 1 : -1) * flyX, { duration: 300 }, (finished) => {
          if (finished) scheduleOnRN(onDone, action);
        }),
      );
    }
  };
  useImperativeHandle(ref, () => ({ swipe: fling }));

  const pan = Gesture.Pan()
    .enabled(index === 0)
    .onUpdate((e) => {
      x.set(e.translationX);
      y.set(e.translationY);
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_X || e.velocityX > 900) {
        x.set(withTiming(flyX, { duration: 220 }, (f) => {
          if (f) scheduleOnRN(onDone, 'connect');
        }));
      } else if (e.translationX < -SWIPE_X || e.velocityX < -900) {
        x.set(withTiming(-flyX, { duration: 220 }, (f) => {
          if (f) scheduleOnRN(onDone, 'pass');
        }));
      } else if (e.translationY < -SWIPE_UP || e.velocityY < -1100) {
        y.set(withTiming(-1400, { duration: 260 }, (f) => {
          if (f) scheduleOnRN(onDone, 'superlike');
        }));
      } else {
        x.set(withSpring(0, { damping: 16, stiffness: 200 }));
        y.set(withSpring(0, { damping: 16, stiffness: 200 }));
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(x.value, [-width, 0, width], [-13, 0, 13], Extrapolation.CLAMP);
    return {
      transform: [
        { translateX: x.value },
        { translateY: y.value + depth.value * 14 },
        { scale: 1 - depth.value * 0.05 },
        { rotate: `${rotate}deg` },
      ],
      opacity: interpolate(depth.value, [0, 2, 3], [1, 0.9, 0]),
    };
  });
  const connectStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [15, SWIPE_X], [0, 1], Extrapolation.CLAMP) }));
  const passStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-SWIPE_X, -15], [1, 0], Extrapolation.CLAMP) }));
  const superStyle = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [-SWIPE_UP, -30], [1, 0], Extrapolation.CLAMP) }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { zIndex: 10 - index, boxShadow: index === 0 ? '0px 18px 40px rgba(0,0,0,0.22)' : undefined, borderRadius: radius.xl }, cardStyle]}
        pointerEvents={index === 0 ? 'auto' : 'none'}
      >
        <Pressable style={{ flex: 1 }} onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${candidate.full_name}, ${candidate.score} percent fit. Open profile`}>
          <CandidateCard c={candidate} />
        </Pressable>
        <Stamp label="CONNECT" color={c.success} style={[{ top: 28, left: 22, transform: [{ rotate: '-14deg' }] }, connectStyle]} />
        <Stamp label="PASS" color={c.danger} style={[{ top: 28, right: 22, transform: [{ rotate: '14deg' }] }, passStyle]} />
        <Stamp label="SUPER" color={c.accentText} style={[{ bottom: 40, alignSelf: 'center' }, superStyle]} />
      </Animated.View>
    </GestureDetector>
  );
}

/** A stack of candidate cards: drag right to connect, left to pass, up to super-like. */
export function SwipeDeck({
  items,
  onSwiped,
  onOpen,
  ref,
}: {
  items: MatchCandidate[];
  onSwiped: (c: MatchCandidate, a: SwipeAction) => void;
  onOpen: (c: MatchCandidate) => void;
  ref?: React.Ref<DeckHandle>;
}) {
  const top = useRef<DeckHandle>(null);
  useImperativeHandle(ref, () => ({ swipe: (a) => top.current?.swipe(a) }));
  const visible = items.slice(0, 3);
  return (
    <View style={{ flex: 1 }}>
      {visible
        .map((cand, i) => (
          <DeckCard
            key={cand.id}
            ref={i === 0 ? top : undefined}
            candidate={cand}
            index={i}
            onDone={(a) => onSwiped(cand, a)}
            onOpen={() => onOpen(cand)}
          />
        ))
        .reverse()}
    </View>
  );
}
