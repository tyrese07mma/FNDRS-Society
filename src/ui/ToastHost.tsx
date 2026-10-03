import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToastStore, type ToastTone } from '@/state/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { Glass } from './Glass';
import { CircleAlert, CircleCheck, Info, Sparkles, type IconType } from './icons';
import { Text } from './Text';

const ICONS: Record<ToastTone, IconType> = {
  default: Info,
  success: CircleCheck,
  error: CircleAlert,
  accent: Sparkles,
};

export function ToastHost() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toneColor: Record<ToastTone, string> = {
    default: c.text,
    success: c.success,
    error: c.danger,
    accent: c.accentText,
  };

  return (
    <View
      style={{
        position: 'absolute',
        top: insets.top + 6,
        left: 12,
        right: 12,
        gap: 8,
        alignItems: 'center',
        zIndex: 1000,
        pointerEvents: 'box-none',
      }}
    >
      {items.map((t) => {
        const Icon = ICONS[t.tone];
        return (
          <Animated.View
            key={t.id}
            entering={FadeInUp.springify().damping(18)}
            exiting={FadeOutUp.duration(180)}
            layout={LinearTransition}
            style={{ width: '100%', maxWidth: 480 }}
          >
            <Pressable onPress={() => dismiss(t.id)} accessibilityRole="alert" accessibilityLabel={`${t.title}. ${t.message ?? ''}`}>
              <Glass radius={18} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, boxShadow: '0px 10px 30px rgba(0,0,0,0.25)' }}>
                <Icon size={20} color={toneColor[t.tone]} strokeWidth={2.1} />
                <View style={{ flex: 1 }}>
                  <Text variant="headline" numberOfLines={1}>
                    {t.title}
                  </Text>
                  {!!t.message && (
                    <Text variant="footnote" color="textMuted" numberOfLines={2}>
                      {t.message}
                    </Text>
                  )}
                </View>
              </Glass>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}
