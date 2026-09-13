import { useTranslation } from '@/i18n';
import { useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Platform, RefreshControl, ScrollView, TextInput, View } from 'react-native';

import { useConversations, useMatches, useOpenConversation } from '@/data/queries';
import type { Conversation } from '@/data/types';
import { firstName, timeAgo } from '@/lib/format';
import { CONTENT_MAX, useTabBarPadding } from '@/lib/layout';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius } from '@/theme/tokens';
import { Avatar, CountBadge, EmptyState, Header, IconButton, PressableScale, SegmentedControl, SkeletonList, Text } from '@/ui';
import { BadgeCheck, CheckCheck, MessageCircle, Search, SquarePen } from '@/ui/icons';

type Filter = 'all' | 'unread' | 'matches';

function ConversationRow({ convo, myId }: { convo: Conversation; myId: string | null }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { c } = useTheme();
  const other = convo.other;
  const unread = convo.unread > 0;
  const mine = convo.last_sender_id === myId;
  const seen = mine && !!convo.other_last_read_at && !!convo.last_message_at && convo.other_last_read_at >= convo.last_message_at;
  return (
    <PressableScale
      scaleTo={0.985}
      onPress={() => router.push(`/chat/${convo.id}` as Href)}
      accessibilityLabel={t('Conversation with {{name}}', {name:other?.full_name ?? t('Member')}) + (unread ? ', ' + t('{{count}} unread', {count:convo.unread}) : '')}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 12 }}
    >
      <Avatar uri={other?.avatar_url} name={other?.full_name} size={54} ring={other?.verified} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="headline" numberOfLines={1} style={{ flexShrink: 1 }}>{other?.full_name ?? t("Conversation")}</Text>
          {other?.verified && <BadgeCheck size={14} color={c.accentText} />}
          {convo.is_match && (
            <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: c.accentSoft }}>
              <Text variant="mono" color="accentText" style={{ fontSize: 9.5 }}>{t("MATCH")}</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          {!!convo.last_message_at && (
            <Text variant="mono" color={unread ? 'text' : 'textSubtle'}>{timeAgo(convo.last_message_at)}</Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {seen && <CheckCheck size={14} color={c.info} />}
          <Text
            variant="callout"
            numberOfLines={1}
            color={unread ? 'text' : 'textSubtle'}
            style={{ flex: 1, fontFamily: unread ? font.sansSemibold : font.sans }}
          >
            {convo.last_message ? `${mine ? t("You: ") : ''}${convo.last_message}` : t('Say hi to {{name}} 👋', {name:firstName(other?.full_name)})}
          </Text>
          <CountBadge count={convo.unread} />
        </View>
      </View>
    </PressableScale>
  );
}

export default function Inbox() {
  const { t } = useTranslation();
  const router = useRouter();
  const { c } = useTheme();
  const { userId } = useAuth();
  const pad = useTabBarPadding();
  const conversations = useConversations();
  const matches = useMatches();
  const open = useOpenConversation();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const all = (conversations.data ?? []).filter((cv) => !!cv.last_message);
  const unreadCount = all.filter((cv) => cv.unread > 0).length;
  const q = query.trim().toLowerCase();
  const list = all
    .filter((cv) => (filter === 'unread' ? cv.unread > 0 : filter === 'matches' ? cv.is_match : true))
    .filter((cv) => !q || (cv.other?.full_name ?? '').toLowerCase().includes(q) || (cv.last_message ?? '').toLowerCase().includes(q));
  const fresh = (matches.data ?? []).filter((m) => !m.has_messages);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([conversations.refetch(), matches.refetch()]);
    setRefreshing(false);
  };

  const header = (
    <View style={{ gap: 16, paddingBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: c.input, borderWidth: 1, borderColor: c.border }}>
        <Search size={17} color={c.textSubtle} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("Search messages")}
          placeholderTextColor={c.textFaint}
          style={[{ flex: 1, color: c.text, fontFamily: font.sans, fontSize: 15 }, Platform.OS === 'web' ? ({ outlineWidth: 0 } as object) : null]}
          accessibilityLabel={t("Search messages")}
        />
      </View>

      {fresh.length > 0 && !q && (
        <View style={{ gap: 10 }}>
          <Text variant="label" color="textSubtle">{t("NEW MATCHES")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 14, paddingHorizontal: 16 }}>
            {fresh.map((m) => (
              <PressableScale
                key={m.profile.id}
                scaleTo={0.94}
                accessibilityLabel={t('Start a chat with {{name}}', {name:m.profile.full_name})}
                onPress={async () => {
                  const id = m.conversation_id ?? (await open.mutateAsync(m.profile.id));
                  router.push(`/chat/${id}` as Href);
                }}
                style={{ alignItems: 'center', gap: 6, width: 68 }}
              >
                <Avatar uri={m.profile.avatar_url} name={m.profile.full_name} size={62} ring />
                <Text variant="caption" numberOfLines={1}>{firstName(m.profile.full_name)}</Text>
              </PressableScale>
            ))}
          </ScrollView>
        </View>
      )}

      <SegmentedControl<Filter>
        value={filter}
        onChange={setFilter}
        size="sm"
        options={[
          { value: 'all', label: t("All") },
          { value: 'unread', label: t("Unread"), badge: unreadCount },
          { value: 'matches', label: t("Matches") },
        ]}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header
        large
        title={t("Messages")}
        right={<IconButton icon={SquarePen} onPress={() => router.push('/new-message')} accessibilityLabel={t("New message")} />}
      />
      <FlatList
        data={list}
        keyExtractor={(cv) => cv.id}
        renderItem={({ item }) => <ConversationRow convo={item} myId={userId} />}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: c.hairline, marginLeft: 67 }} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          conversations.isLoading ? (
            <SkeletonList count={6} />
          ) : (
            <EmptyState
              icon={MessageCircle}
              title={q ? t('No results for “{{query}}”', {query}) : filter === 'unread' ? t("You’re all caught up") : t("No conversations yet")}
              message={q ? undefined : t("Match with founders or message anyone from their profile.")}
              actionLabel={q || filter !== 'all' ? undefined : t("Open Smart Match")}
              onAction={() => router.push('/match')}
            />
          )
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.textSubtle} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: pad, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}
