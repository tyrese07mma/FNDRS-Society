import { BlurView } from 'expo-blur';
import { useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAnalytics } from '@/data/queries';
import { PersonRow } from '@/features/people/PersonRow';
import { compact, timeAgo } from '@/lib/format';
import { CONTENT_MAX } from '@/lib/layout';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Avatar, Badge, Button, Card, EmptyState, Header, PressableScale, SegmentedControl, Skeleton, Stat, Text } from '@/ui';
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
  const { c } = useTheme();
  const max = Math.max(1, ...values);
  const labels = values.map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (values.length - 1 - i));
    if (range === 7) return d.toLocaleDateString('en-GB', { weekday: 'narrow' });
    return i % 5 === 4 || i === values.length - 1 ? String(d.getDate()) : '';
  });
  return (
    <View style={{ gap: 8 }}>
      <View style={{ height: 150, flexDirection: 'row', alignItems: 'flex-end', gap: range === 7 ? 10 : 3 }}>
        {values.map((v, i) => {
          const last = i === values.length - 1;
          return (
            <View key={i} style={{ flex: 1, height: `${Math.max(4, (v / max) * 100)}%`, borderRadius: range === 7 ? 8 : 3, backgroundColor: last ? c.accent : c.tint20 }} accessibilityLabel={`${v} views`} />
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, dark } = useTheme();
  const { isPro } = useAuth();
  const [range, setRange] = useState<Range>('7');
  const data = useAnalytics(Number(range) as 7 | 30);
  const a = data.data;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header back title="Analytics" right={isPro ? <Badge tone="accent" dot>Pro</Badge> : undefined} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 22, paddingBottom: insets.bottom + 40, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}>
        <SegmentedControl<Range>
          value={range}
          onChange={(v) => {
            if (v === '30' && !isPro) router.push('/premium');
            else setRange(v);
          }}
          options={[
            { value: '7', label: 'Last 7 days' },
            { value: '30', label: isPro ? 'Last 30 days' : '30 days · Pro' },
          ]}
        />

        {!a ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={120} r={radius.lg} />
            <Skeleton height={200} r={radius.lg} />
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <Kpi icon={Eye} label="Profile views" value={compact(a.totals.views)} delta={a.deltas.views} />
              <Kpi icon={Users} label="Unique viewers" value={compact(a.totals.unique_viewers)} delta={a.deltas.unique_viewers} />
              <Kpi icon={UserPlus} label="Followers" value={compact(a.totals.followers)} delta={a.deltas.followers} />
              <Kpi icon={Sparkles} label="Match rate" value={`${a.totals.match_rate}%`} delta={a.deltas.match_rate} />
            </View>

            <Card style={{ gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ChartColumn size={17} color={c.textMuted} />
                <Text variant="headline" style={{ flex: 1 }}>Profile views</Text>
                <Text variant="mono" color="textSubtle">{a.range} days</Text>
              </View>
              <Bars values={a.views} range={a.range} />
            </Card>

            <View style={{ gap: 10 }}>
              <Text variant="label" color="textSubtle">WHO VIEWED YOU</Text>
              {isPro ? (
                a.viewers.length ? (
                  <Card padded={14}>
                    {a.viewers.map((v) => (
                      <PersonRow key={v.id} person={v} subtitle={`${v.headline ? `${v.headline} · ` : ''}${timeAgo(v.viewed_at)} ago`} />
                    ))}
                  </Card>
                ) : (
                  <EmptyState compact icon={Eye} title="No viewers yet" message="Post an update or join a space to get discovered." />
                )
              ) : (
                <View style={{ borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: c.hairline }}>
                  <View style={{ padding: 14, gap: 12, backgroundColor: c.card }}>
                    {['Investor · seed fund', 'Founder · AI / ML', 'Operator · growth'].map((t) => (
                      <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Avatar name="? ?" size={44} />
                        <View style={{ flex: 1, gap: 6 }}>
                          <Skeleton width="45%" height={12} />
                          <Text variant="caption" color="textSubtle">{t}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                  {Platform.OS !== 'android' && <BlurView intensity={24} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
                  <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, backgroundColor: Platform.OS === 'android' ? c.scrim : 'transparent' }]}>
                    <Crown size={22} color={c.accentText} />
                    <Text variant="headline" align="center">
                      {a.totals.unique_viewers} people viewed your profile
                    </Text>
                    <Button title="See who with Pro" variant="accent" size="sm" onPress={() => router.push('/premium')} />
                  </View>
                </View>
              )}
            </View>

            {a.top_posts.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text variant="label" color="textSubtle">YOUR TOP POSTS</Text>
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
              <Text variant="headline">Get discovered faster</Text>
              <Text variant="footnote" color="textMuted">
                Members with a photo, a clear headline and at least one post a week get about three times more profile views.
              </Text>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}
