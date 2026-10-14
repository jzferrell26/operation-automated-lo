# QA Report: top-bar session preparation

**Plan:** `2026-10-14-domain-top-bar-session-handoff.md` and the previously reviewed run-scoped actual-session fixture.
**Audit date:** 2026-10-14
**Base/head:** `3d04fee859356055087d2099b0a332f35ae7ca95`, `codex/domain-completion`, plus two frozen test-harness files.
**Auditor:** quality-guardian, `/root/domain_final_quality`
**Preceding Security:** `2026-10-14-domain-top-bar-session-security-review.md`, SHA-256 `83ef95ac66fc5c8543093996005dddf6ef02eceef46e24467347aef071c7c17d`.

## Summary

**Scoped source PASS; actual current-head canonical CI remains required.** The top-bar visual/navigation setup now uses the unchanged reviewed actual-session reader with the original real password sign-in as fallback, and the shared-helper delta is exactly its scope comment. No Critical, Warning or Suggestion was found; controlled cache tests and discovery do not establish actual browser success or complete hosted-domain qualification.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ✅ | Preparation caller and accurate helper comment match the narrow handoff. |
| Correctness | ✅ | Existing session proof, identity, budget, isolation and filesystem cases pass. |
| Alignment | ✅ | Visual preparation reuses reviewed machinery; authentication journeys retain actual sign-in. |
| Gaps | ✅ | Current identity verification and one real fallback remain unchanged. |
| Detrimental | ✅ | No production policy, cookie/cache logic, threshold, assertion or image change. |

## Critical Issues (must fix)

None in the assigned source delta.

## Warnings (should fix)

None in this delta. The previous actual 429 remains a failed CI outcome pending a fresh canonical run.

## Suggestions (consider improving)

None.

## Plan Item Traceability

| # | Requirement | Status | Implementation location | Notes |
| --- | --- | --- | --- | --- |
| PREP-01 | Top-bar preparation uses existing actual-session reader | ✅ | `tests/browser/review/top-bar.spec.ts:25,92-98` | Same seeded creator and existing viewport; only import and wrapper call added. |
| PREP-02 | Original actual password sign-in remains explicit fallback | ✅ | `top-bar.spec.ts:95-97`; `helpers/guided-setup-journey.ts:221-244` | Actual POST 200 and workspace path retained. |
| PREP-03 | Reuse requires fresh current server identity/token/role/workspace | ✅ | `tests/browser/review/helpers/signin-session.ts:47-89,185-210,216-234` | Unchanged logic; mismatched/revoked/stale proof clears and falls back once. |
| PREP-04 | Comment accurately permits visual and webinar setup only | ✅ | `signin-session.ts:213-214` | Exact comment replacement from HEAD independently verified; implementation byte content otherwise unchanged. |
| NG-01 | Keep authentication journeys and production attempt policy/counters unchanged | ✅ | Exact scoped diff and existing fixture | No production file, counter reset, IP/header override, signed-cookie manufacture or timeout change. |
| NG-02 | Preserve top-bar layout/copy/restricted links/themes/axe/external guards | ✅ | Existing top-bar cases and exact diff | No expected value, assertion, screenshot threshold, skipped test or viewport matrix changed. |
| NG-03 | Preserve eight approved Settings images | ✅ | Eight `tests/visual/screens/review/settings--default--*.png` at four widths/two themes | Exact comparison against HEAD has no delta. No new baseline adoption. |
| HOLD-01 | Actual current-head browser preparation success and complete canonical CI | 🟦 | Parent-owned canonical database/browser gate | Discovery and controlled test ports cannot prove actual session reuse. |
| HOLD-02 | Remaining owned-host/autonomous recheck/root-default and product qualifications | 🟦 | Root domain ledger | No whole-domain/FUN release implied by this fixture change. |

## Files Changed

- `tests/browser/review/top-bar.spec.ts` (M): import and preparation wrapper using unchanged actual sign-in fallback.
- `tests/browser/review/helpers/signin-session.ts` (M): comment only, describes visual and webinar preparation.

Only this new report was written. No source, baseline, previous report, configuration, root ledger, Git state, credential, provider or deployed behavior was changed by the reviewer.

## Independent verification

| Executed check | Result |
| --- | --- |
| Existing cache/identity/budget/filesystem unit suite | 22 passed, exit 0 |
| Tooling TypeScript | Passed |
| Focused lint and formatting | Passed |
| Secret audit and diff whitespace | Passed |
| Actual review project discovery with `playwright.config.ts` | Eight top-bar tests discovered, no browser started |
| Shared-helper exact intended comment replacement against HEAD | Confirmed; no logic delta |
| Eight approved Settings originals against HEAD | Unchanged |
| Two source/handoff/Security pins | Matched |

All 22 tests use the existing controlled proof ports and private disposable filesystem fixtures. No new payload, mutation, database/browser/server probe, provider request or actual credential read occurred. Local actual PostgreSQL/browser execution remains unavailable because the Docker engine path is missing; no fixture bypass, substituted database qualification, new delay or threshold was introduced. Discovery is not execution.

## Frozen provenance and remaining CI

| File | SHA-256 |
| --- | --- |
| tests/browser/review/top-bar.spec.ts | d79a556a0ef4de1e5fc0853c121501d4a7bc31277ad0312214b09a09442f8fdc |
| tests/browser/review/helpers/signin-session.ts | f672526e8f8ea700482038b34217178d0b6c5d558d12e0c5bf4419b845f79319 |
| library/requirements/reports/2026-10-14-domain-top-bar-session-handoff.md | f75be2c5b571422e1e4deeacdc844ef840c59c3b59c15e4571cd2a75d4ff159f |
| library/requirements/reports/2026-10-14-domain-top-bar-session-security-review.md | 83ef95ac66fc5c8543093996005dddf6ef02eceef46e24467347aef071c7c17d |

The completed historical CI 38556674879 at 3d04fee has Application/Release success and reports 323 actual PostgreSQL cases, 162 sample review-browser cases and four real-catalog cases passing. Its final top-bar visual case fails before visual assertions at an actual sign-in 429, on both original and retry. The retained raw log `tmp/domain-session-ci-38556674879.log`, SHA-256 `8a547aa5c4da53ab97631fcb0b15071021a5c6dee65faa9cdcffd0e31e62792a`, still records both 429 failures (`:2557,2589`), 162 passes (`:2618`) and four real-catalog passes (`:2633`). This reviewer checked that retained log, not a new live workflow result. Prior Settings/webinar reuse success does not prove this new top-bar caller.

Root must complete repository/PR checks and a fresh current-head full canonical run. These local passes do not relabel the old failed run, authorize merge/deployment/provider effects, or complete domain/FUN acceptance. Keep original failure receipts, approved images and the remaining hosted qualification open until the new canonical evidence resolves them.
