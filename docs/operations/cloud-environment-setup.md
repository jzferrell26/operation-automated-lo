# Cloud environment setup runbook

**Execution status:** NOT EXECUTED

Use this runbook to connect `jzferrell26/operation-automated-lo` to the founding cloud stack and create isolated preview, staging, and production resource shells. This runbook does not authorize production traffic, live HighLevel or Meta writes, advertising spend, or customer data.

Stop if any required named owner, approver, region choice, or resource identity is missing. Never paste credentials into git, tickets, evidence files, chat, or this document.

## Authority and contracts

| Document | Role |
| --- | --- |
| [docs/production-environments.md](../production-environments.md) | Environment matrix and required `OALO_*` variables |
| [docs/phase0-preview-environments.md](../phase0-preview-environments.md) | Preview stub-only and synthetic-only boundary |
| [supabase/environment-contract.md](../../supabase/environment-contract.md) | Database separation rules |
| [library/knowledge/private/architecture/system-delivery-and-operations.md](../../library/knowledge/private/architecture/system-delivery-and-operations.md) | Target topology and deploy order |
| [library/knowledge/private/architecture/system-build-blueprint.md](../../library/knowledge/private/architecture/system-build-blueprint.md) | Vercel + Trigger.dev + Supabase + R2 + KMS decisions |
| [docs/operations/environment-inventory.template.md](environment-inventory.template.md) | Non-secret identity worksheet for `001J-AC-029` |
| [vercel.json](../../vercel.json) | Root Vercel install contract (`pnpm` frozen lockfile) |
| [apps/tasks/trigger.config.ts](../../apps/tasks/trigger.config.ts) | Trigger.dev project binding via `TRIGGER_PROJECT_REF` |

Ledger criteria this work unblocks evidence for:

- `001J-AC-029` environment isolation inventory
- Preview path described by `docs/phase0-preview-environments.md`
- Later staging/production smoke (`001J-AC-033`) after separate approval

## Named roles before any cloud mutation

Record these before Step 1:

| Role | Person | Responsibility |
| --- | --- | --- |
| Operator | | Executes dashboard and CLI steps |
| Approver | | Approves environment creation and region choice |
| Cloud and deployment owner | | Owns Vercel / Trigger / Supabase / R2 / KMS inventory |
| Security reviewer | | Confirms secret scoping and no production traffic |

Also record:

- Primary US region choice for Vercel functions, Supabase, and R2 location hint
- Target start environment: **preview first**, then staging shells, then production shells with traffic disabled

## Dry-run evidence skeleton

Create a dry-run evidence skeleton before mutating cloud state:

```powershell
node tooling/scripts/release/create-operation-evidence.mjs --operation cloud-environment-setup --environment preview --correlation-id corr_cloud_setup_preview_001
```

After each completed phase, append observations and non-secret resource IDs to the evidence file outside the repository or under an approved private evidence location. Do not commit secrets.

## Hard rules

1. `OALO_PRODUCTION_TRAFFIC` must remain `disabled` in every environment.
2. Preview must stay `OALO_PROVIDER_MODE=stub` and synthetic-only.
3. Staging may use contract-test providers only after separate authorization.
4. Production provider credentials stay unset until G1 through G7 evidence exists.
5. Database, task, secret, storage, and provider-app identities must be unique per environment.
6. Only these public variables are allowed: `NEXT_PUBLIC_OALO_ENVIRONMENT`, `NEXT_PUBLIC_OALO_APP_URL`, `NEXT_PUBLIC_OALO_BUILD_ID`.
7. Do not run `supabase link` against a cloud project from a developer laptop unless the approver authorized that exact project and the local scaffold boundary for the session.

## Phase 0: accounts and region

Create or confirm access to these accounts in the Cuantico org:

1. GitHub access to `jzferrell26/operation-automated-lo`
2. Vercel team or project create permission
3. Trigger.dev project create permission
4. Supabase org create permission
5. Cloudflare account with R2 enabled
6. AWS account with permission to create one KMS key per environment and a restricted Trigger IAM principal

