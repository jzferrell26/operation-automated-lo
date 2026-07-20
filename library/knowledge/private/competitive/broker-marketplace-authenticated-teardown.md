# Broker Marketplace Authenticated Teardown

> Category: Competitive | Version: 1.0 | Date: July 2026 | Status: Active

This report records authenticated Broker Marketplace product behavior that informs the boundaries and build order for Operation Automated LO.

**Related:**
- [`competitive-landscape.md`](competitive-landscape.md)
- [`../product/product-definition.md`](../product/product-definition.md)
- [`../product/source-asset-inventory.md`](../product/source-asset-inventory.md)
- [`../frontend/ambient-motion-background.md`](../frontend/ambient-motion-background.md)
- [`../../../requirements/backlog/prd-001-operation-automated-lo/prd-001-operation-automated-lo-index.md`](../../../requirements/backlog/prd-001-operation-automated-lo/prd-001-operation-automated-lo-index.md)

---

## Provenance and evidence boundary

- **Target:** Broker Marketplace at `https://broker-marketplace.com/marketplace`
- **Compared against:** Operation Automated LO requirements and knowledge base
- **Account state:** Authenticated paid `lo pro plan` account
- **Role states:** Loan Officer view and the reversible Realtor view
- **Capture date:** July 20, 2026
- **Capture method:** Interactive in-app browser inspection
- **Actions performed:** Read-only navigation, opening non-destructive panels, switching to Realtor view, and restoring Loan Officer view
- **Actions excluded:** Creating records, property searches, uploads, sends, invites, publication, deletion, subscription changes, and API-key access
- **Reference corpus:** No screenshot corpus was committed because visible account screens contained real contact and property data. This report excludes names, emails, phone numbers, addresses, account identifiers, payment details, API credentials, and borrower-level values.

The account showed one paid plan at $249 per month. That observation is `single-state` evidence, not a claim about every Broker Marketplace plan or customer.

---

## Cross-cutting findings

### Broker Marketplace is a suite, not one workflow

The Loan Officer marketplace exposes 20 named tools plus shared navigation for rates, rankings, education, community, newsletters, account settings, and integrations. The product gains perceived value from breadth, but work is divided across separate tools with separate histories, client lists, project lists, and generation flows.

Operation Automated LO should retain its narrower promise. Its advantage is one guided campaign that compiles the page, PDF, QR destination, ad inputs, follow-up package, GHL routing, approval, and reporting from one frozen campaign version.

### A central profile drives many tools

The Branding surface is more strategically important than any individual generator. It centralizes contact information, lending company, title, personal and company NMLS values, licensed states, logo, headshot, brand colors, professional disclaimer, Realtor invitation branding, custom share domain, scheduling link, website and social profiles, privacy and terms links, lead webhooks, email connection, notification preferences, CRM and LOS shortcuts, and a digital business card.

This validates the Operation Automated LO decision to make the versioned brand and compliance profile a foundational onboarding object. Operation Automated LO must add field-level confirmation, lender policy, approved claims, disclosure versions, partner permissions, and immutable campaign snapshots.

### Role-specific product exposure is deliberate

The same paid account can switch between Loan Officer and Realtor views. The Loan Officer view showed 20 tools. The Realtor view showed a narrower 14-tool catalog and excluded several loan-officer-specific surfaces, including refinance mining, loan presentations, income analysis, guideline updates, and the generic website builder. The account was returned to Loan Officer view after inspection.

Operation Automated LO should follow the same principle without reproducing the broad Realtor portal. A Realtor receives campaign collaboration, approval, shared leads, and relevant campaign history. A Realtor does not receive the full loan-officer workspace or tenant administration.

### Broker Marketplace duplicates CRM-shaped data

Clients, HomeAI, Refi Finder, Open House Genie partners, and the buyer portal each maintain product-owned customer, property, partner, invitation, subscription, and activity state. The Clients import accepts CSV or XLSX and expects mortgage, contact, property, closing, loan, rate, and partner fields.

Operation Automated LO should not copy this data architecture. HighLevel remains the system of record for contacts, opportunities, calendars, conversations, and workflow status. The product stores only campaign-specific snapshots, approvals, artifact references, attribution identifiers, and evidence required for auditability.

### The paid plan does not expose a customer-facing token wallet

The observed Billing view showed subscription, statement, and payment management for one $249 monthly plan. No general AI-token wallet or user-facing credit balance was observed in the reviewed surfaces. Individual tools may still have internal limits that were not inspected.

