# Phase 0 preview-environment contract

## Purpose

Phase 0 previews make the scaffold and fixture-only flows reviewable without creating provider side effects. A preview is not staging or production, and it must not receive customer records, production exports, provider credentials, or live traffic.

## Environment contract

| Surface | Preview contract | Prohibited in preview |
| --- | --- | --- |
| Web | Vercel creates a preview deployment for the pull request. The Vercel project is configured with the repository root and the Next.js web application as its project root directory. | Promotion, production aliasing, production environment variables, and customer traffic. |
| Tasks | The matching Trigger.dev preview branch uses the pull request branch name and runs only fixture-driven task validation. | Production or staging task environments, provider writes, scheduled production work, and credentials in task payloads. |
| Database | A Supabase ephemeral preview branch is created from the schema only. It is data-less before the preview seed is applied. | Restoring, copying, or connecting to production or staging data. |
| Providers | Provider adapters run in stub mode by default. Tests use versioned, sanitized fixtures and recorded responses only. | HighLevel, Meta, Stripe, or other provider writes, live spend, callback registration, and provider secrets. |
| Data | The preview seed contains synthetic, non-customer records only. | Customer, borrower, lead, OAuth, payment, or production-derived data. |

This contract implements the preview row in `library/knowledge/private/architecture/system-delivery-and-operations.md`: Vercel preview, Trigger.dev preview branch, Supabase ephemeral preview branch, provider stubs by default, and seeded synthetic data only.

## Required preview values

The preview deployment and smoke test must use values equivalent to the following contract. Values may be supplied by the relevant provider dashboard, but no value here is a credential.

```text
OALO_ENVIRONMENT=preview
OALO_PROVIDER_MODE=stub
OALO_SYNTHETIC_DATA_ONLY=true
OALO_TRIGGER_ENVIRONMENT=preview
OALO_SUPABASE_MODE=ephemeral-preview
```

Startup must fail if a preview configuration enables a non-stub provider mode or disables the synthetic-data guard. Application code owns that validation; this document records the deployment boundary it must enforce.

## Pull-request flow

1. A pull request runs the canonical `pnpm verify` gate in GitHub Actions.
2. The preview smoke job runs `pnpm test:e2e:preview` with the stub-only and synthetic-only contract above.
3. Vercel may build a preview for review after its project is connected to the repository. This repository does not invoke `vercel deploy`, set Vercel secrets, or promote an alias from CI.
4. Trigger.dev and Supabase preview branches are provisioned only through their provider integrations or controlled dashboard setup. Their preview branch name must match the pull-request branch and use the preview environment, never staging or production.
5. Reviewers verify only synthetic fixtures. Provider-contract testing that needs a fixed registered callback origin remains staging-only.

## Operator checklist

- Follow the full connection sequence in [operations/cloud-environment-setup.md](operations/cloud-environment-setup.md).
- Configure Vercel Preview for pull requests against `jzferrell26/operation-automated-lo`, Root Directory `apps/web`, with no production promotion from Phase 0 CI.
- Connect Trigger.dev preview branches to the same Git branch convention used by pull requests.
- Configure Supabase ephemeral preview branches as data-less and apply only the synthetic seed.
- Scope preview environment variables to the preview environment. Do not copy staging or production values.
- Keep HighLevel, Meta, Stripe, and other adapters in stub mode until a separately authorized staging contract test.
- Tear down preview branches according to provider retention settings. No preview artifact is a production backup.
- Record non-secret resource IDs in [operations/environment-inventory.template.md](operations/environment-inventory.template.md).

## Explicit non-actions

This repository configuration does not create cloud projects, preview branches, provider credentials, production deployments, database migrations against a remote project, live provider requests, spending, or customer-data transfers. Those actions require separately authorized operator work and the appropriate provider credentials.
