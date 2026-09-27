import { useTranslation } from '@/i18n';
import { BILLING_ENABLED } from '@/lib/env';
import { describeError } from '@/lib/errors';
import { useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAnalytics } from '@/data/queries';
import { PersonRow } from '@/features/people/PersonRow';
import { compact, timeAgo } from '@/lib/format';
import { CONTENT_MAX } from '@/lib/layout';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Badge, Button, Card, EmptyState, Header, PressableScale, SegmentedControl, Skeleton, Stat, Text } from '@/ui';
import { ChartColumn, Crown, Eye, Heart, MessageCircle, Sparkles, Users, UserPlus, type IconType } from '@/ui/icons';

type Range = '7' | '30';

function Kpi({ icon: Icon, label, value, delta }: { icon: IconType; label: string; value: string; delta: number }) {
  const { c } = useTheme();
  return (
    <Card style={{ width: '47%', flexGrow: 1, gap: 12 }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.tint08, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={16} color={c.text} />
      </View>
      <Stat value={value} label={label} delta={delta} />
    </Card>
  );
}

function Bars({ values, range }: { values: number[]; range: 7 | 30 }) {
  const { t, locale } = useTranslation();
  const { c } = useTheme();
  const max = Math.max(1, ...values);
  const labels = values.map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (values.length - 1 - i));
    if (range === 7) return d.toLocaleDateString(locale, { weekday: 'narrow' });
    return i % 5 === 4 || i === values.length - 1 ? String(d.getDate()) : '';
  });
  return (
    <View style={{ gap: 8 }}>
      <View style={{ height: 150, flexDirection: 'row', alignItems: 'flex-end', gap: range === 7 ? 10 : 3 }}>
        {values.map((v, i) => {
          const last = i === values.length - 1;
          return (
            <View key={i} style={{ flex: 1, height: `${v === 0 ? 0 : Math.max(4, (v / max) * 100)}%`, borderRadius: range === 7 ? 8 : 3, backgroundColor: last ? c.accent : c.tint20 }} accessibilityLabel={t('{{count}} views', { count: v })} />
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: range === 7 ? 10 : 3 }}>
        {labels.map((l, i) => (
          <Text key={i} variant="mono" color="textFaint" align="center" style={{ flex: 1, fontSize: 10 }}>{l}</Text>
        ))}
      </View>
    </View>
  );
}

export default function Analytics() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { isPro } = useAuth();
  const [range, setRange] = useState<Range>('7');
  const data = useAnalytics(Number(range) as 7 | 30);
  const a = data.data;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header back title={t("Analytics")} right={isPro ? <Badge tone="accent" dot>Pro</Badge> : undefined} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 22, paddingBottom: insets.bottom + 40, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}>
        <SegmentedControl<Range>
          value={range}
          onChange={(v) => {
            if (v === '30' && !isPro) router.push('/premium');
            else setRange(v);
          }}
          options={[
            { value: '7', label: t("Last 7 days") },
            { value: '30', label: isPro ? t("Last 30 days") : t("30 days · Pro") },
          ]}
        />

        {!a && data.isError ? (
          <EmptyState icon={ChartColumn} title={t("Analytics could not be loaded")} message={describeError(data.error)} actionLabel={t("Try again")} onAction={() => void data.refetch()} />
        ) : !a ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={120} r={radius.lg} />
            <Skeleton height={200} r={radius.lg} />
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <Kpi icon={Eye} label={t("Profile views")} value={compact(a.totals.views)} delta={a.deltas.views} />
              <Kpi icon={Users} label={t("Unique viewers")} value={compact(a.totals.unique_viewers)} delta={a.deltas.unique_viewers} />
              <Kpi icon={UserPlus} label={t("Followers")} value={compact(a.totals.followers)} delta={a.deltas.followers} />
              <Kpi icon={Sparkles} label={t("Match rate")} value={`${a.totals.match_rate}%`} delta={a.deltas.match_rate} />
            </View>

            <Card style={{ gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ChartColumn size={17} color={c.textMuted} />
                <Text variant="headline" style={{ flex: 1 }}>{t("Profile views")}</Text>
                <Text variant="mono" color="textSubtle">{t('{{count}} days', { count: a.range })}</Text>
              </View>
              <Bars values={a.views} range={a.range} />
            </Card>

            <View style={{ gap: 10 }}>
              <Text variant="label" color="textSubtle">{t("WHO VIEWED YOU")}</Text>
              {isPro ? (
                a.viewers.length ? (
                  <Card padded={14}>
                    {a.viewers.map((v) => (
                      <PersonRow key={v.id} person={v} subtitle={`${v.headline ? `${v.headline} · ` : ''}${timeAgo(v.viewed_at)}`} />
                    ))}
                  </Card>
                ) : (
                  <EmptyState compact icon={Eye} title={t("No viewers yet")} message={t("Post an update or join a space to get discovered.")} />
                )
              ) : (
                <Card style={{ gap: 12 }}>
                  <Crown size={22} color={c.accentText} />
                  <Text variant="headline">{t("{{count}} people viewed your profile", { count: a.totals.unique_viewers })}</Text>
                  <Text color="textMuted">{t("Visitor details require an active paid plan. No visitor identities are shown here.")}</Text>
                  {BILLING_ENABLED && <Button title={t("See who with Pro")} variant="accent" size="sm" onPress={() => router.push('/premium')} />}
                </Card>
              )}
            </View>

            {a.top_posts.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text variant="label" color="textSubtle">{t("YOUR TOP POSTS")}</Text>
                {a.top_posts.map((p) => (
                  <PressableScale key={p.id} scaleTo={0.99} onPress={() => router.push(`/post/${p.id}` as Href)} style={{ padding: 14, gap: 8, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: c.hairline }}>
                    <Text variant="callout" numberOfLines={2}>{p.body}</Text>
                    <View style={{ flexDirection: 'row', gap: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Heart size={13} color={c.danger} fill={c.danger} />
                        <Text variant="mono" color="textSubtle">{compact(p.like_count)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <MessageCircle size={13} color={c.textSubtle} />
                        <Text variant="mono" color="textSubtle">{compact(p.comment_count)}</Text>
                      </View>
                    </View>
                  </PressableScale>
                ))}
              </View>
            )}

            <Card variant="tint" style={{ gap: 6 }}>
              <Text variant="headline">{t("Get discovered faster")}</Text>
              <Text variant="footnote" color="textMuted">
                {t("A photo and a clear headline help others understand what you are building.")}</Text>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}
