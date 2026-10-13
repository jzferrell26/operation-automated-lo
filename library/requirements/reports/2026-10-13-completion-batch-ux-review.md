# Completion batch UX review

**Reviewer:** ux-ui-guardian

**Date:** October 13, 2026

**Scope:** Campaigns property/financing discovery and the pending-review webinar creative pack.

**Method:** Read-only source review, full-size inspection of ten original raster art panels, final eight-frame production-build browser-log review, and direct inspection of six actual screenshot files. Hosted authenticated review and owner pixel approval remain pending.

## Verdict

Approve the scoped preparation/discovery increment for PR review. All six source findings are closed in the final source, and the local production-build browser run passes all eight width/theme combinations. No current source-level UX blocker remains in this batch. The report entry points use the existing visual system and describe private outputs accurately.

This is not a full-product 10/10 or owner pixel-sign-off verdict. The complete manual keyboard/reduced-motion/zoom and authenticated hosted checks are still outstanding. The initial review and its remediation trail remain below.

The pack supplies fifteen editable creative concepts, not fifteen launch-ready campaigns. Its visible boundary is appropriate: owner/lender review, final advertiser/disclosure composition, a bound published webinar, campaign saving and provider launch remain separate work. This review does not complete the property or homeowner reporting products.

## Governing sections

Source of truth: [AutomatedLO design brief](../../knowledge/private/ux-ui/00-design-brief.md), current PRD-009 amendments and October 6 campaign-first amendment. Historical rail, teal and founding Open House Boost directions are superseded.

> Design brief §15: "Every disabled consequential action explains why it is disabled and gives the next safe action."

> Design brief §18: "Use concise inline errors connected to the affected field."

> [Card and Surface](../../knowledge/private/ux-ui/03-components/card-and-surface.md), Anatomy inside a card: "Use `Stack gap=\"4\"` inside the card."

> [Campaign and Artifact Workflow](../../knowledge/private/ux-ui/03-components/campaign-and-artifact-workflow.md), The three Launch an ad screens, The ad card: "the body (`--space-4` above, `--space-5` at the sides and below)".

> [Stepper](../../knowledge/private/ux-ui/03-components/stepper.md), Accessibility contract: "A step change is announced by the screen's `LiveRegion`".

Also consulted: [Button and Safe Action](../../knowledge/private/ux-ui/03-components/button-and-safe-action.md), [Link](../../knowledge/private/ux-ui/03-components/link.md), [Campaign studio §3](../../knowledge/private/ux-ui/04-screens/campaign-studio.md), [Homeowner reports](../../knowledge/private/ux-ui/04-screens/homeowner-reports.md), and [the scored review rubric](../../knowledge/private/ux-ui/06-review-rubric.md). The Weapon's token, motion and WCAG-baseline guides govern review method; the product's stricter 44px target requirement governs this implementation.

## Initial scored source checkpoint, superseded by final qualification below

The rubric requires scores for each screen at 1440, 1180, 768 and 390px in Light and Dark. At the initial checkpoint, those eight-frame scorecards were unverified. This table preserves that limited source checkpoint, not an aggregate product score. `U` means rendering/interaction evidence is insufficient; it is not a passing 3. Current browser evidence appears in the final qualification section.

