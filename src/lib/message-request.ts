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

type DraftStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

/** Persist before transmitting. An uncertain send must keep its retry identity. */
export function createMessageOutbox(storage: DraftStorage) {
  const key = (owner: string, conversation: string) => {
    if (!/^[a-zA-Z0-9-]+$/.test(owner) || !/^[a-zA-Z0-9-]+$/.test(conversation)) throw new Error('Invalid draft owner');
    return `fndrs.message.${owner}.${conversation}`;
  };
  async function read(owner: string, conversation: string): Promise<MessageAttempt | null> {
    const raw = await storage.getItem(key(owner, conversation));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.version !== 1 || data.owner !== owner || data.conversation !== conversation) throw new Error('Invalid draft');
    if (data.status === 'sent') return null;
    if (data.status !== 'pending' || typeof data.body !== 'string' || data.body.length > 4000 ||
        typeof data.requestId !== 'string' || !data.requestId || data.requestId.length > 128) throw new Error('Invalid draft');
    return { conversation, body: data.body, requestId: data.requestId };
  }
  return {
    read,
    async prepare(owner: string, conversation: string, body: string) {
      if (!body.trim() || body.trim().length > 4000) throw new Error('Invalid message');
      const attempt = messageAttempt(await read(owner, conversation), conversation, body);
      await storage.setItem(key(owner, conversation), JSON.stringify({ ...attempt, version: 1, owner, status: 'pending' }));
      return attempt;
    },
    async confirm(owner: string, attempt: MessageAttempt) {
      const current = await read(owner, attempt.conversation);
      if (current?.requestId !== attempt.requestId) return;
      // Remove private content while retaining an explicit acknowledged state.
      await storage.setItem(key(owner, attempt.conversation), JSON.stringify({ version: 1, owner, conversation: attempt.conversation, status: 'sent' }));
    },
  };
}
