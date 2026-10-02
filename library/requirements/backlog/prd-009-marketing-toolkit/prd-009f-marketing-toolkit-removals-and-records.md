# PRD-009f: Marketing Toolkit - Removals and Records

> **Parent:** [PRD-009](./prd-009-marketing-toolkit-index.md)
> **Status:** Backlog. Authored 2026-10-01; revised the same day for OD-H (the register gains the Open House Boost scope and naming, and drops the co-branding and storage rows the first draft carried).
> **Priority:** P0 for the removals (OD-D); P1 for the records.
> **Schema changes:** None
> **Owner Guardians:** `react-guardian` (removals, redirects, the gone page, the Realtor partners line); `technical-writing-craft-guardian` (copy under the contract); `library-guardian` (the register, ledger, README, maps, operator checklist)

## Goal

1. **Remove the CRM.** Leads and Pipeline, Automations, the Reports page, Workspace tools, the Marketing Suite hub and its five sub-pages, and the "Expand Marketing" toggle leave the product. Every old address has a stated fate: a redirect to where the job now lives, or a 404 that says where the job went.
2. **Retire "Open House Boost"** from everything a person reads (D-16), and keep Realtor partners as a plain, honest list (D-20).
3. **Keep the records true.** Every prior criterion, ledger row, and spec PRD-009 changes is superseded in place with a dated note, never deleted. The README, the maps, the ledger, the public docs, and the operator checklist describe the toolkit.

## Background (honest)

1. **The removed pages have no route files of their own.** `/leads`, `/leads/pipeline`, `/automations`, and `/marketplace`, like `/marketing*`, `/partners`, and `/settings*`, are served by the catch-all `apps/web/src/app/(authenticated)/[...workspacePath]/page.tsx:10-27`, keyed by `workspaceRoutes` (`apps/web/src/features/workspace/model.ts:4-21`) in review mode and `previewPaths` (`apps/web/src/features/dashboard-preview/model.ts`, the keys at `:185-195`) in the dashboard preview. An unknown key calls `notFound()`. The catch-all stays, because it serves pages that survive.
2. **The Reports page** has its own route, `apps/web/src/app/(authenticated)/reports/page.tsx`, which shows six not-connected measures in review mode (`:15-37`).
3. **The full footprint** (screens, shared pieces to keep, tests to delete or edit, Playwright specs, 8 Reports baselines, the sign-off rows) is in [recon section 1](research/2026-10-01-oalo-toolkit-recon.md). It is this lane's checklist.
4. **The banner and connection sentences.** `apps/web/src/copy/user-language.ts:17-50` holds the not-connected constants, several of which name Stripe; the user-language contract section 5 (`library/knowledge/private/standards/user-language-contract.md:97-108`) is their source. D-8 drops Stripe from ad-related sentences and puts billing under Settings, Account, "Plan and usage".
5. **"Open House Boost" is in rendered copy** beyond the create flow: the site description (`apps/web/src/app/layout.tsx:18`), the sign-up lead "Then we'll set up your first Open House Boost together." (`apps/web/src/copy/auth-messages.ts:41`), and the Campaigns page (`apps/web/src/app/(authenticated)/marketing/campaigns/page.tsx:27-41`), among others.
6. **Public sentences become untrue.** `library/knowledge/public/overview/what-is-automated-lo.md:21` names Open House Boost as the one workflow, `:28` promises a guided setup walkthrough, and `:29` describes entering open house and property details; the FAQ (`library/knowledge/public/faqs/open-house-boost-faq.md`) answers for that flow.
7. **Realtor partners today** is the "partners" view of the catch-all, titled "Your Realtor partners" (`apps/web/src/features/workspace/workspace-screen.tsx:35-38`), with an editor of name, brokerage, email, and phone (`apps/web/src/features/workspace/preference-editors.tsx:137-330`; `apps/web/src/features/workspace/model.ts`, `PartnerSchema`).

## Scope

- Removals and redirects across review, synthetic, and dashboard preview modes; the gone page; the Realtor partners line.
- `apps/web/src/copy/user-language.ts` (this lane owns it in PRD-009; other lanes add strings in their own new copy files) and the other copy files that render "Open House Boost".
- The register below, applied in every file it names (the `ux-ui/` rows by 009a, every other row by this lane).
- `EXECUTION_LEDGER.md`, `README.md`, `.cursor/rules/core/the-map.mdc`, `library/knowledge/private/product/project-map.md`, `library/knowledge/private/operations/finish-line-operator-checklist.md`, the public docs, and the lifecycle READMEs.

## Non-Goals

- Deleting saved data. Message drafts, campaign rows (including open house versions), partners, setup progress, and preferences stay in the database.
- Editing reports. A report in `library/requirements/reports/` or a PRD's `reports/` or `qa/` folder records its own date; this lane notes which ones PRD-009 overtakes and does not edit them.
- Changing the status of any ledger row (MTK-006).
- Any new feature for Realtor partners (D-20).

