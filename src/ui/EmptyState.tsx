import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Button } from './Button';
import type { IconType } from './icons';
import { Text } from './Text';

export function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  compact,
}: {
  icon?: IconType;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: compact ? space[6] : space[12], paddingHorizontal: space[6], gap: 10 }}>
      {Icon && (
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.lg,
            backgroundColor: c.tint08,
            borderWidth: 1,
            borderColor: c.hairline,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 6,
          }}
        >
          <Icon size={24} color={c.textMuted} strokeWidth={1.8} />
        </View>
      )}
      <Text variant="title3" align="center">
        {title}
      </Text>
      {message && (
        <Text variant="callout" color="textSubtle" align="center" style={{ maxWidth: 300 }}>
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button title={actionLabel} variant="secondary" size="sm" onPress={onAction} style={{ marginTop: 8 }} />
      )}
    </View>
  );
}
