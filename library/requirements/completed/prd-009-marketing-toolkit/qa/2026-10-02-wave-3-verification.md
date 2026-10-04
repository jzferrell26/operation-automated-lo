# PRD-009 Wave 3 verification (independent pass)

> **Verifier:** `quality-guardian` (sonnet), a fresh agent that built none of this.
> **Tree:** `claude/prd-009-marketing-toolkit` at `e86e1ca6`, Node v24.18.0, pnpm 11.15.1.
> **Date:** 2026-10-02. **Scope:** the criteria the orchestrator listed, plus four orchestrator commits no lane reviewed.
> **Rule followed:** evidence over opinion. Every verdict below names the command, the test, the planted fault, and the result. Nothing was committed, pushed, or written to `EXECUTION_LEDGER.md`. The worktree ends with `git status` empty apart from `qa/2026-10-02-writing-review-pass-2.md`, which another agent is writing.

## 1. Verdict

| | Count |
|---|---|
| Criteria checked | 44 |
| VERIFIED | 43 |
| NOT VERIFIED | 1 (`009D-AC-008`) |
| Orchestrator commits checked | 4 of 4 sound |
| Critical defects | 1 |
| Warnings | 6 |
| Suggestions | 7 |

`009D-AC-008` is NOT VERIFIED because the stored-place check refuses the state of Michigan (section 6, defect D-1).

CI on the final head `e86e1ca6` (run 37013187999, completed) is **red on four non-screenshot failures** in the review browser run that no lane has seen yet (section 4, D-2 to D-4). They do not change a criterion verdict above, because each criterion's own listed test types are green, but they must be fixed before `MKR-002`.

## 2. Method

1. Ran each command of the `verify:offline` chain on its own, in order, through `bash -lc 'cd <worktree> && ...'`. A first attempt ran under Node 22 (the background shell does not switch on `cd`); I killed it and restarted every step under a login shell, so every recorded result below is Node 24.18.0. I also forced `turbo run typecheck --force` and `turbo run build --force` once, because the chain's plain runs were Turborepo cache hits.
2. Read the PRD set and the ledger raid log, then read the code against each criterion's text.
3. Planted 47 single faults (three batteries, `battery.mjs` in the session scratchpad), each restored with `git checkout -- <file>` or by removing the file and any directory I created. Each run printed the worktree state afterwards.
4. Drove the built app in Chromium on spare ports 3500 to 3503 (samples on, samples off, and two experiments), so the heavy ports 3100 and 3210 were used only by the two heavy suites, one at a time.
5. Re-ran the 009D-AC-010 word checks with 136 cases that are not in the repository's table.
6. Read CI once at the end.

## 3. Suite table (each command alone, in chain order)

| Command | Result | Notes |
|---|---|---|
| `pnpm format:check` | pass | |
| `pnpm lint` | pass | |
| `pnpm typecheck` | pass | Also forced with `--force` (16 tasks, 0 cached) plus `tsc -p tsconfig.tooling.json`: pass |
| `pnpm test:unit` | pass | 152 files, 1933 tests, coverage gate met. One earlier run timed out once at `tooling/tests/unit/ads-library/catalog-files.test.ts` ("has not rewritten or dropped a line of origin/main's lock") while two other chains were running on the machine; it passed on the clean run (D-7) |
| `pnpm test:integration` | **pass only with fewer workers** | 49 files, 560 passed, 1 skipped with `vitest run --project integration --maxWorkers=3`. With the default worker count on this shared machine it failed three times (3, 9, 5 tests), a different set each time, always `Test timed out in 5000ms` on the first test of a file; every failing file passes alone in about 6 s (D-7) |
| `pnpm test:contracts` | pass | 13 files, 112 tests |
| `pnpm test:components` | pass | 4 files, 39 tests |
| `pnpm test:visual` | pass | 2 files, 8 tests |
| `pnpm test:e2e:preview` | pass | 1 file, 1 test |
| `pnpm test:browser` | pass | 170 passed, 22 skipped, 6.4 min, port 3100. Screenshot comparisons do not run locally (no `CI`). The 22 skips are the 9 empty-library tests (need a samples-off server) and 13 dashboard-project or flag-gated tests. I ran the 9 against my own samples-off server: 9 of 9 pass |
| `pnpm test:browser:dashboard` | pass | 16 passed, 1.6 min, port 3210 |
| `pnpm jscpd` | pass | 0 clones in 558 files |
| `pnpm audit:boundaries` | pass | 16 packages; the reject fixture still rejects 2 prohibited edges |
| `pnpm audit:product-types` | pass | |
| `pnpm audit:secrets` | pass | |
| `pnpm audit:dependencies` | pass | No known vulnerabilities |
| `pnpm build` | pass | Also forced cold: 16 tasks, 0 cached, 13 s |
| `pnpm audit:sample-ads` | pass | "No sample ad trace in apps/web/.next" after the cold build. Planting a sample id, and separately a sample art file under another name, in a scratch build directory exits 1 each time |
| `pnpm test:db` | **cannot run locally (Docker down)** | CI job "Real PostgreSQL migrations and pgTAP" on `e86e1ca6` is the proof; see section 4 |