| Axis                       | Report discovery, source | Webinar pack, initial source | Evidence or limitation                                                                                                                                                  |
| -------------------------- | ------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hierarchy                  | 3                        | 3                            | Existing campaign primary action retained; discovery links are secondary. Pack step 2 and 3 each have one primary action. Catalogue choices use secondary buttons.      |
| Spacing rhythm             | 3                        | 2                            | Token spacing and shared surfaces throughout; pack card/fact details differ from the corresponding ad workflow rules, F-02.                                             |
| Typography                 | 3                        | 2                            | Discovery titles use card-size/semibold. Pack captions and shape control differ from the matching ad workflow, F-03.                                                    |
| Color and contrast         | U                        | U                            | New UI CSS uses semantic tokens. Mathematical sampled pairs pass; full computed colors, focus, badges and every state need rendered measurement.                        |
| States                     | 3                        | 1                            | Pack has visible pending review and clipboard failure; disabled draft review has no reason, F-01.                                                                       |
| Motion                     | 3                        | 3                            | No new bespoke transition or ambient animation. Existing Button, Link and Stepper wrappers own named motion/reduced-motion rules. Runtime reduction remains unverified. |
| Responsiveness             | U                        | U                            | Discovery auto-fit grid and pack 3/2/1 columns are source-backed. Root 390px smoke is narrowly attributed below, not the full matrix.                                   |
| Dark and Light             | U                        | U                            | Semantic tokens and immutable art boundaries are retained; no full theme/state rendering assessment.                                                                    |
| Empty and error states     | 3                        | 2                            | Discovery preserves EmptyState. Clipboard failure is actionable. Root identified conflicting approved-catalog empty copy, F-05.                                         |
| Consistency with reference | U                        | U                            | Wrappers and palette match source rules; photographs against PRD-009 references are still needed.                                                                       |

No total score or 10/10 claim is issued.

## Final source recheck after the implementation response

The initial descriptions and scores below are retained as the review trail. Re-read the implementation after the owner reported focused tests passing:

| Finding | Recheck status                           | Current evidence                                                                                                                                                                                                                            |
| ------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01    | Closed                                   | `pack.tsx:178-231`: field-connected minimum errors plus an adjacent minimum explanation and the button's `aria-describedby`; browser tests exercise empty fields at all eight combinations.                                                 |
| F-02    | Closed                                   | `pack.module.css:80-85`, `:108-111`, `:129-132`: named ad-card insets, flexible headline row, desktop 8rem facts label and zero-gap stacked phone facts. Inspected desktop gallery shows aligned action rows.                               |
| F-03    | Closed                                   | `pack.tsx:302-317` uses `size="sm"`; `:211-214` and `:256-259` use secondary-size `.notice`; `:329-332` retains the caption-size/faint preview note.                                                                                        |
| F-04    | Closed in source and tested DOM behavior | `pack.tsx:41-45` names the changed step; `:94` mounts the hidden LiveRegion unconditionally with its initially empty message. Browser tests confirm the step message and heading focus. Actual screen-reader speech remains a manual check. |
| F-05    | Closed in source                         | `ads-library-screen.tsx:32` explicitly describes the approved catalog and links to the pending creative pack. Existing empty-catalog text is preserved but now scoped by the introduction.                                                  |
| F-06    | Closed                                   | `pack.tsx:298-300`, `:326-328` and `pack.module.css:96-102` preserve wrap/newlines. Browser tests exercise 60/300-character unbroken inputs and multiline copy at all eight combinations, including element-level clipping checks.          |

After the final corrections, all governed source axes in this limited batch score 3. This means no remaining source delta was found, not that every manual state/frame was visually certified. The new fixed-artifact disclosure rule in `apps/web/src/features/campaigns/components/ad-creative.module.css:150-154` explicitly uses the existing `--ad-band-ink` for text on the invariant white brand band; it introduces no palette or UI token. It resolves inherited Dark interface text leaking into that white artifact surface.

## Required findings at the initial source checkpoint

### F-01: Explain disabled draft review

**Severity:** Required. **Screen/frame/theme/state:** Webinar preparation, all supported frames/themes, headline or text trimmed below three characters. **Axes:** 5, 9.

**Location:** `apps/web/src/features/webinar-ads/pack.tsx:167-205`.

The fields show only an upper-limit character count. The primary `Review this draft` button becomes disabled for fewer than three characters without telling the user the minimum or how to recover. This fails brief §15 and Button and Safe Action, Controls.

**Delta:** Use the existing TextField/TextArea description or error contract to state the minimum and associate the message with each invalid field. Keep the current retained words and disabled state. An adjacent explanation at `--text-secondary-size` in `--tx-body` must remain available when the button cannot receive focus.

### F-02: Match the existing ad card and facts rhythm

**Severity:** Required consistency delta, unless the owner records a distinct preparation-pack specification. **Screen/frame/theme/state:** Webinar catalogue/review, all frames/themes, populated. **Axis:** 2.

