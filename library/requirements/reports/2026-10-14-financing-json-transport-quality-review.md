# QA Report: Financing JSON transport and clean fixture import repair

**Plan document:** `library/knowledge/private/contracts/CTR-004-public-financing-release.md`, accepted revision 1; bounded repair instructions and the two DB handoffs listed below.
**Audit date:** 2026-10-14
**Base branch:** `codex/property-marketing-release` at `5f7f0511fbb26558a1da2d8ed6ad410c060fcdea`
**Head:** Same commit plus four explicitly assigned, uncommitted repair files, identified by SHA-256 below.
**Auditor:** independently dispatched quality-guardian

## Summary

**PASS for the bounded four-file repair, with no Critical, Warning or Suggestion finding.** The actual postgres.js transport now sends the already serialized evidence as JSON objects to the unchanged SQL admission function, and the shared fixture imports successfully through the existing source aliases without prior compiled outputs. This source verdict permits the parent's next qualification step; it does not qualify the full migration, eighteen real PostgreSQL cases, production permissions, public output consumers or a deployment.

This audit ran after `2026-10-14-financing-json-transport-security-review.md`, SHA-256 `004c19bbb4ce158043badbe4408b25569b49dab751c28106ef39ea5383065952`, whose four source pins match this review. The earlier repaired-scope Security report `b4d7ae54ce4ae73ded84385daea4356a523091f46984490239bb929061c301c3` and persistence Quality report `6e31d29264a14ccf1cef0b680e8a52493c38da7929c8c92f231d930685a3dac6` remain unchanged historical evidence. This report replaces neither their scope nor their qualification limits.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ✅ | All five serialized JSON parameter slots and both eager fixture imports are repaired; exact persisted-object assertions and the anonymous scope negative remain present. |
| Correctness | ✅ | Independent real driver/protocol execution reproduced original refusal and corrected admission under the same SQL function and role. All ten fixture evidence kinds pass through the compiled adapter. |
| Alignment | ✅ | Fixed parameterized statements, strict schemas, server hashes, workspace aliases and existing package exports remain the boundaries. |
| Gaps | ✅ | Focused source, compiled, isolated import, type and wire checks passed. Full canonical database qualification is explicitly pending, rather than inferred from the diagnostic. |
| Detrimental | ✅ | No changed public signatures, policies, grants, migration, private permission scope, CI timeout or validation bypass in the assigned delta. |

## Critical Issues (must fix)

None in the assigned repair.

## Warnings (should fix)

None in the assigned repair. The pending canonical CI gate is a qualification limit, not a newly discovered source defect.

## Suggestions (consider improving)

None.

## Plan Item Traceability

The traceability rows cover the complete bounded repair assignment. CTR-004's renderer, public routes, setup, delivery, QR and live qualification requirements were not assigned to this repair audit and are not marked complete here.