## Design decisions

### D1. Every old address's fate

From `design/00-direction.md` section 3.3, with the owner's D-6 and D-12 answers (the designer's recommendations):

| Address today | Fate |
|---|---|
| `/overview` | Kept: Home |
| `/marketing` | Redirect to `/marketing/campaigns` |
| `/marketing/campaigns`, `/marketing/campaigns/new`, `/marketing/campaigns/[campaignRef]` | Kept ("Your campaigns", "Launch an ad", the campaign page) |
| `/marketing/campaigns/library` | New: the "Ads library" tab (009c) |
| `/marketing/property-sites`, `/marketing/creative`, `/marketing/ads`, `/marketing/messaging` | Redirect to `/marketing/campaigns` (saved message drafts stay in the database) |
| `/marketing/blueprints` | Redirect to `/marketing/campaigns/library`: the library is what templates were reaching for |
| `/brand`, `/partners`, `/homeowners`, `/homeowners/new`, `/homeowners/[propertyId]` | Kept |
| `/leads`, `/leads/pipeline`, `/automations` | 404 with the gone page: "This page is gone. Your leads, pipelines and follow-up live in HighLevel." and "Go to Home". Lead routing survives at `/settings/routing` |
| `/reports` | Redirect to `/marketing/campaigns`: results live on each campaign's page |
| `/marketplace` | Redirect to `/overview` |
| `/settings`, `/settings/account`, `/settings/connections`, `/settings/routing`, `/settings/billing` | Kept. `/settings/routing` is titled "Where new leads go in HighLevel"; `/settings/billing` is linked from Account as "Plan and usage" |
| `/settings/profile` | Redirect to `/brand` |
| `/settings/team` | Redirect to `/settings/account` |
| `/onboarding` | Redirect to `/overview`: the checklist lives on Home |
| `/marketing/campaigns/synthetic-open-house-001`, `/design-surfaces`, public pages | Unchanged |

The gone page is used only for the three CRM addresses. Any other unknown address keeps the ordinary not-found page, so the gone sentence never appears where it would not be true.

### D2. Realtor partners stays a plain list (D-20)

The page keeps its list and editor (name, brokerage, email, phone) and gains one line at the top: "Your ads show only you. Realtor partners never appear in paid ads." Nothing new is built for it, it leaves the Home checklist (009b), and the launch flow reads it only to keep partner names out of an ad's words (009d D5). What the page is for is an owner question (index, Open questions).

### D3. Superseded, not deleted

Each register row is applied in its own file as a dated note beside the original text: "Superseded on <date> by PRD-009 (<decision or criterion>): <one-line reason>." or "Re-scoped on <date> by PRD-009: <what it now covers>." or "Amended on <date> by PRD-009: <the change>." The original text stays readable. A ledger row keeps its status cell and gains one marker sentence at the end of its last cell.

## Supersession register

Dated 2026-10-01, on the owner's decisions OD-A to OD-H and his design answers, with the designer's recommendations applied to every open decision he has not answered. "In part" means only the named clause changes. "Re-scoped" means the criterion still holds and now covers the new screens. "Amended" means the rule stands with a changed object.

### Requirements and their ledger rows

