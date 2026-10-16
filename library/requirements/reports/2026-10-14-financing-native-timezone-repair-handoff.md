# Financing native PostgreSQL timezone repair handoff

Date: October 14, 2026. Owner: db-guardian. Scope: the already reserved additive migration `20261014120000_financing_public_http.sql`, one new PostgreSQL regression file, and this handoff. Independent Security then Quality review is required for this delta. The prior public runtime Security receipt is historical for its prior source pins.

## Confirmed failure

The root's unmodified native run used PostgreSQL 17.11 on Windows, postgres.js 3.4.9, the exact 21-migration baseline and the original four-connection pool/reservation helper. It retained America/Chicago as the cluster timezone. Its 27 original financing/admission cases produced 18 passes and nine failures, with valid captures refused as `Financing capture time invalid`. The retained log is `tmp/native-property-root.log`, SHA-256 `9b7df735110923bc6c9f4422e0b42aecddddc15e5644b386f380956b5e6dfa0a3`.

The application already requires an absolute retention duration of `30 * 86_400_000` milliseconds at `packages/application/src/financing-release.ts:649` and checks that duration at line 666. The original SQL capture guard at `supabase/migrations/20261014051000_financing_release.sql:459` and the inquiry table constraint at line 151 instead use `interval '30 days'`. PostgreSQL applies the day component using the current timezone. This differs from a fixed hours component around daylight saving transitions. See [PostgreSQL 17 date/time arithmetic](https://www.postgresql.org/docs/17/functions-datetime.html).

A controlled native query confirmed both transitions without replacing the clock, changing the cluster, or changing a source function:

| America/Chicago acceptance | Calendar 30 days | Absolute 720 hours |
| --- | --- | --- |
| 2026-10-14 12:00:00Z, crossing fall transition | 721 hours | 720 hours |
| 2026-02-20 12:00:00Z, crossing spring transition | 719 hours | 720 hours |

Both calendar calculations become exactly 720 hours in UTC. Calendar one-day quota arithmetic likewise yields 25 or 23 hours at the fixed fall/spring boundaries; explicit 24 hours remains 24.

## Bounded repair

- The additive migration sets function-local `TimeZone='UTC'` on the renamed private capture implementation using `ALTER FUNCTION`. Its `prosrc` remains byte-identical to the original function body.
- The public/app capture wrapper also sets function-local UTC. The original guard and its insert's table constraint are therefore evaluated in UTC. The caller's timezone is restored on successful return and exception. See [PostgreSQL 17 function settings](https://www.postgresql.org/docs/17/sql-createfunction.html) and [ALTER FUNCTION](https://www.postgresql.org/docs/17/sql-alterfunction.html).
- All three rolling-day quota expressions use `interval '24 hours'`. The limits remain 20 per client/publication in ten minutes and 5,000 per publication in the preceding 24 hours. The retry ceiling stays 86,400 seconds.

No change was made to the original 20-migration financing body, runtime source packet, approval/current-source checks, public scope, admission locks, replay rules, role grants, freshness window, ciphertext contract, retention duration or global timezone. Existing RLS, indexed FKs and private-entry denial remain covered by the unchanged suite. This is a repair of the existing application policy, not a new retention policy.

The repair adds function catalog configuration and changes expressions in the new function definition. It adds no table DDL, row rewrite or data backfill. The containing unapplied additive migration retains its existing new-table/index/FK lock notes. Function configuration is catalog metadata; no inquiry-table `ACCESS EXCLUSIVE` lock or rewrite is introduced by this delta. Keep `lock_timeout='5s'`. Reverting the UTC settings would restore the demonstrated defect; use a forward repair if a later issue is found. The migration remains unapplied to hosted production.

## Verification and retained RED evidence

The new seven-case test file first ran on a fresh native disposable database using the exact preceding additive migration bytes, verified as SHA-256 `6d4237ad9760401ed56946ea9e3aee98aa2c41a3ac9f82b3cbcd259ad76316c9`. It produced three passes and four failures. Actual caller-local Chicago and New York captures failed with the same native refusal; UTC and Auckland controls passed. Missing UTC function configuration and calendar-day quota assertions also failed. `tmp/native-financing-timezone-red.log` is retained, SHA-256 `de3a5854694a36c8cef854858a0f583cb3f0f7cb28cc1ea49bf20fd06dcf8fa3`.

The repaired run applied all 21 source migrations to a separate native disposable database. The original 27 financing/admission tests and the seven new tests passed: **34/34, zero failures, zero skips, 40.3 seconds**. The actual independent connections, original reservations and concurrent last-slot/retry tests were used. No PostgreSQL WASM adapter, source clock hook, test-only capture implementation, application activation flag or provider transport was used. The cluster remained America/Chicago, and the post-run active fixture location count was zero. `tmp/native-financing-timezone-green.log` is retained, SHA-256 `9c4a21878dff2a9c98f32bc2f10d057aaa9d40bf763ded3aea45ae0047c300e8`.

The seven new cases cover:

- Both protected function UTC configurations and exact original private `prosrc` equality.
- Deterministic spring/fall calendar-versus-absolute retention and quota calculations.
- Actual native capture and exact replay under caller `SET LOCAL` Chicago, New York, Auckland and UTC, including restoration after successful calls and rejected calls.
- Refusal of expiry shorter or longer by an hour, acceptance six minutes old, and acceptance in the future. The original five-minute window remains enforced.
- Actual inquiry table checks at historical spring/fall acceptance dates, with 720-hour expiry accepted and 719/721-hour expiry rejected. Historical inserts qualify the constraint only; capture freshness is tested using the native clock above.

The dedicated SQL time tests use a clearly synthetic ciphertext shape and do not claim decryption or provider delivery qualification. The original 27 tests separately exercise the actual encrypted repository path, export, expiry, purge, public admission, source withdrawal and replay boundaries.

Additional checks: new-file syntax, oxlint and Prettier pass; 14 database privilege boundary contract tests pass; the 16-package boundary audit and prohibited-edge fixture pass; secret audit passes. An initial focused contract command used a nonexistent filename and ran no tests; the corrected `tests/security/database-privilege-escalation-boundary.test.ts` invocation passed all 14. This does not replace independent Security or Quality review.

## Frozen source pins

| File | SHA-256 |
| --- | --- |
| `supabase/migrations/20261014120000_financing_public_http.sql` | `923ef0874551a65fcd2342d27a5d1ce0455124c5cc70bc953936a0dfc51d4afa` |
| `packages/db/test/financing-native-timezone.integration.test.mjs` | `f91fe7102eb897a37f9ebf79d1b560e1ac11c28f5376a5f800cc693995a8a0f8` |
| Original unchanged `supabase/migrations/20261014051000_financing_release.sql` | `0b0bd282e4a12ef47ccc512d6ab63527210c93f80c1ef8282ad08ef81bb70104` |

The ignored runner `tmp/native-financing-timezone-run.mjs` verifies the selected migration pin, creates only its exact generated `oalo_test_fintz_native_<12 hex>` database, and removes only that database. It leaves the root-owned native server running. The original root runner, its frozen pin and its RED log were not modified. Root owns cluster shutdown, scaffold inventory, Git operations and the next independent review.
