import { useTranslation } from '@/i18n';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Text } from './Text';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Pinned below the scrolling content (primary actions). */
  footer?: React.ReactNode;
  scroll?: boolean;
}

const SPRING = { damping: 26, stiffness: 260, mass: 0.9 };

/** Bottom sheet with spring entry, backdrop fade and drag-to-dismiss on the grabber. */
export function Sheet({ open, onClose, title, subtitle, children, footer, scroll = true }: SheetProps) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const [mounted, setMounted] = useState(open);
  const y = useSharedValue(screenH);
  const fade = useSharedValue(0);

  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) return;
    fade.set(withTiming(0, { duration: 200 }));
    y.set(
      withTiming(screenH, { duration: 240, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) scheduleOnRN(setMounted, false);
      }),
    );
  }, [open, fade, y, screenH]);

  useEffect(() => {
    if (open && mounted) {
      y.set(withSpring(0, SPRING));
      fade.set(withTiming(1, { duration: 240 }));
    }
  }, [open, mounted, fade, y]);

  const drag = Gesture.Pan()
    .activeOffsetY(6)
    .onUpdate((e) => {
      y.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > 110 || e.velocityY > 900) scheduleOnRN(onClose);
      else y.set(withSpring(0, SPRING));
    });

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t("Close")} />
        </Animated.View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end', pointerEvents: 'box-none' }}
        >
          <Animated.View
            accessibilityViewIsModal
            style={[
              {
                maxHeight: screenH * 0.9,
                backgroundColor: c.bgElevated,
                borderTopLeftRadius: radius.xxl,
                borderTopRightRadius: radius.xxl,
                borderWidth: 1,
                borderBottomWidth: 0,
                borderColor: c.hairlineStrong,
                paddingBottom: insets.bottom + 14,
                width: '100%',
                maxWidth: 640,
                alignSelf: 'center',
              },
              panelStyle,
            ]}
          >
            <GestureDetector gesture={drag}>
              <View style={{ paddingTop: 10, paddingHorizontal: 20, paddingBottom: title ? 10 : 4 }}>
                <View
                  style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: c.tint20, alignSelf: 'center', marginBottom: 14 }}
                />
                {!!title && <Text variant="title2">{title}</Text>}
                {!!subtitle && (
                  <Text variant="footnote" color="textSubtle" style={{ marginTop: 4 }}>
                    {subtitle}
                  </Text>
                )}
              </View>
            </GestureDetector>
            {scroll ? (
              <ScrollView
                style={{ flexGrow: 0, flexShrink: 1 }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {children}
              </ScrollView>
            ) : (
              <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>{children}</View>
            )}
            {footer && <View style={{ paddingHorizontal: 20, paddingTop: 10, gap: 10 }}>{footer}</View>}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}
