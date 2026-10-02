# PRD-009f: Marketing Toolkit - Removals and Records

> **Parent:** [PRD-009](./prd-009-marketing-toolkit-index.md)
> **Status:** Backlog. Authored 2026-10-01. Not started.
> **Priority:** P0 for the removals (OD-D); P1 for the records.
> **Schema changes:** None
> **Owner Guardians:** `react-guardian` (removals, redirects, the gone page); `technical-writing-craft-guardian` (copy under the contract); `library-guardian` (the register, ledger, README, maps, operator checklist)

## Goal

1. **Remove the CRM.** Leads and Pipeline, Automations, the Reports page, Workspace tools, the Marketing Suite hub and its five sub-pages, and the "Expand Marketing" toggle leave the product. Every old address has a stated fate: a redirect to where the job now lives, or a 404 that says where the job went.
2. **Keep the records true.** Every prior criterion, ledger row, and spec PRD-009 changes is superseded in place with a dated note, never deleted. The README, the maps, the ledger, and the operator checklist describe the toolkit.

## Background (honest)

1. **The removed pages have no route files of their own.** `/leads`, `/leads/pipeline`, `/automations`, and `/marketplace`, like `/marketing*`, `/partners`, and `/settings*`, are served by the catch-all `apps/web/src/app/(authenticated)/[...workspacePath]/page.tsx:10-27`, keyed by `workspaceRoutes` (`apps/web/src/features/workspace/model.ts:4-21`) in review mode and `previewPaths` (`apps/web/src/features/dashboard-preview/model.ts`, the keys at `:185-195`) in the dashboard preview. An unknown key calls `notFound()`. The catch-all stays, because it serves pages that survive.
2. **The Reports page** has its own route, `apps/web/src/app/(authenticated)/reports/page.tsx`, which shows six not-connected measures in review mode (`:15-37`).
3. **The full footprint** (screens, shared pieces to keep, tests to delete or edit, Playwright specs, 8 Reports baselines, the sign-off rows) is in [recon section 1](research/2026-10-01-oalo-toolkit-recon.md). It is this lane's checklist.
4. **The banner and connection sentences.** `apps/web/src/copy/user-language.ts:17-50` holds the not-connected constants, several of which name Stripe; the user-language contract section 5 (`library/knowledge/private/standards/user-language-contract.md:97-108`) is their source. D-8 drops Stripe from ad-related sentences and puts billing under Settings, Account, "Plan and usage".
5. **A public sentence becomes untrue.** `library/knowledge/public/overview/what-is-automated-lo.md:28` says "A short guided setup walks you through it the first time." 009b retires that walkthrough.

## Scope

- Removals and redirects across review, synthetic, and dashboard preview modes.
- `apps/web/src/copy/user-language.ts` (this lane owns it in PRD-009; other lanes add strings in their own new copy files).
- The register below, applied in every file it names (the `ux-ui/` rows by 009a, every other row by this lane).
- `EXECUTION_LEDGER.md`, `README.md`, `.cursor/rules/core/the-map.mdc`, `library/knowledge/private/product/project-map.md`, `library/knowledge/private/operations/finish-line-operator-checklist.md`, `library/knowledge/public/overview/what-is-automated-lo.md`, `library/knowledge/private/architecture/system-build-blueprint.md`, `library/knowledge/private/standards/user-language-contract.md`, and the lifecycle READMEs.

## Non-Goals

- Deleting saved data. Message drafts, campaign rows, setup progress, and preferences stay in the database.
- Editing reports. A report in `library/requirements/reports/` or a PRD's `reports/` or `qa/` folder records its own date; this lane notes which ones PRD-009 overtakes and does not edit them.
- Changing the status of any ledger row (MTK-006).

## Design decisions

### D1. Every old address's fate

From design `00-direction.md` section 3.3, with the owner's D-6 and D-12 answers (the designer's recommendations):

| Address today | Fate |
|---|---|
| `/overview` | Kept: Home |
| `/marketing` | Redirect to `/marketing/campaigns` |
| `/marketing/campaigns`, `/marketing/campaigns/new`, `/marketing/campaigns/[campaignRef]` | Kept |
| `/marketing/property-sites`, `/marketing/creative`, `/marketing/ads`, `/marketing/messaging` | Redirect to `/marketing/campaigns` (saved message drafts stay in the database) |
| `/marketing/blueprints` | Redirect to `/marketing/campaigns/new` |
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

