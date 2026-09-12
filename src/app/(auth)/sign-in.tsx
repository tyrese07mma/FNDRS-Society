import { useTranslation } from '@/i18n';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/data';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Header, Input, Text } from '@/ui';
import { Lock, Mail } from '@/ui/icons';
import { LanguagePicker } from '@/ui/LanguagePicker';

export default function SignIn() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'password' | null>(null);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(t("Enter a valid email address."));
    if (!password) return setError(t("Enter your password."));
    setBusy('password');
    setError(null);
    try {
      await api.signIn(email, password);
      haptic.success();
    } catch (e) {
      haptic.error();
      setError(e instanceof Error ? t(e.message) : t("Could not sign in."));
      setBusy(null);
    }
  };


  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <Header back />
      <LanguagePicker />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24, gap: 16, maxWidth: 520, width: '100%', alignSelf: 'center' }}
      >
        <View style={{ gap: 6, marginBottom: 8 }}>
          <Text variant="largeTitle">{t("Welcome back.")}</Text>
          <Text color="textMuted">{t("Sign in to pick up where you left off.")}</Text>
        </View>

        <Input
          label={t("Email")}
          icon={Mail}
          value={email}
          onChangeText={setEmail}
          placeholder="you@startup.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <Input
          label={t("Password")}
          icon={Lock}
          secure
          value={password}
          onChangeText={setPassword}
          placeholder={t("Your password")}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          error={error}
        />
        <Pressable onPress={() => router.push('/forgot-password')} hitSlop={8} style={{ alignSelf: 'flex-end' }} accessibilityRole="link">
          <Text variant="footnote" color="textMuted">{t("Forgot password?")}</Text>
        </Pressable>

        <Button title={t("Sign in")} size="lg" block loading={busy === 'password'} disabled={!!busy} onPress={submit} />


        <Text variant="footnote" color="textSubtle" align="center" style={{ marginTop: 8 }}>
          {t("New here?")}{' '}
          <Text variant="footnote" color="text" onPress={() => router.replace('/sign-up')} suppressHighlighting>
            {t("Create an account")}</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
