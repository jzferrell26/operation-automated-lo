# QA Report: Operation Automated LO Backend Production Raid

**Plan document:** `BACKEND_PRODUCTION_RAID_LEDGER.md`

**Supporting plans:** `library/requirements/in-work/prd-001-operation-automated-lo/prd-001i-ai-assisted-brand-and-campaign-generation.md`, `library/requirements/in-work/prd-001-operation-automated-lo/prd-001j-operation-automated-lo-platform-foundation-runtime-and-delivery.md`

**Delta source:** `library/knowledge/private/architecture/backend-readiness-assessment-2026-07-21.md`

**Security review:** `library/requirements/in-work/prd-001-operation-automated-lo/qa/2026-07-21-backend-production-raid-security-audit.md`

**Audit date:** 2026-07-21

**Baseline:** `c3b25336f9594e2ed6fdc4bdcf25673a6284113b`

**Head:** `codex/oalo-production-backend-raid` at the baseline commit with the full raid delta uncommitted
**Auditor:** quality-guardian

## Summary

**Verdict: DO-OVER.** BPR-001 through BPR-015 are traceable to concrete production adapters, durable paths, focused tests, current real-database evidence, and a completed security review with no remaining Critical or High finding. BPR-016 and PRD-001j criterion `001J-AC-032` fail because the canonical offline verification gate is red: the unchanged Phase 0 contract test rejects the three outbound provider transports that BPR-003 and BPR-004 require. The implementation should not move to release-commit, rebase, PR, or remote-CI work until that contract is reconciled and the complete gate is rerun on the pinned Node 24.18.0 runtime.

Verification evidence captured against the dirty working-tree snapshot:

| Command or evidence | Result |
|---|---|
| `pnpm format:check` | PASS |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS, 16 workspace packages plus tooling |
| `pnpm test:unit` | PASS, 41 files and 354 tests; 87.43% statements, 84.10% branches, 91.25% functions, 88.04% lines |
| `pnpm test:integration` | PASS, 8 files and 22 tests |
| `pnpm test:contracts` | **FAIL**, 1 of 29 tests failed at `tests/security/phase0-boundary.test.ts:94` |
| `pnpm test:visual` | PASS on isolated rerun, 2 files and 7 tests |
| `pnpm test:e2e:preview` | PASS, 1 file and 1 test |
| `pnpm test:browser` | PASS on isolated rerun, 22 tests |
| `pnpm jscpd` | PASS, 0 clones across 180 files |
| Boundary, product-type, secret, and dependency audits | PASS; dependency audit reports no known vulnerability |
| `pnpm --filter @oalo/tasks build` | PASS |
| `pnpm --filter @oalo/web build` | PASS, Next.js 16.2.10 production build |
| Real database evidence | Independently recorded PASS: PostgreSQL 17.10, clean migration reset, all 6 pgTAP files and 125 assertions, 4 orchestration tests, deterministic no-backup cleanup |
| Security evidence | PASS for release threshold: 0 Critical, 0 unresolved High, 2 High fixed; 3 Medium defense-in-depth follow-ups remain |

The first parallel visual and browser attempt produced a visual timeout and a local port collision. Both passed when rerun serially, so neither is classified as a finding.

## Scorecard

| Category | Status | Notes |
|---|---|---|
| Completeness | ❌ | BPR-016 and `001J-AC-032` are not complete while the canonical gate is red |
| Correctness | ✅ | BPR-001 through BPR-015 behavior and focused tests match the raid criteria |
| Alignment | ⚠️ | The Phase 0 no-transport assertion conflicts with the production-adapter scope |
| Gaps | ⚠️ | Local verification used Node 22.19.0 instead of the pinned Node 24.18.0 runtime |
| Detrimental | ❌ | The raid introduces a reproducible contract-suite regression that blocks `pnpm verify` |

## Critical Issues (must fix)

