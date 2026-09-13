import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStartups } from '@/data/queries';
import type { StartupSort } from '@/data/types';
import { StartupCard } from '@/features/startups/StartupCard';
import { CONTENT_MAX } from '@/lib/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, Header, SegmentedControl, SkeletonList, Text } from '@/ui';
import { Rocket } from '@/ui/icons';

export default function Startups() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const [sort, setSort] = useState<StartupSort>('trending');
  const list = useStartups(sort);
  const [refreshing, setRefreshing] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header back title="Startups" right={<Button title="Launch" icon={Rocket} size="sm" onPress={() => router.push('/startups/new')} />} />
      <FlatList
        data={list.data ?? []}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <StartupCard startup={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={
          <View style={{ gap: 14, paddingBottom: 14 }}>
            <Text color="textMuted">What the network is shipping. Upvote the ones you would use, back or join.</Text>
            <SegmentedControl<StartupSort>
              value={sort}
              onChange={setSort}
              options={[
                { value: 'trending', label: 'Trending' },
                { value: 'new', label: 'New' },
                { value: 'mine', label: 'Mine' },
              ]}
            />
          </View>
        }
        ListEmptyComponent={
          list.isLoading ? (
            <SkeletonList variant="card" count={3} />
          ) : (
            <EmptyState
              icon={Rocket}
              title={sort === 'mine' ? 'You haven’t launched yet' : 'No startups yet'}
              message="Show the community what you are building and who you want to meet."
              actionLabel="Launch your startup"
              onAction={() => router.push('/startups/new')}
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await list.refetch();
              setRefreshing(false);
            }}
            tintColor={c.textSubtle}
          />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}
      />
    </View>
  );
}
