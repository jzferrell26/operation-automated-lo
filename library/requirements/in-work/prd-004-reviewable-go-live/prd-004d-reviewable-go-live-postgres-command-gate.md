# PRD-004d: Reviewable Go-Live - Real-Postgres Command Gate

> **Parent:** [PRD-004](./prd-004-reviewable-go-live-index.md)
> **Status:** In work. Tests exist on `main`; no observed run; CI wiring parked as `GGL-B16`
> **Priority:** P1
> **Schema changes:** None
> **Owner Guardians:** `db-guardian`, `devops-guardian`

## Goal

Close the only remaining **locally provable** gap on the go-live path: make the create → fresh-read and approve → fresh-read command round trips execute against real Postgres in an observed run, and then inside the canonical database gate, so `GGL-008` and `GGL-009` can move from `DONE (code)` to `VERIFIED`.

This sub-PRD exists because those two criteria are the only rows in the Gauntlet ledger that are neither externally blocked nor already verified. Everything else left on the go-live path needs an operator, a portal sign-in, or sanitized provider fixtures. This one needs a database URL and a provisioning decision.

## Background (honest)

`packages/db/test/campaign-command.integration.test.mjs` and its sibling integration tests drive the campaign command stack against real Postgres with a fresh read path, not direct SQL. They were authored in PR #61 (`f4b79f7`) and they are statically sound, but **no execution of them has ever been observed**, so PR #61 declined to mark `GGL-008`/`GGL-009` as `VERIFIED`.

Four CI attempts established the exact constraint, recorded in the [`EXECUTION_LEDGER.md`](../../../../EXECUTION_LEDGER.md) raid log: Supabase local cannot hand the gate a second fully initialized database under an `oalo_test_` name.

| Attempt | Failure | Meaning |
| --- | --- | --- |
| `supabase db reset --db-url <clone>` | Ignores the flag, resets the main database | Cannot target a dedicated database |
| `CREATE DATABASE` + migration replay | `42501 permission denied for table locations` | Migration replay is not equivalent to a Supabase-initialized database (missing auth/storage schemas, role grants, default privileges) |
| `CREATE DATABASE ... TEMPLATE postgres` | `permission denied to terminate process` | Local `postgres` role is not superuser and cannot clear superuser sessions holding the template |
| Spawning `node_modules/.bin/pnpm` in the gate | Binary absent in CI (pnpm arrives via Corepack) | Fixed: the gate now enumerates test files and invokes the Node test runner directly |

The CI wiring was reverted to its `origin/main` state so the other eight criteria could ship green. The tests remain runnable on demand.

## Scope

- Choose and record one provisioning route for a real-Postgres test database.
- Obtain one observed run of `pnpm --filter @oalo/db test:postgres` with `OALO_TEST_DATABASE_URL` set, and retain the output.
- Re-wire the tests into the canonical `pnpm test:db` gate so CI enforces them.
- Keep the absence of a database URL an **error** in CI, never a silent skip. Silent skipping is what let this gap survive unnoticed.

## Non-Goals

- Weakening the `oalo_test_` database-name guard at `packages/db/test/campaign-integration-support.mjs`. That guard is a deliberate safety net against pointing the destructive test path at a real database. PR #61 refused to relax it, and this sub-PRD does not reopen that refusal without a `security-guardian` review.
- Running these tests against the review/staging Postgres used by PRD-004a. The integration path is destructive by design.
- Production data, production credentials, or any provider traffic.
- Unblocking any external gate. This gate proves local persistence behavior only.

## Provisioning routes (decision required)

| Route | Mechanism | Trade-off |
| --- | --- | --- |
| R1 | `pg_dump` the initialized local database, restore into an `oalo_test_*` clone | Works without superuser; accepts owner and extension noise in the restore log |
| R2 | Connect as `supabase_admin` for a terminate-and-clone `CREATE DATABASE ... TEMPLATE` | Clean clone; requires a higher-privilege local role in CI |
| R3 | Relax the `oalo_test_` name guard to also accept the canonical local stack | Rejected by PR #61: weakens a deliberate safety net. Needs `security-guardian` sign-off to reconsider |
| R4 | Operator runs the suite once locally on a Docker-capable machine and pastes the output | Satisfies `004D-AC-002` only. Does not satisfy the CI gate in `004D-AC-003` |

