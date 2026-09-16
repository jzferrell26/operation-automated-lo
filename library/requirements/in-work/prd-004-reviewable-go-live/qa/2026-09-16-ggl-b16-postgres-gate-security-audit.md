# Security Audit Report: GGL-B16 Real-PostgreSQL Command Gate

**Audit date:** 2026-09-16
**Auditor:** security-guardian
**Branch:** `cursor/gauntlet-postgres-gate-b085` at `34a9582`
**Base:** `origin/main` at `deeb3e2`
**Scope:** `packages/db/test/campaign-integration-support.mjs`, `packages/db/test/campaign-command.integration.test.mjs`, `packages/db/test/postgres-adapter.integration.test.mjs`, `tooling/scripts/database/run-real-database-tests.mjs`, `tooling/tests/database/real-database-orchestration.test.ts`, `docs/operations/database-runtime-role.md`
**Next.js version audited:** 16.3.3
**React version audited:** 19.2.7
**CVE watchlist last refreshed:** 2026-08-26 (within 120 days)

---

## Executive Summary

**Zero unresolved Critical and zero unresolved High findings.** Four Medium findings were raised and all four remediated in-session. Two Low and two Informational findings are logged without fixes.

This batch made the real-PostgreSQL command round-trip tests execute in CI for the first time, closing `GGL-B16` and flipping `GGL-008` and `GGL-009` to VERIFIED. The security-sensitive part is how: the test harness now assumes `migration_owner` and disables four append-only triggers during teardown. Both capabilities were audited directly rather than accepted on the implementer's reasoning.

---

## Verdict: the `SET LOCAL` elevation-leak question

The claim holds. No reachable leak existed, but it rested on driver behavior rather than on anything the harness checked, and one path silently hid the failure that would break it.

The elevation is genuinely transaction-scoped: `SET LOCAL` reverts on commit or rollback, and `begin` precedes it so it is not the no-op-with-warning case. The driver contributes nothing to safety. In postgres 3.4.9, `release()` performs `c.reserved = null; onopen(c)` and nothing else (`src/index.js:220-223`) — no `DISCARD ALL`, no session reset. Ending the transaction is therefore the only mechanism that drops the role, so the question reduces to whether a connection can be released with the transaction still open.

Walking every path: `connect()` rejecting is safe. `begin` rejecting left `open` false so the ROLLBACK was skipped, but `set local role` had not yet run, so there was no elevation — only a residual idle transaction bounded by the 30s `idle_in_transaction_session_timeout`. `set local role` rejecting means the role was never set. The two real paths are `work` rejecting and `commit` rejecting, both of which attempted ROLLBACK and then swallowed its failure via `.catch(() => undefined)`. That combination is unreachable with this driver: ROLLBACK never produces a server error even inside an aborted transaction, and a socket error or statement timeout causes postgres.js to discard the connection, so no elevated session survives to be handed out again.

The pre-fix code was therefore safe by consequence rather than by construction. Both defects are closed.

## Verdict: the trigger-disabling capability

Confined to test code, unreachable from production, transactional, correctly reverted, and now backed by a mechanical control. Five layers support this:

1. DDL is transactional in PostgreSQL, and the disable and re-enable are in one transaction, so either the commit carries the re-enable or the disable never took effect.
2. All four trigger names and tables match the migrations exactly and are the complete set of `*_append_only` triggers.
3. `packages/db/package.json` exports only `.` and is `private`, and the helper is a `.mjs` under `test/` that `tsc` never compiles into `dist/`, so it cannot be imported.
4. At the database level `ALTER TABLE ... DISABLE TRIGGER` requires ownership, and `app_runtime` neither owns the evidence tables nor holds `UPDATE`/`DELETE` on them.
5. The new boundary test, added below.

The residual risk was never import — it was copy-adaptation, sharpened by the fact that `SET ROLE` authorizes against the session role, so any statement on a login role holding `migration_owner` membership can re-assume the schema owner. Nothing prevented that, hence layer 5.

---

## Findings and remediation

