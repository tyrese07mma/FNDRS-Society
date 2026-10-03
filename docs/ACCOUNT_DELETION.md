# Account deletion

The authenticated `delete-account` Edge Function requires the current password. It verifies the password against the same user ID, then acquires a database lease shared with checkout. The application currently uses email/password accounts; a future OAuth sign-in method needs a corresponding reauthentication flow.

Deletion marks the account as pending, pauses discovery and rejects new writes on the main user-content tables and avatar uploads. It removes the Stripe customer (which cancels active subscriptions), deletes avatar bytes through the Storage API, and finally calls the Supabase Auth admin deletion API. Foreign-key cascades remove the application's user-linked records.

No real user account is deleted by the local tests. Tests cover database permissions/leases and paged/nested image cleanup using a test storage implementation. Live Auth, Storage and Stripe behavior still requires staging validation.

## Failure and retry

The account remains pending when an external step fails. The user can retry from Account security with their password; checkout remains disabled. Already-deleted Stripe customers are skipped, and image cleanup continues from the remaining objects. Account deletion is only reported successful after the Auth admin API succeeds. A network error after that final step may require signing out and attempting to sign in to confirm the account no longer exists.

The operation lease expires after five minutes if the Edge Function is interrupted. A failed cleanup can therefore be retried after the lease expires. The pending marker is deliberately not removed automatically because billing or storage cleanup might already have happened. Operations staff should complete the same cleanup sequence, not restore the account without investigating partial effects.

Late Stripe events for removed customers are acknowledged using a server-only table of Stripe customer IDs and deletion timestamps; it contains no user IDs, names or emails. Define and document the retention period for these tombstones before release. Stripe may retain historical transaction records separately from the app.

## Sources

- [Stripe customer deletion](https://docs.stripe.com/api/customers/delete?lang=node)
- [Supabase Storage deletion must use the Storage API](https://supabase.com/docs/guides/storage/management/delete-objects)
- [Supabase user deletion and Storage ownership](https://supabase.com/docs/guides/auth/managing-user-data)