This supports the current Operation Automated LO packaging: include campaign packs and regeneration allowances, meter provider usage internally, and avoid raw token accounting in the customer experience.

---

## Surface analysis

### Marketplace shell and navigation

| surface | present-in-target | present-in-ours | severity | evidence-source | verification-state |
| --- | --- | --- | --- | --- | --- |
| Tool marketplace | Searchable catalog of 20 Loan Officer tools | One campaign workspace is specified | None by design | Authenticated Loan Officer UI | confirmed across role views |
| Realtor catalog | A narrower 14-tool catalog behind a reversible role switch | Narrow collaborator experience is specified | Medium if role boundaries remain implicit | Authenticated Realtor UI | confirmed across role views |
| Shared mortgage context | Persistent mortgage-rate and market widgets appear above most tools | Not specified | Low | Authenticated Loan Officer UI | single-state |
| Theme control | Account menu exposes dark-mode switching | Light, Dark, and System are specified | None | Authenticated account menu | single-state |
| Account packaging | Subscription, statements, payment method, and plan controls | Founding and recurring pricing are specified, billing UI is not | Medium later | Authenticated Billing view | single-state |

The persistent rate and market widgets are useful retention devices, but they do not strengthen the first campaign workflow enough to justify licensed market-data cost in the founding release.

### Brand, compliance, and integrations

| surface | present-in-target | present-in-ours | severity | evidence-source | verification-state |
| --- | --- | --- | --- | --- | --- |
| Core identity | Contact details, company, role, NMLS values, logo, and headshot | Versioned brand and compliance profile is specified | None | Authenticated Branding UI | single-state |
| Licensing | State-by-state licensed selection | Licensed states are specified | None | Authenticated Branding UI | single-state |
| Visual identity | Brand colors, logo crop, primary and secondary actions | Semantic theme and constrained brand tokens are specified | Low | Authenticated Branding UI | single-state |
| Professional disclaimer | One configurable professional disclaimer | Versioned lender, state, offer, and channel disclosure rules are specified | Target is shallower | Authenticated Branding UI | single-state |
| Legal links | Website, privacy, and terms destinations | Public-page legal and consent requirements are specified | Low | Authenticated Branding UI | single-state |
| Custom domain | Existing-domain connection and domain purchase | Campaign-domain support is planned but not prioritized | Medium later | Authenticated Branding UI | single-state |
| Lead webhooks | Configurable webhook destinations by lead type | Native GHL routing plus audited events are specified | Target is broader, ours is more native | Authenticated Branding UI | single-state |
| Email and notifications | Connected email plus module-level notification preferences | Follow-up handoff and operational notifications are specified | Medium | Authenticated Branding UI | single-state |
| CRM and LOS shortcuts | Configurable quick links and connection test | GHL OAuth is core; LOS is a non-goal | None by design | Authenticated Branding UI | single-state |
| External connectors | Named MCP connector beta and API-key connection for automation tools | No public API or MCP surface is specified | Low for founding release | Authenticated integration panel | single-state |

The profile architecture is worth adopting. The generic API connector, LOS link, and broad notification matrix should wait until the campaign workflow proves retention.

### Open House Genie

| surface | present-in-target | present-in-ours | severity | evidence-source | verification-state |
| --- | --- | --- | --- | --- | --- |
| Property lookup | Address, MLS number, or area-based open-house discovery | Manual property input is specified; automatic lookup is deferred | Medium | Authenticated Open House UI | single-state |
| Partner directory | Manual Realtor records with brokerage, status, and open-house history | Partner profile and approval are specified | Medium | Authenticated partner UI | single-state |
| Agent monitor | Connected-agent roster with active and sold listing state | Partner-level campaign engagement is planned | Medium later | Authenticated Agent Monitor UI | single-state |
| Automation | AutoPilot toggle is exposed | Automatic listing discovery is deferred | None by design | Authenticated Open House UI | single-state |
| Artifact history | Searchable and filterable prior flyers by partner, price, generation date, and event date | Campaign history and artifact versions are specified | High if history UX is omitted | Authenticated Prior Flyers UI | single-state |
| Lead summary | Each prior flyer exposes captured-lead count and a lead-detail entry point | Campaign lead attribution is specified through GHL | None | Authenticated Prior Flyers UI | single-state |
| Status | Artifact cards expose active or completed state | Campaign state machine is specified | None | Authenticated Prior Flyers UI | single-state |

The Open House Genie history view is the strongest direct reference for the founding campaign. Operation Automated LO should improve it by treating the page, PDF, QR destination, ad launch, approval, and GHL attribution as one campaign record rather than a flyer record.