No failure other than a screenshot comparison occurs locally except the two timeout flakes under load (D-7).

## 4. CI on `e86e1ca6` (read once, run 37013187999, `Phase 0 CI`, completed)

| Job | Conclusion | Detail |
|---|---|---|
| Release and recovery contract | success | |
| Preview smoke contract | skipped | |
| Application verification | failure | 192 browser tests: 116 passed, 54 failed, 22 skipped. All 54 are screenshot comparisons, as expected until Wave 4. The `&&` chain stops there, so jscpd, the audits and the build did not run in CI; I ran them locally |
| Real PostgreSQL migrations and pgTAP | failure | pgTAP: 15 files PASS. Postgres integration: 4 files, 57 tests pass. Postgres route suites: 18 files, 262 tests pass, including `library-ad-save` (52), `campaign-page-reads` (8), `campaign-approval-handler.approver-name` (6), `use-new-version` (2), `home-reads` (18), `campaign-approval-handler` (17 and 14). Review browser run: 121 tests, 41 passed, 70 failed, 10 did not run. 66 of the 70 are screenshot comparisons. **4 are not** |

The four non-screenshot failures, with causes read from the failure text and the spec source (I did not download the traces):

| ID | Test | Failure | Cause |
|---|---|---|---|
| D-2 | `review/home-first-run.spec.ts:196` at 768 | `card 4 starts below card 3` (received 1255, expected greater than 1551) | See defect D-2. Because that describe block is serial, 6 more Home review tests did not run (390 stack, 008, 007, 009 and 010, 013 in Light and Dark) |
| D-3a | `review/review-campaign-decision.spec.ts:51` | step 3 reads `Needs changes`, spec expects `Checks passed` | See D-3 |
| D-3b | `review/review-campaign-page.spec.ts:31` | `[data-hand-off]` not found on the creator's campaign page | See D-3 |
| D-4 | `review/workspace-pages.spec.ts:133` | `getByRole('button', { name: 'Load latest saved details' })` resolved to 2 elements | See D-4 |

`launch-an-ad.click-count.spec.ts` (009D-AC-022) passed in that run.

## 5. Criteria

"Test" lists the repository tests that go red for the planted fault. "Mutation" ids refer to section 7.

### 009C (the library tab and the build scan)

