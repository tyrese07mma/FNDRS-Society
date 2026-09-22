import { useTranslation } from '@/i18n';
import { useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { useDeletePost, useReport } from '@/data/queries';
import type { Post } from '@/data/types';
import { appLink, copy, shareText } from '@/lib/share';
import { useAuth } from '@/providers/AuthProvider';
import { confirm } from '@/state/dialog';
import { ListGroup, ListRow, Sheet } from '@/ui';
import { Copy, Flag, Share2, Trash2, User } from '@/ui/icons';

const REASONS = ['Spam or self-promotion', 'Harassment or hate', 'Misleading or scam', 'Something else'];

/** "…" menu for a post: copy, share, view author, report or delete. */
export function PostMenu({ post, open, onClose }: { post: Post; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { userId } = useAuth();
  const del = useDeletePost();
  const report = useReport();
  const [reporting, setReporting] = useState(false);
  const mine = post.author_id === userId;

  const close = () => {
    setReporting(false);
    onClose();
  };
  // Let the sheet animate out before the next thing appears.
  const after = (fn: () => void) => {
    close();
    setTimeout(fn, 280);
  };

  return (
    <Sheet open={open} onClose={close} title={reporting ? t("Report post") : undefined} subtitle={reporting ? t("Why are you reporting this?") : undefined}>
      {reporting ? (
        <ListGroup>
          {REASONS.map((r, i) => (
            <ListRow key={r} title={t(r)} last={i === REASONS.length - 1} onPress={() => after(() => report.mutate({ kind: 'post', id: post.id, reason: r }))} />
          ))}
        </ListGroup>
      ) : (
        <View style={{ gap: 12 }}>
          <ListGroup>
            <ListRow icon={Copy} title={t("Copy text")} onPress={() => after(() => copy(post.body, t("Post copied")))} />
            <ListRow
              icon={Share2}
              title={t("Share")}
              onPress={() => after(() => shareText(t('{{name}} on FNDRS', { name: post.author.full_name }), appLink(`/post/${post.id}`)))}
            />
            <ListRow icon={User} title={t('View {{name}}’s profile', { name: post.author.full_name.split(' ')[0] })} last onPress={() => after(() => router.push(`/user/${post.author.id}` as Href))} />
          </ListGroup>
          <ListGroup>
            {mine ? (
              <ListRow
                icon={Trash2}
                title={t("Delete post")}
                destructive
                last
                onPress={() =>
                  after(async () => {
                    if (await confirm({ title: t("Delete this post?"), message: t("This can’t be undone."), confirmLabel: t("Delete"), destructive: true })) {
                      del.mutate(post.id);
                    }
                  })
                }
              />
            ) : (
              <ListRow icon={Flag} title={t("Report post")} destructive last onPress={() => setReporting(true)} />
            )}
          </ListGroup>
        </View>
      )}
    </Sheet>
  );
}
