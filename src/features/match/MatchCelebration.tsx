import { useRouter, type Href } from 'expo-router';
import React, { useEffect } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withDelay, withTiming, ZoomIn } from 'react-native-reanimated';

import type { MatchCandidate } from '@/data/types';
import { firstName } from '@/lib/format';
import { useAuth } from '@/providers/AuthProvider';
import { font, palette } from '@/theme/tokens';
import { Avatar, Button, Text } from '@/ui';
import { MessageCircle, Sparkles } from '@/ui/icons';

function Particle({ angle, distance, delay }: { angle: number; distance: number; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(delay, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) })));
  }, [p, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [
      { translateX: Math.cos(angle) * distance * p.value },
      { translateY: Math.sin(angle) * distance * p.value },
      { scale: 0.6 + p.value * 0.8 },
      { rotate: `${p.value * 90}deg` },
    ],
  }));
  return (
    <Animated.View style={[{ position: 'absolute' }, style]}>
      <Sparkles size={18} color={palette.gold400} />
    </Animated.View>
  );
}

/** Full-screen "It's a match" moment with a sparkle burst. */
export function MatchCelebration({
  match,
  onClose,
}: {
  match: { candidate: MatchCandidate; conversationId: string | null } | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const { profile } = useAuth();
  if (!match) return null;
  const them = match.candidate;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(220)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5,5,6,0.9)' }]} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {Array.from({ length: 14 }, (_, i) => (
            <Particle key={i} angle={(i / 14) * Math.PI * 2} distance={150 + (i % 3) * 40} delay={120 + (i % 4) * 60} />
          ))}
        </View>
        <Animated.View entering={ZoomIn.springify().damping(14)} style={{ alignItems: 'center', gap: 20, width: '100%', maxWidth: 380 }}>
          <Text style={{ fontFamily: font.display, fontSize: 22, letterSpacing: 5, lineHeight: 30 }} tint={palette.gold400} maxFontSizeMultiplier={1}>
            IT’S A MATCH
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ transform: [{ rotate: '-6deg' }] }}>
              <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={104} ring />
            </View>
            <View style={{ marginLeft: -22, transform: [{ rotate: '6deg' }] }}>
              <Avatar uri={them.avatar_url} name={them.full_name} size={104} ring />
            </View>
          </View>
          <Text variant="title2" align="center" tint={palette.ivory}>
            You and {firstName(them.full_name)} want to build together.
          </Text>
          <Text variant="callout" align="center" tint={palette.ink200}>
            {them.reasons.slice(0, 2).join(' · ')}
          </Text>
          <View style={{ width: '100%', gap: 10, marginTop: 6 }}>
            <Button
              title={`Message ${firstName(them.full_name)}`}
              variant="accent"
              size="lg"
              icon={MessageCircle}
              block
              onPress={() => {
                onClose();
                if (match.conversationId) router.push(`/chat/${match.conversationId}` as Href);
              }}
            />
            <Button title="Keep swiping" variant="ghost" block onPress={onClose} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
