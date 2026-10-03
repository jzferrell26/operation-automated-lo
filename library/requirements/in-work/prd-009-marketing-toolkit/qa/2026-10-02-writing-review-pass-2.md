# PRD-009 writing review, pass 2 (MTK-008)

> Reviewer: `technical-writing-craft-guardian` (sonnet) | Date: 2026-10-02 | Run: `claude/prd-009-marketing-toolkit` at `e86e1ca` | Mode: read-only review. No file in the worktree was edited, built or tested; this report is the only file added.
> Standards read: [user-language contract](../../../../knowledge/private/standards/user-language-contract.md) (v1.1), the source guard `tooling/tests/unit/user-language/forbidden-vocabulary.test.ts` and `apps/web/src/copy/forbidden-vocabulary.ts`, 009d D3 to D8 and 009D-AC-001 to 009D-AC-024, the pass 1 report, and the pass 1 fix lane's commits (`6451468e` to `50d57409`).
> Method note: I may not run tests in the worktree, so I ran two throwaway scripts kept outside it, in the scratchpad `w2-review` folder: `scan.mjs` copies the guard's `collectCopyStrings` and `findVocabularyHits` logic and reads the worktree; `dom/run.mts` runs a scratch copy of the domain word rules to see the exact sentences a loan officer would read. Neither writes to the worktree. Where a result below comes from them, it says so. They are an imitation of the guard, not the guard.

## Result

**13 new findings: 4 BLOCKING, 9 ADVISORY (W-25 to W-37).** MTK-008 cannot close until the four BLOCKING items are fixed or, for W-25 and W-28, the owner accepts an exception in a dated amendment (the strings are written into the PRD and the contract).

The four pass 1 items deferred to this pass (W-4, W-11, W-14, W-16) are all ADVISORY and are closed out below with final strings and pins. Guard gap 2 is answered with the exact list. Running total across both passes: 37 findings.

| Criterion | Rating | Note |
|---|---|---|
| Diataxis mode | Pass | UI strings. Each step keeps one job. |
| Inverted pyramid | Pass | Each step opens with the action; the review step leads with the ad. |
| Code discipline | Not applicable | No code examples in scope. |
| Voice and tone | Warn | Second person and plain words hold. Exceptions: W-29, W-33, W-34, W-14. |
| Reader lens | Fail | W-25 (the launch sentence still promises that connecting is enough), W-27 (an error points at a reference that is not there), W-28 (the page every "See what's needed" link opens still says "Connect ... when you're ready"). |
| Structural completeness | Warn | W-26 (the check list hides which check failed), W-27, W-35 (no state for a person with no Brand). |

### Notes for the orchestrator before the fix lane starts

1. **The pass 1 fixes I re-read hold.** I re-read the ones that touch this scope (W-1, W-2, W-3, W-6 to W-10, W-12, W-13, W-15, W-17, W-21, W-22, W-24) and the strings are in as the fix lane described; I did not run their tests. Three of them have a follow-on: W-15's "Shows in" now disagrees with three other labels (W-33); W-12's "Ask your workspace owner" is circular for the person a sign-up creates (W-36); W-1's two "make a new version" sentences name controls that exist on one page only (W-37).
2. **PRD or contract amendments the fixes need.** W-25: 009d D7 row 1 (`prd-009d-...md:127`), 009D-AC-014 (`:175`, the leads wording), `design/00-direction.md:477` and `:554`. W-28: contract section 4 (`user-language-contract.md:73`) and section 5 (`:102`, `:104`). W-14 and W-4: 009d D3 (`:62`, "Brand colour") and 009D-AC-003 (`:164`). W-33: 009E-AC-009 (`prd-009e-...md:66`, the column "Runs"). W-35: 009D-AC-005 (`prd-009d-...md:166`).
3. **The guard imitation is clean over every scanned root.** Run over `apps/web/src/{app,copy,features,server/email,server/homeowners}`, `packages/application/src` and `packages/ui/src/components`, minus the guard's own exclusions, it reports no hit. The fix lane did not introduce a forbidden term.

## BLOCKING

### W-25. The launch sentence and its link still promise that connecting Meta is enough, and send people to a "connect" that does not exist

- **Where:** `apps/web/src/copy/launch-messages.ts:153-158` (`LAUNCH_SENTENCES.metaNotConnected`), drawn by `apps/web/src/features/campaigns/components/launch-on-facebook.tsx:38-43` (step 3, the "Launch" card) and, with its own copy of the same three-part markup, by `campaign-header-actions.tsx:17-26` (the campaign page header). Also `launch-messages.ts:141` (`LEADS_NOT_CONNECTED`) and `:160-161` (`notTurnedOn`).
- **Current:** "Meta isn't connected yet, so connect it in Settings to launch this ad." with "connect it in Settings" a link to `/settings/connections`. This is the only launch sentence a person ever reads: the product always passes `metaConnected: false` (`launch-review.tsx:267`, `persisted-campaign-screen.tsx:148`), so the other three rows are never shown.
- **Why it is wrong:** it fails all three points of the pass 1 decision. It says connecting is the missing step, when launching stays off even with both accounts connected (`launch-model.ts:232-236`, `design/00-direction.md:477`). It names an action, "connect it in Settings", that has no control: the page it links to says "Nothing is connected from this page" (`permission-screen.tsx:28`), and Home no longer says "Connect". And it sits beside the "Approved" card, so a person who has just approved is told they are one step from launching.
- **Proposed (three parts, so the link stays a link):**
  - `before`: "Launching on Facebook isn't turned on yet, and it needs Meta connected. "
  - `link`: "See what's needed for Meta"
  - `after`: "."
  - Rendered: "Launching on Facebook isn't turned on yet, and it needs Meta connected. See what's needed for Meta." The link still goes to `/settings/connections`. It says what Home's intro says (`home-messages.ts:53`) and uses Home's own link words, so one fact has one voice.
  - `notTurnedOn` (`:160-161`): "Launching on Facebook isn't turned on yet. Nothing has been published." It drops "for your workspace", which suggests a switch the owner can flip. No screen shows this row today.
  - `LEADS_NOT_CONNECTED` (`:141`): "Your HighLevel account. It isn't connected yet." "Once it's connected" is the same promise as the Meta sentence made.
  - Draw the sentence from one small component used by both `launch-on-facebook.tsx` and `campaign-header-actions.tsx`, so the link words cannot drift between step 3 and the campaign page.
