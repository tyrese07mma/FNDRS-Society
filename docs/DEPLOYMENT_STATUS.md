# Supabase deployment — 13 September 2026

## Owner preference — 21 September 2026

Paid AI setup remains deferred at the owner’s request. The function exists, but no provider credentials or paid usage have been configured by this continuation. The historical setup request below is not a current requirement for the owner.

## AI update — 19 September 2026

The owner resumed AI setup. The hosted `copilot` function is now deployed. It requires an explicit `AI_MODEL`, rather than guessing a model ID, and authenticates requests before checking provider availability. Secret-name inspection found neither `ANTHROPIC_API_KEY` nor `AI_MODEL`; the owner has been asked to configure both directly in Supabase. No provider call or successful generated answer has been verified. All 32 local tests pass; they do not substitute for the missing authenticated provider integration test.

Project: `echedxohsntgeijbxmsc` (FNDRS-Society).

The owner authorized the local CLI connection `FNDRS-local-deployment`. Supabase CLI 2.117.0 linked the project successfully. A dry run listed ten pending migrations. `db push` applied all ten successfully; `migration list --linked` subsequently confirmed matching local and remote versions, from `202609110001` through `202609130001`.

The `delete-account` Edge Function deployed successfully. Its authenticated deletion journey remains untested on the hosted service. AI and Stripe service setup is deferred by the owner; their database structures exist but their external integrations are not configured or verified.

The public project URL and publishable client key are stored in ignored `.env.local`. No service-role key or CLI access token is committed. The local app server on port 8090 was restarted with this configuration, without enabling the design-preview flag.

Read-only live checks:

- Auth settings respond successfully: email sign-up enabled, email confirmation required.
- An anonymous profile request returns an empty array. This alone does not prove isolation between authenticated accounts.
- Full hosted registration, confirmation, recovery, profile, matching, messaging, storage and deletion tests remain open. Auth redirect URLs and SMTP configuration still need review.

Dashboard review found the Auth Site URL still set to `http://localhost:3000`, with no redirect allowlist entries. Updating these to the app on port 8090 and its native callback is awaiting owner confirmation. Email templates use Supabase's built-in delivery service; custom production SMTP is not configured. These are concrete blockers for production email authentication, not verified working journeys.

Use versioned CLI migrations for future database updates; do not replay the initial schema or reset the remote database. The temporary offline SQL installation bundle was not executed and is no longer needed.

## Deployment update — 21 September 2026

Migration `202609210001_ranked_feed.sql` was applied successfully after a dry run showed exactly that pending migration. Eleven migrations are now recorded as deployed. The new authenticated feed RPC orders trending posts by likes and uses rank/time/ID pagination while enforcing post visibility. Old clients retain the previous RPC. Local SQL tests cover ranking, ties, private-post exclusion and anonymous access; they are not a hosted two-account integration test.

The app defaults AI and billing availability to false. No paid provider credentials or products were enabled. Public release configuration remains incomplete; see IMPLEMENTATION_STATUS.md.
