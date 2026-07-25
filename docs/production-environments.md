# Production environment contract

**Execution status:** NOT EXECUTED

This document defines the application contract for local, preview, staging, and production. It does not prove that a cloud environment, provider account, credential, database, bucket, or task project exists. Production traffic remains disabled until independent deployment, security, quality, and external-exercise evidence is approved.

To create and connect those cloud resources to this repository, follow [operations/cloud-environment-setup.md](operations/cloud-environment-setup.md) and fill [operations/environment-inventory.template.md](operations/environment-inventory.template.md).

## Environment matrix

| Environment | Provider mode | Data                  | Stripe | Trigger | Supabase          | Production traffic |
| ----------- | ------------- | --------------------- | ------ | ------- | ----------------- | ------------------ |
| local       | stub          | synthetic only        | test   | dev     | local             | disabled           |
| preview     | stub          | synthetic only        | test   | preview | ephemeral preview | disabled           |
| staging     | contract test | approved test only    | test   | staging | staging           | disabled           |
| production  | live          | minimum customer data | live   | prod    | production        | disabled           |

Only local permits defaults. Preview, staging, and production fail closed unless every required value is explicit and a compatible release manifest is present.

## Required server variables

Set these values independently in each environment:

- `OALO_ENVIRONMENT`
- `OALO_APP_URL`
- `OALO_ALLOWED_ORIGINS`, as a comma-separated allowlist
- `OALO_PROVIDER_MODE`
- `OALO_DATA_CLASSIFICATION`
- `OALO_STRIPE_MODE`
- `OALO_TRIGGER_ENVIRONMENT`
- `OALO_SUPABASE_MODE`
- `OALO_PRODUCTION_TRAFFIC`, which must remain `disabled`
- `OALO_BUILD_COMMIT`, a 40-character lowercase commit SHA outside local
- `OALO_BUILD_ID`
- `OALO_DATABASE_ID`
- `OALO_TASK_PROJECT_ID`
- `OALO_SECRET_SCOPE_ID`
- `OALO_PRIVATE_STORAGE_ID`
- `OALO_PUBLISHED_STORAGE_ID`
- `OALO_PROVIDER_APP_ID`
- `OALO_RELEASE_MANIFEST_JSON`, required outside local

Database, task project, secret scope, private storage, published storage, and provider app identifiers must be unique across all four environments. The isolation fixture in CI is synthetic contract evidence, not proof about live resources.

## Public variable allowlist

Only these variables may use the `NEXT_PUBLIC_` prefix:

- `NEXT_PUBLIC_OALO_ENVIRONMENT`
- `NEXT_PUBLIC_OALO_APP_URL`
- `NEXT_PUBLIC_OALO_BUILD_ID`

Any other `NEXT_PUBLIC_` variable is rejected. Public values must match their server-side counterparts. Secrets, tokens, provider identifiers, customer data, connection strings, and manifests must never use the public prefix.

## Release manifest rules

The manifest binds environment, commit, build ID, component versions, and evidence state. Candidate generation refuses production. Production validation requires canonical verification, security review, quality review, and independently verified external exercises.

Build the config package before running release tools:

```powershell
pnpm --filter @oalo/config build
```

Run the read-only synthetic isolation contract:

```powershell
node tooling/scripts/release/validate-environment-isolation.mjs --input tooling/scripts/release/fixtures/environment-isolation.synthetic.json
```

Validate the runbook inventory without executing a runbook:

```powershell
node tooling/scripts/release/validate-runbook-inventory.mjs
```

These commands make no cloud changes and do not establish production readiness.
