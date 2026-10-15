# Financing PostgreSQL JSON transport repair

Date: 2026-10-14. Owner: db-guardian. Base: `5f7f0511fbb26558a1da2d8ed6ad410c060fcdea`, branch `codex/property-marketing-release`, PR #98. This report supplements the immutable persistence and clean-import handoffs.

The actual wire driver serialized already serialized JSON a second time. The financing repository now binds its five JSON string parameters as `text` before PostgreSQL casts them to `jsonb`, matching the existing campaign repository convention. No authority guard, grant, signature, migration, timeout, dependency, or CI gate was relaxed or changed.

## Observed failure and exact cause

[Real PostgreSQL migrations and pgTAP, job 115741733406, run 38530731265](https://github.com/jzferrell26/operation-automated-lo/actions/runs/38530731265/job/115741733406) completed with failure. Its complete raw log was retrieved using `gh api repos/jzferrell26/operation-automated-lo/actions/jobs/115741733406/logs`, saved in ignored `tmp/financing-clean-import-2026-10-14/ci-115741733406.log`.

- Lines 2198-2203: financing pgTAP passed, 42 tests.
- Lines 2378-2397: all 18 financing integration cases failed at their common evidence-admission setup.
- Lines 2421-2426 and the corresponding subsequent traces: `safe` maps backend `P0001` to `FINANCING_RELEASE_INELIGIBLE`, called from `admitVerifiedFinancingEvidence`, then `admitted`. Source save and release preparation were not reached.

The problem was not an authorization refusal. `executeCapability` correctly assumes `financing_verifier_runtime`. The caller sends `JSON.stringify(input.evidence)` and `JSON.stringify(input.provenance)` through `PostgresDatabaseConnection.execute`. postgres.js 3.4.9 describes the direct `::jsonb` parameters as OID 3802 and applies its JSON serializer, `JSON.stringify`, again. PostgreSQL therefore receives JSON strings instead of objects. In the unchanged admission function, `wanted_provenance->>'method'` is null, which is distinct from the required qualified method, so the function correctly raises `P0001`, `Financing evidence ineligible`.

Evidence in local installed primary source:

- `packages/db/src/postgres-adapter.ts:215`: scalar parameters passed to `unsafe`, preparation disabled.
- `node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/src/types.js:16`: JSON handler covers OIDs 114 and 3802, serializer is `JSON.stringify`.
- `node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/src/connection.js:630`: server parameter descriptions fill inferred types.
- `node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/src/connection.js:958`: binding selects serializer by described type.
- `packages/db/src/campaign-repository.ts:198`: existing serialized JSON transport uses `::text::jsonb`.
- `supabase/migrations/20261014051000_financing_release.sql:295`: strict admission provenance and currency checks remain unchanged.

## Real SQL and wire reproduction

Docker's local Linux engine pipe is absent. A bounded diagnostic installed tools only under ignored `tmp/financing-pg-diagnostic`, with no repository dependency or lockfile changes:

```powershell
npm install --prefix tmp/financing-pg-diagnostic --no-save --package-lock=false @electric-sql/pglite@0.3.15 @electric-sql/pglite-socket@0.0.20
node tmp/financing-pg-diagnostic/probe.mjs
```

The diagnostic runs PostgreSQL 17.5 compiled to WASM, serves its real PostgreSQL protocol on an ephemeral loopback port, and connects using the repository's actual postgres.js 3.4.9. It installs the exact assigned migration's evidence table, immutable evidence trigger, and admission function. Minimal synthetic location/user tables provide their FKs. This is a focused transport proof, not a substitute for the canonical full migration/role/tenant/race CI gate.

Results, exit 0:

1. Direct object transport into the unchanged admission function succeeds.
2. The original statement, with serialized JSON strings bound to `$3::jsonb,$4::jsonb`, reproduces raw `P0001`, `Financing evidence ineligible` under `financing_verifier_runtime`.
3. The identical arguments bound to `$3::text::jsonb,$4::text::jsonb` succeed under the same role and function.
4. Wrong provenance method still produces `P0001` using the corrected transport.
5. The actual rebuilt `createPostgresPool` and `admitVerifiedFinancingEvidence` admit all ten fixture evidence kinds through the same wire server and unchanged strict SQL function.

The ignored proof script SHA-256 is `572c5df77e9487e69fea8db2ce3b5bfd0c7b133be4318195dcf831f18762c442`. Output is in `tmp/financing-pg-diagnostic/pg17-wire-proof.log`. No live provider or hosted database was used.

## Changes and regression checks

`packages/db/src/financing-release-repository.ts` changes five parameter slots across source-save, record-save, current-evidence check, and evidence admission. Each was already a serialized JSON string. Binding as text prevents double serialization; PostgreSQL still parses and validates the JSON using the existing `jsonb` function signatures.

The raw anonymous negative test now uses text-to-JSONB transport when supplying a serialized snapshot, ensuring it tests the intended scope denial. No negative expectations were removed. The existing verifier integration case now asserts that the database stores evidence and provenance as exact JSON objects with exact content after admission and replay.

One new unit regression checks the five required parameter bindings. It failed before the source repair (exit 1) and passes afterward. It complements the real wire reproduction and actual database object round-trip assertions; it is not the sole proof.

| Command                                                                                                                                                                                               | Result                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `pnpm exec vitest run --project unit tooling/tests/unit/financing-release-database.test.ts -t 'binds serialized JSON'` before repair                                                                  | RED, exit 1, new regression failed    |
| `pnpm exec vitest run --project unit tooling/tests/unit/financing-release-database.test.ts` after repair                                                                                              | GREEN, exit 0, 28 tests passed        |
| `pnpm exec vitest run --project unit tooling/tests/unit/financing-release-database.test.ts tooling/tests/unit/financing-release.test.ts`                                                              | Exit 0, 127 tests passed              |
| `pnpm --filter @oalo/db build`                                                                                                                                                                        | Exit 0                                |
| `node --test packages/db/test/financing-release-repository.test.mjs`                                                                                                                                  | Exit 0, 21 tests passed, zero skipped |
| `pnpm --filter @oalo/db typecheck`                                                                                                                                                                    | Exit 0                                |
| `pnpm exec tsc --noEmit -p tsconfig.tooling.json`                                                                                                                                                     | Exit 0                                |
| `pnpm exec oxlint packages/db/src/financing-release-repository.ts packages/db/test/financing-release-repository.integration.test.mjs tooling/tests/unit/financing-release-database.test.ts`           | Exit 0                                |
| `pnpm exec prettier --check packages/db/src/financing-release-repository.ts packages/db/test/financing-release-repository.integration.test.mjs tooling/tests/unit/financing-release-database.test.ts` | Exit 0                                |
| `git diff --check`                                                                                                                                                                                    | Exit 0                                |

The regression changes preserve all 18 real PostgreSQL cases. Full-suite execution, including source equality, tenant isolation, publication/capture, revocation, race, export and purge checks, remains pending the parent's CI rerun. Local wire transport success does not claim those cases passed.

## Frozen packet

| File                                                                        | SHA-256                                                            |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/db/src/financing-release-repository.ts`                           | `005247422bb3576ceafe8898a81bc12052308024a1744b2f242c7831f1dbdd1e` |
| `packages/db/test/financing-release-repository.integration.test.mjs`        | `526b6eda7cd93a7d40fef6a08f2a1a68c01bae82d4b24a755f4d1d143d382f31` |
| `tooling/tests/unit/financing-release-database.test.ts`                     | `fb7f191d4776a8bde07f563db649b1e02888299d0f2123c58fc2b826243a00e8` |
| `packages/db/test/financing-release-fixture.mjs`, prior clean-import repair | `4a4238d57ed3719549a493370593c7e11b524509639a3c7e4db04c8ae020ba46` |

The assigned migration, pgTAP file, original persistence handoff, clean-import handoff, policy foundation, and all prior Security/Quality/HOLD reports were preserved. Other agents' output files were not changed. No numbered identifier, commit, push, provider operation, or deployment was created. The parent owns fresh Security, then Quality, then canonical PostgreSQL CI qualification of the combined packet.