### D2. Superseded, not deleted

Each register row is applied in its own file as a dated note beside the original text: "Superseded on <date> by PRD-009 (<criterion or decision>): <one-line reason>." or "Re-scoped on <date> by PRD-009: <what it now covers>." The original text stays readable. A ledger row keeps its status cell and gains one marker sentence at the end of its last cell.

## Supersession register

Dated 2026-10-01, on the owner's decisions OD-A to OD-G, his design answers, and AD-1 and AD-2 (index). "In part" means only the named clause changes. "Re-scoped" means the criterion still holds and now covers the new screens.

### Requirements and their ledger rows

| Row | Source | What it says | Fate | By |
|---|---|---|---|---|
| S-01 | `in-work/prd-001-operation-automated-lo/prd-001-operation-automated-lo-index.md:29` | Principle 13: Realtor co-branding is collateral-only; paid ads use loan-officer or lender identity only | Superseded in part: a partner with recorded consent may appear in the paid ad, subject to counsel before any live launch | AD-1, OD-B, OD-G, D-7 |
| S-02 | same file `:58` | Goal 9: status, spend, leads, appointments, and pipeline outcomes | Superseded in part: spend, leads sent to HighLevel, and cost per lead on the campaign page; appointments and pipeline stay in HighLevel | OD-A, OD-D |
| S-03 | same file `:129` | Paid-ad preflight fails closed on any Realtor or brokerage identity | Superseded in part, as S-01; `evaluatePaidAdBrandBoundary` is unchanged until the Meta publish PRD | AD-1 |
| S-04 | same file `:140` | The dashboard connects spend and leads to appointments, applications, and funded outcomes | Superseded | OD-A, OD-D |
| S-05 | `prd-001c-campaign-blueprint-and-preflight.md:48` | Paid-ad preflight rejects Realtor names, logos, brokerage marks, and dual-brand layouts | Superseded in part, as S-01 | AD-1 |
| S-06 | `prd-001e-meta-ad-launch.md:7` | Realtor and brokerage identity are prohibited from the paid ad | Superseded in part, as S-01 | AD-1 |
| S-07 | `prd-001g-campaign-and-portfolio-reporting.md:19-28` | Loan officer dashboard: six-plus figures, history search and filters, campaign detail as page, PDF, QR, email and SMS package | Superseded in part: three figures on the campaign page (009e), no search or filters yet, the Facebook ad is the founding output. Source and freshness (`:25`), missing as unavailable (`:26`), and test-lead exclusion (`:27`) still hold | OD-A, OD-D |
| S-08 | same file `:30-34` | Dashboard surfaces health exceptions | Superseded in part: connection problems show on Home's checklist as "Needs attention" (009b) and on the campaign page | OD-C, OD-D |
| S-09 | same file `:44-49` | Founding-cohort reporting, including support-time entry, in the product | Superseded as a loan-officer product surface: the Reports page and its support-time entry are removed; internal cohort tracking, if needed, is not part of this product | OD-D |
| S-10 | same file `:51-55` | Agency portfolio, the `/reports` page | Superseded | OD-D |
| S-11 | same file `:68` | A first-time user receives the device's theme | Superseded: Light on first visit; `:69-70` still hold in behaviour | OD-E, D-5 |
| S-12 | `in-work/prd-005-authenticated-review-runtime/prd-005e-authenticated-review-runtime-deployed-qualification.md:68` (`005E-AC-010`; ledger `CRR-082`, `EXECUTION_LEDGER.md:493` and `:514`) | Proof point 6 reads `/overview` and `/reports` against the "REVIEW / DEMO / NOT CONNECTED" banner | Wording amended: `/overview` and a campaign page, each showing its own not-connected statement; no banner. `CRR-082` stays BLOCKED | OD-D, D-11 |
| S-13 | `in-work/prd-006-first-party-sign-in-and-guided-experience/prd-006b-first-party-sign-in-and-guided-experience-user-language.md:28`, `:186-187` | Reports page wording inventory | Superseded: the page is removed | OD-D |
| S-14 | same file `:259` (`006B-AC-012`; `CRR-142`, `EXECUTION_LEDGER.md:641`) | The walk of the review navigation and onboarding projection finds no synthetic path | Re-scoped: the walk covers the six-item menu and Home's checklist; `/onboarding` redirects | OD-C, D-15 |
| S-15 | same file `:264` (`006B-AC-017`; `CRR-147`, `:646`) | Honesty proven by PRD-005e proof point 6 read against the D4 banner | Re-scoped: proven against each page's own statement (S-12) | D-11 |
| S-16 | `prd-006c-first-party-sign-in-and-guided-experience-guided-setup.md:147` (`006C-AC-001`; `CRR-148`, `:647`) | The guided-setup feature directory with provider, step, and progress | Superseded | D-15 |
| S-17 | same file `:148` (`006C-AC-002`; `CRR-149`, `:648`) | The anchor registry | Superseded: removed with the walkthrough | D-15 |
| S-18 | same file `:150` (`006C-AC-004`; `CRR-151`, `:650`) | The progress and profile routes | Superseded in part: `POST /api/setup/progress` removed; `POST /api/setup/profile` kept | D-15 |
| S-19 | same file `:151` (`006C-AC-005`; `CRR-152`, `:651`) | The welcome step opens on first render after sign-up | Superseded | D-15 |
| S-20 | same file `:152` (`006C-AC-006`; `CRR-153`, `:652`) | The seven steps, with steps 2 and 3 writing `setup_profile.v1` | Superseded in part: the steps are retired; `setup_profile.v1` is kept and still prefills | D-15 |
| S-21 | same file `:153` (`006C-AC-007`; `CRR-154`, `:653`) | Progress written after each step and resumed | Superseded | D-15 |
| S-22 | same file `:154` (`006C-AC-008`; `CRR-155`, `:654`) | "Not now", Escape, and the "Finish setup" chip | Superseded | D-15 |
| S-23 | same file `:155` (`006C-AC-009`; `CRR-156`, `:655`) | "Show me around again" | Superseded | D-15 |
| S-24 | same file `:156` (`006C-AC-010`; `CRR-157`, `:656`) | The panel's dialog semantics and focus | Superseded | D-15 |
| S-25 | same file `:157` (`006C-AC-011`; `CRR-158`, `:657`) | Reduced motion and target size for the panel | Superseded for the panel; the same rules apply to every new screen (009g) | D-15 |
| S-26 | same file `:158` (`006C-AC-012`; `CRR-159`, `:658`) | axe on every step | Superseded for the panel; 009g covers the new screens | D-15 |
| S-27 | same file `:159` (`006C-AC-013`; `CRR-160`, `:659`) | The bottom sheet below 768 px | Superseded | D-15 |
| S-28 | same file `:161` (`006C-AC-015`; `CRR-162`, `:661`) | Sign-up to "Done" in under 300 seconds | Re-scoped: sign-up to an approved version on the three-step flow (009G-AC-009) | D-15, OD-B |
| S-29 | same file `:162` (`006C-AC-016`; `CRR-163`, `:662`) | The seeded creator's hand-off and the approver's approval through step 6 | Re-scoped: the hand-off and approval on step 3 (009D-AC-019) | D-15 |
| S-30 | same file `:164` (`006C-AC-018`; `CRR-165`, `:664`) | The final step states that nothing is connected | Superseded: Home's checklist states it once (009B-AC-008) | D-11, D-15 |
| S-31 | same file `:165` (`006C-AC-019`; `CRR-166`, `:665`) | Step copy passes the guard and the writing review | Re-scoped: every PRD-009 string (MTK-008) | D-15 |
| S-32 | same file `:166` (`006C-AC-020`; `CRR-167`, `:666`) | Every step scored at the top of the rubric | Superseded in part: no steps remain; the new screens are scored in 009G-AC-006 | D-15 |
| S-33 | `prd-006d-first-party-sign-in-and-guided-experience-design-quality-bar.md:74` | Rubric axis 10: a sibling of the Claude Design canvases | Superseded: a sibling of the PRD-009 mockups | OD-E |
| S-34 | same file `:78` | The D3 screen list: rail, collapsed rail, not-connected banner, "Finish setup" chip, reports, onboarding, seven guided-setup steps | Superseded in part: those entries leave; the top bar, the Menu sheet, Home, the three steps, the campaign page, and the empty-account states join | OD-C, OD-D, D-11, D-15 |
| S-35 | same file `:139` (`006D-AC-007`; `CRR-176`, `:675`) | Scored review of every D3 screen | Re-scoped to the new list (009G-AC-006) | as S-34 |
| S-36 | same file `:140` (`006D-AC-008`; `CRR-177`, `:676`) | axe on every D3 screen | Re-scoped to the new list (009G-AC-001, 002) | as S-34 |
| S-37 | same file `:141` (`006D-AC-009`; `CRR-178`, `:677`) | Keyboard operability on every D3 screen | Re-scoped to the new list (009G-AC-011) | as S-34 |
| S-38 | same file `:144` (`006D-AC-012`; `CRR-181`, `:680`) | Baselines for every D3 screen, frame, theme, and state | Re-scoped to the new list (009G-AC-001 to 003) | as S-34 |
| S-39 | same file `:149` (`006D-AC-017`; `CRR-186`, `:685`) | The 768 frame asserts the collapsible rail | Superseded in part: 768 asserts the two-row top bar and single-column forms | D-2 |

