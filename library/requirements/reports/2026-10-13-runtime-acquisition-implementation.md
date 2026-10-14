# Bounded runtime acquisition and timing implementation

Date: October 13, 2026, America/Chicago. Implementer: typescript-node-guardian, using the managed TypeScript/Node Weapon and its async, error-handling and test procedures. This is an implementation handoff for independent Security then fresh Quality, not an independent acceptance or hosted recovery report.

## Result and authority

The public `DatabasePool.connect()` implementation now rejects a reservation that exceeds the existing validated `connectTimeoutSeconds` budget, default 10 seconds, range 1 through 30. It raises the typed `DB_ACQUISITION_TIMEOUT` error. PostgreSQL startup retains its existing same configured budget. Statement and idle transaction budgets, TLS, transaction pooling, prepared-statement restrictions and tenant verification remain intact.

The root Warden assigned this bounded work in `codex/authenticated-runtime-diagnosis`, created from `origin/main` at `728d5f0eb463bbf6abfe2519470fa536c022fa15`. Its scope responds to confirmed authenticated Campaigns and Ads library function timeouts described in [the read-only diagnosis](2026-10-13-live-library-timeout-review.md). Root subsequently reported an actual Brand 504 as further evidence. None of those failures identifies the stalled stage. The acquisition gap is source-supported, but it is not a confirmed production root cause.

No migration, dependency pin, authorization policy, provider state, hosted setting, deployment, customer record or external message changed. Source is uncommitted. Root owns the ledger and later parent integration.

## Reservation lifecycle

Each acquisition owns one deadline and a pending close callback. Success or driver rejection clears both. Pool closure marks the pool closed and rejects every pending acquisition immediately, before awaiting the existing driver shutdown with `{ timeout: 5 }`. A closed pool refuses new callers; a close before reservation startup prevents that startup.

Postgres.js reservation promises have no queue cancellation API. Both continuations remain attached after timeout or closure. A connection that arrives late is released once and never returned to its abandoned caller. Late rejection is handled without an unhandled promise rejection. A late-release exception is represented only as fixed `cleanup_failed` diagnostic data; the abandoned caller has already received its timeout or closure failure. The optional observer cannot throw into acquisition or release.

This bounds application waiting for each acquisition, not total request duration or the lifetime of the driver's queue entry. Timed-out entries remain queued until the driver resolves, rejects or shuts down. The existing driver shutdown timeout is retained, not replaced with a new application-wide close deadline. Timers also depend on the Node event loop making progress.

## Diagnostic activation and privacy

Diagnostics are disabled unless the server environment contains the exact string `OALO_RUNTIME_TIMING_DIAGNOSTICS=true`. No hosted variable was set. Invalid diagnostic values remain silent and cannot weaken authentication. Pool composition fingerprints include whether this flag is enabled so cached pools do not retain the wrong diagnostic mode.

When enabled, `console.info` emits the fixed prefix `oalo-runtime-timing` and a strictly validated object containing only:

- `stage`: `authentication_pool`, `campaign_pool`, `principal`, `shell_display`, `shell_email_verification` or `saved_brand`.
- `outcome`: `started`, `succeeded`, `failed`, `timed_out`, `closed`, `late_released` or `cleanup_failed`.
- `elapsedMilliseconds`: a nonnegative safe integer derived from the monotonic elapsed clock.

The emitter reconstructs the object. Extra runtime observation fields are discarded; invalid stages, outcomes and timing are refused. There are no URLs, SQL, actor/location/session identifiers, request identifiers, emails, brand values, credentials, tokens, operation results, raw errors or stack traces. Sink failure cannot change an operation result or original exception. These are local runtime log observations; no telemetry exporter was added.

Principal resolution still requires its real session, current binding and identity checks. The mandatory-auth regression feeds a stalled public pool into the actual principal resolver: acquisition timeout rejects before any role or identity read. Optional display and verification observations surround the actual reads inside their existing truthful fallback handlers, so a failed display records `failed` before its neutral fallback. Saved-brand preference errors are observed and rethrown, never relabeled as saved brand or replaced by samples.

Stages carry no application correlation identifier. Concurrent request logs may interleave. Hosted request association and the last completed stage still require actual platform log evidence; this source increment does not create that evidence.

## Verification

Node 24.18.0 and pnpm 11.15.1, with frozen-lockfile installation, were used locally.

