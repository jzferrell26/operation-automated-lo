# QA Report: Operation Automated LO Research Package

**Plan document:** `library/requirements/backlog/prd-001-operation-automated-lo/prd-001-operation-automated-lo-index.md`

**Audit date:** 2026-07-19

**Base branch:** `main`

**Head:** `codex/product-research`

**Auditor:** quality-guardian

**Audit boundary:** Research and build-ready requirements only. No application implementation exists.

## Summary

The research package passes its documentation scope. It converts the user brief into a bounded mortgage campaign product, documents the HighLevel Marketplace, OAuth, scope, ads, tenant, data, security, compliance, competitive, and commercial decisions, and decomposes the product into seven build-ready sub-PRDs. This report does not certify working software; every implementation acceptance criterion remains subject to sandbox proof, security review, and implementation QA.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ✅ | Every requested research area and every PRD 001 acceptance criterion is represented in the package. |
| Correctness | ✅ | Claims are tied to primary sources or versioned internal repository evidence, with confidence limits stated. |
| Alignment | ✅ | The package keeps the mortgage campaign wedge, AutomatedLO launch, GHL-native distribution, and Product 1 boundary intact. |
| Gaps | ✅ | Unknown provider behavior, legal decisions, data licenses, and implementation choices are exposed as gates instead of implied as solved. |
| Detrimental | ✅ | The diff contains documentation only, with no executable code, dependency manifest, secret, credential, or client PII. |

## Critical Issues (must fix)

None.

## Warnings (should fix)

None.

## Suggestions (consider improving)

- [ ] **Archive an implementation-date GHL contract snapshot**: `library/knowledge/private/research/sources.md:86`

  The source register correctly notes that scope catalogs and provider payloads change and require App Test validation. When implementation starts, export the selected scopes, endpoint contracts, sample sanitized payloads, and tested account states into a dated contract fixture so later API drift can be distinguished from product regressions.

- [ ] **Refresh the AutomatedLO audience count at launch**: `library/knowledge/private/product/product-definition.md:9`

  The 343-member count is grounded in the internal portfolio factsheet used for this research. Reconfirm the active and reachable member count before calculating launch conversion, then record the dated launch denominator beside the cohort result.

## Plan Item Traceability

The status in this table means the requirement is fully specified in the research package. It does not mean the application behavior has been implemented.

