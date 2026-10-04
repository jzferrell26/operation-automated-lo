# PRD-009 quality close-out, early pass (MTK-004)

> **Auditor:** `quality-guardian` (paired weapon `quality-weapon`), opus, read-only.
> **Tree:** `claude/prd-009-marketing-toolkit` at `2ec0affe` (local; `0d539dee` is pushed), diff `e89058e...2ec0affe` (`e89058e` is `main`, PRD-008's merge). Node v24.18.0, pnpm 11.15.1.
> **Date:** 2026-10-03. **Order:** this pass follows the security close-out (`qa/2026-10-03-security-review.md`, MTK-003 met at `0d539dee`), so there is no ordering violation. A short delta pass follows on the final head.
> **Plan:** the PRD-009 index and 009a to 009g with their dated amendments (criterion total 120: 109 sub-PRD plus 11 module, confirmed by count), the ledger section "Gauntlet raid: marketing toolkit (PRD-009)" with its raid log, and every report in this folder.
> **Writes:** this file only, uncommitted. Nothing was edited, staged, or committed. The 468 uncommitted pictures under `tests/visual/screens/` (232 modified, 236 untracked: the second redraw) were left as found. Probes ran from the session scratchpad.
> **Not run, as instructed:** `test:browser`, `test:browser:dashboard`, `test:db`. Their evidence is the raid log and CI.
> **The head moved during the audit:** `ffdab456` (round 2 lane H, merged 13:06: Home, Connections, Brand, partners, and homeowners polish from scored review pass 2, 17 files) landed after the runs in section 2. It changes layout, CSS, and tests and moves existing strings (each string it adds already existed at `2ec0affe`); its quick suites are the last row of section 2. The delta pass re-reads it with the rest of round 2.

## 1. Summary

**Verdict: SHIP after fixes** (section 7). The code delivers what the PRD promises. I re-checked 42 of the 120 criteria in code and tests myself, across every sub-PRD and including every hard one the brief named, and ran two independent probes (132 word and place cases against the domain checks, and a cell-by-cell compare of every pre-PRD-009 ledger row). I found no behaviour a criterion promises that the code fails to deliver, no assertion weakened without a recorded ruling, no test that cannot fail beyond two documented cases, and no breach of the scope contract. Every offline suite is green on Node 24.18.0 at `2ec0affe`.

What stops ship today: the Wave 4 and close-out gates are still open (QA-01, QA-02; expected, and the design lanes are working on QA-01), and three records gaps where a VERIFIED row or a routed decision is not true of the head (QA-03 the writing review, QA-04 the sweep's part 2, QA-05 the counsel list).

| Severity | Count | IDs |
|---|---|---|
| Critical | 0 | |
| High | 2 | QA-01, QA-02 (open gates, not defects) |
| Medium | 3 | QA-03, QA-04, QA-05 |
| Low | 5 | QA-06 to QA-10 |
| Info | 9 | QA-I1 to QA-I9 |

## 2. Suites and probes run (each alone, Node 24.18.0, `bash -lc 'cd <worktree> && ...'`)

| Command | Result |
|---|---|
| `pnpm format:check` | Pass |
| `pnpm lint` | Pass (oxlint) |
| `pnpm exec turbo run typecheck --force` then `tsc -p tsconfig.tooling.json` | Pass, 16 of 16 packages, cache bypassed |
| `pnpm test:unit` | 170 files, 2538 tests pass, coverage on (an earlier run under load had one timeout: QA-10) |
| `pnpm test:integration --maxWorkers=3` | 51 files, 696 pass, 1 skipped |
| `pnpm test:contracts` | 13 files, 112 pass |
| `pnpm test:components` | 5 files, 53 pass |
| `pnpm jscpd` | 0 clones in 573 files |
| `pnpm audit:boundaries` | Pass for 16 packages; the fixture rejects 2 prohibited edges |
| `pnpm audit:product-types` | Pass |
| `pnpm audit:secrets` | Pass across 6 source roots |
| `pnpm audit:dependencies` | "1 high (1 ignored)", exit 0: SEC-009-01, accepted by the owner (`pnpm-workspace.yaml:42-51`) |
| Word and place probe (scratchpad) | The domain's `evaluateLibraryAdWords` and the contract's `AdPlacesInputSchema`, bundled from source with the repository's esbuild 0.25.0: 107 word cases (every case the 009D-AC-010 tables name, plus the SEC-009-02 to 10 amendment cases and their passing controls) and 25 place cases (every value 009D-AC-008 names, plus Michigan, White Plains NY and TX, Black Austin TX, Hispanics Austin TX, Nine Mile Falls WA). 132 of 132 as specified |
| Ledger compare (scratchpad) | Every row of `EXECUTION_LEDGER.md` before the PRD-009 section, at `e89058e` and at head, compared cell by cell: 46 cells changed (Evidence 40, Owner 3, Exact operator ask 2, one cell of the malformed CRR-173 row), **0 status cells** |
| `gh pr view 75`, `gh pr checks 75`, `gh run view 37136902461 --log-failed` (read-only) | Draft, `MERGEABLE`, `BLOCKED`; Release and recovery pass; Application verification and Real PostgreSQL fail on the head `0d539dee` (QA-I4) |
| Quick suites again on `ffdab456`, after lane H merged | Format, lint, forced typecheck, jscpd (0 clones) pass; unit 170 files, 2556 pass; integration 51 files, 704 pass, 1 skipped; contracts 112 pass; components 53 pass |

## 3. Scorecard

| Axis | Status | Notes |
|---|---|---|
| Completeness | Attention | 101 rows VERIFIED, 10 DONE, 2 IN PROGRESS, 7 OPEN. Every open row is a Wave 4 or close-out gate (QA-01, QA-02). No criterion is missing from the code. |
| Correctness | Pass | 42 criteria re-checked, 132 probe cases, every offline suite green. One rare UI inconsistency (QA-06). |
| Alignment with the scope contract | Pass | No merge (PR #75 open and draft; the 37 merge commits are lane merges inside the branch). No write to any provider: no migration, no `vercel.json` or `supabase/` change, no deploy step. Lockfile unchanged (MTK-010). Real catalog `[]`, no `apps/web/public/ads-library/`. The flag appears only in the allowlisted files and both local runners. |
| Records | Attention | Lifecycle, register, superseded table, checklist, and README hold. Three records gaps (QA-03, QA-04, QA-05) and open items in hard-to-find places (QA-07, QA-08). |
| Detrimental patterns | Pass | No `.only`, no new skip except a documented manual-only block and a Windows symlink skip that runs on Linux CI; no time bomb (every date a rule compares with today is injected or in 2030 or 2099); lowered thresholds each carry a reason (QA-I8). |

## 4. Findings

### QA-01 (High, open gate). Most pictures do not yet score 3 on every axis

- **Criterion:** 009G-AC-006 ("Every installed picture scores 3 on every axis; any picture below 3 is a defect fixed, with a test, before the baselines are committed"), MTK-011 ("every picture scores 3 in Light and in Dark"), and 009G-AC-011.
- **Evidence:** `qa/2026-10-03-scored-baseline-review.md:899`: after pass 2, 194 of 468 pictures score 3 on every axis (R1 8 of 104, R2 42 of 138, R3 8 of 80, R4 136 of 146), with 1 Medium (R3 P2-06) and about 25 Low remaining. Ledger MKR-114 IN PROGRESS, MKR-011 OPEN. Commit `a2449ae9` (the copy, pencil, and rocket glyphs) and the four round 2 design lanes change rendered output after the second redraw at `0d539dee`, so 009G-AC-011 re-opens 009G-AC-004 and 007 again.
- **Fix:** finish the round 2 lanes, dispatch `screen-baselines.yml` once on the final head and record its run ID (009G-AC-011), re-score every changed picture, and commit only when every installed picture is at 3 on every axis in Light and Dark. If the owner accepts a lower bar, that is a dated amendment to 009G-AC-006 and MTK-011 by `library-guardian`, not a reading of them.

### QA-02 (High, open gate). The remaining ship gates are open

- **Criterion:** 009G-AC-005, 009G-AC-007, MTK-001, MTK-002, MTK-004, and the completed-folder half of 009F-AC-015.
- **Evidence:** the second redraw is uncommitted, so no head carries the "Baseline change:" note, and CI on `0d539dee` (run 37136902461) fails Application verification and Real PostgreSQL. `docs/operations/evidence-packs/design-quality-signoff.md` is unchanged since `e89058e` and still says "Status: SIGNED" for PRD-008's screens. Ledger MKR-001, 002, 004, 006, 011, 113, 115 are OPEN, MKR-108 and 114 IN PROGRESS, and MKR-003, 109 to 112, and 116 to 120 DONE. Two rows lag the code: MKR-006 is OPEN although MTK-006 holds (my compare above: 0 status cells changed), and MKR-003 is DONE although MTK-003 is met at `0d539dee`.
- **Fix:** in the final sequence: commit the pictures with the note, re-sign the sign-off against the final commit (removed screens as history, a row per new state), get the four required checks green and `MERGEABLE`, move the folder to `completed/` repairing the 23 paths in QA-I6, flip MKR-006 to VERIFIED citing this report, MKR-003 after the security delta pass, then the quality delta pass.

### QA-03 (Medium). Strings changed after the closing writing check were not reviewed

- **Criterion:** MTK-008 ("Every new or changed user-visible string ... `technical-writing-craft-guardian` reviews all of them"); ledger MKR-008 is VERIFIED from the closing check at `8b283a5` (report `301f24f7`).
- **Evidence:** after that check, `4658bec1` added `EMPTY_LIBRARY_TITLE = "Nothing to choose from yet"` (`apps/web/src/copy/launch-messages.ts:52`), the empty-state title on the library tab and step 1 (`apps/web/src/features/campaigns/components/ad-library-cards.tsx:152`), so the empty library now says its fact twice, title then 009C-AC-012's sentence. `683b2e12` changed `ACCESS_NO_EFFECT_YET` to "No effect yet.". `e6df56b8` (the N-1 to N-6 lane) added five page titles and four reload sentences ("The saved version could not be confirmed.", "The saved version could not be read. Your edits are still here.", "The latest saved version is loaded.", "Load the latest saved version of this card before making another change."), following the check's own direction but never read back. The source guard passes, so only the review half is missing.
- **Fix:** before ship, a short `technical-writing-craft-guardian` delta check of every user-visible string changed since `301f24f7` (`git diff 301f24f7..<final> -- apps/web/src/copy apps/web/src/features apps/web/src/app packages/domain/src`), including whether the empty-library title should stay; then refresh MKR-008's evidence to the final head.

### QA-04 (Medium). 009F-AC-011's part 2 cannot be checked, and three private documents still describe the open house flow as current

- **Criterion:** 009F-AC-011, sweep part (2): every other hit "is listed with a disposition in the lane report", and "A second pass checks each row against its file". Ledger MKR-104 VERIFIED.
- **Evidence:** the Wave 3 verifier wrote that it "could not see the per-file disposition list because the lane report is not in the repository" (`qa/2026-10-02-wave-3-verification.md:139`, `:228`) and still marked the row VERIFIED. The raid log (2026-10-02, W3 merges 1 and 2) shows the records lane flagged six private documents as stale "for the W3 verifier to rule on"; no ruling is in the repository. At head, with no PRD-009 note: `library/knowledge/private/product/highlevel-marketplace-submission.md:24` ("The listing must describe **only** Open House Boost create, persist, and approve."), `:22`, and `:90` (the screenshots to capture); `library/knowledge/private/commercial/founding-cohort-plan.md:16`, `:50`, `:126`; `library/knowledge/private/integrations/ghl-marketplace-and-scopes.md:215`. The first is the "Marketplace submission packet" the operator checklist's step 4 links (`finish-line-operator-checklist.md:47`), so after the merge an operator following steps 4 and 5 is told to photograph a flow that no longer exists. (The listing copy pack beside it does carry its note, S-80.)
- **Fix:** `library-guardian` adds a dated PRD-009 note in place to each of those lines (new register rows are fine; they are not criteria), rules on the three ux-ui documents the raid log names, and records the part (2) disposition list in this folder or the ledger so the row can be re-verified.

### QA-05 (Medium). The amendments send open word and place lists "to counsel", but the counsel step does not list them

- **Criterion:** 009F-AC-014 part (c), as the 009d amendments use it, and the brief's "open items recorded where a reader will find them".
- **Evidence:** 009d D4's amendments of 2026-10-03 (`prd-009d-marketing-toolkit-launch-an-ad.md:87`, `:89`) say every city must resolve to a gazetteer entry or a Meta location key before any provider launch, and that the open national origin, religion, language, and disability place words (Latinx, Cuban, Haitian, Somali, Hmong, Navajo, Amish, Deaf, Wheelchair, and others) "go to counsel (009F-AC-014 part c) together with the gazetteer requirement". D5's amendments (`:126`, `:132`, `:135`) say "counsel extends the lists (009F-AC-014 part c)" for the claim and co-brand vocabulary. Checklist step 12, the counsel and lender review (`finish-line-operator-checklist.md:56`), lists the operating model, each ad, the Brand texts, the category, and the Meta pages, and none of these lists or the gazetteer requirement. Launch is disabled in PRD-009, so nothing is exposed today; the gap is that the person doing step 12 would not see them, and they bear on fair housing.
- **Fix:** add to step 12 a line naming the word-list residuals (SEC-009-04, 07, 10, 11), the open place words, and the gazetteer requirement, linking `qa/2026-10-03-security-review.md`, with a changelog entry and no status change.

### QA-06 (Low). Step 3 offers "Approve this version" for a replaced ad, which the command then refuses; one approval rule is written four times

- **File:** `apps/web/src/features/campaigns/components/launch-review.tsx:129-137` and `apps/web/src/server/launch-an-ad.ts:186-187`.
- **Evidence:** `launchReviewState` checks only `retiredOn`, which `reviewDataOf` sets only when the ad's highest version is retired. An undecided version on a replaced ad (for example `sample-first-home` version 1) therefore draws "ready" with Approve. The command refuses it (`packages/application/src/campaign-approval-command.ts:113-115`, 409 `LIBRARY_AD_REPLACED`), and the controls keep the decision offered after the refusal (`campaign-approval-controls.integration.test.tsx:210`). For the same version the campaign page withholds the control (`apps/web/src/server/campaign-page-data.ts:260-263`, `approvalBlockedByLibrary`) and Home leaves it out (`apps/web/src/features/overview/model/home-campaigns.ts:80-90`). 009c D4: "A replaced version gets the 'newer version' notice below instead of an approval." The refusal does say what to do (`apps/web/src/features/http/user-messages.ts:121-125`), D8 has no replaced row, and a person reaches this only by reopening step 3 after a newer version of the ad is merged, so it is Low. The raid log already flagged the restated rule as a close-out quality item.
- **Fix:** export one approvability predicate from `packages/application` (the body of `assertLibraryAdApprovable`), use it in the command, Home, the campaign page, and `reviewDataOf`, and on step 3 show the newer-version notice with "Use the new version" in place of Approve when it fails for a replaced ad; add one integration case. No captured state changes.

### QA-07 (Low). Other open items sit where a reader will not look

- **Evidence:** W-20, dates written in UTC (`apps/web/src/features/campaigns/launch-model.ts:194`, `:204`; `campaign-page-model.ts:181`; `campaign-results-card.tsx:37`; `apps/web/src/copy/home-messages.ts:200`), is recorded only inside MKR-008's evidence cell (`EXECUTION_LEDGER.md:961`) and `qa/2026-10-02-writing-review-closing.md:64`; a decision at 8 pm Pacific reads as the next day. The advisory revisit date, 2026-11-03, is only in `pnpm-workspace.yaml:46` and `tooling/tests/unit/dependencies/accepted-advisories.test.ts:19`; no ledger row or checklist step prompts anyone on that day. The PRD-009 index has no "Follow-ups after PRD-009" section, although it relies on PRD-008's (`prd-009-marketing-toolkit-index.md:94-96`). Done well: `outputFileTracingIncludes` is on checklist step 11 with its UNVERIFIED status.
- **Fix:** `library-guardian` adds a "Follow-ups after PRD-009" section to the index listing W-20, the revisit date, QA-06, QA-08, QA-I2, QA-I3, and QA-I7; the revisit date also goes on the operator checklist.

### QA-08 (Low). Screens still tell people to contact support, and the decision is not on the checklist

- **Evidence:** `apps/web/src/features/http/user-messages.ts:137` (`CAMPAIGN_PREFLIGHT_FAILED`, which "Save and check" shows) and `:237` (`UNKNOWN_ERROR_MESSAGE`) say "contact support"; also `apps/web/src/copy/reporting-messages.ts:39`, `:41`, `:45` and `apps/web/src/server/homeowners/runtime.ts:168`, `:182`. The product has no support channel. MKR-008 records W-12 as "PARTIAL not blocking ... a support address is the owner's to give", and the raid log says "about eight older strings still say 'contact support'", but the operator checklist has no step for that owner decision (its D-3 asks only for the Marketplace listing's support email).
- **Fix:** add the decision to the checklist (or to D-3's return), and either point these sentences at the support address once given or reword them as the W-12 Help line was.

### QA-09 (Low). The shipped partner check is wider than D5 says, and D5 does not record it

- **Criterion:** 009d D5, `WORDS_CO_BRAND`: "a saved Realtor partner's name or company of at least 4 characters after normalising".
- **Evidence:** `packages/domain/src/library-ad-words.ts:599-611` and `:664-683` also compare each given or family name of three letters or more as a whole word, and a brokerage name without its corporate ending, with a stop list and the person's own name words excluded (added in `eae0e289`, closing the verifier's bypasses). So a partner "Jane Rivers" refuses "Rivers" alone. It is stricter, which R-4 accepts for blocking clean sentences, but the plan a reviewer or counsel reads does not describe the rule that runs.
- **Fix:** `library-guardian` adds a dated D5 note describing the per-word and brokerage matching (no criterion change), or the code narrows to the written rule.

### QA-10 (Low). Two whole-tree scan tests are sensitive to local load and to untracked files

- **Files:** `tooling/tests/unit/ads-library/sample-flag-scan.test.ts:62-80` and `tooling/tests/unit/removed-addresses/no-links-to-removed-addresses.test.ts:221-235`.
- **Evidence:** on this machine under Node 24.18.0 the flag scan timed out at 120 s twice (12:47 and 12:54) and then passed in 1 s alone and in the full suite; the removed-address scan timed out at the 5 s default twice while other suites ran and takes 443 ms alone. The flag scan walks the working tree rather than the tracked files: 4,633 files, 3,535 of them under `.cursor/skills`, plus anything untracked. CI passes both, and the raid log already notes local timing flakes.
- **Fix:** read the file list from `git ls-files` (which also stops an untracked scratch file from failing or slowing the scan) and give both an explicit timeout.

## 5. Info

- **QA-I1. A plan ambiguity, for `library-guardian`.** 009C-AC-008 says "the launch reason for an approved version on a retired ad is the retired notice (009D-AC-016)", but D7 puts "Meta not connected" first and says the product's Meta input is always not connected, so in the product the launch sentence is always row 1 and the retired sentence is reached only in tests (`apps/web/src/features/campaigns/launch-model.ts:237-242`). The retired state still shows as step 3's "Ad retired" and as the campaign page's notice. The code follows D7; the criterion's clause should say "when Meta is connected".
- **QA-I2. One test block never runs in an automated pass.** `tests/browser/ads-library.spec.ts:207-211` skips unless `OALO_EXPECT_EMPTY_LIBRARY=true`, which only the review run's real-catalog pass sets, and that pass runs only `review/real-catalog/**` (`playwright.config.ts:148-150`). Its file comment says so, and `review/real-catalog/first-impression.spec.ts` covers 009C-AC-012 signed in. Remove the block or name it manual-only in the spec index.
- **QA-I3. A file nothing imports, kept by the plan.** `apps/web/src/features/shell/components/review-not-connected-screen.tsx` has no importer, not even a test; 009f D4 keeps it by name. Amend D4 and delete it.
- **QA-I4. CI on the pushed head.** Run 37136902461 on `0d539dee`: Application verification's unit (2426), integration (696), contracts (112), components (53), and visual (8) pass; its failures, and Real PostgreSQL's, are about 300 screenshot comparison failures (retries included), missing snapshots for new review pictures, and knock-on failures of the serial review chain ("the approved campaign was saved", sign-up `waitForURL` timeouts), the same pattern the raid log records for run 37059680624. Expected until the pictures are committed; MTK-002 needs all four checks green on the final head.
- **QA-I5. The timing record is from the first redraw.** `docs/operations/evidence-packs/guided-setup-timing.md` records 55.9 s from run 37059676544; the final dispatch's figure can join it when the sign-off is re-signed.
- **QA-I6. Paths to repair at the completed move.** 23 hard-coded `in-work/prd-009` paths in 12 files outside the folder (`finish-line-operator-checklist.md` 6, `project-map.md` 5, `README.md` 3, and one each in `library/README.md`, `library/requirements/backlog/README.md`, `library/knowledge/public/README.md`, `what-is-automated-lo.md`, `ux-ui/README.md`, `ux-ui/06-review-rubric.md`, `apps/web/src/app/globals.css` (a comment), `NEXT_BATCH_LEDGER.md`, and `.cursor/rules/core/the-map.mdc`), plus the ledger. The test helper already reads both lifecycle folders (`apps/web/src/theme/token-source.test-support.ts:115`).
- **QA-I7. A stale comment.** `apps/web/src/server/authenticated-workspace-data.ts:113-115` still describes the removed onboarding heading and "every Open House Boost". Comment only.
- **QA-I8. Assertion changes during the run, each with a reason.** The connections sweep floor fell to 350 (`connections-review-surface.integration.test.tsx:121-125`, the drop from 426 to 382 strings attributed to the removed navigation); `top-bar.spec.ts` now tests the app's own connection sentences instead of banning a word that a seeded workspace name carries; `tests/browser/design-quality.spec.ts:616-641` asserts the chip, the "What to fix" region, and its list for "Needs changes", which the design gives no heading; `data-ad-preview` exempts only the ad picture from the type-step check, with a proof that text beside it is still checked. The real catalog's lock is `[]`, so its immutability half is vacuous until the first real ad, by design. None of these is a weakening without a ruling.
- **QA-I9. Running the suites locally.** A shell that does not `cd` into the worktree resolves Node 22.19.0 (fnm switches on `cd` from `.nvmrc`); under it, nine Argon2id unit tests, two derivation-count tests, and two auth-email contract tests fail because `crypto.argon2` is missing. Use `bash -lc 'cd <worktree> && ...'`, as the brief says.

## 6. What was checked and held (the brief's hard criteria)

- **009C-AC-004.** `adsLibrarySamplesEnabled` reads raw values only (`apps/web/src/features/ads-library/server/catalog-loader.ts:60-64`); `sample-guard.test.ts` tries 288 combinations, exactly 2 allowed, and records which variables the guard reads; the sample art route answers 404 in every refused case; the flag appears only in the allowlist, set by `playwright.config.ts:122-123` and `review-browser-run.mjs:98`, and the dashboard preview sets neither; `audit:sample-ads` runs in `verify:offline`.
- **009C-AC-008.** The port is required, asserted at run time, consulted after the role check and before the idempotent retry (`campaign-approval-command.ts:281-327`), with the `@ts-expect-error` line at `tooling/tests/unit/ads-library/library-ad-approval-command.test.ts:107`. Step 3's replaced case is QA-06.
- **009C-AC-013.** No `use client` file imports the loader, a catalog file, the port, or the manifest builder; cards take display fields only (`launch-model.ts:28-42`).
- **009D-AC-010, 008.** The probe in section 2; the stored-place re-check sits in the domain's `TARGETING_NOT_ALLOWED` (`packages/domain/src/campaign-foundation.ts:427-438`).
- **009D-AC-016, 017.** A literal `disabled`, no handler, the `Button` primitive forwards it (`packages/ui/src/components/Button.tsx:52`); `apps/web/src/app/api/campaigns/` holds only `approve` and `preflight`; the default-off test only grows.
- **009D-AC-022.** The click-count spec counts from Home's exact link and asserts 6 and 1, then 5 and 0, with no checkbox or file input, then the 80-character band at four frames.
- **009D-AC-024, 011.** A bounded read (16,000 bytes) and a `.strict()` schema with no Brand field and the 120 and 600 limits (`apps/web/src/server/library-ad-save.ts:50-64`).
- **009E-AC-004, 009, 012.** The name comes from the session only and a posted name is refused; both operations documents name the field; the list column reads "Dates"; earlier-flow campaigns render as their own kind with the topic "Open house".
- **009F-AC-011, 012.** Sweep part 1 returns no line without a PRD-009 note; the superseded table holds all 45 IDs; no status cell changed.
- **009B-AC-003.** The review spec walks the Tab order from the skip link and allows only the verification notice between the bar and "Choose an ad".
- **MTK-005 to MTK-010.** As in the traceability table.

## 7. Verdict

**SHIP after fixes.** Required before ship:

1. QA-01: every installed picture at 3 on every axis in Light and Dark after the round 2 lanes, with a further dispatch recorded (009G-AC-006, 011, MTK-011), or a dated owner amendment of the bar.
2. QA-02: commit the baselines with the note, re-sign the design sign-off, four required checks green and `MERGEABLE`, the completed-folder move with the 23 paths repaired, MKR-003 and MKR-006 brought up to date, then the security and quality delta passes.
3. QA-03: a writing delta check of the strings changed since `301f24f7`.
4. QA-04: dated notes on the three private documents (the marketplace packet first) and the part (2) dispositions in the repository.
5. QA-05: the word-list residuals and the gazetteer requirement on checklist step 12.

Recommended in the same pass, because each is small: QA-06 (one exported approvability rule and step 3's replaced case), QA-07 and QA-08 (a follow-ups section and the support decision on the checklist), QA-09 (a D5 note), QA-10 (`git ls-files` in the two scans).

## 8. Plan item traceability

"Checked" means re-checked in code and tests in this pass; "Gap" means a finding above; "Open" means a gate still open at this head; "Relied" means the ledger's independent verification was taken as recorded and not re-checked here.

| Criterion | Ledger status | This pass | Evidence or note |
|---|---|---|---|
| MTK-001 | OPEN | Open | 19 rows are DONE, IN PROGRESS, or OPEN, so not yet VERIFIED by a second pass (QA-01, QA-02). |
| MTK-002 | OPEN | Open | PR #75 is MERGEABLE but BLOCKED; CI on `0d539dee` (run 37136902461) fails on screenshot comparisons and their knock-on serial failures, as expected before the baselines are committed (QA-02, QA-I4). |
| MTK-003 | DONE | Checked | `qa/2026-10-03-security-review.md`: MET at `0d539dee`; SEC-009-01 accepted (`pnpm-workspace.yaml:42-51`, test-held); `pnpm audit:dependencies` here: 1 high, 1 ignored. Ledger row still DONE; the final delta pass is due on the final head. |
| MTK-004 | OPEN | Open | This report is the early pass; the delta pass on the final head closes it. |
| MTK-005 | VERIFIED | Checked | `tests/security/provider-side-effect-default-off.test.ts` gains 160 lines and loses only a refactored helper; `META_ADAPTER_MODE = "fixture-plan"` (`packages/ghl/src/meta-adapter.ts:13`); `providerPublicationAuthorized: false` (`campaign-workspace-read.ts:127`, `:394`); contracts 112 of 112 pass. |
| MTK-006 | OPEN | Checked | Cell-by-cell compare of every pre-PRD-009 ledger row at `e89058e` and head: 46 cells changed (Evidence 40, Owner 3, Exact operator ask 2, one malformed CRR-173 cell), **0 status cells**. Ledger row still OPEN. |
| MTK-007 | VERIFIED | Checked | 0 added lines since `e89058e` contain U+2013 or U+2014 (pattern proven on a planted pair). |
| MTK-008 | VERIFIED | Gap | QA-03: strings added after the closing writing check (`301f24f7`) were not reviewed. |
| MTK-009 | VERIFIED | Checked | The campaign page always passes `NO_LIVE_RESULTS` (`apps/web/src/server/campaign-page-data.ts:297`), and the results card test asserts no digit (`campaign-results-card.integration.test.tsx:40-50`); Home's "N of 3 done" reads saved records, the chip counts read the catalog, and step 3's counts read the registry and the stored findings. |
| MTK-010 | VERIFIED | Checked | `pnpm-lock.yaml` unchanged since `e89058e`; `package.json` gains only `audit:sample-ads`; `pnpm-workspace.yaml` gains only the owner-accepted `auditConfig` entry. |
| MTK-011 | OPEN | Open | QA-01: 194 of 468 pictures score 3 on every axis after pass 2; the guard half (009C-AC-004, 016) and Light-first (009A-AC-008) hold. |
| 009A-AC-001 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009A-AC-002 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009A-AC-003 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009A-AC-004 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009A-AC-005 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009A-AC-006 | VERIFIED | Checked | Recomputed: `git hash-object` gives `5a8d3e72...` and `9b2ca37b...`; SHA-256 `693b77d4...` and `262481e8...`; sizes 352,240 and 4,380; all equal `apps/web/public/fonts/README.md:39-40`. |
| 009A-AC-007 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009A-AC-008 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009A-AC-009 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009A-AC-010 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009A-AC-011 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009A-AC-012 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009A-AC-013 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009A-AC-014 | VERIFIED | Checked | `MAIN_MENU` (`apps/web/src/features/shell/model/navigation.ts:39-58`) holds exactly the six items in order. |
| 009A-AC-015 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009B-AC-001 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009B-AC-002 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009B-AC-003 | VERIFIED | Checked | `tests/browser/review/home-first-run.spec.ts:144-172` walks Tab order; allows only the verification notice between the bar and "Choose an ad" (a stated reading). |
| 009B-AC-004 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009B-AC-005 | VERIFIED | Checked | No `localStorage`, `sessionStorage`, or `indexedDB` in the Home feature or route (source scan). |
| 009B-AC-006 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009B-AC-007 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009B-AC-008 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009B-AC-009 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009B-AC-010 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009B-AC-011 | VERIFIED | Checked | `apps/web/src/app/api/setup/progress/route.ts` answers 404 to every method with no body; `features/guided-setup/` holds only `model/profile.ts` and its test. |
| 009B-AC-012 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009B-AC-013 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009B-AC-014 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009B-AC-015 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009C-AC-001 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009C-AC-002 | VERIFIED | Checked | Both catalogs carry an append-only lock (`catalog.lock.json`, `sample-catalog.lock.json`) and an `origin/main` comparison (`tooling/tests/unit/ads-library/catalog-files.test.ts:164-185`). The real lock is `[]`, so the real half is vacuous until the first real ad. |
| 009C-AC-003 | VERIFIED | Checked | `catalog.json` is `[]`; the sample catalog holds 10 entries over all five topics, each `sample: true`, named "Sample:", approved by "Sample catalog, not a real approval". |
| 009C-AC-004 | VERIFIED | Checked | Guard reads raw values (`catalog-loader.ts:60-64`); `sample-guard.test.ts` runs 288 combinations with exactly 2 allowed, plus a read-recording proxy; flag scan allowlist; `playwright.config.ts:122-123` and `review-browser-run.mjs:98` set it; the dashboard preview sets neither. |
| 009C-AC-005 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009C-AC-006 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009C-AC-007 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009C-AC-008 | VERIFIED | Checked | Holds for every caller (`campaign-approval-command.ts:100-121`, port required, `@ts-expect-error` at `library-ad-approval-command.test.ts:107`). QA-03 (Low): step 3 still offers Approve for a replaced ad, which the command then refuses. |
| 009C-AC-009 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009C-AC-010 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009C-AC-011 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009C-AC-012 | VERIFIED | Checked | The real-catalog review pass (`review/real-catalog/first-impression.spec.ts`) asserts the sentence once; the synthetic block in `tests/browser/ads-library.spec.ts:207` never runs automatically (QA-I2). The empty state now also has the title "Nothing to choose from yet" (QA-03). |
| 009C-AC-013 | VERIFIED | Checked | No `use client` file imports the loader, a catalog, the port, or the manifest builder; the loader imports `server-only`; cards take `LaunchAdCard` display fields only. |
| 009C-AC-014 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009C-AC-015 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009C-AC-016 | VERIFIED | Checked | The route is `api/ads-library/samples/[adId]/[version]/[shape]/route.ts`, three typed segments, no catch-all. |
| 009D-AC-001 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009D-AC-002 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009D-AC-003 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009D-AC-004 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009D-AC-005 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009D-AC-006 | VERIFIED | Checked | No `dangerouslySetInnerHTML`, `innerHTML`, or `srcDoc` in the campaigns, ads-library, or marketing route sources. |
| 009D-AC-007 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009D-AC-008 | VERIFIED | Checked | Independent probe of the head's contract schema: 25 place cases (every value the criterion names, Michigan, White Plains NY and TX, Black Austin TX, Hispanics Austin TX, Nine Mile Falls WA) behave as specified; "Texas" stores `TX`; the domain's `TARGETING_NOT_ALLOWED` re-checks stored places (`packages/domain/src/campaign-foundation.ts:427-438`). |
| 009D-AC-009 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009D-AC-010 | VERIFIED | Checked | Independent probe: 107 word cases (every case the criterion's tables name, plus the SEC-009-02 to 10 amendment cases and their passing controls) give the specified result on Node 24.18.0, 0 misses. |
| 009D-AC-011 | VERIFIED | Checked | `readBoundedJson(request, 16_000)` (`campaign-preflight-handler.ts:21`, `:83`); `LibraryAdSaveRequestSchema` is `.strict()` with headline 120 and primary text 600 (`library-ad-save.ts:50-64`). |
| 009D-AC-012 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009D-AC-013 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009D-AC-014 | VERIFIED | Checked | `PREFLIGHT_RULESET_REGISTRY` keyed by `ruleset_libraryAd001` (`packages/domain/src/library-ad-ruleset.ts:59-81`); counts read from the registry and stored findings. |
| 009D-AC-015 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009D-AC-016 | VERIFIED | Checked | `launch-on-facebook.tsx` passes a literal `disabled` and no handler or `href`; `Button` forwards `disabled` (`packages/ui/src/components/Button.tsx:52`); `launchSentenceFor` follows D7 with the W-25 wording. |
| 009D-AC-017 | VERIFIED | Checked | `apps/web/src/app/api/campaigns/` holds only `approve` and `preflight`; the default-off test carries the Meta marker scan, the launch-request scan, and the form-body scan. |
| 009D-AC-018 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009D-AC-019 | VERIFIED | Checked | `FIX_TARGETS` is a `Record` over `PreflightRuleCode` (`launch-model.ts:257-283`), so a new code needs a target to compile. |
| 009D-AC-020 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009D-AC-021 | VERIFIED | Checked | `inputVersions` derives the brand reference and uses `partnerprofile_none001`, with comments on the two constants (`library-ad-save.ts:89-98`). |
| 009D-AC-022 | VERIFIED | Checked | `tests/browser/review/launch-an-ad.click-count.spec.ts` counts from Home's exact link: 6 activations and 1 typed field, then 5 and 0, no checkbox or file input; the band check uses an 80-character name. |
| 009D-AC-023 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009D-AC-024 | VERIFIED | Checked | The strict save schema carries no Brand, disclosure, consent, or colour field (`library-ad-save.ts:52-64`). |
| 009E-AC-001 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009E-AC-002 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009E-AC-003 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009E-AC-004 | VERIFIED | Checked | `resolveApproverDisplayName` reads the session only; the approve schema is strict (`campaign-approval-handler.ts:35`); a posted `approverDisplayName` is refused (`approver-name.unit.test.ts:113-121`, `.postgres.test.ts:204`); both operations docs name the field (`retention-and-deletion.md:40`, `export.md:39`). |
| 009E-AC-005 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009E-AC-006 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009E-AC-007 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009E-AC-008 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009E-AC-009 | VERIFIED | Checked | The column reads "Dates" as amended (`campaign-page-messages.ts:41-42`). |
| 009E-AC-010 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009E-AC-011 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009E-AC-012 | VERIFIED | Checked | An earlier-flow page kind (`campaign-page-data.ts:231`) with the topic "Open house" (`campaign-page-messages.ts:66`). |
| 009F-AC-001 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009F-AC-002 | VERIFIED | Checked | `apps/web/next.config.ts` redirects the 11 addresses D1 moves, each a fixed pair, `permanent: false`. |
| 009F-AC-003 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009F-AC-004 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009F-AC-005 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009F-AC-006 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009F-AC-007 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009F-AC-008 | VERIFIED | Relied | Ledger VERIFIED; relied on its independent pass, not re-checked here. |
| 009F-AC-009 | VERIFIED | Checked | The 8 remaining "Open House Boost" hits in `apps/web/src` are comments, test names, or supersession fixtures; none renders. |
| 009F-AC-010 | VERIFIED | Checked | `workspace-screen.tsx:9` carries the exact line. |
| 009F-AC-011 | VERIFIED | Gap | Sweep part 1 re-run: no line lacks a PRD-009 note. QA-04: part 2 dispositions are not in the repository and three private docs still describe the open house flow as current. |
| 009F-AC-012 | VERIFIED | Checked | The superseded-rows table lists all 45 IDs the criterion names; no status cell changed (MTK-006). |
| 009F-AC-013 | VERIFIED | Checked | README `Phase 0 boundary` and `Where it runs`, the terrain map's PRD-009 entry, and `NEXT_BATCH_LEDGER.md` Branch and Current park agree. |
| 009F-AC-014 | VERIFIED | Checked | Checklist step 0 carries the no-migration and never-set-the-flag line; steps 10 to 13 are Open with the private-channel rule, the 0-review ruleset, `outputFileTracingIncludes`, and the eight JavaScript-rendered Meta pages; changelog v1.6. |
| 009F-AC-015 | IN PROGRESS | Open | In-work half holds. 23 hard-coded `in-work/prd-009` paths in 12 files outside the folder need repair in the completed-folder commit (QA-I6). |
| 009G-AC-001 | DONE | Relied | Ledger DONE from the lane's own runs; no independent pass yet, and not re-checked here (QA-02). |
| 009G-AC-002 | DONE | Relied | Ledger DONE from the lane's own runs; no independent pass yet, and not re-checked here (QA-02). |
| 009G-AC-003 | DONE | Relied | Ledger DONE from the lane's own runs; no independent pass yet, and not re-checked here (QA-02). |
| 009G-AC-004 | DONE | Checked | Run 37059676544 recorded (MKR-112). |
| 009G-AC-005 | OPEN | Open | Baselines uncommitted (232 modified, 236 untracked pictures); no head installs them yet. |
| 009G-AC-006 | IN PROGRESS | Open | QA-01. |
| 009G-AC-007 | OPEN | Open | `docs/operations/evidence-packs/design-quality-signoff.md` is unchanged since `e89058e` and still signed for PRD-008. |
| 009G-AC-008 | DONE | Checked | `launch-an-ad.timed.spec.ts:61` keeps 300 s; the timing doc holds the retired table under its dated heading and the PRD-009 table (55.9 s). |
| 009G-AC-009 | DONE | Relied | Ledger DONE from the lane's own runs; no independent pass yet, and not re-checked here (QA-02). |
| 009G-AC-010 | DONE | Relied | Ledger DONE from the lane's own runs; no independent pass yet, and not re-checked here (QA-02). |
| 009G-AC-011 | DONE | Open | The second dispatch (37136898883) is recorded; `a2449ae9` and the round 2 design lanes change rendered output again, so a further dispatch and re-score are due. |
| 009G-AC-012 | DONE | Relied | Ledger DONE from the lane's own runs; no independent pass yet, and not re-checked here (QA-02). |

## 9. Files changed

`git diff --name-status e89058e...2ec0affe`: 787 files (302 added, 259 modified, 225 deleted, 1 renamed); 641 of them outside `tests/visual/screens/`. One line per file would be 787 lines, so the inventory is by area:

| Area | What changed |
|---|---|
| `apps/web` (about 380 files) | The toolkit: the top bar and six-item menu, Home, "Launch an ad", the Ads library tab and the sample art route, the campaign page and list, the gone page, Brand's four fields, the copy files; the removed CRM, Reports, onboarding, guided-setup, and Marketing Suite code; `next.config.ts` gains the 11 redirects |
| `packages/*` (about 40) | `ads-library.ts` and `ad-places.ts` in contracts, the manifest and snapshot unions, the domain's word, text, place, and ruleset modules, the approval command's required catalog port, UI tokens and primitives |
| `tests/*` (about 200) | New review and synthetic specs, the strengthened default-off test, and 144 removed-screen baselines deleted (009F-AC-007) |
| `tooling/*` (about 50) | The catalog lock, sample art generator, and build-output scan; unit tests for the catalog, guard, words, places, and records |
| `library/*`, `docs/*`, root records (about 110) | The PRD set and its QA folder, register notes, ux-ui amendments, the operator checklist, README, both ledgers, the maps, the operations documents |
| Configuration (7) | `package.json` (`audit:sample-ads`), `pnpm-workspace.yaml` (the accepted advisory), both Playwright configs, `vitest.config.ts` (the `server-only` alias), two workflows |

The uncommitted second redraw (468 pictures) is not in this diff.

---

## Delta pass (2026-10-03) at `8178126b`

> **Auditor:** `quality-guardian` (paired weapon `quality-weapon`), opus, read-only.
> **Tree:** `claude/prd-009-marketing-toolkit` at `8178126b` (pushed, the head of PR #75), diff `2ec0affe..8178126b`: 44 commits, 128 files outside `tests/visual/screens/`, no picture committed. Node v24.18.0.
> **Scope:** QA-03 to QA-10; round 2 design lanes G (`c83789fa`), H (`ffdab456`), I (`983d3776`) and J (`b00ef873`) with the orchestrator's `0a40c87a`; the quality code lane (`2405c6ec`, then `93c1a16d`) and records lane (`0c5d6680`, then `823f3539`); the writing delta check (`44b4170d`) and the final pre-redraw lane (`e61bfc2d`..`c7d49f36`); the ledger commit `8178126b`.
> **Security lanes E and F:** both were merged before the early pass (`c97d2d26` and `a173b9bb` are ancestors of `2ec0affe`), so the early pass already covered them: its 132 probe cases include the SEC-009-02 to 11 amendment cases. Since then `packages/domain/src/library-ad-words.ts` changed in one comment (`823f3539`, `:783`). The same probe, rebuilt from the head's source, gives 132 of 132 again.
> **Order:** `security-guardian` ran in this cycle (early pass, then the delta pass at `0d539dee`, MTK-003 met there) and left no Critical, High, or Medium open, so this is not an ordering violation and the audit was not halted. Its last pass does predate lane F's fixes (SEC-009-07 to 12: `library-ad-words.ts` +148 lines, the accepted-advisory test +180 lines, `pnpm-workspace.yaml`) and the QA-06 refactor of the approval rule (`packages/application/src/campaign-approval-command.ts`). MTK-003 asks for a security run on the final tree, so it is gate 1 of QA-02 below; if that run changes code, the files it touches need a quality re-check.
> **Writes:** this section only, appended, uncommitted. The uncommitted second-redraw pictures under `tests/visual/screens/` were left as found. Probes ran from the session scratchpad (`qa-probe-delta/`).
> **Not run, as instructed:** `test:browser`, `test:browser:dashboard`, `test:db`.

### D1. Summary

**Verdict for the code and records: SHIP.** Every fix the early pass asked for has landed. QA-03, QA-04, QA-05, QA-06, QA-08, QA-09 and QA-10 are closed; QA-07 is closed in part. The approval rule is one exported function, and I found no screen that offers Approve (or Send back, or the hand-off) where the command would refuse. The eight writing findings were applied in the reviewer's own words. No assertion was weakened without a recorded reason, and the one disclosed loosening is sound (QA-I10). Three new Lows (QA-11 to QA-13) are worth doing in the final pass and block nothing. The branch is not yet shippable: the gates in D6 remain.

| Severity | Open after this pass | IDs |
|---|---|---|
| Critical | 0 | |
| High | 2 | QA-01, QA-02 (open gates, carried) |
| Medium | 0 | QA-03, QA-04, QA-05 closed |
| Low | 4 | QA-07 (in part), QA-11, QA-12, QA-13 |
| Info | 3 new | QA-I10 to QA-I12; carried items in D5 |

### D2. Suites and probes run (each alone, Node 24.18.0, `bash -lc 'cd <worktree> && ...'`)

| Command | Result |
|---|---|
| `pnpm format:check` | Pass |
| `pnpm lint` | Pass (oxlint) |
| `pnpm exec turbo run typecheck --force` then `tsc -p tsconfig.tooling.json` | Pass, 16 of 16 packages, 0 cached |
| `pnpm test:unit` | First run: 1 of 2612 failed under load, `word-checks.test.ts:246` measured 4,104 ms against its 1,500 ms budget (QA-13); that file alone passes 388 of 388. Second run: 173 files, 2612 of 2612 pass, coverage on |
| `pnpm test:integration` | First run: 1 failed, `campaigns-list.integration.test.tsx:51` hit the 5 s default at 5,286 ms (QA-13); that file alone passes 25 of 25. Second run: 52 files, 773 pass, 1 skipped |
| `pnpm test:contracts` | 13 files, 112 pass |
| `pnpm test:components` | 5 files, 69 pass |
| `pnpm jscpd` | 0 clones in 583 files |
| `pnpm audit:boundaries`, `audit:product-types`, `audit:secrets` | Pass |
| `pnpm audit:dependencies` | "1 high (1 ignored)", exit 0 (SEC-009-01, accepted) |
| Word and place probe (scratchpad) | Rebuilt from the head's `library-ad-words.ts`, `library-ad-places.ts` and `contracts/src/ad-places.ts` with the repository's esbuild 0.25.0: 132 of 132 as specified; "Texas" stores `TX` |
| Sweep part 2, 009F-AC-011 | The criterion's `git grep` returns the same 143 files at `983d3776` and at `8178126b`. Appendix A lists exactly those 143 (a set compare, no file missing or extra), and its dispositions sum to 34 register row, 16 kept, 50 history, 11 fixed, 32 false positive, as it states |
| Sweep part 1, 009F-AC-011 | 2 lines, `what-is-automated-lo.md:20` and `open-house-boost-faq.md:18`, each a dated PRD-009 note |
| Dash scan, MTK-007 | 0 U+2013 or U+2014 in lines added since `2ec0affe` (pattern proven on a planted dash) |
| Scope contract | No change since `2ec0affe` to `pnpm-lock.yaml`, any `package.json`, `pnpm-workspace.yaml`, `supabase/`, `vercel.json`, `apps/web/next.config.ts`, `.github/`, `tests/security/`, `packages/contracts`, `packages/ghl`, `packages/db`, or `apps/web/src/app/api/`; no new `.only` or `.skip`; no new mention of `OALO_ADS_LIBRARY_SAMPLES` |
| Ledger, MTK-006 | Since `2ec0affe` only MKR-004 (OPEN to IN PROGRESS), the evidence of MKR-008 and MKR-104, and two raid-log lines changed; no pre-PRD-009 row changed. Statuses: 101 VERIFIED, 10 DONE, 3 IN PROGRESS, 6 OPEN |
| `gh` (read-only) | PR #75: draft, `MERGEABLE`, `BLOCKED`, 0 commits behind `main` (`e89058e`). On `8178126b`: Release and recovery pass; Application verification and Real PostgreSQL in progress; Preview smoke contract not yet started (it needs them). Screen-baselines run 37149916536 on `8178126b` in progress |

### D3. The early findings, re-checked

- **QA-01, QA-02: open gates.** What each still needs is in D6.
- **QA-03: closed.** `qa/2026-10-03-writing-review-delta.md` read every user-visible string changed in `301f24f7..823f3539`: 0 BLOCKING, 8 ADVISORY. Each fix uses the reviewer's proposed words verbatim: D-1 `EMPTY_LIBRARY_TITLE` "No ads in the library yet" and `EMPTY_LIBRARY_REASON` (`apps/web/src/copy/launch-messages.ts:54-57`), drawn at `ad-library-cards.tsx:152-156`, with `EMPTY_LIBRARY` kept whole for Home and the list; D-2 `ACCESS_GROUP_NOT_CONNECTED_STATE_LABELS` (`user-language.ts:102-107`) carried as `stateLabel` by the hosted projection (`authenticated-workspace-data.ts:360`) and drawn at `permission-screen.tsx:84`, with the demo unchanged; D-3 `lead` and `askWhenCannot` on `UseNewVersion` (`use-new-version.tsx:65-71`, `:122-127`) passed by step 3 (`launch-review.tsx:466-471`); D-4 the `art-changed` and `replaced` notices (`campaign-page-data.ts:179-188`, `campaign-library-notices.tsx:52-57`, `:68-83`); D-5 "Ad picture changed" and `AD_RETIRED_UNDATED_NOTICE` (`launch-messages.ts:251-257`); D-6 three titles (`page-titles.ts:53-55`, set in the three Homeowner reports `page.tsx` files); D-7 the no-match line (`preference-editors.tsx:286-292`); D-8 `labelForStatus` (`status-tone.ts:22-33`). Dated notes (`15aab749`) on 009C-AC-012, 009b D1, 009D-AC-002, 009E-AC-006 and 009d D8; MKR-008's evidence names the delta check. Because every applied string is the reviewer's own, no further review is due; the only rendered words the reviewer did not write are `labelForStatus`'s fallback for a data word that does not exist today.
- **QA-04: closed.** Dated notes at every line the early pass cited: `highlevel-marketplace-submission.md:22`, `:24`, `:90` (S-104), `founding-cohort-plan.md:16`, `:50`, `:126` (S-105), `ghl-marketplace-and-scopes.md:215` (S-106); the three ux-ui files ruled and noted (S-107), and `workspace-page-completion.md` completed (S-108). Appendix A of 009f holds the part (2) dispositions and matches the sweep exactly (D2). MKR-104 says so.
- **QA-05: closed.** Checklist step 12 names SEC-009-04, 07 (with its NEEDS HUMAN REVIEW tag), 10 and 11, the open place words, and the gazetteer requirement (SEC-009-05), links the security review and the 009d amendments, adds a Return line, and records changelog v1.7; no status cell changed.
- **QA-06: closed.** `libraryAdRefusalFor` and `recordedLibraryAdOf` are exported beside the command (`packages/application/src/campaign-approval-command.ts:107-143`, `index.ts:118-119`). Callers: the command, after its role check and before the idempotent retry (`:149-160`, `:364`); step 3 (`apps/web/src/server/launch-an-ad.ts:192`, mapped by the exhaustive `AD_REFUSAL_STATES`, `launch-model.ts:228-234`); Home (`home-campaigns.ts:72-77`, `home-reads.ts:227-230`); and the campaign page (`campaign-page-data.ts:62`, `:272-276`, `:331-334`). All four read the same loader (`approval-catalog-port.ts:12-20` wraps `loadAdsLibrary`). Adversarial search: `CampaignApprovalControls` renders in two places only, step 3 (`launch-review.tsx:532`, reached only after the refusal branch at `:454-488` returns) and the campaign page (`persisted-campaign-screen.tsx:175-177`, only when `approvalControls` is set, which `approvalBlockedByLibrary` withholds); `CampaignHandOff` renders inside those controls and in step 3's cannot-approve card (`launch-review.tsx:499`, after the refusal branch); no other file under `apps/web/src` draws an approve control (the reporting, overview, and app-route sources have none). The command refuses every decision for a refused ad, not only Approve, and both screens withhold Send back with Approve. Step 3's missing-ad card cannot be reached, because `loadLaunchPage` drops to step 1 when the ad is not found (`launch-an-ad.ts:313-325`). Tests, each failing on the old code: the rule and the command agree on seven standings (`tooling/tests/unit/ads-library/library-ad-approval-command.test.ts:209-249`), step 3 per reason (`launch-review.integration.test.tsx:478`, the QA-06 block), its data (`launch-an-ad.unit.test.ts:53`), the campaign page (`campaign-page-data.unit.test.ts:254`, `:270-373`), and Home (`home-campaigns.unit.test.ts:216-245`). Two residuals, neither of which offers Approve: QA-11 and QA-12.
- **QA-07: closed in part (Low).** The index has "Follow-ups after PRD-009" (`prd-009-marketing-toolkit-index.md:278-288`) with W-20, W-12, `outputFileTracingIncludes`, the advisory revisit, the Meta items and the security Lows, and checklist D-9 carries the revisit date. Still missing: QA-I2, QA-I3 and QA-I7, which the fix named, and the bullet "The approval rule is written in four places" (`:287`) still describes QA-06 as work to come although `2405c6ec` and `93c1a16d` did it. **Fix:** `library-guardian` adds the three Info items and rewrites that bullet as done (or removes it), with no criterion change.
- **QA-08: closed.** Checklist decision D-8 names the screens that still say "contact support" (`user-messages.ts:137`, `:237`, `server/homeowners/runtime.ts:168`, `:182`, and the three unrendered `reporting-messages.ts` sentences) and asks for one address.
- **QA-09: closed.** The 009d D5 note (`d5c68822`) describes the shipped matching; I checked it against `library-ad-words.ts:599-704`: the corporate-ending list, the 33-word stop list (counted), the 3-letter word rule, the 4-character whole-name rule, and the person's own words excluded. The function comment now says three characters (`:783`).
- **QA-10: closed.** The removed-address scan has an explicit 20 s limit with its reason (`no-links-to-removed-addresses.test.ts:221-225`, `:240`); the flag scan keeps 120 s with its reason (`sample-flag-scan.test.ts:62-67`, `:90`). The `git ls-files` half was declined in the commit ("Neither scan reads fewer files"); I accept that, because CI checks out a clean tree, so only a local untracked file can trip the flag scan. Other load-sensitive tests are QA-13.

### D4. New findings

#### QA-11 (Low). The campaign page's chip and the Campaigns list say "Ready for approval" for a version the page says can't be approved

- **Files:** `apps/web/src/server/campaign-page-data.ts:211-214` and `:384-388`; `packages/application/src/campaign-workspace-read.ts:249-260`; `apps/web/src/features/campaigns/components/persisted-campaign-screen.tsx:69-77`.
- **Evidence:** `deriveCampaignStanding` knows one library reason, `adRetired`. For an undecided latest version whose ad was replaced, whose picture changed, or that is missing from the catalog, the standing stays `awaiting_approval`, so the page's header chip and the list's Status cell say "Ready for approval" while, since D-4, the same page says "...so this version can't be approved." and offers no Approve. 009d D8's new rows (`prd-009d-marketing-toolkit-launch-an-ad.md:177-179`, dated 2026-10-03) record "The version's own chip" for the list, but say nothing about the campaign page's chip, and for "Ad not in the library" the campaign page column reads "Same", which beside the "Ad retired" row (whose "Same" includes the chip) reads as the chip "Ad not in the library". Reachable only once a real ad gets a newer version or new art; the shipped catalog is empty, and an entry cannot leave the append-only catalog, so "missing" is practically unreachable outside the local sample flag.
- **Fix:** a ruling from `library-guardian` (plan ambiguity, Notes column below). Either extend `deriveCampaignStanding` with the refusal reason, as it already takes retirement, so the chip says the step 3 chip ("Newer ad version", "Ad picture changed", "Ad not in the library") on the page and the list; or add a dated D8 note that the version's own chip stays on both and say why.

#### QA-12 (Low). A viewer who cannot save a version is treated differently on step 3 and on the campaign page

- **Files:** `apps/web/src/features/campaigns/components/campaign-library-notices.tsx:98`; `apps/web/src/features/ads-library/components/use-new-version.tsx:68`, `:123`; `apps/web/src/features/campaigns/components/launch-review.tsx:474-488`.
- **Evidence:** (a) On the campaign page, an undecided version whose ad has a newer version on offer draws `<UseNewVersion canUse={notice.canUse} offer={notice.offer} />` with neither `lead` nor `askWhenCannot`, so an approver who cannot save a version, arriving from the hand-off link, sees the Approval card, no Approve, and "A newer version of this ad is in the library." with nothing to press, no reason, and nobody named. That is the gap D-3 closed on step 3 and D-4 closed on this page for the other two reasons. 009d D8's note records this column as it is, so it is a records change too. (b) The reverse on step 3: the retired, replaced-without-offer, and changed-picture cards always draw "Choose another ad" or "Make a new version" (`:474-488`), whatever `canMakeNewVersion` says, while the campaign page shows those links only to a viewer who can edit (`campaign-page-data.ts:158-160`, `:182-184`), and step 3's own replaced card asks such a viewer to ask someone. A viewer who cannot save a version reaches step 3 only by its address, so this is rare.
- **Fix:** pass `askWhenCannot={USE_NEW_VERSION_ASK}` on the campaign page (its default lead, 009C-AC-009's notice, can stay), and on step 3 draw the card's link only when `canMakeNewVersion`, with `USE_NEW_VERSION_ASK` or a sibling sentence otherwise; one integration case each, and a dated D8 note from `library-guardian`.

#### QA-13 (Low). Two more tests fail under local load

- **Files:** `tooling/tests/unit/library-ad-checks/word-checks.test.ts:246-256` and `apps/web/src/app/(authenticated)/marketing/campaigns/campaigns-list.integration.test.tsx:51`.
- **Evidence:** in my first full runs the SEC-009-02 linear-time test measured 4,104 ms against `toBeLessThan(1500)` (the file alone runs in 1.9 s), and the list's first render test took 5,286 ms against the 5 s default (the file alone passes). Both passed on the second run. The wall-clock bound is the weaker kind of test for what it guards: catastrophic backtracking costs orders of magnitude, not 3x, so a bound that load can cross makes noise without adding protection. CI has not shown either failing.
- **Fix:** in the word check, compare the time at a run length n and 2n (linear growth stays near 2x, backtracking explodes) or raise the bound well above load noise with the reason written beside it; give the list's first test an explicit timeout or warm its imports in a `beforeAll`, as QA-10 did for the scans.

### D5. Info

- **QA-I10. The disclosed loosening is sound.** `apps/web/src/theme/ux-ui-supersession.unit.test.ts:180` now accepts `on 2026-10-\d{2} by PRD-009` where it required `on 2026-10-01`. The test still requires the verb and "by PRD-009" on every note in every file the register cites, and the stronger checks beside it are untouched: every cited line is still there once, has "PRD-009" within three lines, and its row ID is in the file (`:150-165`). What is lost is only the check that a note carries the day the row was applied, which 009A-AC-015 does not ask for; the reason is written beside it (`:167-175`). It also accepts an impossible day such as 2026-10-99; `2026-10-(0[1-9]|[12]\d|3[01])` would close that at no cost.
- **QA-I11. The checklist's own header lags its changelog.** `finish-line-operator-checklist.md:3` says "Version: 1.7" while the newest changelog entry is v1.8 (`:70`, D-9); the introduction (`:5`) says a person closes "steps 10 to 13 below and decision D-8 above", and the "Statuses are as of" line (`:14`) names D-8, both without D-9. Records only.
- **QA-I12. The partners no-match line is a live region mounted with its words.** `preference-editors.tsx:290` renders `<p role="status">` only when the search finds nothing, with its text already inside. Some screen readers announce a live region only when its content changes after it is in the page, so the comment's "a screen reader hears it as the person types" may not hold everywhere. A region kept in the page and filled when the search empties would. For `ux-ui-guardian`.
- **Carried from the early pass.** QA-I1 open (009C-AC-008's retired-notice clause is not amended). QA-I2 open (the block is renamed by D-1 but still runs only with `OALO_EXPECT_EMPTY_LIBRARY=true`, `tests/browser/ads-library.spec.ts:210-213`). QA-I3 open (`review-not-connected-screen.tsx` still exists with no importer). QA-I4 superseded by CI on `8178126b` (D6). QA-I5 open (the timing record can take the third dispatch's figure at re-sign). QA-I6 updated: 24 lines (32 occurrences) of `in-work/prd-009` in 12 files outside the folder, the checklist now 7 lines, plus the ledger; links inside the folder use `../../in-work/` or `../../completed/` and I found no `../prd-00N` sibling link, so they survive the move. QA-I7 open (`authenticated-workspace-data.ts:113-118`). QA-I8 and QA-I9 need nothing.
- **Held, worth recording.** `page-titles.unit.test.ts` moved from one `toEqual` to two `toMatchObject` groups plus `toHaveLength(15)` (`:30-58`), which together pin exactly the 15 titles, so nothing was loosened. Every other removed assertion in the range (`campaign-page-layout`, `launch-look`, `home-polish`, `home-first-run-geometry`, `campaigns-list`, `refusal-messages`, `campaign-detail-screen`, `connections-review-surface`) was replaced by a check of the ruled value (12 px chips, the visually-hidden live region, the Surface inset, the hyphen-safe cell, the opening sentence, "Connected"); the D-2 lane removed a review-surface allowance ("Missing"), which tightens the sweep. "Launch on Facebook" is still a literal `disabled` with no handler (`launch-on-facebook.tsx:32`).

### D6. The gates that remain, exactly

**QA-01 (High, open gate): 009G-AC-006, 009G-AC-011, MTK-011.**

1. Screen-baselines run 37149916536 on `8178126b` finishes with both jobs successful; its ID goes into MKR-119 (009G-AC-011).
2. Every picture it produces is installed in place of the uncommitted second redraw; none from run 37136898883 remains.
3. Scored review pass 3 (`ux-ui-guardian`) scores every changed and new picture, Light first, in `qa/2026-10-03-scored-baseline-review.md`: every installed picture at 3 on every axis in Light and in Dark, including R3 P2-06 (pass 2's one Medium) and the Lows still open after pass 2. A picture below 3 is a defect fixed with a test before the commit, and a fix that moves rendered output re-opens 009G-AC-004 and 007 under 009G-AC-011 (another dispatch, recorded).
4. MKR-114 and MKR-011 then go to VERIFIED; MTK-011's guard and Light-first halves already hold.

**QA-02 (High, open gate): MTK-001, MTK-002, MTK-003, MTK-004, 009G-AC-005, 009G-AC-007, 009F-AC-015.**

1. **MTK-003 on the final tree.** A `security-guardian` delta pass at the final code head (`8178126b`; the redraw commit adds only pictures), covering lane F's SEC-009-07 to 12 fixes (merged after the `0d539dee` pass and not re-attacked), the approval rule refactor, and the accepted-advisory test and revisit date, with its result in `qa/2026-10-03-security-review.md`; then MKR-003 to VERIFIED. If it changes code, the touched files need a quality re-check, and 009G-AC-011 applies if rendered output moves.
2. **009G-AC-005.** Commit the installed pictures with the "Baseline change:" note; `Application verification` and `Real PostgreSQL migrations and pgTAP` pass on the head that installs them (MKR-113).
3. **MTK-002.** On the final head, all four required checks are green, `Preview smoke contract` included (it runs only on `pull_request`, after the others); `gh pr view 75 --json mergeable,mergeStateStatus` reports `MERGEABLE` against current `origin/main` (the ruleset's strict policy needs the branch up to date: 0 behind `e89058e` today); `pnpm verify` and `pnpm test:db` green on the final tree (MKR-002).
4. **009G-AC-007.** Re-sign `docs/operations/evidence-packs/design-quality-signoff.md` against the final commit. It is unchanged since `e89058e` and still "Status: SIGNED" for PRD-008's screens. Rows for removed screens read "Removed by PRD-009 on <date>" and stay as history; every new screen and state has a row, each empty-account state included (the library's empty state now has a title and a reason; the Connections chips changed); no "not photographed" or "asserted" cell remains; the screenshots-outside-git, no-real-personal-data statement stays (MKR-115). The timing record can take the final dispatch's figure (QA-I5).
5. **009F-AC-015.** Move the folder to `library/requirements/completed/` in one commit that repairs every inbound link: the 32 occurrences in 12 files (QA-I6), the ledger's source link, the `in-work/README.md` and `completed/README.md` entries, `library/README.md`'s catalog label, and the backlog lineage row; a relative-link check over the changed files finds none broken (MKR-108).
6. **Ledger.** MKR-006 to VERIFIED (no pre-PRD-009 status cell changed, re-checked at `8178126b`); MKR-004 to VERIFIED citing this report once gate 1 has run without a code change; MKR-108, 113, 114 and 115, and the DONE rows MKR-109 to 112 and 116 to 120, VERIFIED by a pass other than the lane that did them; then MKR-001 and MKR-002.

### D7. Verdict

**Code and records: SHIP.** Nothing in this pass must change before ship. Recommended in the final pass because each is small: QA-07's residual (three Info items and one stale bullet in the index), QA-11 (a `library-guardian` ruling, then code or a note), QA-12 (two small screen changes and a D8 note), QA-13 (two test hardenings), QA-I11, and the regex in QA-I10.

**Gates that remain before the branch is shippable:** (1) the security delta pass on the final code head (MTK-003); (2) the third redraw installed, scored review pass 3 at 3 on every axis in Light and Dark (009G-AC-006, MTK-011); (3) the baselines committed with the note and CI green on that head (009G-AC-005); (4) the design sign-off re-signed against the final commit (009G-AC-007); (5) all four required checks green and `MERGEABLE` (MTK-002); (6) the move to `completed/` with every inbound link repaired (009F-AC-015); (7) the ledger rows above flipped, then MTK-001 and MTK-004.

### D8. Plan item traceability, delta

Only the criteria this pass touched; every other row stands as in section 8.

| Criterion | Ledger status | This pass | Evidence or note |
|---|---|---|---|
| MTK-002 | OPEN | Open | PR #75 `MERGEABLE`, `BLOCKED`, 0 behind `main`; CI on `8178126b` in progress (D6, gate 3). |
| MTK-003 | DONE | Open | Met at `0d539dee`; lane F and the approval rule refactor post-date it (D6, gate 1). |
| MTK-004 | IN PROGRESS | Checked | This delta pass; closes when gate 1 runs without a code change. |
| MTK-005 | VERIFIED | Checked | `tests/security/`, `packages/ghl`, and `apps/web/src/app/api/` unchanged since `2ec0affe`. |
| MTK-006 | OPEN | Checked | No pre-PRD-009 ledger row changed since `2ec0affe`; with the early compare, 0 status cells since `e89058e`. |
| MTK-007 | VERIFIED | Checked | 0 em or en dashes in added lines since `2ec0affe`. |
| MTK-008 | VERIFIED | Checked | QA-03 closed: delta check 0 BLOCKING, D-1 to D-8 applied verbatim. |
| MTK-010 | VERIFIED | Checked | `pnpm-lock.yaml`, `package.json` files, `pnpm-workspace.yaml` unchanged since `2ec0affe`. |
| MTK-011 | OPEN | Open | QA-01, pass 3 pending. |
| 009B-AC-010 | VERIFIED | Checked | Home asks `libraryAdRefusalFor` (`home-campaigns.ts:72-77`). |
| 009C-AC-008 | VERIFIED | Checked | QA-06 closed; one rule for the command and every screen. Note: QA-I1 still open. |
| 009C-AC-012 | VERIFIED | Checked | Amended 2026-10-03 (D-1); the tab and step 1 say title and reason once each, Home and the list the whole sentence; `ads-library-page.integration.test.tsx:349-383`, `first-impression.spec.ts:64-81`. |
| 009D-AC-002 | VERIFIED | Checked | Amended 2026-10-03 (D-1), as above. |
| 009D-AC-008, 009D-AC-010 | VERIFIED | Checked | Probe 132 of 132 at `8178126b`. |
| 009D-AC-016 | VERIFIED | Checked | Literal `disabled` kept; the glyph is now the rocket. |
| 009d D8 (note of 2026-10-03) | n/a | Gap | QA-11 (the chip on the campaign page and list) and QA-12 (a viewer who cannot save a version). Note: "Same" in the campaign page column of the "Ad not in the library" row is ambiguous; for `library-guardian`. |
| 009E-AC-006 | VERIFIED | Checked | Amended 2026-10-03 (D-4); `art-changed` and `replaced` notices with their links for a viewer who can edit (`campaign-page-data.ts:179-188`; `persisted-campaign-screen.integration.test.tsx`, D-4 cases). |
| 009F-AC-011 | VERIFIED | Checked | QA-04 closed; Appendix A equals the sweep's 143 files. |
| 009F-AC-014 | VERIFIED | Checked | Step 12 additions, D-8 and D-9, changelog v1.7 and v1.8 (header lag: QA-I11). |
| 009F-AC-015 | IN PROGRESS | Open | D6, gate 5. |
| 009G-AC-005 | OPEN | Open | D6, gate 2. |
| 009G-AC-006 | IN PROGRESS | Open | QA-01, gate 3. |
| 009G-AC-007 | OPEN | Open | D6, gate 4; the sign-off is unchanged since `e89058e`. |
| 009G-AC-011 | DONE | Open | Third dispatch 37149916536 in progress; record its ID when it finishes. |

### D9. Files changed, `2ec0affe..8178126b`

128 files outside `tests/visual/screens/` (11 added, 117 modified, none deleted); no picture is committed in the range.

| Area | Files | What changed |
|---|---|---|
| `apps/web` | 84 (8 added) | Round 2 layout and CSS for Home, workspace pages, Launch an ad, the campaign page, the list and the demo page; `KeepWordsWhole`, `LaunchAnAdLink`, `status-tone.ts`, `glyph-markup.tsx`; QA-06 on step 3, Home and the campaign page; D-1 to D-8 |
| `packages/application` | 2 | `libraryAdRefusalFor` and `recordedLibraryAdOf` exported |
| `packages/domain` | 1 | One comment (`library-ad-words.ts:783`) |
| `packages/ui` | 9 | `Link size="sm"`, compact button, Select edge and weight, theme segments, large-card phone inset, their tests |
| `tests/browser` | 4 | The empty-library title and reason (D-1); Home geometry at 12 px chips, weight 500, the page gap |
| `tooling/tests` | 3 | The approval rule table shared with the command; the two scan timeouts |
| `library/knowledge` | 16 (1 added) | QA-04 notes (S-104 to S-108), checklist v1.7 and v1.8, ux-ui component notes for round 2 |
| `library/requirements` | 8 (2 added) | The early report, the writing delta check, 009f Appendix A and S-104 to S-108, dated notes on 009b, 009c, 009d (D5, D8), 009e, the index's follow-ups |
| `EXECUTION_LEDGER.md` | 1 | MKR-004, MKR-008, MKR-104 evidence, two raid-log lines |

---

## Final delta pass (2026-10-04) at `9f55b1d4`

> **Auditor:** `quality-guardian` (paired weapon `quality-weapon`), opus, read-only; the release gate for PR #75 (MTK-004).
> **Tree:** `claude/prd-009-marketing-toolkit` at `9f55b1d4` (pushed, the head of PR #75; working tree clean). Range `8178126b..9f55b1d4`: 41 commits, 121 files outside `tests/visual/screens/` (5 code and test files added), and 493 pictures (244 added, 232 modified, 17 renamed). Node v24.18.0, pnpm 11.15.1.
> **Scope:** the quality close-out lane QA-11 to QA-13 (`8b961f67`, `3429c57e`, `76a01b51`, notes `63275272`); round 3 lanes X and Y (`d6eccf8f` to `d8ba39ef`); the micro-round (`efe066ab`, `20a4fa08`, `b47a7090`, `75ba3d51`); fix lane 5 (`338f6559`, merged in `9f55b1d4`); SEC-009-I14 (`9392c667`); the move to `completed/` (`e0f93b10`, `4511100d`); the fifth redraw's install and the re-signed sign-off (`9a38a556`); the doc wording commit `66a9ab38`; the scored review's passes 4 and 5; the security review's sections after my delta pass.
> **Order:** `security-guardian`'s final delta ran at `4511100d` (MTK-003 met there), after my delta pass and before this one. The only code after it is `9392c667` (security's own SEC-009-I14: three test regexes) and `338f6559` (Home's list rows). I read both for security surface and found none (QA-I15). This is not an ordering violation, and the audit was not halted.
> **Writes:** this section only, appended, uncommitted. Probe output stayed in the session scratchpad (`qa-final/`).
> **Not run, as instructed:** the database suites and Playwright. Nothing was written to Vercel, hosted Supabase, Resend, RentCast, HighLevel, Meta, or Stripe; `gh` was used read-only.

### F1. Summary

**Verdict: DO NOT SHIP at `9f55b1d4`; SHIP after the gates in F8.** The code is sound. QA-11, QA-12 and QA-13 are closed with tests and dated plan notes, every round 3, micro-round and fix lane 5 change carries a test, the merge adds nothing but fix lane 5, and nothing in the code regresses a VERIFIED criterion. But this head cannot pass a required check: `Application verification` fails on `9f55b1d4`, as it did on `66a9ab38`, at its first step, `pnpm format:check`, because `66a9ab38` left `NEXT_BATCH_LEDGER.md` unformatted (QA-14, Critical). So the 8 Home pictures are not the only red CI will show, and no part of `pnpm verify:offline` after the format check has run in CI on any head that installs baselines. Two records items also stand between this head and "every criterion passing": two user-visible strings that no writing check has read (QA-15, MTK-008), and a sign-off that says SIGNED while one of its rows fails its own bar (QA-16, 009G-AC-007, which is re-signed at the end anyway).

| Severity | Open after this pass | IDs |
|---|---|---|
| Critical | 1 | QA-14 |
| High | 2 | QA-01, QA-02 (open gates, narrowed in F4 and F8) |
| Medium | 3 | QA-15, QA-16, QA-17 |
| Low | 1 | QA-18 (QA-07's residual, carried and widened) |
| Info | 4 new | QA-I13 to QA-I16; carried items in F7 |

QA-11, QA-12 and QA-13 (all Low) are closed.

### F2. Checks run (each alone, Node 24.18.0, `bash -lc 'cd <worktree> && ...'`)

| Command | Result |
|---|---|
| `pnpm exec turbo run typecheck --force`, then `tsc -p tsconfig.tooling.json` | Pass, 16 of 16 packages, 0 cached |
| `pnpm lint` | Pass (oxlint) |
| `pnpm format:check` | **Fail**: `[warn] NEXT_BATCH_LEDGER.md` (QA-14) |
| `vitest run --project unit` | 175 files, 2691 of 2691 pass |
| `pnpm test:unit` (with coverage, as CI runs it) | 175 files, 2691 pass; coverage thresholds met |
| `vitest run --project components` | 5 files, 77 pass |
| `vitest run --project integration --maxWorkers=3` | 54 files, 818 pass, 1 skipped (the same skip as before) |
| `vitest run --project contracts` | 13 files, 112 pass |
| `pnpm jscpd` | 0 clones in 588 files |
| `pnpm audit:boundaries`, `audit:product-types`, `audit:secrets` | Pass |
| Dash scan, MTK-007 | 0 U+2013 or U+2014 in lines added in `8178126b..9f55b1d4` (pattern proven on a planted dash) |
| Backspace scan | 0 U+0008 under `apps`, `packages`, `tooling`, `tests`, `library`, `docs` |
| The sign-off's own table check | 476 named, 0 missing; 476 installed; no installed picture unnamed; no table cell reads "not photographed" or "asserted" |
| Relative-link check over every tracked `.md` and `.mdc` link that names PRD-009, `completed/` or `in-work/` | 355 links; 0 broken to PRD-009 (3 broken are illustrative paths in `.cursor/skills/library-weapon/examples/`, not PRD-009) |
| Merge check | `git diff 70ff5cd1 9f55b1d4` equals `git diff 4511100d 338f6559`: the merge adds fix lane 5 and nothing else |
| `gh` (read-only, 13:27Z) | PR #75: draft, `MERGEABLE`, `BLOCKED`, 0 behind `main` (`e89058e0`). CI on `66a9ab38` (run 37204566159): `Application verification` failed at `pnpm format:check` (log: `[warn] NEXT_BATCH_LEDGER.md`), the rest cancelled. CI on `9f55b1d4` (run 37204949619): `Application verification` failed, its gate step lasting 14 s (13:16:22Z to 13:16:36Z), the format check's length; `Release and recovery contract` success; `Real PostgreSQL migrations and pgTAP` in progress. Screen-baselines run 37204940622: synthetic job success, review job in progress |

### F3. The changes since `8178126b`, against their plans

- **QA-11: closed.** `deriveCampaignStanding` takes the rule's answer (`adRefusal: LibraryAdRefusalReason | undefined`) and maps it through a frozen table the type system holds exhaustive (`packages/application/src/campaign-workspace-read.ts:245-251`, `:274-289`); a recorded decision still wins, and only unapproved states take an ad standing. The page (`apps/web/src/server/campaign-page-data.ts:57`, `:225`, `:284`) and the list (`:401`) ask `adRefusalOf`, which is the command's own `libraryAdRefusalFor(recordedLibraryAdOf(...), standingOf(...))`; the earlier-flow row passes `undefined` (`:378`). `campaignStateLabel` is the one source of the four words (`apps/web/src/copy/user-language.ts:330-350`), and step 3's chips are now those constants (`launch-messages.ts:246`, `:268`, `:271`, `:274`), pinned equal in `user-language.unit.test.ts:144-147`. Every screen that draws a standing (`campaign-list.tsx:89`, `campaign-versions-card.tsx:43`, `persisted-campaign-screen.tsx:73`, through `standingTone`) gives the new standings the neutral tone step 3 uses (`launch-review.tsx:472`, `:490`). Tests: the list and the page for each reason and three viewers (`campaign-list-decisions.integration.test.tsx`, `persisted-campaign-screen.integration.test.tsx`), `campaign-page-data.unit.test.ts:573-577`, `campaign-workspace-read.test.ts:458-461`, `:587-590`. Plan: 009E-AC-010 and 009e D4 carry dated notes, and 009d D8's rows now name the chip on every screen (`63275272`). Pass 4 R2 saw "Newer ad version" where pass 3 read "Ready for approval".
- **QA-12: closed.** The campaign page passes `askWhenCannot={USE_NEW_VERSION_ASK}` (`campaign-library-notices.tsx:105`); step 3 draws "Choose another ad" or "Make a new version" only when `canMakeNewVersion` (`launch-review.tsx:380-381`, `:494-498`). 009d D8's amendment rules that a viewer who cannot save a version gets the reason and nothing to press on both screens, except the newer-version notice, which names who can; the code matches it. Tests: `launch-review.integration.test.tsx` (each refused card, with and without the right) and `persisted-campaign-screen.integration.test.tsx` (approver, owner, decided version).
- **QA-13: closed.** The list's first test has a 30 s limit with its measured reason; the linear-time guards count processor time against the same 1.5 s bound, with a 60 s test limit (`word-checks.test.ts`). Security confirmed the guard is not weakened. Both passed here inside the full runs.
- **Round 3 (lanes X and Y) and the micro-round.** Every commit carries a test that reads the source or renders the screen (F11). Pass 4 found every pass 3 finding resolved with 0 regressions; pass 5 confirmed every micro-round fix with 0 regressions. What I checked in the code: the reset page's no-token branch and the refused form both offer `/forgot-password` through the shared `Link` (`auth-feedback.tsx:70-90`, `:108`; `reset-password/page.tsx:37`), pinned in `reset-password-page.integration.test.tsx` and `auth-forms.integration.test.tsx`; `RelativeTimeText` changes no words and only wraps what its one linear pattern matches (`relative-time-text.tsx:6`, `:17-30`); the Brand card offers "Create a homeowner report" only when reports are on (`preference-editors.tsx:201-213`); the Approval card's lead is `.decisionLine` (`campaign-approval-section.tsx:52`, `:74`). The words the reset link and the Brand card add are QA-15.
- **Fix lane 5 (`338f6559`): the Campaigns list renders as before.** I compared the cascade rule by rule. Before, the name was `.link` plus `.inline` plus `a.rowLink.rowLink`; after, it is `.link` plus `.title`, written after `.link` in the same file at the same specificity (`packages/ui/src/components/link.module.css:5-19`, `:123-138`). Every property resolves to the same value at rest (`display: inline-flex`, centred alignment and justification, both 44px minimums, `--tx-strong`, `--text-body-size`, `--weight-semibold`, `text-decoration: none`, and the shared gap, radius, leading and underline offset), on hover (`--tx-strong`, underline) and on focus (the `.link:focus-visible` ring). No other rule in `campaign-list.module.css` or `globals.css` reaches the anchor (`.adName > span` stops at the cell's own spans), and no stylesheet selects `data-variant="inline"`. The commit's claim holds by reading; its "502 computed properties" comparison left no committed artifact, so the redraw is the pixel check (F8, step 3). Home's FU-1 rule is local (`overview.module.css:465-467`), and FU-2 uses the variant with no local restyle (`home-campaign-lists.tsx:88`); `home-polish.unit.test.ts` pins both, `primitive-look.test.ts` pins the variant, and the integration tests pin `data-variant="title"` on the rendered names (`campaigns-list.integration.test.tsx:104`, `:169`).
- **SEC-009-I14: closed.** The two regexes security named, and a third in `launch-model.unit.test.ts`, now hold `\b` (`9392c667`); no U+0008 remains in the tree.

### F4. The D6 gates of my delta pass, one by one

QA-01 (009G-AC-006, 009G-AC-011, MTK-011):

1. Run 37149916536 finished with both jobs successful, and three dispatches followed: 37157590605 (`963630c9`) and 37163215460 (`ee03945a`), both successful, and 37204940622 (`9f55b1d4`), in progress. **Done; MKR-119 names none of them** (QA-I14).
2. `9a38a556` installs run 37163215460's 476 pictures with the "Baseline change:" note. **Done, except the 8 `review/home--with-campaigns--*`**, which `338f6559` re-opens.
3. Pass 3 (the last full scan), pass 4 (confirmation: 0 regressions, three dated follow-ups) and pass 5 (the micro-round: 0 regressions) leave every installed picture at 3 on every axis (the demo route exempt on axis 10 only) **except the 8 Home pictures, at 2 (FU-1, FU-2); pass 6 is not yet written.** Open.
4. MKR-114 and MKR-011: open until pass 6.

QA-02 (MTK-001 to MTK-004, 009G-AC-005, 009G-AC-007, 009F-AC-015):

1. MTK-003 on the final tree: **closed** at `4511100d`; the two later code commits add no security surface (QA-I15).
2. 009G-AC-005: the note is in `9a38a556`, but **CI has not passed on any head that installs baselines** (QA-14). Open.
3. MTK-002: `MERGEABLE` and 0 behind, but **the checks are red (QA-14) and the PR is still a draft (QA-I16).** Open.
4. 009G-AC-007: re-signed in `9a38a556`, **but not satisfiable at this head** (F5, QA-16). Open.
5. 009F-AC-015: **closed.** The folder is in `completed/`, no `in-work/prd-009` link remains (the four text mentions left are history inside QA reports), and the link check finds no broken PRD-009 link (F2). MKR-108 can go to VERIFIED citing this pass.
6. Ledger: MKR-006 can go to VERIFIED now (in this range only MKR-003 changed status, DONE to VERIFIED, and no pre-PRD-009 status cell changed); MKR-003 is VERIFIED; the rest wait on F8.

### F5. The sign-off, 009G-AC-007

At `9f55b1d4` the record checks hold: rows for removed screens read "Removed by PRD-009 on 2026-10-03" and stay as history (`design-quality-signoff.md:204-235`); every installed picture is named, Home with campaigns has its row (`:115`) and each empty-account state has one (476 named, 0 missing); no table cell reads "not photographed" or "asserted"; the statement that screenshots are retained outside git and hold only synthetic or seeded review data stays (`:19-30`). The criterion is still not met, for two reasons: `338f6559` moves the 8 Home pictures, so the sign-off is re-signed against the commit that installs their redraw (009G-AC-011); and the file is not internally true today (QA-16).

### F6. Scope contract

No change in the range to `pnpm-lock.yaml`, any `package.json`, `pnpm-workspace.yaml`, `supabase/` or any migration, `vercel.json`, `apps/web/vercel.json`, `apps/web/next.config.ts`, the proxy, `.github/`, `tests/security/`, `packages/contracts`, `packages/ghl`, `packages/db`, `packages/domain`, `apps/web/src/app/api/`, or `tooling/scripts`. No added `process.env`, `NEXT_PUBLIC_` or `import.meta.env` read; no added `.only`, `.skip` or `.todo`. Every added mention of `OALO_ADS_LIBRARY_SAMPLES` says it must never be set on a deployment (checklist steps 0 and 10). This pass wrote nothing to a provider or a deployment.

### F7. Findings

#### QA-14 (Critical). `Application verification` fails on the head at `pnpm format:check`

- **Files:** `NEXT_BATCH_LEDGER.md:5-11` (from `66a9ab38`); `package.json:35` (`verify:offline` starts with `pnpm format:check &&`); `.github/workflows/ci.yml:65` (the job runs `pnpm verify:offline`).
- **Evidence:** `66a9ab38` shortened the table's "Branch" cell (it removed "open, not merged; ") without re-padding the table, so Prettier would rewrite lines 5 to 11. Locally `pnpm format:check` exits 1 naming that one file. In CI, run 37204566159 on `66a9ab38` logs `[warn] NEXT_BATCH_LEDGER.md` and exits 1 at 13:09:42Z, and run 37204949619 on `9f55b1d4` fails the same step after 14 s. Because the format check comes first, nothing after it in `verify:offline` (unit, integration, contracts, components, the synthetic pictures, the preview e2e, the browser suites, jscpd, the audits, `pnpm build`, `audit:sample-ads`) has run in CI on either head. `Application verification` fails before it reaches any picture, and `Preview smoke contract` cannot start until it passes. This blocks MTK-002 and 009G-AC-005.
- **Fix:** `pnpm exec prettier --write NEXT_BATCH_LEDGER.md`, then `pnpm format:check` (expect a pass), and commit it in or before the commit that installs the redraw, so the final head runs the whole gate. It is a docs-only change: no picture moves and no code re-check is due.

#### QA-15 (Medium; a gate for MTK-008, so for MTK-004). Two user-visible strings were added after the last writing check

- **Files:** `apps/web/src/copy/auth-messages.ts:75` (`requestNewLinkLabel: "Request a new link"`, drawn at `auth-feedback.tsx:73`, from `20a4fa08`); `apps/web/src/features/workspace/preference-editors.tsx:208` ("Homeowner reports aren't turned on in this workspace yet.", from `51a42d72`), beside the reused label "Workspace connections" (`:211`).
- **Evidence:** MTK-008 requires `technical-writing-craft-guardian` to review every new or changed user-visible string. The last writing check covers `301f24f7..823f3539` (`qa/2026-10-03-writing-review-delta.md`); `git grep` at `8178126b` finds neither string, and no writing record in this range mentions them, while MKR-008 is VERIFIED on the earlier range. The pass 4 fix for R4 F4-01 asked for the existing label "Reset your password" "so no copy changes" (`qa/2026-10-03-scored-baseline-review.md:2545`); the lane wrote a new label instead. The Brand sentence is R3's proposed wording (`:1949`), from a design reviewer, not the writing reviewer. Both pass the source guard (the unit run). The QA-11 chips in their new places (the list's Status column and the page header) reuse words the delta check settled (D-5), so they need no new review.
- **Fix:** a `technical-writing-craft-guardian` delta on these two strings, appended to the writing delta file, with MKR-008's evidence naming it. Run it now, beside the redraw: if it changes either string, `review/reset-password--link-expired--*` (8) or the Brand pictures (`review/brand--empty-account--*` and `chromium/brand--default--*`, 16) move, and one more redraw follows under 009G-AC-011.

#### QA-16 (Medium; closes with the re-sign). The sign-off says SIGNED while one of its rows fails its own bar, and its "Signed." paragraph contradicts its table

- **File:** `docs/operations/evidence-packs/design-quality-signoff.md:4`, `:10-16`, `:74-75`, `:115`, `:363-381`, `:393-398`.
- **Evidence:** the table's rule is that a row is signed when every picture it names scores 3 on every axis (`:74-75`). The Home with campaigns row (`:115`) names 8 pictures that pass 5 scored 2 on axis 10 (4 of them also 2 on axis 3), yet the header says "Status: SIGNED." (`:4`). The "Signed." paragraph says Home with campaigns has no picture and is recorded under "Frames a state does not have" (`:394-396`), but the table names its 8 pictures and that section does not list it (`:306-314`). The paragraph rests the scores on "pass 3's ... and pass 4's confirmation" (`:396-398`); pass 5, which scored the 201 pictures this commit installed, is not mentioned anywhere, and the passes list (`:363-381`) ends at pass 4.
- **Fix, at the re-sign on the final commit:** "Commit reviewed" names the commit that installs run 37204940622's pictures; the redraw list gains that sixth run; the passes list gains pass 5 and pass 6; the "Signed." paragraph drops the "no picture" sentence and says the Home with campaigns row is signed on pass 6's scores; and the header says SIGNED only once pass 6 puts the 8 at 3.

#### QA-17 (Medium). The review pictures depend on the day they are drawn, so a required check can turn red on another day with no code change

- **Files:** `apps/web/src/features/campaigns/launch-model.ts:126`, `:152` (the end date defaults to today plus 14 days) and `:187-195` (`readableDay`, with a short weekday); `apps/web/src/server/launch-an-ad.ts:294`, `:370` (`now = new Date()`); `tests/browser/helpers/design-quality.ts:928-931`, `:953` (a mask paints over a date, but the date's width and line breaks still follow its text); `playwright.config.ts:98` (`maxDiffPixelRatio: 0.001`); `tooling/scripts/database/run-real-database-tests.mjs:32-34` (the review browser run is a step of `test:db`, so of `Real PostgreSQL migrations and pgTAP`).
- **Evidence:** pass 5 part fa recorded about 30 pictures that changed only because their dates were drawn a day later, and some reflowed: step 3 at 1440 is 21px taller, and the campaign page header and the Versions card at 390 break differently (`qa/2026-10-03-scored-baseline-review.md:2650-2668`). A different height fails the comparison outright. So a CI run on a different UTC day from the one the installed review pictures were drawn on can fail with nothing changed. That bears on MTK-002 now (a re-run, or an update from `main`, after midnight UTC) and on `main` after the merge. Pass 5 recorded it only as a dated follow-up, and no follow-up list carries it.
- **Fix now:** when installing run 37204940622, compare every review picture with the installed one, not only the 8; any other that differs is date drift or noise, goes to pass 6 to confirm, and is installed with the 8. Then run the final head's CI on the same UTC day as that redraw (2026-10-04), or redraw again. **Fix after the merge (follow-up):** make the captures clock-independent, either by filling a fixed end date in the review specs' step 2, or by having the capture helper set every masked date to one fixed string before the shot; list the item in the index's "Follow-ups after PRD-009".

#### QA-18 (Low). QA-07's residual is still open, and the follow-up list misses more

- **File:** `library/requirements/completed/prd-009-marketing-toolkit/prd-009-marketing-toolkit-index.md:287`, and the list at `:278-293`.
- **Evidence:** the bullet "The approval rule is written in four places ... QA-06's code lane narrows them to one exported predicate" still describes finished work as work to come. QA-I2, QA-I3 and QA-I7 are still absent, and so are QA-17's clock dependence and pass 5's notes N-1 and N-2 (one-word last lines).
- **Fix:** `library-guardian` rewrites `:287` as done (one exported rule, `libraryAdRefusalFor`, which since QA-11 also decides every chip) and adds QA-I2, QA-I3, QA-I7 and QA-17 as bullets, each with where it is recorded. No criterion changes.

#### Info

- **QA-I13. An interim commit installed 8 pictures below 3.** 009G-AC-006 says a picture below 3 is fixed "before the baselines are committed"; `9a38a556` committed the 8 Home pictures at 2, and `338f6559` fixed them afterwards. The criterion is met once the commit that installs their redraw lands with pass 6 at 3. Pass 5's summary line "Both are fixed, with tests, before the baselines are committed" (`scored-baseline-review.md:2606`) should read "before the final baselines commit", and pass 6 should record the order.
- **QA-I14. The ledger's evidence lags.** MKR-003's evidence stops at the `e8aae2b5` final delta and does not cite the `4511100d` section; MKR-119 names no dispatch after 37136898883, though four followed (37149916536, 37157590605, 37163215460, 37204940622). Both are one-line evidence updates at close-out.
- **QA-I15. The code after security's final delta adds no security surface.** `9392c667` is three test regexes. `338f6559` adds a `Link` variant, which is a class and a `data-variant` value only: `rel` and `target` are still omitted from `LinkProps` (`Link.tsx:29`) and set by the unchanged `resolveExternalLinkSafety` (`:48`), no `href` changed, and the CSS has no `url(`, `@import` or `content:`; the rest is tests and two spec notes. MTK-003 holds on the final code in substance; MKR-003 can say so in one line, or `security-guardian` can confirm it if the orchestrator wants a security-owned line.
- **QA-I16. PR #75 is a draft.** Today's `BLOCKED` is the draft state plus the checks; it must be marked ready before the merge.
- **Carried.** QA-I10: `ux-ui-supersession.unit.test.ts:180` still accepts `2026-10-\d{2}`. QA-I11: fixed in part (the checklist header reads v1.10); `finish-line-operator-checklist.md:14` still names no D-9. QA-I12: unchanged (`preference-editors.tsx:323`). QA-I1, QA-I2, QA-I3, QA-I5 and QA-I7 stand as in D5.

### F8. The gates that remain, exactly

In this order, because each depends on the one before:

1. **QA-14.** Format `NEXT_BATCH_LEDGER.md` and commit it (no picture moves).
2. **QA-15.** The writing delta on the two strings, run now. If it changes words, apply them with tests, and the affected pictures join the redraw (009G-AC-011).
3. **The redraw and pass 6 (009G-AC-011, 009G-AC-006, MTK-011).** Run 37204940622 finishes with both jobs successful. Install the 8 `review/home--with-campaigns--*` pictures and any other picture that differs (QA-17), and confirm that no `campaigns--*` picture differs beyond noise or date drift, which proves fix lane 5's no-change claim in pixels. Pass 6 (`ux-ui-guardian`) scores the 8 at 3 on every axis, Light first, confirms any others, and is recorded under its own heading in the scored review.
4. **The install commit (009G-AC-005, 009G-AC-007).** One commit with the "Baseline change:" note, the pass 6 record, and the sign-off re-signed with QA-16's corrections, so the commit the sign-off names is the final commit.
5. **CI on that head (MTK-002, 009G-AC-005).** `Application verification`, `Real PostgreSQL migrations and pgTAP`, `Release and recovery contract`, then `Preview smoke contract`, all green, run on 2026-10-04 UTC (QA-17). That run is the final tree's `pnpm verify:offline` and `pnpm test:db`.
6. **Merge state.** Mark PR #75 ready for review; `gh pr view 75 --json mergeable,mergeStateStatus` reports `MERGEABLE` against current `origin/main` (0 behind `e89058e0` today; if `main` moves, update the branch and repeat step 5, minding QA-17).
7. **Ledger.** MKR-108 and MKR-006 to VERIFIED now (F4); MKR-003 and MKR-119 evidence updated (QA-I14); MKR-008's evidence names the QA-15 check; MKR-113, 114, 115 and 011, and the DONE rows MKR-109 to 112 and 116 to 120, VERIFIED once step 5 is green, by a pass other than the lane that did them; MKR-004 to VERIFIED citing this report once steps 1 to 5 hold; then MKR-001 and MKR-002.

A change in steps 1 to 4 to anything other than the ledger's formatting, a QA-15 wording fix with its tests, pictures, and records needs a quality re-check of the files it touches before MKR-004 flips.

### F9. Verdict

**DO NOT SHIP at `9f55b1d4`. SHIP after the gates in F8.** The code and its tests are ready: no Critical or High finding in code, the three QA Lows closed, every fix pinned by a test, and the scope contract kept. The one must-fix is QA-14 (one command and a commit), because without it no head can be green. QA-15 and QA-16 must close before MTK-004 can report every criterion passing. QA-17 needs care during the install and a follow-up after the merge. QA-18 and the Info items are records work that blocks nothing.

### F10. Plan item traceability, delta

Only the criteria this pass touched; every other row stands as in section 8 and D8.

| Criterion | Ledger status | This pass | Evidence or note |
|---|---|---|---|
| MTK-002 | OPEN | Open | QA-14: `Application verification` red on `66a9ab38` and `9f55b1d4` at the format check; `MERGEABLE`, 0 behind, draft (QA-I16). |
| MTK-003 | VERIFIED | Checked | Met at `4511100d`; the two later code commits add no security surface (QA-I15). |
| MTK-004 | IN PROGRESS | Checked | This pass; closes after F8 steps 1 to 5. |
| MTK-005 | VERIFIED | Checked | `tests/security/` unchanged; contracts 112 pass. |
| MTK-006 | OPEN | Verified here | In this range only MKR-003 changed status (DONE to VERIFIED); no pre-PRD-009 status cell changed. |
| MTK-007 | VERIFIED | Checked | 0 em or en dashes in added lines. |
| MTK-008 | VERIFIED | Gap | QA-15: two strings not yet reviewed. |
| MTK-010 | VERIFIED | Checked | Lockfile, every `package.json`, and `pnpm-workspace.yaml` unchanged. |
| MTK-011 | OPEN | Open | Guard files unchanged and the sample tests pass; pass 6 pending for the 8 Home pictures. |
| 009B-AC-009, 009B-AC-010 | VERIFIED | Checked | Home's row name is the `title` link to the campaign (`home-campaign-lists.tsx:88`); dates stay whole (`overview.module.css:465-467`); `overview-screen.integration.test.tsx`. |
| 009C-AC-009 | VERIFIED | Checked | The notice is unchanged for a viewer who can save a version; one who can't is told who can (009d D8 amendment). |
| 009d D8 (amended 2026-10-03, QA-11 and QA-12) | n/a | Checked | The code matches every row (F3). |
| 009E-AC-009 | VERIFIED | Checked | The row link's cascade is unchanged by `338f6559` (F3); the redraw confirms it in pixels (F8, step 3). |
| 009E-AC-010 | VERIFIED | Checked | Amended; each reason is covered on the list and on the page. |
| 009F-AC-015 | IN PROGRESS | Verified here | In `completed/`; 355 links checked, 0 broken to PRD-009. |
| 009G-AC-005 | OPEN | Open | The note is in `9a38a556`; CI has never been green on a head that installs baselines (QA-14). |
| 009G-AC-006 | IN PROGRESS | Open | Every installed picture at 3 except the 8 Home pictures, at 2 until pass 6 (QA-I13). |
| 009G-AC-007 | OPEN | Open | The record checks hold; re-sign on the final commit with QA-16's corrections. |
| 009G-AC-011 | DONE | Checked | Six dispatches in all; MKR-119 records one (QA-I14). |

### F11. Files changed, `8178126b..9f55b1d4`

121 files outside `tests/visual/screens/` and 493 pictures (244 added, 232 modified, 17 renamed), in 41 commits.

| Area | Files | What changed |
|---|---|---|
| `apps/web` | 59 (5 added) | QA-11 (standings and chips), QA-12 (who is told what), QA-13 (two test limits); round 3 X and Y CSS and markup (step 3's disclosure, link actions and support card, the ad card, step 2's note, the list at 768 and on a phone, Home's empty states, the workspace pages, Connections, the Homeowner reports header, the demo page); the micro-round (the link primaries' edge, the Approval card's lead, the reset link, wrapping, `RelativeTimeText`); fix lane 5 (Home's rows); the SEC-009-I14 regexes; a comment path in `globals.css` |
| `packages/application` | 1 | `deriveCampaignStanding` and `projectCampaignVersions` take the rule's answer |
| `packages/ui` | 5 | `chevron-right`; `Link` `size="sm"` on `inline`, and the `title` variant; their tests |
| `tests/browser` | 1 | `empty-account.spec.ts`: the QA-11 chips and the Home with campaigns capture |
| `tooling/tests` | 2 | The word checks' processor-time clock; the standing table |
| `library/requirements` | 39 | The move to `completed/` (renames); the 009d D8, 009e and 009E-AC-010 notes; the quality, security and scored review records |
| `library/knowledge`, `library/README.md` | 9 | ux-ui component notes (link, campaign workflow, Approval card), checklist versions, lifecycle labels, the project map |
| `docs/operations` | 1 | The re-signed sign-off |
| Root records | 4 | `EXECUTION_LEDGER.md`, `NEXT_BATCH_LEDGER.md` (QA-14), `README.md`, `.cursor/rules/core/the-map.mdc` |
