# PRD-009 scored baseline review (009G-AC-006), pass 1

Run 2026-10-03 by four `ux-ui-guardian` reviewers (opus) in parallel, against `library/knowledge/private/ux-ui/06-review-rubric.md` and the PRD-009 design direction and mockups, on the pictures of the single redraw (screen-baselines run 37059676544, head `de69e09e`): 74 synthetic and 394 review pictures, 468 in all, 232 changed and 236 new. The shared brief is reproduced in the appendix.

## Result

No picture scored 3 on every axis in pass 1. 58 findings: 4 High (R3 F-01, F-03, F-04 and R4-01, of which F-01 and R4-01 are the same Home defect), 17 Medium, 37 Low. None is a gate failure (rubric section 6); every finding is fixed, with a test where a test can pin it, before the baselines are committed, and the affected pictures are redrawn and re-scored in pass 2 (009G-AC-011).

| Part | Set | Pictures | High | Medium | Low |
| --- | --- | --- | --- | --- | --- |
| R1 | Launch an ad, Ads library | 104 | 0 | 4 | 14 |
| R2 | Campaign page and list, gone page, shell | 138 | 0 | 5 | 10 |
| R3 | Home, Settings, Connections, Brand, partners, homeowners | 80 | 3 | 6 | 6 |
| R4 | Account screens, email preview, design surfaces | 146 | 1 | 2 | 7 |


## Part R1


Reviewer `r1` (`ux-ui-guardian`), PRD-009 scored baseline review, 009G-AC-006. Read-only review of the
redraw installed in `C:\Users\jzfer\Projects\oalo-prd-009` (screen-baselines run 37059676544, head
`de69e09e`). Nothing in the repository was edited.

**Set.** 104 pictures, all under `tests/visual/screens/review/` (none of my prefixes exist under
`tests/visual/screens/chromium/`). `git status` marks all 104 as new (`??`), so there is no previous
picture to compare; every picture is attributed to the sub-PRD that owns its surface: the shell
(top bar, page padding) to 009a, the "Ads library" tab to 009c (its tab strip to 009e), and the three
launch steps, the ad card, the brand band, and the feed preview to 009d.

**Standards read.** `library/knowledge/private/ux-ui/06-review-rubric.md` in full;
`design/00-direction.md` revision 2 (sections 2, 5, 6, 9); 009c and 009d in full; the mockups
`ads-library.html`, `launch-step-1-choose.html`, `launch-step-2-set-up.html`,
`launch-step-3-review-and-launch.html` and their eight previews. The brief's rulings are respected:
the ad preview's scaled and feed type is not scored against the six steps, the "SAMPLE" art is not a
delta, the library tab has only the "Campaigns" title and the tab strip, and the sub-PRD wins where
it differs from a mockup (for example 009D-AC-001's existing `Stepper` primitive in place of the
mockups' boxed step indicator, and 009d D8's approval line without the role).

**Method.** Every picture was opened (tall frames in crops); each Light/Dark pair was also compared
structurally with an edge map: in all 52 pairs every Light edge is present in Dark, and Dark's extra
edges sit only inside the ad pictures (the white ad on a dark card), so the layouts are identical
across themes. Pixel colours were sampled where a finding depends on a value. Code was read to cite
the source of each delta.

### 1. Scores

Axes: 1 hierarchy, 2 spacing, 3 typography, 4 colour and contrast, 5 states, 6 motion,
7 responsiveness, 8 Dark and Light, 9 empty and error, 10 consistency with the PRD-009 mockups.
"L+D" means Light and Dark share the line.

| Picture group | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Sub-PRD | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `ads-library--all--1440` L+D | 3 | 2 | 2 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 009c, 009a | R1-01, 02, 03 (5 of 8 dates wrap), 04 |
| `ads-library--all--1180`, `--768`, `--390` L+D | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009c, 009a | R1-01, 02, 03, 04; 4/3/2/1 cards a row and chips scroll at 390, as 5.2 asks |
| `ads-library--one-topic--1440` L+D | 3 | 2 | 2 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 009c, 009a | As above; both shown cards' dates wrap |
| `ads-library--one-topic--1180`, `--768`, `--390` L+D | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009c, 009a | R1-01, 02, 03, 04 |
| `ads-library--real-catalog` all four frames L+D | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 009c, 009a | R1-01, 02, 06; 009C-AC-012 sentence present, no chips |
| `launch-an-ad--step-1-all--1440` L+D | 3 | 2 | 2 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 009d, 009a | R1-01 to 05; every card button secondary, as 6.1 asks |
| `launch-an-ad--step-1-all--1180`, `--768`, `--390` L+D | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009d, 009a | R1-01, 02, 03, 04, 05 |
| `launch-an-ad--step-1-filtered--1440` L+D | 3 | 2 | 2 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 009d, 009a | As step-1-all at 1440; selected chip carries `aria-pressed` styling |
| `launch-an-ad--step-1-filtered--1180`, `--768`, `--390` L+D | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009d, 009a | R1-01 to 05 |
| `launch-an-ad--step-1-real-catalog` all four frames L+D | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 2 | 009d, 009a | R1-01, 05, 06 |
| `launch-an-ad--step-2-first-campaign--1440`, `--1180`, `--390` Light | 2 | 2 | 2 | 3 | 2 | 3 | 3 | 3 | 3 | 1 | 009d, 009a | R1-01, 02, 05, 07, 08, 09, 10 |
| `launch-an-ad--step-2-first-campaign--1440`, `--1180`, `--390` Dark | 2 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 3 | 1 | 009d, 009a | As Light, plus R1-17 |
| `launch-an-ad--step-2-first-campaign--768` Light | 2 | 2 | 2 | 3 | 2 | 3 | 2 | 3 | 3 | 1 | 009d, 009a | As 1440, plus R1-11 |
| `launch-an-ad--step-2-first-campaign--768` Dark | 2 | 2 | 2 | 3 | 2 | 3 | 2 | 2 | 3 | 1 | 009d, 009a | As 768 Light, plus R1-17 |
| `launch-an-ad--step-3-ready-for-approval` all four frames, Light | 2 | 1 | 2 | 3 | 2 | 3 | 3 | 3 | 3 | 1 | 009d, 009a | R1-01, 02, 05, 08, 12, 13, 14, 15, 16 |
| `launch-an-ad--step-3-ready-for-approval` all four frames, Dark | 2 | 1 | 2 | 3 | 2 | 3 | 3 | 2 | 3 | 1 | 009d, 009a | As Light, plus R1-17 |
| `launch-an-ad--step-3-cannot-approve` all four frames, Light | 2 | 1 | 2 | 3 | 2 | 3 | 3 | 3 | 3 | 2 | 009d, 009a | R1-01, 02, 05, 08, 13, 14, 15, 16 |
| `launch-an-ad--step-3-cannot-approve` all four frames, Dark | 2 | 1 | 2 | 3 | 2 | 3 | 3 | 2 | 3 | 2 | 009d, 009a | As Light, plus R1-17 |
| `launch-an-ad--step-3-needs-changes` all four frames, Light | 3 | 1 | 2 | 3 | 2 | 3 | 3 | 3 | 3 | 2 | 009d, 009a | R1-01, 02, 05, 08, 13, 14, 15, 16; "Fix it" is the one primary |
| `launch-an-ad--step-3-needs-changes` all four frames, Dark | 3 | 1 | 2 | 3 | 2 | 3 | 3 | 2 | 3 | 2 | 009d, 009a | As Light, plus R1-17 |
| `launch-an-ad--step-3-approved` all four frames, Light | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 3 | 3 | 2 | 009d, 009a | R1-01, 02, 05, 08, 14, 15, 16; approval line is 009d D8's |
| `launch-an-ad--step-3-approved` all four frames, Dark | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 3 | 2 | 009d, 009a | As Light, plus R1-17 |
| `launch-an-ad--step-3-sent-back` all four frames, Light | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 3 | 3 | 2 | 009d, 009a | R1-01, 02, 05, 08, 14, 15, 16; "Make a new version" primary |
| `launch-an-ad--step-3-sent-back` all four frames, Dark | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 3 | 2 | 009d, 009a | As Light, plus R1-17 |
| `launch-an-ad--step-3-ad-retired` all four frames, Light | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 3 | 3 | 2 | 009d, 009a | R1-01, 02, 05, 08, 14, 15, 16; "Choose another ad" primary |
| `launch-an-ad--step-3-ad-retired` all four frames, Dark | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 3 | 2 | 009d, 009a | As Light, plus R1-17 |

