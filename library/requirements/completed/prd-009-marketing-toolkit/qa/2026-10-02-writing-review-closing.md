# PRD-009 writing review, closing check (MTK-008)

> Reviewer: `technical-writing-craft-guardian` (sonnet) | Date: 2026-10-02 | Run: `claude/prd-009-marketing-toolkit` at `8b283a5` | Mode: read-only. No file in the worktree was edited, built or committed; this report is the only file added, and it is not committed. Apart from read-only `git` and search commands, the only commands run in the worktree were the two unit test runs listed under "Test runs". `git status --short` was empty before and after them.
> Standards read: [user-language contract](../../../../knowledge/private/standards/user-language-contract.md) (v1.2), the source guard `tooling/tests/unit/user-language/forbidden-vocabulary.test.ts`, [pass 1](2026-10-02-writing-review-pass-1.md), [pass 2](2026-10-02-writing-review-pass-2.md), the ledger rows for MKR-008 and the two decisions, and the diffs `6e0de10..8b283a5` (pass 1 base to head) and `e86e1ca..8b283a5` (pass 2 base to head).
> Method: every finding was checked by reading the string at `8b283a5`, not by trusting the lane notes. I did not re-run integration, component, browser or database suites; where a result below depends on one, it says so.

## Result

**MTK-008 can close. No BLOCKING finding is open, and none was found in the strings that changed after pass 2.**

| Status | Count | Items |
|---|---|---|
| RESOLVED | 37 | W-1 to W-4, W-6 to W-11, W-13 to W-19, W-21 to W-37 (34 findings), and guard gaps 1, 2 and 3 |
| DECLINED BY THE ORCHESTRATOR | 2 | W-5 ("With Meta" stays), W-20 (UTC dates, a follow-up outside PRD-009) |
| PARTIAL | 1 | W-12 (Help no longer says "Contact support", but the support address the owner must supply is still missing) |
| OPEN | 0 | none |
| **Total checked** | **40** | 37 findings plus 3 guard gaps |

New in this check: **0 BLOCKING, 4 ADVISORY (N-1 to N-4), 2 NIT (N-5, N-6).** None blocks closing.

| Criterion | Rating | Note |
|---|---|---|
| Diataxis mode | Pass | UI strings. Each page and step keeps one job. |
| Inverted pyramid | Pass | Every lead states the action first. |
| Code discipline | Not applicable | No code examples in scope. |
| Voice and tone | Pass | Second person, plain words, sentence case, American spelling hold. Nit N-5. |
| Reader lens | Warn | N-2 (a leftover "until you connect" on the Connections page), N-4 (a sentence points "below" at a collapsed region), W-12 (the support address is still owed). |
| Structural completeness | Warn | N-1 (five signed-in pages still share the default tab title), W-12. |

## What closing needs from the orchestrator

1. Nothing blocks. The four ADVISORY items are cheap and are written with exact replacements; apply them now or log them.
2. **One owner fact is still outstanding (W-12):** a support address or link. Until then "contact support" appears at `user-messages.ts:125` and `:225`, `reporting-messages.ts:39, 41, 45` and `server/homeowners/runtime.ts:168, 182`. The ledger already records this as an owner decision.
3. W-20 (bare dates written in UTC) and W-5 are recorded in the ledger (MKR-008 and the 2026-10-02 pass 1 row). Nothing in the tree contradicts the decisions.
4. The ledger says some rows stay DONE until the next CI review run. That is a CI matter and outside this check.

## 1. Every finding, checked against the tree

`file:line` points at the final string. "Pinned" tests were not re-run by me.

### Pass 1 (W-1 to W-24)

