import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useTranslation } from '@/i18n';
import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUnreadCounts } from '@/data/queries';
import { haptic } from '@/lib/haptics';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { font, TAB_BAR_HEIGHT } from '@/theme/tokens';
import { Avatar, CountBadge, Glass, Text } from '@/ui';
import { Compass, House, MessageCircle, Sparkles, type IconType } from '@/ui/icons';

const TABS: Record<string, { icon: IconType | null; label: string }> = {
  index: { icon: House, label: 'Home' },
  match: { icon: Sparkles, label: 'Match' },
  discover: { icon: Compass, label: 'Discover' },
  inbox: { icon: MessageCircle, label: 'Inbox' },
  profile: { icon: null, label: 'You' },
};

function TabItem({
  routeName,
  focused,
  badge,
  onPress,
}: {
  routeName: string;
  focused: boolean;
  badge: number;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const { profile } = useAuth();
  const tab = TABS[routeName] ?? { icon: House, label: routeName };
  const Icon = tab.icon;
  const active = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    active.set(withSpring(focused ? 1 : 0, { damping: 18, stiffness: 240 }));
  }, [focused, active]);
  const pill = useAnimatedStyle(() => ({ opacity: active.value, transform: [{ scale: 0.8 + active.value * 0.2 }] }));
  const color = focused ? c.text : c.textSubtle;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={`${t(tab.label)}${badge ? ', ' + t('{{count}} unread', { count: badge }) : ''}`}
      style={{ flex: 1, height: TAB_BAR_HEIGHT - 12, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 4, right: 4, borderRadius: 22, backgroundColor: c.tint12 }, pill]} />
      <View>
        {Icon ? (
          <Icon size={22} color={color} strokeWidth={focused ? 2.3 : 1.9} />
        ) : (
          <View style={{ borderRadius: 13, borderWidth: 1.5, borderColor: focused ? c.text : 'transparent' }}>
            <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={23} />
          </View>
        )}
        {badge > 0 && (
          <View style={{ position: 'absolute', top: -6, right: -10 }}>
            <CountBadge count={badge} />
          </View>
        )}
      </View>
      <Text style={{ fontFamily: focused ? font.sansSemibold : font.sansMedium, fontSize: 10.5, lineHeight: 13, marginTop: 3 }} tint={color} maxFontSizeMultiplier={1.1}>
        {t(tab.label)}
      </Text>
    </Pressable>
  );
}

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const unread = useUnreadCounts();

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 14,
        paddingBottom: Math.max(insets.bottom, 12),
        alignItems: 'center',
        pointerEvents: 'box-none',
      }}
    >
      <Glass
        radius={30}
        intensity={70}
        style={{
          width: '100%',
          maxWidth: 520,
          height: TAB_BAR_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 6,
          boxShadow: '0px 12px 36px rgba(0,0,0,0.22)',
        }}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          return (
            <TabItem
              key={route.key}
              routeName={route.name}
              focused={focused}
              badge={route.name === 'inbox' ? unread.messages : 0}
              onPress={() => {
                haptic.selection();
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
            />
          );
        })}
      </Glass>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="match" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="inbox" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
