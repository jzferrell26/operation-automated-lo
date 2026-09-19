# The Scored Design Review

Recorded 2026-09-19 for PRD-006d, acceptance criterion 006D-AC-001. Owner:
`ux-ui-guardian`. Every review in PRD-006 and every review after it cites this
file together with [the design brief](00-design-brief.md) or the applicable
component or screen specification, per brief section 20.

The product owner's rule for this batch, verbatim: "Design of the UI must be a
10/10. If it doesn't look good, that's an issue." The rubric is how that rule
becomes checkable instead of arguable.

## 1. The scale

Each axis in section 2 is scored 0 to 3 for each screen, at each frame, in each
theme.

| Score | Meaning |
|---|---|
| 3 | On brief with no delta. Every token, spacing step, type step, state, and behaviour matches the brief or the applicable spec, and the screen reads as a sibling of the canvases in `05-html-examples/claude-design/`. |
| 2 | One or more deltas a user would not notice but a reviewer does: a 14px gap where `--space-4` is required, a caption at `--text-secondary-size` where `--text-caption-size` is required. |
| 1 | A visible delta: a raw element where a primitive exists, a missing state, a frame that overflows. |
| 0 | Off brief: a raw hex value, a glassmorphism panel on a dashboard, a status carried by color alone. |

**The bar is 3 on every axis, for every screen, at every frame, in both themes.**
Anything below 3 is a defect with a delta in the section 3 form and a fix in the
same batch. There is no "accepted at 2". A finding is closed by a fix or by a
recorded, owned, dated entry in section 5, never by agreement that it is fine.

## 2. The axes

1. **Hierarchy.** One primary action per screen. Page, section, and card titles
   at their type steps from brief section 10. The eye lands where the screen
   spec says it should. Never "a page of identical cards with equal visual
   weight" (brief section 4).
2. **Spacing rhythm.** Every gap, padding, and margin is a `--space-*` token.
   Vertical rhythm is consistent within a screen and across sibling screens.
3. **Typography.** `var(--font-interface)` and `var(--font-data)`. The six steps
   and the weights come from the tokens. Data, identifiers, versions, hashes,
   and timestamps use the data font. No ad-hoc size.
4. **Color and contrast.** Semantic tokens only. The color roles of brief
   section 9. WCAG AA measured, not eyeballed, in both themes. Status never by
   color alone.
5. **States.** Default, hover, focus-visible, active, disabled with the reason
   adjacent, loading with the label retained, error connected to the field,
   empty, permission-restricted, and not-connected, each present where the spec
   calls for it.
6. **Motion.** Only `--motion-fast`, `--motion-base`, `--motion-slow`, and
   `--ease-standard`. Ambient motion only where brief section 12 allows it. Zero
   motion under `prefers-reduced-motion`.
7. **Responsiveness.** Correct composition at 1440, 1180, 768, and 390. No
   horizontal overflow. The frame's rules from brief section 14. 44 by 44
   targets. A sticky surface never covers a field, an error, or a focus ring.
8. **Dark and Light.** Every state in both themes. Theme before first paint. No
   element that only works in one theme.
9. **Empty and error states.** `AsyncState` variants, not hand-built views.
   Honest not-connected states. The error says what happened and what to do next.
10. **Consistency with the canvases.** Where a canvas exists, the screen reads as
    its production sibling. Where none exists (sign-in, reset, walkthrough,
    settings, reports), the screen reads as a sibling of the nearest canvas and
    the review names the specs it follows.

## 3. The only accepted finding form

A finding names, in this order: the screen, the frame, the theme, the state, the
file and line, the current value, the token or rule it must be, and the axis it
fails.

> The gap between the fields on sign-in at 390 in Dark is 14px
> (`sign-in.module.css:41`); it must be `--space-4`; axis 2.

A finding without a token or a specification reference is returned to the
reviewer unreviewed. A screenshot without a file and line is evidence, not a
finding.

## 4. Screens in scope

Scored at 1440, 1180, 768, and 390, in Light and Dark, in every named state:

- **Authentication.** Sign in, choose workspace, sign up, forgot password, reset
  password, verify email, change password.