| Criterion | Verdict | My evidence |
|---|---|---|
| 009C-AC-004 | VERIFIED | `sample-guard.test.ts`, `sample-art-route.test.ts`, `sample-flag-scan.test.ts` pass. M1 (unset counts as local) and M2 (guard ignores `VERCEL_ENV`) red; M3 (sample route accepts any version text) red; N15 (flag read in a non-allowlisted file) red. Build scan: cold `turbo run build --force`, then `pnpm audit:sample-ads` clean; planted id and renamed art bytes each exit 1. Flag named in `README.md:82` and `docs/production-environments.md:71`; `playwright.config.ts:114` and `review-browser-run.mjs:82` set it, `playwright.dashboard-preview.config.ts` sets neither; `review-browser-run.test.ts:37` asserts it. Live: with samples on, `/api/ads-library/samples/sample-first-home/2/tall` is 200 and a traversal id is 404; with samples off both are 404 |
| 009C-AC-005 | VERIFIED | M7 (label removed from `AdCreative`) red in 4 tests across library, step 1 and campaign page; M8 (label removed from the list) red. Browser: `ads-library.spec.ts:129` passes; screenshots show "Sample ad" on every card |
| 009C-AC-008 | VERIFIED | P1 (retired and replaced ads listed) red; P2 (approval command stops refusing retired) red; P3 (art digests no longer compared) red; P4 (`LIBRARY_AD_RETIRED` finding removed) red. CI Postgres: `campaign-approval-handler.postgres` (3 retirement-code assertions) and `library-ad-save.postgres` pass |
| 009C-AC-009 | VERIFIED | M9 (offer ignores a retired newest version) red; `use-new-version.integration` (asks first) and `newer-version.unit` pass; CI `use-new-version.postgres.test.ts` passes |
| 009C-AC-010 | VERIFIED | Browser at 4, 3, 2, 1 cards a row (1440, 1180, 768, 390) and chips scroll at 390: `ads-library.spec.ts:46,65,79` pass; CI review `ads-library.spec.ts` passes. M10 (a search box added) red |
| 009C-AC-011 | VERIFIED | N1 (newest approval no longer first) red in 2 files; browser `ads-library.spec.ts:145` and CI review `:84` pass; screenshot shows the viewer's band, topic, name, headline, "Version N. Reviewed <date>." and "Use this ad" |
| 009C-AC-012 | VERIFIED | The 9 gated browser tests (4 frames, 2 themes, axe, no overflow, plus the 404) pass against my own server started without the flag. Live read: library tab, step 1 and Home all say "No ads in the library yet. New ads are added after they're reviewed, so there's nothing to set up until then." with no chips and no grid. P1 red shows the active filter is pinned |
| 009C-AC-013 | VERIFIED | `ads-library.spec.ts:168` (same origin, catalog alt text) and 8 axe tests (4 frames, 2 themes) pass. M5 (`server-only` removed) red; M6 (a `"use client"` file imports the loader) red in the transitive scan. Source scan and `catalog-loader-server-only.test.ts` pass |

### 009E (campaign page and list)

| Criterion | Verdict | My evidence |
|---|---|---|
| 009E-AC-001 | VERIFIED | `persisted-campaign-screen.integration` header tests (75 tests alone, 6 s) and `campaign-pages.spec.ts:175`. M14 shows the page tests also catch a stray link. The Launch button is disabled with its one sentence beneath, from the same function as step 3 (`campaign-header-actions.tsx`) |
| 009E-AC-002 | VERIFIED | M11 (a `0` for a missing figure) red in 4 tests; `campaign-results-card.integration` passes (three figures, one chip, one sentence, no digit) |
| 009E-AC-003 | VERIFIED | `persisted-campaign-screen.integration` (band, version label, words changed, who it shows to); M7 shows the sample label is held |
| 009E-AC-004 | VERIFIED | M12 (approve route accepts a name field) red (expects 400, got 403); M13 (fallback "You" recorded as a name) red in 2 tests. CI: `approver-name.postgres` (6) passes, all 15 pgTAP files pass, `git diff` shows no file under `supabase/`. `docs/operations/retention-and-deletion.md:40` and `export.md:39` name `campaign.approval_decisions.snapshot.approverDisplayName` |
| 009E-AC-005 | VERIFIED | `campaign-version-pages.integration`, `campaign-workspace-read.test`, CI `campaign-page-reads.postgres` (8) pass; `campaign-pages.spec.ts:296` (non-integer version is not found) passes |
| 009E-AC-006 | VERIFIED | `campaign-page-data.unit`, `persisted-campaign-screen.integration` notices tests, `use-new-version` mounted; M9 shows the offer rule is pinned |
| 009E-AC-007 | VERIFIED | `persisted-campaign-screen.integration` (collapsed region holds only the version reference, the ad id and version, the support reference) |
| 009E-AC-008 | VERIFIED | M14 (a link to `/leads`) red in the source scan and the page test; the page data type has no field to carry a property or CRM figure |
| 009E-AC-009 | VERIFIED | `campaign-pages.spec.ts:47` (table at 1440, 1180, 768, 720; cards at 719 and 390; six columns; no overflow), `:97`, `:134` pass; `campaigns-tabs.integration` and `campaigns-list.integration` pass. Screenshot of the empty list shows the tabs and one primary action |
| 009E-AC-010 | VERIFIED | N7 (retired reads "Retired") red in 2 files; `campaign-list-decisions.integration` passes; "Live" and "Going live" are gone from `CAMPAIGN_STATE_LABELS` (now "With Meta" and "Sending to Meta", `user-language.ts:260-261`) |
| 009E-AC-011 | VERIFIED | `campaigns-list.integration` and `campaign-pages.spec.ts:152` pass; screenshot of the empty state at 1440 shows "No campaigns yet", the sentence and one primary "Launch an ad" |
| 009E-AC-012 | VERIFIED | `persisted-campaign-screen.integration` (earlier-flow page: one line, saved words, no property field, no new-version control), `campaigns-list.integration`; CI `campaign-page-reads.postgres` seeds an earlier version and passes |

