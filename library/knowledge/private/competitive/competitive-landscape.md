# Competitive Landscape

## Research boundary

This is a public-artifact review completed July 19, 2026. It uses official sites and help centers. No authenticated competitor account was inspected, so implementation details and private screens remain unverified.

## Strategic conclusion

Do not build a bundle of 21 unrelated mortgage tools. The winning product shape is narrower:

> Mortgage-specific campaign blueprints, co-branded assets, approval-gated ad launch, GHL lead routing, and closed-loop reporting in one HighLevel surface.

This combines the strongest public patterns from UpHex, ListReports, myhomeIQ, and Broker Marketplace while avoiding their broadest and most expensive data and workflow surfaces.

## Capability map

| Capability | UpHex | ListReports | myhomeIQ | Broker Marketplace | Operation Automated LO decision |
| --- | --- | --- | --- | --- | --- |
| Reusable ad blueprints | Core strength | Not the focus | Not the focus | Some AI marketing tools | Build mortgage-specific blueprints. |
| Self-serve ad launch | Core strength | Share to Facebook, not verified as full ad orchestration | Not the focus | Not verified publicly | Build through GHL Ad Manager, starting with Meta. |
| Portfolio ad reporting | Core strength | Listing and partner analytics | Homeowner and agent intelligence | Advanced analytics claimed | Build campaign-to-loan metrics, not a generic ad agency dashboard. |
| Co-branded listing assets | Supporting funnel tools | Core strength, 25+ assets | Some co-branded reports and marketing | Open House Genie and Realtor tools | Build a smaller high-value kit tied directly to launch and attribution. |
| Single-property website | Funnel/page tooling | Core strength | Not the primary surface | Open House Genie | Build from existing Florida Fast Offer proof. |
| PDF and print collateral | Supporting | Core strength | Flyers and reports | Design and presentation tools | Build deterministic PDFs from Whetstone proof. |
| Home equity and predictive signals | No | Home reports in adjacent offering | Core strength | HomeAI and Refi Finder | Partner or license later. Do not build in v1. |
| Generic AI employees | No | No | No | Multiple AI content tools | Do not build. Use AI behind a constrained campaign workflow. |
| GHL-native distribution | Core positioning | No | No | CRM integrations claimed | Make this the primary distribution and workflow advantage. |
| Mortgage approval and disclosure versioning | Not mortgage-specific | Provides marketing guidance | Claims compliance controls | Mortgage-specific but implementation unverified | Make frozen versions and named approvals a core product object. |
| Funded-loan attribution | Lead results | Lead capture | Lead and refinance signals | Lead and workflow claims | Differentiate by connecting spend to appointment, application, and funded outcome in GHL. |

## UpHex

### Publicly verified pattern

UpHex publicly presents:

- Reusable Facebook and Google ad templates that preserve offer, media, targeting, forms, and settings
- Client launch from a template library
- A portfolio dashboard for spend, leads, cost, status, connection health, billing issues, and disapproved ads
- Template performance so successful campaigns can be reused
- HighLevel-oriented distribution and white-label client access
- Rebilling and client-credit mechanics in its help center

### What to adopt

- Blueprint as a versioned object
- Pick client, pick blueprint, edit, validate, launch
- Read-back of account connections before launch
- Portfolio health and exception-based reporting
- Template performance that improves the library

### What not to copy initially

- Broad niche library
- Google and LinkedIn support
- Ad-spend rebilling
- Agency-wide generic campaign management
- Autonomous changes to live campaigns

### Differentiation

UpHex optimizes agency ad operations. Operation Automated LO should optimize the complete loan-officer and Realtor campaign, including the property page, PDF, co-branding, disclosures, GHL routing, and mortgage pipeline outcomes.

## ListReports

### Publicly verified pattern

ListReports describes marketing kits with more than 25 assets for listing lifecycle stages. Paired loan officer and agent features include co-branding, flyers, single-property websites, QR and text-to-lead codes, lead notifications, neighborhood information, property reports, and shareable graphics. Its AutoPilot flow can detect new listings and generate paired assets.

