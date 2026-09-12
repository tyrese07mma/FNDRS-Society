import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAskCopilot, useCopilot, useResetCopilot } from '@/data/queries';
import type { CopilotMessage } from '@/data/types';
import { TypingBubble } from '@/features/chat/TypingBubble';
import { firstName } from '@/lib/format';
import { KAV_BEHAVIOR, useKeyboardOpen } from '@/lib/layout';
import { copy } from '@/lib/share';
import { useAuth } from '@/providers/AuthProvider';
import { confirm } from '@/state/dialog';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius } from '@/theme/tokens';
import { Badge, Header, IconButton, Markdown, PressableScale, Text } from '@/ui';
import { ArrowUp, Bot, Briefcase, CalendarDays, Lightbulb, PenLine, RotateCcw, TrendingUp, Users, type IconType } from '@/ui/icons';

const PROMPTS: { icon: IconType; title: string; prompt: string }[] = [
  { icon: PenLine, title: 'Draft an investor email', prompt: 'Draft a short warm-intro email to the best-fit investor for my startup.' },
  { icon: Users, title: 'Find a co-founder', prompt: 'Who are the three strongest co-founder candidates for me right now, and why?' },
  { icon: TrendingUp, title: 'Structure my pitch deck', prompt: 'Give me a slide-by-slide structure for my pitch deck.' },
  { icon: Lightbulb, title: 'Brainstorm ideas', prompt: 'Brainstorm three startup ideas in my industries worth testing this month.' },
  { icon: Briefcase, title: 'Plan my first hires', prompt: 'Build me a 90-day hiring plan for my stage.' },
  { icon: CalendarDays, title: 'Which events to attend', prompt: 'Which upcoming events should I attend and how do I make the most of them?' },
];

function BotAvatar() {
  const { c } = useTheme();
  return (
    <LinearGradient colors={c.gold} style={{ width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
      <Bot size={16} color={c.onAccent} />
    </LinearGradient>
  );
}

export default function Copilot() {
  const params = useLocalSearchParams<{ prompt?: string }>();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { profile } = useAuth();
  const history = useCopilot();
  const ask = useAskCopilot();
  const reset = useResetCopilot();
  const [text, setText] = useState(params.prompt ?? '');
  const listRef = useRef<FlatList<CopilotMessage>>(null);
  const keyboard = useKeyboardOpen();
  const messages: CopilotMessage[] = [...(history.data ?? []), ...(ask.streaming ? [{id:'streaming',role:'assistant' as const,content:ask.streaming,created_at:new Date().toISOString()}] : [])];

  const scrollToEnd = () => requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));

  const send = (value?: string) => {
    const t = (value ?? text).trim();
    if (!t || ask.isPending) return;
    setText('');
    ask.mutate(t, { onError: () => setText(t) });
  };

  const render = ({ item }: { item: CopilotMessage }) => {
    if (item.role === 'user') {
      return (
        <View style={{ alignSelf: 'flex-end', maxWidth: '82%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, borderBottomRightRadius: 6, backgroundColor: c.action, marginVertical: 6 }}>
          <Text variant="body" tint={c.actionText} selectable>{item.content}</Text>
        </View>
      );
    }
    return (
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginVertical: 6 }}>
        <BotAvatar />
        <Pressable
          onLongPress={() => copy(item.content, 'Answer copied')}
          delayLongPress={350}
          accessibilityHint="Long press to copy"
          style={{ flex: 1, padding: 14, borderRadius: 20, borderTopLeftRadius: 6, backgroundColor: c.card, borderWidth: 1, borderColor: c.hairline }}
        >
          <Markdown source={item.content} size="sm" />
        </Pressable>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={KAV_BEHAVIOR}>
      <Header
        back
        titleNode={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text variant="title3">Copilot</Text>
            <Badge tone="accent">AI</Badge>
          </View>
        }
        right={
          messages.length > 0 ? (
            <IconButton
              icon={RotateCcw}
              onPress={async () => {
                if (await confirm({ title: 'Start a new conversation?', message: 'Your current Copilot history will be cleared.', confirmLabel: 'Clear', destructive: true })) {
                  reset.mutate();
                }
              }}
              accessibilityLabel="New conversation"
            />
          ) : undefined
        }
        border
      />

      {messages.length === 0 && !ask.isPending ? (
        <FlatList
          key="prompts"
          data={PROMPTS}
          keyExtractor={(p) => p.title}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={{ alignItems: 'center', gap: 12, paddingVertical: 28 }}>
              <LinearGradient colors={c.gold} style={{ width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 12px 32px rgba(203,169,104,0.35)' }}>
                <Bot size={30} color={c.onAccent} />
              </LinearGradient>
              <Text variant="title2" align="center">What can I help you ship today, {firstName(profile?.full_name)}?</Text>
              <Text variant="callout" color="textSubtle" align="center" style={{ maxWidth: 340 }}>
                I know your profile, your matches and what is happening in the network.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const Icon = item.icon;
            return (
              <PressableScale
                onPress={() => send(item.prompt)}
                scaleTo={0.97}
                accessibilityLabel={item.title}
                style={{ flex: 1, minHeight: 104, padding: 14, gap: 10, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: c.hairline }}
              >
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.tint08, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} color={c.text} />
                </View>
                <Text variant="headline" style={{ fontSize: 14.5 }}>{item.title}</Text>
              </PressableScale>
            );
          }}
          contentContainerStyle={{ padding: 16, width: '100%', maxWidth: 760, alignSelf: 'center' }}
        />
      ) : (
        <FlatList
          key="thread"
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={render}
          onContentSizeChange={scrollToEnd}
          ListFooterComponent={
            ask.isPending ? (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <BotAvatar />
                <TypingBubble />
              </View>
            ) : null
          }
          contentContainerStyle={{ padding: 16, width: '100%', maxWidth: 760, alignSelf: 'center' }}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: (keyboard ? 0 : insets.bottom) + 8, borderTopWidth: 1, borderTopColor: c.hairline, backgroundColor: c.bg, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
          <TextInput
            value={text}
            onChangeText={setText}
            onKeyPress={(e) => {
              const ne = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
              if (Platform.OS === 'web' && ne.key === 'Enter' && !ne.shiftKey) {
                (e as unknown as { preventDefault: () => void }).preventDefault();
                send();
              }
            }}
            placeholder="Ask about fundraising, hiring, your pitch…"
            placeholderTextColor={c.textFaint}
            multiline
            maxLength={4000}
            accessibilityLabel="Ask Copilot"
            style={[
              { flex: 1, minHeight: 44, maxHeight: 140, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderRadius: 22, backgroundColor: c.input, borderWidth: 1, borderColor: c.border, color: c.text, fontFamily: font.sans, fontSize: 15.5 },
              Platform.OS === 'web' ? ({ outlineWidth: 0 } as object) : null,
            ]}
          />
          <PressableScale
            onPress={() => send()}
            disabled={!text.trim() || ask.isPending}
            scaleTo={0.88}
            accessibilityLabel="Send to Copilot"
            style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: text.trim() && !ask.isPending ? c.action : c.tint08 }}
          >
            <ArrowUp size={20} color={text.trim() && !ask.isPending ? c.actionText : c.textFaint} strokeWidth={2.5} />
          </PressableScale>
        </View>
        <Text variant="caption" color="textFaint" align="center">
          Copilot can make mistakes — double-check important facts.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
