# QA Report: Homeowner readiness increment

**Plan document:** `HOMEOWNER_READINESS_LEDGER.md`  
**Audit date:** 2026-10-13  
**Base branch:** `origin/main` at `728d5f0`  
**Head:** `codex/homeowner-readiness`, assigned uncommitted working-tree snapshot  
**Auditor:** quality-guardian  
**Security prerequisite:** [Readiness Security review](2026-10-13-readiness-security-review.md), including its final four-frame browser-source recheck

## Summary

The readiness source criteria HR-STATE, HR-ACTIONS, HR-READS and HR-DESTINATION pass this scoped review with no identified implementation defect. Independent focused verification passed 27 unit and 25 integration tests, but HR-PROOF remains partial until the new signed-in readiness browser and real PostgreSQL cases execute successfully in CI. This is a conditional source pass for the next draft-PR stage, not a ship, hosted valuation or complete PRD-007 acceptance verdict.

## Scorecard

| Category     | Status | Notes                                                                                                                                                                                    |
| ------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Completeness | ⚠️     | Four assigned source criteria implemented; actual changed-state browser/database qualification is pending under HR-PROOF. HR-PR is a subsequent stage.                                   |
| Correctness  | ✅     | Projection distinguishes setup, read-only, unknown, configured zero and exhausted allowance; cached create and saved-snapshot revision retain their existing server semantics.           |
| Alignment    | ✅     | Additive workspace presentation DTO, existing server authority, immutable report schemas and existing product controls are preserved. No new role or provider policy is authored.        |
| Gaps         | ⚠️     | Required signed-in browser/PostgreSQL evidence remains unexecuted locally, W-01. Source tests and harness additions exist.                                                               |
| Detrimental  | ✅     | Existing saved outputs and failure recovery have focused regression evidence; no connection-screen redirect, migration, delivery activation or financial snapshot rewrite is introduced. |

## Critical Issues (must fix)

None identified in the reviewed source.

## Warnings (should fix)

- [ ] **W-01: Changed-state browser and PostgreSQL qualification is still pending (HR-PROOF)**, `tests/browser/review/homeowner-readiness.spec.ts:20-133` and `apps/web/src/server/homeowners/routes.postgres.test.ts:153-202`.

  The new browser spec exercises a signed-in shell with intercepted report API fixtures; the database tests exercise the actual server projection and tenant reads. Neither has executed locally because the required Docker/database environment is unavailable. The six existing production-build demo browser checks do not prove the new live/readiness states. Run the designated CI database/browser gate and retain the exact result before marking HR-PROOF or HR-PR complete; do not replace this gap with demo screenshots or unit mocks.

  ```ts
  // A real signed-in shell with synthetic report API answers isolates presentation. PostgreSQL route
  // tests verify the server projection; this spec never requests a valuation or makes a report write.
  for (const frame of REVIEW_FRAMES) {
  ```

  This is an evidence warning, not an assertion that those tests fail or that a production defect has been reproduced. A draft PR can supply the missing CI environment.

## Suggestions (consider improving)

None.

## Plan Item Traceability

The ledger's custom criteria were extracted manually. Its initial OPEN state cells are not used as proof that implementation is absent; each result below is traced independently.

| #              | Plan Requirement                                                                                                                                                                             | Status | Implementation Location                                                                                                                                                                                   | Notes                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| HR-STATE       | Authenticated server-derived readiness distinguishes unavailable storage, write authority, valuation setup, zero/exhausted allowance and unknown/errors, without identifiers or credentials. | ✅     | `packages/contracts/src/homeowner-reports.ts:192-225`; `apps/web/src/server/homeowners/readiness.ts:3-31`; `apps/web/src/server/homeowners/http.ts:94-100,145-154,168-190`; unchanged `runtime.ts:62-105` | Readiness is derived after principal/role resolution and successful usage/property reads. Report surface switched off maps to storage unavailable; failed reads remain unknown and hide raw internal errors. Enum projection contains no configuration name or provider credential.                                                                                                                                |
| HR-ACTIONS     | Create/refresh/monthly controls explain capability, retain cached/reused values and revisions, and change no provider flags, allowance, role or delivery consent.                            | ✅     | `apps/web/src/features/homeowners/readiness.ts:3-69`; `builder.tsx:182-189,420-429`; `workspace.tsx:560-599,698-780`; unchanged `apps/web/src/server/homeowners/service.ts:19-121`                        | Fresh refresh/resume needs current availability. A writer can pause or choose on-demand when fresh lookup is unavailable; existing delivery can be disabled subject to those safe schedule controls. Create does not require fresh allowance because server cache reuse is possible; it still requires the existing valuation setup. Property-only revision reuses a saved valuation without adapter/contact work. |
| HR-READS       | Unavailable new valuations preserve permitted snapshots/PDF/sharing; unauthorized reads/writes remain refused on server.                                                                     | ✅     | `apps/web/src/features/homeowners/workspace.tsx:536-654`; `use-home-workspace.ts:117-143`; `readiness.integration.test.tsx:49-174`; unchanged server `runtime.ts:71-81`, service and repository paths     | Failed recheck keeps already loaded reports, resets write capability to false and readiness to unknown, and recovers from a later valid response. Share controls retain existing source-freshness and write-authority requirements. Valuation unavailability does not disable saved PDF or loan-detail revisions.                                                                                                  |
| HR-DESTINATION | Remove unrelated HighLevel/Meta connections CTA; use accurate administrator/support next step.                                                                                               | ✅     | `apps/web/src/features/homeowners/readiness.ts:29-67`; `workspace.tsx:879-915`; `refusal-messages.integration.test.tsx:230-261`                                                                           | Check report availability replaces the generic connection check. The unavailable-report empty state no longer links to `/settings/connections`; linked-report/delivery notices correctly describe their separate HighLevel need.                                                                                                                                                                                   |
| HR-PROOF       | Focused permutations/recovery/roles/saved-report tests and actual browser checks cover changed states; hosted/provider proof separate.                                                       | ⚠️     | Unit/integration checks below; `tests/browser/review/homeowner-readiness.spec.ts:20-133`; `apps/web/src/server/homeowners/routes.postgres.test.ts:153-202`                                                | 52 independently executed focused tests passed. Added signed-in browser and real PostgreSQL checks remain CI-only, W-01. Demo smoke is distinct.                                                                                                                                                                                                                                                                   |
| HR-SECURITY    | Security follows implementation with zero unresolved Medium+ findings.                                                                                                                       | ✅     | `2026-10-13-readiness-security-review.md`                                                                                                                                                                 | Fresh Security reviewed final source and browser extension before Quality, no unresolved findings.                                                                                                                                                                                                                                                                                                                 |
| HR-QUALITY     | Fresh Quality verifies exact criteria and limits after Security.                                                                                                                             | ✅     | This report                                                                                                                                                                                               | Separate reviewer context, source traceability and independent focused execution. Only this assigned report was written.                                                                                                                                                                                                                                                                                           |
| HR-PR          | Commit/PR, required green CI, current-main conflict check and MERGEABLE status.                                                                                                              | 🟦     | `HOMEOWNER_READINESS_LEDGER.md:14`                                                                                                                                                                        | Pending orchestration stage, receives no completion credit. No PR/green-CI/mergeability claim made here.                                                                                                                                                                                                                                                                                                           |
| NG-POLICY      | Preserve L-5 contact scope, L-15 retention/export/removal and L-16 snapshot role decisions.                                                                                                  | ✅     | Complete scoped diff; unchanged `runtime.ts`, service and database policy                                                                                                                                 | Those owner decisions remain open. No role/privacy policy or homeowner data-lifecycle implementation was added.                                                                                                                                                                                                                                                                                                    |
| NG-PROVIDER    | No provider activation, hosted valuation qualification, migration or external delivery proof.                                                                                                | ✅     | Complete scoped diff; readiness modules and browser fixtures                                                                                                                                              | Environment values and migrations unchanged. New enums are presentation evidence and never grant server authority.                                                                                                                                                                                                                                                                                                 |
| NG-SNAPSHOTS   | Old workspace payloads default to explicit unknown without rewriting immutable report snapshots.                                                                                             | ✅     | `packages/contracts/src/homeowner-reports.ts:192-225`; `apps/web/src/server/homeowners/readiness.unit.test.ts:27-40`; contract diff                                                                       | The additive field belongs to HomeWorkspace only. HomeReport, HomeReportInput and existing stored snapshot structures are unchanged. Legacy payloads receive an independent unknown object, not invented permission or quota.                                                                                                                                                                                      |

