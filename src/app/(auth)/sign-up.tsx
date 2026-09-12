import { describeError } from '@/lib/errors';
import { useTranslation } from '@/i18n';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/data';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, Header, Input, Text } from '@/ui';
import { Lock, Mail, User } from '@/ui/icons';

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) s++;
  return s;
}
const LABELS = ['Too short', 'Weak', 'Okay', 'Good', 'Strong'];

export default function SignUp() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const score = strength(password);

  const submit = async () => {
    if (name.trim().length < 2) return setError(t("Please tell us your name."));
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(t("Enter a valid email address."));
    if (password.length < 12) return setError(t("Use at least 12 characters for your password."));
    setBusy(true);
    setError(null);
    try {
      const { needsConfirmation } = await api.signUp({ email, password, fullName: name });
      haptic.success();
      if (needsConfirmation) {
        setSentTo(email.trim());
        setBusy(false);
      }
    } catch (e) {
      haptic.error();
      setError(describeError(e));
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header back />
        <Animated.View entering={FadeIn} style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
          <EmptyState
            icon={Mail}
            title={t("Check your inbox")}
            message={t('We sent a confirmation link to {{email}}. Open it on this device to finish creating your account.', { email: sentTo })}
            actionLabel={t("Back to sign in")}
            onAction={() => router.replace('/sign-in')}
          />
        </Animated.View>
      </View>
    );
  }

  const barColor = score <= 1 ? c.danger : score === 2 ? c.warning : c.success;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <Header back />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24, gap: 16, maxWidth: 520, width: '100%', alignSelf: 'center' }}
      >
        <View style={{ gap: 6, marginBottom: 8 }}>
          <Text variant="largeTitle">{t("Join the Society.")}</Text>
          <Text color="textMuted">{t("Two minutes to set up. Your profile powers every match you get.")}</Text>
        </View>

        <Input label={t("Full name")} icon={User} value={name} onChangeText={setName} placeholder={t("Your full name")} autoComplete="name" textContentType="name" />
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
        />
        <View style={{ gap: 8 }}>
          <Input
            label={t("Password")}
            icon={Lock}
            secure
            value={password}
            onChangeText={setPassword}
            placeholder={t("At least 12 characters")}
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={submit}
            error={error}
          />
          {password.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < score ? barColor : c.tint12 }} />
                ))}
              </View>
              <Text variant="mono" color="textSubtle">{t(LABELS[score])}</Text>
            </View>
          )}
        </View>

        <Button title={t("Create account")} size="lg" block loading={busy} onPress={submit} />

        <Text variant="caption" color="textSubtle" align="center">
          {t("By creating an account you agree to our")}{' '}
          <Text variant="caption" color="text" onPress={() => router.push('/legal')} suppressHighlighting>
            {t("Terms & Privacy Policy")}</Text>
          .
        </Text>
        <Text variant="footnote" color="textSubtle" align="center">
          {t("Already a member?")}{' '}
          <Text variant="footnote" color="text" onPress={() => router.replace('/sign-in')} suppressHighlighting>
            {t("Sign in")}</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