### Knowledge, specifications, and code-adjacent rulings

| Row | Source | What it says | Fate | By |
|---|---|---|---|---|
| S-40 | `library/knowledge/private/compliance/compliance-and-risk.md:19` | Control 9: paid advertising is never co-branded with a Realtor or brokerage | Superseded in part, as S-01; the RESPA Section 8 rules at `:21-38` otherwise stand, and counsel reviews before any live launch | AD-1 |
| S-41 | same file `:31` | Do not place Realtor identity in paid ads | Superseded in part, as S-01 | AD-1 |
| S-42 | `library/knowledge/private/ux-ui/00-design-brief.md:5`, `:7` (section 1) | An operating layer; advertising is not the platform's identity | Superseded: a marketing toolkit whose core is the Facebook ad launch | OD-A, OD-B |
| S-43 | same file `:11-17` (section 2) | The Claude Design package is the approved visual baseline | Superseded: the AutomatedRE layer and the PRD-009 mockups | OD-E, OD-G |
| S-44 | same file `:23-28` (section 3) | Four anchors; "a deep navy anchor, cobalt primary actions, restrained teal accents" | Superseded: the light look; only Broker Marketplace's calm one-question start is kept | OD-E, OD-F |
| S-45 | same file `:44` (section 4) | Must not feel like a generic CRM clone | Amended: now a hard rule, no CRM pages | OD-A |
| S-46 | same file `:55-78` (section 5) | Nine-item navigation and the Marketing Suite sub-navigation | Superseded: the six-item top bar | OD-C, OD-D, D-2 |
| S-47 | same file `:82-100` (section 6) | The overview's five questions and seven regions | Superseded: the first-run Home | OD-F |
| S-48 | same file `:106-117` (section 7) | Campaign reporting as its own surface; PDFs, QR, creative, email, and SMS packages in the founding interface | Superseded in part: results per campaign; the Facebook ad is the founding output; the add-ons list stands | OD-B, OD-D |
| S-49 | same file `:136-142` (section 8) | "Navigation: deep navy anchor"; shadow tiers as depth | Superseded: the light top bar; borders are the depth | OD-E |
| S-50 | same file `:148-149` (section 9) | Cobalt primary; teal as a supporting accent | Superseded: one action blue `#005fcc`; teal retired | OD-E |
| S-51 | same file `:165-172` (section 10) | Geist and Geist Mono; the 23, 17, 14, 13, 11.5, 10.5 px steps | Superseded: Inter; 28, 19, 16, 16, 14, 12 px | OD-E |
| S-52 | same file `:180-184` (section 11) | Buttons 10 px and cards 12 to 14 px radius | Superseded: buttons 8 px, cards 12 px | OD-E |
| S-53 | same file `:220` (section 13) | First visit resolves the device preference | Superseded: Light on first visit | D-5 |
| S-54 | same file `:248-256` (section 14) | Sidebar, compact rail, collapsible tablet rail, and the D-008 ruling | Superseded: the top bar at 1440 and 1180, two rows at 768, the Menu sheet at 390 | D-2 |
| S-55 | `03-components/application-shell-and-navigation.md:11-15`, `:25-30`, `:97-109` | The fixed deep navy sidebar, rail rules, nine-item inventory | Superseded | D-2, OD-C |
| S-56 | `03-components/onboarding-checklist.md:15-20` | Two phases and nine items | Superseded: the four-item Home checklist; the evidence rule at `:13` stands | OD-F, D-15 |
| S-57 | `03-components/campaign-and-artifact-workflow.md:7-18`, `:20-32` | The six-stage stepper and the artifact tabs | Superseded: three steps; the publishing-progress states (`:95-107`) stand for the Meta publish PRD | OD-B |
| S-58 | `03-components/metric-source-and-freshness.md:28` | The business-pulse metric order | Superseded: three results per campaign | OD-D |
| S-59 | `04-screens/platform-overview.md` (whole file) | The platform overview | Superseded by design section 4 and 009b | OD-F |
| S-60 | `04-screens/campaign-lifecycle.md:7-23` | Six-step create; separate Studio, Preflight, and Launch screens; typed confirmation | Superseded by the three steps; the invariants at `:29-38` stand | OD-B, D-9 |
| S-61 | `04-screens/marketing-suite-campaign-performance.md` (whole file) | The Marketing Suite performance dashboard | Superseded: results on each campaign page | OD-D |
| S-62 | `04-screens/onboarding-brand-and-platform-settings.md:71-78` | Leads and Pipeline, Automations, Reports, Marketplace as settings surfaces | Superseded | OD-D |
| S-63 | `04-screens/workspace-page-completion.md:11`, `:15`, `:16` | The Automations, Reports, and Leads pages | Superseded | OD-D |
| S-64 | `04-screens/homeowner-reports.md:13` | "Use the existing navy, cobalt ..." | Amended: token names stand, values change | OD-E |
| S-65 | `06-review-rubric.md:57-60` (axis 10) | Sibling of the canvases | Superseded: sibling of the PRD-009 mockups | OD-E |
| S-66 | same file `:174-198` (D-002) | The unchanged field edge | Superseded: visible field edges (`--bd-input` `#718399`) | OD-E |
| S-67 | same file `:227-255` (D-008) | The collapsible tablet rail | Superseded: no rail exists | D-2 |
| S-68 | same file `:75-93` (section 4) | Screens in scope, including the rail, banner, chip, reports, onboarding, and seven steps | Superseded in part, as S-34 | as S-34 |
| S-69 | `library/knowledge/private/architecture/system-build-blueprint.md:256-286` | Object storage on R2 | Superseded in part: property photos use the Supabase Storage bucket; R2 stays the plan for published artifacts | AD-2 |
| S-70 | `library/knowledge/private/standards/user-language-contract.md:97-99`, `:101`, `:104` (section 5) | The banner strings and the section-source and next-step strings that name Stripe | Superseded: the banner rows are retired with the banner; the other two name only HighLevel and Meta | D-8, D-11 |
| S-71 | `apps/web/public/fonts/README.md` ("The ruling") | Ship the system stack until Geist is vendored | Superseded: Inter is vendored | OD-E |

