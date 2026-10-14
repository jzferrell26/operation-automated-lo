# Completion integration CI correction security review

**Date:** 2026-10-14
**Reviewer:** independent security-guardian
**Base:** `03dcfef7ca26547cdd843eaabd338b50857a06af`
**Verdict:** PASS for the frozen correction packet. Fresh Quality may review these files next.

## Executive summary

No Critical, High, Medium or Low security findings were detected in the six source/test files reviewed. Authentication still uses the real UI form, successful response and real navigation. Artifact preservation retains original files inside fixed disposable-review directories, rejects links and overwrite attempts, and propagates failures. This is a bounded CI/test correction review, not certification of the entire product or its hosted deployment.

The managed CVE watchlist was last refreshed on 2026-04-24, more than 120 days ago. Its intelligence requires maintenance by its owner. A fresh production dependency audit for this checkout returned zero advisories at every severity; this packet changes no dependency declarations or lockfile. No new framework patch claim is inferred from the stale watchlist.

## Scope and ordering

Read the managed security Weapon, Guardian configuration, principles, integrated audit procedure, three pattern catalogs, CVE guidance and output template. Inspected every packet file, its complete surrounding orchestration, the actual preparation focus callback, Select blur behavior, root Vitest configuration and workflow consumer. Prior integration Security and Quality reports describe earlier packets. No fresh Quality report for this correction packet was present on entry. This Security pass precedes its fresh Quality pass.

The parent owns the frozen source packet. This reviewer owns only this new report, made no source corrections, and performed no commit, push, provider action, credential inspection, hosted migration or deployment. The general scanner would sweep unrelated source and write its fixed `reports/scan-output` directory outside this assignment. It was inspected but not executed; relevant scoped source inspection, the repository secret audit and fresh production dependency audit were used instead. No full test suite or database/browser service was launched.

## Scorecard

| Category | Status | Evidence |
| --- | --- | --- |
| Financial/payment security | Clear within scope | No payment, ad publishing, budget or provider changes. |
| PII/secret exposure | Clear within scope | Authentication assertion exposes only method, path and numeric status; synthetic marker refusal cases and repository secret audit pass. |
| Authentication/authorization | Clear within scope | Real same-origin POST and HTTP 200 precede unchanged actual navigation; no session forging or policy adjustment. |
| Injection/path traversal | Clear within scope | Fixed pass names and filesystem link/nonregular-entry rejection; no new shell execution. |
| Dependency security | Clear for production audit | Zero production advisories; dependencies and lockfile unchanged by packet. |
| Configuration/headers | Clear for delta | Existing workflow changes only one artifact path field; application headers untouched. |
| Data/evidence integrity | Clear within scope | Whole-file copying, overwrite refusal, preserved failures, byte-exact two-pass regression; baselines untouched. |

## Findings by severity

Critical: None detected.

High: None detected.

Medium: None detected in the packet.

Low: None detected in the packet.

## Boundary review

`tests/browser/review/helpers/guided-setup-journey.ts:224-238` derives the currently visited origin, registers response observation before submitting the existing button, and matches origin, exact pathname and POST method. The assertion receives the numeric HTTP status only. It neither reads response/request bodies nor passes email, password, query, cookie or full URL into its assertion. The existing navigation and workspace-choice code follows the successful response. HTTP 401, 429 and 503 tests fail before navigation and prove supplied synthetic secret/query markers do not appear in the assertion message. Foreign-origin, GET and other-path responses do not match. This adds diagnostic evidence, not authentication authority.

`tooling/scripts/database/review-browser-run.mjs:147-192` accepts only the two existing pass catalog names. It resolves the repository root, checks the result/source/parent/destination entries with `lstat`, rejects links including tested Windows junctions, requires directories at each root boundary, refuses an existing destination, and copies with `dereference: false`, `errorOnExist: true` and `force: false`. Its recursive filter accepts only regular files and directories and rejects nested links. It performs no delete or move. The repository root is a trusted orchestrator input, not a public request value. This review does not claim protection against a hostile local actor concurrently replacing paths between filesystem checks.