R1-15 is visible only at 1440 and 1180 (the link shares a line with the sentence there); it does not
lower a score that R1-01 has not already lowered. Axes 4 and 6 are 3 throughout: no raw colour is
visible outside the ad picture, every status chip pairs a glyph with words, and motion is not
observable in a still (section 6's reduced-motion gate covers it).

### 2. Findings

Each finding is in the rubric section 3 form: screen, frame, theme, state, file and line, current
value, the token or rule it must be, axis. Then what the picture shows, the reference, and severity.

**R1-01. Page top padding is one step short (shell, 009a).** Every picture in the set, every frame,
both themes. `apps/web/src/features/shell/components/app-shell.module.css:338` gives `.content`
`padding: var(--space-6) var(--space-8)` (24px above the page) and `:406-408` `var(--space-4)` (16px)
below 48rem; the mockups' `.page` is `padding: var(--space-8)` (32px) and `var(--space-6)
var(--space-4)` on a phone (`launch-step-1-choose.html:179` and `:420`, the same in every mockup).
Measured on `ads-library--all--1440--light.png`: the bar's hairline is at y=64 and the "Campaigns"
line box starts at y=88 (24px); the mockup preview has about 32px. At 390 the title starts 16px
under the bar against the mockup's 24px. Axis 2. **Low.** One edit fixes every in-shell picture; the
other three reviewers will likely see the same delta on theirs.

**R1-02. Section and card titles render at the browser's bold, not semibold (009c, 009d).** Every
picture with an `h2` or `h3` below the page title (all but `step-1-real-catalog`), every frame, both
themes. No rule sets a weight on them, so they take the user-agent `bold` (700):
`apps/web/src/features/campaigns/components/launch.module.css:69-75` (`.section h2`, `.preview h2`,
`.adCard h2`), `:78-83` (`.cardTitle`, used for "What you approve" and "Launch"),
`apps/web/src/features/campaigns/components/ad-library-cards.module.css:114-119` (`.cardTitle`, every
ad name), `apps/web/src/app/(authenticated)/marketing/campaigns/library/ads-library.module.css:50-54`
("Ads library"), and `apps/web/src/app/globals.css:105-119` sets sizes only. Design 2.3 and the mockups set section and
card titles at `--weight-semibold` (600): `.section-title` and `.card-title`,
`ads-library.html:184-185`, `.ad-card__title` `:464`. The picture shows "Your brand on the ad",
"What you approve", and every "Sample: ..." card title visibly heavier than the mockups' titles.
Axis 3. **Low.** Gate note: `expectTypographyOnBrief` (rubric section 6) checks sizes only, so a
weight off its token is not caught by any gate.

**R1-03. The card's version line is at the wrong step, and its date breaks across lines at 1440
(009c, 009d).** `ads-library--all`, `--one-topic`, `step-1-all`, `step-1-filtered`, all frames, both
themes; the wrap at 1440 only. `ad-library-cards.module.css:121-128` gives `.cardVersion` the
secondary step (14px) and `--tx-body`; the mockup's `.ad-card__meta` is `--text-caption-size` (12px)
in `--tx-faint` (`ads-library.html:466`). At 1440 the card's content box is 236px and "Version 1.
Reviewed Sep 28, 2026." needs about 237px at 14px, so the date splits across two lines in the five
cards whose day has two digits: the picture shows a two-line date mask in cards 1, 2, 3, 6, and 8 of
`ads-library--all--1440-*.png` and `step-1-all--1440-*.png` (both cards of the filtered and one-topic
pictures), against a one-line mask in the other three. At the caption step the line fits; the date
itself should also not break (`white-space: nowrap` on the `time`, `text-with-days.tsx`). Axes 3
and 7. **Low.**

**R1-04. The ad card and the topic chips drift from the mockup (009d builds them, 009c reuses them).**
Same pictures as R1-03, all frames, both themes. (a) The topic label has no glyph:
`ad-library-cards.tsx:113` renders text only; the mockup's `badge--topic` carries the tag icon
(`ads-library.html:541`). (b) The grid gap is `--space-5` at every frame
(`ad-library-cards.module.css:59`); the mockup is `--space-6`, and `--space-4` below 720px
(`ads-library.html:461`, `:516`); measured 20px between cards at 1440 against the mockup's 24px.
(c) The card body is `padding: var(--space-4)` (`:100`); the mockup is `var(--space-4) var(--space-5)
var(--space-5)` (`:463`, `:468`). (d) The chip's label inherits the 16px body step (`font: inherit`,
`:39`); the mockup's `.chip` is `--text-secondary-size` (`ads-library.html:455`), which is why the
chips wrap to two rows at 768. (e) The selected chip turns its text blue (`--st-info-fg`, `:45-50`);
the mockup keeps `--tx-strong` and marks it with semibold weight, the tint, and the border (`:457`).
Axes 2 and 10. **Low.**

**R1-05. The step indicator sits in the header, 12px under the lead (009d).** All 56 launch
pictures, all frames, both themes. `LaunchHeader` renders crumbs, `h1`, lead, then `Stepper` inside
`.header` (`launch-flow.tsx:478-488`) whose gap is `var(--space-3)` (`launch.module.css:14-17`). The
picture shows "Step 1 of 3" 12px under the lead and the chips 24px under the stepper. The mockups put
the indicator directly under the title and the lead under the indicator, each a page-gap
(`--space-6`) apart (`launch-step-1-choose.html:179`, page `gap: var(--space-6)`). The `Stepper`
primitive itself is 009D-AC-001's and is not the delta; its placement and gap are. Axes 2 and 10.
**Low.**

**R1-06. The empty library is a hand-built paragraph, and step 1 keeps a lead about ads that do not
exist (009c, 009d).** `ads-library--real-catalog` and `step-1-real-catalog`, all frames, both themes.
`AdCardGrid` returns a bare `<p className={styles.empty}>` (`ad-library-cards.tsx:144-150`, styled at
`ad-library-cards.module.css:139-147`) rather than the `AsyncState` `empty` variant
(`packages/ui/src/components/async-state.tsx`) that axis 9 names. On step 1 the lead still says "Each
ad already has its image and words..." above the empty box (`launch-flow.tsx:543`, `CHOOSE_LEAD`),
while the library tab drops its lead for exactly that reason (`ads-library-screen.tsx:17-19`, `:33`).
The 009C-AC-012 sentence itself is right and honest. Axis 9. **Low.**

**R1-07. "Use the library words" does not look like a control (009d).** `step-2-first-campaign`, all
frames, both themes. `launch-flow.tsx:338-344` renders it as `Button variant="ghost"`, which is
`--tx-strong` text with a transparent border and fill at rest (`packages/ui/src/components/Button.module.css:83-88`).
The picture shows plain navy (Dark: white) words beside "Ad words", indistinguishable from a label.
The mockup draws it as a link in the link colour (`.reset-link`, `launch-step-2-set-up.html:507` and
`:545`, links `--st-info-fg` at `:133`), and design 6.2 makes it the one undo for edited words. Must
be a `Link`-styled control in `--st-info-fg` (or the link look applied to the button). Axes 10 and 5.
**Medium.**

**R1-08. Text links are drawn as bordered buttons (009d).** `step-2-first-campaign` ("Add in Brand")
and every `step-3-*` picture ("Change"), all frames, both themes. Both use `Link variant="action"`
(`launch-flow.tsx:519-521`, `launch-review.tsx:237-239`), which draws a secondary button
(`packages/ui/src/components/link.module.css:36-50`). The mockups draw "Change in Brand" and "Change"
as semibold text links (`.brand-summary a`, `launch-step-2-set-up.html:311`; the facts head of
`launch-step-3-review-and-launch.html:556`). On step 3 the bordered "Change" becomes the most
prominent control in the "What you approve" card. Axis 10. **Low.**

**R1-09. Field labels are one step too large (the `FormField` primitive, 009a).**
`step-2-first-campaign`, all frames, both themes. `packages/ui/src/components/field.module.css:19-24`
sets `.label` to `--text-body-size` (16px) at `--weight-medium`. Design 2.4 sources
`--text-secondary-size` from Listing Studio's field labels, and the mockup's `.field label` is
`--text-secondary-size` at `--weight-semibold` (`launch-step-2-set-up.html:221`). The picture shows
"Headline", "Ad text", "Daily budget" at the same size as the field values. Axis 3. **Low.** It will
recur on every form (Brand, Settings) in the other reviewers' sets.

**R1-10. Step 2's side title and locked line sit at the wrong steps (009d).**
`step-2-first-campaign`, all frames, both themes. "Your ad so far" is an `h2` at the section step
(`launch.module.css:70`, 19px); the mockup makes it a `.card-title` (`launch-step-2-set-up.html:568`,
16px), so the preview's title competes with the form's sections. The locked disclosure line has no
size (`launch.module.css:205-216`), so "Disclosure, from your brand: Equal Housing Opportunity." is
16px bold; the mockup's `.locked` is `--text-secondary-size` (`:320`). "Back" has no chevron (mockup
`:566`). Axes 1, 3, and 10. **Low.**

**R1-11. Step 2's live preview is uncapped at 768 (009d).** `step-2-first-campaign--768`, both
themes. The preview's `AdFeedPreview` is not wrapped in `.feedFrame` (`launch-flow.tsx:450-466`), so
at 768 it spans the column: about 662px wide and about 1,000px tall in the picture. Step 3 caps the
same frame at `max-inline-size: 30rem` (`launch.module.css:325-329`, 480px in
`step-3-*--768`). Sibling steps draw one ad at two sizes. Axis 7. **Low.**

**R1-12. "Ready for approval" is drawn as a full-width banner between cards (009d).**
`step-3-ready-for-approval`, all frames, both themes. `launch-review.tsx:403-405` places the `Badge`
directly in `.decision`, a grid (`launch.module.css:446-449`), so the chip stretches to the column:
the picture shows a 436px tinted bar from x=852 to x=1288 at 1440 (`--st-info-bg`, sampled
234,244,255 at both ends), floating between "What you approve" and "Approve this version". Every
other state puts its chip inside its card, as the mockup does for all five states
(`launch-step-3-review-and-launch.html:570-574`). Must sit inside the approve card, at its own width
(`justify-self: start`). Axes 10 and 1. **Medium.**

**R1-13. Three decision cards have no internal rhythm (009d, shared with 009e's campaign page).**
`step-3-ready-for-approval`, `-needs-changes`, `-cannot-approve`, all frames, both themes. `Card` is a
block (`packages/ui/src/components/primitives.css:5-10`), so its children are spaced only by stray
`<p>` margins. The picture shows: in the approve card, "Send back for changes" about 4px under the
"Who can do this" row and an empty status paragraph leaving about 32px of dead space at the card's
foot (`campaign-approval-controls.tsx:164-213`); in the needs-changes card, the chip, the "What to
fix" list (`.fixes` has `margin: 0`, `launch.module.css:381-387`), and "Fix it" stacked about 4px
apart (`launch-review.tsx:382-398`); in the cannot-approve card, "Copy the link" about 5px under the
chip and above the sentence that explains it (`launch-review.tsx:371-374`,
`campaign-hand-off.tsx` renders the button first). The mockup separates every card child by
`--space-4` (`.card > * + *`, `launch-step-3-review-and-launch.html:198`), orders the hand-off as
chip, sentence, then the action, and makes "Copy the link" the card's primary (`:573`); in the
product the cannot-approve screen has no primary action at all. Axes 2, 1 (cannot-approve), and 10.
**Medium.**

**R1-14. A disabled button reads as an enabled outline button (Button primitive, 009a; used by
009d).** Every `step-3-*` picture ("Launch on Facebook"), plus "Approve this version" in
`-needs-changes`, all frames, both themes. `Button.module.css:42-48` paints `:disabled` with
`--sf-sunken` and a `--bd-input` edge; sampled on `step-3-ready-for-approval--1440--light.png` the
fill is 245,248,252 on a 255,255,255 card and the edge 113,131,153, the same edge as the enabled
"Send back for changes" beside it. `launch-on-facebook.tsx:28` also chooses `variant="outline"`. Design
2.3 says "A disabled primary turns grey", and the mockup's disabled button is `--st-neutral-bg` with a
`--bd-hairline` edge (`launch-step-3-review-and-launch.html:213`, `:563`). The reason sentence is
adjacent, so this is not a missing state, but the state does not read. Axes 5 and 10. **Medium.**
Gate note: the component tests assert the disabled contract, not that it looks disabled.

**R1-15. The Meta sentence's link stretches its line (009d).** `step-3-*` at 1440 and 1180, both
themes. The `Link` in `launch-sentence.tsx:30` is the default `inline` variant, whose 44px
`min-block-size` (`link.module.css:69-75`) makes the second line of "Launching on Facebook isn't
turned on yet, and it needs Meta connected. See what's needed for Meta." 33px from the first, against
21px for the same text elsewhere. The 44px target is required (brief 14, the gate), so the link
should start its own line at every frame, as it already does at 768 and 390. Axis 2. **Low.**

**R1-16. Step 3's side cards are padded one step tighter than the mockup, and "Details for support"
sits outside a card (009d).** Every `step-3-*` picture, all frames, both themes. The side cards use
`padding="md"` (`--space-4`: `launch-review.tsx:207`, `launch-on-facebook.tsx:26`,
`campaign-approval-controls.tsx:164`, the decision cards at `launch-review.tsx:320-404`), while the
"Your ad" card uses `lg` (`:167`) and the mockup's `.card` is `--space-6` throughout
(`launch-step-3-review-and-launch.html:196`). "Details for support" is a bare disclosure on the
canvas; the mockup puts it in a card (`:565`). Axes 2 and 10. **Low.**

**R1-17. Inside the white feed frame, two lines follow the dashboard theme (009d).** Every Dark
picture of `step-2-*` and `step-3-*`, all frames. `apps/web/src/features/campaigns/components/ad-creative.module.css:225`
(`.feedFooter` divider) and `:248` (`.feedButton` edge) use `--bd-hairline`: sampled 214,226,238 in
Light and 52,57,70 in Dark on the same white frame, so in Dark the footer rule and the "Learn more"
outline turn charcoal. Design 2.6 and brief section 13: the ad and its frame look the same in both
themes (the band and the frame's fill already do, through `--ad-band-paper`). Must use a fixed
ad-paper rule value set the way `--ad-band-paper` is. Axis 8. **Low.**

**R1-18. Gate: the date masks hide the static text around a wrapped date (test, not a picture).**
`tests/browser/review/empty-account.spec.ts:96-98` masks every `time`. When the `time` wraps, its
box spans both lines, so the mask also paints over "Version N. Reviewed" in the five wrapped cards at
1440 (R1-03) and over "From launch until" in the step 3 Dates fact at 390. Those words can then
regress without failing the comparison. The sample catalog's review dates are fixed catalog data,
not facts about the run, so they need no mask. Axis 10 (the screenshot gate of rubric section 6).
**Low.**

**Observations, not scored.** (1) In the feed frame's uppercase company line, "NORTHGATE LENDING"
renders as "NORT HGAT E LENDING" in every step 2 and 3 picture (`.feedCompany`,
`ad-creative.module.css:228-235`, `letter-spacing: 0.04em` on 12px Inter); it looks like the CI
rasterizer's glyph rounding and sits inside the exempt ad picture, so it is recorded, not scored;
worth one look on a real browser. (2) With no saved brand, step 2's brand tile is an empty square in
the fallback brand colour; in Dark it nearly vanishes against the sunken card. It is decorative and
has no mockup state.

### 3. Summary

I scored all 104 pictures in my set (52 Light and Dark pairs; all new in this redraw, none changed).
**None scores 3 on every axis**: the shell's 24px page top padding (R1-01) puts axis 2 at 2 on every
picture, and every other surface carries at least one further delta. The lowest scores are on step 2
(axis 10 at 1, for "Use the library words" reading as plain text) and step 3's ready, needs-changes,
and cannot-approve states (axis 2 at 1 for cramped decision cards; ready also axis 10 at 1 for the
chip drawn as a full-width banner). Light and Dark are structurally identical in all 52 pairs; the
only theme-specific delta is the feed frame's two theme-following lines (R1-17). Findings: **18**, of
which **0 High, 4 Medium** (R1-07, R1-12, R1-13, R1-14) and **14 Low** (R1-01 to 06, 08 to 11, 15 to
18, R1-18 being a gate finding). Attribution: 009a for R1-01, R1-09, and the primitive half of
R1-14; 009c with 009d for the shared card and chips (R1-02 to 04, 06); 009d for the rest, with R1-13's
approval card and hand-off shared by 009e's campaign page.

## Part R2


Reviewer: r2 (`ux-ui-guardian`). Run worktree `C:\Users\jzfer\Projects\oalo-prd-009`, redraw run 37059676544, head `de69e09e`.
Set: every changed or new picture under `tests/visual/screens/chromium/` and `tests/visual/screens/review/` named `campaign-page--`, `campaign-detail--`, `campaigns--`, `gone--` or `shell--`: 138 pictures (64 changed, 74 new), every one opened.

Read first: `library/knowledge/private/ux-ui/06-review-rubric.md` (whole), `design/00-direction.md` rev 2 (sections 2, 3, 5.4, 6.5, 7, 8, 9), 009a, 009e, 009f D1, the mockups `campaign-detail.html` and `campaigns-list.html` with their 1440 and 390 previews, `home-first-run--1440/768` for the bar, and the component specs `badge-and-live-region.md`, `link.md`, `button-and-safe-action.md`, `sheet-and-dialog.md`. Previous pictures were read with `git show HEAD:<path>`. Nothing in the repository was edited.

Method notes. Measurements are in picture pixels, read from crops and from row and column scans of the PNGs. Gate-proven facts (rubric section 6: contrast pairs, overflow, 44px targets, type steps, reduced motion, axe) are taken as proven and not re-scored. Two of the review pictures are byte-identical pairs: `campaign-detail--approved--*` and `campaign-detail--already-decided--*` hash the same at every frame and theme, so they share every score.

### 1. Scores

Axes: 1 hierarchy, 2 spacing, 3 typography, 4 colour and contrast, 5 states, 6 motion, 7 responsiveness, 8 Dark and Light, 9 empty and error, 10 PRD-009 mockups.

| # | Picture group (count) | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Sub-PRD | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | review `campaign-page--{approved,sent-back,newer-version}--{1440,390}--light` (6) | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | new: 009e, with 009d preview and launch button, 009c newer-version notice | F-2, F-4, F-5, F-7, F-12, F-13 |
| 2 | same three states `--{1180,768}--light` (6) | 3 | 2 | 2 | 3 | 2 | 3 | 1 | 3 | 3 | 3 | same | adds F-1: actions float mid-column |
| 3 | same three states `--{1440,390}--dark` (6) | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 3 | 3 | same | adds F-6: ad rules turn dark |
| 4 | same three states `--{1180,768}--dark` (6) | 3 | 2 | 2 | 3 | 2 | 3 | 1 | 2 | 3 | 3 | same | F-1 and F-6 |
| 5 | review `campaign-page--{ad-retired,library-notice}--{1440,390}--light` (4) | 3 | 1 | 2 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | new: 009e, notices 009c | adds F-3: notice glyph alone on a line |
| 6 | same two states `--{1180,768}--light` (4) | 3 | 1 | 2 | 3 | 2 | 3 | 1 | 3 | 3 | 3 | same | F-1, F-3 |
| 7 | same two states `--{1440,390}--dark` (4) | 3 | 1 | 2 | 3 | 2 | 3 | 3 | 2 | 3 | 3 | same | F-3, F-6 |
| 8 | same two states `--{1180,768}--dark` (4) | 3 | 1 | 2 | 3 | 2 | 3 | 1 | 2 | 3 | 3 | same | F-1, F-3, F-6 |
| 9 | review `campaign-page--saved-before-prd-009--*` all frames, both themes (8) | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | new: 009e D4 | Read-only, "Launch an ad" the one primary, header fits at every frame; F-2, F-4 (crumb), F-12, F-13 |
| 10 | review `campaign-detail--{ready,approved,already-decided}--{1440,390}--light` and chromium `campaign-detail--permission-restricted--{1440,390}--light` (8) | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | changed: 009a shell and look, 009e page rewrite, 009d approve card and preview | Rail, banner, open house fields gone; ready shows the approve card, restricted shows the hand-off; F-2, F-4, F-5, F-7, F-12, F-13 |
| 11 | same four `--{1180,768}--light` (8) | 3 | 2 | 2 | 3 | 2 | 3 | 1 | 3 | 3 | 3 | same | adds F-1 |
| 12 | same four `--{1440,390}--dark` (8) | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 3 | 3 | same | adds F-6 |
| 13 | same four `--{1180,768}--dark` (8) | 3 | 2 | 2 | 3 | 2 | 3 | 1 | 2 | 3 | 3 | same | F-1, F-6 |
| 14 | chromium `campaign-detail--default--*` all frames, both themes (8) | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 1 | changed: 009a shell and look; 009f copy ("Cedar Street open house" for "...Open House Boost") | Unlinked local demo campaign kept "Unchanged" by 009f D1; F-13, F-14 |
| 15 | review `campaigns--all-states--{1440,1180}--{light,dark}` (4) | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 2 | 2 | new: 009e (009G-AC-002 capture) | Every chip of 009d D8 present and decision-aware; F-9, F-10, F-12, F-13 |
| 16 | chromium `campaigns--populated--{1440,1180}--{light,dark}` (4) | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | changed: 009a shell, 009e table and tabs (cards and "Open House Boost" eyebrow gone) | F-9, F-12, F-13 |
| 17 | review `campaigns--all-states--768--*` and chromium `campaigns--populated--768--*` (4) | 3 | 2 | 2 | 3 | 3 | 3 | 1 | 3 | 3 | 3 | as rows 15 and 16 | F-8: chips break into two and three lines |
| 18 | review `campaigns--all-states--390--*` and chromium `campaigns--populated--390--*` (4) | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | as rows 15 and 16 | Cards; F-11, F-12, F-13 |
| 19 | chromium `campaigns--empty--*` and review `campaigns--empty-account--*` (16) | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | chromium changed: 009a, 009e AC-011 empty state; review new: 009g capture | `AsyncState` empty with the one primary inside it (009E-AC-011); F-12, F-13 |
| 20 | review `gone--default--*` (8) | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | new: 009f D1 | Says what happened and what to do next; F-12 (raw -0.035em), F-13 |
| 21 | review `shell--help-menu-open--{1440,1180,390}--{light,dark}` (6) | 3 | 2 | 3 | 3 | 3 | 3 | 1 | 3 | 3 | 3 | changed: 009a bar and Help sheet; Home beneath is 009b (old picture was the rail over the old overview) | Help sheet on brief; F-13; F-15 cross-reference (Home checklist squeezed beneath) |
| 22 | review `shell--help-menu-open--768--{light,dark}` (2) | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | same | Two-row bar as the mockup; F-13 |
| 23 | review `shell--menu-sheet-open--390--{light,dark}` (2) | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | new: 009a (009A-AC-011) | Six links in the non-modal `Sheet`, bottom sheet below 768 as `sheet-and-dialog.md` "Which layer" says, current item tinted and weighted; F-13 (help glyph) |

Total 138 (24 + 16 + 8 + 32 + 8 + 4 + 4 + 4 + 4 + 16 + 8 + 6 + 2 + 2).

What holds at 3 across the set, so nobody re-checks it: the top bar matches `campaign-detail.html` and `campaigns-list.html` (one row at 1440 and 1180, two rows at 768 with the hairline between, Menu button, name, help glyph and avatar at 390; current page tinted, semibold and `aria-current`; a restricted item shows its lock); no left rail and no not-connected banner anywhere in review; the sample-data line only in chromium pictures; the results card first and full width with three "Not live yet" figures and no digit; versions newest first with decision-aware chips; "Details for support" collapsed; the ad preview with the brand band and "SAMPLE" art (ruled); Dark keeps the ad light (ruled), apart from F-6.

### 2. Findings

Severity: High (blocks the bar for a person), Medium (visible on a primary frame), Low (a reviewer sees it, a person would not).

#### F-1. Campaign page header actions float mid-column when the header wraps. Axis 7. Medium. Sub-PRD 009e.
- Pictures: rows 2, 4, 6, 8, 11 and 13 (40 pictures): every library-ad campaign page at 1180 and 768, both themes, every state, including chromium `permission-restricted`.
- What I see: at 1180 the actions block drops under the title but stays a 512px box at the column's start with its contents right-aligned inside it. "Make a new version" and "Launch on Facebook" sit at x 132 to 544 of a 32 to 1148 column, the sentence starts at x 54, and "See what's needed for Meta." ends at x 541. They align to neither edge of the column. Same at 768 (x 113 to 464 of 27 to 741). On `review/campaign-page--approved--1180--light.png`, `review/campaign-detail--ready--1180--light.png` (one button, x 329 to 544), `review/campaign-page--sent-back--768--light.png`.
- Required: 009E-AC-001 (actions with "that button's one sentence directly under the buttons"); direction section 7 (header); rubric axis 7, "Correct composition at 1440, 1180, 768, and 390". The 1180 frame is the app inside HighLevel (direction 2.1).
- Source: `apps/web/src/features/campaigns/components/campaign-page.module.css:36-42` (`.head` wraps) and `:74-80` (`.headActions { max-inline-size: 32rem; justify-items: end; text-align: end }`); the stacked rule exists only below `47.99rem` (`:432-454`), so 768 and 1180 fall through.
- Fix: when the block wraps it must take one edge: `margin-inline-start: auto` on `.headActions` (keeps the right alignment of 1440), or start alignment as the 390 rule does. The earlier-flow page (row 9) is unaffected because its lead is short.

#### F-2. Sibling cards on the campaign page use three different paddings. Axis 2. Low. Sub-PRD 009e.
- Pictures: rows 1 to 13 (112 pictures).
- What I see: Results, The ad, and The saved words have 24px inner padding; Approval, Approve this version, Versions and the fixes card have 16px; Details for support has 20px. In the right column at 1440 "Approval" starts at x 921 and "Details for support" at x 925. Stacked at 768 the text edges step 57, 49, 53 px; at 390 41, 33, 37 px (`review/campaign-page--approved--768--light.png`, `--390--light.png`).
- Required: rubric axis 2 ("vertical rhythm is consistent within a screen"); mockup `campaign-detail.html:196` `.card { padding: var(--space-6) }` for every card, and the support disclosure at the same inline inset (`:369`).
- Source: `Surface padding="lg"` in `campaign-results-card.tsx:84`, `campaign-ad-card.tsx:47`, `persisted-campaign-screen.tsx:221`; `padding="md"` in `campaign-approval-section.tsx:45` and `:67`, `campaign-versions-card.tsx:28`, `campaign-approval-controls.tsx:154` and `:164`, `persisted-campaign-screen.tsx:80`; `.support details { padding: var(--space-3) var(--space-5) }` in `campaign-page.module.css:369-377`.
- Fix: one inset, `--space-6`, for every card on the page (`padding="lg"`, and `--space-6` inline on `.support details`).

#### F-3. A library notice's glyph stands alone on its own line. Axis 2. Medium. Sub-PRD 009e.
- Pictures: rows 5 to 8 (16): `review/campaign-page--ad-retired--*` and `review/campaign-page--library-notice--*`.
- What I see: the info glyph is drawn on line 1 by itself and the sentence starts under it (`review/campaign-page--library-notice--1440--light.png`, notice card at y 780 to 870; same in Dark and at 390).
- Required: 009E-AC-006 and direction section 7, "Library notices, one line each"; a glyph that pairs with words sits on the words' first line, as the badge does (`badge-and-live-region.md`, "Shape and type").
- Source: `apps/web/src/features/campaigns/components/campaign-library-notices.tsx:77-80` puts `<Icon>` inside the `<p>`, and `packages/ui/src/components/Icon.module.css:1-4` makes every icon `display: block`; `.notice p` (`campaign-page.module.css:344-349`) is not a row.
- Fix: draw the glyph and the sentence as a flex row, `gap: var(--space-2)`, `align-items: start`.

#### F-4. Inline links inside 14px text render at 16px. Axis 3. Low. Sub-PRD 009e (and the `Link` spec).
- Pictures: rows 1 to 13 (112); the breadcrumb only on row 9.
- What I see: in the breadcrumb, "Campaigns" is 16px (85px wide for 9 characters) beside the 14px current crumb; under the header buttons, "See what's needed for Meta" is 16px inside the 14px sentence and, as a 44px `inline-flex` box, is pushed onto its own line (`review/campaign-page--approved--1440--light.png`, y 100 to 120 and 210 to 262).
- Required: mockup `campaign-detail.html:189` `.crumbs` and `:217` `.reason`, both at `--text-secondary-size` with the link inside at that size; `03-components/link.md`, "States and targets", last paragraph: "A link genuinely set inside a running sentence is a case this specification does not yet cover; add it here before shipping one." This ships one.
- Source: `packages/ui/src/components/link.module.css:11` (`.link { font-size: var(--text-body-size) }`) and `:69-75` (`.inline` is `inline-flex` 44px); call sites `persisted-campaign-screen.tsx:59` inside `.crumbs` (`campaign-page.module.css:16-29`) and `launch-sentence.tsx:30` inside `.reason` (`:100-103`).
- Fix: `link.md` first gains the in-sentence case (inherit the sentence's size; target rule per WCAG 2.5.8's inline exception), then the two call sites follow it. The doc change belongs to `ux-ui-guardian` before the code change.

#### F-5. A disabled primary is drawn as an outlined secondary. Axis 5. Medium. Sub-PRD 009a (token change), seen through 009e and 009d.
- Pictures: rows 1 to 8 and 10 to 13 (104): "Launch on Facebook" on every library campaign page; also "Approve this version" on chromium `permission-restricted`.
- What I see: Light fill `#f5f8fc` (the canvas, so no visible fill) with the `#718399` edge, grey text. Beside "Make a new version" (white fill, the same `#718399` edge) the two read as equal secondary buttons; in Dark the same.
- Required: direction 2.3, "A disabled primary turns grey, so the screen's single enabled primary is the one blue button"; mockup `campaign-detail.html:214`, `.btn[disabled] { background: var(--st-neutral-bg); border-color: var(--bd-hairline) }`.
- Source: `packages/ui/src/components/Button.module.css:42-48` (`.button:disabled { background: var(--sf-sunken); border-color: var(--bd-input) }`). Before 009a `--bd-input` was faint, so this rule only became a strong edge with the PRD-009 value. Step 3 (another reviewer's set) uses the same primitive.

#### F-6. The ad picture takes the dashboard theme in two lines. Axis 8. Low. Sub-PRD 009d.
- Pictures: rows 3, 4, 7, 8, 12 and 13 (36 Dark pictures).
- What I see: inside the white ad, the rule above the feed footer and the edge of the "Learn more" picture-button turn dark navy in Dark and pale in Light (pixel diff of the ad box on `review/campaign-page--approved--1440--{light,dark}.png`: only y 1398 and the box x 638 to 750, y 1416 to 1452 differ).
- Required: direction 2.6, "the ad (the library art plus the loan officer's brand band) looks the same in both themes"; `ad-creative.module.css:6-8` says the same.
- Source: `apps/web/src/features/campaigns/components/ad-creative.module.css:225` (`.feedFooter` `border-block-start: 1px solid var(--bd-hairline)`) and `:248` (`border: 1px solid var(--bd-hairline)` on the CTA picture). Fix: an ad-scoped custom property set by `ad-creative.tsx`, as the band's paper and ink already are.

#### F-7. The ad's company line opens gaps inside words. Axis 3. Low. Sub-PRD 009d.
- Pictures: rows 1 to 8 and the review half of rows 10 to 13 (88).
- What I see: "NORT HGAT E LENDING" and "REVIEW LOCAT ION (NOT CONNECT ED)": a visible gap after every T in the uppercase 12px line (2x crop of `review/campaign-detail--ready--1440--light.png` at x 266 to 770, y 1280 to 1470). "PRAIRIE HOME LENDING" has no T and shows none.
- Required: the type-step exemption for `data-ad-preview` (brief ruling) covers size, not a broken word; rubric axis 3.
- Source: `apps/web/src/features/campaigns/components/ad-creative.module.css:229-235` (`.feedCompany`, `letter-spacing: 0.04em` with `text-transform: uppercase`). Likely fix: drop the tracking or set `font-kerning: normal` and recheck the picture; the exact mechanism is UNVERIFIED.

#### F-8. The Campaigns table at 768 breaks status chips into two and three lines. Axis 7. Medium. Sub-PRD 009e.
- Pictures: row 17 (4): `review/campaigns--all-states--768--*`, `chromium/campaigns--populated--768--*`.
- What I see: "Sent back / for / changes" and "Ad / retired" as tall blobs, "Ready for / approval", "Needs / changes"; "Pre- / approval" hyphen-broken; two-line headers.
- Required: rubric axis 7 (composition at 768); 009E-AC-009 (a table at 720px and wider); a chip is a single-line pill (`badge-and-live-region.md`, "Shape and type").
- Source: `apps/web/src/features/campaigns/components/campaign-list.module.css:143-192` (`table-layout: fixed`, Status at 17%, `.nowrap` released at `:165-167`).
- Fix: keep the chip on one line and give Status its width (for example Ad 24%, Status 22%, Last change 10%), or show the cards up to the tablet frame if 009E-AC-009 is amended.

#### F-9. Topic wraps at 1440 and 1180 while the Ad column has room. Axis 10. Low. Sub-PRD 009e.
- Pictures: rows 15 and 16 (8).
- What I see: "First-time / buyers" on two lines in every such row; rows grow to 107px.
- Required: mockup `campaigns-list--1440.png`, Topic on one line.
- Source: `apps/web/src/features/campaigns/components/campaign-list.tsx:161` (`<td>` without `styles.nowrap`, which Dates and Status have at `:162` and `:166`).

#### F-10. The earlier-flow row shows an empty thumbnail tile. Axis 9. Low. Sub-PRD 009e.
- Pictures: `review/campaigns--all-states--{1440,1180}--*` (4).
- What I see: "Tour this home this weekend" has a blank bordered tile where the art goes; it reads as an image that failed to load.
- Required: 009E-AC-009 ("a decorative thumbnail"), 009E-AC-012 (the older campaign's row); rubric axis 9, honest states.
- Source: `apps/web/src/features/campaigns/components/campaign-list.tsx:64-71` renders `.thumb` (`campaign-list.module.css:77-85`) with no image. Fix: no tile when there is no art, or a deliberate placeholder glyph at `--tx-faint`.

#### F-11. Phone cards drop the mockup's thumbnail and sit top-heavy. Axis 10. Low. Sub-PRD 009e.
- Pictures: row 18 (4).
- What I see: no thumbnail; the 44px name link inside 16px padding leaves about 30px above the name against 16px at the sides.
- Required: mockup `campaigns-list--390.png` (thumbnail beside the name in each card).
- Source: `campaign-list.module.css:143-151` hides `.thumb` below `63.99rem`, a rule written for the 720 to 1024 table, so it also hides the card thumbnail that `campaign-list.tsx:186` renders.

#### F-12. Page titles miss the brief's tracking, and the gone page uses a raw one. Axis 3. Low. Sub-PRD 009e, 009f.
- Pictures: rows 1 to 13 and 15 to 20 (120).
- What I see and source: the campaign page title (`campaign-page.module.css:60-66`) and the Campaigns title (`campaign-list.module.css:16-21`) set no `letter-spacing`; the gone page's title takes `.workspace h1 { letter-spacing: -0.035em; line-height: 1.25 }` and its text `.workspace { line-height: 1.6 }` (`apps/web/src/features/workspace/workspace.module.css:7`, `:22-26`), raw values, and reads visibly tighter than its siblings.
- Required: brief section 10, "Page title: ... negative 0.02em tracking", which is `--tracking-page` (`packages/ui/src/tokens.css:96`) and `--leading-normal` 1.5 (`:98`); the mockups' `.page-title` (`campaigns-list.html:181`) and Home (`overview.module.css:143`) apply it.

#### F-13. The Help control sits 2px above the bar's text line. Axis 2. Low. Sub-PRD 009a.
- Pictures: all 138.
- What I see: at 1440, 1180 and 768 the cap of "Help" spans y 25 to 35 while "Home", "Brand" and the account name span y 27 to 37; at 390 the help glyph is centred at y 29.5 against 31.5 for the Menu button and the avatar. In `campaigns-list--1440.png` (mockup) Help and the menu share one line (y 87 to 96).
- Required: rubric axis 2; mockup top bar.
- Source (likely): the ghost `Button` keeps its `padding-block: var(--space-2)` (`packages/ui/src/components/Button.module.css:8`) inside the inline-block `SheetAnchor` (`packages/ui/src/components/overlay.module.css:170-173`); `.accountButton` removes that padding (`apps/web/src/features/shell/components/app-shell.module.css:237-239`) and lines up, `.helpButton` (`:226-229`) does not.

#### F-14. The unlinked demo campaign does not read as a PRD-009 campaign page. Axis 10. Low (records). Sub-PRD 009f.
- Pictures: row 14 (8): `chromium/campaign-detail--default--*`.
- What I see: the pre-PRD-009 open house detail in the new shell: property address "214 Cedar Street", "Open House feed/story creative" with "TOUR THE HOME", Instagram identity and "Instagram Stories placement", version identifiers ("page-v3") outside Details for support, and a blue "Confirm the launch summary".
- Required: axis 10 against `campaign-detail.html`; 009E-AC-008 (no address or open house time on the campaign page). Against that: 009f D1 (`prd-009f-...:61`) keeps `/marketing/campaigns/synthetic-open-house-001` "Unchanged", and the route's own comment says nothing links to it (`apps/web/src/app/(authenticated)/marketing/campaigns/synthetic-open-house-001/page.tsx:7-14`).
- Fix: no code by this review. Close it by a dated rubric section 5 entry owned by `design-system-guardian` that exempts the unlinked local demo page from axis 10, or by retiring the screen and its 8 baselines.

#### F-15. Cross-reference: the Home checklist is squeezed under the Help sheet. Axis 7. Medium. Sub-PRD 009b; owned by the reviewer of the `overview--*` pictures.
- Pictures: row 21 (6): `shell--help-menu-open--{1440,1180,390}--*`.
- What I see: "Not connected / yet" chips on two lines at 1440 and 1180 and three lines at 390; at 390 the item text runs one or two words a line beside "See what's needed".
- Required: `home-first-run--1440.png` and `--390` (chips on one line); rubric axis 7.
- Source: `apps/web/src/features/overview/components/overview.module.css:319-326` (`.checklist > li`, `auto minmax(0, 1fr) auto`) with the longer amended action label `HOME_SEE_WHATS_NEEDED` (`apps/web/src/copy/home-messages.ts:84`). Scored here only because the picture shows it; count it once with the overview reviewer's finding.

#### Noted, not scored below 3
- Chip size. Every status chip is 12px (`--text-caption-size`), per `03-components/badge-and-live-region.md`, "Shape and type"; the mockups draw `.badge` at `--text-secondary-size` (`campaign-detail.html:237`). The component spec governs the primitive, so axis 10 stays 3. Hand the disagreement to `design-system-guardian` to settle one way.
- Harness H-1. `review/campaign-detail--{ready,approved,already-decided}--*` show a focus ring on the account control, left by choosing the theme from the header (`tests/browser/review/review-campaign-decision.spec.ts:121-125`, `:172-178`, `:183-198`); the named states do not call for it.
- Harness H-2. Run-day dates are unmasked in `review/campaign-detail--{ready,approved,already-decided}--*` ("Fri, Oct 16, 2026", "Saved on Oct 2, 2026"), `chromium/campaign-detail--permission-restricted--*`, and `chromium/campaigns--populated--*` ("Until Oct 16", "Oct 2"). The comparison at `maxDiffPixelRatio: 0.001` may fail on another day, most likely at 390. The campaign-page captures already pass `dateMasks` (`tests/browser/review/empty-account.spec.ts:96-98`).
- Harness H-3, against the comparison gate (rubric section 6). A mask on a `time` that wraps paints the union box of both lines, so whole sentences are blacked out and unguarded: the retired notice (`campaign-page--ad-retired--*`, two lines) and the approval sentence (`campaign-detail--approved--1440--*`). `white-space: nowrap` on `time`, or masking only the date's line box, would keep the rest of the sentence under the gate.

### 3. Summary

138 pictures scored (64 changed, 74 new), every one opened, Light and Dark compared at every frame. None is at 3 on every axis, because F-13 (the Help control 2px off the bar's line) reaches every picture; with F-13 fixed, 4 pictures would be (the two Menu sheet pictures and Help open at 768). Fifteen findings: 0 High; 5 Medium (F-1 header actions float at 1180 and 768 on 40 pictures, F-3 notice glyph alone on a line, F-5 disabled primary drawn as a secondary, F-8 table chips break at 768, F-15 the Home checklist cross-reference for 009b); 10 Low (F-2 card paddings, F-4 16px links in 14px text plus the `link.md` gap, F-6 ad rules take the theme, F-7 gaps after T in the ad's company line, F-9 Topic wraps, F-10 empty thumbnail tile, F-11 phone cards lose the thumbnail, F-12 page-title tracking, F-13 Help offset, F-14 the unlinked demo campaign, which needs a records decision rather than code). By sub-PRD: 009e F-1 to F-4 and F-8 to F-12; 009a F-5 and F-13; 009d F-6 and F-7; 009f F-12 (gone) and F-14; 009b F-15. Three harness notes (stray focus ring, unmasked run-day dates, masks that hide whole sentences) and one mockup-versus-spec chip size question go to the orchestrator and `design-system-guardian`.

## Part R3


Reviewer: r3 (`ux-ui-guardian`). Run worktree `C:\Users\jzfer\Projects\oalo-prd-009`, head `de69e09e`, redraw run 37059676544.
Set: the 80 pictures under `tests/visual/screens/chromium/` and `tests/visual/screens/review/` whose names start with `home--`, `overview--`, `settings--`, `settings-connections--`, `partners--`, `homeowners--` or `brand--`. 24 are changed (`M`, all in `chromium/`), 56 are new (`??`, all in `review/`).

Read against: `library/knowledge/private/ux-ui/06-review-rubric.md` (scale, axes, finding form, section 6), `design/00-direction.md` revision 2 (sections 2.3, 3.1, 4), the mockup `design/mockups/home-first-run.html` with its previews at 1440, 1180, 768, 390 and 1440 Dark, the campaigns-list preview for page-header rhythm, and 009a, 009b, 009c, 009d, 009f. The brief's rulings are respected: the 28px Home title and 16px primary button, the two Home lists stacking at 768 and 390 (009B-AC-003), "With Meta", the `data-ad-preview` exemption (it covers the Brand page's band preview), and the synthetic-only "Local demo with sample data." strip. Every picture was opened; Light and Dark were compared side by side for every frame. No defect is Dark-only; every finding below holds in both themes.

Axes: 1 Hierarchy, 2 Spacing, 3 Typography, 4 Colour and contrast, 5 States, 6 Motion, 7 Responsiveness, 8 Dark and Light, 9 Empty and error, 10 Consistency with the PRD-009 mockups.

### 1. Scores

| Picture (L/D = the Light and Dark pair) | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Sub-PRD | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `review/home--first-run--1440` L/D | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 009b (new) | Reads as the mockup's sibling: composition, card rhythm, chips, steps, footer. The "Get set up" rows wrap their state chip to two lines (F-01); glyphs differ from the mockup (F-02). |
| `review/home--first-run--1180` L/D | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 009b (new) | As 1440: two columns from 1100px, F-01, F-02. |
| `review/home--first-run--768` L/D | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009b (new) | Start, checklist, running, approval stack in D1's order (009B-AC-003 outranks the mockup's side-by-side lists). Two-row top bar as 009A-AC-011. Chips fit on one line here. F-02 only. |
| `review/home--first-run--390` L/D | 2 | 3 | 3 | 3 | 3 | 3 | 1 | 3 | 3 | 1 | 009b (new) | "See what's needed" takes the row; the item text runs one or two words a line and the state chip is a three-line blob (F-01, High). |
| `review/home--real-catalog--1440` L/D | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 009b, 009c (new) | The empty-library variant: 009C-AC-012's sentence in place of the topics, the 009b D2 amended intro. F-01, F-02. |
| `review/home--real-catalog--1180` L/D | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 009b, 009c (new) | As 1440. |
| `review/home--real-catalog--768` L/D | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009b, 009c (new) | Stacks in D1's order. F-02 only. |
| `review/home--real-catalog--390` L/D | 2 | 3 | 3 | 3 | 3 | 3 | 1 | 3 | 3 | 1 | 009b, 009c (new) | F-01, High. |
| `chromium/overview--default--1440` L/D | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 009b, 009a (changed) | Was PRD-008's CRM overview inside the dark rail; now the synthetic Home (009b) in the top bar with the sample-data strip (009a D3). No approval card: the local principal is `campaign_creator` (`local-synthetic-principal.ts:41`), so 009b D3 applies and "Running now" keeps half width by design. F-01, F-02. |
| `chromium/overview--default--1180` L/D | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 009b, 009a (changed) | As 1440. |
| `chromium/overview--default--768` L/D | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009b, 009a (changed) | F-02 only. |
| `chromium/overview--default--390` L/D | 2 | 3 | 3 | 3 | 3 | 3 | 1 | 3 | 3 | 1 | 009b, 009a (changed) | F-01, High. |
| `review/settings--default--1440` L/D | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009a, 009f (new) | Three cards in a row; eyebrow and card titles off the mockup's treatment (F-11). |
| `review/settings--default--1180` L/D | 3 | 3 | 2 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 009a, 009f (new) | Drops to two columns with the third card orphaned, though 1180 has the same 1116px column as 1440 (F-07). F-11. |
| `review/settings--default--768` L/D | 3 | 3 | 2 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 009a, 009f (new) | Orphaned third card (F-07). F-11. |
| `review/settings--default--390` L/D | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009a, 009f (new) | One column. F-11. |
| `review/settings-connections--empty-account--1440, 1180, 768, 390` L/D | 3 | 1 | 2 | 2 | 3 | 3 | 3 | 3 | 2 | 2 | 009a, 009f (new) | Inverted group rhythm and 8px card padding (F-08); grey pills with no glyph (F-09); the notice loses its info surface (F-10); eyebrow (F-11); the same not-connected sentence four times (F-12). Identical at every frame. |
| `chromium/settings-connections--default--1440, 1180, 768, 390` L/D | 3 | 1 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 2 | 009a, 009f (changed) | Was the dark-rail shell with "Back to setup"; now the top bar, new tokens and Inter (009a), the styles carried into `permission-screen.module.css` and the setup link gone (009f D4), "set up an ad" copy. F-08, F-09, F-10, F-11. |
| `review/brand--empty-account--1440` L/D | 1 | 1 | 2 | 1 | 3 | 3 | 3 | 3 | 3 | 1 | 009d D3, 009a (new) | Two navy panels (F-04), two blue primaries (F-05), the ad form's fields touching (F-06), eyebrow (F-11). |
| `review/brand--empty-account--1180` L/D | 1 | 1 | 2 | 1 | 3 | 3 | 2 | 3 | 3 | 1 | 009d D3, 009a (new) | As 1440, plus one column at the 1180 frame with a 1116px band preview (F-07). |
| `review/brand--empty-account--768` L/D | 1 | 1 | 2 | 1 | 3 | 3 | 3 | 3 | 3 | 1 | 009d D3, 009a (new) | F-04, F-05, F-06, F-11. |
| `review/brand--empty-account--390` L/D | 1 | 1 | 2 | 1 | 3 | 3 | 3 | 3 | 3 | 1 | 009d D3, 009a (new) | F-04, F-05, F-06, F-11. |
| `chromium/brand--default--1440, 1180, 768, 390` L/D | 2 | 2 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 1 | 009a, 009f (changed) | Was the same page inside the dark rail; now the top bar, tokens, Inter (009a) and "every ad" in place of "Open House Boost" (009f). Still the pre-PRD-009 Brand Engine page (F-13), with F-09, F-10, F-11. |
| `review/partners--empty--1440, 1180, 768, 390` L/D | 2 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 1 | 009a, 009f (new) | The page's one primary, "Add Realtor partner", draws its plus glyph on a line of its own at every frame (F-03); eyebrow (F-11). |
| `review/homeowners--empty-account--1440, 1180, 768` L/D | 2 | 3 | 3 | 1 | 3 | 3 | 3 | 3 | 2 | 2 | 009a (new) | A critical-coloured alert above the title repeats what the empty card says (F-14). |
| `review/homeowners--empty-account--390` L/D | 2 | 3 | 2 | 1 | 3 | 3 | 3 | 3 | 2 | 2 | 009a (new) | F-14, plus the lead drops to 12px, below the card's 16px body (F-15). |

Axes 5, 6 and 8 hold at 3 throughout: every control state in the pictures is drawn, nothing moves on these pages, and every frame reads correctly in both themes with the 009a Dark values. Axis 6 and the hover and focus states are the gates' to prove (rubric section 6); nothing in the pictures contradicts them.

### 2. Findings

Each finding is in the rubric's section 3 form. Frames and themes are listed together where the delta is identical.

**F-01. Home, "Get set up" rows: the action column starves the text column.** Severity: **High** at 390, Medium at 1440 and 1180.
- Pictures: `review/home--first-run--{1440,1180,390}--{light,dark}`, `review/home--real-catalog--{1440,1180,390}--{light,dark}`, `chromium/overview--default--{1440,1180,390}--{light,dark}`. State: nothing connected, brand not started. Not at 768.
- What the pictures show: the row is `icon | text | action`, and the amended action "See what's needed" (MTK-008 W-3) is about 171px wide where the mockup's "Connect" was about 86px. At 1440 and 1180 the text column is about 167px, so "Not connected yet" breaks across two lines inside its pill and each item sentence runs three or four lines. At 390 the column is about 97px: "Connect / HighLevel" wraps, the sentence runs one or two words a line ("Your / Facebook / page and ad / account."), and the pill becomes a three-line blob ("Not / connected / yet") that outweighs the item title.
- What is required: the mockup's previews (`design/mockups/previews/home-first-run--1440.png`, `--1180.png`, `--390.png`) keep every state chip on one line and each sentence in two lines; axis 7 asks for correct composition at every frame. A status pill split across lines is a raw composition fault, not a copy choice.
- Source: `apps/web/src/features/overview/components/overview.module.css:319-326` (`.checklist > li`, `grid-template-columns: auto minmax(0, 1fr) auto`), `:355-359` (`.card .stateChip`, no `white-space: nowrap`), `:361-364` (`.itemAction`); markup `home-setup-card.tsx:114-141`.
- Fix: keep the chip on one line (`white-space: nowrap` on `.card .stateChip`), and when the card is narrow move the action under the text in the text column (for example a container query on `.setup`, with `grid-template-areas: "icon text" ". action"`) so the sentence keeps the card's measure. Axes 7, 10, and 1 at 390.

**F-02. Home, "Get set up" glyphs differ from the mockup.** Severity: Low.
- Pictures: every Home picture in the set (24), both themes.
- What the pictures show: HighLevel and Meta both draw `globe`, so the two connection rows carry the same glyph, and the brand row draws `sparkles`; "Needs your approval" draws a bare check.
- Required: the mockup draws a plug for each connection and a palette for the brand, and a circled check for "Nothing to approve" (`design/mockups/home-first-run.html`, previews at every frame).
- Source: `apps/web/src/features/overview/components/home-setup-card.tsx:40-44` (`ITEM_ICONS`); its own comment at `:31-39` records that `IconName` has no `plug` or `palette`. Fix: add `plug` and `palette` (and the circled check if the set lacks it) to `packages/ui/src/components/Icon.tsx` through the Lucide wrapper and change only this map. Axis 10.

**F-03. Realtor partners: the page's primary button draws its plus on a line of its own.** Severity: **High**.
- Pictures: `review/partners--empty--{1440,1180,768,390}--{light,dark}`. State: empty list.
- What the pictures show: "Add Realtor partner" renders as two lines, the plus above the words, 58px tall at 1440 where every other control is 44px. It is the page's one primary action and the first thing the eye lands on.
- Required: the mockups draw a glyph button inline ("+ Launch an ad", `design/mockups/campaigns-list.html`, preview `campaigns-list--1440.png`); axis 1 asks that the primary action read as the primary action.
- Source: `packages/ui/src/components/Button.tsx:59` wraps children in a plain inline `<span>`, and `packages/ui/src/components/Icon.module.css:1-4` gives `.icon` `display: block`, so any `<Button><Icon /> label</Button>` breaks after the glyph; the call site is `apps/web/src/features/workspace/preference-editors.tsx:221-229`. Fix in the primitive: give the label span `display: inline-flex; align-items: center; gap: var(--space-2)` (or render the icon outside the span), so every icon button is fixed at once. No gate covers icon and label alignment; the 44px gate passes because the button is taller, not shorter. Axes 1 and 10.

**F-04. Brand: two navy panels.** Severity: **High**.
- Pictures: `review/brand--empty-account--{1440,1180,768,390}--{light,dark}`.
- What the pictures show: "Report preview" and "On every ad" are filled navy slabs (`#122445` in Light) with light text, a white-on-navy button in each.
- Required: `design/00-direction.md` section 2.3 (line 67): "Navy is text and the small mark only ... No navy panels." Axis 4 (colour roles) and axis 10.
- Source: `apps/web/src/features/workspace/workspace.module.css:135-153` (`.feature, .brandPreview { background: var(--product-feature); color: var(--product-on-nav) }`), value from `packages/ui/src/product-tokens.css:20`; used at `preference-editors.tsx:152` and `:478`. Fix: draw both previews as the light look's bordered card (`--sf-card` or `--sf-sunken` with `--bd-hairline`, `--tx-strong` text), and retire the `--product-feature*` and `--product-on-nav` reads from the review Brand page; the band preview inside keeps its own colours (`data-ad-preview`).

**F-05. Brand: two primary buttons on one screen.** Severity: Medium.
- Pictures: `review/brand--empty-account--{1440,1180,768,390}--{light,dark}`.
- What the pictures show: "Save your details" and "Save ad settings" are both filled action-blue buttons on the same page.
- Required: `design/00-direction.md:69`, "One obvious primary button per screen"; rubric axis 1, "One primary action per screen" (`06-review-rubric.md:31`).
- Source: `apps/web/src/features/workspace/preference-editors.tsx:72-74` (`SaveAndReload` renders a default, primary `Button`), shared by both editors. Fix: make one form the page's primary (or merge the two into one save), and draw the other form's save as `secondary`. Axis 1.

**F-06. Brand, "Your brand on ads": the fields touch.** Severity: Medium.
- Pictures: `review/brand--empty-account--{1440,1180,768,390}--{light,dark}`.
- What the pictures show: each field's label sits directly under the previous input (about 6 to 10px: "Brand color" under the title input, "Disclosure line" under the select, "Lead form wording" under the disclosure input), while the "Your details" form above keeps about 28px between fields.
- Required: axis 2, a `--space-*` gap between fields, consistent within the screen.
- Source: `apps/web/src/features/workspace/preference-editors.tsx:429`, `<fieldset className={styles.fields}>` with no gap; the partner dialog on the same file uses `${styles.fields} ${styles.stack}` (`:309`), and the "Your details" fields get theirs from `HomeBrandFields`. Fix: add `styles.stack` (gap `--space-5`) to the fieldset at `:429`. Axis 2.

**F-07. Settings and Brand at 1180: a rail-era breakpoint.** Severity: Medium.
- Pictures: `review/settings--default--{1180,768}--{light,dark}` (third card orphaned in a two-column grid); `review/brand--empty-account--1180--{light,dark}` (each editor and its preview stacked into one 1116px column, so the band preview is drawn at 1116 by 279px with a 40px name).
- Required: 1180 is the in-HighLevel frame and, with the top bar, has the same content column as 1440 (design section 2.1; brief section 14 as superseded by PRD-009 S-57). At 1440 the same pages show three cards and the side-by-side preview. Axis 7.
- Source: `apps/web/src/features/workspace/workspace.module.css:288-295`, `@media (max-width: 1180px)` sets `.cards` to two columns and `.columns` to one; the breakpoint dates from the 17rem rail. Fix: move it to the 1100px breakpoint Home uses (`overview.module.css:54`), and let `.cards` fall to one column only where three no longer fit (or use `repeat(auto-fit, minmax(18rem, 1fr))`), so no card is orphaned at 768. Axis 7.

**F-08. Connections: the groups' rhythm is inverted and the cards are padded at 8px.** Severity: Medium.
- Pictures: `review/settings-connections--empty-account--*` and `chromium/settings-connections--default--*`, all frames, both themes.
- What the pictures show: each group's description sits about 28px under its heading and 28px above its cards, while the next group's heading sits 16px under the previous group's last card, so a heading reads as belonging to the card above it. Inside each capability card the text starts 8px from the border (measured on `review/settings-connections--empty-account--1440--light.png`: border at x=152, text at x=161), where Home's cards use 24px.
- Required: axis 2 (vertical rhythm by `--space-*` tokens, consistent across sibling screens). The rubric's D-009 ruling predicted exactly this: "a paragraph on the browser's 1em margin ... A gap the redraw shows reading wrong is a finding for its screen, fixed with a `--space-*` token in its module" (`06-review-rubric.md:375-381`).
- Source: `apps/web/src/features/onboarding/components/permission-screen.module.css:60-63` (`.permissionGroups p` keeps the browser's 16px margin inside a grid with `gap: var(--space-3)`, `:71-75`), `:65-69` (groups separated by only `--space-4`); `permission-screen.tsx:65` (`<Card padding="sm">`, which is `--space-2` in `packages/ui/src/components/primitives.css:29-31`). Fix: `margin: 0` on `.permissionGroups p`, a group row gap of `--space-8`, and `padding="md"` or `"lg"` on the capability cards. Axis 2.

**F-09. Status pills drawn by hand, with no glyph.** Severity: Low.
- Pictures: `review/settings-connections--empty-account--*`, `chromium/settings-connections--default--*` ("Needed", "Confirmed", "Missing", "Optional"); `chromium/brand--default--*` ("Confirmed", "Not added yet", "Needs human confirmation", "Current", "2 still to add").
- Required: `design/00-direction.md:72`, "Status chips pair a glyph and words with colour"; the `Badge` primitive carries one glyph per tone (as Home's checklist uses it, `home-setup-card.tsx:22-24`). Words are present, so no status is colour alone; the glyph is missing.
- Source: `permission-screen.module.css:89-96` (`.permissionHeading span`), `apps/web/src/features/brand/components/brand-profile.module.css:47-56` (hand-built pills). Fix: render each through `Badge` with its tone. Axis 4.

**F-10. The information notice loses its surface.** Severity: Low.
- Pictures: `review/settings-connections--empty-account--*`, `chromium/settings-connections--default--*` ("Nothing is connected from this page"); `chromium/brand--default--*` ("Suggestions only. You decide what's saved.").
- What the pictures show: a white card (Light `#ffffff`, Dark `#1b1e25`, sampled) with an info-blue title, not an informational surface.
- Required: the module asks for `--st-info-bg` (`permission-screen.module.css:42-48`; the same block in `brand-profile.module.css`), which brief section 9's colour roles pair with `--st-info-fg`; the module's own comment at `:50-51` shows the cascade was already fighting it.
- Source: `.oalo-surface[data-variant="card"]` (`packages/ui/src/components/primitives.css:5-10`, specificity 0,2,0) always beats `.safetyNotice` (0,1,0), whatever the load order. Fix: render the notice as a `Surface` with a status variant, or raise the module selector (`.safetyNotice.safetyNotice` or `[data-variant].safetyNotice`). Axis 4.

**F-11. Eyebrows and card titles off the mockups' treatment.** Severity: Low.
- Pictures: `review/settings--default--*`, `review/brand--empty-account--*`, `review/partners--empty--*` ("NORTHGATE LENDING": uppercase, 0.12em tracking, weight 650); `review/settings-connections--empty-account--*`, `chromium/settings-connections--default--*` ("CONNECTIONS") and `chromium/brand--default--*` ("YOUR BRAND"): uppercase, 0.04em tracking. Settings' card titles ("Account", "Where new leads go in HighLevel") are bold with -0.02em tracking.
- Required: the mockups' eyebrow is sentence case at the secondary step, semibold, no tracking (`design/mockups/home-first-run.html:183`, rendered as Home's "Ads library"), and section titles are semibold with no tracking (`:184`). Axis 3: "the six steps and the weights come from the tokens"; 650 is no token (`--weight-semibold` is 600, 009A-AC-002).
- Source: `apps/web/src/features/workspace/workspace.module.css:55-61` (`font-weight: 650`, `letter-spacing: 0.12em`) and `:27-31` (`.workspace h2 { letter-spacing: -0.02em }`); `permission-screen.module.css:33-40`; `brand-profile.module.css:38-44`. Fix: one eyebrow treatment, the mockup's, and `--weight-semibold` on in-card section titles. Gate note: no unit test refuses a raw `font-weight` or `letter-spacing` literal in a delivered stylesheet; `type-tokens-defined.unit.test.ts` could. Axes 3 and 10.

**F-12. Connections, empty account: the not-connected sentence four times.** Severity: Low.
- Pictures: `review/settings-connections--empty-account--{1440,1180,768,390}--{light,dark}`.
- What the pictures show: "You haven't connected HighLevel yet, so there's nothing to confirm here." under all four group headings, directly below a notice that already says nothing is connected, including under "Access this app needs", where "nothing to confirm" does not fit the heading.
- Required: `design/00-direction.md` section 4.3 (lines 321-323): a page states a connection fact once, where it changes what the person can do; axis 9's honest, non-repetitive not-connected state; axis 1, not a page of identical blocks of equal weight.
- Source: `apps/web/src/copy/user-language.ts:95`, rendered for every group from `permission-screen.tsx:62`. Fix: say it once in the notice and let each group show only its capabilities. Axis 9.

**F-13. Synthetic Brand is the pre-PRD-009 Brand Engine page.** Severity: Medium (local demo only).
- Pictures: `chromium/brand--default--{1440,1180,768,390}--{light,dark}`.
- What the pictures show: "Brand and compliance details", a long stack of near-identical cards ("Canonical profile version brand-v3", "Florida blueprint", "Use this for Voice"), with no title, brand colour, disclosure line or band preview. The review Brand page (F-04 to F-06) is a different page.
- Required: `design/00-direction.md` section 3.1 (line 243) defines Brand as the name, title, NMLS, company, company NMLS, brand colour and disclosure line the band needs, one brand for ads and reports; 009B-AC-014 holds synthetic Home to the review composition and the same reading should hold for the menu's other pages. The cards are padded at `--space-2` (`brand-profile-screen.tsx:59`, `:78`, `padding="sm"`), the F-08 fault again.
- Source: `apps/web/src/app/(authenticated)/brand/page.tsx:26-28` returns `BrandProfileScreen` outside review mode. Fix: render the PRD-009 Brand (`WorkspaceScreen` profile view) in synthetic mode too, fed by the synthetic brand, or record why the demo keeps the old page. Axes 10, 1, 2.

**F-14. Homeowner reports: a critical alert for an expected state.** Severity: Medium.
- Pictures: `review/homeowners--empty-account--{1440,1180,768,390}--{light,dark}`.
- What the pictures show: a red-on-pink "Homeowner reports need to be enabled for this workspace." banner, with no glyph, above the page title, and below it an empty card that says the same thing honestly, with two actions.
- Required: brief section 9 reserves the critical role for failures, and `packages/ui/src/components/LiveRegion.tsx:26-30` reserves `alert` "for a failed submission or a blocked provider result"; a workspace that has not turned reports on is neither. Axis 1: the page title is not the first thing on the page. Axis 9: the error is not what happened, and the honest empty state already covers it.
- Source: `apps/web/src/features/homeowners/workspace.tsx:832` renders `data.error` as a visible `alert`, and `data.error` carries `REPORTS_NOT_CONFIGURED` from `apps/web/src/server/homeowners/runtime.ts:89-94`. Fix: do not surface `REPORTS_NOT_CONFIGURED` as an error when the workspace mode is `unconfigured`; the empty card at `:847-867` is the whole statement. Axes 4, 9, 1.

**F-15. Homeowner reports at 390: the lead drops to the caption step.** Severity: Low.
- Pictures: `review/homeowners--empty-account--390--{light,dark}`.
- What the pictures show: "Your property-value and equity workspace." at 12px, smaller than the 16px body text in the card below it; at 768 and wider it is 16px.
- Required: axis 3, the lead keeps its role's step at every frame; axis 1, a page lead never reads below the content it introduces.
- Source: `apps/web/src/features/dashboard-preview/workspace.module.css:1686-1688` (`.header p { font-size: 12px }` below 768, a raw value on a shared `PageHeader`). Fix: delete the override, or set `var(--text-secondary-size)` if the lead must shrink. Axis 3.

### 3. Summary

All 80 pictures were scored, Light and Dark compared at every frame: 24 Home pictures (first run, the empty library, and the synthetic Home), 8 Settings, 16 Connections, 16 Brand, 8 Realtor partners and 8 Homeowner reports. None scores 3 on every axis. Home is very close to the mockup after the Wave 3 polish (composition, card rhythm, type, chips, steps, footer, both themes, and the lists stacking at 768 and 390 as 009B-AC-003 requires); what keeps it below 3 is one layout fault in the "Get set up" rows that the amended, wider action label exposed (F-01, severe at 390) and the substitute glyphs (F-02). The other five pages carry the new tokens, top bar and Inter, but keep pre-PRD-009 structure that the light look rules out or that the 1180 frame now exposes. Fifteen findings: **3 High** (F-01 Home checklist rows, F-03 the partners primary button, F-04 Brand's navy panels), **6 Medium** (F-05 two primaries on Brand, F-06 Brand ad fields touching, F-07 the rail-era 1180 breakpoint, F-08 Connections rhythm and card padding, F-13 synthetic Brand is the old page, F-14 the Homeowner reports alert), and **6 Low** (F-02, F-09, F-10, F-11, F-12, F-15). No finding is Dark-only, and none is a gate failure; F-11 suggests one gate extension.

## Part R4


Reviewer `r4` (`ux-ui-guardian`). Set: every picture under `tests/visual/screens/chromium/` and
`tests/visual/screens/review/` starting `verify-email--`, `sign-in--`, `reset-password--`,
`sign-up--`, `forgot-password--`, `change-password--`, `choose-workspace--`, `email-preview--`,
`design-surfaces--`: 146 pictures (144 changed, 2 new), redraw run 37059676544, head `de69e09e`.

Read against: `library/knowledge/private/ux-ui/06-review-rubric.md` (whole), design
`00-direction.md` revision 2 sections 2 and 3, the PRD-009 mockups (nearest sibling: no mockup
covers these screens), `00-design-brief.md` sections 9, 10, 14, 18, and
`03-components/form-field-and-text-inputs.md`, `link.md`, `button-and-safe-action.md`,
`badge-and-live-region.md`, `application-shell-and-navigation.md`. Every changed picture was
compared with its `HEAD` version (scratch copies under `review-parts/r4/old/`). Measurements are
pixel rows read from the committed-to-be pictures with PIL; source lines were read in the worktree.

Not re-litigated (rubric section 6 gates, or rulings in the brief): type steps, contrast ratios,
44px targets, overflow, axe. The 28px title at 390 (the mockup drops to 23px under 720px, the type
steps win by ruling). Home's half-width "Running now" for a role that cannot approve (009B D3, in
`overview.module.css:70-76`). The sign-up company field's "(optional)" in its label (PRD-006b D10,
`sign-up-form.tsx:86-87`). The restricted "Settings" item whose reason shows on hover and focus
(`application-shell-and-navigation.md:155-156`). The email bodies inside the frames (their own
documents, scored 3 by PRD-008d and unchanged).

### 1. Scores

Axes: 1 hierarchy, 2 spacing, 3 typography, 4 colour, 5 states, 6 motion, 7 responsiveness,
8 Dark and Light, 9 empty and error, 10 consistency with the PRD-009 mockups. "4 frames x 2
themes" means 1440, 1180, 768, 390 in Light and Dark.

| Picture group (count) | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Sub-PRD | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `review/sign-in--default--*` 4 frames x 2 themes (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009a | Layout unchanged, re-themed: Inter, 16px body, 28px title, visible `#718399` field edges, `#005fcc` button, hairline card. The two footer links now take a row each at the larger step; reads fine. R4-04. |
| `review/sign-in--refused--*` (8) | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 2 | 009a | Layout unchanged, re-themed. Refusal in the critical pair, connected and announced; no glyph. R4-04, R4-08. |
| `review/sign-in--signed-out--*` (8) | 3 | 2 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 2 | 009a | Layout unchanged, re-themed. The notice's extra margin grew from 13 to 16px with 009a's body step. R4-04, R4-05, R4-06, R4-08. |
| `review/sign-up--default--*` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009a, 009f | Layout unchanged, re-themed. Lead now "Then you can set up your first ad." (009F-AC-009, `f172de7e`). R4-04. |
| `review/sign-up--address-already-has-an-account--*` (8) | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 2 | 009a, 009f | Layout unchanged, re-themed; same lead change. R4-04, R4-08. |
| `review/forgot-password--default--*` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009a | Layout unchanged, re-themed. R4-04. |
| `review/forgot-password--confirmation--*` (8) | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 2 | 009a | Layout unchanged, re-themed. R4-04, R4-08. |
| `review/reset-password--default--*` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009a | Layout unchanged, re-themed; "Choose a new password" still fits one line at 390. R4-04. |
| `review/reset-password--link-expired--*` (8) | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 2 | 009a | Layout unchanged, re-themed. R4-04, R4-08. |
| `review/verify-email--default--*` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009a | Layout unchanged, re-themed. R4-04. |
| `review/verify-email--confirmed--*` (8) | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 2 | 009a | Layout unchanged, re-themed. R4-04, R4-08. |
| `review/verify-email--link-expired--*` (8) | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 2 | 009a | Layout unchanged, re-themed. R4-04, R4-08. |
| `review/choose-workspace--default--*` (8) | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009a | Layout unchanged, re-themed; the extra space around the action grew with the body step. R4-04, R4-07. |
| `review/change-password--default--*` (8) | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 009a | The rail, the "Finish setup" chip, and the not-connected banner are gone for the top bar (009A-AC-009, 009A-AC-013); the form keeps its measure at the column start under the wordmark (x=152 at 1440, x=32 at 1180 and 768, x=16 at 390); fields re-themed. Account control carries a focus ring. R4-02. |
| `review/change-password--saved--*` (8) | 3 | 3 | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 009a | As default, plus the saved notice. R4-02, R4-08. |
| `review/reset-password--saved-notice--768--{light,dark}` (2) | 3 | 3 | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 009a, 009b | Was the 9935px CRM overview; now first-run Home under the top bar, stacked as 009B-AC-003 asks. R4-02, R4-08. |
| `review/reset-password--saved-notice--{1440,1180}--{light,dark}` (4) | 3 | 3 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 3 | 009a, 009b | Home at two columns; both "Not connected yet" chips break into two-line pills. R4-01, R4-02, R4-08. |
| `review/reset-password--saved-notice--390--{light,dark}` (2) | 3 | 3 | 3 | 2 | 2 | 3 | 1 | 3 | 3 | 3 | 009a, 009b | Checklist text column about 90px; chip words run past the pill. R4-01, R4-02, R4-08. |
| `chromium/email-preview--default--*` (8) | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a | Page around the frames re-themed; the title no longer sits at y=0 because `--space-7` is now defined (009A-AC-002), so `.page`'s `padding-block` applies. Emails unchanged; frames stay white in Dark (brief section 13). R4-09. |
| `chromium/design-surfaces--default--*--light` 4 frames (4) | 3 | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 2 | 009a | Top bar with the synthetic "Local demo with sample data." line (009a D3); content now at the column start; error and loading boundaries draw no fill on the canvas. R4-08, R4-09, R4-10. |
| `chromium/design-surfaces--default--*--dark` 4 frames (4) | 3 | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 009a | As Light; in Dark the boundaries keep their sunken fill. R4-08, R4-09. |
| `chromium/design-surfaces--home-under-notice--1440--light` (1, new) | 3 | 1 | 3 | 2 | 3 | 3 | 2 | 3 | 3 | 3 | 009g, 009b | New in 009G-AC-001. Notice sits flush on "Welcome, Alex."; chip wrap as above. R4-01, R4-03, R4-08. |
| `chromium/design-surfaces--home-under-notice--390--light` (1, new) | 3 | 1 | 3 | 2 | 3 | 3 | 1 | 3 | 3 | 3 | 009g, 009b | As 1440, with the 390 chip overrun. R4-01, R4-03, R4-08. |

Total: 146.

### 2. Findings

Each in the rubric's section 3 order (screen, frame, theme, state, file and line, current value,
required token or rule, axis), then what I see, the source, and severity.

#### R4-01. Home's checklist chips break, and at 390 overrun their pill (axis 7) - High

- **Pictures:** `review/reset-password--saved-notice--{1440,1180,390}--{light,dark}`,
  `chromium/design-surfaces--home-under-notice--{1440,390}--light` (8). The same Home renders on
  the main Home pictures in another reviewer's set; one fix closes both.
- **What I see:** in "Get set up", the action "See what's needed" takes about 171px in the
  `auto` third column, so the text column is about 167px at 1440, 140px at 1180, 90px at 390. The
  "Not connected yet" chip breaks into a two-line pill at 1440 and 1180 ("Not connected / yet")
  and into three lines at 390, where "connected" runs past the pill's edge; the descriptions run
  one to three words a line at 390 ("New leads / from your ads / go to your / HighLevel /
  account."). 768 is clean.
- **Required:** the mockup's chip is one line (`.badge { white-space: nowrap }`,
  `design/mockups/home-first-run.html:237`) beside a text column that holds its sentence
  (`.checklist li`, `:270`, drawn with the short "Connect"). The 2026-10-02 copy amendment
  (direction section 4.2, MTK-008 W-2/W-3) tripled the action's width and the grid was not
  re-composed. No status may be clipped or cross its container (rubric axis 7; brief section 14).
- **Source:** `apps/web/src/features/overview/components/overview.module.css:319-326`
  (`.checklist > li`, `grid-template-columns: auto minmax(0, 1fr) auto`) and `:354-358`
  (`.card .stateChip`); the chip at `home-setup-card.tsx:124-130`.
- **Fix:** when the card is narrow, give the action its own row under the text (for example grid
  areas "icon text" / "icon action" below a container width), and keep the chip on one line as
  the mockup does. Re-shoot Home and these 8 pictures.
- **Sub-PRD:** 009b (with the MTK-008 copy amendment).

#### R4-02. The in-shell review pictures capture a focus ring on the account control (axis 5) - Medium

- **Pictures:** `review/change-password--{default,saved}--*` (16) and
  `review/reset-password--saved-notice--*` (8), every frame, both themes, state "default" or
  "saved". Expect the same on every review picture that calls the helper below (other sets).
- **What I see:** a 2px `--focus-color` ring at 3px offset around the account pill at the bar's
  end (`#005fcc` at x=1170-1171, y=32 on `change-password--default--1440--light.png`; `#8bb0ff`
  in Dark). No other control is focused; a default picture shows the focus-visible state.
- **Required:** a named state's picture shows that state only (rubric axis 5). The suite's own
  intent is the same: "the ring it leaves on a control cannot appear in a baseline"
  (`tests/browser/review/design-quality.spec.ts:324-325`).
- **Source:** `tests/browser/review/helpers/review-session.ts:89`. `chooseThemeFromTheHeader`
  closes the account dialog with Escape, focus returns to the trigger, and because the last input
  was a key `:focus-visible` matches. Callers at `design-quality.spec.ts:299` and `:366`.
- **Fix:** after the dialog closes, take focus off the trigger (blur the active element) before
  `settleForScreenshot`, and redraw. This is a finding against the capture, not the product: the
  ring itself is correct behaviour after a keyboard close.
- **Sub-PRD:** 009a (the theme choice moved into the account control, 009A-AC-009).

#### R4-03. The unverified-email notice sits flush on the page below it (axis 2) - Medium

- **Pictures:** `chromium/design-surfaces--home-under-notice--{1440,390}--light` (2).
- **What I see:** the notice box ends at y=218 (1440) and y=234 (390); the next line box,
  "Welcome, Alex.", starts on the next pixel: 0px between them. On the same Home the saved-password
  notice stands 24px clear (box ends y=136, greeting glyphs at y=166 on
  `reset-password--saved-notice--1440--light.png`).
- **Required:** `--space-6`, the gap Home's own page puts between a notice and Home
  (`apps/web/src/app/(authenticated)/overview/page.tsx:56-58`, `Stack gap="6"`); brief section 11
  spacing scale, rubric axis 2.
- **Source:** `apps/web/src/app/(authenticated)/layout.tsx:151` renders the notice as a bare
  sibling of `{children}` inside the shell's `main`, which is a grid with no row gap
  (`apps/web/src/app/globals.css:143-148`, `.content` at
  `apps/web/src/features/shell/components/app-shell.module.css:327-339`). The gallery copies that
  shape (`apps/web/src/app/(authenticated)/design-surfaces/page.tsx:59-63`), so the picture is
  what a real unverified account sees on every page.
- **Fix:** give the notice its `--space-6` in the layout (a gap on the stack that holds the
  notice and the page, or a block-end margin on the notice), not per page.
- **Sub-PRD:** 009g (the new state, 009G-AC-001) exposes a placement that predates PRD-009.

#### R4-04. The account card's padding is 16px; the mockups' cards are 24px (axis 10) - Low

- **Pictures:** every public account state: `sign-in--{default,refused,signed-out}`,
  `sign-up--{default,address-already-has-an-account}`, `forgot-password--{default,confirmation}`,
  `reset-password--{default,link-expired}`, `verify-email--{default,confirmed,link-expired}`,
  `choose-workspace--default`, all frames, both themes (104).
- **What I see:** the panel's content starts 16px inside its border (card x=513, content x=529 on
  `sign-in--default--1440--light.png`), under a 28px title and 16px body. Before PRD-009 the same
  16px held 13px text; at the new steps the card reads cramped beside its siblings.