| Row | Source | What it says | Fate | By |
|---|---|---|---|---|
| S-01 | `in-work/prd-001-operation-automated-lo/prd-001-operation-automated-lo-index.md:9`, `:13` | The goal and user story: turn one property into co-branded collateral plus a paid campaign; select a Realtor and enter one property | Superseded in part: the loan officer chooses a curated library ad and launches it; collateral is not in this product's scope; leads still go to HighLevel | OD-H |
| S-02 | same file `:24` | "The initial release is Meta-only and Open House Boost-only." | Superseded in part: Meta-only and library-ads-only | OD-H |
| S-03 | same file `:52` | Create one Open House Boost campaign from user-supplied property facts and media | Superseded: one campaign from a library ad | OD-H |
| S-04 | same file `:58` | Goal 9: status, spend, leads, appointments, and pipeline outcomes | Superseded in part: spend, leads sent to HighLevel, and cost per lead on the campaign page; appointments and pipeline stay in HighLevel | OD-A, OD-D |
| S-05 | same file `:75`, `:148` | Counsel and lender approve the Open House Boost operating model and rules | Amended: they approve the library-ad operating model and each library ad (`compliance-and-risk.md:74`) | OD-H |
| S-06 | same file `:87` | Sub-PRD 001c is the Open House Boost blueprint | Amended: the library-ad blueprint joins it; open house versions stay readable | OD-H |
| S-07 | same file `:108-109` | The user completes the Realtor, property, and other Open House Boost inputs and attests to property and asset rights | Superseded for library ads: no property or Realtor input; the curator answers for the art | OD-H |
| S-08 | same file `:112` | Search and filter campaigns by Realtor, property, status, event date, and publish date | Superseded: no search or filters yet | OD-H, D-17 |
| S-09 | same file `:140` | The dashboard connects spend and leads to appointments, applications, and funded outcomes | Superseded | OD-A, OD-D |
| S-10 | `prd-001g-campaign-and-portfolio-reporting.md:19-28` | Loan officer dashboard: six-plus figures, history search, campaign detail as page, PDF, QR, email and SMS package | Superseded in part: three figures on the campaign page (009e), no search yet, the library ad is the founding output. Source and freshness (`:25`), missing as unavailable (`:26`), and test-lead exclusion (`:27`) still hold | OD-A, OD-D, OD-H |
| S-11 | same file `:30-34` | Dashboard surfaces health exceptions | Superseded in part: connection problems show on Home's checklist as "Needs attention" and on the campaign page | OD-C, OD-D |
| S-12 | same file `:44-49` | Founding-cohort reporting, including support-time entry, in the product | Superseded as a loan-officer product surface: the Reports page and its support-time entry are removed | OD-D |
| S-13 | same file `:51-55` | Agency portfolio, the `/reports` page | Superseded | OD-D |
| S-14 | same file `:68` | A first-time user receives the device's theme | Superseded: Light on first visit; `:69-70` still hold in behaviour | OD-E, D-5 |
| S-15 | `in-work/prd-005-authenticated-review-runtime/prd-005e-authenticated-review-runtime-deployed-qualification.md:68` (`005E-AC-010`; ledger `CRR-082`, `EXECUTION_LEDGER.md:493` and `:514`) | Proof point 6 reads `/overview` and `/reports` against the "REVIEW / DEMO / NOT CONNECTED" banner | Wording amended: `/overview` and a campaign page, each with its own not-connected statement; no banner. `CRR-082` stays BLOCKED | OD-D, D-11 |
| S-16 | `in-work/prd-006-first-party-sign-in-and-guided-experience/prd-006b-first-party-sign-in-and-guided-experience-user-language.md:28`, `:186-187` | Reports page wording inventory | Superseded: the page is removed | OD-D |
| S-17 | same file `:259` (`006B-AC-012`; `CRR-142`, `:641`) | The walk of the review navigation and onboarding projection finds no synthetic path | Re-scoped: the walk covers the six-item menu, the Campaigns tabs, and Home's checklist | OD-C, D-15 |
| S-18 | same file `:264` (`006B-AC-017`; `CRR-147`, `:646`) | Honesty proven by PRD-005e proof point 6 read against the D4 banner | Re-scoped: proven against each page's own statement (S-15) | D-11 |
| S-19 | `prd-006c-first-party-sign-in-and-guided-experience-guided-setup.md:147` (`006C-AC-001`; `CRR-148`, `:647`) | The guided-setup feature directory | Superseded | D-15 |
| S-20 | same file `:148` (`006C-AC-002`; `CRR-149`, `:648`) | The anchor registry | Superseded | D-15 |
| S-21 | same file `:150` (`006C-AC-004`; `CRR-151`, `:650`) | The progress and profile routes | Superseded in part: `POST /api/setup/progress` removed; `POST /api/setup/profile` kept | D-15 |
| S-22 | same file `:151` (`006C-AC-005`; `CRR-152`, `:651`) | The welcome step opens on first render after sign-up | Superseded | D-15 |
| S-23 | same file `:152` (`006C-AC-006`; `CRR-153`, `:652`) | The seven steps, with steps 2 and 3 writing `setup_profile.v1` | Superseded in part: the steps are retired; `setup_profile.v1` is kept and prefills Brand | D-15 |
| S-24 | same file `:153` (`006C-AC-007`; `CRR-154`, `:653`) | Progress written after each step and resumed | Superseded | D-15 |
| S-25 | same file `:154` (`006C-AC-008`; `CRR-155`, `:654`) | "Not now", Escape, and the "Finish setup" chip | Superseded | D-15 |
| S-26 | same file `:155` (`006C-AC-009`; `CRR-156`, `:655`) | "Show me around again" | Superseded | D-15 |
| S-27 | same file `:156` (`006C-AC-010`; `CRR-157`, `:656`) | The panel's dialog semantics and focus | Superseded | D-15 |
| S-28 | same file `:157` (`006C-AC-011`; `CRR-158`, `:657`) | Reduced motion and target size for the panel | Superseded for the panel; the same rules apply to every new screen (009g) | D-15 |
| S-29 | same file `:158` (`006C-AC-012`; `CRR-159`, `:658`) | axe on every step | Superseded for the panel; 009g covers the new screens | D-15 |
| S-30 | same file `:159` (`006C-AC-013`; `CRR-160`, `:659`) | The bottom sheet below 768 px | Superseded | D-15 |
| S-31 | same file `:161` (`006C-AC-015`; `CRR-162`, `:661`) | Sign-up to "Done" in under 300 seconds | Re-scoped: sign-up to an approved version on "Launch an ad" (009G-AC-008) | D-15, OD-H |
| S-32 | same file `:162` (`006C-AC-016`; `CRR-163`, `:662`) | The seeded creator's hand-off and the approver's approval through step 6 | Re-scoped: the hand-off and approval on step 3 (009D-AC-015) | D-15 |
| S-33 | same file `:164` (`006C-AC-018`; `CRR-165`, `:664`) | The final step states that nothing is connected | Superseded: Home's checklist states it once (009B-AC-008) | D-11, D-15 |
| S-34 | same file `:165` (`006C-AC-019`; `CRR-166`, `:665`) | Step copy passes the guard and the writing review | Re-scoped: every PRD-009 string (MTK-008) | D-15 |
| S-35 | same file `:166` (`006C-AC-020`; `CRR-167`, `:666`) | Every step scored at the top of the rubric | Superseded in part: no steps remain; the new screens are scored in 009G-AC-006 | D-15 |
| S-36 | `prd-006d-first-party-sign-in-and-guided-experience-design-quality-bar.md:74` | Rubric axis 10: a sibling of the Claude Design canvases | Superseded: a sibling of the PRD-009 mockups | OD-E |
| S-37 | same file `:78` | The D3 screen list: rail, collapsed rail, banner, "Finish setup" chip, reports, onboarding, the open house create states, seven guided-setup steps | Superseded in part: those entries leave; the top bar, the Menu sheet, Home, the Ads library, the three launch steps, the campaign page, and the empty-account states join | OD-C, OD-D, OD-H, D-11, D-15 |
| S-38 | same file `:139` (`006D-AC-007`; `CRR-176`, `:675`) | Scored review of every D3 screen | Re-scoped to the new list (009G-AC-006) | as S-37 |
| S-39 | same file `:140` (`006D-AC-008`; `CRR-177`, `:676`) | axe on every D3 screen | Re-scoped to the new list (009G-AC-001, 002) | as S-37 |
| S-40 | same file `:141` (`006D-AC-009`; `CRR-178`, `:677`) | Keyboard operability on every D3 screen | Re-scoped to the new list (009G-AC-010) | as S-37 |
| S-41 | same file `:144` (`006D-AC-012`; `CRR-181`, `:680`) | Baselines for every D3 screen, frame, theme, and state | Re-scoped to the new list (009G-AC-001 to 003) | as S-37 |
| S-42 | same file `:149` (`006D-AC-017`; `CRR-186`, `:685`) | The 768 frame asserts the collapsible rail | Superseded in part: 768 asserts the two-row top bar and single-column forms | D-2 |
| S-43 | `completed/prd-008-finish-line-hardening/prd-008b-finish-line-hardening-product-correctness.md:65` (`008B-AC-001`; ledger `FLR-031`, `EXECUTION_LEDGER.md:791`) | A saved version persists `images: []` | Superseded in part: a library-ad version records the library's curator-approved art; open house versions keep `images: []`; the placeholder guard stands | OD-H |
| S-44 | same file `:67` (`008B-AC-003`; `FLR-033`, `:793`) | Screens that summarise a version's images say no property photo is attached | Re-scoped: applies only to open house versions; a library-ad version shows its ad | OD-H |

