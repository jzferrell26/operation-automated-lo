# PRD-009 writing review, pass 1 (MTK-008)

> Reviewer: `technical-writing-craft-guardian` (sonnet) | Date: 2026-10-02 | Run: `claude/prd-009-marketing-toolkit` at `6e0de10` | Mode: read-only review. No file in the worktree was edited, built or tested; this report is the only file added.
> Standards read: [user-language contract](../../../../knowledge/private/standards/user-language-contract.md) (v1.1), the source guard `tooling/tests/unit/user-language/forbidden-vocabulary.test.ts` and `apps/web/src/copy/forbidden-vocabulary.ts`, the PRD-009 index, 009b to 009f D sections and criteria, and `design/00-direction.md`.

## Result

**24 findings: 3 BLOCKING, 21 ADVISORY.** MTK-008 cannot close until the three BLOCKING items are fixed or, for W-2 and W-3, the owner accepts an exception in a dated amendment (both strings are pinned by 009b).

| Criterion | Rating | Note |
|---|---|---|
| Diataxis mode | Pass | These are UI strings, not documents. Each screen keeps one job. One mix: the Brand page puts homeowner report wording first in a page meant for ads (W-4). |
| Inverted pyramid | Pass | Headings and leads state the action first on Home, the library tab, the list and the campaign page. |
| Code discipline | Not applicable | No code examples in scope. |
| Voice and tone | Warn | Second person, plain words and sentence case hold almost everywhere. Exceptions: W-4, W-7, W-14, W-17. |
| Reader lens | Fail | W-1 to W-3: an error that blames us for a library change, a promise that connecting makes an ad run, and a Connect button that lands on "Nothing is connected from this page". |
| Structural completeness | Warn | Empty and error states exist for every page. Gaps: W-1, W-10, W-18. |

### Notes for the orchestrator before the fix lane starts

1. **Diff base.** `36b58f1` is the PRD-008 authoring commit. `e89058e` (the PRD-008 code, one commit later) is on this branch, so `git diff 36b58f1...6e0de10` also shows PRD-008 files as new (`reporting-messages.ts`, `shared-report-messages.ts`, `campaign-image-messages.ts`, the homeowner refusals). I reviewed what PRD-009 changed with `git diff e89058e...6e0de10`. Nothing from PRD-008 is reported here.
2. **Two guard gaps** (details under "Guard gaps"): the source guard does not scan `packages/domain/src`, and the error-code coverage test cannot see the four codes behind W-1.
3. **The guard was not run.** I applied its term list and phrase rule by search over every in-scope string. The planned fix lane should run `pnpm` unit tests after each change.

## BLOCKING

### W-1. Four approve refusals have no plain sentence, so the person is told it is our fault

