# Public financing persistence scope repair: Security review

Audit date: October 14, 2026. Auditor: independently dispatched security-guardian. Scope: H-FIN-PERSIST-01 remediation and the eleven explicitly assigned persistence/source/test files below. Agreement: accepted CTR-004 revision 1, SHA-256 `59d0b203159f5c6c440621437bcd244f664f7a64901924b9a8b952a6a4d70dfa`.

## Executive summary

**PASS for source-qualified closure of H-FIN-PERSIST-01 and entry to fresh persistence Quality. Actual PostgreSQL qualification remains a mandatory release gate.** The original custom-setting downgrade is removed: the selected public database role always follows a protected publication capability, independently of editable application settings. No additional Critical, High, Medium or Low vulnerability was detected in this bounded repair review. This is not an executed SQL exploit regression, full branch approval, completed public report product or deployment authorization.

The original Security HOLD report remains unchanged at SHA-256 `c78ed9b11b94676978ca3b6bb03772d73d496d533638077c2581c21a872138b9`. Its finding and historical unexecuted attack example remain valid descriptions of the original bytes. The append-only author handoff matches `84c0ad3151d270e9a184db7d367b8772f4f01a1a39c5399e8d287e5c51400fff`. Earlier Quality covered the financing foundation only; no persistence Quality precedes this repair review. Fresh Quality must inspect these replacement pins. No source, prior report, contract, ledger or Git state was modified by this reviewer.

## Scorecard

| Category                             | Result                                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Private financial confidentiality    | Original High closed in source; mandatory actual role/SQL negatives remain                                     |
| PII and cryptography                 | No additional finding; unchanged compiled encryption/rotation/tamper/removal cases pass                        |
| Authentication and tenant capability | Protected public scope and role-aware functions inspected; production service membership qualification remains |
| Injection and secrets                | No new dynamic user-selected SQL or secret/log disclosure detected in the repair                               |
| Dependencies                         | Fresh production registry audit: zero vulnerabilities                                                          |
| Configuration and HTTP               | No HTTP/header/provider changes in this packet; consumer checks remain separate                                |
| Transaction and lifecycle            | Backend/xid isolation, eligibility rechecks and cleanup inspected; actual PostgreSQL execution pending         |

## Critical findings

None detected in the assigned repair.

## High finding closure: H-FIN-PERSIST-01

Status: **closed in repaired source, runtime confirmation pending**. Severity remains High for the original private financial record capability escape; it is not downgraded or waived.

Coordinates below refer to `supabase/migrations/20261014051000_financing_release.sql` at the frozen hash in the table:

- Lines 94-119 introduce the protected `financing_release_public_scopes` table keyed by native backend PID and xid8. It has forced RLS and an owner-only policy. Neither runtime receives table grants. The private cleanup helper deletes only the inserted transaction row.
- Lines 220-250 make public capability enforcement unconditional when the actual selected database role is `financing_public_runtime`. A missing protected binding raises `42501`; no empty, replaced or forged `app.financing_public_release` value selects the private fallback. Native behavior requires the separately selected `app_runtime` role. The built-in role setting is not an arbitrary custom `app.*` placeholder.
- Lines 227-234 derive location, owner, release, publication and original exact origin from the protected row and repeat current published eligibility. Private/public mode, tenant, actor, actor type and authorization flags supplied by a raw SQL caller cannot create or replace that row.
- Lines 338-371 constrain public source to the selected actual campaign/version/evidence hash and public current checks to the whole actual immutable snapshot. The public branches initialize location from protected scope, including when generic UUID settings are malformed.
- Lines 388-398 constrain owner load to the protected release and owner. Lines 438-465 constrain inquiry capture likewise and recheck current source before writing encrypted inquiry and pending delivery state.
- Lines 468-494 establish context only after exact UUID/origin published eligibility; conflict on backend/xid leaves the original row unchanged. Context no longer sets the native authorization marker. Lines 525-537 check publication state, approval, timestamp, server-clock validity, current owner and verified source/evidence.
- Lines 552-568 revoke PUBLIC execute and grant only the enumerated public publication/context/source/load/current/capture functions. Private save/reserve/complete/export/removal/withdrawal/admission and the protected scope/cleanup helpers are not granted to the public role. Runtime has no new direct mutation grants.

Consequently the original sequence, legitimate public context followed by clearing the publication custom setting and reading a different prepared/revoked release, has no source path into private owner mode. Clearing generic settings cannot create a capability; replacing them cannot broaden its location, owner or selected release. A selected release that becomes expired or loses source/evidence eligibility fails the repeated publication check. The anonymous TypeScript adapter restrictions remain unchanged as another boundary.

