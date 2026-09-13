import type { Subscription } from '../data/types';
export function hasPaidAccess(subscription: Subscription | null, now = Date.now()): boolean {
  if (!subscription || subscription.tier === 'free') return false;
  if (subscription.status !== 'active' && subscription.status !== 'trialing') return false;
  return !!subscription.current_period_end && Date.parse(subscription.current_period_end) > now;
}
