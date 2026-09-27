# Messaging verification — 27 September 2026

The additive migration `202609270001_idempotent_messages.sql` has been deployed (13 migrations total). `send_message` uses the caller's authenticated identity, retains existing RLS, rejects nonmembers/blocked peers and serializes each sender/request key before inserting. Retrying the same key and body returns the existing row without another insert notification. Reusing a key for changed content is rejected. Existing messages remain untouched; older insert clients can still omit the nullable key. Client inserts cannot override server timestamps or message IDs.

The app retains the last failed request key in the mounted chat, along with the text draft. Retrying unchanged content in that chat uses the same key. Successful sends clear the attempt, so intentionally sending identical text again creates a new message. Realtime and HTTP responses reconcile by identity, not body text, and display in timestamp/ID order. A synchronous sending guard prevents double-tap submissions.

Limits: pending attempts are not a persistent offline outbox. Leaving the chat/restarting loses the local attempt key and draft. Stored messages remain in Supabase. Lost responses across restart, socket reconnect recovery, read-receipt failures and a hosted two-account/device test still need verification. No claim of exactly-once delivery across app restarts.

Local PostgreSQL tests verify retry identity, rejection of changed payloads and outsiders, sender-scoped keys and denial of forged timestamps. Client tests exercise unchanged/changed retries, repeated message bodies and out-of-order reconciliation. Matching tests additionally verify one match/conversation on repeated interest, one XP award per match/community, and denial of direct XP/level/Founder Score changes. These checks do not establish a complete spam-resistance assessment or prove hosted concurrent transactions; the local SQL harness executes serially.

Rollback: restore the previous client insert adapter before dropping the new RPC. Keep the nullable column/index and stored request identities; no message deletion or table reset is needed.
