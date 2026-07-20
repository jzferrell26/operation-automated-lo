# PRD-002d: Lender-Approved Financing Scenario Presentations

> **Status:** Backlog
> **Priority:** P2
> **Effort:** XL (> 3d)

## Goal

Generate a co-branded, lender-approved financing or affordability presentation that can attach to a campaign without presenting an unverified quote or replacing a loan officer's approved pricing system.

## Candidate scenarios

- Rent versus own
- Cost of waiting
- Temporary buydown
- Blended-rate comparison
- Total-cost comparison

Debt consolidation and refinance analysis require separate review because they introduce additional consumer-data and suitability risk.

## Acceptance criteria

- Every formula, rounding rule, fee assumption, source, timestamp, disclosure, and expiration rule is versioned.
- Customer-entered or provider-sourced rate and fee values identify their source and effective time.
- The presentation distinguishes estimates, assumptions, and lender-approved terms.
- Missing, stale, or unauthorized rate and fee inputs block generation or display a lender-approved non-quote mode.
- A presentation cannot state approval, qualification, savings, or guaranteed payment outcomes without an explicitly approved rule and source.
- Material input changes create a new version and invalidate approval.
- The artifact includes the responsible loan officer, lender, NMLS values, applicable disclosures, and a clear next action.
- Scenario inputs are minimized and do not require credit reports, bank data, Social Security numbers, or a copied loan application.
- Public links and analytics use opaque scenario identifiers and do not place consumer, property, loan, rate, or contact fields in URLs.
- Lender compliance signs off on golden examples before any tenant can enable the add-on.

## Commercial gate

Validate in the $49 to $99 monthly range and prove that lender-specific configuration can remain tenant data rather than custom code per lender.

## Out of scope

- Loan pricing engine
- Prequalification or underwriting decision
- Automated suitability or financial advice
- Credit-report ingestion
- Loan Estimate or Closing Disclosure replacement

## Related

- [PRD-002 index](./prd-002-operation-automated-lo-add-ons-index.md)
- [Compliance and risk](../../../knowledge/private/compliance/compliance-and-risk.md)
