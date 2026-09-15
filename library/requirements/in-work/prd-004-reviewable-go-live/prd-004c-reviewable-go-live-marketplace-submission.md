# PRD-004c: Reviewable Go-Live - Marketplace Submission

> **Parent:** [PRD-004](./prd-004-reviewable-go-live-index.md)
> **Status:** Not started
> **Priority:** P0
> **Schema changes:** None
> **Owner Guardians:** `gohighlevel-guardian`, `library-guardian`, `ux-ui-guardian`

## Goal

Submit the Automated LO Marketplace listing for the demonstrated Open House Boost scope: install → setup → create → persist → approve → disconnect. Listing copy and screenshots must match the Loom demo exactly.

## Scope

- Complete Developer Portal profile: logo, description, support email, pricing as applicable.
- Screenshots: create → persist → approve only.
- HTTPS OAuth callback on verified preview/staging domain.
- Loom video: install → setup → create → approve → disconnect.
- If **White-label** listing type: customer-facing terminology audit (current shell would fail; Standard is default recommendation).
- Submit for Marketplace review only after 004a smoke and 004b Test Link pass.

## Non-Goals

- Advertising Meta publish, lead delivery, or billing in listing copy.
- Production launch authorization.
- PRD-001 core completion or moving PRD-001 to `completed/`.

## Acceptance criteria

| ID | Criterion |
|---|---|
| 004C-AC-001 | All submission packet artifacts in [highlevel-marketplace-submission.md](../../../knowledge/private/product/highlevel-marketplace-submission.md) are complete. |
| 004C-AC-002 | Listing description claims only create → persist → approve. |
| 004C-AC-003 | Loom demo matches live Test Link behavior on preview. |
| 004C-AC-004 | Screenshots contain no synthetic misleading spend/lead metrics. |
| 004C-AC-005 | Submission recorded with date; no secrets in git. |

## Blockers (honest)

| Blocker | Owner | Unblock |
|---|---|---|
| 004a preview smoke | `release-deploy-guardian` | Pass Postgres smoke on review URL |
| 004b Test Link | Operator + `gohighlevel-guardian` | Successful sandbox install |
| Listing type decision | Product owner | After portal inspection |

## Related

- [HighLevel Marketplace submission packet](../../../knowledge/private/product/highlevel-marketplace-submission.md)
- [PRD-004 index](./prd-004-reviewable-go-live-index.md)
