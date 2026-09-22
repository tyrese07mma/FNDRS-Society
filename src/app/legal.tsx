import React, { useState } from 'react';
import * as Linking from 'expo-linking';
import { LEGAL_URLS } from '@/lib/env';
import { useTranslation } from '@/i18n';
import { toast } from '@/state/toast';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, Header, Markdown, SegmentedControl, Text } from '@/ui';

const DOCS = {
  terms: `## Terms of Service
Last updated: September 2026

FNDRS Society ("we") runs a professional network for founders, investors, mentors and operators. By creating an account you agree to these terms.

## Your account
- You must be 18 or older and use your real name.
- Keep your credentials safe. You are responsible for activity on your account.
- One person, one account. Company pages are created through Startups.

## Acceptable use
- Be honest about who you are and what you are building.
- No spam, cold mass-pitching, harassment or discrimination.
- Do not scrape, resell or export other members' data.

## Paid plans
Pro, Business Pro and Investor+ renew automatically until cancelled. You can cancel at any time in Settings → Subscription; access continues until the end of the billing period.

## Content
You own what you post. You grant us a licence to display it inside FNDRS. We may remove content that breaks these terms.

## Liability
FNDRS is provided "as is". We are not a broker, investment adviser or party to any deal made between members.`,
  privacy: `## Privacy Policy
Last updated: September 2026

## What we collect
- **Account data:** name, email, profile photo and the profile details you add.
- **Activity:** posts, messages, matches, RSVPs and bookings you make in the app.
- **Technical data:** device type and crash diagnostics.

## How we use it
- To run Smart Match and rank people, events and opportunities for you.
- To deliver messages and notifications.
- To keep the community safe and enforce our terms.

## What we never do
- Sell your personal data.
- Show your location if you turn "Show my location" off.
- Share private messages with anyone outside the conversation.

## Your rights
Export or delete your data at any time in Settings. Deleting your account removes your profile, posts, messages and matches permanently.

## Contact
privacy@fndrs.society`,
  guidelines: `## Community guidelines
FNDRS works because members are generous and direct.

1. **Give before you ask.** Answer a question before you post your own.
2. **Warm beats cold.** Use intros and shared context instead of mass outreach.
3. **Critique the work, not the person.**
4. **Keep confidential things confidential** — term sheets, numbers, private chats.
5. **Report, don't retaliate.** Use the report option on any post or profile.

> Repeated violations lead to removal from the Society.`,
};

type Doc = keyof typeof DOCS;

export default function Legal() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [doc, setDoc] = useState<Doc>('terms');
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header modal title={t('Legal')} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <SegmentedControl<Doc>
          value={doc}
          onChange={setDoc}
          options={[
            { value: 'terms', label: t('Terms') },
            { value: 'privacy', label: t('Privacy') },
            { value: 'guidelines', label: t('Guidelines') },
          ]}
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        {doc !== 'guidelines' && LEGAL_URLS[doc] ? (
          <Button title={doc === 'terms' ? t('Open terms of service') : t('Open privacy policy')} onPress={() => {
            void Linking.openURL(LEGAL_URLS[doc]!).catch(() => toast.error(t('The page could not be opened.')));
          }} />
        ) : (
          <>
            <Card variant="tint" style={{ marginBottom: 20, gap: 8 }}>
              <Text variant="headline">{t('Draft — not approved for publication')}</Text>
              <Text>{t('The operator must provide reviewed legal documents before launch. The text below is a working template.')}</Text>
            </Card>
            <Markdown source={DOCS[doc]} />
          </>
        )}
        {LEGAL_URLS.imprint && <Button title={t('Open imprint')} variant="ghost" style={{ marginTop: 16 }} onPress={() => {
          void Linking.openURL(LEGAL_URLS.imprint!).catch(() => toast.error(t('The page could not be opened.')));
        }} />}
      </ScrollView>
    </View>
  );
}
