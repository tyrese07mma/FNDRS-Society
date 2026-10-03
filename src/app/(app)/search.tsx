import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSearch } from '@/data/queries';
import { CommunityRow } from '@/features/communities/CommunityRow';
import { EventCard } from '@/features/events/EventCard';
import { PersonRow } from '@/features/people/PersonRow';
import { StartupCard } from '@/features/startups/StartupCard';
import { CONTENT_MAX } from '@/lib/layout';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius } from '@/theme/tokens';
import { Chip, EmptyState, IconButton, Section, SegmentedControl, SkeletonList, Text } from '@/ui';
import { ChevronLeft, History, Search as SearchIcon, TrendingUp, X } from '@/ui/icons';

type Tab = 'all' | 'people' | 'startups' | 'spaces' | 'events';
const TRENDING = ['AI / ML', 'Fundraising', 'Co-founder', 'Climate', 'Berlin', 'Hiring', 'SaaS', 'Pitch Night'];

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(params.q ?? '');
  const [debounced, setDebounced] = useState(query);
  const [tab, setTab] = useState<Tab>('all');
  const recent = useSettings((s) => s.recentSearches);
  const pushRecent = useSettings((s) => s.pushRecentSearch);
  const clearRecent = useSettings((s) => s.clearRecentSearches);
  const results = useSearch(debounced);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const active = debounced.trim().length >= 2;
  const r = results.data;
  const counts = {
    people: r?.people.length ?? 0,
    startups: r?.startups.length ?? 0,
    spaces: r?.communities.length ?? 0,
    events: r?.events.length ?? 0,
  };
  const total = counts.people + counts.startups + counts.spaces + counts.events;
  const remember = () => pushRecent(query);
  const show = (t: Exclude<Tab, 'all'>) => tab === 'all' || tab === t;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 12, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <IconButton icon={ChevronLeft} variant="plain" size={40} iconSize={24} onPress={() => router.back()} accessibilityLabel="Back" />
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: c.input, borderWidth: 1, borderColor: c.border }}>
          <SearchIcon size={18} color={c.textSubtle} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={remember}
            autoFocus
            autoCapitalize="none"
            returnKeyType="search"
            placeholder="Founders, startups, spaces, events…"
            placeholderTextColor={c.textFaint}
            accessibilityLabel="Search"
            style={[{ flex: 1, color: c.text, fontFamily: font.sans, fontSize: 15.5 }, Platform.OS === 'web' ? ({ outlineWidth: 0 } as object) : null]}
          />
          {!!query && <IconButton icon={X} variant="plain" size={28} iconSize={16} onPress={() => setQuery('')} accessibilityLabel="Clear search" />}
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 24, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}>
        {!active ? (
          <>
            {recent.length > 0 && (
              <Section title="Recent" action="Clear" onAction={clearRecent}>
                <View style={{ gap: 2 }}>
                  {recent.map((q) => (
                    <Chip key={q} label={q} icon={History} onPress={() => setQuery(q)} />
                  ))}
                </View>
              </Section>
            )}
            <Section title="Trending topics">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {TRENDING.map((t) => (
                  <Chip key={t} label={t} icon={TrendingUp} onPress={() => setQuery(t)} />
                ))}
              </View>
            </Section>
          </>
        ) : results.isLoading && !r ? (
          <SkeletonList count={6} />
        ) : total === 0 ? (
          <EmptyState icon={SearchIcon} title={`No results for “${debounced}”`} message="Try a name, a skill like “Sales”, a city or an industry." />
        ) : (
          <>
            <SegmentedControl<Tab>
              size="sm"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'all', label: 'All' },
                { value: 'people', label: `People ${counts.people || ''}`.trim() },
                { value: 'startups', label: `Startups ${counts.startups || ''}`.trim() },
                { value: 'spaces', label: `Spaces ${counts.spaces || ''}`.trim() },
                { value: 'events', label: `Events ${counts.events || ''}`.trim() },
              ]}
            />
            {show('people') && counts.people > 0 && (
              <Section title="People">
                <View>
                  {r!.people.slice(0, tab === 'all' ? 4 : 50).map((p) => (
                    <PersonRow
                      key={p.id}
                      person={p}
                      onPress={() => {
                        remember();
                        router.push(`/user/${p.id}` as Href);
                      }}
                    />
                  ))}
                </View>
              </Section>
            )}
            {show('startups') && counts.startups > 0 && (
              <Section title="Startups">
                <View style={{ gap: 12 }}>
                  {r!.startups.slice(0, tab === 'all' ? 2 : 50).map((s) => <StartupCard key={s.id} startup={s} />)}
                </View>
              </Section>
            )}
            {show('spaces') && counts.spaces > 0 && (
              <Section title="Spaces">
                <View style={{ gap: 10 }}>
                  {r!.communities.slice(0, tab === 'all' ? 3 : 50).map((s) => <CommunityRow key={s.id} community={s} />)}
                </View>
              </Section>
            )}
            {show('events') && counts.events > 0 && (
              <Section title="Events">
                <View style={{ gap: 10 }}>
                  {r!.events.slice(0, tab === 'all' ? 3 : 50).map((e) => <EventCard key={e.id} event={e} />)}
                </View>
              </Section>
            )}
            <Text variant="caption" color="textFaint" align="center">
              {total} results
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}
