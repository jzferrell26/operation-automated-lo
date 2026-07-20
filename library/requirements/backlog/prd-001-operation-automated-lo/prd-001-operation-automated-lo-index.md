# PRD 001: Operation Automated LO

## Status

Backlog. Demand validation required before full implementation.

## Objective

Deliver an approval-gated HighLevel Marketplace application that lets a mortgage loan officer turn one property into a co-branded Open House Boost campaign, publish it through the location's connected Meta account, route leads into HighLevel, and report outcomes through the mortgage pipeline.

## Primary user story

As a loan officer, I can select a Realtor, enter one property, generate the page and campaign assets, obtain required approvals, publish a Meta campaign, and see the resulting leads and loan outcomes without leaving my HighLevel operating environment.

## Product principles

1. One campaign outcome, not a toolbox.
2. HighLevel is the authenticated front door and CRM system of record.
3. Brand, compliance, and approvals are versioned product data.
4. Generation never equals publication.
5. External writes are explicit, allowlisted, idempotent, and audited.
6. The product is compliance-aware, not a substitute for counsel or lender approval.
7. Property and consumer data are minimized.
8. The initial release is Meta-only and Open House Boost-only.

## Sub-PRDs

| PRD | Scope | Dependency |
| --- | --- | --- |
| [001a](prd-001a-tenant-installation-and-ghl-oauth.md) | Tenant foundation, Marketplace install, signed user context, OAuth, token lifecycle | None |
| [001b](prd-001b-brand-partner-and-compliance-profile.md) | Versioned loan officer brand, Realtor partner, compliance, and routing profiles | 001a |
| [001c](prd-001c-campaign-blueprint-and-preflight.md) | Open House Boost blueprint, campaign versions, deterministic preflight, approval state | 001a, 001b |
| [001d](prd-001d-page-pdf-and-creative-rendering.md) | Public campaign page, PDF, QR link, and Meta creative rendering | 001c |
| [001e](prd-001e-meta-ad-launch.md) | GHL Ad Manager discovery, draft, approval, publish, pause, resume, and reporting | 001c, 001d |
| [001f](prd-001f-ghl-lead-routing-and-attribution.md) | Lead capture, GHL contact/opportunity routing, workflow handoff, and outcomes | 001a, 001c, 001d |
| [001g](prd-001g-campaign-and-portfolio-reporting.md) | Loan officer dashboard, exception health, blueprint metrics, and founding-cohort operations | 001e, 001f |

## End-to-end acceptance criteria

### Installation and access

- A sub-account admin can install the application and open it as a Custom Page in the correct HighLevel location.
- An agency admin can bulk install, and the application obtains a location token for every selected location.
- The backend validates signed HighLevel user context and never trusts a browser-supplied location ID.
- Uninstall blocks new sessions and jobs for that location.

### Campaign creation

- A user can complete the loan officer, Realtor, property, routing, and Meta inputs required by Open House Boost.
- The user must attest to property-marketing and asset rights before generation.
- The system creates immutable campaign input and blueprint versions.
- A deterministic preflight blocks missing disclosures, unapproved targeting, unconfirmed tokens, and asset-rights gaps.

### Assets

- One generation command produces a responsive public page, print-ready PDF, QR link, and Meta creative from the same frozen inputs.
- Every artifact records content hash, template version, source versions, and renderer version.
- Public pages expose only the approved public projection.

### Approval and Meta

- A named authorized user approves the exact campaign version.
- Any material edit invalidates that approval.
- Meta publishing is impossible without a current successful preflight and approval.
- The user sees and confirms page, ad account, budget, dates, category, geography, copy, creative, form, and destination before publish.
- The product can publish, observe progress, pause, and resume through HighLevel.
- Delete, custom-audience upload, Google, LinkedIn, reselling, and autonomous budget-change operations are unreachable.

### Lead path and outcomes

- A synthetic lead creates or matches a HighLevel contact idempotently.
- The lead receives the configured namespaced campaign tag and opportunity mapping.
- The app can add the contact to one configured existing workflow when enabled.
- The dashboard connects campaign spend and leads to appointments, applications, and funded or closed outcomes using GHL IDs and events.

### Security and compliance

- Tokens and Marketplace secrets remain server-only and encrypted at rest.
- Webhooks verify HighLevel's current Ed25519 signature and reject replay.
- Every consequential write has tenant, actor, campaign version, approval, idempotency key, safe request summary, outcome, and correlation ID.
- Cross-tenant, public-page injection, malicious upload, approval bypass, OAuth, webhook, and replay tests pass.
- Mortgage counsel and lender compliance approve the implemented Open House Boost rules before production traffic.

### Operations

- Failed rendering, routing, or provider jobs retry safely and appear in an exception queue.
- Support can diagnose a campaign by correlation ID without viewing secrets or unnecessary consumer data.
- Location export, uninstall, retention, and deletion procedures are documented and tested.

## Non-goals

- Full mortgage CRM or LOS
- Inbound voice or database reactivation
- MLS scraping
- Home value, equity, or refinance prediction
- Generic AI employees
- General-purpose website or design builder
- Google or LinkedIn ads
- Ad-spend rebilling or Realtor cost sharing
- Custom audience uploads
- Automatic optimization of live budgets or targeting

## Delivery sequence

1. Run the $500 founding offer against a working demo.
2. Proceed only if at least 15 customers pay.
3. Implement 001a through 001d and operate Meta launch manually for an internal proof.
4. Implement 001e and prove the full sandbox publish path.
5. Implement 001f and pass a synthetic lead test.
6. Implement 001g for the founding cohort.
7. Complete security review.
8. Complete quality verification against every acceptance criterion.
9. Run the founding beta in no more than the permitted private-app agency count.
10. Submit for public Marketplace review or private-app security review.

## Product gates

- At least 15 paid founders before full implementation
- 70 percent setup completion
- 50 percent first campaign publish within 14 days
- Under 30 minutes of support per account per month
- 70 percent continuation at $197 per month after 90 days

Failure of the demand gate stops implementation. Failure of activation or support gates triggers a narrower managed service or internal-tool decision before additional channels are built.