| # | Plan requirement | Status | Implementation location | Notes |
| --- | --- | --- | --- | --- |
| R-1 | Preserve the exact authoritative source object and server-computed hashes during source persistence. | ✅ | `packages/db/src/financing-release-repository.ts:219-223,428-443` | `sourceSave` binds `$1::text::jsonb`; caller still parses the source, checks tenant and manifest hash, then serializes the parsed object and computes both hashes. |
| R-2 | Preserve the exact release record during CAS persistence. | ✅ | `packages/db/src/financing-release-repository.ts:227-230,481-489` | `save` uses the same transport correction; strict record parsing, location check, current evidence check and expected revision are unchanged. |
| R-3 | Send current-evidence snapshots as objects to the existing currentness function. | ✅ | `packages/db/src/financing-release-repository.ts:231,269-280` | Current snapshot is parsed before serialization; currentness and scoped-release equality checks remain required. |
| R-4 | Restore both admission object parameters without weakening qualified verification. | ✅ | `packages/db/src/financing-release-repository.ts:254-258,593-607` | Five total slots across four statements are corrected. Strict admission schema and the selected verifier capability remain unchanged. Actual wire admission passed for ten evidence kinds. |
| R-5 | Verify actual stored evidence and provenance object types and contents after exact replay. | ✅ | `packages/db/test/financing-release-repository.integration.test.mjs:376-411` | Added `jsonb_typeof` and complete equality assertions. Conflicting provenance and runtime no-admission assertions remain. Execution of this complete integration case is pending fresh canonical CI. |
| R-6 | Keep the anonymous currentness refusal testing valid object input. | ✅ | `packages/db/test/financing-release-repository.integration.test.mjs:202-210` | The raw negative's snapshot argument uses corrected transport; its `false` assertion is retained. |
| R-7 | Fixture imports must work before application/contracts output is compiled in a clean unit checkout. | ✅ | `packages/db/test/financing-release-fixture.mjs:1-6`, `vitest.config.ts:8-15` | Existing package-name aliases load actual source. The isolated fixture copy has the exact current hash, no application/contracts/DB `dist` directories and four passing behavior probes. |
| R-8 | Preserve ordinary compiled Node fixture execution after the established package build sequence. | ✅ | `packages/application/package.json:10-13`, `packages/contracts/package.json:6-9`, `packages/db/test/financing-release-fixture.mjs:2-6` | Existing Node package exports still point to compiled output. Twenty-one compiled adapter cases and the actual compiled wire adapter passed. |
| R-9 | Add a focused regression for all five JSON transport slots. | ✅ | `tooling/tests/unit/financing-release-database.test.ts:12-23` | One new five-slot regression passes. Its author recorded RED before repair. Independent QA also exercised the real driver, beyond SQL string assertions. |
| NG-1 | No wider trusted raw types, client authority, weakened grants or rewritten source hashes. | ✅ | Four-file diff; unchanged migration hash below | Only two fixture import specifiers, fixed SQL parameter casts/comment/layout and additive regression assertions changed. |
| NG-2 | Preserve protected public transaction scope and all existing migration/pgTAP/scaffold bytes. | ✅ | `supabase/migrations/20261014051000_financing_release.sql:94-119,220-248`; frozen hashes below | Scope, role guards and grants match the completed Security snapshot. No migration or policy repair was performed during QA. |
| NG-3 | Do not treat the wire diagnostic as full PostgreSQL qualification or authorize a live release. | ✅ | Verification limits below | Canonical eighteen PostgreSQL cases, 42 financing pgTAP assertions and 30 scaffold assertions on these replacement bytes remain pending. |
| NG-4 | Preserve other agents' active source and frozen evidence. | ✅ | Working-tree inventory and unchanged report hashes | New public output files and their concurrent `apps/web/package.json`/`pnpm-lock.yaml` edits were observed and excluded. Only this new QA report was written. |

### Independent verification

All checks ran in the assigned property-marketing-release worktree. Source pins were verified before the checks. No hosted database, provider, customer data or production secret was accessed.

| Command or check | Observed result |
| --- | --- |
| `pnpm exec vitest run --project unit tooling/tests/unit/financing-release-database.test.ts tooling/tests/unit/financing-release.test.ts` | Exit 0; 127 passed in two files, 2.54 seconds. Includes 28 SQL/adapter cases and existing strict authority/hash behavior. |
| `node --test packages/db/test/financing-release-repository.test.mjs` | Exit 0; 21 compiled adapter/crypto/boundary cases passed, zero skipped. |
| `pnpm exec vitest run --config tmp/financing-clean-import-2026-10-14/vitest.config.ts` | Exit 0; four isolated source-alias probes passed, 1.80 seconds. Exact copied fixture hash verified independently. |
| `pnpm --filter @oalo/db typecheck` | Exit 0. |
| `node tmp/financing-pg-diagnostic/probe.mjs` | Exit 0; PostgreSQL 17.5 WASM and actual postgres.js 3.4.9 reproduced original `P0001`, corrected transport succeeded, wrong provenance method remained `P0001`, and the actual compiled adapter admitted all ten evidence kinds. |
| Source and compiled SQL correspondence | All five repaired slots present in both current TS source and compiled repository output before executing the wire probe. |
| `git diff --check` | Exit 0. |
| Assigned four-file diff and frozen boundaries | Matched Security's source pins; no changed runtime signature, validator, canonical hash implementation, migration, scope policy or grant in this delta. |

