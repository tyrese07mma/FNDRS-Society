import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { api } from '@/data';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Header, Input, Text } from '@/ui';

export default function AccountSecurity() {
  const router = useRouter();
  const { c } = useTheme();
  const { session } = useAuth();
  const [email, setEmail] = useState(session?.email ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
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
    </ScrollView>
  </View>;
}
