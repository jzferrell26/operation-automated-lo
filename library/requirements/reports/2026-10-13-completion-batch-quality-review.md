# QA Report: October 13 completion batch

**Plan document:** `COMPLETION_LEDGER.md`, current execution batch only

**Audit date:** 2026-10-13

**Base branch:** `origin/main` at `728d5f0`

**Head:** `codex/completion-reconciliation`, uncommitted working-tree snapshot

**Auditor:** quality-guardian

**Security prerequisite:** [Final Security review](2026-10-13-completion-batch-security-review.md), including the final disclosure CSS recheck

**Follow-up snapshot:** Source correction recheck after Security's CI correction addendum, on `38c81cd` plus the assigned uncommitted spacing/assertion delta. The initial snapshot below predates PR #90; the follow-up section records current CI limits without replacing that historical evidence.

## Summary

The scoped local implementation passes Quality with no unresolved Critical, Warning or Suggestion findings: fifteen pending webinar creatives, thirty original raster assets, preparation controls, report discovery and the Next.js dependency remediation match the current batch criteria. The final build and eight browser cases pass after the disclosure contrast correction, with separate independent source and focused-test verification. PR creation and full CI/mergeability remain the next orchestration stage; hosted qualification, baseline comparison, owner visual approval and the broader customer outcomes remain open.

## Scorecard

| Category     | Status | Notes                                                                                                                                                                                                    |
| ------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Completeness | ✅     | All assigned implementation criteria are traced; the subsequent PR stage is explicitly pending and receives no completion credit.                                                                        |
| Correctness  | ✅     | Choose/edit/review/copy/download behavior, per-creative retained words, error recovery, derived asset paths and actual approval refusal match the scoped plan.                                           |
| Alignment    | ✅     | Existing UI components, saved lender Brand, authenticated library boundary and separate approved catalog are preserved. Dependency remediation is explicitly added to the ledger.                        |
| Gaps         | ✅     | Minimum-input explanations, clipboard failure, persistent step announcement, long-word wrapping and multiline preview have source and test evidence.                                                     |
| Detrimental  | ✅     | Existing library, Campaigns and brand-band tests pass; the new preview CSS contrast regression was corrected and rechecked before this verdict. No new provider, persistence or approval surface exists. |

## Critical Issues (must fix)

None unresolved in the reviewed snapshot.

The initial browser matrix exposed a real interaction between the new `.preview p` color rule and the shared white brand band in Dark. Its disclosure contrast measured 2.01. The assigned implementation owner corrected it at `apps/web/src/features/campaigns/components/ad-creative.module.css:150-154`:

```css
.band .disclosure {
  color: var(--ad-band-ink, var(--tx-strong));
}
```

Security reopened and cleared this exact change before the final QA snapshot. The final eight browser cases pass without accessibility-rule exclusions. The failure is attributed to the new preview cascade, not claimed as a proven pre-existing application defect.

## Warnings (should fix)

None unresolved in the reviewed snapshot.

A README table separator identified during QA was corrected by its owner. `library/README.md:27-38` now contains all ten PRD entries in one continuous table. QA made no production or library-reference changes.

## Suggestions (consider improving)

None.

## Plan Item Traceability

The ledger uses a custom table, so items were extracted manually in its exact order. These are source/repository findings, not reinterpretations of older OPEN statuses or existing product acceptance totals.

