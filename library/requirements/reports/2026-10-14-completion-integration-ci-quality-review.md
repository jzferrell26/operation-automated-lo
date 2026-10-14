# QA Report: Completion integration CI correction packet

**Plan document:** Parent-assigned bounded CI correction criteria, recorded in `library/requirements/reports/2026-10-14-completion-integration-ci-regressions.md`, including its appended approved follow-up.
**Audit date:** 2026-10-14
**Base branch:** `codex/completion-integration` at `03dcfef7ca26547cdd843eaabd338b50857a06af`
**Head:** Frozen working-tree correction packet on that base; six source/test files and the diagnostic report pinned below.
**Auditor:** independent quality-guardian

## Summary

PASS for the bounded CI correction packet, with no Critical, Warning or Suggestion findings. The preparation helper observes the intended heading focus before selecting the webinar, real sign-in requires its actual successful HTTP response before navigation, and original per-pass browser evidence survives later output clearing while failures still propagate. This source qualification follows fresh Security and permits the orchestrator's next repository review and CI run; it does not establish completed product, real browser, PostgreSQL or hosted qualification for these uncommitted corrections.

Security preceded this review. Its report, `library/requirements/reports/2026-10-14-completion-integration-ci-security-review.md`, matches SHA-256 `2388a66448d721edaa0d102c700fb61575380e5499878d9875d81aa7775e97c9` and reports no unresolved packet findings. This reviewer owns only this new report and changed no source, diagnostic report, baseline, dependency or workflow; performed no commit, push, provider action, hosted mutation or deployment; and launched no actual database/browser service.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ✅ | All assigned correction criteria and non-goals trace to the six packet files or unchanged base. |
| Correctness | ✅ | 52 focused artifact/orchestration cases and 16 preparation cases pass; actual focus, status and original-byte assertions retained. |
| Alignment | ✅ | Existing UI sign-in, per-pass orchestration, declaration pairing and failure-only artifact consumer remain the execution paths. |
| Gaps | ✅ | Missing output, invalid names, links, overwrite refusal and unsuccessful sign-in are exercised; run-level failures remain accumulated and thrown. |
| Detrimental | ✅ | No changed production form, Select, authentication policy, visual baseline, timeout, worker setting or verification threshold. |

## Critical Issues (must fix)

None.

## Warnings (should fix)

None.

## Suggestions (consider improving)

None.

## Plan Item Traceability

