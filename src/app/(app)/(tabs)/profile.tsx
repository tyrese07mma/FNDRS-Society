import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { RefreshControl } from 'react-native';

import { ProfileView } from '@/features/profile/ProfileView';
import { useTabBarPadding } from '@/lib/layout';
import { appLink, shareText } from '@/lib/share';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, IconButton } from '@/ui';
import { Bookmark, ChartColumn, PenLine, Settings, Share2 } from '@/ui/icons';

export default function MyProfile() {
  const router = useRouter();
  const qc = useQueryClient();
  const { c } = useTheme();
  const { profile, isPro } = useAuth();
  const pad = useTabBarPadding();
  const [refreshing, setRefreshing] = useState(false);
  if (!profile) return null;

  const refresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshing(false);
  };

  return (
    <ProfileView
      profile={profile}
      isMe
      isPro={isPro}
      bottomPadding={pad}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.textSubtle} />}
      topLeft={<IconButton icon={ChartColumn} variant="glass" onPress={() => router.push('/analytics')} accessibilityLabel="Analytics" />}
      topRight={
        <>
          <IconButton icon={Bookmark} variant="glass" onPress={() => router.push('/saved')} accessibilityLabel="Saved" />
          <IconButton
            icon={Share2}
            variant="glass"
            onPress={() => shareText(`${profile.full_name} on FNDRS Society — ${profile.headline}`, appLink(`/user/${profile.id}`))}
            accessibilityLabel="Share profile"
          />
          <IconButton icon={Settings} variant="glass" onPress={() => router.push('/settings')} accessibilityLabel="Settings" />
        </>
      }
      actions={<Button title="Edit profile" icon={PenLine} variant="secondary" size="sm" onPress={() => router.push('/edit-profile')} />}
    />
  );
}