The inspected wire probe is `tmp/financing-pg-diagnostic/probe.mjs`, SHA-256 `572c5df77e9487e69fea8db2ce3b5bfd0c7b133be4318195dcf831f18762c442`. It creates an ephemeral loopback protocol server and installs the exact existing evidence table, immutable evidence trigger and admission function, with minimal synthetic foreign-key tables. It exercises actual driver serialization and actual compiled admission; it does not install the entire application schema or prove source-save/record-save/currentness behavior against all full-schema constraints. Those three functions share the reviewed five-slot transport pattern, retain existing source/compiled boundary checks and require canonical CI qualification.

Security independently recorded malformed JSON, SQL-looking text, scalar and null negatives against the same unchanged function. QA inspected that report and reran the probe's wrong-method negative; QA does not claim a new independent rerun of Security's in-memory extra malformed-input extension.

The isolated clean-import probe uses the existing root `resolve` configuration and the exact repaired fixture copy. Its four cases check absent relative outputs, schema-valid source/calculation version and manifest hash, exact preparation authority binding, and ten synthetic admission evidence kinds. Shared output directories were not removed, moved or rebuilt by QA.

### Frozen repair and unchanged boundary pins

| File | SHA-256 |
| --- | --- |
| `packages/db/src/financing-release-repository.ts` | `005247422bb3576ceafe8898a81bc12052308024a1744b2f242c7831f1dbdd1e` |
| `packages/db/test/financing-release-fixture.mjs` | `4a4238d57ed3719549a493370593c7e11b524509639a3c7e4db04c8ae020ba46` |
| `packages/db/test/financing-release-repository.integration.test.mjs` | `526b6eda7cd93a7d40fef6a08f2a1a68c01bae82d4b24a755f4d1d143d382f31` |
| `tooling/tests/unit/financing-release-database.test.ts` | `fb7f191d4776a8bde07f563db649b1e02888299d0f2123c58fc2b826243a00e8` |
| `supabase/migrations/20261014051000_financing_release.sql`, unchanged | `bc491f8e40140ad232375fda7a7d10c4da7310541042b7e23fac2fbeb0b8fc4a` |
| `supabase/tests/financing_release.pgtap.sql`, unchanged | `f110dc54473bc2ff6a53f8d1fc1938e9306b9c374de535f333e0a5ee11047a13` |
| `supabase/tests/phase0_scaffold.pgtap.sql`, unchanged | `d42095b013a097275d7475dda03356b7a8063cce73cad989e4bb7a51d111a6be` |
| Accepted CTR-004 revision 1, unchanged | `59d0b203159f5c6c440621437bcd244f664f7a64901924b9a8b952a6a4d70dfa` |
| Clean-import handoff | `512b5d5796579b077cea965ea33863999b05ea0b7b023a9c32abc902d8c5abe9` |
| JSON transport handoff | `21745b6f1efc82558274294430d3ef5382e68ff8fe1309bf9a73ec299435a3bf` |

### Pending qualification and retained failures

[CI run 38530731265](https://github.com/jzferrell26/operation-automated-lo/actions/runs/38530731265) at the committed base remains failure evidence: clean-checkout unit fixture imports failed and all eighteen financing database cases failed at common admission setup. The handoffs preserve those observations and their RED/GREEN repair proofs. This local PASS does not overwrite that result; the parent must restart the canonical Linux CI gate on the committed repaired bytes.

The unchanged migration's 42 financing pgTAP assertions passing in the prior run does not establish the repaired adapter's full-schema round trip, races, revocation, export, purge or public capability behavior. The parent also owns repository-health review, exact commit inventory and fresh main/PR mergeability checks. No mergeability, deployment, lender evidence, public distribution, live QR verification or whole-project completion claim is made by this report.

## Files Changed

- `packages/db/src/financing-release-repository.ts` (M): five serialized JSON parameter slots bind as text before the existing JSONB cast; explanatory comment and formatting only otherwise.
- `packages/db/test/financing-release-fixture.mjs` (M): use existing workspace application/contracts import names instead of eager relative compiled-output paths.
- `packages/db/test/financing-release-repository.integration.test.mjs` (M): correct raw negative transport and assert exact stored evidence/provenance objects after admission/replay.
- `tooling/tests/unit/financing-release-database.test.ts` (M): add a focused regression covering all five serialized argument slots.

Only `library/requirements/reports/2026-10-14-financing-json-transport-quality-review.md` was authored by this reviewer. No source, frozen report, ledger, dependency, migration, Git or provider operation was changed.