- [ ] **Canonical verification rejects the production transports required by the raid** - `tests/security/phase0-boundary.test.ts:80-94`

  The contract suite scans every product source file for outbound HTTP and requires an empty result. BPR-003 and BPR-004 explicitly require concrete HighLevel, Anthropic, and R2 clients, so the test now fails on `packages/ghl/src/leadconnector-v2-http-transport.ts`, `packages/ai/src/anthropic-messages-provider.ts`, and `packages/storage/src/r2-object-store-client.ts`. This makes `pnpm verify:offline` and `pnpm verify` fail, leaving BPR-016 and `001J-AC-032` unmet and guaranteeing the current CI verify job would be red.

  Suggested: replace the blanket Phase 0 transport prohibition with an explicit production-transport allowlist and fail-closed assertions that prove live calls remain disabled without validated runtime configuration. Then rerun the entire canonical gate.

  ```ts
  const forbidden =
    /\b(?:fetch|axios)\s*\(|https?\.request\s*\(|from\s+["'](?:stripe|@aws-sdk|undici)["']/u;
  // ...
  expect(findings).toEqual([]);
  ```

## Warnings (should fix)

- [ ] **Local verification did not use the repository's pinned Node runtime** - `package.json:7-10`

  The repository requires Node 24.18.0, but every QA command ran under Node 22.19.0 and emitted an unsupported-engine warning. The passing tests and builds are useful evidence, but they do not prove the release snapshot on the declared runtime.

  Suggested: after correcting the contract-suite blocker, rerun `pnpm verify` and both production builds on Node 24.18.0 in clean CI.

  ```json
  "engines": {
    "node": "24.18.0",
    "pnpm": "11.15.1"
  }
  ```

## Suggestions (consider improving)

None.

## Plan Item Traceability

