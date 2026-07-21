# G8 Demand Evidence Register

## Gate State

**Gate:** At least 15 paid founders accept the defined core offer.

**Current status:** ACCEPTED CONSTRAINT, not PASS.

**Product-owner direction:** On 2026-07-20, the product owner directed the team to proceed without the 15 paid founders.

**Evidence state:** No evidence packet currently demonstrates 15 eligible, distinct paid founder accounts. Commercial validation remains unproven.

This file defines the evidence contract. It contains no live participant records and cannot establish G8 PASS by itself. The experiment remains available as post-start learning.

This decision applies only to G8. G1 through G7 remain separate and unchanged.

## Authoritative Sources

| Evidence | Authoritative system | Stored in Git |
| --- | --- | --- |
| Offer and demo version | Approved internal release record | Version label only |
| Eligibility decision | Authorized application or CRM | Aggregate count only |
| Payment completion | Authorized payment provider | Aggregate count and reconciliation checksum only |
| Refund or cancellation | Authorized payment provider | Aggregate count only |
| Interview consent and notes | Authorized research system | No |
| Gate decision | Signed internal review record | Decision summary only |

## Counting Contract

A founder account counts only when:

1. The applicant meets the approved eligibility rules.
2. The account accepted the same versioned offer.
3. A signature-verified provider event or authenticated provider API read-back records a completed $500 payment and is reconciled idempotently. A browser success redirect never counts.
4. The payment is not a test, duplicate, complimentary, team-owned, canceled, charged-back, or refunded transaction at the decision timestamp.
5. The purchaser saw or received the truthful product boundary, including synthetic, manual, unavailable, and gated functionality.

One organization or controlled HighLevel location may count only once under the final eligibility policy. The policy must be frozen before results are reviewed.

## Safe Per-Founder Reconciliation Schema

The actual register belongs in an access-controlled system, not this repository.

| Field | Rule |
| --- | --- |
| founder_evidence_id | Random internal identifier with no name or email embedded |
| offer_version | Required |
| demo_version | Required |
| eligibility_version | Required |
| eligibility_state | eligible, ineligible, pending |
| payment_reference | Opaque authorized provider reference, never card data |
| payment_state | pending, completed, failed, canceled, refunded, disputed |
| gross_amount_usd | Expected 500.00 for a qualifying payment |
| paid_at | Timestamp from authoritative provider event |
| refund_or_cancellation_at | Optional authoritative timestamp |
| duplicate_group_id | Optional pseudonymous deduplication reference |
| boundary_acknowledged_at | Timestamp proving receipt of the versioned scope boundary |
| reviewer_state | pending, included, excluded |
| exclusion_reason | Controlled reason with no free-form PII |

## Prohibited Evidence

- Card number, bank information, CVV, billing credentials, or payment secrets
- HighLevel, Meta, Stripe, email, or other provider credentials
- Borrower, lead, applicant, or consumer records
- Raw interview recordings or unredacted transcripts in Git
- Names, email addresses, phone numbers, or physical addresses in this repository
- Screenshots containing customer, payment, CRM, or provider data
- Verbal interest treated as payment

## Aggregate Run Record

| Field | Value |
| --- | --- |
| experiment_id | g8-founding-cohort-2026-01 |
| offer_version | Pending approval |
| demo_version | Pending UI Foundation handoff |
| launch_timestamp | Pending |
| decision_timestamp | Pending |
| eligible_audience_reached | Pending |
| demo_registrations | Pending |
| demo_attendance | Pending |
| eligible_applications | Pending |
| checkout_starts | Pending |
| gross_completed_payments | Pending |
| excluded_payments | Pending |
| refunds_cancellations_disputes | Pending |
| qualifying_paid_founder_accounts | Pending |
| reconciliation_checksum | Pending |
| independent_reviewer | Pending |
| decision | ACCEPTED CONSTRAINT on 2026-07-20, not PASS |

## Decision Rules

- 15 to 20 qualifying paid accounts: eligible for independent G8 PASS review.
- 10 to 14 qualifying paid accounts: commercially inconclusive. Hold a documented learning review.
- 0 to 9 qualifying paid accounts: reshape or stop after validating experiment execution integrity.
- Any material offer, price, eligibility, refund, or demo-boundary change creates a new experiment version. Do not pool incomparable results.

These rules classify evidence from any later experiment. They do not prohibit implementation under the 2026-07-20 product-owner decision, and they do not convert the current ACCEPTED CONSTRAINT status into PASS.
