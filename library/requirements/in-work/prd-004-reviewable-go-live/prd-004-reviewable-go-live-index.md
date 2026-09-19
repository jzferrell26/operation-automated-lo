# PRD-004: Reviewable Go-Live and Marketplace Submission

> **Status:** In Work
> **Priority:** P0
> **Effort:** L (1-3d operator + deploy time)
> **Schema changes:** None

---

## Overview

PRD-003 merged tenant-backed Open House Boost create, persist, approve, and workspace reads on `main`. The next milestone is a **reviewable** product: a HighLevel reviewer and sandbox location can install Automated LO through Test Link, run the demonstrated flow on the **existing** Vercel project (`operation-automated-lo-web`), and the team can submit a Marketplace listing scoped to create → persist → approve only.

This PRD covers preview deploy smoke, Developer Portal inspection, Test Link install evidence, and Marketplace submission packet completion. It does **not** authorize production provider traffic, Meta publishing, lead routing, Stripe billing, KMS/env isolation proof, or flipping the 28 `DEFERRED: LIVE HIGHLEVEL AUTH` acceptance criteria without sanitized App Test fixtures.

---

## Goals

- Deploy PRD-003 to a preview/review environment on the existing Vercel project with server-only env, including `OALO_DATABASE_URL`.
- Prove create → reload → approve against Postgres on that preview URL (not local synthetic mode).
- Record Developer Portal inspection: app profile, OAuth, Test Link, listing type.
- Exercise Test Link install into a sandbox location and capture operator notes (not raw secrets).
- Complete the Marketplace submission packet for the demonstrated scope only.
- Unblock PRD-003 parent completion and move both PRDs to `completed/` only after preview smoke and submission prerequisites pass.

## Non-Goals

- Creating a second Vercel project.
- Production cutover or production traffic authorization.
- G2 matrix fixture ingestion (Wave 1; separate evidence pack).
- G3 Meta, G5 lead, G6 billing, G7 counsel, Wave 2 env/KMS.
- PRD-002 add-ons.
- Claiming any deferred PRD-001 AC as `VERIFIED` without sanitized evidence.

---

## Sub-features

