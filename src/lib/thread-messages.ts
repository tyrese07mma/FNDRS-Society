import type { Message } from '../data/types';

/** Realtime and HTTP may arrive in either order; reconcile by identity, not text. */
export function mergeThreadMessages(current: Message[], incoming: Message[]): Message[] {
  const rows = new Map(current.map(message => [message.id, message]));
  for (const message of incoming) {
    if (!message.pending && message.client_request_id) {
      for (const [id, pending] of rows) {
        if (pending.pending && pending.sender_id === message.sender_id &&
            pending.client_request_id === message.client_request_id) rows.delete(id);
      }
    }
    rows.set(message.id, message);
  }
  return [...rows.values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}