| # | Plan Requirement | Status | Implementation Location | Notes |
| --- | --- | --- | --- | --- |
| CI-01 | Correct the actual delayed heading-focus interaction without replacing production behavior. | ✅ | `apps/web/src/features/webinar-ads/preparation.integration.test.tsx:56-68`, `apps/web/src/features/webinar-ads/preparation.tsx:180-183`, `packages/ui/src/components/Select.tsx:266-268` | `waitFor(...toHaveFocus())` precedes the original pointer clicks. Visible chosen combobox text is additionally asserted. Production focus and blur handlers are unchanged. |
| CI-02 | Preserve a RED-capable regression proving early pointer selection can lose its actual popup. | ✅ | `apps/web/src/features/webinar-ads/preparation.integration.test.tsx:73-104` | The test schedules the actual callback, delivers outstanding frames after pointer clicks, asserts visible review content and exact publication ID in the save body, and clears its listener/timers in `finally`. Existing global restoration remains. Retained RED log reproduces the missing option; fresh final file passes all 16 cases. |
| CI-03 | Observe the real same-origin POST sign-in result before actual navigation. | ✅ | `tests/browser/review/helpers/guided-setup-journey.ts:220-244`, `apps/web/src/server/password-authentication-handler.ts:890,943` | Response observation is registered before the existing UI click; origin, exact pathname and POST match. The existing backend produces HTTP 200 on successful sign-in. `expect(response.status()).toBe(200)` precedes unchanged actual URL/workspace selection. No session or navigation is forged. |
| CI-04 | Limit added authentication assertion evidence to method, path and status. | ✅ | `tests/browser/review/helpers/guided-setup-journey.ts:224-237`, `tooling/tests/unit/database/review-browser-evidence.test.ts:162-184` | No request/response body, cookie, email, password or query is read for the added assertion. Negative HTTP 401/429/503 cases fail before navigation and exclude supplied secret/query markers from their messages. Foreign origin, GET and another path are excluded by the predicate. |
| CI-05 | Retain whole original first-pass evidence before the next Playwright run clears shared output. | ✅ | `tooling/scripts/database/review-browser-run.mjs:159-192,383-425`, `tooling/tests/unit/database/review-browser-evidence.test.ts:36-57`, `playwright.config.ts:72` | Each pass awaits original-file copying in `finally` before the next iteration. Real fixture bytes for both trace and Markdown survive clearing the shared source directory. No trace content or image is rewritten, generated or sanitized by the copy helper. Missing output returns false without manufacturing an artifact. |
| CI-06 | Bound retention to fixed pass names and trusted local review directories, reject unsafe entries and existing destinations. | ✅ | `tooling/scripts/database/review-browser-run.mjs:147-192`, `tooling/tests/unit/database/review-browser-evidence.test.ts:59-104` | Only existing `samples`/`real` pass names are allowed. Root/source/parent/destination checks reject symbolic links and tested Windows junctions; recursive filter accepts regular files/directories only. Existing retained evidence cannot be overwritten. Trusted orchestrator root is not a public-request input; hostile concurrent local path replacement is outside this packet's claim. |
| CI-07 | Propagate original browser and preservation failures. | ✅ | `tooling/scripts/database/review-browser-run.mjs:413-432` | Original failure remains in `failures`; a copy failure is added to the same list. Server shutdown and outer cleanup remain; the final nonempty failure list throws. Existing orchestration tests retain nonzero child and failure aggregation assertions. |
| CI-08 | Keep the implementation/declaration and artifact producer/consumer paths in agreement. | ✅ | `tooling/scripts/database/review-browser-run.d.mts:37-38`, `tooling/scripts/database/review-browser-run.mjs:145,170`, `.github/workflows/ci.yml:168-178`, `tooling/tests/unit/database/review-browser-evidence.test.ts:106-111` | Literal `test-results/browser-passes` is paired in the declaration and consumer. Tooling compiler passes. The fixed per-pass copy plus original shared output can yield overlapping archive evidence; duplicated references do not establish independent runs. |
| CI-09 | Preserve upload retention, action pin, condition and all verification gates. | ✅ | `.github/workflows/ci.yml:168-178`; complete working-tree workflow diff | The only workflow delta expands this existing artifact's path field. Its condition remains `if: failure()`, not `always()`. Existing upload action SHA `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`, seven-day retention, missing-file behavior, jobs, events, permissions and gate commands are unchanged. |
| CI-10 | Preserve diagnostic history and qualify the historical sign-in cause. | ✅ | `library/requirements/reports/2026-10-14-completion-integration-ci-regressions.md`, original prefix and appended approved follow-up | Original 7,753-byte report prefix hashes exactly to `7b65198c7cdcd071b692fd3cedfb51a1e510c5997fe5261bb5fbcf7ef30cb8ce`. Its initial unmodified/proposed status is explicitly superseded by the append. A historical HTTP 429/shared quota cause remains inference, without surviving original response/trace proof. |
| NG-01 | Preserve production form, Select, authentication policy, coverage, timeout and worker settings. | ✅ | Working-tree tracked diff against `03dcfef7ca26547cdd843eaabd338b50857a06af` | Only five assigned existing files differ; the sixth source file is the new focused test. No production component/authentication module, test configuration, dependency or canonical baseline changes are in this correction packet. The earlier committed financing-PDF correction remains outside this delta. |
| NG-02 | Do not equate mocked contracts or retained RED logs with a new actual hosted/database/browser pass. | ✅ | Focused commands and qualification below | Actual combined CI for the corrected packet remains required. No full suite or actual database/browser service ran during this review. |

### Independent verification and limits