- **Rule:** pass 1 W-2 and W-3 decision; contract section 5 rules 1 to 3; section 2 rule 3 (name what the product cannot do yet).
- **Needs a PRD amendment:** 009d D7 table row 1 (`prd-009d-...md:127`); 009D-AC-016 (`:177`, the link stays, only its words change); 009D-AC-014 (`:175`, the leads wording); `design/00-direction.md:477` and `:554`. The mockups under `design/mockups/` still show the old sentence and are design records.
- **Pinned by:** `launch-review.integration.test.tsx:164-178` (the sentence and the link name "connect it in Settings"); `persisted-campaign-screen.integration.test.tsx:113-131` (the same, on the campaign page); `tests/browser/campaign-pages.spec.ts:203-205`; `launch-review.integration.test.tsx:119` (the leads wording). `launch-model.unit.test.ts:114, 123` assert only the row's `kind` and stay.

### W-26. "See what we checked" lists a failed check as if it passed

- **Where:** `apps/web/src/features/campaigns/components/launch-review.tsx:205-214`; the rules are built at `apps/web/src/server/launch-an-ad.ts:143-160` and, for tests, `launch-flow.test-support.ts:131-136`.
- **Current:** each rule is `<li data-rule-passed={rule.passed}>{rule.name}</li>`. `data-rule-passed` is read by no stylesheet (`launch.module.css:363-378` styles the list and nothing else) and no assistive technology. With 2 of 22 checks failing, the opened list shows all 22 names in one style, each a positive statement: "No rate, payment or term claims in your words", "NMLS number on the ad", "Ends after today".
- **Why it is wrong:** the card is titled "What you approve", its badge says "Needs changes", its count says "20 of 22 checks passed.", and its list then asserts, of the check that failed, a sentence that is false. A loan officer scanning the list for the problem finds it worded as an achievement. The "What to fix" card lists fix sentences, not which named check they belong to, so nothing ties the two.
- **Proposed:** say the state in words next to each name; do not rely on colour or an icon alone. Add two constants beside `SEE_WHAT_WE_CHECKED`: `RULE_PASSED = "Passed"` and `RULE_NEEDS_CHANGES = "Needs changes"`. A failed item reads "Needs changes: No financing terms" (the state in visible text, failed items first). A passed item shows a check icon (decorative) and a visually hidden "Passed: " before the name, so it reads the same to a screen reader.
- **Rule:** contract section 2 rule 7 (honesty is a tone rule); section 5 rule 1 in spirit (never present as fine what is not); WCAG 1.3.1 and 1.4.1. 009D-AC-014 says the list "names each rule in plain words" and states no per-rule state, so no amendment is needed.
- **Pinned by:** `launch-review.integration.test.tsx:84-94` (22 list items, two names), `:96-100` (the needs-changes count); `launch-flow.test-support.ts:131-136`; `launch-model.unit.test.ts:161-172`. Add a case: with one failing rule, its item says "Needs changes" and every other item has "Passed" in its accessible text.

### W-27. A refused "Save and check" points at a reference that is not on the page

- **Where:** `apps/web/src/features/http/user-messages.ts:116-119` (`CAMPAIGN_PREFLIGHT_FAILED`); `launch-flow.tsx:263-266` and `:270-272` (the refusal is read, but only `refusal.code` is kept); `apps/web/src/features/shell/components/support-details.tsx:48-51` (`SupportReference` returns nothing for any mapped code); `user-messages.ts:216-219` (the generic pair).
- **Current:** after a failed save the person reads: "We couldn't save this version. Nothing was saved. We couldn't finish the checks on this campaign. Try again. If it keeps happening, contact support with the reference below." Nothing is below. Step 2 renders no support reference at all, and `SupportReference` would not show one for this code if it did, because `CAMPAIGN_PREFLIGHT_FAILED` is mapped and the component shows a reference only for unmapped codes. The same step, for an unmapped code, says "Something went wrong on our side. Try again, and contact support if it keeps happening." and shows no reference either, which contract section 7 requires ("An unmapped code renders a generic sentence plus the support reference").
- **Why it is wrong:** an instruction the reader cannot follow, on the failure path of the main action of the flow, when support most needs something to look up. Pass 1 W-12 covered "contact support" with no channel; this one is worse, because the sentence names a thing on the page that is not there.
- **Proposed:** sentence: "Try again. If it keeps happening, contact support and give them the support reference below." Keep the whole refusal in `LaunchFlow` state, not just the sentence, and render "Details for support" with the reference under the status for this code and for every unmapped code. The one rule to write down: `SupportReference` also shows for a mapped code whose own sentence points at the reference. A unit test can assert it: any sentence that contains "reference below" belongs to a code the component shows a reference for.
- **Rule:** contract section 5 rule 3, section 6 (a reference lives in Details for support), section 7.
- **Pinned by:** no test pins the sentence. `user-messages.unit.test.ts:95-114` (every emitted code is mapped, and the four approve codes) is unaffected; `launch-flow.integration.test.tsx:394-404` (a refused save, first sentence only) should grow a case for `CAMPAIGN_PREFLIGHT_FAILED` and one for an unmapped code that find "Support reference".

### W-28. The page every "See what's needed" link opens still says "Connect HighLevel and Meta when you're ready"