Note for 009E: `review/review-campaign-page.spec.ts` (the real-database browser read of this page) is red in CI for a spec reason (D-3). The criteria's own listed tests are green, so I did not hold the verdicts, but that spec proves nothing until it is fixed.

### 009D (re-verification after the fix lane)

| Criterion | Verdict | My evidence |
|---|---|---|
| 009D-AC-008 | **NOT VERIFIED** | The state of Michigan cannot be chosen. See D-1. Reproduced three ways: (1) `libraryAdPlacesProblem({states:["MI"]})` and `({cities:["Lansing, MI"]})` both return `"people"`; (2) `parseAdPlace("MI")` and `("Lansing, MI")` return `undefined`, while `parseAdPlace("Michigan")` returns state `MI`; (3) in the browser on step 2, "Michigan" is accepted by the field and "Save and check" then answers "We couldn't save this version", while Texas, Maine, "Austin, TX" and "Page, AZ" each reach step 3 "Checks passed". A sweep of all 51 codes finds only `MI` failing. N3 (digit check removed) stayed green, which is an equivalent mutant (the city and state-code tests already refuse digits) |
| 009D-AC-010 | VERIFIED (with W-1) | `word-checks.test.ts` 217 cases pass. 136 new cases of mine (section 8): see the table there. Clean sentences still pass (28 of 29 behave as expected; "Ten years of experience helping first-time buyers" is refused, a conservative false positive). Mutations: N4 (look-alike folding removed) red in 7 tests; N6 (spaced letters not joined) red; M21 (SSN removed) red; M22 (ordinals allowed in the disclosure line) red; P4 red. M20 (the first NFKC call removed) stayed green: an equivalent mutant, because the later NFKD and final NFKC steps cover it |
| 009D-AC-016 | VERIFIED | Planted `onClick={() => void fetch("/api/campaigns/launch", ...)}`: M15 red in the scan (attribute list and handler pattern) and the component test. M16, a handler hidden in a spread that builds `fetch` from two string halves, evades the source scan but is caught by the component test that reads React's props (`launch-review.integration.test.tsx`, "is given no event handler"). M17 (the `disabled` attribute dropped) red in 6 tests. Zero network calls on click, Enter and Space with every input true: passes |
| 009D-AC-017 | VERIFIED | M18 (a `launch` directory under `/api/campaigns`) red (`['approve','launch','preflight']` is not `['approve','preflight']`); M19 (`graph.facebook.com` in production source) red. `provider-side-effect-default-off.test.ts` passes. `grep` finds no `multipart` and no `type="file"` under `apps/web/src/app/api` or `features/campaigns` |
| 009D-AC-020 | VERIFIED | `launch-an-ad.spec.ts:289` ("Fix it opens step 2 at the words, and the next save is version 2 of the same campaign") passes; the offline store test and CI `library-ad-save.postgres` (52) pass |
| 009D-AC-022 | VERIFIED | CI review `launch-an-ad.click-count.spec.ts:112` "6 then 5 activations" passes (26.3 s); the creator half (3 and 1, then 2 and 0) passes locally in `launch-an-ad.spec.ts:324` |
| 009D-AC-024 | VERIFIED | N2 (`.strict()` removed from the save schema) red in 16 tests; CI `library-ad-save.postgres` (52) and `campaign-preflight-handler.postgres` (12) pass |

