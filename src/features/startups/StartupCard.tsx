import { useTranslation } from '@/i18n';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { useUpvote } from '@/data/queries';
import type { Startup } from '@/data/types';
import { compact, prettyUrl, STAGE_LABEL } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Badge, Card, GradientCover, Monogram, Text } from '@/ui';
import { ArrowUp, Flame, Globe, Users } from '@/ui/icons';

export function UpvoteButton({ startup }: { startup: Startup }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const upvote = useUpvote();
  return (
    <Pressable
      onPress={() => upvote.mutate({ id: startup.id, up: !startup.upvoted })}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`${startup.upvoted ? t("Remove upvote") : t("Upvote")} ${startup.name}`}
      accessibilityState={{ selected: startup.upvoted }}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 48,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: startup.upvoted ? c.accentBorder : c.hairlineStrong,
        backgroundColor: startup.upvoted ? c.accentSoft : 'transparent',
      }}
    >
      <ArrowUp size={15} color={startup.upvoted ? c.accentText : c.textMuted} strokeWidth={2.4} />
      <Text variant="mono" tint={startup.upvoted ? c.accentText : c.textMuted}>
        {compact(startup.upvotes)}
      </Text>
    </Pressable>
  );
}

export function StartupCard({ startup, variant = 'full' }: { startup: Startup; variant?: 'full' | 'mini' }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { c } = useTheme();
  const open = () => router.push(`/startups/${startup.id}` as Href);

  if (variant === 'mini') {
    return (
      <Card padded={false} onPress={open} style={{ width: 230 }} accessibilityLabel={startup.name}>
        <GradientCover hue={startup.hue} height={64}>
          {startup.trending && (
            <View style={{ position: 'absolute', top: 10, right: 10 }}>
              <Badge tone="accent" icon={Flame}>{t("Trending")}</Badge>
            </View>
          )}
        </GradientCover>
        <View style={{ padding: 14, paddingTop: 0, gap: 6 }}>
          <View style={{ marginTop: -24 }}>
            <Monogram label={startup.name} hue={startup.hue} size={46} />
          </View>
          <Text variant="headline" numberOfLines={1}>{startup.name}</Text>
          <Text variant="caption" color="textSubtle" numberOfLines={2} style={{ minHeight: 32 }}>
            {startup.tagline}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <ArrowUp size={13} color={startup.upvoted ? c.accentText : c.textSubtle} />
            <Text variant="mono" color="textSubtle">{compact(startup.upvotes)}</Text>
            <Text variant="mono" color="textFaint">·</Text>
            <Text variant="mono" color="textSubtle" numberOfLines={1}>{t(startup.industry)}</Text>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card padded={false} onPress={open} accessibilityLabel={startup.name}>
      <GradientCover hue={startup.hue} height={86}>
        {startup.trending && (
          <View style={{ position: 'absolute', top: 12, left: 12 }}>
            <Badge tone="accent" icon={Flame}>{t("Trending")}</Badge>
          </View>
        )}
      </GradientCover>
      <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -26 }}>
          <Monogram label={startup.name} hue={startup.hue} size={54} />
          <UpvoteButton startup={startup} />
        </View>
        <View style={{ gap: 3 }}>
          <Text variant="title3" numberOfLines={1}>{startup.name}</Text>
          <Text variant="callout" color="textMuted" numberOfLines={2}>{startup.tagline}</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Badge>{startup.industry}</Badge>
          <Badge>{t(STAGE_LABEL[startup.stage])}</Badge>
          {!!startup.raised && <Badge tone="success">{t('Raised {{amount}}', { amount: startup.raised })}</Badge>}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.hairline }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Users size={13} color={c.textSubtle} />
            <Text variant="caption" color="textSubtle">{t('{{count}} on the team', { count: startup.team_size })}</Text>
          </View>
          {!!startup.website && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
              <Globe size={13} color={c.textSubtle} />
              <Text variant="caption" color="textSubtle" numberOfLines={1}>{prettyUrl(startup.website)}</Text>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
}