| # | Plan Requirement | Status | Implementation Location | Notes |
|---|---|---|---|---|
| BPR-001 | Concrete PostgreSQL 17 pool and validated transaction-pooling adapter | ✅ | `packages/db/src/postgres-adapter.ts:88-221`, `packages/db/test/postgres-adapter.integration.test.mjs:23-68` | Real PostgreSQL evidence confirms no retained prepared statements and two-tenant isolation |
| BPR-002 | Versioned outbox contract and complete lease projection | ✅ | `packages/db/src/foundation-contracts.ts:17-105`, `supabase/migrations/20260721010000_platform_foundation.sql:1660-1713`, `packages/db/test/postgres-adapter.integration.test.mjs:72-137` | Eleven lease fields round-trip through migrated SQL |
| BPR-003 | Concrete allowlisted HighLevel transport with safe failure handling | ✅ | `packages/ghl/src/leadconnector-v2-http-transport.ts:21-741`, `tooling/tests/unit/production-foundation/leadconnector-v2-http-transport.test.ts:68-414` | Injected HTTP tests cover allowlist, auth failure, rate metadata, bounded reads, cancellation, and uncertain writes |
| BPR-004 | Concrete bounded Anthropic and R2 clients | ✅ | `packages/ai/src/anthropic-messages-provider.ts:471-614`, `packages/storage/src/r2-object-store-client.ts:450-827` | Unit suite uses injected transports and no live credentials or calls |
| BPR-005 | Exact-once production task composition before worker execution | ✅ | `apps/tasks/src/core/production-runtime-composition.ts:251-439`, `tooling/tests/unit/task-workers/production-runtime-composition.test.ts:251-515` | Concrete DB, GHL, AI, Playwright, and R2 bindings compose once and fail startup stably |
| BPR-006 | Honest bounded non-local readiness probes | ✅ | `apps/web/src/server/production-readiness-runtime.ts:31-114`, `apps/web/src/app/api/health/ready/route.ts:49-145`, `tooling/tests/unit/delivery-observability/readiness.test.ts:66-128` | Ready, degraded, unavailable, and invalid-config states are covered |
| BPR-007 | Full local, preview, staging, and production version parsing | ✅ | `apps/web/src/app/api/version/route.ts:7-38`, `tooling/tests/unit/delivery-observability/version-route.test.ts:84-114` | Route uses the full runtime contract and tests all environments |
| BPR-008 | Canonical real PostgreSQL migration and pgTAP command | ✅ | `tooling/scripts/database/run-real-database-tests.mjs:1-182`, `tooling/tests/database/real-database-orchestration.test.ts:20-78` | Independently recorded clean run: 6 pgTAP files, 125 assertions, 4 database tests |
| BPR-009 | CI parity for real database verification | ✅ | `.github/workflows/ci.yml:47-86`, `tooling/tests/database/real-database-orchestration.test.ts:20-78` | SHA-pinned actions, Node 24.18.0, least privilege, exact `pnpm test:db`, deterministic cleanup |
| BPR-010 | Reservation ownership before AI provider spend | ✅ | `packages/ai/src/production-generation.ts:651-686`, `tooling/tests/unit/production-foundation/ai-generation.test.ts:414-461` | Concurrent test proves one provider call, reservation, and charge |
| BPR-011 | Explicit completion-uncertain state with no duplicate side effect | ✅ | `packages/application/src/durable-foundation.ts:133-168`, `packages/db/src/delivery-guard.ts:122-341`, `tooling/tests/unit/production-foundation/durable-foundation.test.ts:294-364` | Completion failure never unconditionally releases the successful side effect |
| BPR-012 | Valid output survives telemetry persistence failure | ✅ | `packages/ai/src/production-generation.ts:444-473`, `packages/db/src/ai-telemetry.ts:63-161`, `tooling/tests/unit/production-foundation/ai-generation.test.ts:657-695` | Atomic pair persistence and durable reconciliation avoid repair or fallback spend |
| BPR-013 | Bounded abort-aware Meta polling backoff | ✅ | `apps/tasks/src/core/shared-task-execution.ts:103-210`, `tooling/tests/unit/task-workers/production-workers.test.ts:134-192` | Capped exponential jitter and abort-aware delay are deterministic |
| BPR-014 | Caller-atomic artifact publication with durable cleanup | ✅ | `packages/storage/src/production-object-store.ts:395-501`, `packages/db/src/publication-cleanup.ts:69-240`, `tooling/tests/unit/production-foundation/object-store-adapter.test.ts:176-520` | Immediate quarantine, durable intent, lease fencing, retry, and dead-letter paths are covered |
| BPR-015 | Per-project production coverage thresholds | ✅ | `vitest.config.ts:72-140` | Current run passed 41 files and 354 tests at every configured threshold |
| BPR-016 | Integrated production-composition smoke proof without live writes or secrets | ❌ | `package.json:31-32`, `tests/security/phase0-boundary.test.ts:80-94` | Focused smoke evidence passes, but the required canonical gate stops at the contract-suite regression |
| BPR-017 | Release-commit gates, rebase, mergeability, and remote CI | 🟦 | `BACKEND_PRODUCTION_RAID_LEDGER.md:44` | Outside this no-commit, no-push QA scope and not attempted; local verify is already blocked by BPR-016 |
| 001J-AC-001 | New developer can run local database, web, tasks, and verification from documented commands | ✅ | `README.md:31-100`, `package.json:11-32`, `supabase/README.md:1-47` | Commands and current DB evidence are present; canonical command exists but its pass state is tracked under AC-032 |
| 001J-AC-003 | Web and tasks build from the same tested packages | ✅ | `apps/web/package.json:1-29`, `apps/tasks/package.json:1-32` | Both production builds passed in this audit |
| 001J-AC-005 | No product `any`, unhandled promise, or unvalidated external boundary | ✅ | `tooling/boundaries.json:1-91`, `packages/config/src/runtime-boundaries.ts:1-81` | Typecheck, product-type, boundary, and security audits passed |
| 001J-AC-006 | Runtime credentials cannot own tables or bypass RLS | ✅ | `supabase/migrations/20260721010000_platform_foundation.sql:613-720`, `supabase/tests/tenant_isolation.pgtap.sql:1-222` | Current real-database evidence passed |
| 001J-AC-007 | Tenant A cannot access tenant B data | ✅ | `supabase/tests/tenant_isolation.pgtap.sql:1-222`, `packages/db/test/postgres-adapter.integration.test.mjs:142-365` | Direct database and adapter tests cover cross-tenant isolation |
| 001J-AC-008 | Missing tenant context fails closed | ✅ | `packages/db/src/delivery-guard.ts:189-341`, `supabase/tests/tenant_isolation.pgtap.sql:1-222` | Invalid and missing authority tests pass |
| 001J-AC-009 | Pooled connection retains no actor or location context | ✅ | `packages/db/src/postgres-adapter.ts:88-221`, `supabase/tests/tenant_isolation.pgtap.sql:1-222` | Transaction-local context and PostgreSQL adapter evidence pass |
| 001J-AC-010 | Support access requires a matching grant and audit event | ✅ | `supabase/migrations/20260721010000_platform_foundation.sql:807-938`, `supabase/tests/tenant_isolation.pgtap.sql:1-222` | pgTAP evidence includes support-role enforcement |
| 001J-AC-011 | Failed command transaction creates no state or outbox work | ✅ | `packages/application/src/durable-foundation.ts:20-68`, `tooling/tests/unit/production-foundation/durable-foundation.test.ts:168-191` | Rollback test passes |
| 001J-AC-012 | Sweeper recovers post-commit dispatch failure | ✅ | `packages/application/src/durable-foundation.ts:70-119`, `tooling/tests/unit/production-foundation/durable-foundation.test.ts:193-244` | Lease release and repeat sweep are covered |
| 001J-AC-013 | Duplicate command, event, task, and webhook produce one outcome | ✅ | `packages/application/src/durable-foundation.ts:121-168`, `tooling/tests/unit/production-foundation/durable-foundation.test.ts:246-364` | Duplicate delivery converges without repeating side effects |
| 001J-AC-014 | Tenant queues bound provider and renderer capacity | ✅ | `packages/application/src/durable-foundation.ts:170-216`, `tooling/tests/unit/production-foundation/durable-foundation.test.ts:366-375` | Distinct bounded queue keys are covered |
| 001J-AC-015 | Timeout after write reconciles before retry | ✅ | `packages/application/src/durable-foundation.ts:218-320`, `tooling/tests/unit/production-foundation/durable-foundation.test.ts:377-472` | Uncertain writes never retry blindly |
| 001J-AC-016 | Uninstall or entitlement loss blocks side effects | ✅ | `apps/tasks/src/core/production-runtime-composition.ts:251-439`, `tooling/tests/unit/task-workers/production-runtime-composition.test.ts:418-515` | Signed current authority is checked before provider work |
| 001J-AC-017 | Identical rendering inputs produce matching golden output | ✅ | `tooling/tests/unit/production-foundation/rendering-storage.test.ts:1-214`, `tests/visual/prd001d-rendering.test.ts:75-146` | Unit and isolated visual suites pass |
| 001J-AC-018 | Artifact records include complete immutable lineage | ✅ | `packages/contracts/src/rendering-storage.ts:1-229`, `tooling/tests/unit/production-foundation/rendering-storage.test.ts:1-214` | Contract and focused tests validate lineage fields |
| 001J-AC-019 | Private objects are not publicly readable | ✅ | `packages/storage/src/r2-object-store-client.ts:566-723`, `tooling/tests/unit/production-foundation/r2-object-store-client.test.ts:1-406` | Exact tenant-private key and bucket checks pass |
| 001J-AC-020 | Public objects contain approved data and withdraw correctly | ✅ | `packages/storage/src/production-object-store.ts:395-539`, `tooling/tests/unit/production-foundation/object-store-adapter.test.ts:176-574` | Checksum-bound publication, quarantine, and exact withdrawal are covered |
| 001J-AC-032 | `pnpm verify`, production build, security review, and quality review pass for release commit | ❌ | `package.json:31-32`, `tests/security/phase0-boundary.test.ts:80-94` | Builds and security threshold pass, but canonical verify fails and no release commit exists yet |
| 001I-AC-001 | Prepared user completes AI-assisted profile without operator-run consumer AI | 🟦 | `packages/ai/src/anthropic-messages-provider.ts:471-614`, `tooling/tests/unit/production-foundation/ai-generation.test.ts:284-360` | Raid supplies the configured provider boundary and local suggestion path; live configured self-onboarding remains intentionally deferred |
| 001I-AC-007 | Primary and fallback pass the complete golden evaluation corpus | 🟦 | `tooling/tests/unit/production-foundation/ai-generation.test.ts:627-656` | Promotion contract is covered locally; real configured model corpus execution remains IN PROGRESS in the source ledger |
| 001I-AC-009 | Provider failures and retries are bounded, idempotent, visible, and auditable | ✅ | `packages/ai/src/production-generation.ts:651-864`, `tooling/tests/unit/production-foundation/ai-generation.test.ts:462-545` | Malformed, timeout, fallback, and uncertain-response paths are covered |
| 001I-AC-010 | Customer allowances and provider-cost reconciliation are available | ✅ | `packages/ai/src/production-generation.ts:444-473`, `tooling/tests/unit/production-foundation/ai-generation.test.ts:599-625` | Customer units and provider usage reconciliation are separated and deterministic |
| 001I-AC-011 | Budget and rate limits prevent unbounded provider spend | ✅ | `packages/ai/src/production-generation.ts:651-686`, `tooling/tests/unit/production-foundation/ai-generation.test.ts:414-461,546-598` | Reservation ownership, concurrency, request-volume, and forecast-spend limits pass |