- **Required:** the nearest sibling is the PRD-009 card: `.card { padding: var(--space-6) }`
  (`design/mockups/home-first-run.html:196`), `var(--space-5)` under 720px (`:426`); production
  PRD-009 cards use `padding="lg"` (for example
  `apps/web/src/features/campaigns/components/launch-flow.tsx:317`, `overview.module.css:87`).
- **Source:** `apps/web/src/features/auth/components/auth-panel.tsx:22`, `<Card
  className={styles.panel}>` takes the default `padding="md"`, which is `--space-4`
  (`packages/ui/src/components/primitives.css:33-35`).
- **Fix:** `--space-6` at 720px and wider, `--space-5` below, on the account panel only.
- **Sub-PRD:** 009a (the type steps grew inside an unchanged padding).

#### R4-05. The signed-out notice keeps the browser's paragraph margins (axis 2) - Low

- **Pictures:** `review/sign-in--signed-out--*` (8).
- **What I see:** 40px from the lead's last glyph to the notice box and 39px from the box to the
  "Email" label's glyphs (`sign-in--signed-out--1440--light.png`, rows 208, 248-295, 334). The
  refusal in the same slot on `sign-in--refused` measures 24px and 23px. The difference is the
  16px `1em` block margin above and below a `<p>`.
- **Required:** the form's `gap: var(--space-4)` governs (`auth-form.module.css:40-43`); the
  D-009 ruling says such a gap "is fixed with a `--space-*` token in its module" (rubric
  section 5, D-009, last paragraph).
