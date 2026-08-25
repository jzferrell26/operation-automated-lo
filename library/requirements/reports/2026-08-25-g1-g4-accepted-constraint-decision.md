# G1 and G4 accepted-constraint decision

Decision date: 2026-08-25.

## Directive

The product owner directed:

1. Remove the external distribution gate (G1).
2. Drop the mortgage Special Ad Category discovery gate (G4) because the Housing Special Ad Category requirements are already known.

## Disposition

| Gate | Prior status | New status | Never report as |
| --- | --- | --- | --- |
| G1 Distribution | `BLOCKED` | `ACCEPTED CONSTRAINT` | `PASS` or validated Marketplace distribution |
| G4 Special Ad Category | `BLOCKED` | `ACCEPTED CONSTRAINT` | `PASS` or App Test-proven category matrix |

## Product controls retained

- Paid housing and mortgage promotion continues to require Meta Housing Special Ad Category.
- Campaign preflight still fails closed when Meta is enabled without `HOUSING`.
- Realtor and brokerage identity remains forbidden on paid-ad projections.

## Criteria updated

| Criterion | New status |
| --- | --- |
| `001E-AC-005` | `ACCEPTED CONSTRAINT` |
| `001E-AC-006` | `ACCEPTED CONSTRAINT` |

## Gates still blocking production traffic

G2 (OAuth and session), G3 (Meta publish), G5 (lead routing), G6 (billing), and G7 (legal operating model) remain blocked or deferred as recorded in the research gate and production execution ledger. G8 remains an accepted demand constraint with unproven commercial validation.

## Sources updated

- `library/knowledge/private/research/2026-build-readiness-and-research-gate.md`
- `library/knowledge/private/product/project-map.md`
- `PRODUCTION_EXECUTION_LEDGER.md`
- `EXECUTION_LEDGER.md`
- `README.md`
- `library/requirements/in-work/prd-001-operation-automated-lo/prd-001-operation-automated-lo-index.md`
- `library/requirements/in-work/prd-001-operation-automated-lo/prd-001e-meta-ad-launch.md`
- `library/requirements/in-work/prd-001-operation-automated-lo/prd-001j-operation-automated-lo-platform-foundation-runtime-and-delivery.md`

Historical QA reports dated before 2026-08-25 are unchanged snapshot evidence and are not rewritten.
