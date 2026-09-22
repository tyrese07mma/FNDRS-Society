import { useTranslation } from '@/i18n';
import { describeError } from '@/lib/errors';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCreateOpportunity, useStartups } from '@/data/queries';
import type { OpportunityType } from '@/data/types';
import { INDUSTRIES, OPP_TYPE_LABEL } from '@/lib/format';
import { KAV_BEHAVIOR } from '@/lib/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Button, Chip, Header, Input, Switch, Text } from '@/ui';
import { Banknote, Briefcase, MapPin, Send, TrendingUp } from '@/ui/icons';

const TYPES = Object.keys(OPP_TYPE_LABEL) as OpportunityType[];

export default function NewOpportunity() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const create = useCreateOpportunity();
  const mine = useStartups('mine');
  const [title, setTitle] = useState('');
  const [org, setOrg] = useState('');
  const [type, setType] = useState<OpportunityType>('hiring');
  const [industry, setIndustry] = useState('SaaS');
  const [location, setLocation] = useState('');
  const [remote, setRemote] = useState(true);
  const [comp, setComp] = useState('');
  const [equity, setEquity] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);
  const suggestedOrg = mine.data?.[0]?.name;

  const publish = async () => {
    if (title.trim().length < 4) return setError(t("Add a clear title."));
    if ((org || suggestedOrg || '').trim().length < 2) return setError(t("Add the company or organisation."));
    setError(null);
    try {
      await create.mutateAsync({
        title,
        org: org.trim() || suggestedOrg || '',
        type,
        industry,
        location: location.trim() || (remote ? 'Remote' : ''),
        remote,
        comp: comp.trim() || null,
        equity: equity.trim() || null,
        description,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 6),
      });
      router.back();
    } catch (e) {
      setError(describeError(e));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={KAV_BEHAVIOR}>
      <Header modal title={t("Post an opportunity")} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: insets.bottom + 40, width: '100%', maxWidth: 680, alignSelf: 'center' }}>
        <View style={{ gap: 10 }}>
          <Text variant="label" color="textSubtle">{t("TYPE")}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TYPES.map((kind) => <Chip key={kind} label={t(OPP_TYPE_LABEL[kind])} selected={type === kind} onPress={() => setType(kind)} />)}
          </View>
        </View>
        <Input label={t("Title")} icon={Briefcase} value={title} onChangeText={setTitle} placeholder={t("Founding engineer (data platform)")} maxLength={120} />
        <Input label={t("Company")} value={org} onChangeText={setOrg} placeholder={suggestedOrg ?? t("Your startup")} />
        <View style={{ gap: 10 }}>
          <Text variant="label" color="textSubtle">{t("INDUSTRY")}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {INDUSTRIES.map((i) => <Chip key={i} label={t(i)} size="sm" selected={industry === i} onPress={() => setIndustry(i)} />)}
          </View>
        </View>
        <Input label={t("Location")} icon={MapPin} value={location} onChangeText={setLocation} placeholder="Berlin" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: c.hairline }}>
          <Text variant="headline" style={{ flex: 1 }}>{t("Remote friendly")}</Text>
          <Switch value={remote} onValueChange={setRemote} accessibilityLabel={t("Remote friendly")} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Input containerStyle={{ flex: 1 }} label={t("Compensation")} icon={Banknote} value={comp} onChangeText={setComp} placeholder="€85–100k" />
          <Input containerStyle={{ flex: 1 }} label={t("Equity")} icon={TrendingUp} value={equity} onChangeText={setEquity} placeholder="0.5–1%" />
        </View>
        <Input label={t("Description")} value={description} onChangeText={setDescription} multiline maxLength={1200} counter placeholder={t("What will this person own? What does great look like after 90 days?")} />
        <Input label={t("Tags")} value={tags} onChangeText={setTags} placeholder="TypeScript, Postgres, Data" hint={t("Comma separated — used for matching")} />
        {!!error && <Text variant="footnote" color="danger">{error}</Text>}
        <Button title="Publish" icon={Send} size="lg" block loading={create.isPending} onPress={publish} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
