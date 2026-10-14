# QA Report: Financing PDF assertion correction

**Plan document:** `COMPLETION_INTEGRATION_LEDGER.md`, FP-OUTPUT/FP-REGRESSION in `FINANCING_PHOTOS_LEDGER.md`, CTR-001 revision 1, and the assigned bounded correction recorded in `library/requirements/reports/2026-10-13-completion-integration-pdf-test-diagnosis.md`.
**Audit date:** October 13, 2026, America/Chicago.
**Base/head:** `codex/completion-integration`, PR 95, at `26ace47516e5c250e931b6d042d8c8942422188e` plus the one uncommitted test correction.
**Auditor:** Independent quality-guardian.

## Summary

PASS for the bounded test correction after fresh Security. The assertion still compares the complete decoded PNG byte sequence and its length, and all surrounding real PDF rendering, deterministic output, image, financial text and refusal checks remain intact; independent execution passed all 16 targeted cases. This source clearance does not qualify the failed original App CI, the separate default-worker local failure, current combined PostgreSQL status or a corrected-head CI run.

The exact preceding Security report SHA-256 is `07114f8254b5f65a58931601b60422fe214a0cf67ac1cd15e0eaccf7636648b4`. It found no unresolved issue and performed no production remediation. Quality owns only this new report and ignored evidence; no source, tests, fixtures, configuration, images, other reports, commit, push, database, hosted or provider operation was changed. The earlier combined review remains valid for its unchanged production source, including its attributed nonblocking WQ-02 suggestion; it does not by itself certify this new assertion.

## Scorecard

| Category     | Status | Notes                                                                                                                                         |
| ------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Completeness | ✅     | The assigned comparison correction is present; all 16 original cases remain selected and pass.                                                |
| Correctness  | ✅     | Complete Buffer equality retains byte and length refusal; no sampling or tolerance added.                                                     |
| Alignment    | ✅     | Only the existing test assertion and explanatory comment change. Production rendering and contract are unchanged.                             |
| Gaps         | ✅     | Retained independent native negative controls and reviewer equality probes establish mismatch sensitivity. Fresh CI remains an explicit gate. |
| Detrimental  | ✅     | No weakened checks or production regression introduced. Existing timeout/CI failures remain recorded without waivers.                         |

## Critical Issues (must fix)

None detected in this bounded correction.

## Warnings (should fix)

None detected in this bounded correction. The original aggregate CI failure and other local default-worker timeouts still require the orchestrator's corrected-head qualification; neither is relabeled as a pass here.

## Suggestions (consider improving)

None new. Prior combined WQ-02 concerns historical webinar version summaries and is unchanged by this test-only delta.

## Plan Item Traceability

| #             | Plan requirement                                                                                        | Status                              | Implementation location                                            | Notes                                                                                                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PDF-QA-1      | Replace expensive generic Buffer deep equality with exact byte comparison                               | Pass                                | `apps/web/src/server/financing-output-layout.unit.test.ts:240-241` | The complete `Buffer.from(decodePDFRawStream(png!).decode())` is compared with `.equals(pixels)`, then true is required.                                                                                 |
| PDF-QA-2      | Preserve independent source PNG decode and length                                                       | Pass                                | Same file `:239-241`; fixture `:97-105`                            | Actual normalized PNG is decoded by Sharp into all 600 by 400 RGB pixels, 720,000 bytes; no slice or sampled digest. Different lengths refuse equality.                                                  |
| PDF-QA-3      | Preserve actual rendering twice and deterministic PDF check                                             | Pass                                | Same file `:213-216`                                               | Both actual `financingReportPdf` executions and full PDF equality remain. Production renderer and imports did not change.                                                                                |
| PDF-QA-4      | Preserve all five scenario counts and portrait/landscape                                                | Pass                                | Same file `:210-218`                                               | Parameterized counts 1 through 5 remain, with width 612 or 792 as before.                                                                                                                                |
| PDF-QA-5      | Preserve two image XObjects and exact JPEG bytes                                                        | Pass                                | Same file `:219-237`                                               | Actual parsed PDF stream enumeration, exact image count and JPEG digest are unchanged.                                                                                                                   |
| FP-OUTPUT     | Preserve complete saved financial text, facts, disclosure, validity and metadata                        | Pass in unchanged test/source       | Same file `:242-249`; `financing-output.ts`; `financing-pdf.ts`    | Every financial display value, saved list price, template, disclosure, validity marker and creator remain asserted.                                                                                      |
| FP-REGRESSION | Preserve legacy v1, ordered/inert HTML, strict bundles, revocation and zero-photo output                | Pass locally, bounded               | Same file `:180-208`, `:252` onward                                | All 16 cases passed independently. No entire combined suite repeated by this reviewer.                                                                                                                   |
| PDF-QA-6      | Prove refusal on first/middle/final byte change and truncation/extension                                | Pass, evidence attributed precisely | Security report negative-control section; ignored RED log          | Security independently rendered/decoded real PDFs and obtained all five intended assertion failures. This reviewer inspected that log and independently checked the corresponding full-Buffer semantics. |
| PDF-QA-7      | Preserve production source, original assertions' intent, budgets, coverage thresholds and configuration | Pass                                | Exact Git diff and original combined Security pins                 | Executable diff is two added lines and one removed line in only this test. All 45 prior consequential source pins match. No timeout, worker or coverage policy change.                                   |
| PDF-QA-8      | Run Security before fresh Quality on the corrected file                                                 | Pass                                | Exact preceding Security report; this report                       | Both supplied correction and diagnosis hashes match at entry and release.                                                                                                                                |
| PDF-QA-9      | Record actual failure, performance evidence and full bounded coverage honestly                          | Pass, attributed evidence           | Diagnosis sections and retained logs                               | Measured assertion cost belongs to diagnosis, not a new reviewer benchmark or production rendering speed claim. Other default-worker failures remain failed evidence.                                    |
| PDF-QA-CI     | Required corrected-head combined CI and final mergeability                                              | Open root gate                      | PR 95 release qualification                                        | No current CI green, completed PostgreSQL, merged or hosted outcome is inferred here.                                                                                                                    |
| NG-RENDER     | Do not change renderer, fixture contents, stored calculations or production behavior                    | Pass                                | Working diff and 45 source pins                                    | Only an assertion mechanism and its explanation change.                                                                                                                                                  |
| NG-WAIVER     | Do not skip cases, weaken equality, increase budgets or change global workers                           | Pass                                | Exact two-line test delta                                          | CLI two-worker selection limits this local verification only; tracked test configuration remains unchanged.                                                                                              |
| NG-RELEASE    | Do not claim project/PRD completion, lender approval, hosted storage or provider effects                | Pass                                | Report limits and component ledgers                                | Original synthetic fixtures remain implementation evidence only.                                                                                                                                         |

