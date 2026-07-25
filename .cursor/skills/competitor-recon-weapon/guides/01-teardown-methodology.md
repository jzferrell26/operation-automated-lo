# 01 - Teardown methodology

The overall method and the analysis techniques that structure a teardown. This guide is the map; guides 02 through 08 are the individual legs.

## What a teardown is

A product teardown is the systematic analysis of an existing product's design, features, and behavior: the UI, UX, information architecture, and (where public) the underlying code and API surface. It is distinct from market/pricing analysis. This weapon owns the UX/feature/product-behavior dimension; pricing, SEO, and messaging strategy belong to other Guardians.

Basis: `research/external/2026-07-02-ux-competitive-analysis-methodology.md`.

## The four analysis techniques

Every capture step is built on one of four practitioner-standard techniques. Name the technique you are applying so the evidence is legible.

1. **Heuristic evaluation.** Evaluate a surface against usability heuristics (Nielsen's 10). In the Assistable run this showed up as perceived-performance root-causing (why the portal "feels laggy") backed by hard evidence, not impressions.
2. **Feature mapping.** A structured table mapping features/capabilities across the target and your product. This is the gap table (guide 07). It "surfaces gaps and overlaps quickly."
3. **Task-flow analysis.** Map the steps a competitor requires for a key task (sign up, send a message, book an appointment) and compare step counts and decision points. This drives the walkthrough capture order.
4. **Quantitative UX metrics.** Task completion, time on task, error rates where measurable.

Basis: `research/external/2026-07-02-ux-competitive-analysis-methodology.md`.

## The pipeline

```
1. Scope        name the target, the surfaces in scope, and whether authenticated capture is possible
2. Capture      three parallel evidence channels:
                  (a) authenticated UI walkthrough        -> guide 02
                  (b) public-artifact archaeology         -> guide 03
                  (c) client-bundle mining                -> guide 04
3. Verify       check each candidate finding across account states -> guide 05
4. Organize     file captures into a reference corpus with a PII README -> guide 08
5. Synthesize   per-surface gap table + severity + phased build order -> guide 07
6. Route        white-council / library / code-forensics (rule 7)
```

## Triangulation

The three capture channels are not redundant, they cross-check each other:

- Live UI shows what the user sees and does.
- Public artifacts (docs, openapi.json, variable catalogs) show documented behavior and the full API surface, often explaining WHY the UI behaves as it does.
- Client bundle (source maps, feature flags, vendor constants) shows what is built but maybe not shipped/enabled.

When channels disagree, the public docs usually resolve the ambiguity (the billing-tab gate was resolved from docs, not another UI pass). Record the verification-state of every finding (guide 05).

## Scope discipline

- A teardown declares its evidentiary basis up front: which accounts/sessions, what date, what capture method. See the provenance header in `templates/gap-analysis-template.md`.
- A teardown names what it did NOT inspect (a coverage-honesty ledger), distinct from a confirmed absence. The Assistable doc's section 2.7 ("Not inspected this pass") is the pattern.
- Teardowns are dated and re-run; mature teams treat competitive analysis as recurring, not one-shot.

Basis: `research/internal/2026-07-02-assistable-parity-gap-analysis.md`; `research/external/2026-07-02-ux-competitive-analysis-methodology.md`.

## Example

- `examples/happy-path-saas-portal-teardown.md` walks all six pipeline stages end to end.
