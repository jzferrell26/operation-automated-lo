# Operation Automated LO Project Map

> Category: Product Operations | Version: 1.11 | Date: September 2026 | Status: Active

The canonical internal map of the product boundary, system flow, implementation status, external gates, and next work for Operation Automated LO.

**Related:**

- [Product definition](product-definition.md)
- [PRD-001: Operation Automated LO](../../../requirements/in-work/prd-001-operation-automated-lo/prd-001-operation-automated-lo-index.md)
- [Production execution ledger](../../../../PRODUCTION_EXECUTION_LEDGER.md)
- [External Evidence Sprint (next batch)](../../../../NEXT_BATCH_LEDGER.md)
- [PRD-003: Authenticated Product Activation](../../../requirements/in-work/prd-003-authenticated-product-activation/prd-003-authenticated-product-activation-index.md)
- [PRD-004: Reviewable Go-Live](../../../requirements/in-work/prd-004-reviewable-go-live/prd-004-reviewable-go-live-index.md)
- [HighLevel Marketplace submission packet](highlevel-marketplace-submission.md)
- [Marketplace listing copy pack](marketplace-listing-copy-pack.md)
- [Production tonight operator runbook](../operations/production-tonight-operator-runbook.md)
- [Go-live raid ledger (GGL rows)](../../../../EXECUTION_LEDGER.md#gauntlet-raid-go-live-remaining-in-repo-code)
- [Agent terrain map](../../../../.cursor/rules/core/the-map.mdc) (Codex / Claude / Cursor handoff)

---

## How to use this map

This is the single internal starting point for answering four questions: what the founding product is, how the system works, what the repository has proved, and what still blocks production. It summarizes current state but does not replace the acceptance-criterion ledger, PRDs, security reports, or quality reports linked below.

Agents (Cursor, Claude Code, Codex) should also read [`.cursor/rules/core/the-map.mdc`](../../../../.cursor/rules/core/the-map.mdc) for the short resume brief before picking up parked work.

Before this document, no canonical single project map existed. The information was distributed across the product definition, architecture documents, PRD indexes, readiness gate, and execution ledger.

## Status snapshot

Status date: September 16, 2026.

| Area | Current state |
| --- | --- |
| Delivery | PRD-003a-d on `main` (PRs #54/#55/#57/#58). PRD-004 docs (#60), locally provable go-live code (#61, `f4b79f7`), production-tonight docs (#62, `deeb3e2`), real-Postgres command gate (#65, `c140f11`). `GGL-001` through `GGL-007` and `GGL-010` VERIFIED; `GGL-008` and `GGL-009` VERIFIED (PR #65, with PR #66 closed and unmerged, `c140f11`, CI run `35058370796`); PRD-004d Complete. Operator path blocked: Vercel env (`GGL-B01` through `B03`), portal sign-in (`GGL-B04` through `B07`), listing capture and submit (`GGL-B09`). Listing **content** is authored in-repo under PRD-004e. Live Wave 1 G2 still has no sanitized fixtures. |
| Critical path (Wave 1 G2) | **Try sandbox + Test Link now** per official docs; do not wait for prior Marketplace approval before App Test. G2 harness is ready and fail-closed; **do not invent live G2 evidence** until sanitized fixtures pass `pnpm test:contracts`. |
| PRD-001 lifecycle | `IN WORK`. The repository implementation is complete for every criterion that can be proved locally, but production acceptance is not complete. |
| Acceptance criteria | 305 total: 267 `VERIFIED`, 28 `DEFERRED: LIVE HIGHLEVEL AUTH`, 7 `BLOCKED: EXTERNAL EVIDENCE`, 1 `BLOCKED: G5`, and 2 `ACCEPTED CONSTRAINT` (G4 housing Special Ad Category criteria). |
| Final quality result | `SHIP` for the audited repository implementation. The verdict does not authorize production traffic or convert remaining external gates to pass. |
| Final security result | No unresolved Critical or High finding. The application-wide nonce CSP Medium from 2026-08-12 is closed by Raid A. G2 harness security audit PASS (2026-08-25). |
| Production traffic | Disabled until the required HighLevel App Test (G2/G3/G5), billing (G6), environment, operations, and compliance (G7) evidence is recorded. |
| Distribution gate | G1 is `ACCEPTED CONSTRAINT`. External Marketplace **listing** proof is not a launch prerequisite. App Test via sandbox and Test Link should be attempted now; prior Marketplace approval is not documented as required ([submission packet](highlevel-marketplace-submission.md)). |
| Special Ad Category gate | G4 is `ACCEPTED CONSTRAINT`. Housing Special Ad Category requirements are known and enforced in product; App Test discovery is not a launch prerequisite. |
| Demand gate | G8 is `ACCEPTED CONSTRAINT`, never `PASS`. Commercial validation is unproven, and 15 paid founders is a post-start target. |
| PRD-002 | Backlog only. It is a future-options register and is not authorized for implementation. |

## Done vs pending (librarian summary)

### Done (repository-proved)

1. Locally provable PRD-001 criteria: **267 `VERIFIED`**.
2. Product-owner accepted constraints: G1 (Marketplace listing not a launch gate), G4 (Housing SAC known/enforced), G8 (demand unproven).
3. Raid A application-wide nonce CSP Medium closed; Trigger.dev 4.5.12 dependency follow-up closed.
4. Library Schema v2 scaffold gaps closed (Gauntlet Raid B).
5. External Evidence Sprint prep: [`NEXT_BATCH_LEDGER.md`](../../../../NEXT_BATCH_LEDGER.md) and [`docs/operations/evidence-packs/`](../../../../docs/operations/evidence-packs/README.md) on `main`.
6. G2 harness on `main`: env-gated adapter (`OALO_GHL_LIVE_CAPTURE=authorized` only), nine-case matrix, `pnpm ghl:g2-matrix`, sanitization hardening, contract + unit coverage. Security then quality PASS for the harness PR.
7. PRD-004a in-repo code (`f4b79f7`, PR #61): honest review surfaces when `OALO_REVIEW_SURFACE=authorized`, public-env secret boundary gate, provider default-off tests. See [`EXECUTION_LEDGER.md`](../../../../EXECUTION_LEDGER.md) `GGL-*` rows.
8. Production-tonight requirements authoring: [PRD-004d](../../../requirements/in-work/prd-004-reviewable-go-live/prd-004d-reviewable-go-live-postgres-command-gate.md) closed `GGL-B16` on 2026-09-16 (PR #65, with PR #66 closed and unmerged, `c140f11`, CI run `35058370796`), [PRD-004e](../../../requirements/in-work/prd-004-reviewable-go-live/prd-004e-reviewable-go-live-listing-content-and-demo-script.md) holds the authored listing content, the [operator runbook](../operations/production-tonight-operator-runbook.md) holds the step order and return artifacts, and [`2026-09-16` coverage report](../../../requirements/reports/2026-09-16-production-tonight-requirements-coverage-report.md) shows every parked `GGL-B*` row with an owner. Documentation only: no criterion status changed.

### Pending (external / operator)

1. **Production tonight (PRD-004 operator):** follow the [operator runbook](../operations/production-tonight-operator-runbook.md), which sequences the steps below. Wire `OALO_DATABASE_URL` + `OALO_REVIEW_SURFACE=authorized` on `operation-automated-lo-web`, run [`reviewable-preview-smoke.md`](../../../../docs/operations/evidence-packs/reviewable-preview-smoke.md) (`GGL-B01`–`B03`), then Developer Portal + Test Link (`GGL-B04`–`B07`), then capture and submit the authored listing (`GGL-B09`).
2. **HighLevel App Test** (operator-led): try sandbox + Test Link now; do not invent G2 evidence (`GGL-B10`).
3. Named App Test operator + controlled location credentials/invite for the live OAuth/session matrix.
4. Wave 1 live capture of sanitized fixtures; then flip or residual-ask the 28 `DEFERRED: LIVE HIGHLEVEL AUTH` rows (none flipped yet).
5. Waves 2-7: env/KMS (`GGL-B11`), G3 Meta no-spend, G5 synthetic lead (`GGL-B14`), G6 billing, G7 counsel (`GGL-B13`), timed Launch Ready / AI cost (`GGL-B12`).
6. [PRD-005](../../../requirements/in-work/prd-005-authenticated-review-runtime/prd-005-authenticated-review-runtime-index.md) (authenticated review runtime): completion review findings C1 (runtime request authentication not composed on `main`), C2 (correlation reference validation and approval retry idempotency), and C4 (deployed qualification) remain open. Work is in progress on branch `claude/completion-review-2026-09-19`, unmerged; pull request #67 opened 2026-09-21.
7. Three operator-supplied listing values are still missing: support email, publisher display name, pricing ([PRD-004e](../../../requirements/in-work/prd-004-reviewable-go-live/prd-004e-reviewable-go-live-listing-content-and-demo-script.md)). None was invented.
8. Production traffic remains disabled. PRD-001 stays in `in-work/` until core completion.

## Library and Librarian status

The July Schema v2 migration decisions are implemented: PRD-001 is in `requirements/in-work/`, PRD-002 remains in `requirements/backlog/`, discovery lives under private knowledge, QA reports remain in their authorized locations, and `notes/` contains only its human-owned README. The [Library Schema v2 raid ledger](../../../../LIBRARY_SCHEMA_V2_RAID_LEDGER.md) retains the migration evidence.

A read-only drift check on 2026-09-16 (recorded in the [production-tonight coverage report](../../../requirements/reports/2026-09-16-production-tonight-requirements-coverage-report.md)) again found no legacy v1 directory, no invalid PRD folder name, no duplicate PRD number, no missing PRD index or `qa/` directory, and only its own README in `notes/`. `library/knowledge/public/` now holds its first content: draft customer-facing listing sources under `overview/` and `faqs/`. One low-severity finding stands: 24 directories, mostly private domain folders and per-PRD folders, lack a seeded `README.md`. That is recommended as a separate hygiene pass rather than folded into requirements work. The repository has no open GitHub issues, so no IRD exists or should be invented.

The August 12 read-only drift check found no legacy v1 directory, invalid PRD or IRD folder name, duplicate PRD number, missing PRD index, missing PRD `qa/` directory, or unauthorized notes content. Five scaffold gaps identified in that audit were closed on 2026-08-25 by Gauntlet Raid B: `library/knowledge/private/README.md`, `library/knowledge/private/architecture/README.md`, `library/knowledge/private/standards/` (with README and `documentation-framework.md`), and `library/requirements/backlog/README.md`. No further Schema v2 scaffold gaps remain open as of that date.

## Founding product and system flow

```mermaid
flowchart LR
    LO["Loan officer"] --> GHL["HighLevel Custom Page"]
    GHL --> SESSION["Signed context and server session"]
    SESSION --> SETUP["Location, brand, compliance, routing, and Meta setup"]
    SETUP --> INPUT["Open House Boost campaign inputs"]
    INPUT --> VERSION["Immutable campaign version"]
    VERSION --> COLLATERAL["Collateral projection: Realtor co-branding allowed"]
    VERSION --> PAIDAD["Paid-ad projection: lender or loan officer only"]
    COLLATERAL --> RENDER["Trigger.dev and Playwright rendering"]
    RENDER --> ASSETS["Page, PDF, QR, and approved collateral in R2"]
    PAIDAD --> PREFLIGHT["Deterministic preflight"]
    ASSETS --> PREFLIGHT
    PREFLIGHT --> APPROVAL["Named human approval of exact version"]
    APPROVAL --> DRAFT["HighLevel Meta draft"]
    DRAFT --> READBACK["Read-back and approved-field comparison"]
    READBACK --> CONFIRM["Separate explicit publish confirmation"]
    CONFIRM --> META["Meta through HighLevel"]
    META --> REPORTING["Status, spend, and campaign reporting"]
    ASSETS --> PUBLIC["Published campaign page"]
    PUBLIC --> LEAD["Consent-bound lead intake"]
    LEAD --> ROUTE["Durable HighLevel contact, tag, opportunity, owner, and workflow routing"]
    ROUTE --> ATTRIBUTION["Appointments, applications, and funded or closed outcomes"]
    REPORTING --> DASHBOARD["Loan officer and portfolio dashboard"]
    ATTRIBUTION --> DASHBOARD
    VERSION --> DB["Supabase Postgres with location RLS"]
    APPROVAL --> DB
    ROUTE --> DB
```

HighLevel remains the authority for installation, location context, CRM records, connected Meta assets, workflows, appointments, and provider reporting. Operation Automated LO owns tenant configuration, immutable versions, preflight, approvals, durable commands, generated artifacts, audit history, and attribution links. Meta remains the delivery and policy authority through HighLevel. Stripe owns hosted payment collection and subscription lifecycle.

## PRD and module status

| PRD or module | Scope | Total | Verified | Deferred live auth | Blocked external | Accepted constraint | Blocked G5 | Lifecycle |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 001J | Platform foundation, runtime, delivery, tenancy, durable work, rendering, and operations | 34 | 27 | 4 | 3 | 0 | 0 | In Work |
| 001A | Tenant installation, HighLevel identity, OAuth, token lifecycle, and roles | 41 | 20 | 21 | 0 | 0 | 0 | In Work |
| 001B | Brand, Realtor partner, compliance, and routing profiles | 20 | 20 | 0 | 0 | 0 | 0 | In Work |
| 001C | Open House Boost blueprint, versions, preflight, and approval | 30 | 30 | 0 | 0 | 0 | 0 | In Work |
| 001D | Public page, PDF, QR, collateral, and paid-ad creative rendering | 35 | 35 | 0 | 0 | 0 | 0 | In Work |
| 001E | HighLevel Meta discovery, draft, publish, control, and reporting | 35 | 33 | 0 | 0 | 2 | 0 | In Work |
| 001F | Lead capture, HighLevel routing, workflow handoff, and attribution | 29 | 28 | 0 | 0 | 0 | 1 | In Work |
| 001G | Campaign, outcome, exception, and portfolio reporting | 43 | 43 | 0 | 0 | 0 | 0 | In Work |
| 001H | Self-onboarding, verification, synthetic test, and Launch Ready state | 24 | 20 | 3 | 1 | 0 | 0 | In Work |
| 001I | AI-assisted brand and campaign generation, metering, and economics | 14 | 11 | 0 | 3 | 0 | 0 | In Work |
| **PRD-001 total** | **Founding core** | **305** | **267** | **28** | **7** | **2** | **1** | **In Work** |
| [PRD-002](../../../requirements/backlog/prd-002-operation-automated-lo-add-ons/prd-002-operation-automated-lo-add-ons-index.md) | Future add-on portfolio | Not in the PRD-001 ledger | Not started | Not applicable | Independently gated | Not applicable | Not applicable | Backlog, not authorized |

Repository verification is complete for the 267 locally provable criteria. Two Special Ad Category criteria are product-owner accepted constraints. The remaining 36 criteria require authorized external systems, real environment evidence, named approvals, or measured operating data.

## Hard boundaries

1. The founding release is one Open House Boost workflow for one installed HighLevel location. It is not a generic campaign builder, CRM, LOS, or AI employee platform.
2. Realtor and brokerage identity may appear only in approved collateral, including the public page, PDF, flyer, and QR materials. Paid-ad copy, creative, lead forms, advertiser identity, and calls to action use loan-officer or lender identity only.
3. Collateral and paid ads are separate immutable projections with separate hashes, preflight evidence, and approval summaries.
4. Generation never authorizes publication. A current deterministic preflight, named human approval, provider draft read-back, and separate explicit publish confirmation are required.
5. Meta execution goes through HighLevel. The product does not store direct Meta OAuth credentials.
6. Broad HighLevel OAuth scope is technical permission, not product authorization. Provider routes and methods remain server-side, allowlisted, idempotent, reconciled, and audited.
7. The HighLevel location is the tenant security boundary. The server derives location and role from verified session context, and the browser cannot select another location.
8. HighLevel remains the CRM and connected-ad system of record. The product stores provider IDs, immutable campaign evidence, and normalized attribution, not a duplicate borrower database.
9. Consumer subscriptions to Claude or ChatGPT are not application infrastructure. Model output is an untrusted draft and cannot decide facts, compliance, approval, targeting, budget, or publication.
10. Production traffic stays disabled until the applicable external gates are resolved and recorded. Synthetic repository completeness is not live acceptance.
11. PRD-002 is a future-options register. No add-on enters implementation before the founding core proves its live, compliance, demand, activation, support, and retention gates.

## External gate register

| Gate | Current status | Responsible owner | Required proof |
| --- | --- | --- | --- |
| G1 Distribution | `ACCEPTED CONSTRAINT` | Product owner | External Marketplace distribution proof removed as a launch prerequisite on 2026-08-25. Do not claim a public Marketplace listing or post-five-agency path unless separately authorized. |
| G2 OAuth and session | `DEFERRED FOR NOW` (harness READY; live run awaits operator sandbox/Test Link + sanitized capture) | Engineering, security, product owner, and an authorized HighLevel App Test operator | Signed context, callback, token exchange, refresh, uninstall, reconnect, replay, embedded operation, and first-party fallback in controlled locations. Try App Test now; capture via [`g2-highlevel-app-test.md`](../../../../docs/operations/evidence-packs/g2-highlevel-app-test.md). Do not invent evidence. |
| G3 Meta publish | `BLOCKED` | Engineering and an authorized HighLevel and Meta App Test operator | Draft, read-back, explicit publish, progress, pause, resume, rejection, uncertain-write reconciliation, and reporting with no uncontrolled spend. |
| G4 Special Ad Category | `ACCEPTED CONSTRAINT` | Product owner | Housing Special Ad Category requirements are known and enforced in product. App Test discovery of category combinations is not a launch prerequisite. |
| G5 Lead routing | `BLOCKED` | Engineering, operations, an authorized location administrator or publisher, and compliance | One isolated no-spend test lead proving contact, tag, opportunity, owner, workflow, notification, attribution, replay safety, and reporting exclusion. |
| G6 Billing lifecycle | `BLOCKED` | Product, finance, billing, and engineering | Authorized checkout, charge, entitlement, signed webhook, failure, cancellation, refund, bulk-install, uninstall, and reinstall evidence. |
| G7 Legal operating model | `BLOCKED` | Counsel, lender compliance, security, and legal owners | Approved terms, privacy, DPA, retention, consent, RESPA, Regulation Z, fair-lending, communications, provider terms, subprocessors, and prompt boundaries. |
| G8 Demand | `ACCEPTED CONSTRAINT` | Product owner | Keep commercial validation labeled unproven. Record 15 paid founders only when actual paid-customer evidence exists. |

## Exact non-verified criterion groups

| Status group | Exact criteria | Count | Evidence owner |
| --- | --- | ---: | --- |
| `DEFERRED: LIVE HIGHLEVEL AUTH` | `001J-AC-022` through `024`; `001J-AC-028`; `001A-AC-005` through `016`; `001A-AC-018` through `023`; `001A-AC-026`; `001A-AC-028`; `001A-AC-038`; `001H-AC-002`; `001H-AC-003`; `001H-AC-005` | 28 | Product owner plus an authorized HighLevel App Test operator, with engineering and security review |
| `BLOCKED: EXTERNAL EVIDENCE` | `001J-AC-026` | 1 | Platform security and cloud owner |
| `BLOCKED: EXTERNAL EVIDENCE` | `001J-AC-029` | 1 | Cloud and deployment owner |
| `BLOCKED: EXTERNAL EVIDENCE` | `001J-AC-033` | 1 | Production operations owner |
| `BLOCKED: EXTERNAL EVIDENCE` | `001H-AC-001` | 1 | Product and UX owner |
| `BLOCKED: EXTERNAL EVIDENCE` | `001I-AC-007` | 1 | AI platform owner |
| `BLOCKED: EXTERNAL EVIDENCE` | `001I-AC-013` | 1 | Security and legal owners |
| `BLOCKED: EXTERNAL EVIDENCE` | `001I-AC-014` | 1 | Finance and product owners |
| `ACCEPTED CONSTRAINT` | `001E-AC-005`, `001E-AC-006` | 2 | Product owner: Housing Special Ad Category known and enforced; G4 App Test discovery removed |
| `BLOCKED: G5` | `001F-AC-026` | 1 | Authorized location administrator or publisher plus compliance owner |
| **Total** | **All non-verified criteria** | **36** | **Named external and operating owners above** |

The detailed capture requirements and unblock procedures remain authoritative in the [production execution ledger](../../../../PRODUCTION_EXECUTION_LEDGER.md#exact-external-evidence-asks).

## Prioritized next steps (librarian)

Authoritative batch plan: [External Evidence Sprint](../../../../NEXT_BATCH_LEDGER.md). Packs: [`docs/operations/evidence-packs/`](../../../../docs/operations/evidence-packs/README.md). Agent brief: [the-map.mdc](../../../../.cursor/rules/core/the-map.mdc).

### Now (production tonight: PRD-004 operator + Wave 1 G2)

1. **Operator (tonight):** on existing Vercel project `operation-automated-lo-web`, set server-only `OALO_DATABASE_URL`, `OALO_REVIEW_SURFACE=authorized`, and other secrets per [`docs/production-environments.md`](../../../../docs/production-environments.md). Run [`reviewable-preview-smoke.md`](../../../../docs/operations/evidence-packs/reviewable-preview-smoke.md). Satisfies `GGL-B01`–`B03` when complete.
2. **Human:** sign in to Developer Portal; complete inspection + Test Link (`GGL-B04`–`B07`). See [`highlevel-marketplace-submission.md`](highlevel-marketplace-submission.md).
3. **After smoke + Test Link:** Marketplace submission packet (`GGL-B09`, PRD-004c).
4. **Parallel Wave 1 G2:** try sandbox + Test Link; do not invent evidence; do not flip the 28 deferred auth ACs without sanitized fixtures (`GGL-B10`).
5. Run the G2 matrix in [`g2-highlevel-app-test.md`](../../../../docs/operations/evidence-packs/g2-highlevel-app-test.md) after operator access (`OALO_GHL_LIVE_CAPTURE=authorized` only in the operator shell).

### Parallel when a cloud owner is available (Wave 2)

6. Inventory preview, staging, and dark production resources. Prove environment isolation and KMS rotation/recovery for `001J-AC-026` and `001J-AC-029`. Production traffic stays disabled.

### Parallel in-repo product activation while external gates are parked

PRD-003 is the implementation bridge from the repository-proved PRD-001 contracts to a real authenticated tenant-backed product surface. It replaces the new local filesystem/synthetic campaign path with Postgres persistence, verified server session authority, persisted human approval, and tenant-backed authenticated workspace reads. It does not reopen PRD-001, change G1/G4/G8 dispositions, enable provider traffic, or satisfy any external evidence criterion by itself.

PRD-003 stays in `requirements/in-work/` until operator preview smoke passes. **003a** through **003d** are **done** on `main`. [PRD-004](../../../requirements/in-work/prd-004-reviewable-go-live/prd-004-reviewable-go-live-index.md) **in-repo code is done** (`f4b79f7`, PR #61): `GGL-001`/`GGL-002` VERIFIED in review mode when `OALO_REVIEW_SURFACE=authorized`; `GGL-003`/`GGL-004`/`GGL-005`/`GGL-007`/`GGL-010` VERIFIED; `GGL-008` and `GGL-009` VERIFIED (PR #65, with PR #66 closed and unmerged; pull request #67 opened 2026-09-21, `c140f11`, CI run `35058370796`). On `main` the exported campaign routes and authenticated pages still compose their authentication ports from a static local synthetic default outside synthetic mode (completion review finding C1); closing that default is owned by [PRD-005](../../../requirements/in-work/prd-005-authenticated-review-runtime/prd-005-authenticated-review-runtime-index.md), in progress on branch `claude/completion-review-2026-09-19` and unmerged. **Operator blocked:** `GGL-B01` through `B03` (Vercel env plus smoke log), `GGL-B04` through `B07` (portal unsigned-in), `GGL-B09` (listing capture and submit). Honest `/overview` requires `OALO_REVIEW_SURFACE=authorized` on the review URL; default preview still serves labeled synthetic demo metrics. Do not create a second Vercel project. Do not flip deferred G2 ACs (`GGL-B10`).

Requirements coverage for the operator half is complete as of 2026-09-16: **004d** owns the real-Postgres command gate (`GGL-B16`), **004e** holds the authored customer-facing scope statement, FAQ, paste-ready listing fields, six-frame screenshot shot list, Loom script, and claim audit, and the [operator runbook](../operations/production-tonight-operator-runbook.md) holds step order, per-step return artifacts, and abort conditions. Recorded listing-type default for a newly created app is **Standard**; a White-label listing would require a terminology pass the current shell would fail. No criterion status changed and no listing value was invented.

### Later waves (do not start without the named external unlock)

7. G3 Meta no-spend App Test (Housing SAC only under G4).
8. G5 isolated no-spend synthetic lead (`001F-AC-026`).
9. G6 billing lifecycle; G7 counsel / lender / AI data boundaries.
10. Timed Launch Ready, AI cost checkpoints, and production smoke/rollback/restore (`001H-AC-001`, `001I-AC-007`, `001I-AC-014`, `001J-AC-033`).
11. Keep CI green. Re-run security then quality on auth, request, or browser-security changes.
12. Private beta inside the permitted distribution boundary; measure activation and the post-start 15-paid-founder target without mislabeling G8 as validated demand.
13. Move PRD-001 to `completed/` only after core completion below. Keep PRD-002 in backlog.

## Definition of core completion

PRD-001 core is complete only when all of the following are true:

- All 305 criteria are `VERIFIED`, or an external criterion has an explicitly approved final disposition allowed by the PRD and readiness gate. No criterion is open, silently waived, or represented as live evidence when only synthetic evidence exists.
- G1 through G7 are each `PASS`, `ACCEPTED CONSTRAINT`, or `DEFERRED OUT OF CORE` with named-owner evidence. G1 and G4 are already accepted constraints as of 2026-08-25. G8 remains accurately labeled as an accepted constraint until paid-customer evidence exists.
- One authorized HighLevel location completes installation, launch readiness, the Open House Boost campaign flow, lender-only paid-ad publication, and the isolated lead-routing path under the approved operating model.
- The exact approved campaign version produces the co-branded collateral and separate lender or loan-officer paid-ad projection, with read-back parity, explicit publication, audit history, and outcome attribution.
- Preview, staging, and production resources are isolated; KMS recovery, smoke, rollback, database restore, and provider reconciliation exercises pass.
- Counsel and lender compliance approve the founding blueprint, disclosures, consent, targeting, retention, privacy, Realtor relationship rules, and provider data boundaries.
- The application-wide CSP Medium from 2026-08-12 is closed (Raid A, 2026-08-25); dependency and CI gates are green, and security review runs before final quality verification on the release tree.
- The folder moves from `library/requirements/in-work/` to `library/requirements/completed/` only after the implementation and external acceptance evidence are complete. G8's post-start commercial target can remain an accepted constraint, but it must not be mislabeled as validated demand.

## Sources of truth

| Question | Authoritative source |
| --- | --- |
| What is the product and what is excluded? | [Product definition](product-definition.md) |
| What is the system boundary and end-to-end flow? | [System architecture](../architecture/system-architecture.md) |
| What must the build team construct? | [System build blueprint](../architecture/system-build-blueprint.md) |
| What external research and gates authorize production? | [2026 build-readiness and research gate](../research/2026-build-readiness-and-research-gate.md) |
| What is PRD-001's full founding scope? | [PRD-001 index](../../../requirements/in-work/prd-001-operation-automated-lo/prd-001-operation-automated-lo-index.md) |
| What future work is preserved but unauthorized? | [PRD-002 index](../../../requirements/backlog/prd-002-operation-automated-lo-add-ons/prd-002-operation-automated-lo-add-ons-index.md) |
| What is the exact criterion status and external evidence ask? | [Production execution ledger](../../../../PRODUCTION_EXECUTION_LEDGER.md) |
| What is the short agent resume brief (Codex / Claude / Cursor)? | [Agent terrain map](../../../../.cursor/rules/core/the-map.mdc) |
| What does the operator do tonight, in what order? | [Production tonight operator runbook](../operations/production-tonight-operator-runbook.md) |
| What exactly may the Marketplace listing claim? | [Marketplace listing copy pack](marketplace-listing-copy-pack.md) |
| What does the product tell customers it does today? | [What Automated LO does today](../../public/overview/what-is-automated-lo.md) |
| What is the External Evidence Sprint wave plan? | [Next batch ledger](../../../../NEXT_BATCH_LEDGER.md) |
| What is the final repository quality result? | [Final post-security QA report](../../../requirements/in-work/prd-001-operation-automated-lo/qa/2026-08-12-prd001-core-raid-qa-report-final-post-security.md) |
| What is the final security result and open follow-up? | [PRD-001 core security audit](../../../requirements/in-work/prd-001-operation-automated-lo/qa/2026-08-12-prd001-core-raid-security-audit.md) |
| What did the earlier backend readiness review find? | [Backend readiness assessment](../architecture/backend-readiness-assessment-2026-07-21.md) |
| How is the library organized? | [Library README](../../../README.md) |
| What migrated the library to Schema v2? | [Library Schema v2 raid ledger](../../../../LIBRARY_SCHEMA_V2_RAID_LEDGER.md) |

## Changelog

- v1.11 (2026-09-19): Handoff reconciliation (PRD-005d). Recorded PRD-004d Complete: `GGL-008` and `GGL-009` VERIFIED (PR #65, `c140f11`, CI run `35058370796`, head `dab2ec6`); PR #66 closed and unmerged; pull request #67 opened 2026-09-21, not the gate's proof. Recorded completion review finding C1: on `main` the exported campaign routes and authenticated pages still compose their authentication ports from a static local synthetic default outside synthetic mode; closing it is owned by PRD-005 (005a, 005b), in progress on branch `claude/completion-review-2026-09-19`, unmerged. No acceptance-criterion status changed; `GGL-B01` through `GGL-B03` stay BLOCKED, now sequenced behind PRD-005a and 005b.
- v1.10 (2026-09-16): Copy-overclaim remediation on the PRD-004e listing content after a quality audit reopened three criteria: collateral and present-tense identity-enforcement claims removed from the customer FAQ, three distribution-implying phrases removed from the customer overview and replaced with an explicit "this release does not publish or distribute" statement, and the claim audit rebuilt with per-claim gates. `004E-AC-004` unchanged. Re-audit owed; nothing claimed verified.
- v1.9 (2026-09-16): Production-tonight requirements authoring. Added PRD-004d (real-Postgres command gate, owns `GGL-B16`) and PRD-004e (listing content and demo script), the operator runbook under private `operations/`, the internal listing copy pack, and the first customer-facing drafts under `knowledge/public/`. Recorded Standard as the listing-type default for a new app entry. Documentation only: no acceptance-criterion status changed, no deferred G2 row flipped, no G1/G4/G8 reopened, no production traffic claimed.
- v1.8 (2026-09-16): Recorded PR #61 (`f4b79f7`) locally provable go-live code. `GGL-001`–`GGL-007`, `GGL-010` VERIFIED; operator path `GGL-B01`–`B09` documented. `OALO_REVIEW_SURFACE=authorized` prerequisite for honest review URL.
- v1.7 (2026-09-15): Added PRD-004 Reviewable Go-Live (004a preview smoke, 004b portal/Test Link, 004c Marketplace submission). PRD-003a-d done; parent exits on 004a. Reviewable preview smoke evidence pack added.
- v1.6 (2026-09-15): Recorded PRD-003c (`71c371d`, PR #57) and PRD-003d (`26051b3`, PR #58) as done on `main`. Parent PRD-003 stays in `in-work/`. Preview/review smoke is blocked on existing-project env + Postgres. No second Vercel project. No Marketplace submit.
- v1.5 (2026-09-15): Recreated Marketplace submission packet. App Test is "try sandbox + Test Link now"; do not invent G2 evidence. PRD-003 in-work: 003a done (`70531fb`), 003b done (`2ee2634`), review dashboard merged (`6f64201`).
- v1.3 (2026-08-26): Recorded External Evidence Sprint prep (PR #26) and G2 harness (PR #27) on `main`. Critical path parked on HighLevel app approval. Added done/pending summary and librarian next steps. Linked agent terrain map.
- v1.2 (2026-08-25): Recorded Gauntlet squash-merge to `main` (PR #25). Pointed next steps at the External Evidence Sprint and evidence packs. G2 App Test is the primary unblock.
- v1.1 (2026-08-25): Recorded product-owner accepted constraints for G1 (external distribution removed) and G4 (Housing Special Ad Category requirements known). Updated criterion counts and next steps.
- v1.0 (2026-08-12): Established the first canonical project map from the final PRD-001 RAID ledger, security close-out, and post-security QA report.
