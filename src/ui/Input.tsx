import React, { useState } from 'react';
import { Platform, Pressable, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { font, radius } from '@/theme/tokens';
import { Eye, EyeOff, type IconType } from './icons';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string | null;
  icon?: IconType;
  trailing?: React.ReactNode;
  /** Password field with a show / hide toggle. */
  secure?: boolean;
  /** Show "12/280" under the field (needs maxLength). */
  counter?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  ref?: React.Ref<TextInput>;
}

const webNoOutline = Platform.OS === 'web' ? ({ outlineWidth: 0 } as object) : null;

export function Input({
  label,
  hint,
  error,
  icon: Icon,
  trailing,
  secure,
  counter,
  multiline,
  maxLength,
  value,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ref,
  ...rest
}: InputProps) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);
  const borderColor = error ? c.danger : focused ? c.textSubtle : c.border;

  return (
    <View style={[{ gap: 7 }, containerStyle]}>
      {label && (
        <Text variant="footnote" color="textMuted" style={{ fontFamily: font.sansMedium }}>
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: 10,
          minHeight: multiline ? 112 : 48,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 12 : 0,
          borderRadius: radius.md,
          backgroundColor: c.input,
          borderWidth: 1,
          borderColor,
        }}
      >
        {Icon && <Icon size={18} color={focused ? c.text : c.textSubtle} strokeWidth={2} />}
        <TextInput
          ref={ref}
          value={value}
          maxLength={maxLength}
          multiline={multiline}
          secureTextEntry={secure && !reveal}
          placeholderTextColor={c.textFaint}
          selectionColor={c.accent}
          cursorColor={c.accent}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            {
              flex: 1,
              color: c.text,
              fontFamily: font.sans,
              fontSize: 15.5,
              paddingVertical: multiline ? 0 : 12,
              textAlignVertical: multiline ? 'top' : 'center',
              minHeight: multiline ? 88 : undefined,
            },
            webNoOutline,
            style,
          ]}
          {...rest}
        />
        {secure && (
          <Pressable
            onPress={() => setReveal((r) => !r)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={reveal ? 'Hide password' : 'Show password'}
          >
            {reveal ? <EyeOff size={18} color={c.textSubtle} /> : <Eye size={18} color={c.textSubtle} />}
          </Pressable>
        )}
        {trailing}
      </View>
      {(error || hint || (counter && maxLength)) && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <Text variant="caption" color={error ? 'danger' : 'textSubtle'} style={{ flex: 1 }}>
            {error || hint || ''}
          </Text>
          {counter && maxLength && (
            <Text variant="mono" color="textFaint">
              {(value ?? '').length}/{maxLength}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
