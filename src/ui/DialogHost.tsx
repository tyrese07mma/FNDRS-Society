import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { useDialogStore } from '@/state/dialog';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Button } from './Button';
import { Text } from './Text';

/** Renders the cross-platform confirm() dialog. Mounted once at the root. */
export function DialogHost() {
  const { t } = useTranslation();
  const current = useDialogStore((s) => s.current);
  const close = useDialogStore((s) => s.close);
  const { c } = useTheme();
  if (!current) return null;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={() => close(false)}>
      <Animated.View entering={FadeIn.duration(160)} style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => current.cancelLabel && close(false)} />
      </Animated.View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, pointerEvents: 'box-none' }}>
        <Animated.View
          entering={ZoomIn.duration(200)}
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={{
            width: '100%',
            maxWidth: 360,
            backgroundColor: c.bgElevated,
            borderRadius: radius.xl,
            padding: 22,
            gap: 8,
            borderWidth: 1,
            borderColor: c.hairlineStrong,
            boxShadow: '0px 20px 50px rgba(0,0,0,0.35)',
          }}
        >
          <Text variant="title3">{current.title}</Text>
          {!!current.message && (
            <Text variant="callout" color="textMuted">
              {current.message}
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            {current.cancelLabel && (
              <Button title={t(current.cancelLabel)} variant="secondary" style={{ flex: 1 }} onPress={() => close(false)} />
            )}
            <Button
              title={t(current.confirmLabel)}
              variant={current.destructive ? 'danger' : 'primary'}
              style={{ flex: 1 }}
              onPress={() => close(true)}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
