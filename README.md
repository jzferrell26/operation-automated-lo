# Operation Automated LO

Operation Automated LO is a proposed HighLevel Marketplace application for mortgage loan officers. Its first product wedge is a partner campaign engine that turns one property, event, or mortgage offer into a co-branded campaign, routes every lead into the loan officer's own HighLevel sub-account, and connects ad spend to pipeline outcomes.

The first vertical slice is **Open House Boost**:

1. Select or invite a Realtor partner.
2. Enter a property and confirm permission to market it.
3. Generate a co-branded single-property page, marketing PDF, QR link, Meta creative, lead form, and follow-up package.
4. Run brand, disclosure, consent, and targeting preflight checks.
5. Require a named approver before any ad is published.
6. Route leads, appointments, applications, and closed loans back to the campaign dashboard.

This repository currently contains the research and requirements package. It does not yet contain the application implementation.

## Decision summary

- Build a multi-tenant SaaS that is embedded in HighLevel through a Marketplace Custom Page.
- Treat HighLevel as the front door and CRM system of record, not as the application database.
- Host public campaign pages and generated assets in the application, not in one Lovable project per client.
- Provide a switchable light and dark dashboard, with system preference as the first-visit default.
- Use HighLevel's connected Meta assets and Ad Manager APIs where possible.
- Start with Meta and Open House Boost. Defer Google, LinkedIn, audience uploads, automated budget changes, and ad-spend rebilling.
- Position the product as compliance-aware and approval-gated. Never position it as automatically compliant.
- Keep inbound voice and database reactivation in the separate Product 1 offer.
- Validate demand with the AutomatedLO community before funding a full Marketplace build.

## Research package

- [Product definition](library/knowledge/private/product/product-definition.md)
- [Reusable source-asset inventory](library/knowledge/private/product/source-asset-inventory.md)
- [GHL Marketplace, OAuth, and scope plan](library/knowledge/private/integrations/ghl-marketplace-and-scopes.md)
- [System architecture](library/knowledge/private/architecture/system-architecture.md)
- [Competitive landscape](library/knowledge/private/competitive/competitive-landscape.md)
- [Mortgage marketing compliance boundaries](library/knowledge/private/compliance/compliance-and-risk.md)
- [Founding cohort and validation plan](library/knowledge/private/commercial/founding-cohort-plan.md)
- [Security threat model](library/knowledge/private/security/threat-model.md)
- [Research sources](library/knowledge/private/research/sources.md)
- [PRD 001](library/requirements/backlog/prd-001-operation-automated-lo/prd-001-operation-automated-lo-index.md)

## Research status

Research snapshot: July 19, 2026.

Public competitor findings are based on official sites and help centers. No authenticated competitor account was used. GHL endpoint and scope behavior must still be proven in a HighLevel App Test account before implementation is promoted beyond a private beta.
