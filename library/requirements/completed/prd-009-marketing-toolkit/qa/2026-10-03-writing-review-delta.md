# PRD-009 writing review, delta check (MTK-008, closes QA-03)

> Reviewer: `technical-writing-craft-guardian` (sonnet) | Date: 2026-10-03 | Run: `claude/prd-009-marketing-toolkit` | Range: `git diff 301f24f7..823f3539 -- apps/web/src packages` (started at `b00ef873`, extended by the coordinator to `823f3539` to take in the QA-06 code lane) | Mode: read-only. No file in the worktree was edited, built or committed; this report is the only file added, and it is not committed. Apart from read-only `git` and search commands, the only commands run were the two unit test runs under "Test runs". `git status --short` shows only modified `tests/visual/screens/` pictures that were there before I started and are not mine.
> Standards read: [user-language contract](../../../../knowledge/private/standards/user-language-contract.md) (v1.2), the source guard `tooling/tests/unit/user-language/forbidden-vocabulary.test.ts`, [pass 1](2026-10-02-writing-review-pass-1.md), [pass 2](2026-10-02-writing-review-pass-2.md), the [closing check](2026-10-02-writing-review-closing.md) with its decisions (W-5 "With Meta" stays; W-20 UTC dates and W-12 the support address are follow-ups), [the quality report](2026-10-03-quality-report.md) QA-03, and PRD-009's criterion-fixed sentences (009C-AC-012 the empty library, 009d D4 the Meta hint).
> Method: every string was read at `823f3539` from the diff, not from the lane notes. Scope was every user-visible string added or changed in the range: the four copy files, component literals, `aria-label`, `alt`, `title` and `placeholder` attributes (none were added), CSS `content:` (none), empty, error and loading states, page titles, button labels, chips, and the strings the QA-06 lane added. I did not run integration, component, browser or database suites; where a "pinned by" list matters, it comes from reading the tests, not running them.

## Result

**MTK-008 still holds. No BLOCKING finding was found in the strings added or changed after the closing check.** Eight ADVISORY findings are new (D-1 to D-8). The nearest to blocking is D-2 (the Connections chips say "Confirmed" and "Missing" over cards that say "Nothing checked yet."); the three that are cheapest to fix and most visible to a loan officer are D-1, D-3 and D-4.

| Status | Count | Items |
|---|---|---|
| BLOCKING | 0 | none |
| ADVISORY | 8 | D-1, D-2, D-3, D-4 (worth fixing before ship); D-5 to D-8 (low, any time) |
| Closing-check items | 6 | N-1 PARTIAL (see D-6), N-2, N-3, N-4, N-5, N-6 RESOLVED |

| Criterion | Rating | Note |
|---|---|---|
| Diataxis mode | Pass | UI strings. Each state keeps one job. |
| Inverted pyramid | Warn | D-1 (the empty library says its fact three times), D-3 (the replaced-ad card leads with a fact that is not the one the reader needs). |
| Code discipline | Not applicable | No code examples in scope. |
| Voice and tone | Pass | Second person, plain words, sentence case, American spelling hold in every string. Low items D-5 and D-8. |
| Reader lens | Warn | D-2, D-3, D-4: a chip that claims a state, and two places where Approve is gone and nothing says why. |
| Structural completeness | Warn | D-4 (no notice for a changed picture), D-6 (a menu item still has the default tab title). |

## What closing needs from the orchestrator

