import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useBlocked, useSetBlocked } from '@/data/queries';
import { useTranslation } from '@/i18n';
import { confirm } from '@/state/dialog';
import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Button, EmptyState, Header, SkeletonList, Text } from '@/ui';
import { Shield } from '@/ui/icons';
import { CONTENT_MAX } from '@/lib/layout';

export default function BlockedUsers() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const [pages, setPages] = useState<(string | undefined)[]>([undefined]);
  const blocked = useBlocked(pages[pages.length - 1]);
  const change = useSetBlocked();
  const unblock = async (userId: string, name: string) => {
    if (!await confirm({ title: t('Unblock {{name}}?', { name }), message: t('This allows new contact according to your privacy settings. Previous follows and matches are not restored.'), confirmLabel: t('Unblock') })) return;
    try { await change.mutateAsync({ userId, blocked: false }); } catch { /* Central error toast. */ }
  };
  return <View style={{ flex: 1, backgroundColor: c.bg }}>
    <Header back title={t('Blocked members')} />
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}>
      <Text color="textSubtle">{t('Manage the people you have blocked. They are not notified when you block or unblock them.')}</Text>
      {blocked.isLoading ? <SkeletonList count={4} /> : blocked.isError ?
        <EmptyState icon={Shield} title={t('Could not load blocked members')} actionLabel={t('Try again')} onAction={() => { void blocked.refetch(); }} /> :
        !blocked.data?.length ? <EmptyState icon={Shield} title={t('No blocked members on this page')} /> :
        blocked.data.map(person => <View key={person.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Avatar uri={person.avatar_url} name={person.full_name} size={44} />
          <View style={{ flex: 1 }}><Text variant="headline">{person.full_name}</Text><Text color="textSubtle">@{person.handle}</Text></View>
          <Button title={t('Unblock')} size="sm" variant="secondary" disabled={change.isPending} onPress={() => { void unblock(person.id, person.full_name); }} />
        </View>)}
      {pages.length > 1 && <Button title={t('Previous page')} variant="ghost" onPress={() => setPages(p => p.slice(0, -1))} />}
      {blocked.data?.length === 50 && <Button title={t('Next page')} variant="ghost" onPress={() => setPages(p => [...p, blocked.data![49].id])} />}
    </ScrollView>
  </View>;
}