- **Source:** `apps/web/src/features/auth/components/sign-in-form.tsx:60` renders
  `<p className={styles.notice}>`, and `.notice` (`auth-form.module.css:86-94`) sets no margin.
- **Fix:** render it through `AuthNotice` (see R4-06), or add `margin: 0` to `.notice`.
- **Sub-PRD:** pre-existing structure; the gap grew from 13 to 16px with 009a's body step.

#### R4-06. One information role, two text colours across the account screens (axis 4) - Low

- **Pictures:** `review/sign-in--signed-out--*` (8), against every other account notice.
- **What I see:** "You're signed out." is `--st-info-fg` `#005fcc` on `--st-info-bg`; the
  forgot-password confirmation, the sign-up "already has an account" notice, verify-email
  confirmed, change-password saved, and the saved-password notice on Home are `--tx-body`
  `#526579` on the same background (sampled from the 1440 Light pictures). The old set had the
  same split, so it is not new.
- **Required:** one rendering per role on sibling screens (brief section 9; rubric axis 10). The
  account screens' own contract: `AuthProblem` and `AuthNotice` are "the only two ways" a screen
  says something back (`apps/web/src/features/auth/components/auth-feedback.tsx:9-27`).
- **Source:** the signed-out notice bypasses `AuthNotice` (`sign-in-form.tsx:60`), so its
  `.notice` colour holds; on every `AuthNotice`, `.oalo-live-region { color: var(--tx-body) }`
  (`packages/ui/src/components/primitives.css:248-253`) wins over the same `.notice` colour.
- **Fix:** render the signed-out sentence through `AuthNotice`, and delete the `color` from
  `.notice` that never applies, so the two cannot drift again. (If the info foreground is wanted
  for every notice instead, that is a `badge-and-live-region.md` change, which says a visible
  region is `--tx-body`.)
- **Sub-PRD:** pre-existing; unchanged by PRD-009.

#### R4-07. The choose-workspace action keeps the browser's paragraph margins (axis 2) - Low

- **Pictures:** `review/choose-workspace--default--*` (8).
- **What I see:** 40px from the lead's glyphs to the "Sign in" action (rows 449 to 489 on the
  1440 Light picture) and 31px from the action to the card's border (534 to 565). Sibling cards
  show the panel's 20px gap below the header and 16px of card padding at the bottom
  (`verify-email--default`, rows 426 to 446 and 550 to 566).
- **Required:** the panel's `gap: var(--space-5)` and the card's `--space-4`
  (`auth-form.module.css:14-19`); D-009 ruling as in R4-05.
- **Source:** `apps/web/src/app/(public)/sign-in/choose/page.tsx:29-33`, a bare `<p>` around the
  action `Link`.
