# Evidence packs

Operator fill-in packs for the [Next Batch: External Evidence Sprint](../../../NEXT_BATCH_LEDGER.md).

Each pack lists the acceptance criteria or gate it unblocks, the sanitized artifacts to retain, and what must never enter git.

| Pack | Wave | Primary unblock |
| --- | --- | --- |
| [Reviewable preview smoke](reviewable-preview-smoke.md) | Go-live (PRD-004a operator) | `GGL-B01`–`B03`; PRD-003 parent exit; requires `OALO_REVIEW_SURFACE=authorized` |
| [G2 HighLevel App Test](g2-highlevel-app-test.md) | 1 | 28 `DEFERRED: LIVE HIGHLEVEL AUTH` criteria |
| [Environment isolation and KMS](env-isolation-and-kms.md) | 2 | `001J-AC-026`, `001J-AC-029` |
| [G3 Meta no-spend](g3-meta-no-spend.md) | 3 | Gate G3 |
| [G5 synthetic lead](g5-synthetic-lead.md) | 4 | `001F-AC-026` |
| [G6 billing lifecycle](g6-billing-lifecycle.md) | 5 | Gate G6 |
| [G7 legal and AI data](g7-legal-and-ai-data.md) | 6 | Gate G7, `001I-AC-013` |
| [Launch Ready and AI cost](launch-ready-and-ai-cost.md) | 7 | `001H-AC-001`, `001I-AC-007`, `001I-AC-014`, `001J-AC-033` |

## Global rules

- Prefer sanitized fixtures already schema-validated by `packages/ghl` and `tests/contracts/ghl`.
- Never commit tokens, refresh secrets, customer PII, card data, raw recordings, or live spend amounts tied to real accounts.
- After evidence lands, update `PRODUCTION_EXECUTION_LEDGER.md` before claiming `VERIFIED`.
- Run security then quality on any harness or product code change.