| ID | Severity | Location | Finding | Remediation |
| --- | --- | --- | --- | --- |
| M-1 | Medium | `packages/db/test/campaign-integration-support.mjs:109-128` | Cleanup failures were swallowed and `open` was latched after `begin`, so the elevation safety argument rested on driver behavior rather than on a check | Aggregate cleanup failures into an `AggregateError` mirroring `packages/db/src/transaction-context.ts:249-266`, latch `open` before `begin`, and add `assertElevationReverted` running `reset role` plus `select current_user = session_user` after the transaction closes, throwing before release if the role did not revert |
| M-2 | Medium | `tooling/scripts/database/run-real-database-tests.mjs:88-95` | A prefix-only guard fed unquoted `psql` DDL. Not reachable today, since `TEST_DATABASE_NAME` is a module constant and `spawn` uses `shell: false`, but a prefix check does not constrain a value flowing into `drop database ${name}`, and this guard is the named control for the whole destructive-test safety argument | Added `/^oalo_test_[a-z0-9_]{1,40}$/u` plus a hostile-input test |
| M-3 | Medium | `packages/db/test/campaign-integration-support.mjs:73-102` | Nothing prevented the elevation or trigger switches being copied into production code | New `tests/security/database-privilege-escalation-boundary.test.ts` (4 tests, runs in `test:contracts` and CI) fails if the elevation or a trigger switch reaches `apps/**` or any `packages/*/src/**` |
| M-4 | Medium | `docs/operations/database-runtime-role.md:29` | The checklist forbade connecting *as* `migration_owner` but not *membership* | Added the membership prohibition and the runtime-grant invariant |
| L-1 | Low | `tooling/scripts/database/run-real-database-tests.mjs` | Hardcoded local `postgres:postgres` | Accepted. Documented Supabase local CLI default, already present on `origin/main`, cannot be retargeted because the host is a hardcoded `127.0.0.1` constant and the port comes only from committed `supabase/config.toml`, and it travels via `PGPASSWORD` rather than the command line while `runCommand` logs only `step.label` |
| L-2 | Low | Harness scope | Destructive capability grew | Accepted, mitigated by the `/oalo_test_` guard and M-2 |

---

## Confirmations

- The `/oalo_test_` guard is intact and untouched at `campaign-integration-support.mjs:21-30`. The provisioned `/oalo_test_campaign` pathname satisfies it rather than relaxing it.
- An unset `OALO_TEST_DATABASE_URL` fails rather than skipping, because `requiredTestDatabaseUrl()` is called at module top level so the import itself throws. New child-process tests assert both the exit code and the message.
- TLS posture is not regressed. `testDatabaseSslMode` is untouched (loopback `disable`, everything else `require`), backed by `postgres-adapter.ts:165-171` rejecting `disable` outside local and test.
- Append-only protections are intact. Migrations unchanged, all four triggers still `before update or delete`, runtime grants still `SELECT, INSERT` only.
- No production path changed. Nothing under `packages/db/src`, `packages/application/src`, `apps/`, or `supabase/` was modified, and `transaction-context.ts` still limits assumption to `app_runtime` and `support_runtime`.
- No control was relaxed in any touched test. `postgres-adapter.integration.test.mjs` holds 38 `assert.` calls before and after with no removed assertion, no `.skip`, `.todo`, or `.only` anywhere in the batch, and the `42501` cross-tenant permission-denied assertion is retained.

## Gate results

`audit:secrets`, `audit:boundaries`, `audit:product-types`, and `audit:dependencies` (no known vulnerabilities at `--audit-level=high`) pass. `test:contracts` 75 tests (up from 71), `vitest --project database` 21 tests (up from 20), and the full `verify:offline` passes with exit 0.

`pnpm test:db` was not run locally: Docker is unavailable on the audit VM. CI's `database` job proves it. The gate was touched, so CI-greenness is justified statically: `reset role` and the `current_user` select travel the same `driver.unsafe(..., { prepare: false })` path as the `begin`, `commit`, and `set local role migration_owner` statements already green in CI, they run only after the transaction closes, and a ROLLBACK with no transaction open returns success with a warning that the pool's `onnotice: () => undefined` suppresses.

## Follow-up requiring a product decision

`NEEDS HUMAN REVIEW`, not blocking. The robust version of M-3 and M-4 is a schema change: apply migrations with a dedicated login role and revoke `migration_owner` membership from the app login role, which makes the capability impossible rather than forbidden. That requires a migration and therefore conflicts with PRD-004's "Schema changes: None", so it is recorded here rather than actioned.