Choose and write down one primary US region. Keep Vercel serverless region, Supabase project region, and R2 jurisdiction as close as the providers allow.

## Phase 1: connect the GitHub repo to Vercel (preview)

Goal: every pull request can get a Vercel Preview deployment of `apps/web` without production promotion.

1. In Vercel, create a project named for this product, for example `operation-automated-lo-web`.
2. Import the Git repository `jzferrell26/operation-automated-lo`.
3. Set **Root Directory** to `apps/web`.
4. Set **Framework Preset** to Next.js.
5. Set **Install Command** to:

```text
cd ../.. && corepack enable && pnpm install --frozen-lockfile
```

6. Leave **Build Command** as the Next.js default (`next build`) unless the dashboard requires an explicit override.
7. Enable Preview deployments for pull requests.
8. Disable automatic Production promotion until staging and production shells are approved. Production deploys require a named approver later.
9. Confirm Node compatibility with the repo pin: Node `24.18.0` (see `.nvmrc` and root `package.json` engines).

Repo anchors this step already owns:

- Root install contract in `vercel.json`
- Next app in `apps/web`
- Preview smoke contract in `.github/workflows/ci.yml` job `preview-smoke`

CI does not call `vercel deploy`. Preview builds come from the Vercel Git integration only.

### Preview environment variables

In the Vercel project, set Preview-scoped values. Use the eventual preview URL for `OALO_APP_URL` after the first deploy assigns `*.vercel.app`, then redeploy.

Public (Preview):

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_OALO_ENVIRONMENT` | `preview` |
| `NEXT_PUBLIC_OALO_APP_URL` | `https://<preview-host>` |
| `NEXT_PUBLIC_OALO_BUILD_ID` | Vercel build id or equivalent safe build label |

Server-only (Preview):

| Variable | Value |
| --- | --- |
| `OALO_ENVIRONMENT` | `preview` |
| `OALO_APP_URL` | same https URL as public |
| `OALO_ALLOWED_ORIGINS` | same https URL (comma-separated if more than one) |
| `OALO_PROVIDER_MODE` | `stub` |
| `OALO_DATA_CLASSIFICATION` | `synthetic-only` |
| `OALO_STRIPE_MODE` | `test` |
| `OALO_TRIGGER_ENVIRONMENT` | `preview` |
| `OALO_SUPABASE_MODE` | `ephemeral-preview` |
| `OALO_PRODUCTION_TRAFFIC` | `disabled` |
| `OALO_BUILD_COMMIT` | 40-character lowercase git SHA for the deployment |
| `OALO_BUILD_ID` | same as public build id |
| `OALO_DATABASE_ID` | unique preview database identity string |
| `OALO_TASK_PROJECT_ID` | unique preview Trigger project identity string |
| `OALO_SECRET_SCOPE_ID` | unique preview secret-scope identity string |
| `OALO_PRIVATE_STORAGE_ID` | unique preview private bucket identity string |
| `OALO_PUBLISHED_STORAGE_ID` | unique preview published bucket identity string |
| `OALO_PROVIDER_APP_ID` | unique preview provider-app identity string |
| `OALO_RELEASE_MANIFEST_JSON` | prepared preview release manifest JSON |
| `TRIGGER_PROJECT_REF` | Trigger.dev project ref (`proj_...`) once Phase 2 exists |
| `OALO_SYNTHETIC_DATA_ONLY` | `true` |
| `OALO_REVIEW_SURFACE` | leave unset unless a labeled HighLevel review dashboard is required; then exact value `authorized` |

Notes:

- Public and server `environment`, `appUrl`, and `buildId` must match exactly or startup fails.
- Do not add any other `NEXT_PUBLIC_*` keys.
- Do not put HighLevel, Meta, Stripe live, R2 secrets, or KMS material into Preview until a later authorized phase needs them. Preview stays stub-first.
- Vercel may mark prod/preview env entries as sensitive and not readable via `vercel env ls`. Verify with smoke routes, not by listing secrets.

### Preview smoke check

After the first Preview deployment is Ready:

