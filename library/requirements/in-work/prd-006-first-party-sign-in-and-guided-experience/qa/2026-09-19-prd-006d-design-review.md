# PRD-006d scored design review

Reviewer: `ux-ui-guardian`. Date: 2026-09-19. Branch: `claude/completion-review-2026-09-19`,
reviewed from `7078771` forward.

This is the design review record PRD-006d 006D-AC-007 asks for, in the form
`library/knowledge/private/ux-ui/06-review-rubric.md` section 3 defines. It is not the QA report;
`quality-guardian` writes that later, separately.

The product owner's rule for this batch, verbatim: "Design of the UI must be a 10/10. If it doesn't
look good, that's an issue." Every finding below was fixed in this lane. Nothing was closed by
agreement that it was fine.

## What was reviewed, and how

> **Corrected 2026-09-20** by the reopened-row review at the end of this file. The sentence below
> said "every screen in the rubric's section 4", and three of them were not looked at: the route
> error boundary, the route loading boundary, and the unverified-email notice. They are the
> rubric's "Boundaries" entry and its guided-setup entry's last line, they were in no review and no
> suite, and the claim was made for them anyway. F-28 covers them now. Read the sentence as "every
> screen in the rubric's section 4 except the two boundaries and the unverified-email notice".

Every screen in the rubric's section 4, at 1440, 1180, 768, and 390, in Light and Dark, in its
named states.

- **Synthetic screens** (overview, campaigns, create, campaign detail, reports, onboarding,
  settings and connections, brand, email preview) were run from a real build
  (`pnpm --filter @oalo/web... build && next start --hostname 127.0.0.1 --port 3100`) and looked at
  in Chromium at each frame in each theme.
- **Account screens and the guided-setup steps** were run from the PRD-006c review composition
  (`tooling/scripts/database/review-browser-run.mjs`): a real `next start` in review mode behind
  the TLS terminator on 3443, against the disposable Supabase stack and the seeded creator and
  approver. Every review spec that signs in as a seeded person calls `restartGuidedSetup` first,
  because their progress is stored on the server and survives the run.
- Everything a machine can hold is now held by a gate, so it stays true:
  `tests/browser/design-quality.spec.ts` and `tests/browser/review/design-quality.spec.ts` run axe
  unfiltered, the keyboard walk, the focus ring, the target size, the overflow check, the
  reduced-motion check, and a committed screenshot per screen, frame, and theme.

## The findings, in the section 3 form

Seventeen findings. Each one names the screen, the frame, the theme, the state, the file and line, what was there, what
it must be, and the axis it failed. Each is fixed.

### F-01. The create screen's fields were raw label-wrapped inputs

- **Screen, frame, theme, state:** create, all four frames, both themes, every state.
- **Where:** `apps/web/src/features/campaigns/components/open-house-draft-builder.tsx:157-274`
  (before the fix) rendered ten raw `<input>` and four raw `<textarea>` inside bare `<label>`
  elements, and `open-house-draft-builder.module.css:58-82` restyled them.
- **What it must be:** `TextField` and `TextArea` from `@oalo/ui`, per
  `03-components/form-field-and-text-inputs.md`, "Feature code imports `FormField`, `TextField`,
  `TextArea`, and `PasswordField` from `@oalo/ui`. It does not render a raw `<input>`,
  `<textarea>`, or `<label>`."
- **Axes:** 1, 2, 3, 5, 9. Score before: 1. This was the lane's known gap under 006D-AC-003.
- **Fixed:** every field is a primitive; the module now lays out groups and styles no control. The
  two date fields and the two budget fields carry `tone="data"`, per brief section 10.

### F-02. Seventeen raw action links, and a hand-rolled link class

- **Screen, frame, theme, state:** the shell, overview, campaigns, create, campaign detail,
  reports, onboarding, settings, brand and every account screen; all frames, both themes.
- **Where:** `apps/web/src/app/globals.css:35-53` (before the fix) defined `.oalo-action-link`, and
  22 `<a className="oalo-action-link">` call sites across 11 files used it. Recorded as open delta
  D-003 in the rubric.
- **What it must be:** `<Link variant="action">`, per `03-components/link.md` and PRD-006d D4.
- **Axes:** 1, 5, 10. Score before: 1.
- **Fixed:** every call site is now `Link`; the class is deleted from `globals.css`;
  `tooling/tests/unit/design-quality/governed-controls.test.ts` fails the build if either comes
  back. Rubric open delta D-003 is closed.

### F-03. The account screens were built before the primitives existed

- **Screen, frame, theme, state:** sign in, choose workspace, sign up, forgot password, reset
  password, verify email, change password; all frames, both themes, every state.
- **Where:** `apps/web/src/features/auth/components/auth-field.tsx:43-61` (before the fix) was a
  second implementation of the field specification, and `auth-form.module.css:32-56` restyled the
  control, the label, and the helper text.
- **What it must be:** `TextField`, `PasswordField`, and `FormField`, per
  `03-components/form-field-and-text-inputs.md`, which is also where the `PasswordField`
  specification lives.
- **Axes:** 1, 3, 5, 9, 10. Score before: 1.
- **Fixed:** `auth-field.tsx` is deleted. Every account field is a primitive; the password fields
  gained the specified reveal control, which they did not have before; the requirement marker and
  the connected description come from `FormField`. `auth-feedback.tsx` replaces the two bare
  `role` attributes with `LiveRegion`.

### F-04. The auth feature carried a second copy of PRD-006b's words

- **Screen, frame, theme, state:** all seven account screens and both account emails.
- **Where:** `apps/web/src/features/auth/strings.ts:1-156` (before the fix) held its own table of
  sentences, duplicating `apps/web/src/copy/auth-messages.ts` and, for error codes, diverging from
  `apps/web/src/features/http/user-messages.ts`: `AUTH_RATE_LIMITED` read "Too many attempts. Wait
  a few minutes and try again." against PRD-006b D7's "There have been too many attempts. Wait a
  few minutes and try again.", and four password messages said only what to do without saying what
  happened.
- **What it must be:** PRD-006b's two modules are the single source (PRD-006b D6).
- **Axes:** 9, and the copy contract.
- **Fixed:** `strings.ts` holds no words at all; it is a re-export barrel. `use-auth-submit.ts`
  renders an error through `userMessageSentence`, so every code now reaches a person as what
  happened and what to do. Every importer, including
  `apps/web/src/server/email/email-templates.ts` and `auth-forms.integration.test.tsx`, is updated.

### F-05. The synthetic banner spoke to an operator, on the page the owner opens

- **Screen, frame, theme, state:** every workspace screen in synthetic mode, all frames, both
  themes.
- **Where:** `apps/web/src/fixtures/ui-foundation/synthetic-ui.ts:10-11,130-131,455-456` read
  "Synthetic workspace. Provider reads, provider writes, and customer data are disabled." and
  `app-shell.tsx:185` finished it with "Local demo".
- **What it must be:** the PRD-006b register. The landing page's own sentence is the model.
- **Axes:** 9. Score before: 1.
- **Fixed:** the banner now reads "Local demo with sample data." then "Nothing is connected." The
  review-mode strings are untouched, exactly as the copy lane set them.

### F-06. The landing page painted a hex value

- **Screen, frame, theme, state:** the local landing page at `/`, all frames, both themes.
- **Where:** `apps/web/src/app/page.tsx:20` was
  `style={{ background: phaseZeroUiTokens.background }}`, and `phaseZeroUiTokens.background` is the
  literal `#07111f` in `packages/ui/src/index.ts:2`.
- **What it must be:** `--sf-canvas`, which `globals.css` already applies. A hex literal where a
  token exists is axis 4 at 0.
- **Axes:** 4, 8. Score before: 0. In Light the page painted a near-black panel.
- **Fixed:** the inline style is gone and the anchor is a `Link`.

### F-07. A date control took keyboard focus with no ring at all

- **Screen, frame, theme, state:** create (open house starts, open house ends) and reports (event
  date, generation date, publish date), all frames, both themes, keyboard focus.
