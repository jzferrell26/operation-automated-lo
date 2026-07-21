# Operation Automated LO

Operation Automated LO is a private HighLevel Marketplace product and research monorepo for a mortgage loan officer partner campaign engine. Phase 0 contains the platform scaffold, synthetic founding-offer demo, fixture-only task runner, isolated local Supabase contract, verification harnesses, and the research and requirements package.

The first product wedge is **Open House Boost**: a loan officer and Realtor enter one property, prepare a co-branded campaign package, review compliance and targeting checks, require a named human approval, and attribute resulting leads and pipeline outcomes in HighLevel.

**Phase 0 authority and ownership:** [EXECUTION_LEDGER.md](EXECUTION_LEDGER.md) records the assigned owner, evidence, dependencies, and current state for every Phase 0 row. Changes use repository pull-request review and must not mark a row or gate complete without its named evidence.

## Phase 0 boundary

This repository is an evidence-producing scaffold, not a production-ready campaign application.

- Local and preview work is synthetic-only and uses provider stubs or fixture replay.
- No production campaign traffic, customer data, live provider writes, advertising spend, or production credentials are authorized.
- The local Supabase project stays unlinked. Do not run `supabase link`, a linked database command, or `supabase config push` from this scaffold.
- The synthetic [`/demo`](http://localhost:3000/demo) illustrates the intended product shape. It cannot approve, publish, spend, or prove a provider contract.
- Research gates G1 through G7 remain **BLOCKED**, and production stays unauthorized until each is `PASS`, `ACCEPTED CONSTRAINT`, or `DEFERRED OUT OF CORE`. G8 is `ACCEPTED CONSTRAINT`, never `PASS`: no evidence of 15 paid founders exists, commercial validation is unproven, and 15 paid founders is now a post-start target. See the [build-readiness gate](library/knowledge/private/research/2026-build-readiness-and-research-gate.md).

## Where it runs

| Environment | Current Phase 0 contract |
| --- | --- |
| Local | Next.js web app, fixture-only task runner, and unlinked Supabase on reserved ports `55420` through `55429`. No credentials are required. |
| Pull request | GitHub Actions runs the canonical verification gate. Preview services, when configured by an authorized operator, must remain stub-only and synthetic-only. |
| Staging | Not configured by Phase 0. Fixed contract-test accounts require separate authorization. |
| Production | Not configured and not authorized while G1 through G7 are blocked. G8 is an accepted constraint and does not authorize production. |

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
- [PRD 001 index](library/requirements/backlog/prd-001-operation-automated-lo/prd-001-operation-automated-lo-index.md)
- [Research sources](library/knowledge/private/research/sources.md)

Research snapshot: July 19, 2026. Public competitor findings use official sites and help centers. No authenticated competitor account was used. HighLevel endpoint and scope behavior must be proven in an authorized HighLevel App Test account before any promotion beyond the evidence harness.

## Contributing

Keep changes inside the Phase 0 authority recorded in the execution ledger. Add or update executable evidence for any changed contract, run `pnpm verify`, and use pull-request review. Production feature work and live provider validation require explicit scope authorization and the named evidence for the affected research gates.
