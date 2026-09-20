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
  `03-components/form-field-and-text-inputs.md` and `03-components/password-field.md`.
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
- **The Windows-generated baselines.** Every picture under `tests/visual/screens/` was generated in
  this lane's Chromium on Windows and carries the `-win32` platform suffix. They must be
  regenerated on the `ubuntu-24.04` runner before they gate anything;
  `tests/visual/screens/README.md` says exactly how, and Playwright will never silently compare a
  Windows baseline against a Linux run because the platform is part of the filename.
