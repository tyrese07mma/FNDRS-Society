import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { qk, useCheckout, useManageSubscription } from '@/data/queries';
import type { SubTier } from '@/data/types';
import { appLink } from '@/lib/share';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from '@/state/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Badge, Button, Card, Header, SegmentedControl, Text } from '@/ui';
import { Check, ChevronDown, Crown, Minus, Sparkles } from '@/ui/icons';

type Paid = Exclude<SubTier, 'free'>;
type Cycle = 'month' | 'year';

const PLANS: { tier: Paid; name: string; tagline: string; month: number; year: number; popular?: boolean }[] = [
  { tier: 'pro', name: 'Pro', tagline: 'For founders actively building a team', month: 19, year: 15, popular: true },
  { tier: 'business', name: 'Business Pro', tagline: 'For startup teams and agencies', month: 49, year: 39 },
  { tier: 'investor_plus', name: 'Investor+', tagline: 'For angels and funds sourcing deal flow', month: 99, year: 79 },
];

type Cell = boolean | string;
const FEATURES: { label: string; free: Cell; pro: Cell; business: Cell; investor_plus: Cell }[] = [
  { label: 'Smart Match swipes', free: '25 / day', pro: 'Unlimited', business: 'Unlimited', investor_plus: 'Unlimited' },
  { label: 'Warm investor intros', free: false, pro: true, business: true, investor_plus: true },
  { label: 'Who viewed your profile', free: false, pro: true, business: true, investor_plus: true },
  { label: '30-day analytics', free: false, pro: true, business: true, investor_plus: true },
  { label: 'Boost in search & match', free: false, pro: '3×', business: '5×', investor_plus: '5×' },
  { label: 'Team profiles', free: false, pro: false, business: 'Up to 5', investor_plus: 'Up to 5' },
  { label: 'Verified company badge', free: false, pro: false, business: true, investor_plus: true },
  { label: 'Deal-flow inbox & filters', free: false, pro: false, business: false, investor_plus: true },
  { label: 'Concierge introductions', free: false, pro: false, business: false, investor_plus: true },
];

const FAQ = [
  ['Can I cancel anytime?', 'Yes. Cancel in Settings → Subscription and keep access until the end of the billing period.'],
  ['What happens after the trial?', 'Your plan starts after 7 days unless you cancel. We remind you two days before.'],
  ['Do you offer startup discounts?', 'Members of partner accelerators get 50% off Business Pro — ask us via Help.'],
];

function CellView({ v }: { v: Cell }) {
  const { c } = useTheme();
  if (v === true) return <Check size={16} color={c.success} strokeWidth={2.6} />;
  if (v === false) return <Minus size={16} color={c.textFaint} />;
  return <Text variant="mono" style={{ fontSize: 11 }} align="center">{v}</Text>;
}

