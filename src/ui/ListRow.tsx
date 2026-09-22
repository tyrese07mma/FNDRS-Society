import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { ChevronRight, type IconType } from './icons';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface ListRowProps {
  icon?: IconType;
  iconTint?: string;
  title: string;
  subtitle?: string;
  value?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  last?: boolean;
  leading?: React.ReactNode;
}

/** Settings-style row. Groups of rows go inside <ListGroup>. */
export function ListRow({ icon: Icon, iconTint, title, subtitle, value, right, onPress, destructive, last, leading }: ListRowProps) {
  const { c } = useTheme();
  const tint = destructive ? c.danger : iconTint ?? c.text;
  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: space[4],
        minHeight: 54,
      }}
    >
      {leading}
      {Icon && (
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: radius.sm,
            backgroundColor: destructive ? c.dangerSoft : c.tint08,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={17} color={tint} strokeWidth={2} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodyStrong" color={destructive ? 'danger' : 'text'} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text variant="caption" color="textSubtle" numberOfLines={2} style={{ marginTop: 1 }}>
            {subtitle}
          </Text>
        )}
      </View>
      {!!value && (
        <Text variant="footnote" color="textSubtle" numberOfLines={1}>
          {value}
        </Text>
      )}
      {right}
      {onPress && !right && <ChevronRight size={17} color={c.textFaint} />}
    </View>
  );
  return (
    <View>
      {onPress ? (
        <PressableScale onPress={onPress} scaleTo={0.99} haptics="selection" accessibilityLabel={title}>
          {body}
        </PressableScale>
      ) : (
        body
      )}
      {!last && <View style={{ height: 1, backgroundColor: c.hairline, marginLeft: Icon ? 60 : space[4] }} />}
    </View>
  );
}

export function ListGroup({ children }: { children: React.ReactNode }) {
  const { c, dark } = useTheme();
  return (
    <View
      style={{
        backgroundColor: c.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.hairline,
        overflow: 'hidden',
        boxShadow: dark ? undefined : '0px 1px 2px rgba(42,36,21,0.05)',
      }}
    >
      {children}
    </View>
  );
}