**The theme root fix** (`ThemeRuntimeProvider.tsx`, commit `5bfdb2c1`):
- Light first: with a dark device and nothing stored, 102 samples across `DOMContentLoaded`, `load`, hydration and every animation frame over 4 s saw only `data-theme="light"` and one body background, `rgb(245, 248, 252)`. No flash.
- Toggle: Dark persists across reload; System stores `system`, follows a live device change to light and back to dark; Light persists on a dark device. The repository spec `ui-foundation-ux.spec.ts:151` passes.
- The pin: restoring the pre-fix provider turns `ThemeRuntimeProvider.hydration.test.tsx` red (5 or 6 distinct values handed down where 1 is expected) in all four stored-preference cases.
- What I could not do: reproduce the double-drawn page. With the step 2 loader held 1.5 s, I measured 10 loads under the current provider (0 doubled) and 10 under the pre-fix provider (0 doubled). So the A/B did not reproduce the symptom on this machine, and the fix's claimed cause is unconfirmed by me. The behaviour above is sound either way. `launch-an-ad.spec.ts:175` ("step 2 renders each field once") passes.

### 009F (records)

| Criterion | Verdict | My evidence |
|---|---|---|
| 009F-AC-008 | VERIFIED | N14 (the old "Fix what the checks found, then save it again." restored) red in 5 tests. No payment provider is named in any `apps/web/src` source outside tests (case-insensitive search); `SIGNED_IN_SOURCE` is "Signed in with your email."; every constant left in the not-connected block is imported by something |
| 009F-AC-009 | VERIFIED | M23 (planted "Create your first Open House Boost.") red. Search of `apps/web/src` and `packages/*/src` finds the phrase only in three code comments |
| 009F-AC-011 | VERIFIED | Both sweep-part-1 greps, re-run: only `what-is-automated-lo.md:20` and `open-house-boost-faq.md:18` hit, each a dated PRD-009 note. Every register row S-01 to S-103 has its dated note somewhere outside the PRD folder (S-81 is in `apps/web/public/fonts/README.md` as prose, "superseded on 2026-10-01 by PRD-009a", without the `(S-81` token). Sweep part 2: the full pattern hits 139 files, the lane's 138 plus the ledger; I could not see the per-file disposition list because the lane report is not in the repository |
| 009F-AC-012 | VERIFIED | My comparison of `EXECUTION_LEDGER.md` at `e89058e` and at HEAD, line by line: 361 row lines, 0 rewritten, 0 missing, 0 added outside the PRD-009 section; exactly 46 lines changed, each only by text appended to its last cell (45 ledger rows, with `CRR-082` on two lines); no status cell changed. `GGL-B03`, `CRR-078`, `CRR-082` stay BLOCKED; G1, G4 and G8 rows are untouched. The "Rows superseded by PRD-009" table has all 45 required rows, each with its register row, and each claimed status matches the row's actual status. Each marker names the right register row and fate. (`CRR-078` has its marker on its first line only; `CRR-082` on both. Harmless.) |
| 009F-AC-013 | VERIFIED | `README.md` (lines 3, 5, 21, 22 area: six sections, empty Ads library, "Launch an ad", launch disabled, checklist link), `.cursor/rules/core/the-map.mdc:12`, `project-map.md` v1.17 (S-73, hard boundary 8 to OD-A, next steps), `NEXT_BATCH_LEDGER.md` Branch and Current park all describe the toolkit |
| 009F-AC-014 | VERIFIED | Checklist step 0 carries the no-migration and never-set-the-flag line; steps 10 to 13 are Open and cover (b) the first approved ads with the private-channel rule, the 0-review ruleset fact and `outputFileTracingIncludes` as UNVERIFIED, (c) counsel and lender review, (d) the owner's sign-off, (e) the post-deploy sample check and the `OALO_ENVIRONMENT` record; changelog v1.6 present |
| 009F-AC-015 (in-work half) | VERIFIED | `library/README.md:33` has the PRD-009 row; `backlog/README.md:32` is a lineage row; `in-work/README.md:31`. My relative-link check over 79 files (647 links) finds one broken link, in the ledger (S-5) |

### 009B (Home polish and the writing fixes)

| Criterion | Verdict | My evidence |
|---|---|---|
| 009B-AC-001 | VERIFIED | `overview-review-surface.integration` and `home-first-run.spec.ts:31` pass; the screenshot at 1440 shows greeting, start card, checklist, Running now and the footer in that order, with no metric, "Quick actions" or "Coming later" |
| 009B-AC-002 | VERIFIED | `home-first-run.spec.ts:75` and the start-card integration tests pass; screenshot shows `h1` "Launch an ad", the lead (with "Your name and NMLS number go on it for you"), the question, five topic buttons and one primary "Choose an ad". With the library empty, the live Home shows the 009C-AC-012 sentence in place of the topics |
| 009B-AC-006 | VERIFIED | `overview-screen.integration` (collapse to "You're set up" with a review link; "Needs attention" open) pass |
| 009B-AC-007 | VERIFIED | N9 (links say "Connect" again) red; the accessible names are "See what's needed for HighLevel" and "See what's needed for Meta" with `/settings/connections`, and "Add your brand details" to `/brand` |
| 009B-AC-008 | VERIFIED | N8 (intro reverted) red; N10 (a second not-connected sentence outside the card) red in both the unit and review-surface tests. The live page says it once |
| 009B-AC-009 | VERIFIED | N11 (a "0 ads running" figure) red; the empty state shows the icon, "No ads running", the amended body, and a link "Launch an ad" |

