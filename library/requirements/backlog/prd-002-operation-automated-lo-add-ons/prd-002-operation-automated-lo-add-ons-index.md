# PRD-002: Operation Automated LO Add-On Portfolio

> **Status:** Backlog, not authorized for implementation
> **Priority:** P1
> **Effort:** XL (> 3d)
> **Schema changes:** Additive

---

## Overview

Define the expansion portfolio that can increase revenue and retention after Open House Boost proves demand, activation, and recurring value. This PRD converts the authenticated Broker Marketplace findings and the existing Operation Automated LO campaign roadmap into independently gated add-ons. It is a roadmap contract, not authorization to build every item.

---

## Goals

- Preserve the focused HighLevel campaign-execution wedge while documenting credible expansion paths.
- Give each add-on its own entitlement, evidence gate, compliance boundary, unit economics, and acceptance criteria.
- Prefer extensions that reuse the canonical brand profile, campaign version, approval, artifact, GHL routing, and reporting contracts.
- Keep HighLevel as the CRM system of record and avoid creating a second borrower or partner database.
- Make third-party data and model costs visible in product economics before an add-on is sold.

## Non-Goals

- Recreate Broker Marketplace as a broad collection of unrelated tools.
- Approve an add-on for implementation solely because a competitor exposes a similar surface.
- Build a generic website builder, design studio, video editor, e-signature product, LOS, CRM, IDX portal, lender marketplace, or prospecting-data business.
- Import or warehouse a general borrower database outside the minimum product data required for a campaign.
- Use unlicensed property, AVM, mortgage, or refinance data.
- Sell raw model tokens, cash-like credits, or transferable usage balances.

---

## Sub-features

| Sub-PRD | Scope | Priority | Status |
|---|---|---|---|
| [`prd-002a-operation-automated-lo-add-ons-domains-analytics`](./prd-002a-operation-automated-lo-add-ons-domains-analytics.md) | Custom campaign domains, public-link governance, and advanced campaign analytics | P1 | Draft |
| [`prd-002b-operation-automated-lo-add-ons-realtor-workspace`](./prd-002b-operation-automated-lo-add-ons-realtor-workspace.md) | Reusable, restricted Realtor collaboration workspace | P1 | Draft |
| [`prd-002c-operation-automated-lo-add-ons-blueprint-packs`](./prd-002c-operation-automated-lo-add-ons-blueprint-packs.md) | Additional campaign blueprint packs | P1 | Draft |
| [`prd-002d-operation-automated-lo-add-ons-financing-scenarios`](./prd-002d-operation-automated-lo-add-ons-financing-scenarios.md) | Lender-approved affordability and financing-scenario presentations | P2 | Draft |
| [`prd-002e-operation-automated-lo-add-ons-homeowner-intelligence`](./prd-002e-operation-automated-lo-add-ons-homeowner-intelligence.md) | Licensed homeowner value and equity reports | P2 | Draft |
| [`prd-002f-operation-automated-lo-add-ons-refinance-signals`](./prd-002f-operation-automated-lo-add-ons-refinance-signals.md) | Licensed refinance opportunity signals and GHL activation | P2 | Draft |
| [`prd-002g-operation-automated-lo-add-ons-agency-portfolio`](./prd-002g-operation-automated-lo-add-ons-agency-portfolio.md) | Agency portfolio, delegated administration, and white-label distribution | P2 | Draft |
| [`prd-002h-operation-automated-lo-add-ons-creative-media-packs`](./prd-002h-operation-automated-lo-add-ons-creative-media-packs.md) | Constrained campaign image and video variants sold as usage packs | P3 | Draft |

---

## Portfolio entry gates

No add-on enters implementation until all applicable gates pass:

1. PRD-001 has passed its paid-founder demand gate.
2. The founding cohort meets or has an approved corrective plan for activation, support-time, and recurring-retention targets.
3. At least five qualified customers commit to pay for the add-on or an equivalent evidence threshold is documented.
4. The add-on has a named product owner, compliance owner, data owner, and support owner.
5. External provider terms, data rights, refresh cadence, retention, security, and termination behavior are verified.
6. Gross-margin modeling includes provider fees, model usage, storage, rendering, support, refunds, and failed-job costs.
7. The capability can be disabled independently without breaking the base campaign product.
8. Required HighLevel scopes and writes are no broader than the add-on's stated job.
9. The add-on's row in the [2026 build-readiness and research gate](../../../knowledge/private/research/2026-build-readiness-and-research-gate.md) has no unresolved `PROVIDER CONTRACT`, `COUNSEL / LENDER`, `APP TEST`, or Marketplace blocker.

## Research-readiness register