### Knowledge, specifications, and code-adjacent rulings

| Row | Source | What it says | Fate | By |
|---|---|---|---|---|
| S-45 | `library/knowledge/private/ux-ui/00-design-brief.md:5`, `:7` (section 1) | An operating layer; "The founding product wedge is Open House Boost"; advertising is not the platform's identity | Superseded: a marketing toolkit whose core is launching curated library ads | OD-A, OD-B, OD-H |
| S-46 | same file `:11-17` (section 2) | The Claude Design package is the approved visual baseline | Superseded: the AutomatedRE layer and the PRD-009 mockups | OD-E, OD-G |
| S-47 | same file `:23-28` (section 3) | Four anchors; "a deep navy anchor, cobalt primary actions, restrained teal accents" | Superseded: the light look; only Broker Marketplace's calm one-question start is kept | OD-E, OD-F |
| S-48 | same file `:44` (section 4) | Must not feel like a generic CRM clone | Amended: now a hard rule, no CRM pages | OD-A |
| S-49 | same file `:55-78` (section 5) | Nine-item navigation and the Marketing Suite sub-navigation | Superseded: the six-item top bar, with the Ads library as a tab of Campaigns | OD-C, OD-D, D-2, D-16 |
| S-50 | same file `:82-100` (section 6) | The overview's five questions and seven regions | Superseded: the first-run Home | OD-F, OD-H |
| S-51 | same file `:106-117` (section 7, including `:109` "Open House Boost campaigns") | Campaign reporting as its own surface; PDFs, QR, creative, email, and SMS packages and Open House Boost campaigns in the founding interface | Superseded in part: results per campaign; curated library ads are the founding output; the add-ons list stands | OD-D, OD-H |
| S-52 | same file `:136-142` (section 8) | "Navigation: deep navy anchor"; shadow tiers as depth | Superseded: the light top bar; borders are the depth | OD-E |
| S-53 | same file `:148-149` (section 9) | Cobalt primary; teal as a supporting accent | Superseded: one action blue `#005fcc`; teal retired | OD-E |
| S-54 | same file `:165-172` (section 10) | Geist and Geist Mono; the 23, 17, 14, 13, 11.5, 10.5 px steps | Superseded: Inter; 28, 19, 16, 16, 14, 12 px | OD-E |
| S-55 | same file `:180-184` (section 11) | Buttons 10 px and cards 12 to 14 px radius | Superseded: buttons 8 px, cards 12 px | OD-E |
| S-56 | same file `:220` (section 13) | First visit resolves the device preference | Superseded: Light on first visit | D-5 |
| S-57 | same file `:248-256` (section 14) | Sidebar, compact rail, collapsible tablet rail, and the D-008 ruling | Superseded: the top bar at 1440 and 1180, two rows at 768, the Menu sheet at 390 | D-2 |
| S-58 | `03-components/application-shell-and-navigation.md:11-15`, `:25-30`, `:97-109` | The fixed deep navy sidebar, rail rules, nine-item inventory | Superseded | D-2, OD-C |
| S-59 | `03-components/onboarding-checklist.md:15-20` | Two phases and nine items | Superseded: the three-item Home checklist; the evidence rule at `:13` stands | OD-F, D-15, D-20 |
| S-60 | `03-components/campaign-and-artifact-workflow.md:7-18`, `:20-32` | The six-stage stepper and the artifact tabs | Superseded: three steps; the publishing-progress states (`:95-107`) stand for the Meta publish PRD | OD-B, OD-H |
| S-61 | `03-components/metric-source-and-freshness.md:28` | The business-pulse metric order | Superseded: three results per campaign | OD-D |
| S-62 | `04-screens/platform-overview.md` (whole file) | The platform overview | Superseded by design section 4 and 009b | OD-F, OD-H |
| S-63 | `04-screens/campaign-lifecycle.md:7-23` | Six-step create; separate Studio, Preflight, and Launch screens; typed confirmation | Superseded by "Launch an ad"; the invariants at `:29-38` stand | OD-B, OD-H, D-9 |
| S-64 | `04-screens/marketing-suite-campaign-performance.md` (whole file) | The Marketing Suite performance dashboard | Superseded: results on each campaign page | OD-D |
| S-65 | `04-screens/onboarding-brand-and-platform-settings.md:71-78` | Leads and Pipeline, Automations, Reports, Marketplace as settings surfaces | Superseded | OD-D |
| S-66 | `04-screens/workspace-page-completion.md:11`, `:15`, `:16` | The Automations, Reports, and Leads pages | Superseded | OD-D |
| S-67 | `04-screens/homeowner-reports.md:13` | "Use the existing navy, cobalt ..." | Amended: token names stand, values change | OD-E |
| S-68 | `06-review-rubric.md:57-60` (axis 10) | Sibling of the canvases | Superseded: sibling of the PRD-009 mockups | OD-E |
| S-69 | same file `:174-198` (D-002) | The unchanged field edge | Superseded: visible field edges (`--bd-input` `#718399`) | OD-E |
| S-70 | same file `:227-255` (D-008) | The collapsible tablet rail | Superseded: no rail exists | D-2 |
| S-71 | same file `:75-93` (section 4) | Screens in scope, including the rail, banner, chip, reports, onboarding, the create states, and seven steps | Superseded in part, as S-37 | as S-37 |
| S-72 | `library/knowledge/private/product/product-definition.md:15`, `:17`, `:47-72`, `:77`, `:90` | The initial wedge is Realtor partner campaign execution; the first campaign and first vertical slice are Open House Boost | Superseded: the first product is "Launch an ad" from the curated library; the campaign roadmap's later blueprints stand as history | OD-H |
| S-73 | `library/knowledge/private/product/project-map.md:144`, `:178`, `:192`, `:277` | The Open House Boost flow, the 001C row, hard boundary 1 ("one Open House Boost workflow"), and core completion | Amended for the library flow (applied with 009F-AC-013) | OD-H |
| S-74 | `library/knowledge/private/compliance/compliance-and-risk.md:55` | The first Open House Boost blueprint should avoid rate and payment claims | Amended: every library ad avoids them, enforced by 009d's word checks | OD-H |
| S-75 | same file `:154` | Lender compliance approves the Open House Boost blueprint and disclosures | Amended: lender compliance approves each library ad and its disclosures (with `:74`) | OD-H |
| S-76 | `library/knowledge/private/standards/user-language-contract.md:27` | "Product names keep their casing: Open House Boost, HighLevel, Meta, Stripe, Automated LO." | Amended: Open House Boost is retired from product copy; the flow's names are ordinary sentence-case words | D-16 |
| S-77 | same file `:97-99`, `:101`, `:104` (section 5) | The banner strings and the section-source and next-step strings that name Stripe | Superseded: the banner rows are retired with the banner; the other two name only HighLevel and Meta | D-8, D-11 |
| S-78 | `library/knowledge/public/overview/what-is-automated-lo.md:21`, `:28`, `:29` | Open House Boost is the one workflow; a guided setup walks you through; enter the open house and property details | Superseded: rewritten for "Launch an ad" (009F-AC-011) | OD-H, D-15 |
| S-79 | `library/knowledge/public/faqs/open-house-boost-faq.md` (whole file) | The FAQ for the open house flow | Superseded: rewritten for the library flow; the file name is kept, with a dated note, so inbound links resolve | OD-H |
| S-80 | `library/knowledge/private/product/marketplace-listing-copy-pack.md` (whole file) | Listing copy for the open house flow | Superseded in substance: a dated note only, because rewriting the listing waits on operator decision D-5 | OD-H |
| S-81 | `apps/web/public/fonts/README.md` ("The ruling") | Ship the system stack until Geist is vendored | Superseded: Inter is vendored | OD-E |

