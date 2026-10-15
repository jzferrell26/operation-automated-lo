# QA Report: publisher review-session transplant

**Plan:** `2026-10-14-publisher-review-session-handoff.md`; exact domain source revision `c5e454051c258de28a2cc417673599073604ed58`.
**Audit date:** 2026-10-14
**Baseline/head:** `23ce8256d40a05ce21fb31d8ecf6d1d77aa6efcd`, `codex/webinar-publisher`, plus seven frozen harness files.
**Auditor:** quality-guardian, `/root/domain_final_quality`
**Preceding Security:** `2026-10-14-publisher-review-session-security-review.md`, SHA-256 `acbca71efe04b87b2c471244ba719c59f74f7fe689c3518a8060a1dc86955211`.

## Summary

**Scoped source PASS; publisher current-head browser CI remains required.** All seven copied files independently match their exact committed domain bytes, and the actual-sign-in/current-proof/cache lifecycle requirements match the handoff, with no Critical, Warning or Suggestion found. Domain CI is attributed provenance for identical source; this transplant does not establish publisher browser execution, original-command runtime authentication wiring or provider/product completion.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ✅ | Exact seven-path transplant, current proof, real fallback and private lifecycle preserved. |
| Correctness | ✅ | Existing 22 controlled cases pass; raw committed-source identity verified. |
| Alignment | ✅ | Shared reviewed preparation machinery, original auth acceptance and sole-LO product boundaries retained. |
| Gaps | ✅ | Invalid/stale/revoked/mismatched candidate refusal and one real fallback covered. |
| Detrimental | ✅ | No production policy, SQL, role UI, dependency, baseline, threshold or runtime change. |

## Critical Issues (must fix)

None in the assigned seven-file harness packet.

## Warnings (should fix)

None newly found in this packet. Actual publisher canonical browser execution remains open and cannot be inferred from discovery or passing domain source.

## Suggestions (consider improving)

None.

## Plan Item Traceability

| # | Requirement | Status | Implementation location | Notes |
| --- | --- | --- | --- | --- |
| COPY-01 | Copy only seven reviewed committed domain files, exact raw bytes | ✅ | Seven paths/pins below | Independently compared buffers against git show c5e454, without text normalization or using property copy as authority. |
| AUTH-01 | Capture only after actual password POST 200 and workspace completion | ✅ | `tests/browser/review/helpers/guided-setup-journey.ts:221-244` | Exact response assertion retained; capture passive. |
| AUTH-02 | Only visual/webinar preparation reuses cache with original actual fallback | ✅ | `tests/browser/review/top-bar.spec.ts:92-98`; `webinar-ads.spec.ts:64-73` | Auth acceptance journeys still call signInExisting directly. |
| AUTH-03 | Fresh fixed-origin server identity, role, workspace and saved session-token equality | ✅ | `tests/browser/review/helpers/signin-session.ts:47-89,185-234` | Actual 200 response and one server token; no cached browser-text authority. |
| AUTH-04 | Strict actual cookie/actor/time shape and independently cloned context input | ✅ | `signin-session.ts:14-60,81` | Host-only Secure/HttpOnly/Lax, finite lifetime/two-hour age, exact actor/origin. |
| AUTH-05 | Wrong/revoked/stale/expired candidate clears, one real fallback, wrong fresh proof refuses | ✅ | `signin-session.ts:75-89`; existing fixture cases | No loop, alternate endpoint, signing-key access or manufactured session. |
| CACHE-01 | Sample-review-only canonical private run/actor OS-temp cache | ✅ | `signin-session.ts:92-150`; `tooling/scripts/database/review-browser-run.mjs:39-65` | Fixed bounded regular actor files, age/mode/type/symlink checks, exclusive temporary write and atomic rename. |
| CACHE-02 | Exclude passwords/email/other cookies/storageState/log/artifact capture | ✅ | `signin-session.ts:163-181`; existing runner output preservation | Only issued cookie/token/actor/origin/time; outside repository artifact paths. |
| CACHE-03 | Checked exact owned cleanup and visible failure, retain artifacts/teardown | ✅ | `review-browser-run.mjs:48-65,445-460`; defensive filesystem tests | Windows temp boundary unchanged; POSIX modes are not Windows ACLs; ordinary finally is not crash-proof erasure. |
| DECL-01 | Runner declarations and existing fixture source preserved | ✅ | `review-browser-run.d.mts`; `tooling/tests/unit/browser-signin-session.test.ts` | Exact committed bytes and tooling types pass. |
| NG-01 | Keep production 20/900 attempt policy, actual auth journeys and no customer roles | ✅ | `apps/web/src/server/password-authentication-handler.ts:120`; scoped diff | Seeded creator/approver are internal fixture identities, not customer role management. No counter/IP/timeout workaround. |
| NG-02 | No domain image/scaffold/production SQL/runtime transplant or provider activation | ✅ | Exact seven-path inventory | Separate worker/authentication/native packets unaffected and not regraded here. |
| HOLD-01 | Current publisher sample/real-catalog browser and canonical CI | 🟦 | Parent current-head run | Domain passing CI and 163-case discovery do not qualify publisher. |
| HOLD-02 | Actual verifier/operation-aware original-command wiring, source/media/native capture and provider proof | 🟦 | Separate publisher implementation packets | Test-session reuse cannot authorize spending or instantiate deployed runtime. |