- **Where:** `apps/web/src/copy/user-language.ts:43-44` (`NOT_CONNECTED_NEXT_STEP`), set on each capability at `apps/web/src/server/authenticated-workspace-data.ts:350` and drawn at `apps/web/src/features/onboarding/components/permission-screen.tsx:61` ("What to do next"), four times, one per capability. Also `user-language.ts:231-232` (`CAMPAIGN_NOT_AN_AD_YET`, the approval outcome at `campaign-approval-controls.tsx:231`) and `:36-37` (`NOT_LIVE_METRIC_SOURCE`, reached by no PRD-009 screen today).
- **Current:** the Connections page opens with a notice, "Nothing is connected from this page" (`permission-screen.tsx:28`), and then each card ends "What to do next: Connect HighLevel and Meta when you're ready. Nothing here changes until you do." The approval outcome reads "Approved. This campaign won't run as an ad yet. HighLevel and Meta aren't connected."
- **Why it is wrong:** the same defect as W-3, one click on. Home now says "See what's needed" and W-25 will make the launch sentence say it, but the page those links open tells the reader to connect when ready, with no control and no route in PRD-009 (its non-goal is "Making HighLevel or Meta connections work"). Home's own test already refuses this sentence (`overview-screen.integration.test.tsx:436`). And the approval outcome names the accounts as the only reason, when launching is off even with both connected.
- **Proposed:**
  - `NOT_CONNECTED_NEXT_STEP`: "Connecting HighLevel and Meta isn't available in the app yet. Nothing here changes in the meantime." Contract section 2 rule 3 asks the product to name what it cannot do yet.
  - `CAMPAIGN_NOT_AN_AD_YET`: "This campaign won't run as an ad yet. Launching isn't turned on, and HighLevel and Meta aren't connected." `CAMPAIGN_SAVED_NOTICE` (`:233-234`) has no caller; change it with this one or delete it.
  - `NOT_LIVE_METRIC_SOURCE`: "Not live yet. Spend and leads can't show here until Meta and HighLevel are connected." A necessary condition, not a promise.
- **Rule:** the pass 1 decision; contract section 5 rules 2 and 3; section 2 rules 3 and 7.
- **Needs a contract amendment (v1.2):** section 4 row `user-language-contract.md:73`; section 5 rows `:102` and `:104`; and 009F-AC-008 and D-8 where they quote them.
- **Pinned by:** `authenticated-workspace-data.unit.test.ts:30-32` (the literal); `user-language.unit.test.ts:166-177` (each connection sentence must match `HighLevel and Meta`); `tests/browser/review/top-bar.spec.ts:50-66` (reads the constants, follows them); `overview-screen.integration.test.tsx:436` (absent from Home, follows); `campaign-approval-controls.integration.test.tsx:257, 291` and `tests/browser/review/review-campaign-decision.spec.ts:151` (the approval outcome).

## ADVISORY

### W-29. The retired-ad notice says "draft" where every other sentence says "version"

- **Where:** `launch-messages.ts:176-178` (`adRetiredNotice`), drawn on step 3 (`launch-review.tsx:334`) and, through `campaign-library-notices.tsx:34`, on the campaign page.
- **Current:** "This ad was taken out of the library on Oct 1, 2026, so this draft can't be approved. Your budget, dates and area are kept."
- **Proposed:** "...so this version can't be approved. Your budget, dates and area are kept." The sibling sentences already say version: `NOTICES.missingUndecided` (`campaign-page-messages.ts:226`) and the W-1 pair (`user-messages.ts:101, 105`). A saved, checked thing that a person approves is a version everywhere else; "draft" is a fourth name.
- **Rule:** one idea, one word (contract section 2 rule 2; pass 1 W-7).
- **Pinned by:** `launch-review.integration.test.tsx:337-340`; `persisted-campaign-screen.integration.test.tsx:394-397`.

### W-30. When the chosen ad has left the library, the sentence promises words and budget that are not kept, and a reload says nothing

- **Where:** `user-messages.ts:91-94` (`LIBRARY_AD_NOT_AVAILABLE`), shown by step 2 (`launch-flow.tsx:265`) and by "Use the new version" (`use-new-version.tsx:59`); the silent fall back is `launch-flow.tsx:198`.
- **Current:** "We couldn't save this version. Nothing was saved. This ad isn't in the library any more, or a newer version replaced it. Go back to Choose an ad and pick it again. Your words and budget are kept." Two faults. "Pick it again" cannot work if the ad was taken out. "Kept" is untrue for a new campaign: the drafts are held per ad (`launch-flow.tsx:216-217`, key `new:<ad id>`), so a person who picks a different ad starts from that ad's own words and the default budget. And on the campaign page, where "Use the new version" shows this same pair, there is no "Choose an ad" to go back to.
- **Proposed:** keep the first sentence; replace the second and third: "Choose another ad. Check the words, budget and area before you save." True in both places ("Choose another ad" is the link on the campaign page notices and the title of step 1).
- **Also:** a step 2 address whose `?ad=` names an ad that has left the library shows step 1 with no explanation (`launch-flow.tsx:198`, `card === undefined`). Add one sentence above the chips when that happens: "That ad isn't in the library any more. Choose another ad."
- **Rule:** contract section 5 rule 3, and honesty (section 2 rule 7).
- **Pinned by:** `launch-flow.integration.test.tsx:394-404` and `use-new-version.integration.test.tsx:157-169` assert only the first sentence and the "Nothing was saved" lead, so both pass unchanged. No test covers the silent fall back.

### W-31. On step 1 every "Use this ad" button has the same name

