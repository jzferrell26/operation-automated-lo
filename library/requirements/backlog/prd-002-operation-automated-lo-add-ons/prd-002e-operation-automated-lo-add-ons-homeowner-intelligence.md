# PRD-002e: Licensed Homeowner Intelligence

> **Status:** Backlog
> **Priority:** P2
> **Effort:** XL (> 3d)

## Goal

Offer periodic, co-branded homeowner value and equity reports through a licensed provider while keeping HighLevel as the engagement system of record.

## Scope

- Licensed property, value, and equity data retrieval
- Report generation and history
- GHL contact association by provider and GHL identifiers
- Consent, cadence, pause, resume, and revocation
- Approved share link and engagement events

## Acceptance criteria

- Provider contracts explicitly permit the intended customer use, resale, report generation, and retention model.
- A report labels the valuation source, confidence or range when supplied, data date, limitations, and non-appraisal status.
- The system never represents an automated valuation as an appraisal or guaranteed sale value.
- Report creation requires an authorized contact association and documented communication basis.
- GHL remains the source of truth for contact communication status and workflow activation.
- The product stores only the minimum provider response needed for the report, audit, and permitted history.
- Provider data is not used to train shared models or exposed across tenants.
- Public links, telemetry, logs, and support screens use opaque identifiers and exclude raw contact, property, loan, value, balance, and equity records.
- A customer can pause future reports, revoke a public link, disconnect the provider, and request permitted deletion.
- Provider outage, stale data, or low-confidence output prevents a misleading report from being sent.

## Commercial gate

No build begins until provider pricing, minimum commitments, refresh costs, cancellation terms, and Marketplace resale rights support the target provider-cost-plus-$99-to-$199 monthly packaging.

## Out of scope

- Appraisal
- Homeowner portal that duplicates HighLevel
- Automated loan advice
- Unlicensed scraping or enrichment
- Property search or IDX

## Related

- [PRD-002 index](./prd-002-operation-automated-lo-add-ons-index.md)
- [Authenticated Broker Marketplace teardown](../../../knowledge/private/competitive/broker-marketplace-authenticated-teardown.md)
