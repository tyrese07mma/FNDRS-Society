import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SUPPORT_EMAIL } from '@/lib/env';
import { CONTENT_MAX } from '@/lib/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Button, Card, Header, Text } from '@/ui';
import { ChevronDown, LifeBuoy } from '@/ui/icons';

const FAQ: { section: string; items: [string, string][] }[] = [
  {
    section: 'Getting started',
    items: [
      ['What is FNDRS Society?', 'A private network where founders meet co-founders, investors, mentors and operators — matched on what they are actually building.'],
      ['How do I get better matches?', 'Complete your profile: industries, skills and especially “Looking for”. Smart Match weighs those most. A photo and a clear headline help people say yes.'],
      ['What is XP for?', 'XP tracks how active you are. Levels unlock visibility boosts and show up on the leaderboard. You earn it by posting, joining spaces, RSVPing and completing weekly challenges.'],
    ],
  },
  {
    section: 'Smart Match & messaging',
    items: [
      ['How does Smart Match score people?', 'We compare shared industries, whether their skills cover what you are looking for (and vice versa), stage, city and whether they are open to co-founding. The reasons are shown on every card.'],
      ['What happens when I connect?', 'If they connected with you too, it is a match and a chat opens instantly. Otherwise they will see you in their deck.'],
      ['Can I limit who messages me?', 'Yes — Settings → Privacy → “Who can message me” → Matches only.'],
    ],
  },
  {
    section: 'Pro & billing',
    items: [
      ['What does Pro include?', 'Unlimited swipes, warm investor intros, who viewed your profile, 30-day analytics and a boost in search and matching.'],
      ['How do I cancel?', 'Settings → Subscription → Manage subscription. You keep access until the end of the period.'],
    ],
  },
  {
    section: 'Privacy & safety',
    items: [
      ['Who can see my location?', 'Only members, and only if “Show my location” is on in Settings → Privacy.'],
      ['How do I report someone?', 'Use the “…” menu on any post, profile or chat and choose Report. Your report is submitted for review.'],
      ['Can I delete my data?', 'Yes. Settings → Delete account removes your profile, posts, messages and matches permanently.'],
    ],
  },
];

function Item({ q, a }: { q: string; a: string }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ paddingVertical: 14, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text variant="bodyStrong" style={{ flex: 1 }}>{q}</Text>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <ChevronDown size={17} color={c.textSubtle} />
        </View>
      </View>
      {open && (
        <Animated.View entering={FadeIn.duration(180)}>
          <Text variant="callout" color="textMuted" style={{ lineHeight: 21 }}>{a}</Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

export default function Help() {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header back title="Help center" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 22, paddingBottom: insets.bottom + 40, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}>
        {FAQ.map((s) => (
          <View key={s.section} style={{ gap: 6 }}>
            <Text variant="label" color="textSubtle">{s.section.toUpperCase()}</Text>
            <View style={{ paddingHorizontal: 16, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: c.hairline }}>
              {s.items.map(([q, a], i) => (
                <View key={q} style={{ borderBottomWidth: i === s.items.length - 1 ? 0 : 1, borderBottomColor: c.hairline }}>
                  <Item q={q} a={a} />
                </View>
              ))}
            </View>
          </View>
        ))}
        <Card variant="accent" style={{ gap: 10, alignItems: 'flex-start' }}>
          <LifeBuoy size={22} color={c.accentText} />
          <Text variant="headline">Still stuck?</Text>
          <Text variant="footnote" color="textMuted">Write to us — a real person answers within one working day.</Text>
          <Button title={`Email ${SUPPORT_EMAIL}`} size="sm" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
        </Card>
      </ScrollView>
    </View>
  );
}
