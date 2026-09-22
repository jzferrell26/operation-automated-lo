# Badge and Live Region

## Governing sections

Implements [Design Brief §9](../00-design-brief.md#9-color-contract),
[§11](../00-design-brief.md#11-radius-spacing-and-iconography),
[§16](../00-design-brief.md#16-data-freshness-and-missing-values), and
[§18](../00-design-brief.md#18-accessibility-baseline), and the taxonomy and the
announcement rule in
[Status, Feedback, and Attention](status-feedback-and-attention.md).

## Badge

### Canonical export

`Badge` exports the status pill that `primitives.css` already styled for
`Metric`, `AsyncState`, and `OnboardingChecklist`. It is the same element and the
same tokens; before this it could only be produced by rendering one of those
three components.

```tsx
<Badge tone="success">Connected</Badge>
<Badge tone="uncertain">Uncertain, reconciling</Badge>
<Badge tone="critical" icon="lock">Reconnect required</Badge>
```

### Tones and glyphs

Colour alone never carries a status, so every tone pairs its semantic tokens with
a distinct glyph and a text label. The default glyph per tone follows the
taxonomy:

| Tone | Meaning, from brief section 9 | Background and foreground | Default glyph |
| --- | --- | --- | --- |
| `success` | Healthy, ready, live, complete | `--st-success-bg`, `--st-success-fg` | `check` |
| `warning` | Warning, pending, stale, expiring | `--st-warning-bg`, `--st-warning-fg` | `alert-triangle` |
| `critical` | Blocked, failed, disconnected, destructive | `--st-critical-bg`, `--st-critical-fg` | `circle-x` |
| `info` | Informational, generated, processing, selected | `--st-info-bg`, `--st-info-fg` | `info` |
| `neutral` (default) | Draft, inactive, unavailable, completed without success | `--st-neutral-bg`, `--st-neutral-fg` | `circle-dot` |
| `uncertain` | Provider result unknown, reconciling | `--st-uncertain-bg`, `--st-uncertain-fg` | `loader` |

The six default glyphs are distinct from each other, and a test asserts it, so no
two tones can ever be told apart by colour alone. `icon` overrides the default
when a specific status needs a sharper cue; it does not change the tone.

### Shape and type

`--radius-pill`, `--text-caption-size` at `--weight-medium`, `--leading-normal`,
`padding-block: var(--space-1)`, `padding-inline: var(--space-2)`,
`gap: var(--space-1)`. The glyph is `Icon` at `size="sm"` with `tone="current"`,
so it always inherits the badge's foreground and can never drift from it. The
glyph wrapper is `aria-hidden`; the label carries the meaning.

`uncertain` is not a generic error. It means an external write produced no
conclusive evidence, and the surrounding attention item still owes the reader the
last safe state, the correlation identifier, and the next safe action.

## LiveRegion

### Canonical export

`LiveRegion` is the announcer for a step change, a form result, and any material
state change that must reach a screen reader without stealing focus.

```tsx
<LiveRegion message={announcement} />
<LiveRegion message="Sign-in failed. Check the email and password." urgency="alert" />
<LiveRegion message="Step 3 of 7, HighLevel routing." visible />
```

### Contract

| `urgency` | `role` | `aria-live` | Use |
| --- | --- | --- | --- |
| `status` (default) | `status` | `polite` | A routine result: saved, step changed, copied, connected. It waits for the reader to finish. |
| `alert` | `alert` | `assertive` | A failure or a block the user must hear now: a rejected sign-in, a blocked provider write. It interrupts. |

Both set `aria-atomic="true"`, so a changed message is read whole rather than as
a diff.

- **The region is always in the tree, even when it is empty.** A region inserted
  at the same moment as its message is unreliably announced. The component
  renders the container unconditionally, and the screen swaps the message.
- It is visually hidden by default, through `.oalo-visually-hidden`, and
  `visible` renders it in flow at `--text-body-size` in `--tx-body` for a screen
  that wants the same words on screen.
- It never moves focus. A field's error is connected to the field through
  `aria-describedby` by `FormField`; the region announces the submission result.
  One connects, the other announces, and neither does both, so nothing is
  announced twice.
- One region per screen concern. Two assertive regions competing is a finding.

## Tests

`packages/ui/src/components/overlay-and-feedback.test.tsx`: the six tones with
their distinct glyphs and text labels, the glyph override, both announcement
policies as a pure function and as markup, the visually hidden and visible
renderings, and the empty region.

## Reference canvases

`Overview.dc.html`, `Onboarding.dc.html`, `Preflight.dc.html`,
`CampaignDetail.dc.html`, and `Design System.dc.html` for the pill. No canvas can
show a live region; its contract is this file.
