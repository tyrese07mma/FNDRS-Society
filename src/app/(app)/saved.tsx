import { useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSaved } from '@/data/queries';
import type { Guide, Post } from '@/data/types';
import { PostCard } from '@/features/feed/PostCard';
import { CONTENT_MAX } from '@/lib/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { Card, EmptyState, Header, SegmentedControl, SkeletonList, Text } from '@/ui';
import { BookOpen, Bookmark, ChevronRight } from '@/ui/icons';

type Tab = 'posts' | 'guides';

export default function Saved() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const saved = useSaved();
  const [tab, setTab] = useState<Tab>('posts');
  const posts = saved.data?.posts ?? [];
  const guides = saved.data?.guides ?? [];

  const header = (
    <View style={{ paddingBottom: 14 }}>
      <SegmentedControl<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'posts', label: `Posts${posts.length ? ` · ${posts.length}` : ''}` },
          { value: 'guides', label: `Guides${guides.length ? ` · ${guides.length}` : ''}` },
        ]}
      />
    </View>
  );
  const empty = saved.isLoading ? (
    <SkeletonList variant={tab === 'posts' ? 'post' : 'row'} count={3} />
  ) : (
    <EmptyState
      icon={tab === 'posts' ? Bookmark : BookOpen}
      title={tab === 'posts' ? 'No saved posts' : 'No saved guides'}
      message={tab === 'posts' ? 'Tap the bookmark on any post to keep it for later.' : 'Save playbooks from the Knowledge Hub to read them later.'}
      actionLabel={tab === 'guides' ? 'Open Knowledge Hub' : undefined}
      onAction={() => router.push('/knowledge')}
    />
  );
  const style = { padding: 16, paddingBottom: insets.bottom + 40, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' } as const;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header back title="Saved" />
      {tab === 'posts' ? (
        <FlatList<Post>
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PostCard post={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={style}
        />
      ) : (
        <FlatList<Guide>
          data={guides}
          keyExtractor={(g) => g.id}
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/knowledge/${item.id}` as Href)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <BookOpen size={20} color={c.textMuted} />
              <View style={{ flex: 1 }}>
                <Text variant="headline" numberOfLines={2}>{item.title}</Text>
                <Text variant="mono" color="textFaint">{item.kind} · {item.read_minutes} min</Text>
              </View>
              <ChevronRight size={16} color={c.textFaint} />
            </Card>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={style}
        />
      )}
    </View>
  );
}
