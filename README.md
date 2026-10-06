# Operation Automated LO

## Current direction: campaign recovery, October 5, 2026

**UX/UI work, October 6:** [Campaign studio](library/knowledge/private/ux-ui/04-screens/campaign-studio.md) improves Home's hierarchy and makes the implemented private property package discoverable, with a responsive live summary in the preparation form. It preserves the existing brand, light shell, ad workflow and authority boundaries. This interface increment does not deliver or supersede the financing and five-funnel requirements below. Review the branch/PR evidence before treating it as deployed.

**Primary product contract:** [Five finished, ready-to-brand funnels](library/requirements/in-work/prd-010-campaign-recovery/turnkey-five-funnel-product.md) included in AutomatedLO, with guided domain connection and preconfigured visitor/lead journeys. Customers must not need prompts, a blank editor, Lovable or a web developer. The payment report, co-branded flyer and matching property site are the flagship immediate build. The exact five-funnel roster and proof of performance remain to be established; this brief does not claim those funnels are built or live.

**Next owner-approved outcome:** [Payment flyers, financing reports and co-branded property sites](library/requirements/in-work/prd-010-campaign-recovery/payment-flyers-and-co-branded-sites.md). Create a property financing comparison in a few actions after saved setup, then reuse its photos, both brands and verified financial inputs for a report, printable flyer and responsive website. PR #78 is merged as `d5ef89b0`, providing the draft-package foundation only. The payment system is specified, not implemented; client-restricted source templates are not shared-product assets. The implementation notes below predate that merge and are not a current hosted-release check.

PR #76 is merged at `0b47805e`. The next recovery slice, [Batch B](library/requirements/in-work/prd-010-campaign-recovery/batch-b-campaign-package.md), generates private property-page previews, PDF flyers, QR codes, and campaign copy from the same saved campaign version. These are internal-review drafts, not approved or public campaigns. **Hosted package generation requires the additive `20261005160000_property_campaign_packages.sql` migration before deployment.** See the [deployment notes](library/requirements/in-work/prd-010-campaign-recovery/deployment.md). The migration has only been exercised on an isolated local test database in this work.

Jonathan has delegated recovery to Chief. The product goal is a complete property-and-partner campaign connected to HighLevel, not only an ad catalog. [PRD-010](library/requirements/in-work/prd-010-campaign-recovery/prd-010-campaign-recovery-index.md) is the current recovery brief and records the delivery sequence, preserved decisions, and evidence required. PR #75 is merged at `adeed9e0`; its library workflow and light interface are retained. The sections below describe the existing release and its provider restrictions, not proof that the recovery is complete.

The first recovery batch restores property-campaign preparation without inventing generated assets, working lead routing, or launch readiness. Co-branded collateral and lender-only paid ads remain separate. No live provider, spend, billing, or customer messaging is authorized by this recovery.

Operation Automated LO is a private HighLevel Marketplace product and research monorepo for a mortgage loan officer marketing toolkit. Phase 0 contains the platform scaffold, synthetic founding-offer demo, fixture-only task runner, isolated local Supabase contract, verification harnesses, and the research and requirements package.

