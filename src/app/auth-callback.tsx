import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { sb } from '@/data/supabase/client';
import { authCallbackParams } from '@/lib/auth-callback';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Text } from '@/ui';

export default function AuthCallback() {
  const { t } = useTranslation();
  const router = useRouter();
  const url = Linking.useLinkingURL();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);
  const { c } = useTheme();
  useEffect(() => {
    if (!url || started.current) return;
    started.current = true;
    void (async () => {
      const params = authCallbackParams(url);
      if (params.error) throw new Error('Invalid auth link');
      if (params.code) {
        const { error } = await sb().auth.exchangeCodeForSession(params.code);
        if (error) throw error;
      } else if (params.accessToken && params.refreshToken) {
        const { error } = await sb().auth.setSession({ access_token: params.accessToken, refresh_token: params.refreshToken });
        if (error) throw error;
      } else throw new Error('Missing auth credentials');
      if (Platform.OS === 'web') window.history.replaceState({}, '', '/auth-callback');
      router.replace(params.recovery ? '/reset-password' : '/');
    })().catch(() => {
      // Expired or rejected credentials should not remain in the address bar either.
      if (Platform.OS === 'web') window.history.replaceState({}, '', '/auth-callback');
      setFailed(true);
    });
  }, [url, router]);
  return <View style={{ flex: 1, backgroundColor: c.bg, padding: 24, justifyContent: 'center', gap: 16 }}>
    <Text variant="title2">{failed ? t('This link is invalid or has expired.') : t('Verifying your account…')}</Text>
    {failed && <Button title={t('Back to sign in')} onPress={() => router.replace('/sign-in')} />}
  </View>;
}