### Clients and channel subscriptions

| surface | present-in-target | present-in-ours | severity | evidence-source | verification-state |
| --- | --- | --- | --- | --- | --- |
| Client book | Searchable table with invitation and recent-activity summaries | GHL contacts remain external | None by design | Authenticated Clients UI | single-state |
| Data import | CSV and XLSX import for contact, property, loan, rate, closing, and partner fields | No database import is specified | None by design | Authenticated import panel | single-state |
| Channel consent | Per-client toggles for several newsletters, reports, and portal access | Campaign consent receipt and GHL messaging status are specified | Medium | Authenticated Clients UI | single-state |
| Portal lifecycle | Not invited, pending, claimed, and active states with invitation actions | No homeowner portal is specified | None by design | Authenticated Clients UI | single-state |
| Relationship editing | Co-borrower and Realtor assignment actions | Campaign partner snapshot is specified, borrower graph is not | None by design | Authenticated Clients UI | single-state |

The useful pattern is a compact channel and consent summary. The duplicated client book, co-borrower model, and homeowner portal should not enter the founding release.

### Templates and campaign content

| surface | present-in-target | present-in-ours | severity | evidence-source | verification-state |
| --- | --- | --- | --- | --- | --- |
| Prompted generation | User describes an HTML asset, can dictate, improve the prompt, and attach a reference image | Structured campaign generation is specified | Low | Authenticated template-creation UI | single-state |
| Merge fields | Optional CRM-oriented merge fields can be inserted | Allowlisted brand and campaign tokens are specified | None | Authenticated template-creation UI | single-state |
| Preview | Generated HTML is previewed before use | Page, PDF, creative, and copy previews are specified | None | Authenticated Templates UI | single-state |
| Export | Formatted email, raw HTML, and PDF outputs | Email, SMS, page, PDF, QR, and Meta inputs are specified | None | Authenticated Templates UI | single-state |
| Delivery | Connected email providers can send a template | Existing approved GHL workflow handoff is specified | Target is broader, ours is more native | Authenticated Templates UI | single-state |
| Template library | Search, campaign grouping, edit, preview, and duplicate behaviors | Blueprint library and immutable versions are specified | Medium | Authenticated Templates UI | single-state |

Operation Automated LO should adopt the preview and multi-format export discipline, but generation starts from a campaign blueprint and approved profile rather than an open-ended HTML prompt.

### Website and funnel projects

| surface | present-in-target | present-in-ours | severity | evidence-source | verification-state |
| --- | --- | --- | --- | --- | --- |
| Project types | Multi-page website, conversion funnel, and existing-site clone | Constrained campaign and single-property page renderer is specified | None by design | Authenticated New Project dialog | single-state |
| Project management | Folders, search, rename, duplicate, share, delete, publish state, and update time | Campaign records and immutable artifact versions are specified | Medium | Authenticated Website Builder UI | single-state |
| Publishing | Stable public paths plus optional custom domains | Public campaign slug and CDN are specified | None | Authenticated Website Builder UI | single-state |
| Adjacent modules | Blog posts, analytics, domains, and chatbots share the builder shell | Campaign reporting is specified; blog and chatbot are not | None by design | Authenticated Website Builder UI | single-state |
| Embedded lead capture | Published funnels can include forms and calls to action | GHL or Meta lead capture is specified | None | Authenticated project preview | single-state |

The reusable pattern is lifecycle management around generated public assets. A generic website builder, site cloning, blog engine, and chatbot platform would weaken the product wedge and duplicate HighLevel.

### Design Studio

| surface | present-in-target | present-in-ours | severity | evidence-source | verification-state |
| --- | --- | --- | --- | --- | --- |
| Design categories | Social, property, presentation, and branding assets | Campaign-specific creative and PDF outputs are specified | None by design | Authenticated Design Studio UI | single-state |
| Generative media | Staging, headshots, image expansion, clips, listing video, music, and video tools | Generative image, video, and voice are deferred | None by design | Authenticated Design Studio UI | single-state |
| Asset library | Recent designs, public links, duplication, and deletion | Immutable campaign artifacts are specified | Medium | Authenticated Design Studio UI | single-state |

Operation Automated LO should preserve an artifact library under each campaign but should not expose a free-form design suite in the founding release.

### LoanSight