- **Where:** `launch-flow.tsx:515-519`. The library tab gives the same card the name "Use this ad: First home, start here" with a visually hidden suffix (`ads-library-browser.tsx:78-81`, `useThisAdSuffix`).
- **Current:** with 8 ads, a screen reader's list of buttons reads "Use this ad" eight times; only the surrounding article says which.
- **Proposed:** the same suffix on step 1: `{USE_THIS_AD}<span className="oalo-visually-hidden">{useThisAdSuffix(card.name)}</span>`. One card, one action, one name, on both screens.
- **Rule:** contract section 1 and 2 (the reader), WCAG 2.4.6; consistency with the library tab.
- **Pinned by:** `launch-flow.integration.test.tsx:91, 108, 139, 171` (exact name `"Use this ad"`: change to `/^Use this ad/u`); `tests/browser/helpers/launch-an-ad.ts:39`; `tests/browser/dashboard-preview.spec.ts:43`. The topic chips ("Refinance 2") are left alone: `tests/browser/ads-library.spec.ts:97, 111, 116` pin the name as written and D-17 draws them that way.

### W-32. Two names in "See what we checked" do not say what the check does

- **Where:** `launch-messages.ts:204` (`META_HOUSING_CATEGORY_REQUIRED`) and `:211` (`WORDS_NUMBER`).
- **Current:** "Runs as a housing ad on Meta" and "No numbers that state rates, payments or terms".
- **Why:** the first says an ad "runs", on the card where nothing can, and means nothing to a loan officer who has never chosen a Meta category. The second says less than the rule does: the rule refuses every digit in the headline, ad text, title and lead form wording (009d D5), so "Top 10 tips" fails a check whose name says it is about rates.
- **Proposed:** "Marked as a housing ad for Meta" and "No numbers in the words, except your NMLS number". Parallel wording across the list is also worth a pass: "Words within this ad's length" (`:208`) reads clipped; "Words are within this ad's length limit" matches "Images are large enough" (`:199`).
- **Rule:** plain words (contract section 2 rule 2); PRD-009's rule that nothing says an ad runs.
- **Pinned by:** `launch-model.unit.test.ts:171-172` pins the key set and one name (`WORDS_PRIVATE_INFO_REQUEST`); no test pins these two.

### W-33. One fact, several names, after the W-15 fix

- **Where and current:**

| Fact | Names in use | Where |
|---|---|---|
| Where an ad shows | "Where it shows" | `launch-messages.ts:78` (step 2 section), `:124` (step 3 fact); `campaign-page-messages.ts:42` (list column), `:55` (phone card) |
| | "Shows in" | `campaign-page-messages.ts:152` (campaign page, set by W-15); `launch-messages.ts:93` ("Shows in: the Facebook feed.", the placement only) |
| | "where the ad runs" | `campaign-approval-controls.tsx:295` |
| When it runs | "Runs" | `launch-messages.ts:123` (step 3 fact), `campaign-page-messages.ts:41` (list column), `home-messages.ts:188` |
| | "Dates" | `campaign-page-messages.ts:54` (phone card, set by W-9) |
| | "Runs from launch until Oct 20, 2026, in Austin, TX." | `campaign-page-messages.ts:105-106` (the line under the campaign page's title) |
| The library ad's row | "Ad" | `launch-messages.ts:120` (step 3) |
| | "Library ad" | `campaign-page-messages.ts:149` (campaign page) |

- **Why:** a loan officer sees one list column called "Runs" and, on the phone, the same fact called "Dates". The campaign page's lead says "Runs from launch until..." directly above a Results card that says "This ad isn't running". The W-15 fix aligned the campaign page to step 2's "Shows in", but that label names only the feed, while four other places use "Where it shows" for the whole fact.
- **Proposed:**
  - "Where it shows" everywhere a fact is labelled: `AD_CARD.shows` back to "Where it shows". Step 2's "Shows in: the Facebook feed." stays (it is D4's sentence and names the placement only).
  - "Dates" for the fact: column `CAMPAIGN_COLUMNS.runs`, step 3 `FACT_LABELS.runs`, the phone card (already). Home's `homeRunDates` ("Runs Oct 6 to Oct 20", `home-messages.ts:188`) becomes "Set to run Oct 6 to Oct 20"; its other form, "Starts when you launch it, ends Oct 20, 2026", stays.
  - The campaign page lead: "Set to run from launch until Tue, Oct 20, 2026, in Austin, TX. $25 a day, up to $350 in total." It matches step 2's "Set to run for 14 days." (`launch-messages.ts:73`) and no longer states a fact the Results card denies.
  - "Library ad" on step 3 too (`FACT_LABELS.ad`), because its value says "library version 3".
  - "where the ad runs" to "where the ad shows" (`campaign-approval-controls.tsx:295`).
- **Rule:** one idea, one word (contract section 2 rule 2); PRD-009's no-running rule.
- **Needs a PRD amendment:** the column name in 009E-AC-009 (`prd-009e-...md:66`).
- **Pinned by:** `campaign-page-messages.unit.test.ts:84` ("Shows in"), `:144, 147` (the run line); `campaigns-list.integration.test.tsx:69-77` and `tests/browser/campaign-pages.spec.ts:73-74` (the column); `persisted-campaign-screen.integration.test.tsx:59, 70` and `tests/browser/campaign-pages.spec.ts:196` (the run line); `campaign-approval-controls.integration.test.tsx:391` (the approve explanation); `overview-screen.integration.test.tsx:497` (Home, the "Starts when you launch it" form, unchanged).

### W-34. "Version" means two things in the flow

- **Where:** `launch-messages.ts:47-49` (`setUpLead`) and `:42-44` (`adCardVersionLine`) against `adFact` (`:127-129`) and every "Approve this version".
- **Current:** step 2's lead reads "First home, start here. First-time buyers, version 3." The "3" is the library's version of the ad; two screens later "Approve this version" means the campaign version ("Version 1" on the versions card). Step 3 and the campaign page already say "library version 3" (`adFact`); step 2 does not.
- **Proposed:** `setUpLead`: "First home, start here. First-time buyers, library version 3." Leave `adCardVersionLine` ("Version 3. Reviewed Oct 1, 2026."): on an ad card the version can only be the ad's, and two tests pin it (`launch-flow.integration.test.tsx:152`, `ads-library-page.integration.test.tsx:244`).
- **Rule:** one idea, one word.
- **Pinned by:** no test pins `setUpLead`.