`tooling/scripts/database/review-browser-run.mjs:413-431` retains the original failure list, attempts preservation in the per-pass `finally` block, adds preservation failures to that list, shuts down the pass server, and ultimately throws if any pass or preservation failed. A failed copy cannot make a failed suite pass. Refusing a previously retained destination is deliberate; a repeat run must use a clean disposable evidence tree rather than silently overwrite it.

`.github/workflows/ci.yml:168-178` changes only the existing `database-failure-traces` artifact's path to include the producer's `test-results/browser-passes`. Its existing condition is **`if: failure()`**, not `always()`. That condition remains unchanged. Its pinned upload action, seven-day retention and missing-file behavior remain unchanged, as do all verification commands, jobs, events and permissions. Neighboring product-frame uploads retain their existing `always()` conditions. The copied browser traces are original disposable synthetic-review output, not new production telemetry or sanitized substitutes.

`apps/web/src/features/webinar-ads/preparation.integration.test.tsx:56-68` waits for the actual step heading to acquire focus before pointer selection, then asserts the selected webinar text. Its additional regression at lines 73-104 controls an animation frame only inside that test and restores its listener/timers. The inspected production `preparation.tsx:183` focus callback and `packages/ui/src/components/Select.tsx:268` blur behavior remain unchanged. Account isolation, exact retry and save-body assertions remain present. There is no new production bypass or canonical image replacement.

The diagnostic report explicitly preserves the distinction between an established focus interaction race and an unproven historical sign-in refusal. Shared authentication quota exhaustion remains an inference. Neither the new HTTP observation nor artifact preservation proves the historical cause or fixes it.

## Independent verification

| Check | Result |
| --- | --- |
| New artifact/authentication boundary tests | 14 passed. |
| Existing browser/database orchestration contract tests | 38 passed. |
| Combined focused unit/database invocation | 3 files, 52 passed, 4.56 seconds. Commands are mocked orchestration contracts; no actual Supabase service was started. |
| Entire preparation integration file | 1 file, 16 passed, 68.26 seconds wall time; 15.71 seconds test execution. |
| Repository secret audit | Passed across six source roots and public environment boundary. |
| Production dependency audit | Zero info, low, moderate, high and critical advisories. |
| `git diff --check` | Passed. |
| Frozen source and diagnostic report digests | All match parent packet and diagnostic report. |
| Source mutation inspection | Only the parent's original five tracked edits and its two untracked additions existed before this report. No reviewer source change. |

The existing controlled RED logs were inspected through the diagnostic report's documented evidence, not regenerated by mutating this frozen packet. The independent final test run verifies positive and negative cases directly. Actual combined CI, pgTAP and seeded browser qualification for the new packet remain required; local contract tests cannot establish hosted behavior.

## Frozen source pins

| File | SHA-256 |
| --- | --- |
| `.github/workflows/ci.yml` | `17f16c3fe351d7995fa86aa480022d820bddbab90466fa75ffbf765f53196aff` |
| `apps/web/src/features/webinar-ads/preparation.integration.test.tsx` | `f5fc9a93fcce57869348f248ee7fe643bedf80e074e061030720a25195049588` |
| `tests/browser/review/helpers/guided-setup-journey.ts` | `caa7e842a9793858c53f188ed998d3b1c0c09e696429b7c6d22477af700efd41` |
| `tooling/scripts/database/review-browser-run.mjs` | `5b27c4f1136a92d885e499ba273dae94e3baaf1b99a87bd6c11658648e33164a` |
| `tooling/scripts/database/review-browser-run.d.mts` | `642c38b762e914e3e1434b5131b09c604cddcbda7f3f6469d252d5af375b0336` |
| `tooling/tests/unit/database/review-browser-evidence.test.ts` | `72b6925169dfaf3e90510f3199445e25bf136cd187aca61fb0562d5b9da23c39` |
| `library/requirements/reports/2026-10-14-completion-integration-ci-regressions.md` | `5cc5fcbcfd68fbcbb3e2f4ee3ba1009f045b4d0233890a049f410e36163dd6ca` |

## Remediation and follow-up

No remediation required. Only this report was added by this reviewer. Fresh Quality should verify the frozen packet, followed by the orchestrator's repository/PR review before commit or push under existing user authorization. Refresh the managed stale CVE intelligence separately without modifying Guild files during product work. Establish any future sign-in refusal from its retained actual response/trace evidence before attributing a cause or changing fixtures.
