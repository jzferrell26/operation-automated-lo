# Icon and Icon Button

## Governing sections

Implements [Design Brief §9](../00-design-brief.md#9-color-contract), [§11](../00-design-brief.md#11-radius-spacing-and-iconography), and [§18](../00-design-brief.md#18-accessibility-baseline).

## Canonical exports

Feature code imports `Icon` and `IconButton` from `@oalo/ui`, never a raw Lucide export. `Icon` is Lucide-compatible, stroke-only, uses `absoluteStrokeWidth`, and exposes only `sm` (16px), `md` (20px), and `lg` (24px) sizes with the product-standard 1.5px stroke language.

`IconButton` is the only icon-only interactive control. It uses `Button` semantics, named tokens, `.ui-interactive`, and `.ui-focusable`; it never creates a one-off glyph button.

## Contract

- Decorative `Icon` instances are `aria-hidden="true"`.
- Each `IconButton` has an accessible name that describes the action, not the glyph: `Open navigation`, `Dismiss alert`, or `Copy correlation ID`.
- Icon buttons have a 44 by 44px target on mobile and no less than 24 by 24px effective target in dense desktop contexts, with adequate spacing.
- Active, selected, unavailable, and disabled states pair an icon treatment with textual or programmatic state. Color is never the only cue.
- Destructive and consequential icon actions use `SafeAction` confirmation behavior rather than an immediate click.
- The focus ring is the shared 2px `--focus-color` ring with `--focus-offset`; no bespoke outline is allowed.

## Navigation and status use

Navigation icons follow the deep navy surface and inherited `--tx-on-nav` color. Body and status icons inherit the paired status token and remain adjacent to a text label. Info, warning, critical, success, neutral, and uncertain statuses use distinct glyphs as specified in [Status, Feedback, and Attention](status-feedback-and-attention.md).

Hover and press use `--motion-fast`; reduced-motion removes transform feedback. Tooltip text may supplement an icon button, but never supplies its only accessible name.
