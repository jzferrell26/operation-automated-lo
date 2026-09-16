# QA Report: GGL-B16 Real PostgreSQL Command Gate

**Plan document:** `library/requirements/in-work/prd-004-reviewable-go-live/prd-004a-reviewable-go-live-preview-deploy-smoke.md` (GGL-008, GGL-009, GGL-B16 via `EXECUTION_LEDGER.md`)
**Audit date:** 2026-09-16
**Base branch:** `origin/main` (`deeb3e2`)
**Head:** `cursor/gauntlet-postgres-gate-b085` (`dab2ec6`)
**Auditor:** quality-guardian

## Summary

**Pass.** GGL-008 and GGL-009 may be marked **VERIFIED**. CI run `35058370796` at head `dab2ec6` executed both integration tests against a disposable `oalo_test_campaign` database inside the canonical `database` job; all six PR checks pass. No Critical, High, or Medium findings. Two Low/informational notes on AC wording drift and operator preview smoke scope.

## Scorecard

| Category      | Status | Notes |
|---------------|--------|-------|
| Completeness  | ✅ | Integration phase, orchestration contracts (21 tests), URL guards, and boundary scan all present |
| Correctness   | ✅ | Fresh-pool reload and read-repository reload verified in test code and CI log |
| Alignment     | ✅ | Closes GGL-B16; correlation-ref fix matches canonical opaque-reference contract |
| Gaps          | ✅ | No silent skips; empty discovery fails closed |
| Detrimental   | ✅ | Harness trigger disable is teardown-only; pgTAP append-only suite still runs in same job |

## Critical Issues (must fix)

None.

## Warnings (should fix)

None.

## Suggestions (consider improving)

- [ ] **Document AC mapping for navigate/reload** — `packages/db/test/campaign-command.integration.test.mjs:55-61`

  PRD `004A-AC-004` prose says "navigate away → reload"; the test closes the pool and opens a new one. `EXECUTION_LEDGER.md` already records this as the local-provable equivalent. Consider a one-line comment at the pool close site so future readers do not confuse it with in-process cache reuse.

- [ ] **PRD blocker row stale** — `prd-004a-reviewable-go-live-preview-deploy-smoke.md:48`

  The "Real-Postgres round trips are not enforced by CI" blocker is obsolete after this batch. Orchestrator should update the table and `GGL-B16` row in `EXECUTION_LEDGER.md`.

## Plan Item Traceability

| # | Plan Requirement | Status | Implementation Location | Notes |
|---|------------------|--------|-------------------------|-------|
| GGL-B16 | Run `*.integration.test.mjs` inside canonical `pnpm test:db` gate | ✅ | `tooling/scripts/database/run-real-database-tests.mjs:167-210` | Provisions `oalo_test_campaign`, replays migrations, runs integration files |
| GGL-008 / 004A-AC-004 | Create Open House Boost → reload → campaign present in Postgres | ✅ | `packages/db/test/campaign-command.integration.test.mjs:32-84` | CI observed at `dab2ec6` run `35058370796` |
| GGL-009 / 004A-AC-005 | Authorized approver approves; approved state after reload | ✅ | `packages/db/test/campaign-command.integration.test.mjs:86-158` | Denied path (APA-005) + read-repository reload; CI observed |
| APA-005 (fail-closed) | Unauthorized approval must not reach `approved` | ✅ | `campaign-command.integration.test.mjs:117-125` | `creator` principal returns `{ kind: "denied" }` before approver commit |
| Append-only (APA-009) | pgTAP enforces trigger protections | ✅ | `supabase/tests/campaign_activation.pgtap.sql` | CI: `campaign_activation.pgtap.sql .. ok` in run `35058370796` |
| Gate fail-closed | Unset `OALO_TEST_DATABASE_URL` must fail | ✅ | `campaign-integration-support.mjs:21-29`, `real-database-orchestration.test.ts:344-361` | Child-process contract test asserts message |
| Orchestration contracts | `plan.integration` covered | ✅ | `real-database-orchestration.test.ts` (21 tests) | Includes provisioning order, discovery empty error, teardown on failure |

## CI Evidence (personally inspected)

| Field | Value |
|-------|-------|
| Run ID | `35058370796` |
| Head SHA | `dab2ec6b5115bd8f3981282cdd5f4b5be84dd046` |
| Job | Real PostgreSQL migrations and pgTAP (`104673222592`) |
| Result | pass (3m17s) |

