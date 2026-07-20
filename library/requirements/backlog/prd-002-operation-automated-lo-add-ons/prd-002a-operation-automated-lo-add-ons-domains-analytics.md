# PRD-002a: Custom Campaign Domains and Advanced Analytics

> **Status:** Backlog
> **Priority:** P1
> **Effort:** L (1-3d)

## Goal

Let an entitled location publish approved campaign artifacts on a verified branded domain and understand campaign engagement beyond the base GHL outcome report.

## Dependencies

- PRD-001d public artifact rendering and immutable publication
- PRD-001f GHL attribution
- PRD-001g campaign reporting

## Scope

- Custom domain connection, verification, certificate status, and revocation
- Campaign slug and redirect management
- Campaign-level visits, QR scans, calls to action, lead submissions, and conversion summaries
- Consent-aware, PII-minimized event collection
- Public-link lifecycle and historical integrity

## User stories

- As a loan officer, I can publish campaign links on my approved domain.
- As a location admin, I can verify DNS and see certificate or routing problems without a support call.
- As a campaign owner, I can distinguish page visits, QR scans, form starts, leads, and GHL outcomes.

## Acceptance criteria

- Domain ownership is verified before traffic is served.
- A normalized hostname can belong to only one tenant at a time, and the verification challenge is tenant-bound, single-purpose, and expires.
- A disconnected, transferred, or reattached hostname must be reverified before routing or certificate issuance resumes.
- TLS is required and certificate failures surface a blocked or attention-required state.
- Domain and slug changes use explicit redirects and never repoint an approved URL to another tenant.
- A domain can be disconnected without deleting campaign or audit history.
- Analytics use opaque campaign and artifact identifiers and do not place borrower, contact, or opportunity data in URLs.
- Bot and internal test traffic are labeled or excluded from customer metrics.
- Every metric shows its definition, source, and last-updated time; unavailable values are not displayed as zero.
- Custom-domain publication preserves artifact hashes and approval lineage.
- Disconnect deprovisions tenant routing and certificate bindings so abandoned DNS cannot expose another tenant's campaign.
- The add-on can be disabled without unpublishing the tenant's base product-domain artifacts unless the customer explicitly requests it.

## Commercial gate

Validate willingness to pay in the $39 to $79 monthly range and confirm that domain-support time remains below 15 minutes per active domain per month.

## Out of scope

- Generic website hosting
- Arbitrary reverse proxying
- User-supplied JavaScript or tracking pixels
- Cross-site identity graphs or fingerprinting

## Related

- [PRD-002 index](./prd-002-operation-automated-lo-add-ons-index.md)
- [Authenticated Broker Marketplace teardown](../../../knowledge/private/competitive/broker-marketplace-authenticated-teardown.md)
