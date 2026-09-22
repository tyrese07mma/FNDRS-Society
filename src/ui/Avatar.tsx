import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { View } from 'react-native';

import { hashHue, hsl } from '@/lib/color';
import { initials } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius } from '@/theme/tokens';
import { Text } from './Text';

export interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  /** Gold ring for verified members. */
  ring?: boolean;
  status?: 'online' | 'away' | null;
  shape?: 'circle' | 'rounded';
}

export function Avatar({ uri, name, size = 40, ring, status, shape = 'circle' }: AvatarProps) {
  const { c, dark } = useTheme();
  const r = shape === 'circle' ? radius.pill : Math.round(size * 0.28);
  const pad = ring ? Math.max(2, Math.round(size * 0.045)) : 0;
  const inner = size - pad * 2;
  const hue = hashHue(name ?? '?');
  const dotSize = Math.max(9, Math.round(size * 0.26));

  // Initials sit underneath the photo so a slow or failed image never shows a hole.
  const face = (
    <View
      style={{
        width: inner,
        height: inner,
        borderRadius: r,
        overflow: 'hidden',
        backgroundColor: dark ? hsl(hue, 16, 22) : hsl(hue, 30, 86),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: ring ? Math.max(1.5, size * 0.03) : 0,
        borderColor: c.bg,
      }}
    >
      <Text
        style={{ fontFamily: font.monoMedium, fontSize: inner * 0.36, lineHeight: inner * 0.44 }}
        tint={dark ? hsl(hue, 30, 78) : hsl(hue, 35, 30)}
        maxFontSizeMultiplier={1}
      >
        {initials(name) || '?'}
      </Text>
      {!!uri && (
        <Image
          source={{ uri }}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
          accessibilityIgnoresInvertColors
        />
      )}
    </View>
  );

  return (
    <View style={{ width: size, height: size }} accessibilityLabel={name ?? undefined}>
      {ring ? (
        <LinearGradient
          colors={c.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: size, height: size, borderRadius: r, padding: pad }}
        >
          {face}
        </LinearGradient>
      ) : (
        face
      )}
      {status && (
        <View
          style={{
            position: 'absolute',
            right: shape === 'circle' ? size * 0.02 : -2,
            bottom: shape === 'circle' ? size * 0.02 : -2,
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: status === 'online' ? c.success : c.warning,
            borderWidth: 2,
            borderColor: c.bg,
          }}
        />
      )}
    </View>
  );
}

/** Overlapping avatars with an optional "+N" overflow chip. */
export function AvatarStack({
  people,
  size = 26,
  max = 4,
  total,
}: {
  people: { id: string; avatar_url: string | null; full_name: string }[];
  size?: number;
  max?: number;
  total?: number;
}) {
  const { c } = useTheme();
  const shown = people.slice(0, max);
  const extra = (total ?? people.length) - shown.length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {shown.map((p, i) => (
        <View
          key={p.id}
          style={{ marginLeft: i === 0 ? 0 : -size * 0.32, borderRadius: size, borderWidth: 2, borderColor: c.bg }}
        >
          <Avatar uri={p.avatar_url} name={p.full_name} size={size} />
        </View>
      ))}
      {extra > 0 && (
        <View
          style={{
            marginLeft: -size * 0.32,
            height: size + 4,
            minWidth: size + 4,
            paddingHorizontal: 6,
            borderRadius: size,
            backgroundColor: c.cardAlt,
            borderWidth: 2,
            borderColor: c.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="mono" color="textMuted" style={{ fontSize: 10 }}>
            +{extra > 999 ? `${Math.round(extra / 1000)}k` : extra}
          </Text>
        </View>
      )}
    </View>
  );
}