### Independently executed verification

| Check                                                          | Result                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Readiness, settings-faults and report-service unit tests       | 27 passed across three files. Includes role refusal before work, configured zero/exhaustion, storage failure versus surface disabled, safe projection, legacy default and no fresh/contact call for cached create/property-only revision.                          |
| Readiness, refusal-message and report-action integration tests | 25 passed across three files. Includes zero/exhausted saved actions, cached creation, adapter-unavailable edits/sharing, read-only UI, pausing an existing schedule, failed-recheck preservation/recovery, accurate support CTA and existing write/share recovery. |
| Installed Next.js query                                        | 16.3.8. Manifest patch is exact; lockfile change is confined to the matching Next/env/SWC family reviewed by Security.                                                                                                                                             |
| Diff inventory and `git diff --check`                          | Passed. No provider configuration, migration, unrelated product runtime or snapshot schema change found.                                                                                                                                                           |

The implementation owner separately reports 33 unit, 47 integration, six existing production-build demo browser cases and relevant build/type/audit checks passing. Security separately executed 27 unit, 25 integration and its scans/audit. Root reports the final browser-only extension's tooling TypeScript/format checks passed. These are attributed results, not duplicate independent runs by Quality; this report does not assert a full repository gate passed at the final branch head.

### Limits of actual browser and database evidence

The new spec uses all four shared frames, 1440, 1180, 768 and 390px. It checks zero-allowance saved-report presentation in Light and Dark, then a setup-unavailable transition, PDF download, no unrelated CTA, full axe, no horizontal overflow, no mutation request and no external request. Its report API answers are synthetic fixtures inside a genuinely signed-in shell; even successful future execution will not prove real valuation lookup or server projection. The separate PostgreSQL cases test actual readiness projection, reader access, foreign-workspace isolation and saved outputs without the adapter. Neither suite is credited as executed in this local review.

The service's cached-create test intentionally retains a configured adapter but asserts zero estimate calls and a zero monthly limit. The adapter-free revision test uses `reuseReportId` and no contact port for a property-only snapshot. These prove preservation of the existing supported paths; they do not claim new creation works without any configured adapter, nor that an uncached request bypasses quota. Report sharing still requires fresh source dates and existing authorization. Unknown readiness and empty storage are not treated as configured-zero allowance.

No hosted account walkthrough, real billable lookup, live provider credentials/rights, actual monthly refresh, contact handoff, lender/customer visual approval, final CI or current-main mergeability was established here. HR-PROOF remains pending the identified CI evidence, and PRD-007's externally open outcomes remain open.

### Final post-security browser-artifact and CI recheck

The final browser-artifact and workflow delta passes this narrow source recheck with no new implementation finding. Security's Final test-artifact and CI recheck precedes it; the parent separately reports independent DevOps clearance of the workflow alignment. W-01 remains open, and HR-PROOF is not reclassified as complete.

| Affected criterion         | Exact change reviewed                                                                                                                         | Quality result and remaining proof                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HR-PROOF                   | `tests/browser/review/homeowner-readiness.spec.ts:30-31,107-110,127-132`: retain screenshots outside Playwright's transient result directory. | The constant `test-results/product-review-frames/homeowner-readiness` destination is created before capture; filenames use only trusted frame widths and literal themes. All four frames retain Light/Dark zero-allowance screenshots and one setup-unavailable screenshot after its assertions. A complete execution should produce twelve frames, but no actual frame production or acceptance is claimed yet. |
| HR-PROOF                   | `.github/workflows/ci.yml:159-166`: add the database-job product-review-frames upload.                                                        | Producer and artifact paths align. The step uses the existing pinned upload-action SHA, `always()`, seven-day retention and ignore-on-absence. It does not replace, suppress or alter the canonical `pnpm test:db` gate or failed-test traces. Upload configuration alone does not prove frames exist.                                                                                                           |
| HR-SECURITY and HR-QUALITY | Fresh final test/CI Security clearance, then this report recheck.                                                                             | Order preserved. No runtime/provider/role/schema change in this final delta and no new Quality finding.                                                                                                                                                                                                                                                                                                          |
| HR-PR                      | Draft-PR and real-CI qualification remain the next stage.                                                                                     | Clear to commit/open a draft PR to obtain the missing environment. Required CI, PostgreSQL execution, actual retained-frame inspection and current-main mergeability remain pending.                                                                                                                                                                                                                             |

Independently read the complete final spec and exact workflow diff. Verified the retained paths, all existing readiness/action assertions, full shared axe checks, horizontal-overflow checks, mutation counter and external-request guard remain present. The setup-unavailable screenshot is taken after checking its notice, preserved PDF action, absent unrelated connection CTA, axe and overflow. No screenshot baseline is written. `git diff --check` passed; final tooling TypeScript/format checks are parent-reported. No behavioral rerun is credited for this source-only recheck because the signed-in/database environment is still unavailable locally.

The screenshots continue to depict synthetic report API fixtures in the local seeded signed-in shell. Successful future capture will qualify that presentation path, not live provider lookup, deployed configuration or full server persistence. Retain and inspect the actual CI artifact and real database results before closing W-01 or HR-PROOF. Provider, hosted, owner-policy and customer-visual limits above remain unchanged.

### Fresh post-security readiness UX/source-fix recheck

The frozen three-file correction after PR #91 source head `7a434df6f25017b63ca905a257c4a7737e159633` passes this fresh narrow Quality review with no new finding. Security's Readiness notice and handoff source-fix cycle at `2026-10-13-readiness-security-review.md:96-106` cleared the exact correction before this recheck. W-01 and HR-PROOF remain open for actual new-head CI and retained-frame inspection; the earlier head's checks and prechange frames are not credited to this source correction.

| Affected criterion or UX observation    | Exact reviewed implementation                                                                  | Result and limit                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HR-ACTIONS; UX-S01 typography           | `apps/web/src/features/homeowners/homeowners.module.css:378-380`; `workspace.tsx:895-900`      | Source correction passes: only the new readiness notice receives the additional local class and governed `--text-secondary-size` paragraph token. The inherited general notice declaration is not globally rewritten. Computed typography/contrast and final frame scores await actual rendering review.                                                                                                                                       |
| HR-ACTIONS; UX-S02 handoff availability | `apps/web/src/features/homeowners/workspace.tsx:613-643`                                       | Source correction passes: a live linked-report handoff additionally requires connected contacts, ready storage and allowed write capability, retaining busy/delivery/role/property-only checks. Unknown, reader, missing-contact and disabled-delivery states receive accurate adjacent explanations; an eligible writer can still open deliberate confirmation without dispatching on open. Existing server command enforcement is unchanged. |
| HR-ACTIONS and HR-DESTINATION           | `workspace.tsx:619-626,575-582`                                                                | Explanations name Check report availability, administrator/support, and the actual Monthly updates or Update schedule control derived from saved enrollment. No unrelated `/settings/connections` CTA is restored. This is user-facing guidance, not provider activation.                                                                                                                                                                      |
| HR-READS and safe disabling             | `readiness.integration.test.tsx:48-150` plus existing saved-action cases                       | Source and focused tests pass: PDF remains enabled for unavailable handoff cases, disabled handoff cannot open a dialog or write, existing delivery can be turned off, and prior pause/on-demand, saved revision/share and error-recovery cases remain passing. Fresh provider/allowance permission is not invented.                                                                                                                           |
| HR-SECURITY and HR-QUALITY              | Security's final source-cycle appendix followed by this independent source/interaction review. | Order preserved, no new Quality defect. HR-PROOF/HR-PR still need new source-head CI and actual presentation evidence.                                                                                                                                                                                                                                                                                                                         |

