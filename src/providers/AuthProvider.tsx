import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

import { api } from '@/data';
import { BACKEND_CONFIGURED } from '@/lib/env';
import { hasPaidAccess } from '@/lib/subscription';
import { useNow } from '@/lib/useNow';
import { sb } from '@/data/supabase/client';
import { PreferencesSync } from './PreferencesSync';
import { qk } from '@/data/queries';
import type { Profile, Session, Subscription } from '@/data/types';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: Status;
  session: Session | null;
  userId: string | null;
  profile: Profile | null;
  /** True once we know where to route (auth, onboarding or app). */
  ready: boolean;
  profileError: Error | null;
  retryProfile: () => void;
  subscription: Subscription | null;
  isPro: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<Status>(BACKEND_CONFIGURED ? 'loading' : 'signedOut');
  const currentUser = useRef<string | null>(null);

  useEffect(() => {
    if (!BACKEND_CONFIGURED) return;
    let alive = true;
    let eventSeen = false;
    api
      .getSession()
      .then((s) => {
        if (!alive || eventSeen) return;
        currentUser.current = s?.userId ?? null;
        setSession(s);
        setStatus(s ? 'signedIn' : 'signedOut');
      })
      .catch(() => alive && !eventSeen && setStatus('signedOut'));

    const off = api.onAuthChange((s) => {
      if (!alive) return;
      eventSeen = true;
      const next = s?.userId ?? null;
      // Never leak one member's cached data into another member's session.
      if (currentUser.current !== next) qc.clear();
      currentUser.current = next;
      setSession(s);
      setStatus(s ? 'signedIn' : 'signedOut');
    });
    return () => {
      alive = false;
      off();
    };
  }, [qc]);

  useEffect(() => {
    if (!session) return;
    const channel = sb().channel('subscription:' + session.userId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: 'user_id=eq.' + session.userId }, () => {
        qc.invalidateQueries({ queryKey: qk.subscription });
      }).subscribe();
    return () => { void sb().removeChannel(channel); };
  }, [session, qc]);
  const now = useNow();
  const signedIn = status === 'signedIn';
  const me = useQuery({ queryKey: qk.me, queryFn: () => api.getMe(), enabled: signedIn, staleTime: 60_000, retry: 1 });
  const sub = useQuery({ queryKey: qk.subscription, queryFn: () => api.getSubscription(), enabled: signedIn, staleTime: 60_000 });

  const subscription = signedIn ? sub.data ?? null : null;
  const value: AuthState = {
    status,
    session,
    userId: session?.userId ?? null,
    profile: signedIn ? me.data ?? null : null,
    ready: status === 'signedOut' || (signedIn && !me.isPending),
    profileError: me.error,
    retryProfile: () => void me.refetch(),
    subscription,
    isPro: hasPaidAccess(subscription, now),
  };

  return <AuthContext.Provider value={value}><PreferencesSync userId={session?.userId ?? null} />{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** For screens that only render when signed in with a loaded profile. */
export function useMe(): Profile {
  const { profile } = useAuth();
  if (!profile) throw new Error('useMe() called without a loaded profile');
  return profile;
}