Review-browser halves of 009B-AC-003, 007, 008, 009 and 010 (`review/home-first-run.spec.ts`) are not proven by CI right now: a failing 768 test (D-2) stops the six after it. The synthetic browser versions and the review-surface integration tests pass.

### Module criteria

| Criterion | Verdict | My evidence |
|---|---|---|
| MTK-005 | VERIFIED | `tests/security/provider-side-effect-default-off.test.ts` passes; its diff only adds assertions (Meta marker scan, publication flag, launch-request scan, form-body scan, route directory list). M18 and M19 turn it red |
| MTK-007 | VERIFIED | Scan of every added line in `git diff e89058e...HEAD -U0` (about 48,000 lines, 445 changed text files): 0 lines contain U+2014 or U+2013 (the scanner finds a planted one). Six changed files still hold dashes on lines this PRD did not add (`the-map.mdc` 4, `EXECUTION_LEDGER.md` 6, `NEXT_BATCH_LEDGER.md` 4, `reviewable-preview-smoke.md` 7, `project-map.md` 4, `in-work/README.md` 3), which the global rule says not to rewrite |
| MTK-009 | VERIFIED | M11 and N11 (a figure with no live source on the page or on Home) red; screenshots of Home, library, step 2 and the empty list show only catalog counts, a checklist count read from saved records, and words |
| MTK-010 | VERIFIED | `git diff e89058e...HEAD -- pnpm-lock.yaml` is empty; only the root `package.json` changed (the `audit:sample-ads` script and the `verify:offline` chain); the generator imports `sharp` (`generate-sample-art.mjs:6`); Inter is vendored as `apps/web/public/fonts/InterVariable.woff2` |

## 6. Orchestrator commits

| Commit | Verdict | Evidence |
|---|---|---|
| `b17f6fe` tab strip seed | sound | Final `campaigns-tabs.tsx` is two `Link`s in a labelled `nav` with `aria-current="page"`; `campaigns-tabs.integration` passes; the earlier raw-anchor governed-control failure is gone |
| `5944773` sample-ads scan in `verify:offline` | sound | Last in the chain; clean on the cold build; planted id and renamed art bytes each exit 1; `build-output-scan.test.ts` passes |
| `36a7b65` Home tests to "With Meta" | sound | Home unit and integration tests pass; `CAMPAIGN_STATE_LABELS` carries "With Meta" and "Sending to Meta" |
| `e45a5ac6` boundary audit and empty catch | sound | M25: `import "server-only"` in `packages/domain` (declares no `next`) fails with "imports undeclared dependency server-only"; M26: `import "left-pad"` in the web app fails; M27 (control): `server-only` in the web app passes. `framework-resolved-specifiers.test.ts` passes. The `campaign-route.tsx` catch now returns the fallback title; `audit:product-types` passes |

## 7. Planted faults (47)

Batteries 1 to 3 (`battery1.json`, `battery2.json`, `battery3.json` in the session scratchpad). RED means a repository test caught the fault.

| Ids | Result |
|---|---|
| M1 to M19, M21 to M26, N1, N2, N4, N6 to N15, P1 to P4 | all RED |
| M27, N16 | controls that are meant to stay GREEN (M27 an allowed import, N16 a file that changes nothing), and they do |
| M20, N3, N5 | GREEN. M20 and N3 are equivalent mutants (redundant steps). N5 removes the "closed-up copy" reading of the claim rule and no test notices: see S-6 |

## 8. 009D-AC-010 bypass attempts (136 cases, none in the repository table)

Script: `bypass.mjs` against `packages/domain/dist/library-ad-words.js` (the built domain package).