Independently ran readiness, refusal-message and report-action integration suites on the frozen final source: **32 tests passed across three files**, including all fourteen current readiness interactions. These checks cover the three unavailable linked-handoff scenarios, unknown capability, a configured writer's confirmation dialog, turning off existing delivery, and prior cached/create/snapshot/pause/recovery behavior. Independently checked formatting of the exact three source/test files and `git diff --check`; both passed. The worker's broader 54 integration tests, types, lint and zero-duplication result and Security's fourteen-test result remain separately attributed. No production build, port 3100 service or screenshot capture was started by Quality.

The source fixes address UX-S01 and UX-S02 in the separate provisional [readiness UX review](2026-10-13-readiness-ux-review.md); they do not grant a full rendered rubric pass or rewrite that reviewer's findings/report. The new twelve-frame suite still needs execution and inspection on this source head. Its synthetic report API fixtures inside the signed-in shell qualify presentation only; they do not establish live provider valuation, deployed settings, real delivery or actual server PDF content. Owner visual approval, L-5 contact-scope/L-15 retention/L-16 financial-role policy decisions, provider rights and final current-main mergeability remain unqualified. No provider flag, role, quota, consent, migration or policy changed in this correction. Only this existing readiness QA report was updated by Quality.

### Final post-security signed-in theme-control test repair

The final browser-test-only correction passes this fresh narrow source recheck with no new finding. Security's Signed-in theme-control test repair at `2026-10-13-readiness-security-review.md:108-117` precedes this review. The previously cleared readiness typography/handoff source correction remains separately evidenced above; this test repair supplies no additional runtime, provider, policy or baseline change.

`tests/browser/review/homeowner-readiness.spec.ts:96` now calls the existing `chooseThemeFromTheHeader` helper using its actual `light`/`dark` contract. Independently read `tests/browser/review/helpers/review-session.ts:74-102`: it opens the signed-in banner's Your account control, selects the intended radio, verifies resolved theme, closes the account dialog, verifies focus return and then removes incidental capture focus. It fits the real seeded review shell; the removed Appearance locator belonged to a different shell and was not an actual authentication failure.

At `homeowner-readiness.spec.ts:108-114,130-136`, the existing `settleForScreenshot` and `warmFullPageCapture` helpers precede each retained screenshot location. Their implementations wait for applied styles/fonts and settled capture state, then take a discarded full-page image. They introduce no report command or fixture-data change. The local-origin guard, seeded sign-in, synthetic report API responses, mutation abort/counter, PDF/control assertions, full axe/overflow checks and all twelve constant retained filenames remain present. No assertion was weakened or baseline written.

Independently inspected `test-results/homeowner-readiness-first-db-ci.log`, the failed run `38473357552` for prior head `7a434df`. It records **22 PostgreSQL route-test files and 295 tests passed**, including five homeowner HTTP cases, before the account browser comparison failed. Four readiness cases timed out after 120 seconds waiting for the nonexistent Appearance control; additional failures were the changed homeowner empty screenshots and the older approved-detail comparison. The artifact step explicitly reports no product-review-frame files. This historical backend success is preserved as prior-head evidence; it does not credit this repaired browser test as executed or qualify the final stacked/rebased branch. Parent separately reports prior Application verification and Release/recovery passed.

Independently checked final browser source formatting and `git diff --check`; both passed. Root reports tooling TypeScript checks passed. No local signed-in browser, PostgreSQL gate, production build, port 3100 service or capture was started by Quality. **HR-PROOF and W-01 remain open** until real new-head CI succeeds and the twelve retained presentation frames are obtained and inspected. The repair is cleared for the next source commit, shared-parent reconciliation and new CI/canonical qualification; it does not waive previous screenshot failures or grant baseline, full UX, hosted/provider or owner-policy acceptance. Only this existing readiness QA report was changed by this reviewer.

## Files Changed

Only this report is written by Quality. The audited working-tree inventory includes these modified and added files:

- `.github/workflows/ci.yml` (M, final follow-up): root-owned upload of retained product-review frames from the existing database job; canonical verification gate preserved.
- `HOMEOWNER_READINESS_LEDGER.md` (A): exact scoped criteria and ownership; orchestrator-owned.
- `apps/web/package.json` (M): root-owned exact Next.js 16.3.8 remediation.
- `apps/web/src/features/homeowners/builder.tsx` (M): availability-aware creation notice and final action guard.
- `apps/web/src/features/homeowners/home-workspace.test-support.ts` (M): explicit fixture readiness projections.
- `apps/web/src/features/homeowners/homeowners.module.css` (M, UX/source follow-up): governed text token scoped only to new readiness notices.
- `apps/web/src/features/homeowners/readiness.integration.test.tsx` (A): unavailable/allowance/role/cache/snapshot/recovery scenarios.
- `apps/web/src/features/homeowners/readiness.ts` (A): client presentation notices and fresh/create availability helpers.
- `apps/web/src/features/homeowners/refusal-messages.integration.test.tsx` (M): accurate availability recheck and administrator/support next step.
- `apps/web/src/features/homeowners/report-actions.integration.test.tsx` (M): explicit readiness fixture preserving existing action coverage.
- `apps/web/src/features/homeowners/use-home-workspace.ts` (M): parse readiness, distinguish failures and retain loaded snapshots while clearing stale write authority.
- `apps/web/src/features/homeowners/workspace.tsx` (M): saved-output preservation, capability notices and refresh/monthly/delivery controls.
- `apps/web/src/server/homeowners/http.ts` (M): authenticated server readiness projection and safe error readiness.
- `apps/web/src/server/homeowners/readiness.ts` (A): safe server enum projection and unknown/unavailable refusal states.
- `apps/web/src/server/homeowners/readiness.unit.test.ts` (A): role/adapter/allowance permutations and old workspace default.
- `apps/web/src/server/homeowners/routes.postgres.test.ts` (M): actual server/reader/tenant/unavailable-adapter proof awaiting CI execution.
- `apps/web/src/server/homeowners/service.unit.test.ts` (M): zero-fresh-allowance cache and adapter-free property-only revision preservation.
- `apps/web/src/server/homeowners/settings-faults.unit.test.ts` (M): quota state, read-only authority and safe storage failure projection.
- `library/requirements/in-work/prd-007-homeowner-reports/reports/2026-10-13-readiness-quality-review.md` (A): this independent report.
- `library/requirements/in-work/prd-007-homeowner-reports/reports/2026-10-13-readiness-security-review.md` (A): separate Security clearance and final source-cycle recheck.
- `library/requirements/in-work/prd-007-homeowner-reports/reports/2026-10-13-readiness-ux-review.md` (A, follow-up): separate provisional UX source review with unqualified rendered-score and artifact limits.
- `packages/contracts/src/homeowner-reports.ts` (M): additive workspace readiness schema/default, leaving immutable report schemas intact.
- `pnpm-lock.yaml` (M): matching Next/env/SWC patch family.
- `tests/browser/review/homeowner-readiness.spec.ts` (A): signed-in four-frame readiness presentation spec, awaiting CI.

