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
