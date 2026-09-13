# Production implementation ledger

The supplied V2 source is preserved in the initial Git commit. The original ZIP and desktop V1 remain unchanged.

## Work sequence
1. Remove demo runtime and guard missing configuration; secure auth lifecycle and session cache.
2. Reproducible migrations, authorization tests, privacy, blocking, pagination and race-safe business rules.
3. AI authorization, quotas, usage, streaming and provider errors; Stripe idempotency and entitlement truth.
4. Persistent user settings, DE/EN localization, themes and native icon handling.
5. Install, lint, typecheck, business tests, database tests, exports, UI smoke tests, CI, documentation and GitHub.

## Initial findings
- Silent demo fallback and simulated users/messages/copilot in the production bundle.
- Paid access accepted incomplete or overdue subscriptions in the client; database also accepted overdue subscriptions.
- Password recovery has no callback/reset screen. Device secrets stored in AsyncStorage.
- SECURITY DEFINER read RPCs bypass private-community rules; profile location is directly readable despite preference.
- Swipe/RSVP limits lack transaction locks; resetting passes can reset quota.
- AI lacks application rate limits/usage accounting; Stripe ignores database write failures and webhook ordering.
- No migrations, test suite, CI or localization.

## Verification
- Baseline dependencies installed using npm ci --ignore-scripts.
- Live provider tests require real Supabase, Stripe test and Anthropic credentials; no credentials were supplied.
- Final completion is contingent on the remaining implementation and actual checks; this file is a work ledger, not a launch certificate.