```powershell
curl.exe -sD - "https://<preview-host>/api/health/live"
curl.exe -sD - "https://<preview-host>/api/version"
curl.exe -sD - "https://<preview-host>/overview"
curl.exe -sD - "https://<preview-host>/demo"
```

Pass criteria for this phase:

- `/api/health/live` returns HTTP 200 and `productionTrafficEnabled: false`
- `/overview` and `/demo` render the synthetic UI (not a bare framework 404)
- No live provider credentials were required

Ready is not working. If the build is Ready but routes 404, follow redirect headers first, then re-check Root Directory `apps/web` and Install Command.

## Phase 2: Trigger.dev project connected to the same repo

1. Create a Trigger.dev project for this repository.
2. Connect the GitHub repo `jzferrell26/operation-automated-lo`.
3. Point the task package at `apps/tasks` (config file `apps/tasks/trigger.config.ts`).
4. Enable preview branches that match pull-request branch names.
5. Create distinct Trigger environments: preview, staging, and production version spaces.
6. Set `TRIGGER_PROJECT_REF` in Vercel Preview (and later staging/production) to the real `proj_...` value.
7. Keep preview tasks fixture-driven. Do not schedule production work from preview.

Local reminder: `pnpm tasks:local` remains the credential-free fixture path. Do not use `pnpm --filter @oalo/tasks dev` until this Trigger project is intentionally authorized for that session.

## Phase 3: Supabase projects and preview branching

Create separate Supabase projects. Do not share databases across environments.

| Environment | Supabase shape |
| --- | --- |
| Preview | Ephemeral preview branches, data-less before synthetic seed |
| Staging | Persistent isolated staging project |
| Production | Dedicated production project |

Steps:

1. Create the staging Supabase project in the chosen region.
2. Create the production Supabase project in the same region family.
3. Enable Supabase branching for preview use. Preview branches must start data-less.
4. Record non-secret project refs in [environment-inventory.template.md](environment-inventory.template.md).
5. Apply migrations only with named approval, using the token-based Supabase CLI against the intended project. Prefer an approved CI or break-glass operator path over ad-hoc laptop links.
6. Never copy production data into preview or staging.

Local `supabase/` stays the unlinked Phase 0 scaffold. Cloud link or push is an explicit operator action, not a default developer step.

## Phase 4: Cloudflare R2 buckets

For each of preview, staging, and production create two buckets:

1. Private artifact bucket
2. Published asset bucket

Rules:

- Private and published bucket names must differ.
- Bucket identity strings must be unique across environments (`OALO_PRIVATE_STORAGE_ID`, `OALO_PUBLISHED_STORAGE_ID`).
- Preview and staging buckets hold synthetic or approved-test objects only.
- Store access keys only in the matching Vercel and Trigger secret scopes.
- Record account id and bucket names (not secret keys) in the inventory worksheet.

## Phase 5: AWS KMS and OIDC

1. Create one environment-specific KMS key for preview or staging first; add production only when preparing that shell.
2. Configure Vercel OIDC federation for AWS so Vercel does not store long-lived AWS keys.
3. Create a restricted IAM principal for Trigger.dev with only `Decrypt`, `Encrypt`, and `GenerateDataKey` on that environment key and required encryption context.
4. Store the Trigger IAM secret only in Trigger.dev environment variables.
5. Plan 90-day rotation for the Trigger principal until workload identity replaces it.
6. Record key ARNs and IAM principal names (not key material) in the inventory worksheet.

## Phase 6: staging project shell

Create a separate Vercel project or protected Staging environment for the fixed staging origin.

Staging server contract values:

| Variable | Value |
| --- | --- |
| `OALO_ENVIRONMENT` | `staging` |
| `NEXT_PUBLIC_OALO_ENVIRONMENT` | `staging` |
| `OALO_PROVIDER_MODE` | `contract-test` |
| `OALO_DATA_CLASSIFICATION` | `approved-test-only` |
| `OALO_STRIPE_MODE` | `test` |
| `OALO_TRIGGER_ENVIRONMENT` | `staging` |
| `OALO_SUPABASE_MODE` | `staging` |
| `OALO_PRODUCTION_TRAFFIC` | `disabled` |

