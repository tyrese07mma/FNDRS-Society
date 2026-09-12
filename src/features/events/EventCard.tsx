import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import type { EventItem } from '@/data/types';
import { hueInk } from '@/lib/color';
import { compact, eventDate, isPast } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { AvatarStack, Badge, Card, GradientCover, Text } from '@/ui';
import { Clock, MapPin, Video } from '@/ui/icons';

function DateBlock({ iso, hue, size = 54 }: { iso: string; hue: number; size?: number }) {
  const { c, dark } = useTheme();
  const d = eventDate(iso);
  return (
    <View
      style={{
        width: size,
        height: size + 6,
        borderRadius: radius.md,
        backgroundColor: c.tint04,
        borderWidth: 1,
        borderColor: c.hairline,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="label" tint={hueInk(hue, dark)} style={{ fontSize: 10 }}>
        {d.mo}
      </Text>
      <Text style={{ fontSize: 22, lineHeight: 26 }} variant="number">
        {d.day}
      </Text>
    </View>
  );
}

export function EventCard({ event, variant = 'row' }: { event: EventItem; variant?: 'row' | 'mini' }) {
  const router = useRouter();
  const { c } = useTheme();
  const d = eventDate(event.starts_at);
  const past = isPast(event.starts_at);
  const open = () => router.push(`/events/${event.id}` as Href);
  const where = event.is_online ? 'Online' : event.location ?? 'TBA';

  if (variant === 'mini') {
    return (
      <Card padded={false} onPress={open} style={{ width: 250 }} accessibilityLabel={event.title}>
        <GradientCover hue={event.hue} height={78}>
          <View style={{ position: 'absolute', left: 12, bottom: 10, flexDirection: 'row', gap: 6 }}>
            <Badge tone="solid">{`${d.weekday} ${d.day} ${d.mo}`}</Badge>
            {event.going && <Badge tone="success">Going</Badge>}
          </View>
        </GradientCover>
        <View style={{ padding: 14, gap: 6 }}>
          <Text variant="headline" numberOfLines={2} style={{ minHeight: 40 }}>{event.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {event.is_online ? <Video size={13} color={c.textSubtle} /> : <MapPin size={13} color={c.textSubtle} />}
            <Text variant="caption" color="textSubtle" numberOfLines={1} style={{ flex: 1 }}>
              {d.time} · {where}
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card onPress={open} style={{ flexDirection: 'row', gap: 14, alignItems: 'center', opacity: past ? 0.75 : 1 }} accessibilityLabel={event.title}>
      <DateBlock iso={event.starts_at} hue={event.hue} />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <Badge>{event.kind}</Badge>
          {event.going && <Badge tone="success">{past ? 'Attended' : 'Going'}</Badge>}
          {event.featured && !event.going && <Badge tone="accent">Featured</Badge>}
        </View>
        <Text variant="headline" numberOfLines={2}>{event.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Clock size={12} color={c.textSubtle} />
          <Text variant="caption" color="textSubtle" numberOfLines={1} style={{ flex: 1 }}>
            {d.weekday} {d.time} · {where}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
          {event.attendees.length > 0 && <AvatarStack people={event.attendees} size={20} max={3} />}
          <Text variant="caption" color="textSubtle">
            {compact(event.going_count)} going{event.capacity ? ` · ${Math.max(0, event.capacity - event.going_count)} spots left` : ''}
          </Text>
        </View>
      </View>
    </Card>
  );
}
