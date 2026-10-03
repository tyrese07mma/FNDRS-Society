import { useRouter } from 'expo-router';
import { useTranslation } from '@/i18n';
import React from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { ChevronLeft, X } from './icons';
import { IconButton } from './IconButton';
import { Text } from './Text';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  /** Show a back button. Pass a function to override navigation. */
  back?: boolean | (() => void);
  /** Modal-style close (X) instead of a back chevron. */
  close?: boolean;
  right?: React.ReactNode;
  /** Big left-aligned title — used by the tab roots. */
  large?: boolean;
  /** Custom content instead of the title (e.g. the FNDRS wordmark). */
  titleNode?: React.ReactNode;
  border?: boolean;
  /** Skip the safe-area top padding (e.g. inside a modal that already has it). */
  noInset?: boolean;
  /** Header of a modal screen: close button, and no status-bar inset on iOS page sheets. */
  modal?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Header({ title, subtitle, back, close: closeProp, right, large, titleNode, border, noInset: noInsetProp, modal, style }: HeaderProps) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const close = closeProp || modal;
  const noInset = noInsetProp || (modal && Platform.OS === 'ios');

  const goBack = () => {
    if (typeof back === 'function') return back();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View
      style={[
        {
          paddingTop: (noInset ? 0 : insets.top) + (large ? 10 : 6),
          paddingBottom: large ? 12 : 8,
          paddingHorizontal: space[4],
          backgroundColor: c.bg,
          borderBottomWidth: border ? 1 : 0,
          borderBottomColor: c.hairline,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        },
        style,
      ]}
    >
      {(back || close) && (
        <IconButton
          icon={close ? X : ChevronLeft}
          onPress={goBack}
          variant={close ? 'tint' : 'plain'}
          size={38}
          iconSize={close ? 19 : 24}
          accessibilityLabel={close ? t('Close') : t('Back')}
          style={close ? undefined : { marginLeft: -8 }}
        />
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        {titleNode ?? (
          <>
            {!!title && (
              <Text variant={large ? 'largeTitle' : 'title3'} numberOfLines={1} accessibilityRole="header">
                {title}
              </Text>
            )}
            {!!subtitle && (
              <Text variant="caption" color="textSubtle" numberOfLines={1} style={{ marginTop: large ? 2 : 0 }}>
                {subtitle}
              </Text>
            )}
          </>
        )}
      </View>
      {right && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{right}</View>}
    </View>
  );
}