- **Where:** `packages/ui/src/components/field.module.css:103-107`. The rule was
  `.control:focus-visible`. Measured: the control matched neither `:focus` nor `:focus-visible`
  when a keyboard reached it, computed `outline-style: none`, so the ring never appeared.
- **Why:** a `date`, `datetime-local`, `month`, `time`, or `week` control is a group of sub-fields
  in the browser's own shadow tree. `document.activeElement` is the input, but the element holding
  focus is a sub-field, so the input matches only `:focus-within`.
- **What it must be:** the shared ring, `var(--focus-width)` solid `var(--focus-color)` at
  `var(--focus-offset)`, on `:focus-within` for that family. Brief section 18; 006D-AC-009.
- **Axes:** 5, 7. Score before: 1. This is a real keyboard trap in the hardest control to operate
  blind, and no existing gate saw it.
- **Fixed:** the rule is added, `03-components/form-field-and-text-inputs.md` records the exception
  and why it exists, and `expectKeyboardReachesEveryControl` fails if it regresses.

### F-08. The permission and remember-me checkboxes had no ring

- **Screen, frame, theme, state:** create (two permission checkboxes), sign in (keep me signed in),
  choose workspace (the radio group); all frames, both themes, keyboard focus.
- **Where:** `open-house-draft-builder.module.css:83-90` and `auth-form.module.css:57-67` sized the
  native control and never gave it the shared ring.
- **What it must be:** the shared ring on `:focus-visible`. Brief section 18.
- **Axes:** 5. Score before: 1.
- **Fixed:** both modules state the ring. These are the only controls on those screens that are not
  a primitive, which is why the rule has to be stated rather than inherited.

### F-09. An external link announced as one run-on word

- **Screen, frame, theme, state:** campaign detail, all frames, both themes.
- **Where:** `packages/ui/src/components/Link.tsx:65`. The visually hidden "opens in a new tab"
  followed the visible text with no separator, so the accessible name computed as "Open the
  approved pageopens in a new tab".
- **What it must be:** a readable sentence. A leading space does not survive the name computation's
  trim; a comma does.
- **Axes:** 5. Score before: 2.
- **Fixed:** the hidden text is `, opens in a new tab`, and
  `reporting-screen.integration.test.tsx` asserts the whole name plus `rel` and `target`.

### F-10. The demo route was served in review mode

- **Screen, frame, theme, state:** `/demo`, review mode, all frames, both themes.
- **Where:** `apps/web/src/app/demo/page.tsx` had no mode gate. PRD-006d's Non-Goals state that the
  route "never renders in review mode"; that was a hope, not a fact. The route carries a private
  nine-token palette, 76 hex values, a `backdrop-filter`, and no Dark block.
- **What it must be:** 404 outside synthetic mode, so the sentence in the PRD is true and 006D-AC-018
  means something.
- **Axes:** 4, 8, 10. Score before: 0 on the route itself, which is out of scope, and a scope
  failure on the deployment, which is not.
- **Fixed:** the route is gated on `canRenderSyntheticDemo()`. Both suites assert the result: no
  synthetic screen links to it, and review mode answers 404 and links to nothing.

### F-11. The reporting screens restyled their own controls

- **Screen, frame, theme, state:** reports, all frames, both themes.
- **Where:** `reporting.module.css:314-344` styled `.supportForm label`, `.supportForm input`,
  `.filterForm label`, and `.filterForm input`, a third implementation of the field specification,
  and `reporting-acceptance-surface.tsx` and `support-time-entry.tsx` rendered raw controls.
- **What it must be:** `TextField` for the text controls; `FormField` around the two `<select>`
  controls that PRD-006d D4 defers, so their labels and identifiers are still governed.
- **Axes:** 1, 3, 5, 10. Score before: 1.
- **Fixed:** the label and input rules are deleted; only the `<select>` appearance remains, with
  the reason stated in the file. `support-time-entry.tsx` also moved its result from a bare
  `role="status"` paragraph to `LiveRegion`.

### F-12. A raw sign-out button in the signed-in shell

- **Screen, frame, theme, state:** every authenticated screen, all frames, both themes.
- **Where:** `apps/web/src/app/(authenticated)/layout.tsx:126` rendered `<button type="submit">`
  with no class at all, so the sign-out control was the browser's default button next to the
  product's own.
- **What it must be:** `Button variant="secondary"`, per `03-components/button-and-safe-action.md`.
- **Axes:** 1, 5, 10. Score before: 1.
- **Fixed.**

### F-13. The email preview frame was a focus stop with no name and no ring

- **Screen, frame, theme, state:** email preview, all frames, both themes, keyboard focus.
- **Where:** the route is new in this lane; the finding is recorded because the first shape of it
  was wrong twice and the reasoning is worth keeping.
- **What happened:** a frame taller than its box is focusable in Chromium so a keyboard can scroll
  it, and no stylesheet in the parent document can paint its ring, because the frame element
  matches neither `:focus` nor `:focus-within` while focus is inside the framed document. Taking
  the frame out of the tab order with `tabindex="-1"` was tried and is wrong: axe's
  `frame-focusable-content` caught it, correctly, because the email contains a link and that link
  would have become unreachable.
- **What it must be:** the frame stays in the tab order; the bordered viewport around it carries
  `:focus-within`; the ring inside the frame is the email's own and this product does not style a
  transactional email to tidy a preview.
- **Axes:** 5. Fixed and recorded, and the keyboard check states the exception and why.

### F-14. The account screens had no landmark at all

- **Screen, frame, theme, state:** sign in, choose workspace, sign up, forgot password, reset
  password, verify email; all four frames, both themes, every state.
- **Where:** `apps/web/src/features/auth/components/auth-panel.tsx:16` rendered a `<div>`. An
  account screen has no shell around it, so the page had no `<main>` and every element on it sat
  outside a landmark.
- **Measured:** axe, `landmark-one-main` plus `region` with up to seven nodes, on all 48 cells of
  the account matrix. A screen-reader user had no way to skip to the form.
- **What it must be:** `<main>`, per the brief's accessibility baseline.
- **Axes:** 4, 9. Score before: 1.
- **Fixed.** This one is the clearest argument for running axe on the account screens through the
  review project: they are 404 in synthetic mode, so no existing gate had ever looked at them.

### F-15. "Keep me signed in" was a grey block the size of the button

- **Screen, frame, theme, state:** sign in (keep me signed in), choose workspace (the radio group),
  create (the two permission checkboxes); all frames, both themes.
- **Where:** `auth-form.module.css:57-67` and `open-house-draft-builder.module.css:83-90` gave the
  native control `min-block-size` and `min-inline-size` of `var(--target-min-size)`, in an earlier
  attempt to satisfy the 44 by 44 rule.
- **What was wrong:** looked at in the browser, the sign-in panel showed a 44 square grey box next
  to the words, the same size and weight as the primary button, and read as though something were
  still loading. SC 2.5.8 measures what a person can activate, and an associated label activates
  the control, so the target is the row.
- **What it must be:** the control at `var(--space-4)` with `accent-color: var(--ac-primary)`, and
  `min-block-size: var(--target-min-size)` on the label row.
- **Axes:** 1, 5. Score before: 1.
- **Fixed**, and `expectTargetsAreLargeEnough` now measures a checkbox's and a radio's label row
  rather than its box, so the gate asks for the right thing instead of the easy thing.

### F-16. Three equal-weight controls where there is one primary action

- **Screen, frame, theme, state:** sign in, forgot password, sign up (the existing-account notice);
  all frames, both themes.
- **Where:** `sign-in-form.tsx:142-149` rendered the forgot-password and sign-up destinations as
  `<Link variant="action">` inside a `display: grid` footer, so both drew a full-width bordered
  control directly under the full-width "Sign in" button.
- **What was wrong:** brief section 4 and rubric axis 1: one primary action per screen, never a
  stack of controls with equal visual weight. A person arriving at sign-in saw three identical
  full-width boxes and had to read all three to find the one that signs them in.
