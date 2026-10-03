import { AI_ENABLED } from '@/lib/env';
import { useTranslation } from '@/i18n';
import { useNow } from '@/lib/useNow';
import { useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';

import { useCandidates, useChallenges, useEvents, useFeed, useUnreadCounts } from '@/data/queries';
import type { FeedScope, PostKind } from '@/data/types';
import { Wordmark } from '@/features/brand/Wordmark';
import { PostCard } from '@/features/feed/PostCard';
import { useMatchFilters } from '@/features/match/filters';
import { profileStrength } from '@/features/profile/strength';
import { eventDate, firstName, greeting } from '@/lib/format';
import { CONTENT_MAX, useTabBarPadding } from '@/lib/layout';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Avatar, Button, Card, EmptyState, Header, IconButton, PressableScale, ProgressBar, SegmentedControl, SkeletonList, Text } from '@/ui';
import {
  Bell,
  Bot,
  CalendarDays,
  ChevronRight,
  Flag,
  Megaphone,
  Newspaper,
  Search,
  Sparkles,
  Trophy,
  UserCheck,
  Vote,
  type IconType,
} from '@/ui/icons';

const QUICK: { kind: PostKind; label: string; icon: IconType }[] = [
  { kind: 'milestone', label: 'Milestone', icon: Trophy },
  { kind: 'looking_for', label: 'Hiring', icon: Megaphone },
  { kind: 'poll', label: 'Poll', icon: Vote },
  { kind: 'question', label: 'Question', icon: Flag },
];

function RailCard({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  onPress,
  children,
  tone = 'default',
}: {
  icon: IconType;
  eyebrow: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  children?: React.ReactNode;
  tone?: 'default' | 'accent';
}) {
  const { c } = useTheme();
  return (
    <Card onPress={onPress} variant={tone === 'accent' ? 'accent' : 'default'} style={{ width: 210, minHeight: 132, gap: 8 }} accessibilityLabel={title}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: tone === 'accent' ? c.accentSoft : c.tint08, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={tone === 'accent' ? c.accentText : c.text} />
        </View>
        <ChevronRight size={16} color={c.textFaint} />
      </View>
      <Text variant="label" color="textSubtle">{eyebrow}</Text>
      <Text variant="headline" numberOfLines={2}>{title}</Text>
      {!!subtitle && <Text variant="caption" color="textSubtle" numberOfLines={1}>{subtitle}</Text>}
      {children}
    </Card>
  );
}

function TodayRail() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const filters = useMatchFilters((s) => s.filters);
  const candidates = useCandidates(filters);
  const events = useEvents();
  const challenges = useChallenges();
  const strength = profile ? profileStrength(profile) : null;

  const now = useNow();
  const nextEvent = (events.data ?? []).find((e) => Date.parse(e.starts_at) > now && (e.going || e.featured));
  const challenge = (challenges.data ?? []).find((ch) => ch.active);
  const count = candidates.data?.length ?? 0;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }} style={{ marginHorizontal: -16 }}>
      <RailCard
        icon={Sparkles}
        tone="accent"
        eyebrow={t("SMART MATCH")}
        title={count ? t('{{count}} founders fit you right now', {count}) : t("Find your co-founder")}
        subtitle={candidates.data?.[0] ? t('Top match: {{name}} · {{score}}%', {name:candidates.data[0].full_name,score:candidates.data[0].score}) : t("Swipe through today’s picks")}
        onPress={() => router.push('/match')}
      />
      {nextEvent && (
        <RailCard
          icon={CalendarDays}
          eyebrow={nextEvent.going ? t("YOU ARE GOING") : t("FEATURED EVENT")}
          title={nextEvent.title}
          subtitle={`${eventDate(nextEvent.starts_at).weekday} ${eventDate(nextEvent.starts_at).day} ${eventDate(nextEvent.starts_at).mo} · ${eventDate(nextEvent.starts_at).time}`}
          onPress={() => router.push(`/events/${nextEvent.id}` as Href)}
        />
      )}
      {challenge && (
        <RailCard icon={Trophy} eyebrow={t("WEEKLY CHALLENGE")} title={challenge.title} onPress={() => router.push('/challenges')}>
          <ProgressBar value={challenge.my_step} max={challenge.steps.length} tone="gold" height={5} />
        </RailCard>
      )}
      {strength && strength.pct < 100 && (
        <RailCard icon={UserCheck} eyebrow={t('PROFILE {{score}}%', {score:strength.pct})} title={t(strength.missing[0].label)} subtitle={t("Help other founders understand what you bring")} onPress={() => router.push('/edit-profile')}>
          <ProgressBar value={strength.pct} height={5} />
        </RailCard>
      )}
      <RailCard icon={Bot} eyebrow={t("COPILOT")} title={t("Draft an investor email in seconds")} subtitle={AI_ENABLED ? t("Grounded in your profile") : t("Copilot is not enabled yet")} onPress={() => router.push('/copilot')} />
    </ScrollView>
  );
}

