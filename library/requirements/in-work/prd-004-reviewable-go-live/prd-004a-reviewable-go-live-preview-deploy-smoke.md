# PRD-004a: Reviewable Go-Live - Preview Deploy and Smoke

> **Parent:** [PRD-004](./prd-004-reviewable-go-live-index.md)
> **Status:** In work. In-repo code complete; deploy and smoke blocked on operator
> **Priority:** P0
> **Schema changes:** None
> **Owner Guardians:** `release-deploy-guardian`, `devops-guardian`, `db-guardian`

## Goal

Deploy PRD-003 to the **existing** Vercel project (`operation-automated-lo-web`) as preview/review only. Smoke `/overview` and create → reload → approve against real Postgres. Do not create a second Vercel project. Do not promote to production until security, quality, and Test Link review pass.

## Scope

- Wire Production + Preview env on `operation-automated-lo-web` (root `apps/web`).
- Set `OALO_DATABASE_URL` and other server-only secrets (no `NEXT_PUBLIC` secrets).
- Point review deployment at a dedicated review/staging Postgres (not production seed data).
- Smoke checklist per [reviewable-preview-smoke.md](../../../../docs/operations/evidence-packs/reviewable-preview-smoke.md).
- Confirm `/overview` shows honest empty/not-connected for spend and leads when no provider data exists.
- Confirm campaign create, page reload, list/detail, and approval persist in Postgres.

## Non-Goals

- Production cutover.
- Marketplace submission (004c).
- G2 matrix capture (Wave 1 evidence pack).
- Enabling Meta, leads, or Stripe.

## Acceptance criteria

| ID | Criterion | Status |
|---|---|---|
| 004A-AC-001 | Preview deployment uses project `operation-automated-lo-web` only. | BLOCKED: operator Vercel access |
| 004A-AC-002 | `OALO_DATABASE_URL` and auth secrets are server-only env vars on Vercel. | Code half VERIFIED; Vercel half BLOCKED: operator |
| 004A-AC-003 | `/overview` does not show unlabeled synthetic spend/leads on the review URL. | VERIFIED in review mode; requires `OALO_REVIEW_SURFACE=authorized` |
| 004A-AC-004 | Create Open House Boost → navigate away → reload → campaign still present (Postgres). | VERIFIED in-repo against real Postgres; operator preview smoke still blocked |
| 004A-AC-005 | Authorized approver can approve; aggregate shows approved state after reload. | VERIFIED in-repo against real Postgres; operator preview smoke still blocked |
| 004A-AC-006 | Smoke log retained per evidence pack; no tokens or PII in git. | BLOCKED: operator smoke run |

Statuses were set by the Gauntlet raid recorded in [`EXECUTION_LEDGER.md`](../../../../EXECUTION_LEDGER.md) (rows `GGL-001` through `GGL-010` and the parked `GGL-B01` through `GGL-B16`). Nothing here is claimed as verified on a real preview URL, because no preview deploy has been performed.

## Blockers (honest)

| Blocker | Owner | Unblock |
|---|---|---|
| Review Postgres URL + Vercel env access | Operator / platform owner | Provide `OALO_DATABASE_URL` on preview env |
| Honest review surface needs its flag | Operator | Set `OALO_REVIEW_SURFACE=authorized` (server-only) on the review preview. Without it, default preview mode still serves labeled synthetic demo metrics and `004A-AC-003` is not met. See [`docs/production-environments.md`](../../../../docs/production-environments.md). |
| ~~Real-Postgres round trips are not enforced by CI~~ | ~~Engineering~~ | **Resolved.** `GGL-B16` is closed and tracked in [PRD-004d](./prd-004d-reviewable-go-live-postgres-command-gate.md). The tests at `packages/db/test/campaign-command.integration.test.mjs` now run inside the canonical `pnpm test:db` gate, which CI executes. The blocker was never provisioning: the harness seeded as the bare login role, and the foundation migration grants `migration_owner` `WITH SET TRUE, INHERIT FALSE`, so it now assumes that role exactly as the pgTAP suites do. |

## Related

- [Reviewable preview smoke evidence pack](../../../../docs/operations/evidence-packs/reviewable-preview-smoke.md)
- [PRD-003 index](../prd-003-authenticated-product-activation/prd-003-authenticated-product-activation-index.md) (parent exit gate)
- [PRD-004d: real-Postgres command gate](./prd-004d-reviewable-go-live-postgres-command-gate.md) (automated half of `004A-AC-004`/`005`)
- [Production tonight operator runbook](../../../knowledge/private/operations/production-tonight-operator-runbook.md) (steps 1 and 2)
