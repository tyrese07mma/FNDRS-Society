import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFollow, useOpenConversation, useProfile, useReport } from '@/data/queries';
import { ProfileView } from '@/features/profile/ProfileView';
import { appLink, copy, shareText } from '@/lib/share';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, Header, IconButton, ListGroup, ListRow, Sheet, SkeletonList } from '@/ui';
import { AtSign, ChevronLeft, CircleAlert, Ellipsis, Flag, MessageCircle, PenLine, Share2, UserCheck, UserPlus } from '@/ui/icons';

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const profile = useProfile(id);
  const follow = useFollow();
  const open = useOpenConversation();
  const report = useReport();
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (profile.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header back />
        <View style={{ padding: 16 }}><SkeletonList variant="card" count={2} /></View>
      </View>
    );
  }
  if (!profile.data) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header back />
        <EmptyState icon={CircleAlert} title="Profile unavailable" message={profile.error?.message ?? 'This member may have left FNDRS.'} />
      </View>
    );
  }

  const p = profile.data;
  const message = async () => {
    try {
      const cid = await open.mutateAsync(p.id);
      router.push(`/chat/${cid}` as Href);
    } catch {
      // toast via mutation cache
    }
  };

  return (
    <>
      <ProfileView
        profile={p}
        isMe={p.is_me}
        bottomPadding={insets.bottom + 40}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await profile.refetch();
              setRefreshing(false);
            }}
            tintColor={c.textSubtle}
          />
        }
        topLeft={<IconButton icon={ChevronLeft} variant="glass" iconSize={22} onPress={back} accessibilityLabel="Back" />}
        topRight={
          <>
            <IconButton icon={Share2} variant="glass" onPress={() => shareText(`${p.full_name} on FNDRS Society — ${p.headline}`, appLink(`/user/${p.id}`))} accessibilityLabel="Share profile" />
            {!p.is_me && <IconButton icon={Ellipsis} variant="glass" onPress={() => setMenu(true)} accessibilityLabel="More options" />}
          </>
        }
        actions={
          p.is_me ? (
            <Button title="Edit profile" icon={PenLine} variant="secondary" size="sm" onPress={() => router.push('/edit-profile')} />
          ) : (
            <>
              <Button
                title={p.is_following ? 'Following' : p.follows_me ? 'Follow back' : 'Follow'}
                icon={p.is_following ? UserCheck : UserPlus}
                variant={p.is_following ? 'secondary' : 'primary'}
                size="sm"
                onPress={() => follow.mutate({ userId: p.id, follow: !p.is_following })}
              />
              <Button title="Message" icon={MessageCircle} variant="secondary" size="sm" loading={open.isPending} onPress={message} />
            </>
          )
        }
      />
      <Sheet open={menu} onClose={() => { setMenu(false); setReporting(false); }} title={reporting ? `Report ${p.full_name}` : undefined}>
        {reporting ? (
          <ListGroup>
            {['Fake profile', 'Spam or scam', 'Harassment', 'Something else'].map((r, i, all) => (
              <ListRow
                key={r}
                title={r}
                last={i === all.length - 1}
                onPress={() => {
                  setMenu(false);
                  setReporting(false);
                  report.mutate({ kind: 'user', id: p.id, reason: r });
                }}
              />
            ))}
          </ListGroup>
        ) : (
          <ListGroup>
            <ListRow icon={AtSign} title={`Copy @${p.handle}`} onPress={() => { setMenu(false); copy(`@${p.handle}`, 'Handle copied'); }} />
            <ListRow icon={Flag} title="Report profile" destructive last onPress={() => setReporting(true)} />
          </ListGroup>
        )}
      </Sheet>
    </>
  );
}
