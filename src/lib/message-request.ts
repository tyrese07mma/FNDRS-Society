let sequence = 0;
/** Correlation only, never an authorization secret. Uniqueness is enforced in SQL. */
export function newMessageRequestId() {
  return `${Date.now().toString(36)}-${++sequence}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export type MessageAttempt = { conversation: string; body: string; requestId: string };
export function messageAttempt(previous: MessageAttempt | null, conversation: string, body: string): MessageAttempt {
  const trimmed = body.trim();
  return previous?.conversation === conversation && previous.body === trimmed
    ? previous
    : { conversation, body: trimmed, requestId: newMessageRequestId() };
}
