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
| ~~D-001~~ | ~~The focus ring is below the non-text floor on a Dark sunken surface. `--focus-color` is `var(--ac-primary)`, and the rendered Dark `--ac-primary` is `#3566d6`.~~ **Ruled and closed 2026-09-20** by `design-system-guardian`; see the ruling below this table. | The audit found it worse than recorded: below 3.0 on five of the ten surfaces a ring can land on, not one. | Closed | `--focus-color` is a dedicated literal per theme and no longer follows the tenant accent. `apps/web/src/theme/token-contrast.unit.test.ts` now measures the ring against all ten surfaces in both themes and fails any re-coupling. |
| D-002 | The control boundary is well below the non-text floor. `--bd-input` on `--sf-card`. | 1.27:1 in Light, 1.94:1 in Dark. Both reproduced by the 2026-09-20 audit. | Ruled 2026-09-20, recorded, not a debt | Confirmed as written, with the invariant that holds it now named: see the ruling below this table. |
| ~~D-003~~ | ~~`.oalo-action-link` still exists in `apps/web/src/app/globals.css`, and 17 raw `<a className="oalo-action-link">` call sites across 9 files still use it.~~ **Closed 2026-09-19** by the PRD-006d review, finding F-01 through F-13's F-02. | Source scan on 2026-09-19. | Closed | Every call site is `<Link variant="action">`; the class is deleted; `tooling/tests/unit/design-quality/governed-controls.test.ts` fails the build if either returns. |
| D-004 | `Select` and `Tabs` have no primitive, so three reporting controls still render a raw `<select>`. Since 2026-09-19 each one is wrapped in `FormField`, so its label and identifiers are governed and an inline error would connect; only the control's own appearance is still local. | `apps/web/src/features/reporting/components/**`. All three sites re-read on 2026-09-20. | Ruled 2026-09-20, deferral confirmed | The deferral stands and now has an end condition and an interim contract: see the ruling below this table. |
| D-006 | The Dark focus ring on a date, time, or datetime control is drawn by `:focus-within` rather than `:focus-visible`, because Chromium matches neither `:focus` nor `:focus-visible` on the outer control while a keyboard is in one of its shadow sub-fields. | Measured by `tests/browser/design-quality.spec.ts` on 2026-09-19. | Recorded, not a debt | This is a platform fact, not a drift. It is written down here and in `03-components/form-field-and-text-inputs.md` so that a future reviewer does not "simplify" the selector back to `:focus-visible` and silently remove the ring. |
| D-007 | A frame's focus ring cannot be painted by the parent document. The email preview's frame is a keyboard focus stop, and the ring a person sees inside it is the framed document's own. | Measured by `tests/browser/design-quality.spec.ts` on 2026-09-19. | Recorded, not a debt | The alternative, `tabindex="-1"` on the frame, was tried and is a WCAG failure: the email contains a link, and axe's `frame-focusable-content` catches it. The bordered viewport around the frame carries `:focus-within`, and the keyboard check states the exception. |
| D-005 | The `/demo` route carries a private nine-token palette, 76 hex values, a `backdrop-filter`, and no Dark block. | `apps/web/src/components/demo/founding-offer-demo.module.css`. | Recorded, not fixed | Out of scope by PRD-006d Non-Goals. It never renders in review mode. Nothing in review mode links to it. |
| ~~D-008~~ | ~~The tablet and embedded frames now open with the full 17rem rail and collapse to the 5rem compact rail.~~ **Ruled and closed 2026-09-20** by `design-system-guardian`: the collapsible rail as shipped is confirmed, and brief section 14 now states it with its content-column consequence. | `apps/web/src/features/shell/components/app-shell.module.css`, the tablet block, removed by the PRD-006d named-state review's F-19 on 2026-09-20. | Closed | Brief section 14 and `03-components/application-shell-and-navigation.md` now say what the stylesheet does, including the 496px column the expanded rail leaves at 768. See the ruling below this table. |

### The rulings of 2026-09-20

Recorded by `design-system-guardian`, the owner README.md names for system-level
change to this folder. Each ruling states what was measured, what was decided,
and what changed because of it. A delta above that points here is closed or
confirmed by the ruling with its number.

#### D-001, ruled: the focus ring stops following the tenant accent

The recorded measurement was right and incomplete. `--ac-primary` in Dark is
`#3566d6`, and against the ten surfaces a ring can actually land on it measures:

