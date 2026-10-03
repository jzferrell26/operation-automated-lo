# Icon and Icon Button

## Governing sections

Implements [Design Brief §9](../00-design-brief.md#9-color-contract), [§11](../00-design-brief.md#11-radius-spacing-and-iconography), and [§18](../00-design-brief.md#18-accessibility-baseline).

## Canonical exports

Feature code imports `Icon` and `IconButton` from `@oalo/ui`, never a raw Lucide export. `Icon` is Lucide-compatible, stroke-only, uses `absoluteStrokeWidth`, and exposes only `sm` (16px), `md` (20px), and `lg` (24px) sizes with the product-standard 1.5px stroke language.

`IconButton` is the only icon-only interactive control. It uses `Button` semantics, named tokens, `.ui-interactive`, and `.ui-focusable`; it never creates a one-off glyph button.

_(Added 2026-10-03 by the PRD-009 scored baseline review, pass 2, round 2 lane J (R2 N-2, R1 P2-08): `IconName` gains `copy`, `pencil`, and `rocket` (`a2449ae9`, in `packages/ui/src/components/Icon.tsx`), drawn in the set's own stroke style for the buttons whose mockups draw them. `pencil` is on "Make a new version", `copy` is on "Copy the link", and `rocket` is on every "Launch on Facebook", where it replaces `megaphone` because both PRD-009 mockups draw a rocket. `plus` on "Launch an ad" was already in the set, and `megaphone` stays the Campaigns menu item's glyph. The rule for placing a glyph beside a button's words is in [Button and Safe Action](button-and-safe-action.md).)_

## Contract

- Decorative `Icon` instances are `aria-hidden="true"`.
- Each `IconButton` has an accessible name that describes the action, not the glyph: `Open navigation`, `Dismiss alert`, or `Copy correlation ID`.
- Icon buttons have a 44 by 44px target on mobile and no less than 24 by 24px effective target in dense desktop contexts, with adequate spacing.
- Active, selected, unavailable, and disabled states pair an icon treatment with textual or programmatic state. Color is never the only cue.
- Destructive and consequential icon actions use `SafeAction` confirmation behavior rather than an immediate click.
- The focus ring is the shared 2px `--focus-color` ring with `--focus-offset`; no bespoke outline is allowed.

## Navigation and status use

Navigation icons follow the deep navy surface and inherited `--tx-on-nav` color. Body and status icons inherit the paired status token and remain adjacent to a text label. Info, warning, critical, success, neutral, and uncertain statuses use distinct glyphs as specified in [Status, Feedback, and Attention](status-feedback-and-attention.md). _(Amended on 2026-10-01 by PRD-009 (S-101; OD-E): navigation icons sit on the light top bar and inherit `--tx-on-nav`, which is navy in Light.)_

Hover and press use `--motion-fast`; reduced-motion removes transform feedback. Tooltip text may supplement an icon button, but never supplies its only accessible name.
