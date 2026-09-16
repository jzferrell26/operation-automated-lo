# PRD-004d: Reviewable Go-Live - Real-Postgres Command Gate

> **Parent:** [PRD-004](./prd-004-reviewable-go-live-index.md)
> **Status:** Complete. Route R5 adopted; observed CI run; gate wired. `GGL-008` and `GGL-009` are VERIFIED
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

## Provisioning routes (decided: R5)

**R5 was adopted. No operator decision is required and R1 through R4 were not needed.** The framing of the routes above assumed the problem was provisioning a second initialized database. It was not. See the outcome below, which satisfies `004D-AC-004`.

| Route | Mechanism | Outcome |
| --- | --- | --- |
| **R5** | **Have the harness assume `migration_owner` for seeding and teardown, then provision a plain disposable `oalo_test_` database in the gate** | **ADOPTED.** Proven by CI run [`35058370796`](https://github.com/jzferrell26/operation-automated-lo/actions/runs/35058370796). Needs no superuser, no new CI infrastructure, and no change to the name guard |
| R1 | `pg_dump` the initialized local database, restore into an `oalo_test_*` clone | Not needed. Would have worked, but solves a provisioning problem that turned out not to be the blocker |
| R2 | Connect as `supabase_admin` for a terminate-and-clone `CREATE DATABASE ... TEMPLATE` | Not needed, and would have raised the privilege floor in CI |
| R3 | Relax the `oalo_test_` name guard to also accept the canonical local stack | Rejected and stays rejected. It weakens a deliberate safety net, and R5 makes it unnecessary |
| R4 | Operator runs the suite once locally on a Docker-capable machine and pastes the output | Not needed. CI produced the observed run instead, so no operator action was required |

### Why the first four attempts failed, and what the blocker actually was

Four attempts tried to hand the gate a second fully-initialized Supabase database named `oalo_test_*`, and all four failed:

1. `supabase db reset --db-url` classifies its target by host and port only, discards the database name, and performs a full local reset that destroyed the database the prior step had just created.
2. A plain `CREATE DATABASE` plus migration replay produced a database the tests could reach, then failed with `42501 permission denied for table locations`.
3. `CREATE DATABASE ... TEMPLATE postgres` could not proceed, because Supabase local's `postgres` role is not superuser and cannot terminate the superuser sessions holding the template open.
4. The wiring was reverted and parked as `GGL-B16`.

The real cause was role membership, not provisioning. `supabase/migrations/20260721010000_platform_foundation.sql` creates `migration_owner` and the runtime roles as `nologin nosuperuser noinherit`, grants them to the login role **`WITH SET TRUE, INHERIT FALSE`**, and makes `migration_owner` own every schema with `public` revoked. Because of `inherit false`, a login role holds no privileges on those objects until it explicitly assumes the owning role. `packages/db/src/transaction-context.ts` already did this for the tenant path via `set local role app_runtime`; the harness did not, so `seedTenant` and `cleanupTenants` wrote to `platform.locations` as the bare login role. Only a SUPERUSER could reach those tables without assuming the owner, which is exactly why the harness worked against a plain PostgreSQL and failed on Supabase local.

R5 therefore removes a superuser assumption rather than satisfying one. A second obstacle surfaced during implementation and is handled: the evidence tables carry BEFORE UPDATE OR DELETE append-only triggers with `ON DELETE RESTRICT` foreign keys, and `session_replication_role` is a `SUSET` GUC requiring superuser, so teardown disables the four named triggers as their owner, transactionally.

## Acceptance criteria

| ID | Criterion | Status | GGL row |
|---|---|---|---|
| 004D-AC-001 | The create → fresh-read and approve → fresh-read command round-trip tests exist, drive the command stack (not direct SQL), and are discoverable by `pnpm --filter @oalo/db test:postgres`. | VERIFIED (CI run `35058370796` at head `dab2ec6`) | `GGL-008`, `GGL-009` |
| 004D-AC-002 | One observed run of those tests against real Postgres passes, and the run output is retained outside git with no connection string in it. | VERIFIED. CI run `35058370796` at head `dab2ec6` executed both round trips against a disposable `oalo_test_campaign` database; the run output lives in the CI log, outside git, and contains no connection string | `GGL-B16` |
| 004D-AC-003 | The tests execute inside the canonical `pnpm test:db` gate in CI, and the gate fails rather than skips when the test database is unavailable. | VERIFIED. The tests run as an ordered step inside `pnpm test:db`, which the CI `database` job executes, and an unset test database URL fails the gate rather than skipping | `GGL-B16` |
| 004D-AC-004 | The chosen provisioning route is recorded here with its outcome, including any route that was tried and abandoned. | VERIFIED. R5 adopted and recorded above, with all four abandoned attempts and their exact failures | `GGL-B16` |
| 004D-AC-005 | A missing or non-`oalo_test_` `OALO_TEST_DATABASE_URL` throws instead of skipping, so the suite cannot report success without a real database. | VERIFIED. `requiredTestDatabaseUrl` throws at module top level, so the import itself fails; child-process tests assert both the exit code and the message | `GGL-B16` |
| 004D-AC-006 | A non-loopback `OALO_TEST_DATABASE_URL` requires TLS. | VERIFIED (`testDatabaseSslMode`; loopback `disable`, everything else `require`) | `GGL-008` |
| 004D-AC-008 | When the suite is wired into CI, empty test discovery is an error, so an accidentally empty glob cannot report success. | VERIFIED. Migration and test-file discovery both throw on an empty list, so an empty glob cannot report success | `GGL-B16` |
| 004D-AC-007 | Nothing in this sub-PRD flips any of the 28 `DEFERRED: LIVE HIGHLEVEL AUTH` criteria. | VERIFIED (no provider surface is touched) | `GGL-B10` |

`004D-AC-001`, `004D-AC-005`, and `004D-AC-006` describe code already merged on `main`. They are recorded as `DONE`, not `VERIFIED`, because the gate that would prove them end to end is exactly what `004D-AC-002` and `004D-AC-003` are waiting for.

## Exact operator ask

**None. This sub-PRD needs nothing from an operator.** The ask that used to live here was to run the suite on a Docker-capable machine, or to pick a provisioning route. CI produced the observed run instead, so neither is required.

To reproduce locally on a Docker-capable machine, `pnpm test:db` now runs the suite as part of the canonical gate. No environment variable needs to be supplied by hand; the gate provisions the disposable database and exports the URL itself.

## Blockers (honest)

**None remain.** All three original blockers are closed:

| Blocker | Resolution |
|---|---|
| ~~No observed run of the integration tests~~ | CI run `35058370796` at head `dab2ec6` ran both round trips green against real Postgres |
| ~~Supabase local cannot provision a second initialized database~~ | Not the actual blocker. Role membership was; R5 fixes it and needs no second initialized database |
| ~~Docker unavailable on the agent VM~~ | Still true of the agent VM, and no longer load-bearing: the CI `database` job on `ubuntu-24.04` has Docker and runs the gate |

## Related

- [PRD-004a: preview deploy and smoke](./prd-004a-reviewable-go-live-preview-deploy-smoke.md) (the same round trips, proved on a review URL instead of in CI)
- [Go-live raid ledger](../../../../EXECUTION_LEDGER.md#gauntlet-raid-go-live-remaining-in-repo-code) (`GGL-008`, `GGL-009`, `GGL-B16`)
- [Production tonight operator runbook](../../../knowledge/private/operations/production-tonight-operator-runbook.md)
