import { describeError } from '@/lib/errors';
import { useTranslation } from '@/i18n';
import { BlockAction } from '@/features/people/BlockAction';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/data';
import { qk, useConversation, useReport, useThread } from '@/data/queries';
import type { Message } from '@/data/types';
import { TypingBubble } from '@/features/chat/TypingBubble';
import { clockTime, dayLabel, firstName, sameDay } from '@/lib/format';
import { KAV_BEHAVIOR, useKeyboardOpen } from '@/lib/layout';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/tokens';
import { Avatar, Button, Chip, EmptyState, IconButton, ListGroup, ListRow, PressableScale, Sheet, SkeletonList, Text } from '@/ui';
import { ArrowUp, BadgeCheck, ChevronLeft, CircleAlert, Clock, Ellipsis, Flag, Sparkles, User } from '@/ui/icons';

type Row =
  | { type: 'day'; key: string; label: string }
  | { type: 'msg'; key: string; m: Message; mine: boolean; first: boolean; last: boolean };

const GROUP_MS = 5 * 60_000;
const grouped = (a?: Message, b?: Message) =>
  !!a && !!b && a.sender_id === b.sender_id && sameDay(a.created_at, b.created_at) && Math.abs(Date.parse(b.created_at) - Date.parse(a.created_at)) < GROUP_MS;

