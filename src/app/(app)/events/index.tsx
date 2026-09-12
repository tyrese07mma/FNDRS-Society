import { useNow } from '@/lib/useNow';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEvents } from '@/data/queries';
import { EventCard } from '@/features/events/EventCard';
import { CONTENT_MAX } from '@/lib/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, Header, SegmentedControl, SkeletonList, Text } from '@/ui';
import { CalendarDays, CalendarPlus } from '@/ui/icons';

type Tab = 'upcoming' | 'going' | 'past';

export default function Events() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const events = useEvents();
  const [tab, setTab] = useState<Tab>('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const now = useNow();
  const all = events.data ?? [];
  const upcoming = all.filter((e) => Date.parse(e.starts_at) >= now);
  const data =
    tab === 'upcoming'
      ? upcoming
      : tab === 'going'
        ? upcoming.filter((e) => e.going)
        : all.filter((e) => Date.parse(e.starts_at) < now).sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const featured = upcoming.filter((e) => e.featured);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header back title="Events" right={<Button title="Host" icon={CalendarPlus} size="sm" onPress={() => router.push('/events/new')} />} />
      <FlatList
        data={data}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <EventCard event={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          <View style={{ gap: 16, paddingBottom: 14 }}>
            <SegmentedControl<Tab>
              value={tab}
              onChange={setTab}
              options={[
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'going', label: 'Going', badge: upcoming.filter((e) => e.going).length },
                { value: 'past', label: 'Past' },
              ]}
            />
            {tab === 'upcoming' && featured.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text variant="label" color="textSubtle">FEATURED</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
                  {featured.map((e) => <EventCard key={e.id} event={e} variant="mini" />)}
                </ScrollView>
                <Text variant="label" color="textSubtle" style={{ marginTop: 8 }}>ALL UPCOMING</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          events.isLoading ? (
            <SkeletonList variant="card" count={3} />
          ) : (
            <EmptyState
              icon={CalendarDays}
              title={tab === 'going' ? 'No RSVPs yet' : tab === 'past' ? 'No past events' : 'No upcoming events'}
              message={tab === 'going' ? 'RSVP to a pitch night or meetup and it shows up here.' : 'Host one — founders love small, focused rooms.'}
              actionLabel={tab === 'going' ? 'Browse upcoming' : 'Host an event'}
              onAction={() => (tab === 'going' ? setTab('upcoming') : router.push('/events/new'))}
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await events.refetch();
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