| surface | present-in-target | present-in-ours | severity | evidence-source | verification-state |
| --- | --- | --- | --- | --- | --- |
| Presentation types | Total-cost, waiting-cost, rent-versus-own, debt, refinance, buydown, and blended-rate presentations | Not included in the founding campaign | Low for founding release | Authenticated LoanSight UI | single-state |
| Reuse | Fee templates and saved scenarios | Campaign blueprints are specified | Low | Authenticated LoanSight UI | single-state |

A future affordability or financing-scenario artifact could strengthen open-house campaigns, but only after formulas, disclosures, lender inputs, and approval rules are validated.

### HomeAI and Refi Finder

| surface | present-in-target | present-in-ours | severity | evidence-source | verification-state |
| --- | --- | --- | --- | --- | --- |
| Homeowner reports | Report generation, report history, portal invitation, and share-link controls | Homeowner nurture is deferred | None by design | Authenticated HomeAI UI | single-state |
| Property and loan dataset | Rate, loan type, balances, close date, value, equity, partner, and report state | Product avoids copying borrower or servicing data | None by design | Authenticated HomeAI UI | single-state |
| Refinance signals | Rate-drop, cash-out, PMI-removal, VA streamline, FHA streamline, and active-listing categories | Licensed-data modules are deferred | None by design | Authenticated Refi Finder UI | single-state |
| Refinance operations | Data upload, export, filtering, notes, snooze, portal invite, and email actions | GHL opportunities and workflows remain the operating surface | None by design | Authenticated Refi Finder UI | single-state |

These tools depend on data rights, update cadence, AVM quality, permissible purpose, consumer expectations, and mortgage compliance. They should be partner integrations or future focused modules, not copied into the initial application.

### Listings Finder and Homes

| surface | present-in-target | present-in-ours | severity | evidence-source | verification-state |
| --- | --- | --- | --- | --- | --- |
| Prospecting data | Expired and owner-listed property search by ZIP, city, or county over time windows | Listing discovery is deferred | None by design | Authenticated Listings Finder UI | single-state |
| Buyer portal | Buyer invitations, search, preview, co-branding, share URL, locale, and custom domain | No buyer-search portal is specified | None by design | Authenticated Homes UI | single-state |
| Partner sponsorship | Realtor-facing property experience can be co-branded | Narrow campaign collaboration is specified | Medium later | Authenticated Homes UI | single-state |

Operation Automated LO should send captured buyers into GHL and campaign-specific destinations. It should not become an IDX portal or prospecting-data vendor.

---

## Product inclusion matrix

| Broker Marketplace pattern | Founding release | Later | Exclude from this product |
| --- | --- | --- | --- |
| Central brand, license, disclosure, and integration profile | Yes |  |  |
| Loan officer and Realtor role separation | Yes |  |  |
| Open-house campaign history and lead counts | Yes |  |  |
| Partner directory and campaign history | Yes, GHL-backed |  |  |
| Page, PDF, QR, creative, and follow-up preview | Yes |  |  |
| Blueprint and artifact library | Yes |  |  |
| Custom campaign domain |  | Yes |  |
| Financing-scenario presentation |  | Yes, after compliance validation |  |
| Homeowner value and refinance signals |  | Yes, through licensed providers |  |
| Limited Realtor engagement dashboard |  | Yes |  |
| Generic website and funnel builder |  |  | Yes |
| Borrower database import and homeowner portal |  |  | Yes |
| Expired and owner-listed prospecting database |  |  | Yes |
| Generic design, video, podcast, and image suite |  |  | Yes |
| E-signature replacement |  |  | Yes |
| CRM, LOS, IDX, or lender marketplace replacement |  |  | Yes |

---

## PRD coverage

