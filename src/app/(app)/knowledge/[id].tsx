import { useTranslation } from '@/i18n';
import { describeError } from '@/lib/errors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGuide, useSaveGuide } from '@/data/queries';
import { PersonRow } from '@/features/people/PersonRow';
import { appLink, shareText } from '@/lib/share';
import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Button, Card, EmptyState, Header, IconButton, Markdown, SkeletonList, Text } from '@/ui';
import { Bookmark, Bot, CircleAlert, Share2 } from '@/ui/icons';

export default function GuideReader() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const guide = useGuide(id);
  const save = useSaveGuide();
  const [progress, setProgress] = useState(0);
  const g = guide.data;

  const share = () => g && shareText(`${g.title} — FNDRS ${t('Knowledge Hub')}`, appLink(`/knowledge/${g.id}`));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header
        back
        title={g ? t('{{minutes}} min read', { minutes: g.read_minutes }) : ''}
        right={
          g && (
            <>
              <IconButton
                icon={Bookmark}
                fill={g.saved ? c.text : 'transparent'}
                onPress={() => save.mutate({ id: g.id, saved: !g.saved })}
                accessibilityLabel={g.saved ? t('Remove from saved') : t('Save guide')}
              />
              <IconButton icon={Share2} onPress={share} accessibilityLabel={t("Share guide")} />
            </>
          )
        }
      />
      <View style={{ height: 2, backgroundColor: c.tint08 }}>
        <View style={{ height: 2, width: `${Math.round(progress * 100)}%`, backgroundColor: c.accent }} />
      </View>
      {!g ? (
        guide.isLoading ? (
          <View style={{ padding: 16 }}><SkeletonList variant="post" count={2} /></View>
        ) : (
          <EmptyState icon={CircleAlert} title={guide.isError ? t('Guide could not be loaded') : t('Guide not found')} message={guide.isError ? describeError(guide.error) : undefined} actionLabel={guide.isError ? t('Try again') : undefined} onAction={() => { void guide.refetch(); }} />
        )
      ) : (
        <ScrollView
          scrollEventThrottle={16}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            setProgress(Math.min(1, Math.max(0, contentOffset.y / Math.max(1, contentSize.height - layoutMeasurement.height))));
          }}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 48, gap: 20, width: '100%', maxWidth: 720, alignSelf: 'center' }}
        >
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Badge tone="accent">{g.category}</Badge>
            <Badge>{t(g.kind)}</Badge>
          </View>
          <Text variant="largeTitle">{g.title}</Text>
          <Text variant="body" color="textMuted" style={{ fontSize: 17, lineHeight: 26 }}>{g.summary}</Text>
          {g.author && <PersonRow person={g.author} size={40} />}
          <View style={{ height: 1, backgroundColor: c.hairline }} />
          <Markdown source={g.body} />
          <Card variant="tint" style={{ gap: 12, marginTop: 12 }}>
            <Text variant="headline">{t('Put it to work')}</Text>
            <Text variant="footnote" color="textMuted">{t('Save this guide to return to it while working on your startup.')}</Text>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              <Button
                title={t("Ask Copilot")}
                icon={Bot}
                size="sm"
                onPress={() => router.push({ pathname: '/copilot', params: { prompt: t('Help me apply “{{title}}” to my startup this month.', { title: g.title }) } })}
              />
              <Button title={g.saved ? t('Saved') : t('Save')} icon={Bookmark} size="sm" variant="secondary" onPress={() => save.mutate({ id: g.id, saved: !g.saved })} />
              <Button title={t("Share")} icon={Share2} size="sm" variant="ghost" onPress={share} />
            </View>
          </Card>
        </ScrollView>
      )}
    </View>
  );
}
