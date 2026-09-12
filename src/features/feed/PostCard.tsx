import { useTranslation } from '@/i18n';
import { useNow } from '@/lib/useNow';
import { useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { useLike, useSavePost, useVote } from '@/data/queries';
import type { Post, PostKind } from '@/data/types';
import { compact, timeAgo } from '@/lib/format';
import { appLink, shareText } from '@/lib/share';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Avatar, Badge, Card, Text, type BadgeTone } from '@/ui';
import { BadgeCheck, Bookmark, Ellipsis, Heart, MessageCircle, Share2 } from '@/ui/icons';
import { PostMenu } from './PostMenu';

const KIND: Partial<Record<PostKind, { tone: BadgeTone; label: string }>> = {
  milestone: { tone: 'accent', label: 'Milestone' },
  looking_for: { tone: 'success', label: 'Looking for' },
  question: { tone: 'info', label: 'Question' },
  poll: { tone: 'neutral', label: 'Poll' },
};

function Action({
  icon,
  label,
  onPress,
  active,
  accessibilityLabel,
}: {
  icon: React.ReactNode;
  label?: string;
  onPress?: () => void;
  active?: boolean;
  accessibilityLabel: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: radius.pill,
        backgroundColor: pressed ? c.tint08 : 'transparent',
      })}
    >
      {icon}
      {label !== undefined && (
        <Text variant="mono" color={active ? 'text' : 'textSubtle'}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function Poll({ post }: { post: Post }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const vote = useVote();
  const poll = post.poll!;
  const total = poll.options.reduce((n, o) => n + o.votes, 0);
  const now = useNow();
  const ended = !!poll.ends_at && Date.parse(poll.ends_at) < now;
  const showResults = !!post.my_vote || ended;
  return (
    <View style={{ gap: 8 }}>
      {poll.options.map((o) => {
        const pct = total ? Math.round((o.votes / total) * 100) : 0;
        const mine = post.my_vote === o.id;
        return (
          <Pressable
            key={o.id}
            disabled={ended}
            onPress={() => vote.mutate({ id: post.id, optionId: o.id })}
            accessibilityRole="button"
            accessibilityLabel={o.label + (showResults ? ', ' + t('{{percent}} percent', {percent:pct}) : '')}
            accessibilityState={{ selected: mine }}
            style={{
              minHeight: 44,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: mine ? c.text : c.hairlineStrong,
              overflow: 'hidden',
              justifyContent: 'center',
              paddingHorizontal: 14,
            }}
          >
            {showResults && (
              <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, backgroundColor: mine ? c.tint20 : c.tint08 }} />
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <Text variant="callout" style={{ flex: 1 }} numberOfLines={2}>
                {o.label}
              </Text>
              {showResults && <Text variant="mono" color={mine ? 'text' : 'textSubtle'}>{pct}%</Text>}
            </View>
          </Pressable>
        );
      })}
      <Text variant="caption" color="textSubtle">
        {t('{{count}} votes · {{status}}', {count:compact(total), status:ended ? t('Final results') : poll.ends_at ? t('Ends {{time}}', {time:timeAgo(poll.ends_at)}) : t('Open')})}
      </Text>
    </View>
  );
}

export function PostCard({ post, onOpen, expanded = false }: { post: Post; onOpen?: () => void; expanded?: boolean }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const router = useRouter();
  const like = useLike();
  const save = useSavePost();
  const [menu, setMenu] = useState(false);
  const [more, setMore] = useState(expanded);
  const heart = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heart.value }] }));

  const long = post.body.length > 320;
  const kind = KIND[post.kind];
  const openAuthor = () => router.push(`/user/${post.author.id}` as Href);
  const open = onOpen ?? (() => router.push(`/post/${post.id}` as Href));

  const toggleLike = () => {
    heart.set(withSequence(withSpring(1.35, { damping: 6, stiffness: 400 }), withSpring(1, { damping: 10 })));
    like.mutate({ id: post.id, liked: !post.liked });
  };

  return (
    <Card padded={false} style={{ padding: space[4], gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        <Pressable onPress={openAuthor} accessibilityRole="link" accessibilityLabel={t("Open {{name}}'s profile", {name:post.author.full_name})}>
          <Avatar uri={post.author.avatar_url} name={post.author.full_name} size={42} ring={post.author.verified} />
        </Pressable>
        <Pressable onPress={openAuthor} style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text variant="headline" numberOfLines={1} style={{ flexShrink: 1 }}>
              {post.author.full_name}
            </Text>
            {post.author.verified && <BadgeCheck size={15} color={c.accentText} />}
          </View>
          <Text variant="caption" color="textSubtle" numberOfLines={1}>
            {post.author.headline ? `${post.author.headline} · ` : ''}
            {timeAgo(post.created_at)}
          </Text>
        </Pressable>
        <Pressable onPress={() => setMenu(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("Post options")}>
          <Ellipsis size={20} color={c.textSubtle} />
        </Pressable>
      </View>

      {kind && <Badge tone={kind.tone}>{t(kind.label)}</Badge>}

      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={t("Open post")}>
        <Text variant="body" color="textMuted" numberOfLines={more || !long ? undefined : 7} style={{ color: c.text, opacity: 0.92 }}>
          {post.body}
        </Text>
        {long && !more && (
          <Text variant="footnote" color="textSubtle" onPress={() => setMore(true)} style={{ marginTop: 4 }}>
            {t("Show more")}</Text>
        )}
      </Pressable>

      {post.poll && <Poll post={post} />}

      {post.tags.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {post.tags.map((t) => (
            <Pressable key={t} onPress={() => router.push({ pathname: '/search', params: { q: t } })} hitSlop={4} accessibilityRole="link">
              <Text variant="footnote" color="accentText">#{t.replace(/\s+/g, '')}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ height: 1, backgroundColor: c.hairline, marginHorizontal: -space[4] }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: -8, marginBottom: -6 }}>
        <Action
          accessibilityLabel={post.liked ? t("Unlike") : t("Like")}
          active={post.liked}
          onPress={toggleLike}
          label={compact(post.like_count)}
          icon={
            <Animated.View style={heartStyle}>
              <Heart size={19} color={post.liked ? c.danger : c.textSubtle} fill={post.liked ? c.danger : 'transparent'} />
            </Animated.View>
          }
        />
        <Action
          accessibilityLabel={t("Comments")}
          onPress={open}
          label={compact(post.comment_count)}
          icon={<MessageCircle size={19} color={c.textSubtle} />}
        />
        <Action
          accessibilityLabel={t("Share")}
          onPress={() => shareText(t('{{name}} on FNDRS: “{{text}}”', {name:post.author.full_name,text:post.body.slice(0,180)+(post.body.length>180?'…':'')}), appLink(`/post/${post.id}`))}
          icon={<Share2 size={18} color={c.textSubtle} />}
        />
        <View style={{ flex: 1 }} />
        <Action
          accessibilityLabel={post.saved ? t("Remove from saved") : t("Save")}
          active={post.saved}
          onPress={() => save.mutate({ id: post.id, saved: !post.saved })}
          icon={<Bookmark size={19} color={post.saved ? c.text : c.textSubtle} fill={post.saved ? c.text : 'transparent'} />}
        />
      </View>

      <PostMenu post={post} open={menu} onClose={() => setMenu(false)} />
    </Card>
  );
}
