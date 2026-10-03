import { describeError } from '@/lib/errors';
import { useTranslation } from '@/i18n';
import { useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import { Platform, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCommunities, useJoinCommunity } from '@/data/queries';
import { CommunityRow } from '@/features/communities/CommunityRow';
import { compact } from '@/lib/format';
import { CONTENT_MAX } from '@/lib/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius } from '@/theme/tokens';
import { Badge, Button, Card, EmptyState, GradientCover, Header, Section, SkeletonList, Text } from '@/ui';
import { Search, Sparkles, UsersRound } from '@/ui/icons';

export default function Communities() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const list = useCommunities();
  const join = useJoinCommunity();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const q = query.trim().toLowerCase();
  const all = (list.data ?? []).filter((x) => !q || x.name.toLowerCase().includes(q) || x.tag.toLowerCase().includes(q) || x.description.toLowerCase().includes(q));
  const featured = !q ? all.find((x) => x.featured && !x.joined) ?? all.find((x) => x.featured) : undefined;
  const joined = all.filter((x) => x.joined && x.id !== featured?.id);
  const others = all.filter((x) => !x.joined && x.id !== featured?.id);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header back title={t("Spaces")} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: insets.bottom + 40, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}
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
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: c.input, borderWidth: 1, borderColor: c.border }}>
          <Search size={17} color={c.textSubtle} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("Search spaces")}
            placeholderTextColor={c.textFaint}
            accessibilityLabel={t("Search spaces")}
            style={[{ flex: 1, color: c.text, fontFamily: font.sans, fontSize: 15 }, Platform.OS === 'web' ? ({ outlineWidth: 0 } as object) : null]}
          />
        </View>

        {list.isLoading && <SkeletonList variant="card" count={3} />}
        {list.isError && <EmptyState icon={UsersRound} title={t("Spaces could not be loaded")} message={describeError(list.error)} actionLabel={t("Try again")} onAction={() => void list.refetch()} />}

        {featured && (
          <Card padded={false} onPress={() => router.push(`/communities/${featured.id}` as Href)} accessibilityLabel={featured.name}>
            <GradientCover hue={featured.hue} height={110}>
              <View style={{ position: 'absolute', left: 16, top: 14 }}>
                <Badge tone="accent" icon={Sparkles}>{t("Featured space")}</Badge>
              </View>
            </GradientCover>
            <View style={{ padding: 16, gap: 8 }}>
              <Text variant="title2">{featured.name}</Text>
              <Text variant="callout" color="textMuted" numberOfLines={3}>{featured.description}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                <Text variant="mono" color="textSubtle" style={{ flex: 1 }}>
                  {t('{{count}} members', { count: compact(featured.member_count) })} · {t('{{count}} online', { count: compact(featured.online_count) })}
                </Text>
                <Button
                  title={featured.joined ? t("Joined") : t("Join space")}
                  size="sm"
                  loading={join.isPending}
                  variant={featured.joined ? 'outline' : 'primary'}
                  onPress={() => join.mutate({ id: featured.id, joined: !featured.joined })}
                />
              </View>
            </View>
          </Card>
        )}

        {joined.length > 0 && (
          <Section title={t("Your spaces")}>
            <View style={{ gap: 10 }}>{joined.map((x) => <CommunityRow key={x.id} community={x} />)}</View>
          </Section>
        )}

        {others.length > 0 && (
          <Section title={q ? t("Results") : t("Discover spaces")}>
            <View style={{ gap: 10 }}>{others.map((x) => <CommunityRow key={x.id} community={x} />)}</View>
          </Section>
        )}

        {!list.isLoading && !list.isError && all.length === 0 && <EmptyState icon={UsersRound} title={t("No spaces found")} message={t("Try a different search.")} />}
      </ScrollView>
    </View>
  );
}
