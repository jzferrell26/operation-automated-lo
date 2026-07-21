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

Run the local contract checks from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File supabase/scripts/validate-phase0.ps1
npx --yes supabase@2.109.1 start
npx --yes supabase@2.109.1 db reset --local
npx --yes supabase@2.109.1 test db --local supabase/tests
```

Do not run `supabase link`, `supabase db push --linked`, `supabase db reset
--linked`, or `supabase config push` from this scaffold. Those commands target
an external project and are outside Phase 0 authorization.

See [environment-contract.md](environment-contract.md) for the mandatory local,
preview, staging, and production separation rules.