- First focused invocation ran the new evidence tests and existing review-run tests: two files, 26 passed, 5.74 seconds. It also named a nonexistent third test path; that path contributed no tests and was corrected in the separate invocation below, so no missing file is counted as a pass.
- Existing `real-database-orchestration.test.ts`: initial run had 25 passes and one unchanged five-second child-process timeout while preparation was starting. The serial rerun, after preparation completed, passed all 26 cases in 1.93 seconds without changing source, assertions, worker settings or timeout. Therefore the combined independent total is 52 distinct focused cases: new evidence 14, existing review-run 12 and existing database orchestration 26. The transient failure is retained as verification context, with no unsupported root-cause claim.
- Full preparation integration file: all 16 passed in 70.28 seconds wall time; test execution was 14.90 seconds. These are DOM integration cases, not Playwright/browser evidence.
- `pnpm exec tsc -p tsconfig.tooling.json --noEmit`: passed, verifying paired helper exports and actual consumers.
- `git diff --check`: passed. Final source/diagnostic pins match the fresh Security packet.
- Inspected retained `preparation-focus-race-red.log`: one selected test failed with the same inaccessible webinar option before the setup correction; 15 were deselected. Inspected `pass-preservation-red.log`: no-op preservation produced missing retained output and a failing test; 13 were deselected. These RED controls were not rerun by mutating this frozen packet.
- The actual old-source run `38511521620`, head `03dcfef7ca26547cdd843eaabd338b50857a06af`, is now completed FAILURE. Application verification and the Real PostgreSQL job failed, release contract passed, preview smoke skipped. Application log establishes four preparation dropdown failures, 918 other integration passes, one existing skip and preceding 3,100 unit passes. This review did not inspect the newly completed PostgreSQL failure log or attribute that failure; the parent was notified to inspect it. No completed corrected-packet CI or actual browser pass is claimed here.
- Artifact/authentication boundary tests use real local filesystem bytes plus a mocked browser client. Database orchestration commands are controlled test callbacks, not actual Supabase operations. Product dependency and secret audits were completed by the preceding Security reviewer and are not recast as new independent Quality executions.

### Frozen packet pins

| File | SHA-256 |
| --- | --- |
| `.github/workflows/ci.yml` | `17f16c3fe351d7995fa86aa480022d820bddbab90466fa75ffbf765f53196aff` |
| `apps/web/src/features/webinar-ads/preparation.integration.test.tsx` | `f5fc9a93fcce57869348f248ee7fe643bedf80e074e061030720a25195049588` |
| `tests/browser/review/helpers/guided-setup-journey.ts` | `caa7e842a9793858c53f188ed998d3b1c0c09e696429b7c6d22477af700efd41` |
| `tooling/scripts/database/review-browser-run.mjs` | `5b27c4f1136a92d885e499ba273dae94e3baaf1b99a87bd6c11658648e33164a` |
| `tooling/scripts/database/review-browser-run.d.mts` | `642c38b762e914e3e1434b5131b09c604cddcbda7f3f6469d252d5af375b0336` |
| `tooling/tests/unit/database/review-browser-evidence.test.ts` | `72b6925169dfaf3e90510f3199445e25bf136cd187aca61fb0562d5b9da23c39` |
| `library/requirements/reports/2026-10-14-completion-integration-ci-regressions.md` | `5cc5fcbcfd68fbcbb3e2f4ee3ba1009f045b4d0233890a049f410e36163dd6ca` |

## Files Changed

Packet inventory, sorted by path:

- `.github/workflows/ci.yml` (M): expand only the existing failure artifact's path field.
- `apps/web/src/features/webinar-ads/preparation.integration.test.tsx` (M): await observable heading focus, retain pointer selection, add the controlled race regression.
- `library/requirements/reports/2026-10-14-completion-integration-ci-regressions.md` (A): preserved original diagnosis with an explicitly approved appended follow-up and evidence pins.
- `library/requirements/reports/2026-10-14-completion-integration-ci-security-review.md` (A): preceding independent Security qualification, read and hash-verified only.
- `tests/browser/review/helpers/guided-setup-journey.ts` (M): assert the real same-origin sign-in POST's status before real navigation.
- `tooling/scripts/database/review-browser-run.d.mts` (M): paired declarations for fixed artifact directory and preservation helper.
- `tooling/scripts/database/review-browser-run.mjs` (M): copy original output into fixed per-pass directories and retain copy failures.
- `tooling/tests/unit/database/review-browser-evidence.test.ts` (A): 14 boundary cases covering original-byte retention, path safety, overwrite refusal, consumer agreement and safe sign-in status.

Reviewer addition: only `library/requirements/reports/2026-10-14-completion-integration-ci-quality-review.md`. All assigned source and other report files are released unchanged to the parent. A new corrected-head CI run, repository review, current-main mergeability check and actual required checks remain the orchestrator's next qualifications.
