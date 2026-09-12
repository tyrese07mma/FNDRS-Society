import { describeError } from '@/lib/errors';
import { useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCreateEvent } from '@/data/queries';
import { KAV_BEHAVIOR } from '@/lib/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Button, Chip, Header, Input, PressableScale, Switch, Text } from '@/ui';
import { CalendarPlus, MapPin } from '@/ui/icons';

const KINDS = ['Meetup', 'Pitch Night', 'Workshop', 'Masterclass', 'Office Hours', 'Hackathon', 'Demo Day'];
const TIMES = Array.from({ length: 28 }, (_, i) => {
  const minutes = 8 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

function days() {
  return Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i + 1);
    return d;
  });
}

export default function NewEvent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const create = useCreateEvent();
  const [dates] = useState(days);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('Meetup');
  const [day, setDay] = useState(6);
  const [time, setTime] = useState('18:30');
  const [online, setOnline] = useState(false);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const publish = async () => {
    if (title.trim().length < 4) return setError('Give your event a title.');
    if (!online && location.trim().length < 2) return setError('Where is it happening?');
    setError(null);
    const [h, m] = time.split(':').map(Number);
    const start = new Date(dates[day]);
    start.setHours(h, m, 0, 0);
    try {
      const e = await create.mutateAsync({
        title,
        kind,
        description,
        starts_at: start.toISOString(),
        location: online ? null : location.trim(),
        is_online: online,
      });
      router.replace(`/events/${e.id}` as Href);
    } catch (err) {
      setError(describeError(err));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={KAV_BEHAVIOR}>
      <Header modal title="Host an event" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 22, paddingBottom: insets.bottom + 40, width: '100%', maxWidth: 680, alignSelf: 'center' }}>
        <Input label="Title" value={title} onChangeText={setTitle} placeholder="AI Founders Breakfast" maxLength={120} />

        <View style={{ gap: 10 }}>
          <Text variant="label" color="textSubtle">FORMAT</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {KINDS.map((k) => <Chip key={k} label={k} selected={kind === k} onPress={() => setKind(k)} />)}
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <Text variant="label" color="textSubtle">DATE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            {dates.map((d, i) => {
              const on = i === day;
              return (
                <PressableScale
                  key={d.toISOString()}
                  haptics="selection"
                  scaleTo={0.94}
                  onPress={() => setDay(i)}
                  accessibilityLabel={d.toDateString()}
                  accessibilityState={{ selected: on }}
                  style={{ width: 58, paddingVertical: 10, alignItems: 'center', gap: 2, borderRadius: radius.md, borderWidth: 1, borderColor: on ? c.action : c.hairline, backgroundColor: on ? c.action : c.card }}
                >
                  <Text variant="label" tint={on ? c.actionText : c.textSubtle} style={{ fontSize: 10 }}>
                    {d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()}
                  </Text>
                  <Text variant="number" tint={on ? c.actionText : c.text} style={{ fontSize: 19 }}>{d.getDate()}</Text>
                  <Text variant="caption" tint={on ? c.actionText : c.textSubtle} style={{ fontSize: 10.5 }}>
                    {d.toLocaleDateString('en-GB', { month: 'short' })}
                  </Text>
                </PressableScale>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ gap: 10 }}>
          <Text variant="label" color="textSubtle">START TIME</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            {TIMES.map((t) => <Chip key={t} label={t} selected={time === t} onPress={() => setTime(t)} />)}
          </ScrollView>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: c.hairline }}>
          <View style={{ flex: 1 }}>
            <Text variant="headline">Online event</Text>
            <Text variant="caption" color="textSubtle">Attendees get the link after they RSVP.</Text>
          </View>
          <Switch value={online} onValueChange={setOnline} accessibilityLabel="Online event" />
        </View>
        {!online && <Input label="Location" icon={MapPin} value={location} onChangeText={setLocation} placeholder="Factory Görlitzer Park, Berlin" />}

        <Input label="Description" value={description} onChangeText={setDescription} multiline maxLength={1200} counter placeholder="Who is it for, what will happen, what should people bring?" />

        {!!error && <Text variant="footnote" color="danger">{error}</Text>}
        <Button title="Publish event" icon={CalendarPlus} size="lg" block loading={create.isPending} onPress={publish} />
        <Text variant="caption" color="textSubtle" align="center">+20 XP · you are added as the first attendee</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