| #                         | Plan Requirement                                                                                                                                           | Status | Implementation Location                                                                                                                                                                                                           | Notes                                                                                                                                                                                                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REVIEW-INVENTORY          | Reconcile requirements, code, open PRs and release records, including all three priorities and remaining outcomes.                                         | ✅     | `library/knowledge/private/product/completion-review-2026-10-13.md:9-110`; `library/README.md:6-38`; `library/knowledge/private/product/project-map.md:9-19`                                                                      | Independently checked lifecycle folders, local relative links, exact ledger counts, recent main history and GitHub PR/issue state. Stale historical prose is identified rather than treated as current deployed proof.                                                                |
| WEBINAR-PACK-CONTENT      | Exactly fifteen original first-time homebuyer webinar variants with headline, primary text, art and learning correspondence.                               | ✅     | `apps/web/src/features/webinar-ads/creative-briefs.json:1-197`; `catalog.ts:1-4`; `model.ts:4-14,30-61`; `apps/web/src/features/funnels/catalog.ts:56-123`                                                                        | All fifteen briefs read; three each for planning, budget, credit, preapproval and closing. Correspondence verified against existing live/on-demand offer text, not only the self-describing test assertion.                                                                           |
| WEBINAR-PACK-ART          | Two inspectable raster assets per variant, existing dimensions, bounded size, derived paths, digests and no invented identity/approval.                    | ✅     | `apps/web/src/features/webinar-ads/model.ts:22-52`; `model.unit.test.ts:84-108`; `tooling/scripts/ads-library/generate-webinar-art.mjs:7-98`; `apps/web/public/webinar-ads/**/v1/*.png`                                           | Thirty distinct PNG byte digests; regular contained files, 1080x1080 tall panels and 1080x842 square panels, at most 1 MiB each and no metadata. Generic art is distinct from the existing Brand band.                                                                                |
| WEBINAR-PACK-PREPARATION  | Authenticated library exposes choose/edit/inspect/copy/download.                                                                                           | ✅     | `apps/web/src/app/(authenticated)/marketing/campaigns/library/ads-library-screen.tsx:29-54`; existing `page.tsx:31-44`; `apps/web/src/features/webinar-ads/pack.tsx:22-334`                                                       | Existing unsigned-user redirect retained. Local words remain per creative, have 60/300-character controls, restore defaults, survive switching within the page, and report clipboard failure. Downloads are explicitly art only.                                                      |
| WEBINAR-PACK-BOUNDARY     | Pending creatives remain outside approved catalog and cannot create approved ads or enter launch through preparation; existing sample/library guards pass. | ✅     | `apps/web/src/features/webinar-ads/model.ts:30-61,66-81`; `model.unit.test.ts:109-126`; `pack.integration.test.tsx:65-156`; `pack.tsx:234-285`                                                                                    | Strict pending schema rejects approval fields; all entries fail the approved schema, are missing from the production lookup and receive actual application refusal. Tests observe no fetch/save/approval/provider request from preparation. Original catalog/source guards unchanged. |
| WEBINAR-PACK-VERIFICATION | Content, interaction, art, boundary and appropriate repository checks pass.                                                                                | ✅     | `apps/web/src/features/webinar-ads/model.unit.test.ts`; `pack.integration.test.tsx`; modified page tests; `tests/browser/webinar-ads.spec.ts:12-139`; local logs below                                                            | Final post-fix build and 8/8 browser cases pass. Broad six-project run predates the last CSS correction; focused post-fix tests cover that correction and immediate neighbors. Full PR CI is not inferred.                                                                            |
| BATCH-SECURITY            | Post-implementation Security has no unresolved medium-or-higher batch findings.                                                                            | ✅     | `library/requirements/reports/2026-10-13-completion-batch-security-review.md`, including Final disclosure CSS recheck                                                                                                             | Security fixed the inherited Next.js gate through the dependency owner and rechecked final CSS. Zero unresolved Medium+ scoped findings.                                                                                                                                              |
| BATCH-QUALITY             | Quality follows Security, verifies the batch and separates broader outcomes.                                                                               | ✅     | This report; final Security prerequisite above                                                                                                                                                                                    | Fresh independent context, read-only source audit, focused tests and full traceability. Only this report was written by Quality.                                                                                                                                                      |
| BATCH-REVIEW-PR           | Commit/push/open/attach PR, monitor checks, reconcile current main and confirm mergeability.                                                               | 🟦     | `COMPLETION_LEDGER.md:21`                                                                                                                                                                                                         | Subsequent orchestration stage, still OPEN at this snapshot. No commit, push, new PR, CI green or current-batch MERGEABLE claim is made by this audit.                                                                                                                                |
| REPORT-DISCOVERY          | Campaigns links to property, financing and funnels while retaining ads, keyboard access and honest private-output language.                                | ✅     | `apps/web/src/features/campaigns/components/campaign-list.tsx:117-177`; `campaign-list.module.css:29-46`; `campaigns-tabs.tsx`; `apps/web/src/app/(authenticated)/marketing/campaigns/campaigns-list.integration.test.tsx:61-103` | Correct existing routes and native keyboard order tested on empty and populated lists; single ad action preserved. The synthetic Campaigns preview uses another screen and is not claimed as rendered evidence for the changed CampaignList component.                                |
| DEPENDENCY-PATCH          | Smallest verified patched Next.js version, preserved policy, dependency/build/regression checks.                                                           | ✅     | `apps/web/package.json:22`; `pnpm-lock.yaml`; dependency and Security reports                                                                                                                                                     | Next.js 16.3.8; diff limited to Next/env/SWC family, with matching importer and installed version. Existing development-tool advisory acceptance preserved, no new suppression. Final post-fix production build passes.                                                               |
| NG-APPROVAL-LAUNCH        | Preparation does not grant approval, publish/spend, save a campaign or establish a working destination.                                                    | ✅     | `pack.tsx:82-85,234-285`; `model.ts:70-80`; feature `README.md:7-9`                                                                                                                                                               | Explicit user-facing boundary, no new write/approval/provider dependency or launch link.                                                                                                                                                                                              |
| NG-LEGACY-OUTCOMES        | Existing source plans, historical evidence, accepted constraints and other active agents' branches remain intact.                                          | ✅     | `COMPLETION_LEDGER.md:5,25-38`; librarian review `:96-110`; complete working-tree inventory                                                                                                                                       | PR #87 and dependency PRs #88/#89 remain separate. No numbered PRD, migration, homeowner runtime, provider evidence or historical ledger status changed by this batch.                                                                                                                |

