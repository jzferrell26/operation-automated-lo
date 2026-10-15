# Financing export CI cleanup prerequisite

Date: 2026-10-14. Owner: db-guardian. Base: `39a971aed6f10e690af3305f3d7a0c61d6babfba`, branch `codex/property-marketing-release`, PR #98. All prior handoffs and Security/Quality/HOLD reports remain unchanged.

The remaining CI failure occurred in cleanup after successful export, not in the export query or decryption. The assigned migration now grants `scheduler_runtime` schema `USAGE` so it can resolve the fixed cleanup functions it already has permission to execute. This prerequisite adds no schema `CREATE`, table access, role membership, or function execution grant. The repository, export query, authority checks, timeouts, and all row bounds are unchanged.

## Actual CI result

[Real PostgreSQL migrations and pgTAP, run 38534932265, job 115755400575](https://github.com/jzferrell26/operation-automated-lo/actions/runs/38534932265/job/115755400575) completed with failure. The full log was retrieved with:

```powershell
gh api repos/jzferrell26/operation-automated-lo/actions/jobs/115755400575/logs
```

Ignored local copy: `tmp/financing-pg-diagnostic/ci-115755400575.log`.

- Lines 2193-2198 confirm financing pgTAP passed all 42 checks.
- Lines 2370-2391 show 17 of the 18 financing PostgreSQL cases passed, including the raw anonymous SQL denial cases and the previous JSON transport repair.
- Lines 2403-2409 report 31 of 32 total real PostgreSQL tests passed, one failed, zero skipped. The other 14 tests passed.
- Lines 2414-2425 locate the one failure at test line 848, compiled repository line 469, with the sanitized `UNAVAILABLE` result.

Test line 848 calls `purgeExpiredMarketingInquiries` after the assertions on 1,000 ordered exports and actual decrypted payloads. Compiled repository line 469 parses the cleanup result. The initial export-failure label described the containing test, not the failed operation. Its approximately 5.2-second duration includes the preceding 1,005 genuine encrypted captures and export; it does not establish a timeout.

## Exact isolated SQL reproduction

The existing ignored diagnostic tools run PostgreSQL 17.5 compiled to WASM with a real PostgreSQL wire server and the repository's postgres.js 3.4.9. `export-probe.mjs` installs all 20 exact migration files, in order, into a fresh isolated engine. It invokes the unchanged actual Node integration module, selecting the export test, with the real pool, tenant fixture, source/evidence admission, approval/publication, 1,005 actual encrypted captures, export, schema validation, decryption, ordering and latest-1,000 assertions.

The diagnostic-only preload delegates every connection and statement to the real driver. It records a failed statement's identifier, SQLSTATE, message, and elapsed time before rethrowing; it neither replaces SQL results nor changes authority or timeout settings.

```powershell
node tmp/financing-pg-diagnostic/export-probe.mjs
```

RED against the original migration, exit 1:

```text
RAW_BACKEND_FAILURE {"statement":"financing-release.purge.v1","code":"42501","message":"permission denied for schema campaign","elapsedMilliseconds":2}
```

The original 1,005 captures, export and all decrypted-result/order assertions completed before this failure. Full RED log: `tmp/financing-pg-diagnostic/export-red.log`. There was no statement timeout.

GREEN after the one namespace prerequisite, exit 0: the selected actual PostgreSQL integration case passed, zero skipped. Repeated on the final regression assertions, it passed in approximately 7.45 seconds; full selected run duration was approximately 7.84 seconds. Final log: `tmp/financing-pg-diagnostic/export-green.log`. This qualifies the targeted case in the isolated engine, not the full canonical PostgreSQL CI job.

Probe pins:

| Ignored diagnostic file                        | SHA-256                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| `tmp/financing-pg-diagnostic/export-probe.mjs` | `bb500fa21838c6791f85a875ddf9901282972a75b79b853ea8c1a77103b06526` |
| `tmp/financing-pg-diagnostic/trace-driver.mjs` | `f40d96549b49c0199235282f5a57ca1478445da3db4ed6dd8df77946fcb893db` |

## Minimal correction and regressions

The earlier funnel retention migration and assigned financing migration grant execution on their cleanup functions, but neither grants `scheduler_runtime` `USAGE` on the containing `campaign` schema. The foundation grants this role usage only on `platform` and `integration`. The actual backend denies namespace lookup before it can enter the authorized cleanup function.

The assigned `20261014051000_financing_release.sql` receives only a comment and:

```sql
grant usage on schema campaign to scheduler_runtime;
```

No function implementation, signature, table/index/RLS definition, finite execution grant, row limit, retention interval, or production/test timeout changes.

The existing actual export case keeps all 1,005 encrypted captures and all latest-1,000/decryption/order assertions. It additionally asserts that the scheduler has schema `USAGE` while having no schema `CREATE`, no financing or funnel inquiry table access, no private export execution, and no `app_runtime` or `migration_owner` role membership. The subsequent real combined cleanup invocation must succeed with its unchanged 25,000 total bound. All 18 financing PostgreSQL cases are retained.

A focused unit regression requires the schema prerequisite and forbids direct scheduler table or schema creation grants. It failed before the migration correction (exit 1), then passed with the full local suite. The real backend RED and GREEN above provide the behavioral proof beyond SQL-text inspection.

## Validation

| Command                                                                                                                                               | Result                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `node tmp/financing-pg-diagnostic/export-probe.mjs` before repair                                                                                     | RED, actual `42501` at cleanup, exit 1                              |
| Same command after repair and final permission assertions                                                                                             | GREEN, selected actual PostgreSQL case passed, exit 0, zero skipped |
| `pnpm exec vitest run --project unit tooling/tests/unit/financing-release-database.test.ts`                                                           | Exit 0, 29 tests passed                                             |
| `pnpm exec vitest run --project unit tooling/tests/unit/financing-release-database.test.ts tooling/tests/unit/financing-release.test.ts`              | Exit 0, 128 tests passed                                            |
| `node --test packages/db/test/financing-release-repository.test.mjs`                                                                                  | Exit 0, 21 tests passed, zero skipped                               |
| `pnpm --filter @oalo/db typecheck`                                                                                                                    | Exit 0                                                              |
| `pnpm exec tsc --noEmit -p tsconfig.tooling.json`                                                                                                     | Exit 0                                                              |
| `pnpm exec oxlint packages/db/test/financing-release-repository.integration.test.mjs tooling/tests/unit/financing-release-database.test.ts`           | Exit 0                                                              |
| `pnpm exec prettier --check packages/db/test/financing-release-repository.integration.test.mjs tooling/tests/unit/financing-release-database.test.ts` | Exit 0                                                              |
| `git diff --check`                                                                                                                                    | Exit 0                                                              |

## Released pins and remaining gate

| File                                                                 | SHA-256                                                            |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `supabase/migrations/20261014051000_financing_release.sql`           | `0b0bd282e4a12ef47ccc512d6ab63527210c93f80c1ef8282ad08ef81bb70104` |
| `packages/db/test/financing-release-repository.integration.test.mjs` | `0607a6a27aba8243cd760e062eb879ce45e3a5bc140126774062f9e79c53fec6` |
| `tooling/tests/unit/financing-release-database.test.ts`              | `3f8aea02a0729509e6f71cc8a9741923486ffe1bf280dee37c8af5128b7313d8` |
| `packages/db/src/financing-release-repository.ts`, unchanged         | `005247422bb3576ceafe8898a81bc12052308024a1744b2f242c7831f1dbdd1e` |

The parent authorized this exact narrow schema prerequisite after the raw reproduction. The parent owns fresh Security, then Quality, then a full canonical PostgreSQL CI rerun. The recorded CI job remains failed until that rerun succeeds. No commit, push, provider operation, deployment, dependency, gate, numbered migration, or other agent's output file was changed by this repair.