### Kept, and re-proved or left alone

- `RGL-002` (ledger `GGL-001`, `EXECUTION_LEDGER.md:252`) and `004A-AC-003` (`GGL-002`, `:253`): still hold; re-proved on the new Home (009B-AC-013). Each row gains a marker sentence citing 009B-AC-013; no status changes.
- `004C-AC-004` (`prd-004c-reviewable-go-live-marketplace-submission.md:36`), PRD-001 `:18` (HighLevel as the CRM system of record), PRD-002 `AC-6` (`prd-002-operation-automated-lo-add-ons-index.md:101`), PRD-001g `:57-63` (the Realtor collaborator view, not built and not affected), `006C-AC-003`, `014`, `017`, `021`, `022`, and `006D-AC-010`, `011`, `013` to `016` (ledger `CRR-179`, `180`, `182` to `185`): unchanged.
- Historical records PRD-009 overtakes and does not edit: `in-work/prd-007-homeowner-reports/reports/2026-09-24-authenticated-pages-scope.md:3-9`, `requirements/reports/2026-07-20-operation-automated-lo-bootstrap.md:27`, `requirements/reports/2026-09-23-workspace-pages-quality-review.md:11` and `:14`, the ledger log entry at `EXECUTION_LEDGER.md:738`, and the design sign-off rows for removed screens (009g re-signs the document).

