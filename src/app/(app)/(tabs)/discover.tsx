import { AI_ENABLED, BILLING_ENABLED } from '@/lib/env';
import { useTranslation } from '@/i18n';
import { useNow } from '@/lib/useNow';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { useCandidates, useCommunities, useEvents, useStartups } from '@/data/queries';
import { CommunityRow } from '@/features/communities/CommunityRow';
import { EventCard } from '@/features/events/EventCard';
import { useMatchFilters } from '@/features/match/filters';
import { PersonRow } from '@/features/people/PersonRow';
import { StartupCard } from '@/features/startups/StartupCard';
import { CONTENT_MAX, useTabBarPadding } from '@/lib/layout';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Badge, Button, Header, PressableScale, Section, Skeleton, Text } from '@/ui';
import {
  BookOpen,
  Bot,
  Briefcase,
  CalendarDays,
  ChevronRight,
  Crown,
  GraduationCap,
  Rocket,
  Search,
  TrendingUp,
  Trophy,
  UsersRound,
  type IconType,
} from '@/ui/icons';

const AREAS: { icon: IconType; title: string; sub: string; href: Href }[] = [
  { icon: Rocket, title: 'Startups', sub: 'Launches & showcases', href: '/startups' },
  { icon: Briefcase, title: 'Opportunities', sub: 'Roles, co-founder spots', href: '/opportunities' },
  { icon: CalendarDays, title: 'Events', sub: 'Pitch nights & meetups', href: '/events' },
  { icon: UsersRound, title: 'Spaces', sub: 'Communities by topic', href: '/communities' },
  { icon: TrendingUp, title: 'Investors', sub: 'Warm intros', href: '/investors' },
  { icon: GraduationCap, title: 'Mentors', sub: 'Book 1:1 sessions', href: '/mentors' },
  { icon: BookOpen, title: 'Knowledge', sub: 'Playbooks & guides', href: '/knowledge' },
  { icon: Trophy, title: 'Challenges', sub: 'Weekly · earn XP', href: '/challenges' },
];

export default function Discover() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const { c } = useTheme();
  const { isPro } = useAuth();
  const pad = useTabBarPadding();
  const filters = useMatchFilters((s) => s.filters);
  const startups = useStartups('trending');
  const events = useEvents();
  const communities = useCommunities();
  const people = useCandidates(filters);
  const [refreshing, setRefreshing] = useState(false);

  const now = useNow();
  const upcoming = (events.data ?? []).filter((e) => Date.parse(e.starts_at) > now).slice(0, 6);
  const spaces = (communities.data ?? []).filter((x) => !x.joined && !x.is_private).slice(0, 3);

  const refresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header large title={t("Discover")} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: pad, gap: 26, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.textSubtle} />}
        showsVerticalScrollIndicator={false}
      >
        <PressableScale
          scaleTo={0.99}
          onPress={() => router.push('/search')}
          accessibilityRole="search"
          accessibilityLabel={t("Search founders, startups, spaces and events")}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: c.input, borderWidth: 1, borderColor: c.border }}
        >
          <Search size={18} color={c.textSubtle} />
          <Text color="textFaint">{t("Founders, startups, spaces, events…")}</Text>
        </PressableScale>

        {!isPro && (
          <PressableScale scaleTo={0.985} onPress={() => router.push('/premium')} accessibilityLabel={t("Upgrade to FNDRS Pro")}>
            <LinearGradient
              colors={[c.accentSoft, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: c.accentBorder }}
            >
              <LinearGradient colors={c.gold} style={{ width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}>
                <Crown size={21} color={c.onAccent} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text variant="headline">FNDRS Pro</Text>
                <Text variant="caption" color="textMuted">{BILLING_ENABLED ? t("Unlimited matches · warm investor intros · analytics") : t("Paid plans are not available yet")}</Text>
              </View>
              <ChevronRight size={18} color={c.accentText} />
            </LinearGradient>
          </PressableScale>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {AREAS.map((a) => {
            const Icon = a.icon;
            return (
              <PressableScale
                key={a.title}
                scaleTo={0.96}
                onPress={() => router.push(a.href)}
                accessibilityLabel={t(a.title)}
                style={{ width: '47%', flexGrow: 1, padding: 14, gap: 10, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: c.hairline }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: c.tint08, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={c.text} />
                </View>
                <View>
                  <Text variant="headline">{t(a.title)}</Text>
                  <Text variant="caption" color="textSubtle" numberOfLines={1}>{t(a.sub)}</Text>
                </View>
              </PressableScale>
            );
          })}
        </View>

        <PressableScale scaleTo={0.99} onPress={() => router.push('/copilot')} accessibilityLabel={t("Open FNDRS Copilot")}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: c.hairline }}>
            <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: c.action, alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={22} color={c.actionText} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text variant="headline">FNDRS Copilot</Text>
                <Badge tone="accent">AI</Badge>
              </View>
              <Text variant="caption" color="textSubtle">{AI_ENABLED ? t("Pitch reviews, intro drafts and hiring plans — grounded in your profile.") : t("Copilot is not enabled yet")}</Text>
            </View>
            <ChevronRight size={18} color={c.textFaint} />
          </View>
        </PressableScale>

        <Section title={t("Trending startups")} action={t("See all")} onAction={() => router.push('/startups')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
            {startups.isLoading
              ? [0, 1].map((i) => <Skeleton key={i} width={230} height={190} r={radius.lg} />)
              : (startups.data ?? []).slice(0, 8).map((s) => <StartupCard key={s.id} startup={s} variant="mini" />)}
          </ScrollView>
        </Section>

        <Section title={t("Upcoming events")} action={t("All events")} onAction={() => router.push('/events')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
            {events.isLoading
              ? [0, 1].map((i) => <Skeleton key={i} width={250} height={170} r={radius.lg} />)
              : upcoming.map((e) => <EventCard key={e.id} event={e} variant="mini" />)}
          </ScrollView>
        </Section>

        {(people.data ?? []).length > 0 && (
          <Section title={t("Founders you should meet")} action={t("Smart Match")} onAction={() => router.push('/match')}>
            <View>
              {(people.data ?? []).slice(0, 4).map((p) => (
                <PersonRow
                  key={p.id}
                  person={p}
                  subtitle={`${p.score}% fit · ${p.reasons[0] ?? p.headline}`}
                  right={<Button title={t("View")} size="sm" variant="secondary" onPress={() => router.push(`/user/${p.id}` as Href)} />}
                />
              ))}
            </View>
          </Section>
        )}

        {spaces.length > 0 && (
          <Section title={t("Spaces to join")} action={t("Browse")} onAction={() => router.push('/communities')}>
            <View style={{ gap: 10 }}>
              {spaces.map((s) => <CommunityRow key={s.id} community={s} />)}
            </View>
          </Section>
        )}
      </ScrollView>
    </View>
  );
}