| Sub-PRD | Scope | Status |
|---|---|---|
| [`prd-004a-reviewable-go-live-preview-deploy-smoke`](./prd-004a-reviewable-go-live-preview-deploy-smoke.md) | Preview deploy on `operation-automated-lo-web`, env wiring, Postgres smoke | **In work.** In-repo code complete and verified; deploy, env wiring, and smoke blocked on operator env + `OALO_DATABASE_URL` |
| [`prd-004b-reviewable-go-live-portal-and-test-link`](./prd-004b-reviewable-go-live-portal-and-test-link.md) | Developer Portal inspection, sandbox Test Link install, operator checklist | **Not started** (blocked: Marketplace portal sign-in) |
| [`prd-004c-reviewable-go-live-marketplace-submission`](./prd-004c-reviewable-go-live-marketplace-submission.md) | Listing artifacts, Loom demo, submission packet, terminology audit if needed | **Not started** (blocked: 004a smoke + 004b Test Link) |
| [`prd-004d-reviewable-go-live-postgres-command-gate`](./prd-004d-reviewable-go-live-postgres-command-gate.md) | Real-Postgres command round trips in an observed run and in the canonical CI gate | **Complete** (PR #65, `c140f11`; CI run `35058370796` at `dab2ec6`) |
| [`prd-004e-reviewable-go-live-listing-content-and-demo-script`](./prd-004e-reviewable-go-live-listing-content-and-demo-script.md) | Customer-facing scope statement, FAQ, paste-ready listing fields, screenshot shot list, Loom script, claim audit | **Content authored in-repo.** Capture and submission still blocked (`GGL-B09`) |

Execute in order: **004a** → **004b** (may overlap after preview URL exists) → **004c**. **004d** and **004e** depend on no operator step: 004d is complete, and 004e is authored content that removes the "draft listing copy live in the portal" risk from 004c.

---

## Acceptance criteria

| ID | Criterion |
|---|---|
| RGL-001 | Given the existing Vercel project `operation-automated-lo-web`, when a preview deployment is promoted for review, then server-only env includes `OALO_DATABASE_URL` and other required secrets without `NEXT_PUBLIC` leakage, and the deployment is not a second Vercel project. |
| RGL-002 | Given a review preview URL, when `/overview` loads for an authenticated tenant without persisted spend/leads, then the surface shows honest empty or not-connected states and is not unlabeled synthetic demo data. |
| RGL-003 | Given a review preview URL and Test Link or authorized session, when an operator creates an Open House Boost, reloads the page, and approves it, then campaign evidence is read from Postgres and the flow matches PRD-003 APA-001 through APA-006. |
| RGL-004 | Given Developer Portal access, when inspection completes, then app name, version, OAuth callback, Custom Page URL, listing type, and Test Link steps are recorded in the submission packet without secrets in git. |
| RGL-005 | Given a sandbox location, when Test Link install succeeds, then install → embedded session → create → approve is demonstrable on the preview URL and operator notes are retained outside git. |
| RGL-006 | Given 004a and 004b pass, when the Marketplace submission packet is complete, then profile, screenshots, pricing, support email, HTTPS callback, and Loom video describe only create → persist → approve with no Meta, lead, or billing claims. |
| RGL-007 | Given this batch completes, when external gates are checked, then no HighLevel provider write, Meta publish, lead routing, or Stripe charge is newly enabled by default. |
| RGL-008 | Given G2 deferred criteria, when this batch completes, then none of the 28 `DEFERRED: LIVE HIGHLEVEL AUTH` rows flip to `VERIFIED` without sanitized fixtures passing `pnpm test:contracts`. |

### Status

Set by the Gauntlet raid recorded in [`EXECUTION_LEDGER.md`](../../../../EXECUTION_LEDGER.md), rows `GGL-001` through `GGL-010`.

| ID | Status |
|---|---|
| RGL-001 | Code half VERIFIED (no `NEXT_PUBLIC` leakage, gate-enforced); Vercel env wiring BLOCKED on operator |
| RGL-002 | VERIFIED in review mode. Requires `OALO_REVIEW_SURFACE=authorized` on the review URL |
| RGL-003 | BLOCKED: needs a review preview URL and `OALO_DATABASE_URL`. Automated half VERIFIED (004d, PR #65, `c140f11`, CI run `35058370796`); deployed half additionally requires PRD-005a and PRD-005b (completion review finding C1). |
| RGL-004, RGL-005 | BLOCKED: Developer Portal sign-in and sandbox Test Link |
| RGL-006 | BLOCKED: depends on RGL-003 and RGL-005 |
| RGL-007 | VERIFIED by executable proof under default and preview environments |
| RGL-008 | VERIFIED. `PRODUCTION_EXECUTION_LEDGER.md` is untouched and no deferred row was flipped |

The automated half of `RGL-003` is tracked separately in [PRD-004d](./prd-004d-reviewable-go-live-postgres-command-gate.md): `GGL-008` and `GGL-009` are `VERIFIED` in the canonical `pnpm test:db` gate (CI run `35058370796` at `dab2ec6`, PR #65, `c140f11`). PR #66 was a separate, closed and unmerged approach to the same gate; it is not the gate's proof and is not reopened. The deployed navigate-and-reload proof remains `GGL-B01` through `GGL-B03` and is now sequenced behind [PRD-005](../prd-005-authenticated-review-runtime/prd-005-authenticated-review-runtime-index.md) (005a, 005b).

---

## Data model changes

None. Uses PRD-003 schema on the review Postgres instance.

---

## API changes

None required for this batch beyond PRD-003. OAuth callback and Custom Page URLs must point at the verified preview domain configured in the Developer Portal.

---

## Open questions

- [ ] Does the existing Automated LO Marketplace app exist, and is it Standard or White-label? **Recorded default for a newly created app: Standard**, because a White-label listing forbids all HighLevel terminology across listing, screenshots, OAuth screens, embedded UI, and support copy, which today's shell would fail. If the app already exists, keep its current type. See the [listing copy pack](../../../knowledge/private/product/marketplace-listing-copy-pack.md#listing-type). Confirm in portal inspection (`GGL-B04`).
- [ ] Which preview hostname is the OAuth callback and Custom Page URL (existing `operation-automated-lo-web.vercel.app` vs custom domain)?
- [ ] Who holds Vercel + Supabase credentials for review env wiring?
- [x] Which real-Postgres provisioning route closes `GGL-B16`? **Resolved: R5**, adopted and recorded in [PRD-004d](./prd-004d-reviewable-go-live-postgres-command-gate.md#provisioning-routes-decided-r5).
- [ ] Operator-supplied listing values still missing: support email, publisher display name, pricing. Listed in [PRD-004e](./prd-004e-reviewable-go-live-listing-content-and-demo-script.md#operator-supplied-values-still-missing).

---

## Related

- Go-live plan: Project store at `/cursor/stores/bc-a116fca0-6063-487a-8602-a0504f81a42e/docs/go-live-plan-attached.md` (outside this repository)
- [PRD-003: Authenticated Product Activation](../prd-003-authenticated-product-activation/prd-003-authenticated-product-activation-index.md)
- [HighLevel Marketplace submission packet](../../../knowledge/private/product/highlevel-marketplace-submission.md)
- [Marketplace listing copy pack](../../../knowledge/private/product/marketplace-listing-copy-pack.md)
- [Production tonight operator runbook](../../../knowledge/private/operations/production-tonight-operator-runbook.md)
- [What Automated LO does today](../../../knowledge/public/overview/what-is-automated-lo.md) (customer-facing listing source)
- [Open House Boost FAQ](../../../knowledge/public/faqs/open-house-boost-faq.md) (customer-facing listing source)
- [Reviewable preview smoke evidence pack](../../../../docs/operations/evidence-packs/reviewable-preview-smoke.md)
- [G2 App Test evidence pack](../../../../docs/operations/evidence-packs/g2-highlevel-app-test.md)
- [Project map](../../../knowledge/private/product/project-map.md)
- [Go-live raid ledger](../../../../EXECUTION_LEDGER.md#gauntlet-raid-go-live-remaining-in-repo-code)
- [Production environment contract](../../../../docs/production-environments.md)