## Acceptance criteria

| ID | Criterion | Test |
|---|---|---|
| 009F-AC-001 | `/leads`, `/leads/pipeline`, and `/automations` answer HTTP 404 with the gone page of D1 in review and synthetic modes, and "Go to Home" links to `/overview`. An unrelated unknown address still gets the ordinary not-found page without the gone sentence. | Integration, Browser (review) |
| 009F-AC-002 | Every redirect in D1 exists in review and synthetic modes (and in the dashboard preview wherever the old address exists there). A route-table test requests every old address and asserts a 3xx status and the target in `Location`. | Integration |
| 009F-AC-003 | Every kept address in D1 still serves its page, and sign-up still lands on `/overview` (`apps/web/src/server/password-authentication-handler.ts:1037`). `/settings/routing` is titled "Where new leads go in HighLevel". | Integration |
| 009F-AC-004 | `/settings` is one page with three cards (Account; Connections, naming HighLevel and Meta; Where new leads go in HighLevel), each linking to its sub-page. Account links to `/settings/billing` as "Plan and usage", which keeps its own honest not-set-up state. | Integration |
| 009F-AC-005 | The removed screens and their only-serving files are gone, as recon section 1 lists: the review views for leads, pipeline, automations, and marketplace; the Reports page and its only-serving components and model; the demo `Leads()`, `AutomationsWorkspace`, `ExploreWorkspace`, `Reports()`, and `workspace-report.ts`; the matching keys in `workspaceRoutes` and `previewPaths`. The shared pieces recon section 1 marks "keep" stay. A source scan finds no import of a removed module and no `href` to a removed address in `apps/web/src`. | Source scan, CI |
| 009F-AC-006 | No migration, script, or route deletes a `platform.user_preferences` row (message drafts, `guided_setup.v1`) or a campaign row. A Postgres test reads a seeded message draft after the change. | Postgres |
| 009F-AC-007 | The tests, specs, and baselines recon section 1 lists are deleted or edited as it says, the 8 `reports--*` baselines are deleted, and no remaining test asserts a removed page, menu item, or the "Expand Marketing" toggle. | CI, Source scan |
| 009F-AC-008 | In `apps/web/src/copy/user-language.ts`, every connection sentence that a PRD-009 screen renders names only HighLevel and Meta; constants that nothing renders any more (the banner's) are deleted; `SIGNED_IN_SOURCE` says only "Signed in with your email."; Stripe is named only on the billing page. The contract's section 5 table is updated with a dated note that keeps the old strings readable (S-70). PRD-008 follow-up Quality L-2 closes: where the viewer cannot make a new version, the needs-changes sentence (`user-language.ts:287`, `apps/web/src/features/campaigns/components/campaign-approval-controls.tsx:238`) says who can, instead of telling them to save it again. The source guard passes. | Unit, Component, Record check |
| 009F-AC-009 | Every register row S-01 to S-71 is applied in its file as D2 states (the `ux-ui/` rows S-42 to S-68 by 009A-AC-015, every other row by this lane), and every "Kept" row that names a ledger row carries its marker. A second pass checks each row against its file and records the result in the lane report. | Record check |
| 009F-AC-010 | `EXECUTION_LEDGER.md` gains the section "Gauntlet raid: marketing toolkit (PRD-009)" with one `MKR-` row per criterion, and a "Rows superseded by PRD-009" table listing `GGL-001`, `GGL-002`, `CRR-082`, `CRR-142`, `CRR-147`, `CRR-148`, `149`, `151` to `160`, `162`, `163`, `165`, `166`, `167`, `CRR-176`, `177`, `178`, `181`, and `186`, each with its register row. No status cell changes (MTK-006). | Record check |
| 009F-AC-011 | `library/knowledge/public/overview/what-is-automated-lo.md:28` describes the real first run (the Home checklist and the three steps) instead of a guided walkthrough, and a scan of `library/knowledge/public/` finds no description of a removed section or of the walkthrough as a current feature. | Record check, Source scan |
| 009F-AC-012 | The root `README.md` sections "Phase 0 boundary" and "Where it runs" describe the toolkit: the six sections, the three-step launch, Launch disabled until Meta is connected and launching is turned on, photo storage needing the operator's step, and link import with the owner's accepted risk. Each gate statement keeps its status, and the sections link the operator checklist. | Record check |
| 009F-AC-013 | The agent terrain map's "Current tip" gains a PRD-009 entry naming the run's pull request and the operator checklist's new items. The project map gains a version and changelog entry, updates the module status, points hard boundary 8 (`project-map.md:199`) at OD-A, and points "Prioritized next steps" at the checklist. | Record check |
| 009F-AC-014 | The operator checklist gains, each with status Open and a changelog entry: (a) a PRD-009 step in section 2, ordered before the PRD-009 merge in the form of step 0, to apply the two PRD-009 migrations in order to the hosted database, with the bucket migration's role need marked UNVERIFIED (009c D3), and to set `OALO_PHOTO_STORAGE_URL` and `OALO_PHOTO_STORAGE_SECRET_KEY` server-only, stating what depends on each and what happens without it, the procedure UNVERIFIED as step 0 says; (b) a counsel and compliance review before any live launch, covering Zillow's and Redfin's Terms of Use and photo rights in paid ads (the owner's accepted risk, D-1), the Realtor partner in paid ads (AD-1) against `compliance-and-risk.md` control 9 and RESPA Section 8, and the co-branding consent wording (D-7); (c) the owner's visual sign-off of the built screens on the live app after the merge and deployment (Home, the three steps, the campaign page, and the list, at 1440 and 390 in Light), with yes or no per screen as the return. | Record check |
| 009F-AC-015 | `system-build-blueprint.md` carries the S-69 note. Each time PRD-009 changes lifecycle folder (to `in-work/` at Phase 0, to `completed/` at exit), every inbound link (`git grep -n prd-009-marketing-toolkit`) and lifecycle label resolves in the same commit: `library/README.md`'s catalog (which gains its PRD-009 row at Phase 0), `library/requirements/backlog/README.md` (the row becomes a lineage row), `library/requirements/in-work/README.md`, the operator checklist, and the maps. A relative-link check over the changed files finds none broken. | Record check, Link check |

