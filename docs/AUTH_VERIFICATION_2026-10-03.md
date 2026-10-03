# Authentication verification — 3 October 2026

Implemented: confirmation resend screen linked from signup, sign-in and failed confirmation callbacks; translated neutral confirmation copy; 60-second resend cooldown plus server rate limits; immediate ref guards on signup, login, password reset and password update. A replacement callback URL can be processed after a failed link; recovery failures offer a new recovery request.

Hosted synthetic test (`scripts/verify-auth-live.mjs`): 7 checks passed: unconfirmed login denied; signup token establishes session; own initial profile/onboarding state; confirmation cannot be reused; password login; recovery replaces old password; sign-out revokes refresh token. Generated account removed after ownership verification. Tokens/passwords were never logged. Admin-generated verification tokens were used: this does NOT prove public signup email delivery, SMTP, PKCE email callbacks or native navigation.

Owner supplied a test mailbox. One signup-resend request was accepted by Supabase. Acceptance neither proves an unconfirmed account exists nor proves delivery; no account was created or password selected for the owner. The address is deliberately omitted from versioned documentation.

Remote configuration freshly read: site_url remained http://localhost:3000, redirect list was empty, email confirmation enabled. A minimal config diff showed exactly one update. Deployed four exact redirects: fndrs://auth-callback, fndrs://auth-callback?next=reset-password, http://localhost:8090/auth-callback and its ?next=reset-password variant. Follow-up diff: zero pending updates; confirmation still enabled. Other remote settings were not changed. The isolated local config is outside the repository.

Pending: exact exp:// or exps:// address used by owner's Expo Go connection, to add only that callback; actual signup/confirmation/recovery email receipt and phone return; final public domain/site URL and production SMTP. A store scheme is not an Expo Go callback. Do not disable confirmation to work around missing redirects. Once testing ends, remove temporary local redirects before public release.

Validation: TypeScript and ESLint passed, existing 53 regression tests passed; three-platform Expo export succeeded on retry after a prior process returned 1 despite writing output. Final callback follow-up is checked by typecheck/lint; device confirmation is still pending.