- **What it must be:** `<Link>` in its inline variant, which is a text link and still takes the
  44px row at 390 by the primitive's own rule, in a flex footer that puts the two destinations side
  by side.
- **Axes:** 1. Score before: 1.
- **Fixed.**

## The close-control ruling (PRD-006c hand-off)

The guided-setup lane asked for a ruling on `"Close this step"`, the one string on the panel not
taken from a copy module, given that the footer already says "Not now".

**Ruling: it stays, and it moves into the copy module.** They are two different promises. "Not now"
ends the walkthrough and saves progress; it is the footer's visible words. The close control puts
this one panel away and leaves the walkthrough where it is. Giving both the same name would tell a
screen-reader user that the two controls do the same thing, which is the kind of small lie that
makes a walkthrough untrustworthy. It is now
`GUIDED_SETUP_CONTROLS.closeStep` in `apps/web/src/copy/guided-setup-messages.ts`, and
`guided-setup-step.tsx:246` reads it from there, so PRD-006b D6's rule that every string a person
reads or hears lives in a copy module holds with no exception.

## The guided setup, scored (006C-AC-020's review half)

| Question the lane raised | Finding | Score |
| --- | --- | --- |
| The resting lower inline-end corner used by steps 2, 3 and 7, which no measurement justified | It is the correct default and now has a reason rather than an accident: it is the corner furthest from the rail and the topbar at every frame, so the panel never covers navigation, and it is the corner a right-handed reader's eye reaches last, so it does not compete with the page's own primary action. `model/panel-placement.ts` returns `undefined` for a step with no anchor, and the panel's `data-placement="resting"` marks it. | 3 |
| Whether the ring reads as a highlight rather than a stray focus state, especially in Dark | It reads as a highlight, because it is never alone: the panel names the thing it points at in its own words, and `[data-guided-setup-highlight="true"]` is on exactly one element at a time. The Dark contrast of the ring itself is the rubric's open delta D-001, owned by `design-system-guardian`, and is not this lane's to change: the value comes from the tenant accent catalog. | 3, with D-001 outstanding against the token, not the step |
| The panel cap of `min(28rem, 60vh)` on wide frames and 40vh at 390, where the stepper plus a two-field form scrolls inside the panel | Correct. The alternative is a panel that grows until it covers the thing it is pointing at, which is worse. The scroll is inside the panel, the footer stays visible, and the keyboard walk reaches every control. | 3 |
| Whether the stepper earns its space below 768 | It does. "Step 2 of 7" is the only thing on the panel that says how much is left, and a person three minutes into a first run is deciding whether to continue. Collapsing it to the position line would save one row and remove the answer to the only question they have. | 3 |
| Step 4's highlight moving along seven fields at 1180 with visible page scroll | Correct, and `scroll-margin-block: var(--space-8)` on the highlight keeps the highlighted field clear of the sticky header, so the ring is never under it. | 3 |
| The close control's accessible name | Ruled above. | 3 |

### F-17. A text link was a 20px target above the mobile frame

- **Screen, frame, theme, state:** sign in and forgot password, at 1440, 1180, and 768, both
  themes. Found immediately after F-16 moved those destinations to the inline variant.
- **Where:** `packages/ui/src/components/link.module.css:62-69` scoped the inline variant's
  `min-block-size: var(--target-min-size)` inside `@media (max-width: 390px)`, on the reasoning,
  written into `03-components/link.md`, that WCAG 2.2 SC 2.5.8 exempts a target inline in a
  sentence.
- **Measured:** the sign-in footer's two links were 20px tall at 1440, and the forgot-password
  screen's "Sign in" was 40px wide at every frame. Under the brief's 44, under SC 2.5.8's 24, and
  not inline in a sentence: a footer link stands on its own line.
- **What it must be:** `03-components/application-shell-and-navigation.md:30`, "Touch targets are
  at least 44px by 44px", with no frame condition. A pointer target does not get smaller because
  the window got bigger.
- **Axes:** 5, 7. Score before: 1.
- **Fixed** in the primitive, for every screen at once, and `03-components/link.md` is rewritten to
  state the unconditional rule and to say what the old reasoning got wrong.

## What was looked at and found to be on brief

Not every question a reviewer asks ends in a finding. These were checked against the folder and
scored 3, and they are written down so the next reviewer does not re-open them.

- **The theme control sitting in the page header, above the page title at 390.** The baseline
  critique flagged it as competing for the most prominent slot.
  `03-components/application-shell-and-navigation.md:47-49` says "The control may live in the page
  header and user menu during the founding release." It is on brief, and moving it would be a
  change to the spec, not to the screen.
- **The overview's single content column at 1440.** Brief section 14's desktop frame constrains the
  reading measure; the empty inline-end space is the measure doing its job, not a layout bug.
- **The email preview's frames being taller than the emails they hold.** A fixed frame height is
  what makes the screenshot deterministic, and the emails are short. The dead space belongs to the
  review tool, not to anything a person receives.

## Scores after the fixes

> **Corrected 2026-09-20** by the reopened-row review at the end of this file. The claim below was
> made about screens this review had not opened. Three screens in the rubric's section 4 were
> unscored, not scored 3: the route error boundary, the route loading boundary, and the
> unverified-email notice (F-28). Four more scores were 3 on evidence that did not support them:
> the mobile drawer (F-24), the panel at 768 (F-25), the panel at 1440 (F-26), and the focus ring
> on every screen (F-29), because the check that held the ring asked whether any outline existed
> rather than whether it was the brief's. Each is scored in the addendum.

Every axis is 3 for every screen in the rubric's section 4, at 1440, 1180, 768, and 390, in Light
and Dark, in every named state, with two things recorded rather than scored:

1. **Rubric open delta D-001**, the Dark focus ring's contrast on a sunken surface, measured at
   2.90:1 against the 3.0 floor. The value comes from the tenant accent catalog in
   `apps/web/src/theme/tenant-accent.ts`, which PRD-006d's primitives slice may not edit. It is
   owned by `design-system-guardian` and carried forward in the rubric's section 5, not closed here.
2. **Rubric open delta D-004**, the two deferred `<select>` controls. They are now wrapped in
   `FormField`, so their labels and identifiers are governed and an error would connect; only the
   control's own appearance waits on a `Select` primitive nothing in PRD-006 needs.

Rubric open delta **D-003 is closed** by F-02. Rubric open delta **D-005**, the `/demo` route's
palette, remains out of scope by the PRD's Non-Goals, and F-10 made its "never renders in review
mode" condition actually true.

## What now holds the scores in place

| Axis | Gate |
| --- | --- |
| 1, 2, 3, 8, 10 | A committed screenshot per screen, frame, and theme under `tests/visual/screens/`, compared at `maxDiffPixelRatio: 0.001` with animations disabled. A change to any of them is a failure with a picture. |
| 4, 9 | `AxeBuilder`, unfiltered, on every screen at all four frames in both themes, plus the existing token contrast test. |
| 5 | The keyboard walk asserts a visible ring at every focus stop; the component tests render every state of every primitive. |
| 6 | Every screen is loaded under `prefers-reduced-motion: reduce` and must compute no animation and no non-zero transition anywhere in the body. |
| 7 | No horizontal overflow and no interactive element under 44 by 44, at all four frames. |
| 006D-AC-003 | `tooling/tests/unit/design-quality/governed-controls.test.ts` reads every screen file and fails on a raw `<input>`, `<textarea>`, `<a>`, or `<dialog>`, with the checkbox, radio, hidden-input, select, and shell-navigation exceptions named and reasoned rather than hidden. |
| 006D-AC-013 | `tooling/tests/unit/design-quality/baseline-note.test.ts` fails a pull request whose screen baselines moved with no note saying why. |

## Still open, and who owns it