ListReports also requires an agent to certify that they are the listing agent or have permission to market the property.

### What to adopt

- Listing lifecycle as reusable campaign blueprints
- Loan officer and Realtor pairing
- Permission attestation before asset generation
- Single-property page, PDF, QR link, and lead capture as one campaign package
- Fast generation from one shared property input

### What to avoid

- Starting with 25 assets
- Depending on unlicensed listing scraping
- Generating collateral that is not connected to distribution or outcomes

The first release should generate six useful outputs well, then add assets only when usage data proves they matter.

## myhomeIQ

### Publicly verified pattern

myhomeIQ publicly offers loan officers homeowner value and equity reports, refinance and buyer signals, predictive homeowner analytics, agent intelligence, unlimited agent connections, co-branded landing pages, and marketing assets. Its business model makes the Realtor relationship part of the loan officer's value proposition.

### What to adopt

- Realtor tools should feel sponsored by the loan officer without becoming a referral-payment mechanism
- The loan officer should see partner-level engagement and opportunity signals
- A future homeowner nurture module can feed actionable campaigns rather than static reports

### What to buy or integrate

Home value, equity, transaction history, predictive mover, and agent production data are data products. They require provider licensing, permissible-use review, refresh logic, and unit economics. They should be integrated later, not recreated from scraped public sources.

## Marblism

Marblism's public product organizes work around named AI employees for executive assistance, sales, reception, social media, blogging, and related tasks.

The useful lesson is a clear division of labor and a conversational entry point. The product mistake would be exposing a generic team of AI agents before the campaign workflow is proven. Operation Automated LO can use specialized services behind the scenes, but the customer should see one campaign outcome, one approval path, and one audit trail.

## Broker Marketplace

Broker Marketplace publicly lists 21 tools across open houses, home equity, refinance mining, loan presentations, wholesale-lender matching, e-signature, home search, calculators, design, video, AI content, websites, rates, rankings, guidelines, Realtor partnerships, CRM integrations, and operations.

### Build now

| Broker Marketplace concept | Operation Automated LO interpretation |
| --- | --- |
| Open House Genie | Open House Boost, with GHL-native lead routing and Meta launch |
| Realtor Partnerships | Partner profile, co-brand approval, dual lead visibility, and campaign history |
| Website Builder | Constrained campaign and single-property page compiler, not a general website builder |
| Design Center | Blueprint-generated creative and PDFs, not a free-form editor |
| CRM and webhooks | Native HighLevel OAuth, contacts, opportunities, calendars, workflows, and events |

### Consider later through licensed data or focused modules

| Concept | Prerequisite |
| --- | --- |
| HomeAI | Licensed value and equity provider plus consumer disclosure review |
| Refi Finder | Licensed loan, property, rate, and equity inputs plus consent-safe campaign routing |
| LoanSight | Lender-approved loan scenario data and Regulation Z review |
| Calculators | Verified formulas, lender disclosures, rate freshness, and legal approval |
| Rate tracking | Licensed data and clear timestamp/source presentation |

### Do not add to this product

- Broker Bot or wholesale lender matching
- Swift Sign
- Homes Portal
- National LO rankings
- Guideline update aggregation
- Community forum
- Support ticket system
- General video studio
- AI podcast production
- Generic email template assistant

These features expand support, data, legal, and product scope without strengthening the initial GHL campaign wedge.

## Competitive advantage to build

The defensible asset is not an AI model. It is the combination of:

1. Mortgage-specific, measured campaign blueprints
2. Versioned brand and lender compliance profiles
3. Co-branded partner approval history
4. HighLevel-native CRM and ad connections
5. Deterministic multi-format asset compilation
6. Campaign-to-funded-loan attribution
7. A distribution channel through AutomatedLO and later GHL agencies

Every founding campaign should improve the blueprint library with structured performance and failure data. The system becomes more valuable as it learns which approved offer, creative, landing page, and routing configuration works for a defined mortgage use case.