### Independent verification

- Final model/art/approval-boundary and accepted-advisory run: **29 tests passed** across two files, after final Security recheck.
- Pack, Ads library page and Campaigns list integration run: **55 tests passed**. Final shared-brand-band, pack and library repeat after the disclosure CSS change: **34 tests passed**.
- `git diff --check`: passed.
- Source-linked librarian totals independently reproduced: PRD-001 305 rows, 267 VERIFIED, 28 deferred, seven external blockers, one G5 blocker and two accepted constraints; PRD-005 88 rows, 74 VERIFIED, eleven BLOCKED and three historical DONE; PRD-006 100 VERIFIED; PRD-008 74 VERIFIED; PRD-009 120 VERIFIED; homeowner rows seven VERIFIED and three BLOCKED.
- Local relative links in the new completion review and library README resolve. Seven in-work, one backlog and two completed PRD folders match the inventory.
- Read-only GitHub checks confirm zero open issues and separate open PRs #87, #88 and #89. #87 is draft, OPEN, MERGEABLE with Application verification FAILURE; that evidence does not qualify domain functionality.
- QA directly inspected final screenshot artifacts for the 1440px Light gallery and 390px Dark review. Screenshots are synthetic local evidence; sample ads and synthetic Alex Morgan branding visible there are not production-approved ads or customer identity.

### Orchestrator and specialist verification, separately attributed

The parent executed these gates; QA inspected the two final log tails and sixteen generated screenshot paths:

