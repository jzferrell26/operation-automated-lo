# Stepper

## Governing sections

Implements [Design Brief §10](../00-design-brief.md#10-typography),
[§11](../00-design-brief.md#11-radius-spacing-and-iconography),
[§12](../00-design-brief.md#12-motion), and
[§18](../00-design-brief.md#18-accessibility-baseline), and the campaign stepper
rule in
[Campaign and Artifact Workflow](campaign-and-artifact-workflow.md): "It must not
imply that visiting a step completes it."

## Canonical export

Feature code imports `Stepper` from `@oalo/ui`. It serves the guided setup now
and the six-stage Open House Boost stepper later.

```tsx
<Stepper
  label="Guided setup"
  steps={[
    { id: "install", state: "complete", title: "Install and permissions" },
    { id: "brand", state: "complete", title: "Brand", description: "Licence, NMLS, disclosures" },
    { id: "routing", state: "current", title: "HighLevel routing" },
    { id: "meta", state: "blocked", title: "Meta connection" },
    { id: "review", state: "upcoming", title: "Results review" },
  ]}
/>
```

## The honesty rule

Completion is read from each step's explicit `state`, never from the current
position. `resolveStepperPosition` is a pure, separately tested function:
`completedCount` counts steps whose state is `complete`, and the progress bar and
`aria-valuenow` both come from that count. A user who has walked to step 5 without
finishing step 2 sees a bar that says so. That is the whole reason the count and
the position are two different numbers.

The position label reads `Step n of m`, where `n` is the index of the `current`
step, or the completed count when no step is current.

## Anatomy and tokens

| Part | Rule |
| --- | --- |
| Root | `<nav>` with `aria-label`, `display: grid`, `gap: var(--space-3)`. |
| Position label | `Step n of m` in `var(--font-data)` at `--text-secondary-size` and `--weight-medium`, because it is a count. |
| Current title | `--text-secondary-size` in `--tx-body`, truncated with an ellipsis, hidden at 768px and below where the step list carries it. |
| Track | `block-size: var(--space-1)`, `background: var(--bd-input)`, `border-radius: var(--radius-pill)`, `overflow: hidden`. |
| Fill | `--ac-primary`, width set from `percentComplete`, transitioned over `--motion-base` with `--ease-standard`, 0ms under reduced motion. |
| Step row | `grid-template-columns: var(--space-6) minmax(0, 1fr)`, `gap: var(--space-3)`. |
| Marker | `var(--space-6)` square, `--radius-pill`, `var(--font-data)` at `--text-caption-size` and `--weight-bold`. Carries the ordinal, or the `check` glyph when the step is complete. `aria-hidden`, because the state is already in the badge. |
| Step title | `--text-body-size` at `--weight-medium`, `--tx-body`, moving to `--tx-strong` for the current and complete steps so the eye lands on where the user is. |
| Step description | `--text-caption-size` in `--tx-faint`. |

| State | Marker | Badge |
| --- | --- | --- |
| `complete` | `--st-success-fg` on `--st-success-bg`, `check` glyph | `Complete`, success tone |
| `current` | `--tx-on-action` on `--ac-primary`, ordinal | `In progress`, info tone |
| `blocked` | `--st-critical-fg` on `--st-critical-bg`, ordinal | `Blocked`, critical tone |
| `upcoming` | `--tx-body` on `--sf-sunken`, ordinal | `Not started`, neutral tone |

Every state carries a text label and a distinct glyph through `Badge`, so no
state depends on colour alone.

## Accessibility contract

- The root is a landmark-free `<nav>` with an explicit `aria-label`, so more than
  one stepper on a page stays distinguishable.
- The bar is a `role="progressbar"` with `aria-valuemin`, `aria-valuemax`,
  `aria-valuenow`, an `aria-valuetext` that reads "n of m steps complete", and an
  `aria-label`. A progress bar without a name is an axe violation, and a progress
  bar whose value contradicts the visible label is a review finding.
- The steps are an ordered list, so the count and the position are exposed by the
  list itself as well as by the label.
- The stepper announces nothing on its own. A step change is announced by the
  screen's `LiveRegion`, which is what stops a change of step from stealing
  focus.

## Frames

The list is a single column at every frame. At 768px and below the summary drops
the current step's title and keeps the count, because the list immediately below
already names the step.

## Tests

`packages/ui/src/components/overlay-and-feedback.test.tsx`: the position policy
including the empty list and a single completed step, the progress bar's name and
values, the position label, all four step states with their data attribute and
their text label, and the step description.

## Reference canvases

`Create.dc.html`, the six-stage stepper in the left rail. The canvas draws it
vertically in the navy rail with 12.5px titles; this specification places it on
the canvas surface at the brief's type steps, and the campaign lane composes it
into the rail when that screen is built.
