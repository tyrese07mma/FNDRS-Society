import React from 'react';
import { useRouter } from 'expo-router';
import { useSetBlocked } from '@/data/queries';
import { useTranslation } from '@/i18n';
import { confirm } from '@/state/dialog';
import { ListRow } from '@/ui';
import { Shield } from '@/ui/icons';

export function BlockAction({ userId, name, onClose }: { userId: string; name: string; onClose: () => void }) {
  const { t } = useTranslation();
  const block = useSetBlocked();
  const router = useRouter();
  const submit = async () => {
    onClose();
    await new Promise<void>(resolve => setTimeout(resolve, 280));
    if (!await confirm({ title: t('Block {{name}}?', { name }), message: t('This stops new messages, follows and matches between you. Existing messages remain. You can unblock this person in Settings.'), confirmLabel: t('Block'), destructive: true })) return;
    try {
      await block.mutateAsync({ userId, blocked: true });
      router.replace('/blocked-users');
    } catch { /* The mutation cache presents the error. */ }
  };
  return <ListRow icon={Shield} title={t('Block member')} destructive last onPress={block.isPending ? undefined : submit} />;
}
