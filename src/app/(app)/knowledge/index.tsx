import { describeError } from '@/lib/errors';
import { useTranslation } from '@/i18n';
import { useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGuides, useSaveGuide } from '@/data/queries';
import type { Guide } from '@/data/types';
import { hashHue } from '@/lib/color';
import { CONTENT_MAX } from '@/lib/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Avatar, Badge, Card, Chip, EmptyState, GradientCover, Header, IconButton, SkeletonList, Text } from '@/ui';
import { BookOpen, Bookmark, FileText, ListFilter, ScrollText, Sparkles, type IconType } from '@/ui/icons';

const KIND_ICON: Record<string, IconType> = { Playbook: ScrollText, Checklist: ListFilter, Template: FileText, Guide: BookOpen };

function SaveToggle({ guide }: { guide: Guide }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const save = useSaveGuide();
  return (
    <Pressable
      onPress={() => save.mutate({ id: guide.id, saved: !guide.saved })}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={guide.saved ? t('Remove from saved') : t('Save guide')}
      accessibilityState={{ selected: guide.saved }}
    >
      <Bookmark size={19} color={guide.saved ? c.text : c.textSubtle} fill={guide.saved ? c.text : 'transparent'} />
    </Pressable>
  );
}

function GuideRow({ g }: { g: Guide }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { c } = useTheme();
  const Icon = KIND_ICON[g.kind] ?? BookOpen;
  return (
    <Card onPress={() => router.push(`/knowledge/${g.id}` as Href)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }} accessibilityLabel={g.title}>
      <View style={{ width: 46, height: 46, borderRadius: radius.md, backgroundColor: c.tint08, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={c.text} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text variant="headline" numberOfLines={2}>{g.title}</Text>
        <Text variant="caption" color="textSubtle" numberOfLines={1}>{g.summary}</Text>
        <Text variant="mono" color="textFaint">{t(g.kind)} · {g.category} · {g.read_minutes} min</Text>
      </View>
      <SaveToggle guide={g} />
    </Card>
  );
}

export default function Knowledge() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const guides = useGuides();
  const [cat, setCat] = useState('All');

  const all = guides.data ?? [];
  const cats = ['All', ...Array.from(new Set(all.map((g) => g.category)))];
  const featured = all.find((g) => g.featured);
  const list = all.filter((g) => g.id !== featured?.id || cat !== 'All').filter((g) => cat === 'All' || g.category === cat);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header back title={t("Knowledge Hub")} right={<IconButton icon={Bookmark} onPress={() => router.push('/saved')} accessibilityLabel={t("Saved guides")} />} />
      <FlatList
        data={list}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => <GuideRow g={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          <View style={{ gap: 16, paddingBottom: 14 }}>
            <Text color="textMuted">{t("Playbooks, checklists and templates written by founders and operators in the network.")}</Text>
            {featured && cat === 'All' && (
              <Card padded={false} onPress={() => router.push(`/knowledge/${featured.id}` as Href)} accessibilityLabel={featured.title}>
                <GradientCover hue={hashHue(featured.category)} height={120}>
                  <View style={{ position: 'absolute', left: 16, top: 14 }}>
                    <Badge tone="accent" icon={Sparkles}>{t("Editor’s pick")}</Badge>
                  </View>
                </GradientCover>
                <View style={{ padding: 16, gap: 8 }}>
                  <Text variant="title2">{featured.title}</Text>
                  <Text variant="callout" color="textMuted">{featured.summary}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    {featured.author && <Avatar uri={featured.author.avatar_url} name={featured.author.full_name} size={24} />}
                    <Text variant="caption" color="textSubtle" style={{ flex: 1 }}>
                      {featured.author ? `${featured.author.full_name} · ` : ''}
                      {t('{{minutes}} min read', { minutes: featured.read_minutes })}
                    </Text>
                    <SaveToggle guide={featured} />
                  </View>
                </View>
              </Card>
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {cats.map((x) => <Chip key={x} label={x === 'All' ? t('All') : x} selected={cat === x} onPress={() => setCat(x)} />)}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={guides.isLoading ? <SkeletonList count={5} /> : guides.isError ? <EmptyState icon={BookOpen} title={t('Guides could not be loaded')} message={describeError(guides.error)} actionLabel={t('Try again')} onAction={() => { void guides.refetch(); }} /> : <EmptyState icon={BookOpen} title={t('No guides in this category yet')} />}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}
      />
    </View>
  );
}
