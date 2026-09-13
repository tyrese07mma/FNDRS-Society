# Supabase deployment — 13 September 2026

Project: `echedxohsntgeijbxmsc` (FNDRS-Society).

The owner authorized the local CLI connection `FNDRS-local-deployment`. Supabase CLI 2.117.0 linked the project successfully. A dry run listed ten pending migrations. `db push` applied all ten successfully; `migration list --linked` subsequently confirmed matching local and remote versions, from `202609110001` through `202609130001`.

The `delete-account` Edge Function deployed successfully. Its authenticated deletion journey remains untested on the hosted service. AI and Stripe service setup is deferred by the owner; their database structures exist but their external integrations are not configured or verified.

The public project URL and publishable client key are stored in ignored `.env.local`. No service-role key or CLI access token is committed. The local app server on port 8090 was restarted with this configuration, without enabling the design-preview flag.

Read-only live checks:

- Auth settings respond successfully: email sign-up enabled, email confirmation required.
- An anonymous profile request returns an empty array. This alone does not prove isolation between authenticated accounts.
- Full hosted registration, confirmation, recovery, profile, matching, messaging, storage and deletion tests remain open. Auth redirect URLs and SMTP configuration still need review.

Use versioned CLI migrations for future database updates; do not replay the initial schema or reset the remote database. The temporary offline SQL installation bundle was not executed and is no longer needed.