| Evidence                                                                                                                           | Result and limit                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test-results/completion-build.log`                                                                                                | Final post-CSS production build: 16/16 tasks successful, Next.js 16.3.8.                                                                                                                                                      |
| `test-results/completion-webinar-browser.log`                                                                                      | Final post-CSS browser run: 8/8 passed at 1440, 1180, 768 and 390px in Light and Dark.                                                                                                                                        |
| `tests/browser/webinar-ads.spec.ts`                                                                                                | Unfiltered axe at gallery/edit/review, asset loading, topic filtering, step focus/announcement, short fields, 60/300-character unbroken input, multiline text, both preview shapes, clipboard and absence of campaign writes. |
| `test-results/browser/webinar-ads-webinar-preparation-at-<width>-in-<theme>-chromium/webinar-{gallery,review}-<width>-<theme>.png` | Sixteen final captures exist; no approved screenshot baseline was updated.                                                                                                                                                    |
| Six Vitest projects                                                                                                                | Parent reports 3,940 passed and one existing skip before the final CSS-only correction. Focused post-fix repeats are identified above instead of calling the broad run post-fix.                                              |
| Formatting, lint, type/boundary/secret/dependency checks and sample-output scan                                                    | Parent and Security report passing appropriate local gates. Dependency signature verification belongs to the separate dependency review.                                                                                      |

### Broader outcomes and qualification remain open

These are deferred customer outcomes in the source ledger, not missing behavior secretly credited to the preparation batch:

| Outcome                             | Audit treatment                                                                                                                                                                           |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Webinar ads ready for actual launch | 🟦 OPEN: exact reviewed branding/disclosures, selected published destination, approval-bound catalog promotion, saved campaign, provider launch/readback and attribution remain required. |
| Listing marketing reports           | 🟦 OPEN: navigation exposes existing private tools; photo-led coordinated reports, flyer, public co-branded site/QR and exact-output approval are not delivered by these links.           |
| Usable homeowner reports            | 🟦 OPEN: licensed live lookup, permitted workspace usage, lifecycle/access policy, actual refresh, sharing and optional delivery qualification remain required.                           |
| Five finished funnel journeys       | 🟦 OPEN: inherited source work is not independently certified as a deployed conversion journey by this batch.                                                                             |
| Customer domains                    | 🟦 OPEN: separate draft PR #87 and real DNS/TLS/routing/submission proof remain required.                                                                                                 |
| HighLevel customer handoff          | 🟦 OPEN: authenticated intended-location records, consent, retries, deduplication and attribution need actual provider evidence.                                                          |
| Release qualification               | 🟦 OPEN: hosted sign-in/walkthrough, migrations/configuration, account recovery, release CI and deployment smoke remain separate.                                                         |

No authenticated hosted access was supplied. Linux screenshot-baseline comparison, full repository CI/PostgreSQL qualification for this PR, complete UX rubric scoring, owner visual approval and hosted asset reads were not performed by Quality. The scoped source pass permits the next draft-PR review stage; it does not declare the branch shippable or the product complete.

### Post-security CI correction recheck

The exact source correction passes this scoped Quality recheck with no unresolved code finding. Security reviewed it first in the CI correction addendum. This result does not accept screenshot baselines or qualify the current PR's full CI.

| Affected criterion                                  | Exact reviewed delta                                                                                                                                 | Result and evidence                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REPORT-DISCOVERY                                    | `apps/web/src/features/campaigns/components/campaign-list.module.css:36-48`: `margin: 0` added to both `.toolTitle` and `.toolDescription`.          | Source correction passes. Removing the browser's heading/paragraph margins lets existing `Stack gap="4"` control spacing without changing typography, tokens, content, routes or action behavior. The prior canonical capture exposed the excess gap; corrected canonical captures still require review before baseline acceptance. |
| WEBINAR-PACK-BOUNDARY and WEBINAR-PACK-VERIFICATION | `tests/browser/ads-library.spec.ts:111-113`: the existing status assertion is scoped to `getByRole("region", { name: "Ads library", exact: true })`. | Assertion correction passes. It targets the existing library filter announcement despite the separate preparation announcement region. The expected refinance text, card count, pressed state, address, no-reload and reload-persistence assertions are retained; no assertion or accessibility rule was removed.                   |
| BATCH-SECURITY and BATCH-QUALITY                    | Security's CI correction addendum, then this fresh Quality recheck.                                                                                  | Order preserved; zero unresolved Medium+ Security findings and no new Quality code finding. Only the QA report was modified by this reviewer.                                                                                                                                                                                       |
| BATCH-REVIEW-PR                                     | Draft PR #90 and initial CI run `38457279026`, as now recorded in the ledger.                                                                        | Remains IN PROGRESS. Initial browser/visual failures are recorded. Canonical Linux capture run `38458217895` and prospective baseline replacements are not accepted by this recheck.                                                                                                                                                |

Independent verification after Security clearance: 30 Campaigns interaction tests passed; 18 CampaignList layout and shared interactive-control tests passed. A read-only exact-delta check confirms both zero-margin declarations, the precise region scope and the unchanged expected status expression. `git diff --check` passed. The implementation owners separately report 30 Campaigns plus 56 design/control tests and one targeted Playwright filter case passing in 38.7 seconds; the browser result is attributed to those owners, not claimed as an independent QA rerun.

The ledger's new Vercel evidence is variable-name metadata only. It records that two names are absent from that inspected inventory, without exposing values or proving deployed flag values, permitted lookup usage or a successful homeowner valuation. Existing hosted/operator limits remain open. The previous build and eight-case preparation matrix remain historical evidence for the preceding source snapshot; this recheck does not relabel them as a full post-margin CI run. Screenshot-baseline changes, corrected canonical rendering acceptance, full CI/mergeability, hosted qualification and owner visual approval still require their own evidence.

## Files Changed

Only the assigned QA report is written by this reviewer. The audited dirty-tree inventory includes tracked modifications and added feature/art files; generated `apps/web/AGENTS.md` and `apps/web/CLAUDE.md` are excluded from the assigned batch and remain untouched.

- `COMPLETION_LEDGER.md` (A): dated batch criteria, ownership, actual evidence and deferred full outcomes.
- `apps/web/package.json` (M): Next.js 16.3.8 dependency patch.
- `apps/web/src/app/(authenticated)/marketing/campaigns/campaigns-list.integration.test.tsx` (M): discovery routes, truthful descriptions, preserved ad/funnel actions and keyboard order.
- `apps/web/src/app/(authenticated)/marketing/campaigns/library/ads-library-page.integration.test.tsx` (M): separate pending pack plus existing library/authentication behavior.
- `apps/web/src/app/(authenticated)/marketing/campaigns/library/ads-library-screen.tsx` (M): scoped approved-catalog introduction and preparation pack insertion.
- `apps/web/src/features/campaigns/components/ad-creative.module.css` (M): shared white-band disclosure ink correction for the new preview cascade.
- `apps/web/src/features/campaigns/components/campaign-list.module.css` (M): responsive tool cards using existing tokens.
- `apps/web/src/features/campaigns/components/campaign-list.tsx` (M): existing property/financing tool discovery.
- `apps/web/src/features/webinar-ads/README.md` (A): authoring, dimensions, determinism and use boundaries.
- `apps/web/src/features/webinar-ads/catalog.json` (A): fifteen pending entries with thirty byte digests.
- `apps/web/src/features/webinar-ads/catalog.ts` (A): strict catalog parsing.
- `apps/web/src/features/webinar-ads/creative-briefs.json` (A): original copy and artwork instructions.
- `apps/web/src/features/webinar-ads/model.ts` (A): pending schema, unique pack, paths and review text.
- `apps/web/src/features/webinar-ads/model.unit.test.ts` (A): content/art/schema/approval and disclosure-cascade tests.
- `apps/web/src/features/webinar-ads/pack.integration.test.tsx` (A): preparation, boundaries, recovery and retained state.
- `apps/web/src/features/webinar-ads/pack.module.css` (A): token-based responsive preparation and preview.
- `apps/web/src/features/webinar-ads/pack.tsx` (A): local selection, editing, preview, review, copy and download UI.
- `library/README.md` (M): current inventory links and reconciled lifecycle descriptions.
- `library/knowledge/private/product/completion-review-2026-10-13.md` (A): source-linked librarian review.
- `library/knowledge/private/product/project-map.md` (M): dated current-source amendment.
- `library/requirements/reports/2026-10-13-completion-batch-dependency-review.md` (A): dependency/security-gate remediation evidence.
- `library/requirements/reports/2026-10-13-completion-batch-quality-review.md` (A): this independent batch report.
- `library/requirements/reports/2026-10-13-completion-batch-security-review.md` (A): scoped post-remediation clearance, including final CSS recheck.
- `library/requirements/reports/2026-10-13-completion-batch-ux-review.md` (A): separate source/art UX review and its attributed evidence.
- `pnpm-lock.yaml` (M): matching Next/env/SWC package family only.
- `tests/browser/ads-library.spec.ts` (M, follow-up): existing filter status assertion scoped to the exact Ads library region, retaining its expected text and surrounding checks.
- `tests/browser/webinar-ads.spec.ts` (A): eight-case local preparation matrix.
- `tooling/scripts/ads-library/generate-webinar-art.mjs` (A): local original-art generator and digest authoring.

Thirty added raster files are enumerated below, rather than treating untracked artwork as outside the diff:

- `apps/web/public/webinar-ads/webinar-before-home-search/v1/square.png` (A): original square art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-before-home-search/v1/tall.png` (A): original tall art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-budget-beyond-price/v1/square.png` (A): original square art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-budget-beyond-price/v1/tall.png` (A): original tall art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-budget-your-life/v1/square.png` (A): original square art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-budget-your-life/v1/tall.png` (A): original tall art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-cash-to-close/v1/square.png` (A): original square art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-cash-to-close/v1/tall.png` (A): original tall art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-closing-checklist/v1/square.png` (A): original square art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-closing-checklist/v1/tall.png` (A): original tall art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-credit-next-step/v1/square.png` (A): original square art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-credit-next-step/v1/tall.png` (A): original tall art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-credit-preparation/v1/square.png` (A): original square art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-credit-preparation/v1/tall.png` (A): original tall art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-credit-questions/v1/square.png` (A): original square art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-credit-questions/v1/tall.png` (A): original tall art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-first-home-plan/v1/square.png` (A): original square art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-first-home-plan/v1/tall.png` (A): original tall art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-offer-to-keys/v1/square.png` (A): original square art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-offer-to-keys/v1/tall.png` (A): original tall art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-paperwork-path/v1/square.png` (A): original square art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-paperwork-path/v1/tall.png` (A): original tall art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-path-to-closing/v1/square.png` (A): original square art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-path-to-closing/v1/tall.png` (A): original tall art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-preapproval-explained/v1/square.png` (A): original square art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-preapproval-explained/v1/tall.png` (A): original tall art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-questions-first/v1/square.png` (A): original square art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-questions-first/v1/tall.png` (A): original tall art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-renting-next-chapter/v1/square.png` (A): original square art panel, verified dimensions/bytes/digest.
- `apps/web/public/webinar-ads/webinar-renting-next-chapter/v1/tall.png` (A): original tall art panel, verified dimensions/bytes/digest.
