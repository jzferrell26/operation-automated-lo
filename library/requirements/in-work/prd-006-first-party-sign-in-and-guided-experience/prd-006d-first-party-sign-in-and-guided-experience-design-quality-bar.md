# PRD-006d: First-Party Sign-In and Guided Experience - Design Quality Bar, 10 of 10

> **Parent:** [PRD-006](./prd-006-first-party-sign-in-and-guided-experience-index.md)
> **Status:** Draft
> **Priority:** P0 (owner requirement 4: if it does not look good, that is a defect)
> **Schema changes:** None
> **Owner Guardians:** `ux-ui-guardian` (the scored review of every screen), `design-system-guardian` (the new primitives and the token reconciliation, system-level change per the source-of-truth README), `react-guardian` (component work), `typography-font-guardian` (the font pipeline repair), the orchestrator (the final visual sign-off with real screenshots)

## Goal

Every screen a user sees, including the sign-up, sign-in, forgot-password, reset, verification, and workspace-choice pages and every guided-setup step, is reviewed against the design brief and the token contract on a scored rubric and ships only at the top score on every axis. Anything below the top score is a defect that is fixed in the same batch, never documented as accepted. The review is backed by accessibility checks, visual regression screenshots, and a final sign-off by the orchestrator from real screenshots of the running application.

## Background (honest)

Verified in the worktree at `a3b06e6` on 2026-09-19.

**The source of truth and its authority.** `library/knowledge/private/ux-ui/README.md` sets the order: approved PRDs and verified contracts, then the design brief, then the tokens and surface utilities, then component and screen specs, then the Claude Design canvases (lines 9-13); the canvases are "visual reference photographs" and not production code (line 15); `design-system-guardian` owns system-level change and `ux-ui-guardian` owns enforcement and implementation review (lines 33-35); production React "must consume product wrappers and semantic tokens" and never copy canvas inline styles or raw hex (line 37).

**The brief's rules the rubric scores against** (`library/knowledge/private/ux-ui/00-design-brief.md`): the identity in section 3 (line 28: "flat-modern operational interface with a deep navy anchor, cobalt primary actions, restrained teal accents, crisp cards, compact data") and the boundaries in section 4 (lines 44-51: not a generic CRM clone, not "a page of identical cards with equal visual weight", not "a glassmorphism demonstration"); the type scale in section 10 (lines 163-170: Geist and Geist Mono; 23 px page title, 17 px section, 14 px card, 13 px body, 11.5 px secondary, 10.5 px caption); the spacing rhythm 4, 8, 12, 16, 20, 24, 32 px and the radii 8, 10, 12 to 14, and 16 px in section 11 (lines 178-192); the color roles in section 9 (lines 148-157, "Status never depends on color alone"); the motion buckets 120, 180, 240 ms and reduced motion in section 12 (lines 211-215); Light, Dark, and System behaviour in section 13 (lines 218-224: theme before first paint, no reload, no state loss); the four frames 1440, 1180, 768, 390 and the layout rules per frame in section 14 (lines 241-256, including 44 by 44 targets at line 256); the accessibility baseline in section 18 (lines 310-318: WCAG AA in both themes, the 2 px ring with 3 px offset, inline errors connected to the field, "accessible authentication without cognitive-function tests"); and the pre-ship checklist in section 19 (lines 324-333): semantic token use, product component wrappers, Light and Dark, embedded and mobile composition, all interactive states, accessibility, provider and compliance truth, and the PRD's acceptance criteria. Section 20 (lines 337-339) requires every implementation review to cite the brief or the applicable spec.