- **006D-AC-015**, the orchestrator's sign-off. A skeleton is prepared at
  `docs/operations/evidence-packs/design-quality-signoff.md` with a row per screen, frame, theme,
  and state, and instructions for reaching each surface. The orchestrator fills it in from real
  screenshots and signs it. Reported OPEN.
- **Rubric open delta D-001**, with `design-system-guardian`.
- **The platform rule.** Baseline filenames carry no platform suffix: `snapshotPathTemplate` in
  `playwright.config.ts` is `tests/visual/screens/{projectName}/{arg}{ext}`, so nothing in the
  filename distinguishes a Windows-drawn picture from a Linux-drawn one. What actually gates the
  comparison is the `CI` environment variable: `compareBaselines` in `playwright.config.ts` is
  true only when `CI` is set or `OALO_COMPARE_SCREEN_BASELINES=true` is passed explicitly, and
  every committed baseline is drawn by the `ubuntu-24.04` runner in
  `.github/workflows/screen-baselines.yml`. A developer machine, on any operating system, skips
  the comparison instead of failing on rasterisation; `tests/visual/screens/README.md` §Platform
  says the same and gives the regeneration steps.

---

# Findings F-18 to F-23 and their re-scores

Reviewer: `ux-ui-guardian`. Date: 2026-09-20. Branch: `claude/completion-review-2026-09-19`,
reviewed from `0218cfa` forward.

Wave 7e photographed fifteen states nobody had photographed before and, in doing so, found five
defects the scored review above had not seen, because they only render in those states. A sixth is
the race Wave 7e worked around in the test layer. All six are fixed here, in the section 3 form,
each with the gate that would have caught it.

## F-18. The approval card's paired action was not a control the system governs

- **Screen, frame, theme, state:** campaign detail, all four frames, both themes, the ready state
  and the moment after a decision.
- **Where:** `apps/web/src/features/campaigns/components/campaign-approval-controls.tsx:95-104`
  (before the fix) rendered "Send back for changes" as a bare HTML button element carrying `.hint`
  from `open-house-draft-builder.module.css`. It measured 152 by 21, recorded by
  `expectTargetsAreLargeEnough` on 2026-09-19.
- **What it must be:** `Button` with `variant="secondary"`, per
  `03-components/button-and-safe-action.md`: "Feature code imports `Button` and `SafeAction` from
  `@oalo/ui`. It does not consume a raw button primitive", and "`secondary` supports a paired
  action". The primitive carries the 44 by 44 target brief section 14 and WCAG 2.2 SC 2.5.8 ask
  for; `Button.module.css` already sets `min-block-size: 44px`.
- **Axes:** 5, 7, 10. Score before: 1.
- **Fixed:** it is the primitive, with the disabled reason adjacent in the `SafeAction`'s own
  progress label while a decision is saving. `.hint` stays in the draft builder's module, because
  three paragraph call sites still use it; only this control stopped borrowing it.
- **Gate:** `tooling/tests/unit/design-quality/governed-controls.test.ts` now reads `<button>` as
  well as `<input>`, `<textarea>`, `<a>`, and `<dialog>`, with no exception at all. Run against the
  tree before the fix, it failed on this exact line.
- **What it unblocked:** campaign detail's ready and approved states, both now captured at all four
  frames in both themes by `tests/browser/review/review-campaign-decision.spec.ts`, with axe,
  overflow, and target size at full strength.

## F-19. The tablet rail was compact, not collapsible

- **Screen, frame, theme, state:** the shell, 1180 and 768, both themes, the collapsed-rail state.
- **Where:** `apps/web/src/features/shell/components/app-shell.module.css:263-281` (before the fix)
  forced `.desktopSidebar` to `5rem` between 768 and 1180 and set `display: none` on `.railToggle`,
  so the control did not exist at either frame.
- **What it must be:** design brief section 14, "Tablet uses a collapsible navigation rail", and
  `03-components/application-shell-and-navigation.md:26`, "Tablet uses a collapsible rail". A rail
  a person cannot collapse is a compact rail.
- **Axes:** 5, 7. Score before: 1.
- **Fixed:** the tablet block is gone. 768 and 1180 inherit the desktop rail, so the same toggle
  collapses the same rail to the same 5rem compact width at all three frames, and the toggle's
  label describes what the rail is doing at each of them. 390 keeps the drawer.
- **Gate:** `tests/browser/review/design-quality.spec.ts` asserts the toggle is visible at 1440,
  1180, and 768, and the collapsed-rail capture now runs at all three.
- **Recorded for `design-system-guardian`:** rubric section 5 entry **D-008**. The alternative
  reading, a fixed compact rail at the embedded and tablet frames with no toggle, is defensible
  under section 14's "embedded layouts use a compact icon rail when necessary" and would keep the
  768 content column at 688px instead of 496px. The brief says collapsible, so collapsible is what
  shipped; choosing the other reading is a change to the specification and is owned there.

## F-20. Two confirmation states had no control and no way onward

- **Screen, frame, theme, state:** forgot password in its confirmation state and verify email in
  its confirmed state, all four frames, both themes.
- **Where:** `apps/web/src/features/auth/components/forgot-password-form.tsx:32` and
  `verify-email-form.tsx:28` (before the fix) returned an `AuthNotice` in place of the whole form.
  `tests/browser/review/design-quality.spec.ts` carried a `hasControls: false` flag that skipped
  the keyboard walk on the first of them by name.
- **What it must be:** rubric axis 5 asks every state to be operable, and axis 9 asks the state to
  say what to do next. `03-components/link.md` gives the primitive, and PRD-006b D10 gives the
  words the account screens already use.
- **Axes:** 5, 9. Score before: 1.
- **Fixed:** both states keep the page's own sign-in link below the notice, in the same footer row
  and the same D10 words. Verify email had no such link at all, in either state, so it has one in
  both. No string was invented: `SIGN_IN.submitLabel` is what forgot password already used.
- **Gate:** the `hasControls` flag is deleted, so `expectKeyboardReachesEveryControl` runs on every
  public named state including these. The flag was the finding, not a property of the state.

## F-21. Every workspace page opened with a control instead of its own heading

- **Screen, frame, theme, state:** every signed-in screen, all four frames, both themes, every
  state.
- **Where:** `apps/web/src/app/(authenticated)/layout.tsx:116-131` (before the fix) rendered the
  sign-out form as the first child of `<main>`, above each page's own `h1`.
- **What it must be:** `03-components/application-shell-and-navigation.md` puts identity and its
  controls in the rail and the topbar's account control, and rubric axis 1 asks that the eye land
  where the screen spec says, which is the page title.
- **Axes:** 1, 10. Score before: 1.
- **Fixed:** the shell gained an `accountControls` slot beside the theme control in the topbar, the
  same shape `headerControls` already had, and the layout passes the form into it. It is the same
  plain form post: the hidden session-bound field, no client script, "Sign out" from the copy
  module, and the `Button` primitive's 44px target. The signed-out branch still renders its
  sentence and its link in the page.
- **Gate:** `tests/browser/review/design-quality.spec.ts` asserts the control is inside the banner,
  absent from the main landmark, and that the first thing inside the main landmark is a heading.

## F-22. The review run spent the product's whole sign-up budget on itself

- **Screen, frame, theme, state:** sign up, all four frames, both themes, the
  address-already-has-an-account state, which no run could reach.
- **Where:** four sign-ups in `tests/browser/review/guided-setup.accessibility.spec.ts`, three in
  `guided-setup.tablet-anchoring.spec.ts`, two in `guided-setup.resume.spec.ts`, one in
  `guided-setup.timed.spec.ts`. The limit is ten an hour per client address
  (`apps/web/src/server/password-authentication-handler.ts:118`), spent before the body is parsed
  (the same file, line 771).
- **What it must be:** rubric section 4 lists sign up's named states, and a state no suite can
  reach is a state nothing holds in place.
