import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { ChevronRight } from './icons';
import { Text } from './Text';

/** Section with a mono uppercase label and an optional "See all" action. */
export function Section({
  title,
  action,
  onAction,
  children,
  style,
  inset,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Pad the header horizontally (for edge-to-edge rails). */
  inset?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View style={[{ gap: 12 }, style]}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: inset ? space[4] : 0,
        }}
      >
        <Text variant="label" color="textSubtle" accessibilityRole="header">
          {title.toUpperCase()}
        </Text>
        {action && onAction && (
          <Pressable
            onPress={onAction}
            hitSlop={10}
            accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
          >
            <Text variant="footnote" color="textMuted">
              {action}
            </Text>
            <ChevronRight size={14} color={c.textMuted} />
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}