| Category | Cases | Caught or correct | Missed |
|---|---|---|---|
| look-alikes (full-width, math bold, circled, superscript, Cyrillic, combining marks, variation selector, soft hyphen, tag characters) | 13 | 10 | Coptic "ⲁ" in "rates" (the other 2 misses were my own mis-built cases) |
| fillers (zero-width, Khmer vowel, em space, no-break space, Mongolian separator, invisible times) | 6 | 6 | none |
| spacing and splitting | 10 | 5 | "ra tes", "ra-tes", "r a tes", "rat es", "ap r" |
| claims | 12 | 7 | "under a grand a month", "a few thousand down", "no payments for ninety days", "introductory pricing", "today's pricing" (outside D5's vocabulary) |
| private details | 15 | 11 | "social security no.", "SS#", "last four of your social", "passport no" (outside D5's list) |
| co-brand | 20 | 14 | "Real-tor", and four written-out disguises: "example dot com", "example .com", "alex at example dot com", a phone number in words (a sixth miss, "Mortgage Broker Partner", was my wrong expectation: D5's phrase exception allows it) |
| partner names | 10 | 7 | a brokerage name spaced out or hyphenated ("K e l l e r W i l l i a m s", "Kel-ler Wil-liams"); "Thanks Priya" was refused because it is a saved partner's given name, which D5 requires, so my expectation was wrong |
| license numbers and the NMLS host | 21 | 20 | none missed ("NMLS 12345 67" is refused although D5's wording would allow it; stricter, safe) |
| clean sentences | 29 | 28 | "Ten years of experience helping first-time buyers" is refused (a conservative false positive) |

Totals: 91 expected refusals, 66 refused, 25 passed. Of the 25, 3 were my own wrong cases, 13 sit outside D5's stated vocabulary, and 9 are inside D5's mechanisms (the five split-word cases, "Real-tor", Coptic, and the two partner cases). Of 45 expected passes, 42 passed. That is why 009D-AC-010 stays VERIFIED (every rule exists, every named case and the table pass, the 9 in-scope gaps are not in the criterion's list) with W-1 raised.

## 9. Defects

| ID | Severity | Where | What | Owner |
|---|---|---|---|---|
| D-1 | **Critical** | `packages/domain/src/library-ad-places.ts:80` and `:94-101`; `packages/contracts/src/ad-places.ts:202`, `:225` | The "people or distance" word list contains `mi` (miles). It is matched as a whole word, case-insensitively, so the state code `MI` is refused: Michigan cannot be typed as "MI", every "City, MI" is refused on entry, and "Michigan" is accepted by the field but the saved version cannot pass (`TARGETING_NOT_ALLOWED`, "We couldn't save this version"). D4 lists only zip, radius, mile, miles, within, age, male, female, men, women. The expanded list also refuses real places ("Gay, GA", "Boomer, NC", "Boys Town, NE"). Fix: match the audience words against the place name only, never the state code, and drop `mi`; add Michigan and "Lansing, MI" to the place table, and a test that all 51 codes are accepted | 009d fix lane (typescript-node-guardian) |
| D-2 | Warning | `tests/browser/review/home-first-run.spec.ts:196-216` against `apps/web/src/features/overview/components/overview.module.css:69-72`, `:423` | At 768 the two lists stay in two equal columns (they stack only below 720), so for an approver "Needs your approval" sits beside "Running now", not below it. The mockup (`home-first-run.html:276`, `:411-425`) does the same, but 009B-AC-003 and D1 say the cards stack in order at 768, and the review spec asserts it. The failure is serial, so six more Home review tests did not run. Decide one source of truth: change the CSS to stack below 1100, or amend D1, AC-003 and the spec to the mockup | orchestrator with 009b (Home polish) |
| D-3 | Warning | `tests/browser/review/review-campaign-decision.spec.ts:51-75`, `review-campaign-page.spec.ts:31-58` | The seeded creator never saves a Brand, so its version has no NMLS number (`NMLS_NUMBER_REQUIRED`) and step 3 reads "Needs changes" with no hand-off card; the specs expect "Checks passed" and a hand-off. Inferred from the failure text and `seed-review-location.mjs` (no brand seeded); the click-count spec saves a Brand first (`launch-an-ad.click-count.spec.ts:60-70`). Fix by saving a Brand in each spec's setup | 009d fix lane (decision spec), 009e lane (page spec) |
| D-4 | Warning | `tests/browser/review/workspace-pages.spec.ts:166-168`; `apps/web/src/features/workspace/preference-editors.tsx:75`, `:277` | 009d added a second Brand card (the ad brand), and both cards end with the same "Load latest saved details" button, so `exact: true` now matches two. A spec that did not follow the change (run rule: existing tests follow the change). Scope the locator to the report card | 009d fix lane |
| W-1 | Warning | `packages/domain/src/library-ad-words.ts:215-233`; `library-ad-text.ts:254-284` | The claim rule's "closed-up copy" is limited to digit-anchored signatures and runs of single letters, so a word split into two or more letter groups ("ra tes", "ra-tes", "r a tes", "ap r") passes every rule, as do "Real-tor" and a spaced brokerage partner name. D5 says the claim rule also runs on a copy with all whitespace and punctuation removed; the code's comment explains why that is not done (it would refuse "a pre-approval"). Either join adjacent short fragments before matching, or amend D5 to say what is done. Coptic "ⲁ" is not folded (S-6) | 009d fix lane, `library-guardian` for the D5 wording |
| W-2 | Warning | `apps/web/src/copy/home-messages.ts:52-53` against `launch-messages.ts` `EMPTY_LIBRARY` | On the real first run (the library ships empty, risk R-1) Home says both "nothing to set up until then" (start card) and "You can set up an ad now" (Get set up card). They contradict on the first screen a hosted user sees. Reword the intro for the empty-library case | writing review pass 2 / 009b |
| W-3 | Warning | `EXECUTION_LEDGER.md` raid log | The log has no entry for CI run 37013187999 and D-2 to D-4 above, which are non-screenshot failures | orchestrator |
| S-1 | Suggestion | Home at 390 (my screenshot `home-390.png`) | In "Get set up" the "Not connected yet" chip wraps to three lines in a narrow column beside the action button | Wave 4 design review |
| S-2 | Suggestion | `home-start-card.tsx` | The primary "Choose an ad" comes first in the DOM (009B-AC-003 requires it) but the topic buttons are drawn above it, so keyboard order and reading order differ from the picture (WCAG 2.4.3 risk) | 009b, with a ruling |
| S-3 | Suggestion | `pnpm test:integration`, `catalog-files.test.ts` | Default 5000 ms timeouts are within a second of the first-file import time on a shared machine (3, 9 and 5 failures in three runs; none with `--maxWorkers=3`). Raise `testTimeout` for the integration project, or cap workers in the script | orchestrator |
| S-4 | Suggestion | `apps/web/src/copy/user-language.ts:228`, `:233` | `CAMPAIGN_FIELD_NEEDS_A_LOOK` and `CAMPAIGN_SAVED_NOTICE` have no reader since the open house builder was removed | 009f |
| S-5 | Suggestion | `EXECUTION_LEDGER.md`, row `MKR-026` | Its link `./prd-009f-marketing-toolkit-removals-and-records.md` is relative to the PRD folder and broken from the repository root | orchestrator |
| S-6 | Suggestion | `library-ad-words.ts:167-172`; `library-ad-text.ts:33` | `CLOSED_UP_SIGNATURES` is not exercised by any test (N5 stayed green), and the look-alike table is hand-curated (no Coptic, among others). Add a test per signature, or delete the branch; consider a generated confusables table | 009d fix lane |
| S-7 | Suggestion | `EXECUTION_LEDGER.md` | `CRR-078` carries its S-97 marker on its first line only, and `CRR-082` on both lines. Make the two consistent | orchestrator |

## 10. What I could not verify

- `pnpm test:db` locally (Docker is down); CI is the proof (section 4).
- The Browser (review) halves of 009B-AC-003, 007, 008, 009 and 010, and the real-database page read of 009E, because three review specs are red or did not run in CI (D-2, D-3).
- The root cause of the double-drawn page (section 5, theme fix): not reproduced here.
- 009F-AC-011 sweep part 2 dispositions: the lane report is not in the repository.
- `outputFileTracingIncludes` for real ad art on Vercel: UNVERIFIED in the PRD and still so.

## 11. Housekeeping

Servers I started on 3500 to 3503 are stopped; the final `apps/web/.next` was rebuilt from the clean tree. The session scratchpad is shared with earlier lanes, and two of my scripts (`mutate.mjs`, `linkcheck.mjs`) replaced files of the same name there; nothing in the repository was touched.