export default function Home() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const { c } = useTheme();
  const { profile } = useAuth();
  const [scope, setScope] = useState<FeedScope>('foryou');
  const feed = useFeed(scope);
  const unread = useUnreadCounts();
  const pad = useTabBarPadding();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await feed.refetch();
    setRefreshing(false);
  };

  const header = (
    <View style={{ gap: 18, paddingBottom: 14 }}>
      <View style={{ gap: 2, marginTop: 4 }}>
        <Text variant="title1">
          {greeting()}, {firstName(profile?.full_name)}
        </Text>
        <Text variant="footnote" color="textSubtle">
          {new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
      </View>

      <TodayRail />

      <Card style={{ gap: 12 }}>
        <PressableScale scaleTo={0.99} onPress={() => router.push('/compose')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessibilityLabel={t("Write a post")}>
          <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={38} />
          <View style={{ flex: 1, height: 40, borderRadius: radius.pill, backgroundColor: c.tint04, borderWidth: 1, borderColor: c.hairline, justifyContent: 'center', paddingHorizontal: 14 }}>
            <Text variant="callout" color="textSubtle">{t("Share an update, win or question…")}</Text>
          </View>
        </PressableScale>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {QUICK.map((q) => {
            const Icon = q.icon;
            return (
              <PressableScale
                key={q.kind}
                scaleTo={0.95}
                haptics="selection"
                onPress={() => router.push({ pathname: '/compose', params: { kind: q.kind } })}
                style={{ flex: 1, alignItems: 'center', gap: 5, paddingVertical: 8, borderRadius: radius.md, backgroundColor: c.tint04 }}
                accessibilityLabel={t('New {{kind}}', {kind:t(q.label)})}
              >
                <Icon size={16} color={c.textMuted} />
                <Text variant="caption" color="textMuted">{t(q.label)}</Text>
              </PressableScale>
            );
          })}
        </View>
      </Card>

      <SegmentedControl<FeedScope>
        value={scope}
        onChange={setScope}
        options={[
          { value: 'foryou', label: t("For you") },
          { value: 'following', label: t("Following") },
          { value: 'trending', label: t("Trending") },
        ]}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header
        large
        titleNode={<Wordmark size={16} />}
        right={
          <>
            <IconButton icon={Search} onPress={() => router.push('/search')} accessibilityLabel={t("Search")} />
            <IconButton icon={Bell} badge={unread.notifications} onPress={() => router.push('/notifications')} accessibilityLabel={t("Notifications")} />
          </>
        }
      />
      <FlatList
        data={feed.data ?? []}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PostCard post={item} />}
        ListFooterComponent={feed.hasNextPage ? <Button title={t("Load more posts")} variant="ghost" loading={feed.isFetchingNextPage} onPress={feed.fetchNextPage} /> : null}
        onEndReached={() => { void feed.fetchNextPage(); }}
        onEndReachedThreshold={0.3}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          feed.isLoading ? (
            <SkeletonList variant="post" count={3} />
          ) : (
            <EmptyState
              icon={Newspaper}
              title={scope === 'following' ? t("Your following feed is quiet") : t("Nothing here yet")}
              message={scope === 'following' ? t("Follow founders from Discover or Smart Match to fill it up.") : t("Be the first to share an update.")}
              actionLabel={scope === 'following' ? t("Discover people") : t("Write a post")}
              onAction={() => router.push(scope === 'following' ? '/discover' : '/compose')}
            />
          )
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.textSubtle} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: pad, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