### Independently executed verification and attribution

| Check                                       | Result                                                                                                                   | Evidence                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Corrected actual financing output test file | One file, all 16 cases passed, 19.61 seconds total, 2.95 seconds test time, exit 0                                       | `test-results/quality-integration/pdf-correction-focused.log`                       |
| Exact full-Buffer semantics                 | Matching complete 720,000-byte control accepts; first, middle and last byte changes, truncation and extension all refuse | Read-only Node probe with the same whole-Buffer comparison; no tracked file changes |
| Prior combined consequential pins           | All 45 raw SHA-256 values unchanged                                                                                      | Independently recomputed from the prior combined Security report                    |
| Correction and input evidence pins          | All supplied hashes match                                                                                                | Frozen table below                                                                  |
| Working diff and hygiene                    | Exactly one executable path, two added lines and one removed line; `git diff --check` passes                             | Git inspection                                                                      |

The reviewer read the complete consequential test block and surrounding fixture/output cases. `Buffer.equals` compares the full byte sequence and requires matching lengths, without object-key enumeration. The complete source pixels are retained as the comparison input. Existing `.toEqual` deterministic whole-PDF checks, JPEG hash checks, image count, parsed text assertions and native production calls are unchanged.

Security's separate retained native negative run reports five failed cases at the corrected comparison, 1.95 seconds test time, exit 1. Its eleven unselected cases are deliberate name-filter exclusions in the scratch RED runner, not skips added to the tracked suite. The initial scratch dependency-resolution failure executed no tests and supplies no negative-control proof. Quality inspected the resolved native failure log; Quality's own cheap equality probe is additional byte/length semantics evidence, not a claim to have rerun native mutations.

The diagnosis measured old assertion/decode overhead of 1,195.7 to 1,748.0 milliseconds against 1.5 to 4.8 milliseconds for exact Buffer equality, using the same actual PDF cases. These are the implementation owner's measurements; this reviewer did not repeat the benchmark. Neither fixture nor production renderer performance is changed or certified by replacing a test assertion.

The implementation owner's bounded full coverage run passed all 3,100 cases in 207 files, 117.58 seconds, with unchanged per-package thresholds and aggregate 88.87% statements, 85% branches, 91.59% functions and 89.85% lines. Quality inspected the retained coverage summary. The separate local default invocation on 16 exposed processors still reported four different five-second timeouts and an additional integrity refusal whose cause was not established. That failed invocation is not cleared by this focused pass. The original CI App job's four XObject-case timeouts remain a failed run; fresh corrected-head CI must establish its own result.

### Frozen handoff

| File                                                                                         | SHA-256                                                            |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `apps/web/src/server/financing-output-layout.unit.test.ts`                                   | `95052e3300737235a7c14dff2e8d6dd664de71ee2b352dfa5dbf827a6ce2509f` |
| `library/requirements/reports/2026-10-13-completion-integration-pdf-test-diagnosis.md`       | `57e282cc8ce556598c75bb5d984e59491de5c4f0e193d1e37498c797cc7cc65c` |
| `library/requirements/reports/2026-10-13-completion-integration-pdf-test-security-review.md` | `07114f8254b5f65a58931601b60422fe214a0cf67ac1cd15e0eaccf7636648b4` |

The root owns repository-health qualification, commit, corrected-head CI and mergeability. The original current PostgreSQL job status was not inspected by Quality. This report releases its ownership after the source hashes and review file are verified; any source correction in the next cycle needs its own appropriate Security/Quality review.

## Files Changed

- `apps/web/src/server/financing-output-layout.unit.test.ts` (M, implementation owner): replaces only PNG Buffer deep equality with full `.equals` and adds its explanatory comment.
- `library/requirements/reports/2026-10-13-completion-integration-pdf-test-diagnosis.md` (A, implementation owner): retains measured cause, actual negative controls, full bounded coverage and failed default-worker limits.
- `library/requirements/reports/2026-10-13-completion-integration-pdf-test-quality-review.md` (A, this reviewer): fresh ordered Quality report and bounded verification evidence only.
- `library/requirements/reports/2026-10-13-completion-integration-pdf-test-security-review.md` (A, Security owner): preceding independent Security pass and actual native negative-control evidence, consumed unchanged.
