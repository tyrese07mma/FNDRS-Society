import React from 'react';
import { View } from 'react-native';

import { Text } from '@/ui';
import { font } from '@/theme/tokens';

/** FNDRS wordmark in Michroma, optionally with the SOCIETY subline. */
export function Wordmark({ size = 15, society = false, align = 'left' }: { size?: number; society?: boolean; align?: 'left' | 'center' }) {
  return (
    <View style={{ alignItems: align === 'center' ? 'center' : 'flex-start' }} accessibilityRole="header" accessibilityLabel="FNDRS Society">
      <Text style={{ fontFamily: font.display, fontSize: size, lineHeight: size * 1.4, letterSpacing: size * 0.24 }} maxFontSizeMultiplier={1}>
        FNDRS
      </Text>
      {society && (
        <Text
          color="textSubtle"
          style={{ fontFamily: font.display, fontSize: size * 0.42, lineHeight: size * 0.7, letterSpacing: size * 0.55, marginTop: 2 }}
          maxFontSizeMultiplier={1}
        >
          SOCIETY
        </Text>
      )}
    </View>
  );
}
