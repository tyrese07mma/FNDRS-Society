import { useTranslation } from '@/i18n';
import { describeError } from '@/lib/errors';
import { useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCreateStartup } from '@/data/queries';
import type { StartupStage } from '@/data/types';
import { INDUSTRIES, LOOKING_FOR, STAGE_LABEL } from '@/lib/format';
import { KAV_BEHAVIOR } from '@/lib/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Button, Chip, Header, IconButton, Input, Text } from '@/ui';
import { Globe, Minus, Plus, Rocket } from '@/ui/icons';

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text variant="label" color="textSubtle">{title}</Text>
      {children}
    </View>
  );
}

export default function NewStartup() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const create = useCreateStartup();
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState<string>('SaaS');
  const [stage, setStage] = useState<StartupStage>('mvp');
  const [team, setTeam] = useState(1);
  const [description, setDescription] = useState('');
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const launch = async () => {
    if (name.trim().length < 2) return setError(t("Your startup needs a name."));
    if (tagline.trim().length < 6) return setError(t("Add a one-line tagline (at least 6 characters)."));
    setError(null);
    try {
      const s = await create.mutateAsync({
        name, tagline, website: website || null, industry, stage, team_size: team, description, looking_for: lookingFor,
      });
      router.replace(`/startups/${s.id}` as Href);
    } catch (e) {
      setError(describeError(e));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={KAV_BEHAVIOR}>
      <Header modal title={t("Launch on FNDRS")} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 22, paddingBottom: insets.bottom + 40, width: '100%', maxWidth: 680, alignSelf: 'center' }}>
        <Text color="textMuted">{t("Tell the network what you are building. You can post updates about it in the feed afterwards.")}</Text>
        <Input label="Name" value={name} onChangeText={setName} placeholder="Loomwork" maxLength={60} />
        <Input label={t("Tagline")} value={tagline} onChangeText={setTagline} placeholder={t("AI back-office for creative agencies")} maxLength={120} counter />
        <Input label={t("Website (optional)")} icon={Globe} value={website} onChangeText={setWebsite} placeholder="loomwork.ai" autoCapitalize="none" keyboardType="url" />

        <Group title={t("INDUSTRY")}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {INDUSTRIES.map((i) => <Chip key={i} label={t(i)} selected={industry === i} onPress={() => setIndustry(i)} />)}
          </View>
        </Group>

        <Group title={t("STAGE")}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(Object.keys(STAGE_LABEL) as StartupStage[]).map((s) => <Chip key={s} label={t(STAGE_LABEL[s])} selected={stage === s} onPress={() => setStage(s)} />)}
          </View>
        </Group>

        <Group title={t("TEAM SIZE")}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, alignSelf: 'flex-start', padding: 6, borderRadius: radius.pill, backgroundColor: c.tint04, borderWidth: 1, borderColor: c.hairline }}>
            <IconButton icon={Minus} size={36} onPress={() => setTeam((t) => Math.max(1, t - 1))} disabled={team <= 1} accessibilityLabel={t("Fewer people")} />
            <Text variant="number" style={{ minWidth: 36, textAlign: 'center' }}>{team}</Text>
            <IconButton icon={Plus} size={36} onPress={() => setTeam((t) => Math.min(500, t + 1))} accessibilityLabel={t("More people")} />
          </View>
        </Group>

        <Input label={t("Description")} value={description} onChangeText={setDescription} multiline maxLength={800} counter placeholder={t("What problem are you solving, for whom, and what is your unfair advantage?")} />

        <Group title={t("LOOKING FOR (OPTIONAL)")}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {LOOKING_FOR.map((l) => (
              <Chip key={l} label={t(l)} selected={lookingFor.includes(l)} onPress={() => setLookingFor((x) => (x.includes(l) ? x.filter((y) => y !== l) : [...x, l]))} />
            ))}
          </View>
        </Group>

        {!!error && <Text variant="footnote" color="danger">{error}</Text>}
        <Button title={t("Launch startup")} icon={Rocket} variant="accent" size="lg" block loading={create.isPending} onPress={launch} />
        <Text variant="caption" color="textSubtle" align="center">{t("Your startup will appear in the community directory.")}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
