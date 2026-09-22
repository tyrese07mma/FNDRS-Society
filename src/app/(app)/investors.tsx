import { describeError } from '@/lib/errors';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isApiError } from '@/data';
import { useInvestors, useRequestIntro, useStartups } from '@/data/queries';
import type { Investor } from '@/data/types';
import { firstName } from '@/lib/format';
import { CONTENT_MAX } from '@/lib/layout';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from '@/state/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius } from '@/theme/tokens';
import { Avatar, Badge, Button, Card, Chip, EmptyState, Header, Input, PressableScale, ScoreRing, Sheet, SkeletonList, Text } from '@/ui';
import { BadgeCheck, Check, ChevronRight, Crown, Mail, Search, TrendingUp } from '@/ui/icons';

const STAGES = ['All', 'Idea', 'Pre-seed', 'Seed', 'Series A'];

function InvestorCard({ inv, onPress }: { inv: Investor; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Card onPress={onPress} style={{ gap: 12 }} accessibilityLabel={`${inv.profile.full_name}, ${inv.firm}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar uri={inv.profile.avatar_url} name={inv.profile.full_name} size={50} ring={inv.profile.verified} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text variant="headline" numberOfLines={1} style={{ flexShrink: 1 }}>{inv.profile.full_name}</Text>
            {inv.profile.verified && <BadgeCheck size={14} color={c.accentText} />}
          </View>
          <Text variant="caption" color="textSubtle" numberOfLines={1}>{inv.firm} · {inv.portfolio_count} investments</Text>
        </View>
        <ScoreRing value={inv.fit} size={52} thickness={4} accent={inv.fit >= 80} label="FIT" />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Badge tone="accent">{inv.check_size}</Badge>
        {inv.stages.map((s) => <Badge key={s}>{s}</Badge>)}
      </View>
      <Text variant="footnote" color="textMuted" numberOfLines={3}>{inv.thesis}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text variant="caption" color="textSubtle" style={{ flex: 1 }} numberOfLines={1}>{inv.sectors.join(' · ')}</Text>
        {inv.requested ? <Badge tone="success" icon={Check}>Requested</Badge> : <ChevronRight size={16} color={c.textFaint} />}
      </View>
    </Card>
  );
}

export default function Investors() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { isPro, profile } = useAuth();
  const list = useInvestors();
  const request = useRequestIntro();
  const mine = useStartups('mine');
  const [stage, setStage] = useState('All');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Investor | null>(null);
  const [note, setNote] = useState('');

  const q = query.trim().toLowerCase();
  const data = (list.data ?? [])
    .filter((i) => stage === 'All' || i.stages.includes(stage))
    .filter((i) => !q || [i.profile.full_name, i.firm, i.thesis, ...i.sectors].join(' ').toLowerCase().includes(q));
  const current = selected ? list.data?.find((i) => i.id === selected.id) ?? selected : null;

  const openSheet = (inv: Investor) => {
    const startup = mine.data?.[0];
    setNote(
      `Hi ${firstName(inv.profile.full_name)}, I'm ${firstName(profile?.full_name)}${startup ? `, building ${startup.name} — ${startup.tagline.toLowerCase()}` : ''}. Your thesis on ${inv.sectors[0] ?? 'this space'} is exactly where we play. Would love 20 minutes to share what we are seeing.`,
    );
    setSelected(inv);
  };

  const submit = async () => {
    if (!current) return;
    if (!isPro) {
      setSelected(null);
      router.push('/premium');
      return;
    }
    try {
      await request.mutateAsync({ id: current.id, note });
      toast.success('Intro requested', `We will let you know when ${firstName(current.profile.full_name)} responds.`);
      setSelected(null);
    } catch (e) {
      if (isApiError(e, 'PRO_REQUIRED')) {
        setSelected(null);
        router.push('/premium');
      } else {
        toast.error('Could not request the intro', describeError(e));
      }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header back title="Investors" />
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <InvestorCard inv={item} onPress={() => openSheet(item)} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: 14, paddingBottom: 14 }}>
            {!isPro && (
              <PressableScale scaleTo={0.985} onPress={() => router.push('/premium')} accessibilityLabel="Upgrade for warm intros">
                <LinearGradient colors={[c.accentSoft, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: c.accentBorder }}>
                  <Crown size={20} color={c.accentText} />
                  <View style={{ flex: 1 }}>
                    <Text variant="headline">Warm intros are a Pro feature</Text>
                    <Text variant="caption" color="textMuted">Browse freely — upgrade when you are ready to reach out.</Text>
                  </View>
                  <ChevronRight size={18} color={c.accentText} />
                </LinearGradient>
              </PressableScale>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: c.input, borderWidth: 1, borderColor: c.border }}>
              <Search size={17} color={c.textSubtle} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by name, firm or sector"
                placeholderTextColor={c.textFaint}
                accessibilityLabel="Search investors"
                style={[{ flex: 1, color: c.text, fontFamily: font.sans, fontSize: 15 }, Platform.OS === 'web' ? ({ outlineWidth: 0 } as object) : null]}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {STAGES.map((s) => <Chip key={s} label={s} selected={stage === s} onPress={() => setStage(s)} />)}
            </ScrollView>
            <Text variant="caption" color="textSubtle">Ranked by thesis fit with your profile.</Text>
          </View>
        }
        ListEmptyComponent={list.isLoading ? <SkeletonList variant="card" count={3} /> : <EmptyState icon={TrendingUp} title="No investors match" message="Clear the filters to see everyone." />}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}
      />

      <Sheet
        open={!!current}
        onClose={() => setSelected(null)}
        title={current?.profile.full_name}
        subtitle={current ? `${current.firm} · ${current.check_size}` : undefined}
        footer={
          current &&
          (current.requested ? (
            <Button title="Intro requested" icon={Check} variant="secondary" size="lg" block disabled />
          ) : (
            <Button
              title={isPro ? 'Request warm intro' : 'Unlock warm intros with Pro'}
              icon={isPro ? Mail : Crown}
              variant="accent"
              size="lg"
              block
              loading={request.isPending}
              onPress={submit}
            />
          ))
        }
      >
        {current && (
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <ScoreRing value={current.fit} size={68} accent label="FIT" />
              <Text variant="callout" color="textMuted" style={{ flex: 1 }}>
                {current.fit >= 80 ? 'Strong thesis fit with what you are building.' : current.fit >= 60 ? 'Partial fit — lead with the overlap.' : 'Outside their core thesis — make the connection explicit.'}
              </Text>
            </View>
            <Text color="textMuted" style={{ lineHeight: 23 }}>{current.thesis}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {current.sectors.map((s) => <Chip key={s} label={s} size="sm" static />)}
              {current.stages.map((s) => <Chip key={s} label={s} size="sm" static />)}
            </View>
            {!current.requested && isPro && (
              <Input label="Your note" value={note} onChangeText={setNote} multiline maxLength={600} counter hint="Short and specific wins. We forward it with your profile." />
            )}
          </View>
        )}
      </Sheet>
    </View>
  );
}
