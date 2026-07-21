# Backend Readiness Assessment

> Category: Architecture Assessment | Version: 1.0 | Date: July 2026 | Status: Active

A point-in-time review of the merged backend foundation, its production readiness, and the remaining correctness and delivery risks.

**Related:**

- [System architecture](system-architecture.md)
- [System runtime contracts](system-runtime-contracts.md)
- [System delivery and operations](system-delivery-and-operations.md)
- [PRD-001 index](../../../requirements/backlog/prd-001-operation-automated-lo/prd-001-operation-automated-lo-index.md)
- [PRD-001i: AI-assisted brand and campaign generation](../../../requirements/backlog/prd-001-operation-automated-lo/prd-001i-ai-assisted-brand-and-campaign-generation.md)
- [PRD-001j: Platform foundation, runtime, and delivery](../../../requirements/backlog/prd-001-operation-automated-lo/prd-001j-operation-automated-lo-platform-foundation-runtime-and-delivery.md)
- [Production execution ledger](../../../../PRODUCTION_EXECUTION_LEDGER.md)

## Executive assessment

The backend is not production-ready. The repository contains a strong fail-closed contract foundation, useful runtime boundaries, and a passing test suite, but most production behavior is not connected to executable infrastructure.

Five high-severity blockers prevent a safe production launch:

1. Production task workers have no runtime composition path.
2. Non-local readiness and version endpoints cannot operate successfully.
3. The application and database outbox contracts are incompatible.
4. CI does not execute Supabase migrations or pgTAP tests.
5. Concurrent AI generation can spend twice against one logical reservation.

HighLevel authentication is intentionally deferred by product direction. It is excluded from the defect count, but any flow that requires live HighLevel access remains unavailable until that scope is resumed.

## Review scope

| Item | Value |
| --- | --- |
| Repository state | `origin/main` at `bb067cdc9f6c4286542bc233ee4f2dae8a070d5b` |
| Review date | July 21, 2026 |
| Primary scope | Tasks, application services, contracts, database foundation, AI execution, object storage, web runtime endpoints, CI, and production dependency posture |
| Excluded by direction | Live HighLevel OAuth and marketplace authentication |
| Review type | Static code and contract review with local verification |

## Readiness summary

| Area | Assessment | Launch effect |
| --- | --- | --- |
| Domain and runtime contracts | Strong foundation | Provides useful fail-closed seams, but does not supply production adapters |
| Worker execution | Blocked | Workers throw before work begins because bindings are never configured |
| Runtime health | Blocked outside local | Readiness is always unavailable without injected checks, and version parsing rejects production |
| Database evolution | Unverified | SQL migrations and pgTAP assertions are not exercised in CI |
| Durable delivery | Contract mismatch | Application events cannot round-trip through the current SQL lease contract |
| AI execution | Unsafe under concurrency | Reservation ownership is not enforced before provider spend |
| Storage publication | Partially safe | Public artifact publication can leave partial results |
| Test posture | Broad but incomplete | Current coverage gates exclude most production backend packages |

## Findings

### BR-001: Production workers cannot start

**Severity:** High

**Primary owner:** PRD-001j

The task entry points require process-global production bindings, but the repository contains no production composition root that configures them. `requireProductionTaskBindings()` throws when bindings are absent, and both production tasks call it before doing work.

Evidence:

- `apps/tasks/src/core/production-task-bindings.ts:43-63` defines the global binding state, its configure function, and the fail-closed requirement.
- `apps/tasks/src/tasks/render-campaign-pdf.ts:20-28` requires those bindings at task execution time.
- `apps/tasks/src/tasks/poll-meta-publish.ts:20-27` requires the same bindings.
- Repository search finds no runtime call to `configureProductionTaskBindings()` outside exports and tests.
- `packages/db/package.json:17-19` has no concrete database driver dependency.
- `apps/tasks/package.json:12-19` has no database, storage, AI provider, or HighLevel client dependency.
- The web application exposes only liveness, readiness, and version GET endpoints. No production mutation route composes the backend services.

