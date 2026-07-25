# PRD 001: Operation Automated LO

## Status

In Work. Repository implementation for the PRD-001 core is actively maintained under `library/requirements/in-work/`. Production traffic remains blocked by research, App Test, and compliance gates G1 through G7 in the [2026 build-readiness decision](../../../knowledge/private/research/2026-build-readiness-and-research-gate.md). G8 is `ACCEPTED CONSTRAINT`, never `PASS`: no 15-paid-founder evidence exists, commercial validation is unproven, and 15 paid founders is a post-start target rather than an implementation prerequisite.

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
9. The authenticated dashboard supports switchable light and dark modes without changing approved campaign output.
10. A prepared customer can complete permissions, configuration, verification, and launch readiness without required operator onboarding.
11. Product-owned LLM APIs assist brand and campaign drafting, while deterministic rules and humans retain compliance, approval, and publish authority.
12. The page, PDF, QR destination, Meta launch, email and SMS package, approval, artifact history, and GHL outcomes belong to one campaign record.

## Sub-PRDs

| PRD | Scope | Dependency |
| --- | --- | --- |
| [001j](prd-001j-operation-automated-lo-platform-foundation-runtime-and-delivery.md) | Monorepo, tenant database, runtime contracts, durable tasks, rendering plane, environments, CI, observability, and recovery | None, Phase 0 prerequisite for all product modules |
| [001a](prd-001a-tenant-installation-and-ghl-oauth.md) | Tenant foundation, Marketplace install, signed user context, OAuth, token lifecycle | 001j |
| [001b](prd-001b-brand-partner-and-compliance-profile.md) | Versioned loan officer brand, Realtor partner, compliance, and routing profiles | 001a |
| [001c](prd-001c-campaign-blueprint-and-preflight.md) | Open House Boost blueprint, campaign versions, deterministic preflight, approval state | 001a, 001b |
| [001d](prd-001d-page-pdf-and-creative-rendering.md) | Public campaign page, PDF, QR link, and Meta creative rendering | 001c |
| [001e](prd-001e-meta-ad-launch.md) | GHL Ad Manager discovery, draft, approval, publish, pause, resume, and reporting | 001c, 001d |
| [001f](prd-001f-ghl-lead-routing-and-attribution.md) | Lead capture, GHL contact/opportunity routing, workflow handoff, and outcomes | 001a, 001c, 001d |
| [001g](prd-001g-campaign-and-portfolio-reporting.md) | Loan officer dashboard, exception health, blueprint metrics, and founding-cohort operations | 001e, 001f |
| [001h](prd-001h-self-onboarding-and-launch-readiness.md) | Self-service permission setup, resumable configuration, synthetic test, and Launch Ready state | 001a, 001b, 001e, 001f |
| [001i](prd-001i-ai-assisted-brand-and-campaign-generation.md) | AI-assisted brand intake, campaign copy, model routing, metering, and unit economics | 001a, 001b, 001c |

## End-to-end acceptance criteria

### Installation and access

- A sub-account admin can install the application and open it as a Custom Page in the correct HighLevel location.
- An agency admin can bulk install, and the application obtains a location token for every selected location.
- The backend validates signed HighLevel user context and never trusts a browser-supplied location ID.
- Uninstall blocks new sessions and jobs for that location.
- An authorized administrator can complete the entire location setup without a required Cuantico call or manual operator configuration.
- Missing authority, scope, token, mapping, connection, or policy requirements produce a resumable blocked state with a precise remediation.

### Campaign creation

- A user can complete the loan officer, Realtor, property, routing, and Meta inputs required by Open House Boost.
- The user must attest to property-marketing and asset rights before generation.
- The system creates immutable campaign input and blueprint versions.
- A deterministic preflight blocks missing disclosures, unapproved targeting, unconfirmed tokens, and asset-rights gaps.
- A user can search and filter prior campaigns by Realtor, property, status, event date, and publish date.
- Duplicating a prior campaign creates a new draft with current dependency checks and never mutates the prior campaign or its artifacts.

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
- The supported Special Ad Category value or combination for property-only, mortgage-only, and combined property-plus-mortgage campaigns is based on recorded HighLevel App Test responses and lender-compliance approval, not a hardcoded legacy assumption.

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
- Onboarding progress persists across sessions and devices, and every completion state is based on current server-verified evidence.
- A location cannot become Launch Ready until the synthetic lead path and all required permission and configuration checks pass.
- A restricted Realtor collaborator can view, approve, download, or share only explicitly assigned campaigns and approved artifacts.
- Realtor access never exposes unrelated partners, other campaigns, GHL contact records, borrower details, opportunity notes, credentials, or support data.

### AI generation and economics

- Claude and ChatGPT consumer subscriptions are not used as application infrastructure.
- Every model request is tenant-attributed, versioned, budgeted, and reconciled through the AI usage ledger.
- AI suggestions cannot approve factual or compliance-sensitive profile fields.
- Model output cannot bypass deterministic preflight, named approval, command authorization, or explicit publish confirmation.
- The founding offer includes text generation without paid overages; recurring usage is presented as campaign packs and regenerations instead of raw tokens.
- Normal included usage targets under $5 in monthly text-model cost per active location.