Primary checkout and financing worktree were untouched. No implementation file, plan status cell, policy, generated artifact or baseline was edited by this reviewer.

## Fresh Quality: mobile notice and canonical baseline correction

**Plan:** `HOMEOWNER_READINESS_LEDGER.md`, HR-ACTIONS, HR-READS, HR-DESTINATION, HR-PROOF and HR-PR; PRD-007 acceptance item 10. **Base/head:** uncommitted delta from `140a3e1636194c8d56fea8d2d7575b278292bfa5`, `codex/homeowner-readiness`. **Date:** October 13, 2026. **Auditor:** fresh quality-guardian context.

### Summary

PASS for the bounded source correction and eight canonical baseline replacements, with final product capture and CI qualification still OPEN. This review follows the completed Mobile notice and canonical baseline Security cycle, which reports no unresolved findings and pins the exact source below. The delta is suitable for a source commit; it is not a ship verdict, fresh twelve-frame acceptance, full D9 score or hosted-provider qualification.

### Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | PASS for delta | Corrected mobile composition and exact canonical images are present; fresh product proof remains pending. |
| Correctness | PASS for source | Text receives the content column, action follows below, and geometry assertions test rendered boxes. Fourteen independent integration cases pass. |
| Alignment | PASS | Existing 760px breakpoint, spacing, tokens and control behavior are preserved; only the new readiness notice receives the layout override. |
| Gaps | OPEN evidence | Old mobile detail frames were rejected; isolated diagnostic results cannot replace new twelve-frame inspection or green final CI. |
| Detrimental | PASS for delta | No authority, provider, consent, quota, snapshot, contract, workflow, dependency or assertion relaxation. |

### Critical Issues (must fix)

None introduced in this frozen delta. UX-R01 is corrected in source, but its rendered status remains open until fresh product evidence is inspected.

### Warnings (should fix)

Existing W-01/HR-PROOF and HR-PR remain OPEN, as explicitly recorded at `HOMEOWNER_READINESS_LEDGER.md:11,14,35`. Obtain final CI and all twelve post-correction captures before changing those status cells. The older zero-allowance mobile captures and the independently reported RED4/GREEN4 isolated probe are not accepted as current product rendering. No new implementation warning was found.

### Suggestions (consider improving)

None within the assigned correction.

### Plan Item Traceability

| Item | Requirement | Result | Evidence and limit |
| --- | --- | --- | --- |
| PRD-007 item 10 / UX-R01 | Readable mobile layout with useful next action | Source PASS; rendering OPEN | `homeowners.module.css:744,819-830` gives only `.notice.readinessNotice` a stretched column, removes span flex compression and bounds/aligns the action. Existing legacy `.notice` wrapping remains. |
| HR-ACTIONS / HR-DESTINATION | Preserve the availability recheck and accurate explanation | PASS for delta | No workspace or readiness-copy file changed. `homeowner-readiness.spec.ts:136,159` covers the zero-allowance notices in both themes and the setup-unavailable notice at 390px. |
| HR-READS | Saved report outputs remain usable | PASS for focus tests | Fourteen integration cases independently passed, including refusal states, deliberate writer confirmation and disabling an existing delivery preference. Browser source retains enabled PDF/share/revision checks at `homeowner-readiness.spec.ts:124-135,155`. Actual new browser execution remains pending. |
| HR-PROOF | Meaningful browser regression and retained evidence | Source PASS; execution OPEN | `homeowner-readiness.spec.ts:25-51` measures full content width, action below copy and shared starting edge. It does not inspect a CSS declaration or mutate the page. Existing axe, overflow, zero-write and external-request checks remain at `134-167`; four cases are discovered. |
| Canonical acceptance | Use exact approved actual images, preserving unrelated regions | PASS | All eight files match both root and independently downloaded Security artifact copies, and the recorded SHA-256 values. Independent raw RGBA comparison reproduces every dimension, changed-pixel count and bound in the UX/Security tables. No header pixel changes. |
| HR-SECURITY / HR-QUALITY | Security followed by fresh Quality | PASS for frozen delta | Security appendix at `2026-10-13-readiness-security-review.md:122-165` precedes this report. Both source hashes match its pins. |
| HR-PR | Required final CI and current-main mergeability | OPEN | Neither a canonical artifact from a failed old-head run nor this source review qualifies the corrected final branch. |
| Non-goals | Preserve live-provider, authorization and owner policy boundaries | PASS | No migration, server, contract, provider/configuration, role, allowance, delivery consent or L-5/L-15/L-16 policy change. No local account/database/provider action by Quality. |

### Verification evidence

- Independently executed `pnpm exec vitest run --project integration apps/web/src/features/homeowners/readiness.integration.test.tsx`: one file, fourteen tests passed. Log: ignored `test-results/homeowner-mobile-quality-integration.log`.
- Independently verified all eight whole PNG hashes against both `test-results/homeowner-ci-diagnosis/canonical-review` and Security's separate artifact download in `test-results/homeowner-mobile-security-canonical`. Independent Sharp decode and raw comparison with `HEAD` reproduced the exact dimensions, counts and bounds already recorded. Artifact `11858817593`, canonical run `38479999828`, old head `140a3e...`, and its overall failure are independently established by Security, not represented here as a fresh download or green run.
- CSS SHA-256: `3dd2f7b1fee53d4df95ba628fb0c17422fec8eab890f19f560f9fdd73b6d67ff`. Browser spec SHA-256: `31df42ef40a583e8fe87e3a9aa9c9c79c420280ffd6ac019191711e1bad0e455`. Both equal the completed Security pins.
- Source Prettier check and `git diff --check` passed. Correct review-mode discovery lists four readiness cases; discovery is not execution. An initial shell command used Bash-style environment assignment in PowerShell and failed only that assignment after the hash/format checks; the corrected PowerShell discovery passed. No browser server was started.
- Fresh full-product captures, final CI and current-main mergeability remain unverified by this reviewer. Earlier actual PostgreSQL success and the diagnostic geometry results retain their existing attributed, prior-head limits.

### Files Changed

This delta inventory is relative to `140a3e...`. Quality appended only this report; ignored integration output is verification evidence.

- `HOMEOWNER_READINESS_LEDGER.md` (M): root-owned historical CI, rejected mobile frames and open qualification checkpoint.
- `apps/web/src/features/homeowners/homeowners.module.css` (M): readiness-only responsive composition.
- `library/requirements/in-work/prd-007-homeowner-reports/reports/2026-10-13-readiness-quality-review.md` (M): this fresh scoped Quality appendix.
- `library/requirements/in-work/prd-007-homeowner-reports/reports/2026-10-13-readiness-security-review.md` (M): separate source and canonical provenance clearance.
- `library/requirements/in-work/prd-007-homeowner-reports/reports/2026-10-13-readiness-ux-review.md` (M): actual rejected detail-frame evidence, scoped source correction and eight-image acceptance.
- `tests/browser/review/homeowner-readiness.spec.ts` (M): meaningful mobile geometry checks alongside existing safeguards.
- `tests/visual/screens/review/homeowners--empty-account--1180--dark.png` (M): whole approved canonical frame.
- `tests/visual/screens/review/homeowners--empty-account--1180--light.png` (M): whole approved canonical frame.
- `tests/visual/screens/review/homeowners--empty-account--1440--dark.png` (M): whole approved canonical frame.
- `tests/visual/screens/review/homeowners--empty-account--1440--light.png` (M): whole approved canonical frame.
- `tests/visual/screens/review/homeowners--empty-account--390--dark.png` (M): whole approved canonical frame.
- `tests/visual/screens/review/homeowners--empty-account--390--light.png` (M): whole approved canonical frame.
- `tests/visual/screens/review/homeowners--empty-account--768--dark.png` (M): whole approved canonical frame.
- `tests/visual/screens/review/homeowners--empty-account--768--light.png` (M): whole approved canonical frame.

