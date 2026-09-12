import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/data';
import { useUpdateMe } from '@/data/queries';
import type { DmPolicy } from '@/data/types';
import { APP_VERSION, SUPPORT_EMAIL } from '@/lib/env';
import { CONTENT_MAX } from '@/lib/layout';
import { useAuth } from '@/providers/AuthProvider';
import { confirm } from '@/state/dialog';
import { useSettings, type ThemeMode } from '@/state/settings';
import { toast } from '@/state/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Avatar, Badge, Header, ListGroup, ListRow, PressableScale, SegmentedControl, Switch, Text } from '@/ui';
import {
  BellRing,
  Bookmark,
  CalendarDays,
  ChartColumn,
  ChevronRight,
  CircleHelp,
  Crown,
  Eye,
  LifeBuoy,
  LogOut,
  MapPin,
  MessageCircle,
  Newspaper,
  ScrollText,
  Sparkles,
  SunMoon,
  Trash2,
  User,
  Vibrate,
} from '@/ui/icons';

function Group({ title, footer, children }: { title: string; footer?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text variant="label" color="textSubtle" style={{ marginLeft: 4 }}>{title}</Text>
      <ListGroup>{children}</ListGroup>
      {!!footer && <Text variant="caption" color="textFaint" style={{ marginHorizontal: 4 }}>{footer}</Text>}
    </View>
  );
}

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { profile, session, isPro, subscription } = useAuth();
  const update = useUpdateMe();
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const haptics = useSettings((s) => s.haptics);
  const setHaptics = useSettings((s) => s.setHaptics);
  const notif = useSettings((s) => s.notifications);
  const setNotif = useSettings((s) => s.setNotification);
  const [privacy, setPrivacy] = useState(() => ({
    location_visible: profile?.location_visible ?? true,
    discoverable: profile?.discoverable ?? true,
    dm_policy: (profile?.dm_policy ?? 'everyone') as DmPolicy,
  }));
  if (!profile) return null;

  const setPriv = <K extends keyof typeof privacy>(key: K, value: (typeof privacy)[K]) => {
    if (update.isPending) return;
    const previous = privacy;
    setPrivacy((p) => ({ ...p, [key]: value }));
    update.mutate({ [key]: value }, { onError: () => setPrivacy(previous) });
  };

  const signOut = async () => {
    if (await confirm({ title: 'Sign out?', confirmLabel: 'Sign out' })) {
      try { await api.signOut(); }
      catch { toast.error('Could not sign out', 'Please check your connection and retry.'); }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header back title="Settings" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: insets.bottom + 40, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}>
        <PressableScale
          scaleTo={0.99}
          onPress={() => router.push('/edit-profile')}
          accessibilityLabel="Edit profile"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: c.hairline }}
        >
          <Avatar uri={profile.avatar_url} name={profile.full_name} size={56} ring={profile.verified} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="title3" numberOfLines={1}>{profile.full_name}</Text>
            <Text variant="caption" color="textSubtle" numberOfLines={1}>@{profile.handle} · {session?.email}</Text>
          </View>
          <ChevronRight size={18} color={c.textFaint} />
        </PressableScale>

        <PressableScale scaleTo={0.99} onPress={() => router.push('/premium')} accessibilityLabel="FNDRS Pro">
          <LinearGradient
            colors={[c.accentSoft, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: c.accentBorder }}
          >
            <Crown size={22} color={c.accentText} />
            <View style={{ flex: 1 }}>
              <Text variant="headline">FNDRS Pro</Text>
              <Text variant="caption" color="textMuted">
                {isPro ? `${subscription?.status === 'trialing' ? 'Trial active' : 'Active'} · manage your plan` : 'Unlimited matches, intros and analytics'}
              </Text>
            </View>
            <Badge tone="accent">{isPro ? 'Active' : 'Upgrade'}</Badge>
          </LinearGradient>
        </PressableScale>

        <Group title="ACCOUNT">
          <ListRow icon={User} title="Edit profile" onPress={() => router.push('/edit-profile')} />
          <ListRow icon={User} title="Email & password" onPress={() => router.push('/account-security')} />
          <ListRow icon={Bookmark} title="Saved" onPress={() => router.push('/saved')} />
          <ListRow icon={ChartColumn} title="Analytics" onPress={() => router.push('/analytics')} />
          <ListRow icon={Sparkles} title="Subscription" value={isPro ? 'Pro' : 'Free'} onPress={() => router.push('/premium')} last />
        </Group>

        <Group title="APPEARANCE">
          <View style={{ padding: 14, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.tint08, alignItems: 'center', justifyContent: 'center' }}>
                <SunMoon size={17} color={c.text} />
              </View>
              <Text variant="bodyStrong">Theme</Text>
            </View>
            <SegmentedControl<ThemeMode>
              size="sm"
              value={theme}
              onChange={setTheme}
              options={[
                { value: 'system', label: 'System' },
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Light' },
              ]}
            />
          </View>
          <View style={{ height: 1, backgroundColor: c.hairline, marginLeft: 60 }} />
          <ListRow icon={Vibrate} title="Haptic feedback" right={<Switch value={haptics} onValueChange={setHaptics} accessibilityLabel="Haptic feedback" />} last />
        </Group>

        <Group title="NOTIFICATIONS" footer="Applies to in-app alerts and to push notifications once they are enabled on this device.">
          <ListRow icon={Sparkles} title="New matches" right={<Switch value={notif.matches} onValueChange={(v) => setNotif('matches', v)} accessibilityLabel="New matches" />} />
          <ListRow icon={MessageCircle} title="Messages" right={<Switch value={notif.messages} onValueChange={(v) => setNotif('messages', v)} accessibilityLabel="Messages" />} />
          <ListRow icon={CalendarDays} title="Event reminders" right={<Switch value={notif.events} onValueChange={(v) => setNotif('events', v)} accessibilityLabel="Event reminders" />} />
          <ListRow icon={Newspaper} title="Weekly digest" subtitle="Top posts and new founders, every Monday" right={<Switch value={notif.digest} onValueChange={(v) => setNotif('digest', v)} accessibilityLabel="Weekly digest" />} last />
        </Group>

        <Group title="PRIVACY">
          <ListRow icon={MapPin} title="Show my location" right={<Switch value={privacy.location_visible} onValueChange={(v) => setPriv('location_visible', v)} accessibilityLabel="Show my location" />} />
          <ListRow icon={Eye} title="Discoverable in Smart Match" subtitle="Turn off to pause new matches" right={<Switch value={privacy.discoverable} onValueChange={(v) => setPriv('discoverable', v)} accessibilityLabel="Discoverable in Smart Match" />} />
          <View style={{ padding: 14, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.tint08, alignItems: 'center', justifyContent: 'center' }}>
                <BellRing size={17} color={c.text} />
              </View>
              <Text variant="bodyStrong">Who can message me</Text>
            </View>
            <SegmentedControl<DmPolicy>
              size="sm"
              value={privacy.dm_policy}
              onChange={(v) => setPriv('dm_policy', v)}
              options={[
                { value: 'everyone', label: 'Everyone' },
                { value: 'matches', label: 'Matches only' },
              ]}
            />
          </View>
        </Group>

        <Group title="SUPPORT">
          <ListRow icon={CircleHelp} title="Help center" onPress={() => router.push('/help')} />
          <ListRow icon={LifeBuoy} title="Contact support" value={SUPPORT_EMAIL} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
          <ListRow icon={ScrollText} title="Terms, privacy & guidelines" onPress={() => router.push('/legal')} last />
        </Group>


        <Group title="SESSION">
          <ListRow icon={LogOut} title="Sign out" onPress={signOut} />
          <ListRow icon={Trash2} title="Delete account" destructive onPress={() => router.push('/account-security')} last />
        </Group>

        <Text variant="mono" color="textFaint" align="center">
          FNDRS Society {APP_VERSION} · Live
        </Text>
      </ScrollView>
    </View>
  );
}