## Files expected to change

- `apps/web/src/app/(authenticated)/[...workspacePath]/page.tsx`, `apps/web/src/features/workspace/model.ts`, `apps/web/src/features/workspace/workspace-screen.tsx`, `apps/web/src/features/dashboard-preview/**`, `apps/web/src/app/(authenticated)/reports/**` (removed), `apps/web/src/features/reporting/**` (only-serving files removed), new gone-page and redirect files
- `apps/web/src/copy/user-language.ts`
- The tests, specs, and baselines in recon section 1
- `EXECUTION_LEDGER.md`, `README.md`, `.cursor/rules/core/the-map.mdc`, `library/knowledge/private/product/project-map.md`, `library/knowledge/private/operations/finish-line-operator-checklist.md`
- Every file the register names outside `ux-ui/`
- `library/README.md`, `library/requirements/backlog/README.md`, `library/requirements/in-work/README.md`

## Test plan

- **Integration:** the gone page (009F-AC-001), redirects (002), kept addresses (003), Settings (004).
- **Postgres (`pnpm test:db`):** saved data kept (006).
- **Unit:** the copy guard (008).
- **Source scan and CI:** removals (005, 007), public docs (011).
- **Browser (review):** the gone page (001).
- **Record check and link check:** the register, ledger, README, maps, checklist, and lifecycle (008 to 015).

## Security notes

- Removing routes removes surface. The gone page reads nothing and needs no session beyond the layout's.
- Redirects are fixed addresses inside the application; none takes a target from the request.

## Open questions

- [ ] None blocking.

## Related

- [Design direction, sections 2.8, 3.2, 3.3, and 9](design/00-direction.md)
- [Toolkit recon, sections 1 and 2](research/2026-10-01-oalo-toolkit-recon.md)
- [Finish-line operator checklist](../../../knowledge/private/operations/finish-line-operator-checklist.md)
- [User-language contract](../../../knowledge/private/standards/user-language-contract.md)

## Amendments

None yet.
