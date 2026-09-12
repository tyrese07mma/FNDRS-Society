import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAddComment, useComments, usePost } from '@/data/queries';
import type { Comment } from '@/data/types';
import { PostCard } from '@/features/feed/PostCard';
import { timeAgo } from '@/lib/format';
import { CONTENT_MAX, KAV_BEHAVIOR, useKeyboardOpen } from '@/lib/layout';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius } from '@/theme/tokens';
import { Avatar, EmptyState, Header, PressableScale, SkeletonList, Text } from '@/ui';
import { ArrowUp, BadgeCheck, MessageCircle, Newspaper } from '@/ui/icons';

function CommentRow({ comment }: { comment: Comment }) {
  const router = useRouter();
  const { c } = useTheme();
  const pending = comment.id.startsWith('tmp_');
  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 10, opacity: pending ? 0.6 : 1 }}>
      <Pressable onPress={() => router.push(`/user/${comment.author.id}` as Href)} accessibilityRole="link">
        <Avatar uri={comment.author.avatar_url} name={comment.author.full_name} size={34} ring={comment.author.verified} />
      </Pressable>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ padding: 12, borderRadius: radius.lg, borderTopLeftRadius: 6, backgroundColor: c.card, borderWidth: 1, borderColor: c.hairline, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text variant="headline" style={{ fontSize: 14 }}>{comment.author.full_name}</Text>
            {comment.author.verified && <BadgeCheck size={13} color={c.accentText} />}
          </View>
          <Text variant="callout" color="textMuted">{comment.body}</Text>
        </View>
        <Text variant="mono" color="textFaint" style={{ marginLeft: 4 }}>{pending ? 'Sending…' : timeAgo(comment.created_at)}</Text>
      </View>
    </View>
  );
}

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { profile } = useAuth();
  const post = usePost(id);
  const comments = useComments(id);
  const add = useAddComment(id);
  const [text, setText] = useState('');
  const keyboard = useKeyboardOpen();

  const submit = () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    add.mutate(body);
  };

  if (post.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header back title="Post" />
        <EmptyState icon={Newspaper} title="This post is gone" message={post.error?.message} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={KAV_BEHAVIOR}>
      <Header back title="Post" border />
      <FlatList
        data={comments.data ?? []}
        keyExtractor={(cm) => cm.id}
        renderItem={({ item }) => <CommentRow comment={item} />}
        ListHeaderComponent={
          <View style={{ gap: 18, paddingBottom: 6 }}>
            {post.data ? <PostCard post={post.data} expanded onOpen={() => {}} /> : <SkeletonList variant="post" count={1} />}
            <Text variant="label" color="textSubtle">
              COMMENTS{post.data ? ` · ${post.data.comment_count}` : ''}
            </Text>
          </View>
        }
        ListEmptyComponent={
          comments.isLoading ? (
            <SkeletonList count={3} />
          ) : (
            <EmptyState compact icon={MessageCircle} title="No comments yet" message="Start the conversation — thoughtful replies get noticed." />
          )
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 24, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}
        keyboardShouldPersistTaps="handled"
      />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingTop: 10, paddingBottom: (keyboard ? 0 : insets.bottom) + 10, borderTopWidth: 1, borderTopColor: c.hairline, backgroundColor: c.bg }}>
        <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={36} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Add a comment…"
          placeholderTextColor={c.textFaint}
          multiline
          maxLength={1000}
          accessibilityLabel="Write a comment"
          style={[
            { flex: 1, minHeight: 40, maxHeight: 120, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, borderRadius: 20, backgroundColor: c.input, borderWidth: 1, borderColor: c.border, color: c.text, fontFamily: font.sans, fontSize: 15 },
            Platform.OS === 'web' ? ({ outlineWidth: 0 } as object) : null,
          ]}
        />
        <PressableScale
          onPress={submit}
          disabled={!text.trim()}
          haptics="light"
          scaleTo={0.9}
          accessibilityLabel="Send comment"
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: text.trim() ? c.action : c.tint08 }}
        >
          <ArrowUp size={19} color={text.trim() ? c.actionText : c.textFaint} strokeWidth={2.4} />
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}
