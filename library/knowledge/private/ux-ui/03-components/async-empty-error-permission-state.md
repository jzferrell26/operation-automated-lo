# Async, Empty, Error, and Permission State

## Governing sections

Implements [Design Brief §15](../00-design-brief.md#15-operational-truth-and-safe-actions), [§16](../00-design-brief.md#16-data-freshness-and-missing-values), and [§18](../00-design-brief.md#18-accessibility-baseline).

## Canonical export

Feature code imports `AsyncState` from `@oalo/ui`. The supported variants are `loading`, `empty`, `error`, `permission_restricted`, and `degraded`; screens may compose it with `Metric` or `SafeAction` but do not implement state views ad hoc.

## Variant contract

| Variant | Required content | Safe action |
| --- | --- | --- |
| `loading` | Preserved region label, concise progress text, and non-misleading skeleton or progress indicator. | None until data or task state permits a safe action. |
| `empty` | What is absent, why it matters, and whether it is a normal new-account condition. | One authorized creation or setup action. |
| `error` | Plain-language failure, affected module, last safe state, stable exception code when available, and correlation ID in secondary detail. | Retry only when idempotent or otherwise safe; otherwise provide the next safe action. |
| `permission_restricted` | No protected data, required role or owner, and the reason the user cannot proceed. | Request access or contact the authorized resolver. |
| `degraded` | Provider or system scope, known impact, last successful freshness, and whether a read-back or recovery is running. | Non-mutating fallback or status details; block unsafe provider writes. |

## Surface

`surface="sunken"` (the default) draws the state as a well inside a card: `--sf-sunken` on a `--bd-hairline` edge. `surface="card"` draws a state that stands on the page itself, such as a route's error or loading boundary, as the white bordered card: `--sf-card` with `--shadow-card`. _(Added 2026-10-03 by the PRD-009 scored baseline review, R4-10. Design `00-direction.md` section 2.4 sets `--sf-sunken` equal to `--sf-canvas` in Light, so a sunken state on the canvas drew as an outline with no fill while Dark drew it as a panel; on the canvas a surface is a card, design section 2.3.)_

`unavailable`, `stale`, `partial`, and `uncertain_reconciling` are data-state labels, not generic errors, and use the `Metric` and status contracts. All variants pair status color with text and glyph, preserve keyboard focus, avoid focus behind sticky UI, and announce material state changes without stealing focus. Motion uses named buckets only, and reduced motion is immediate or opacity-only.