Also set unique staging identity IDs, release manifest, build commit, build id, https app URL, and allowed origins.

HighLevel Marketplace callback URLs and Meta App Test state often require a fixed registered origin. Keep provider-contract tests on staging, not on arbitrary preview URLs.

Do not load live production provider secrets into staging.

## Phase 7: production project shell (traffic still disabled)

Create the production Vercel project or Production environment only as a dark shell:

| Variable | Value |
| --- | --- |
| `OALO_ENVIRONMENT` | `production` |
| `NEXT_PUBLIC_OALO_ENVIRONMENT` | `production` |
| `OALO_PROVIDER_MODE` | leave unset or blocked until G1 through G7 unlock live mode |
| `OALO_DATA_CLASSIFICATION` | `minimum-customer-data` only when live data is authorized |
| `OALO_STRIPE_MODE` | remain `test` until live billing is authorized; live mode needs separate approval |
| `OALO_TRIGGER_ENVIRONMENT` | `prod` |
| `OALO_SUPABASE_MODE` | `production` |
| `OALO_PRODUCTION_TRAFFIC` | `disabled` |
| `OALO_REVIEW_SURFACE` | leave unset (fail-closed). For a HighLevel-showable labeled dashboard only: exact value `authorized`, with `OALO_PROVIDER_MODE=stub` and `OALO_SYNTHETIC_DATA_ONLY=true`. Do not enable live providers. |

Do not enable a production alias for customer traffic in this runbook. Deployment and smoke remain governed by [deployment.md](deployment.md) after a prepared release manifest and approver.

## Phase 8: fill the environment inventory

Copy [environment-inventory.template.md](environment-inventory.template.md) to an approved private evidence location (or fill a protected ops copy) and complete one row set per environment:

- Vercel project id and production/preview URLs
- Trigger.dev project ref and environment names
- Supabase project refs
- R2 account id and bucket names
- KMS key ARNs and IAM principal names
- Stripe mode
- Provider app ids
- All `OALO_*_ID` identity strings

Then prove pairwise isolation:

1. Preview credentials cannot read staging or production databases, buckets, or task environments.
2. Staging credentials cannot read production.
3. Production credentials are unused for customer traffic while `OALO_PRODUCTION_TRAFFIC=disabled`.

Repo contract check (synthetic, not proof of live resources):

```powershell
pnpm --filter @oalo/config build
node tooling/scripts/release/validate-environment-isolation.mjs --input tooling/scripts/release/fixtures/environment-isolation.synthetic.json
```

Replace the synthetic fixture input with an approved sanitized inventory file only when the real non-secret IDs are ready for validation.

## Phase 9: verify runbook inventory still holds

```powershell
node tooling/scripts/release/validate-runbook-inventory.mjs
```

## Explicit non-actions

This runbook does not:

- Enable `OALO_PRODUCTION_TRAFFIC`
- Register HighLevel Marketplace production callbacks
- Send Meta spend or live ads
- Copy production data into preview or staging
- Mark `001J-AC-029` or `001J-AC-033` verified without independent evidence review
- Replace [deployment.md](deployment.md) for a release cutover

## Completion checklist

- [ ] Named operator and approver recorded
- [ ] Region choice recorded
- [ ] GitHub repo connected to Vercel with Root Directory `apps/web`
- [ ] Preview deploy Ready and smoke routes pass with stub-only config
- [ ] Trigger.dev project connected; preview branches enabled
- [ ] Supabase staging and production projects created; preview branching enabled
- [ ] R2 private and published buckets created per environment
- [ ] KMS keys and Trigger IAM principal created; Vercel OIDC planned or configured
- [ ] Staging shell configured with `contract-test` and traffic disabled
- [ ] Production shell created with traffic disabled
- [ ] Environment inventory filled with non-secret IDs only
- [ ] Evidence skeleton updated with observations and correlation ID

When the checklist is done, hand the inventory to the cloud and deployment owner for `001J-AC-029` evidence review. Keep this file at **NOT EXECUTED** in git until an independent reviewer changes status from captured execution evidence.
