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
| 004A-AC-004 | Create Open House Boost → navigate away → reload → campaign still present (Postgres). | VERIFIED locally against real PostgreSQL 17 (`GGL-008`); operator smoke on the preview URL still pending |
| 004A-AC-005 | Authorized approver can approve; aggregate shows approved state after reload. | VERIFIED locally against real PostgreSQL 17 (`GGL-009`); operator smoke on the preview URL still pending |
| 004A-AC-006 | Smoke log retained per evidence pack; no tokens or PII in git. | BLOCKED: operator smoke run |

Statuses were set by the Gauntlet raid recorded in [`EXECUTION_LEDGER.md`](../../../../EXECUTION_LEDGER.md) (rows `GGL-001` through `GGL-010` and the parked `GGL-B01` through `GGL-B16`). Nothing here is claimed as verified on a real preview URL, because no preview deploy has been performed.

## Blockers (honest)

| Blocker | Owner | Unblock |
|---|---|---|
| Review Postgres URL + Vercel env access | Operator / platform owner | Provide `OALO_DATABASE_URL` on preview env |
| Honest review surface needs its flag | Operator | Set `OALO_REVIEW_SURFACE=authorized` (server-only) on the review preview. Without it, default preview mode still serves labeled synthetic demo metrics and `004A-AC-003` is not met. See [`docs/production-environments.md`](../../../../docs/production-environments.md). |
| ~~Real-Postgres round trips are not enforced by CI~~ | Resolved 2026-09-16 | The suite now executes and is enforced. It never needed Supabase local: the migrations reference no Supabase object and only require a superuser connection, which Supabase local's `postgres` role lacks. `packages/db/test/campaign-command.integration.test.mjs` passes 9 of 9 against stock PostgreSQL 17. The `campaign-command-postgres` job enforces it on a digest-pinned `postgres:17-bookworm` service container and passed on a GitHub runner on PR #66 (run `35056178244`). Note that the canonical `pnpm test:db` gate still does not run this suite; the new job does. See `GGL-B16` in [`EXECUTION_LEDGER.md`](../../../../EXECUTION_LEDGER.md). |

## Related

- [Reviewable preview smoke evidence pack](../../../../docs/operations/evidence-packs/reviewable-preview-smoke.md)
- [PRD-003 index](../prd-003-authenticated-product-activation/prd-003-authenticated-product-activation-index.md) (parent exit gate)