| Surface | Ratio | |
|---|---|---|
| `--sf-nav` `#0b1122` | 3.60 | passes |
| `--sf-canvas` `#14161b` | 3.47 | passes |
| `--st-critical-bg` `#2f1715` | 3.21 | passes |
| `--sf-card` `#1b1e25` | 3.20 | passes |
| `--st-uncertain-bg` `#241d3d` | 3.05 | passes |
| `--st-info-bg` `#16233f` | 2.99 | **fails** |
| `--st-warning-bg` `#2d2413` | 2.93 | **fails** |
| `--st-success-bg` `#132a20` | 2.92 | **fails** |
| `--sf-sunken` `#22262f` | 2.90 | **fails** |
| `--st-neutral-bg` `#242833` | 2.82 | **fails** |

Five failures, not one. The ring is below SC 1.4.11's 3.0 on every form well and
on four of the six status surfaces, which is most of the places a Dark keyboard
user spends time.

The cause is not the accent. `--ac-primary` is only ever a fill behind
`--tx-on-action`, it is never text, and at that job it is correct in both
themes. The cause is that `--focus-color` was `var(--ac-primary)`, so an
accessibility affordance inherited a brand value. `validateTenantAccent` in
`apps/web/src/theme/tenant-accent.ts` could never have caught this: it measures
`onAction` against `action` and never measures `action` against a surface, so
every future catalog entry could have repeated the failure silently.

**Ruled.** `--focus-color` is a dedicated literal per theme and no tenant accent
moves it. The ring is not a brand surface. Brief section 18 fixes its width and
its offset and says nothing about its hue, and section 9's tenant allowance
covers allowlisted semantic accents, which the ring is not.

- Light `--focus-color: #2f6fed`. This is the Light default accent's own value,
  so the default tenant renders exactly as before. Worst pair 3.90, on
  `--sf-nav`.
- Dark `--focus-color: #8bb0ff`. Worst pair 6.84, on `--st-neutral-bg`. It is
  the Dark informational blue, so it is not a new hue in the palette, but it is
  written as a literal rather than `var(--st-info-fg)` so that re-tuning the
  status role cannot move the ring.

Both values are in `packages/ui/src/tokens.css` and mirrored in
`01-master-tokens.css`, including its `prefers-color-scheme` block. No existing
measured pair moved: `--ac-primary` is unchanged in both themes.
`apps/web/src/theme/token-contrast.unit.test.ts` gained a sweep of the ring
against all ten surfaces in both themes, twenty assertions, plus one that fails
if `--focus-color` is ever pointed back at a `var()` or overridden in the tenant
blocks of `apps/web/src/app/globals.css`.

The one visible consequence: the `oalo-teal` tenant's ring was `#087f5b` in
Light and `#5ee0aa` in Dark. Both passed, but they are now the shared ring. That
is the intended effect of the ruling, not a regression.

#### D-002, ruled: confirmed, and the invariant that holds it is now named

Both measurements reproduce: `--bd-input` on `--sf-card` is 1.27:1 in Light and
1.94:1 in Dark. The reading in the entry is correct. SC 1.4.11 asks for 3.0 on
the visual information *required to identify* a component, and where a control
carries its own persistent visible label, the boundary is not that information.

The entry stated the conclusion without naming what holds it, which is how a
sound ruling rots into an assumption. It is held by exactly two things, and this
ruling names them so that relaxing either one reopens the entry:

1. `FormField`'s `label` prop is required, not optional
   (`packages/ui/src/components/FormField.tsx:76`). A governed field cannot be
   constructed without a label.
2. `tooling/tests/unit/design-quality/governed-controls.test.ts` fails the build
   on a raw `<input>` or `<textarea>`, so a field cannot reach a screen without
   going through `FormField`.

**Ruled.** Confirmed, recorded, not a debt. `--bd-input` is not re-tuned.
Raising it to 3.0 against the card would put a heavy line around every field at
rest, which brief section 8's crisp operational workspace and section 4's "calm
under pressure" both argue against, and it would move every committed
screenshot to fix a ratio that is not the one a person relies on. If either
invariant above is ever weakened, this entry reopens as a defect, not as a
discussion.

#### D-004, ruled: the deferral stands, with an end condition and an interim contract

All three sites were re-read on 2026-09-20 and the entry's description is
accurate: `reporting-acceptance-surface.tsx:178`,
`reporting-acceptance-surface.tsx:399`, and `support-time-entry.tsx:43` each
render a native `<select>` inside `FormField` with a required label, so the
label, the identifiers, and any future inline error are governed the same way as
every other field. Their appearance comes from one shared block,
`reporting.module.css:320-338`, which carries its own `:focus-visible` ring from
the focus tokens, not a local one.

