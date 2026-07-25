# 07 - Gap-analysis synthesis

How to turn captured evidence into the deliverable: a per-surface gap table with severity, plus a phased build-order recommendation. This is what the whole teardown builds toward.

## The generic gap-table schema

Do NOT copy the Assistable document's exact section list. Use this domain-agnostic schema, one row per gap:

| Column | Meaning |
|---|---|
| `surface` | The product surface/module (e.g., "billing settings tab", "assistant builder header") |
| `present-in-target` | What the competitor ships on this surface (behavior/layout, in your own words) |
| `present-in-ours` | What our product ships today |
| `severity` | Scored gap magnitude (see scoring below) |
| `evidence-source` | Which capture channel + artifact proves it (live UI screenshot, openapi.json path, bundle flag, docs file) |
| `verification-state` | confirmed / single-state / docs-resolved / corrected / not-inspected (guide 05) |

Basis: Command Brief IDEAS section; generalized from `research/internal/2026-07-02-assistable-parity-gap-analysis.md`; schema shape informed by `research/external/2026-07-02-gap-analysis-report-structure-severity.md`.

## Report structure (the three parts)

Generalized from the worked Assistable run and the gap-analysis report conventions:

- **Provenance header.** Which accounts/sessions, what date, what capture method, what this supersedes. Declares the evidentiary basis up front.
- **Part 1 (optional): cross-cutting findings.** Issues that affect every surface (e.g., perceived-performance root causes), each with hard evidence and an impact/scope tag. Use heuristic evaluation here.
- **Part 2: per-surface gap tables.** One table per surface, using the schema above. Include a "not inspected this pass" ledger (coverage honesty).
- **Part 3: phased build order.** The ranked recommendation (see below).

Basis: `research/internal/2026-07-02-assistable-parity-gap-analysis.md`; `research/external/2026-07-02-gap-analysis-report-structure-severity.md`.

## Severity scoring

Score each gap on a defensible basis, not a gut call. Combine:

- **Impact**: how much this gap costs (perceived value, conversion, parity perception).
- **Exposure**: what breaks or is lost if left open.
- **Remediation effort**: hours/cost/complexity to close.

A defensible ranked backlog is `(impact x exposure) / effort`, bucketed into phases. Treat the gap as a signal about what to prioritize, not just a number to close.

Basis: `research/external/2026-07-02-gap-analysis-report-structure-severity.md`.

## Phased build order

Bucket the ranked gaps into phases, P0 first:

- **P0**: immediate, cheap, high-impact hotfixes (the Assistable run's P0 was a one-line region pin + prefetch discipline).
- **P1..Pn**: ordered by score, with the biggest visual/functional win per unit effort first.

Route the phased build order onward: it is a RECOMMENDATION, not a decision. Whether/when to build is white-council-guardian's verdict; the PRD that implements a phase is library-guardian's (Hard Rule 7).

## The template

Use `templates/gap-analysis-template.md` as the starting skeleton. Fill the provenance header, add per-surface tables with the six-column schema, and end with the phased build order.

## Example

- `examples/happy-path-saas-portal-teardown.md` produces a filled gap table and phased build order end to end.
