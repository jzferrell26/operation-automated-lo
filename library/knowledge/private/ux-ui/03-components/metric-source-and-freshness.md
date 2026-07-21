# Metric Source and Freshness

## Governing sections

Implements [Design Brief §6](../00-design-brief.md#6-root-overview-purpose), [§9](../00-design-brief.md#9-color-contract), [§16](../00-design-brief.md#16-data-freshness-and-missing-values), and [Status, Feedback, and Attention](status-feedback-and-attention.md).

## Canonical export

Feature code imports `Metric` from `@oalo/ui`. A metric is a value plus its provenance, freshness, state, and any qualified scope, never an unlabeled fixture number.

## Contract

`Metric` displays a human-readable label, formatted value, source, observed or refreshed timestamp, and state. Provider IDs appear only in secondary details where useful and permitted. Test leads are excluded and explicitly labeled. A zero appears only after an authoritative source returns zero.

| State | Required display |
| --- | --- |
| `current` | Value, source, freshness timestamp, and status glyph plus text. |
| `stale` | Last authoritative value, stale label, source, freshness timestamp, and next safe refresh action. |
| `unavailable` | `Unavailable`, source context, and no numeric substitute. |
| `partial` | Qualified value with `Partial`, sources still pending, and freshness. |
| `uncertain` | Qualified result with `Uncertain, reconciling`, reconciliation glyph, correlation ID where applicable, and no false completion claim. |
| `permission_restricted` | No unauthorized value or placeholder; name the required role or access path. |

Status uses the semantic status utility plus text and a glyph. It does not use color alone. `Metric` supports a compact view only when source and freshness remain programmatically available, for example through visible secondary text or an associated details control.

## Responsive behavior

At 1180px, the business-pulse metric order is preserved through compact layout. At 390px, only the screen-defined priority metrics render first; lower-priority metrics follow after the attention queue. Metric cards do not use arbitrary animation, and loading preserves the label and source context rather than presenting a misleading zero.
