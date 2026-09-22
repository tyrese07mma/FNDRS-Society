import { describeError } from '@/lib/errors';
import { useTranslation } from '@/i18n';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApply, useOpportunities } from '@/data/queries';
import type { Opportunity, OpportunityType } from '@/data/types';
import { PersonRow } from '@/features/people/PersonRow';
import { hashHue } from '@/lib/color';
import { compact, OPP_TYPE_LABEL, timeAgo } from '@/lib/format';
import { CONTENT_MAX } from '@/lib/layout';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Badge, Button, Card, Chip, EmptyState, Header, Input, Monogram, Sheet, SkeletonList, Text } from '@/ui';
import { Briefcase, Check, MapPin, Plus, Send } from '@/ui/icons';

type Filter = OpportunityType | 'all';
const FILTERS: Filter[] = ['all', 'cofounder', 'hiring', 'partnership', 'investment', 'freelance', 'accelerator'];

function MatchPill({ value }: { value: number }) {
  const { c } = useTheme();
  const strong = value >= 80;
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: strong ? c.accentSoft : c.tint08 }}>
      <Text variant="mono" tint={strong ? c.accentText : c.textMuted}>{value}% match</Text>
    </View>
  );
}

function OpportunityCard({ o, onPress }: { o: Opportunity; onPress: () => void }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  return (
    <Card onPress={onPress} style={{ gap: 12 }} accessibilityLabel={t('{{title}} at {{org}}', { title: o.title, org: o.org })}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Monogram label={o.org} hue={hashHue(o.org)} size={46} />
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text variant="headline" numberOfLines={2}>{o.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text variant="caption" color="textSubtle" numberOfLines={1} style={{ flexShrink: 1 }}>{o.org}</Text>
            <Text variant="caption" color="textFaint">·</Text>
            <MapPin size={11} color={c.textSubtle} />
            <Text variant="caption" color="textSubtle" numberOfLines={1}>{o.location}</Text>
          </View>
        </View>
        <MatchPill value={o.match} />
      </View>
      <Text variant="footnote" color="textMuted" numberOfLines={2}>{o.description}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Badge tone="info">{t(OPP_TYPE_LABEL[o.type])}</Badge>
        {o.remote && <Badge>Remote</Badge>}
        {!!o.equity && <Badge tone="success">{t('Equity {{amount}}', { amount: o.equity })}</Badge>}
        {!!o.comp && <Badge tone="accent">{o.comp}</Badge>}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text variant="mono" color="textFaint" style={{ flex: 1 }}>
          {timeAgo(o.created_at)} · {t('{{count}} applicants', { count: compact(o.applicants) })}
        </Text>
        {o.applied && <Badge tone="success" icon={Check}>{t("Applied")}</Badge>}
      </View>
    </Card>
  );
}

export default function Opportunities() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { userId } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');
  const list = useOpportunities(filter);
  const apply = useApply();
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [note, setNote] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const current = selected ? list.data?.find((o) => o.id === selected.id) ?? selected : null;
  const mine = current?.poster.id === userId;

  const submit = async () => {
    if (!current) return;
    try {
      await apply.mutateAsync({ id: current.id, note: note.trim() });
      setSelected(null);
      setNote('');
    } catch {
      // toast via mutation cache
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header back title={t("Opportunities")} right={<Button title="Post" icon={Plus} size="sm" onPress={() => router.push('/opportunities/new')} />} />
      <FlatList
        data={list.data ?? []}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => (
          <OpportunityCard
            o={item}
            onPress={() => {
              setNote('');
              setSelected(item);
            }}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={
          <View style={{ gap: 14, paddingBottom: 14 }}>
            <Text color="textMuted">{t("Co-founder spots, founding roles, pilots and funding — ranked by fit with your profile.")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {FILTERS.map((f) => (
                <Chip key={f} label={f === 'all' ? t("All") : t(OPP_TYPE_LABEL[f])} selected={filter === f} onPress={() => setFilter(f)} />
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          list.isLoading ? (
            <SkeletonList variant="card" count={3} />
          ) : list.isError ? (
            <EmptyState icon={Briefcase} title={t('Opportunities could not be loaded')} message={describeError(list.error)} actionLabel={t('Try again')} onAction={() => { void list.refetch(); }} />
          ) : (
            <EmptyState icon={Briefcase} title={t("Nothing here yet")} message={t("Be the first to post one — founders see new listings in their matches.")} actionLabel={t("Post an opportunity")} onAction={() => router.push('/opportunities/new')} />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await list.refetch();
              setRefreshing(false);
            }}
            tintColor={c.textSubtle}
          />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}
      />

      <Sheet
        open={!!current}
        onClose={() => setSelected(null)}
        title={current?.title}
        subtitle={current ? `${current.org} · ${current.location}${current.remote ? ' · Remote' : ''}` : undefined}
        footer={
          current &&
          (mine ? (
            <Button title={t('Your listing · {{count}} applicants', { count: compact(current.applicants) })} variant="secondary" block disabled />
          ) : current.applied ? (
            <Button title={t("Application sent")} icon={Check} variant="secondary" block disabled />
          ) : (
            <Button title={t("Apply")} icon={Send} size="lg" block loading={apply.isPending} onPress={submit} />
          ))
        }
      >
        {current && (
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <MatchPill value={current.match} />
              <Badge tone="info">{t(OPP_TYPE_LABEL[current.type])}</Badge>
              {!!current.equity && <Badge tone="success">{t('Equity {{amount}}', { amount: current.equity })}</Badge>}
              {!!current.comp && <Badge tone="accent">{current.comp}</Badge>}
            </View>
            <Text color="textMuted" style={{ lineHeight: 23 }}>{current.description}</Text>
            {current.tags.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {current.tags.map((t) => <Chip key={t} label={t} size="sm" static />)}
              </View>
            )}
            <View style={{ gap: 4 }}>
              <Text variant="label" color="textSubtle">{t("POSTED BY")}</Text>
              <PersonRow person={current.poster} onPress={() => { setSelected(null); router.push({ pathname: '/user/[id]', params: { id: current.poster.id } }); }} />
            </View>
            {!mine && !current.applied && (
              <Input label={t("Note to the poster (optional)")} value={note} onChangeText={setNote} multiline maxLength={500} counter placeholder={t("Why you, in two or three sentences. Link your work if you can.")} />
            )}
          </View>
        )}
      </Sheet>
    </View>
  );
}
