# Block management and data export

## Blocking

Members can block someone from their profile or chat menu and manage their list in Settings → Blocked members. Blocking removes both directions of follows, reciprocal matches and previous swipes. It prevents new follows, matches, conversations and messages in existing conversations. Existing message history remains available. Unblocking removes only the caller's block and does not restore former relationships. A block in the opposite direction continues to apply.

Migration `202609120003_block_management.sql` implements pair locks, triggers, the owner-only management RPCs and a restrictive profile read policy. Public discovery queries no longer return blocked profiles. The management list is paginated at 50 rows. Existing conversation history can still include names and metadata. This is a contact restriction, not erasure of another person's historical records. Hosted Realtime authorization and simultaneous requests still need device/staging verification.

## Export

Settings → Export my data prepares a JSON file and exposes a separate save action. Web uses a browser download. iOS/Android uses the native file share sheet; a temporary cache file is deleted after the share operation returns. Exports are not uploaded to an external file host or persisted in query caches.

Migration `202609120004_data_export.sql` exposes a fixed set of datasets. Identity comes exclusively from the authenticated session, with no target-user parameter. Each request returns at most 100 rows and an opaque cursor. The client checks the account before and after every page and before saving, and discards a run after navigation or an account change. A server rate limit bounds requests. Repeated cursors and oversized exports fail explicitly instead of producing a success file with omitted rows.

Included: email/account ID, profile and hidden location, settings, matching preferences, subscription state, authored posts/comments/messages, Copilot history and usage, own notification records, XP, owned startups/events/opportunities, own reports/requests/bookings, saved items, memberships, applications, matches, follows and conversation metadata. It excludes passwords, tokens, payment-provider IDs, incoming messages, media binaries and administrative records. Large exports above 10 million serialized characters require an assisted export through support. This is not a transactional snapshot across pages: concurrent edits or deletions may affect the result. These boundaries are disclosed in the interface where relevant; it is not a claim of a legally complete response to every access request.

## Verification

PostgreSQL tests cover both directions of blocking, existing-chat send rejection, connection removal, unblocking ownership, discovery filtering and dataset ownership. Collector tests cover pagination, account switching and repeated cursors. Type checking and static checks cover the screens and native file APIs. Actual download/share behavior, screen layout, concurrent database sessions and hosted service flows still require integration testing before release.