## Single loan officer direction: fresh source Quality review

**Plan document:** `library/requirements/in-work/prd-007-homeowner-reports/single-lo-owner-direction-2026-10-13.md`
**Audit date:** 2026-10-13
**Base:** `d0a8bc539470f7edfc13babf10f6d4fd1954120c`
**Head:** `codex/homeowner-readiness`, eight uncommitted source/test files and accepted owner-direction record
**Auditor:** quality-guardian
**Ordering:** The completed Single loan officer Security appendix precedes this review. All nine source/document SHA-256 values independently match its frozen pins.

### Summary

PASS for the bounded single-LO wording and control delta, with no new implementation finding. The account notices, confirmed removal explanation and unavailable-action controls match the owner's direction while preserving internal authentication and account authority. Cleared for a source commit; fresh twelve-frame inspection, canonical acceptance, final CI and release qualification remain OPEN.

### Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ✅ | Every homeowner requirement of the accepted direction is traced below; webinar implementation is outside this assigned delta. |
| Correctness | ✅ | Independent 32 integration and 51 unit tests pass; unchanged removal storage agrees with the revised explanation. |
| Alignment | ✅ | Customer instructions use their account and support, without a separate administrator or role configuration. |
| Gaps | ⚠️ | Fresh rendered captures and final CI are still required; broader retained-audit and automatic retention policy evidence remain open. |
| Detrimental | ✅ | Server diff changes exactly two refusal literals; quotas, connections, schemas, ownership, consent and provider checks remain intact. |

### Critical Issues (must fix)

None in this frozen source delta.

### Warnings (should fix)

Existing HR-PROOF and HR-PR qualification remain OPEN. The browser source now expects the corrected account heading at `tests/browser/review/homeowner-readiness.spec.ts:154,162`, but this reviewer did not execute or approve new browser images. Final CI and fresh twelve-frame review must qualify this source before a ship verdict. The parent-reported successful run `38485526367` belongs to the preceding `d0a8bc5` head and is not current-delta proof.

No new source warning. L-15 remains a broader retention/export/audit qualification: this review checks manual removal wording and source semantics, without inventing an automatic deletion interval or claiming cancellation of already-running provider work.

### Suggestions (consider improving)

None within the assigned delta.

### Plan Item Traceability

| Item | Requirement | Result | Implementation and evidence |
| --- | --- | --- | --- |
| Direction: contacts / L-5 | All connected-account contacts, without per-user ownership or team visibility configuration | ✅ | `builder.tsx:213` accurately describes the connected account. Unchanged `apps/web/src/server/homeowners/highlevel.ts:113-142,154-167` sends the verified connection location, projects every contact and rejects foreign locations. Search is query/page limited, not a claim to fetch every contact at once. Adapter tests independently pass. |
| Direction: balances and management / L-16 | The LO can view their own balances, add and remove reports; no second user or configurable role required | ✅ | `workspace.tsx:436-445,506-562,661-837` uses existing account capabilities and report actions. `runtime.ts:57-78` preserves internal principal authority, with no new reviewer or role-setup step. Independent report-action/readiness integration checks cover retained balance input, permitted cached creation, share access and confirmed removal. Legacy refusal fixtures remain internal security tests. |
| Direction: isolation and provider limits | Preserve authentication, account isolation, connection authorization, provider allowances, consent and revocation | ✅ | Exact server diff at `runtime.ts:77,93` changes only text. Unchanged `runtime.ts:68-106,130-149` binds principal and connected location, then checks paid-provider flags/allowlist. `packages/db/src/homeowner-repository.ts:508-518` deletes with authenticated location and property ID. Independent settings, adapter, service and scheduler tests pass. |
| Direction: product language | Own-account setup/support; no separate workspace administrator or team-role instructions | ✅ | `readiness.ts:34-57`, `builder.tsx:184-187`, `workspace.tsx:594-628,756-757,920-928` provide account recheck/support explanations. A scoped search of non-test homeowner TSX found no administrator, workspace-owner or customer role instructions; ARIA role attributes remain appropriate. |
| Direction: unavailable actions | Preserve denial checks without offering creation when account write access is unavailable | ✅ | New `workspace.tsx:441-443` guard hides the failed-first-lookup create link under existing `canWrite`. `report-actions.integration.test.tsx:249-252` checks that both removal and creation controls are absent when that capability is false. No server privilege was granted. |
| Direction: explicit removal | Explain report history, shares and schedule removal; preserve contact and usage | ✅ | `workspace.tsx:453-476,798-837` keeps confirmation and states the effects. New `report-actions.integration.test.tsx:220-247` verifies the text, disabled unconfirmed submission, no dispatch and confirmed failed-lookup deletion. Unchanged delete schema at `http.ts:79-85` requires literal confirmation. |
| Direction: removal semantics | Report/share objects and future schedule selection end; usage records remain and downloads cannot be recalled | ✅ for source | Scoped property deletion at `homeowner-repository.ts:508-518`, cascade references at `supabase/migrations/20260924010000_homeowner_reports.sql:57,76,101,114,131`, retained usage at `84-90` and scheduler selection at `187-201` support the copy. Existing PostgreSQL isolation/deletion/share tests were inspected, not executed here. Download recall is expressly disclaimed at `workspace.tsx:800`. |
| Direction: export and retention / L-15 | Preserve manual removal; no invented automatic interval or compliance claim | ✅ for delta; broader audit OPEN | No retention job, schema, export implementation or provider call changed. `workspace.tsx:800` distinguishes saved objects from usage and downloaded copies. The direction record's Retention and evidence section correctly leaves broader obligations unresolved. |
| Direction: beyond homeowners | Webinar preparation/review follows the same single-LO model | 🟦 | Outside this eight-file homeowner source assignment. No webinar acceptance is inferred from this report. |
| Evidence requirements | Prove source behavior, keep fresh visual/CI qualification separate | ✅ for source; rendering/CI OPEN | Independent checks and frozen pins below. No source, baseline, database, live contact or provider mutation performed by Quality. |

### Independent verification

- `pnpm exec vitest run --project integration` against readiness, refusal-message and report-action integration files: **3 files, 32 tests passed**. The invocation also named a nonexistent `forms.integration.test.tsx` filter; Vitest discovered only the three listed actual files. No forms-file execution is credited. Ignored evidence: `test-results/single-lo-quality-integration.log`.
- `pnpm exec vitest run --project unit` against adapter, settings-fault, readiness, service and scheduler unit files: **5 files, 51 tests passed**. Ignored evidence: `test-results/single-lo-quality-unit.log`.
- Independent diff inventory, scoped customer-language search and `git diff --check` passed. All eight source/test files and the direction record match the Security SHA-256 pins: builder `2ff6c3f4...`, readiness integration `60e0c5f4...`, readiness `0085fb81...`, refusal integration `9d37b4b8...`, report-action integration `0471747b...`, workspace `58c8b70e...`, runtime `5ba28a71...`, browser spec `5f8a93b6...`, direction `24b335dd...`. Full hashes remain in the preceding Security appendix.
- Inspected the unchanged real PostgreSQL isolation, retained-usage, share and scheduler tests and supporting SQL. No local PostgreSQL, browser server, provider request, live report removal or hosted qualification was executed by this reviewer.

### Files Changed

Inventory is relative to `d0a8bc5`; Quality owns only this appendix. No source or baseline edits were made.

