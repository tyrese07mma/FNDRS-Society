import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Wordmark } from '@/features/brand/Wordmark';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Avatar, Button, Chip, Glass, Text } from '@/ui';
import { Handshake, Sparkles, UsersRound, type IconType } from '@/ui/icons';

const SLIDES: { icon: IconType; title: string; body: string }[] = [
  { icon: Sparkles, title: 'Smart Match', body: 'Founder-fit scoring surfaces co-founders who complete your skills.' },
  { icon: Handshake, title: 'Warm intros', body: 'Meet investors and mentors through people who already know you.' },
  { icon: UsersRound, title: 'A room full of builders', body: 'Spaces, pitch nights and weekly challenges that keep you shipping.' },
];

function Glow() {
  const { c, dark } = useTheme();
  const drift = useSharedValue(0);
  useEffect(() => {
    drift.set(withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [drift]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: -40 + drift.value * 80 }, { translateY: drift.value * 30 }] }));
  const b = useAnimatedStyle(() => ({ transform: [{ translateX: 30 - drift.value * 60 }, { translateY: 20 - drift.value * 50 }] }));
  const strength = dark ? 0.2 : 0.3;
  const orb = (id: string, color: string) => (
    <Svg width="100%" height="100%">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={strength} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', pointerEvents: 'none' }]}>
      <Animated.View style={[{ position: 'absolute', top: -120, right: -160, width: 520, height: 520 }, a]}>{orb('g1', c.accent)}</Animated.View>
      <Animated.View style={[{ position: 'absolute', bottom: 40, left: -220, width: 480, height: 480 }, b]}>{orb('g2', c.gold[1])}</Animated.View>
    </View>
  );
}

function MatchPreview() {
  const { c } = useTheme();
  const float = useSharedValue(0);
  useEffect(() => {
    float.set(withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [float]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -6 + float.value * 12 }, { rotate: '-2deg' }] }));
  return (
    <Animated.View entering={FadeInDown.delay(150).springify().damping(16)}>
      <Animated.View style={style}>
      <Glass radius={radius.xl} style={{ padding: 18, gap: 14, boxShadow: '0px 24px 60px rgba(0,0,0,0.28)' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ flexDirection: 'row' }}>
            <Avatar name="Founder" size={52} ring />
            <View style={{ marginLeft: -16, borderRadius: 30, borderWidth: 3, borderColor: c.bg }}>
              <Avatar name="You" size={48} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="headline">Find your co-founder</Text>
            <Text variant="caption" color="textSubtle">Connect through shared goals</Text>
          </View>
          <Handshake size={32} color={c.accentText} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Chip label="AI / ML" size="sm" static />
          <Chip label="Technical co-founder" size="sm" static />
          <Chip label="Berlin" size="sm" static />
        </View>
      </Glass>
      </Animated.View>
    </Animated.View>
  );
}

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4000);
    return () => clearInterval(t);
  }, []);


  const current = SLIDES[slide];
  const Icon = current.icon;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Glow />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 18,
          paddingHorizontal: 24,
          maxWidth: 560,
          width: '100%',
          alignSelf: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(500)}>
          <Wordmark size={17} society />
        </Animated.View>

        <View style={{ flex: 1, justifyContent: 'center', gap: 30, paddingVertical: 32 }}>
          <MatchPreview />
          <Animated.View entering={FadeInDown.delay(300).duration(500)} style={{ gap: 12 }}>
            <Text variant="largeTitle" style={{ fontSize: 36, lineHeight: 42, letterSpacing: -1.2 }}>
              Where founders find their people.
            </Text>
            <Text variant="body" color="textMuted" style={{ fontSize: 16.5, lineHeight: 25 }}>
              Co-founders, investors, mentors and operators — matched on what you are actually building.
            </Text>
          </Animated.View>

          <View style={{ gap: 14 }}>
            <Animated.View key={slide} entering={FadeIn.duration(350)} exiting={FadeOut.duration(200)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 48 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={19} color={c.accentText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="headline">{current.title}</Text>
                <Text variant="footnote" color="textSubtle">{current.body}</Text>
              </View>
            </Animated.View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {SLIDES.map((s, i) => (
                <View key={s.title} style={{ height: 4, width: i === slide ? 22 : 8, borderRadius: 2, backgroundColor: i === slide ? c.text : c.tint20 }} />
              ))}
            </View>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <Button title="Create account" variant="primary" size="lg" block onPress={() => router.push('/sign-up')} />
          <Button title="I already have an account" variant="ghost" block onPress={() => router.push('/sign-in')} />
          <Text variant="caption" color="textSubtle" align="center" style={{ marginTop: 4 }}>
            By continuing you agree to our{' '}
            <Text variant="caption" color="text" onPress={() => router.push('/legal')} suppressHighlighting>
              Terms & Privacy Policy
            </Text>
            .
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
