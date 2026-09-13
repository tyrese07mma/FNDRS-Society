import React, { useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBookMentor, useBookings, useCancelBooking, useMentors } from '@/data/queries';
import type { Mentor } from '@/data/types';
import { money } from '@/lib/format';
import { CONTENT_MAX } from '@/lib/layout';
import { confirm } from '@/state/dialog';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Avatar, Button, Card, Chip, EmptyState, Header, Input, Section, Sheet, SkeletonList, Text } from '@/ui';
import { BadgeCheck, CalendarCheck, GraduationCap, Star } from '@/ui/icons';

function MentorCard({ m, onBook }: { m: Mentor; onBook: () => void }) {
  const { c } = useTheme();
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar uri={m.profile.avatar_url} name={m.profile.full_name} size={54} ring={m.profile.verified} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text variant="headline" numberOfLines={1} style={{ flexShrink: 1 }}>{m.profile.full_name}</Text>
            {m.profile.verified && <BadgeCheck size={14} color={c.accentText} />}
          </View>
          <Text variant="footnote" color="textMuted" numberOfLines={2}>{m.headline}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Star size={12} color={c.accentText} fill={c.accentText} />
            <Text variant="mono" color="text">{m.rating.toFixed(1)}</Text>
            <Text variant="mono" color="textSubtle">· {m.sessions} sessions</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="number" style={{ fontSize: 18 }}>{money(m.rate_cents)}</Text>
          <Text variant="caption" color="textSubtle">per 30 min</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {m.tags.map((t) => <Chip key={t} label={t} size="sm" static />)}
      </View>
      <Button title="Book a session" icon={CalendarCheck} variant="secondary" onPress={onBook} />
    </Card>
  );
}

export default function Mentors() {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const mentors = useMentors();
  const bookings = useBookings();
  const book = useBookMentor();
  const cancel = useCancelBooking();
  const [tag, setTag] = useState('All');
  const [selected, setSelected] = useState<Mentor | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const tags = ['All', ...Array.from(new Set((mentors.data ?? []).flatMap((m) => m.tags)))];
  const data = (mentors.data ?? []).filter((m) => tag === 'All' || m.tags.includes(tag));

  const confirmBooking = async () => {
    if (!selected || !slot) return;
    try {
      await book.mutateAsync({ id: selected.id, slot, note: note.trim() });
      setSelected(null);
    } catch {
      // toast via mutation cache
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header back title="Mentors" />
      <FlatList
        data={data}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <MentorCard
            m={item}
            onBook={() => {
              setSlot(null);
              setNote('');
              setSelected(item);
            }}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={
          <View style={{ gap: 18, paddingBottom: 14 }}>
            <Text color="textMuted">1:1 sessions with operators who have done it before. Book 30 minutes, bring your hardest question.</Text>
            {(bookings.data ?? []).length > 0 && (
              <Section title="Your sessions">
                <View style={{ gap: 10 }}>
                  {(bookings.data ?? []).map((b) => (
                    <Card key={b.id} variant="accent" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Avatar uri={b.mentor.profile.avatar_url} name={b.mentor.profile.full_name} size={42} />
                      <View style={{ flex: 1 }}>
                        <Text variant="headline" numberOfLines={1}>{b.mentor.profile.full_name}</Text>
                        <Text variant="mono" color="accentText">{b.slot}</Text>
                      </View>
                      <Button
                        title="Cancel"
                        size="sm"
                        variant="ghost"
                        onPress={async () => {
                          if (await confirm({ title: 'Cancel this session?', confirmLabel: 'Cancel session', cancelLabel: 'Keep it', destructive: true })) cancel.mutate(b.id);
                        }}
                      />
                    </Card>
                  ))}
                </View>
              </Section>
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {tags.map((t) => <Chip key={t} label={t} selected={tag === t} onPress={() => setTag(t)} />)}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={mentors.isLoading ? <SkeletonList variant="card" count={3} /> : <EmptyState icon={GraduationCap} title="No mentors in this area yet" />}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}
      />

      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Book ${selected.profile.full_name.split(' ')[0]}` : undefined}
        subtitle={selected ? `30-minute video call · ${money(selected.rate_cents)}` : undefined}
        footer={<Button title={slot ? `Confirm · ${slot}` : 'Pick a time'} size="lg" block disabled={!slot} loading={book.isPending} onPress={confirmBooking} />}
      >
        {selected && (
          <View style={{ gap: 18 }}>
            <View style={{ gap: 10 }}>
              <Text variant="label" color="textSubtle">AVAILABLE TIMES</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {selected.slots.map((s) => {
                  const on = slot === s;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => setSlot(s)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={{ width: '48%', flexGrow: 1, paddingVertical: 12, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: on ? c.action : c.hairlineStrong, backgroundColor: on ? c.action : 'transparent' }}
                    >
                      <Text variant="mono" tint={on ? c.actionText : c.text}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Input label="What do you want to cover? (optional)" value={note} onChangeText={setNote} multiline maxLength={400} placeholder="Context helps your mentor prepare." />
            <Text variant="caption" color="textSubtle">You can cancel this booking from My bookings.</Text>
          </View>
        )}
      </Sheet>
    </View>
  );
}