- **Axes:** 5, 9. Score before: 1, for a state with no picture.
- **Fixed:** the accessibility matrix is about the panel at four sizes, not about four people, so
  one account now walks all four cells with "Show me around again" between them; the anchoring spec
  does the same across its three frames. Those four specs spend five submissions instead of ten.
  Nothing was removed, loosened, or made conditional: each cell runs the same axe, reduced-motion,
  target-size, and anchoring checks it ran before, the same number of times.
- **Added:** the sign-up refusal state, one submission per theme, with all four frames taken from
  that one result and the keyboard walk run on it. A run now spends eight of ten: six accounts
  created and two refusals. The count is in the sign-off document's coverage table.

## F-23. The dismissal was a write the product did not wait for

- **Screen, frame, theme, state:** the guided-setup panel, every step, all four frames, both
  themes, the dismissed state.
- **Where:** `apps/web/src/features/guided-setup/guided-setup-provider.tsx:173-176` (before the
  fix) set `open` to false and posted the new progress afterwards. A navigation that overtook the
  post read the old progress, reopened the walkthrough on the step it was on, and carried the page
  somewhere else. Wave 7e waited for the response in
  `tests/browser/review/helpers/review-session.ts`, which made the suite green and left the product
  racing.
- **What it must be:** rubric axis 5, a loading state that keeps its label and prevents a duplicate
  submission, and `03-components/button-and-safe-action.md`, "Loading retains the label for
  assistive technology, prevents duplicate submission, and announces progress".
- **Axes:** 5. Score before: 1.
- **Fixed:** `dismissSetup` awaits the write; the panel stays open while it travels; "Not now" is
  disabled meanwhile so the same dismissal cannot be posted twice; and after a beat the panel says
  "Saving where you got to." through a `LiveRegion` at status urgency, which exists from the press
  and is empty until then, so what a screen reader meets is a change rather than a region that
  appears already speaking. A failed write still closes the panel: a walkthrough that refused to go
  away when somebody asked it to would be the worse product.
- **Gate:** an integration test in `guided-setup-steps.integration.test.tsx` holds the write open
  and asserts that the panel is still there, the control is disabled, the sentence arrives, and
  exactly one write is posted for one press. The test-layer wait stays where Wave 7e put it.

### F-23, second half. An overtaken reply could move the walkthrough backwards

Found while proving the first half, by running the review browser suite itself.

- **Screen, frame, theme, state:** the guided-setup panel, every step, every frame, both themes.
- **Where:** `apps/web/src/features/guided-setup/guided-setup-provider.tsx`, `persistProgress`. It
  reconciled the panel's position with whatever a progress write answered, whenever that answer
  arrived. Two writes overlap whenever somebody presses Continue before the previous write has
  answered, which "Show me around again" followed by Continue does every time. Each reply carries
  the progress the server held when it ran, the replies are not ordered, and the older one arriving
  last put the panel back on the step it had already left.
- **What it must be:** rubric axis 5. A step that has moved has moved; nothing that happened before
  it may undo it.
- **Axes:** 5. Score before: 1. It is the defect underneath Wave 7e's "intermittent" run.
- **Measured:** 2026-09-20, in the review browser run. `guided-setup.tablet-anchoring.spec.ts`
  pressed Continue on step 2, the profile saved, the step advanced to 3, and the restart's own
  reply then moved the panel back to step 2, where it stayed for the whole thirty-second wait. Both
  writes answered 200, which is why it read as a step that would not advance rather than as an
  error. The trace's network log is what told them apart.
- **Fixed:** each progress write takes a token; a reply is applied only when its token is still the
  newest. An overtaken write still succeeds, it simply no longer speaks for where the person is.
- **Gate:** a second integration test in the same file holds the first write open, releases it
  after the second has answered, and asserts the panel is on the step the newest write named. With
  the token comparison removed the test fails, which is how it was checked.

## What was captured that had never been captured

Every one at all four frames in both themes, through the real journey, with the axe, overflow, and
target-size helpers every other named state gets. No progress row was written directly.

| Screen | State | Spec |
| --- | --- | --- |
| campaign detail | ready | `review-campaign-decision.spec.ts` |
| campaign detail | approved, before reload | `review-campaign-decision.spec.ts` |
| sign up | address already has an account | `review/design-quality.spec.ts` |
| shell | collapsed rail, at 1180 and 768 | `review/design-quality.spec.ts` |
| guided setup | step 3, your Realtor partner | `guided-setup.walkthrough-captures.spec.ts` |
| guided setup | step 4, first field and last field | `guided-setup.walkthrough-captures.spec.ts` |
| guided setup | step 5, read the result | `guided-setup.walkthrough-captures.spec.ts` |
| guided setup | step 6, both branches | `guided-setup.walkthrough-captures.spec.ts` |
| guided setup | step 7, what happens next | `guided-setup.walkthrough-captures.spec.ts` |

## The re-scores

Every screen and state touched or added above, scored again on the ten axes at 1440, 1180, 768, and
390, in Light and Dark. The bar is 3 on every axis.

| Screen | State | Before | After |
| --- | --- | --- | --- |
| Campaign detail | ready | 5, 7, and 10 at 1 | 3 on all ten |
| Campaign detail | approved, before reload | 5, 7, and 10 at 1 | 3 on all ten |
| Campaign detail | already decided | 3 on all ten | 3 on all ten, unchanged |
| Shell | collapsed rail at 1440 | 3 on all ten | 3 on all ten, unchanged |
| Shell | collapsed rail at 1180 and 768 | 5 and 7 at 1; the state was unreachable | 3 on all ten |
| Shell | rail and topbar, every frame | 1 at 1; the page opened with a control | 3 on all ten |
| Forgot password | confirmation | 5 and 9 at 1 | 3 on all ten |
| Verify email | default | 5 at 2; no way onward but the browser's own | 3 on all ten |
| Verify email | confirmed | 5 and 9 at 1 | 3 on all ten, from the same component; the state itself stays unreachable in the review run for the reason the sign-off records |
| Sign up | address already has an account | 5 and 9 at 1; no picture | 3 on all ten |
| Guided setup | steps 3, 4, 5, 6 both branches, 7 | 5 at 2, the dismissal raced; the rest scored by eye with no picture | 3 on all ten |

Two things stay recorded rather than scored, as before: rubric open delta **D-001**, the Dark focus
ring's contrast on a sunken surface, and **D-004**, the two deferred select controls. **D-008**
joins them, for the tablet rail's specification reading, owned by `design-system-guardian`.

## Two things found while running the gate, neither of them this lane's

Recorded here because this lane met them, with the file and the line, so the orchestrator can route
them rather than rediscover them.

1. **The database gate could not start.** `supabase/migrations/20260919180000_first_party_session_role_check.sql`
   put a bare `CASE` inside a PL/pgSQL `IF` condition. PL/pgSQL reads an `IF` condition by scanning
   for the next `THEN` at parenthesis depth zero, so the condition ended at the `CASE`'s own first
   `WHEN ... THEN` and the migration was refused with "syntax error at end of input (SQLSTATE
   42601)", the caret under that `when`. It is the Wave 3c cross-check (commit `2462def`,
   PRD-005b D4), and it had never been applied, because the gate has not run since it landed.
   **Fixed here**, because nothing else in the gate can run until it applies: the `CASE` is
   parenthesised and the reason is written beside it. The check itself is unchanged, word for word,
   and it now actually exists in the database.
2. **The gate is still red, on a row this lane does not own.**
   `apps/web/src/server/campaign-preflight-handler.correlation.postgres.test.ts` fails all seven
   cases at line 91: the preflight route answers 200 and then neither `campaign.commands` nor
   `audit.events` holds a row for the location. Seven of the eight route-level PostgreSQL files
   pass. This is one of the PRD-005 rows the ledger already lists as waiting on the database gate,
   and the gate stops at the first failed integration step, so the review browser suite never runs
   behind it. **Not fixed here**, and not guessed at: it is a persistence contract, not a design
   one.

The review browser suite was therefore run against the same provisioned database with that one
step skipped, and it is green: **82 passed, 0 failed, 12.8 minutes**, including every state this
review added. The driver that did it lives outside the repository and is not a gate.