**Tokens, and where they have drifted.** The brief's token file `01-master-tokens.css` and the shipped `packages/ui/src/tokens.css` are two files that disagree on several colors, each re-tuned for contrast on the shipped side (`--tx-faint` `#667085` at `tokens.css:18` against `#98a2b3` at `01-master-tokens.css:16`; `--st-info-fg`, `--st-uncertain-fg`, the dark `--ac-primary`, `--st-critical-fg`, `--st-info-fg`, and `--bd-hairline` likewise), with no reconciliation note; the shipped file adds `--breakpoint-*` for the four frames (lines 90-93), `--weight-*`, `--leading-*`, and `--tracking-page` that the brief file lacks. The brief's surface utilities in `02-surfaces-and-borders.css` (`.ui-card`, `.ui-focusable`, and the rest) have zero consumers in `apps/` or `packages/`; the shipped implementation is the `oalo-*` classes in `packages/ui/src/components/primitives.css`. `apps/web/src/app/globals.css:4-11` sets `font-family: Inter, ui-sans-serif, system-ui` rather than `var(--font-interface)` and never loads Geist, against section 10 line 163; the brief says production font delivery must be self-hosted or through the app's font pipeline (line 172), and the browser gate forbids any external request (`tests/browser/ui-foundation-ux.spec.ts:16-38`), so a Google Fonts link is not an option. `.oalo-action-link` is a hand-rolled link primitive in `globals.css:22-40`.

**The shipped primitives and what is missing.** `packages/ui/src/index.ts` exports fifteen components: `Button`, `SafeAction`, `Icon`, `IconButton`, `ThemeSegmentedControl`, `AsyncState` with five aliases, `Metric`, `OnboardingChecklist`, `OnboardingChecklistItem`, `Card`, `Stack`, `Surface`. The component CSS is token-clean (zero hex in `Button.module.css`, `Icon.module.css`, `ThemeSegmentedControl.module.css`, and `primitives.css`; the 44 px target is `calc(var(--space-8) + var(--space-3))` at `primitives.css:252-253`). There is no text input, password field, form-field wrapper, link, dialog, sheet, popover, tooltip, stepper, toast or live region, badge, tabs, table, or select. Consequently feature code uses raw elements: ten raw `<input>` and two raw `<label>` in `apps/web/src/features/campaigns/components/open-house-draft-builder.tsx`, raw `<select>` in two reporting components, raw `<a>` in five files. The brief's a11y baseline (section 18 line 317, inline errors connected to the field) and the campaign lifecycle spec (`04-screens/campaign-lifecycle.md:11`, the required form states) have no primitive to land on.

**Feature CSS.** The six `features/**/*.module.css` files are token-clean on color; their pixel literals are 44 px targets, 1 px borders paired with border tokens, and breakpoint values. One breakpoint is off-brief: `760px` at `open-house-draft-builder.module.css:134` (the frames are 390, 768, 1180, 1440). A `prefers-reduced-motion` block exists in `app-shell.module.css:324` and in no other feature module. The `/demo` route's `apps/web/src/components/demo/founding-offer-demo.module.css` carries a private nine-token palette (lines 2-10), 76 hex values, `backdrop-filter: blur(12px)` (line 95), and no dark block; it is a synthetic-mode demo that never renders in review mode.

**Canvases.** The fourteen `.dc.html` canvases under `05-html-examples/claude-design/` cover the overview, dashboard, campaigns, create, studio, preflight and approval, launch, campaign detail, onboarding, brand, welcome, and the design system. None covers sign-in (the only hits are an authenticated chip and a "Sign in directly" link in `Welcome.dc.html`), password reset, a walkthrough, settings, or reports; `04-screens/onboarding-brand-and-platform-settings.md:84-86` says the settings surfaces still need canvases or implementation-ready specs. Where no canvas exists, the brief and the component specs are the reference, and the new screens must read as siblings of the canvases that do exist.

**Tests that exist.** `@axe-core/playwright` 4.12.1 is a root devDependency (`package.json:37`) and `assertAxeClean` (`ui-foundation-ux.spec.ts:45-54`) runs it with no rule filtering and requires an empty violation list; the matrix covers `{overview, onboarding} x {Light, Dark} x {1180x900, 390x844}` (lines 234-257) and four more routes (lines 330-354). The suite also checks the focus ring (`outline-width: 2px`, `outline-offset: 3px`), 44 px targets, reduced motion, the drawer, first-paint theme, and priority order at 1180 and 390 (lines 61-232). It has one Chromium project (`playwright.config.ts:29-34`), sets viewports per test, never exercises the 768 frame, and takes screenshots only as evidence under `OALO_REGENERATE_UI_EVIDENCE=true` (line 7), never compared. There is no `toHaveScreenshot`, `snapshotDir`, or `updateSnapshots` anywhere. `tests/visual/` is a vitest project of byte-level rendering goldens for public artifacts (`tests/visual/rendering-golden.test.ts`, `prd001d-rendering.test.ts`), not UI screenshots. The contrast math for tenant accents already exists in code (`apps/web/src/theme/tenant-accent.ts:81-125`, WCAG relative luminance and a 4.5 minimum).

