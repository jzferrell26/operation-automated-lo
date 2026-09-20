# Form Field and Text Inputs

## Governing sections

Implements [Design Brief §10](../00-design-brief.md#10-typography),
[§11](../00-design-brief.md#11-radius-spacing-and-iconography),
[§14](../00-design-brief.md#14-responsive-and-embedded-behavior), and
[§18](../00-design-brief.md#18-accessibility-baseline), in particular line 317,
"Use concise inline errors connected to the affected field", and line 318,
"Provide accessible authentication without cognitive-function tests".

## Canonical exports

Feature code imports `FormField`, `TextField`, `TextArea`, and `PasswordField`
from `@oalo/ui`. It does not render a raw `<input>`, `<textarea>`, or `<label>`.
A control that has no primitive yet is still wrapped in `FormField`, so its error
is connected whatever the control turns out to be.

```tsx
<TextField
  autoComplete="email"
  description="We send the sign-in link here."
  error={errors.email}
  label="Work email"
  requirement="required"
  type="email"
/>

<FormField label="Open house date" description="Local to the property.">
  {(control) => <input {...control} type="date" />}
</FormField>
```

`FormField` owns the label, the requirement marker, the description, the error,
and the identifiers, and hands the control exactly the attributes that connect
them: `id`, `aria-describedby`, `aria-invalid`, and `required`. A control cannot
be rendered inside `FormField` without receiving them, which is the point: an
unconnected inline error is not possible by construction.

## Anatomy and tokens

| Part | Rule |
| --- | --- |
| Field | `display: grid`, `gap: var(--space-2)`. |
| Label | `--text-body-size`, `--weight-medium`, `--tx-strong`. Always visible. A placeholder is never the label. |
| Requirement marker | The word `Required` or `Optional` at `--text-caption-size` in `--tx-faint`, at the inline end of the label row. `requirement="required"` also sets `required` on the control, so the marker and the behaviour cannot disagree. |
| Description | `--text-secondary-size`, `--tx-body`, above the control so it is read before the field is filled. |
| Control | `min-block-size: var(--target-min-size)`, `padding-block: var(--space-2)`, `padding-inline: var(--space-3)`, `border: 1px solid var(--bd-input)`, `border-radius: var(--radius-control)`, `background: var(--sf-card)`, `--text-body-size` at `--weight-medium`. |
| Control, `size="lg"` | `padding-block: var(--space-3)`, `padding-inline: var(--space-4)`, `--text-card-size`, `border-radius: var(--radius-button)`. |
| Control, `tone="data"` | `font-family: var(--font-data)` for an identifier, a version, a hash, or a timestamp, per brief section 10. |
| Multi-line control | `min-block-size: calc(var(--space-8) * 3)`, `padding-block: var(--space-3)`, `resize: vertical`. |
| Error | `--text-secondary-size` in `--st-critical-fg`, below the control, with the `alert-triangle` glyph, so the error is not carried by color alone. |

## States

| State | Rendering |
| --- | --- |
| Default | `--bd-input` boundary on `--sf-card`. |
| Hover | Boundary moves to `--ac-primary` over `--motion-fast` with `--ease-standard`. |
| Focus-visible | The shared ring: `var(--focus-width)` solid `var(--focus-color)` at `var(--focus-offset)`, plus the `--ac-primary` boundary. |
| Focus, date and time controls | The same ring, on `:focus` rather than `:focus-visible`. A `date`, `datetime-local`, `month`, `time`, or `week` control is a group of sub-fields in the browser's own shadow tree, and Chromium does not match `:focus-visible` on the outer control when a keyboard lands on one of them, so the ring would never appear. These controls are never focused except deliberately, so there is no pointer-focus flash to avoid. Measured during the PRD-006d review; asserted by `tests/browser/design-quality.spec.ts`. |
| Invalid | `aria-invalid="true"`, boundary `--st-critical-fg`, error text connected through `aria-describedby`. |
| Read-only | `--sf-sunken` fill, `--tx-body` text, no hover boundary change. |
| Disabled | `--sf-sunken` fill, `--tx-body` text, `--bd-hairline` boundary, `cursor: not-allowed`. The reason lives in the description, never in a tooltip alone. |
| Placeholder | `--tx-faint`. A placeholder is a hint, never a label and never the only instruction. |

Reduced motion sets every transition on the control and the reveal affix to 0ms.

## PasswordField

`PasswordField` is `TextField` with a reveal control at the inline end.

- The control is a `<button type="button">` sized exactly `var(--target-min-size)`
  square, inside the field, so it is a 44 by 44 target at every frame.
- Its accessible name is the action, `Show password` or `Hide password`, given
  through `aria-label`. It never relies on `title`, per brief section 18 and the
  icon specification.
- It carries `aria-pressed` and `aria-controls` pointing at the field, so a
  screen reader reads the state and the relationship.
- It disables with the field.
- `autoComplete` passes straight through, so `current-password` and
  `new-password` reach the browser and the password manager. Nothing in the
  field blocks paste, and nothing asks the user to transcribe, remember, or
  solve anything: that is what "accessible authentication without
  cognitive-function tests" requires.

## Accessibility contract

- The label is a real `<label for>` pointing at the control. Every field has one.
- The description and the error are connected through `aria-describedby`, in that
  order, and only when they are present.
- `aria-invalid` appears only with an error.
- The error is visible without scrolling at 390: the field, its error, and the
  submit control fit the mobile frame because the field is a single column with
  `--space-2` internal rhythm.
- Announcing a submission result is the `LiveRegion`'s job, not the field's. The
  field connects; the region announces. Doing both would announce twice.

## Frames

One column at every frame. The field fills its container, so the frame rules in
brief section 14 are satisfied by the container, not by the field. At 390 the
control keeps its 44px minimum and the error wraps rather than truncating.

## Tests

`packages/ui/src/components/form-primitives.test.tsx`, in the `components`
vitest project: the wiring policy, both requirement markers, every size and
tone, the connected error, `autocomplete` passthrough, the disabled, read-only,
and placeholder states, the multi-line control, and the reveal control's name,
pressed state, and absence of a `title`.

## Reference canvases

`Create.dc.html` (the property and event step), `Onboarding.dc.html`,
`Brand.dc.html`. The canvases draw the field at a 12px label and a 10px radius;
the brief's type scale and radius scale win, so the label is `--text-body-size`
and the control is `--radius-control`.