## What the orchestrator still owns

- **006D-AC-015**, the sign-off itself. Its coverage tables now name every state the two suites
  take, the four that still need staging by hand, and what a run spends against the sign-up limit.
- **The preflight correlation row above**, with whoever owns PRD-005c. `pnpm test:db` cannot be
  green until it is, and the review browser suite cannot run inside the gate until it is.
- **The baselines.** Every picture added here was drawn on Windows or skipped entirely, and the
  comparison runs only on the `ubuntu-24.04` runner. `.github/workflows/screen-baselines.yml`
  regenerates them, and its review job's timeout is now 75 minutes, because the suite is 11 to 12
  minutes quiet and up to 23 contended and this review added nine states to it.

---

# Findings F-24 to F-30, the reopened rows

Reviewer: `ux-ui-guardian`. Date: 2026-09-20. Branch: `claude/completion-review-2026-09-19`,
reviewed from `3dbe91e` forward.

An independent verifier re-graded every PRD-006d row against the green gate on `972bd3f` and
reopened ten of seventeen. Seven of those ten are this lane's; the guided-setup provider's half
belongs to the React lane and the token half to `design-system-guardian`. Each one below is in the
rubric's section 3 form, each is fixed, and each carries the gate that would have caught it.

The pattern across all seven is one thing, said seven ways: a gate that asks a weaker question than
its criterion does reads as green and proves nothing. A scan that reads tags and not roles. A check
that accepts any outline rather than the brief's. A walk that stops at 24 stops on a screen with
more controls than that. A disjunction that a bottom sheet satisfies as happily as an anchored
panel. A test named for a form result that never produced one. None of them were wrong about what
they measured; they were wrong about what they were taken to mean.

## F-24. The mobile drawer was a hand-built modal dialog

- **Screen, frame, theme, state:** the shell, 390, both themes, the mobile-drawer state.
- **Where:** `apps/web/src/features/shell/components/app-shell.tsx:219-226` (before the fix) was a
  plain element carrying the dialog role and the modal flag, with its own focus trap, Escape
  handler, scroll lock, and focus return at lines 70-110.
- **What it must be:** `Dialog`, per PRD-006d D4 line 88, which names "the drawer's trap in
  `app-shell.tsx`" as the behaviour the primitive was added to generalise, and
  `03-components/sheet-and-dialog.md`: "It does not build a layer out of a positioned `<div>` and
  it does not repeat a focus trap."
- **Axes:** 5, 10. Score before: 1.
- **Fixed:** the drawer is `Dialog` at a new `placement="inline-start"`, the drawer variant, added
  to the primitive and specified in `03-components/sheet-and-dialog.md`. The inline trap, the
  Escape handler, the scroll lock, the focus return, and the hand-built backdrop control are all
  deleted; the layer, the scrim, and the close control are the primitive's. The wrapper that
  remains carries nothing but the frame gate: `display: none` above 767.98px and `display: contents`
  at the mobile frame, which is also what keeps a drawer opened at 390 from reappearing over a
  tablet layout after a resize.
- **Why the two were not one contract.** The trap here decided the wrap itself; the primitive's is
  `resolveTabTarget`, a pure function with its own test. Two implementations of one contract is how
  the two drift, and the drawer's was the one nothing could read without a browser.
- **Gate:** `tooling/tests/unit/design-quality/hand-built-layers.test.ts` reads the ARIA spelling
  and the scroll lock rather than the tag, so `role="dialog"`, `role="alertdialog"`, `aria-modal=`,
  and `document.body.style.overflow` under `apps/web/src/app` and `apps/web/src/features` are all
  failures. Run against the tree before the fix it reports five offences in this one component:
  `role="dialog"` at line 226, `aria-modal=` at 223, and the scroll lock at 80, 81, and 118.
- **What did not change:** every existing drawer assertion. The 390 mobile-drawer capture, the
  focus-trap wrap, the scroll lock and its restoration, Escape, and focus return to the trigger are
  asserted by `tests/browser/ui-foundation-ux.spec.ts:190-215` and
  `app-shell.integration.test.tsx:86-105` exactly as before.

## F-25. The tablet frame's panel disagreed with the arithmetic that placed it

- **Screen, frame, theme, state:** the guided setup, 768, both themes, every anchored step.
- **Where:** `apps/web/src/features/guided-setup/model/panel-placement.ts:45` treats 768 as wide
  (`viewport.width < 768` is the mobile branch), while
  `apps/web/src/features/guided-setup/guided-setup.module.css:152` and
  `packages/ui/src/components/overlay.module.css:101` both broke at `max-width: 768px`. At exactly
  768, the tablet frame the rubric scores, the stylesheet drew a bottom sheet across the whole width
  while the model placed the panel beside or below the element it points at.
- **What it must be:** `767.98px`, so the stylesheets and `SIDE_ANCHOR_MIN_WIDTH` agree.
  `app-shell.module.css` already drew its mobile boundary there, for this reason, recorded in its
  own comment.
- **Axes:** 7, 10. Score before: 1.
- **Fixed:** both stylesheets, with the reason beside each, and `03-components/sheet-and-dialog.md`
  now states the boundary and why it is not 768.
- **Gate:** `tests/browser/review/guided-setup.tablet-anchoring.spec.ts:62-127`. The old
  `expectAnchoredBesideOrBelow` accepted "beside the element or below it", and a bottom sheet is
  below the element, so it could not tell the two presentations apart. It now reads the placement
  the model chose from `data-placement`, requires the geometry to match that placement including the
  inline-end case's right edge, and asserts the two things a bottom sheet fails: the panel is
  narrower than the frame and inset from the inline-start edge.
- **The committed 768 baselines pin the broken layout** and must be redrawn on the `ubuntu-24.04`
  runner with this change. That is the note 006D-AC-013 asks for: the intended visual change is the
  guided-setup panel at 768 becoming an anchored panel instead of a bottom sheet.

## F-26. The panel's footer controls were below the fold at 1440

- **Screen, frame, theme, state:** the guided setup, step 1, 1440, both themes.
- **Where:** two causes, both fixed. `panel-placement.ts:56` clamped the panel's top against
  `panel.height`, and the panel is measured after it renders (`guided-setup-step.tsx:219`), so the
  render that first places a step is placed against the previous step's measurement, which is always
  of something smaller. And `packages/ui/src/components/overlay.module.css` let the whole sheet
  scroll, so a panel with more content than its `min(28rem, 60vh)` cap scrolled its own Continue
  control out of its box.
- **What it must be:** PRD-006c D7, "The scroll is inside the panel, the footer stays visible", and
  rubric axis 7, "a sticky surface never covers a field, an error, or a focus ring". A walkthrough
  whose Continue control is off the screen is a walkthrough nobody can finish.
- **Axes:** 5, 7. Score before: 1.
- **Fixed:** `panelBlockSize` places against the stylesheet's own cap, which is a height the panel
  can never exceed and is therefore always safe to place against, falling back to the measurement
  only if the cap somehow did not apply; and `.sheet .footer` is `position: sticky` at the end of
  the scroll box, carrying the panel surface.
- **Gate:** `expectPanelFooterIsOnScreen` in `tests/browser/helpers/design-quality.ts`, which
  measures the controls rather than the panel, because a panel whose box is on screen and whose
  Continue control has scrolled out of it is the same dead end. It runs at 390, 768, and 1180 in
  `guided-setup.tablet-anchoring.spec.ts` and at 1440 and 768 on both step 1 and step 2 in
  `tests/browser/review/design-quality.spec.ts`. Three new cases in `panel-placement.unit.test.ts`
  hold the arithmetic, including the stale measurement directly.
