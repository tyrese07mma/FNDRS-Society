/** Resync once per successful subscription, including after a disconnect. */
export function realtimeLifecycle(onReady: () => void, onInterrupted?: () => void) {
  let active = true;
  let ready = false;
  return {
    status(status: string) {
      if (!active) return;
      if (status === 'SUBSCRIBED') {
        if (!ready) { ready = true; onReady(); }
      } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
        ready = false;
        onInterrupted?.();
      }
    },
    stop() { active = false; },
  };
}
