import { useEffect } from 'react';
import { AppState } from 'react-native';
import { sb } from '@/data/supabase/client';
import { useSettings, type ThemeMode, type NotificationPrefs } from '@/state/settings';
import { toast } from '@/state/toast';

const prefs = () => {
  const { theme, haptics, notifications, filters } = useSettings.getState();
  return { theme, haptics, notifications, filters };
};

/** Serial writes preserve the newest local changes across slow/offline responses. */
export function PreferencesSync({ userId }: { userId: string | null }) {
  const hydrated = useSettings(s => s.hydrated);
  useEffect(() => {
    if (!hydrated) return;
    useSettings.getState().activateAccount(userId);
    if (!userId) return;
    let active = true;
    let loading = true;
    let reading = false;
    let saving = false;
    let warned = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const current = () => active && useSettings.getState().ownerId === userId;
    const save = async () => {
      if (!current() || loading || saving || !useSettings.getState().dirty) return;
      saving = true;
      try {
        while (current() && useSettings.getState().dirty) {
          const snapshot = prefs();
          const serialized = JSON.stringify(snapshot);
          const { filters, ...settings } = snapshot;
          const { error } = await sb().from('user_settings').upsert({ user_id: userId, ...settings, updated_at: new Date().toISOString() });
          if (error) throw error;
          if (!current()) return;
          const { error: filterError } = await sb().from('match_preferences').upsert({ user_id: userId, roles: filters.roles, stages: filters.stages, industries: filters.industries, min_score: filters.minScore, updated_at: new Date().toISOString() });
          if (filterError) throw filterError;
          if (current() && serialized === JSON.stringify(prefs())) useSettings.setState({ dirty: false });
        }
        warned = false;
      } catch {
        if (current() && !warned) { warned = true; toast.error('Settings are saved on this device', 'Cloud sync will retry when your connection returns.'); }
      } finally { saving = false; }
    };
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void save(); }, 300);
    };
    const unsubscribe = useSettings.subscribe((state, previous) => {
      if (state.dirty && (state.dirty !== previous.dirty || JSON.stringify(prefs()) !== JSON.stringify({ theme: previous.theme, haptics: previous.haptics, notifications: previous.notifications, filters: previous.filters }))) schedule();
    });
    const load = async () => {
      if (reading || !current()) return;
      reading = true;
      try {
        const [settings, match] = await Promise.all([
          sb().from('user_settings').select('theme,haptics,notifications').eq('user_id', userId).maybeSingle(),
          sb().from('match_preferences').select('roles,stages,industries,min_score').eq('user_id', userId).maybeSingle(),
        ]);
        if (!current()) return;
        if (settings.error || match.error) throw settings.error || match.error;
        if (!useSettings.getState().dirty) {
          const modes: ThemeMode[] = ['system', 'light', 'dark'];
          const notifications = { matches: true, messages: true, events: true, digest: false };
          for (const key of Object.keys(notifications) as (keyof NotificationPrefs)[]) {
            if (typeof settings.data?.notifications?.[key] === 'boolean') notifications[key] = settings.data.notifications[key];
          }
          useSettings.setState({
            theme: modes.includes(settings.data?.theme) ? settings.data!.theme : 'system',
            haptics: settings.data?.haptics ?? true,
            notifications,
            filters: match.data ? { roles: match.data.roles, stages: match.data.stages, industries: match.data.industries, minScore: match.data.min_score } : { roles: [], stages: [], industries: [], minScore: 0 },
            dirty: !settings.data || !match.data,
          });
        }
        loading = false;
        await save();
      } catch {
        if (current() && !warned) { warned = true; toast.error('Settings could not be synced', 'Your device preferences remain available. We will retry.'); }
      } finally { reading = false; }
    };
    void load();
    const retry = () => { if (!current()) return; if (loading) void load(); else void save(); };
    const appState = AppState.addEventListener('change', state => { if (state === 'active') retry(); });
    const interval = setInterval(retry, 30000);
    return () => { active = false; unsubscribe(); appState.remove(); clearInterval(interval); if (timer) clearTimeout(timer); };
  }, [userId, hydrated]);
  return null;
}