### W-35. A person with no Brand yet is told it was "added for you"

- **Where:** `launch-messages.ts:51-53` (`BRAND_CARD_LINE`, `CHANGE_IN_BRAND`); `launch-flow.tsx:453-480` (`BrandSummary`); `ad-feed-preview.tsx:38-40, 53` (the post header).
- **Current:** with no saved name, step 2 shows the placeholder "Your name and NMLS number go here", then "Added for you from Brand. The image and layout come from the library and can't be changed." and a link "Change in Brand". The feed header beside it is blank (an empty poster name and empty initials). Nothing was added, nothing is there to change, and the first "Save and check" ends in "Add your NMLS number in Brand."
- **Proposed:** when the name is empty: line "Nothing is added yet. Add your name and NMLS number in Brand before you save. The image and layout come from the library and can't be changed." and link "Add in Brand"; the feed header shows the same placeholder in place of the name.
- **Rule:** contract section 2 rule 7; section 5 rule 3.
- **Needs a PRD amendment:** 009D-AC-005 (`prd-009d-...md:166`) fixes "Added for you from Brand" and "Change in Brand" for the filled case; add the empty case.
- **Pinned by:** `launch-flow.integration.test.tsx:183-190` (the filled case, unchanged); `brand-band.integration.test.tsx:55-56` (the placeholder, unchanged).

### W-36. The Help text sends the usual new account to itself

- **Where:** `apps/web/src/copy/shell-messages.ts:30-31`.
- **Current (as W-12 was fixed):** "Questions about Automated LO? Ask your workspace owner, and tell them which page you were on."
- **Why:** a sign-up binds the new person as the workspace owner (`password-authentication-handler.ts:1018-1025`, `bindingRole: "location_admin"`). The person this product is written for is the one told to ask. The fix removed an unfollowable "Contact support" and added another instruction the usual reader cannot follow.
- **Proposed:** unchanged from pass 1 W-12: "Questions about Automated LO? Email <support address> and tell us which page you were on." It needs one fact from the owner, the address, and the fix lane should not invent it. Until then, leave the sentence for non-owners and show an owner no instruction: "Questions about Automated LO? Write down which page you were on." is true and promises nothing.
- **Rule:** contract section 5 rule 3.
- **Pinned by:** `apps/web/src/app/(authenticated)/top-bar-menu.integration.test.tsx:259-262`.

### W-37. Two approve refusals name a control that only the campaign page has

- **Where:** `user-messages.ts:108-115` (`LIBRARY_AD_REPLACED`, `LIBRARY_AD_ART_CHANGED`), added for W-1.
- **Current:** "Use the new version of the ad, then approve that one." and "Make a new version from the ad, then approve that one." The approve control also renders on step 3 (`launch-review.tsx:386-397`), which shows no library notices: no "Use the new version" and, in the ready state, no "Make a new version". The nearest control there is "Change" (`launch-review.tsx:217-219`).
- **Proposed:** the clean fix is not copy: draw `CampaignLibraryNotices` on step 3 as well, so the controls the two sentences name are on both pages and the sentences stand as written. If the owner wants copy only, name the page that has them: "Open this campaign from Campaigns, use the new version of the ad, then approve that one." for `LIBRARY_AD_REPLACED`, and "Open this campaign from Campaigns, make a new version, then approve that one." for `LIBRARY_AD_ART_CHANGED`.
- **Rule:** contract section 5 rule 3; section 7.
- **Pinned by:** `user-messages.unit.test.ts:108-114` asserts only that the four approve codes map and that the sentence contains "can't be approved." The two sentences are free.

## Pass 1 items deferred to this pass

### W-4 (ADVISORY, final). The Brand page: one idea under three names