- **Fix:** drop the `<p>` (the `Link` can be the panel's child) or give it `margin: 0`.
- **Sub-PRD:** pre-existing structure; the margin grew from 13 to 16px with 009a's body step.

#### R4-08. Account status regions carry colour and words but no glyph (axis 4) - Low, pre-existing

- **Pictures:** `sign-in--{refused,signed-out}`, `sign-up--address-already-has-an-account`,
  `forgot-password--confirmation`, `reset-password--{link-expired,saved-notice}`,
  `verify-email--{confirmed,link-expired}`, `change-password--saved`, `design-surfaces--default`
  (the unverified notice), all frames and themes, and `design-surfaces--home-under-notice` (82).
- **What I see:** every refusal and confirmation is a tinted box with a sentence and no glyph.
  The status is not colour alone, because the sentence says it, which is why this is a 2.
- **Required:** "Every status pairs color with text and a glyph or icon" (brief section 9,
  `00-design-brief.md:157`). The module claims it already does: "each carries its own glyph
  through the live region's own content, never colour alone" (`auth-form.module.css:75-76`), and
  the pictures show none.
- **Source:** `apps/web/src/features/auth/components/auth-feedback.tsx:21-27` (`AuthProblem`,
  `AuthNotice` pass only the message) and `sign-in-form.tsx:60`.
- **Fix:** put the critical glyph in `AuthProblem` and the information glyph in `AuthNotice`
  (decorative `Icon`, as `Badge` does), or, if the owner accepts sentence-only regions, record it
  in rubric section 5 and correct the comment. Not caused by PRD-009; raised because the rubric
  scores what the picture shows.
- **Sub-PRD:** none (pre-PRD-009).

#### R4-09. Card-step titles render at 700 where the light look sets 600 (axis 3) - Low

- **Pictures:** `chromium/email-preview--default--*` (8) and `chromium/design-surfaces--default--*`
  (8).
- **What I see:** "Reset your Automated LO password", "Confirm your email for Automated LO", "We
  couldn't load your workspace", and "Loading your workspace" are 16px at bold. Side by side with
  Home's "Connect HighLevel" (16px semibold) the strokes are visibly heavier.
- **Required:** "card title 16px semibold" (direction section 2.3); mockup `.card-title` and
  `.section-title` at `--weight-semibold` (`home-first-run.html:184-185`); `--weight-semibold`
  now exists (009A-AC-002).
- **Source:** `apps/web/src/app/(public)/email-preview/email-preview.module.css:43-47` (`.meta h2`
  sets size, no weight, so the browser's bold applies) and
  `packages/ui/src/components/primitives.css:120-128` (`.oalo-async-state__title`, shared with
  `.oalo-metric__label` and the checklist headings, at `--weight-bold`). The stale comment at
  `auth-form.module.css:132-134` ("`--weight-semibold` is not a token here") points at the same
  gap for the workspace legend.
- **Fix:** `font-weight: var(--weight-semibold)` on those card-step titles.
- **Sub-PRD:** 009a (the steps were applied; the card weight was not).

#### R4-10. In Light the route boundaries lose their fill on the canvas (axis 10) - Low

- **Pictures:** `chromium/design-surfaces--default--{1440,1180,768,390}--light` (4).
- **What I see:** the error and loading boundaries sit directly on the page in `--sf-sunken`
  `#f5f8fc`, the same value as `--sf-canvas` (sampled at (600,350) and (5,500): both
  `rgb(245,248,252)`), so in Light each is an outline only, carried by a 1.31:1 hairline. In Dark
  they read as filled panels (`#22262f` on `#14161b`), so the two themes compose differently.
- **Required:** a standalone surface on the page is a white bordered card (direction section 2.3,
  "Cards: white, 1px `#d6e2ee` border"; mockup `.card`, `home-first-run.html:196`). Sunken is a
  well inside a card (brief section 8); direction 2.4 sets sunken equal to canvas, which only
  works there.
- **Source:** `packages/ui/src/components/primitives.css:313-322` (`.oalo-async-state`,
  `background: var(--sf-sunken)`), used standalone by
  `apps/web/src/features/shell/components/route-boundary.tsx:29` and `:47`.
- **Fix:** when a route boundary stands on the canvas, draw it on `--sf-card` (wrap in `Card`, or
  a route-level class), and leave the primitive's sunken fill for states inside a card.
- **Sub-PRD:** 009a (the token table made sunken equal canvas).

### 3. Summary

146 pictures scored (144 changed, 2 new), in 23 lines. None is at 3 on every axis: R4-04 alone
holds 40 otherwise clean account pictures (sign-in, sign-up, forgot and reset default, verify
default, all frames and themes) at 2 on axis 10, and a one-line padding change clears them. Every
change from the previous pictures is attributable: the account screens are unchanged in layout and
only re-themed by 009a (Inter, the 28/16/14/12 steps, visible field edges, the action blue,
bordered cards), plus 009f's sign-up lead; change-password and design-surfaces moved under 009a's
top bar (with D3's sample-data line in the synthetic run); the saved-password picture now lands on
009b's Home; the email preview gained its top padding when 009A-AC-002 defined `--space-7`; the
two home-under-notice pictures are new in 009G-AC-001. Ten findings: 1 High (R4-01, Home's chips
breaking and, at 390, running out of their pill), 2 Medium (R4-02, a focus ring captured in 24
review baselines by the theme helper; R4-03, the unverified notice flush on the page), 7 Low
(R4-04 card padding, R4-05 and R4-07 browser paragraph margins, R4-06 two notice colours, R4-08
no glyph on account status regions, pre-existing, R4-09 card titles at 700, R4-10 Light route
boundaries without a fill). R4-01 and R4-02 reach beyond this set (Home and every review picture
taken through `chooseThemeFromTheHeader`); R4-02 should be fixed before the baselines are
committed, because it is in the pictures themselves.

## Appendix: the shared brief

### Scored baseline review, PRD-009 (009G-AC-006): shared brief for every reviewer

You are one of four parallel reviewers in the PRD-009 Gauntlet run ("Marketing toolkit") on
jzferrell26/operation-automated-lo. Together you score every changed and new screen baseline
produced by the single redraw (screen-baselines run 37059676544, head `de69e09e`), before the
orchestrator commits them.

#### Where
- Run worktree: `C:\Users\jzfer\Projects\oalo-prd-009` (branch `claude/prd-009-marketing-toolkit`).
  The new pictures are installed in the working tree, uncommitted, under
  `tests/visual/screens/chromium/` and `tests/visual/screens/review/`.
  `git status --short tests/visual/screens` shows `M` (changed) and `??` (new).
- The previous version of a changed picture: `git show HEAD:<path> > <scratch file>`. Write scratch
  files only under your own folder `.../scratchpad/review-parts/<your-id>/`, never in the repository.
- Shell: `bash -lc 'cd /c/Users/jzfer/Projects/oalo-prd-009 && ...'`. Read PNGs with the Read tool.

#### Do not
- Edit, add, delete or commit anything in the repository (no code, no pictures, no ledger).
- Run browser or database suites. Another reviewer may be reading the same tree.
- Use em dashes or en dashes in your report.

#### Standards (read first)
- `library/knowledge/private/ux-ui/06-review-rubric.md` in full: the 0 to 3 scale, the ten axes, the only
  accepted finding form, and section 6 (what the automated gates already prove: do not re-litigate
  those with a guess; flag only what a picture shows).
- `library/requirements/in-work/prd-009-marketing-toolkit/design/00-direction.md` (revision 2) and the
  mockups `design/mockups/*.html` with their previews `design/mockups/previews/*.png`. Axis 10 reads
  against the PRD-009 mockups, as amended.
- The sub-PRDs for attribution: 009a (look and top menu), 009b (Home), 009c (ads library), 009d
  (Launch an ad), 009e (campaign page and list), 009f (removals). Known rulings you must respect:
  the ad preview (`data-ad-preview`) is a picture of the ad, so its scaled and feed type is exempt
  from the six type steps; "With Meta" is the kept label for a live state no screen reaches; Home's
  two lists stack at 768 and 390 (009B-AC-003 wins over the mockup); the 28px Home title and 16px
  primary button follow the type steps on purpose; the library tab has only the "Campaigns" title and
  the tab strip; the sample ads show generated "SAMPLE" art, not the mockup's drawings; the shell's
  "Local demo with sample data." strip appears only in the synthetic project.

#### For every picture in your set
Score axes 1 to 10 (0 to 3). Light and Dark of the same frame may share a line when identical in
score. Attribute any change from the previous picture to its sub-PRD. A picture below 3 on any axis
is a finding in the rubric's finding form: picture, axis, what you see, what the brief or mockup
requires (cite file and section or mockup), the likely source file and selector, and severity.

#### Output
Write your part to `.../scratchpad/review-parts/<your-id>.md`:
1. A table: picture (or picture group), axes 1 to 10 scores, sub-PRD, one-line note.
2. Findings (every score below 3), in the finding form.
3. A one-paragraph summary: pictures scored, how many at 3 on every axis, findings by severity.
Final message: under 250 words with the counts and each finding in one line.

# Pass 2 (2026-10-03)

The same four reviewers' sets, re-scored on the second redraw (screen-baselines run 37136898883, head `0d539dee`) after fix lanes A to D and the integration lane. Pass 1: 58 findings; pass 2 confirms them RESOLVED except R1-13 and R2 F-8 (partly) and F-14 (closed by the dated rubric ruling, axes 1 to 9 still scored). 194 of 468 pictures score 3 on every axis (R1 8 of 104, R2 42 of 138, R3 8 of 80, R4 136 of 146). Remaining: 1 Medium (R3 P2-06) and about 25 Low, most visible in pass 1 and missed there. Orchestrator rulings: chips are 12px everywhere (the component spec over the mockups' 14px); buttons keep the shared weight 500 everywhere, Home included (the brief over the mockups' 600); `copy`, `pencil` and `rocket` glyphs added from the mockups (`a2449ae9`). The pass 2 brief is reproduced at the end of this section.


## Pass 2, part R1


Reviewer `r1` (`ux-ui-guardian`), PRD-009 scored baseline review, pass 2 (009G-AC-006, 009G-AC-011).
Read-only review of the second redraw installed in `C:\Users\jzfer\Projects\oalo-prd-009`
(screen-baselines run 37136898883, head `0d539dee`; the worktree head `d3cda61e` adds only lane F's word
checks and the ledger). Nothing in the repository was edited.

**Set.** The same 104 pictures as pass 1, all under `tests/visual/screens/review/`: every name starting
`ads-library--` (24) or `launch-an-ad--` (80). Each was compared with its pass 1 picture in
`.../scratchpad/baselines/review/`.

**Standards read.** Both briefs; `06-review-rubric.md` in full, including the 2026-10-03 amendment
(R2 F-14, not in my set); `badge-and-live-region.md` with the 2026-10-03 ruling (the spec's 12px chip
wins over the mockups' 14px `.badge`); `link.md` (the new `sentence` variant); design `00-direction.md`
sections 2.3, 2.6, 5 and 6; the four mockups and their previews; the fixes in
`git log a7331de3..0d539dee` (lanes A to D, C's merge `891cea61`, the integration lane `be1cecf7` to
`33111018`). Standing rulings respected as in pass 1.

**Method.** Every picture opened (tall frames in crops), pass 1 and pass 2 side by side where a finding
was in play. Light and Dark compared at every frame by an edge map: all 52 pairs are the same size,
and every Dark-only edge sits inside the white ad on a dark card or on the stepper's status chips; the
only Light-only edges are the current-menu tint and the topic pill's fill, both present in Dark at a
lower contrast. The ad frame was diffed pixel by pixel across themes. Sizes were read from glyph cap
heights (a 16px Inter capital is 12 rows, 14px is 11, 12px is 9) and colours from sampled pixels. Every
date mask was located and checked for a date split across two lines.

### 1. Pass 1 findings, status

| Finding | Status | Evidence in pass 2 |
|---|---|---|
| R1-01 page top padding | RESOLVED | `ads-library--all--1440--light.png`: "Campaigns" capital moves from y 96 to y 104, so the line box starts 32px under the bar's hairline at y 64; at 390 it starts 24px under (y 88 to y 96). Same on every in-shell picture. |
| R1-02 titles at the browser's bold | RESOLVED | Card titles ("Sample: First home, start here"), "Ads library", "Your brand on the ad", "What you approve" all draw at 600 (stroke widths visibly lighter than pass 1 in 4x crops). |
| R1-03 version line step and wrapped date | RESOLVED | `ads-library--all--1440--light.png`: "Version 2. Reviewed" at 12px (9-row capital) in the faint ink, one line in all eight cards at 1440 and 1180; the date mask covers its own line box only. |
| R1-04 ad card and chips | RESOLVED | Tag glyph on every topic; grid gap 24px at 1440 (card edges x 417 and 442); body inset 20px (text at x 173, edge x 152); chip words 14px (11-row capital); chosen chip keeps the strong ink on `--st-info-bg` (234,244,255) with semibold weight. The topic pill fix introduced P2-01 below. |
| R1-05 step indicator placement | RESOLVED | `launch-an-ad--step-1-all--1440--light.png`: crumbs, title, indicator, lead and chips are each 24px apart (line boxes 97 to 141, 165 to 200, 224, 392, 463); steps 2 and 3 keep the lead under the title, then the indicator. |
| R1-06 empty library | RESOLVED | `ads-library--real-catalog--*` and `launch-an-ad--step-1-real-catalog--*`: the shared empty state ("Empty" chip, "Nothing to choose from yet", 009C-AC-012's sentence) on the card surface; step 1 draws no lead. |
| R1-07 "Use the library words" | RESOLVED | `step-2-first-campaign--*`: link colour, 14px semibold, underlined, as `.reset-link`. |
| R1-08 links drawn as buttons | RESOLVED | "Add in Brand" (step 2) and "Change" (step 3) are 14px semibold text links. |
| R1-09 field labels | RESOLVED | "Headline", "Ad text", "Daily budget": 14px (11-row capital), semibold. |
| R1-10 step 2 side title, locked line, Back | RESOLVED | "Your ad so far" at 16px; the locked disclosure line at 14px; Back carries the left chevron. |
| R1-11 step 2 preview uncapped at 768 | RESOLVED | `step-2-first-campaign--768--*`: the preview sits in the 30rem feed frame, as step 3. |
| R1-12 "Ready for approval" banner | RESOLVED | `step-3-ready-for-approval--*`: the approve card stands alone, as the mockup's ready state; every other state's chip sits inside its card at its own width. |
| R1-13 decision cards' rhythm | PARTLY | Children are 16px apart in every step 3 card, and the cannot-approve card is chip, sentence, then the primary "Copy the link". Remaining: the approve card still has 16px of dead space at its foot (R1-13r below). |
| R1-14 disabled button reads as enabled | RESOLVED | "Launch on Facebook" (every step 3 state) and "Approve this version" (`-needs-changes`): `--st-neutral-bg` fill, sampled 238,242,247 in Light and 36,40,51 in Dark, on the hairline edge. |
| R1-15 Meta sentence link stretches its line | RESOLVED | `step-3-ready-for-approval--1440--light.png`: the two lines of the Meta sentence are 21px apart (capitals at y 1450 and 1471). |
| R1-16 step 3 side cards and support disclosure | RESOLVED | Every side card is inset 24px (text at x 877, edge x 853); "Details for support" is in a card. |
| R1-17 ad lines follow the theme | RESOLVED | The feed frame on `step-2-first-campaign--1440` differs between Light and Dark in 3 pixels; on step 3 only the frame's corner antialiasing differs. |
| R1-18 masks hide words around a wrapped date | RESOLVED | Masks are drawn on line boxes: the words around a wrapped date stay visible (the retired sentence and the Dates fact, P2-04). |
| R2 F-6 (ad picture takes the theme) | RESOLVED | Same evidence as R1-17. |
| R2 F-7 (gaps in the company line) | RESOLVED | `step-3-ready-for-approval--1440--light.png`: "NORTHGATE LENDING" draws with even spacing (3x crop at y 1250 to 1295). |

Not mine, seen in passing: R2 F-13 (Help 2px high) is resolved in my pictures ("Help", "Home" and "Dana"
capitals all span y 27 to 37 at 1440).

### 2. Scores

Axes: 1 hierarchy, 2 spacing, 3 typography, 4 colour and contrast, 5 states, 6 motion,
7 responsiveness, 8 Dark and Light, 9 empty and error, 10 consistency with the PRD-009 mockups.
Light and Dark share every line: they score the same at every frame.

| Picture group (count) | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Sub-PRD | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `ads-library--all`, `--one-topic`, all frames (16) | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009c, 009d card | P2-01 only. Chips wrap to two rows at 768, as the mockup's own rule does above 720px |
| `ads-library--real-catalog`, all frames (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009c, 009a | At 3 on every axis |
| `launch-an-ad--step-1-all`, `--step-1-filtered`, all frames (16) | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009d | P2-01, P2-02 |
| `launch-an-ad--step-1-real-catalog`, all frames (8) | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009d | P2-02 |
| `launch-an-ad--step-2-first-campaign` 1440, 1180, 768 (6) | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009d | P2-02, P2-05, P2-06a |
| `launch-an-ad--step-2-first-campaign` 390 (2) | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009d | As above, plus P2-06b, P2-07 |
| `launch-an-ad--step-3-ready-for-approval`, `--needs-changes` 1440, 1180, 768 (12) | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009d, 009e approve card | R1-13r, P2-02, P2-05, P2-08, P2-09 |
| same two states 390 (4) | 3 | 2 | 2 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 009d, 009e | As above, plus P2-03, P2-04, P2-06b |
| `launch-an-ad--step-3-cannot-approve`, `--approved`, `--sent-back` 1440, 1180, 768 (18) | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009d, 009e hand-off | P2-02, P2-05, P2-08, P2-09 |
| same three states 390 (6) | 3 | 2 | 2 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 009d, 009e | As above, plus P2-03, P2-04, P2-06b |
| `launch-an-ad--step-3-ad-retired` 1440, 1180 (4) | 3 | 3 | 2 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 009d | P2-02, P2-04 (the retired date breaks), P2-05, P2-08, P2-09 |
| `launch-an-ad--step-3-ad-retired` 768 (2) | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009d | P2-02, P2-05, P2-08, P2-09 |
| `launch-an-ad--step-3-ad-retired` 390 (2) | 3 | 2 | 2 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 009d | As 1440, plus P2-03, P2-06b |

Total 104 (16 + 8 + 16 + 8 + 6 + 2 + 12 + 4 + 18 + 6 + 4 + 2 + 2).

What holds at 3 across the set, so nobody re-checks it: axis 1 everywhere (one primary per screen, no
primary on the choosing screens, titles at their steps and weights); axis 4 (no raw colour outside the
ad picture, every chip pairs glyph and words); axis 6 (not observable in a still; the reduced-motion
gate covers it); axis 8 (the ad and its frame are now identical in both themes; no element works in
only one theme); axis 9 (the empty library and empty step 1 are the shared empty state).

### 3. Remaining and new findings

Rubric section 3 form: screen, frame, theme, state, file and line, current value, the token or rule it
must be, axis. Then what the picture shows, the reference, severity, and owner. Source lines are at
`0d539dee`. "Present in pass 1" marks a delta pass 1 should have caught; "introduced" marks one a fix
created.

**R1-13r. The approve card keeps 16px of dead space at its foot (009d, shared with 009e).**
Step 3, every frame, both themes, `ready-for-approval` and `needs-changes`.
`apps/web/src/features/campaigns/components/launch.module.css:518-530` makes the card a grid with
`gap: var(--space-4)` and gives the empty live region (`campaign-approval-controls.tsx:218`)
`margin-block-start: calc(var(--space-4) * -1)`. In a grid a negative margin cannot shrink a track
below zero, so the row gap before the empty region stays. Measured on
`step-3-ready-for-approval--1440--light.png`: 40px from the bottom of "Send back for changes" (y 1266)
to the card's inner edge (y 1306), against 24px in the Launch card under it; 40px again under the last
line in `-needs-changes`, and at 390. It must be the card's 24px (`--space-6`), as
`launch-step-3-review-and-launch.html:196`, `.card { padding: var(--space-6) }`. Fix: keep the live
region in the page but out of the grid's flow while it is empty (for example absolutely positioned and
visually hidden when `:empty`), or space the card's children with `> * + *` margins, under which an
empty block takes no room. The same rule is in `campaign-page.module.css:445-457`, so R2's campaign page
pictures carry it too. Axis 2. **Low** (pass 1 Medium; the internal rhythm is fixed).

**P2-01. The topic pill is drawn at 14px with a raw inset, against the badge ruling (009d card,
introduced by R1-04's fix).** Ads library `all` and `one-topic`, step 1 `all` and `filtered`, every
frame, both themes. `ad-library-cards.module.css:112-119` (`.cardBody .topic`) sets
`font-size: var(--text-secondary-size)` and `padding-block: 0.125rem` over the shared `Badge`
(`ad-library-cards.tsx:115`). Measured on `ads-library--all--1440--light.png`: the pill's capital is 11
rows (14px) beside the 9-row (12px) version line. `badge-and-live-region.md`, "Shape and type": the pill
is `--text-caption-size` with `padding-block: var(--space-1)`, and the 2026-10-03 ruling says the
mockups' 14px `.badge` (which `.badge--topic` extends, `ads-library.html:237`, `:469`) is superseded.
`0.125rem` is not a `--space-*` token. Its `color: var(--tx-strong)` also never applies (the pill
samples 82,101,121, the neutral tone's ink), so the rule says one thing and draws another. Fix: drop
the size, padding and colour from `.cardBody .topic`, keeping `align-self` and `white-space`; if a topic
tag is meant to differ from a status pill, record that in the badge spec first. Axes 3 and 2. **Low.**
Gate note: `expectTypographyOnBrief` checks that a size is a step, not the right step for the role.

**P2-02. The launch crumbs: the link is 16px beside a 14px current crumb, and the current crumb is
neither marked nor strong (009d; present in pass 1, the twin of R2 F-4).** Every `launch-an-ad--*`
picture (80), every frame, both themes. `launch-flow.tsx:496` renders
`<Link href="/marketing/campaigns">` in the default variant (`link.module.css`, `.link` at
`--text-body-size`) inside `.crumbs` (`launch.module.css:40-47`, the secondary step), and `:498` renders
the current crumb as a bare `<span>`. Measured on `step-1-all--1440--light.png`: "Campaigns" is 85px
wide with a 12-row capital (16px), "Launch an ad" an 11-row capital (14px) in `--tx-body`. The mockups'
crumbs are all at `--text-secondary-size`, with `[aria-current="page"]` in `--tx-strong` at
`--weight-medium` (`launch-step-1-choose.html:189-191`, the same in steps 2 and 3). The campaign page's
crumb was moved to `variant="sentence"` by `e7635332`; the launch header was not. Fix: the same
`variant="sentence"`, `aria-current="page"` on the current crumb, and the mockup's current-crumb rule.
Axes 3 and 10. **Low.**

**P2-03. Step 3's facts keep two columns on a phone (009d; present in pass 1).** Step 3, 390, both
themes, all six states. `launch.module.css:485-490` (`.facts`, `minmax(6rem, auto) minmax(0, 1fr)`) has
no phone rule, so each value gets about 145px: "Sample: Get pre-approved before you shop, library
version 1" takes three lines and the Dates fact breaks its date (P2-04). The mockup stacks the label
over the value below 720px (`launch-step-3-review-and-launch.html:439`, `.facts div` to one column, as
`previews/launch-step-3-review-and-launch--390.png` shows). Axes 7 and 10. **Low.**

**P2-04. A date breaks across two lines on step 3 (009d; the retired case introduced by R1-16's wider
inset).** `step-3-ad-retired` at 1440 and 1180, both themes: the retired sentence's date splits at the
line end (masks at x 1157 to 1214 on one line and x 877 to 919 on the next at 1440; in pass 1, with the
16px inset, it fitted). Every `step-3-*` at 390, both themes: "From launch until" then the date split
over two lines (masks at x 291 to 346 and x 166 to 228). `text-with-days.tsx:27-29` draws every date as
a `time` with no `white-space: nowrap`; only the ad card scopes one (`ad-library-cards.module.css:147`),
and the campaigns list scopes its own. A date is one unit and must not break (R1-03's rule): put
`white-space: nowrap` on the shared `time` once (in `TextWithDays` or as a floor in `globals.css`, which
already styles `time`), and stack the facts (P2-03). Axes 3 and 7. **Low.**

**P2-05. Captions are drawn at the secondary step (009d; present in pass 1).** Step 2, every frame:
"Updates as you type" (`launch-flow.tsx:459`, `.note`). Step 3, every frame and state: "Shown as it
might look in a Facebook feed..." and "Your approval covers both shapes."
(`launch-review.tsx:204-205`, `.caption`). Both classes are `--text-secondary-size` in `--tx-body`
(`launch.module.css:107-119`); measured 11-row capitals (14px) against the 9-row 12px caption. The
mockups draw all three as `.caption`: `--text-caption-size` in `--tx-faint`
(`launch-step-2-set-up.html:188` and `:568`; `launch-step-3-review-and-launch.html:188` and `:549`).
This is the rubric's own example of a 2. Axis 3. **Low.**

**P2-06. Card insets drift from the mockups' card rule (009d; present in pass 1).** (a) Step 2, every
frame, both themes: "Your ad so far" is a hand-built card, `launch.module.css:344-353` (`.preview`: its
own border, radius and `padding: var(--space-5)`, children `gap: var(--space-3)`, no
`--shadow-card`), not `Card`. Measured on `step-2-first-campaign--1440--light.png`: 20px from the card
edge (x 852) to the feed frame (x 873), against 24px in the form card beside it. The mockup's preview
is a `.card` (`launch-step-2-set-up.html:568`, `:196`, `:198`): 24px, children 16px apart, the card
shadow. (b) Every `Card padding="lg"` on steps 2 and 3 at 390 is 24px (text at x 41, edge x 16); the
mockups drop `.card` to `--space-5` below 720px (`launch-step-3-review-and-launch.html:426`,
`.form-card` likewise). The `lg` step has no phone value (`packages/ui/src/components/primitives.css:52-54`),
so (b) is a primitive rule and reaches every 390 picture with a large card; record the phone inset in
the surfaces spec before changing the primitive, and confirm with R2 and R3, whose pages share it.
Axes 2 and 10. **Low.**

**P2-07. Step 2's actions on a phone (009d; present in pass 1).** Step 2, 390, both themes. The save
note stays end-aligned under the stacked buttons (`launch.module.css:121-123`, `.saveNote { text-align:
end }`, with no phone rule), so "We save this version and run the checks. Nothing is published." reads
ragged-left; and "+ Add" keeps its own width under the field (`launch.module.css:312-316`). The mockup's
phone rules start-align the note (`launch-step-2-set-up.html:434`) and stack the place field and its
button full width (`:514-515`, as the 390 preview shows). Axis 10. **Low.**

**P2-08. Step 3's card sentences are at the body step, and "Copy the link" has no glyph (009d, the
approve card and hand-off shared with 009e; present in pass 1).** Step 3, every frame, both themes.
"Approving applies to this exact version..." (`campaign-approval-controls.tsx:171`, an unstyled `<p>`),
the approved, sent-back, retired and cannot-approve sentences (`launch-review.tsx:329`, `:349`, `:362`;
`campaign-hand-off.tsx:42`) and the "What to fix" items draw at 16px (12-row capitals at y 1036 in all
four decision cards at 1440) in `--tx-strong`. The mockup sets every one as `.small`, the secondary
step (`launch-step-3-review-and-launch.html:187`, `:559`, `:570-574`), the approve line also `.muted`
(`--tx-body`). Separately, the mockup's "Copy the link" carries a copy glyph (`:573`); the icon set has
none, as `campaign-hand-off.tsx:22-23` records, so the glyph needs the `Icon` owner. Axes 3 and 10.
**Low.**

**P2-09. The shape switch: words at the body step, and the chosen shape unmarked but for its dot
(009d; present in pass 1).** Step 3, every frame, both themes. `launch.module.css:387-395`
(`.shapeOption`) sets no size or weight and no chosen state; measured 12-row capital on "Tall (4:5)"
(16px), and the chosen segment samples white like the other. The mockup's `.format-switch label` is
`--text-secondary-size` at `--weight-medium`, and the chosen label takes `--st-info-bg` and semibold
(`launch-step-3-review-and-launch.html:356-359`). Fix: the two rules, with `:has(input:checked)` on the
label. Axes 3 and 10. **Low.**

**Observations, not scored.** (1) The brand band's tiny "Equal Housing Opportunity." line inside the
library cards renders tightly set ("EqualHousingOpportunity.") at 1440 and 1180; it is inside the exempt
ad picture and unchanged from pass 1. (2) The step 3 needs-changes reason "This version needs changes
before anyone can approve it." leaves "it." alone on its line at 1440; a copy or measure matter, not a
token delta.

### 4. Summary

I scored all 104 pictures (52 Light and Dark pairs, every one redrawn since pass 1). Of the 20 pass 1
findings in my part (R1-01 to R1-18, R2 F-6 and F-7), **19 are resolved** and **1 is partly resolved**
(R1-13: the cards' internal rhythm is fixed, 16px of dead space remains at the approve card's foot).
**8 pictures score 3 on every axis**: the eight `ads-library--real-catalog` pictures. The other 96 each
carry at least one Low delta; no picture scores below 2 on any axis, and axes 1, 4, 5, 6, 8 and 9 are at
3 on all 104. Remaining findings: **10, all Low** (0 High, 0 Medium): R1-13r, and nine new ones. Of the
new, P2-01 (the topic pill) and the retired-date half of P2-04 were introduced by pass 1 fixes; the
other seven were present in pass 1 and missed there, P2-02 being the launch-header twin of R2 F-4.
Attribution: all 009d, with R1-13r and P2-08 shared with 009e's campaign page, and P2-06(b) a Card
primitive rule (009a) that reaches other reviewers' 390 pictures.

## Pass 2, part R2


Reviewer: r2 (`ux-ui-guardian`). Second redraw: screen-baselines run 37136898883, head `0d539dee`, pictures installed uncommitted in `C:\Users\jzfer\Projects\oalo-prd-009` under `tests/visual/screens/chromium/` and `review/`. Pass 1 pictures read from `.../scratchpad/baselines/` (same names).
Set: every picture named `campaign-page--`, `campaign-detail--`, `campaigns--`, `gone--` or `shell--`: 138 pictures, every one opened. All 138 differ from pass 1 (byte compare).

Read first: the pass 2 and pass 1 briefs; `library/knowledge/private/ux-ui/06-review-rubric.md` in full, including section 5 "Amended 2026-10-03 by the PRD-009 scored review (R2 F-14)"; the pass 1 report (all four parts); `git log a7331de3..0d539dee` (commits `979d937d`, `47ec2583`, `61317ab3`, `f5020800`, `27abf0f4`, `7d0e97bb`, `be29b8a6`, `46adbf8b`, `c21f25e5`, `eb41a153`, `c662f723`, `ec159b25`, `f9c782fd`); `EXECUTION_LEDGER.md` raid log rows of 2026-10-03 (R2 F-14 ruling, the 12px chip ruling); the mockups `campaign-detail.html`, `campaigns-list.html`, `launch-step-3-review-and-launch.html` and their previews; `03-components/async-empty-error-permission-state.md`, `badge-and-live-region.md`, `button-and-safe-action.md`, `theme-segmented-control.md`.

Method. Measurements are picture pixels from crops, ink-row scans and pixel samples (PIL, scratch files only under `review-parts/r2/p2/`). Every Light and Dark pair was compared by edge map: all 69 pairs are structurally identical apart from the demo campaign's artwork well, which takes the theme while the artwork itself does not (as intended). Gate-proven facts (rubric section 6) are not re-scored. `review/campaign-detail--approved--*` and `--already-decided--*` differ only inside the account pill (at most 101 pixels), so they share every score. Nothing in the repository was edited.

### 1. Pass 1 findings, status

| ID | Pass 1 (axis, severity) | Status | Evidence in pass 2 |
|---|---|---|---|
| F-1 | Header actions float mid-column at 1180 and 768 (7, Medium) | RESOLVED | `review/campaign-page--approved--1180--light.png`: one header row, actions end at the column's end (x 736 to 1148), sentence right-aligned under them. `--768--light.png`: actions at the column's start (x 32), sentence and link under them. A contact sheet of all eight library-ad states at 1180, 768 and 390 shows the same in each. Fix `979d937d`. |
| F-2 | Three card paddings on one page (2, Low) | RESOLVED | Every card is inset 24px at 1440, 1180 and 768: `review/campaign-page--approved--1440--light.png` Results text x 177 on a card at 153, Approval and Details for support x 929 on 905; stacked at 768 every title at x 57 on 33. (390 is a separate delta against the mockup's phone rule: N-1.) |
| F-3 | Notice glyph alone on a line (2, Medium) | RESOLVED | `review/campaign-page--library-notice--1440--light.png` and `review/campaign-page--ad-retired--1440--light.png`: the info glyph sits on the sentence's first line, in both themes and at 390. |
| F-4 | 16px links inside 14px text (3, Low) | RESOLVED | `review/campaign-page--approved--1440--light.png`: crumb "Campaigns" 85px to 73px wide (14px); "See what's needed for Meta" 217px to 194px, on its own line under the sentence (y 243 to 258). `link.md` gained the in-sentence case (`7d0e97bb`). |
| F-5 | Disabled primary drawn as a secondary (5, Medium) | RESOLVED | `review/campaign-page--approved--1440--{light,dark}.png`: "Launch on Facebook" is the neutral fill (sampled 238,242,247 Light; 36,40,51 Dark) on the hairline, distinct from the white "Make a new version" with its `#718399` edge; the same for "Approve this version" on `chromium/campaign-detail--permission-restricted--1440--light.png`. |
| F-6 | Ad lines take the dashboard theme (8, Low) | RESOLVED | Inside the ad frame of `review/campaign-page--approved--1440--{light,dark}.png` 4 of about 410,000 pixels differ, all rounded-corner anti-aliasing against the themed card; the footer rule (y 1398) and the "Learn more" edge are identical. Same result on all 36 Dark ad pictures. |
| F-7 | Gaps inside words in the ad's company line (3, Low) | RESOLVED | "NORTHGATE LENDING" and "REVIEW LOCATION (NOT CONNECTED)" without gaps (`review/campaign-page--approved--1440--light.png`, y 1432; `review/campaign-detail--ready--1440--light.png`). |
| F-8 | Table chips break at 768 (7, Medium) | PARTLY | The chips now keep one line (`review/campaigns--all-states--768--light.png`, "Sent back for changes" at x 484 to 653). "Pre-approval" still splits at its hyphen in Topic ("Pre- / approval") and in the Ad column ("pre- / approved"), on the same picture and `chromium/campaigns--populated--768--*`. Carried below as Low. |
| F-9 | Topic wraps at 1440 and 1180 (10, Low) | RESOLVED | `review/campaigns--all-states--1440--light.png` and `--1180--light.png`: every Topic on one line. |
| F-10 | Empty thumbnail tile (9, Low) | RESOLVED | "Tour this home this weekend" carries a `file-text` glyph tile in `--tx-faint` (`review/campaigns--all-states--1440--light.png`, y 557 to 617). |
| F-11 | Phone cards lose the thumbnail (10, Low) | RESOLVED | `review/campaigns--all-states--390--light.png`: thumbnail beside each name, card inset 20px (thumbnail edge x 37 on a card at 17), as `campaigns-list--390.png`. |
| F-12 | Page title tracking; raw values on the gone page (3, Low) | RESOLVED | Same 30 characters of the campaign title 390px to 374px wide; "Campaigns" 147px to 143px; the gone title moves from -0.035em to the token (218px to 225px) and its lead's line pitch from 26px to 24px at 390 (`review/gone--default--390--light.png`). |
| F-13 | Help 2px above the bar's line (2, Low) | RESOLVED | Help's cap now spans y 27 to 37 like "Home", "Brand" and the account name (was 25) at 1440, 1180 and 768; at 390 the glyph centre is y 31.5, as the avatar and the Menu button (was 29.5). Both themes. |
| F-14 | Demo campaign against the mockups (10, Low, records) | RESOLVED by ruling | Rubric section 5, "Amended 2026-10-03 by the PRD-009 scored review (R2 F-14)" (`f9c782fd`): exempt from axis 10, axes 1 to 9 still apply. Scored on axes 1 to 9 below; see N-5. |
| F-15 | Cross-reference, Home checklist squeezed under the Help sheet (7, Medium) | RESOLVED | `review/shell--help-menu-open--{1440,1180,390}--*`: every "Not connected yet" on one line, each action under its text (`46adbf8b`). |
| H-1 | Focus ring captured on the account control | RESOLVED | A scan of every top bar in the set for the focus colours finds them in the 24 pass 1 `campaign-detail--*` pictures and in none of the pass 2 pictures (`c21f25e5`). |
| H-2 | Run-day dates unmasked | RESOLVED | Every run-day date is masked on `review/campaign-detail--{ready,approved,already-decided}--*`, `chromium/campaign-detail--permission-restricted--*` and `chromium/campaigns--populated--*` (`c662f723`, `eb41a153`). |
| H-3 | Masks hide whole sentences | RESOLVED | Each mask now covers only its date's line box: the retired notice (`review/campaign-page--ad-retired--1440--light.png`) and "Approved by Review approver, approver, on [date]." (`review/campaign-detail--approved--1440--light.png`) show their words. |
| Note | 12px chip against the mockups' 14px | RULED | `badge-and-live-region.md`, "Shape and type", amended (`f9c782fd`); the ledger records the ruling. Not scored. |

### 2. Scores

Axes: 1 hierarchy, 2 spacing, 3 typography, 4 colour and contrast, 5 states, 6 motion, 7 responsiveness, 8 Dark and Light, 9 empty and error, 10 PRD-009 mockups. "ex" is the dated exemption. Light and Dark share each line (identical scores).

| # | Picture group (count) | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Sub-PRD | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | review `campaign-page--{approved,sent-back,newer-version,library-notice}--{1440,1180,768}` (24) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009e, 009d preview, 009c notices | One header row at 1440 and 1180, start-aligned at 768; even 24px cards; grey disabled primary. N-2 (no pencil on "Make a new version"). |
| 2 | same four states `--390` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | same | Buttons full width, sentence under them. N-1, N-2. |
| 3 | review `campaign-page--ad-retired--{1440,1180,768}` and `campaign-detail--{ready,approved,already-decided}--{1440,1180,768}` (24) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009e, 009d approve card | At 3 on every axis. Approve card rhythm even (`47ec2583`); "Choose another ad" in the notice card. |
| 4 | same four `--390` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | same | N-1. |
| 5 | chromium `campaign-detail--permission-restricted--{1440,1180,768}` (6) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009e, 009d hand-off | Disabled approve, then the hand-off sentence and the full-width primary "Copy the link". N-2 (no pencil, no copy glyph). |
| 6 | same `--390` (2) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | same | N-1, N-2. |
| 7 | review `campaign-page--saved-before-prd-009--{1440,1180,768}` (6) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009e D4 | Read-only, "Launch an ad" the one primary. N-2 (no plus). |
| 8 | same `--390` (2) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | same | Full-width "Launch an ad". N-1, N-2. |
| 9 | chromium `campaign-detail--default--*` (8) | 3 | 2 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | ex | 009a shell; 009f D1 keeps the route | Section titles now semibold (pass 1 to pass 2 change). N-5 on axes 2, 3 and 4. The selected "Version 3" in action blue follows `theme-segmented-control.md` (selected segment on the action tokens), so axis 1 holds. |
| 10 | review `campaigns--all-states--{1440,1180}` and chromium `campaigns--populated--{1440,1180}` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009e | Topic on one line, deliberate tile, decision-aware chips. N-2 (no plus on "Launch an ad"). |
| 11 | review `campaigns--all-states--768` and chromium `campaigns--populated--768` (4) | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 009e | Chips one line; F-8 remainder ("Pre- / approval"); N-2. |
| 12 | review `campaigns--all-states--390` and chromium `campaigns--populated--390` (4) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009e | Cards with thumbnails at 20px. N-2, N-3. |
| 13 | chromium `campaigns--empty--*` and review `campaigns--empty-account--*` (16) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 2 | 009e AC-011, 009g | `AsyncState` empty with the one primary inside it. N-4 (sunken state on the canvas), N-2. |
| 14 | review `gone--default--*` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009f D1 | At 3 on every axis: title on the page tracking, lead at 1.5, page start 32px (24px at 390). |
| 15 | review `shell--help-menu-open--*` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a bar and Help sheet; Home beneath 009b | At 3 on every axis: Help on the bar's line; bottom sheet below 768; Home's checklist no longer squeezed. |
| 16 | review `shell--menu-sheet-open--390--*` (2) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a | At 3 on every axis. |

Total 138 (24 + 8 + 24 + 8 + 6 + 2 + 6 + 2 + 8 + 8 + 4 + 4 + 16 + 8 + 8 + 2).

Changes from pass 1 attributed: 009a lane A (32px page start, 24px on a phone; semibold section and card titles; page tracking; sentence links; grey disabled buttons; glyph and words on one line; Help on the bar's line), 009e lane D (header actions, card inset, notice glyph, approve and hand-off cards, the list's chips, Topic, tile and phone cards), 009d (the ad's theme-proof rules and company line), 009f (the gone page's raw values), 009b lane B (Home under the Help sheet), capture helpers (focus put down, date masks on their own line boxes).

### 3. Remaining and new findings

Severity: High (blocks the bar for a person), Medium (visible on a primary frame), Low (a reviewer sees it, a person would not). N-1 to N-5 were present in pass 1 and missed there, except N-1, which pass 1's F-2 fix ("one inset, `--space-6`, for every card") made uniform at every width; none is a regression.

#### F-8 (remaining). "Pre-approval" splits at its hyphen in the 768 table. Axis 7. Low. Sub-PRD 009e.
- Pictures: `review/campaigns--all-states--768--{light,dark}.png` (rows 5 and 7) and `chromium/campaigns--populated--768--{light,dark}.png` (row 1). State: populated. 4 pictures.
- What I see: Topic reads "Pre- / approval" on two lines; the Ad column breaks the name the same way ("Sample: Get pre- / approved before / you shop"). The chips, the core of pass 1's F-8, now hold one line.
- Required: rubric axis 7, "Correct composition at 1440, 1180, 768, and 390"; 009E-AC-009 (a table at 720px and wider). A compound word read across a line break is a composition fault in a cell.
- Source: `apps/web/src/features/campaigns/components/campaign-list.module.css:195-197` (`.table .nowrap { white-space: normal }` in the `63.99rem` block at `:167`) releases the Topic cell (`campaign-list.tsx:172`), and a hard hyphen is a line-break opportunity; Topic gets a 15% share (`campaign-list.module.css`, the `nth-child(2)` hint in the same block), about 84px of text for a word about 92px wide.
- Fix: keep each word of the topic label (and of the ad name, as `.adName > span` at `:225` already does for its parts) as one unbreakable unit, so "Pre-approval" moves to its own line whole; or, for the writing owner, a non-breaking hyphen (U+2011) in `TOPIC_LABELS`.

#### N-1. The campaign page keeps desktop card insets on a phone. Axis 10. Low. Sub-PRD 009e.
- Pictures: every campaign page at 390, both themes: review `campaign-page--{approved,sent-back,newer-version,ad-retired,library-notice,saved-before-prd-009}--390--*`, `campaign-detail--{ready,approved,already-decided}--390--*`, chromium `campaign-detail--permission-restricted--390--*` (20).
- What I see: card text starts 24px inside the border ("Results" ink at x 42 on a card at 17 on `review/campaign-page--approved--390--light.png`); the mockup's text starts 20px in (x 37 on 17, `campaign-detail--390.png`). The same frame's Campaigns cards and Home's cards use 20px, so sibling screens differ.
- Required: mockup `campaign-detail.html:426`, `.card { padding: var(--space-5) }` and `:420`, `.page { gap: var(--space-5) }` below 720px; Home applies it (`apps/web/src/features/overview/components/overview.module.css:453-465`), the list's phone cards too (`campaign-list.module.css:141-145`). Current value `--space-6`; required `--space-5` on a phone.
- Source: `Surface padding="lg"` is `--space-6` at every width (`packages/ui/src/components/primitives.css:52-54`), used by `campaign-results-card.tsx:84`, `campaign-ad-card.tsx:47`, `campaign-approval-section.tsx:45` and `:67`, `campaign-versions-card.tsx:28`, `campaign-approval-controls.tsx:159` and `:169`, `persisted-campaign-screen.tsx:82`, `:99`, `:223`; `.page { gap: var(--space-6) }` (`campaign-page.module.css:8-14`); the phone block (`campaign-page.module.css:504`) sets neither.
- Fix: in the `47.99rem` block, `.page { gap: var(--space-5) }` and a page-scoped card rule at `--space-5`, as `overview.module.css:453-465` does. Cross-reference for r1: Launch an ad step 3's cards use the same `padding="lg"` with no phone step (`launch-review.tsx:168` onward).

#### N-2. Buttons drop the glyphs the mockups draw. Axis 10. Low. Sub-PRD 009e (with 009d's hand-off).
- Pictures: "Make a new version" with no pencil on rows 1, 2, 5, 6 (40); "Copy the link" with no copy glyph on rows 5 and 6 (8); "Launch an ad" with no plus on rows 7, 8 and 10 to 13 (40). All frames, both themes; 80 pictures (the copy glyph is on 8 of the pencil's 40).
- What I see: plain-text buttons where the mockups put a glyph before the words.
- Required: `campaign-detail.html:538` (pencil on "Make a new version"), `launch-step-3-review-and-launch.html:573` (copy glyph on "Copy the link"), `campaigns-list.html:537` ("+ Launch an ad", preview `campaigns-list--1440.png`). Since `be29b8a6` a glyph passed with a Button's words sits on their line (`button-and-safe-action.md`, line 15), so the old reason not to add one is gone.
- Source: `apps/web/src/features/campaigns/components/campaign-header-actions.tsx:35-39` (the `Link` has words only), `campaign-hand-off.tsx:52-60`, `campaign-list.tsx:98-104` (`LaunchLink`), `persisted-campaign-screen.tsx:213-215`. `IconName` (`packages/ui/src/components/Icon.tsx:7`) has `plus` but no `pencil` or `copy`.
- Fix: add `pencil` and `copy` through the Lucide wrapper as lane A added `tag`, `plug` and `palette` (`789a1f5f`), then pass the glyph at the four call sites. Noted, not scored: "Launch on Facebook" draws the set's `megaphone` where both mockups draw a rocket; the same control on step 3 (r1's set) does too, so change both or record the megaphone in `icon-and-icon-button.md`.

#### N-3. The list's "Launch an ad" is not full width on a phone. Axis 10. Low. Sub-PRD 009e.
- Pictures: `review/campaigns--all-states--390--*`, `chromium/campaigns--populated--390--*` (4).
- What I see: a 144px button at the column's start (`review/campaigns--all-states--390--light.png`, x 16 to 159, y 196 to 239); the mockup's spans the column; the saved-before page's "Launch an ad" spans it on the same frame (`review/campaign-page--saved-before-prd-009--390--light.png`).
- Required: `campaigns-list.html:436` and `:438` (`.page-head .actions { inline-size: 100% }`, `.btn { flex: 1 1 auto }` below 720px), preview `campaigns-list--390.png`.
- Source: `campaign-list.tsx:127` puts `<LaunchLink />` directly in `.head`, outside the `.headActions` and `.actions` wrappers the phone rules stretch (`campaign-page.module.css:513-526`); `persisted-campaign-screen.tsx:211-217` wraps the same link and is full width.
- Fix: wrap `LaunchLink` in `headActions` and `actions` as the saved-before header does.

#### N-4. The Campaigns empty state stands on the canvas as a sunken well. Axis 8. Low. Sub-PRD 009e.
- Pictures: `chromium/campaigns--empty--*`, `review/campaigns--empty-account--*` (16), every frame.
- What I see: in Light the state's fill is the canvas (sampled 245,248,252 inside and out), so it is an outline only on a 214,226,238 hairline; in Dark it is a filled panel (34,38,47 on the 20,22,27 canvas). The two themes compose differently, and the populated list on the same page sits in a white card.
- Required: `03-components/async-empty-error-permission-state.md`, "Surface" (line 23): a state that stands on the page itself is `surface="card"`, `--sf-card` with `--shadow-card`; rubric axis 8, "No element that only works in one theme"; direction 2.3 (cards are white). Current value `--sf-sunken`; required `--sf-card`.
- Source: `apps/web/src/features/campaigns/components/campaign-list.tsx:131-137` (`<EmptyState>` without `surface`), default sunken in `packages/ui/src/components/primitives.css:332-341`; the rule for the fix is at `:343-351` and is already used by `route-boundary.tsx:33`.
- Fix: `surface="card"` on that `EmptyState`. Cross-reference for r1: the empty Ads library tab, if it also stands on the canvas.

#### N-5. The demo campaign page, on axes 1 to 9 alone. Axes 2, 3 and 4. Low. Sub-PRD 009f D1 (unchanged route), shell 009a.
- Pictures: `chromium/campaign-detail--default--*` (8), all frames, both themes. Axis 10 is exempt by the rubric section 5 entry; these three are not mockup deltas.
- (a) Axis 2, section rhythm. Same-rank section titles stand at three distances from the block above: from box edge to cap top 20px before "Artwork and downloads" (button row edge y 759, cap 779) and "What changed, and when" (1381 to 1401), 36px before "Your Meta connection" (1613 to 1649), 28px before "What the approval covers" (2074 to 2102) and "The launch summary" (2743 to 2771), on the 1440 Light picture: gaps of `--space-4`, `--space-8` and `--space-6` on one screen. Required: rubric axis 2, "Vertical rhythm is consistent within a screen". Source: `apps/web/src/features/reporting/components/artifact-workspace.tsx:29` (`<Stack gap="4">`), `campaign-launch-review.tsx:43` (`<Stack gap="6">`), `reporting.module.css:1-7` (`.page { gap: var(--space-8) }`). Fix: one section gap for every section title on the page.
- (b) Axis 3, a raw tracking value. "CAMPAIGN" takes `letter-spacing: 0.04em` with `text-transform: uppercase` (`reporting.module.css:47-54`); no tracking token but `--tracking-page` exists (`packages/ui/src/tokens.css:96`). R3 F-11's fix gave the workspace pages the mockups' eyebrow (sentence case, secondary step, semibold, no tracking); this page kept the old one. Fix: the same eyebrow rule.
- (c) Axis 4, hand-built status pills. "approved", "connected", "Selected" and "superseded" are neutral pills with no glyph, so an approved and a superseded version share one colour (`reporting.module.css:56-67`). Required: direction section 2.3, "Status chips pair a glyph and words with colour"; brief section 9 roles (as R3 F-09, fixed on Connections and Brand). Words are present, so no status is colour alone. Fix: render each status through `Badge` with its tone.

#### Noted, not scored
- The newer-version notice ("A newer version of this ad is in the library.") carries no glyph while its siblings in the same list, the retired and Brand-changed notices, carry the info glyph (`campaign-library-notices.tsx:67-73` hands it to 009c's `UseNewVersion`, `use-new-version.tsx:104`). No spec requires a glyph on a notice; offered to the 009c owner for consistency.
- At 768 "Leads sent to HighLevel" wraps inside its tile, so its value sits one line lower than its neighbours. The mockup keeps three metric columns down to 720px with the same label (`campaign-detail.html:377`, `:401-409`), so it wraps there too; on-mockup.

### 4. Summary

138 pictures scored, every one opened, Light and Dark compared at every frame (all 69 pairs structurally identical). Pass 1: 13 of 15 findings RESOLVED by the fix lanes (F-1 to F-7, F-9 to F-13, F-15), F-14 RESOLVED by the dated rubric ruling, F-8 PARTLY (chips fixed, the "Pre-approval" hyphen split remains); the three harness notes H-1 to H-3 RESOLVED; the chip-size note RULED. 42 pictures are at 3 on every axis: the ad-retired and three campaign-detail pages at 1440, 1180 and 768 (24), the gone page (8), Help open (8) and the Menu sheet (2). Six findings remain, all Low, none a gate failure: F-8 (remaining) the 768 table splits "Pre-approval"; N-1 campaign page cards at 24px on a phone against the mockup's 20px; N-2 the pencil, copy and plus glyphs missing from "Make a new version", "Copy the link" and "Launch an ad"; N-3 the list's "Launch an ad" not full width at 390; N-4 the Campaigns empty state drawn as a sunken well on the canvas (outline in Light, panel in Dark); N-5 the axis-10-exempt demo campaign's section rhythm, raw eyebrow tracking and glyphless status pills. By severity: 0 High, 0 Medium, 6 Low. By sub-PRD: 009e F-8, N-1 to N-4 (N-2 with 009d's hand-off); 009f D1 route N-5. Cross-references for r1: step 3 cards have the same phone inset (N-1) and "Launch on Facebook" the same megaphone (N-2 note).

## Pass 2, part R3

### Part R3, pass 2

Reviewer: r3 (`ux-ui-guardian`). Scored review pass 2 (009G-AC-006, the 009G-AC-011 redraw): screen-baselines run 37136898883, pictures drawn on `0d539dee`, installed uncommitted in `C:\Users\jzfer\Projects\oalo-prd-009`. The worktree head is now `a173b9bb`; the commits after `0d539dee` are lane F (word checks and the accepted-advisory test) and docs, so no picture differs from what the run drew.

Set: the same 80 pictures as pass 1, every one opened: 24 in `chromium/` (`overview--default--*`, `settings-connections--default--*`, `brand--default--*`) and 56 in `review/` (`home--*`, `settings--*`, `settings-connections--empty-account--*`, `brand--empty-account--*`, `partners--empty--*`, `homeowners--empty-account--*`). Every one differs from its pass 1 picture (size or pixels; pass 1 copies in `.../scratchpad/baselines/`). Every Light and Dark pair has the same size and was compared side by side at every frame.

Read against: `library/knowledge/private/ux-ui/06-review-rubric.md` (whole, including the 2026-10-03 R2 F-14 entry), `design/00-direction.md` rev 2 (2.3, 3.1, 4.2 with its MTK-008 amendment), the mockups and previews (`home-first-run` at every frame, `campaigns-list`, `launch-step-2-set-up` for the field and button row), `03-components/badge-and-live-region.md` (the 2026-10-03 12px chip ruling), `form-field-and-text-inputs.md`, `async-empty-error-permission-state.md`, the pass 1 report (all four parts), `git log a7331de3..0d539dee`, and the raid log rulings of 2026-10-03. Measurements are row and column scans of the PNGs with PIL; scratch crops in `.../review-parts/r3p2/`. Nothing in the repository was edited.

Axes: 1 hierarchy, 2 spacing, 3 typography, 4 colour and contrast, 5 states, 6 motion, 7 responsiveness, 8 Dark and Light, 9 empty and error, 10 consistency with the PRD-009 mockups.

#### 1. Pass 1 findings

| ID | Pass 1 | Status | Evidence (pass 2 picture) and fix |
|---|---|---|---|
| F-01 | High: Home "Get set up" action starves the text; chips break | **RESOLVED** | `review/home--first-run--1440--light.png`, `--390--light.png`, `chromium/overview--default--390--*`: every chip on one line, each sentence at the card's measure. The card is a container (`overview.module.css:328-354`): below 32rem of card the action takes its own row under the text (1440, 1180, 390), at 768 it sits at the right as in `home-first-run--768.png`. Chip `white-space: nowrap` (`:394`). Commit `46adbf8b`, held by `home-polish.unit.test.ts`. |
| F-02 | Low: wrong checklist glyphs | **RESOLVED** | `review/home--first-run--1440--light.png`: plug on both connections, palette on the brand, circled check on "Nothing to approve". Commits `789a1f5f`, `be1cecf7`. |
| F-03 | High: "Add Realtor partner" plus on its own line | **RESOLVED** | `review/partners--empty--1440--light.png`: one line, 44px (rows 232 to 275). `Button.module.css:23-34` (`.label` is an inline-flex row), commit `be29b8a6`. |
| F-04 | High: Brand's two navy panels | **RESOLVED** | `review/brand--empty-account--1440--light.png` and `--dark`: both previews are white (Dark: card) bordered cards; only the band inside "On every ad" keeps its own paper, as `data-ad-preview` allows. Commit `4d4a4f3b`. |
| F-05 | Medium: two primaries on Brand | **RESOLVED** | Same picture: "Save your details" is the one blue button; "Save ad settings" is secondary. |
| F-06 | Medium: Brand ad fields touch | **RESOLVED** | Same picture: "Title on your ads" input ends y 1029, "Brand color" label starts y 1060, the same rhythm as "Your details" (y 406 to 433). |
| F-07 | Medium: rail-era 1180 breakpoint | **RESOLVED** | `review/settings--default--1180--*` three cards; `--768--*` one column, no orphan; `review/brand--empty-account--1180--light.png` editor and preview side by side. Breakpoint now 1100px (`workspace.module.css:291-298`). |
| F-08 | Medium: Connections inverted rhythm, 8px card padding | **RESOLVED** | `review/settings-connections--empty-account--1440--light.png`: heading 16px above its cards, groups `--space-8` apart (`permission-screen.module.css:78-94`); card text 25px inside the border (`Card padding="lg"`, `permission-screen.tsx:87`). Commit `195d5e13`. |
| F-09 | Low: hand-drawn pills, no glyph | **RESOLVED** | Same picture: "Needed", "Confirmed", "Missing", "Optional" are `Badge` with the neutral glyph (`permission-screen.tsx:80-82`); the Brand Engine pills are gone with F-13. The rule is now in `badge-and-live-region.md`. |
| F-10 | Low: the information notice loses its surface | **RESOLVED** | Same picture: notice fill sampled `#eaf4ff` (`--st-info-bg`), Dark tinted; `Surface variant="info"` (`permission-screen.tsx:59`). Commit `66360dec`. |
| F-11 | Low: eyebrows and card titles off treatment | **RESOLVED** | `review/settings--default--1440--light.png` ("Northgate Lending" sentence case, semibold, no tracking; "Account" semibold), `review/settings-connections--empty-account--1440--light.png` ("Connections"), `review/partners--empty--*`, `review/brand--empty-account--*`. `eyebrow-treatment.unit.test.ts` holds the three. |
| F-12 | Low: the not-connected sentence four times | **RESOLVED** | `review/settings-connections--empty-account--1440--light.png`: the notice states it once, with one "What to do next"; no group repeats it (`permission-screen.tsx:16-38`, `:84`). |
| F-13 | Medium: synthetic Brand is the Brand Engine page | **RESOLVED** | `chromium/brand--default--1440--light.png`: the PRD-009 Brand page, fed by the synthetic brand, in its read-only state for the local `campaign_creator` (disabled saves drawn grey, the reason under each form). Commit `4f8e40e5`. |
| F-14 | Medium: critical alert for reports not turned on | **RESOLVED** | `review/homeowners--empty-account--1440--light.png`: no alert; the page title comes first; the empty card is the one statement. Commit `4dc5803a`. |
| F-15 | Low: Homeowner lead at 12px at 390 | **RESOLVED** | `review/homeowners--empty-account--390--light.png`: the lead's capital is 12px tall, the same as at 1440 (16px text). Commit `e954c49f`. |

Cross-part items seen in this set: R4-01 (same Home defect as F-01) RESOLVED; R4-02 (focus ring on the account control) RESOLVED here, no `--focus-color` ring in the top bar of any of the 80 pictures; R2 F-13 (Help 2px high) RESOLVED here, "Help", "Home", "Campaigns" and the account name share glyph rows 27 to 37 on `review/home--first-run--1440--light.png`.

#### 2. Scores

| Picture group (L/D = the Light and Dark pair) | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Sub-PRD | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `review/home--first-run--{1440,1180}` L/D (4) | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009b | Action under the text in the narrow card, chips on one line, mockup glyphs. P2-01 (14px chip). |
| `review/home--first-run--768` L/D (2) | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009b | Stacked in D1's order, action at the right as `home-first-run--768.png`. P2-01. |
| `review/home--first-run--390` L/D (2) | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009b | Reads as `home-first-run--390.png` apart from the stacked action. P2-01. |
| `review/home--real-catalog--{1440,1180,768,390}` L/D (8) | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009b, 009c | The empty-library sentence and the amended intro; composition as first run. P2-01. |
| `chromium/overview--default--{1440,1180,768,390}` L/D (8) | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009b, 009a | Synthetic Home with the sample-data strip; "Running now" half width for `campaign_creator` (009b D3). P2-01. |
| `review/settings--default--{1440,1180,768,390}` L/D (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a, 009f | Three cards at 1440 and 1180, one column at 768 and 390, mockup eyebrow and titles. On brief. |
| `review/settings-connections--empty-account--{1440,1180,768,390}` L/D (8) | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a, 009f, 009g D2 | F-08 to F-12 fixed. P2-02 (header rhythm). |
| `chromium/settings-connections--default--{1440,1180,768,390}` L/D (8) | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a, 009f | As above with the synthetic groups and their descriptions. P2-02. N-3. |
| `review/brand--empty-account--{1440,1180,768,390}` L/D (8) | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009d D3, 009a | F-04 to F-07 and F-11 fixed. P2-03 (doubled gap in the report preview). |
| `chromium/brand--default--{1440,1180,768,390}` L/D (8) | 3 | 3 | 2 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 009d D3, 009a, 009f | Now the PRD-009 page, read-only. P2-04 (disabled select keeps the enabled edge), P2-05 (raw 12px note). |
| `review/partners--empty--{1440,1180,768}` L/D (6) | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 009a, 009f | F-03 fixed. P2-05, P2-06 (primary 14px above its field), P2-07 (hand-built empty). |
| `review/partners--empty--390` L/D (2) | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 009a, 009f | The row stacks below 760px, so P2-06 does not apply. P2-05, P2-07. |
| `review/homeowners--empty-account--{1440,1180,768,390}` L/D (8) | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 009a | F-14, F-15 fixed. P2-07 (hand-built empty, its own inset and rhythm). |

Total 80 (4 + 2 + 2 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 6 + 2 + 8). Axes 4, 6, 7 and 8 hold at 3 throughout: no status is colour alone, nothing moves, no frame overflows or mis-composes, and no defect is Dark-only (each finding below holds in both themes).

#### 3. Findings (pass 2)

All new in pass 2; none carried. P2-02, P2-05 and P2-07 were present in the pass 1 pictures and missed by pass 1 (this reviewer); P2-01 became a delta when the 2026-10-03 chip ruling superseded the mockup's 14px chip; P2-03, P2-04 and P2-06 are on surfaces the pass 1 fixes created or exposed.

**P2-01. Home's state chips are 14px with a raw 2px block padding; the ruled chip is 12px.** Axes 3 and 2. **Low.** Sub-PRD 009b.
- Pictures: every Home picture, 24 (`review/home--*`, `chromium/overview--default--*`), both themes, every frame. Also under R2's `shell--help-menu-open--*` and R4's `reset-password--saved-notice--*` and `design-surfaces--home-under-notice--*`.
- Current value: "Not connected yet" has an 11px capital and a 25px pill (`review/home--first-run--1440--light.png`, rows 391 to 401 and 384 to 408); the same `Badge` on Connections has a 9px capital (`review/settings-connections--empty-account--1440--light.png`, rows 399 to 407). `apps/web/src/features/overview/components/overview.module.css:389-395`, `.card .stateChip { padding-block: 0.125rem; padding-inline: var(--space-2) var(--space-3); font-size: var(--text-secondary-size) }`; pinned by `apps/web/src/features/overview/home-polish.unit.test.ts:158-161`.
- Required: `03-components/badge-and-live-region.md:46-57`, "Shape and type": `--text-caption-size`, `padding-block: var(--space-1)`, `padding-inline: var(--space-2)`, and the 2026-10-03 ruling that the 12px chip wins over the mockups' 14px (raid log, 2026-10-03). `0.125rem` is no `--space-*` token (rubric axis 2).
- Fix: delete the font size and both paddings from `.card .stateChip` (keep `white-space: nowrap`) and turn the unit test to the spec's values. If the owner wants 14px chips, that is a spec change for every chip at once, not one screen's override.

**P2-02. Connections: the page lead keeps the browser's paragraph margin, so the header runs looser than its siblings.** Axis 2. **Low.** Sub-PRD 009f D4.
- Pictures: `review/settings-connections--empty-account--*` and `chromium/settings-connections--default--*`, all frames, both themes (16).
- Current value: on `review/settings-connections--empty-account--1440--light.png` the lead starts 25px under the title's glyphs and the notice starts 52px under the lead's glyphs (rows 154, 179, 193, 245); on the sibling `review/settings--default--1440--light.png` the same steps are 17px and 28px (rows 158, 175, 189, 217). At 390: 44px against about 24px. Cause: the lead `<p>` (`apps/web/src/features/onboarding/components/permission-screen.tsx:49-52`) keeps its 16px `1em` block margins because `:is(.pageHeader, .safetyNotice) p` (`permission-screen.module.css:29-32`) sets no margin, and the page gap is `--space-8` (`:8-12`).
- Required: the mockups' page rhythm, `.page { gap: var(--space-6) }` and `.page-head__text { gap: var(--space-2) }` (`design/mockups/home-first-run.html:179`, `:193`), which Settings follows (`workspace.module.css:1-9`, `:16-20`, `:57-62`); the D-009 ruling's last paragraph (rubric section 5): such a gap is fixed with a `--space-*` token in its module.
- Fix: `margin: 0` on `.pageHeader p`, a `--space-2` gap in the header's text block, and `--space-6` for `.onboarding`'s gap at 769px and wider (it is already `--space-6` below).

**P2-03. Brand, Report preview: an empty line doubles the gap above the note.** Axis 2. **Low.** Sub-PRD 009d D3 (the Brand page), seen in the empty account.
- Pictures: `review/brand--empty-account--{1440,1180,768,390}--{light,dark}` (8).
- Current value: "Your contact details" to "Changes apply to new reports" is 52px glyph to glyph, against 28px between every other line of the preview (`review/brand--empty-account--1440--light.png`, rows 492 and 544; 390: rows 1473 and 1525). The synthetic page, whose NMLS numbers are filled, measures 30px (`chromium/brand--default--1440--light.png`, rows 522, 552, 592). Cause: `apps/web/src/features/workspace/preference-editors.tsx:171-178` always renders the NMLS `<small>`, which is empty when both numbers are, and the empty grid item takes a second `--space-5` gap (`workspace.module.css:155-159`).
- Required: rubric axis 2, one `--space-*` rhythm within a card.
- Fix: render the `<small>` only when it has text.

**P2-04. A disabled Select keeps the enabled field edge.** Axis 5. **Low** (local demo). Sub-PRD 009a (the primitive), seen on the synthetic Brand page.
- Pictures: `chromium/brand--default--{1440,1180,768,390}--{light,dark}` (8). State: read-only, every field disabled.
- Current value: every disabled input draws `--bd-hairline` (`#d6e2ee` sampled at (300, 1088) on `--1440--light`; Dark `#343946`), but "Brand color" draws `#718399` (Dark `#6b7385`), the enabled `--bd-input` edge, so it reads as the one editable field. `packages/ui/src/components/Select.module.css:52-56` (`.trigger:disabled` sets `color: var(--tx-faint)` and the sunken fill but not the border, which stays `var(--bd-input)` from `:14`).
- Required: `03-components/form-field-and-text-inputs.md:64`, Disabled: "`--sf-sunken` fill, `--tx-body` text, `--bd-hairline` boundary", which `packages/ui/src/components/field.module.css:147-152` follows for inputs.
- Fix: `border-color: var(--bd-hairline)` and `color: var(--tx-body)` in `.trigger:disabled`, with a component test beside the field's.

**P2-05. Workspace notes at a raw 12px.** Axis 3. **Low.** Sub-PRD 009a.
- Pictures: `review/partners--empty--*` ("Your Realtor partner list is saved...") and `chromium/brand--default--*` ("Your role has read-only access to these details.", twice), all frames, both themes (16).
- Current value: `apps/web/src/features/workspace/workspace.module.css:188-194`, `.note { font-size: 12px }`. The same file has four more raw `12px` sizes not drawn in this set (`:131` `.openLink`, `:186` `.metrics`, `:216` `.record small`, `:310` `.details > div`).
- Required: rubric axis 3, "the six steps ... come from the tokens. No ad-hoc size"; the mockups draw a page note at the secondary step (`.notice`, `design/mockups/campaigns-list.html:508`). The type-step gate passes because 12px is a step's value; it cannot see a literal.
- Fix: `var(--text-secondary-size)` on `.note` (the note's role), and the token in place of the other four literals. Gate note: a stylesheet scan for `font-size` in `px` would hold it.

**P2-06. Realtor partners: the page's one primary sits 14px above the field it belongs to.** Axis 2. **Medium.** Sub-PRD 009a, 009f.
- Pictures: `review/partners--empty--{1440,1180,768}--{light,dark}` (6). Not at 390, where the row stacks.
- Current value: "Add Realtor partner" spans rows 232 to 275 while the search input spans 246 to 289 at 1440 and 1180 (768: 285 to 328 against 299 to 342): the button is centred on the label and the input together. `apps/web/src/features/workspace/workspace.module.css:47-56` (`.toolbar { align-items: center }`), call site `apps/web/src/features/workspace/preference-editors.tsx:223-238`.
- Required: the mockups' field-and-button row aligns the button to the field's end, `align-items: end` (`.add-area`, `design/mockups/launch-step-2-set-up.html:504`; `.start-form`, `:261`); rubric axis 2.
- Fix: `align-items: end` on `.toolbar` (the 760px rule at `:312-314` keeps its stretch).

**P2-07. Partners and Homeowner reports draw their empty states by hand, each differently.** Axis 9 (and 2 for Homeowner reports). **Low.** Sub-PRD 009a, 009f (partners); PRD-007 surface re-themed by 009a (homeowners).
- Pictures: `review/partners--empty--*` (8) and `review/homeowners--empty-account--*` (8), both themes.
- Current value: partners, `apps/web/src/features/workspace/preference-editors.tsx:285-295` (`Card className={styles.empty} padding="lg"`, `workspace.module.css:228-237`, gap `--space-3`); homeowners, `apps/web/src/features/homeowners/workspace.tsx:853-867` (`Card className={styles.empty} padding="md"`, `homeowners.module.css:150-159`, gap `--space-4`). Measured: icon 28px inside the card and 18px above the title on partners (`review/partners--empty--1440--light.png`, card top 383, icon 411 to 427, title 445), 20px and 24px on homeowners (`review/homeowners--empty-account--1440--light.png`, card top 202, icon 222 to 239, title 263). Both centred, while the sibling Campaigns empty state is the `AsyncState` (R2 pass 1, row 19).
- Required: `03-components/async-empty-error-permission-state.md:9`, "screens ... do not implement state views ad hoc"; rubric axis 9, "`AsyncState` variants, not hand-built views"; the same ruling closed R1-06 for the library.
- Fix: `AsyncState kind="empty"` with `surface="card"` on both pages, the homeowners actions in its `primaryAction` and `secondaryAction` slots.

##### Noted, not scored below 3
- N-1, button weight. The `Button` primitive is `--weight-medium` (`packages/ui/src/components/Button.module.css:15`), as brief section 10 still says for controls ("weight 500 where interactive", `00-design-brief.md:170`, superseded only in size); the mockups' `.btn` is `--weight-semibold` (`home-first-run.html:203`), and Home overrides its buttons to semibold (`overview.module.css:220`, `:232`, `:400`). So Home's buttons are 600 and Settings', Brand's, Partners' and Homeowner reports' are 500. Hand to `design-system-guardian` to settle one way, as the chip size was.
- N-2. Home's "No ads running" and "Nothing to approve" are hand-built `.empty` blocks (`home-campaign-lists.tsx:51-54`), drawn as the mockup draws them inside titled cards; scored 3 as the mockup's composition. If P2-07's rule is read to cover them, that is the same ruling.
- N-3. On `chromium/settings-connections--default--*` the notice's body repeats "Local demo with sample data." directly under the shell's strip (fixture `safety.disclosure`). Synthetic only; the review page states its fact once.
- N-4. The Report preview has no frame between the picture of the report and the card's own note, where "On every ad" frames its band. It reads acceptably once P2-03 closes the gap; a sunken well would make the two previews siblings.

#### 4. Summary

80 pictures scored (24 synthetic, 56 review), every one opened and every Light and Dark pair compared at every frame. All 15 pass 1 findings are **RESOLVED** (0 partly, 0 open), each with a cited picture, and the cross-part R4-01, R4-02 and R2 F-13 are resolved in this set. **8 pictures are at 3 on every axis**: Settings at every frame in both themes. Seven pass 2 findings, all Low except one, none Dark-only, none a gate failure: **0 High, 1 Medium** (P2-06, the partners primary off its field's row) and **6 Low** (P2-01 Home's 14px chip against the 12px ruling, P2-02 Connections header margins, P2-03 a doubled gap in the Brand report preview, P2-04 a disabled Select's enabled edge on the synthetic Brand page, P2-05 raw 12px notes, P2-07 hand-built empty states on Partners and Homeowner reports). Three were missed by pass 1 (P2-02, P2-05, P2-07) and are recorded as new. One question goes to `design-system-guardian` (N-1, button weight, brief against mockups), and two gate extensions would hold P2-04 and P2-05 (a disabled Select component test; a stylesheet scan for `px` font sizes).

## Pass 2, part R4


Reviewer `r4` (`ux-ui-guardian`). Set: every picture under `tests/visual/screens/chromium/` and
`tests/visual/screens/review/` starting `verify-email--`, `sign-in--`, `reset-password--`,
`sign-up--`, `forgot-password--`, `change-password--`, `choose-workspace--`, `email-preview--`,
`design-surfaces--`: 146 pictures from the second redraw (screen-baselines run 37136898883, head
`0d539dee`), installed uncommitted in `C:\Users\jzfer\Projects\oalo-prd-009`.

Method: every picture opened (contact sheets per state and frame, Light and Dark) and compared with
its pass 1 version in `scratchpad/baselines/` (pixel diff per picture; every one moved, 8 changed
height). Measurements are pixel rows and sampled colours read with PIL; source lines read at
`0d539dee` with `git show`; fixes read in `git log a7331de3..0d539dee` (lane A `1a9f338b`,
`dd2c4a3b`, `022b5f54`, `c21f25e5`, `27abf0f4`, `8eddd33e`; lane B `46adbf8b`; integration
`be1cecf7`, `33111018`). Scratch work under `review-parts/r4/p2/`.

Read against the rubric (`06-review-rubric.md`, including the 2026-10-03 amendment), design
`00-direction.md` rev. 2, the PRD-009 mockups (nearest sibling for the account screens, which have
no mockup), brief sections 9, 10 and 14, `badge-and-live-region.md` (with its 2026-10-03 12px chip
ruling), `button-and-safe-action.md`, and the standing rulings in both briefs.

Not re-litigated: the section 6 gates (type steps, contrast, 44px targets, overflow, axe), the 28px
title at 390, Home's half-width "Running now" (009B D3), the company field's "(optional)" (PRD-006b
D10), the restricted Settings item, the email bodies inside the frames, Home's bold 16px primary
button (ruled), and the account notices' `--tx-body` words (the visible live region's colour in
`badge-and-live-region.md:96-98`, which R4-06 chose; the mockups define `.notice` but no mockup draws
one, so I do not score AuthNotice against it).

### 1. Pass 1 findings

| ID | Sev. | Status | Evidence in the pass 2 pictures |
|---|---|---|---|
| R4-01 Home checklist chips break and overrun | High | RESOLVED | `review/reset-password--saved-notice--{1440,1180,390}--*` and `chromium/design-surfaces--home-under-notice--{1440,390}--light`: every chip is one line ("Not connected yet" one pill at every frame); at 1440, 1180 and 390 the action sits on its own row under the text, which now holds its sentence ("New leads from your ads go to your HighLevel account." in two lines at 1440); at 768 the action stays beside the text, as the mockup draws it. Lane B `46adbf8b` (container query on `.setup`, `white-space: nowrap`). |
| R4-02 Focus ring captured on the account control | Medium | RESOLVED | All 24 in-shell pictures (`change-password--{default,saved}--*`, `reset-password--saved-notice--*`): a scan of the bar for `#005fcc` and `#8bb0ff` finds no pixel; at (1170-1179, 11-52) of `change-password--default--1440--light.png` pass 1 had 36 ring pixels, pass 2 only the `#d7e3ee` hairline. `c21f25e5`. |
| R4-03 Unverified notice flush on Home | Medium | RESOLVED | `design-surfaces--home-under-notice--1440--light.png`: notice box ends at row 226, "Welcome, Alex." cap top at 256 (29 canvas rows, a 24px gap plus half-leading), the same as the saved-password notice (rows 144 to 174 on `reset-password--saved-notice--1440--light.png`). `dd2c4a3b`. See R4-13 for the 390 value. |
| R4-04 Account card padded at 16px | Low | RESOLVED | `sign-in--default--1440--light.png`: card edge x=513, content x=537 (24px); 768 the same; 390 card x=16, content x=37 (20px), as the mockup's `.card` and its under-720px rule. The in-shell change-password form keeps its 26rem measure at the column start (x=152 to 568 at 1440). `1a9f338b`, `33111018`. |
| R4-05 Signed-out notice keeps paragraph margins | Low | RESOLVED | `sign-in--signed-out--1440--light.png`: 23 rows from the lead's last glyph (227) to the notice (251) and 20 from the notice (298) to the "Email" label (319), identical to `sign-in--refused` (215 to 239, 310 to 331). `1a9f338b`. |
| R4-06 Two notice colours | Low | RESOLVED | "You're signed out." words now `#526579` (`--tx-body`) on `#eaf4ff`, like every other account notice; the information blue moved to its glyph (`#005fcc`). `1a9f338b`. |
| R4-07 Choose-workspace paragraph margins | Low | RESOLVED | `choose-workspace--default--1440--light.png`: lead glyphs end 465, action box starts 489 (23 rows: the panel's 20px gap plus half-leading), action ends 534, card edge 557 (the 24px card padding). `1a9f338b`. |
| R4-08 Status regions without a glyph | Low | RESOLVED | Every refusal carries `circle-x` in the critical colour and every confirmation the `info` glyph in the information blue, on the first line of the words, at every frame and theme: `sign-in--{refused,signed-out}`, `sign-up--address-already-has-an-account`, `forgot-password--confirmation`, `reset-password--{link-expired,saved-notice}`, `verify-email--{confirmed,link-expired}`, `change-password--saved`, `design-surfaces--default`, `design-surfaces--home-under-notice`. `1a9f338b`, `8eddd33e`. |
| R4-09 Card-step titles at 700 | Low | RESOLVED | `email-preview--default--*` ("Reset your Automated LO password", "Confirm your email for Automated LO") and `design-surfaces--default--*` ("We couldn't load your workspace", "Loading your workspace") now at 600: the first title narrows from about 270 to 263px at 1440. `27abf0f4` (the `h2` to `h6` floor and the async-state title). |
| R4-10 Route boundaries without a fill in Light | Low | RESOLVED | `design-surfaces--default--*--light`: both boundaries are white cards with the card shadow on the canvas, as in Dark (`--sf-card`). `022b5f54` (`AsyncState surface="card"`). |

All ten pass 1 findings are resolved. No fix moved anything else in this set the wrong way: every
other change from pass 1 is lane A's (14px semibold field labels, the page title's tracking, the page
starting 32px under the bar, 24px at 390) or lane B's (Home's checklist, the plug and palette
glyphs), all on brief.

### 2. Scores

Axes: 1 hierarchy, 2 spacing, 3 typography, 4 colour, 5 states, 6 motion, 7 responsiveness,
8 Dark and Light, 9 empty and error, 10 consistency with the PRD-009 mockups. "4 x 2" means 1440,
1180, 768 and 390 in Light and Dark.

| Picture group (count) | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Sub-PRD | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `review/sign-in--default--*` 4 x 2 (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a | 24px card (20px at 390), 14px semibold labels, tracked title. |
| `review/sign-in--refused--*` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a | Refusal with its `circle-x` glyph on the first line. |
| `review/sign-in--signed-out--*` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a | Now an `AuthNotice`: glyph, slate words, the refusal's rhythm. |
| `review/sign-up--default--*` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a, 009f | Card and labels as sign-in. |
| `review/sign-up--address-already-has-an-account--*` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a, 009f | Notice glyph; "Sign in" and "Reset your password" inside it. |
| `review/forgot-password--default--*` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a | |
| `review/forgot-password--confirmation--*` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a | Notice glyph. |
| `review/reset-password--default--*` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a | Title still one line at 390. |
| `review/reset-password--link-expired--*` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a | Refusal glyph. |
| `review/verify-email--default--*` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a | |
| `review/verify-email--confirmed--*` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a | Notice glyph. |
| `review/verify-email--link-expired--*` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a | Refusal glyph. |
| `review/choose-workspace--default--*` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a | Action on the panel's gap. |
| `review/change-password--default--*` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a | No ring on the account control; form 26rem at the column start, 32px under the bar (24px at 390). |
| `review/change-password--saved--*` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a | As default, plus the saved notice with its glyph. |
| `review/reset-password--saved-notice--{1440,1180,768}--*` (6) | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a, 009b | Home under the notice; checklist fixed. R4-11 (14px chips), R4-13 (greeting 20px above the grid). |
| `review/reset-password--saved-notice--390--*` (2) | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a, 009b | Checklist fixed. R4-11, R4-13 (notice 24px above the page). |
| `chromium/email-preview--default--*` (8) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a | Card titles 600, page title tracked; emails unchanged, frames white in Dark. |
| `chromium/design-surfaces--default--*--light` (4) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a | Boundaries on the card, titles 600, notice glyph, page 32px under the bar. |
| `chromium/design-surfaces--default--*--dark` (4) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 009a | As Light. |
| `chromium/design-surfaces--home-under-notice--1440--light` (1) | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009g, 009a, 009b | R4-11, R4-12 (two small-button looks), R4-13 (greeting 20px above the grid). |
| `chromium/design-surfaces--home-under-notice--390--light` (1) | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 009g, 009a, 009b | R4-11, R4-12, R4-13 (notice 24px above the page). |

Total: 146 (136 at 3 on every axis; 10 below, all Home pictures).

### 3. Remaining and new findings

None is carried from pass 1. Three are new; each was already in the pass 1 pictures (I missed them,
or the 2026-10-03 chip ruling made one a delta after pass 1), and each is on the Home that two of my
states draw, so the reviewer of the `overview--*` pictures (R3) should see the same.

#### R4-11. Home's checklist chips are 14px; the ruled chip is 12px (axis 3) - Low

- **Screen, frame, theme, state:** Home under a notice, every frame, both themes:
  `review/reset-password--saved-notice--*` (8), `chromium/design-surfaces--home-under-notice--{1440,390}--light` (2).
- **File and line:** `apps/web/src/features/overview/components/overview.module.css:389-395`
  (`.card .stateChip`: `font-size: var(--text-secondary-size)` at `:392`, padding 2px and 8px/12px
  at `:390-391`), pinned by `apps/web/src/features/overview/home-polish.unit.test.ts:159-161`.
- **Current value:** "Not connected yet" and "Not started" at 14px: the "N" is 11 rows tall (463 to
  473 at x=942 on `reset-password--saved-notice--1440--light.png`), as the 14px "Email" label (11
  rows); the 12px "Required" caption measures 9.
- **Required:** `badge-and-live-region.md:54-57`, ruled 2026-10-03: the spec's
  `--text-caption-size` (12px) wins and the mockups' 14px `.badge` is superseded (also the
  orchestrator's ruling in the raid log, "chips follow the 12px component spec"). `Badge` draws 12px
  (`packages/ui/src/components/primitives.css:180`); Home's chip is the only one in the product
  that overrides it, so Home and the campaign screens show one status role at two sizes.
- **Fix:** drop `font-size` and the padding from `.card .stateChip` (keep `white-space: nowrap`),
  rewrite its comment (`:383-388`), and turn the unit test at `:161` into an assertion that the rule
  sets no size. The rule predates the ruling (`7ef05d14`, 2026-10-02).
- **Sub-PRD:** 009b, against the 2026-10-03 ruling.

#### R4-12. Home under the notice draws two small secondary buttons two ways (axis 10) - Low

- **Screen, frame, theme, state:** `chromium/design-surfaces--home-under-notice--{1440,390}--light` (2).
- **File and line:** `packages/ui/src/components/Button.module.css:14-15` (every `Button` at
  `--text-body-size`, `--weight-medium`) and `:34-36` (`.sm` sets only its padding), used by
  `apps/web/src/features/auth/components/unverified-email-notice.tsx:46`; Home's own look at
  `overview.module.css:397-401` (`.itemAction`, 14px semibold).
- **Current value:** "Resend the link." is 16px at 500; "See what's needed" and "Add", the same role
  on the same page, are 14px at 600 (zoomed side by side, the strokes and the size differ plainly).
- **Required:** the mockups' small secondary button, `.btn btn--secondary btn--sm`
  (`home-first-run.html:552-554`): `.btn` at `--weight-semibold` (`:203`), `.btn--sm` at
  `--text-secondary-size` (`:212`), which Home follows. One rendering per role on a screen.
- **Why only these two pictures:** the account screens, change password and the design-surfaces
  gallery use the primitive alone, and the primitive follows brief section 10, "Body and control:
  16px, weight 500 where interactive" (`00-design-brief.md:170`; PRD-009 superseded the size only).
  So the brief and the mockups disagree on control weight, and Home took the mockups' side.
- **Fix:** narrow and safe now: `.sm { font-size: var(--text-secondary-size); font-weight:
  var(--weight-semibold); }` in `Button.module.css`. The unverified notice is the only
  `Button size="sm"` in `apps/web`, so only this button moves. Broader, for `design-system-guardian`:
  rule whether the mockups' semibold `.btn` supersedes brief section 10's 500 for every control, as
  R1-09 and R4-09 did for labels and titles; if it does, every `Button` picture in all four sets
  moves and belongs in one redraw. I scored the primitive-only screens 3 because they follow the
  brief as written.
- **Sub-PRD:** 009a (the light look), exposed by 009g's new state.

#### R4-13. Home's page gaps follow neither half of the mockups' `.page` rule (axis 2) - Low

- **Screen, frame, theme, state:** Home under a notice: `review/reset-password--saved-notice--*`
  (8), `chromium/design-surfaces--home-under-notice--{1440,390}--light` (2).
- **File and line:** `apps/web/src/features/overview/components/overview.module.css:26-30`
  (`.home { gap: var(--space-5) }` at every frame);
  `apps/web/src/features/shell/components/app-shell.module.css:346` (`.content { row-gap:
  var(--space-6) }`, no row-gap in the `.content` rule of the 719.98px block, `:416-418`);
  `apps/web/src/app/(authenticated)/overview/page.tsx:57` (`Stack gap="6"` around the password
  notice).
- **Current value:** at 1440, 1180 and 768 "Welcome, ..." stands 20px above the grid (cap top to
  card edge 36 rows: 174 to 210 on `reset-password--saved-notice--1440--light.png`, 256 to 292 on
  the home-under-notice 1440 picture; the mockup preview `home-first-run--1440.png` measures 39). At
  390 the notice stands 24px above the greeting (29 canvas rows under the notice box, the same as at
  1440: rows 137 to 165 on `reset-password--saved-notice--390--light.png`, 243 to 271 on the
  home-under-notice 390 picture).
- **Required:** the welcome line and the home grid are children of `.page`
  (`home-first-run.html:535-537`), whose gap is `--space-6` (`:179`) and `--space-5` under 720px
  (`:420`). R4-03's fix took the desktop value and R1-01's took the phone padding from the same
  `:420` line, but not its gap.
- **Fix:** one page gap, `--space-6` and `--space-5` under 720px, on `.home`, on the shell's
  `.content` row-gap (add `row-gap: var(--space-5)` to the `:416` block), and on the overview page's
  notice stack (or render `PasswordResetNotice` in the shell's notice slot so one rule spaces both
  notices). Extend `app-shell-alignment.unit.test.ts` to pin the phone gap.
- **Sub-PRD:** 009b (the greeting gap, in Home's module, reaches every `overview--*` picture) and
  009a (the shell's notice gap).

### 4. Summary

146 pictures scored (all moved from pass 1; every one opened, Light and Dark compared at every
frame). 136 are at 3 on every axis: all 104 public account pictures, the 16 change-password
pictures, the 8 email-preview pictures and the 8 design-surfaces default pictures. All ten pass 1
findings are RESOLVED (R4-01 High, R4-02 and R4-03 Medium, R4-04 to R4-10 Low), each with the
picture that shows it. The 10 pictures below 3 are the two states that draw Home (saved-password
notice, unverified-email notice), held there by three new Low findings: R4-11 Home's 14px chips
against the 12px chip ruling (axis 3, 10 pictures), R4-12 two small secondary-button looks on one
page, which also needs a `design-system-guardian` ruling on the brief's 500 control weight versus the
mockups' 600 (axis 10, 2 pictures), and R4-13 Home's page gaps, 20px under the greeting on desktop
and 24px under the notice at 390 where the mockups' `.page` asks 24 and 20 (axis 2, 10 pictures).
Findings by severity: 0 High, 0 Medium, 3 Low. R4-11 and R4-13 reach the `overview--*` pictures in
R3's set; one Home fix closes both sets.

## Appendix: the pass 2 brief

### Scored baseline review, PRD-009 (009G-AC-006): pass 2 brief

Pass 2 re-scores every picture of the second redraw (screen-baselines run 37136898883, head
`0d539dee`), after five fix lanes and an integration lane fixed the 58 findings of pass 1. Read the
pass 1 brief first; every rule in it still applies: `.../scratchpad/review-parts/BRIEF.md`.

#### What is where
- The new pictures (pass 2): installed, uncommitted, in the run worktree
  `C:\Users\jzfer\Projects\oalo-prd-009` under `tests/visual/screens/chromium/` and `review/`.
- The pass 1 pictures, for comparison: `.../scratchpad/baselines/chromium/` and `.../scratchpad/baselines/review/`
  (same file names).
- The pass 1 report: `library/requirements/in-work/prd-009-marketing-toolkit/qa/2026-10-03-scored-baseline-review.md`
  (your own part is the section for your reviewer id; read the others too, for cross-cutting fixes).
- The fixes are in `git log a7331de3..0d539dee` (lanes A to D, the integration lane) and the
  orchestrator's rulings in `EXECUTION_LEDGER.md`'s raid log: R2 F-14 (the synthetic open house demo
  route is exempt from axis 10 by a dated rubric entry; axes 1 to 9 still apply); chips follow the
  12px component spec over the mockups' 14px.

#### Do
1. For every pass 1 finding in your set: RESOLVED (cite the picture that shows it), PARTLY, or OPEN.
2. Score every picture in your set on axes 1 to 10, as in pass 1.
3. Any picture below 3 on any axis is a finding in the rubric's form (new or carried), with its
   likely source file and selector.

#### Output
Write `.../scratchpad/review-parts/<your-id>-p2.md` with: (1) the pass 1 findings table with status;
(2) the score table; (3) new or remaining findings; (4) a summary: pictures scored, how many at 3 on
every axis, findings by severity. Final message under 250 words with the counts and each remaining
finding in one line.
