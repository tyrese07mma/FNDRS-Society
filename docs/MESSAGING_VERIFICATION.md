# Messaging verification — 27 September 2026

The additive migration `202609270001_idempotent_messages.sql` has been deployed (13 migrations total). `send_message` uses the caller's authenticated identity, retains existing RLS, rejects nonmembers/blocked peers and serializes each sender/request key before inserting. Retrying the same key and body returns the existing row without another insert notification. Reusing a key for changed content is rejected. Existing messages remain untouched; older insert clients can still omit the nullable key. Client inserts cannot override server timestamps or message IDs.

The app persists the last pending send per account/conversation before transmission. Reopening the chat restores its text and reuses the request key when retrying unchanged content. Native storage uses the existing SecureStore adapter; web uses local browser storage. Successful sends clear the attempt, so intentionally sending identical text again creates a new message. Realtime and HTTP responses reconcile by identity, not body text, and display in timestamp/ID order. A synchronous sending guard prevents double-tap submissions.

Limits: this preserves one attempted send per conversation, not unsent typing or a queue of several messages. Sending remains manual. Changing the body replaces the pending attempt. Storage failure stops transmission; corrupt local data is rejected. After confirmation the saved text is replaced by an acknowledgment without message content. Storage-clearing failures are reported without labeling the server-confirmed message as unsent. Physical device persistence/long-message storage, browser multi-tab behavior, socket reconnect recovery, read receipts and hosted two-account tests remain open. Storage deletion or an edited draft can lose retry identity; this is not a universal exactly-once guarantee.

Local PostgreSQL tests verify retry identity, rejection of changed payloads and outsiders, sender-scoped keys and denial of forged timestamps. Client tests exercise unchanged/changed retries, repeated message bodies and out-of-order reconciliation. Matching tests additionally verify one match/conversation on repeated interest, one XP award per match/community, and denial of direct XP/level/Founder Score changes. These checks do not establish a complete spam-resistance assessment or prove hosted concurrent transactions; the local SQL harness executes serially.

Rollback: restore the previous client insert adapter before dropping the new RPC. Keep the nullable column/index and stored request identities; no message deletion or table reset is needed.

## October 2 persistence checks

Tests recreate the outbox with the same backing store, verify account isolation and retry identity, confirm removal of saved content after acknowledgment, reject corrupt/full storage, and ensure late acknowledgments cannot erase a newer attempt. These are storage-adapter tests, not physical device tests.

## October 2 reconnect recovery

A successful channel subscription now invalidates thread history, conversation details/read state and inbox queries, including after interruption. Inbox and notification subscriptions also refresh on reconnect. The chat reports an interrupted live connection and offers retry for failed history loads. Lifecycle tests ensure duplicate SUBSCRIBED statuses do not repeatedly refetch, reconnects do refetch, and stopped subscriptions ignore later status callbacks. This verifies callback behavior, not a physical network-loss test. Read acknowledgments still require the separate hosted/device checks noted above.
