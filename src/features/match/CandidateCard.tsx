import React from 'react';
import { ScrollView, View } from 'react-native';

import type { MatchCandidate } from '@/data/types';
import { hashHue } from '@/lib/color';
import { ROLE_LABEL, STAGE_LABEL } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Avatar, Badge, Chip, GradientCover, ScoreRing, Text } from '@/ui';
import { BadgeCheck, Check, Handshake, MapPin } from '@/ui/icons';

/** The face of a Smart Match candidate — rendered inside each swipe card. */
export function CandidateCard({ c: person }: { c: MatchCandidate }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        borderRadius: radius.xl,
        overflow: 'hidden',
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.hairlineStrong,
      }}
    >
      <GradientCover hue={hashHue(person.full_name)} height={150}>
        <View style={{ position: 'absolute', top: 14, right: 14 }}>
          <View style={{ borderRadius: 40, backgroundColor: c.glass, padding: 4 }}>
            <ScoreRing value={person.score} size={62} thickness={5} accent={person.score >= 80} label="FIT" />
          </View>
        </View>
      </GradientCover>
      <View style={{ paddingHorizontal: 18, marginTop: -54 }}>
        <Avatar uri={person.avatar_url} name={person.full_name} size={100} ring={person.verified} />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, paddingTop: 12, gap: 14 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text variant="title1" numberOfLines={1} style={{ flexShrink: 1 }}>{person.full_name}</Text>
            {person.verified && <BadgeCheck size={20} color={c.accentText} />}
          </View>
          <Text variant="callout" color="textMuted" numberOfLines={2}>{person.headline}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            {!!person.location && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MapPin size={13} color={c.textSubtle} />
                <Text variant="caption" color="textSubtle">{person.location}</Text>
              </View>
            )}
            <Badge>{ROLE_LABEL[person.role]}</Badge>
            <Badge>{STAGE_LABEL[person.stage]}</Badge>
            {person.open_to.includes('cofounder') && <Badge tone="success" icon={Handshake}>Co-founding</Badge>}
          </View>
        </View>

        <View style={{ gap: 8, padding: 14, borderRadius: radius.lg, backgroundColor: c.accentSoft, borderWidth: 1, borderColor: c.accentBorder }}>
          <Text variant="label" color="accentText">WHY YOU MATCH</Text>
          {person.reasons.map((r) => (
            <View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Check size={15} color={c.accentText} strokeWidth={2.6} />
              <Text variant="callout" style={{ flex: 1 }}>{r}</Text>
            </View>
          ))}
        </View>

        {!!person.bio && (
          <Text variant="callout" color="textMuted" numberOfLines={4}>{person.bio}</Text>
        )}

        {person.skills.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text variant="label" color="textSubtle">BRINGS</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {person.skills.slice(0, 6).map((s) => <Chip key={s} label={s} size="sm" static />)}
            </View>
          </View>
        )}
        {person.looking_for.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text variant="label" color="textSubtle">LOOKING FOR</Text>
            <Text variant="callout" color="textMuted">{person.looking_for.join(' · ')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