## Files Changed

- `tests/browser/review/helpers/guided-setup-journey.ts` (M): passive session capture after real sign-in success.
- `tests/browser/review/helpers/signin-session.ts` (A): exact committed reviewed cache/current-proof helper.
- `tests/browser/review/top-bar.spec.ts` (M): visual preparation reuse with original actual sign-in fallback.
- `tests/browser/review/webinar-ads.spec.ts` (M): creator/approver preparation reuse with original fallback.
- `tooling/scripts/database/review-browser-run.d.mts` (M): private lifecycle exports.
- `tooling/scripts/database/review-browser-run.mjs` (M): exact owned private directory creation/passing/cleanup.
- `tooling/tests/unit/browser-signin-session.test.ts` (A): existing identity/budget/cache/filesystem regressions.

Only this new report was authored. Other frozen reports, authentication sources/index, scaffold, SQL, runtime, root ledger, images, Git state, provider configuration and native cluster lifecycle were not changed.

## Independent verification

| Executed check | Result |
| --- | --- |
| Existing session fixture unit suite | 22 passed, exit 0 |
| Tooling TypeScript and runner syntax | Passed |
| Focused lint and seven-file formatting | Passed |
| Secrets and diff whitespace | Passed |
| Existing sample-review discovery | 163 tests in 14 files; list only |
| Seven raw buffers against exact domain Git objects | Byte-identical |
| Seven source, handoff and preceding Security pins | Matched |

Existing tests use controlled proof ports and private disposable filesystem fixtures. They do not capture actual credentials or prove server/browser authentication. No new payload, mutation, provider/network/database/browser probe, service startup or threshold change was introduced. Only existing discovery flags selected the review project; --list starts no browser/server/database. No configured whole-app fixture startup was attempted.

## Frozen provenance

| File | SHA-256 |
| --- | --- |
| tests/browser/review/helpers/signin-session.ts | f672526e8f8ea700482038b34217178d0b6c5d558d12e0c5bf4419b845f79319 |
| tests/browser/review/helpers/guided-setup-journey.ts | 6e69bfcda55554d8dd6f5041312d9f1ffeeabfc9c15e9ff05ecb546341feb4a9 |
| tests/browser/review/webinar-ads.spec.ts | 6e2dd29c01bf3ccfaa9a0d836b5389b7d4e816c2b1baa91af58ef258a631e248 |
| tests/browser/review/top-bar.spec.ts | d79a556a0ef4de1e5fc0853c121501d4a7bc31277ad0312214b09a09442f8fdc |
| tooling/tests/unit/browser-signin-session.test.ts | 06169c60c27c0ffd060d6a9a2804a030d874459ae6599eb77d3056266706eee9 |
| tooling/scripts/database/review-browser-run.mjs | 5d64029a99d2135e456a3fc2886d99d1e1029ef7bcfb29c238ba7a7a6d4af1a4 |
| tooling/scripts/database/review-browser-run.d.mts | ce502817e94a3e36adaafd4387a5f2e2e2b8e221c3e2fe293e5b9c39d19109a5 |
| Publisher transplant handoff | 17237fef07cbb47a054ff493b6b483986f2dd0a259f5ba51409d7da19c63a49d |
| Preceding publisher transplant Security | acbca71efe04b87b2c471244ba719c59f74f7fe689c3518a8060a1dc86955211 |

## Remaining integration and release limits

Root reports complete domain CI 38566055257 at the identical source revision, including 323 actual PG cases, 163 sample browser cases and four real-catalog cases. This is attributed domain evidence, not publisher current-head CI or local browser execution. Prior failed domain/property sign-in 429 receipts remain historical failures; this transplant relabels none.

Root plans to integrate separately reviewed authentication and exact 37-table scaffold before the publisher canonical run. This report reviews neither that commit nor its eventual workflow. Original publisher native/worker/authentication reviews keep their own source/capability scope; original failed WASM history and bounded native disposition remain preserved. Missing authentic verifier-backed producer/operation-aware closures, neutral source/media/native capture, configured runtime/safety schedules, customer flow and actual provider qualification remain open.

The earlier configured application startup was rejected by automatic approval review as blocked by policy. It remains unrun and was not retried or repackaged. Root owns repository/PR checks, Git and current-head canonical CI. No merge, deployment, paid/provider effect or whole publisher completion is cleared by this scoped session PASS.