### Dashboard experience

- The authenticated dashboard offers Light, Dark, and System theme preferences.
- First visit follows the browser or operating-system color-scheme preference.
- A manual preference persists for later visits and applies without a page reload.
- The correct theme is applied before first paint with no visible flash or hydration warning.
- Tenant brand overrides compose with both modes through validated semantic tokens.
- Both modes meet WCAG AA contrast and preserve visible focus, non-color status cues, readable charts, and every interactive state.
- Dashboard theme changes do not affect public pages, PDFs, Meta creative, approval versions, or artifact hashes.

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
2. Proceed under the July 20, 2026 G8 `ACCEPTED CONSTRAINT` decision. Treat 15 paid founders as a post-start commercial validation target, not an implementation prerequisite.
3. Implement the Phase 0 portion of 001j: monorepo scaffold, verification, preview environments, App Test harness, golden render fixtures, threat-model harness, and paid-founder demo.
4. Record `PASS`, `ACCEPTED CONSTRAINT`, or `DEFERRED OUT OF CORE` for every core research gate.
5. Complete the tenant, identity, session, token, command, inbox, outbox, durable-task, rendering, observability, and recovery foundation in 001j.
6. Implement 001a through 001d and operate Meta launch manually for an internal proof.
7. Implement 001e against the verified sandbox contract.
8. Implement 001f and pass the verified synthetic lead test.
9. Implement 001h and prove a prepared administrator can reach Launch Ready without operator configuration.
10. Implement 001g for the founding cohort.
11. Implement 001i and prove tenant-isolated model routing, prompt caching, usage reconciliation, and budget enforcement.
12. Complete security review.
13. Complete quality verification against every acceptance criterion.
14. Run the founding beta in no more than the permitted private-app agency count.
15. Submit for public Marketplace review or private-app security review.

## Pre-implementation research gates

The production feature build is a no-go until G1 through G7 in the linked evidence register are each `PASS`, `ACCEPTED CONSTRAINT`, or `DEFERRED OUT OF CORE`. G8 is listed for traceability as an accepted constraint and must never be reported as `PASS`:

1. Direct and agency installation, location-token exchange, signed context, refresh, uninstall, reconnect, and iframe fallback pass in HighLevel App Test.
2. HighLevel provides a written decision on paired core and Ads Publisher apps, requested scopes, and the distribution path beyond five agencies.
3. Meta draft, read-back, explicit publish, progress, pause, resume, rejection, uncertain-write reconciliation, and reporting pass with test assets and no uncontrolled spend.
4. Property-only, mortgage-only, and combined campaign category and targeting behavior pass HighLevel and Meta tests and receive lender-compliance approval.
5. A no-spend Meta test lead proves form mapping, GHL contact, opportunity, assignment, workflow, notification, and attribution behavior.
6. Stripe-hosted external billing and HighLevel install authorization pass success, failure, cancellation, duplicate, delayed, bulk, uninstall, and reinstall cases.
7. Counsel and lender compliance approve the operating model, disclosures, consent, RESPA, Regulation Z, fair-lending, retention, privacy, and communication rules.
8. G8 Demand is `ACCEPTED CONSTRAINT` by explicit product-owner direction to proceed without 15 paid founders. No 15-paid-founder evidence exists, commercial validation remains unproven, and the threshold is now a post-start target.

The App Test harness, golden render fixtures, threat model, and paid-founder demo are evidence-producing work and are allowed before these gates close. They must not become an unreviewed production shortcut.

## Product gates

- Post-start target of at least 15 paid founders. No current evidence establishes this target or validated demand.
- 70 percent reach Launch Ready within 30 minutes without operator configuration
- 50 percent first campaign publish within 14 days
- Under 30 minutes of support per account per month
- 70 percent continuation at $197 per month after 90 days
- Text-model cost under $5 per active location per month at normal included usage

Failure to reach the post-start demand target triggers a stop, kill, or reshape review before expansion or additional investment. Failure of activation or support gates triggers a narrower managed service or internal-tool decision before additional channels are built.

## Related

- [2026 build-readiness and research gate](../../../knowledge/private/research/2026-build-readiness-and-research-gate.md)
- [System build blueprint](../../../knowledge/private/architecture/system-build-blueprint.md)
- [System data model](../../../knowledge/private/architecture/system-data-model.md)
- [System runtime contracts](../../../knowledge/private/architecture/system-runtime-contracts.md)
- [System delivery and operations](../../../knowledge/private/architecture/system-delivery-and-operations.md)
- [Backend readiness assessment, July 21, 2026](../../../knowledge/private/architecture/backend-readiness-assessment-2026-07-21.md)
- [Authenticated Broker Marketplace teardown](../../../knowledge/private/competitive/broker-marketplace-authenticated-teardown.md)
- [PRD-002: Operation Automated LO add-on portfolio](../prd-002-operation-automated-lo-add-ons/prd-002-operation-automated-lo-add-ons-index.md)
