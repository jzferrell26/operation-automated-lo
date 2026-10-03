# Card and Surface

## Governing sections

Implements [Design Brief §8](../00-design-brief.md#8-surface-metaphor-and-depth),
[§11](../00-design-brief.md#11-radius-spacing-and-iconography), and
[§14](../00-design-brief.md#14-responsive-and-embedded-behavior). The named utilities this
component implements are in [02-surfaces-and-borders.css](../02-surfaces-and-borders.css); the
visual reference is the PRD-009 mockups' `.card` (`home-first-run.html:196`).

## Canonical exports

Feature code imports `Card` (an `<article>`) and `Surface` (a `<div>`) from `@oalo/ui`, and stacks
their contents with `Stack`. A page does not draw a card by hand with a border, a radius and a
shadow in its own module: that is a second implementation of this specification. Both components
render the same element rules, `.oalo-surface` in `packages/ui/src/components/primitives.css`, and
carry two attributes the rules select on:

| Attribute | Values |
| --- | --- |
| `data-variant` | `card` (a `Card` is always this), `sunken`, `raised`, `plain`, `info` |
| `data-padding` | `none`, `sm`, `md` (the default), `lg` |

## The card

`--sf-card` on a `--bd-hairline` border at `--radius-card`, with `--shadow-card`. The ink is
`--tx-strong`. Depth is the border and the 1px shadow, never a heavier shadow tier (brief section 8,
as amended by PRD-009). A card holds its own text in the six type steps; its title is the card step
at `--weight-semibold`.

## Padding

| Step | Above 720px | Below 720px (phone) |
| --- | --- | --- |
| `none` | `0` | `0` |
| `sm` | `var(--space-2)` | `var(--space-2)` |
| `md` | `var(--space-4)` | `var(--space-4)` |
| `lg` | `var(--space-6)` | `var(--space-5)` |

`lg` is the page card: every card that holds a section of a page's content, drawn as the mockups'
`.card`, is `padding="lg"`. The mockups drop it from `--space-6` (24px) to `--space-5` (20px)
below 720px (`campaign-detail.html:426` and `launch-step-3-review-and-launch.html:426`, `.card`;
`.form-card` likewise), in the same block that drops the page's padding to `--space-6 --space-4`
and its gap to `--space-5`. The primitive carries that step, so no page restates it, and a phone
frame reads as one rhythm: a 16px column edge, a 20px card inset, a 20px gap between cards.

_(Added 2026-10-03 by the PRD-009 scored baseline review, pass 2, R1 P2-06(b) and R2 N-1: the `lg`
step had no phone value, so every large card on the Launch an ad steps and on the campaign page drew
24px at 390 while Home and the account card drew 20px. Measured: card text at x 41 on a card edge
at 16 where the mockup's is at x 37.)_

The 720px edge is the shell's own phone edge (`@media (max-width: 719.98px)` in
`app-shell.module.css`), the same edge Home and the account card step down at, so the column
padding, the page gap and the card inset always change together. A card is `padding="lg"` rather
than a module's own `padding: var(--space-6)`; a module that must restate a card's padding (a flush
card, `padding="none"`, whose rows carry their own) restates its phone value in the same 719.98px
block, as `auth-form.module.css`'s `.card` does.

`md` is the compact card: a metric tile, a list row card, a notice. It has no phone step; 16px is
already the phone value of a compact surface. A page that wants 20px on a phone for an `md` card is
asking for `lg`.

## Anatomy inside a card

The mockups' `.card > * + * { margin-block-start: var(--space-4) }`: a card's children stand
`--space-4` (16px) apart, and a card head (title and a trailing action) is a `flex` row at
`--space-4`. A card whose rhythm is one step off (14px, 18px, 20px between siblings) is a spacing
finding (rubric axis 2). Use `Stack gap="4"` inside the card.

## Tests

`packages/ui/src/components/primitive-look.test.ts`, "a large card insets 24px, and 20px on a
phone": the `lg` step at `--space-6`, the same selector at `--space-5` inside the 719.98px block,
no other step moved, and the attribute carried by both `Card` and `Surface`.