**Constraints.** No new dependency without cause under `saveExact` and strict peers; no external request in the browser suite; no em dash or en dash; `security-guardian` before `quality-guardian`.

## Scope

- The rubric (D1, D2), the screens in scope (D3), and the bar.
- The primitives the new screens need, added to `packages/ui` with specs (D4).
- Repair of the known drift that would fail the rubric on every screen (D5).
- Token-term deltas as the only accepted finding format (D6).
- Accessibility: axe on every screen, keyboard, focus, contrast measured from tokens (D7).
- Visual regression screenshots captured by the browser suite and stored in the repository (D8).
- The final visual sign-off by the orchestrator (D9) and the rule that no UI ships without the review (D10).

## Non-Goals

- A system-wide aesthetic overhaul, a new palette, or a new brief. The brief is the standard; this sub-PRD enforces it and adds what it already implies.
- Redesigning the `/demo` route or the synthetic-mode reporting gallery. They never render in review mode; their drift is recorded, not fixed here.
- Cross-browser visual baselines. Chromium on the CI runner is the baseline platform; Firefox and WebKit are later work.
- Pixel-perfect matching of the canvases. The canvases are references; the rubric's consistency axis asks whether a screen reads as their sibling, not whether it is a copy.

## Design decisions

### D1. The bar and the scale

Each axis in D2 is scored 0 to 3 per screen, per frame, per theme:

- 3: on brief with no delta. Every token, spacing, type step, state, and behaviour matches the brief or the applicable spec, and the screen reads as a sibling of the canvases.
- 2: one or more deltas that a user would not notice but a reviewer does (a 14 px gap where `--space-4` is required, a caption at 11.5 px instead of 10.5 px).
- 1: a visible delta (a raw element where a primitive exists, a state missing, a frame that overflows).
- 0: off brief (raw hex, a glassmorphism panel on a dashboard, a color-only status).

The bar is 3 on every axis for every screen at every frame in both themes. Anything below 3 is a defect with a token-term delta (D6) and a fix in the same batch. There is no "accepted at 2".

### D2. The axes

1. **Hierarchy.** One primary action per screen; page, section, and card titles at their type steps; the eye lands where the brief's screen spec says it should; no "page of identical cards".
2. **Spacing rhythm.** Every gap, padding, and margin is a `--space-*` token; vertical rhythm is consistent within a screen and across sibling screens.
3. **Typography.** `var(--font-interface)` and `var(--font-data)`; the six steps and the weights from the tokens; data, ids, and timestamps in the data font; no ad-hoc sizes.
4. **Color and contrast.** Only semantic tokens; the color roles of section 9; WCAG AA measured, not eyeballed, in both themes; status never by color alone.
5. **States.** Default, hover, focus-visible, active, disabled with the reason adjacent, loading with the label retained, error connected to the field, empty, permission-restricted, and not-connected, each present where the spec calls for it.
6. **Motion.** Only the three buckets and `--ease-standard`; ambient motion only where the brief allows; zero motion under reduced motion.
7. **Responsiveness.** Correct composition at 1440, 1180, 768, and 390: no horizontal overflow, the frame's layout rules from section 14, 44 by 44 targets, sticky surfaces never covering focus or errors.
8. **Dark and Light.** Every state in both themes; theme before first paint; no element that only works in one theme.
9. **Empty and error states.** `AsyncState` variants used, not hand-built; honest not-connected states in PRD-006b language; the error state shows what happened and what to do next.
10. **Consistency with the canvases.** Where a canvas exists, the screen reads as its production sibling; where none exists (sign-in, reset, walkthrough, settings, reports), the screen reads as a sibling of the nearest canvas and cites the specs it follows.

### D3. Screens in scope