**Location:** `apps/web/src/features/webinar-ads/pack.module.css:74-86` and `:96-112`; `pack.tsx:124-138` and `:210-227`.

The card body currently pads all four sides with `--space-4`. The matching ad-card specification calls for `--space-4` above and `--space-5` on the sides/below, followed by the action foot. `align-content: start` with a button's `align-self: end` does not establish a shared bottom action row across variable-height titles.

The facts remain stacked with `--space-1` between label and value at every frame. The ad workflow's Facts rule uses an 8rem label beside the value from 48rem upward, and a stacked group with zero internal gap below that width.

**Delta:** Reuse the established card anatomy and named insets; give the card body/action layout a real flexible content row or separate action foot so choices align across a row. Apply the responsive facts grid from the matching workflow. Verify the result against actual long titles at 1180 and 768px.

### F-03: Use the existing compact shape control and preview caption steps

**Severity:** Required consistency delta, unless a distinct preparation-pack specification is recorded. **Screen/frame/theme/state:** Webinar preview, all frames/themes, tall/square selected. **Axis:** 3.

**Location:** `apps/web/src/features/webinar-ads/pack.tsx:272-287` and `:296-299`; `pack.module.css:48-51`.

The Tall/Square buttons use the default 16px Button size. The ad workflow specifies `--text-secondary-size` for this choice. The small line under the preview currently shares `.caption` at the 14px secondary step in `--tx-body`, whereas the analogous preview caption is `--text-caption-size` in `--tx-faint`.

**Delta:** Pass `size="sm"` to the shape buttons, preserving the shared 44px target and Button's common weight. Use a dedicated token-based preview-caption rule with `--text-caption-size` and `--tx-faint`; keep substantive draft-retention and download-boundary explanations at the readable secondary step. Do not shrink every paragraph using `.caption`.

### F-04: Announce the changed preparation step

**Severity:** Required accessibility delta. **Screen/frame/theme/state:** Webinar pack, all frames/themes, choose/back/review transition. **Axis:** 5.

**Location:** `apps/web/src/features/webinar-ads/pack.tsx:37-40`, `:67-69`, `:81-88`, `:264`.

`move()` focuses the persistent title, which always says `Fifteen webinar ad creatives`. No step-specific live announcement accompanies the changed content. The Stepper contract expects a screen-owned LiveRegion to announce the task change. Clipboard status announces only copying.

**Delta:** Add a concise step announcement through the existing LiveRegion/status primitive, such as `Step 2 of 3: Prepare your words`, while keeping deliberate focus management and clipboard feedback separate. Confirm the announcement and visible focus without duplicate narration.

### F-05: Distinguish an empty approved catalogue from available draft preparation

**Severity:** Required copy/state delta, identified by root browser inspection. **Screen/frame/theme/state:** Ads library, approved catalogue empty, pending pack populated. **Axes:** 5, 9.

**Location:** `apps/web/src/app/(authenticated)/marketing/campaigns/library/ads-library-screen.tsx:32-51` and the empty description in `apps/web/src/copy/ads-library-messages.ts`.

The approved-library empty message currently implies there is nothing to prepare on the page, immediately before the pending creative pack. Root has asked the implementation owner to clarify this state.

**Delta:** State that no approved launch ads are available while identifying the draft pack below as available for preparation. Retain the owner's approved-catalogue boundary and no provider action.

### F-06: Preserve long and multiline editable copy in the preview

**Severity:** Required input-state delta. **Screen/frame/theme/state:** Webinar edit/review, especially 390px in both themes, unbroken or multiline user input. **Axes:** 5, 7.

**Location:** `apps/web/src/features/webinar-ads/pack.tsx:300`, `:326`; `pack.module.css:93-95`. The form permits up to 300 characters of primary text and 60 characters of headline. The preview paragraphs/headline carry no `overflow-wrap`, while the preview card has `overflow: hidden`. The only wrap-anywhere rule in this module applies to facts values. A pasted unbroken string can therefore be clipped rather than reflowed; textarea newlines also collapse in the plain preview paragraph.