| ID | Plan requirement | Status | Specification location | Notes |
| --- | --- | --- | --- | --- |
| R-1 | Name the product Operation Automated LO | ✅ | `library/knowledge/private/product/product-definition.md:3-13` | Name, category, market, wedge, and first campaign are fixed. |
| R-2 | Build for loan officers, starting with AutomatedLO | ✅ | `library/knowledge/private/product/product-definition.md:7-13` | Initial audience and buyer are explicit. |
| R-3 | Research the full GHL Marketplace, OAuth, scopes, and embedded-app path | ✅ | `library/knowledge/private/integrations/ghl-marketplace-and-scopes.md:3-97` | Distribution, Custom Page, signed context, OAuth lifecycle, scope profiles, and private-app cap are covered. |
| R-4 | Research the UpHex-style ads manager path | ✅ | `library/knowledge/private/integrations/ghl-marketplace-and-scopes.md:81-111` | Read-only discovery, broad write scope, allowlist, draft, read-back, approval, publish, and progress are covered. |
| R-5 | Review reusable patterns from the named repositories | ✅ | `library/knowledge/private/product/source-asset-inventory.md:9-18` | Six repositories are pinned to reviewed revisions and bounded reuse decisions. |
| R-6 | Scale the Whetstone marketing dashboard, single-property sites, and PDFs beyond per-client Lovable projects | ✅ | `library/knowledge/private/product/source-asset-inventory.md:20-42`, `library/knowledge/private/architecture/system-architecture.md:30-44` | Shared tenant primitives, external rendering, durable jobs, and frozen projections replace project forks. |
| R-7 | Select only useful Broker Marketplace capabilities | ✅ | `library/knowledge/private/competitive/competitive-landscape.md:110-147` | Build-now, license-later, and exclude lists are explicit. |
| R-8 | Compare ListReports, myhomeIQ, Marblism, UpHex, and related models | ✅ | `library/knowledge/private/competitive/competitive-landscape.md:15-108` | Capability map and adoption boundaries are documented. |
| R-9 | Define a viable commercial offer without high-touch onboarding | ✅ | `library/knowledge/private/commercial/founding-cohort-plan.md:3-34` | Twenty $500 founders, group setup, inclusions, exclusions, and proof requirements are explicit. |
| R-10 | Define a two-week path to $10,000 | ✅ | `library/knowledge/private/commercial/founding-cohort-plan.md:44-74` | The 14-day launch sequence and collection window are documented. |
| AC-I1 | Sub-account installation and Custom Page access | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001a-tenant-installation-and-ghl-oauth.md:7-16` | Specified in PRD 001a. |
| AC-I2 | Agency bulk install and location-token exchange | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001a-tenant-installation-and-ghl-oauth.md:54-58` | Specified in PRD 001a. |
| AC-I3 | Signed context with no browser-selected tenant | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001a-tenant-installation-and-ghl-oauth.md:21-34` | Specified in PRD 001a. |
| AC-I4 | Uninstall blocks sessions and jobs | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001a-tenant-installation-and-ghl-oauth.md:60-65` | Specified in PRD 001a. |
| AC-C1 | Complete loan officer, Realtor, property, routing, and Meta inputs | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001b-brand-partner-and-compliance-profile.md:16-50`, `library/requirements/backlog/prd-001-operation-automated-lo/prd-001c-campaign-blueprint-and-preflight.md:17-26` | Profiles and campaign input contracts are separated. |
| AC-C2 | Require property and asset-rights attestation | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001c-campaign-blueprint-and-preflight.md:9-14` | Specified in PRD 001c. |
| AC-C3 | Immutable input and blueprint versions | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001c-campaign-blueprint-and-preflight.md:30-36` | Specified in PRD 001c. |
| AC-C4 | Deterministic blocking preflight | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001c-campaign-blueprint-and-preflight.md:38-46` | Rules, findings, terms, targets, and version lineage are explicit. |
| AC-A1 | Generate page, PDF, QR link, and Meta creative from frozen inputs | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001d-page-pdf-and-creative-rendering.md:7-24` | Specified in PRD 001d. |
| AC-A2 | Record artifact source and renderer lineage | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001d-page-pdf-and-creative-rendering.md:19-24` | Specified in PRD 001d. |
| AC-A3 | Expose only an approved public projection | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001d-page-pdf-and-creative-rendering.md:26-34` | Specified in PRD 001d. |
| AC-M1 | Named approval of an exact version | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001c-campaign-blueprint-and-preflight.md:48-55` | Specified in PRD 001c. |
| AC-M2 | Material edits invalidate approval | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001c-campaign-blueprint-and-preflight.md:30-36` | Specified in PRD 001c. |
| AC-M3 | Publishing requires current preflight and approval | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001e-meta-ad-launch.md:47-53` | Specified in PRD 001e. |
| AC-M4 | Final launch summary exposes all material settings | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001e-meta-ad-launch.md:31-37`, `library/requirements/backlog/prd-001-operation-automated-lo/prd-001e-meta-ad-launch.md:47-53` | Mortgage controls and publish confirmation are explicit. |
| AC-M5 | Publish, progress, pause, and resume through HighLevel | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001e-meta-ad-launch.md:47-60` | Specified in PRD 001e. |
| AC-M6 | Destructive and deferred ad operations are unreachable | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001e-meta-ad-launch.md:68-83` | Forbidden route and method tests are required. |
| AC-L1 | Synthetic lead idempotently creates or matches a GHL contact | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001f-ghl-lead-routing-and-attribution.md:20-34`, `library/requirements/backlog/prd-001-operation-automated-lo/prd-001f-ghl-lead-routing-and-attribution.md:57-62` | Specified in PRD 001f. |
| AC-L2 | Apply campaign tag and opportunity mapping | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001f-ghl-lead-routing-and-attribution.md:30-38` | Specified in PRD 001f. |
| AC-L3 | Add to one configured existing workflow when permitted | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001f-ghl-lead-routing-and-attribution.md:30-39` | Consent and DND checks are explicit. |
| AC-L4 | Connect spend and leads to mortgage outcomes | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001f-ghl-lead-routing-and-attribution.md:49-55`, `library/requirements/backlog/prd-001-operation-automated-lo/prd-001g-campaign-and-portfolio-reporting.md:18-24` | Attribution events and dashboard metrics are specified. |
| AC-S1 | Keep tokens and Marketplace secrets server-only and encrypted | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001a-tenant-installation-and-ghl-oauth.md:36-44` | Specified in PRD 001a. |
| AC-S2 | Verify Ed25519 webhooks and reject replay | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001a-tenant-installation-and-ghl-oauth.md:60-65` | Specified in PRD 001a. |
| AC-S3 | Audit every consequential write | ✅ | `library/knowledge/private/security/threat-model.md:65-79`, `library/requirements/backlog/prd-001-operation-automated-lo/prd-001e-meta-ad-launch.md:47-53` | Command gate and audit fields are explicit. |
| AC-S4 | Test tenant, injection, upload, approval, OAuth, webhook, and replay controls | ✅ | `library/knowledge/private/security/threat-model.md:81-92` | Security release gates cover the required threats. |
| AC-S5 | Require mortgage counsel and lender compliance approval | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001c-campaign-blueprint-and-preflight.md:70-75` | Legal and lender approval are production gates. |
| AC-O1 | Retry failed jobs and surface an exception queue | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001f-ghl-lead-routing-and-attribution.md:41-47`, `library/requirements/backlog/prd-001-operation-automated-lo/prd-001g-campaign-and-portfolio-reporting.md:26-30` | Retry and support visibility are specified. |
| AC-O2 | Diagnose by correlation ID without secrets or unnecessary PII | ✅ | `library/knowledge/private/architecture/system-architecture.md:235-258`, `library/requirements/backlog/prd-001-operation-automated-lo/prd-001g-campaign-and-portfolio-reporting.md:26-30` | Observability and safe support output are explicit. |
| AC-O3 | Document and test export, uninstall, retention, and deletion | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001a-tenant-installation-and-ghl-oauth.md:60-65`, `library/knowledge/private/security/threat-model.md:81-100` | Retention duration remains a security decision before production. |
| NG-1 | No full mortgage CRM or LOS | ✅ | `library/knowledge/private/product/product-definition.md:79-102` | Honored. |
| NG-2 | No inbound voice or database reactivation | ✅ | `library/knowledge/private/product/product-definition.md:93-102` | Preserved as Product 1. |
| NG-3 | No MLS scraping | ✅ | `library/knowledge/private/architecture/system-architecture.md:211-219` | Licensed-data path only. |
| NG-4 | No home-value, equity, or refinance prediction in v1 | ✅ | `library/knowledge/private/competitive/competitive-landscape.md:88-102` | Buy or license later. |
| NG-5 | No generic AI employees | ✅ | `library/knowledge/private/competitive/competitive-landscape.md:104-108` | Hidden constrained services only. |
| NG-6 | No general website or design builder | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001d-page-pdf-and-creative-rendering.md:73-80` | Constrained renderer only. |
| NG-7 | No Google or LinkedIn ads in v1 | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001e-meta-ad-launch.md:76-83` | Meta-only scope. |
| NG-8 | No ad-spend rebilling or Realtor cost sharing | ✅ | `library/knowledge/private/commercial/founding-cohort-plan.md:103-110` | Client-owned ad account pays spend. |
| NG-9 | No custom-audience uploads | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001e-meta-ad-launch.md:68-74` | Forbidden in adapter contract. |
| NG-10 | No automatic live budget or targeting optimization | ✅ | `library/requirements/backlog/prd-001-operation-automated-lo/prd-001e-meta-ad-launch.md:55-60` | Material changes require a new version and approval. |

## Files Changed

- `README.md` (M): product summary, decisions, research index, and evidence boundary
- `library/README.md` (A): library map and document lifecycle
- `library/knowledge/private/architecture/system-architecture.md` (A): scalable multi-tenant architecture, data ownership, domain model, rendering, attribution, and migration
- `library/knowledge/private/commercial/founding-cohort-plan.md` (A): $500 founding offer, two-week launch, product gates, and unit economics
- `library/knowledge/private/competitive/competitive-landscape.md` (A): UpHex and adjacent competitor capability analysis with build, buy, and exclude decisions
- `library/knowledge/private/compliance/compliance-and-risk.md` (A): mortgage, co-marketing, advertising, consent, and data boundaries
- `library/knowledge/private/integrations/ghl-marketplace-and-scopes.md` (A): Marketplace distribution, OAuth, scopes, ads, webhooks, rate limits, and launch sequence
- `library/knowledge/private/product/product-definition.md` (A): product wedge, user, outputs, roadmap, boundaries, and success measures
- `library/knowledge/private/product/source-asset-inventory.md` (A): evidence from six internal repositories and extraction decisions
- `library/knowledge/private/research/sources.md` (A): primary sources, internal evidence, confidence notes, and research date
- `library/knowledge/private/security/threat-model.md` (A): trust boundaries, required controls, roles, command gate, and security gates
- `library/knowledge/public/README.md` (A): placeholder for approved public knowledge
- `library/qa/README.md` (A): standalone QA location guidance
- `library/requirements/backlog/prd-001-operation-automated-lo/prd-001-operation-automated-lo-index.md` (A): master PRD, acceptance criteria, non-goals, sequence, and product gates
- `library/requirements/backlog/prd-001-operation-automated-lo/prd-001a-tenant-installation-and-ghl-oauth.md` (A): installation, tenancy, OAuth, token, lifecycle, and resilience requirements
- `library/requirements/backlog/prd-001-operation-automated-lo/prd-001b-brand-partner-and-compliance-profile.md` (A): versioned brand, partner, compliance, and GHL routing profiles
- `library/requirements/backlog/prd-001-operation-automated-lo/prd-001c-campaign-blueprint-and-preflight.md` (A): campaign versioning, preflight, approval, and state requirements
- `library/requirements/backlog/prd-001-operation-automated-lo/prd-001d-page-pdf-and-creative-rendering.md` (A): deterministic public page, PDF, QR, and creative requirements
- `library/requirements/backlog/prd-001-operation-automated-lo/prd-001e-meta-ad-launch.md` (A): constrained GHL Meta discovery, draft, publish, operations, reporting, and forbidden actions
- `library/requirements/backlog/prd-001-operation-automated-lo/prd-001f-ghl-lead-routing-and-attribution.md` (A): consent, idempotent GHL lead routing, workflow handoff, and attribution
- `library/requirements/backlog/prd-001-operation-automated-lo/prd-001g-campaign-and-portfolio-reporting.md` (A): campaign dashboard, exceptions, blueprint learning, cohort, and portfolio reporting
- `library/requirements/backlog/prd-001-operation-automated-lo/reports/2026-07-19-research-quality-review.md` (A): this documentation QA report
- `library/requirements/backlog/prd-001-operation-automated-lo/reports/2026-07-19-security-design-review.md` (A): pre-implementation security review and production gates
- `library/requirements/backlog/prd-001-operation-automated-lo/reports/README.md` (A): report index and implementation boundary
- `library/requirements/completed/README.md` (A): completed-requirement lifecycle placeholder
- `library/requirements/in-work/README.md` (A): active-requirement lifecycle placeholder
- `library/requirements/issues/README.md` (A): issue-requirement lifecycle placeholder
