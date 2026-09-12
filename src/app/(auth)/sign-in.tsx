import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/data';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Header, Input, Text } from '@/ui';
import { Lock, Mail } from '@/ui/icons';

export default function SignIn() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'password' | null>(null);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (!password) return setError('Enter your password.');
    setBusy('password');
    setError(null);
    try {
      await api.signIn(email, password);
      haptic.success();
    } catch (e) {
      haptic.error();
      setError(e instanceof Error ? e.message : 'Could not sign in.');
      setBusy(null);
    }
  };


  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <Header back />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24, gap: 16, maxWidth: 520, width: '100%', alignSelf: 'center' }}
      >
        <View style={{ gap: 6, marginBottom: 8 }}>
          <Text variant="largeTitle">Welcome back.</Text>
          <Text color="textMuted">Sign in to pick up where you left off.</Text>
        </View>

        <Input
          label="Email"
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
          label="Password"
          icon={Lock}
          secure
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          error={error}
        />
        <Pressable onPress={() => router.push('/forgot-password')} hitSlop={8} style={{ alignSelf: 'flex-end' }} accessibilityRole="link">
          <Text variant="footnote" color="textMuted">Forgot password?</Text>
        </Pressable>

        <Button title="Sign in" size="lg" block loading={busy === 'password'} disabled={!!busy} onPress={submit} />


        <Text variant="footnote" color="textSubtle" align="center" style={{ marginTop: 8 }}>
          New here?{' '}
          <Text variant="footnote" color="text" onPress={() => router.replace('/sign-up')} suppressHighlighting>
            Create an account
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