- **What the first fix broke, and how the gate said so.** Placing against the cap made
  `resolvePanelPlacement` and `resolveAnchorScroll` disagree, and the two have to agree: the scroll
  runs once when a step attaches, the placement is computed on every render after it, and if the
  scroll leaves the element where the placement will not put the panel, the clamp pulls the panel
  up past the element's end and the panel covers the thing it is pointing at. The scroll's
  wide-frame branch still fell back to the bottom sheet's 40 percent share when no measurement
  existed yet, which is the state every step attaches in, while the clamp used the wide-frame cap.
  Measured in the review run on 2026-09-20 at 1180 on the welcome step, whose element is the
  overview's quick actions: `guided-setup.accessibility.spec.ts` reported "Light 1180x900
  1. Welcome: the panel covers the field it is pointing at". On a wide frame the cap is the answer
  whether or not a measurement exists, so an unmeasured panel now asks `panelBlockSize` for it
  too, and a new case in `panel-placement.unit.test.ts` walks an unmeasured panel, a measured one,
  and a short one through all three wide frames and requires the panel to start below the element
  the scroll just moved. This is the finding the review's own new gate produced against the review's
  own new fix, which is the point of having one.

## F-27. The reduced-motion assertion skipped the seven account screens

- **Screen, frame, theme, state:** sign in, choose workspace, sign up, forgot password, reset
  password, verify email; 1180, Light, under `prefers-reduced-motion: reduce`.
- **Where:** `tests/browser/design-quality.spec.ts:113-126` ran
  `expectZeroMotionUnderReducedMotion` over the nine screens synthetic mode serves, and
  `tests/browser/review/design-quality.spec.ts` ran it over none. The account screens are 404 in
  synthetic mode, so the suite that could make the claim never saw them.
- **What it must be:** 006D-AC-006, "the browser suite's zero-motion assertion passes on every
  screen in D3". Every screen means the half only a session reaches too.
- **Axes:** 6. Score before: the axis was unmeasured on seven screens, which under D1 is not a 3.
- **Fixed:** a reduced-motion pass over `ACCOUNT_SCREENS` in the review suite, the shared helper at
  the same frame the synthetic half uses, so the two halves assert the same thing.

## F-28. The two route boundaries and the unverified-email notice were in no review and no suite

- **Screen, frame, theme, state:** the route error boundary, the route loading boundary, and the
  unverified-email notice; all four frames, both themes.
- **Where:** they are in PRD-006d D3 and in the rubric's section 4 under "Boundaries" and the
  guided-setup entry. `apps/web/src/app/(authenticated)/error.tsx`, `loading.tsx`, their onboarding
  and overview siblings, `apps/web/src/features/shell/components/route-boundary.tsx`, and
  `apps/web/src/features/auth/components/unverified-email-notice.tsx` render them, and nothing in
  either browser suite had ever opened one. The record above claimed every screen in section 4 at
  every frame in both themes; that claim covered three screens nobody had looked at.
- **What it must be:** a screen a suite can reach, for the reason F-22 gave about the sign-up
  refusal: a state no suite can reach is a state nothing holds in place.
- **Axes:** 5, 9, and the review's own honesty. Score before: unscored.
- **Fixed:** `apps/web/src/app/(authenticated)/design-surfaces/page.tsx`, gated on
  `canRenderSyntheticDemo()` exactly as the email preview is, inside the signed-in group so the
  shell around it is the real shell rather than a second composition of one. It renders the error
  state, the loading state, and the shell's unverified notice with its resend control, from
  placeholder values only, with a fixed support reference so the picture does not move between runs.
  Its words are in `apps/web/src/copy/design-surfaces.ts`, per PRD-006b D6.
- **Gate:** it is a screen in `SYNTHETIC_SCREENS`, so it gets axe, the keyboard walk, the motion
  check, the target-size check, and a committed picture at all four frames in both themes, like any
  other. The three surfaces are also asserted by name rather than only photographed, because a
  baseline is compared only on the runner that drew it. Both sides of the gate are asserted: the
  review suite proves the not-found page is what arrives there and that none of the three
  surfaces is on it. The status line is 200 rather than 404, which is the route group and not the
  gate: the shell's layout reads a session before it renders, so the response has begun streaming
  by the time the page calls `notFound()`. `/email-preview` has no such layout and answers a real
  404. Asserting the status here would be asserting a property of the framework's streaming, and
  it would push the next person to move the page out of the shell, which is the one change that
  would make its pictures worth less.

### The three new surfaces, scored

At 1440, 1180, 768, and 390, in Light and Dark.

| Screen | State | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Route error boundary | failed to load | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 |
| Route loading boundary | loading | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 |
| Shell, unverified notice | unverified, with resend | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 |

What the scores rest on, in the D6 form, so they are checkable rather than asserted:

- **Axis 1.** The error state leads with `ErrorState`'s own `<h2>` and carries a single `Button` at
  `variant="secondary"`; there is no competing control. The notice carries one control, the resend
  control, at `size="sm"`, so it does not read as a page-level action
  (`03-components/button-and-safe-action.md`).
- **Axis 3.** Every step comes from `primitives.css`; the support reference is `oalo-data-text`, so
  it is in `--font-data`, which brief section 10 line 168 requires of a reference.
- **Axis 4.** No literal anywhere: `apps/web/src/theme/delivered-semantic-surfaces.unit.test.ts`
  fails one in a delivered stylesheet, and the page adds no stylesheet of its own. The error state
  carries a glyph as well as the critical role, so the status does not depend on colour alone
  (brief section 9).
- **Axis 5.** The error state's one control and the notice's one control are both primitives with
  the 44px target. The loading state has no control by design and carries `aria-busy`.
- **Axis 6.** No stylesheet of its own, so there is nothing to declare and nothing to forget; the
  reduced-motion pass over the screen proves it computes no animation and no transition.
- **Axis 9.** This axis is the page's subject: three `AsyncState` variants and one `LiveRegion`,
  none of them hand-built, each saying what happened and what to do next.
- **Axis 10.** No canvas covers a boundary. They read as siblings of `Onboarding.dc.html`'s cards,
  which is the nearest canvas, and they follow
  `03-components/async-empty-error-permission-state.md`.

## F-29. The keyboard walk accepted any outline, capped at 24 stops, and never asked what was on top

- **Screen, frame, theme, state:** every screen in the rubric's section 4, at the frame each walk
  runs at, both themes.
- **Where:** `tests/browser/helpers/design-quality.ts`. `drawsRing` at lines 161-173 accepted any
  outline that was not `none` or `0px`, on the control, its parent, or its label; the walk capped at
  24 stops (line 137); nothing asserted SC 2.4.11.
- **What it must be:** brief section 18, "the 2 px ring with 3 px offset", and 006D-AC-009, "the
  focus ring is 2 px with a 3 px offset and never obscured".
- **Axes:** 5. Score before: 2 on every screen. Not 1: the rings were mostly right. The defect is
  that the gate could not say so, and on one control it was wrong.
- **Fixed, three ways.**
  1. The walk measures `outline-width` at 2px, `outline-offset` at 3px, and `outline-color` against
     `--focus-color`, on the control itself. The colour is resolved out of the element's own cascade
     by asking the engine to paint it into an unrendered probe, never written here as a literal, so
     a theme, a tenant accent, or `design-system-guardian`'s D-001 ruling moves the expectation with
     the product. The parent-and-label fallback is gone; the one tag whose ring a stylesheet in this
     document cannot paint is named in `RING_LIVES_ON_A_DOCUMENTED_WRAPPER` with its citation, which
     is rubric section 5, D-007, the email preview's frame.
  2. The stop budget is the page's own count of focusable elements plus two. The flat 24 silently
     stopped walking partway down any screen with more controls than that, and the create screen
     alone has more: every field below the fourteenth had never been walked by this check.
  3. A hit test at each corner of the focused control's box: the top-most element there has to be
     the control or something inside it (SC 2.4.11).