- **Where:** `apps/web/src/features/http/user-messages.ts` (add four entries after line 94, beside `LIBRARY_AD_NOT_AVAILABLE`). The route answers 409 with these codes at `apps/web/src/server/campaign-approval-handler.ts:42-47` and `:153`. The approve control shows `userMessageSentence(refusal.code)` at `apps/web/src/features/campaigns/components/campaign-approval-controls.tsx:120`.
- **Current (what the person reads for `LIBRARY_AD_MISSING`, `LIBRARY_AD_RETIRED`, `LIBRARY_AD_REPLACED`, `LIBRARY_AD_ART_CHANGED`):** "Something went wrong on our side. Try again, and contact support if it keeps happening." (`UNKNOWN_ERROR_MESSAGE`, `user-messages.ts:194-197`), plus a support reference.
- **Why it is wrong:** the cause is a library change, not a fault on our side, and "try again" can never work. The page already hides the approve control for a retired ad, so this is reached when the ad changes between loading the page and pressing Approve, or from a second tab. 009C-AC-008 added the four refusals; no sentence was written for them.
- **Proposed entries (they reuse the campaign page's own notice wording):**
  - `LIBRARY_AD_MISSING`: what "This ad isn't in the library, so this version can't be approved." / what to do "Choose another ad. Your budget, dates and area are kept."
  - `LIBRARY_AD_RETIRED`: what "This ad was taken out of the library, so this version can't be approved." / what to do "Choose another ad. Your budget, dates and area are kept."
  - `LIBRARY_AD_REPLACED`: what "A newer version of this ad is in the library, so this version can't be approved." / what to do "Use the new version of the ad, then approve that one."
  - `LIBRARY_AD_ART_CHANGED`: what "The picture for this ad changed after this version was saved, so this version can't be approved." / what to do "Make a new version from the ad, then approve that one."
- **Rule:** contract section 7 ("Every code a route can return maps to a pair of plain sentences, and a unit test asserts it"); section 2 rule 3 (specific over abstract); section 5 rule 3 (always say what the user can do).
- **Test pin:** no test pins these sentences. The codes are pinned at `campaign-approval-handler.unit.test.ts:378-387` and `campaign-approval-handler.postgres.test.ts:325-332, 363`. Add a case to `features/http/user-messages.unit.test.ts` that the four codes map, and fix the collector at `:46` (see "Guard gaps").

### W-2. Copy says connecting accounts makes an ad run, but launching stays off even when both are connected

- **Where and current:**
  - `apps/web/src/copy/home-messages.ts:50` `HOME_SETUP.intro`: "You can set up an ad now. It runs once HighLevel and Meta are connected."
  - `home-messages.ts:131` `HOME_RUNNING.emptyBody`: "An ad shows here, with its spend and leads, once you launch it."
  - `home-messages.ts:87` `HOME_CHECKLIST.meta.sentence`: "Your Facebook page and ad account, so your ads can run."
  - `apps/web/src/features/campaigns/components/campaign-approval-controls.tsx:222` (secondary): "Approved. This campaign won't run as an ad until HighLevel and Meta are connected."
- **Why it is wrong:** the first sentence promises that connecting is enough. `design/00-direction.md` section 6.3 and `launch-model.ts:218, 233-236` say "Launch on Facebook" is disabled in PRD-009 "even when Meta is connected", with "Launching on Facebook isn't turned on for your workspace yet." So the product tells a loan officer one thing on Home and the opposite beside the disabled button. Contract section 5 calls the not-connected states "a compliance commitment" and rule 2 says never soften a truth into a hint; this does the reverse and overstates.
- **Proposed:**
  - intro: "You can set up an ad now. Launching it on Facebook isn't turned on yet, and it needs HighLevel and Meta connected."
  - Running now empty body: "Ads you launch will show here with their spend and leads. Launching isn't turned on yet."
  - Meta item: "Your Facebook page and ad account. Meta needs both before an ad can launch."
  - approval outcome (reuse the contract constant, `user-language.ts:231-232`): "Approved. This campaign won't run as an ad yet. HighLevel and Meta aren't connected."
- **Rule:** contract section 5 rules 1 and 2; section 2 rule 3 ("name what the product cannot do yet"); PRD 009D-AC-017 (nothing pretends to launch).
- **Pinned by:** `overview-screen.integration.test.tsx:237` (intro), `:244` (Meta item), `:445` (Running now body); `campaign-approval-controls.integration.test.tsx:224, 258` and `tests/browser/review/review-campaign-decision.spec.ts:149` (approval outcome). The intro is also written into 009b D2 (index line 51 of `prd-009b-...md`) and `design/00-direction.md` section 9, so the fix needs a dated amendment to both, or an owner-accepted exception.
- **Same pattern in a deferred file:** `launch-messages.ts:155-157` ("Meta isn't connected yet, so connect it in Settings to launch this ad."). Pass 2 should apply whatever is decided here.

### W-3. The Connect buttons open a page that says "Nothing is connected from this page"

- **Where:** `home-messages.ts:77-83` and `:89-95` (action "Connect" for `not_connected` and `not_started` on HighLevel and Meta), `home-messages.ts:122-126` (both go to `/settings/connections`), and `campaign-header-actions.tsx:21` (a link to the same page). The destination is `apps/web/src/features/onboarding/components/permission-screen.tsx:28`: heading "What Automated LO asks for, and why", then a card "Nothing is connected from this page".
- **Current (Home):** "Connect HighLevel" with the link "Connect" (accessible name "Connect HighLevel"), the same for Meta.
- **Why it is wrong:** the button promises an action the page refuses. The page has no connect control and PRD-009 makes none (non-goal: "Making HighLevel or Meta connections work"). The Settings card for the same page is honest: "See what HighLevel and Meta each need from you" with "Open connections".
- **Proposed (lowest cost):** for `not_connected` and `not_started` on the two connection items, visible text "See what's needed"; accessible names "See what's needed for HighLevel" and "See what's needed for Meta". Keep "Fix" and "Review" for the other states. The "Connect HighLevel" and "Connect Meta" headings and the "Not connected yet" chips stay. If the owner prefers to keep the word Connect, the alternative is a first sentence on the destination: "Connecting HighLevel and Meta isn't available in the app yet."
- **Rule:** contract section 5 rule 3 (always say what the user can do); section 2 rule 3.
- **Pinned by:** `overview-screen.integration.test.tsx:306, 310` (link names and hrefs), `:329, 333, 334` (other states keep the item name). 009b D2 lists the action as "Connect / Fix it", so this also needs an amendment.
- **Related, seen while here:** the destination renders capability text from `apps/web/src/fixtures/ui-foundation/synthetic-ui.ts`, which the source guard excludes (for example "Read agency reports", "Show totals across every workspace an agency sign-in covers.", "Read your workflows"). A loan officer who follows the Connect button reads those. Not new in PRD-009; pass 2 or the fix lane may want to read that page end to end.

## ADVISORY

### W-4. Brand page: one idea under three names, and a field label that does not match its fix sentence

- **Where:** `apps/web/src/features/workspace/preference-editors.tsx:109` (`<h2>Your report identity</h2>`), `:112-118` (body), `:131` ("Save report branding"), `:407` ("Your brand on ads"), `:456` ("Save ad brand"); `apps/web/src/features/workspace/workspace-screen.tsx:22-24` (page "Brand": "Your name and NMLS number go on every ad automatically."); field labels at `apps/web/src/features/homeowners/builder.tsx:28-73`.
- **Why:** Home sends the person to "Add your brand". The first card they meet is headed for homeowner reports, "Your report identity", with a button "Save report branding". The second card is "Your brand on ads" with "Save ad brand". The page, the Home checklist and the fix sentence all say "Brand" and "NMLS number", but the field is "Loan officer NMLS". The check "Add your NMLS number in Brand." (`library-ad-ruleset.ts:184`) points at a label that does not exist.
- **Proposed:** card 1 heading "Your name and NMLS details"; body (reports off) "Saved for your account in this workspace. They go on every ad, and on new homeowner reports once those are turned on."; button "Save your details". Card 2 keeps "Your brand on ads" and its button becomes "Save ad settings". Labels: "Loan officer NMLS" to "Your NMLS number", "Company NMLS" to "Company NMLS number".
- **Rule:** one idea, one word (contract section 2 rule 2, plain words); fix text must name the visible label.
- **Pinned by:** `brand-page.integration.test.tsx:100, 103, 124, 187`; `ad-brand-editor.integration.test.tsx:102, 131, 149, 156`; `tests/browser/review/launch-an-ad.click-count.spec.ts:63-70`; `review-campaign-decision.spec.ts:264`; `workspace-pages.spec.ts:135-140`. The labels are shared with the homeowner report builder.

### W-5. "With Meta" and "Sending to Meta": honest, but only one is clear

- **Where:** `apps/web/src/copy/user-language.ts:260-261`, shown by `campaignStateLabel` on Home, the list, the page and the versions card.
- **Ruling:** "Sending to Meta" (`publishing`) is honest and clear: it names what is happening and claims nothing is showing. Keep it. "With Meta" (`live`) is honest but not clear: it names where the ad is, not what is happening to it, and could be read as "in review", "approved by Meta" or "in partnership with". It also sits as the only chip under Home's "Running now" heading, so one state is called running in the heading and "With Meta" in the chip. Neither can be reached by any PRD-009 screen.
- **Proposed:** keep "Sending to Meta". For `live`, "Active on Facebook": it matches the neighbouring "Paused" and "Finished", it is Meta's own word, and it passes the pinned regex (`user-language.unit.test.ts:98-103` rejects only live, going live, launched, running). If the orchestrator reads 009D-AC-017 as banning any synonym of running, leave "With Meta" and add one line to the future Meta publish PRD to rename it when live is reachable.
- **Pinned by:** `overview-screen.integration.test.tsx:63, 461`; `home-campaigns.unit.test.ts:71`; `home-reads.unit.test.ts:327`.

### W-6. The version list never says which version you are looking at

- **Where:** `apps/web/src/features/campaigns/components/campaign-versions-card.tsx:36-60`; unused constant `apps/web/src/copy/campaign-page-messages.ts:177` (`VERSIONS.viewing`, "Viewing now").
- **Why:** the shown version has `aria-current="true"` for assistive tech only, no "Open" link, and no visible mark. A sighted person cannot tell which row is the page they are on.
- **Proposed:** in the shown version's row, where the "Open" link would be, render "Viewing now".
- **Pinned by:** nothing found. `persisted-campaign-screen.integration.test.tsx:329` pins the "Open Version 1" link on the other rows, which stays.

### W-7. Approve card: "campaign" and "version" for the same thing, and the same sentence twice

- **Where:** `campaign-approval-controls.tsx:154, 164` (title "Approve this campaign"), `:169, 289` (button and dialog "Approve this version"), `:207` (default status "Nobody has approved this version yet." which the Approval card above also says, `campaign-page-messages.ts:137`), `:290` ("Records your name against this exact version."), `:292` ("The campaign is approved.").
- **Proposed:** title "Approve this version"; show no default status sentence until there is an outcome (render `status?.sentence` only); effect "Saves your name as the approver of this exact version. Nothing is published or sent."; result "This version is approved. Changing the campaign later needs a new approval."
- **Rule:** one idea, one word; plain words ("records against" is bookkeeping speech).
- **Pinned by:** `campaign-approval-controls.integration.test.tsx:292` (title). The default status is read by `persisted-campaign-screen.integration.test.tsx:267`, `tests/browser/campaign-pages.spec.ts:219` and `review-campaign-page.spec.ts:56`; check each is scoped to the Approval card before changing.

### W-8. "The version you approved" is wrong when someone else approved it

- **Where:** `campaign-page-messages.ts:200` (`missingApproved`) and `:203` (`retiredKept`).
- **Current:** "This ad isn't in the library. This campaign keeps the version you approved." and "This ad was taken out of the library on Oct 1, 2026. This campaign keeps the version you approved."
- **Why:** a creator or viewer who did not approve reads a false statement about themselves.
- **Proposed:** "This ad isn't in the library. This campaign keeps its approved version." and "This ad was taken out of the library on Oct 1, 2026. This campaign keeps its approved version."
- **Pinned by:** `persisted-campaign-screen.integration.test.tsx:397`. `design/00-direction.md` section 9 has the "you" wording, so note the change there.

### W-9. Campaigns list on a phone: facts without labels, and a "Runs" column for ads that cannot run

- **Where:** `apps/web/src/features/campaigns/components/campaign-list.tsx:166-172`; `campaign-page-messages.ts:33` (`runs: "Runs"`).
- **Current (card):** "Refinance. Oct 6 to Oct 20. Austin, TX and 2 more." then "Ready for approval Oct 2". A screen reader hears bare facts; the table has headers, the cards do not.
- **Proposed (card):** label each fact: "Topic: Refinance." "Dates: Oct 6 to Oct 20." "Where it shows: Austin, TX and 2 more." and "Last change: Oct 2".
- **Optional:** the column "Runs" reads as fact for an ad that nothing can run; "Dates" is plainer. `009E-AC-009` names the column, so that part needs an amendment.
- **Pinned by:** `campaigns-list.integration.test.tsx:67, 75` and `tests/browser/campaign-pages.spec.ts:74` (column names only). Card text is not pinned.

### W-10. An empty list invites you to pick an ad that does not exist yet

- **Where:** `campaign-page-messages.ts:27` (`CAMPAIGNS_PAGE.emptyDescription`), shown on a new real account where the library ships empty (index risk R-1).
- **Current:** "Pick an ad from the library to set up your first one." with the primary "Launch an ad", on a library that says "No ads in the library yet."
- **Proposed:** when the library has no active ad, show the 009C-AC-012 sentence instead: "No ads in the library yet. New ads are added after they're reviewed, so there's nothing to set up until then." The data is already known to the library tab.
- **Pinned by:** `campaigns-list.integration.test.tsx:166`, `campaign-page-messages.unit.test.ts:56`, `tests/browser/campaign-pages.spec.ts:161`, `design-quality.spec.ts:631`. 009E-AC-011 fixes the sentence for the non-empty library, so add the empty-library variant by amendment.

### W-11. Realtor partners page: stale flow name, and an empty state that contradicts the line above it

- **Where:** `preference-editors.tsx:269` and `:278`; `workspace-screen.tsx:9`.
- **Current:** the page says "Your ads show only you. Realtor partners never appear in paid ads." The empty state says "Keep your partner's details ready for the next campaign. Nothing is imported from HighLevel." and the link is "Create a campaign".
- **Proposed:** empty state "Keep your Realtor partners' details in one place. Nothing is imported from HighLevel, and partners never appear in your ads."; link "Launch an ad" (D-16 name for that flow).
- **Note:** what this page is for is still open question D-20; the proposal fits the default, "a plain list with one honest line".
- **Pinned by:** nothing found.

### W-12. Help says "Contact support" and gives no way to

- **Where:** `apps/web/src/copy/shell-messages.ts:23-24`.
- **Current:** "Questions about Automated LO? Contact support and tell us which page you were on."
- **Why:** an instruction the reader cannot follow (contract section 5 rule 3). The product says "contact support" in at least eight places and carries no address or link anywhere.
- **Proposed:** needs one fact from the owner. Shape: "Questions about Automated LO? Email <support address> and tell us which page you were on." The fix lane should not invent the address.
- **Pinned by:** `top-bar-menu.integration.test.tsx:261`.

### W-13. Every page has the same tab title, and it is not the product's name

- **Where:** `apps/web/src/app/layout.tsx:17` (`title: "Operation Automated LO"`); the wordmark is "Automated LO" (`shell-messages.ts:10`, D-14). Only the public sign-in pages, the shared report page and Settings, Account set their own titles, so Home, Campaigns, Ads library, Launch an ad, the campaign page, Brand and the gone page all read the same in a tab or a screen reader's page list.
- **Proposed:** `title: { default: "Automated LO", template: "%s | Automated LO" }`, and per-page titles "Home", "Campaigns", "Ads library", "Launch an ad", the ad's name on a campaign page, "Brand", "Page gone". The description (`layout.tsx:18`, "Automated LO: launch ready-made ads with a named approval on the record.") can say "launch ready-made Facebook ads for loan officers, with every approval saved by name."
- **Rule:** contract opening paragraph (page titles are governed copy); WCAG 2.4.2.
- **Pinned by:** no test pins the title.

### W-14. British spelling for American readers

- **Where:** `preference-editors.tsx:409` ("title, colour and disclosure line") and `:424` (`label="Brand colour"`).
- **Proposed:** "color" in both. The rest of the product uses American English (NMLS, Realtor, dollars).
- **Pinned by:** `ad-brand-editor.integration.test.tsx:60, 88, 112` (`/Brand colour/u`).

### W-15. Three ways to say where an ad shows

- **Where:** `campaign-page-messages.ts:125` (`AD_CARD.shows`, "Shows to"); elsewhere "Where it shows" (list column, step 2 and 3) and "Shows in:" (step 2).
- **Why:** on the campaign page the row reads "Shows to: Austin, TX and everything within 15 miles; the Facebook feed", which mixes who and where.
- **Proposed:** "Shows in".
- **Pinned by:** nothing found.

### W-16. Fix sentences a library ad can still reach that use engineering words

- **Where:** `packages/domain/src/campaign-foundation.ts:427` (`BUDGET_OUT_OF_BOUNDS`): "Choose a daily and total budget within the active ruleset."; `:437` (`GHL_ROUTING_INCOMPLETE`): "Reconnect and revalidate the selected routing objects."
- **Why:** only `remediation` is rendered ("What to fix"). Step 2 checks the budget first, so a person sees the first only by bypassing the form, and routing is always "valid" for library ads today. They are fallbacks, but "ruleset" and "routing objects" are internal nouns and the budget sentence states no limit. `packages/domain/src` is outside the source guard's scanned roots.
- **Proposed:** for a library ad (same pattern as `LIBRARY_AD_SHARED_FIXES`, `:224-232`): budget "Choose a daily budget from $5 to $1,000 and a total budget from $5 to $5,000." (matches `DAILY_BUDGET_FIX` and `TOTAL_BUDGET_FIX`); routing "Check that new leads have somewhere to go in HighLevel." The two limits come from `LIBRARY_AD_BUDGET_BOUNDS`.
- **Pinned by:** `launch-review.integration.test.tsx:356` uses the budget sentence as fixture text only.
- **Checked and fine:** `NMLS_NUMBER_REQUIRED` "Add your NMLS number in Brand." and `LIBRARY_AD_RETIRED` "Choose another ad. Your budget, dates and area are kept." (pinned `library-ad-ruleset.test.ts:193`). `RUN_DATES_INVALID` "Choose an end date after today." is right for what the form lets a person change; its description is wrong when the start is after the end, but the form never sets a start date, and only the fix is shown.

### W-17. "Earlier flow" is team language

- **Where:** `campaign-page-messages.ts:40` (`EARLIER_FLOW_TOPIC`) and `:66` (`EARLIER_FLOW_LINE`: "Made with the earlier open house flow.").
- **Proposed:** topic "Open house"; line "Made with the earlier open house tool." A loan officer remembers making an open house campaign, not "a flow".
- **Pinned by:** `campaigns-list.integration.test.tsx:178, 188`; `campaign-page-messages.unit.test.ts:62`; `campaign-page-source-scan.unit.test.ts:59`; `persisted-campaign-screen.integration.test.tsx:607`; written into 009e D4 and 009E-AC-012, so amend those.

### W-18. Two error pairs address the wrong person or name a menu that is gone

- **Where:** `user-messages.ts:103-106` (`CAMPAIGN_APPROVAL_NOT_READY`: "Fix what the checks found, save it again, then approve the new version.") and `:139-142` (`SETUP_PREFERENCE_UNAVAILABLE`: "You can still create a campaign from the Marketing menu.").
- **Why:** the first is told to the person who pressed Approve, often an approver who cannot edit; it is the L-2 defect 009F-AC-008 closed in `NEEDS_CHANGES_NEXT_ACTION`. The second names a menu item that no longer exists, for a route PRD-009b removed (`SETUP_PREFERENCE_*` at `:131-142` are dead along with it).
- **Proposed:** "Ask the campaign creator to fix what the checks found and save a new version, then approve that one." Delete the three `SETUP_PREFERENCE_*` entries together with the handler code in `server/setup-preferences.ts:207-258` if nothing calls it.
- **Pinned by:** nothing found.

### W-19. Menu state words

- **Where:** `app-shell.tsx:213` and `:329-342`.
- **Current:** a role with no access hears "No access. You don't have access to this. Ask your workspace owner." (three ways to say it). The `planned` state says "Coming later", which contract section 5 rule 2 rules out ("Coming soon" is not the whole truth); no item reaches it today.
- **Proposed:** show the detail alone when there is one ("You don't have access to this. Ask your workspace owner."); `planned` to "Not available yet".
- **Pinned by:** `app-shell.integration.test.tsx:185` (`No access. ${NO_ACCESS_DETAIL}`).

### W-20. Dates are written in UTC

- **Where:** `launch-model.ts:187-205` (`readableDay`, `shortDay`), `home-messages.ts:151-156`, `campaign-page-model.ts:181`, all with `timeZone: "UTC"`.
- **Why:** a decision made at 8 pm Pacific on Oct 1 reads "Approved on Oct 2". Contract section 2 rule 6 asks for the user's formats. The results card is honest because it writes "UTC" beside a time; the bare dates are not.
- **Proposed:** format dates in the workspace's time zone, or if none is stored, say so once. This needs a fact about where the time zone lives, so it is advisory.
- **Pinned by:** several date strings in tests; none pins the zone itself.

### W-21. A topic name capitalized in the middle of a sentence

- **Where:** `apps/web/src/copy/ads-library-messages.ts:23-28`: "Showing 2 ads about Refinance."
- **Proposed:** lower-case the topic after "about" ("Showing 2 ads about refinance.", "...about first-time buyers.", "...about VA loans."). Chip labels keep their capitals.
- **Pinned by:** `tests/browser/ads-library.spec.ts:101` (`about Refinance`). `ads-library-page.integration.test.tsx:194, 197` still pass for "VA loans".

### W-22. The same words live in two files

- **Where:** `home-messages.ts:39-45` and `launch-messages.ts:23-29` (topic names); `home-messages.ts:145` and `launch-messages.ts:38` ("Sample ad"); `home-messages.ts:34-35` and `launch-messages.ts:40-41` (the 009C-AC-012 sentence).
- **Why:** the file header says "no screen can drift"; two copies can. `launch-messages.ts` is deferred, so pass 2 should make one the source and have the other import it.

### W-23. A title in the name makes a poor greeting

- **Where:** `features/overview/model/home-view.ts:26-28` and `features/shell/components/app-shell.tsx:271-273` take the first word of the name.
- **Why:** "Dr. Alex Morgan" greets "Welcome, Dr." and the account button shows "Dr.".
- **Proposed:** skip a leading title (Mr, Mrs, Ms, Dr, Mx) before taking the first word. Low priority.
- **Pinned by:** `home-view.unit.test.ts:7-23` (add a case).

### W-24. "Fix your brand" does not say what to fix

- **Where:** `home-messages.ts:100` (`subject: "your brand"`) with action "Fix" gives the accessible name "Fix your brand".
- **Proposed:** subject "your brand details" for every state ("Add your brand details", "Fix your brand details", "Edit your brand details"); the visible words "Add", "Fix" and "Edit" stay inside the name (WCAG 2.5.3).
- **Pinned by:** `overview-screen.integration.test.tsx:314, 334`.

## One idea, one word

| Idea | Names found | Verdict |
|---|---|---|
| The collection | "Ads library" (tab, heading, Home eyebrow), "the ads library" mid-sentence, "the library" in notices | Consistent. No "ad library" anywhere in rendered strings. |
| The flow | "Launch an ad" (Home, list, empty states, earlier-flow link), "Launch on Facebook" (final button), "Review and launch" (step) | Consistent, except the Realtor partners link "Create a campaign" (W-11). |
| The thing you set up | "campaign" (menu, list, Home) and "ad" (leads) | Matches D-16. The list lead "Every ad you've set up" explains the term. The Approve card mixes "campaign" and "version" (W-7). |
| Brand | "Brand" (menu, page, fixes), "your brand" (checklist, step 2) | Consistent in the product, except the Brand page itself (W-4). "Brand kit" appears only in the local demo preview (`dashboard-preview/workspace-settings.tsx:32`). |
| Sample ad | "Sample ad" on Home, list, art tag | Consistent. Two copies of the constant (W-22). |
| Where an ad shows | "Where it shows", "Shows in:", "Shows to" | Mixed (W-15). |
| Meta and Facebook | Meta is the account, Facebook is where the ad shows | Consistent ("Connect Meta", "Launch on Facebook", "the Facebook feed"). |
| Status words | "Ready for approval", "Needs changes", "Sent back for changes", "Approved", "Ad retired" | Consistent: one function (`campaignStateLabel`) feeds Home, list, page and versions. |
| Approver, owner, creator | "approver", "workspace owner", "campaign creator" | Consistent through the role maps. |
| Home and Overview | "Home" in menu, loading and error states, and the gone page link; "Overview" only in the address | Consistent. |

## "With Meta" and "Sending to Meta"

See W-5. Short answer: "Sending to Meta" stays; "With Meta" should become "Active on Facebook" or be left and re-named by the Meta publish PRD.

## Wave 3 pages read aloud

| Page | Reads aloud | Issues |
|---|---|---|
| Home (009b) | "Welcome, Alex." then "Launch an ad", a plain lead, "Choose an ad", the question "What do you want to promote?", topic links, three steps. "Get set up, 0 of 3 done", three items each with a sentence, a state and one action. "Running now", "Needs your approval", then "HighLevel stays your CRM." Reads well. | W-2, W-3, W-24, W-23. Home's primary button comes before the question it answers; this is deliberate (009B-AC-003), so I left it. |
| Ads library tab (009c part 2) | "Campaigns", tabs "Your campaigns" and "Ads library", "Ads library", a clear lead, topic buttons that announce "Showing N ads about X". Empty library says one honest sentence and nothing else. | W-21. |
| Campaigns list (009e) | "Campaigns", lead, "Launch an ad", a table with six headers or cards. Statuses come from one function. | W-9, W-10, W-17. |
| Campaign page (009e) | Breadcrumb, "From the ads library, Refinance", the ad name, a run line, the status chip, "Make a new version", a disabled "Launch on Facebook" with one sentence, "Results" with "Not live yet" for every figure, "The ad", "Approval", "What to fix", "Approve this campaign", "Versions", "Details for support". The not-live results card is exact and kind. | W-1, W-6, W-7, W-8, W-15. The Approval card and the approve card both say nobody has approved it (W-7). |
| Gone page (009f) | "This page is gone. Your leads, pipelines and follow-up live in HighLevel. Go to Home." Matches 009F D1. | None. |
| Settings, Brand, Realtor partners (009f, 009d) | Settings cards read plainly. Brand and partners as above. | W-4, W-11, W-14. |
| Errors and loading | "Loading Home", "We couldn't load Home", "We couldn't load this page. Nothing was changed." Fine. | W-1, W-18. |

## Deferred to pass 2 (seen, no findings)

- `apps/web/src/copy/launch-messages.ts` (read whole for cross-checks only). One cross-reference: lines 155-157 carry the connect-it-in-Settings sentence tied to the W-2 and W-3 decision.
- `apps/web/src/features/campaigns/components/launch-flow.tsx`, `launch-review.tsx`, `launch-on-facebook.tsx`, `launch.module.css`, `ad-library-cards.tsx`, `brand-band.tsx` (not read; `ad-library-cards.tsx` and `brand-band.tsx` are imported by reviewed files).
- The library-ad word-check rules and their fix sentences: `packages/domain/src/library-ad-words.ts`, `library-ad-text.ts`, and the `WORDS_*` rules in `library-ad-ruleset.ts` (the file was read for the non-word rules in W-16).
- `RULE_PLAIN_NAMES` and the `adFact` line ("First home, start here, library version 3", used by `campaign-ad-card.tsx:78`) live in `launch-messages.ts`.

## Checked and clean

- No em dash or en dash in any file changed under `apps/web/src` or `packages` (search by code point). Dashes in `docs/operations/evidence-packs/reviewable-preview-smoke.md` and `library/knowledge/private/product/project-map.md` are existing ranges outside this review's scope.
- No forbidden term or internal noun in any in-scope string: the guard's term list searched by hand over the copy files, the Home, shell, library, list, campaign page and Brand components, and `user-messages.ts`. "Open House Boost" survives only in two code comments (`copy/campaign-image-messages.ts:4`, `server/authenticated-workspace-data.ts:114`), which 009F-AC-009 exempts.
- The empty-library sentence (009C-AC-012) is identical in `home-messages.ts:34-35` and `launch-messages.ts:40-41`.
- The Meta hint (`launch-messages.ts:91-92`) matches 009d D4 as amended by E1 exactly, and `adPlaceLabel` (`packages/contracts/src/ad-places.ts:110-114`) writes "<City, ST> and everything within 15 miles" and a state by its full name (E2). "Meta may also widen a small area" does not appear.
- D-16 names are all in use: Ads library, Launch an ad, Choose an ad, Set it up, Review and launch, campaign, Campaigns.
- MTK-009: no figure on any signed-in PRD-009 screen without a live source. The three results read "Not live yet" in words.
- No screen says an ad is live, launched or running. The only "running" strings are Home's pinned empty list ("Running now", "No ads running") and "This ad isn't running" on the results card. The security scan reads `features/campaigns`, `app/(authenticated)/marketing` and `launch-messages.ts` for those words; `user-language.ts`, `home-messages.ts` and `campaign-page-messages.ts` are outside it.
- Accessible names: the account button name "Your account: Alex Morgan" contains its visible "Alex"; checklist links contain their visible verb; thumbnails are decorative (`alt=""`, hidden); ad pictures take the catalog's description; "Skip to content", "Main", "Main menu", "Close the menu", "Close help" read well.
- `HOME_PATHS`, topic links and "See all campaigns" go where they say.

## Guard gaps (for the fix lane)

1. **Error-code coverage.** `apps/web/src/features/http/user-messages.unit.test.ts:46` (`ERROR_CODE`) only finds codes written `error: "X"` or `code: "X"`. `LIBRARY_AD_MISSING`, `LIBRARY_AD_RETIRED`, `LIBRARY_AD_REPLACED` and `LIBRARY_AD_ART_CHANGED` are record values (`campaign-approval-handler.ts:42-47`), so the test passed with them unmapped. Extend the collector or assert the four by name.
2. **Domain strings are not scanned.** `SCANNED_ROOTS` in `forbidden-vocabulary.test.ts:48-56` lists `packages/application/src` but not `packages/domain/src`, where every rule `remediation` (W-16) lives. Add the root, and expect the open house rules (`Select an approved disclosure profile version.`, `Record the authorized partner attestation.`) to need either an exclusion with a reason or a rewrite.
3. **Fixtures that a signed-in page renders.** `apps/web/src/fixtures` is excluded from the guard, yet the review-mode Connections page prints capability labels from `fixtures/ui-foundation/synthetic-ui.ts` (see W-3). Either read that page's output in the review-surface sweep, which already runs, or move those labels into a copy file.
