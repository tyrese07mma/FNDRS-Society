import { useTranslation } from '@/i18n';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { api } from '@/data';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Header, Input, Text } from '@/ui';

export default function ResetPassword() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useAuth();
  const { c } = useTheme();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (password.length < 12) return setError(t("Use at least 12 characters."));
    if (password !== repeat) return setError(t("Passwords do not match."));
    setBusy(true); setError(undefined);
    try { await api.updatePassword(password); router.replace('/'); }
    catch { setError(t("Could not change your password. Request a new link and try again.")); }
    finally { setBusy(false); }
  };
  return <View style={{ flex: 1, backgroundColor: c.bg }}><Header back title={t("Change password")} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 16, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
      {session ? <>
        <Input label={t("New password")} secure value={password} onChangeText={setPassword} autoComplete="new-password" />
        <Input label={t("Confirm password")} secure value={repeat} onChangeText={setRepeat} error={error} />
        <Button title={t("Save password")} loading={busy} onPress={submit} />
      </> : <><Text>{t("Open the password reset link from your email to continue.")}</Text><Button title={t("Back to sign in")} onPress={() => router.replace('/sign-in')} /></>}
    </ScrollView>
  </View>;
}
