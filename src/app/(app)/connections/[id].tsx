import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, View } from 'react-native';

import { useFollowers, useFollowing, useProfile } from '@/data/queries';
import { PersonRow } from '@/features/people/PersonRow';
import { compact } from '@/lib/format';
import { CONTENT_MAX } from '@/lib/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, Header, SegmentedControl, SkeletonList, Text } from '@/ui';
import { Users } from '@/ui/icons';

type Tab = 'followers' | 'following';

export default function Connections() {
  const params = useLocalSearchParams<{ id: string; tab?: Tab }>();
  const { c } = useTheme();
  const [tab, setTab] = useState<Tab>(params.tab === 'following' ? 'following' : 'followers');
  const profile = useProfile(params.id);
  const followers = useFollowers(params.id);
  const following = useFollowing(params.id);
  const list = tab === 'followers' ? followers : following;
  const total = tab === 'followers' ? profile.data?.followers_count : profile.data?.following_count;
  const rest = total != null && list.data ? total - list.data.length : 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header back title={profile.data?.full_name ?? 'Connections'} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 8, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}>
        <SegmentedControl<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'followers', label: `Followers${profile.data ? ` · ${compact(profile.data.followers_count)}` : ''}` },
            { value: 'following', label: `Following${profile.data ? ` · ${compact(profile.data.following_count)}` : ''}` },
          ]}
        />
      </View>
      <FlatList
        data={list.data ?? []}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PersonRow person={item} />}
        ListEmptyComponent={
          list.isLoading ? <SkeletonList count={8} /> : <EmptyState icon={Users} title={tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'} />
        }
        ListFooterComponent={
          rest > 0 ? (
            <Text variant="caption" color="textSubtle" align="center" style={{ marginTop: 16 }}>
              + {compact(rest)} more who joined before this network went live
            </Text>
          ) : null
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}
      />
    </View>
  );
}