Impact:

Production workers fail before they can render, publish, persist, or poll. The current backend is an executable contract harness, not a deployable service.

Required remediation:

Create an explicit composition root that constructs concrete database, object-store, AI, rendering, and provider adapters, configures worker bindings once per process, validates required environment variables, and proves startup through an integration test.

### BR-002: Non-local health and version endpoints cannot succeed

**Severity:** High

**Primary owner:** PRD-001j

The readiness route treats missing dependency checks as a failure outside local development, but its GET handler never supplies dependency checks. The version route uses the narrower Phase Zero environment parser, which rejects staging and production.

Evidence:

- `apps/web/src/app/api/health/ready/route.ts:58-63` returns not-ready for non-local environments when the dependency list is empty.
- `apps/web/src/app/api/health/ready/route.ts:84-85` calls readiness evaluation without dependency checks.
- `apps/web/src/app/api/version/route.ts:4-6` calls `parsePhaseZeroEnvironment()`.
- `packages/config/src/environment.ts:140-152` restricts Phase Zero environments to `local`, `preview`, and `test`, while the runtime environment schema supports staging and production.

Impact:

A production deployment cannot report ready, and its version endpoint can throw during environment parsing. This blocks trustworthy rollout and monitoring.

Required remediation:

Inject real dependency probes into readiness evaluation and use the production runtime environment parser for version metadata. Add route tests for preview, staging, and production configurations.

### BR-003: Application and database outbox contracts are incompatible

**Severity:** High

**Primary owner:** PRD-001j

The TypeScript outbox event contract and the SQL outbox schema disagree on event names and leased fields. The application expects a complete `OutboxEvent`, but the database lease function and decoder return only a subset.

Evidence:

- `packages/contracts/src/durable-foundation.ts:45-68` defines unversioned event names and requires `aggregateVersion`, `commandRef`, and `availableAt`.
- `supabase/migrations/20260721010000_platform_foundation.sql:303-330` requires event names ending in `.vN` and stores aggregate version, command ID, and available time.
- The pgTAP fixture uses `campaign.created.v1`, which is not accepted by the application enum.
- `supabase/migrations/20260721010000_platform_foundation.sql:1018-1067` leases only event ID, location ID, event name, schema version, aggregate type, aggregate ID, and correlation ID.
- `packages/db/src/foundation-contracts.ts:3-11` decodes the same incomplete lease projection.
- `packages/application/src/durable-foundation.ts:71-85` defines `OutboxLease` as an extension of the full `OutboxEvent` contract.

Impact:

The durable event path cannot safely decode and deliver real leased database rows. Event naming can also fail validation on either side of the boundary.

Required remediation:

Choose one versioning contract, align TypeScript enums and SQL constraints, return every required lease field, and add a real database round-trip test from insert through lease, delivery, and completion.

### BR-004: CI does not execute migrations or pgTAP

**Severity:** High

**Primary owner:** PRD-001j

The `test:db` command runs a Vitest filesystem assertion rather than a database. CI can remain green while a migration, policy, function, constraint, or pgTAP test is broken.

Evidence:

- `package.json:19` maps `test:db` to the Vitest database project.
- `vitest.config.ts:58-63` includes only `tooling/tests/database/**/*.test.ts` in that project.
- `tooling/tests/database/phase-zero-database.test.ts:5-15` reads SQL text and checks that the seed contains no insert statement.
- `.github/workflows/ci.yml:61-62` runs `pnpm verify` without starting Supabase or executing pgTAP.
- The local `pnpm test:db` run passed one test in 241 milliseconds, consistent with a filesystem-only check.

Impact:

The most security-sensitive and correctness-sensitive backend layer has no executable CI proof.

Required remediation:

Start an isolated Supabase or PostgreSQL test service in CI, apply every migration from a clean database, execute pgTAP, and fail the build on migration drift or database test failure.