| Add-on | Current research state | Blocking evidence |
|---|---|---|
| Domains and analytics | Architecture known, implementation blocked | Domain ownership, DNS verification, certificate lifecycle, takeover prevention, analytics retention, and paid demand tests |
| Realtor workspace | Architecture known, implementation blocked | Core authorization must pass, followed by collaborator invite, revocation, and cross-tenant tests |
| Blueprint packs | Product hypothesis only | Paid demand, lender rules, channel policy classification, and current provider-contract tests for each pack |
| Financing scenarios | Not provider or compliance complete | Lender-approved calculations, rate source, timestamps, disclosures, and liability owner |
| Homeowner intelligence | Provider-contract blocked | Licensed property and valuation provider with resale, display, storage, refresh, correction, and deletion rights |
| Refinance signals | Provider-contract and legal blocked | Lawful inputs, permissible purpose, model rules, correction path, refresh cadence, and false-positive controls |
| Agency portfolio | Depends on core Marketplace approval | Agency and location authorization, delegated administration, billing hierarchy, support boundary, and white-label rights |
| Creative media packs | Model evaluation incomplete | Provider selection, measured cost and failure rates, moderation, likeness rights, and deterministic campaign linkage |

## Commercial hypotheses

These are validation ranges, not committed prices.

| Add-on | Candidate packaging | Primary cost risk |
|---|---|---|
| Domains and analytics | $39 to $79 per location per month | Domain support, analytics storage, attribution reconciliation |
| Realtor workspace | Include a basic collaborator view; charge for team or portfolio controls | Support and access-control complexity |
| Blueprint packs | $49 to $149 per pack, or included by plan tier | Compliance review and ongoing template maintenance |
| Financing scenarios | $49 to $99 per location per month | Formula validation, lender-specific policy, disclosures |
| Homeowner intelligence | Provider cost plus $99 to $199 per location per month | AVM and property-data licensing |
| Refinance signals | Provider cost plus $149 to $299 per location per month | Mortgage data rights, refresh cadence, false positives |
| Agency portfolio | $497 to $997 per agency per month, with location tiers | Cross-location authorization and support burden |
| Creative media packs | $29 to $99 per usage pack | Image and video model cost, retries, moderation |

## Portfolio-level acceptance criteria

| ID | Criterion |
|---|---|
| AC-1 | Every add-on is represented by a separate entitlement that defaults to disabled. |
| AC-2 | Enabling or disabling one add-on does not alter another tenant's access or the base Open House Boost workflow. |
| AC-3 | Every paid or metered capability exposes the customer-facing unit, included allowance, current use, renewal behavior, and overage rule before purchase. |
| AC-4 | A provider outage or entitlement failure cannot corrupt an approved base campaign or silently broaden publication authority. |
| AC-5 | Add-on data is location-scoped, minimized, retained under a documented policy, and excluded from cross-tenant model training. |
| AC-6 | GHL contacts, opportunities, appointments, and workflow state remain the operational system of record. |
| AC-7 | Any add-on output that changes campaign content creates a new immutable draft and must pass the applicable preflight and approval gates. |
| AC-8 | Each add-on has an explicit kill criterion and can be retired with export, revocation, provider-disconnect, and customer-notification procedures. |
| AC-9 | Generic website building, borrower database import, expired or owner-listed prospecting, general design tooling, e-signature, and CRM, LOS, IDX, or lender marketplace replacement remain unreachable. |
| AC-10 | Add-on purchases use a hosted payment surface or provider-hosted fields; raw card numbers and security codes never reach Operation Automated LO. |
| AC-11 | Provider credentials remain server-only and encrypted at rest, and provider callbacks are signature-verified, replay-resistant, idempotent, and tenant-bound. |
| AC-12 | Logs, analytics, support screens, and URLs exclude provider secrets, raw consumer records, and unnecessary contact, property, loan, or campaign content. |

---

## Open questions

- [ ] Which add-on receives the strongest paid commitment from the founding cohort?
- [ ] Which capabilities belong in a higher base plan instead of a separately billed add-on?
- [ ] Which data providers permit Marketplace resale and customer-specific use inside HighLevel?
- [ ] Should an agency buy entitlements centrally or delegate purchase to each installed location?
- [ ] What minimum gross margin and support-time ceiling must every add-on meet?

---

## Related

- [PRD-001: Operation Automated LO](../../in-work/prd-001-operation-automated-lo/prd-001-operation-automated-lo-index.md)
- [2026 build-readiness and research gate](../../../knowledge/private/research/2026-build-readiness-and-research-gate.md)
- [Authenticated Broker Marketplace teardown](../../../knowledge/private/competitive/broker-marketplace-authenticated-teardown.md)
- [Product definition](../../../knowledge/private/product/product-definition.md)
- [LLM generation and unit economics](../../../knowledge/private/ai/llm-generation-and-unit-economics.md)