export default function Premium() {
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const params = useLocalSearchParams<{ status?: string }>();
  const { isPro, subscription } = useAuth();
  const checkout = useCheckout();
  const manage = useManageSubscription();
  const [cycle, setCycle] = useState<Cycle>('year');
  const [tier, setTier] = useState<Paid>('pro');
  const [faq, setFaq] = useState<number | null>(null);
  const plan = PLANS.find((p) => p.tier === tier)!;
  const price = plan[cycle];

  useEffect(() => {
    if (params.status === 'success') {
      toast.accent('Welcome to Pro ✨', 'Your 7-day trial has started.');
      qc.invalidateQueries({ queryKey: qk.subscription });
    } else if (params.status === 'cancel') {
      toast.show('Checkout cancelled');
    }
  }, [params.status, qc]);

  const subscribe = async () => {
    try {
      const res = await checkout.mutateAsync({ tier, cycle });
      if (res.url) {
        await WebBrowser.openAuthSessionAsync(res.url, appLink('/premium'));
        qc.invalidateQueries({ queryKey: qk.subscription });
      } else if (res.activated) {
        toast.accent('Welcome to FNDRS Pro ✨', 'Demo: your 7-day trial is active.');
        router.back();
      }
    } catch {
      // toast via mutation cache
    }
  };

  const manageSub = async () => {
    try {
      const res = await manage.mutateAsync();
      if (res.url) await WebBrowser.openBrowserAsync(res.url);
      else if (res.canceled) toast.show('Subscription cancelled', 'Demo: you are back on the free plan.');
    } catch {
      // toast via mutation cache
    }
  };

  const currentPlan = PLANS.find((p) => p.tier === subscription?.tier);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header modal title="FNDRS Pro" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 22, paddingBottom: 150 + insets.bottom, width: '100%', maxWidth: 680, alignSelf: 'center' }}>
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 8 }}>
          <LinearGradient colors={c.gold} style={{ width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 14px 36px rgba(203,169,104,0.35)' }}>
            <Crown size={30} color={c.onAccent} />
          </LinearGradient>
          <Text variant="largeTitle" align="center">Build with an edge.</Text>
          <Text variant="callout" color="textMuted" align="center" style={{ maxWidth: 340 }}>
            Unlimited matches, warm intros to investors and the insight to know what is working.
          </Text>
        </View>

        {isPro && subscription && (
          <Card variant="accent" style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color={c.accentText} />
              <Text variant="headline" style={{ flex: 1 }}>You are on {currentPlan?.name ?? 'Pro'}</Text>
              <Badge tone="accent">{subscription.status === 'trialing' ? 'Trial' : 'Active'}</Badge>
            </View>
            {!!subscription.current_period_end && (
              <Text variant="footnote" color="textMuted">
                {subscription.status === 'trialing' ? 'Trial ends' : 'Renews'}{' '}
                {new Date(subscription.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            )}
            <Button title="Manage subscription" variant="secondary" size="sm" style={{ alignSelf: 'flex-start' }} loading={manage.isPending} onPress={manageSub} />
          </Card>
        )}

        <SegmentedControl<Cycle>
          value={cycle}
          onChange={setCycle}
          options={[
            { value: 'month', label: 'Monthly' },
            { value: 'year', label: 'Yearly · save 20%' },
          ]}
        />

        <View style={{ gap: 10 }}>
          {PLANS.map((p) => {
            const on = tier === p.tier;
            return (
              <Pressable
                key={p.tier}
                onPress={() => setTier(p.tier)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={{ padding: 16, gap: 6, borderRadius: radius.lg, borderWidth: 1.5, borderColor: on ? c.accent : c.hairline, backgroundColor: on ? c.accentSoft : c.card }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? c.accentText : c.tint20, alignItems: 'center', justifyContent: 'center' }}>
                    {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.accentText }} />}
                  </View>
                  <Text variant="title3" style={{ flex: 1 }}>{p.name}</Text>
                  {p.popular && <Badge tone="accent">Most popular</Badge>}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginLeft: 30 }}>
                  <Text variant="footnote" color="textSubtle" style={{ flex: 1 }}>{p.tagline}</Text>
                  <Text variant="number">
                    €{p[cycle]}
                    <Text variant="caption" color="textSubtle">/mo</Text>
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: 10 }}>
          <Text variant="label" color="textSubtle">WHAT YOU GET WITH {plan.name.toUpperCase()}</Text>
          {FEATURES.filter((f) => f[tier] !== false).map((f) => (
            <View key={f.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Check size={16} color={c.accentText} strokeWidth={2.6} />
              <Text variant="callout" style={{ flex: 1 }}>{f.label}</Text>
              {typeof f[tier] === 'string' && <Text variant="mono" color="textSubtle">{f[tier] as string}</Text>}
            </View>
          ))}
        </View>

        <View style={{ gap: 10 }}>
          <Text variant="label" color="textSubtle">COMPARE PLANS</Text>
          <Card padded={false}>
            <View style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: c.hairline }}>
              <Text variant="caption" color="textSubtle" style={{ flex: 1.6 }}> </Text>
              {['Free', 'Pro', 'Business', 'Inv+'].map((h) => (
                <Text key={h} variant="label" color="textSubtle" align="center" style={{ flex: 1, fontSize: 10 }}>{h.toUpperCase()}</Text>
              ))}
            </View>
            {FEATURES.map((f, i) => (
              <View key={f.label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12, borderBottomWidth: i === FEATURES.length - 1 ? 0 : 1, borderBottomColor: c.hairline }}>
                <Text variant="caption" style={{ flex: 1.6 }}>{f.label}</Text>
                {(['free', 'pro', 'business', 'investor_plus'] as const).map((k) => (
                  <View key={k} style={{ flex: 1, alignItems: 'center' }}>
                    <CellView v={f[k]} />
                  </View>
                ))}
              </View>
            ))}
          </Card>
        </View>

        <View style={{ gap: 8 }}>
          <Text variant="label" color="textSubtle">QUESTIONS</Text>
          {FAQ.map(([q, a], i) => (
            <Pressable
              key={q}
              onPress={() => setFaq(faq === i ? null : i)}
              accessibilityRole="button"
              accessibilityState={{ expanded: faq === i }}
              style={{ padding: 14, gap: 8, borderRadius: radius.md, backgroundColor: c.card, borderWidth: 1, borderColor: c.hairline }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text variant="headline" style={{ flex: 1 }}>{q}</Text>
                <View style={{ transform: [{ rotate: faq === i ? '180deg' : '0deg' }] }}>
                  <ChevronDown size={16} color={c.textSubtle} />
                </View>
              </View>
              {faq === i && <Text variant="footnote" color="textMuted">{a}</Text>}
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {!(isPro && subscription?.tier === tier) && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.hairline, gap: 8 }}>
          <Button
            title={isPro ? `Switch to ${plan.name}` : 'Start 7-day free trial'}
            variant="accent"
            size="lg"
            block
            icon={Sparkles}
            loading={checkout.isPending}
            onPress={subscribe}
            style={{ width: '100%', maxWidth: 680, alignSelf: 'center' }}
          />
          <Text variant="caption" color="textSubtle" align="center">
            Then €{price}/month{cycle === 'year' ? `, billed €${price * 12} yearly` : ''} · cancel anytime
          </Text>
        </View>
      )}
    </View>
  );
}
