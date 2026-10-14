# Financing JSON transport repair: Security review

Audit date: October 14, 2026. Auditor: independently dispatched security-guardian. Base: `5f7f0511fbb26558a1da2d8ed6ad410c060fcdea`, branch `codex/property-marketing-release`, PR #98. Scope: the four frozen repair files below, their existing SQL function boundaries and the two author handoffs. Agreement: accepted CTR-004 revision 1, SHA-256 `59d0b203159f5c6c440621437bcd244f664f7a64901924b9a8b952a6a4d70dfa`.

## Executive summary

**PASS for this bounded source delta and entry to fresh Quality. Full PostgreSQL CI qualification remains required.** The five serialized JSON argument slots now bind as parameterized text before the database parses JSONB. This preserves the strict application schemas, canonical hashes, unchanged evidence-admission function and protected publication scope. No new Critical, High, Medium or Low security finding was detected in the assigned repair.

The actual failed CI run remains failure evidence, not a passing release gate: [run 38530731265](https://github.com/jzferrell26/operation-automated-lo/actions/runs/38530731265) failed clean fixture imports and all eighteen financing database cases at common admission setup. Independently reproduced transport success below uses PostgreSQL 17.5 compiled to WASM and a loopback protocol connection, not the canonical full PostgreSQL 17 schema, role, tenant and race suite. No hosted database, live provider, customer information or secret was accessed.

## Ordering and ownership

Previous persistence Security, SHA-256 `b4d7ae54ce4ae73ded84385daea4356a523091f46984490239bb929061c301c3`, and subsequent Quality, `6e31d29264a14ccf1cef0b680e8a52493c38da7929c8c92f231d930685a3dac6`, covered the earlier packet. These reports remain immutable historical evidence. Their four changed pins do not qualify this repair. This new Security pass precedes the parent's explicitly planned fresh Quality pass; no post-Quality source remediation was performed by this reviewer.

Only this report was authored. Active renderer files, all source/test files, previous reports, contracts, migrations, ledgers, dependency files and Git state were preserved. The original H-FIN-PERSIST-01 HOLD and its source closure remain recorded in their own reports. This transport verdict does not replace their production role-provisioning and runtime qualification limits.

## Scorecard

| Category                         | Result                                                                                                                | New findings        |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Financial confidentiality        | No changed financial projection, approval authority or private/public access policy                                   | 0                   |
| PII and cryptography             | Inquiry encryption, keyed deduplication, consent and attribution handling unchanged; existing compiled negatives pass | 0                   |
| Authentication and authorization | Existing actor/schema checks and selected capability roles preserved; no grant or migration changes                   | 0                   |
| Injection                        | Fixed SQL retains bound values; text-to-JSONB cast does not concatenate or execute input                              | 0                   |
| Dependencies                     | No dependency or lockfile change in this delta; no fresh registry/CVE audit claimed                                   | 0 in reviewed delta |
| Configuration and HTTP           | No changed HTTP, header, public environment or provider configuration                                                 | 0 in reviewed delta |
| Data handling                    | Exact JSON object transport restored; malformed transport remains refused                                             | 0                   |

## Critical findings

None detected in the assigned repair.

## High findings

None detected in the assigned repair. The previously reported public capability escape is not reopened by these casts: its protected-scope migration is byte-for-byte unchanged. Effective production role restrictions and the actual SQL regression gate remain required.

## Medium findings

None detected in the assigned repair.

## Low findings

None detected in the assigned repair.

## Transport and injection evidence

`packages/db/src/financing-release-repository.ts:222`, `:229`, `:231` and `:257` change five serialized argument slots in four fixed SQL statements. Source-save, record-save, current-snapshot checking and both evidence-admission JSON arguments use `$n::text::jsonb`. There is no input-selected SQL identifier, interpolation into statement text, dynamic function name or additional SQL grant.

The caller still parses the actual source at line 429, checks its tenant and manifest hash, and computes server hashes before serialization at lines 438-440. Record and snapshot callers still parse the strict record/snapshot schemas at lines 482 and 272 and pass `JSON.stringify` values at lines 487 and 276. Admission still parses `VerifiedFinancingEvidenceAdmissionSchema` at line 597 and serializes only its parsed evidence/provenance at lines 602-603. Its strict provenance method and public-use evidence schema have not changed.

The existing transport, `packages/db/src/postgres-adapter.ts:215`, supplies statement text and scalar values separately to postgres.js `unsafe` with prepared statements disabled. The installed driver at `node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/src/types.js:16` associates OID 3802 with JSON serialization. The text cast makes PostgreSQL describe these already serialized strings as text; the subsequent database cast parses the JSON value. This mechanism was independently observed through the real driver/protocol below, not inferred solely from a mock SQL contract.

The unchanged admission function at `supabase/migrations/20261014051000_financing_release.sql:285` still validates qualified provenance, current evidence, expiry and public channels, then inserts immutable evidence under the separate verifier capability. The immutable-source equality, public selected-publication checks, private owner checks and CAS guards are unchanged. Successful transport does not confer verifier membership or convert a private permission into a public one.

The raw public negative at `packages/db/test/financing-release-repository.integration.test.mjs:205` receives the same transport correction, so its valid serialized snapshot can reach the intended scope refusal instead of testing accidental double serialization. No negative assertion was removed. The added assertion at line 389 checks exact stored object types and complete evidence/provenance equality after admission and replay. It remains authored, pending canonical CI execution.

## Clean-import evidence

`packages/db/test/financing-release-fixture.mjs:2` and `:6` now use the existing workspace package names. The diff changes only the two import specifiers and formatter layout; synthetic fixture functions, calculated source, hash checks, permission/provenance fixtures and negative expectations are unchanged. Existing Vitest source aliases and Node package exports were inspected and are unmodified. The fixture is test support, not a provider or approval authority.

The isolated copy matches the repaired import form. Its temporary test configuration reuses the root resolution configuration. Four independently rerun probes passed while its relative application, contracts and database `dist` directories were absent: schema-valid calculated source, manifest hash/calculation version, exact request authority/campaign binding and ten synthetic evidence kinds. This confirms the corrected fixture can load before compiled workspace output in the existing Vitest environment.

## Independent verification

| Check                                                                                                                                    | Observed result                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm exec vitest run --project unit tooling/tests/unit/financing-release-database.test.ts tooling/tests/unit/financing-release.test.ts` | 127 passed in two files, 2.61 seconds; includes 28 SQL/adapter cases                                                                                                                              |
| `node --test packages/db/test/financing-release-repository.test.mjs`                                                                     | 21 compiled boundary/crypto cases passed, zero skipped                                                                                                                                            |
| `pnpm exec vitest run --config tmp/financing-clean-import-2026-10-14/vitest.config.ts`                                                   | Four isolated source-alias probes passed, 1.58 seconds                                                                                                                                            |
| Existing loopback wire diagnostic, PostgreSQL 17.5 WASM and actual postgres.js 3.4.9                                                     | Original JSONB binding reproduced `P0001`; corrected binding accepted identical values; wrong provenance method remained `P0001`; actual compiled adapter admitted all ten fixture evidence kinds |
| Reviewer in-memory extension of the same wire diagnostic                                                                                 | Malformed JSON and SQL-looking text returned `22P02`; JSON scalar and JSON null returned `23502`; exact stored evidence/provenance were JSON objects matching both original inputs                |
| Exact four repaired file hashes, migration, pgTAP, scaffold, agreement and prior reports                                                 | Matched supplied repair pins and unchanged boundary pins                                                                                                                                          |
| `git diff --check` and scoped diff inspection                                                                                            | Passed; only the four assigned repair files changed in tracked source                                                                                                                             |
| Canonical eighteen financing PostgreSQL cases, 42 financing pgTAP and 30 scaffold assertions on repaired bytes                           | Pending the parent's new CI run; no local full-suite pass claimed                                                                                                                                 |

The wire diagnostic installs the unchanged evidence table, immutable evidence trigger and admission function with minimal synthetic foreign-key tables. It does not install the full application schema or validate all deployed grants, transaction races, public reads/capture, revocation, export or purge. The reviewer inspected the original probe before executing it. The extra probes were evaluated in memory; neither the probe file nor production source was edited.

The first reviewer extension incorrectly expected `P0001` for a valid JSON scalar. PostgreSQL refused it with its unchanged NOT NULL constraint, `23502`, so that probe exited 1. The corrected observation-based expectation then passed for both scalar and JSON null, alongside malformed JSON and SQL-looking values. This is a retained diagnostic expectation error, not an additional source repair or a removed negative. The application's unchanged `safe` mapper at repository line 366 maps unrecognized database errors to sanitized `UNAVAILABLE`, while `P0001` maps to `INELIGIBLE`; either path fails closed. No raw database error is added to user-facing responses.

The full deterministic repository scanner and production audit from the prior bounded persistence Security report were not repeated. The parent requested this four-file repair review, and no dependency, authentication route, header or configuration change requires extending it into a fresh whole-repository audit.

## Frozen packet

| File                                                                                      | SHA-256                                                            |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/db/src/financing-release-repository.ts`                                         | `005247422bb3576ceafe8898a81bc12052308024a1744b2f242c7831f1dbdd1e` |
| `packages/db/test/financing-release-fixture.mjs`                                          | `4a4238d57ed3719549a493370593c7e11b524509639a3c7e4db04c8ae020ba46` |
| `packages/db/test/financing-release-repository.integration.test.mjs`                      | `526b6eda7cd93a7d40fef6a08f2a1a68c01bae82d4b24a755f4d1d143d382f31` |
| `tooling/tests/unit/financing-release-database.test.ts`                                   | `fb7f191d4776a8bde07f563db649b1e02888299d0f2123c58fc2b826243a00e8` |
| `supabase/migrations/20261014051000_financing_release.sql`, unchanged                     | `bc491f8e40140ad232375fda7a7d10c4da7310541042b7e23fac2fbeb0b8fc4a` |
| `supabase/tests/financing_release.pgtap.sql`, unchanged                                   | `f110dc54473bc2ff6a53f8d1fc1938e9306b9c374de535f333e0a5ee11047a13` |
| `supabase/tests/phase0_scaffold.pgtap.sql`, unchanged                                     | `d42095b013a097275d7475dda03356b7a8063cce73cad989e4bb7a51d111a6be` |
| `library/requirements/reports/db/2026-10-14-financing-fixture-clean-import-handoff.md`    | `512b5d5796579b077cea965ea33863999b05ea0b7b023a9c32abc902d8c5abe9` |
| `library/requirements/reports/db/2026-10-14-financing-postgres-json-transport-handoff.md` | `21745b6f1efc82558274294430d3ef5382e68ff8fe1309bf9a73ec299435a3bf` |

## Framework intelligence and follow-up

This branch's framework declarations remain Next.js 16.3.8 and React/React DOM 19.3.0. The managed CVE watchlist's April 24, 2026 refresh is over 120 days old. Refresh it through its owning Guild workflow; this narrow repair review makes no new full-framework advisory claim. No dependency or policy file was changed.

Fresh Quality must review these four replacement pins, followed by the canonical full PostgreSQL CI gate and the orchestrator's repository-health check before commit/push. Source PASS does not authorize provider activation, public financial distribution, lender approval, live expenditure, deployment or merging. Public render/storage/HTTP/setup consumers and production capability-role qualification remain separate completion work.

## Files changed by this reviewer

Only `library/requirements/reports/2026-10-14-financing-json-transport-security-review.md`. No source remediation was necessary.
