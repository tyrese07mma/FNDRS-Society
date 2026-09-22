import { useTranslation } from '@/i18n';
import { toast } from '@/state/toast';
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
    "section": "Getting started",
    "items": [
      [
        "What is FNDRS Society?",
        "A network for people building startups to meet co-founders and experienced entrepreneurs."
      ],
      [
        "How do I get better matches?",
        "Complete your skills, industries and what you are looking for. Use the match filters and check the reasons on each profile."
      ],
      [
        "What is XP for?",
        "XP records eligible activity and contributes to your level. It does not guarantee more matches or introductions."
      ]
    ]
  },
  {
    "section": "Smart Match & messaging",
    "items": [
      [
        "What happens when I connect?",
        "Mutual interest creates a match. You can then open a conversation with that person."
      ],
      [
        "Can I limit who messages me?",
        "In Settings, open Privacy and choose Matches only under Who can message me. You can also block members."
      ]
    ]
  },
  {
    "section": "Optional features",
    "items": [
      [
        "Is Copilot available?",
        "Copilot is currently disabled for this launch. You can still work on your profile, share ideas and connect with founders."
      ],
      [
        "Can I buy a subscription?",
        "Paid subscriptions are currently unavailable. The app does not start a payment while billing is disabled."
      ]
    ]
  },
  {
    "section": "Privacy & safety",
    "items": [
      [
        "Who can see my location?",
        "You can hide your location in Settings under Privacy. You can also turn off discovery in Smart Match."
      ],
      [
        "How do I report someone?",
        "Open the menu on a post or profile and select Report. You can block a member separately."
      ],
      [
        "Can I delete my data?",
        "Settings provides a data export and account deletion. Read the confirmation carefully before permanently deleting your account."
      ]
    ]
  }
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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header back title={t("Help center")} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 22, paddingBottom: insets.bottom + 40, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}>
        {FAQ.map((s) => (
          <View key={s.section} style={{ gap: 6 }}>
            <Text variant="label" color="textSubtle">{t(s.section).toUpperCase()}</Text>
            <View style={{ paddingHorizontal: 16, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: c.hairline }}>
              {s.items.map(([q, a], i) => (
                <View key={q} style={{ borderBottomWidth: i === s.items.length - 1 ? 0 : 1, borderBottomColor: c.hairline }}>
                  <Item q={t(q)} a={t(a)} />
                </View>
              ))}
            </View>
          </View>
        ))}
        <Card variant="accent" style={{ gap: 10, alignItems: 'flex-start' }}>
          <LifeBuoy size={22} color={c.accentText} />
          <Text variant="headline">{t("Still stuck?")}</Text>
          <Text variant="footnote" color="textMuted">{SUPPORT_EMAIL ? t("Contact our support team by email.") : t("Support contact is not configured yet.")}</Text>
          {SUPPORT_EMAIL && <Button title={t("Email {{address}}", { address: SUPPORT_EMAIL })} size="sm" onPress={() => { void Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => toast.error(t("Email could not be opened."))); }} />}
        </Card>
      </ScrollView>
    </View>
  );
}
