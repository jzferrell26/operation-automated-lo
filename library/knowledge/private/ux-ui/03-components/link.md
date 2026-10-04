# Link

## Governing sections

Implements [Design Brief §9](../00-design-brief.md#9-color-contract),
[§10](../00-design-brief.md#10-typography),
[§14](../00-design-brief.md#14-responsive-and-embedded-behavior), and
[§18](../00-design-brief.md#18-accessibility-baseline).

## Canonical export

Feature code imports `Link` from `@oalo/ui`. It does not hand-roll an anchor. The
superseded `.oalo-action-link` class was deleted from `apps/web/src/app/globals.css`
on 2026-09-19 once its last call site was migrated, and
`tooling/tests/unit/design-quality/governed-controls.test.ts` fails the build if
either the class or a raw `<a>` returns to a screen.

The one anchor that is not a `Link` is the shell's navigation item, which is its
own specified component in
[application-shell-and-navigation.md](./application-shell-and-navigation.md); the
scan names it by file with that reason.

```tsx
<Link href="/brand">approved profile</Link>
<Link href="/onboarding" variant="action">Finish setup</Link>
<Link href="https://business.facebook.com" external>Meta business settings</Link>
```

_(Amended on 2026-10-03 by PRD-009 (S-107; D-15): the second line of the example
shows how a `Link` is written and nothing else. `/onboarding` now redirects to
Home and the "Finish setup" chip is retired, so use another address and label in
real code. The `action` variant is unchanged.)_

`Link` renders an `<a>` and spreads the rest of its props, so `href`, `download`,
`hrefLang`, and a framework's client-navigation props all reach the element.

## Variants

| Variant | Use | Rendering |
| --- | --- | --- |
| `inline` (default) | A link that reads as text rather than as a control. | `--st-info-fg`, underlined with `text-underline-offset: var(--space-1)`, `--text-body-size` at `--weight-medium` (`--text-secondary-size` with `size="sm"`, see "Size"). Hover moves the colour to `--tx-strong` and keeps the underline. |
| `action` | A link that behaves like a button: a navigation that is the next step on the screen. | `min-block-size` and `min-inline-size` of `var(--target-min-size)`, `padding-block: var(--space-2)`, `padding-inline: var(--space-4)`, `--sf-card` on a `--bd-input` boundary at `--radius-button` with `--shadow-rest`, no underline. Hover moves the fill to `--sf-sunken` and the boundary to `--ac-primary`. |
| `sentence` | A link set inside a running sentence or a row of smaller text: "See what's needed for Meta." under a button, the "Campaigns" crumb. Added 2026-10-03 (PRD-009 scored review, R2 F-4). | `--st-info-fg`, underlined as `inline`, and it takes the size, weight, and leading of the text around it (`font-size`, `font-weight`, `line-height: inherit`), so "Campaigns" beside a 14px crumb is 14px. The 44 by 44 target is kept; see "A link inside a sentence" below for how it is kept without stretching the line. It does not wrap (`white-space: nowrap`), so keep its words to a phrase. |
| `title` | The name a list row is led by: a campaign's name in the Campaigns table and phone cards, and in Home's "Running now" and "Needs your approval". Added 2026-10-04 (PRD-009 final scored review, FU-2). | `--tx-strong` at `--weight-semibold` and `--text-body-size`, no underline until hover (the underline comes back and the colour stays `--tx-strong`), and the 44 by 44 target. See "A name in a list row" below. |

### Size

`size` is `md` (the default) or `sm`, and it changes the `action` and `inline` variants: `sentence`
takes its size from its text, and `title` is always the body step. `action` with `size="sm"` is the compact action link, the small secondary
button's twin (`button-and-safe-action.md`, "Sizes and type"): `--text-secondary-size` (14px),
`padding-inline: var(--space-3)`, and the link's own `--weight-medium` (500), with the 44px target kept.
The primitive carries `data-size` so the rule selects on the attribute. A screen draws a row action
beside a smaller text step as `<Link variant="action" size="sm">` and never with its own size, padding
or weight in a module. _(Added 2026-10-03 by the PRD-009 scored baseline review, pass 2, R4-12: Home's
checklist actions set 14px and 600 locally while the notice's "Resend the link." was the 16px `Button`,
two small-button looks on one page.)_

`inline` with `size="sm"` is the plain link at the secondary step: `--text-secondary-size` (14px) and
nothing else, so it keeps the link's `--weight-medium` (500), its underline and colour, and the 44px
target of the `inline` rule. Use it for a link that stands on its own line under text at the secondary
step (an empty state's "Launch an ad" under its 14px sentence, as the mockups' `.empty a` draws it,
`design/mockups/home-first-run.html:250`); a link inside the running text is `sentence`, which takes
the text's own size. A screen never sets a link's size in a module. _(Added 2026-10-03 by the PRD-009
scored baseline review, pass 3, R4-14 and R3 P3-09: Home's empty-list link was the 16px body step under
a 14px sentence, where the mockup draws it at the secondary step. The mockup sets that link at weight
600; the shared Link weight is 500 and the 2026-10-03 ruling keeps controls at 500, so the weight is not
part of the change.)_

The link foreground is `--st-info-fg`, not `--ac-primary`. This is deliberate and
it is enforced by a test. `--ac-primary` is 3.20:1 on the Dark card surface, which
is enough for a fill carrying `--tx-on-action` and not enough for text.
`--st-info-fg` measures 5.45 to 5.91 in Light and 7.03 to 8.40 in Dark on the
canvas, card, and sunken surfaces, and "blue means informational" is exactly the
role brief section 9 gives a link.

## External destinations

`external` sets `target="_blank"` and `rel="noopener noreferrer"`, appends the
`external-link` glyph, and adds a visually hidden "opens in a new tab" so the new
context is announced rather than discovered. The `rel` value is not optional and
not configurable: a link that hands `window.opener` to another origin is a
security finding, not a style choice.

## States and targets

| State | Rendering |
| --- | --- |
| Default | As the variant table. |
| Hover | Colour or fill change over `--motion-fast` with `--ease-standard`. |
| Focus-visible | The shared `var(--focus-width)` ring at `var(--focus-offset)`. No bespoke outline. |
| Disabled | There is no disabled link. A destination that is not available is not a link; render the reason and the next safe action instead. `aria-disabled="true"` is styled to `--tx-faint` without an underline for the rare case where a framework sets it, and it is not an approved pattern. |

Both variants are a 44 by 44 target at every frame. `action` carries a boundary
and a fill; `inline` reads as text and takes the same minimum in both axes, with
its text centred in that box, so a two-word link like "Sign in" is still a target
a finger can land on.

The `inline` rule used to apply at 390 only, on the reasoning that WCAG 2.2 SC
2.5.8 exempts a target inline in a sentence. The PRD-006d review measured the
sign-in footer's two links at 1440 and found them 20px tall: under the brief's
44, under SC 2.5.8's 24, and not inline in a sentence at all, because a footer
link stands on its own line. `03-components/application-shell-and-navigation.md`
states "Touch targets are at least 44px by 44px" with no frame condition, and a
pointer target does not get smaller because the window got bigger, so the rule
is now unconditional.

### A link inside a sentence

Added 2026-10-03 by the PRD-009 scored baseline review (R2 F-4, R1-15). The
mockups set a link inside a sentence at the sentence's own size
(`campaign-detail.html:217`, `.reason` at `--text-secondary-size`, and `:539`,
the plain `a` inside it), and both PRD-009 screens that ship one drew it at the
body step inside 14px text, and as a 44px `inline-flex` box that pushed the
sentence's next line 33px down instead of 21px.

WCAG 2.2 SC 2.5.8 exempts a target inside a sentence. This product does not take
the exemption: the 44 by 44 rule above stays unconditional, and the browser
suite's target gate measures every `a[href]` with no exception. `sentence` keeps
the target and gives the line back instead:

- The box is `inline-flex`, `align-items: center`, at least
  `var(--target-min-size)` in both axes, so the activatable box is 44 by 44.
- Its block margins are `calc((1lh - var(--target-min-size)) / 2)`, negative by
  the amount the box is taller than one line of the surrounding text. The margin
  box, which is what the line box is built from, is then exactly one line tall,
  so the sentence keeps its own leading and the link's words sit on its
  baseline. The extra target reaches evenly above and below the line, over the
  neighbouring lines' text, which is not activatable; so two `sentence` links
  never sit on adjacent lines of one sentence, or their targets would overlap.
- It never wraps, because a second line inside a one-line margin box would draw
  over the sentence's next line.

In a flex row of smaller text (a breadcrumb), the margin box is one line tall
too, so the row that holds it states its own `min-block-size:
var(--target-min-size)` when the row must stand 44px tall, as the mockups'
`.crumbs a` row does.

### A name in a list row

_(Recorded on 2026-10-04 by the PRD-009 final scored review, FU-2.)_

A list row is led by its name, and the mockups draw that name as an ink title, not as a link in the
link colour: `.table td a.row-link` and `.list-card a` (`design/mockups/home-first-run.html:393` and
`:398`, the same rules in `campaigns-list.html`) set `--weight-semibold`, `--tx-strong`, no
underline, `display: inline-flex` and `min-block-size: var(--target-min-size)`. The Campaigns list drew
exactly that, from a doubled `a.rowLink.rowLink` rule in its own module. Home's two lists drew the same
campaign names as the blue underlined `inline` link at `--weight-medium` (the `--weight-semibold` on
their heading never reached the anchor, because the link sets its own weight). One thing was drawn two
ways on two screens, and the second copy would have been the next way to drift.

So the treatment is the one `title` variant, and every screen that leads a row with a name writes
`<Link href={...} variant="title">`:

- `--tx-strong` at `--weight-semibold` and `--text-body-size`, with `text-decoration: none` at rest. On
  hover the colour stays `--tx-strong` and the underline appears. It does not take `--st-info-fg`, so a
  name in a row reads as the row's title and not as a link in the link colour. (The mockups' hover
  colour is `--ac-primary-hover`; the Campaigns list has held `--tx-strong` on hover since PRD-009e,
  hover is not photographed, and the Campaigns list's pictures are final, so the variant keeps what
  that list draws.)
- `inline-flex` at least `var(--target-min-size)` in both axes, as the `inline` rule has it, so the 44
  by 44 target is unchanged from the link it replaces.
- The shared focus ring is the base `.link:focus-visible` rule (`var(--focus-width)` at
  `var(--focus-offset)`), which this variant does not touch.
- It ignores `size`: a row's name is always the body step.
- A screen never restyles it in a module (no `a.rowLink.rowLink`, no weight on the heading around it).
  The rule is written after `.link` in `link.module.css` at the same weight of selector, so the order
  of that one file decides it and no doubled class is needed.

The Campaigns table, the Campaigns phone cards, and Home's "Running now" and "Needs your approval"
rows are the four places it is used. The change moved no Campaigns picture: the computed style of the
Campaigns row link, at rest, on hover and on focus, is the same before and after.

Reduced motion sets the transition to 0ms.

## Tests

`packages/ui/src/components/form-primitives.test.tsx`: the external safety
policy as a pure function and as markup, the variants, and the guarantee that an
internal link carries neither `target` nor `rel`.
`packages/ui/src/components/primitive-look.test.ts` pins the `sentence` rule:
inherited size, weight, and leading, the 44px box, and the one-line margin box.
It also pins the compact `action` link: the `sm` rule at the secondary step and
`--space-3`, matching the `sm` Button, with no weight and no height of its own; and the compact
`inline` link: the `sm` rule at the secondary step and nothing else, so the weight and the 44px target
stay the plain link's. It pins the `title` variant too: `--tx-strong`, `--weight-semibold`, no underline
at rest, the underline on hover, and the 44px target.
`apps/web/src/features/overview/home-polish.unit.test.ts` pins that Home's rows and the Campaigns
list both draw a campaign's name with that one variant and carry no rule of their own for it.
`apps/web/src/theme/token-contrast.unit.test.ts` asserts that the `.link`
foreground is `--st-info-fg` and measures it on all three surfaces in both
themes.

## Reference canvases

`Create.dc.html` line 25, the "approved profile" link, and `Welcome.dc.html`,
the "Sign in directly" link.
