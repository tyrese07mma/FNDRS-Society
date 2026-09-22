import { useTranslation } from '@/i18n';
import { describeError } from '@/lib/errors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCommunity, useCommunityPosts, useJoinCommunity } from '@/data/queries';
import { PostCard } from '@/features/feed/PostCard';
import { compact } from '@/lib/format';
import { CONTENT_MAX } from '@/lib/layout';
import { appLink, shareText } from '@/lib/share';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Avatar, AvatarStack, Badge, Button, Card, EmptyState, GradientCover, Header, IconButton, Monogram, PressableScale, SkeletonList, Text } from '@/ui';
import { ChevronLeft, CircleAlert, Lock, Newspaper, Share2 } from '@/ui/icons';

export default function CommunityDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { profile } = useAuth();
  const community = useCommunity(id);
  const posts = useCommunityPosts(id);
  const join = useJoinCommunity();

  if (!community.data) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header back />
        {community.isLoading ? (
          <View style={{ padding: 16 }}><SkeletonList variant="card" count={2} /></View>
        ) : (
          <EmptyState icon={CircleAlert} title={community.isError ? t("Spaces could not be loaded") : t("Space not found")} message={community.isError ? describeError(community.error) : undefined} actionLabel={t("Try again")} onAction={() => void community.refetch()} />
        )}
      </View>
    );
  }
  const cm = community.data;

  const header = (
    <View>
      <GradientCover hue={cm.hue} height={insets.top + 130} />
      <View style={{ paddingHorizontal: 16, gap: 16, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -36 }}>
          <View style={{ borderRadius: 24, borderWidth: 4, borderColor: c.bg }}>
            <Monogram label={cm.tag || cm.name} hue={cm.hue} size={72} />
          </View>
          <Button
            title={cm.joined ? t("Joined") : t("Join space")}
            variant={cm.joined ? 'outline' : 'primary'}
            size="sm"
            loading={join.isPending}
            onPress={() => join.mutate({ id: cm.id, joined: !cm.joined })}
          />
        </View>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text variant="title1" style={{ flexShrink: 1 }}>{cm.name}</Text>
            {cm.is_private && <Badge icon={Lock}>{t("Private")}</Badge>}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text variant="mono" color="textSubtle">{t('{{count}} members', { count: compact(cm.member_count) })}</Text>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.success }} />
            <Text variant="mono" color="textSubtle">{t('{{count}} online', { count: compact(cm.online_count) })}</Text>
          </View>
          <Text color="textMuted" style={{ marginTop: 6, lineHeight: 23 }}>{cm.description}</Text>
        </View>

        {cm.members.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <AvatarStack people={cm.members} size={30} max={6} total={cm.member_count} />
            <Text variant="caption" color="textSubtle" style={{ flex: 1 }} numberOfLines={1}>
              {t('{{names}} and others are here', { names: cm.members.slice(0, 2).map((m) => m.full_name.split(' ')[0]).join(', ') })}
            </Text>
          </View>
        )}

        {cm.rules.length > 0 && (
          <Card variant="tint" style={{ gap: 8 }}>
            <Text variant="label" color="textSubtle">{t("SPACE RULES")}</Text>
            {cm.rules.map((r, i) => (
              <View key={r} style={{ flexDirection: 'row', gap: 10 }}>
                <Text variant="mono" color="accentText">{i + 1}.</Text>
                <Text variant="callout" color="textMuted" style={{ flex: 1 }}>{r}</Text>
              </View>
            ))}
          </Card>
        )}

        {cm.joined && (
          <PressableScale
            scaleTo={0.99}
            onPress={() => router.push({ pathname: '/compose', params: { community: cm.id } })}
            accessibilityLabel={t('Post in {{name}}', { name: cm.name })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: c.hairline }}
          >
            <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={36} />
            <Text variant="callout" color="textSubtle" style={{ flex: 1 }}>{t('Post in {{name}}', { name: cm.name })}…</Text>
          </PressableScale>
        )}

        <Text variant="label" color="textSubtle" style={{ marginBottom: 2 }}>{t("POSTS")}</Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        data={posts.data ?? []}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 16, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}>
            <PostCard post={item} />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={{ marginBottom: 12 }}
        ListEmptyComponent={
          posts.isLoading ? (
            <View style={{ paddingHorizontal: 16 }}><SkeletonList variant="post" count={2} /></View>
          ) : posts.isError ? (
            <EmptyState icon={CircleAlert} title={t("Posts could not be loaded")} message={describeError(posts.error)} actionLabel={t("Try again")} onAction={() => void posts.refetch()} />
          ) : (
            <EmptyState
              compact
              icon={Newspaper}
              title={t("No posts in this space yet")}
              message={cm.joined ? t("Kick things off — introduce yourself or ask a question.") : t("Join the space to start the conversation.")}
            />
          )
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      />
      <View style={{ position: 'absolute', top: insets.top + 6, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', pointerEvents: 'box-none' }}>
        <IconButton icon={ChevronLeft} variant="glass" iconSize={22} onPress={() => (router.canGoBack() ? router.back() : router.replace('/communities'))} accessibilityLabel={t("Back")} />
        <IconButton icon={Share2} variant="glass" onPress={() => shareText(t('{{name}} on FNDRS Society', { name: cm.name }), appLink(`/communities/${cm.id}`))} accessibilityLabel={t("Share space")} />
      </View>
    </View>
  );
}
