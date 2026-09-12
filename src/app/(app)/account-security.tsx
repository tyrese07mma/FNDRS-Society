import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { api } from '@/data';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Header, Input, Text } from '@/ui';
import { confirm } from '@/state/dialog';

export default function AccountSecurity() {
  const router = useRouter();
  const { c } = useTheme();
  const { session } = useAuth();
  const [email, setEmail] = useState(session?.email ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const removeAccount = async () => {
    if (!password || busy) return;
    if (!await confirm({ title: 'Permanently delete your account?', message: 'Your profile, posts, chats and profile images will be removed. Active Stripe subscriptions end immediately. This cannot be undone.', confirmLabel: 'Delete permanently', destructive: true })) return;
    setBusy(true); setMessage('');
    try { await api.deleteAccount(password); }
    catch { setMessage('Deletion could not finish. Check your password and connection, then retry. If cleanup already started, your subscription may already be canceled.'); }
    finally { setPassword(''); setBusy(false); }
  };
  const changeEmail = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) { setMessage('Enter a valid email address.'); return; }
    setBusy(true); setMessage('');
    try { await api.updateEmail(email); setMessage('Check your inbox to confirm the email change.'); }
    catch { setMessage('Could not change your email. Please sign in again and retry.'); }
    finally { setBusy(false); }
  };
  return <View style={{ flex: 1, backgroundColor: c.bg }}>
    <Header back title="Account security" />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 16, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
      <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      {!!message && <Text>{message}</Text>}
      <Button title="Change email" onPress={changeEmail} loading={busy} />
      <Button title="Change password" variant="secondary" onPress={() => router.push('/reset-password')} />
      <Text variant="title3">Delete account</Text>
      <Text>Deletion removes your app data and profile images and ends your Stripe subscriptions immediately. Enter your current password to continue.</Text>
      <Input label="Current password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="current-password" />
      <Button title="Delete account" variant="danger" disabled={!password} loading={busy} onPress={removeAccount} />
    </ScrollView>
  </View>;
}
