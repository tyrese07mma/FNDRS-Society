import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAdvanceChallenge, useChallenges, useLeaderboard } from '@/data/queries';
import type { Challenge } from '@/data/types';
import { compact, countdown } from '@/lib/format';
import { CONTENT_MAX } from '@/lib/layout';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Avatar, Badge, Button, Card, EmptyState, Header, ProgressBar, Section, SkeletonList, Text } from '@/ui';
import { Check, Clock, Medal, Trophy, Users } from '@/ui/icons';

const EARN = [
  ['Finish your profile', 100],
  ['Launch a startup', 50],
  ['Host an event', 20],
  ['Get a match', 15],
  ['Share a post', 10],
  ['RSVP to an event', 10],
  ['Join a space', 5],
  ['Comment', 2],
] as const;

function ActiveChallenge({ ch }: { ch: Challenge }) {
  const { c } = useTheme();
  const advance = useAdvanceChallenge();
  const done = ch.my_step >= ch.steps.length;
  return (
    <Card variant="accent" style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Badge tone="accent" dot>This week</Badge>
        <Badge icon={Clock}>{countdown(ch.ends_at)}</Badge>
      </View>
      <View style={{ gap: 6 }}>
        <Text variant="title2">{ch.title}</Text>
        <Text variant="callout" color="textMuted">{ch.description}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Users size={14} color={c.textSubtle} />
          <Text variant="mono" color="textSubtle">{compact(ch.participants)} taking part</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Trophy size={14} color={c.accentText} />
          <Text variant="mono" color="accentText">+{ch.reward_xp} XP</Text>
        </View>
      </View>
      <ProgressBar value={ch.my_step} max={ch.steps.length} tone="gold" valueText={`${ch.my_step} / ${ch.steps.length} steps`} label="Your progress" />
      <View style={{ gap: 10 }}>
        {ch.steps.map((s, i) => {
          const complete = i < ch.my_step;
          const current = i === ch.my_step;
          return (
            <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: complete ? c.accent : 'transparent',
                  borderWidth: complete ? 0 : 1.5,
                  borderColor: current ? c.accentText : c.tint20,
                }}
              >
                {complete ? <Check size={14} color={c.onAccent} strokeWidth={3} /> : <Text variant="mono" color={current ? 'accentText' : 'textFaint'}>{i + 1}</Text>}
              </View>
              <Text variant="callout" color={complete ? 'textSubtle' : 'text'} style={{ flex: 1, textDecorationLine: complete ? 'line-through' : 'none' }}>
                {s}
              </Text>
            </View>
          );
        })}
      </View>
      <Button
        title={done ? 'Challenge completed' : `Mark “${ch.steps[ch.my_step]}” as done`}
        icon={done ? Trophy : Check}
        variant={done ? 'secondary' : 'accent'}
        block
        disabled={done}
        loading={advance.isPending}
        onPress={() => advance.mutate(ch.id)}
      />
    </Card>
  );
}

export default function Challenges() {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { profile } = useAuth();
  const challenges = useChallenges();
  const board = useLeaderboard();
  const active = (challenges.data ?? []).find((ch) => ch.active);
  const past = (challenges.data ?? []).filter((ch) => !ch.active);
  const xpInLevel = (profile?.xp ?? 0) % 500;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header back title="Challenges" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 26, paddingBottom: insets.bottom + 40, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}>
        {challenges.isLoading ? (
          <SkeletonList variant="card" count={1} />
        ) : active ? (
          <ActiveChallenge ch={active} />
        ) : (
          <EmptyState icon={Trophy} title="No challenge this week" message="A new one drops every Monday." />
        )}

        {profile && (
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Trophy size={18} color={c.accentText} />
              <Text variant="headline" style={{ flex: 1 }}>Level {profile.level}</Text>
              <Text variant="mono" color="textSubtle">{compact(profile.xp)} XP</Text>
            </View>
            <ProgressBar value={xpInLevel} max={500} tone="gold" valueText={`${500 - xpInLevel} XP to level ${profile.level + 1}`} />
          </Card>
        )}

        <Section title="Leaderboard">
          {board.isLoading ? (
            <SkeletonList count={5} />
          ) : (
            <View style={{ gap: 4 }}>
              {(board.data ?? []).map((l) => (
                <View
                  key={l.id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 10, borderRadius: radius.md, backgroundColor: l.is_me ? c.tint08 : 'transparent', borderWidth: l.is_me ? 1 : 0, borderColor: c.hairlineStrong }}
                >
                  <View style={{ width: 28, alignItems: 'center' }}>
                    {l.rank <= 3 ? <Medal size={20} color={l.rank === 1 ? c.accentText : l.rank === 2 ? c.textMuted : c.warning} /> : <Text variant="mono" color="textSubtle">{l.rank}</Text>}
                  </View>
                  <Avatar uri={l.avatar_url} name={l.full_name} size={38} ring={l.verified} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="headline" numberOfLines={1}>{l.is_me ? 'You' : l.full_name}</Text>
                    <Text variant="caption" color="textSubtle">Level {l.level}</Text>
                  </View>
                  <Text variant="mono" color={l.rank <= 3 ? 'accentText' : 'text'}>{compact(l.xp)} XP</Text>
                </View>
              ))}
            </View>
          )}
        </Section>

        <Section title="How to earn XP">
          <Card padded={false}>
            {EARN.map(([label, xp], i) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: i === EARN.length - 1 ? 0 : 1, borderBottomColor: c.hairline }}>
                <Text variant="callout" style={{ flex: 1 }}>{label}</Text>
                <Text variant="mono" color="accentText">+{xp}</Text>
              </View>
            ))}
          </Card>
        </Section>

        {past.length > 0 && (
          <Section title="Past challenges">
            <View style={{ gap: 10 }}>
              {past.map((ch) => {
                const completed = ch.my_step >= ch.steps.length;
                return (
                  <Card key={ch.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: completed ? c.accentSoft : c.tint08, alignItems: 'center', justifyContent: 'center' }}>
                      <Trophy size={18} color={completed ? c.accentText : c.textSubtle} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="headline">{ch.title}</Text>
                      <Text variant="caption" color="textSubtle">{compact(ch.participants)} took part</Text>
                    </View>
                    {completed ? <Badge tone="success" icon={Check}>+{ch.reward_xp} XP</Badge> : <Badge>{ch.my_step}/{ch.steps.length}</Badge>}
                  </Card>
                );
              })}
            </View>
          </Section>
        )}
      </ScrollView>
    </View>
  );
}