1. Nothing blocks. Apply D-1 to D-4 if the lane has time; each has exact replacement words below. D-5 to D-8 can be logged.
2. **Records.** Three of the findings touch criterion text, so they need a dated note from `library-guardian` before or with the code: D-1 (009C-AC-012 says the empty library is said "in one sentence"; the fix says it as a title and a description, with the same words), D-4 (009E-AC-006 lists three library notices; a changed picture is a fourth), and the QA-06 states themselves (009d D8's table names only the chip "Ad retired"; the chips "Newer ad version", "Ad pictures changed" and "Ad not in the library" are not recorded anywhere).
3. **Refresh MKR-008's evidence** to the final head after any of D-1 to D-4 land. The strings they change are short; a re-read of the changed lines is enough.
4. The owner decisions already recorded stand and I did not re-raise them: W-5, W-12 (the support address, still owed; "contact support" still appears at `user-messages.ts:137, 237`, `reporting-messages.ts:39, 41, 45` and `server/homeowners/runtime.ts:168, 182`), W-20.

## 1. The closing check's N-1 to N-6, checked at `823f3539`

| ID | Status | Final string and where |
|---|---|---|
| N-1 | PARTIAL | Five titles added at `copy/page-titles.ts:42-46`: "Connections", "Settings", "Realtor partners", "Where new leads go", "Plan and usage"; set by `settings/connections/page.tsx:12` and, for the four catch-all addresses, by `generateMetadata` in `[...workspacePath]/page.tsx` keyed on `workspaceRoutes`. They match the headings and links. Homeowner reports is left out: see D-6, because the closing check was wrong that it sits outside PRD-009's menu. |
| N-2 | RESOLVED | `ACCESS_NO_EFFECT_YET` is "No effect yet." (`copy/user-language.ts:104`). The check proposed "No effect yet. Nothing is connected."; the lane left off the second sentence because 009G D2 says a page states each connection sentence once, and the notice above already says it. I agree. The two contract rows the check left alone ("A locked navigation item", "Who does that step") are still unchanged, as it advised. Related: D-2. |
| N-3 | RESOLVED | The four reload sentences are the check's words: "Load the latest saved version of this card before trying again." (`server/workspace-preferences.ts:164`, `features/http/user-messages.ts:44, 56`), "The saved version could not be confirmed." and "The saved version could not be read. Your edits are still here." (`use-workspace-preferences.ts:32, 43`), "The latest saved version is loaded." (`:37`), "Check the saved version before trying again." (`workspace-preferences.ts:240`). On Realtor partners "this card" means the list (one card per partner, the reload button under the list); that reads acceptably and I do not raise it. |
| N-4 | RESOLVED | `user-messages.ts:137`: "Try again. If it keeps happening, contact support and give them the reference in Details for support, below." The text is built from `SUPPORT_DETAILS_SUMMARY` ("Details for support", `user-language.ts:198`), so the sentence and the closed region cannot drift; `showsSupportReference` now matches that name. The unit test passes. |
| N-5 | RESOLVED | "anymore" at `launch-messages.ts:41` and `user-messages.ts:100`. Four "any more" remain, all in code comments (`newer-version.ts:55`, `setup-model.ts:7`, `app-shell.tsx:296`, `workspace/model.ts:62`); none is rendered. |
| N-6 | RESOLVED | The comment at `campaign-list.tsx:30` says "Dates"; `design/00-direction.md:529` carries a dated note. |

## 2. Findings

### D-1 (ADVISORY). The empty library says its fact three times, and the title is the lane's addition

- **Where:** `apps/web/src/copy/launch-messages.ts:52` (`EMPTY_LIBRARY_TITLE`), drawn at `apps/web/src/features/campaigns/components/ad-library-cards.tsx:152` on the Ads library tab (under its own h2 "Ads library", `app/(authenticated)/marketing/campaigns/library/ads-library-screen.tsx`) and on step 1 (`launch-flow.tsx:577` drops the lead when the library is empty, so the state stands alone).
- **Current, top to bottom on the library tab:** heading "Ads library"; chip "Empty"; title "Nothing to choose from yet"; then 009C-AC-012's sentence, "No ads in the library yet. New ads are added after they're reviewed, so there's nothing to set up until then." One fact, said by the chip, the title, the first sentence and the end of the second ("nothing" three times).
- **Ruling on the question QA-03 asked:** the title should not stay as worded. A title is needed (`AsyncState` requires one, and step 1 lost its lead to make room for it), but it must not restate what the next line says.
- **Proposed:** split the criterion's own two sentences along the pattern every other empty state in the product uses (title states the fact, description gives the reason). Title: "No ads in the library yet". Description: "New ads are added after they're reviewed, so there's nothing to set up until then." The words are the criterion's, each said once. Keep `EMPTY_LIBRARY` as the joined sentence (built from the two new constants) for Home's start card (`home-messages.ts:39`) and the Campaigns list's no-ads description (`campaign-page-messages.ts:35`), which draw it whole. If the owner will not amend the criterion, leave the title and log the repetition; do not reword the sentence.
- **Rule:** 009C-AC-012 ("say so in one sentence"); contract section 2 rule 4 (one idea per sentence); pass 1 W-7 (one idea, said once). Needs a dated note on 009C-AC-012, and on `prd-009b` line 41 and 009D-AC-002, which cite it (wording only: the same words as a title and a description).
- **Pinned by (these change):** `ads-library-page.integration.test.tsx:348-350, 367-368, 375, 383`; `launch-flow.integration.test.tsx:334, 346-347`; `tests/browser/ads-library.spec.ts:223`; `tests/browser/review/real-catalog/first-impression.spec.ts:62, 133`; `tests/browser/dashboard-preview.spec.ts:42` (all read the whole sentence with `getByText(EMPTY_LIBRARY)`). **Unchanged:** `overview-screen.integration.test.tsx:223, 307`, `overview-review-surface.integration.test.tsx:283`, `campaigns-list.integration.test.tsx:194`, `campaign-page-messages.unit.test.ts:79` (Home and the list keep the whole sentence).

### D-2 (ADVISORY). Connections: the group chips say "Confirmed" and "Missing" over cards that say "Nothing checked yet."

- **Where:** `features/onboarding/components/permission-screen.tsx:80-84` (each group's state is now a `Badge` with a glyph, and the group's own description is dropped when every group shares it); the words at `copy/user-language.ts:87-92` (`ACCESS_GROUP_STATE_LABELS`); the hosted projection restates group labels but not these words (`server/authenticated-workspace-data.ts:92-95, 348-358`).
- **Current, hosted page:** heading "Access this app confirms after you connect" with the chip "Confirmed"; under it, on every card, "What we checked: Nothing checked yet." and "What it affects: No effect yet." Heading "Access this app tells you about when something is blocked" with the chip "Missing". Before this window each group also said "You haven't connected HighLevel yet, so there's nothing to confirm here." beside its chip, and the closing check judged the chips with that sentence there. The state-it-once change removed it, so the chips now stand alone and are drawn as status chips. They are the only words on the page that claim a state of the workspace, and both are false: nothing is confirmed and nothing is known to be missing. Every other sentence on the page is honest.
- **Proposed:** on the hosted page the four chips read "Needed", "Not confirmed yet", "When blocked", "Optional". The hosted projection already restates group labels (`REVIEW_PERMISSION_GROUP_LABELS`); give the chip words the same treatment so the local demo, whose groups are sample "granted" and "missing", keeps "Confirmed" and "Missing".
- **Rule:** contract section 5 rules 1 and 3 (never present as live what is not; say what is true); section 2 rule 7 (honesty is a tone rule).
- **Pinned by:** `connections-review-surface.integration.test.tsx:352-372` (F-09; both environments assert the four words; only the production case would change). It also asserts the chip is neutral and carries a glyph, which stays true.

### D-3 (ADVISORY). Step 3, replaced ad: the card does not say the version can't be approved, and a viewer who can't save a version is left with no next step

- **Where:** `features/campaigns/components/launch-review.tsx:454-465` (the replaced card), which draws `UseNewVersion` (`features/ads-library/components/use-new-version.tsx:104`, the line `NEWER_VERSION_NOTICE`, `copy/ads-library-messages.ts:46`). The sentence that does give the reason, `AD_REPLACED_NOTICE` (`copy/launch-messages.ts:237-238`), is drawn only by the branch at `launch-review.tsx:466-480`, where no "Use the new version" offer can be built.
- **Current, the usual case (a newer version exists):** chip "Newer ad version"; line "A newer version of this ad is in the library."; then "Use the new version" if the viewer can save a version, and nothing at all if not. QA-06 removed the Approve control from this state, so a person who came to approve sees no Approve and is not told why. An approver who cannot save a version sees a chip and one line, with nothing to press and no one named to ask. The three other refusal cards, and the approve refusal itself (`user-messages.ts:121-125`), all say "so this version can't be approved". In the branch that carries the reason, the sentence "A newer version of this ad is in the library" sits beside "Choose another ad", and `libraryAdRefusalFor` returns "replaced" whenever the highest version differs from the recorded one (`packages/application/src/campaign-approval-command.ts`), including when it is lower, where no newer version exists.
- **Proposed:** let `UseNewVersion` take an optional `lead` whose default stays `NEWER_VERSION_NOTICE`, so the campaign page and 009C-AC-009 are untouched, and have step 3 pass `AD_REPLACED_NOTICE`: "A newer version of this ad is in the library, so this version can't be approved. Your budget, dates and area are kept." For a viewer who cannot save a version add under it: "Ask the campaign creator or your workspace owner to use the new version." (`USE_NEW_VERSION_WHO` already holds those people.) Then the no-offer branch says the same sentence, so one state has one sentence.
- **Rule:** contract section 5 rule 3 (always say what the user can do) and section 7 (what happened, and what to do); pass 1 W-1 and pass 2 W-37 (the same state had both sentences when Approve refused it).
- **Pinned by (these change):** `launch-review.integration.test.tsx:522-533` and `:534-551` (both match "A newer version of this ad is in the library." exactly; the second asserts "nothing to press"). **Unchanged:** `:552-564` (the no-offer sentence), `use-new-version.integration.test.tsx`, and the campaign page tests, because the default line stays.

### D-4 (ADVISORY). Campaign page: Approve is hidden for a changed-picture version, and for a replaced one with no offer, with no sentence saying why

- **Where:** `server/campaign-page-data.ts:266-271` (`approvalBlockedByLibrary`, now the approval command's own rule, QA-06) against `:144-179` (`noticesFor`, which writes a notice for retired, missing, a newer version (only when an offer exists) and Brand changed, and none for a changed picture).
- **Current:** for an undecided latest version whose pictures changed in the library, the page shows the Approval card, "Nobody has approved this version yet.", and neither the Approve card nor the hand-off card, and no notice. The campaign page is where the hand-off link sends an approver, so the approver sees an approval card with no way to approve and no reason. Step 3 says it ("The picture for this ad changed after this version was saved, so this version can't be approved.", `launch-messages.ts:240-241`); this page does not. A viewer who cannot edit also gets no "Make a new version" link (`campaign-page-data.ts:307`).
- **Proposed:** add an `art-changed` notice kind to `noticesFor`, drawn with `AD_ART_CHANGED_NOTICE` and, for a viewer who can save a version, the "Make a new version" link the header already offers (`makeNewVersionHref`). Draw `AD_REPLACED_NOTICE` for the replaced-without-offer case the same way.
- **Rule:** contract section 5 rule 3; section 2 rule 7.
- **Pinned by:** `campaign-page-data.unit.test.ts` (the QA-06 case "offers no approve control when the ad's art changed..." asserts only that no control is offered, so it passes unchanged); the notice tests in `persisted-campaign-screen.integration.test.tsx` (read before adding the kind). Needs a dated note on 009E-AC-006, which lists the library notices.

### D-5 (ADVISORY, low). The step 3 chips and sentences use different words for one fact

- **Where:** `copy/launch-messages.ts:239-242`; `features/campaigns/components/launch-review.tsx:362-405` (`refusedCard`).
- **Current:** chip "Ad pictures changed" over "The picture for this ad changed after this version was saved, so this version can't be approved." (plural, then singular). For a retired ad with no day on record, chip "Ad retired" over "This ad isn't in the library, so this version can't be approved.", which is also the sentence under the chip "Ad not in the library".
- **Proposed:** chip "Ad picture changed", the singular the sentence and the approve refusal (`user-messages.ts:126-129`) use. For the undated retired case use "This ad was taken out of the library, so this version can't be approved." (the words `LIBRARY_AD_RETIRED` already says, `user-messages.ts:112-116`) in place of `NOTICES.missingUndecided`, so "retired" goes with "taken out" and "isn't in the library" stays with the missing chip.
- **Rule:** one idea, one word (contract section 2 rule 2; pass 1 W-7, pass 2 W-29 and W-33).
- **Pinned by:** `launch-review.integration.test.tsx:567` ("Ad pictures changed") and `:588-596` (the undated retired sentence).

### D-6 (ADVISORY, low). Homeowner reports is a main menu item and its three pages still say "Automated LO" in the tab

- **Where:** `app/(authenticated)/homeowners/page.tsx`, `homeowners/new/page.tsx` and `homeowners/[propertyId]/page.tsx` set no title; `copy/page-titles.ts:42-47` has no entry; the menu item is at `features/shell/model/navigation.ts:45-50` and is one of PRD-009a D2's six items, and 009G-AC-009 visits it. The closing check said these pages "sit outside PRD-009's menu"; they do not, so N-1 is one page short.
- **Current:** the tab reads "Automated LO" on all three.
- **Proposed:** `homeownerReports: "Homeowner reports"` for `/homeowners`; "Create a homeowner report" for `/homeowners/new` (the page's h1, `features/homeowners/builder.tsx:177`); "Homeowner report" for the property page, whose h1 is the address.
- **Rule:** the contract's opening paragraph (page titles are governed copy); WCAG 2.4.2.
- **Pinned by:** `page-titles.unit.test.ts` (add the keys).

### D-7 (ADVISORY, low). The "Empty" chip sits over a search that found nothing

- **Where:** `features/workspace/preference-editors.tsx:287-298` (`EmptyState` for the no-match case); the chip word is the shared primitive's (`packages/ui/src/components/async-state.tsx:14`).
- **Current:** chip "Empty", title "No partners match this search", "Try a different name or company." The list is not empty; the search found nothing.
- **Proposed:** keep the `EmptyState` for a person with no partners at all (its chip is true there). For a search with no match draw one plain line in the list area: "No partners match this search. Try a different name or company."
- **Rule:** contract section 2 rule 7. The Homeowner reports "Connect the report workspace" state has the same chip over a feature that is not turned on; the chip is tolerable there and I do not raise it.
- **Pinned by:** `partners-editor.integration.test.tsx:87` (looks for a heading named "No partners match this search").

### D-8 (ADVISORY, low, local demo only). The demo campaign page shows raw lowercase data words as chips

- **Where:** `features/reporting/components/artifact-workspace.tsx:54-60, 150`; `campaign-launch-review.tsx:52-58, 88-90`; `status-tone.ts`. Reached only at `marketing/campaigns/synthetic-open-house-001`, which a signed-in workspace does not have (`page.tsx` there: the demo and the local preview keep it).
- **Current:** chips read "approved", "superseded" and "connected", the data's own words, beside sentence-case chips such as "Optional, selected" and every chip on the real pages.
- **Proposed:** a `labelForStatus` beside `toneForStatus`: "Approved", "Replaced", "Connected"; keep `data-artifact-status` raw.
- **Rule:** contract section 2 rule 5 (sentence case) and rule 2 (plain words; "superseded" is not one).
- **Pinned by:** `campaign-detail-screen.integration.test.tsx:137-165` reads `data-artifact-status`, tone and glyph, not the word; check the file for a text match on the lowercase words before changing.

## 3. Read in full and clean

- **QA-06's new strings** (`launch-messages.ts:236-242`) read as sound sentences: every one says what is true, uses "version" for the campaign version, and matches `user-messages.ts` word for word where it repeats it ("A newer version of this ad is in the library, so this version can't be approved.", "The picture for this ad changed after this version was saved, so this version can't be approved."). "Your budget, dates and area are kept." is true on the path these cards use: `Choose another ad` carries `campaign=` in the address, and `draftFor` (`launch-flow.tsx:144-163`) seeds budget, end date and places from the campaign for any ad, changing only the words. The actions match the sent-back card's ("Make a new version" opens step 2, as it does there). The only findings on them are D-3 and D-5.
- **`LIBRARY_AD_REFUSAL_MESSAGES`** (`packages/application/src/campaign-approval-command.ts:67-72`) **does not reach a screen.** The handler answers `{ error: <code> }` only (`server/campaign-approval-handler.ts:151-155`, `campaign-command-http.ts:15-17`), the client reads the code (`features/http/internal-api.ts:60-67`) and says the sentences in `user-messages.ts`. They are thrown-error text, which the contract treats as log text (section 3). For the record, the command's `art_changed` text says "This ad's pictures changed in the library" where the screen sentence says "The picture for this ad changed after this version was saved"; keep them in step if the command's text is ever shown.
- **Unchanged and still right:** the place refusal `PLACE_REFUSED` ("ZIP codes, distances and people can't be used") still covers the new number-word, distance and place-name rules (`library-ad-words.ts`, `library-ad-places.ts`, `contracts/src/ad-places.ts` add lists, regexes and comments, and no sentence a person reads); the Meta hint `AREA_HINT` (`launch-messages.ts:114`), which still matches 009d D4 as amended by E1; the empty-library sentence itself.
- **New states, strings unchanged:** the Home dates (now `time` elements), the Connections notice with its single "What to do next:" line ("Connecting HighLevel and Meta isn't available in the app yet. Nothing here changes in the meantime."), the hand-off card (sentence first, then the primary "Copy the link"), the account notices (same sentences, now with a glyph, and the signed-out notice is now a status region), the route error and loading boundaries, the Homeowner reports state and the partners empty state (words unchanged), and the Brand cards (a primary on "Save your details", a secondary on "Save ad settings"; button words unchanged).
- **A removal that helps:** step 3 no longer draws a second "Ready for approval" chip in the ready state; the left card already says "Checks passed".
- **`packages/ui`:** the glyphs are decorative, `Link` gains `sentence` and `sm` variants, `AsyncState` a `surface` prop, `Surface` an `info` variant; no new words. The default `newTabLabel` ("opens in a new tab") is unchanged.
- **Brand page for the local demo** (`workspace/synthetic-brand-page.ts`): its `role: "Local demo"` is never rendered (`identity.role` is read nowhere; only `identity.company`, "Prairie Home Lending", is).

## 4. Test runs

Both ran at `823f3539` from `C:\Users\jzfer\Projects\oalo-prd-009` and left the worktree as it was.

| Command | Result |
|---|---|
| `pnpm exec vitest run tooling/tests/unit/user-language` | 2 files passed (`forbidden-vocabulary.test.ts`, `open-house-boost-retired.test.ts`), 20 tests passed, 1.32 s. |
| `pnpm exec vitest run apps/web/src/features/http/user-messages.unit.test.ts` | 1 file passed, 24 tests passed (up from 20 at the closing check), 0.42 s. Includes the N-4 rule that a sentence naming "Details for support" belongs to a code that shows the reference. |

## 5. Checked and clean (mechanical)

- **No em dash or en dash** in any line added in `apps/web/src` or `packages` between `301f24f7` and `823f3539` (0 of each by byte search over the diff).
- **No forbidden term or internal noun** in any in-scope string: the guard passes. No `aria-label`, `alt`, `title`, `placeholder` or CSS `content:` text was added in the range (the `title`, `alt` and `aria-label` hits in the diff are existing strings that moved).
- **American spelling** in every user-visible string. "colour" appears only in code and CSS comments and test names, as the closing check allowed.
- **Nothing says an ad is live, launched or running** in the new strings. "Newer ad version", "Ad pictures changed" and "Ad not in the library" are states of the library, not of a campaign.
- **Gaps in my own check:** I did not run integration, component, browser or database suites, so every "pinned by" line is from reading the tests. I did not render the pages; the on-screen order in D-1 and D-2 is read from the component code and the tests that assert it. I did not review the `tests/visual/screens/` pictures, which are the design lanes' work.
