# Hosted two-account verification — 2 October 2026

Target: existing FNDRS Supabase project `echedxohsntgeijbxmsc`. Runner: `scripts/verify-live.mjs`. This is an opt-in live test, never part of automatic CI. Credentials remain in memory; no keys/passwords are written to reports. Each run creates unique synthetic accounts carrying a run marker. Cleanup verifies the marker and exact generated email before deleting only these accounts.

## Initial run: defect reproduced

Two independent logins and profile propagation/foreign-write isolation passed. Post creation using the same `INSERT ... RETURNING id` pattern as the app failed with 42501. Both generated accounts were removed through the deployed `delete-account` function. Cleanup completed.

The failure was then reproduced locally with an authenticated PostgreSQL regression test. The SELECT policy called a STABLE function that reread the posts table by ID. During INSERT RETURNING, that lookup did not see the new row, so the policy rejected it.

Migration `202610020001_post_returning_visibility.sql` evaluates visibility using the row's author/community values. Existing blocked-user/private-community requirements are retained. No data is rewritten or removed. The migration was deployed after a dry run showed exactly this pending version (14 migrations deployed total).

## Second run: 11 checks passed, zero failures

1. Two independently authenticated synthetic accounts.
2. User B sees A's profile update and cannot modify A's profile.
3. A creates a post; B reads and likes it, follows A; the like count persists.
4. Mutual swipes create a matched conversation.
5. B receives A's message through hosted Realtime; two concurrent identical send requests return one message ID.
6. Read receipt is stored and visible to the other participant.
7. A new client and fresh login can retrieve the saved message history.
8. Own-avatar upload succeeds; the other account cannot overwrite it.
9. Blocking prevents another message in the existing conversation.
10. Account A is deleted through the deployed password-confirmed deletion function.
11. Account B is deleted through the same function.

Both generated Auth users were then confirmed absent. Cleanup completed. Detailed local reports and fixture manifests are outside the repository under `work/live-verification-2026-10-02*`; they contain no passwords/tokens. The second run exited successfully.

## Limits

These are direct SDK/API checks with real services, not UI or device tests. Accounts were administratively confirmed, so this does not test signup email delivery, email confirmation, password recovery, SMTP or auth redirects. No paid AI or Stripe was enabled. Deletion covered free accounts and an uploaded avatar, not paid subscription cancellation. Fresh-client login is not a physical device restart. Realtime delivery was tested, not an actual network disconnect/reconnect. Browser/device outbox persistence, accessibility, runtime-error reproduction and the remaining release checklist still require verification.

## Re-running deliberately

Provide `FNDRS_LIVE_TEST_PROJECT` with the exact project above, `FNDRS_TEST_CLI` with an authenticated Supabase CLI executable, and `FNDRS_TEST_OUTPUT` with a dedicated local output directory, then run `node scripts/verify-live.mjs`. This creates temporary visible test content and removes it through run-owned account cleanup. Do not run against a different project by editing the guard without reviewing scope. If cleanup reports failure, use the recorded fixture IDs and ownership marker to investigate; never delete unrelated users.

## Follow-up — 3 October

Added inbox RPC and notification actor-join/read assertions. First run: Realtime delivery timeout, 6 checks passed including both cleanups. Second run: 13 passed, 0 failed, both generated accounts removed. Reports: work/live-verification-2026-10-03 and work/live-verification-2026-10-03-run2. The intermittent delivery timeout needs further investigation; SDK success does not resolve the reported screen error.