### Kept, reaffirmed, or left alone

- **Compliance control 9 stays in force** (`compliance-and-risk.md:19`, `:31`), with the PRD-001 rows that carry it (`prd-001-operation-automated-lo-index.md:29` and `:129`, `prd-001c-campaign-blueprint-and-preflight.md:48`, `prd-001e-meta-ad-launch.md:7`) and the domain's paid-ad brand boundary (`packages/domain/src/campaign-foundation.ts:400-470`). Library ads carry only the loan officer's identity. The first draft's co-branding supersessions (its AD-1) are withdrawn.
- **The blueprint's object storage plan** (`system-build-blueprint.md:256-286`) is untouched: PRD-009 stores no files. The first draft's storage supersession (its AD-2) is withdrawn.
- `RGL-002` (ledger `GGL-001`, `EXECUTION_LEDGER.md:252`) and `004A-AC-003` (`GGL-002`, `:253`): still hold; re-proved on the new Home (009B-AC-013). Each row gains a marker sentence citing 009B-AC-013; no status changes.
- `004C-AC-004`, PRD-001 `:18` (HighLevel as the CRM system of record), PRD-002 `AC-6` (`prd-002-operation-automated-lo-add-ons-index.md:101`) and PRD-002's other Open House Boost mentions (an unauthorized backlog PRD), PRD-001g `:57-63` (the Realtor collaborator view, not built and not affected), `006C-AC-003`, `014`, `017`, `021`, `022`, and `006D-AC-010`, `011`, `013` to `016` (ledger `CRR-179`, `180`, `182` to `185`): unchanged.
- Historical records PRD-009 overtakes and does not edit: `in-work/prd-007-homeowner-reports/reports/2026-09-24-authenticated-pages-scope.md:3-9`, `requirements/reports/2026-07-20-operation-automated-lo-bootstrap.md:27`, `requirements/reports/2026-09-23-workspace-pages-quality-review.md:11` and `:14`, the ledger log entry at `EXECUTION_LEDGER.md:738`, the design sign-off rows for removed screens (009g re-signs the document), and this PRD's own first-draft 009c and 009d (commit `22e6b87`).