R4 is the fastest path to an observed run and can proceed in parallel with the R1/R2 decision.

## Acceptance criteria

| ID | Criterion | Status | GGL row |
|---|---|---|---|
| 004D-AC-001 | The create → fresh-read and approve → fresh-read command round-trip tests exist, drive the command stack (not direct SQL), and are discoverable by `pnpm --filter @oalo/db test:postgres`. | DONE (code on `main`, `f4b79f7`) | `GGL-008`, `GGL-009` |
| 004D-AC-002 | One observed run of those tests against real Postgres passes, and the run output is retained outside git with no connection string in it. | BLOCKED: needs `OALO_TEST_DATABASE_URL` on a Docker-capable machine | `GGL-B16` |
| 004D-AC-003 | The tests execute inside the canonical `pnpm test:db` gate in CI, and the gate fails rather than skips when the test database is unavailable. | BLOCKED: needs a provisioning route decision (R1 or R2) | `GGL-B16` |
| 004D-AC-004 | The chosen provisioning route is recorded here with its outcome, including any route that was tried and abandoned. | OPEN | `GGL-B16` |
| 004D-AC-005 | A missing or non-`oalo_test_` `OALO_TEST_DATABASE_URL` throws instead of skipping, so the suite cannot report success without a real database. | DONE (`requiredTestDatabaseUrl` in `packages/db/test/campaign-integration-support.mjs`) | `GGL-B16` |
| 004D-AC-006 | A non-loopback `OALO_TEST_DATABASE_URL` requires TLS. | DONE (`testDatabaseSslMode`, `security-guardian` close-out, PR #61) | `GGL-008` |
| 004D-AC-008 | When the suite is wired into CI, empty test discovery is an error, so an accidentally empty glob cannot report success. | OPEN (belongs to the CI wiring in `004D-AC-003`) | `GGL-B16` |
| 004D-AC-007 | Nothing in this sub-PRD flips any of the 28 `DEFERRED: LIVE HIGHLEVEL AUTH` criteria. | VERIFIED (no provider surface is touched) | `GGL-B10` |

`004D-AC-001`, `004D-AC-005`, and `004D-AC-006` describe code already merged on `main`. They are recorded as `DONE`, not `VERIFIED`, because the gate that would prove them end to end is exactly what `004D-AC-002` and `004D-AC-003` are waiting for.

## Exact operator ask

Run this on a machine with Docker, against a **disposable** database whose name starts with `oalo_test_`, and paste the output (not the URL):

```bash
OALO_TEST_DATABASE_URL=postgresql://…/oalo_test_integration \
  pnpm --filter @oalo/db test:postgres
```

If you would rather pick a route than run it, state `R1` or `R2` and engineering will wire it.

## Blockers (honest)

| Blocker | Owner | Unblock |
|---|---|---|
| No observed run of the integration tests | Operator / engineering | `004D-AC-002` exact ask above |
| Supabase local cannot provision a second initialized database | Engineering | Choose R1 or R2; R3 needs security review |
| Docker unavailable on the agent VM | Environment | Operator machine or CI runner with Docker |

## Related

- [PRD-004a: preview deploy and smoke](./prd-004a-reviewable-go-live-preview-deploy-smoke.md) (the same round trips, proved on a review URL instead of in CI)
- [Go-live raid ledger](../../../../EXECUTION_LEDGER.md#gauntlet-raid-go-live-remaining-in-repo-code) (`GGL-008`, `GGL-009`, `GGL-B16`)
- [Production tonight operator runbook](../../../knowledge/private/operations/production-tonight-operator-runbook.md)