Every screen is scored at all four frames in both themes with its states: sign-in, choose workspace, sign-up, forgot-password, reset-password, verify-email, change-password (`/settings/account`); the shell (rail, collapsed rail, topbar, mobile drawer, not-connected banner, "Finish setup" chip, help menu); overview; campaigns list (empty and populated); create (empty, prefilled, saving, "Ready for approval", "Needs changes"); campaign detail with approval (ready, permission-restricted, approved, already decided); reports (not connected); onboarding; settings and connections; brand; each of the seven guided-setup steps at each anchor position; the unverified-email notice; the route error and loading boundaries; and both transactional emails rendered in a mail client preview (a static HTML render at 600 px, reviewed for the same axes that apply to email: hierarchy, typography, contrast, and copy).

### D4. The primitives the new screens need

Added to `packages/ui` before the sign-in pages and the guided-setup panels are built, each with a spec in `library/knowledge/private/ux-ui/03-components/` authored by `design-system-guardian`, a component test, and no dependency:

- `TextField` and `TextArea`: label, optional description, error text connected through `aria-describedby`, `aria-invalid`, required marker, `autocomplete` passthrough, sizes per the control radius and type steps, all states.
- `PasswordField`: `TextField` plus a show and hide control with an accessible name ("Show password" / "Hide password"), no `title`-only naming, and the brief's "no cognitive-function test" rule.
- `FormField`: the wrapper the two above use, so inline errors are always connected to the field (brief section 18 line 317).
- `Link`: the product link primitive, moving `.oalo-action-link` out of `globals.css:22-40`, with a 44 px target on mobile and the shared focus ring.
- `Sheet`: the non-modal anchored panel and bottom sheet PRD-006c D6 and D7 specify, sharing focus utilities with a `Dialog` that generalizes the `alertdialog` behaviour in `Button.tsx:180-190,247-257` (focus move, Escape, return) and the drawer's trap in `app-shell.tsx:47-97`.
- `Stepper`: "Step n of m" with a labelled progress bar, for the guided setup and later for the six-stage campaign stepper in `03-components/campaign-and-artifact-workflow.md:8-18`.
- `Badge`: the status pill from `03-components/status-feedback-and-attention.md:9-16`, exporting what `primitives.css:144-198` already styles internally.
- `LiveRegion`: a `role="status"` and `role="alert"` announcer for step changes and form results, per `status-feedback-and-attention.md:67-69`.

`Select` and `Tabs` are noted as missing and deferred; nothing in PRD-006 needs them.

### D5. Repair the drift that would fail every screen

- `globals.css:4-11`: `font-family: var(--font-interface)` and the data font where `--font-data` applies; Geist and Geist Mono self-hosted under `apps/web/public/fonts/` with `@font-face` and `font-display: swap`, or, if the licence or the pipeline is not settled in this batch, the system sans stack from the tokens with the decision recorded; `typography-font-guardian` rules on the pipeline. No external font request is allowed by the browser gate either way.
- Token reconciliation: `01-master-tokens.css` is updated to the shipped, contrast-validated values or gains a dated reconciliation note per differing token, so the brief and the product agree; the dead `.ui-*` utilities in `02-surfaces-and-borders.css` are either removed or annotated as reference-only with a pointer to `primitives.css`. `design-system-guardian` owns this change and records it in the README's artifact table.
- `open-house-draft-builder.module.css:134`: `760px` becomes the tablet frame.
- Every feature CSS module gains a `prefers-reduced-motion` block or is proven to have no motion.
- The `/demo` route's palette is recorded as out of scope in the sign-off document, not fixed.

### D6. Deltas in token terms

A finding is accepted only in this form: screen, frame, theme, state, the file and line, the current value, the token or rule it must be, and the axis it fails. "The gap between the fields on sign-in at 390 is 14 px (`sign-in.module.css:41`); must be `--space-4`; axis 2." A finding without a token or spec reference is returned to the reviewer.

### D7. Accessibility

