import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import type { ProfileLite } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, PressableScale, Text } from '@/ui';
import { BadgeCheck } from '@/ui/icons';

/** Avatar + name + headline row. Tapping opens the member's profile unless onPress is given. */
export function PersonRow({
  person,
  right,
  subtitle,
  onPress,
  size = 46,
}: {
  person: ProfileLite;
  right?: React.ReactNode;
  subtitle?: string;
  onPress?: () => void;
  size?: number;
}) {
  const { c } = useTheme();
  const router = useRouter();
  return (
    <PressableScale
      scaleTo={0.985}
      nestedInteractive={!!right}
      onPress={onPress ?? (() => router.push(`/user/${person.id}` as Href))}
      accessibilityLabel={person.full_name}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}
    >
      <Avatar uri={person.avatar_url} name={person.full_name} size={size} ring={person.verified} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text variant="headline" numberOfLines={1} style={{ flexShrink: 1 }}>
            {person.full_name}
          </Text>
          {person.verified && <BadgeCheck size={14} color={c.accentText} />}
        </View>
        <Text variant="caption" color="textSubtle" numberOfLines={1}>
          {subtitle ?? person.headline ?? `@${person.handle}`}
        </Text>
      </View>
      {right}
    </PressableScale>
  );
}
