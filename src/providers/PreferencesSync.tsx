import { useEffect } from 'react';
import { sb } from '@/data/supabase/client';
import { useSettings, type ThemeMode, type NotificationPrefs } from '@/state/settings';
import { toast } from '@/state/toast';

const prefs = () => {
  const { theme, notifications } = useSettings.getState();
  return { theme, notifications };
};
/** User-owned preferences are kept on the server; search history remains device-only. */
export function PreferencesSync({ userId }: { userId: string | null }) {
  useEffect(() => {
    if (!userId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe = () => {};
    const initial = JSON.stringify(prefs());
    const save = async () => {
      if (!active) return;
      const { error } = await sb().from('user_settings').upsert({ user_id: userId, ...prefs(), updated_at: new Date().toISOString() });
      if (error && active) toast.error('Settings were not synced', 'Please check your connection and try again.');
    };
    void (async () => {
      const { data, error } = await sb().from('user_settings').select('theme,notifications').eq('user_id', userId).maybeSingle();
      if (!active) return;
      if (error) throw error;
      if (data && initial === JSON.stringify(prefs())) {
        const modes: ThemeMode[] = ['system', 'light', 'dark'];
        const old = useSettings.getState().notifications;
        const notifications = { ...old };
        for (const key of Object.keys(old) as (keyof NotificationPrefs)[]) {
          if (typeof data.notifications?.[key] === 'boolean') notifications[key] = data.notifications[key];
        }
        useSettings.setState({ theme: modes.includes(data.theme) ? data.theme : 'system', notifications });
      } else if (!data || initial !== JSON.stringify(prefs())) await save();
      let previous = JSON.stringify(prefs());
      unsubscribe = useSettings.subscribe(() => {
        const next = JSON.stringify(prefs());
        if (next === previous) return;
        previous = next;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { void save(); }, 300);
      });
    })().catch(() => { if (active) toast.error('Settings could not be loaded', 'Your device preferences are still available.'); });
    return () => { active = false; unsubscribe(); if (timer) clearTimeout(timer); };
  }, [userId]);
  return null;
}