Integration excerpts from job log:

```
✔ GGL-008 creates an Open House Boost through commands and reloads it from a fresh pool
✔ GGL-009 approves through the command, rejects an unauthorized principal, and reloads approved state
✔ campaign command PostgreSQL integration
✔ persists monotonic versions...
✔ commits approval...
✔ lists and loads campaigns without locking and isolates tenants
✔ executes through the real driver without retaining prepared statements
✔ round-trips every leased outbox field through the migrated SQL function
✔ resolves and isolates delivery claims for two tenants
✔ atomically persists AI telemetry and durably reconciles telemetry and publication cleanup
```

pgTAP: `campaign_activation.pgtap.sql .. ok` (append-only assertions included).

## Harness Integrity (Duty 2)

Teardown in `cleanupTenants` (`campaign-integration-support.mjs:302-354`) assumes `migration_owner` and disables four `*_append_only` triggers **only inside the cleanup transaction**, then re-enables them before commit. Test bodies run under `app_runtime` via repository helpers; they do not disable triggers. pgTAP runs against the main Supabase database before the disposable `oalo_test_campaign` phase, so append-only protections are independently asserted in the same CI job. `tests/security/database-privilege-escalation-boundary.test.ts` confines trigger-switch strings to the sanctioned harness file. `assertElevationReverted` (`dab2ec6`) prevents elevated roles returning to the pool.

**Ruling:** Teardown does not let assertions pass because protections were disabled during the test body.

## Correlation Ref Fix (Duty 3)

Canonical contract: `^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$/u` (`packages/contracts/src/durable-foundation.ts:9`, migration `20260721010000_platform_foundation.sql:1121`). Hyphen suffixes (`-denied`) are invalid; underscore suffixes (`_denied`, `_approved`) are correct. The test was wrong; the contract was not bent.

## Break-the-Test Spot Check (Duty 5)

| Break | Observed failure |
|-------|------------------|
| Unset `OALO_TEST_DATABASE_URL` | `Error: OALO_TEST_DATABASE_URL is required for PostgreSQL integration tests` (exit non-zero) |
| Disable empty-discovery throw | `AssertionError: expected []` — `discoverIntegrationTestFiles` did not reject |
| Empty `plan.integration` | `AssertionError: expected [] to deeply equal [drop…, create…, apply…, run tests]` |

All experiments restored; `git status` clean.

## Offline Verification (Duty 7)

`pnpm verify:offline` exit 0:

| Suite | Count |
|-------|-------|
| unit | 473 passed (60 files) |
| integration | 41 passed (11 files) |
| contracts | 75 passed (11 files) |
| visual | 8 passed (2 files) |
| e2e-preview | 1 passed (1 file) |
| browser (Playwright) | 23 passed |
| database orchestration | 21 passed (2 files) |

## Ledger Recommendations (orchestrator only)

| Row | Recommended status |
|-----|-------------------|
| GGL-008 | VERIFIED |
| GGL-009 | VERIFIED |
| GGL-B16 | VERIFIED (or DONE) |
| PRD `004A-AC-004` | VERIFIED (in-repo Postgres; operator preview navigate/reload still covered by GGL-B01–B03 for full smoke) |
| PRD `004A-AC-005` | VERIFIED (same scope split) |

## Files Changed

- `docs/operations/database-runtime-role.md` (M) — documents `migration_owner` membership prohibition for app login
- `packages/db/test/campaign-command.integration.test.mjs` (M) — correlation ref separators `_denied`/`_approved`
- `packages/db/test/campaign-integration-support.mjs` (M) — harness elevation, trigger teardown, role revert assertion
- `packages/db/test/postgres-adapter.integration.test.mjs` (M) — uses `withMigrationOwnerTransaction` for seed/cleanup
- `tests/security/database-privilege-escalation-boundary.test.ts` (A) — confines escalation to harness
- `tooling/scripts/database/run-real-database-tests.d.mts` (M) — types for integration phase
- `tooling/scripts/database/run-real-database-tests.mjs` (M) — disposable DB provisioning and integration runner
- `tooling/tests/database/real-database-orchestration.test.ts` (M) — 21 contract tests including URL guard child processes
