# Theme Segmented Control

## Governing sections

Implements [Design Brief §13](../00-design-brief.md#13-light-dark-and-system-themes), [§14](../00-design-brief.md#14-responsive-and-embedded-behavior), and [§18](../00-design-brief.md#18-accessibility-baseline).

## Canonical export

Feature code imports `ThemeSegmentedControl` from `@oalo/ui`. It is the one product control for `Light`, `Dark`, and `System`, including page header and account-menu placements.

## Contract

The control uses a labelled radiogroup or single-select segmented-control pattern. Arrow keys move the active choice, Home and End select the first and last option, and Space selects the focused option. The selected item presents fill, text weight, and a check glyph. The label and selected state are available to screen readers.

`Light` and `Dark` persist a per-user override. `System` clears that override and follows operating-system changes. A choice applies before first paint where possible and must not reload, navigate, refetch data, or lose draft state. Native controls receive the matching `color-scheme`.

The selected segment uses semantic action and on-action tokens; non-selected choices use card or sunken tokens and the shared focus utility. Hover and selection transitions use `--motion-fast` or `--motion-base` with `--ease-standard`. Under reduced motion, selection is immediate or opacity-only.

Dashboard theme affects only authenticated product UI. It never changes public campaign pages, PDFs, QR destinations, Meta creative, approved artifact hashes, or campaign approvals.
