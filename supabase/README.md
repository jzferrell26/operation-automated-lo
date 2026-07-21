# Local Supabase scaffold, Phase 0

This directory is an unlinked, local-only Supabase scaffold. It contains no
production schema, migration, runtime role, RLS policy, tenant record, OAuth
table, provider operation, project reference, external URL, credential, or
production data path.

The local stack uses its own `55420` through `55429` port block. Configured
services use `55420` for the shadow database, `55421` for the API, `55422` for
Postgres, `55423` for Studio, `55424` through `55426` for local mail, and
`55429` for the transaction pooler.

`seed.sql` is intentionally data-less and self-identifies as synthetic-only.
The pgTAP test proves that the Phase 0 local database has not acquired the
named production tables.

Run the canonical local database verification from the repository root:

```powershell
pnpm test:db
```

The cross-platform Node runner uses Supabase CLI `2.109.1`, recreates the local database from every migration, runs each `supabase/tests/*.pgtap.sql` file, and stops the stack without preserving database state. CI invokes the same command. Docker must be available, but no linked project, access token, production URL, or production secret is used.

Do not run `supabase link`, `supabase db push --linked`, `supabase db reset
--linked`, or `supabase config push` from this scaffold. Those commands target
an external project and are outside Phase 0 authorization.

See [environment-contract.md](environment-contract.md) for the mandatory local,
preview, staging, and production separation rules.
