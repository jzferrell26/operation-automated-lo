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

`Link` renders an `<a>` and spreads the rest of its props, so `href`, `download`,
`hrefLang`, and a framework's client-navigation props all reach the element.

## Variants

| Variant | Use | Rendering |
| --- | --- | --- |
| `inline` (default) | A link that reads as text rather than as a control. | `--st-info-fg`, underlined with `text-underline-offset: var(--space-1)`, `--text-body-size` at `--weight-medium`. Hover moves the colour to `--tx-strong` and keeps the underline. |
| `action` | A link that behaves like a button: a navigation that is the next step on the screen. | `min-block-size` and `min-inline-size` of `var(--target-min-size)`, `padding-block: var(--space-2)`, `padding-inline: var(--space-4)`, `--sf-card` on a `--bd-input` boundary at `--radius-button` with `--shadow-rest`, no underline. Hover moves the fill to `--sf-sunken` and the boundary to `--ac-primary`. |

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
is now unconditional. A link genuinely set inside a running sentence is a case
this specification does not yet cover; add it here before shipping one.

Reduced motion sets the transition to 0ms.

## Tests

`packages/ui/src/components/form-primitives.test.tsx`: the external safety
policy as a pure function and as markup, both variants, and the guarantee that an
internal link carries neither `target` nor `rel`.
`apps/web/src/theme/token-contrast.unit.test.ts` asserts that the `.link`
foreground is `--st-info-fg` and measures it on all three surfaces in both
themes.

## Reference canvases

`Create.dc.html` line 25, the "approved profile" link, and `Welcome.dc.html`,
the "Sign in directly" link.