| Check | Result and evidence under ignored `test-results/` |
| --- | --- |
| Corrected test-first acquisition probe against the old adapter | Four failure-path tests RED, healthy control GREEN. `runtime-acquisition-red-corrected-harness.log`. The first exploratory mock used a dependency path that did not match the importing package; corrected harness targets its declared package dependency before proving RED. |
| Targeted Vitest run | 102 tests passed in seven files, no unhandled rejection report. `runtime-focused.log`. Includes 15 acquisition cases, nine timing cases and the integrated failed-display observation case. |
| Existing offline Node DB suite | 19 tests passed across configuration, SQL contracts and tenant transactions. `runtime-db-offline-tests.log`. |
| DB and authentication dependency builds | All four DB dependency tasks and both authentication dependency tasks passed. TypeScript package builds only, no Next production build. `runtime-db-dependency-build.log`, `runtime-auth-dependency-build.log`. |
| DB, web and tooling typechecks | Passed. `runtime-db-typecheck.log`, `runtime-web-typecheck.log`, `runtime-tooling-typecheck.log`. |
| Existing oxlint and scoped Prettier checks | Passed. `runtime-lint.log`, `runtime-format.log`. |
| Existing duplication gate | Zero clones, zero threshold unchanged. `runtime-dup.log`. |
| Existing boundary audit | All 16 packages passed; fixture correctly rejected two prohibited edges. `runtime-boundaries.log`. |
| Diff whitespace | `git diff --check` passed. |

The acquisition cases exercise default and configured deadlines, late release after timeout and close, every pending caller rejected before driver shutdown completion, late rejection, original driver errors, healthy execute/release, throwing observers, sanitized cleanup failure, strict timeout bounds and mandatory authentication failure. Fake timers control the wall-clock deadline; the mocked boundary is the third-party Postgres driver, not the public pool or authorization resolver.

The package's broad `pnpm --filter @oalo/db test` glob also includes real PostgreSQL integration files. It was attempted, first exposed an unbuilt test-support authentication dependency, and then correctly refused absent `OALO_TEST_DATABASE_URL` after that dependency was built. Those attempts are retained in `runtime-db-tests.log`; they are not passing real-PostgreSQL proof. Docker and a disposable PostgreSQL runtime were unavailable. The separately named offline files passed. Actual PostgreSQL, full CI, independent Security/Quality, parent dependency patch integration, hosted diagnostic activation, repeated authenticated navigation and production recovery remain pending.

Main's inherited Next.js 16.3.6 HIGH advisory is not waived. Root plans to stack this source onto the already patched parent branch before release verification. No dependency patch was duplicated here.

## Source pins for independent handoff

| Owned file | SHA-256 |
| --- | --- |
| `packages/db/src/postgres-adapter.ts` | `2ca171f6507bce359f64d02bea2067aa454996d3568133d442c9fa394127d45f` |
| `packages/db/src/index.ts` | `bc9101eca17eeddfa9d43d7426e1963bf9b22f07955165e7de871b101d521ceb` |
| `tooling/tests/unit/postgres-acquisition.test.ts` | `01c07a48e0ed1f513a0c587548b903387de3af9e67617efb87f231e66ea6a199` |
| `apps/web/src/server/runtime-timing.ts` | `c4d4786d8ad294e8fb7e828f08a7dae6d98e66a02982b4ab9e099992c745a1da` |
| `apps/web/src/server/runtime-timing.unit.test.ts` | `0865c9fbe1fa682760c79d966900df10e95610de75e29966904b594e28550464` |
| `apps/web/src/server/authenticated-principal.ts` | `310794a3a7aed57810e112fd626463d430c720d70736990fcc89e1379cfe203a` |
| `apps/web/src/server/runtime-authentication.ts` | `da6be8a73e1bb61741edddd215a6588c6daca6260fc393b10ce9969f5ef1fce8` |
| `apps/web/src/server/runtime-authentication.unit.test.ts` | `4041cb1482b6a4f92879cec2a93cd0af5250432f8e930fdd33c7f21def5dc923` |
| `apps/web/src/server/campaign-persistence-runtime.ts` | `2e8eb01ff4f4f90e60daadca9d90544c1274b7e0aa84a8be97b4065bd7e0b4be` |
| `apps/web/src/server/ad-brand-read.ts` | `2490dc198eeafc01d8b2e670e543efcc4c0357b8991f373ef1d2081213a2132b` |