| Teardown conclusion | Requirement destination |
|---|---|
| Canonical brand, license, disclosure, legal-link, partner-permission, and GHL-routing profile | [PRD-001b](../../../requirements/backlog/prd-001-operation-automated-lo/prd-001b-brand-partner-and-compliance-profile.md) |
| One campaign record for page, PDF, QR, ad, email, SMS, approval, artifacts, and outcomes | [PRD-001 index](../../../requirements/backlog/prd-001-operation-automated-lo/prd-001-operation-automated-lo-index.md), [PRD-001c](../../../requirements/backlog/prd-001-operation-automated-lo/prd-001c-campaign-blueprint-and-preflight.md), and [PRD-001g](../../../requirements/backlog/prd-001-operation-automated-lo/prd-001g-campaign-and-portfolio-reporting.md) |
| Searchable campaign history, artifact preview, duplication, status, and lead counts | [PRD-001g](../../../requirements/backlog/prd-001-operation-automated-lo/prd-001g-campaign-and-portfolio-reporting.md) |
| Narrow Realtor collaborator access | Base restriction in [PRD-001g](../../../requirements/backlog/prd-001-operation-automated-lo/prd-001g-campaign-and-portfolio-reporting.md), reusable workspace expansion in [PRD-002b](../../../requirements/backlog/prd-002-operation-automated-lo-add-ons/prd-002b-operation-automated-lo-add-ons-realtor-workspace.md) |
| Custom campaign domains and advanced analytics | [PRD-002a](../../../requirements/backlog/prd-002-operation-automated-lo-add-ons/prd-002a-operation-automated-lo-add-ons-domains-analytics.md) |
| Additional campaign blueprints | [PRD-002c](../../../requirements/backlog/prd-002-operation-automated-lo-add-ons/prd-002c-operation-automated-lo-add-ons-blueprint-packs.md) |
| Financing-scenario presentation | [PRD-002d](../../../requirements/backlog/prd-002-operation-automated-lo-add-ons/prd-002d-operation-automated-lo-add-ons-financing-scenarios.md) |
| Homeowner value and equity reports | [PRD-002e](../../../requirements/backlog/prd-002-operation-automated-lo-add-ons/prd-002e-operation-automated-lo-add-ons-homeowner-intelligence.md) |
| Refinance opportunity signals | [PRD-002f](../../../requirements/backlog/prd-002-operation-automated-lo-add-ons/prd-002f-operation-automated-lo-add-ons-refinance-signals.md) |
| Agency portfolio and white-label distribution | [PRD-002g](../../../requirements/backlog/prd-002-operation-automated-lo-add-ons/prd-002g-operation-automated-lo-add-ons-agency-portfolio.md) |
| Constrained campaign media generation without a generic design suite | [PRD-002h](../../../requirements/backlog/prd-002-operation-automated-lo-add-ons/prd-002h-operation-automated-lo-add-ons-creative-media-packs.md) |
| Generic builders, borrower database import, prospecting data, e-signature, and platform replacement | Explicit non-goals in [PRD-001](../../../requirements/backlog/prd-001-operation-automated-lo/prd-001-operation-automated-lo-index.md) and [PRD-002](../../../requirements/backlog/prd-002-operation-automated-lo-add-ons/prd-002-operation-automated-lo-add-ons-index.md) |

---

## Phased build-order recommendation

The ranking below is a recommendation for downstream strategy and PRD review. It is not a build verdict.

1. **P0:** Complete the single canonical brand, compliance, licensing, legal-link, partner-permission, GHL-routing, and notification profile during self-onboarding.
2. **P0:** Make Open House Boost history the central workspace, with campaign status, Realtor, event date, artifact previews, approval state, Meta state, lead count, appointment count, and GHL outcome summary.
3. **P0:** Compile page, PDF, QR destination, ad inputs, email, and SMS from one campaign version. Do not split them into unrelated tools.
4. **P1:** Add reusable blueprint and artifact libraries with preview, duplicate-as-new-draft, immutable approved versions, and public-link management.
5. **P1:** Add the narrow Realtor collaborator view with approval, asset sharing, captured-lead visibility, and campaign history only.
6. **P1:** Add custom campaign domains and campaign-level analytics after the core public renderer is stable.
7. **P2:** Evaluate a lender-approved affordability or financing-scenario artifact for open-house campaigns.
8. **P2:** Evaluate licensed HomeAI or refinance-signal integrations only after the founding campaign reaches activation and retention gates.

---

## Not inspected this pass

- Completing a property search or generating a new open-house artifact
- Lead-detail screens containing real consumer records
- Inviting Realtors, buyers, homeowners, or clients
- Sending email, reports, newsletters, or notifications
- Uploading CSV, XLSX, appraisals, credit reports, or other files
- Publishing or modifying a website, funnel, custom domain, template, or design
- Subscription changes or plan comparison
- Trial, enterprise, team-member, and alternate paid-plan states
- Underlying vendor contracts, data licenses, refresh schedules, and per-use economics
- Public API documentation, source maps, client-bundle feature flags, and private endpoints
- Appraisal, credit-repair, e-signature, PDF-editing, video, podcast, and guideline-update task completion

These exclusions are coverage limits, not confirmed capability gaps.

---

## Routing

- Strategy verdict on which later modules deserve investment: `white-council-guardian`
- PRD changes for an approved phase: `library-guardian`
- Any legal, terms-of-service, code-reuse, or proprietary-asset question: `code-forensics-guardian`