### BR-005: Concurrent AI generation can bypass reservation ownership

**Severity:** High

**Primary owner:** PRD-001i

The generation flow checks for an accepted result, reserves spend, and reserves a ledger entry, but it ignores whether the ledger reports `reserved` or `already_reserved`. Concurrent requests can both reach the provider before commit-time deduplication.

Evidence:

- `packages/ai/src/production-generation.ts:150-156` allows the ledger reserve operation to return `reserved` or `already_reserved`.
- `packages/ai/src/production-generation.ts:596-614` ignores that result after spend reservation.
- Existing tests use a fixture that always returns `reserved`; no test exercises `already_reserved`.

Impact:

Two workers processing the same logical request can both call a paid provider. The later commit may deduplicate state, but it cannot undo duplicate cost or external side effects.

Required remediation:

Require reservation ownership before provider execution. An `already_reserved` result should return an existing accepted result, wait on the owning execution through a bounded durable mechanism, or exit for retry without spending. Add a concurrency test that proves exactly one provider call.

### BR-006: Completion failure can release an already-delivered message

**Severity:** Medium

**Primary owner:** PRD-001j

The delivery guard executes the side-effect handler and then marks the delivery complete. Any error, including a completion persistence failure, enters the same catch block and releases the claim.

Evidence:

- `packages/application/src/durable-foundation.ts:137-151` handles both handler and completion failures through one release path.
- `tooling/tests/unit/production-foundation/durable-foundation.test.ts:246-290` covers handler failure but not completion failure after a successful side effect.

Impact:

A transient completion-write failure can make an already-delivered message eligible for another attempt, duplicating an external side effect.

Required remediation:

Separate handler failure from completion failure. Preserve the claim or move the record into an explicit uncertain-completion state when the side effect succeeded but acknowledgment failed. Add a test for this exact sequence.

### BR-007: AI telemetry failure is misclassified as malformed model output

**Severity:** Medium

**Primary owner:** PRD-001i

Usage and trace persistence run inside the same try block as output parsing and acceptance recording. A telemetry write failure is caught as malformed output and can trigger repair or fallback behavior.

Evidence:

- `packages/ai/src/production-generation.ts:370-420` records usage and trace data through `Promise.all()`.
- `packages/ai/src/production-generation.ts:481-496` combines parsing and accepted-attempt recording in one try and maps every caught error to a rejected malformed-output attempt.

Impact:

Operational telemetry failures can cause duplicate generation work, misleading rejection records, and additional provider cost even when the model returned valid output.

Required remediation:

Separate model-output validation from telemetry persistence. Give telemetry its own retry and failure classification, and test partial telemetry failures after valid output.

### BR-008: Meta polling has no delay or backoff

**Severity:** Medium

**Primary owner:** PRD-001e and PRD-001j

The Meta publication poll loop performs consecutive requests up to the configured maximum without waiting between attempts.

Evidence:

- `apps/tasks/src/core/shared-task-execution.ts:116-130` loops and polls without a delay, backoff, or provider retry hint.

Impact:

One task run can create a burst of provider requests, increase throttling risk, and exhaust all polling attempts before an asynchronous publication has time to progress.

Required remediation:

Move each poll into a durable delayed retry or apply bounded backoff with jitter and provider retry hints. Test the scheduling contract without real-time sleeps.

### BR-009: Public artifact publication is not atomic

**Severity:** Medium

**Primary owner:** PRD-001d and PRD-001j

Object publication copies public artifacts sequentially. If a later copy or receipt validation fails, earlier public objects remain visible and no rollback or cleanup is attempted.

Evidence:

- `packages/storage/src/production-object-store.ts:114-165` performs sequential public copies and validates the final receipt after publication begins.

Impact:

Consumers can observe a partially published campaign artifact set, and retries may inherit stale public objects.

Required remediation:

Publish into a versioned immutable prefix, validate the complete manifest, and atomically switch a pointer or manifest only after every object is ready. Add failure-injection tests for each copy boundary.

