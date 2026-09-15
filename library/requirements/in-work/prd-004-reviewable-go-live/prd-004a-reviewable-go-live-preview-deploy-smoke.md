# PRD-004a: Reviewable Go-Live - Preview Deploy and Smoke

> **Parent:** [PRD-004](./prd-004-reviewable-go-live-index.md)
> **Status:** Not started
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

| ID | Criterion |
|---|---|
| 004A-AC-001 | Preview deployment uses project `operation-automated-lo-web` only. |
| 004A-AC-002 | `OALO_DATABASE_URL` and auth secrets are server-only env vars on Vercel. |
| 004A-AC-003 | `/overview` does not show unlabeled synthetic spend/leads on the review URL. |
| 004A-AC-004 | Create Open House Boost → navigate away → reload → campaign still present (Postgres). |
| 004A-AC-005 | Authorized approver can approve; aggregate shows approved state after reload. |
| 004A-AC-006 | Smoke log retained per evidence pack; no tokens or PII in git. |

## Blockers (honest)

| Blocker | Owner | Unblock |
|---|---|---|
| Review Postgres URL + Vercel env access | Operator / platform owner | Provide `OALO_DATABASE_URL` on preview env |
| Current `/overview` may still serve synthetic fixtures | Engineering | Verify after deploy; fix if smoke fails |

## Related

- [Reviewable preview smoke evidence pack](../../../../docs/operations/evidence-packs/reviewable-preview-smoke.md)
- [PRD-003 index](../prd-003-authenticated-product-activation/prd-003-authenticated-product-activation-index.md) (parent exit gate)