- **Where:** `apps/web/src/features/workspace/preference-editors.tsx:111` (`<h2>Your report identity</h2>`), `:114-118` (body), `:133` ("Save report branding"), `:95` (the validation line), `:409` ("Your brand on ads"), `:458` ("Save ad brand"), `:483-486` (the preview card's text); labels at `apps/web/src/features/homeowners/builder.tsx:57, 65`.
- **Current:** Home's "Add your brand details" lands on a page titled "Brand" whose first card is headed "Your report identity" with the button "Save report branding", and whose second card, "Your brand on ads", says its name and NMLS "come from your report identity". The checks then say "Add your NMLS number in Brand." and "Correct your company's NMLS number in Brand", while the fields are "Loan officer NMLS" and "Company NMLS". The save refusal says "license numbers".
- **Correction to pass 1:** pass 1 proposed the heading "Your name and NMLS details". That card also holds company, email, phone and tagline, which only homeowner reports use, so the heading is too narrow. Use "Your details".
- **Proposed:**
  - Card 1 heading "Your details". Body, reports off: "Saved for your account in this workspace. Your name, company and NMLS numbers go on every ad. All of it goes on new homeowner reports once those are turned on." Reports on: "Saved for your account in this workspace. Your name, company and NMLS numbers go on every ad, and all of it is used when you create a new homeowner report." Button: "Save your details".
  - Card 2 keeps its heading. Button: "Save ad settings". Preview text: "Your name, company and NMLS numbers come from Your details above."
  - Labels: "Loan officer NMLS" to "Your NMLS number"; "Company NMLS" to "Company NMLS number".
  - Validation line (`:95`): "Check the name, company, email and NMLS numbers before saving. Each NMLS number has 4 to 12 digits."
  - Fix sentence `library-ad-ruleset.ts:220`: "Add the Equal Housing line to your disclosure line in Brand." (the field is "Disclosure line").
- **Rule:** one idea, one word (contract section 2 rule 2); a fix sentence names the label the person sees.
- **Pinned by:** `brand-page.integration.test.tsx:100, 103, 124, 187`; `ad-brand-editor.integration.test.tsx:102, 131, 149, 156` (button), `:162-163, 169` (labels); `tests/browser/review/launch-an-ad.click-count.spec.ts:64-70`; `tests/browser/review/review-campaign-decision.spec.ts:268`; `tests/browser/review/workspace-pages.spec.ts:138-158, 265`; `tooling/tests/unit/library-ad-checks/library-ad-ruleset.test.ts:195` (the Equal Housing sentence). The labels are shared with the homeowner report builder.

### W-14 (ADVISORY, final). British spelling for American readers

- **Where:** `preference-editors.tsx:411` ("with the title, colour and disclosure line") and `:426` (`label="Brand colour"`).
- **Proposed:** "color" in both. Every other string in the product is American (NMLS, Realtor, dollars).
- **Needs a PRD amendment:** 009d D3 (`prd-009d-...md:62`, "**Brand colour**") and 009D-AC-003 (`:164`, "each colour preset").
- **Pinned by:** `ad-brand-editor.integration.test.tsx:60, 88, 112` (`/Brand colour/u`). Test names at `:110` and `ad-brand.unit.test.ts:41, 42, 81` say "colour" in titles only; not user-facing.

### W-11 (ADVISORY, final). Realtor partners: a stale link name, and an empty state that contradicts the line above it

- **Where:** `preference-editors.tsx:218-221` (the note), `:269-272` (the empty body), `:279-281` (the link); `workspace-screen.tsx:9`.
- **Current:** the page says "Your ads show only you. Realtor partners never appear in paid ads." Its empty state says "Keep your partner's details ready for the next campaign. Nothing is imported from HighLevel." and the link is "Create a campaign". The note says adding a partner "does not confirm permission to use their materials", the old open house permission idea; PRD-009 has no such step.
- **Proposed:** empty state: "Keep your Realtor partners' details in one place. Nothing is imported from HighLevel, and partners never appear in your ads." Link: "Launch an ad". Note: "Your Realtor partner list is saved to this account and workspace. Adding a partner sends no invitation." What this page is for is still open question D-20; these fit its default, "a plain list with one honest line". One true use exists today: the ad checks refuse a saved partner's name inside an ad's words (`features/ads-library/server/library-ad-ruleset.ts:17-20`), so the owner may prefer to add "Their names are also checked, so they can't end up in an ad."
- **Rule:** one idea, one word (D-16 names the flow "Launch an ad"); contract section 2 rule 3.
- **Pinned by:** nothing found.

### W-16 (ADVISORY, final). Fix sentences and descriptions a library ad can reach

**What a person can read.** Only `remediation` is drawn: `launch-review.tsx:367` and `apps/web/src/server/campaign-page-data.ts:222`. `description` is stored and returned by the save (`campaign-preflight-handler.ts:56-62`, `launch-an-ad.ts:167`) and drawn by no screen for a library ad (the local preview draws its own fixture findings, `dashboard-preview/workspace-screens.tsx:741`). A campaign saved before PRD-009 shows no "What to fix" card at all (`EarlierFlowScreen`, `persisted-campaign-screen.tsx:198-258`, has no `Fixes`; only `LibraryAdScreen` draws it, `:172`), so the open house fixes are unreachable too.

**What a library ad can raise from the screens.** I ran the domain word rules on 16 inputs (the sentences below are exact output). All read plainly and name the field:

- "Take 'low rates' out of the headline. Ads can't state rate claims."
- "Take '$1,200 a month' out of the ad text. Ads can't state payment claims."
- "Take 'realtor' out of the ad text. Paid ads show only you."
- "Take 'Jane Doe Realty' out of the company name in Brand. Paid ads show only you."
- "Take the web address out of the disclosure line in Brand. Paid ads show only you."
- "Take 'ssn' out of the ad text. Ads can't ask for private details."
- "Take out the hidden or special characters in the headline."

No change. One phrase can raise two lines ("Only 3.5% down" gives a rate line and a "Take the number out" line), which is by D5's design and left as it is. The sentences that need work:

| Rule | Where | Current | Proposed |
|---|---|---|---|
| `BRAND_BANNED_PHRASE` (reachable: "guaranteed approval", "no credit check") | `campaign-foundation.ts:323` | "Remove the prohibited phrase: guaranteed approval" | "Take 'guaranteed approval' out of the headline or ad text. Ads can't make promises like that." |
| `EQUAL_HOUSING_REQUIRED` (reachable) | `library-ad-ruleset.ts:220` | "Add the Equal Housing line to your disclosure in Brand." | "Add the Equal Housing line to your disclosure line in Brand." |
| `NMLS_NUMBER_REQUIRED` (reachable) | `library-ad-ruleset.ts:190, 199, 210` | "Add your NMLS number in Brand." | Unchanged once the label is "Your NMLS number" (W-4). |

**What a library ad cannot raise from the screens, but the code can** (only by bypassing the form or through a catalog fault, since `library-ad-manifest.ts:46-49, 77-79` fixes images as approved and catalog-sized and claims, tokens and terms as empty). They still carry engineering words, and `LIBRARY_AD_SHARED_FIXES` (`campaign-foundation.ts:224-232`) is the pattern for fixing them, one library variant each:

| Rule | Where | Current | Proposed (library ad) |
|---|---|---|---|
| `BUDGET_OUT_OF_BOUNDS` | `:427` | "Choose a daily and total budget within the active ruleset." | "Choose a daily budget from $5 to $1,000 and a total budget from $5 to $5,000." |
| `GHL_ROUTING_INCOMPLETE` | `:437` | "Reconnect and revalidate the selected routing objects." | "New leads need somewhere to go in HighLevel." |
| `IMAGE_NOT_APPROVED` | `:279` | "Remove or approve pending, rejected, and quarantined images." | "This ad's picture isn't approved. Choose another ad." |
| `IMAGE_QUALITY_LOW` | `:293` | "Upload an image that meets the active ruleset dimensions." | "This ad's picture is too small to use. Choose another ad." |
| `META_HOUSING_CATEGORY_REQUIRED` | `:389` | "Set the approved Housing category before launch." | "This ad isn't set up as a housing ad. Choose another ad." |
| `MERGE_TOKEN_NOT_ALLOWED` | `:336` | "Remove or approve the merge token: {{x}}" | "Take the fill-in placeholder {{x}} out of the ad." |
| `CLAIM_POLICY_BLOCKED` | `:349` | "...obtain an explicit tenant policy approval." | "Take the claim out of the ad. Only reviewed claims are allowed." |
| `FINANCING_TERMS_BLOCKED` | `:359` | "...activate an explicitly approved tenant rule." | "Take the rate, payment or loan terms out of the ad. Ads can't state them." |

Three of these, `IMAGE_NOT_APPROVED`, `IMAGE_QUALITY_LOW` and `META_HOUSING_CATEGORY_REQUIRED` ("Upload an image", "approve ... quarantined images", "Set the approved Housing category"), tell a loan officer to do something the product gives no control for (009D non-goal: no upload). `FIX_TARGETS` already sends those three to step 1 (`launch-model.ts:261, 262, 267`), which is "Choose another ad", so the proposed sentences match where "Fix it" goes.

- **Rule:** plain words and "what the user can do" (contract section 2 rule 2, section 5 rule 3); the words "tenant" and "region" are on the forbidden list.
- **Pinned by:** none of the rows above except `EQUAL_HOUSING_REQUIRED` (`library-ad-ruleset.test.ts:195`). `launch-review.integration.test.tsx:403` uses the budget sentence as fixture text only. Field names in fix sentences (`library-ad-words.ts:47-55`) are pinned at `word-checks.test.ts:318, 400, 520` and `library-ad-save.postgres.test.ts:453, 459, 473`; leave them and align the Brand labels instead (W-4).
- **Stored findings keep the sentence they were saved with** (`campaign-page-data.ts:222` reads `finding.remediation` from storage), so a rewrite changes new checks only.

## Guard gap 2: should `packages/domain/src` join `SCANNED_ROOTS`?

**Yes.** Add `"packages/domain/src"` to `SCANNED_ROOTS` (`tooling/tests/unit/user-language/forbidden-vocabulary.test.ts:48-56`) with a line in the comment above it saying why: every rule's `remediation` and `description` is written there. Add `expect(files.has("packages/domain/src/library-ad-words.ts")).toBe(true)` beside the existing `files.has(...)` assertions (`:367-391`).

**Exactly which existing strings then fail.** I applied the guard's own copy-string rules and term list to every non-test file under `packages/domain/src` (the `scan.mjs` imitation). **7 hits, all in `packages/domain/src/campaign-foundation.ts`; none in `library-ad-ruleset.ts`, `library-ad-words.ts`, `library-ad-text.ts` or `library-ad-places.ts`.** Pass 1 predicted that the open house strings "Select an approved disclosure profile version." and "Record the authorized partner attestation." would hit; they do not (neither contains a banned term). They read poorly but no screen shows them.

| Line | Rule and field | String | Hit | A person can read it? | Rewrite |
|---|---|---|---|---|---|
| `:349` | `CLAIM_POLICY_BLOCKED` remediation | "Remove the claim or obtain an explicit tenant policy approval." | tenant | No for a library ad (claims are always empty) | "Take the claim out of the ad. Only reviewed claims are allowed." |
| `:359` | `FINANCING_TERMS_BLOCKED` remediation | "Remove financing terms or activate an explicitly approved tenant rule." | tenant | No (terms are always empty) | "Take the rate, payment or loan terms out of the ad. Ads can't state them." |
| `:409` | `TARGETING_NOT_ALLOWED` description | "The first blueprint allows Meta country and region targeting only." | region | No (stored and returned, never drawn) | "Ads can be aimed at cities and states only." |
| `:425` | `BUDGET_OUT_OF_BOUNDS` description | "Campaign budget is outside the approved tenant bounds." | tenant | No (same) | "The budget is outside the allowed limits." |
| `:511` | `PAID_AD_REALTOR_IDENTITY` remediation | "Remove Realtor and brokerage identity from the lender-branded paid-ad projection." | projection | No | "Take the Realtor and brokerage names out of the ad. Paid ads show only you." |
| `:559` | `PAID_AD_IDENTITY_ASSET_NOT_APPROVED` remediation | "Use only identity assets approved for the loan officer or lender paid-ad projection." | projection | No | "Use only a logo or picture approved for your own ads." |
| `:572` | `PAID_AD_PROPERTY_ASSET_NOT_APPROVED` remediation | "Use only approved property images from the immutable campaign version." | immutable | No | "Use only the approved property pictures saved with this version." |

The last three are reached from no screen: `evaluatePaidAdBrandBoundary` has one caller, `packages/application/src/campaign-foundation.ts:168`, and no `apps/web` file imports its result (009D-AC-023 says as much).

**Rewrite, do not exclude.** The guard takes no per-line exemption; an `EXCLUDED` entry would silence the whole of `campaign-foundation.ts`, which also holds the sentences a person does read (the shared library fixes at `:229-231`), and the test at `:408-417` refuses any exclusion that calls itself temporary. None of the seven strings is pinned by a test (`launch-review.integration.test.tsx:403` uses another budget sentence as fixture text only).

**Two smaller findings from the same scan:**

- `packages/contracts/src/ad-places.ts` holds `adPlaceLabel`, the wording D4 and E2 fix ("<City, ST> and everything within 15 miles"), and is read by no root. It has no hit; add it to `SCANNED_FILES`. Do not add the whole of `packages/contracts/src`: its 6 hits are validation messages and an event name (`launch-readiness.ts:62, 65, 70`, `profile-foundation.ts:51, 57`, `durable-foundation.ts:135`), none shown to a person.
- `apps/web/src/server`, outside `email`, `homeowners` and the two listed files, has no hit except in two `*test-support.ts` files. No gap there.

## One idea, one word (the sweep after the pass 1 fixes)

| Idea | Names found | Verdict |
|---|---|---|
| The collection | "Ads library" (tab `campaign-page-messages.ts:19`, heading `ads-library-messages.ts:13`, Home eyebrow `home-messages.ts:31`, title `page-titles.ts:32`), "the ads library" mid-sentence (`launch-messages.ts:110`, `campaign-page-messages.ts:87`), "the library" in notices and errors | Consistent. No "ad library" in a rendered string. |
| The flow | "Launch an ad" on Home, the list, the library, the earlier-flow link and the Brand card (`preference-editors.tsx:488`) | One holdout: the Realtor partners link "Create a campaign" (`preference-editors.tsx:280`, W-11). |
| Brand | "Brand" (menu, page, fixes, "Change in Brand"), "your brand" (checklist, step 2) | Consistent in the product; the Brand page itself uses "report identity", "report branding" and "ad brand" (W-4). |
| Sample ad | `SAMPLE_AD_LABEL` (`launch-messages.ts:38`), read by Home (`home-messages.ts:173`) and the list | Consistent. W-22 closed. |
| See what's needed | Home, twice (`home-messages.ts:76`); the launch sentence still says "connect it in Settings" (W-25) | Open until W-25. The same page is reached by "Open connections" (`workspace-screen.tsx:63`) and "Review connections" (`:157`); each says what the person does there, so leave them. |
| With Meta, Sending to Meta | `user-language.ts:260-261` | Kept, by the orchestrator's decision. Neither is reachable from a PRD-009 screen. |
| Where an ad shows, when it runs, the library ad's row | see the table in W-33 | Mixed. |
| A saved campaign version | "version" (everywhere), "draft" (`launch-messages.ts:177`), "campaign" in "Approve this campaign"-era sentences | "Draft" is W-29. "Approve campaigns" in `launch-messages.ts:186` and `campaign-approval-controls.tsx:285` is a statement about a role and is fine. |
| The ad's own version vs the campaign's version | "version" for both | W-34. |
| Launching is off | "isn't turned on yet" (`home-messages.ts:53`, `:159`), "isn't turned on for your workspace yet" (`launch-messages.ts:161`) | Same fact, two phrasings; unified under W-25. |
| Connect | Home card titles "Connect HighLevel" and "Connect Meta" (`home-messages.ts:87, 99`) with the action "See what's needed for ..." | Left: the title names the step, the link names what the person can do. |

## "Launch an ad" read aloud

| Step | Reads aloud | Issues |
|---|---|---|
| 1, Choose an ad | "Campaigns, Launch an ad", the heading "Choose an ad", a plain lead, "Show ads about: All 8, First-time buyers 2 ...", then cards: topic, name, headline, "Version 3. Reviewed Oct 1, 2026.", "Use this ad" | W-31 (eight identical buttons), W-30 (a retired ad in the address says nothing). |
| 2, Set it up | "First home, start here. First-time buyers, version 3." "Your brand on the ad", "Ad words" with live counts, the locked "Disclosure, from your brand", "Budget and dates", "Where it shows" with the 15 mile hint, "Your ad so far" | W-34, W-35, W-30 (a refused save), W-27 (a failed save). The hint and "Shows in: the Facebook feed." match 009d D4 exactly. |
| 3, Review and launch | "This is the actual ad. Look it over, then approve it." the feed frame ("Shown as it might look in a Facebook feed"), "What you approve", "Checks passed, 22 of 22 checks passed.", the facts, "Approve this version", "Launch", the disabled "Launch on Facebook" with its sentence, "Details for support" | W-25, W-26, W-29, W-32, W-33, W-37. One nit left alone: the lead says "the actual ad" and the caption says "as it might look"; 009D-AC-009 names it "the actual ad", and the lead stays. |

## Checked and clean

- **No em or en dash** in any file in scope or changed since pass 1 (code point search over `apps/web/src`, `packages/domain|application|contracts/src`, and the docs the fix lane touched).
- **No forbidden term or internal noun** in any in-scope string: `launch-messages.ts`, the `launch-*.tsx` files, `ad-library-cards.tsx`, `brand-band.tsx`, `ad-creative.tsx`, `ad-feed-preview.tsx`, `ad-places-field.tsx`, by the guard imitation and by hand.
- **The Meta hint matches 009d D4 exactly** (`AREA_HINT`, `launch-messages.ts:91-92`; pinned at `launch-flow.integration.test.tsx:286-299`) and is not flagged. "Meta may also widen a small area" does not appear.
- **The empty-library sentence** is one constant (`launch-messages.ts:40-41`) read by Home, step 1, the library tab and the empty list (`campaign-page-messages.ts:35`). Not flagged.
- **D-16 names** are all in use: Ads library, Launch an ad, Choose an ad, Set it up, Review and launch, Campaigns.
- **No screen says live, launched or running** as a label of a campaign. The only uses are negations (`campaign-page-messages.ts:123, 218`) and Home's pinned empty list ("Running now", "No ads running"). MTK-009 holds: no figure on these screens has no source; the three results read "Not live yet" in words.
- **Not copy findings:** `apps/web/src/features/campaigns/components/campaign-form-options.ts` has no importer and renders nothing (its state list is leftover from the removed open house builder; safe to delete in a clean-up). `CAMPAIGN_SAVED_NOTICE` (`user-language.ts:233`) and `NOT_LIVE_METRIC_SOURCE` reach no PRD-009 screen. `ad-creative.tsx` and `brand-band.tsx` carry only the constants above; the initials tile and the feed avatar are `aria-hidden`; every ad picture takes the catalog's description as its text.
- **Accessible names** on the flow otherwise read well: the stepper, the place chips ("Remove Texas"), the character counts as descriptions, the shape switch, and "Launch on Facebook" tied to its one sentence.