- axe through the existing `AxeBuilder` helper on every screen in D3 at all four frames in both themes, zero violations, with the 768 frame added to the matrix for the first time.
- Keyboard: every screen operable end to end without a pointer; focus order follows reading order; the focus ring is the shared 2 px ring with 3 px offset and is never obscured (existing assertions extended to the new screens).
- Contrast measured from tokens: a unit test computes the WCAG ratio, using the luminance functions in `tenant-accent.ts:81-95`, for every text-on-surface pair the screens use (`--tx-strong`, `--tx-body`, `--tx-faint` on `--sf-canvas`, `--sf-card`, `--sf-sunken`, `--sf-nav`; `--tx-on-action` on `--ac-primary` and `--ac-primary-hover`; each `--st-*-fg` on its `--st-*-bg`) in both themes and fails below 4.5 for body text and 3.0 for large text and UI components.
- Forms: every error is connected to its field, announced on submit, and visible without scrolling on the frame it occurs in.

### D8. Visual regression screenshots

- Playwright `toHaveScreenshot` is introduced with `snapshotPathTemplate: "tests/visual/screens/{projectName}/{arg}{ext}"`, so baselines live under `tests/visual/screens/` beside a README that explains the difference from the rendering goldens in `tests/visual/rendering/`.
- One screenshot per screen, frame, theme, and named state from D3, captured by the synthetic-mode browser suite for the workspace screens and by PRD-006c's `review` project for the auth pages and guided-setup steps; all data on screen is synthetic or the seeded review rows, never a real address or name.
- `maxDiffPixelRatio: 0.001`, `animations: "disabled"`, fonts self-hosted (D5) so rendering is deterministic; baselines are generated on the `ubuntu-24.04` runner's Chromium and carry Playwright's platform suffix; Windows and macOS runs compare informationally and never commit baselines.
- Updating a baseline requires the `ux-ui-guardian` review of the change in the same pull request; a baseline diff without a review note is a blocking finding.

### D9. The final visual sign-off

