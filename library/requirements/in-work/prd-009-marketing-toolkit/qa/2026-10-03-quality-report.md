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