export default function Chat() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { userId } = useAuth();
  const convo = useConversation(id);
  const { messages, loading, error, typing, otherReadAt, send, hasOlder, loadOlder, loadingOlder } = useThread(id, userId);
  const report = useReport();
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const listRef = useRef<FlatList<Row>>(null);
  const scrolledThrough = useRef<string | undefined>(undefined);
  const keyboard = useKeyboardOpen();
  const other = convo.data?.other ?? null;
  const name = firstName(other?.full_name);

  useEffect(() => {
    api.markRead(id).then(() => qc.invalidateQueries({ queryKey: qk.conversations })).catch(() => {});
  }, [id, messages.length, qc]);

  const readAt = otherReadAt ?? convo.data?.other_last_read_at ?? null;
  let lastMine = -1;
  messages.forEach((m, i) => {
    if (m.sender_id === userId && !m.pending) lastMine = i;
  });

  const rows: Row[] = [];
  messages.forEach((m, i) => {
    const prev = messages[i - 1];
    if (!prev || !sameDay(prev.created_at, m.created_at)) rows.push({ type: 'day', key: `d-${m.id}`, label: dayLabel(m.created_at) });
    rows.push({ type: 'msg', key: m.id, m, mine: m.sender_id === userId, first: !grouped(prev, m), last: !grouped(m, messages[i + 1]) });
  });

  const submit = (body?: string) => {
    const value = (body ?? text).trim();
    if (!value) return;
    if (!body) setText('');
    void send(value);
  };

  const scrollToEnd = (animated = true) => requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated }));

  const renderRow = ({ item }: { item: Row }) => {
    if (item.type === 'day') {
      return (
        <Text variant="mono" color="textSubtle" align="center" style={{ marginVertical: 14 }}>
          {item.label.toUpperCase()}
        </Text>
      );
    }
    const { m, mine, first, last } = item;
    const index = messages.indexOf(m);
    const seen = index === lastMine && !!readAt && readAt >= m.created_at;
    return (
      <View style={{ flexDirection: 'row', justifyContent: mine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8, marginTop: first ? 10 : 3 }}>
        {!mine && <View style={{ width: 28 }}>{last && <Avatar uri={other?.avatar_url} name={other?.full_name} size={28} />}</View>}
        <View style={{ maxWidth: '78%', alignItems: mine ? 'flex-end' : 'flex-start', gap: 4 }}>
          <View
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 20,
              borderBottomRightRadius: mine && last ? 6 : 20,
              borderBottomLeftRadius: !mine && last ? 6 : 20,
              backgroundColor: mine ? c.action : c.card,
              borderWidth: mine ? 0 : 1,
              borderColor: c.hairline,
              opacity: m.pending ? 0.65 : 1,
            }}
          >
            <Text variant="body" tint={mine ? c.actionText : c.text} selectable>
              {m.body}
            </Text>
          </View>
          {last && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginHorizontal: 4 }}>
              {m.pending && <Clock size={10} color={c.textFaint} />}
              <Text variant="mono" color="textFaint" style={{ fontSize: 10.5 }}>
                {m.pending ? t("Sending…") : clockTime(m.created_at)}
                {mine && index === lastMine && !m.pending ? ' · ' + (seen ? t('Seen') : t('Sent')) : ''}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const iceBreakers = [
    t('Hey {{name}}! Great to connect 👋', {name}),
    t("What are you building right now?"),
    t("Up for a quick call this week?"),
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={KAV_BEHAVIOR}>
      <View style={{ paddingTop: insets.top + 6, paddingBottom: 8, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 6, borderBottomWidth: 1, borderBottomColor: c.hairline, backgroundColor: c.bg }}>
        <IconButton icon={ChevronLeft} variant="plain" size={40} iconSize={24} onPress={() => (router.canGoBack() ? router.back() : router.replace('/inbox'))} accessibilityLabel={t("Back")} />
        <Pressable
          onPress={() => other && router.push(`/user/${other.id}` as Href)}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
          accessibilityRole="link"
          accessibilityLabel={other ? t("Open {{name}}'s profile", { name: other.full_name }) : t('View profile')}
        >
          <Avatar uri={other?.avatar_url} name={other?.full_name} size={38} ring={other?.verified} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text variant="headline" numberOfLines={1} style={{ flexShrink: 1 }}>{other?.full_name ?? t("Conversation")}</Text>
              {other?.verified && <BadgeCheck size={14} color={c.accentText} />}
            </View>
            <Text variant="caption" color={typing ? 'accentText' : 'textSubtle'} numberOfLines={1}>
              {typing ? t('typing…') : convo.data?.is_match ? t("Smart Match") : other?.headline ?? ''}
            </Text>
          </View>
        </Pressable>
        <IconButton icon={Ellipsis} variant="plain" size={40} onPress={() => setMenu(true)} accessibilityLabel={t("Conversation options")} />
      </View>

      {error ? (
        <EmptyState icon={CircleAlert} title={t("Conversation unavailable")} message={describeError(error)} />
      ) : loading ? (
        <View style={{ flex: 1, padding: 16 }}><SkeletonList count={5} /></View>
      ) : messages.length === 0 ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 18 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', gap: 12 }}>
            <Avatar uri={other?.avatar_url} name={other?.full_name} size={84} ring={other?.verified} />
            <Text variant="title2" align="center">{convo.data?.is_match ? `You matched with ${name}` : `Say hi to ${name}`}</Text>
            {!!other?.headline && <Text variant="callout" color="textSubtle" align="center">{other.headline}</Text>}
          </View>
          <View style={{ gap: 8, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles size={13} color={c.accentText} />
              <Text variant="label" color="textSubtle">{t("ICE-BREAKERS")}</Text>
            </View>
            {iceBreakers.map((t) => <Chip key={t} label={t} onPress={() => submit(t)} />)}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(r) => r.key}
          renderItem={renderRow}
          ListHeaderComponent={hasOlder ? <Button title={t("Load older messages")} variant="ghost" loading={loadingOlder} onPress={loadOlder} /> : null}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          ListFooterComponent={typing ? <View style={{ marginTop: 10, marginLeft: 36 }}><TypingBubble /></View> : null}
          onContentSizeChange={() => {
            const newest = messages.at(-1)?.id;
            if (newest !== scrolledThrough.current) { scrolledThrough.current = newest; scrollToEnd(false); }
          }}
          onLayout={() => scrollToEnd(false)}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12, width: '100%', maxWidth: 760, alignSelf: 'center' }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        />
      )}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: (keyboard ? 0 : insets.bottom) + 10, borderTopWidth: 1, borderTopColor: c.hairline, backgroundColor: c.bg }}>
        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t);
            if (t) api.sendTyping(id);
          }}
          onKeyPress={(e) => {
            const ne = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
            if (Platform.OS === 'web' && ne.key === 'Enter' && !ne.shiftKey) {
              (e as unknown as { preventDefault: () => void }).preventDefault();
              submit();
            }
          }}
          placeholder={t('Message {{name}}…', {name})}
          placeholderTextColor={c.textFaint}
          multiline
          maxLength={4000}
          accessibilityLabel={t("Message")}
          style={[
            { flex: 1, minHeight: 44, maxHeight: 130, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderRadius: 22, backgroundColor: c.input, borderWidth: 1, borderColor: c.border, color: c.text, fontFamily: font.sans, fontSize: 15.5 },
            Platform.OS === 'web' ? ({ outlineWidth: 0 } as object) : null,
          ]}
        />
        <PressableScale
          onPress={() => submit()}
          disabled={!text.trim()}
          scaleTo={0.88}
          accessibilityLabel={t("Send message")}
          style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: text.trim() ? c.action : c.tint08 }}
        >
          <ArrowUp size={20} color={text.trim() ? c.actionText : c.textFaint} strokeWidth={2.5} />
        </PressableScale>
      </View>

      <Sheet open={menu} onClose={() => { setMenu(false); setReporting(false); }} title={reporting ? t('Report {{name}}', { name }) : undefined}>
        {reporting ? (
          <ListGroup>
            {['Spam or scam', 'Harassment', 'Fake profile', 'Something else'].map((r, i, all) => (
              <ListRow
                key={r}
                title={t(r)}
                last={i === all.length - 1}
                onPress={() => {
                  setMenu(false);
                  setReporting(false);
                  if (other) report.mutate({ kind: 'user', id: other.id, reason: r });
                }}
              />
            ))}
          </ListGroup>
        ) : (
          <ListGroup>
            <ListRow icon={User} title={t("View profile")} onPress={() => { setMenu(false); if (other) router.push(`/user/${other.id}` as Href); }} />
            <ListRow icon={Flag} title={t('Report {{name}}', { name })} destructive onPress={() => setReporting(true)} />
            {other && <BlockAction userId={other.id} name={other.full_name} onClose={() => setMenu(false)} />}
          </ListGroup>
        )}
      </Sheet>
    </KeyboardAvoidingView>
  );
}
