import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOpenConversation, useStartup } from '@/data/queries';
import { PersonRow } from '@/features/people/PersonRow';
import { UpvoteButton } from '@/features/startups/StartupCard';
import { compact, ensureUrl, prettyUrl, STAGE_LABEL } from '@/lib/format';
import { CONTENT_MAX } from '@/lib/layout';
import { appLink, shareText } from '@/lib/share';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Button, Card, Chip, EmptyState, GradientCover, Header, IconButton, Monogram, SkeletonList, Text } from '@/ui';
import { ChevronLeft, CircleAlert, Flame, Globe, Handshake, MessageCircle, Share2, Sparkles } from '@/ui/icons';

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text variant="number" style={{ fontSize: 18 }}>{value}</Text>
      <Text variant="caption" color="textSubtle">{label}</Text>
    </View>
  );
}

export default function StartupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { userId } = useAuth();
  const startup = useStartup(id);
  const open = useOpenConversation();

  if (!startup.data) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header back />
        {startup.isLoading ? (
          <View style={{ padding: 16 }}><SkeletonList variant="card" count={2} /></View>
        ) : (
          <EmptyState icon={CircleAlert} title="Startup not found" message={startup.error?.message} />
        )}
      </View>
    );
  }

  const s = startup.data;
  const mine = s.owner.id === userId;
  const message = async () => {
    try {
      const cid = await open.mutateAsync(s.owner.id);
      router.push(`/chat/${cid}` as Href);
    } catch {
      // toast via mutation cache
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <GradientCover hue={s.hue} height={insets.top + 150} />
        <View style={{ paddingHorizontal: 16, gap: 18, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -40 }}>
            <View style={{ borderRadius: 24, borderWidth: 4, borderColor: c.bg }}>
              <Monogram label={s.name} hue={s.hue} size={76} />
            </View>
            <UpvoteButton startup={s} />
          </View>
          <View style={{ gap: 6 }}>
            <Text variant="largeTitle">{s.name}</Text>
            <Text variant="body" color="textMuted" style={{ fontSize: 16.5, lineHeight: 24 }}>{s.tagline}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {s.trending && <Badge tone="accent" icon={Flame}>Trending</Badge>}
              <Badge>{s.industry}</Badge>
              <Badge>{STAGE_LABEL[s.stage]}</Badge>
              {!!s.raised && <Badge tone="success">Raised {s.raised}</Badge>}
            </View>
          </View>

          <View style={{ flexDirection: 'row', paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.hairline }}>
            <Stat value={compact(s.upvotes)} label="Upvotes" />
            <Stat value={String(s.team_size)} label="Team" />
            <Stat value={s.raised ?? '—'} label="Raised" />
            <Stat value={new Date(s.created_at).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })} label="Listed" />
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {!!s.website && (
              <Button title={prettyUrl(s.website)} icon={Globe} variant="secondary" style={{ flex: 1 }} onPress={() => WebBrowser.openBrowserAsync(ensureUrl(s.website!))} />
            )}
            <Button title="Share" icon={Share2} variant="secondary" style={{ flex: s.website ? undefined : 1 }} onPress={() => shareText(`${s.name} — ${s.tagline}`, appLink(`/startups/${s.id}`))} />
          </View>

          {!!s.description && (
            <View style={{ gap: 8 }}>
              <Text variant="label" color="textSubtle">ABOUT</Text>
              <Text color="textMuted" style={{ lineHeight: 24 }}>{s.description}</Text>
            </View>
          )}

          {s.looking_for.length > 0 && (
            <Card variant="accent" style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Handshake size={18} color={c.accentText} />
                <Text variant="headline">{mine ? 'You are looking for' : `${s.name} is looking for`}</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {s.looking_for.map((l) => <Chip key={l} label={l} size="sm" static />)}
              </View>
              {!mine && <Button title="Offer to help" icon={MessageCircle} size="sm" style={{ alignSelf: 'flex-start' }} loading={open.isPending} onPress={message} />}
            </Card>
          )}

          <View style={{ gap: 6 }}>
            <Text variant="label" color="textSubtle">FOUNDER</Text>
            <PersonRow
              person={s.owner}
              right={mine ? <Badge tone="accent">You</Badge> : <IconButton icon={MessageCircle} variant="outline" size={38} onPress={message} accessibilityLabel={`Message ${s.owner.full_name}`} />}
            />
          </View>

          {mine && (
            <Card variant="tint" style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Sparkles size={18} color={c.accentText} />
              <Text variant="footnote" color="textMuted" style={{ flex: 1 }}>
                Your showcase is visible to investors and operators across FNDRS. Post updates in the feed to keep it trending.
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>
      <View style={{ position: 'absolute', top: insets.top + 6, left: 16 }}>
        <IconButton icon={ChevronLeft} variant="glass" iconSize={22} onPress={() => (router.canGoBack() ? router.back() : router.replace('/startups'))} accessibilityLabel="Back" />
      </View>
    </View>
  );
}
