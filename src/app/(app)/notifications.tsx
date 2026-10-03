import { describeError } from '@/lib/errors';
import { useTranslation } from '@/i18n';
import { useRouter, type Href } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { RefreshControl, SectionList, View } from 'react-native';

import { useMarkNotificationsRead, useNotifications } from '@/data/queries';
import type { AppNotification, NotifKind } from '@/data/types';
import { timeAgo } from '@/lib/format';
import { CONTENT_MAX } from '@/lib/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Button, EmptyState, Header, PressableScale, SkeletonList, Text } from '@/ui';
import {
  Bell,
  CalendarDays,
  Handshake,
  Heart,
  Info,
  MessageCircle,
  Sparkles,
  Trophy,
  UserPlus,
  type IconType,
} from '@/ui/icons';

const ICON: Record<NotifKind, IconType> = {
  match: Sparkles,
  message: MessageCircle,
  follow: UserPlus,
  like: Heart,
  comment: MessageCircle,
  event: CalendarDays,
  achievement: Trophy,
  intro: Handshake,
  system: Info,
};

function Row({ n, fresh }: { n: AppNotification; fresh: boolean }) {
  const router = useRouter();
  const { c } = useTheme();
  const Icon = ICON[n.kind] ?? Bell;
  const tint = n.kind === 'like' ? c.danger : n.kind === 'match' || n.kind === 'achievement' ? c.accentText : n.kind === 'follow' ? c.info : c.text;
  return (
    <PressableScale
      scaleTo={0.985}
      onPress={() => n.link && router.push(n.link as Href)}
      accessibilityLabel={`${n.title}${n.body ? `. ${n.body}` : ''}`}
      style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: 12, marginHorizontal: -12, borderRadius: 16, backgroundColor: fresh ? c.tint04 : 'transparent' }}
    >
      <View>
        {n.actor ? (
          <Avatar uri={n.actor.avatar_url} name={n.actor.full_name} size={46} />
        ) : (
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: c.tint08, alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={20} color={tint} />
          </View>
        )}
        {n.actor && (
          <View style={{ position: 'absolute', right: -3, bottom: -3, width: 22, height: 22, borderRadius: 11, backgroundColor: c.card, borderWidth: 2, borderColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={11} color={tint} fill={n.kind === 'like' ? tint : 'transparent'} />
          </View>
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={2}>{n.title}</Text>
        {!!n.body && <Text variant="footnote" color="textSubtle" numberOfLines={2}>{n.body}</Text>}
        <Text variant="mono" color="textFaint" style={{ marginTop: 2 }}>{timeAgo(n.created_at)}</Text>
      </View>
      {fresh && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent, marginTop: 6 }} />}
    </PressableScale>
  );
}

export default function Notifications() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const router = useRouter();
  const list = useNotifications();
  const markRead = useMarkNotificationsRead();
  const [freshIds, setFreshIds] = useState<Set<string> | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Capture the initial unread set once; preserve its visual grouping after read.
  if (list.data && freshIds === null) setFreshIds(new Set(list.data.filter(n => !n.read).map(n => n.id)));
  const markAllRead = markRead.mutate;
  useEffect(() => {
    if (!freshIds?.size) return;
    const timer = setTimeout(() => markAllRead(), 1200);
    return () => clearTimeout(timer);
  }, [freshIds, markAllRead]);

  const items = list.data ?? [];
  const isFresh = (n: AppNotification) => freshIds?.has(n.id) ?? !n.read;
  const sections = [
    { title: t("NEW"), data: items.filter(isFresh) },
    { title: t("EARLIER"), data: items.filter((n) => !isFresh(n)) },
  ].filter((s) => s.data.length);

  const refresh = async () => {
    setRefreshing(true);
    await list.refetch();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header
        back
        title={t("Notifications")}
        right={items.some((n) => !n.read) ? <Button title={t("Mark all read")} size="sm" variant="ghost" onPress={() => markRead.mutate()} /> : undefined}
      />
      <SectionList
        sections={sections}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => <Row n={item} fresh={isFresh(item)} />}
        renderSectionHeader={({ section }) => (
          <Text variant="label" color="textSubtle" style={{ paddingTop: 18, paddingBottom: 6, backgroundColor: c.bg }}>
            {section.title}
          </Text>
        )}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          list.isLoading ? (
            <SkeletonList count={7} />
          ) : list.isError ? (
            <EmptyState icon={Bell} title={t("Notifications could not be loaded")} message={describeError(list.error)} actionLabel={t("Try again")} onAction={() => void list.refetch()} />
          ) : (
            <EmptyState icon={Bell} title={t("No notifications yet")} message={t("Matches and replies will show up here.")} actionLabel={t("Find founders")} onAction={() => router.push('/match')} />
          )
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.textSubtle} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}
      />
    </View>
  );
}