**Delta:** Give editable preview copy and its headline `overflow-wrap: anywhere`; give the primary-text preview `white-space: pre-wrap`. Keep the existing body/card type tokens. Add the long-string and multiline cases to browser checks; document-level no-overflow alone does not detect clipping inside an overflow-hidden card.

## Verified source observations

- `apps/web/src/features/campaigns/components/campaign-list.tsx:128-159`: property and financing discovery links use `Link variant="action"`, `Surface padding="lg"`, `Stack gap="4"`, and connected descriptions. They name only private outputs. No new primary-blue competition or CRM page is introduced.
- `apps/web/src/features/campaigns/components/campaign-list.module.css:29-46`: auto-fit grid, zero minimum inline size, token gap/card title, and wrap-aware descriptive text support the responsive design. Actual authenticated CampaignList rendering still needs qualification; the demo Campaigns screen is not evidence of this changed component.
- `apps/web/src/features/webinar-ads/pack.tsx:3-16`: new feature uses the existing Button, Badge, Card, Link, LiveRegion, Stepper, TextField, TextArea and AdCreative wrappers. No new UI library or direct library primitive is introduced.
- `pack.tsx:80-84`, `:235-259`, `:280-283`, `:329-332`: pending review, unbound webinar, unpersisted campaign and unbranded-download limitations are visibly described. There is no approval or provider launch button in this module.
- `pack.module.css:121-139`: catalogue columns move from three to two to one, and the preview moves below the editing region when constrained. The source introduces no sticky panel, fixed action, drag-only interaction or bespoke motion.
- `pack.tsx:137-145`: each repeated preparation button includes its creative name in accessible text. Filters/format/shape use `aria-pressed`; image alternative text arrives from the catalog.

## Art inspection and contrast evidence

Inspected directly with `view_image`, at original art size:

- Tall: `webinar-first-home-plan`, `webinar-budget-beyond-price`, `webinar-credit-questions`, `webinar-preapproval-explained`, `webinar-closing-checklist`.
- Square art panels: `webinar-first-home-plan`, `webinar-cash-to-close`, `webinar-credit-preparation`, `webinar-before-home-search`, `webinar-offer-to-keys`.

The ten sampled panels have legible large headings, distinct thematic illustrations and no observed clipped headline or overlapping meaningful text. This is a sample, not a visual pass on all thirty assets. The art panels intentionally have dimensions 1080x1080 and 1080x842; the existing AdCreative brand band composes them into 4:5 and 1:1 previews. Downloads omit that band, and the UI says so.

Using the standard sRGB luminance calculation against generator palette literals, sampled text/paper ratios are blue 15.17:1, gold 13.00:1 and green 11.38:1. White header text on the corresponding dark fills is 16.87:1, 14.25:1 and 12.45:1. Motif strokes on their soft fields are 4.34:1, 4.53:1 and 3.80:1. UI body text on card tokens is 6.01:1 in Light and 8.27:1 in Dark. These are mathematical solid-color pairs, not browser measurements of every rendered element or a formal accessibility-conformance conclusion.

Art palettes are artifact content; they do not override the dashboard's single action blue or theme. The pending text concepts are educational, and inspected art includes no fabricated financial number or outcome. Review of advertising legality and lender approval is outside this UX report.

## Final production-build browser qualification

Read [the actual browser log](../../../test-results/completion-webinar-browser.log): eight Chromium tests passed in 2.5 minutes on the final production build. The root identifies the build as Next.js 16.3.8. The test source is `tests/browser/webinar-ads.spec.ts`; this reviewer did not run a duplicate suite.

For **each** width/theme combination below, the run verifies all fifteen loaded gallery assets, actual topic filtering, choosing a creative, heading focus, invalid-field explanation, unbroken maximum-length copy without element clipping, preserved multiline text, square preview, on-demand selection, review facts/link/downloads, clipboard content/status, no campaign mutation request and no page error. Zero axe violations and no document overflow are checked in gallery, preparation and review. This is automated qualification of the exercised local fixture states, not proof of a live provider or real customer account.