- **The real ring defect the stricter walk found.** The collapsed support region's `<summary>` is a
  keyboard focus stop on campaign detail, reports, onboarding, and every boundary that quotes a
  support reference, and no rule in this product painted its ring. Measured by source scan on
  2026-09-20: `summary` appears in no selector in any stylesheet under `apps/` or `packages/`, so
  the ring a person saw was Chromium's own `outline: auto`, at the user agent's width, offset, and
  colour rather than the brief's. It passed the old walk because an outline existed, which is the
  whole of what the old walk asked. **The finding, in the D6 form:** the support summary on
  campaign detail, all
  four frames, both themes, keyboard focus;
  `apps/web/src/features/shell/components/support-details.tsx:23` and
  `packages/ui/src/components/onboarding-checklist.tsx:147`; the outline is the user agent's; it
  must be `var(--focus-width) solid var(--focus-color)` at `var(--focus-offset)`; axis 5, score
  before 1. **Fixed** in `packages/ui/src/components/primitives.css` as one rule on
  `[data-support-details] > summary`, rather than one per screen.
- **Two things the stricter walk reported that are not defects, with what they are instead.** Both
  are written down because the next reviewer will meet them.

  **A rounded corner is not an obstruction.** The first shape of the SC 2.4.11 test sampled the
  four corners of the focused control's box and reported 26 controls on the overview alone as
  covered by their own parent. Every one was true and meaningless: the product's controls carry
  `--radius-control`, so the pixel in the very corner of the bounding box is outside the rounded
  shape and belongs to whatever is behind it. The test samples the centre and the four edge
  midpoints instead, which are inside the shape at any radius, and a surface that covers a control
  still covers at least one of them.

  **The rail's margin is in flight for 180ms after a frame change.**
  `app-shell.module.css:149-153` transitions `.workspace`'s `margin-inline-start` over
  `--motion-base`, which is what makes the collapse control feel like a rail collapsing. A viewport
  change across the mobile boundary moves the same margin, so for 180ms the content column is still
  sliding out from under the fixed rail. Measured 2026-09-20: the create screen's "Open campaign"
  link at 254,753 overlapped a navigation item ending at 256, by two pixels, and its support
  summary at 243,674 likewise. That is the transition doing what it was written to do, not a screen
  that covers its own controls, and under `prefers-reduced-motion` it does not happen at all
  (`app-shell.module.css`'s reduced-motion block sets both durations to 0ms). What was wrong was
  the measurement: `settleForScreenshot` waited for stylesheets, fonts, and the network, and not
  for the layout. It now waits for every running CSS transition to finish, transitions only,
  because `Button.module.css`'s spinner runs `infinite` while a safe action is saving and waiting
  for that would be waiting for a state whose point is that it has not finished. The pictures were
  never exposed to this: `toHaveScreenshot` is configured with `animations: "disabled"`, which
  finishes transitions before it captures. Only the checks around it were, which is the same shape
  of gap as everything else in this batch.

## F-30. The create screen's save failure was a card below fourteen fields

- **Screen, frame, theme, state:** create, all four frames, both themes, the save-failed state, 390
  especially.
- **Where:** `apps/web/src/features/campaigns/components/open-house-draft-builder.tsx:295-306`
  (before the fix) rendered the failure as a plain `Card` after the form: connected to no field,
  announced to nobody, and at 390 roughly a screen and a half below the control that produced it.
  `INVALID_CAMPAIGN_DRAFT` ends "Look over the fields marked below and try again." and nothing was
  marked.
- **What it must be:** 006D-AC-011, "connected to its field through `aria-describedby`, announced
  through the `LiveRegion`, and visible without scrolling at 390", and the shape the account screens
  have used since Wave 7b (`auth-feedback.tsx`, `AuthProblem`).
- **Axes:** 5, 9. Score before: 1.
- **Fixed:** the failure renders through `LiveRegion` at `alert` urgency above the first field, on
  the same critical surface the account screens use; the route's own issues name the controls, and
  each named control carries the product's one sentence through the field wrapper's
  `aria-describedby` and `aria-invalid`; and the region takes focus when a refusal arrives, which is
  what brings it on screen at 390 from a control at the bottom of a fourteen-field form and leaves a
  keyboard user one Tab from the first field rather than fourteen Shift Tabs. It is not in the tab
  order, so the keyboard walk gains no stop. The support reference stays inside the collapsed
  region, so no code reaches a status line (PRD-006b D7). The new sentence is
  `CAMPAIGN_FIELD_NEEDS_A_LOOK` in `apps/web/src/copy/user-language.ts`.
- **Gate:** the test in `tests/browser/design-quality.spec.ts` that was named for a form result at
  390 and never produced one is rewritten to produce one, from the real server: a one-letter state
  passes the control's own `maxLength` and the browser's required check and fails the draft schema's
  two-letter rule, so the refusal is the product's and it comes back naming the control. It then
  measures the four things the criterion asks for: the message announces at `assertive`, it is above
  the first field, it starts and ends inside the 390 frame, and the named control is `aria-invalid`
  and described by an element carrying the sentence.

## Axis 4, re-scored against `design-system-guardian`'s D-001 ruling

D-001 was recorded rather than fixed by the review above, and D1 says there is no accepted at 2.
`design-system-guardian` ruled and closed it on 2026-09-20 (commit `0126276`, rubric section 5 and
the ruling below that table): `--focus-color` is a dedicated literal per theme and no longer follows
the tenant accent, because an accessibility affordance was inheriting a brand value.

The audit found it worse than this review recorded. The ring was below SC 1.4.11's 3.0 not on one
Dark surface but on five of the ten a ring can land on: `--st-info-bg` 2.99, `--st-warning-bg` 2.93,
`--st-success-bg` 2.92, `--sf-sunken` 2.90, `--st-neutral-bg` 2.82. That is every form well and four
of the six status surfaces.

**Re-scored.** Axis 4 on every screen in the rubric's section 4, at every frame, in Dark: 1 before
the ruling, 3 after it. The worst Dark pair is now 6.84 and the worst Light pair 3.90, both above
the 3.0 floor, measured by the twenty-pair sweep `apps/web/src/theme/token-contrast.unit.test.ts`
gained in the same change, which also fails if `--focus-color` is ever pointed back at a `var()`.
The 3 this review recorded for axis 4 in Dark was wrong on the day it was written; it is right now
for a different reason, which is that the value changed.

Nothing in this lane touched a token. The ring measurement in F-29 resolves `--focus-color` from the
element's own cascade rather than from a literal, so it measures whichever value is in the tree and
needed no change when the ruling landed.

## What now holds these in place

| Row | Gate |
| --- | --- |
| 006D-AC-003, hand-built layers | `tooling/tests/unit/design-quality/hand-built-layers.test.ts` reads the dialog role, `aria-modal`, and the background scroll lock across every screen file, so a layer that spells its role instead of its tag is caught. |
| 006C-AC-013, placement | `guided-setup.tablet-anchoring.spec.ts` asserts the placement the model chose, the geometry that placement implies, and the two things a bottom sheet fails, at 768 and 1180. `panel-placement.unit.test.ts` holds the arithmetic, including the stale measurement. |
| 006D-AC-006 | The reduced-motion pass now covers the seven account screens as well as the nine synthetic ones. |
| 006D-AC-007 and 006D-AC-008 | The boundary page is a screen in the synthetic matrix: axe, keyboard, motion, target size, and a picture at four frames in both themes, plus a 404 assertion from the review side. |
| 006D-AC-009 | The walk measures the brief's three tokens on the control, budgets its stops from the page, and hit-tests the focused control's corners for SC 2.4.11. |
| 006D-AC-011 | The create screen's failure is produced from the real server and measured: announced, positioned, and connected. |

## Still open after this lane

- **006D-AC-015**, the orchestrator's sign-off, unchanged.
- **The baselines.** Three groups of pictures move with this lane and must be redrawn on the
  `ubuntu-24.04` runner before they gate anything: the guided-setup panel at 768, which stops being
  a bottom sheet (F-25); the guided-setup panel wherever the sticky footer changes it (F-26); and
  the whole `design-surfaces` set, which is new (F-28). The mobile-drawer capture may move where the
  primitive's surface differs from the hand-built one (F-24). This paragraph is the 006D-AC-013 note
  for all four.