| ID | Status | Final string and where |
|---|---|---|
| W-1 | RESOLVED | `apps/web/src/features/http/user-messages.ts:100` (`LIBRARY_AD_MISSING`), `:104` (`RETIRED`), `:113` (`REPLACED`), `:118` (`ART_CHANGED`). None says "on our side". Pinned exactly in `user-messages.unit.test.ts` ("tells the person who pressed Approve what to do"). |
| W-2 | RESOLVED | Home intro `copy/home-messages.ts:52-53`; no-ads variant `:60-61`; Running now body `:166-167`; Meta item `:108`; approval outcome `copy/user-language.ts:242-243`, drawn at `campaign-approval-controls.tsx:231`. |
| W-3 | RESOLVED | `home-messages.ts:84` ("See what's needed"), used at `:101`, `:103`, `:113`, `:115`; accessible name `:134-143` ("See what's needed for HighLevel"). "Fix", "Review", "Add", "Edit" kept for the other states. |
| W-4 | RESOLVED | `features/workspace/preference-editors.tsx:123` ("Your details"), `:128-129` (body, reports off and on), `:145-146` ("Load latest saved details", "Save your details"), `:471-472` ("Load latest saved ad settings", "Save ad settings"), `:498` (preview text), `:104` (validation line); labels `features/homeowners/builder.tsx:57` ("Your NMLS number") and `:65` ("Company NMLS number"); `packages/domain/src/library-ad-ruleset.ts:220` ("disclosure line in Brand"). Pass 2's correction (heading "Your details", not "Your name and NMLS details") is what shipped. |
| W-5 | DECLINED BY THE ORCHESTRATOR | `copy/user-language.ts:269-270` still `"Sending to Meta"` and `"With Meta"`. Reason recorded in the ledger (2026-10-02, pass 1 row): "Active on Facebook" would route around 009D-AC-017's no-Live rule for a state no PRD-009 screen can reach. I agree the choice is defensible; the future Meta publish PRD should rename it when the state is reachable. |
| W-6 | RESOLVED | `campaign-versions-card.tsx:69-71` renders `VERSIONS.viewing` ("Viewing now", `campaign-page-messages.ts:213`) in the shown row; style `campaign-page.module.css:319`. |
| W-7 | RESOLVED | Title "Approve this version" (`launch-messages.ts:180`, drawn at `campaign-approval-controls.tsx:155` and `:165`); the default status sentence is gone, only an outcome renders (`:213`); effect `:300`; result `:302`. |
| W-8 | RESOLVED | `copy/campaign-page-messages.ts:237` and `:240` ("keeps its approved version"). |
| W-9 | RESOLVED | Card facts named at `features/campaigns/components/campaign-list.tsx:192-206`, from `campaign-page-messages.ts:48-63` ("Topic: ...", "Dates: ...", "Where it shows: ...", "Last change: ..."). The optional "Runs" column rename shipped through W-33. |
| W-10 | RESOLVED | `campaign-page-messages.ts:35` (the 009C-AC-012 sentence), chosen at `campaign-list.tsx:121-123`, fed by `app/(authenticated)/marketing/campaigns/page.tsx:31`. |
| W-11 | RESOLVED | `preference-editors.tsx:232-233` (note, "Adding a partner sends no invitation."), `:284` (empty state), `:293` (link "Launch an ad"). |
| W-12 | PARTIAL | `copy/shell-messages.ts:36-46`: "Contact support" is gone from Help and no unfollowable instruction remains, but the real fix (an address) needs an owner fact the lane correctly did not invent. See "What closing needs" item 2. Not blocking. |
| W-13 | RESOLVED | `app/layout.tsx:21-24` (default "Automated LO", template "%s | Automated LO"), `copy/page-titles.ts:19-38`; the seven titles pass 1 listed are set in their pages (for example `brand/page.tsx:12`, `overview/page.tsx:20`, `marketing/campaigns/page.tsx:16`, `(gone)/not-found.tsx:7`). Five other signed-in pages still use the default: see N-1. |
| W-14 | RESOLVED | `preference-editors.tsx:424` ("title, color and") and `:439` (`label="Brand color"`). The only remaining "colour" strings in `apps/web/src` are code comments. |
| W-15 | RESOLVED | `campaign-page-messages.ts:161` reads "Where it shows". This is the final form after pass 2 W-33 reversed the interim "Shows in"; step 2's "Shows in: the Facebook feed." (`launch-messages.ts:110-111`) is the placement sentence and stays. |
| W-16 | RESOLVED | `packages/domain/src/campaign-foundation.ts`: library variants `:238-245`, budget `:255`, claims `:381`, financing `:391`, targeting description `:443`, budget description `:459`, Realtor identity `:549`, identity asset `:597`, property asset `:610`; Equal Housing at `library-ad-ruleset.ts:220`; NMLS fixes `:190-210` read correctly against the new label. Stored findings keep the sentence they were saved with, as pass 2 said. |
| W-17 | RESOLVED | `campaign-page-messages.ts:66` ("Open house") and `:93` ("Made with the earlier open house tool."). |
| W-18 | RESOLVED | `user-messages.ts:131-135` ("Ask the campaign creator to fix what the checks found and save a new version, then approve that one.") and `:168-171` ("You can still launch an ad from Campaigns."). The three `SETUP_PREFERENCE_*` entries stay on purpose: `server/setup-preferences.ts:207, 210, 258` still emits the codes, so the coverage test needs them. |
| W-19 | RESOLVED | `features/shell/components/app-shell.tsx:322-326` (the item's own sentence stands alone) and `:337` ("Not available yet"). |
| W-20 | DECLINED BY THE ORCHESTRATOR | Dates are still written in UTC at `features/campaigns/launch-model.ts:194, 204`, `campaign-page-model.ts:181`, `copy/home-messages.ts:195`. Recorded as a follow-up outside PRD-009 in ledger row MKR-008. The results card still writes "UTC" beside a time, so it is honest; the bare dates remain a known edge. |
| W-21 | RESOLVED | `copy/ads-library-messages.ts:28-38` (`topicInSentence`: "refinance", "first-time buyers", "VA loans" keeps its capitals). |
| W-22 | RESOLVED | One source: `launch-messages.ts:23-29` (topics), `:43` (Sample ad), `:45-46` (empty library); `home-messages.ts:7, 39, 43, 181` import them. No second copy remains in `apps/web/src`. |
| W-23 | RESOLVED | `features/shell/model/display-name.ts:12-31`; read by `features/overview/model/home-view.ts:4, 30` and `app-shell.tsx:26, 287-290`. |
| W-24 | RESOLVED | `home-messages.ts:122` (`subject: "your brand details"`). |

### Pass 2 (W-25 to W-37)

| ID | Status | Final string and where |
|---|---|---|
| W-25 | RESOLVED | `copy/launch-messages.ts:194-202`: "Launching on Facebook isn't turned on yet, and it needs Meta connected. " + link "See what's needed for Meta" + ".". Leads line `:176`; "turned on" row `:201`. One component, `features/campaigns/components/launch-sentence.tsx:16-47`, drawn by `launch-on-facebook.tsx:34` and `campaign-header-actions.tsx:48`, so the two screens cannot drift. |
| W-26 | RESOLVED | `launch-review.tsx:142-146` (failed checks first) and `:220-229` ("Needs changes:" in visible text, "Passed:" visually hidden with a check icon); constants `launch-messages.ts:140-141`; style `launch.module.css` (`.ruleList`, `.ruleNeedsChanges`). |
| W-27 | RESOLVED | `user-messages.ts:122-126` ("...contact support and give them the support reference below."), rule written once at `:253-256`, drawn by `features/shell/components/support-details.tsx:53-62`; the refusal is kept whole and `SupportReference` is rendered at `launch-flow.tsx:446` and `use-new-version.tsx:117`. See N-4 for a wording gap that remains. |
| W-28 | RESOLVED | `copy/user-language.ts:41-42` (metric source), `:54-55` (next step), `:242-243` (approval outcome). `CAMPAIGN_SAVED_NOTICE` is deleted. See N-2 for sibling rows the pass did not list. |
| W-29 | RESOLVED | `launch-messages.ts:216-219` ("so this version can't be approved"). |
| W-30 | RESOLVED | `user-messages.ts:91-94` ("Choose another ad. Check the words, budget and area before you save."); the silent fall back now says `AD_NOT_IN_LIBRARY_NOTICE` (`launch-messages.ts:41`, drawn at `launch-flow.tsx:546`). |
| W-31 | RESOLVED | `launch-flow.tsx:569` adds the visually hidden `useThisAdSuffix(card.name)` to every "Use this ad". |
| W-32 | RESOLVED | `launch-messages.ts:245` ("Marked as a housing ad for Meta"), `:249` ("Words are within this ad's length limit"), `:252` ("No numbers in the words, except your NMLS number"). |
| W-33 | RESOLVED | "Dates" at `campaign-page-messages.ts:42` and `launch-messages.ts:153`; "Where it shows" at `campaign-page-messages.ts:161`; "Library ad" at `launch-messages.ts:150`; run line "Set to run from ..." at `campaign-page-messages.ts:111-112`; Home "Set to run ..." at `home-messages.ts:200`; approve explanation "where the ad shows" at `campaign-approval-controls.tsx:295`. |
| W-34 | RESOLVED | `launch-messages.ts:57-59` ("..., library version 3."). |
| W-35 | RESOLVED | `launch-messages.ts:68-70` (empty-name line and "Add in Brand"), chosen at `launch-flow.tsx:332` and `:519`; the feed header shows `BAND_PLACEHOLDER` at `ad-feed-preview.tsx:42`. |
| W-36 | RESOLVED | `shell-messages.ts:36-39`: the owner reads "Write down which page you were on."; everyone else is pointed at the owner. This is the interim pass 2 itself specified; the final form waits on the same address as W-12. |
| W-37 | RESOLVED | `user-messages.ts:113-121`: both sentences now name "Open this campaign from Campaigns", which is true on step 3 and on the campaign page. This is pass 2's copy-only option; the cleaner fix (draw the library notices on step 3) was not taken and is not needed. |

### Guard gaps

| Gap | Status | Evidence |
|---|---|---|
| 1. Error-code coverage | RESOLVED | `user-messages.unit.test.ts:54` (`RECORD_VALUE_CODE`, read in the collector at `:81`) and a named list of the four codes (`:61`, `:108`). The new pattern only sees record values that start `LIBRARY_AD_`, so a future record-value code with another prefix would not be seen. Acceptable today because the four are also named. |
| 2. `packages/domain/src` | RESOLVED | `forbidden-vocabulary.test.ts:61` adds the root; `:72` adds `packages/contracts/src/ad-places.ts`; `:383-385` assert the files are scanned. The seven strings pass 2 listed are rewritten as it proposed (`campaign-foundation.ts:381, 391, 443, 459, 549, 597, 610`). |
| 3. Fixtures a signed-in page renders | RESOLVED | `connections-review-surface.integration.test.tsx:142` (the page's whole text held to the user-language contract with no allowance) and `:155` (the four capability labels and purposes pinned). See N-2 for what the page still says. |

## 2. The amendments

Criterion count: **109 sub-PRD criteria plus 11 module criteria is 120.** Counted by row id (`^| 009[A-G]-AC-`) at `6e0de10` (109), `e86e1ca` (109) and `8b283a5` (109), and by `^| MTK-0` rows in the index (11 at both ends). Ten criterion rows were edited between `6e0de10` and `8b283a5` (009B-AC-007, 009B-AC-009, 009D-AC-003, 009D-AC-005, 009D-AC-014, 009D-AC-016, 009E-AC-009, 009E-AC-011, 009E-AC-012, 009F-AC-008); none was added or removed. No test column changed.

| Document | Note exists | Names the new wording | Meaning beyond wording |
|---|---|---|---|
| `prd-009b-...` | Yes: D2 (pass 1), D2 (pass 2, no-ads intro), 009B-AC-007, 009B-AC-009 | Yes: intro, Meta item, "See what's needed for ...", "your brand details", Running now body | One added case: the no-ads intro. It follows 009C-AC-012, which is unchanged. Acceptable. |
| `prd-009d-...` | Yes: D3 ("Brand color"), D7 rows 1 and 4, 009D-AC-003, 005, 014, 016, Amendments entry | Yes | 009D-AC-005 adds the empty-name case. Wording and one added case; the filled case is unchanged. Acceptable. |
| `prd-009e-...` | Yes: D4, 009E-AC-009, 011, 012, Amendments entry | Yes: "Open house tool", "Dates", the empty-library sentence | 009E-AC-011 adds the empty-library variant, as pass 1 W-10 asked. Acceptable. |
| `prd-009f-...` | Yes: D-8 item 4, 009F-AC-008, Amendments entry | Yes: both reworded section 5 rows and the approval outcome | Wording only. |
| `design/00-direction.md` | Yes: sections 4.2, 6.3, 8 and 9 (eight dated notes) | Yes | Wording only. One gap, N-6: line 529 still lists the column "Runs" with no note beside it. The criterion (009E-AC-009) carries the amendment and outranks the design. |
| User-language contract | Yes: v1.2 header, section 4 row (provider publication), section 5 rows (metric source, next step), Changelog section | Yes | Wording only. Rows "A locked navigation item" and "Who does that step" still say "once your accounts are connected" and "once you connect"; see N-2. |
| Index change log | Yes: pass 1 and pass 2 entries | Yes: lists each document touched | Both end "No criterion was added or removed; the total stays 120", which I confirmed above. |

## 3. New findings (strings that changed after pass 2, plus gaps the fixes left)

The whole of `git diff e86e1ca..8b283a5 -- apps/web/src packages` was read, non-test files in full. Nothing in it is BLOCKING.

### N-1 (ADVISORY). Five signed-in pages still share the default tab title

- **Where:** `app/(authenticated)/settings/connections/page.tsx`; the catch-all `app/(authenticated)/[...workspacePath]/page.tsx`, which serves `/partners`, `/settings`, `/settings/routing` and `/settings/billing` (`features/workspace/model.ts:13-18`). Homeowner pages are also untitled but sit outside PRD-009's menu. `copy/page-titles.ts:29-38` and `page-titles.unit.test.ts` cover only the seven pages pass 1 named.
- **Current:** each of those tabs reads "Automated LO". Connections is the page every "See what's needed" link opens, and "Realtor partners" is a menu item.
- **Proposed:** add `connections: "Connections"`, `settings: "Settings"`, `partners: "Realtor partners"`, `routing: "Where new leads go"`, `billing: "Plan and usage"` to `PAGE_TITLES` (the page headings already use these names), set them from the catch-all with `generateMetadata` keyed on `workspaceRoutes`, and add each to the unit test.
- **Rule:** the contract's opening paragraph (page titles are governed copy); WCAG 2.4.2.

### N-2 (ADVISORY). The Connections page still says "No effect until you connect." above a sentence that says connecting isn't available

- **Where:** `copy/user-language.ts:97` (`ACCESS_NO_EFFECT_YET`), drawn as "What it affects" for each capability on `permission-screen.tsx` through `server/authenticated-workspace-data.ts:95, 349`; also `:81` and `:89` (group label "Access this app confirms after you connect" with the chip "Confirmed", beside "Nothing checked yet.").
- **Current:** "What it affects: No effect until you connect." then, on the next line, "What to do next: Connecting HighLevel and Meta isn't available in the app yet." The first reads as a promise that connecting will have an effect; the second says no one can connect. Same family as W-28, one row up on the page W-28 fixed. The contract rows "A locked navigation item" (`user-language.ts:58`) and "Who does that step" (`:65`) carry the same "once you connect" pattern; I did not establish that any PRD-009 screen reaches them.
- **Proposed:** `ACCESS_NO_EFFECT_YET`: "No effect yet. Nothing is connected." Leave the group labels, which say what each group means. If either contract row is ever reached, use "Not available yet. It needs HighLevel and Meta connected." Amend the contract row for the one that ships (v1.3).
- **Rule:** contract section 5 rules 2 and 3; section 2 rule 3.
- **Pinned by:** `connections-review-surface.integration.test.tsx` reads the labels it pins at `:155`; it does not pin this sentence, so it can change freely.

### N-3 (ADVISORY). The save-conflict and reload sentences name a button label the second Brand card no longer has

- **Where:** `features/http/user-messages.ts:36` and `:48`; `server/workspace-preferences.ts:164` and `:240`; `features/workspace/use-workspace-preferences.ts:32, 37, 43`. The Brand page now has "Load latest saved details" on card 1 and "Load latest saved ad settings" on card 2 (`preference-editors.tsx:145, 471`), made distinct for D-4.
- **Current:** after a conflict on the ad settings card, the person reads "Load the latest saved details before trying again", and after pressing "Load latest saved ad settings" reads "The latest saved details are loaded." The sentence names a label that is not on that card (pass 2's rule: a fix names the label the person sees).
- **Proposed:** "Another tab saved newer changes. Your edits are still here. Load the latest saved version of this card before trying again." (`workspace-preferences.ts:164`); "Keep a copy of your edits, then load the latest saved version of this card before trying again." (`user-messages.ts:36`); "Load the latest saved version of this card before making another change." (`:48`); "The latest saved version is loaded." (`use-workspace-preferences.ts:37`); "The saved version could not be confirmed." and "The saved version could not be read. Your edits are still here." (`:32`, `:43`). "Check the saved details before trying again" (`workspace-preferences.ts:240`) becomes "Check the saved version before trying again."
- **Pinned by:** not checked; search the Brand and partners tests for the old sentences before changing them. The partners page keeps "Load latest saved details", so its sentences can keep "details"; the shared wording above works for all three cards.

### N-4 (ADVISORY). "The support reference below" points at a collapsed region

- **Where:** `user-messages.ts:125` (`CAMPAIGN_PREFLIGHT_FAILED`), the rule at `:242` and `:253-256`; `support-details.tsx:20-35` (the reference sits inside a `<details>` that is closed by default, contract section 6).
- **Current:** "...contact support and give them the support reference below." Under it the person sees a closed line "Details for support", not a reference.
- **Why:** pass 2's own proposal for W-27 had this gap; the sentence now has something below it, but not something it can be read from without opening it.
- **Proposed:** "Try again. If it keeps happening, contact support and give them the reference in Details for support, below." Change `POINTS_AT_REFERENCE` to match "Details for support" and keep the unit test that every sentence containing the pointer belongs to a code `showsSupportReference` returns true for.
- **Rule:** contract section 5 rule 3; section 6.

### N-5 (NIT). "any more" reads British

- **Where:** `user-messages.ts:92` and `copy/launch-messages.ts:41` ("isn't in the library any more"). American usage for "no longer" is "anymore". Same family as W-14.
- **Pinned by:** `user-messages.unit.test.ts` ("tells a person whose ad has left the library...") and `launch-flow.integration.test.tsx` pin the strings.

### N-6 (NIT). Old words left in a comment and the design record

- `features/campaigns/components/campaign-list.tsx:28` lists the column as "Runs" in a doc comment. `design/00-direction.md:529` lists "Runs" with no dated note beside it. The mockups under `design/mockups/` (`campaign-detail.html:551` "Shows to", `launch-step-2-set-up.html:537` "version 3", `launch-step-3-review-and-launch.html:557` "Ad") keep the old strings; pass 2 already ruled the mockups design records. Fix the comment; add one dated line under the design's section 8 table bullet.

### Read in full and clean

New or changed strings read and found sound: the launch sentence and its link (W-25); the retired-ad and library notices; the feed header placeholder; the "No ads" Home intro; the step 1 gone notice; the Brand cards and their buttons; the Help split by role (the signed-out shell falls to the "ask your workspace owner" form, which is acceptable); the check list states; every rewritten domain sentence (`campaign-foundation.ts:229-255, 381-459, 549-610` and `library-ad-ruleset.ts:220`); `contracts/src/ad-places.ts` and `domain/src/library-ad-places.ts` (comments and lists only; the refusal sentence `PLACE_REFUSED` is unchanged and is the only one a person reads); the D-1 to D-3 defect fixes (a Home layout rule, a test helper, and the Michigan places fix, none of which adds a string).

## 4. Test runs

Both ran at `8b283a5`, from `C:\Users\jzfer\Projects\oalo-prd-009`, and left the worktree clean.

| Command | Result |
|---|---|
| `pnpm exec vitest run tooling/tests/unit/user-language` | 2 files passed (`forbidden-vocabulary.test.ts`, `open-house-boost-retired.test.ts`), 20 tests passed, 1.15 s. |
| `pnpm exec vitest run apps/web/src/features/http/user-messages.unit.test.ts` | 1 file passed, 20 tests passed, 0.34 s. Includes the four approve refusals by name, the W-27 rule, and the collector change. |

## 5. Checked and clean

- **No em dash or en dash** in any line added between `6e0de10` and `8b283a5` outside the `qa/` folder (0 of each by byte search over the diff).
- **No forbidden term or internal noun** in any in-scope string: the guard passes and now reads `packages/domain/src` and `packages/contracts/src/ad-places.ts`.
- **American spelling** across the copy files, features and domain sentences: the only hits for a British form were the two "any more" strings in N-5 (and "colour" in code comments).
- **Nothing says an ad is live, launched or running** as a campaign label. The remaining uses are negations and Home's pinned empty list; "Set to run" replaced the two "Runs" statements. MTK-009 holds: the three results read "Not live yet".
- **The Meta hint** still matches 009d D4 as amended by E1; no "Meta may also widen a small area".
- **Gaps in my own check:** I did not run integration, component, browser or database suites, so a test that pins one of the old strings (pass 2 listed several) is trusted from the lane notes (ledger: unit 2105, integration 607 at `a9df3ee9`), not seen by me. I did not read the dashboard preview screens, which are a local demo and not signed-in PRD-009 pages.
