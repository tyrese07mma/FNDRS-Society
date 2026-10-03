import React from 'react';
import { View } from 'react-native';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, Header } from '@/ui';
import { Bot, Crown } from '@/ui/icons';

/** Keep the route available while an optional service is not offered. */
export function UnavailableFeature({ feature }: { feature: 'ai' | 'billing' }) {
  const { c } = useTheme();
  const { t } = useTranslation();
  return <View style={{ flex: 1, backgroundColor: c.bg }}>
    <Header back title={feature === 'ai' ? 'Copilot' : 'FNDRS Pro'} />
    <EmptyState
      icon={feature === 'ai' ? Bot : Crown}
      title={feature === 'ai' ? t('Copilot is not enabled yet') : t('Paid plans are not available yet')}
      message={feature === 'ai' ? t('You can continue building your profile and connecting with founders. Copilot will become available when the service is ready.') : t('You can use the free features. No subscription or payment is started here.')}
    />
  </View>;
}