This reasoning is an inference from the inspected frozen SQL and documented PostgreSQL semantics, not evidence of executed database behavior. PostgreSQL accepts ordinary two-part custom placeholders, whereas selecting database roles requires the session user's SET membership. SECURITY DEFINER changes effective execution identity, so using the selected role setting preserves the caller's selected role through these functions. Sources: [custom options](https://www.postgresql.org/docs/17/runtime-config-custom.html), [configuration functions](https://www.postgresql.org/docs/17/functions-admin.html#FUNCTIONS-ADMIN-SET), [SET ROLE](https://www.postgresql.org/docs/17/sql-set-role.html), [SECURITY DEFINER](https://www.postgresql.org/docs/17/sql-createfunction.html).

## Role reset and cleanup qualification

The migration does not provision production LOGIN roles. A future anonymous-service login must have only its intended service role and no direct or inherited private table/function privileges, migration ownership, or SET chain to `app_runtime`, verifier, scheduler or support roles. `RESET ROLE`/`SET ROLE NONE` may always restore the session login; calls then fail the repaired role guard or function grant if that login is correctly restricted. If a login is separately granted `app_runtime`, switching to it is genuine database elevation granted by provisioning, not forgery of an application custom setting. This review does not certify an unprovisioned login or the administrator used by disposable fixtures. The authored raw SQL cases do not yet prove reset/set denial under an independently restricted service login. Add that controlled qualification before activation. No existing production membership was read or changed here. [PostgreSQL role selection](https://www.postgresql.org/docs/17/sql-set-role.html).

The author's unconditional statement that the binding cannot be retargeted within a transaction requires a qualification: `SET CONSTRAINTS ALL IMMEDIATE` may fire the deferred cleanup trigger early. A subsequent context request could then reacquire a different **currently eligible published** selection after deferring constraints again. The repaired guard still cannot return private/prepared/revoked data, and the public role already has the finite eligible publication lookup; no new confidentiality finding is established by this sequence. Early cleanup instead causes missing-scope refusal until eligible context is reacquired. This is not evidence that arbitrary SQL can preserve the original selection for every possible constraint timing. Actual qualification should cover early cleanup and safe refusal/reacquisition, and wording should avoid an absolute lifetime guarantee. The normal application uses fixed SQL and does not change constraints. [PostgreSQL constraint-trigger timing](https://www.postgresql.org/docs/17/sql-set-constraints.html).

## Regression and grant evidence

The reviewer inspected both new raw PostgreSQL cases at `packages/db/test/financing-release-repository.integration.test.mjs:156` and `:312`. They operate on the actual public SQL role rather than relying on the TypeScript wrapper: clearing/replacing flags, forged foreign and malformed tenant/actor settings, same-owner prepared/revoked and foreign releases/sources, context retarget, wrong origin, ungranted private operations, other-release capture, no protected binding, commit cleanup and old/expired scope refusal. The test at line 335 directly checks zero retained scope rows through the sanctioned owner helper after commit. Genuine native owner reads and capture remain positive checks. Existing withdrawal/supersession and encrypted capture cases remain intact. These eighteen actual PostgreSQL cases are authored, unskipped and **UNRUN locally**.

The financing pgTAP plan is 42. Its six new metadata assertions cover protected scope forced RLS, absent public/native table privileges, private helper and public authorization/export refusal. It is also **UNRUN**. The root-owned scaffold delta changes only plan 22 to 30, exact tenant count 31 to 39 and eight named table-presence assertions. All original ownership, forced/enabled RLS, FK index and PUBLIC execute assertions remain. That plan is also **UNRUN**, and its exact table count must be reconciled if other additive migrations are combined later.

The author's original 26-pass/one-failure structural regression followed by 27-pass repaired result is preserved in the append-only handoff. It tests source structure, not SQL parsing or effective grants. This reviewer independently reran repaired checks without modifying source or thresholds.

| Independently executed check                                                                                                             | Observed result                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `pnpm exec vitest run --project unit tooling/tests/unit/financing-release-database.test.ts tooling/tests/unit/financing-release.test.ts` | 126 passed, two files, 4.58 seconds; includes 27 adapter/SQL cases and 99 foundation cases |
| `pnpm exec vitest run --project contracts tooling/tests/contracts/financing-release.test.ts`                                             | 16 passed, 1.20 seconds                                                                    |
| `node --test packages/db/test/financing-release-repository.test.mjs`                                                                     | 21 compiled adapter/crypto cases passed, zero skipped                                      |
| `node --check packages/db/test/financing-release-repository.integration.test.mjs`                                                        | Passed syntax validation only                                                              |
| DB TypeScript check                                                                                                                      | Passed                                                                                     |
| `pnpm audit:secrets`                                                                                                                     | Passed across six source roots and the public environment boundary                         |
| `pnpm audit --prod --json`                                                                                                               | Zero at every severity, empty advisories, 153 production/optional dependencies             |
| Exact packet, agreement, previous Security and appended handoff hashes                                                                   | Matched all assigned hashes                                                                |
| Source/grants/manual secret and interpolation sweep; `git diff --check`                                                                  | No new scoped issue detected; diff check passed                                            |
| Actual PostgreSQL, pgTAP, role/GUC attacks, locks and cleanup execution                                                                  | Not executed; mandatory CI qualification remains                                           |

The prior full deterministic scanner is recorded in the unchanged original Security report. It was not repeated as a whole-repository scan during this narrowly assigned report-only repair pass. The fresh scoped checks and registry audit do not inherit runtime passes from synthetic SQL results. No database server, provider, customer record or hosted credential was accessed.

## Medium and Low findings

Medium: none detected in the assigned repair. Low: none detected. Role provisioning and early-trigger semantics above are explicit qualification limits, not newly reproduced vulnerabilities or a requirement for customer role administration.

## Framework and intelligence scope

Dependencies are unchanged. This branch declares Next.js 16.3.8 and React/React DOM 19.3.0. Managed watchlist refresh is April 24, 2026, over 120 days old; refresh that intelligence through its owning Guild workflow. The fresh zero-advisory production audit supplements it. This bounded SQL repair does not repeat or certify the full current framework CVE matrix, headers, browser delivery or hosted configuration.

## Frozen files

| File                                                                 | SHA-256                                                            |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/db/src/financing-release-repository.ts`                    | `5d10d107c4bcc0b51ee7a1c4dcea90d711974a05e55632ff34c46e2581748948` |
| `packages/db/src/index.ts`                                           | `eb8d358b8f85b26878a606e0067dfb9e19bd71ce23306d65b0f187ea80fd7f2c` |
| `packages/db/test/financing-release-fixture.mjs`                     | `057bba6e70dba4f09d70a9c88fc58131e021a33fd2fe1b3bb7a086a1f6b066c4` |
| `packages/db/test/financing-release-repository.test.mjs`             | `dc11d443a26978b967c6e9bbd7607279c45edf034965fc3adcfb7f838df61350` |
| `packages/db/test/financing-release-repository.integration.test.mjs` | `887be11707c473a9ee7ab91bedf14a55940b4c6199134bcfb954dfd3b5fe59a3` |
| `packages/db/test/financing-release-repository.unit-cases.mjs`       | `8df4dd526caa735cf9c09f361e9959828bc4d53821bff8dcdd86bdeb0ce62fc6` |
| `packages/db/test/financing-release-repository.unit-cases.d.mts`     | `cf1857255eece16d35871d6a5e1467658f79539b1fe3b6c13a52767d6f99685f` |
| `supabase/migrations/20261014051000_financing_release.sql`           | `bc491f8e40140ad232375fda7a7d10c4da7310541042b7e23fac2fbeb0b8fc4a` |
| `supabase/tests/financing_release.pgtap.sql`                         | `f110dc54473bc2ff6a53f8d1fc1938e9306b9c374de535f333e0a5ee11047a13` |
| `tooling/tests/unit/financing-release-database.test.ts`              | `8102473c8fa9a51eeee71583e074298f268990e27ceba48f03fdc8465bf7c1f9` |
| `supabase/tests/phase0_scaffold.pgtap.sql`                           | `d42095b013a097275d7475dda03356b7a8063cce73cad989e4bb7a51d111a6be` |

## Files changed and closeout

Only this new report was authored. No remediation was made by this reviewer because the original database author already repaired the released source. The original Security report, handoff history and other agents' ledger/map/source changes remain untouched. Parent owns fresh Quality on these bytes, actual database CI, repository-health review before commit/push, and fresh-main/MERGEABLE checks. Public rendering, media rights, setup, anonymous HTTP/Origin/body/rate gates, genuine trusted verification, delivery workers, retention scheduling and controlled hosted/provider qualification remain separate work. HighLevel owns QR creation under the accepted design; no QR management UI or second customer role is added by this packet.