## Acceptance criteria

| ID | Criterion | Test |
|---|---|---|
| 009F-AC-001 | `/leads`, `/leads/pipeline`, and `/automations` answer HTTP 404 with the gone page of D1 in review and synthetic modes, and "Go to Home" links to `/overview`. An unrelated unknown address still gets the ordinary not-found page without the gone sentence. | Integration, Browser (review) |
| 009F-AC-002 | Every redirect in D1 exists in review and synthetic modes (and in the dashboard preview wherever the old address exists there). A route-table test requests every old address and asserts a 3xx status and the target in `Location`. | Integration |
| 009F-AC-003 | Every kept address in D1 still serves its page, and sign-up still lands on `/overview` (`apps/web/src/server/password-authentication-handler.ts:1037`). `/settings/routing` is titled "Where new leads go in HighLevel". | Integration |
| 009F-AC-004 | `/settings` is one page with three cards (Account; Connections, naming HighLevel and Meta; Where new leads go in HighLevel), each linking to its sub-page. Account links to `/settings/billing` as "Plan and usage", which keeps its own honest not-set-up state. | Integration |
| 009F-AC-005 | The removed screens and their only-serving files are gone, as recon section 1 lists, together with the open house create builder that 009d replaces; the matching keys leave `workspaceRoutes` and `previewPaths`; the shared pieces recon section 1 marks "keep" stay. A source scan finds no import of a removed module, no `href` to a removed address, and no data-read branch keyed on a removed view (for example the report-read gate at `apps/web/src/server/workspace-page-data.ts:46-48`) in `apps/web/src`. | Source scan, CI |
| 009F-AC-006 | No migration, script, or route deletes a `platform.user_preferences` row (message drafts, partners, `guided_setup.v1`) or a campaign row. A Postgres test reads a seeded message draft and a seeded partner after the change. | Postgres |
| 009F-AC-007 | The tests, specs, and baselines recon section 1 lists are deleted or edited as it says, the 8 `reports--*` baselines are deleted, and no remaining test asserts a removed page, menu item, the "Expand Marketing" toggle, or the open house create form. | CI, Source scan |
| 009F-AC-008 | In `apps/web/src/copy/user-language.ts`, every connection sentence that a PRD-009 screen renders names only HighLevel and Meta; constants that nothing renders any more (the banner's) are deleted; `SIGNED_IN_SOURCE` says only "Signed in with your email."; Stripe is named only on the billing page. The contract's section 5 table carries the S-77 note. PRD-008 follow-up Quality L-2 closes: where the viewer cannot make a new version, the needs-changes sentence (`user-language.ts:287`, `apps/web/src/features/campaigns/components/campaign-approval-controls.tsx:238`) says who can, instead of telling them to save it again. The source guard passes. | Unit, Component, Record check |
| 009F-AC-009 | No rendered string in `apps/web/src` says "Open House Boost": the site description (`apps/web/src/app/layout.tsx:18`), the sign-up lead (`apps/web/src/copy/auth-messages.ts:41`), the Campaigns page, and every other screen use the D-16 names. A unit test scans user-facing strings for the phrase; comments, test names, and the stored `open-house-boost` blueprint value are exempt. | Unit, Source scan |
| 009F-AC-010 | `/partners` follows D2: the list and editor are unchanged and the line "Your ads show only you. Realtor partners never appear in paid ads." is at the top. | Integration |
| 009F-AC-011 | Every register row S-01 to S-81 is applied in its file as D3 states (the `ux-ui/` rows S-45 to S-71 by 009A-AC-015, every other row by this lane), and every "Kept" row that names a ledger row carries its marker. The public overview (`what-is-automated-lo.md:21`, `:28`, `:29`) and the FAQ describe the real first run and "Launch an ad", and a scan of `library/knowledge/public/` finds no description of a removed section, the walkthrough, or the open house flow as a current feature. A second pass checks each row against its file and records the result in the lane report. | Record check, Source scan |
| 009F-AC-012 | `EXECUTION_LEDGER.md` gains the section "Gauntlet raid: marketing toolkit (PRD-009)" with one `MKR-` row per criterion, and a "Rows superseded by PRD-009" table listing `GGL-001`, `GGL-002`, `CRR-082`, `CRR-142`, `CRR-147`, `CRR-148`, `149`, `151` to `160`, `162`, `163`, `165`, `166`, `167`, `CRR-176`, `177`, `178`, `181`, `186`, `FLR-031`, and `FLR-033`, each with its register row. No status cell changes (MTK-006). | Record check |
| 009F-AC-013 | The root `README.md` sections "Phase 0 boundary" and "Where it runs" describe the toolkit: the six sections, the Ads library (empty until the owner supplies ads), "Launch an ad", and Launch disabled until Meta is connected and launching is turned on, linking the operator checklist. The agent terrain map's "Current tip" gains a PRD-009 entry. The project map gains a version and changelog entry, applies S-73, updates the module status, points hard boundary 8 (`project-map.md:199`) at OD-A, and points "Prioritized next steps" at the checklist. | Record check |
| 009F-AC-014 | The operator checklist gains, each with status Open and one changelog entry: (a) in step 0, a line that PRD-009 adds no migration and no deployment environment variable, so its merge has no database precondition beyond PRD-008's step 0, and that `OALO_ADS_LIBRARY_SAMPLES` must never be set on a deployment; (b) a step "Supply the first approved ads": for each ad, a 1080 by 1080 tall art file and a 1080 by 842 square art file (PNG or JPEG, at most 1 MiB each, no metadata, no text that states a rate, payment, or term) and the filled template entry from the catalog `README.md` (name, topic, headline of at most 60 characters, primary text of at most 300, alt text, call to action, and compliance notes in general terms, with no lender name, lender policy text, or personal data, because the repository is public), handed by the owner to an agent in a session or a private channel, never through a public GitHub issue; the agent opens a pull request that adds them, and the owner's own merge of that pull request, after the lender review `compliance-and-risk.md:74` requires, is the approval record (no step lets an outside account's issue or comment supply an `approval` block); the step records that ruleset 20013790 requires 0 approving reviews and CODEOWNERS is advisory, so the owner's merge is the gate, and records the owner's choice on whether to require a review for `apps/web/src/features/ads-library/**` and `apps/web/public/ads-library/**`; the return is the merged pull request numbers; (c) a counsel and lender review before any live launch of the library-ad operating model and each ad (`compliance-and-risk.md:74`, `:154`), of the disclosure line and the lead form wording a person writes in Brand (counsel-approved consent text, `compliance-and-risk.md:98`), and of which Special Ad Category applies if 009D-AC-012 leaves it UNVERIFIED; (d) the owner's visual sign-off of the built screens on the live app after the merge and deployment (Home, the Ads library, the three steps, the campaign page, and the list, at 1440 and 390 in Light), with yes or no per screen as the return; (e) a read-only post-deploy check after each deployment of the PRD-009 code: the library page lists no "Sample:" ad, the sample art route answers 404, and the hosted app's actual `OALO_ENVIRONMENT` value (a name, never a secret) is recorded, replacing the UNVERIFIED in 009c Background 6. | Record check |
| 009F-AC-015 | Each time PRD-009 changes lifecycle folder (to `in-work/` at Phase 0, to `completed/` at exit), every inbound link (`git grep -n prd-009-marketing-toolkit`) and lifecycle label resolves in the same commit: `library/README.md`'s catalog (which gains its PRD-009 row at Phase 0), `library/requirements/backlog/README.md` (the row becomes a lineage row), `library/requirements/in-work/README.md`, the operator checklist, and the maps. A relative-link check over the changed files finds none broken. | Record check, Link check |

## Files expected to change

- `apps/web/src/app/(authenticated)/[...workspacePath]/page.tsx`, `apps/web/src/features/workspace/model.ts`, `apps/web/src/features/workspace/workspace-screen.tsx`, `apps/web/src/features/dashboard-preview/**`, `apps/web/src/app/(authenticated)/reports/**` (removed), `apps/web/src/features/reporting/**` (only-serving files removed), new gone-page and redirect files
- `apps/web/src/copy/user-language.ts`, `apps/web/src/copy/auth-messages.ts`, `apps/web/src/app/layout.tsx`, and every other file that renders "Open House Boost"
- The tests, specs, and baselines in recon section 1
- `EXECUTION_LEDGER.md`, `README.md`, `.cursor/rules/core/the-map.mdc`, `library/knowledge/private/product/project-map.md`, `library/knowledge/private/operations/finish-line-operator-checklist.md`
- Every file the register names outside `ux-ui/`, including the public overview and FAQ
- `library/README.md`, `library/requirements/backlog/README.md`, `library/requirements/in-work/README.md`

## Test plan

- **Integration:** the gone page (009F-AC-001), redirects (002), kept addresses (003), Settings (004), Realtor partners (010).
- **Postgres (`pnpm test:db`):** saved data kept (006).
- **Unit:** the copy guard and the Open House Boost scan (008, 009).
- **Source scan and CI:** removals (005, 007), public docs (011).
- **Browser (review):** the gone page (001).
- **Record check and link check:** the register, ledger, README, maps, checklist, and lifecycle (008, 011 to 015).

## Security notes

- Removing routes removes surface. The gone page reads nothing and needs no session beyond the layout's.
- Redirects are fixed addresses inside the application; none takes a target from the request.

## Open questions

- [ ] None blocking. What Realtor partners is for (D-20) is an owner question in the index.

## Related

- [Design direction, sections 2.8, 3, and 10](design/00-direction.md)
- [Toolkit recon, sections 1 and 2](research/2026-10-01-oalo-toolkit-recon.md)
- [Finish-line operator checklist](../../../knowledge/private/operations/finish-line-operator-checklist.md)
- [User-language contract](../../../knowledge/private/standards/user-language-contract.md)

## Amendments

- **2026-10-01, OD-H.** The register gains the Open House Boost scope and naming (S-01 to S-03, S-05 to S-08, S-43, S-44, S-72 to S-76, S-78 to S-80) and the library address (`/marketing/blueprints` now redirects to the library). The first draft's rows that superseded compliance control 9 and the blueprint's storage plan are withdrawn, because OD-H makes both moot. The operator checklist items change accordingly: no migration step, no link import counsel item, and a new "Supply the first approved ads" step.
