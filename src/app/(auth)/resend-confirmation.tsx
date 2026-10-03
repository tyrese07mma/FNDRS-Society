import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { api } from '@/data';
import { useTranslation } from '@/i18n';
import { describeError } from '@/lib/errors';
import { useNow } from '@/lib/useNow';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Header, Input, Text } from '@/ui';

export default function ResendConfirmation() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const sending = useRef(false);
  const now = useNow(1000);
  const seconds = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const submit = async () => {
    if (sending.current || Date.now() < retryAt) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(t('Enter a valid email address.'));
    sending.current = true; setBusy(true); setError(undefined); setSent(false);
    // The service enforces its own rate limits; this also prevents accidental repeats.
    setRetryAt(Date.now() + 60_000);
    try { await api.resendConfirmation(email); setSent(true); }
    catch (e) { setError(describeError(e)); }
    finally { sending.current = false; setBusy(false); }
  };
  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
    <Header back title={t('Confirm your email')} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 16, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
      <Text>{t('Request a new confirmation email for the address you registered with.')}</Text>
      <Input label={t('Email')} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" error={error} onSubmitEditing={submit} />
      {sent && <Text accessibilityLiveRegion="polite">{t('If this address has an unconfirmed account, a new confirmation email will arrive. Check your spam folder too.')}</Text>}
      <Button title={seconds ? t('Try again in {{seconds}} seconds', { seconds }) : t('Send confirmation email')} loading={busy} disabled={seconds > 0} onPress={submit} />
    </ScrollView>
  </KeyboardAvoidingView>;
}