The product is a **marketing toolkit** for mortgage loan officers, not a CRM ([PRD-009](library/requirements/completed/prd-009-marketing-toolkit/prd-009-marketing-toolkit-index.md), complete in pull request #75). A loan officer chooses a curated ad from the Ads library, changes only its words, sets the budget, dates, and places, reviews the actual ad, and needs a named human approval of that exact version. HighLevel stays the CRM: contacts, pipelines, automations, and the attribution of leads and pipeline outcomes live there. Paid ads never carry Realtor, brokerage, or dual-brand identity.

**Phase 0 authority and ownership:** [EXECUTION_LEDGER.md](EXECUTION_LEDGER.md) records the assigned owner, evidence, dependencies, and current state for every Phase 0 row. Changes use repository pull-request review and must not mark a row or gate complete without its named evidence.

## Phase 0 boundary

Phase 0 built the platform scaffold and the evidence harness. A hosted, authenticated app has since been released on top of it (see [Where it runs](#where-it-runs)). The campaign product is still not production-ready: no campaign provider traffic is authorized, and the live-provider gates below are open.

- Local and preview work is synthetic-only and uses provider stubs or fixture replay.
- **Activated on the hosted app:** self-serve sign-up (an opt-in for the deployment, never a default), first-party email and password sessions, the signed-in workspace, and homeowner reports with live lookups off. No RentCast credential is configured, the paid lookup allowance is zero, and an unconfigured lookup fails before any external access.
- **Not activated:** HighLevel (App Test, install, and report delivery), Meta publication, Stripe billing, RentCast live data, lead routing, and production campaign traffic. Password-recovery email is not set up either, so a person who forgets a password cannot reset it yet (operator checklist, step 1).
- No production campaign traffic, live provider write, advertising spend, or billing is authorized. The authenticated runtime requires `OALO_PROVIDER_MODE=stub`, `OALO_SYNTHETIC_DATA_ONLY=true`, and `OALO_PRODUCTION_TRAFFIC=disabled`.
- Do not enter real homeowner data until retention, export, and deletion rules are settled. No export or purge job exists yet (see D-7 and section 3 of the [operator checklist](library/knowledge/private/operations/finish-line-operator-checklist.md)).
- The local Supabase project stays unlinked. Do not run `supabase link`, a linked database command, or `supabase config push` from this scaffold. The hosted database is migrated through the migration-role procedure in the [Homeowner AVM activation runbook](docs/operations/homeowner-avm-activation.md).
- The synthetic [`/demo`](http://localhost:3000/demo) illustrates the intended product shape. It cannot approve, publish, spend, or prove a provider contract.
- Research gates G1 and G4 are `ACCEPTED CONSTRAINT` (external distribution removed; Housing Special Ad Category requirements known). G2, G3, G5, G6, and G7 remain **BLOCKED**, and production stays unauthorized until each remaining blocked gate is `PASS`, `ACCEPTED CONSTRAINT`, or `DEFERRED OUT OF CORE`. The production ledger and project map carry G2 as `DEFERRED FOR NOW` (the live HighLevel App Test is still outstanding). G8 is `ACCEPTED CONSTRAINT`, never `PASS`: no evidence of 15 paid founders exists, commercial validation is unproven, and 15 paid founders is now a post-start target. See the [build-readiness gate](library/knowledge/private/research/2026-build-readiness-and-research-gate.md).
- **The marketing toolkit (PRD-009, complete in pull request #75).** Six sections in a light top menu: Home, Campaigns, Brand, Realtor partners, Homeowner reports, and Settings. A first-run Home asks "What do you want to promote?". The Ads library is a curated, platform-wide set of ads kept in the repository; it is empty until the owner supplies approved ads. "Launch an ad" has three steps: choose an ad, set it up, and review and launch. "Launch on Facebook" is built, but it stays disabled until Meta is connected and launching is turned on, and this release does neither, so nothing is published. There are no CRM pages: Leads and Pipeline, Automations, Reports, and Workspace tools are removed, and HighLevel stays the CRM. PRD-009 adds no migration and no deployment variable. What it needs from a person (supplying the first approved ads, counsel and lender review, a post-deploy check, and the owner's visual sign-off) is steps 10 to 13 of the [operator checklist](library/knowledge/private/operations/finish-line-operator-checklist.md).

Everything that remains and needs a person (a decision, an account, a credential, or a live provider) is in the [finish-line operator checklist](library/knowledge/private/operations/finish-line-operator-checklist.md), in dependency order. The agent-executable hardening, [PRD-008](library/requirements/completed/prd-008-finish-line-hardening/prd-008-finish-line-hardening-index.md), merged as pull request #74 on 2026-10-01. Step 0 of that checklist (apply the three PRD-008 migrations to the hosted database) was meant to come before that merge and is now overdue; the repository does not record that it was done (UNVERIFIED). The marketing toolkit, [PRD-009](library/requirements/completed/prd-009-marketing-toolkit/prd-009-marketing-toolkit-index.md), is complete in pull request #75; its steps are 10 to 13 of the checklist.

## Where it runs

| Environment | Current Phase 0 contract |
| --- | --- |
| Local | Next.js web app, fixture-only task runner, and unlinked Supabase on reserved ports `55420` through `55429`. No credentials are required. |
| Pull request | GitHub Actions runs the canonical verification gate. Preview services, when configured by an authorized operator, must remain stub-only and synthetic-only. |
| Hosted authenticated app | Vercel project `operation-automated-lo-web`, served at `https://operation-automated-lo-web.vercel.app`, with a dedicated Supabase project (`operation-automated-lo`, US East) behind it. Ten tracked migrations were applied there on 2026-09-24, and the restricted runtime login uses certificate-verified TLS. The three migrations PRD-008 added since (`20260930180000_change_password_rate_limit.sql`, `20261001090000_homeowner_review_rerequest.sql`, and `20261001120000_sign_in_without_account.sql`) are not recorded as applied to it: UNVERIFIED. [Operator checklist](library/knowledge/private/operations/finish-line-operator-checklist.md) step 0 asks for them to be applied. PR #74 merged on 2026-10-01, so the step is overdue, and once the PR #74 code is deployed, the change-password route refuses every password change until the first is applied. The marketing toolkit (PRD-009, pull request #75) is not on the hosted app until the owner merges it; it adds no migration and no deployment variable. Sign-up, password sessions, the workspace, and homeowner reports with live lookups off were exercised on it in the September 24 release verification. HighLevel, Meta, Stripe, RentCast live data, lead routing, and production campaign traffic are not activated; see the [Phase 0 boundary](#phase-0-boundary). Operating detail: [Homeowner AVM activation](docs/operations/homeowner-avm-activation.md) and [review surface](docs/operations/review-surface.md). |
| Staging | Not configured by Phase 0. Fixed contract-test accounts require separate authorization. |
| Production, as the [environment contract](docs/production-environments.md) defines it (live providers, minimum customer data, release manifest) | Not configured and not authorized while G2, G3, G5, G6, or G7 remain blocked. G1, G4, and G8 are accepted constraints and do not authorize production. The hosted app above is served from the Vercel project's production alias, and its campaign runtime must stay stub-only. |

To connect Vercel, Trigger.dev, Supabase, R2, and KMS to this repository, follow the operator runbook [docs/operations/cloud-environment-setup.md](docs/operations/cloud-environment-setup.md) and record non-secret IDs in [docs/operations/environment-inventory.template.md](docs/operations/environment-inventory.template.md).

See the [preview-environment contract](docs/phase0-preview-environments.md) and [Supabase environment contract](supabase/environment-contract.md) for the complete separation rules.

## Prerequisites and install

Run commands from the repository root in PowerShell. Install these prerequisites first:

- Node.js `24.18.0`, pinned in `.nvmrc`, `.node-version`, and `package.json`
- Corepack with pnpm `11.15.1`, pinned by the root `packageManager` field
- Docker Desktop with the Docker engine running

Verify the toolchain and install the frozen dependency graph:

```powershell
node --version                       # Expected: v24.18.0
corepack enable
pnpm --version                       # Expected: 11.15.1
docker version                       # Must report both Client and Server
pnpm install --frozen-lockfile
```

If `corepack enable` cannot write beside a system-level Node installation, run that command once from an elevated shell or use a user-owned Node version manager. Do not continue if the reported Node or pnpm version differs from the pinned version.

## Start and test local Supabase

The canonical command targets only the unlinked `operation-automated-lo-phase-0` project and its reserved local Docker port block:

```powershell
pnpm test:db
```

The cross-platform runner pins Supabase CLI `2.109.1`, starts a real local PostgreSQL 17 stack, recreates the database, applies every migration, and invokes every `supabase/tests/*.pgtap.sql` file in sorted order. It always stops the local stack with `--no-backup`, including after a failure. GitHub Actions runs this exact command on a clean runner without production secrets. See [supabase/README.md](supabase/README.md) for ports and prohibited linked commands.

## Run the web app and synthetic demo

The Phase 0 parser defaults to local, stub-only, synthetic-only behavior. Set the values explicitly so the terminal contract is visible, then start the web app:

```powershell
$env:OALO_ENVIRONMENT = "local"
$env:OALO_PROVIDER_MODE = "stub"
$env:OALO_SYNTHETIC_DATA_ONLY = "true"
pnpm --filter @oalo/web dev
```

Open [http://localhost:3000/demo](http://localhost:3000/demo). The page is a local synthetic founding-offer demonstration and makes no provider request.

Set `OALO_ENVIRONMENT=local` and `OALO_ADS_LIBRARY_SAMPLES=enabled` to see the labelled sample ads. Never set the flag on a deployment.

For a credential-free static validation instead of a running server:

```powershell
pnpm --filter @oalo/web typecheck
pnpm --filter @oalo/web build
```

## Run the fixture-only task path

Use the local runner for task validation. It builds the required workspace slice, executes the same deterministic core used by the task adapter, and requires no Trigger.dev login or network connection:

```powershell
pnpm tasks:local
```

The JSON result must report `productionTrafficEnabled: false` and `networkAccessRequired: false`.

Do not use `pnpm --filter @oalo/tasks dev` for local fixture validation. That command starts the Trigger.dev CLI and may contact an external Trigger.dev service. It requires separate authorization and a designated non-production project configuration.

### Server-only production task HighLevel authentication

The deployed task composition is fail-closed. In addition to the other production service variables, it requires `OALO_GHL_LOCATION_PIT_JSON`, a server-only secret containing the location PIT as `{ "locationId": "...", "accessToken": "..." }`. `OALO_GHL_READINESS_LOCATION_REF` is the canonical location identifier for this internal single-location deployment. The PIT bundle's `locationId` must match it exactly, and signed task deliveries must use that same `locationRef`. Missing, malformed, or mismatched PIT configuration fails composition with `PRODUCTION_TASK_RUNTIME_CONFIGURATION_INVALID` before a render or Meta-poll worker runs.

Never expose this secret through a `NEXT_PUBLIC_*` variable, client bundle, log, task payload, or error. Production provider calls remain unauthorized under the Phase 0 boundary above; deterministic tests inject a fake HTTP transport and never use a live credential or network request.

## Verify the monorepo

Run the complete Phase 0 gate from the repository root:

```powershell
pnpm verify
```

The gate checks formatting, lint, type boundaries, unit and integration suites, database and provider contracts, visual and preview smoke tests, duplication, architecture boundaries, product-type and secret audits, dependency advisories, and all workspace builds. It does not enable live product providers.

Unit coverage includes every production source file in the application, AI, GHL, database, tasks, storage, rendering, and observability projects. The application gate remains 100 percent for statements, branches, functions, and lines. The other project thresholds are enforced independently in `vitest.config.ts`: AI 85/80/85/85, database 80/70/75/80, GHL 80/75/80/80, tasks 70/70/75/70, storage 80/70/80/80, rendering 70/60/80/70, and observability 85/75/85/85 (statements/branches/functions/lines). Any listed project missing its threshold fails `pnpm test:unit`.

## Repository map

| Path | Purpose |
| --- | --- |
| `apps/web` | Next.js scaffold, health and version routes, and the synthetic `/demo`. |
| `apps/tasks` | Fixture-only local runner plus the separately gated Trigger.dev adapter. |
| `packages` | Application, domain, contracts, provider harnesses, rendering, storage, configuration, and shared UI boundaries. |
| `supabase` | Unlinked local database contract, data-less seed, validation script, and pgTAP test. |
| `tests` and `tooling` | Verification projects, security evidence, and boundary audits. |
| `docs/operations` | Fail-closed runbooks, including cloud environment setup for Vercel and related services. |
| `library` | Product research, architecture knowledge, compliance boundaries, and PRDs. |

## Product and research context

- [UX/UI design scope](library/knowledge/private/ux-ui/README.md)
- [Product definition](library/knowledge/private/product/product-definition.md)
- [System architecture](library/knowledge/private/architecture/system-architecture.md)
- [Build blueprint](library/knowledge/private/architecture/system-build-blueprint.md)
- [Runtime contracts](library/knowledge/private/architecture/system-runtime-contracts.md)
- [Delivery and operations](library/knowledge/private/architecture/system-delivery-and-operations.md)
- [GHL Marketplace, OAuth, and scope plan](library/knowledge/private/integrations/ghl-marketplace-and-scopes.md)
- [Mortgage marketing compliance boundaries](library/knowledge/private/compliance/compliance-and-risk.md)
- [Security threat model](library/knowledge/private/security/threat-model.md)
- [PRD 001 index](library/requirements/in-work/prd-001-operation-automated-lo/prd-001-operation-automated-lo-index.md)
- [PRD 009 index](library/requirements/completed/prd-009-marketing-toolkit/prd-009-marketing-toolkit-index.md)
- [Research sources](library/knowledge/private/research/sources.md)

Research snapshot: July 19, 2026. Public competitor findings use official sites and help centers. No authenticated competitor account was used. HighLevel endpoint and scope behavior must be proven in an authorized HighLevel App Test account before any promotion beyond the evidence harness.

## Contributing

Keep changes inside the Phase 0 authority recorded in the execution ledger. Add or update executable evidence for any changed contract, run `pnpm verify`, and use pull-request review. Production feature work and live provider validation require explicit scope authorization and the named evidence for the affected research gates.
