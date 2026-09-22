import { useTranslation } from '@/i18n';
import { describeError } from '@/lib/errors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEvent, useRsvp } from '@/data/queries';
import type { EventItem } from '@/data/types';
import { PersonRow } from '@/features/people/PersonRow';
import { compact, fullDate, isPast } from '@/lib/format';
import { CONTENT_MAX } from '@/lib/layout';
import { appLink, shareText } from '@/lib/share';
import { confirm } from '@/state/dialog';
import { useTheme } from '@/theme/ThemeProvider';
import { AvatarStack, Badge, Button, EmptyState, GradientCover, Header, IconButton, ProgressBar, SkeletonList, Text } from '@/ui';
import { CalendarCheck, CalendarDays, CalendarPlus, Check, ChevronLeft, CircleAlert, Clock, MapPin, Share2, Ticket, Users, Video, type IconType } from '@/ui/icons';

function calendarUrl(e: EventItem) {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const end = e.ends_at ?? new Date(Date.parse(e.starts_at) + 2 * 3_600_000).toISOString();
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${stamp(e.starts_at)}/${stamp(end)}`,
    details: `${e.description}\n\nvia FNDRS Society`,
    location: e.is_online ? 'Online' : e.location ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function Info({ icon: Icon, children }: { icon: IconType; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: c.tint08, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={17} color={c.text} />
      </View>
      <Text variant="callout" style={{ flex: 1 }}>{children}</Text>
    </View>
  );
}

export default function EventDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const event = useEvent(id);
  const rsvp = useRsvp();

  if (!event.data) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header back />
        {event.isLoading ? (
          <View style={{ padding: 16 }}><SkeletonList variant="card" count={2} /></View>
        ) : (
          <EmptyState icon={CircleAlert} title={t("Event not found")} message={describeError(event.error)} />
        )}
      </View>
    );
  }

  const e = event.data;
  const past = isPast(e.starts_at);
  const full = !!e.capacity && e.going_count >= e.capacity && !e.going;
  const hours = e.ends_at ? Math.round(((Date.parse(e.ends_at) - Date.parse(e.starts_at)) / 3_600_000) * 10) / 10 : null;

  const toggle = async () => {
    if (e.going && !(await confirm({ title: t("Cancel your RSVP?"), message: t('Your spot will become available again.'), confirmLabel: t("Cancel RSVP"), destructive: true, cancelLabel: t("Keep my spot") }))) return;
    rsvp.mutate({ id: e.id, going: !e.going });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}>
        <GradientCover hue={e.hue} height={insets.top + 170}>
          <View style={{ position: 'absolute', left: 16, bottom: 16, flexDirection: 'row', gap: 6 }}>
            <Badge tone="solid">{t(e.kind)}</Badge>
            {e.featured && <Badge tone="accent">{t("Featured")}</Badge>}
            {e.going && <Badge tone="success" icon={Check}>{past ? t("Attended") : t("Going")}</Badge>}
          </View>
        </GradientCover>
        <View style={{ padding: 16, gap: 22, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}>
          <Text variant="largeTitle">{e.title}</Text>

          <View style={{ gap: 12 }}>
            <Info icon={CalendarDays}>{fullDate(e.starts_at)}</Info>
            {hours != null && <Info icon={Clock}>{hours >= 24 ? t('{{days}} days', { days: Math.round(hours / 24) }) : t('{{hours}} hours', { hours })}</Info>}
            <Info icon={e.is_online ? Video : MapPin}>{e.is_online ? t('Online event') : e.location ?? t("Location to be announced")}</Info>
            <Info icon={Users}>
              {t('{{count}} going', { count: compact(e.going_count) })}{e.capacity ? ` · ${t('{{remaining}} of {{capacity}} spots left', { remaining: Math.max(0, e.capacity - e.going_count), capacity: e.capacity })}` : ''}
            </Info>
            {!!e.capacity && <ProgressBar value={e.going_count} max={e.capacity} tone={e.going_count / e.capacity > 0.85 ? 'gold' : 'default'} height={6} />}
          </View>

          {e.attendees.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <AvatarStack people={e.attendees} size={32} max={6} total={e.going_count} />
              <Text variant="caption" color="textSubtle" style={{ flex: 1 }} numberOfLines={2}>
                {t(e.going_count > 2 ? '{{names}} and {{count}} others are going' : '{{names}} are going', { names: e.attendees.slice(0, 2).map((a) => a.full_name.split(' ')[0]).join(', '), count: compact(e.going_count - 2) })}
              </Text>
            </View>
          )}

          {e.host && (
            <View style={{ gap: 4 }}>
              <Text variant="label" color="textSubtle">{t("HOSTED BY")}</Text>
              <PersonRow person={e.host} />
            </View>
          )}

          {!!e.description && (
            <View style={{ gap: 8 }}>
              <Text variant="label" color="textSubtle">{t("ABOUT")}</Text>
              <Text color="textMuted" style={{ lineHeight: 24 }}>{e.description}</Text>
            </View>
          )}

          {!past && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title={t("Add to calendar")} icon={CalendarPlus} variant="secondary" style={{ flex: 1 }} onPress={() => WebBrowser.openBrowserAsync(calendarUrl(e))} />
              <Button title={t("Share")} icon={Share2} variant="secondary" onPress={() => shareText(`${e.title} — ${fullDate(e.starts_at)}`, appLink(`/events/${e.id}`))} />
            </View>
          )}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.hairline }}>
        <View style={{ width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}>
          {past ? (
            <Button title={t("This event has ended")} variant="secondary" size="lg" block disabled />
          ) : e.going ? (
            <Button title={t("You’re going · Cancel RSVP")} icon={CalendarCheck} variant="secondary" size="lg" block onPress={toggle} />
          ) : full ? (
            <Button title={t("Event is full")} variant="secondary" size="lg" block disabled />
          ) : (
            <Button title={t("RSVP — reserve my spot")} icon={Ticket} size="lg" block loading={rsvp.isPending} onPress={toggle} />
          )}
        </View>
      </View>

      <View style={{ position: 'absolute', top: insets.top + 6, left: 16 }}>
        <IconButton icon={ChevronLeft} variant="glass" iconSize={22} onPress={() => (router.canGoBack() ? router.back() : router.replace('/events'))} accessibilityLabel={t("Back")} />
      </View>
    </View>
  );
}