## Files Changed

The inventory compares the complete working tree with baseline `c3b25336f9594e2ed6fdc4bdcf25673a6284113b`. It contains 54 modified tracked files and 31 untracked raid files. This report itself is audit output and is not counted in that 85-file implementation inventory.

- `.github/workflows/ci.yml` (M) - adds pinned Node 24 verification and a real database job using the canonical DB command
- `BACKEND_PRODUCTION_RAID_LEDGER.md` (A) - primary raid plan and BPR status ledger
- `README.md` (M) - documents backend production verification and runtime commands
- `apps/tasks/package.json` (M) - adds production adapter workspace dependencies
- `apps/tasks/src/core/fixture-delivery-guard.ts` (M) - aligns fixture delivery behavior with the production guard contract
- `apps/tasks/src/core/production-poll-meta-publish.ts` (M) - adds abort-aware polling inputs
- `apps/tasks/src/core/production-publication-cleanup.ts` (A) - adds durable publication-cleanup execution
- `apps/tasks/src/core/production-runtime-composition.ts` (A) - composes validated DB, GHL, AI, rendering, storage, and authority dependencies
- `apps/tasks/src/core/production-task-bindings.ts` (M) - extends and validates exact-once production bindings
- `apps/tasks/src/core/shared-task-execution.ts` (M) - adds exponential jittered and abort-aware Meta polling
- `apps/tasks/src/index.ts` (M) - exports production composition and cleanup surfaces
- `apps/tasks/src/tasks/poll-meta-publish.ts` (M) - initializes production composition and verifies task authority
- `apps/tasks/src/tasks/reconcile-publication-cleanup.ts` (A) - adds the scheduled cleanup worker
- `apps/tasks/src/tasks/render-campaign-pdf.ts` (M) - initializes production composition and request-bound authority
- `apps/tasks/trigger.config.ts` (M) - registers production task build/runtime configuration
- `apps/web/package.json` (M) - adds production readiness adapter dependencies
- `apps/web/src/app/api/health/ready/route.ts` (M) - invokes real bounded dependency probes in non-local environments
- `apps/web/src/app/api/version/route.ts` (M) - uses the full runtime environment parser
- `apps/web/src/server/production-readiness-runtime.ts` (A) - composes database, GHL, Anthropic, and R2 readiness probes
- `docs/publication-cleanup-schedule.md` (A) - documents the cleanup schedule and recovery behavior
- `library/requirements/in-work/prd-001-operation-automated-lo/qa/2026-07-21-backend-production-raid-security-audit.md` (A) - records post-implementation security findings and remediation evidence
- `package.json` (M) - makes real DB verification canonical and expands the offline gate
- `packages/ai/package.json` (M) - adds runtime config dependency
- `packages/ai/src/anthropic-messages-provider.ts` (A) - implements the bounded validated Anthropic client
- `packages/ai/src/index.ts` (M) - exports production AI provider types and client
- `packages/ai/src/production-generation.ts` (M) - enforces reservation ownership and separates telemetry failure handling
- `packages/ai/tsconfig.json` (M) - includes the runtime config project reference
- `packages/application/src/durable-foundation.ts` (M) - adds explicit uncertain-completion handling
- `packages/application/src/index.ts` (M) - exports durable foundation additions
- `packages/config/src/index.ts` (M) - exports production config and abort utilities
- `packages/config/src/production-services.ts` (A) - validates production provider and storage service settings
- `packages/config/src/production-task-runtime.ts` (A) - validates task-runtime and authority configuration
- `packages/config/src/runtime-boundaries.ts` (A) - provides bounded abort and byte-length helpers
- `packages/contracts/src/durable-foundation.ts` (M) - aligns versioned outbox contracts
- `packages/contracts/src/index.ts` (M) - exports updated durable and rendering contracts
- `packages/contracts/src/rendering-storage.ts` (M) - adds tenant-bound publication cleanup fields
- `packages/db/package.json` (M) - adds PostgreSQL driver and DB tests
- `packages/db/src/ai-telemetry.ts` (A) - adds atomic telemetry and reconciliation persistence
- `packages/db/src/delivery-guard.ts` (A) - adds tenant-bound delivery claims and uncertain completion
- `packages/db/src/foundation-contracts.ts` (M) - decodes the full versioned outbox lease
- `packages/db/src/index.ts` (M) - exports production DB adapters
- `packages/db/src/postgres-adapter.ts` (A) - implements the validated PostgreSQL transaction-pooling adapter
- `packages/db/src/publication-cleanup.ts` (A) - implements cleanup enqueue, lease, retry, and completion persistence
- `packages/db/test/foundation-contracts.test.mjs` (A) - tests complete outbox lease decoding
- `packages/db/test/postgres-adapter.integration.test.mjs` (A) - runs PostgreSQL adapter, outbox, isolation, telemetry, and cleanup integration checks
- `packages/db/test/postgres-adapter.test.mjs` (A) - tests PostgreSQL configuration fail-closed behavior
- `packages/db/tsconfig.json` (M) - includes Node types and production DB sources
- `packages/ghl/package.json` (M) - adds runtime config dependency
- `packages/ghl/src/index.ts` (M) - exports the LeadConnector transport
- `packages/ghl/src/leadconnector-v2-http-transport.ts` (A) - implements the allowlisted validated LeadConnector V2 transport
- `packages/ghl/src/production-meta-read-transport.ts` (M) - propagates cancellation and current transport contracts
- `packages/storage/package.json` (M) - adds runtime config dependency
- `packages/storage/src/index.ts` (M) - exports R2 and cleanup surfaces
- `packages/storage/src/production-object-store.ts` (M) - adds compensation, durable cleanup, retries, and withdrawal evidence
- `packages/storage/src/production-storage.ts` (M) - derives tenant-namespaced public keys
- `packages/storage/src/r2-object-store-client.ts` (A) - implements bounded SigV4 R2 operations and probes
- `pnpm-lock.yaml` (M) - records adapter dependencies and patched transitive overrides
- `pnpm-workspace.yaml` (M) - pins patched transitive dependencies
- `supabase/README.md` (M) - documents canonical real database testing
- `supabase/migrations/20260721010000_platform_foundation.sql` (M) - aligns outbox leases and adds telemetry, delivery, and cleanup primitives
- `supabase/tests/durable_primitives.pgtap.sql` (M) - expands durable delivery and outbox assertions
- `supabase/tests/phase0_scaffold.pgtap.sql` (M) - updates the scaffold assertion count and expectations
- `supabase/tests/reconciliation_primitives.pgtap.sql` (A) - tests telemetry, completion-uncertain, cleanup, fencing, and tenant rejection
- `supabase/tests/tenant_isolation.pgtap.sql` (M) - expands tenant-role and cross-tenant coverage
- `tooling/boundaries.json` (M) - permits the required package dependency directions
- `tooling/scripts/database/run-real-database-tests.d.mts` (A) - types the database orchestration module
- `tooling/scripts/database/run-real-database-tests.mjs` (A) - starts, resets, tests, and cleans a real local Supabase database
- `tooling/tests/database/real-database-orchestration.test.ts` (A) - tests DB discovery, pinning, failure aggregation, and cleanup
- `tooling/tests/unit/delivery-observability/readiness.test.ts` (M) - tests honest non-local readiness states
- `tooling/tests/unit/delivery-observability/version-route.test.ts` (A) - tests local, preview, staging, and production version evidence
- `tooling/tests/unit/production-foundation/ai-generation.test.ts` (M) - adds concurrency and telemetry-failure coverage
- `tooling/tests/unit/production-foundation/anthropic-messages-provider.test.ts` (A) - tests Anthropic configuration, parsing, timeout, cancellation, and secrecy
- `tooling/tests/unit/production-foundation/database-production-paths.test.ts` (A) - tests DB result validation, authority, telemetry, and cleanup paths
- `tooling/tests/unit/production-foundation/durable-foundation.test.ts` (M) - tests completion-uncertain and no-release behavior
- `tooling/tests/unit/production-foundation/leadconnector-v2-http-transport.test.ts` (A) - tests HighLevel allowlist, headers, failures, rate metadata, and aborts
- `tooling/tests/unit/production-foundation/meta-read-transport.test.ts` (M) - aligns injected Meta reads with current transport behavior
- `tooling/tests/unit/production-foundation/object-store-adapter.test.ts` (M) - adds publication compensation and durable cleanup coverage
- `tooling/tests/unit/production-foundation/r2-object-store-client.test.ts` (A) - tests R2 signing, confinement, probes, errors, and metadata checks
- `tooling/tests/unit/production-foundation/rendering-storage.test.ts` (M) - covers tenant-bound cleanup contract fields
- `tooling/tests/unit/production-foundation/tenant-installation.test.ts` (M) - aligns tenant installation coverage with production auth boundaries
- `tooling/tests/unit/task-workers/fixture-only-workers.test.ts` (M) - confirms fixture paths remain isolated from production transports
- `tooling/tests/unit/task-workers/production-runtime-composition.test.ts` (A) - tests exact-once composition, task authority, cancellation, and cross-location rejection
- `tooling/tests/unit/task-workers/production-workers.test.ts` (M) - tests bounded polling and abort-aware delays
- `tooling/tests/unit/task-workers/publication-cleanup-worker.test.ts` (A) - tests schedule, fresh authority, backoff, cleanup, and retry behavior
- `vitest.config.ts` (M) - expands production coverage includes and per-project thresholds