### BR-010: Coverage gates exclude most production backend packages

**Severity:** Medium

**Primary owner:** PRD-001j

The unit test command reports 100 percent coverage, but the configured coverage include pattern covers only the application package.

Evidence:

- `vitest.config.ts:94-103` includes only `packages/application/src/**/*.ts` in coverage.
- AI, database, tasks, storage, rendering, observability, and provider adapter packages are outside the enforced threshold.

Impact:

The headline coverage number overstates backend verification and does not protect the packages with the highest production risk.

Required remediation:

Set package-aware thresholds for every production backend package and publish a combined report. Exclude generated or declarative files explicitly instead of omitting whole packages.

### BR-011: Production dependencies contain two moderate advisories

**Severity:** Moderate

**Primary owner:** PRD-001j

The production dependency audit reports two known moderate advisories.

Evidence:

- PostCSS below 8.5.10 is present through `apps__web > next > postcss` and is affected by unescaped closing style tags during CSS stringification.
- `@opentelemetry/core` below 2.8.0 is present through Trigger.dev and is affected by unbounded memory allocation when parsing W3C baggage.
- `pnpm audit --prod --audit-level=low` reported both advisories on July 21, 2026.

Impact:

The repository does not currently meet a clean production dependency baseline. Actual exploitability depends on whether untrusted CSS or baggage reaches the affected paths.

Required remediation:

Upgrade through supported parent dependency releases, confirm resolved versions in the lockfile, rerun the production audit, and document any temporary exception with an owner and expiry date.

## Intentionally deferred scope

Live HighLevel OAuth and marketplace authentication are deferred by product direction. This assessment does not count that decision as a defect. The following consequences still apply:

- Live HighLevel installation and token refresh cannot be verified.
- Provider reads and writes cannot be exercised end to end.
- Any production capability that depends on HighLevel must remain disabled or use a clearly isolated fixture path.

The composition root should keep the HighLevel adapter optional while this scope is deferred. It must fail closed when a HighLevel-dependent capability is invoked without configured credentials.

## Verification evidence

The following checks passed against the reviewed snapshot:

| Check | Result |
| --- | --- |
| `pnpm typecheck` | Passed across 16 workspace packages |
| `pnpm lint` | Passed |
| `pnpm audit:product-types` | Passed |
| `pnpm audit:secrets` | Passed |
| `pnpm audit:boundaries` | Passed, including the negative boundary fixture |
| `pnpm test:unit` | 34 files and 256 tests passed |
| `pnpm test:integration` | 8 files and 22 tests passed |
| `pnpm test:contracts` | 7 files and 29 tests passed |
| `pnpm test:db` | 1 filesystem-level test passed |
| `pnpm audit --prod --audit-level=low` | Completed with two moderate advisories |

The typecheck emitted a local toolchain warning because the repository requests Node 24.18.0 while the review environment used Node 22.19.0. The passing checks prove contract and test health within their configured scope. They do not override the production blockers in this assessment.

## Recommended remediation order

1. Align the TypeScript and SQL outbox contracts, then prove them through a real database round trip.
2. Add migration and pgTAP execution to CI.
3. Build the production composition root and concrete adapters, excluding deferred HighLevel authentication.
4. Repair readiness and version endpoints and add non-local route tests.
5. Enforce exclusive AI reservation ownership before provider spend.
6. Separate uncertain delivery completion and AI telemetry failures from business failure paths.
7. Replace tight Meta polling with durable delayed retries.
8. Make artifact publication manifest-based and atomic from the consumer perspective.
9. Expand coverage gates across production backend packages.
10. Resolve or time-bound the two dependency advisories.

Production launch should remain blocked until BR-001 through BR-005 are remediated and independently verified. Medium findings should be resolved before enabling the affected external side effects.

## Changelog

| Version | Date | Change |
| --- | --- | --- |
| 1.0 | July 21, 2026 | Initial backend readiness assessment authored from the full repository sweep. |
