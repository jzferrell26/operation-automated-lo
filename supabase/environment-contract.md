# Phase 0 environment separation contract

This file is environment metadata, not deployment configuration. It contains no
Supabase project reference, URL, access token, connection string, or credential.
Deployment ownership remains with the delivery phase. Operator steps to create
cloud projects and connect them to this repository live in
`docs/operations/cloud-environment-setup.md`.

| Environment | Database target | Permitted data | Provider behavior | Phase 0 boundary |
| --- | --- | --- | --- | --- |
| Local | Unlinked Supabase CLI stack | Synthetic-only, data-less seed at this phase | No provider connection | Run only from the local `supabase/` configuration. |
| Preview | Ephemeral Supabase preview branch | Data-less or synthetic-only fixtures | Stubs only | Never link, clone, restore, or seed production data. |
| Staging | Separate staging project, assigned later | Synthetic test fixtures only | Fixed contract-test accounts only after explicit authorization | No customer data, production credentials, or production provider writes. |
| Production | Separate production project, not configured in Phase 0 | Production data only after G1 through G8 are resolved | Authorized production integrations only after launch approval | Never shared with local, preview, or staging. |

## Required invariants

1. Local, preview, staging, and production have separate database, secret,
   provider, storage, and task identities.
2. Preview branches start data-less. Any fixture is synthetic and has no
   production identifier, customer information, provider credential, or spend
   capability.
3. Production data must never be copied, restored, or seeded into local,
   preview, or staging.
4. `supabase/config.toml` stays unlinked. A linked project reference, access
   token, database URL, or live credential is a Phase 0 scope violation.
5. Production migration, role, RLS, OAuth, tenant, and provider-operation work
   is deferred. The empty `migrations/` directory makes that boundary explicit.

## Phase 0 local commands

```powershell
npx --yes supabase@2.109.1 start
npx --yes supabase@2.109.1 db reset --local
npx --yes supabase@2.109.1 test db --local supabase/tests
powershell -ExecutionPolicy Bypass -File supabase/scripts/validate-phase0.ps1
```

The validation script is credential-free and verifies the file-level contract.
The database commands act only on the unlinked local Docker stack. Supabase CLI
2.109.1 was used to validate this scaffold; root package tooling may later own
the same pinned version centrally.