| Width | Theme | Automated qualification | Screenshot inspection                                                                                                        |
| ----- | ----- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1440  | Light | PASS                    | Gallery inspected directly; three-column pending pack, aligned actions and restrained hierarchy.                             |
| 1440  | Dark  | PASS                    | Review inspected directly; two-column review, differentiated pending state, readable fixed-white brand band and disclosure.  |
| 1180  | Light | PASS                    | Review inspected directly; two-column workflow remains contained.                                                            |
| 1180  | Dark  | PASS                    | Screenshot exists; no separate direct image inspection.                                                                      |
| 768   | Light | PASS                    | Screenshot exists; no separate direct image inspection.                                                                      |
| 768   | Dark  | PASS                    | Review inspected directly for composition; preview stacks below details. Full-page downscaling limits small-text assessment. |
| 390   | Light | PASS                    | Review file opened; tool downscaling to 96px wide prevents detailed pixel assessment.                                        |
| 390   | Dark  | PASS                    | Gallery file opened; tool downscaling to 46px wide prevents detailed pixel assessment.                                       |

Screenshot evidence is under `test-results/browser/webinar-ads-webinar-preparation-at-<width>-in-<theme>-chromium/`, with `webinar-gallery-<width>-<theme>.png` and `webinar-review-<width>-<theme>.png`, sixteen files total. These are actual final-run screenshots, not invented or independently recaptured baselines. Full-page review captures include the sticky shell at its capture-time scroll position; this is not evidence that the shell occupies that middle position in ordinary document flow.

### Current scored evidence

The ten rubric axes are scored only to the extent their evidence supports the score. The source review supports 3 for hierarchy, spacing, typography and named motion usage after fixes. The eight-frame browser run supports 3 for **exercised** states, automated contrast checks, overflow/clipping, actual Light/Dark resolution and the tested empty-field error path. No remaining visible delta was found in readable representative screenshots.

The complete per-frame manual visual/interaction score remains `U`, because the browser suite does not inspect every hover/focus/disabled state, target size, reduced-motion setting, 200% zoom or screen-reader speech, and long mobile screenshots become unreadable when displayed by the tool. Rubric axis 10's exact reference/pixel comparison remains `U` at all eight combinations. This report therefore issues no total or full 3-on-every-axis/10-out-of-10 score. These limits do not reopen the fixed source findings or negate the actual eight passing browser cases.

## Earlier attributed browser smoke and remaining qualification

Root reported an October 13 CUA smoke on the local Ads library at 390x844: all fifteen image elements loaded; document width 375px versus viewport 390px; choose/edit/on-demand/review flow worked; the focused heading was correct. This evidence is attributed to root and was not independently captured by this reviewer. It covers a narrow mobile smoke only.

The final run supersedes the earlier uncertainty about asset loading, tested flows, long-input clipping, zero axe violations and no document overflow at all four widths in both themes. Still unverified:

1. Complete manual visual state scoring, including hover/focus/disabled states and readable mobile viewport screenshots. Clipboard failure is covered in focused integration tests reported by the implementation owner, not the browser matrix.
2. Keyboard Tab/Shift+Tab across the entire flow, focus not obscured, screen-reader speech, every target size, reduced motion and 200% zoom. Programmatic heading focus and the live-region DOM content are verified.
3. Complete measured focus-ring/non-text contrast across every relevant surface and state. Zero axe violations in the exercised states and the sampled mathematical text pairs are verified.
4. Actual authenticated CampaignList discovery links, including role-restricted paths; demo fixtures are not substitutes for changed-source coverage.
5. Full art sample expansion, small-card text legibility and long saved brand identity in both preview shapes.
6. Approved-baseline screenshot comparison and separate owner visual approval. No screenshot baseline was updated by this review.

## Tokens and code ownership

No tokens, utilities, source code or design-system files were changed by this reviewer. Only this report is owned/written by ux-ui-guardian. Findings were sent to root and the implementation owner before report completion. Security then Quality closeout remains the orchestrator's responsibility.
