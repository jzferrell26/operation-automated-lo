# Domain CI fixture corrections, October 14, 2026

Scope: test fixtures only, on `codex/domain-completion` at `bae4fa65f59df7aa0db854f869b5633bc2ff4141`. Production lifecycle, privileges, migration, HTTP, proxy, model, UI, baselines and root ledger remain outside this correction packet.

## Observed CI evidence

Run [38523268542](https://github.com/jzferrell26/operation-automated-lo/actions/runs/38523268542), database job [115717651200](https://github.com/jzferrell26/operation-automated-lo/actions/runs/38523268542/job/115717651200):

- The new domain pgTAP file passed all 11 assertions.
- `phase0_scaffold.pgtap.sql` assertion 11 found 32 tenant tables and expected 31. Its original plan contained 22 assertions.
- The domain PostgreSQL suite passed four cases and failed two. The artificial expiry UPDATE failed with `permission denied for table funnel_domains`. The following public-owner case failed at its initial connect with `DOMAIN_CONFLICT`.
- The full web PostgreSQL result was 321 passed and 2 failed, across 26 files. These historical results do not establish success for the corrected fixtures.

The original test source is retained in commit `bae4fa65f59df7aa0db854f869b5633bc2ff4141`: Git blob `670565ea6ccb0da6fccf2b30d943530d1ffe29db` for the domain test and `7ac833d7cb27e11f50f581c3c5485c521ead181a` for the scaffold test. The downloaded job log is retained locally in ignored `tmp/domain-ci-diagnosis-job-115717651200.log`, SHA-256 `76d4da63304309c2a3706aaf0121c5d1cefa83326014b47f42b6361147d364d5` (UTF-8 shell capture).

## Diagnosis and correction

The artificial expiry fixture attempted a privileged UPDATE through the ordinary route-test connection. Its refusal was correct. The failed assertion prevented the trailing disconnect, leaving a current claim. The next case attempted to connect a different hostname using the same owner. The existing migration's exact-owner connect guard rejects this situation with SQLSTATE `40001`, translated to `DOMAIN_CONFLICT`. The failure sequence and source identify fixture contamination; no production privilege change is warranted.

The expiry case now explicitly expects SQLSTATE `42501` from the original unprivileged UPDATE. Only after that negative assertion does it invoke the existing sanctioned `withMigrationOwnerTransaction` helper through `route-seeding-bridge.js` to change one artificial fixture row. The privileged write is guarded by local environment, loopback hostname and an exact `oalo_test_` database-name pattern. It checks that exactly one row changed. The existing helper confines elevation to a transaction and checks restoration before returning the connection. No new elevation statement or production capability was added.

An `afterEach` hook attempts disconnect for both fixture owners through the product command. It awaits both attempts and reports any cleanup failures with `AggregateError`, so a failing assertion cannot silently carry a live claim into the next case. All six existing PostgreSQL cases and their owner, race, stale-proof, capture and receipt assertions remain selected.

The scaffold expectation is exactly 32 tenant tables. A new `has_table('campaign', 'funnel_domains', ...)` assertion names the thirty-second table, and the plan is exactly 23. Existing inventory, owner-role, foreign-key index, enabled-RLS and forced-RLS assertions remain intact. No dynamic count, skipped assertion or broadened privilege is used.

## Verification on the correction packet

- `pnpm --filter @oalo/web typecheck`: PASS.
- `pnpm exec vitest run --project contracts tests/security/database-privilege-escalation-boundary.test.ts`: 4 PASS. This confirms the unchanged sanctioned elevation boundary.
- Focused unit selection covering domain provider/store/routing/model, existing public-funnel crypto and all three proxy files: 67 PASS across 8 files.
- Scoped `oxlint` and Prettier for the domain PostgreSQL fixture: PASS.
- `pnpm audit:boundaries`: PASS, including rejection of the existing prohibited-dependency fixture.
- `pnpm audit:product-types`, `pnpm audit:secrets`, and `git diff --check`: PASS.
- Actual corrected PostgreSQL and pgTAP execution: NOT RUN locally. Docker is unavailable in this session. Fresh hosted CI after Security and Quality is required to prove those results.

No test timeout, worker count, threshold, runtime grant, production migration or provider behavior changed. The separately owned UI error-code correction is not part of this packet. No Git write, deployment, live provider call or customer communication was performed.

## Frozen source pins

| File                                                  | SHA-256                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| `apps/web/src/server/funnel-domains.postgres.test.ts` | `1089f311827566226c59df87bc3f8495a52a1db58915a02e2c009ae7ce3570b5` |
| `supabase/tests/phase0_scaffold.pgtap.sql`            | `c53cf739888013b4357ebb58faa6a16ff056f03b56eb5d3f28ad254a4dd8847d` |

These two source files and this diagnosis report are released to the parent for ordered Security and Quality review. This report does not mark any full domain criterion complete.