**Ruled.** The deferral is confirmed. Nothing in PRD-006 needs either primitive,
and specifying a `Select` or a `Tabs` contract today would mean inventing an API
with no call site to check it against, which is how a primitive ends up wrong in
its first real use.

The deferral now ends on a condition rather than on someone remembering it:

- **`Select` is built** at the first control the native element cannot express:
  a multiple selection, an option set that is filtered or loaded
  asynchronously, or an option that needs more than a text label.
- **`Tabs` is built** at the first screen that needs a tab set. None exists
  today.
- **Until then**, every new `<select>` is wrapped in `FormField` and styled by
  the shared block above. A local select style is a finding, because it is the
  thing that makes the eventual primitive expensive to adopt.

#### D-008, ruled: the tablet rail is collapsible, and section 14 now says so

Brief section 14 and `03-components/application-shell-and-navigation.md:26` both
say the tablet uses a collapsible rail, and since F-19 the stylesheet agrees:
there is no tablet rule at all between 768 and 1180, so those frames inherit the
desktop rail and its toggle.

**Ruled.** The collapsible rail as shipped is confirmed, and the consequence the
entry asked to have stated out loud is now in brief section 14 rather than only
here. At 768 the rail opens expanded at 17rem, which is 272px, and leaves a
496px content column; collapsing it to the 5rem compact rail returns the column
to 688px. That column still satisfies every section 14 rule for a constrained
frame: forms are one column, side panels have already moved below, and tables
have already become labelled cards or scrollable regions. So the cost is real
and it is affordable, which is why the collapsible reading wins over a fixed
compact rail.

Two things follow from the ruling and are stated so a later reviewer does not
re-litigate them:

- The rail opens **expanded at every frame**. `app-shell.tsx:63` holds it in
  `useState(false)`, so a person meets the navigation with its labels readable
  and chooses the compact rail; the compact rail is never the default that a
  person has to escape from.
- The choice does **not** persist across a reload, and this brief does not
  require it to. A rail that reopens the way every other person's rail opens is
  predictable, and persistence would need a storage decision this system has not
  made. If a future screen makes the re-collapse tedious, that is a new
  requirement with an owner, not a defect against this ruling.

## 6. What the automated gates already prove, so a reviewer does not re-check it

A reviewer scores what a machine cannot. These run on every change:

| Axis | Gate |
|---|---|
| 1, 2, 3, 8, 10 | `tests/browser/design-quality.spec.ts` and `tests/browser/review/design-quality.spec.ts` compare a committed screenshot of every screen, at every frame, in both themes, against `tests/visual/screens/`, at `maxDiffPixelRatio: 0.001` with animations disabled. A spacing token, a colour role, or a type step moving is a failure with a picture. |
| 5, on a control that is not a primitive | The same two suites walk each page with the keyboard and fail any focus stop that draws no visible ring on itself, its label, or its wrapper. |
| 006D-AC-003, governed controls | `tooling/tests/unit/design-quality/governed-controls.test.ts` reads every file under `apps/web/src/app` and `apps/web/src/features` and fails on a raw `<input>`, `<textarea>`, `<a>`, `<button>`, or `<dialog>`. Its exceptions are named with a reason each, never blanket; `<button>` has none. The button rule was added on 2026-09-20 by the named-state review's F-18, which found the one control the scan's four elements had let through. |
| 4, colour and contrast | `apps/web/src/theme/token-contrast.unit.test.ts` measures every rendered text-on-surface pair in both themes on `pnpm test:unit`. Since the D-001 ruling on 2026-09-20 it also measures `--focus-color` against all ten surfaces a ring can land on, in both themes, and fails if the ring is ever re-coupled to the tenant accent. `apps/web/src/theme/delivered-semantic-surfaces.unit.test.ts` fails any raw color literal in a delivered stylesheet. |
| 5, states | The component tests in the `components` vitest project render every state of every primitive and assert its accessibility contract. |
| 6, motion | The browser suite asserts zero computed animation and zero transition duration under `prefers-reduced-motion`, and every feature CSS module now carries its own reduced-motion block. |
| 7, responsiveness | The browser suite runs the matrix at 1180, 768, and 390, asserts no horizontal overflow, and fails any visible interactive element under 44 by 44. |
| 8, Dark and Light | The browser suite chooses each theme and asserts the theme resolves before first paint with no Light flash. |
| 4 and 9, accessibility | `AxeBuilder` runs unfiltered on each route, at each frame, in each theme, and requires an empty violation list. |

A reviewer who finds something one of these gates should have caught files a
finding against the gate, not only against the screen.
