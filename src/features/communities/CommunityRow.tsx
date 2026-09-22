import { useTranslation } from '@/i18n';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { useJoinCommunity } from '@/data/queries';
import type { Community } from '@/data/types';
import { compact } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, Monogram, Text } from '@/ui';
import { Lock } from '@/ui/icons';

export function CommunityRow({ community }: { community: Community }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { c } = useTheme();
  const join = useJoinCommunity();
  return (
    <Card
      onPress={() => router.push(`/communities/${community.id}` as Href)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
      accessibilityLabel={community.name}
    >
      <Monogram label={community.tag || community.name} hue={community.hue} size={48} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="headline" numberOfLines={1} style={{ flexShrink: 1 }}>{community.name}</Text>
          {community.is_private && <Lock size={13} color={c.textSubtle} />}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <Text variant="caption" color="textSubtle">{t('{{count}} members', { count: compact(community.member_count) })}</Text>
          {community.online_count > 0 && (
            <>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.success }} />
              <Text variant="caption" color="textSubtle">{t('{{count}} online', { count: compact(community.online_count) })}</Text>
            </>
          )}
        </View>
      </View>
      <Button
        title={community.joined ? t("Joined") : t("Join")}
        size="sm"
        loading={join.isPending}
        variant={community.joined ? 'outline' : 'primary'}
        onPress={() => join.mutate({ id: community.id, joined: !community.joined })}
      />
    </Card>
  );
}
