# 2026-10-01 PRD-008d baseline review (008D-AC-005 to 008D-AC-011)

**Armed:** `ux-ui-guardian` read its Weapon at
`C:\Users\jzfer\.claude\plugins\cache\the-neeson\the-neeson\2.0.0\skills\ux-ui-weapon\`
(`SKILL.md`, `upstream-v2/GUIDE.md`, `guides/00-principles.md`, `guides/11-wcag-2-2-baseline.md`,
`templates/review-output.md`) before reviewing, and opened the design-system folder first:
`library/knowledge/private/ux-ui/06-review-rubric.md` (the scale, the axes, the only accepted
finding form), `00-design-brief.md` sections 9, 10, 14, 18, and 20,
`03-components/sheet-and-dialog.md`, `03-components/async-empty-error-permission-state.md`,
`03-components/application-shell-and-navigation.md`, and `04-screens/campaign-lifecycle.md`.

**Reviewer:** `ux-ui-guardian`, Gauntlet lane L6b, worktree `oalo-g-008d-base`, branch
`gauntlet/008d-baselines`. **Verdict:** every changed or new picture scores 3 on every axis on the
installed set. Thirteen defects were found on the way there and fixed in product code or in the
capture, each with a test. Two system-level deltas that predate this run are handed to
`design-system-guardian` (D-009 and D-010 below).

## Scope and runs

| Item | Value |
| --- | --- |
| Criteria | 008D-AC-005 (one dispatch for the Wave 1 change set), 008D-AC-006 (this review), 008D-AC-007 and 008D-AC-008 (the new states), 008D-AC-010 (the re-signed sign-off), 008D-AC-011 (later dispatches for fixes this review caused) |
| Tree | `0cf31ab` (the integrated run tree with every UI change) plus this lane's commits `c2c51fe`, `d788f35`, `2cadc3e`, `0392b64`, `2be0385`, `a414eae`, `02ea08a` |
| First dispatch (008D-AC-005) | screen-baselines run 36823126319 on `2cadc3e`: synthetic 135 passed, review 104 passed |
| Second dispatch (008D-AC-011) | run 36825957221 on `a414eae`: review 104 passed; synthetic 136 passed and 1 failed (the new metric-label check found R-10's second case) |
| Third dispatch (008D-AC-011) | run 36828316006 on `02ea08a`: synthetic 137 passed, review 104 passed. **Its pictures are the ones installed.** |
| Rubric | `library/knowledge/private/ux-ui/06-review-rubric.md`, scored 0 to 3 on ten axes per picture; the email rows on axes 1, 3, 4, 10 per its section 4 |

## Method

1. Every picture of each run was compared with the committed baseline pixel by pixel (the count of
   differing pixels, their share of the picture, and the box that holds them), and each later run
   with the run before it, so a fix's reach was measured rather than assumed.
2. Every changed or new picture was read on a labelled contact sheet (eight per sheet, both themes,
   all four frames). Every picture whose change was more than rasterisation was also read at full
   size or cropped to the change, beside the committed picture.
3. Each change is attributed to its causes: the dependency group (React 19.3, Next 16.3.6,
   Playwright 1.63), PRD-008b's decision-aware copy, PRD-008c's copy, the email-preview sandbox, the
   new states S-1, S-2, S-3, and A-1, the populated fix, and this review's own fixes R-1 to R-13.
   PRD-008c changed homeowner copy only; no homeowner screen has a baseline or a sign-off row, so no
   picture changed because of it.
4. A picture below 3 on any axis was a defect, fixed and redrawn (008D-AC-006, 008D-AC-011). After
   each later dispatch only the pictures a fix could reach were re-reviewed, found by the run-to-run
   comparison in step 1.

## Counts

| Kind | Cause | Pictures |
| --- | --- | --- |
| Changed | Dependency group: the notice title's colour by stylesheet order (create, campaign detail, reports), the textarea resize grip, the native select chevrons | 56 |
| Changed | Dependency group: text and native-control rasterisation only, each under 0.02% of its picture | 19 |
| Changed | PRD-008b decision-aware copy (campaign detail approved and already decided, guided setup step 7) | 24 |
| Changed | Email-preview sandbox | 8 |
| Changed | This review's guided-setup fixes (R-1 to R-4, R-12), steps 1 to 6 | 53 |
| Changed | R-7, short pages open at the top (change password, the boundary page) | 22 |
| Changed | R-10, state labels stay inside their cards (overview, onboarding, and the shell rows photographed on the overview) | 28 |
| New | S-1, verify email confirmed | 8 |
| New | S-2, campaigns list empty | 8 |
| New | S-3, guided setup step 5 needs changes | 8 |
| New | A-1, guided setup steps 1 and 2 at 1180 and 390 | 8 |
| New | The populated fix, campaigns list populated | 8 |
| Removed | `campaigns--default`, which the matrix no longer takes (R-5) | 8 |
| **Total** | **210 changed, 40 new, 8 removed** | |

The other 126 pictures (33 synthetic, 93 review) match their committed baselines to the pixel and
keep their 2026-09-21 scores.

## Findings, in the rubric's finding form

Each names the screen, the frame, the theme, the state, the file and line on the run tree `0cf31ab`,
the value, the rule it must be, and the axis; then the fix and its test.

**R-1.** Guided setup step 5, read the result (ready and needs changes), 1440, Light and Dark. The
highlighted result sat under the 78px sticky header with only the bottom edge of its ring showing,
because `resolveAnchorScroll` returned zero whenever the panel fitted beside the element
(`apps/web/src/features/guided-setup/model/panel-placement.ts:130`), and the panel beside it rose to
the 16px margin over the header's theme control and "Sign out" (`panel-placement.ts:101`, placed
without the header at `guided-setup-step.tsx:420`). Rule: PRD-006c D7, "the panel never obscures the
focused element or the shell's sticky header"; brief section 18, "Ensure focus is not obscured by
sticky headers"; WCAG 2.2 SC 2.4.11. Axes 5 and 7. Fixed in `c2c51fe`: beside the panel the element
is kept between the header's end and the viewport's end (`panel-placement.ts:160-174`), and the panel
is clamped to the same floor (`panel-placement.ts:101`, `blockStartFloor` at `:115`;
`guided-setup-step.tsx:427`). Tests: four new cases in `panel-placement.unit.test.ts` ("an element
the panel sits beside", "never places the panel over the shell's sticky header"), red on the old
code.

**R-2.** Guided setup step 5, read the result, needs changes (and ready), 768 and 1180, Light and
Dark. The step pointed at the result's heading alone
(`apps/web/src/features/campaigns/components/persisted-campaign-screen.tsx:113`), so the scroll
cleared the heading and the panel was placed directly on the finding card, the thing the step
explains. Rule: rubric axis 7, "A sticky surface never covers a field, an error, or a focus ring";
PRD-006c D3 step 5 names both `campaign.check.result` and `campaign.check.findings`. Axis 7. Fixed in
`c2c51fe`: the anchor is the check result section, verdict and findings together
(`persisted-campaign-screen.tsx:115-121`). Test: "points step 5 at the verdict and what the checks
found together" in `anchor-registry.integration.test.tsx`, red on the old code.

**R-3.** Guided setup, every step whose panel is taller than its cap, every frame, Light and Dark.
A band of the next progress row showed below Continue and "Not now": the sticky footer sticks to the
scroll box's content edge, and the sheet's `padding: var(--space-5)`
(`packages/ui/src/components/overlay.module.css:106`) put that edge 20px inside the panel. Rule:
`03-components/sheet-and-dialog.md`, "Its footer is `position: sticky` at the end of that scroll
box". Axes 2 and 10. Fixed in `c2c51fe`: the end padding belongs to the footer
(`overlay.module.css:96` and `:112`, and the safe-area rule in the mobile block). Test:
`expectNothingShowsBelowThePanelFooter` (`tests/browser/helpers/design-quality.ts:702`), run at every
captured step and wherever the footer was already measured.

**R-4.** Guided setup step 1, welcome, 1180, 768, and 390, Light and Dark (the new A-1 cells). The
cell scrolled back to the top after the walkthrough had scrolled the quick actions clear of its
panel (`settleForScreenshot` at `tests/browser/review/design-quality.spec.ts:435-436`), so the
picture showed the panel pointing at quick actions below the fold, a state the product never shows.
Rule: rubric axis 1, "The eye lands where the screen spec says it should"; a baseline is a picture of
the screen (`tests/visual/screens/README.md`). A capture defect, not a product one. Fixed in
`d788f35`: the cell starts at the top of the overview and lets the step's own scroll run
(`letTheStepPlaceItself(page, "top")`, `design-quality.spec.ts:477`; the helper at
`tests/browser/review/helpers/guided-setup-journey.ts:385`). Test:
`expectTheStepPointsAtSomethingOnScreen` (`design-quality.spec.ts:489`): on screen, below the
header, inside the viewport, and clear of the panel.

**R-5.** Campaigns list, populated, every frame, Light and Dark. The row had no populated picture:
the matrix took `campaigns--default` (`tests/browser/design-quality.spec.ts:48`) before any test
saved a campaign, so on the runner it was always the empty list. Rule: rubric section 4, "campaigns
list, empty and populated". Fixed in `d788f35` and `2cadc3e`: the matrix takes no default picture of
the screen (`NAMED_STATES_ONLY`, `design-quality.spec.ts:115`);
`tests/browser/helpers/populated-campaign-workspace.ts:67` saves two campaigns through the create
screen into the empty fixture; the case asserts both cards in order and captures
`campaigns--populated` (`design-quality.spec.ts:636`).

**R-6.** Brand; create (default, saving, ready, needs changes); campaign detail (permission
restricted, ready, approved, already decided); reports; every frame, Light and Dark. The notice
title ("Nothing goes out from this page", "Saved", "Sample data, nothing live", "Suggestions only.
You decide what's saved.") took its colour from whichever of two equally specific rules the bundle
loaded last: `.oalo-surface { color: var(--tx-strong) }`
(`packages/ui/src/components/primitives.css:2`) and the module's informational colour
(`open-house-draft-builder.module.css:35`, `brand-profile.module.css:60`, `reporting.module.css:74`).
The dependency group's Next.js changed the order: the committed pictures were dark on create,
campaign detail, and reports and blue on brand, and the first redraw the other way round. Rule:
brief section 9, "Blue means informational", and the pin `onboarding.module.css` already carries.
Axes 4 and 10. Fixed in `0392b64` (`open-house-draft-builder.module.css:48`,
`brand-profile.module.css:69`, `reporting.module.css:86`). Test: "every notice title carries the
informational tone, whatever order the styles load in" (`design-quality.spec.ts:341`), both themes.

**R-7.** Campaigns list (empty and populated), change password (default and saved), the boundary
page; every frame, Light and Dark. A page shorter than the frame was centred vertically: the
bootstrap `main { display: grid; min-height: 100vh; place-items: center }`
(`apps/web/src/app/globals.css:56`) reached the shell's main landmark, which `.content`
(`apps/web/src/features/shell/components/app-shell.module.css:287`) grows to fill. The campaigns
list's title sat about 200px below where its siblings' titles sit. Rule: rubric axis 2, "Vertical
rhythm is consistent within a screen and across sibling screens". Fixed in `0392b64`:
`align-items: start` (`app-shell.module.css:296`); the inline centring is unchanged. Test:
`expectThePageOpensAtTheTopOfItsContent` (`design-quality.ts:660`) in both campaigns cases.

**R-8.** Campaigns list, empty, every frame, Light and Dark. The empty state was a `Card` with a
`strong`, a paragraph, and a link assembled on the page
(`apps/web/src/app/(authenticated)/marketing/campaigns/page.tsx:33-39`). Rule: rubric axis 9,
"`AsyncState` variants, not hand-built views", and
`03-components/async-empty-error-permission-state.md`. Axis 9. Fixed in `0392b64`: `EmptyState`
with its one creation action (`page.tsx:37`). Tests: "says a workspace with no campaigns is empty
through the shared empty state" in `campaigns-review-surface.integration.test.tsx`, red on the old
page; the browser case asserts `.oalo-async-state[data-state='empty']`.

**R-9.** Campaigns list, populated, every frame, Light and Dark. Each card's title was a bare `h2`
at the browser's own size, 24px by cap height, larger than the page's 23px title, with default
margins (`page.tsx:47`). Rule: rubric axis 1, "Page, section, and card titles at their type steps";
axis 2, every gap a `--space-*` token. Axes 1, 2, and 3. Fixed in `0392b64`: `.campaignCard`
(`open-house-draft-builder.module.css:63`), the title at the size and weight of every other card
title in the workspace and the card's gaps at `--space-2`. Test: the populated case asserts that the
card title is smaller than the page title.

**R-10.** Overview at 1440 and 1180 (and the shell rows photographed on it), onboarding at 390;
Light and Dark. A metric or checklist state label ran past its card's edge, because the heading row
never wrapped and the label never shrank (`primitives.css:112` and `:150`): "Not connected" was
clipped, "Needs a refresh" ran outside its card, and "Uncertain, reconciling" was wider than its
card even on a line of its own. Rule: rubric axis 7, layout at every frame. Fixed in `0392b64` and
`02ea08a`: the heading wraps (`primitives.css:115`) and an oversized label shrinks and wraps its
words (`primitives.css:159`). Test: "every metric card keeps its state label inside the card at
every frame" (`design-quality.spec.ts:382`). It failed on run 36825957221 at "Active campaigns",
which is how the second case was found.

**R-11.** Campaign detail, approved, every frame, Light and Dark. Right after a decision the
approval card dropped to one untitled sentence
(`apps/web/src/features/campaigns/components/campaign-approval-controls.tsx:151-160`), while the
same campaign loaded later (already decided) shows the card under its title with the control blocked
and explained. Rule: rubric axes 1 and 10; `04-screens/campaign-lifecycle.md`, "Campaign version is
visible near approval and publishing actions". Fixed in `2be0385`: the card keeps "Approve this
campaign" (`campaign-approval-controls.tsx:159`). Test: the decided-state cases in
`campaign-approval-controls.integration.test.tsx` assert the title.

**R-12.** Shell help menu open at 1180 (Light), most guided-setup pictures at 1180, and buttons on
sign-up, reset password, and sign-in; both themes. Pictures carried an incidental hover wherever the
last click left the pointer, and a resize slid a different control under it from one run to the
next (the theme control's "Dark" option on the help-menu picture was hovered on one run and not on
the run before). Rule: a baseline is a picture of its named state (rubric section 6, the comparison
is the gate), and a hover nobody asked for is not that state. A capture defect. Fixed in `a414eae`:
`parkThePointer` (`design-quality.ts:878`) before every named state and before steps 1 and 2.

**R-13.** Campaigns list, empty and populated, 1440 and 1180, Light and Dark. The list's width
followed its contents, so the shell centred a narrow column and the title moved about 300px between
the empty and the populated state (`page.tsx:24`). Rule: rubric axes 2 and 10. Fixed in `02ea08a`:
the list takes the content column (`.campaignsPage`, `open-house-draft-builder.module.css:60`).
Test: `expectThePageFillsTheContentColumn` (`design-quality.ts:676`) in both campaigns cases.

## The four inputs from lane L6a

1. **Populated picture.** R-5. The sign-off's two rows name `campaigns--empty` and
   `campaigns--populated`.
2. **Step 1's quick actions below the fold.** Judged a capture defect (R-4): the product scrolls the
   quick actions clear of the panel, and the cell undid that scroll. The picture now shows what a
   person sees, and an assertion holds it on every platform.
3. **Step 5 needs changes.** At 1180 the panel covered the finding card (R-2); at 1440 the
   highlighted heading sat under the sticky header and the panel over the header's controls (R-1),
   as in the signed "ready" picture, which was below 3 on axes 5 and 7 when it was signed. Both are
   fixed in the placement model with unit tests. The undecided path is unchanged: steps 5 and 6
   still point at the result and at the approve control or the hand-off link. The guided-setup
   timing, resume, hand-off, accessibility, and tablet-anchoring specs pass on the runner in all
   three dispatches (review project 104 passed each time).
4. **The renamed A-1 test.** The sign-off names it by its new name, "the guided setup's steps 1 and
   2 meet the bar at every frame, in both themes", and records the old one.

## Rows the brief asked to be re-scored

| Row | Pictures | Result |
| --- | --- | --- |
| Campaign detail, approved | 8 | PRD-008b's "Checks passed", "Who decided", and the decided card, plus R-6 and R-11. 3 on every axis after R-11. The decision time is masked, as on already decided. |
| Campaign detail, already decided | 8 | PRD-008b's copy plus R-6. 3 on every axis. |
| Guided setup step 7 | 8 | PRD-008b's decision-aware lead ("saved and waiting for approval" on the approver's path, which photographs before approving) plus R-3 and R-12. 3 on every axis. Step 7's other branches (approved, needs changes, sent back, none, unknown) are the same panel with a different first sentence, held by `step-model.unit.test.ts`. |
| Email preview, both emails | 8 | The sandboxed frame draws text with greyscale anti-aliasing in Light; in Dark only the frame's edge rows differ. Same layout, type, and contrast. 3 on axes 1, 3, 4, 10. |
| Homeowner screens whose copy 008c changed | 0 | None is a row of the sign-off and none has a baseline. |

## Recorded, not fixed here: two system-level deltas for `design-system-guardian`

Both were on the tree the 2026-09-21 sign-off signed, both reach rows other than the ones this run
changed, and both would move every screen, which brief section 20 and the Weapon's escalation rule
give to `design-system-guardian`. This lane may not edit `library/knowledge/private/ux-ui/`, so the
proposed section 5 entries are written here for their owner to record.

| # | Delta | Measurement | Proposed owner | Proposed fix |
| --- | --- | --- | --- | --- |
| D-009 | Page paragraphs that no module sizes render at the browser's 16px default, not brief section 10's 13px body step. `globals.css` sets no root size, and module rules such as `.header p` and `.review p` (`open-house-draft-builder.module.css:15-21`) set colour and leading only. | A 12px cap height on the campaigns list's lead sentence at 1440, which is 16px in the runner's sans face, while the page title measures the specified 23px. The same holds on campaign detail, the overview, change password, and the account screens. | `design-system-guardian` | Decide how the body step is applied (on the shell's content and the account layout, or per module) and redraw every screen once. |
| D-010 | The bootstrap `section { max-width: 44rem }` (`apps/web/src/app/globals.css:60`) caps every `section` in the shell, so the overview's metric grids put four cards in 704px at 1440 and 1180. The word value "Unavailable" in the synthetic overview's "More numbers" runs into its card's end padding. | The value's last glyph ends 2px inside the card's border at 1440 (`overview--default--1440--light.png`). | `design-system-guardian` | Remove or scope the bootstrap rule for the shell's content (the dashboard preview already overrides it), size the metric grids to the column, and redraw the shell screens once. |

**Ruled 2026-10-01 by `design-system-guardian`: both fix now.** Both are recorded in section 5 of
`library/knowledge/private/ux-ui/06-review-rubric.md` (rows D-009 and D-010, and "The rulings of
2026-10-01"), with the measurements corrected, the exact change, the pictures each moves, and the
gates. Neither is accepted or deferred, so neither closes by its entry: until the fix and its single
redraw land, the pictures each reaches are below 3 on the axes the ruling names (D-009 axes 1 and 3;
D-010 axes 2, 7, and 10 at 1440 and 1180), and 008D-AC-006 closes on them only through the review of
the redrawn set.

**Fixed and closed 2026-10-01** by lane L6c: see "Second redraw: D-009 and D-010 (008D-AC-011)"
below, which reviews the redrawn set and records the gates red and green.

Two observations that are not deltas against the brief or a specification, for the screens'
owners: the decided campaign page says "won't run as an ad yet" in four places (PRD-008b's copy,
which the 008c writing review read); and the walkthrough panel puts the progress track before a
step's own content, so step 2's fields start below the panel's fold (PRD-006c fixes neither order).

## Baseline change note for pull request #74

```text
Baseline change: PRD-008d single redraw of every screen baseline (screen-baselines runs 36823126319, 36825957221, 36828316006; the installed set is run 36828316006's). 210 pictures changed, 40 are new, 8 are removed, each reviewed against 06-review-rubric.md in library/requirements/in-work/prd-008-finish-line-hardening/qa/2026-10-01-008d-baseline-review.md. Causes: the dependency group (React 19.3, Next 16.3.6, Playwright 1.63: the notice title's colour by stylesheet order, now pinned, and native-control rasterisation); PRD-008b's decision-aware copy (campaign detail approved and already decided, guided setup step 7); the email preview's sandbox; the new states S-1 (verify email confirmed), S-2 (campaigns list empty), S-3 (guided setup step 5 needs changes), and A-1 (steps 1 and 2 at 1180 and 390); campaigns--populated replacing campaigns--default; and the review's fixes R-1 to R-13 (the walkthrough kept clear of the sticky header and pointing at the whole step 5 result, the panel footer at the panel's edge, short pages at the top of the content, the shared empty state, card titles at their step, state labels inside their cards, the decided approval card's title, and the pointer parked before every picture).
```

## Per-picture table

Every picture whose pixels differ from its committed baseline, every new picture, and every removed
picture, on the installed set (run 36828316006). "3 on every axis" is the rubric's top score on all
ten axes at that frame and theme. The eight removed `campaigns--default` pictures are listed by name
with their cause, R-5; a removed picture is not installed, so it carries no score.

| Picture | Change against the committed baseline | Cause | Score | Verdict |
| --- | --- | --- | --- | --- |
| `chromium/brand--default--768--dark.png` | changed, 529 px (0.016%) | text and native-control rasterisation only (dependency group: Playwright 1.63's Chromium) | 3 on every axis | pass |
| `chromium/campaign-create--default--1180--dark.png` | changed, 2558 px (0.121%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--default--1180--light.png` | changed, 2478 px (0.117%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--default--1440--dark.png` | changed, 2549 px (0.099%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--default--1440--light.png` | changed, 2500 px (0.097%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--default--390--dark.png` | changed, 2558 px (0.264%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--default--390--light.png` | changed, 2478 px (0.255%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--default--768--dark.png` | changed, 2558 px (0.137%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--default--768--light.png` | changed, 2478 px (0.133%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--needs-changes--1180--dark.png` | changed, 2797 px (0.096%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--needs-changes--1180--light.png` | changed, 2717 px (0.093%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--needs-changes--1440--dark.png` | changed, 2549 px (0.072%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--needs-changes--1440--light.png` | changed, 2500 px (0.070%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--needs-changes--390--dark.png` | changed, 2558 px (0.193%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--needs-changes--390--light.png` | changed, 2478 px (0.187%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--needs-changes--768--dark.png` | changed, 2558 px (0.100%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--needs-changes--768--light.png` | changed, 2478 px (0.096%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--ready-for-approval--1180--dark.png` | changed, 2797 px (0.099%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--ready-for-approval--1180--light.png` | changed, 2717 px (0.096%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--ready-for-approval--1440--dark.png` | changed, 2549 px (0.074%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--ready-for-approval--1440--light.png` | changed, 2500 px (0.073%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--ready-for-approval--390--dark.png` | changed, 2558 px (0.197%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--ready-for-approval--390--light.png` | changed, 2478 px (0.191%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--ready-for-approval--768--dark.png` | changed, 2558 px (0.103%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--ready-for-approval--768--light.png` | changed, 2478 px (0.099%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--saving--1180--dark.png` | changed, 2797 px (0.132%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--saving--1180--light.png` | changed, 2717 px (0.128%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--saving--1440--dark.png` | changed, 2549 px (0.099%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--saving--1440--light.png` | changed, 2500 px (0.097%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--saving--390--dark.png` | changed, 2558 px (0.264%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--saving--390--light.png` | changed, 2478 px (0.255%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--saving--768--dark.png` | changed, 2558 px (0.137%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-create--saving--768--light.png` | changed, 2478 px (0.133%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the textarea resize grip | 3 on every axis | pass |
| `chromium/campaign-detail--permission-restricted--1180--dark.png` | changed, 1688 px (0.075%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) | 3 on every axis | pass |
| `chromium/campaign-detail--permission-restricted--1180--light.png` | changed, 1702 px (0.075%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) | 3 on every axis | pass |
| `chromium/campaign-detail--permission-restricted--1440--dark.png` | changed, 1688 px (0.062%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) | 3 on every axis | pass |
| `chromium/campaign-detail--permission-restricted--1440--light.png` | changed, 1702 px (0.063%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) | 3 on every axis | pass |
| `chromium/campaign-detail--permission-restricted--390--dark.png` | changed, 1688 px (0.162%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) | 3 on every axis | pass |
| `chromium/campaign-detail--permission-restricted--390--light.png` | changed, 1702 px (0.163%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) | 3 on every axis | pass |
| `chromium/campaign-detail--permission-restricted--768--dark.png` | changed, 1688 px (0.087%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) | 3 on every axis | pass |
| `chromium/campaign-detail--permission-restricted--768--light.png` | changed, 1702 px (0.088%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) | 3 on every axis | pass |
| `chromium/campaigns--default--1180--dark.png` | removed (`2cadc3e`) | R-5: the matrix takes no default picture of the campaigns list; `campaigns--empty` and `campaigns--populated` replace it | not installed | removed |
| `chromium/campaigns--default--1180--light.png` | removed (`2cadc3e`) | R-5: the matrix takes no default picture of the campaigns list; `campaigns--empty` and `campaigns--populated` replace it | not installed | removed |
| `chromium/campaigns--default--1440--dark.png` | removed (`2cadc3e`) | R-5: the matrix takes no default picture of the campaigns list; `campaigns--empty` and `campaigns--populated` replace it | not installed | removed |
| `chromium/campaigns--default--1440--light.png` | removed (`2cadc3e`) | R-5: the matrix takes no default picture of the campaigns list; `campaigns--empty` and `campaigns--populated` replace it | not installed | removed |
| `chromium/campaigns--default--390--dark.png` | removed (`2cadc3e`) | R-5: the matrix takes no default picture of the campaigns list; `campaigns--empty` and `campaigns--populated` replace it | not installed | removed |
| `chromium/campaigns--default--390--light.png` | removed (`2cadc3e`) | R-5: the matrix takes no default picture of the campaigns list; `campaigns--empty` and `campaigns--populated` replace it | not installed | removed |
| `chromium/campaigns--default--768--dark.png` | removed (`2cadc3e`) | R-5: the matrix takes no default picture of the campaigns list; `campaigns--empty` and `campaigns--populated` replace it | not installed | removed |
| `chromium/campaigns--default--768--light.png` | removed (`2cadc3e`) | R-5: the matrix takes no default picture of the campaigns list; `campaigns--empty` and `campaigns--populated` replace it | not installed | removed |
| `chromium/campaigns--empty--1180--dark.png` | new | S-2 (L6a), drawn after R-7, R-8, R-13 | 3 on every axis | pass |
| `chromium/campaigns--empty--1180--light.png` | new | S-2 (L6a), drawn after R-7, R-8, R-13 | 3 on every axis | pass |
| `chromium/campaigns--empty--1440--dark.png` | new | S-2 (L6a), drawn after R-7, R-8, R-13 | 3 on every axis | pass |
| `chromium/campaigns--empty--1440--light.png` | new | S-2 (L6a), drawn after R-7, R-8, R-13 | 3 on every axis | pass |
| `chromium/campaigns--empty--390--dark.png` | new | S-2 (L6a), drawn after R-7, R-8, R-13 | 3 on every axis | pass |
| `chromium/campaigns--empty--390--light.png` | new | S-2 (L6a), drawn after R-7, R-8, R-13 | 3 on every axis | pass |
| `chromium/campaigns--empty--768--dark.png` | new | S-2 (L6a), drawn after R-7, R-8, R-13 | 3 on every axis | pass |
| `chromium/campaigns--empty--768--light.png` | new | S-2 (L6a), drawn after R-7, R-8, R-13 | 3 on every axis | pass |
| `chromium/campaigns--populated--1180--dark.png` | new | Populated fixture (R-5), drawn after R-7, R-9, R-13 | 3 on every axis | pass |
| `chromium/campaigns--populated--1180--light.png` | new | Populated fixture (R-5), drawn after R-7, R-9, R-13 | 3 on every axis | pass |
| `chromium/campaigns--populated--1440--dark.png` | new | Populated fixture (R-5), drawn after R-7, R-9, R-13 | 3 on every axis | pass |
| `chromium/campaigns--populated--1440--light.png` | new | Populated fixture (R-5), drawn after R-7, R-9, R-13 | 3 on every axis | pass |
| `chromium/campaigns--populated--390--dark.png` | new | Populated fixture (R-5), drawn after R-7, R-9, R-13 | 3 on every axis | pass |
| `chromium/campaigns--populated--390--light.png` | new | Populated fixture (R-5), drawn after R-7, R-9, R-13 | 3 on every axis | pass |
| `chromium/campaigns--populated--768--dark.png` | new | Populated fixture (R-5), drawn after R-7, R-9, R-13 | 3 on every axis | pass |
| `chromium/campaigns--populated--768--light.png` | new | Populated fixture (R-5), drawn after R-7, R-9, R-13 | 3 on every axis | pass |
| `chromium/design-surfaces--default--1180--dark.png` | changed, 269536 px (25.380%) | R-7: the boundary page opens at the top of the content | 3 on every axis | pass |
| `chromium/design-surfaces--default--1180--light.png` | changed, 268870 px (25.317%) | R-7: the boundary page opens at the top of the content | 3 on every axis | pass |
| `chromium/design-surfaces--default--1440--dark.png` | changed, 269535 px (20.797%) | R-7: the boundary page opens at the top of the content | 3 on every axis | pass |
| `chromium/design-surfaces--default--1440--light.png` | changed, 268870 px (20.746%) | R-7: the boundary page opens at the top of the content | 3 on every axis | pass |
| `chromium/design-surfaces--default--768--dark.png` | changed, 193411 px (24.593%) | R-7: the boundary page opens at the top of the content | 3 on every axis | pass |
| `chromium/design-surfaces--default--768--light.png` | changed, 192826 px (24.519%) | R-7: the boundary page opens at the top of the content | 3 on every axis | pass |
| `chromium/email-preview--default--1180--dark.png` | changed, 24 px (0.002%) | Email-preview sandbox: the frame's edge rows | 3 on axes 1, 3, 4, 10 | pass |
| `chromium/email-preview--default--1180--light.png` | changed, 19122 px (1.801%) | Email-preview sandbox: the sandboxed frame draws text with greyscale anti-aliasing | 3 on axes 1, 3, 4, 10 | pass |
| `chromium/email-preview--default--1440--dark.png` | changed, 26 px (0.002%) | Email-preview sandbox: the frame's edge rows | 3 on axes 1, 3, 4, 10 | pass |
| `chromium/email-preview--default--1440--light.png` | changed, 19122 px (1.475%) | Email-preview sandbox: the sandboxed frame draws text with greyscale anti-aliasing | 3 on axes 1, 3, 4, 10 | pass |
| `chromium/email-preview--default--390--dark.png` | changed, 56 px (0.017%) | Email-preview sandbox: the frame's edge rows | 3 on axes 1, 3, 4, 10 | pass |
| `chromium/email-preview--default--390--light.png` | changed, 19109 px (5.805%) | Email-preview sandbox: the sandboxed frame draws text with greyscale anti-aliasing | 3 on axes 1, 3, 4, 10 | pass |
| `chromium/email-preview--default--768--dark.png` | changed, 24 px (0.003%) | Email-preview sandbox: the frame's edge rows | 3 on axes 1, 3, 4, 10 | pass |
| `chromium/email-preview--default--768--light.png` | changed, 19122 px (2.431%) | Email-preview sandbox: the sandboxed frame draws text with greyscale anti-aliasing | 3 on axes 1, 3, 4, 10 | pass |
| `chromium/onboarding--default--390--dark.png` | changed, page length moved, 153638 px (8.770%) | R-10: checklist state labels wrap under long titles | 3 on every axis | pass |
| `chromium/onboarding--default--390--light.png` | changed, page length moved, 149097 px (8.511%) | R-10: checklist state labels wrap under long titles | 3 on every axis | pass |
| `chromium/onboarding--default--768--light.png` | changed, 530 px (0.016%) | text and native-control rasterisation only (dependency group: Playwright 1.63's Chromium) | 3 on every axis | pass |
| `chromium/overview--default--1180--dark.png` | changed, page length moved, 928226 px (11.420%) | R-10: metric state labels wrap inside their cards | 3 on every axis | pass |
| `chromium/overview--default--1180--light.png` | changed, page length moved, 863428 px (10.623%) | R-10: metric state labels wrap inside their cards | 3 on every axis | pass |
| `chromium/overview--default--1440--dark.png` | changed, page length moved, 1743872 px (18.600%) | R-10: metric state labels wrap inside their cards | 3 on every axis | pass |
| `chromium/overview--default--1440--light.png` | changed, page length moved, 1642154 px (17.515%) | R-10: metric state labels wrap inside their cards | 3 on every axis | pass |
| `chromium/overview--default--768--light.png` | changed, 530 px (0.006%) | text and native-control rasterisation only (dependency group: Playwright 1.63's Chromium) | 3 on every axis | pass |
| `chromium/reports--default--1180--dark.png` | changed, 1916 px (0.017%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the native select chevrons | 3 on every axis | pass |
| `chromium/reports--default--1180--light.png` | changed, 1897 px (0.017%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the native select chevrons | 3 on every axis | pass |
| `chromium/reports--default--1440--dark.png` | changed, 1912 px (0.014%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the native select chevrons | 3 on every axis | pass |
| `chromium/reports--default--1440--light.png` | changed, 1923 px (0.014%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the native select chevrons | 3 on every axis | pass |
| `chromium/reports--default--390--dark.png` | changed, 1916 px (0.035%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the native select chevrons | 3 on every axis | pass |
| `chromium/reports--default--390--light.png` | changed, 1897 px (0.034%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the native select chevrons | 3 on every axis | pass |
| `chromium/reports--default--768--dark.png` | changed, 1916 px (0.019%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the native select chevrons | 3 on every axis | pass |
| `chromium/reports--default--768--light.png` | changed, 1897 px (0.018%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) and the native select chevrons | 3 on every axis | pass |
| `review/campaign-detail--already-decided--1180--dark.png` | changed, page length moved, 471344 px (18.001%) | 008b decision-aware copy ("Checks passed", the "Who decided" card, the decided approval card), R-6 notice title | 3 on every axis | pass |
| `review/campaign-detail--already-decided--1180--light.png` | changed, page length moved, 432622 px (16.522%) | 008b decision-aware copy ("Checks passed", the "Who decided" card, the decided approval card), R-6 notice title | 3 on every axis | pass |
| `review/campaign-detail--already-decided--1440--dark.png` | changed, page length moved, 518024 px (17.001%) | 008b decision-aware copy ("Checks passed", the "Who decided" card, the decided approval card), R-6 notice title | 3 on every axis | pass |
| `review/campaign-detail--already-decided--1440--light.png` | changed, page length moved, 476130 px (15.626%) | 008b decision-aware copy ("Checks passed", the "Who decided" card, the decided approval card), R-6 notice title | 3 on every axis | pass |
| `review/campaign-detail--already-decided--390--dark.png` | changed, page length moved, 285311 px (23.365%) | 008b decision-aware copy ("Checks passed", the "Who decided" card, the decided approval card), R-6 notice title | 3 on every axis | pass |
| `review/campaign-detail--already-decided--390--light.png` | changed, page length moved, 268848 px (22.017%) | 008b decision-aware copy ("Checks passed", the "Who decided" card, the decided approval card), R-6 notice title | 3 on every axis | pass |
| `review/campaign-detail--already-decided--768--dark.png` | changed, page length moved, 368890 px (16.655%) | 008b decision-aware copy ("Checks passed", the "Who decided" card, the decided approval card), R-6 notice title | 3 on every axis | pass |
| `review/campaign-detail--already-decided--768--light.png` | changed, page length moved, 339187 px (15.314%) | 008b decision-aware copy ("Checks passed", the "Who decided" card, the decided approval card), R-6 notice title | 3 on every axis | pass |
| `review/campaign-detail--approved--1180--dark.png` | changed, page length moved, 360679 px (16.147%) | 008b decision-aware copy ("Checks passed", the "Who decided" card, the decided approval card), R-6 notice title, R-11 (the card keeps its title) | 3 on every axis | pass |
| `review/campaign-detail--approved--1180--light.png` | changed, page length moved, 326025 px (14.595%) | 008b decision-aware copy ("Checks passed", the "Who decided" card, the decided approval card), R-6 notice title, R-11 (the card keeps its title) | 3 on every axis | pass |
| `review/campaign-detail--approved--1440--dark.png` | changed, page length moved, 420099 px (16.298%) | 008b decision-aware copy ("Checks passed", the "Who decided" card, the decided approval card), R-6 notice title, R-11 (the card keeps its title) | 3 on every axis | pass |
| `review/campaign-detail--approved--1440--light.png` | changed, page length moved, 379153 px (14.710%) | 008b decision-aware copy ("Checks passed", the "Who decided" card, the decided approval card), R-6 notice title, R-11 (the card keeps its title) | 3 on every axis | pass |
| `review/campaign-detail--approved--390--dark.png` | changed, page length moved, 189502 px (17.937%) | 008b decision-aware copy ("Checks passed", the "Who decided" card, the decided approval card), R-6 notice title, R-11 (the card keeps its title) | 3 on every axis | pass |
| `review/campaign-detail--approved--390--light.png` | changed, page length moved, 177118 px (16.764%) | 008b decision-aware copy ("Checks passed", the "Who decided" card, the decided approval card), R-6 notice title, R-11 (the card keeps its title) | 3 on every axis | pass |
| `review/campaign-detail--approved--768--dark.png` | changed, page length moved, 232164 px (11.996%) | 008b decision-aware copy ("Checks passed", the "Who decided" card, the decided approval card), R-6 notice title, R-11 (the card keeps its title) | 3 on every axis | pass |
| `review/campaign-detail--approved--768--light.png` | changed, page length moved, 205744 px (10.631%) | 008b decision-aware copy ("Checks passed", the "Who decided" card, the decided approval card), R-6 notice title, R-11 (the card keeps its title) | 3 on every axis | pass |
| `review/campaign-detail--ready--1180--dark.png` | changed, 5791 px (0.259%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) | 3 on every axis | pass |
| `review/campaign-detail--ready--1180--light.png` | changed, 5842 px (0.262%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) | 3 on every axis | pass |
| `review/campaign-detail--ready--1440--dark.png` | changed, 471 px (0.018%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) | 3 on every axis | pass |
| `review/campaign-detail--ready--1440--light.png` | changed, 470 px (0.018%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) | 3 on every axis | pass |
| `review/campaign-detail--ready--390--dark.png` | changed, 839 px (0.081%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) | 3 on every axis | pass |
| `review/campaign-detail--ready--390--light.png` | changed, 839 px (0.081%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) | 3 on every axis | pass |
| `review/campaign-detail--ready--768--dark.png` | changed, 471 px (0.025%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) | 3 on every axis | pass |
| `review/campaign-detail--ready--768--light.png` | changed, 470 px (0.024%) | Dependency group: notice title colour by stylesheet order (R-6, pinned blue) | 3 on every axis | pass |
| `review/change-password--default--1180--dark.png` | changed, 131729 px (12.404%) | R-7: the page opens at the top of the content | 3 on every axis | pass |
| `review/change-password--default--1180--light.png` | changed, 129455 px (12.190%) | R-7: the page opens at the top of the content | 3 on every axis | pass |
| `review/change-password--default--1440--dark.png` | changed, 118039 px (9.108%) | R-7: the page opens at the top of the content | 3 on every axis | pass |
| `review/change-password--default--1440--light.png` | changed, 116308 px (8.974%) | R-7: the page opens at the top of the content | 3 on every axis | pass |
| `review/change-password--default--390--dark.png` | changed, 86593 px (26.307%) | R-7: the page opens at the top of the content | 3 on every axis | pass |
| `review/change-password--default--390--light.png` | changed, 85667 px (26.026%) | R-7: the page opens at the top of the content | 3 on every axis | pass |
| `review/change-password--default--768--dark.png` | changed, 120402 px (15.310%) | R-7: the page opens at the top of the content | 3 on every axis | pass |
| `review/change-password--default--768--light.png` | changed, 118749 px (15.100%) | R-7: the page opens at the top of the content | 3 on every axis | pass |
| `review/change-password--saved--1180--dark.png` | changed, 186064 px (17.520%) | R-7: the page opens at the top of the content | 3 on every axis | pass |
| `review/change-password--saved--1180--light.png` | changed, 184240 px (17.348%) | R-7: the page opens at the top of the content | 3 on every axis | pass |
| `review/change-password--saved--1440--dark.png` | changed, 173669 px (13.400%) | R-7: the page opens at the top of the content | 3 on every axis | pass |
| `review/change-password--saved--1440--light.png` | changed, 171833 px (13.259%) | R-7: the page opens at the top of the content | 3 on every axis | pass |
| `review/change-password--saved--390--dark.png` | changed, 368 px (0.108%) | R-7: the page opens at the top of the content | 3 on every axis | pass |
| `review/change-password--saved--390--light.png` | changed, 10 px (0.003%) | R-7: the page opens at the top of the content | 3 on every axis | pass |
| `review/change-password--saved--768--dark.png` | changed, 198990 px (25.303%) | R-7: the page opens at the top of the content | 3 on every axis | pass |
| `review/change-password--saved--768--light.png` | changed, 197170 px (25.071%) | R-7: the page opens at the top of the content | 3 on every axis | pass |
| `review/guided-setup--step-1-welcome--1180--dark.png` | new | A-1 (L6a), drawn after R-4, R-3, R-10, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-1-welcome--1180--light.png` | new | A-1 (L6a), drawn after R-4, R-3, R-10, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-1-welcome--1440--dark.png` | changed, 609449 px (47.025%) | R-4 (photographed after the product's own scroll), R-3, R-10, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-1-welcome--1440--light.png` | changed, 590992 px (45.601%) | R-4 (photographed after the product's own scroll), R-3, R-10, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-1-welcome--390--dark.png` | new | A-1 (L6a), drawn after R-4, R-3, R-10, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-1-welcome--390--light.png` | new | A-1 (L6a), drawn after R-4, R-3, R-10, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-1-welcome--768--dark.png` | changed, 171514 px (21.809%) | R-4 (photographed after the product's own scroll), R-3, R-10, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-1-welcome--768--light.png` | changed, 160292 px (20.382%) | R-4 (photographed after the product's own scroll), R-3, R-10, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-2-your-details--1180--dark.png` | new | A-1 (L6a), drawn after R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-2-your-details--1180--light.png` | new | A-1 (L6a), drawn after R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-2-your-details--1440--dark.png` | changed, 6907 px (0.533%) | R-3 (footer ends the panel), R-12 | 3 on every axis | pass |
| `review/guided-setup--step-2-your-details--1440--light.png` | changed, 6902 px (0.533%) | R-3 (footer ends the panel), R-12 | 3 on every axis | pass |
| `review/guided-setup--step-2-your-details--390--dark.png` | new | A-1 (L6a), drawn after R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-2-your-details--390--light.png` | new | A-1 (L6a), drawn after R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-2-your-details--768--dark.png` | changed, 2936 px (0.373%) | R-3 (footer ends the panel), R-12 | 3 on every axis | pass |
| `review/guided-setup--step-2-your-details--768--light.png` | changed, 2929 px (0.372%) | R-3 (footer ends the panel), R-12 | 3 on every axis | pass |
| `review/guided-setup--step-3-your-realtor-partner--1180--dark.png` | changed, 5990 px (0.564%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-3-your-realtor-partner--1180--light.png` | changed, 5968 px (0.562%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-3-your-realtor-partner--1440--dark.png` | changed, 626 px (0.048%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-3-your-realtor-partner--1440--light.png` | changed, 640 px (0.049%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-3-your-realtor-partner--390--dark.png` | changed, 3468 px (1.054%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-3-your-realtor-partner--390--light.png` | changed, 3409 px (1.036%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-3-your-realtor-partner--768--dark.png` | changed, 626 px (0.080%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-3-your-realtor-partner--768--light.png` | changed, 628 px (0.080%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-first-field--1180--dark.png` | changed, 6604 px (0.622%) | R-3, R-1 (panel floor), R-12 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-first-field--1180--light.png` | changed, 6562 px (0.618%) | R-3, R-1 (panel floor), R-12 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-first-field--1440--dark.png` | changed, 1282 px (0.099%) | R-3, R-1 (panel floor), R-12 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-first-field--1440--light.png` | changed, 1234 px (0.095%) | R-3, R-1 (panel floor), R-12 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-first-field--390--dark.png` | changed, 2944 px (0.894%) | R-3, R-1 (panel floor), R-12 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-first-field--390--light.png` | changed, 3284 px (0.998%) | R-3, R-1 (panel floor), R-12 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-first-field--768--dark.png` | changed, 1191 px (0.151%) | R-3, R-1 (panel floor), R-12 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-first-field--768--light.png` | changed, 1164 px (0.148%) | R-3, R-1 (panel floor), R-12 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-last-field--1180--dark.png` | changed, 5366 px (0.505%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-last-field--1180--light.png` | changed, 5330 px (0.502%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-last-field--1440--dark.png` | changed, 42 px (0.003%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-last-field--390--dark.png` | changed, 2557 px (0.777%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-last-field--390--light.png` | changed, 2478 px (0.753%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result--1180--dark.png` | changed, 261583 px (24.631%) | R-1, R-2 (step 5 points at the whole result), R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result--1180--light.png` | changed, 211302 px (19.897%) | R-1, R-2 (step 5 points at the whole result), R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result--1440--dark.png` | changed, 420370 px (32.436%) | R-1, R-2 (step 5 points at the whole result), R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result--1440--light.png` | changed, 373998 px (28.858%) | R-1, R-2 (step 5 points at the whole result), R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result--390--dark.png` | changed, 4481 px (1.361%) | R-1, R-2 (step 5 points at the whole result), R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result--390--light.png` | changed, 4606 px (1.399%) | R-1, R-2 (step 5 points at the whole result), R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result--768--dark.png` | changed, 142125 px (18.072%) | R-1, R-2 (step 5 points at the whole result), R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result--768--light.png` | changed, 129423 px (16.457%) | R-1, R-2 (step 5 points at the whole result), R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result-needs-changes--1180--dark.png` | new | S-3 (L6a), drawn after R-1, R-2, R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result-needs-changes--1180--light.png` | new | S-3 (L6a), drawn after R-1, R-2, R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result-needs-changes--1440--dark.png` | new | S-3 (L6a), drawn after R-1, R-2, R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result-needs-changes--1440--light.png` | new | S-3 (L6a), drawn after R-1, R-2, R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result-needs-changes--390--dark.png` | new | S-3 (L6a), drawn after R-1, R-2, R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result-needs-changes--390--light.png` | new | S-3 (L6a), drawn after R-1, R-2, R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result-needs-changes--768--dark.png` | new | S-3 (L6a), drawn after R-1, R-2, R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result-needs-changes--768--light.png` | new | S-3 (L6a), drawn after R-1, R-2, R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-6-approve--1180--dark.png` | changed, 8300 px (0.782%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-6-approve--1180--light.png` | changed, 8257 px (0.777%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-6-approve--1440--dark.png` | changed, 2972 px (0.229%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-6-approve--1440--light.png` | changed, 2958 px (0.228%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-6-approve--390--dark.png` | changed, 2461 px (0.748%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-6-approve--390--light.png` | changed, 2185 px (0.664%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-6-approve--768--dark.png` | changed, 1459 px (0.186%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-6-approve--768--light.png` | changed, 1461 px (0.186%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-6-hand-off--1180--dark.png` | changed, 8300 px (0.782%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-6-hand-off--1180--light.png` | changed, 8257 px (0.777%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-6-hand-off--1440--dark.png` | changed, 2936 px (0.227%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-6-hand-off--1440--light.png` | changed, 2929 px (0.226%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-6-hand-off--390--dark.png` | changed, 1970 px (0.598%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-6-hand-off--390--light.png` | changed, 1911 px (0.581%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-6-hand-off--768--dark.png` | changed, 1459 px (0.186%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-6-hand-off--768--light.png` | changed, 1461 px (0.186%) | R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-7-what-happens-next--1180--dark.png` | changed, 42111 px (3.965%) | 008b decision-aware copy ("saved and waiting for approval"), R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-7-what-happens-next--1180--light.png` | changed, 41610 px (3.918%) | 008b decision-aware copy ("saved and waiting for approval"), R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-7-what-happens-next--1440--dark.png` | changed, 36776 px (2.838%) | 008b decision-aware copy ("saved and waiting for approval"), R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-7-what-happens-next--1440--light.png` | changed, 36311 px (2.802%) | 008b decision-aware copy ("saved and waiting for approval"), R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-7-what-happens-next--390--dark.png` | changed, 18138 px (5.510%) | 008b decision-aware copy ("saved and waiting for approval"), R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-7-what-happens-next--390--light.png` | changed, 18097 px (5.498%) | 008b decision-aware copy ("saved and waiting for approval"), R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-7-what-happens-next--768--dark.png` | changed, 35467 px (4.510%) | 008b decision-aware copy ("saved and waiting for approval"), R-3, R-12 | 3 on every axis | pass |
| `review/guided-setup--step-7-what-happens-next--768--light.png` | changed, 35009 px (4.452%) | 008b decision-aware copy ("saved and waiting for approval"), R-3, R-12 | 3 on every axis | pass |
| `review/reset-password--link-expired--1180--dark.png` | changed, 872 px (0.082%) | text and native-control rasterisation only (dependency group: Playwright 1.63's Chromium); R-12 removed a button hover | 3 on every axis | pass |
| `review/reset-password--link-expired--1180--light.png` | changed, 872 px (0.082%) | text and native-control rasterisation only (dependency group: Playwright 1.63's Chromium); R-12 removed a button hover | 3 on every axis | pass |
| `review/reset-password--link-expired--1440--dark.png` | changed, 872 px (0.067%) | text and native-control rasterisation only (dependency group: Playwright 1.63's Chromium); R-12 removed a button hover | 3 on every axis | pass |
| `review/reset-password--link-expired--1440--light.png` | changed, 872 px (0.067%) | text and native-control rasterisation only (dependency group: Playwright 1.63's Chromium); R-12 removed a button hover | 3 on every axis | pass |
| `review/reset-password--link-expired--768--dark.png` | changed, 27 px (0.003%) | text and native-control rasterisation only (dependency group: Playwright 1.63's Chromium); R-12 removed a button hover | 3 on every axis | pass |
| `review/reset-password--link-expired--768--light.png` | changed, 25 px (0.003%) | text and native-control rasterisation only (dependency group: Playwright 1.63's Chromium); R-12 removed a button hover | 3 on every axis | pass |
| `review/reset-password--saved-notice--1180--dark.png` | changed, page length moved, 759760 px (10.170%) | R-10 on the overview behind the shell (metric labels wrap), R-12 removed an incidental hover | 3 on every axis | pass |
| `review/reset-password--saved-notice--1180--light.png` | changed, page length moved, 715410 px (9.576%) | R-10 on the overview behind the shell (metric labels wrap), R-12 removed an incidental hover | 3 on every axis | pass |
| `review/reset-password--saved-notice--1440--dark.png` | changed, page length moved, 1257859 px (14.646%) | R-10 on the overview behind the shell (metric labels wrap), R-12 removed an incidental hover | 3 on every axis | pass |
| `review/reset-password--saved-notice--1440--light.png` | changed, page length moved, 1184817 px (13.796%) | R-10 on the overview behind the shell (metric labels wrap), R-12 removed an incidental hover | 3 on every axis | pass |
| `review/reset-password--saved-notice--390--dark.png` | changed, page length moved, 776967 px (18.441%) | R-10 on the overview behind the shell (metric labels wrap), R-12 removed an incidental hover | 3 on every axis | pass |
| `review/reset-password--saved-notice--390--light.png` | changed, page length moved, 751048 px (17.826%) | R-10 on the overview behind the shell (metric labels wrap), R-12 removed an incidental hover | 3 on every axis | pass |
| `review/shell--collapsed-rail--1180--dark.png` | changed, page length moved, 764057 px (10.437%) | R-10 on the overview behind the shell (metric labels wrap), R-12 removed an incidental hover | 3 on every axis | pass |
| `review/shell--collapsed-rail--1180--light.png` | changed, page length moved, 719676 px (9.831%) | R-10 on the overview behind the shell (metric labels wrap), R-12 removed an incidental hover | 3 on every axis | pass |
| `review/shell--collapsed-rail--1440--dark.png` | changed, page length moved, 1254748 px (14.821%) | R-10 on the overview behind the shell (metric labels wrap), R-12 removed an incidental hover | 3 on every axis | pass |
| `review/shell--collapsed-rail--1440--light.png` | changed, page length moved, 1182767 px (13.971%) | R-10 on the overview behind the shell (metric labels wrap), R-12 removed an incidental hover | 3 on every axis | pass |
| `review/shell--finish-setup-chip--1180--dark.png` | changed, page length moved, 769370 px (10.409%) | R-10 on the overview behind the shell (metric labels wrap), R-12 removed an incidental hover | 3 on every axis | pass |
| `review/shell--finish-setup-chip--1180--light.png` | changed, page length moved, 725039 px (9.809%) | R-10 on the overview behind the shell (metric labels wrap), R-12 removed an incidental hover | 3 on every axis | pass |
| `review/shell--finish-setup-chip--1440--dark.png` | changed, page length moved, 1253065 px (14.759%) | R-10 on the overview behind the shell (metric labels wrap), R-12 removed an incidental hover | 3 on every axis | pass |
| `review/shell--finish-setup-chip--1440--light.png` | changed, page length moved, 1180729 px (13.907%) | R-10 on the overview behind the shell (metric labels wrap), R-12 removed an incidental hover | 3 on every axis | pass |
| `review/shell--finish-setup-chip--390--dark.png` | changed, page length moved, 774661 px (18.501%) | R-10 on the overview behind the shell (metric labels wrap), R-12 removed an incidental hover | 3 on every axis | pass |
| `review/shell--finish-setup-chip--390--light.png` | changed, page length moved, 748960 px (17.888%) | R-10 on the overview behind the shell (metric labels wrap), R-12 removed an incidental hover | 3 on every axis | pass |
| `review/shell--help-menu-open--1180--dark.png` | changed, page length moved, 764050 px (10.337%) | R-10 on the overview behind the shell (metric labels wrap), R-12 removed an incidental hover | 3 on every axis | pass |
| `review/shell--help-menu-open--1180--light.png` | changed, page length moved, 719667 px (9.736%) | R-10 on the overview behind the shell (metric labels wrap), R-12 removed an incidental hover | 3 on every axis | pass |
| `review/shell--help-menu-open--1440--dark.png` | changed, page length moved, 1255404 px (14.786%) | R-10 on the overview behind the shell (metric labels wrap), R-12 removed an incidental hover | 3 on every axis | pass |
| `review/shell--help-menu-open--1440--light.png` | changed, page length moved, 1183067 px (13.934%) | R-10 on the overview behind the shell (metric labels wrap), R-12 removed an incidental hover | 3 on every axis | pass |
| `review/shell--help-menu-open--390--dark.png` | changed, page length moved, 774661 px (18.501%) | R-10 on the overview behind the shell (metric labels wrap), R-12 removed an incidental hover | 3 on every axis | pass |
| `review/shell--help-menu-open--390--light.png` | changed, page length moved, 748960 px (17.888%) | R-10 on the overview behind the shell (metric labels wrap), R-12 removed an incidental hover | 3 on every axis | pass |
| `review/sign-in--refused--1180--dark.png` | changed, 60 px (0.006%) | text and native-control rasterisation only (dependency group: Playwright 1.63's Chromium); R-12 removed a button hover | 3 on every axis | pass |
| `review/sign-in--refused--1180--light.png` | changed, 60 px (0.006%) | text and native-control rasterisation only (dependency group: Playwright 1.63's Chromium); R-12 removed a button hover | 3 on every axis | pass |
| `review/sign-in--refused--1440--dark.png` | changed, 79 px (0.006%) | text and native-control rasterisation only (dependency group: Playwright 1.63's Chromium); R-12 removed a button hover | 3 on every axis | pass |
| `review/sign-in--refused--1440--light.png` | changed, 71 px (0.005%) | text and native-control rasterisation only (dependency group: Playwright 1.63's Chromium); R-12 removed a button hover | 3 on every axis | pass |
| `review/sign-up--address-already-has-an-account--1180--dark.png` | changed, 872 px (0.082%) | text and native-control rasterisation only (dependency group: Playwright 1.63's Chromium); R-12 removed a button hover | 3 on every axis | pass |
| `review/sign-up--address-already-has-an-account--1180--light.png` | changed, 872 px (0.082%) | text and native-control rasterisation only (dependency group: Playwright 1.63's Chromium); R-12 removed a button hover | 3 on every axis | pass |
| `review/sign-up--address-already-has-an-account--1440--dark.png` | changed, 872 px (0.067%) | text and native-control rasterisation only (dependency group: Playwright 1.63's Chromium); R-12 removed a button hover | 3 on every axis | pass |
| `review/sign-up--address-already-has-an-account--1440--light.png` | changed, 876 px (0.068%) | text and native-control rasterisation only (dependency group: Playwright 1.63's Chromium); R-12 removed a button hover | 3 on every axis | pass |
| `review/sign-up--address-already-has-an-account--768--dark.png` | changed, 37 px (0.005%) | text and native-control rasterisation only (dependency group: Playwright 1.63's Chromium); R-12 removed a button hover | 3 on every axis | pass |
| `review/sign-up--address-already-has-an-account--768--light.png` | changed, 37 px (0.005%) | text and native-control rasterisation only (dependency group: Playwright 1.63's Chromium); R-12 removed a button hover | 3 on every axis | pass |
| `review/verify-email--confirmed--1180--dark.png` | new | S-1 (L6a) | 3 on every axis | pass |
| `review/verify-email--confirmed--1180--light.png` | new | S-1 (L6a) | 3 on every axis | pass |
| `review/verify-email--confirmed--1440--dark.png` | new | S-1 (L6a) | 3 on every axis | pass |
| `review/verify-email--confirmed--1440--light.png` | new | S-1 (L6a) | 3 on every axis | pass |
| `review/verify-email--confirmed--390--dark.png` | new | S-1 (L6a) | 3 on every axis | pass |
| `review/verify-email--confirmed--390--light.png` | new | S-1 (L6a) | 3 on every axis | pass |
| `review/verify-email--confirmed--768--dark.png` | new | S-1 (L6a) | 3 on every axis | pass |
| `review/verify-email--confirmed--768--light.png` | new | S-1 (L6a) | 3 on every axis | pass |

## Second redraw: D-009 and D-010 (008D-AC-011)

**Armed:** `ux-ui-guardian` read its Weapon at
`C:/Users/jzfer/.local/share/the-neeson/cutover-20260923/runtime/claude/skills/ux-ui-weapon/`
(`SKILL.md`, `upstream-v2/GUIDE.md`, `guides/00-principles.md`, `guides/11-wcag-2-2-baseline.md`),
then the design-system folder: `06-review-rubric.md` (the scale, the axes, the finding form, and
section 5's "The rulings of 2026-10-01"), `00-design-brief.md` sections 9, 10, 14, 18, and 20,
`04-screens/platform-overview.md`, `03-components/onboarding-checklist.md`, the approved canvases'
previews, and the first half of this report, whose method and table format this half follows.

**Reviewer:** `ux-ui-guardian`, Gauntlet lane L6c, worktree `oalo-g-008d-fix`, branch
`gauntlet/008d-fix`, cut from the run branch `claude/gauntlet-prd-008` at `814939f`. **Verdict:**
D-009 and D-010 are fixed as ruled, with the timestamps of brief section 10 in the same commit; every
gate the ruling asked for ran red on the unfixed tree and green on the fixed one; eight defects
(R-14 to R-21) were found on the way and fixed with tests; every installed picture scores 3 on every
axis. D-009 and D-010 close by the conditions section 5 set for them.

### Scope and runs

| Item | Value |
| --- | --- |
| Criteria | 008D-AC-011, which re-opens 008D-AC-005, 008D-AC-006, and 008D-AC-010 for the pictures the fix reaches |
| Tree | `814939f` plus this lane's commits `2687100` (the fix), `c3ab3ec` (R-14 to R-18), `83095a1` (R-19, R-20), `eaf34e6` (R-21) |
| First dispatch (008D-AC-011) | screen-baselines run 36838168997 on `c3ab3ec`: synthetic 140 passed (26 skipped, the dashboard-preview specs), review 104 passed |
| Second dispatch (008D-AC-011) | run 36841695906 on `83095a1`: synthetic 141 passed (26 skipped), review 104 passed; R-20's check passed on the runner |
| Third dispatch (008D-AC-011) | run 36844271868 on `eaf34e6`: synthetic 141 passed (26 skipped), review 104 passed on the run's second attempt. The first attempt's review job stopped inside `pnpm test:db` on `apps/web/src/server/password-authentication-handler.postgres.test.ts:1616` (a rate-limit test expected the twenty-first sign-in to be refused, and it was not) before any picture was drawn; the job was re-run once with nothing changed, and the test passed. **Its pictures are the ones installed.** |
| Rubric | `library/knowledge/private/ux-ui/06-review-rubric.md`, 0 to 3 on ten axes per picture |

### What the fix is

All three parts are in `2687100`.

- **D-009**, exactly as ruled. `apps/web/src/app/globals.css` gives `body` `font-size:
  var(--text-body-size)` and never sizes `:root` or `html`; `h1` takes `--text-page-size`, `h2`
  `--text-section-size`, `h3` to `h6` `--text-card-size`; `.campaignCard h2`
  (`open-house-draft-builder.module.css:72`) takes `var(--text-card-size)` in place of `inherit`.
  One addition, for the same reason the headings needed theirs: the browser draws `small` one
  keyword smaller than its parent, 10.83px under the new body step, which is between the steps, so
  `small` takes the caption step. The overview already sized its own `small` there, and the
  canvases draw their side notes at 10.5px.
- **D-010**, exactly as ruled. `section { max-width: 44rem; }` is deleted from `globals.css`, with
  the four declarations that only undid it, each read before it was deleted:
  `app-shell.module.css:306-308`, `product-shell.module.css:309-311`, `brand-profile.module.css:81`,
  and `onboarding.module.css:117`. The bootstrap `main` rule and the metric primitive are untouched.
- **Timestamps.** Brief section 10 reads "Data, provider IDs, versions, hashes, timestamps, and
  correlation IDs: Geist Mono", and rubric axis 3 repeats it, so the brief clearly requires it. `time`
  joins the data elements in `globals.css`, and every timestamp and date a photographed screen shows
  outside a data table is a `time` element: the reports' details, metric cards, and audit log
  (`reporting-acceptance-surface.tsx`, `Timestamp` and `DateValue`), the overview's attention queue
  (`overview-screen.tsx:319`), onboarding's evidence (`packages/ui/src/components/onboarding-checklist.tsx:131`),
  the synthetic campaign's launch schedule (`campaign-launch-review.tsx:150-160`), and the saved
  campaign's open-house window and decision time (`persisted-campaign-screen.tsx:92-99`, `:181`).
  The reports' version and support reference carry `oalo-data-text`, the primitive's data class.

### The gates, red and green

Each gate was run against the unfixed tree (the product files of `2687100` stashed, its tests in
place) and then against the fix. Screenshot comparisons are skipped on a workstation by design, so
everything below is an assertion, not a picture.

| Gate | Red, on the unfixed tree | Green |
| --- | --- | --- |
| `expectTypographyOnBrief` (`tests/browser/helpers/design-quality.ts`), wherever either suite takes a picture: `html` 16px, `body` 13px, every text at one of the six steps, every date in the data font | 72 of 72 synthetic matrix cells: "body carries the 13px body step", 16 received. Overview at 1440 in Light: 68 texts between the steps (`h2` "How things stand" at 24px, every overview `h3` at 18.72px, the lead at 16px) and 8 dates in the interface face; reports at 1440 in Light: 194 and 22 | 138 synthetic passed on the workstation; on the runner, 140 or 141 synthetic and 104 review passed in all three dispatches, so every account screen, guided-setup step, and shell state measured at the steps |
| `apps/web/src/theme/global-element-defaults.unit.test.ts` | 5 of 5 failed: `section { max-width }` found; no body step on `body`; no heading steps; `small` unsized; `time` not in the data font | 5 of 5 passed |
| The metric check (`tests/browser/design-quality.spec.ts:394`), now in both themes and holding the value inside the card's content box | Light and Dark at 1440: "Funded or closed outcome: its value 'Unavailable' leaves the card's content box" | passed at every frame in both themes |
| `expectThePageFillsTheContentColumn` on the overview | 208px from the column's edge at 1440, in both themes | passed at every frame in both themes |
| The reports' timestamps (`reporting-screen.integration.test.tsx`) | 16 dates outside a `time` element | passed |
| R-14 to R-19's and R-21's checks (below) | each failed on the tree before its fix | each passed |
| R-20's check (below) | the review project only runs on the runner; measured on run 36838168997's pictures, where the form is 296px and centred | passed on the runner in runs 36841695906 and 36844271868 |

### Method

As in the first half: every picture of each run was compared with the committed baseline pixel by
pixel (the differing pixels, their share, the box that holds them, and the page length), and each
later run with the run before it, so the reach of R-19, R-20, and R-21 was measured rather than
assumed. Run 36841695906 differs from run 36838168997 only inside the rail and on change password,
and by under 30 pixels of rasterisation on four account pictures and three 390 walkthrough
pictures. Run 36844271868 differs from run 36841695906 only in the rail's product name, the box
from 71,24 to 242,50, on 192 pictures (three of them change-password pictures that also carry under
60 pixels of rasterisation), and by under 31 pixels of rasterisation on nine others. Every
changed picture was read on a labelled contact sheet, eight to a sheet, both themes and all four
frames. Every picture whose change was more than rasterisation was read at full size or cropped to
its regions beside the committed picture. Before the first dispatch the synthetic screens were also
photographed on the workstation (`OALO_SCREEN_SNAPSHOT_DIR`, outside the repository) and read at
full size, which is how R-14 to R-18 were found and fixed before any runner time was spent on them.

Each change is attributed to D-009, D-010, the timestamps, R-14 to R-21, or rasterisation, by
screen and frame: D-010 reaches only the 1440 and 1180 frames, and only where a `<section>` was
wider than 44rem once freed (measured on the fixed build: the overview, both campaign pages, reports,
onboarding, the campaigns list's empty state, and create's two result states; never brand, whose
sections had already undone the cap, nor settings, nor create's form).

### Counts

| Kind | Pictures |
| --- | --- |
| Changed | 343: 110 synthetic, 233 review |
| New | 0 |
| Removed | 0 |
| Identical to the committed baseline to the pixel | 33 |

A changed picture usually has more than one cause, so the reach of each cause is counted on its own:

| Cause | Reach | Pictures |
| --- | --- | --- |
| D-009, the body step on `body` and each heading level's step | every in-shell picture and every account screen whose text no module sized | 340 |
| D-010, the section cap deleted | 1440 and 1180 only: the overview and every shell and saved-notice picture over it, both campaign pages, reports, onboarding, the campaigns list's empty state, create's result states, and walkthrough steps 1 to 3 and 5 to 7 | 92 |
| Timestamps in the data font | the synthetic overview, onboarding, reports, both campaign pages, and step 7 | 72 |
| R-14, action links keep their own height | the overview at 1440 and 1180, and the shell and saved-notice pictures over it | 20 |
| R-15, actions stay together | reports at 1440 and 1180 | 4 |
| R-16, a campaign card on the spacing scale | reports, every frame | 8 |
| R-17, legends at the card step and a defined weight | create, every state, and step 4 | 46 |
| R-18, a finding's note clear of what follows | create needs changes and step 5 needs changes | 16 |
| R-19, the rail's titles at the card step | every picture with the rail open, and the mobile drawer's identity card | 194 |
| R-20, the account page's measure | change password, both states | 16 |
| R-21, the rail's product name balanced | every picture with the rail open | 192 |
| Text rasterisation only, under 100 pixels | step 4's first field at 390 in both themes, reset password's expired link at 1440 in Dark | 3 |

### Findings, in the rubric's finding form

Each names the screen, the frame, the theme, the state, the file and line on the tree before its
fix, the value, the rule it must be, and the axis; then the fix and its test.

**R-14.** Overview, default, 1440 and 1180, Light and Dark (and every shell and saved-notice picture
taken over it). "See your leads" in "More quick actions" was a button about 200px tall, stretched to
the height of the unavailable action and its explanation beside it, because `.quickActions`
(`apps/web/src/features/overview/components/overview.module.css:130-134`) let every item stretch to
its row; D-010's wider column made it wider too. Rule: rubric axes 1 and 2. Fixed in `c3ab3ec`:
`align-items: start`. Test: "the overview's action links keep their own height at every frame",
red on `2687100` ("See your leads" at 1440).

**R-15.** Reports, default, 1440 and 1180, Light and Dark. Each group of actions was laid out with
`space-between` from the shared heading rule (`reporting.module.css:9-19`), so once the sections took
the column, "Open Public page v3" and "Open Feed creative v3", "Stage approved link share" and its
pair, and "Open the campaign" and "See what went wrong" sat at opposite edges of their cards, and an
unavailable target's note hung right-aligned under the details. Rule: rubric axes 1 and 10, one
group of actions reads as one group. Fixed in `c3ab3ec`: `.inlineLinks { justify-content:
flex-start }`. Test: "the reports screen keeps its actions together and its campaign cards on the
spacing scale", red on `2687100` (56px to 775px between two actions at 1440).

**R-16.** Reports, default, every frame, Light and Dark. A campaign card stacked its heading,
details, metric cards, details, and actions with 0px between them
(`reporting-acceptance-surface.tsx:331`, a `Card` with no rhythm of its own), so the metric cards
touched "Excluded test leads" above and "Page" below. Pre-existing, and read for the first time at
the new width. Rule: rubric axis 2, every gap a `--space-*` token. Fixed in `c3ab3ec`: the card is a
grid at `--space-4` (`.reportCard`). Test: the same, red on `2687100` (0px, eight times at 1440).

**R-17.** Create, every state, every frame, Light and Dark (and guided setup step 4 over it). The
fieldset legends ("The property and the open house") were drawn at weight 400, lighter than the
field labels under them, because `.form legend` (`open-house-draft-builder.module.css:99-102`)
named `var(--weight-semibold)`, which only the dashboard preview's `product-tokens.css` defines.
The browser's 16px had hidden it; at the body step it read as the weakest text in its card. The
workspace choice's `.choicesLegend` (`auth-form.module.css:126`) named the same missing token. Rule:
rubric axis 3, "the weights come from the tokens", and axis 1, the legend titles its card. Fixed in
`c3ab3ec`: both take the card step at `--weight-bold`. Test:
`apps/web/src/theme/type-tokens-defined.unit.test.ts` fails any font, size, or weight token the
token layer does not define; red with exactly those two.

**R-18.** Create, needs changes, every frame, Light and Dark (and guided setup step 5's needs-changes
picture). A finding's note, "Fix this before approving", ran inline and touched the support details
under it, 0px apart (`open-house-draft-builder.tsx:803`, styled by nothing). Rule: rubric axis 2.
Fixed in `c3ab3ec`: `.findings small` is its own line, `--space-3` above what follows. Test: the
needs-changes case measures it at every frame, red on `2687100` (0px).

**R-19.** Every in-shell picture with the rail open, 1440, 1180, and 768, Light and Dark, and the
mobile drawer at 390. The rail's two titles, "Operation Automated LO" and the workspace's name in
its identity card (`app-shell.tsx:213`, `:364`), carried no size, so D-009 drew them at 13px, the
size of every navigation link between them, where the canvases draw the product's name in their
rails at 15px in most frames and never below 13px bold. Found on run 36838168997's pictures. Rule: rubric axes 1 and 10. Fixed in `83095a1`: both take
the card step. Test: "the rail's titles are drawn above its navigation links", red on `c3ab3ec`
(13 against 13).

**R-20.** Change password, default and saved, every frame, Light and Dark. The page was a bare
`section` (`apps/web/src/app/(authenticated)/settings/account/page.tsx:26-29`), so the shell centred
it at the width of its title; once D-009 drew the title at the page step, the form shrank from 412px
to 296px at 1440 and the title floated mid-column, unlike every sibling page. Found on run
36838168997's pictures. Rule: rubric axes 2 and 10, and the account form's own 26rem measure. Fixed
in `83095a1`: the page fills the column (`.accountPage`) and holds the account `panel` and
`header`. Test: `expectTheFormKeepsTheAccountMeasure` in the review suite, at every frame and theme.

**R-21.** Every in-shell picture with the rail open, 1440, 1180, and 768, Light and Dark. At the card
step R-19 gave it, the runner's face wrapped the product's name as "Operation Automated" over a lone
"LO" (`app-shell.tsx:213`; run 36841695906's pictures), where the committed pictures had broken it
into two lines of a length. Rule: rubric axis 3, a title does not leave a word alone. Fixed in
`eaf34e6`: `.brand strong { text-wrap: balance }`. Test: the rail test requires the rule and a last
line at least half as long as the longest; red on `83095a1` for the rule (`auto`), and the runner's
picture is the evidence for the lone word, since a workstation's narrower face does not wrap it.

### What D-009 and D-010 close on

- **D-009** closes. The fix and its redraw are in, the gate passes on every picture both suites
  take, and every redrawn picture scores 3 on axes 1 and 3. The steps are the right steps for their
  roles: page titles 23px, section titles 17px (the overview's "How things stand" no longer outranks
  "Good morning, Alex"), card titles 14px (the campaigns list's cards, the overview's lists, the
  legends after R-17, the rail's titles after R-19 and R-21), body 13px, secondary 11.5px, captions and
  `small` 10.5px.
- **D-010** closes. The rule and its four undoing declarations are gone, the three gates pass, and
  every redrawn 1440 and 1180 picture scores 3 on axes 2, 7, and 10: the overview fills its column
  with four metric cards about 270px wide at 1440, "Unavailable" sits inside its card, campaign
  detail and reports are drawn at one width, and the campaigns list's empty state spans the list.

### The two surfaces with no baseline

Read at 1440 and 390 on the workstation, before and after, as the ruling asks.

- **The synthetic public open-house page** (`apps/web/src/app/public/synthetic-open-house-v3/page.tsx`).
  Its paragraphs moved from 16px to the 13px body step and its title from the browser's 32px to the
  23px page step; nothing on it is meant to be larger than the body step, so nothing is sized in a
  module. D-010 moves it too: the page is one `<section>` with no measure of its own, and it now
  spans the viewport at 1440 where the cap held it to 704px. It had no page padding before or after.
  It is a stand-in for a published page, served only in local and preview builds, and has no rubric
  row; recorded below for its owner rather than designed here.
- **The homeowner reports.** The workspace list and the report, created through the sample flow on
  the dashboard-preview server, are identical to the pixel before and after at 1440 and 390: they
  size every text in `homeowners.module.css`, and their sections were already freed by the
  dashboard preview's `.content section` rule. The shared report (`/home-report/[secret]`) needs the
  database and was read from its code: `.workspace` sets the body step itself, so its type does not
  move, and its sections, which the cap held to 704px inside a 1050px page, now take that page's
  measure, as the in-app report already did.

### Observations that are not deltas, for the screens' owners

- Onboarding's evidence shows "Checked on" as a raw ISO timestamp (`2026-07-21T14:30:00.000Z`). It
  is now in the data font; how it is worded is the user-language contract's question, not the
  rubric's.
- At 1440, step 5 of the walkthrough now places its panel below the check result rather than beside
  it, because the result section takes the whole column. The highlighted result stays clear and
  under the header, which is the rule (`expectTheStepPointsAtSomethingOnScreen` passes); the panel
  covers part of "Your next steps", which is step 6's subject.
- The rail scrolls (`.desktopSidebar`, `overflow-y: auto`). In the review composition its identity
  card is the last thing in a 900px rail and meets the fold, as it did in the committed pictures.
- The synthetic public open-house page has no padding or measure of its own (above).

### Baseline change note for pull request #74

```text
Baseline change (second redraw): PRD-008d 008D-AC-011 redraw of every screen baseline after the D-009 and D-010 fix (screen-baselines runs 36838168997, 36841695906, and 36844271868; the installed set is run 36844271868's). 343 pictures changed, none is new, none is removed, each reviewed against 06-review-rubric.md in library/requirements/in-work/prd-008-finish-line-hardening/qa/2026-10-01-008d-baseline-review.md, "Second redraw". Causes: D-009, the 13px body step on body and each heading level's step (every in-shell screen and the account screens); D-010, the bootstrap section cap deleted (the overview, both campaign pages, reports, onboarding, the campaigns list's empty state, create's result states, and the walkthrough and shell pictures over them, at 1440 and 1180); timestamps in the data font (reports, the overview, onboarding, campaign detail); and the review's fixes R-14 to R-21 (the overview's action links at their own height, reports' actions kept together and its campaign cards on the spacing scale, the create legends at the card step, a finding's note clear of the details, the rail's titles at the card step and balanced, and the change-password page at the account measure).
```

### Per-picture table

Every picture of the installed set (run 36844271868) whose pixels differ from the baseline committed
at `814939f`. "3 on every axis" is the rubric's top score on all ten axes at that frame and theme.
No picture is new and none is removed. The 33 pictures that match their committed baselines
to the pixel keep their scores: the email preview's eight, the boundary page's two at 390, reset
password's default in all eight cells and its expired link in seven, and verify email's confirmed
state in all eight.

| Picture | Change against the committed baseline | Cause | Score | Verdict |
| --- | --- | --- | --- | --- |
| `chromium/brand--default--1180--dark.png` | changed, page length 2697 to 2356px, 1718332 px (53.994%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `chromium/brand--default--1180--light.png` | changed, page length 2697 to 2356px, 1663150 px (52.260%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `chromium/brand--default--1440--dark.png` | changed, page length 2625 to 2356px, 1891700 px (50.045%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `chromium/brand--default--1440--light.png` | changed, page length 2625 to 2356px, 1805108 px (47.754%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `chromium/brand--default--390--dark.png` | changed, page length 4448 to 3740px, 1043498 px (60.154%) | D-009 | 3 on every axis | pass |
| `chromium/brand--default--390--light.png` | changed, page length 4448 to 3740px, 1010101 px (58.228%) | D-009 | 3 on every axis | pass |
| `chromium/brand--default--768--dark.png` | changed, page length 4178 to 3591px, 1404270 px (43.764%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `chromium/brand--default--768--light.png` | changed, page length 4178 to 3591px, 1352278 px (42.144%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--default--1180--dark.png` | changed, page length 1796 to 1759px, 507154 px (23.930%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--default--1180--light.png` | changed, page length 1796 to 1759px, 498772 px (23.535%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--default--1440--dark.png` | changed, page length 1796 to 1759px, 575518 px (22.253%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--default--1440--light.png` | changed, page length 1796 to 1759px, 566595 px (21.908%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--default--390--dark.png` | changed, page length 2487 to 2413px, 237430 px (24.479%) | D-009; R-17 | 3 on every axis | pass |
| `chromium/campaign-create--default--390--light.png` | changed, page length 2487 to 2413px, 232516 px (23.972%) | D-009; R-17 | 3 on every axis | pass |
| `chromium/campaign-create--default--768--dark.png` | changed, page length 2429 to 2378px, 289181 px (15.502%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--default--768--light.png` | changed, page length 2429 to 2378px, 282869 px (15.163%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--needs-changes--1180--dark.png` | changed, page length 2469 to 2334px, 830386 px (28.502%) | D-009; D-010; R-17; R-18; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--needs-changes--1180--light.png` | changed, page length 2469 to 2334px, 806781 px (27.692%) | D-009; D-010; R-17; R-18; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--needs-changes--1440--dark.png` | changed, page length 2469 to 2334px, 940945 px (26.466%) | D-009; D-010; R-17; R-18; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--needs-changes--1440--light.png` | changed, page length 2469 to 2334px, 914469 px (25.721%) | D-009; D-010; R-17; R-18; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--needs-changes--390--dark.png` | changed, page length 3406 to 3239px, 432544 px (32.563%) | D-009; R-17; R-18 | 3 on every axis | pass |
| `chromium/campaign-create--needs-changes--390--light.png` | changed, page length 3406 to 3239px, 421930 px (31.764%) | D-009; R-17; R-18 | 3 on every axis | pass |
| `chromium/campaign-create--needs-changes--768--dark.png` | changed, page length 3347 to 3170px, 569535 px (22.157%) | D-009; R-17; R-18; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--needs-changes--768--light.png` | changed, page length 3347 to 3170px, 555068 px (21.594%) | D-009; R-17; R-18; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--ready-for-approval--1180--dark.png` | changed, page length 2394 to 2272px, 772844 px (27.358%) | D-009; D-010; R-17; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--ready-for-approval--1180--light.png` | changed, page length 2394 to 2272px, 753048 px (26.657%) | D-009; D-010; R-17; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--ready-for-approval--1440--dark.png` | changed, page length 2394 to 2253px, 1186910 px (34.430%) | D-009; D-010; R-17; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--ready-for-approval--1440--light.png` | changed, page length 2394 to 2253px, 1160340 px (33.659%) | D-009; D-010; R-17; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--ready-for-approval--390--dark.png` | changed, page length 3331 to 3143px, 431593 px (33.223%) | D-009; R-17 | 3 on every axis | pass |
| `chromium/campaign-create--ready-for-approval--390--light.png` | changed, page length 3331 to 3143px, 421215 px (32.424%) | D-009; R-17 | 3 on every axis | pass |
| `chromium/campaign-create--ready-for-approval--768--dark.png` | changed, page length 3248 to 3108px, 526567 px (21.109%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--ready-for-approval--768--light.png` | changed, page length 3248 to 3108px, 515177 px (20.653%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--saving--1180--dark.png` | changed, page length 1796 to 1759px, 509308 px (24.032%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--saving--1180--light.png` | changed, page length 1796 to 1759px, 501339 px (23.656%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--saving--1440--dark.png` | changed, page length 1796 to 1759px, 577610 px (22.334%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--saving--1440--light.png` | changed, page length 1796 to 1759px, 569156 px (22.007%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--saving--390--dark.png` | changed, page length 2487 to 2413px, 238463 px (24.586%) | D-009; R-17 | 3 on every axis | pass |
| `chromium/campaign-create--saving--390--light.png` | changed, page length 2487 to 2413px, 233595 px (24.084%) | D-009; R-17 | 3 on every axis | pass |
| `chromium/campaign-create--saving--768--dark.png` | changed, page length 2429 to 2378px, 288223 px (15.450%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-create--saving--768--light.png` | changed, page length 2429 to 2378px, 283355 px (15.189%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-detail--default--1180--dark.png` | changed, page length 3388 to 3087px, 1978024 px (49.477%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-detail--default--1180--light.png` | changed, page length 3388 to 3087px, 1870091 px (46.778%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-detail--default--1440--dark.png` | changed, page length 3364 to 3087px, 1987730 px (41.034%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-detail--default--1440--light.png` | changed, page length 3364 to 3087px, 1867710 px (38.556%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-detail--default--390--dark.png` | changed, page length 5510 to 5035px, 1141973 px (53.142%) | D-009; timestamps in the data font | 3 on every axis | pass |
| `chromium/campaign-detail--default--390--light.png` | changed, page length 5510 to 5035px, 1104723 px (51.409%) | D-009; timestamps in the data font | 3 on every axis | pass |
| `chromium/campaign-detail--default--768--dark.png` | changed, page length 5369 to 4950px, 1579916 px (38.316%) | D-009; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-detail--default--768--light.png` | changed, page length 5369 to 4950px, 1520052 px (36.864%) | D-009; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-detail--permission-restricted--1180--dark.png` | changed, page length 1920 to 1641px, 1035419 px (45.702%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-detail--permission-restricted--1180--light.png` | changed, page length 1920 to 1641px, 998225 px (44.060%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-detail--permission-restricted--1440--dark.png` | changed, page length 1877 to 1602px, 1286350 px (47.592%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-detail--permission-restricted--1440--light.png` | changed, page length 1877 to 1602px, 1240978 px (45.913%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-detail--permission-restricted--390--dark.png` | changed, page length 2678 to 2276px, 498625 px (47.742%) | D-009; timestamps in the data font | 3 on every axis | pass |
| `chromium/campaign-detail--permission-restricted--390--light.png` | changed, page length 2678 to 2276px, 486952 px (46.624%) | D-009; timestamps in the data font | 3 on every axis | pass |
| `chromium/campaign-detail--permission-restricted--768--dark.png` | changed, page length 2521 to 2188px, 681786 px (35.214%) | D-009; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaign-detail--permission-restricted--768--light.png` | changed, page length 2521 to 2188px, 653893 px (33.773%) | D-009; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaigns--empty--1180--dark.png` | changed, 69664 px (6.560%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaigns--empty--1180--light.png` | changed, 68936 px (6.491%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaigns--empty--1440--dark.png` | changed, 117244 px (9.047%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaigns--empty--1440--light.png` | changed, 116516 px (8.990%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaigns--empty--390--dark.png` | changed, 35307 px (10.726%) | D-009 | 3 on every axis | pass |
| `chromium/campaigns--empty--390--light.png` | changed, 34575 px (10.504%) | D-009 | 3 on every axis | pass |
| `chromium/campaigns--empty--768--dark.png` | changed, 58874 px (7.486%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaigns--empty--768--light.png` | changed, 58485 px (7.437%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaigns--populated--1180--dark.png` | changed, 129537 px (12.197%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaigns--populated--1180--light.png` | changed, 102648 px (9.666%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaigns--populated--1440--dark.png` | changed, 130254 px (10.050%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaigns--populated--1440--light.png` | changed, 96588 px (7.453%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaigns--populated--390--dark.png` | changed, 82881 px (25.180%) | D-009 | 3 on every axis | pass |
| `chromium/campaigns--populated--390--light.png` | changed, 75989 px (23.086%) | D-009 | 3 on every axis | pass |
| `chromium/campaigns--populated--768--dark.png` | changed, 118544 px (15.074%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `chromium/campaigns--populated--768--light.png` | changed, 100343 px (12.759%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `chromium/design-surfaces--default--1180--dark.png` | changed, 6198 px (0.584%) | D-009 (the rail's unsized text); R-19, R-21 | 3 on every axis | pass |
| `chromium/design-surfaces--default--1180--light.png` | changed, 6200 px (0.584%) | D-009 (the rail's unsized text); R-19, R-21 | 3 on every axis | pass |
| `chromium/design-surfaces--default--1440--dark.png` | changed, 6198 px (0.478%) | D-009 (the rail's unsized text); R-19, R-21 | 3 on every axis | pass |
| `chromium/design-surfaces--default--1440--light.png` | changed, 6200 px (0.478%) | D-009 (the rail's unsized text); R-19, R-21 | 3 on every axis | pass |
| `chromium/design-surfaces--default--768--dark.png` | changed, 6198 px (0.788%) | D-009 (the rail's unsized text); R-19, R-21 | 3 on every axis | pass |
| `chromium/design-surfaces--default--768--light.png` | changed, 6200 px (0.788%) | D-009 (the rail's unsized text); R-19, R-21 | 3 on every axis | pass |
| `chromium/onboarding--default--1180--dark.png` | changed, page length 3768 to 3625px, 1367243 px (30.751%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `chromium/onboarding--default--1180--light.png` | changed, page length 3768 to 3625px, 1336000 px (30.048%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `chromium/onboarding--default--1440--dark.png` | changed, page length 3745 to 3605px, 2074189 px (38.462%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `chromium/onboarding--default--1440--light.png` | changed, page length 3745 to 3605px, 2028646 px (37.618%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `chromium/onboarding--default--390--dark.png` | changed, page length 4492 to 4247px, 662924 px (37.841%) | D-009; timestamps in the data font | 3 on every axis | pass |
| `chromium/onboarding--default--390--light.png` | changed, page length 4492 to 4247px, 648060 px (36.992%) | D-009; timestamps in the data font | 3 on every axis | pass |
| `chromium/onboarding--default--768--dark.png` | changed, page length 4233 to 4122px, 709189 px (21.815%) | D-009; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `chromium/onboarding--default--768--light.png` | changed, page length 4233 to 4122px, 692804 px (21.311%) | D-009; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `chromium/overview--default--1180--dark.png` | changed, page length 6888 to 6260px, 3905739 px (48.054%) | D-009; D-010; timestamps in the data font; R-14; R-19, R-21 | 3 on every axis | pass |
| `chromium/overview--default--1180--light.png` | changed, page length 6888 to 6260px, 3732648 px (45.924%) | D-009; D-010; timestamps in the data font; R-14; R-19, R-21 | 3 on every axis | pass |
| `chromium/overview--default--1440--dark.png` | changed, page length 6511 to 5591px, 5478087 px (58.428%) | D-009; D-010; timestamps in the data font; R-14; R-19, R-21 | 3 on every axis | pass |
| `chromium/overview--default--1440--light.png` | changed, page length 6511 to 5591px, 5261671 px (56.119%) | D-009; D-010; timestamps in the data font; R-14; R-19, R-21 | 3 on every axis | pass |
| `chromium/overview--default--390--dark.png` | changed, page length 11893 to 11203px, 2254923 px (48.616%) | D-009; timestamps in the data font | 3 on every axis | pass |
| `chromium/overview--default--390--light.png` | changed, page length 11893 to 11203px, 2208933 px (47.624%) | D-009; timestamps in the data font | 3 on every axis | pass |
| `chromium/overview--default--768--dark.png` | changed, page length 11554 to 10952px, 2821012 px (31.792%) | D-009; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `chromium/overview--default--768--light.png` | changed, page length 11554 to 10952px, 2722230 px (30.678%) | D-009; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `chromium/reports--default--1180--dark.png` | changed, page length 9431 to 7226px, 5716534 px (51.368%) | D-009; D-010; timestamps in the data font; R-15, R-16; R-19, R-21 | 3 on every axis | pass |
| `chromium/reports--default--1180--light.png` | changed, page length 9431 to 7226px, 5464347 px (49.102%) | D-009; D-010; timestamps in the data font; R-15, R-16; R-19, R-21 | 3 on every axis | pass |
| `chromium/reports--default--1440--dark.png` | changed, page length 9383 to 6739px, 8312083 px (61.518%) | D-009; D-010; timestamps in the data font; R-15, R-16; R-19, R-21 | 3 on every axis | pass |
| `chromium/reports--default--1440--light.png` | changed, page length 9383 to 6739px, 7981715 px (59.073%) | D-009; D-010; timestamps in the data font; R-15, R-16; R-19, R-21 | 3 on every axis | pass |
| `chromium/reports--default--390--dark.png` | changed, page length 14137 to 12288px, 2352604 px (42.670%) | D-009; timestamps in the data font; R-16 | 3 on every axis | pass |
| `chromium/reports--default--390--light.png` | changed, page length 14137 to 12288px, 2247546 px (40.765%) | D-009; timestamps in the data font; R-16 | 3 on every axis | pass |
| `chromium/reports--default--768--dark.png` | changed, page length 13356 to 11946px, 2787780 px (27.178%) | D-009; timestamps in the data font; R-16; R-19, R-21 | 3 on every axis | pass |
| `chromium/reports--default--768--light.png` | changed, page length 13356 to 11946px, 2650751 px (25.842%) | D-009; timestamps in the data font; R-16; R-19, R-21 | 3 on every axis | pass |
| `chromium/settings-connections--default--1180--dark.png` | changed, page length 1281 to 1041px, 825973 px (54.643%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `chromium/settings-connections--default--1180--light.png` | changed, page length 1281 to 1041px, 790399 px (52.290%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `chromium/settings-connections--default--1440--dark.png` | changed, page length 1171 to 1011px, 818618 px (48.547%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `chromium/settings-connections--default--1440--light.png` | changed, page length 1171 to 1011px, 785251 px (46.568%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `chromium/settings-connections--default--390--dark.png` | changed, page length 2365 to 1984px, 594289 px (64.432%) | D-009 | 3 on every axis | pass |
| `chromium/settings-connections--default--390--light.png` | changed, page length 2365 to 1984px, 570304 px (61.832%) | D-009 | 3 on every axis | pass |
| `chromium/settings-connections--default--768--dark.png` | changed, page length 2178 to 1795px, 788808 px (47.158%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `chromium/settings-connections--default--768--light.png` | changed, page length 2178 to 1795px, 747966 px (44.716%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `review/campaign-detail--already-decided--1180--dark.png` | changed, page length 2124 to 1827px, 1147109 px (45.769%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/campaign-detail--already-decided--1180--light.png` | changed, page length 2124 to 1827px, 1081760 px (43.161%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/campaign-detail--already-decided--1440--dark.png` | changed, page length 2021 to 1747px, 1440607 px (49.501%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/campaign-detail--already-decided--1440--light.png` | changed, page length 2021 to 1747px, 1386775 px (47.652%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/campaign-detail--already-decided--390--dark.png` | changed, page length 2998 to 2575px, 573238 px (49.027%) | D-009; timestamps in the data font | 3 on every axis | pass |
| `review/campaign-detail--already-decided--390--light.png` | changed, page length 2998 to 2575px, 549043 px (46.958%) | D-009; timestamps in the data font | 3 on every axis | pass |
| `review/campaign-detail--already-decided--768--dark.png` | changed, page length 2770 to 2400px, 798269 px (37.524%) | D-009; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/campaign-detail--already-decided--768--light.png` | changed, page length 2770 to 2400px, 763808 px (35.904%) | D-009; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/campaign-detail--approved--1180--dark.png` | changed, page length 1888 to 1601px, 988512 px (44.371%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/campaign-detail--approved--1180--light.png` | changed, page length 1888 to 1601px, 930043 px (41.746%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/campaign-detail--approved--1440--dark.png` | changed, page length 1785 to 1522px, 1219208 px (47.433%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/campaign-detail--approved--1440--light.png` | changed, page length 1785 to 1522px, 1172484 px (45.615%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/campaign-detail--approved--390--dark.png` | changed, page length 2709 to 2300px, 525463 px (49.736%) | D-009; timestamps in the data font | 3 on every axis | pass |
| `review/campaign-detail--approved--390--light.png` | changed, page length 2709 to 2300px, 503313 px (47.639%) | D-009; timestamps in the data font | 3 on every axis | pass |
| `review/campaign-detail--approved--768--dark.png` | changed, page length 2515 to 2159px, 736445 px (38.128%) | D-009; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/campaign-detail--approved--768--light.png` | changed, page length 2515 to 2159px, 708803 px (36.697%) | D-009; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/campaign-detail--ready--1180--dark.png` | changed, page length 1893 to 1618px, 1013762 px (45.384%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/campaign-detail--ready--1180--light.png` | changed, page length 1893 to 1618px, 976648 px (43.723%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/campaign-detail--ready--1440--dark.png` | changed, page length 1790 to 1519px, 1263193 px (49.007%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/campaign-detail--ready--1440--light.png` | changed, page length 1790 to 1519px, 1217887 px (47.249%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/campaign-detail--ready--390--dark.png` | changed, page length 2669 to 2319px, 463879 px (44.565%) | D-009; timestamps in the data font | 3 on every axis | pass |
| `review/campaign-detail--ready--390--light.png` | changed, page length 2669 to 2319px, 452221 px (43.445%) | D-009; timestamps in the data font | 3 on every axis | pass |
| `review/campaign-detail--ready--768--dark.png` | changed, page length 2501 to 2176px, 659803 px (34.351%) | D-009; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/campaign-detail--ready--768--light.png` | changed, page length 2501 to 2176px, 632358 px (32.922%) | D-009; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/change-password--default--1180--dark.png` | changed, 151490 px (14.265%) | D-009 (the title at the page step); R-20 (the account measure at the column's start); R-19, R-21 | 3 on every axis | pass |
| `review/change-password--default--1180--light.png` | changed, 149891 px (14.114%) | D-009 (the title at the page step); R-20 (the account measure at the column's start); R-19, R-21 | 3 on every axis | pass |
| `review/change-password--default--1440--dark.png` | changed, 167022 px (12.887%) | D-009 (the title at the page step); R-20 (the account measure at the column's start); R-19, R-21 | 3 on every axis | pass |
| `review/change-password--default--1440--light.png` | changed, 164993 px (12.731%) | D-009 (the title at the page step); R-20 (the account measure at the column's start); R-19, R-21 | 3 on every axis | pass |
| `review/change-password--default--390--dark.png` | changed, 91827 px (27.897%) | D-009 (the title at the page step); R-20 (the account measure at the column's start) | 3 on every axis | pass |
| `review/change-password--default--390--light.png` | changed, 90224 px (27.410%) | D-009 (the title at the page step); R-20 (the account measure at the column's start) | 3 on every axis | pass |
| `review/change-password--default--768--dark.png` | changed, 123128 px (15.657%) | D-009 (the title at the page step); R-20 (the account measure at the column's start); R-19, R-21 | 3 on every axis | pass |
| `review/change-password--default--768--light.png` | changed, 122213 px (15.540%) | D-009 (the title at the page step); R-20 (the account measure at the column's start); R-19, R-21 | 3 on every axis | pass |
| `review/change-password--saved--1180--dark.png` | changed, 166700 px (15.697%) | D-009 (the title at the page step); R-20 (the account measure at the column's start); R-19, R-21 | 3 on every axis | pass |
| `review/change-password--saved--1180--light.png` | changed, 164692 px (15.508%) | D-009 (the title at the page step); R-20 (the account measure at the column's start); R-19, R-21 | 3 on every axis | pass |
| `review/change-password--saved--1440--dark.png` | changed, 205215 px (15.834%) | D-009 (the title at the page step); R-20 (the account measure at the column's start); R-19, R-21 | 3 on every axis | pass |
| `review/change-password--saved--1440--light.png` | changed, 203031 px (15.666%) | D-009 (the title at the page step); R-20 (the account measure at the column's start); R-19, R-21 | 3 on every axis | pass |
| `review/change-password--saved--390--dark.png` | changed, page length 872 to 844px, 132898 px (39.078%) | D-009 (the title at the page step); R-20 (the account measure at the column's start) | 3 on every axis | pass |
| `review/change-password--saved--390--light.png` | changed, page length 872 to 844px, 131583 px (38.692%) | D-009 (the title at the page step); R-20 (the account measure at the column's start) | 3 on every axis | pass |
| `review/change-password--saved--768--dark.png` | changed, 157781 px (20.063%) | D-009 (the title at the page step); R-20 (the account measure at the column's start); R-19, R-21 | 3 on every axis | pass |
| `review/change-password--saved--768--light.png` | changed, 156849 px (19.944%) | D-009 (the title at the page step); R-20 (the account measure at the column's start); R-19, R-21 | 3 on every axis | pass |
| `review/choose-workspace--default--1180--dark.png` | changed, 28396 px (2.674%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/choose-workspace--default--1180--light.png` | changed, 23731 px (2.235%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/choose-workspace--default--1440--dark.png` | changed, 28396 px (2.191%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/choose-workspace--default--1440--light.png` | changed, 23731 px (1.831%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/choose-workspace--default--390--dark.png` | changed, 45356 px (13.779%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/choose-workspace--default--390--light.png` | changed, 34893 px (10.601%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/choose-workspace--default--768--dark.png` | changed, 28396 px (3.611%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/choose-workspace--default--768--light.png` | changed, 23732 px (3.018%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/forgot-password--confirmation--1180--dark.png` | changed, 36077 px (3.397%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/forgot-password--confirmation--1180--light.png` | changed, 31997 px (3.013%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/forgot-password--confirmation--1440--dark.png` | changed, 36077 px (2.784%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/forgot-password--confirmation--1440--light.png` | changed, 31997 px (2.469%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/forgot-password--confirmation--390--dark.png` | changed, 33061 px (10.044%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/forgot-password--confirmation--390--light.png` | changed, 29660 px (9.011%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/forgot-password--confirmation--768--dark.png` | changed, 36077 px (4.587%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/forgot-password--confirmation--768--light.png` | changed, 31997 px (4.069%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/forgot-password--default--1180--dark.png` | changed, 31410 px (2.958%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/forgot-password--default--1180--light.png` | changed, 27415 px (2.581%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/forgot-password--default--1440--dark.png` | changed, 31410 px (2.424%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/forgot-password--default--1440--light.png` | changed, 27415 px (2.115%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/forgot-password--default--390--dark.png` | changed, 28261 px (8.586%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/forgot-password--default--390--light.png` | changed, 24925 px (7.572%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/forgot-password--default--768--dark.png` | changed, 31410 px (3.994%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/forgot-password--default--768--light.png` | changed, 27415 px (3.486%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/guided-setup--step-1-welcome--1180--dark.png` | changed, 257529 px (24.249%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-1-welcome--1180--light.png` | changed, 243280 px (22.908%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-1-welcome--1440--dark.png` | changed, 524036 px (40.435%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-1-welcome--1440--light.png` | changed, 473785 px (36.557%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-1-welcome--390--dark.png` | changed, 23040 px (7.000%) | D-009 | 3 on every axis | pass |
| `review/guided-setup--step-1-welcome--390--light.png` | changed, 21817 px (6.628%) | D-009 | 3 on every axis | pass |
| `review/guided-setup--step-1-welcome--768--dark.png` | changed, 60608 px (7.707%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-1-welcome--768--light.png` | changed, 58274 px (7.410%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-2-your-details--1180--dark.png` | changed, 164749 px (15.513%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-2-your-details--1180--light.png` | changed, 162726 px (15.323%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-2-your-details--1440--dark.png` | changed, 298429 px (23.027%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-2-your-details--1440--light.png` | changed, 286406 px (22.099%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-2-your-details--390--dark.png` | changed, 11405 px (3.465%) | D-009 | 3 on every axis | pass |
| `review/guided-setup--step-2-your-details--390--light.png` | changed, 11312 px (3.437%) | D-009 | 3 on every axis | pass |
| `review/guided-setup--step-2-your-details--768--dark.png` | changed, 55199 px (7.019%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-2-your-details--768--light.png` | changed, 54947 px (6.987%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-3-your-realtor-partner--1180--dark.png` | changed, 159335 px (15.003%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-3-your-realtor-partner--1180--light.png` | changed, 157314 px (14.813%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-3-your-realtor-partner--1440--dark.png` | changed, 293015 px (22.609%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-3-your-realtor-partner--1440--light.png` | changed, 280994 px (21.682%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-3-your-realtor-partner--390--dark.png` | changed, 12928 px (3.928%) | D-009 | 3 on every axis | pass |
| `review/guided-setup--step-3-your-realtor-partner--390--light.png` | changed, 12834 px (3.899%) | D-009 | 3 on every axis | pass |
| `review/guided-setup--step-3-your-realtor-partner--768--dark.png` | changed, 53380 px (6.788%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-3-your-realtor-partner--768--light.png` | changed, 53128 px (6.756%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-first-field--1180--dark.png` | changed, 212162 px (19.978%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-first-field--1180--light.png` | changed, 186034 px (17.517%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-first-field--1440--dark.png` | changed, 250722 px (19.346%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-first-field--1440--light.png` | changed, 224061 px (17.289%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-first-field--390--dark.png` | changed, 31 px (0.009%) | text rasterisation only | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-first-field--390--light.png` | changed, 30 px (0.009%) | text rasterisation only | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-first-field--768--dark.png` | changed, 11930 px (1.517%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-first-field--768--light.png` | changed, 10645 px (1.354%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-last-field--1180--dark.png` | changed, 172953 px (16.286%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-last-field--1180--light.png` | changed, 151095 px (14.227%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-last-field--1440--dark.png` | changed, 209298 px (16.150%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-last-field--1440--light.png` | changed, 186426 px (14.385%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-last-field--390--dark.png` | changed, 10965 px (3.331%) | D-009; R-17 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-last-field--390--light.png` | changed, 10775 px (3.273%) | D-009; R-17 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-last-field--768--dark.png` | changed, 21408 px (2.722%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-4-create-the-campaign-last-field--768--light.png` | changed, 21174 px (2.692%) | D-009; R-17; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result--1180--dark.png` | changed, 406613 px (38.287%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result--1180--light.png` | changed, 363775 px (34.254%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result--1440--dark.png` | changed, 653893 px (50.455%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result--1440--light.png` | changed, 606778 px (46.819%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result--390--dark.png` | changed, 65388 px (19.865%) | D-009 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result--390--light.png` | changed, 54385 px (16.522%) | D-009 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result--768--dark.png` | changed, 103692 px (13.185%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result--768--light.png` | changed, 87184 px (11.086%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result-needs-changes--1180--dark.png` | changed, 398527 px (37.526%) | D-009; D-010; R-18; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result-needs-changes--1180--light.png` | changed, 355466 px (33.471%) | D-009; D-010; R-18; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result-needs-changes--1440--dark.png` | changed, 632351 px (48.793%) | D-009; D-010; R-18; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result-needs-changes--1440--light.png` | changed, 570947 px (44.055%) | D-009; D-010; R-18; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result-needs-changes--390--dark.png` | changed, 49702 px (15.100%) | D-009; R-18 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result-needs-changes--390--light.png` | changed, 41266 px (12.537%) | D-009; R-18 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result-needs-changes--768--dark.png` | changed, 105078 px (13.361%) | D-009; R-18; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-5-read-the-result-needs-changes--768--light.png` | changed, 100605 px (12.793%) | D-009; R-18; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-6-approve--1180--dark.png` | changed, 133405 px (12.562%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-6-approve--1180--light.png` | changed, 123481 px (11.627%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-6-approve--1440--dark.png` | changed, 181449 px (14.001%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-6-approve--1440--light.png` | changed, 157727 px (12.170%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-6-approve--390--dark.png` | changed, 29955 px (9.100%) | D-009 | 3 on every axis | pass |
| `review/guided-setup--step-6-approve--390--light.png` | changed, 30040 px (9.126%) | D-009 | 3 on every axis | pass |
| `review/guided-setup--step-6-approve--768--dark.png` | changed, 62770 px (7.982%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-6-approve--768--light.png` | changed, 60145 px (7.648%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-6-hand-off--1180--dark.png` | changed, 141165 px (13.292%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-6-hand-off--1180--light.png` | changed, 125179 px (11.787%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-6-hand-off--1440--dark.png` | changed, 150005 px (11.574%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-6-hand-off--1440--light.png` | changed, 133499 px (10.301%) | D-009; D-010; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-6-hand-off--390--dark.png` | changed, 30879 px (9.381%) | D-009 | 3 on every axis | pass |
| `review/guided-setup--step-6-hand-off--390--light.png` | changed, 29774 px (9.045%) | D-009 | 3 on every axis | pass |
| `review/guided-setup--step-6-hand-off--768--dark.png` | changed, 56998 px (7.248%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-6-hand-off--768--light.png` | changed, 54637 px (6.947%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-7-what-happens-next--1180--dark.png` | changed, 217904 px (20.518%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-7-what-happens-next--1180--light.png` | changed, 203368 px (19.150%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-7-what-happens-next--1440--dark.png` | changed, 310139 px (23.930%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-7-what-happens-next--1440--light.png` | changed, 298628 px (23.042%) | D-009; D-010; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-7-what-happens-next--390--dark.png` | changed, 13402 px (4.072%) | D-009; timestamps in the data font | 3 on every axis | pass |
| `review/guided-setup--step-7-what-happens-next--390--light.png` | changed, 12262 px (3.725%) | D-009; timestamps in the data font | 3 on every axis | pass |
| `review/guided-setup--step-7-what-happens-next--768--dark.png` | changed, 64536 px (8.206%) | D-009; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/guided-setup--step-7-what-happens-next--768--light.png` | changed, 59692 px (7.590%) | D-009; timestamps in the data font; R-19, R-21 | 3 on every axis | pass |
| `review/reset-password--link-expired--1440--dark.png` | changed, 16 px (0.001%) | text rasterisation only | 3 on every axis | pass |
| `review/reset-password--saved-notice--1180--dark.png` | changed, page length 6331 to 5847px, 3410737 px (45.656%) | D-009; D-010; R-14; R-19, R-21 | 3 on every axis | pass |
| `review/reset-password--saved-notice--1180--light.png` | changed, page length 6331 to 5847px, 3279490 px (43.899%) | D-009; D-010; R-14; R-19, R-21 | 3 on every axis | pass |
| `review/reset-password--saved-notice--1440--dark.png` | changed, page length 5964 to 5097px, 4744588 px (55.246%) | D-009; D-010; R-14; R-19, R-21 | 3 on every axis | pass |
| `review/reset-password--saved-notice--1440--light.png` | changed, page length 5964 to 5097px, 4580147 px (53.331%) | D-009; D-010; R-14; R-19, R-21 | 3 on every axis | pass |
| `review/reset-password--saved-notice--390--dark.png` | changed, page length 10803 to 10327px, 2069489 px (49.120%) | D-009 | 3 on every axis | pass |
| `review/reset-password--saved-notice--390--light.png` | changed, page length 10803 to 10327px, 2030267 px (48.189%) | D-009 | 3 on every axis | pass |
| `review/reset-password--saved-notice--768--dark.png` | changed, page length 10354 to 9935px, 2502478 px (31.470%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `review/reset-password--saved-notice--768--light.png` | changed, page length 10354 to 9935px, 2427015 px (30.521%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `review/shell--collapsed-rail--1180--dark.png` | changed, page length 6204 to 5525px, 4284023 px (58.519%) | D-009; D-010; R-14 | 3 on every axis | pass |
| `review/shell--collapsed-rail--1180--light.png` | changed, page length 6204 to 5525px, 4138038 px (56.525%) | D-009; D-010; R-14 | 3 on every axis | pass |
| `review/shell--collapsed-rail--1440--dark.png` | changed, page length 5879 to 4945px, 5366786 px (63.394%) | D-009; D-010; R-14 | 3 on every axis | pass |
| `review/shell--collapsed-rail--1440--light.png` | changed, page length 5879 to 4945px, 5190256 px (61.309%) | D-009; D-010; R-14 | 3 on every axis | pass |
| `review/shell--collapsed-rail--768--dark.png` | changed, page length 9766 to 9412px, 3403889 px (45.383%) | D-009 | 3 on every axis | pass |
| `review/shell--collapsed-rail--768--light.png` | changed, page length 9766 to 9412px, 3251619 px (43.353%) | D-009 | 3 on every axis | pass |
| `review/shell--finish-setup-chip--1180--dark.png` | changed, page length 6264 to 5779px, 3411605 px (46.156%) | D-009; D-010; R-14; R-19, R-21 | 3 on every axis | pass |
| `review/shell--finish-setup-chip--1180--light.png` | changed, page length 6264 to 5779px, 3280350 px (44.380%) | D-009; D-010; R-14; R-19, R-21 | 3 on every axis | pass |
| `review/shell--finish-setup-chip--1440--dark.png` | changed, page length 5896 to 5030px, 4741515 px (55.847%) | D-009; D-010; R-14; R-19, R-21 | 3 on every axis | pass |
| `review/shell--finish-setup-chip--1440--light.png` | changed, page length 5896 to 5030px, 4576735 px (53.906%) | D-009; D-010; R-14; R-19, R-21 | 3 on every axis | pass |
| `review/shell--finish-setup-chip--390--dark.png` | changed, page length 10736 to 10260px, 2069407 px (49.424%) | D-009 | 3 on every axis | pass |
| `review/shell--finish-setup-chip--390--light.png` | changed, page length 10736 to 10260px, 2030677 px (48.499%) | D-009 | 3 on every axis | pass |
| `review/shell--finish-setup-chip--768--dark.png` | changed, page length 10286 to 9867px, 2502460 px (31.678%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `review/shell--finish-setup-chip--768--light.png` | changed, page length 10286 to 9867px, 2426524 px (30.717%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `review/shell--help-menu-open--1180--dark.png` | changed, page length 6264 to 5779px, 3411605 px (46.156%) | D-009; D-010; R-14; R-19, R-21 | 3 on every axis | pass |
| `review/shell--help-menu-open--1180--light.png` | changed, page length 6264 to 5779px, 3280350 px (44.380%) | D-009; D-010; R-14; R-19, R-21 | 3 on every axis | pass |
| `review/shell--help-menu-open--1440--dark.png` | changed, page length 5896 to 5030px, 4741515 px (55.847%) | D-009; D-010; R-14; R-19, R-21 | 3 on every axis | pass |
| `review/shell--help-menu-open--1440--light.png` | changed, page length 5896 to 5030px, 4576735 px (53.906%) | D-009; D-010; R-14; R-19, R-21 | 3 on every axis | pass |
| `review/shell--help-menu-open--390--dark.png` | changed, page length 10736 to 10260px, 2069407 px (49.424%) | D-009 | 3 on every axis | pass |
| `review/shell--help-menu-open--390--light.png` | changed, page length 10736 to 10260px, 2030677 px (48.499%) | D-009 | 3 on every axis | pass |
| `review/shell--help-menu-open--768--dark.png` | changed, page length 10286 to 9867px, 2502460 px (31.678%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `review/shell--help-menu-open--768--light.png` | changed, page length 10286 to 9867px, 2426524 px (30.717%) | D-009; R-19, R-21 | 3 on every axis | pass |
| `review/shell--mobile-drawer--390--dark.png` | changed, 8691 px (2.640%) | D-009 (the drawer's titles and the page behind it); R-19 | 3 on every axis | pass |
| `review/shell--mobile-drawer--390--light.png` | changed, 8683 px (2.638%) | D-009 (the drawer's titles and the page behind it); R-19 | 3 on every axis | pass |
| `review/sign-in--default--1180--dark.png` | changed, 71540 px (6.736%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-in--default--1180--light.png` | changed, 59125 px (5.567%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-in--default--1440--dark.png` | changed, 71544 px (5.520%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-in--default--1440--light.png` | changed, 59127 px (4.562%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-in--default--390--dark.png` | changed, 39057 px (11.866%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-in--default--390--light.png` | changed, 34938 px (10.614%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-in--default--768--dark.png` | changed, 71545 px (9.097%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-in--default--768--light.png` | changed, 59127 px (7.518%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-in--refused--1180--dark.png` | changed, 90528 px (8.524%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-in--refused--1180--light.png` | changed, 78404 px (7.383%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-in--refused--1440--dark.png` | changed, 90532 px (6.985%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-in--refused--1440--light.png` | changed, 78406 px (6.050%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-in--refused--390--dark.png` | changed, 48243 px (14.656%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-in--refused--390--light.png` | changed, 44631 px (13.559%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-in--refused--768--dark.png` | changed, 90532 px (11.512%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-in--refused--768--light.png` | changed, 78406 px (9.970%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-in--signed-out--1180--dark.png` | changed, 94169 px (8.867%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-in--signed-out--1180--light.png` | changed, 79580 px (7.493%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-in--signed-out--1440--dark.png` | changed, 94171 px (7.266%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-in--signed-out--1440--light.png` | changed, 79581 px (6.141%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-in--signed-out--390--dark.png` | changed, 58935 px (17.905%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-in--signed-out--390--light.png` | changed, 51018 px (15.499%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-in--signed-out--768--dark.png` | changed, 94171 px (11.974%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-in--signed-out--768--light.png` | changed, 79581 px (10.119%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-up--address-already-has-an-account--1180--dark.png` | changed, 58551 px (5.513%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-up--address-already-has-an-account--1180--light.png` | changed, 53790 px (5.065%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-up--address-already-has-an-account--1440--dark.png` | changed, 58553 px (4.518%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-up--address-already-has-an-account--1440--light.png` | changed, 53791 px (4.151%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-up--address-already-has-an-account--390--dark.png` | changed, 53996 px (16.404%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-up--address-already-has-an-account--390--light.png` | changed, 49963 px (15.179%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-up--address-already-has-an-account--768--dark.png` | changed, 58553 px (7.445%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-up--address-already-has-an-account--768--light.png` | changed, 53791 px (6.840%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-up--default--1180--dark.png` | changed, 45023 px (4.239%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-up--default--1180--light.png` | changed, 40514 px (3.815%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-up--default--1440--dark.png` | changed, 45027 px (3.474%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-up--default--1440--light.png` | changed, 40517 px (3.126%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-up--default--390--dark.png` | changed, 41070 px (12.477%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-up--default--390--light.png` | changed, 37289 px (11.329%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-up--default--768--dark.png` | changed, 45026 px (5.725%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/sign-up--default--768--light.png` | changed, 40515 px (5.152%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/verify-email--default--1180--dark.png` | changed, 18911 px (1.781%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/verify-email--default--1180--light.png` | changed, 16670 px (1.570%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/verify-email--default--1440--dark.png` | changed, 18911 px (1.459%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/verify-email--default--1440--light.png` | changed, 16670 px (1.286%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/verify-email--default--390--dark.png` | changed, 16875 px (5.127%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/verify-email--default--390--light.png` | changed, 14988 px (4.553%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/verify-email--default--768--dark.png` | changed, 18909 px (2.404%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/verify-email--default--768--light.png` | changed, 16668 px (2.119%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/verify-email--link-expired--1180--dark.png` | changed, 23060 px (2.171%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/verify-email--link-expired--1180--light.png` | changed, 20791 px (1.958%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/verify-email--link-expired--1440--dark.png` | changed, 23060 px (1.779%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/verify-email--link-expired--1440--light.png` | changed, 20791 px (1.604%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/verify-email--link-expired--390--dark.png` | changed, 20850 px (6.334%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/verify-email--link-expired--390--light.png` | changed, 18930 px (5.751%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/verify-email--link-expired--768--dark.png` | changed, 23060 px (2.932%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
| `review/verify-email--link-expired--768--light.png` | changed, 20791 px (2.644%) | D-009 (the lead and the checkbox and helper text at the body step) | 3 on every axis | pass |