- `apps/web/src/features/homeowners/builder.tsx` (M): own-account setup, connected contacts and allowance text.
- `apps/web/src/features/homeowners/readiness.integration.test.tsx` (M): corrected account explanations, with original authority assertions retained.
- `apps/web/src/features/homeowners/readiness.ts` (M): account recheck/support notices without a separate administrator.
- `apps/web/src/features/homeowners/refusal-messages.integration.test.tsx` (M): exact updated refusal and setup-state text checks.
- `apps/web/src/features/homeowners/report-actions.integration.test.tsx` (M): removal-effect/confirmation assertions and unavailable creation-control check.
- `apps/web/src/features/homeowners/workspace.tsx` (M): account terminology, explicit removal effects and failed-lookup create-link guard.
- `apps/web/src/server/homeowners/runtime.ts` (M): exactly two refusal message literals; existing checks unchanged.
- `library/requirements/in-work/prd-007-homeowner-reports/reports/2026-10-13-readiness-quality-review.md` (M): this fresh Quality appendix.
- `library/requirements/in-work/prd-007-homeowner-reports/reports/2026-10-13-readiness-security-review.md` (M): preceding independent Security clearance and source pins.
- `library/requirements/in-work/prd-007-homeowner-reports/single-lo-owner-direction-2026-10-13.md` (A): root-owned accepted direction and retained-policy limits.
- `tests/browser/review/homeowner-readiness.spec.ts` (M): two expected-heading literals; geometry and browser safeguards unchanged.

## Single-LO final baseline packet: fresh Quality, October 14 UTC

**Plan documents:** `HOMEOWNER_READINESS_LEDGER.md`, HR-ACTIONS, HR-READS, HR-DESTINATION, HR-PROOF, HR-SECURITY, HR-QUALITY and HR-PR; `single-lo-owner-direction-2026-10-13.md`, Required behavior and Retention and evidence.
**Audit date:** 2026-10-14 UTC
**Base/head:** `64954db7061554bed1494aed3068a0c04c17ac4b`, `codex/homeowner-readiness`, with eight uncommitted whole-PNG replacements and review/ledger appendices.
**Auditor:** fresh quality-guardian context
**Ordering:** The final baseline Security appendix at `2026-10-13-readiness-security-review.md:224` precedes this review and clears the exact image packet. No security remediation or implementation change intervened.

### Summary

PASS for the bounded source and canonical baseline packet, with zero new implementation findings. Exactly eight tracked replacements match the current-head canonical artifact copies, all twelve UX-accepted readiness/refusal originals match their pinned hashes, and all nine prior source/direction pins plus the readiness CSS remain unchanged. Cleared for the root's bounded commit; final new-head CI and release/hosted qualification remain OPEN.

### Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | PASS for packet | All eight authorized empty-account variants are present; twelve current detail/refusal frames have independent UX acceptance. |
| Correctness | PASS | Exact image hashes, decoded dimensions, pixel counts and bounds agree with the canonical/UX/Security evidence. |
| Alignment | PASS | Single-LO account wording is visible in the approved originals; no extra baseline, source or authority change is present. |
| Gaps | OPEN final qualification | Prior-head aggregate CI failed on the stale intended baseline. It cannot qualify a future committed head. |
| Detrimental | PASS for packet | Whole original images preserve unrelated header pixels and leave reviewed source, safeguards and configuration untouched. |

### Critical Issues (must fix)

None in this frozen packet. UX-R01 is closed in rendered current-head evidence, as independently recorded by UX at `2026-10-13-readiness-ux-review.md:156-162`; the old rejected mobile images no longer govern this packet.

### Warnings (should fix)

No new implementation warning. HR-PROOF and HR-PR retain their final CI/release qualification limits. The parent-owned ledger now records inspected captures and baseline provenance, but the corrected final committed head must obtain its own aggregate CI result and current-main mergeability check. Licensed valuation, live connected-account operation, monthly/provider delivery, customer acceptance, retention/export/removal qualification and full D9 remain unestablished.

Evidence clarification: the UX appendix's attribution of four readiness cases to a 54.4-second summary is imprecise. `test-results/homeowner-single-lo-ci-failed.log:2448-2453` belongs to the separate real-catalog four-case suite. The actual four homeowner-readiness cases pass at `:2262-2265`, at 1440, 1180, 768 and 390px respectively (17.5s, 17.6s, 17.2s and 17.1s). This correction changes neither the verified readiness pass nor the twelve-frame acceptance. It is communicated to the parent; Quality does not edit the UX-owned report.

### Suggestions (consider improving)

None within this packet.

### Plan Item Traceability

| Item | Requirement | Result | Implementation/evidence and limit |
| --- | --- | --- | --- |
| HR-ACTIONS / HR-DESTINATION | Accurate account/support next action without role administration | PASS | Source pins for `readiness.ts`, `workspace.tsx`, `builder.tsx` and the accepted direction are unchanged. UX individually accepted account wording and one Check report availability action in all eight empty-account originals at `2026-10-13-readiness-ux-review.md:164-187`. |
| HR-READS | Retain saved reports and permitted outputs in refusal/readiness states | PASS for existing reviewed source and rendered states | Four actual readiness cases passed at the current source head. Twelve retained detail/refusal hashes agree with the individually inspected UX originals. Figures are synthetic API fixtures in a seeded authenticated shell; actual provider or live customer behavior is not inferred. |
| PRD-007 responsive item / UX-R01 | Give long mobile copy a readable column and action below | PASS, rendered defect closed | `homeowners.module.css:819-830` remains at the prior reviewed hash. `homeowner-readiness.spec.ts:25-51` still measures copy width, action position and shared starting edge. UX accepts all twelve current frames, including both zero-allowance themes and setup-unavailable at 390. |
| Canonical scope | Replace only the eight approved whole actual PNGs | PASS | Exactly eight tracked PNG changes match root canonical and independently downloaded Security artifact copies and UX-approved hashes. Independent decode confirms dimensions and all changed-pixel bounds below; every pair has zero header drift. |
| HR-PROOF | Trace actual current-head execution and retained evidence | PASS for recorded components; final aggregate OPEN | GitHub independently confirms both canonical jobs succeeded at `64954db`. CI `38491869012` passed Application and release checks; retained log shows successful pgTAP, 22 PostgreSQL files/295 cases, four readiness cases and 130 aggregate browser passes. The browser aggregate has one stale intended empty-account failure, so overall CI is failed. |
| HR-SECURITY / HR-QUALITY | Fresh Security followed by fresh Quality | PASS for frozen packet | Latest Security appendix precedes this Quality review. All eight image hashes, nine source/direction hashes, CSS and the UX report hash independently match its evidence. |
| HR-PR | Final required CI and current-main MERGEABLE status | OPEN | This reviewer performs no commit, push, workflow dispatch, merge or hosted deployment. A source-head canonical success cannot stand in for the new final-head aggregate. |
| Non-goals / retained policies | Preserve internal isolation, provider limits and manual retention semantics | PASS for packet | No source, migration, dependency, workflow, role/permission, quota, consent, provider configuration or retention timer changed. Prior bounded source acceptance remains intact. Broader L-15 evidence remains open. |

### Independent verification and exact pins

Independently queried GitHub: canonical run `38491866451` is SUCCESS in both Synthetic screens and Account screens at `64954db7061554bed1494aed3068a0c04c17ac4b`. Its unexpired artifact `11863506507` is `screen-baselines-review`, digest `sha256:64cd5ab7757ea5bb60533339298fee09e3f54c36db64b4e65b328ee8b6a47116`. This reviewer compared files from the root and Security's independent download; Quality did not claim a third download.