After the scored review, axe, and the screenshot suite are green, the orchestrator runs the application (synthetic mode locally for the workspace screens; PRD-006c's review-mode server or the deployed review URL with the operator present for the auth and setup pages), takes real screenshots of every screen in D3 at all four frames in both themes, reviews each against the D2 axes, and records the result in `docs/operations/evidence-packs/design-quality-signoff.md`: date, commit, screen, frame, theme, state, pass or fail per axis, and the finding reference for any fail. The screenshots themselves are retained outside git (they are large and some come from the deployed URL); only the table is committed. A fail on any axis returns the batch to implementation. The sign-off is repeated on the final tree after every fix.

### D10. No UI without the review

No pull request in PRD-006 that adds or changes a user-visible screen merges without: the `ux-ui-guardian` scored review recorded in the pull request citing the brief or spec sections per section 20; axe and the screenshot suite green; the contrast test green; and, for the final tree, the D9 sign-off table. Shipping UI without the review is prohibited, not discouraged.

## Acceptance criteria

| ID | Criterion | Owner requirement |
|---|---|---|
| 006D-AC-001 | The rubric (D1 scale, D2 axes, D3 screens) is recorded in `library/knowledge/private/ux-ui/06-review-rubric.md`, added to the README's artifact table, and cited by every review in this PRD. | 4 |
| 006D-AC-002 | The D4 primitives exist in `packages/ui` with exported types, a `03-components/` spec each, component tests covering every state and the accessibility contract, zero hex or raw pixel values outside 1 px borders and the 44 px target, and no new dependency. | 4 |
| 006D-AC-003 | No user-visible screen in D3 renders a raw `<input>`, `<textarea>`, `<a>`, or hand-built dialog where a D4 primitive exists; a source scan over `apps/web/src/app` and `apps/web/src/features` proves it (the reporting components' `<select>` is recorded as deferred). | 4 |
| 006D-AC-004 | `globals.css` uses `var(--font-interface)` and `var(--font-data)`; the font pipeline decision (self-hosted Geist or the system stack) is recorded with `typography-font-guardian`'s ruling; no browser test observes an external request. | 4 |
| 006D-AC-005 | `01-master-tokens.css` and `packages/ui/src/tokens.css` agree, or every differing token carries a dated reconciliation note; the `.ui-*` utilities are removed or annotated; the README artifact table records the change; `design-system-guardian` signs the change. | 4 |
| 006D-AC-006 | `open-house-draft-builder.module.css:134` uses the tablet frame; every feature CSS module has a `prefers-reduced-motion` block or a recorded proof of no motion; the browser suite's zero-motion assertion passes on every screen in D3. | 4 |
| 006D-AC-007 | `ux-ui-guardian`'s scored review covers every screen, frame, theme, and state in D3, is recorded in the pull requests in the D6 form, cites the brief or spec sections, and ends with every axis at 3; no finding is closed as accepted. | 4 |
| 006D-AC-008 | axe reports zero violations for every D3 screen at 1440, 1180, 768, and 390 in Light and Dark, including every guided-setup step and the auth pages through the `review` project. | 4 |
| 006D-AC-009 | Every D3 screen is operable end to end with the keyboard alone; the focus ring is 2 px with a 3 px offset and never obscured; the browser suite asserts it on each screen. | 4 |
| 006D-AC-010 | The token contrast test in D7 exists, covers every listed pair in both themes, and passes; any token change that would fail it fails `pnpm test:unit`. | 4 |
| 006D-AC-011 | Every form error on the auth pages, the create page, and the guided-setup steps is connected to its field through `aria-describedby`, announced through the `LiveRegion`, and visible without scrolling at 390; proven by component and browser tests. | 4 |
| 006D-AC-012 | Playwright screenshot comparison exists with the D8 configuration; baselines exist for every screen, frame, theme, and named state in D3 under `tests/visual/screens/`; the README distinguishes them from the rendering goldens; the suite runs in `pnpm verify:offline` (synthetic screens) and `pnpm test:db` (review screens) and passes. | 4 |
| 006D-AC-013 | A baseline change in a pull request carries an `ux-ui-guardian` review note naming the intended visual change; a test in `tooling/tests/unit/` or a CI step fails a pull request whose baseline diff has no such note (the note is a line in the pull request template checklist). | 4 |
| 006D-AC-014 | The two transactional emails render at 600 px in a static preview route available only in synthetic and test modes, are reviewed on the email axes, and are screenshotted like any screen. | 4 |
| 006D-AC-015 | `docs/operations/evidence-packs/design-quality-signoff.md` exists with the D9 table for the final tree: every screen, frame, theme, and state, pass on every axis, the commit, the date, and a statement that the screenshots are retained outside git and contain no real personal data. | 4 |
| 006D-AC-016 | No pull request in PRD-006 that changes a user-visible screen merged without the D10 gate; the pull request checklist template includes the four items and each PRD-006 pull request shows them checked. | 4 |
| 006D-AC-017 | The 768 frame is part of the browser suite's viewport matrix for every D3 screen, and the brief's tablet layout rules (collapsible rail, single-column forms) are asserted there. | 4 |
| 006D-AC-018 | The `/demo` route and the synthetic reporting gallery are listed in the sign-off document as out of scope with their recorded drift, and nothing in review mode links to them. | Constraint |
| 006D-AC-019 | `pnpm verify:offline` and `pnpm test:db` are green; `security-guardian` reviews the new primitives for injection and focus-trap escapes and the preview route's mode gate before `quality-guardian` runs. | Constraint |

## Files expected to change

- `library/knowledge/private/ux-ui/06-review-rubric.md` (new), `README.md` (artifact table), `01-master-tokens.css` and `02-surfaces-and-borders.css` (D5), `03-components/{text-field,password-field,form-field,link,sheet-and-dialog,stepper,badge,live-region}.md` (new).
- `packages/ui/src/components/{TextField,TextArea,PasswordField,FormField,Link,Sheet,Dialog,Stepper,Badge,LiveRegion}.tsx` and `.module.css` (new), tests beside them, `packages/ui/src/index.ts` (exports).
- `apps/web/src/app/globals.css:4-11,22-40`, `apps/web/public/fonts/*` (if self-hosted), `apps/web/src/app/layout.tsx` (font loading).
- `apps/web/src/features/campaigns/components/open-house-draft-builder.tsx` and `.module.css:134`, every feature module without a reduced-motion block, every screen in D3 that uses a raw element.
- `apps/web/src/app/(public)/email-preview/page.tsx` (new, synthetic and test modes only).
- `playwright.config.ts` (screenshot configuration, the 768 viewport in the matrix), `tests/browser/ui-foundation-ux.spec.ts` (matrix extension), `tests/browser/design-quality.spec.ts` (new), `tests/browser/review/design-quality.spec.ts` (new), `tests/visual/screens/**` (baselines) and `tests/visual/screens/README.md` (new).
- `apps/web/src/theme/token-contrast.unit.test.ts` (new).
- `.github/pull_request_template.md` (new or extended with the D10 checklist).
- `docs/operations/evidence-packs/design-quality-signoff.md` (new).

## Test plan

- **Components** (`pnpm test:components`): every D4 primitive's states and accessibility contract.
- **Unit** (`pnpm test:unit`): the token contrast test; the raw-element source scan; the baseline-note check.
- **Integration** (`pnpm test:integration`): each D3 screen renders every named state with the primitives.
- **Browser, synthetic** (`pnpm test:browser`): axe, keyboard, focus, target size, reduced motion, and screenshots for the workspace screens at all four frames in both themes.
- **Browser, review** (`pnpm test:db`, PRD-006c's `review` project): the same for the auth pages and the guided-setup steps.
- **Review and sign-off**: `ux-ui-guardian`'s scored review per pull request; the orchestrator's D9 sign-off on the final tree.

## Security notes

- The new primitives render user-provided text (names, addresses, error messages) and must escape it as React does by default; no `dangerouslySetInnerHTML` is introduced. `Sheet` and `Dialog` must not allow focus to escape to hidden content behind a modal and must not leave `aria-hidden` on the page after close.
- The email preview route is gated to synthetic and test modes and renders templates with placeholder names only.
- Screenshots in the repository contain only synthetic or seeded review data; the sign-off screenshots from the deployed URL are retained outside git and never include a form with a value in it, a cookie store, or developer tools.
- Self-hosted fonts, if adopted, are checked into `apps/web/public/fonts/` with their licence file; no font is fetched from a third party at runtime.

## Open questions

- [ ] Self-hosted Geist versus the system stack: depends on the licence check and the font pipeline; `typography-font-guardian` rules.
- [ ] Whether the baseline-note check is a unit test over the pull request body (needs the body as an input) or a CI step using `gh pr view`; either satisfies 006D-AC-013.
- [ ] Whether the email preview route should exist at all or the email templates should be screenshotted from a static file; recommendation: the route, because it renders through the same template code.
- [ ] Whether to score the `/demo` route now that it is out of review mode; recommendation: no, record and defer.

## Exact operator ask

Presence for the deployed half of the D9 sign-off: sign in on the review URL when asked so the auth pages and the guided-setup steps can be screenshotted with real data on screen (the seeded review names only), and allow the screenshots to be taken without any secret, cookie store, or developer tools visible. Nothing secret comes back through an agent.

## Blockers (honest)

| Blocker | Owner | Unblock |
|---|---|---|
| The D4 primitives must land before PRD-006a's pages and PRD-006c's panels | Engineering | Run the primitives slice of this sub-PRD first, in parallel with PRD-006a's backend |
| Font licence and pipeline decision | `typography-font-guardian` | Rule early; the system stack is the fallback |
| Baselines depend on the CI runner's Chromium | Engineering | Generate on the runner, never on Windows |
| The deployed half of the sign-off needs the review URL and the operator | Operator | PRD-005e asks 1 to 5 |

## Related

- [PRD-006a](./prd-006a-first-party-sign-in-and-guided-experience-email-password-auth.md), [PRD-006b](./prd-006b-first-party-sign-in-and-guided-experience-user-language.md), [PRD-006c](./prd-006c-first-party-sign-in-and-guided-experience-guided-setup.md)
- [UX/UI source of truth README](../../../knowledge/private/ux-ui/README.md)
- [Design brief](../../../knowledge/private/ux-ui/00-design-brief.md)
- [Master tokens](../../../knowledge/private/ux-ui/01-master-tokens.css) and [surfaces and borders](../../../knowledge/private/ux-ui/02-surfaces-and-borders.css)
- [Component specs](../../../knowledge/private/ux-ui/03-components/application-shell-and-navigation.md) (and the other eight files in that folder)
- [Screen specs](../../../knowledge/private/ux-ui/04-screens/platform-overview.md) (and the other three files in that folder)
- [Claude Design canvases README](../../../knowledge/private/ux-ui/05-html-examples/claude-design/README.md)
- [Browser UX suite](../../../../tests/browser/ui-foundation-ux.spec.ts)
