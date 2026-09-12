import { describeError } from '@/lib/errors';
import { useTranslation } from '@/i18n';
import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from '@expo-google-fonts/geist';
import { GeistMono_400Regular, GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import { Michroma_400Regular } from '@expo-google-fonts/michroma';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';

import { api } from '@/data';
import { BACKEND_CONFIGURED } from '@/lib/env';
import { useRealtimeSync } from '@/data/queries';
import { AppProviders } from '@/providers/AppProviders';
import { useAuth } from '@/providers/AuthProvider';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, DialogHost, EmptyState, ToastHost } from '@/ui';
import { CircleAlert } from '@/ui/icons';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Web only: our inputs draw their own focus state, so drop the browser focus ring.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = 'input:focus,textarea:focus{outline:none}*{-webkit-tap-highlight-color:transparent}';
  document.head.appendChild(style);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Michroma_400Regular,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_400Regular,
    GeistMono_500Medium,
  });

  return (
    <AppProviders>
      <RootNavigator fontsReady={fontsLoaded || !!fontError} />
    </AppProviders>
  );
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { t } = useTranslation();
  const { status, userId, profile, ready, profileError, retryProfile } = useAuth();
  const hydrated = useSettings((s) => s.hydrated);
  const preferencesOwner = useSettings((s) => s.ownerId);
  const { dark, c } = useTheme();
  const appReady = fontsReady && hydrated && ready && preferencesOwner === userId;

  useEffect(() => {
    if (appReady) SplashScreen.hideAsync().catch(() => {});
  }, [appReady]);

  const signedIn = status === 'signedIn' && !!profile;
  const onboarded = !!profile?.onboarded;
  useRealtimeSync(signedIn && onboarded);

  if (!appReady) return null;

  if (!BACKEND_CONFIGURED) return (
    <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', padding: 24 }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <EmptyState icon={CircleAlert} title={t("FNDRS is not available yet")} message={t("The service is being set up. Please try again later.")} />
    </View>
  );

  if (status === 'signedIn' && !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', padding: 24 }}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <EmptyState
          icon={CircleAlert}
          title={t("We could not load your profile")}
          message={describeError(profileError)}
          actionLabel={t("Try again")}
          onAction={retryProfile}
        />
        <Button title={t("Sign out")} variant="ghost" onPress={() => api.signOut()} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !onboarded}>
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && onboarded}>
          <Stack.Screen name="(app)" options={{ animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Screen name="auth-callback" /><Stack.Screen name="reset-password" /><Stack.Screen name="legal" options={{ presentation: 'modal' }} />
      </Stack>
      <ToastHost />
      <DialogHost />
    </>
  );
}