Independently queried CI `38491869012`: same source head, overall FAILURE, Application verification and Release and recovery contract SUCCESS, combined PostgreSQL/browser job FAILURE, Preview smoke SKIPPED. Inspected retained job log: pgTAP success at lines 1664-1777; 22 files and 295 PostgreSQL cases passed at 1932-1933; the four readiness passes at 2262-2265; only the intended stale empty-account comparison failed at 2435-2436, with 130 browser cases passed at 2438. A separate real-catalog suite passed four cases in 54.4 seconds at 2453. No execution is credited to this reviewer.

Independent Node SHA-256 verification matched all eight tracked replacements against both actual canonical copies, all twelve UX-accepted frame files, all nine source/direction pins and the CSS pin. Independent Sharp raw RGBA comparison against the tracked HEAD reproduced each dimension, changed-pixel count, bound and zero header drift. These are decoded verification operations; no image bytes were rewritten or composited. `git diff --check` passed. No broad tests, browser server or production build were repeated for this PNG-only delta.

| Approved tracked filename | Dimensions | SHA-256 | Changed pixels | Bounds (x,y through x,y) |
| --- | --- | --- | ---: | --- |
| homeowners--empty-account--1180--dark.png | 1180x900 | 49e758097b6026fffc8bd98c3dac303e195ddf37ffca4402f32ab4e34290c271 | 12821 | 52,146 through 1126,323 |
| homeowners--empty-account--1180--light.png | 1180x900 | 910271c010532c5e71e28cc569f84c1679fb5012f767754543e8fe1ea2d976dd | 12730 | 52,146 through 1126,323 |
| homeowners--empty-account--1440--dark.png | 1440x900 | 1f245abbae88d41b2a8d717cb1538763257a865a5bcdca18aa8a01bdc640c7a2 | 12821 | 172,146 through 1246,323 |
| homeowners--empty-account--1440--light.png | 1440x900 | e39067ed33ff4d09ca18e7e5f3f716c38bae8a9517d6f4dcc1f0747657306914 | 12730 | 172,146 through 1246,323 |
| homeowners--empty-account--390--dark.png | 390x844 | bf9a3e687bdae837466cd696acfd8a463a01e81e913f2a43127fb41996d7e187 | 26566 | 14,138 through 375,470 |
| homeowners--empty-account--390--light.png | 390x844 | 715b8f404d7e57871d8714623dfdd47ca10aaa094d1442d74adc6743986a8e71 | 26000 | 15,138 through 374,469 |
| homeowners--empty-account--768--dark.png | 768x1024 | f7d16da1d1493b279848c1e18d4e830d4792c8d7d28c920ac47194e5d63a1b6a | 36209 | 30,199 through 737,483 |
| homeowners--empty-account--768--light.png | 768x1024 | 1d3d5234f3af69d34f5dc3f2cc134d982b0182824101c0f582d2ec4c6fb11bff | 35300 | 31,199 through 736,482 |

Nine source/direction full hashes remain in Security's Frozen source pins table and independently verified `test-results/homeowner-final-quality-png-verification.json`. CSS SHA-256 is `3dd2f7b1fee53d4df95ba628fb0c17422fec8eab890f19f560f9fdd73b6d67ff`; browser spec SHA-256 is `5f8a93b69273e098435115192a1410a29bda66e215cb5163e16289fd5eea2f76`. UX report SHA-256 at verification is `590c5071ee0982471c5d1bab0a542df5829c343c3be10cf6b15aec33b0fcc991`. Pixel evidence is retained in `test-results/homeowner-final-quality-rgba-verification.json`.

### Files Changed

The bounded uncommitted packet relative to `64954db` comprises the following. Quality changes only its assigned report; root ownership of the ledger is preserved.

- `HOMEOWNER_READINESS_LEDGER.md` (M): root-owned actual current-head execution and open final qualification checkpoint.
- `library/requirements/in-work/prd-007-homeowner-reports/reports/2026-10-13-readiness-quality-review.md` (M): this fresh Quality appendix.
- `library/requirements/in-work/prd-007-homeowner-reports/reports/2026-10-13-readiness-security-review.md` (M): independent final whole-image integrity clearance.
- `library/requirements/in-work/prd-007-homeowner-reports/reports/2026-10-13-readiness-ux-review.md` (M): twelve current frames and exact eight-original acceptance.
- `tests/visual/screens/review/homeowners--empty-account--1180--dark.png` (M): whole approved current-head canonical original.
- `tests/visual/screens/review/homeowners--empty-account--1180--light.png` (M): whole approved current-head canonical original.
- `tests/visual/screens/review/homeowners--empty-account--1440--dark.png` (M): whole approved current-head canonical original.
- `tests/visual/screens/review/homeowners--empty-account--1440--light.png` (M): whole approved current-head canonical original.
- `tests/visual/screens/review/homeowners--empty-account--390--dark.png` (M): whole approved current-head canonical original.
- `tests/visual/screens/review/homeowners--empty-account--390--light.png` (M): whole approved current-head canonical original.
- `tests/visual/screens/review/homeowners--empty-account--768--dark.png` (M): whole approved current-head canonical original.
- `tests/visual/screens/review/homeowners--empty-account--768--light.png` (M): whole approved current-head canonical original.

### Documentation correction pending at handoff

The parent will hold the bounded commit until the UX owner appends the log-attribution correction identified above. Source/PNG integrity clearance is complete; final documentation-packet release awaits a short fresh hash/diff verification of that appendix. The UX report still has SHA-256 `590c5071ee0982471c5d1bab0a542df5829c343c3be10cf6b15aec33b0fcc991` at this handoff. Quality leaves the UX report untouched and preserves final-head CI and hosted qualification as OPEN.

### Fresh documentation correction verification and packet release

PASS. The UX owner's appended evidence correction is accurate: retained log lines 2262-2265 identify `homeowner-readiness.spec.ts:57:3` passing at 1440/1180/768/390px with individual 17.5/17.6/17.2/17.1-second durations. Lines 2448-2453 identify the separate `real-catalog/first-impression.spec.ts` suite and its four-case 54.4-second summary. The correction preserves historical text and makes no readiness aggregate-time claim.

Independently verified the corrected UX report SHA-256 `66c682425d704204fbe584a5f3c12a31a75430f8f065915811e8c76918fdd815`. Rechecked all nine source/direction pins, the CSS pin, eight tracked PNGs and twelve retained frame hashes: all remain unchanged from this Quality packet. No tests, build, browser, image download, source or baseline edits were performed during this documentation-only follow-up. `git diff --check` passed.

The documentation hold above is resolved. The bounded source/PNG/review packet is cleared for the root's commit with no new finding. CI `38491869012` remains a recorded failed aggregate; required final new-head CI, current-main mergeability and hosted/provider qualification remain OPEN. This release replaces only the earlier pending-documentation condition and does not grant a ship or full-product completion verdict.

## Manual-removal race test Quality review

**Plan:** `prd-007-homeowner-reports-index.md`, acceptance items 5, 7, 8 and 9, plus `single-lo-owner-direction-2026-10-13.md` and the root's bounded race-test assignment.
**Review date:** October 13, 2026, America/Chicago.
**Base:** `2df7fe0cb7fb5611c71ca4f1da7fac8e221236a5` in `codex/homeowner-readiness`.
**Auditor:** independent quality-guardian, after Security's manual-removal race test PASS.

### Summary

PASS for the bounded test and scope-document increment, with no Critical, Warning or Suggestion findings. Independently executed 36 local cases and web typechecking passed; all three frozen handoff pins match Security. The six new actual PostgreSQL cases are compiled and source-inspected, with execution still required in corrected-head CI.

### Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ✅ | The assigned deletion, completion, retry, share, scheduler and pre-delivery races have meaningful assertions. |
| Correctness | ✅ | Deferred boundaries prove the intended ordering; positive start/usage/share assertions prevent vacuous refusal results. |
| Alignment | ✅ | Tests exercise existing manual removal and retained usage requirements; no production, threshold, permission or configuration change. |
| Gaps | ✅ | Authored PostgreSQL execution, later interleavings and external-call limits are stated explicitly. |
| Detrimental | ✅ | Disposable database guard and tenant authority remain intact; synthetic provider seams do not contact external services. |

### Critical Issues (must fix)

None.

### Warnings (should fix)

None.

### Suggestions (consider improving)

None.

### Plan Item Traceability

| ID | Requirement | Status | Evidence | Notes |
| --- | --- | --- | --- | --- |
| REMOVE-RESERVE | Removal before fresh reservation prevents new valuation expenditure and records. | ✅ | `apps/web/src/server/homeowners/repository.postgres.test.ts:255-293` | Two parameterized cases, missing and removed. Assertions require `NOT_FOUND`, zero estimate calls, unchanged usage, no property and zero matching request rows. Authored PostgreSQL proof, not locally executed. |
| REMOVE-COMPLETE | An already-started valuation cannot recreate removed report history. | ✅ | `repository.postgres.test.ts:295-355`; `packages/db/src/homeowner-repository.ts:334-350` | Start and completion are controlled by separate deferred promises. Usage is shown spent before deletion; removal commits before completion. The service refuses persistence, direct late completion refuses and no report/property is recreated. Authored PostgreSQL proof. |
| REMOVE-RETRY | Retained minimal usage prevents retry from repeating a potentially billable call. | ✅ | `repository.postgres.test.ts:329-354`; `homeowner-repository.ts:218-235` | Same request retry is refused, estimate remains called once, and spent usage remains incremented. Existing PRD acceptance item 5 and manual-removal semantics are preserved. |
| REMOVE-SHARE-SCHEDULE | Removal invalidates shares, events, future claims and delivery reservation. | ✅ | `repository.postgres.test.ts:357-400` | Share readability is positively established before deletion. Subsequent share/event/claim/delivery and service attempts refuse; schedule advancement does not recreate a property. Authored PostgreSQL proof. |
| REMOVE-SHARE-RACE | Removal between service read and share transaction prevents link creation. | ✅ | `repository.postgres.test.ts:402-416` | Wrapper returns the previously read report after the real removal commits; the actual bound repository share transaction must refuse. No share or report remains. |
| REMOVE-DELIVERY-RACE | Removal during contact verification before delivery reservation prevents a new handoff. | ✅ | `repository.postgres.test.ts:418-435`; `apps/web/src/server/homeowners/service.ts:154-207` | Contact lookup executes once and commits real removal. Handoff is never called, and no delivery/share remains. This does not claim cancellation after an external handoff has begun. |
| REMOVE-CLAIM | A claimed lease whose property disappeared spends no lookup. | ✅ | `apps/web/src/server/homeowners/scheduler.unit.test.ts:160-170`; `scheduler.ts:166-180` | Exported scheduler handler returns claimed 1, updated 0, paused 1, with no connections, generation, handoff or advancement. Independently executed locally. |
| REMOVE-SCHEDULER-RACE | Fresh scheduler read stops delivery if removal occurs during generation. | ✅ | `scheduler.unit.test.ts:244-271`; `scheduler.ts:108-128` | Deferred generation positively starts, removal is set before resolution, and two actual repository-list calls are required. Generation stays counted as updated while no new handoff occurs. Independently executed locally. |
| SCOPE | Preserve per-report PDF/manual removal without inventing bulk export, whole-account erasure or automatic retention policy. | ✅ | Owner-direction document's Manual removal and export scope reconciliation; PRD acceptance items 5-9 | Scope append records the current requirements and execution limits. It does not close hosted/provider qualification or impose unchosen policies. No PDF implementation changes occurred in this increment. |
| ORDER | Independent Security precedes fresh Quality on exact source/doc bytes. | ✅ | Security's Manual-removal race test appendix; pins below | No unresolved finding or altered test assertion is waived. |
| CI | Run new actual PostgreSQL cases on the new head. | 🟦 | Root-owned PR/CI gate | Still pending. The parent reported the base head's green CI; it cannot qualify these new tests before their current-head execution. |

### Independent verification and limits

`pnpm exec vitest run --project unit apps/web/src/server/homeowners/scheduler.unit.test.ts apps/web/src/server/homeowners/service.unit.test.ts apps/web/src/server/homeowners/handoff.unit.test.ts --reporter=dot` passed all three files and 36 cases. Evidence: ignored `test-results/homeowner-removal-quality/unit-green.log`. Tests use controlled synthetic contacts and providers; no external valuation or handoff occurred.

`pnpm --filter @oalo/web typecheck` passed. The web configuration includes `src/**/*.ts`, so the changed PostgreSQL test is part of the actual compile check. Evidence: `test-results/homeowner-removal-quality-web-typecheck.log`. Scoped oxlint, explicit-path Prettier and `git diff --check` passed. No test/source correction, production build, broad regression or local PostgreSQL execution was performed by Quality.

Read the actual repository reservation, completion, remove, share/delivery and update-only schedule seams, plus service/scheduler ordering and the existing migration's composite cascade relationships. Usage evidence has no property/report cascade and is deliberately retained. Existing cross-account/session authorization tests remain necessary and unchanged. This test-only increment identifies no production bug requiring a source change.

The six new PostgreSQL cases comprise two parameterized cases and four additional cases. They execute real repository transactions only when the existing disposable localhost `oalo_test_` database guard succeeds; their contact and valuation seams remain synthetic. Compilation and source inspection do not establish a database pass. Already-started external calls, sent handoffs and downloaded PDFs cannot be recalled by local removal. These tests cover named pre-reservation/pre-completion boundaries, not every possible later interleaving or legal erasure policy.

### Frozen final pins

Independently recomputed all three after verification; each matches Security.

| File | SHA-256 |
| --- | --- |
| `apps/web/src/server/homeowners/scheduler.unit.test.ts` | `dc21fe73ff2e059f63576d1df249b44b58d70dad04c7253453685afc56a8d60c` |
| `apps/web/src/server/homeowners/repository.postgres.test.ts` | `f2d1756ada0a3de86aafa6f38d8112152ecb282aad8af03360b5896efdac1417` |
| `library/requirements/in-work/prd-007-homeowner-reports/single-lo-owner-direction-2026-10-13.md` | `aaf06a712c8064db4667863fb4f7f9b19970531c53bc5b1d5d7c24251aeafbe2` |

### Files Changed

- `apps/web/src/server/homeowners/repository.postgres.test.ts` (M): six authored real-PostgreSQL removal/reservation/completion/share/delivery cases and synthetic delivery fixtures.
- `apps/web/src/server/homeowners/scheduler.unit.test.ts` (M): two ordered removal/refresh races against the exported handler.
- `library/requirements/in-work/prd-007-homeowner-reports/single-lo-owner-direction-2026-10-13.md` (M, root-owned): reconciled existing PDF/manual removal scope and qualified evidence limits.
- `library/requirements/in-work/prd-007-homeowner-reports/reports/2026-10-13-readiness-security-review.md` (M, Security-owned): preceding independent test-source review.
- `library/requirements/in-work/prd-007-homeowner-reports/reports/2026-10-13-readiness-quality-review.md` (M): this fresh bounded review appendix.

Only this Quality report appendix was authored here. Ownership is released for the root's current-head actual PostgreSQL/CI and repository qualification. No source/test edits, commit, push, hosted configuration, provider activation or deployment occurred. Full-product and hosted recovery claims remain open.
