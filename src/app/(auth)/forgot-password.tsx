import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { api } from '@/data';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, Header, Input, Text } from '@/ui';
import { Mail, MessagesSquare } from '@/ui/icons';

export default function ForgotPassword() {
  const router = useRouter();
  const { c } = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    setBusy(true);
    setError(null);
    try {
      await api.resetPassword(email);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the email.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <Header close title="Reset password" noInset={Platform.OS === 'ios'} />
      {sent ? (
        <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
          <EmptyState
            icon={MessagesSquare}
            title="Check your email"
            message={`If an account exists for ${email.trim()}, you will get a link to set a new password in a minute.`}
            actionLabel="Done"
            onAction={() => router.back()}
          />
        </View>
      ) : (
        <View style={{ padding: 24, gap: 16, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
          <Text color="textMuted">Enter the email you signed up with and we will send you a reset link.</Text>
          <Input
            label="Email"
            icon={Mail}
            value={email}
            onChangeText={setEmail}
            placeholder="you@startup.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            autoFocus
            onSubmitEditing={submit}
            error={error}
          />
          <Button title="Send reset link" size="lg" block loading={busy} onPress={submit} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
