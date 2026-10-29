# Restoring the Supabase backend

On 2026-10-29 the hosted Supabase project **Momentum** (ref `vbaorstzcvqyytbyqayw`)
was slated for deletion. No data was kept. This file is everything needed to
bring the backend back up.

## What is saved

[`schema.sql`](schema.sql) is a full structure dump of the live database
(`supabase db dump`), taken right before deletion:

- Tables: `profiles`, `charges`, `check_ins`, `routines`, `tasks`
- View: `commitments`
- Functions: `handle_new_user`, `handle_updated_at`, `rls_auto_enable`
- Triggers: `on_profiles_updated`, and `on_auth_user_created` on `auth.users`
  (creates the `profiles` row on signup; appended by hand because the
  public-schema dump skips it)
- All 13 RLS policies, grants, and extensions (`pg_cron`, `pg_net`, `pgcrypto`, …)

It was test-restored into a fresh local Supabase database: it applied with no
errors and a new auth user got its `profiles` row.

`schema.sql` already includes everything in [`migrations/`](migrations/), so
**do not** run those migrations on top of it. They are history only.

Not used, so nothing to restore: Supabase Storage, `pg_cron` jobs (billing runs
on AWS EventBridge), and the edge functions in [`functions/`](functions/)
(replaced by the AWS Lambdas in `aws/`).

## Restore steps

1. **Create a new Supabase project.**
2. **Load the schema.** Paste `schema.sql` into the SQL Editor and run it, or:
   ```bash
   psql "<new-project-connection-string>" -f supabase/schema.sql
   ```
3. **Configure Auth** (dashboard → Authentication). The app uses email +
   password only (`signUp` / `signInWithPassword`). Set:
   - whether email confirmation is required
   - Site URL / redirect URLs (the app scheme is `stalld://`)
   - email templates / custom SMTP, if wanted
   - **asymmetric JWT signing keys enabled.** The AWS authorizer verifies tokens
     against `<SUPABASE_URL>/auth/v1/.well-known/jwks.json`, which needs them.
4. **Point the app at the new project:** set `EXPO_PUBLIC_SUPABASE_URL` and
   `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env` and in the EAS profiles.
5. **Point AWS at the new project:**
   - update `supabaseUrl` in [`aws/lib/config.ts`](../aws/lib/config.ts)
     (or export `SUPABASE_URL` when deploying)
   - put the new service-role key in Secrets Manager:
     ```bash
     aws secretsmanager put-secret-value --secret-id /stalld/dev/supabase-service-role-key --secret-string '<new-service-role-key>'
     ```
   - redeploy: `npm run deploy:dev` in `aws/` (see [`aws/README.md`](../aws/README.md))
6. **Relink the CLI** (optional): `supabase link --project-ref <new-ref>`.

Stripe needs no changes: its webhook points at the AWS API, not Supabase.