- **Shell.** Rail, collapsed rail, tablet rail, topbar, mobile drawer,
  not-connected banner, "Finish setup" chip, help menu.
- **Workspace.** Overview; campaigns list, empty and populated; create, in its
  empty, prefilled, saving, "Ready for approval", and "Needs changes" states;
  campaign detail with approval, in its ready, permission-restricted, approved,
  and already-decided states; reports, not connected; onboarding; settings and
  connections; brand.
- **Guided setup.** Each of the seven steps at each anchor position, plus the
  unverified-email notice.
- **Boundaries.** The route error boundary and the route loading boundary.
- **Email.** Both transactional emails rendered at 600px in a mail-client
  preview, scored on hierarchy, typography, contrast, and copy only.

## 5. Open deltas carried out of PRD-006d

Each entry names the measurement, the owner, and the fix. An entry here is not an
acceptance; it is a debt with an address.

| # | Delta | Measurement | Owner | Fix |
|---|---|---|---|---|
| D-001 | The focus ring is below the non-text floor on a Dark sunken surface. `--focus-color` is `var(--ac-primary)`, and the rendered Dark `--ac-primary` is `#3566d6`. | 2.90:1 against `--sf-sunken` `#22262f`; 3.20:1 against `--sf-card`. WCAG 2.2 SC 1.4.11 needs 3.0. | `design-system-guardian` | A Dark focus token that does not follow the tenant accent. The rendered value comes from the tenant accent catalog in `apps/web/src/theme/tenant-accent.ts`, which PRD-006d's primitives slice may not edit, so the fix needs its own change. |
| D-002 | The control boundary is well below the non-text floor. `--bd-input` on `--sf-card`. | 1.27:1 in Light, 1.94:1 in Dark. | `design-system-guardian` | Not a defect on its own: every governed field carries a persistent visible label and a description, so the boundary is never the only thing identifying the control, and SC 1.4.11 is met by the label. It becomes a defect the moment a screen ships a placeholder-only field, which the field specification forbids. Revisit if the palette is ever re-tuned. |
| D-003 | `.oalo-action-link` still exists in `apps/web/src/app/globals.css`, and 17 raw `<a className="oalo-action-link">` call sites across 9 files still use it. | Source scan on 2026-09-19. | The page-builder lane, under 006D-AC-003 | Replace each call site with `<Link variant="action">` and delete the class. The class is annotated as superseded and must not be used by a new screen. |
| D-004 | `Select` and `Tabs` have no primitive, so two reporting components still render a raw `<select>`. | `apps/web/src/features/reporting/components/**`. | Deferred by PRD-006d D4 | Nothing in PRD-006 needs them. Add them before the first screen that does. |
| D-005 | The `/demo` route carries a private nine-token palette, 76 hex values, a `backdrop-filter`, and no Dark block. | `apps/web/src/components/demo/founding-offer-demo.module.css`. | Recorded, not fixed | Out of scope by PRD-006d Non-Goals. It never renders in review mode. Nothing in review mode links to it. |

## 6. What the automated gates already prove, so a reviewer does not re-check it

A reviewer scores what a machine cannot. These run on every change:

| Axis | Gate |
|---|---|
| 4, colour and contrast | `apps/web/src/theme/token-contrast.unit.test.ts` measures every rendered text-on-surface pair in both themes on `pnpm test:unit`. `apps/web/src/theme/delivered-semantic-surfaces.unit.test.ts` fails any raw color literal in a delivered stylesheet. |
| 5, states | The component tests in the `components` vitest project render every state of every primitive and assert its accessibility contract. |
| 6, motion | The browser suite asserts zero computed animation and zero transition duration under `prefers-reduced-motion`, and every feature CSS module now carries its own reduced-motion block. |
| 7, responsiveness | The browser suite runs the matrix at 1180, 768, and 390, asserts no horizontal overflow, and fails any visible interactive element under 44 by 44. |
| 8, Dark and Light | The browser suite chooses each theme and asserts the theme resolves before first paint with no Light flash. |
| 4 and 9, accessibility | `AxeBuilder` runs unfiltered on each route, at each frame, in each theme, and requires an empty violation list. |

A reviewer who finds something one of these gates should have caught files a
finding against the gate, not only against the screen.
