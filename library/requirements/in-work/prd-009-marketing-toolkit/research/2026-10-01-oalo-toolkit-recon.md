# Operation Automated LO toolkit recon for PRD-009

> Research input for [PRD-009](../prd-009-marketing-toolkit-index.md). Written 2026-10-01 by a read-only recon pass and copied here from the authoring session's scratch folder; only the root-path sentence was rewritten. Line numbers are as read on that date and can drift by a line or two; each sub-PRD re-verified every line it cites.

Root for every path below: the repository root, read on branch `claude/prd-009-marketing-toolkit` at `d7b0f72`. A path that starts with `app/`, `features/`, `server/`, `copy/`, or `fixtures/` is under `apps/web/src/`. The recon changed nothing.

## 1. Removal footprint

**The navigation is built in three places.** All of them are needed for the full list you quoted.
- The base items come from a fixture, `apps/web/src/fixtures/ui-foundation/synthetic-ui.ts:33-123`. Leads is at :51-57, Automations :58-64, Reports :65-72, Marketplace :73-79.
- `apps/web/src/features/workspace/navigation.ts:10-28` renames items: "/marketplace" becomes "Workspace tools" (:16) and "/brand" becomes "Report branding" (:17).
- `apps/web/src/app/(authenticated)/layout.tsx:161-177` adds "Homeowner reports" when `OALO_HOMEOWNER_REPORTS=enabled`.
- "Expand Marketing" is a toggle at `features/shell/components/app-shell.tsx:256`.
- Review mode re-projects the items at `server/authenticated-workspace-data.ts:448-466`.
- The demo-mode nav is separate: `features/dashboard-preview/product-shell.tsx:14-36` (Leads :18, Reports :19, Automations :35).

**Permissions.** `pipeline:read` gates only the Leads item (`features/ui-foundation/model/synthetic-ui.ts:26`, `server/runtime-authentication.ts:469-490`). `reports:read` is shared with Homeowner reports (`layout.tsx:172`).

**/leads, /leads/pipeline, /automations and /marketplace have no route files of their own.**
- They are served by the catch-all `app/(authenticated)/[...workspacePath]/page.tsx:10-27` (plus `loading.tsx` and `error.tsx`). That same file also serves /marketing*, /partners and /settings*, so it must stay. The fix is to remove the keys at `features/workspace/model.ts:12-15` and `features/dashboard-preview/model.ts:189-192`.
- Review-mode screen, `features/workspace/workspace-screen.tsx`:
  - Headings :39-54.
  - Leads and pipeline view :506-533.
  - Automations view :534-555. It reuses `Routing` (:311-357, shared with /settings/routing at :556) and `ReportRecords` (:248-296, shared with the creative page).
  - Marketplace view :557-565. It reuses the marketing tool cards, shared with /marketing.
- Server read: `server/workspace-page-data.ts:48` lists "automations".
- Demo-mode screens:
  - `Leads()` at `dashboard-preview/workspace-screens.tsx:551-822`, with cases at :1274-1279.
  - `AutomationsWorkspace` at `marketing-workspaces.tsx:492-620`.
  - `ExploreWorkspace` (marketplace) at :748 onward, with the case at `workspace-screens.tsx:1313`.
- Demo-mode shared pieces:
  - The lead fixtures (`model.ts:6,79-97`) are also used by `setup-wizard.tsx:155,436` and by the routing settings at `workspace-settings.tsx:335-397`.
  - `PipelineVisual` (`product-components.tsx:172-225`) is also used by the demo Overview.
  - The demo guides are at `product-guides.ts:74,126` and `setup-model.ts:18-20,124-125`.
- Kept pages link to these routes in several places:
  - `overview/components/overview-screen.tsx:139-144`
  - `example-campaign.tsx:162,175`
  - `marketing-workspaces.tsx:599,780,794`
  - `workspace-screens.tsx:185-244,1128`
  - `workspace-settings.tsx:397`
- The fixture's overview rows also name them: `synthetic-ui.ts:302,340-345,386-417`, and the "Leads" activity filter at `activity-feed.tsx:12`.

**/reports**
- Route: `app/(authenticated)/reports/page.tsx`.
- Serve only Reports: `features/reporting/components/reports-screen.tsx`, `reporting-acceptance-surface.tsx`, `support-time-entry.tsx`, and `model/reporting-acceptance.ts` (it links to /reports at :311,317).
- Demo-only: `Reports()` at `workspace-screens.tsx:1007-1251` and `workspace-report.ts`.
- Shared, so keep:
  - `model/synthetic-reporting.ts` (also used by the synthetic campaign detail page, `app/public/synthetic-open-house-v3/page.tsx`, and `authenticated-workspace-data.ts:35,472-497`).
  - `sample-data-notice.tsx`, `campaign-detail-screen.tsx`, `artifact-workspace.tsx`, `campaign-launch-review.tsx`.
  - `features/shell/components/review-not-connected-screen.tsx` (also used by the public synthetic page).

**Copy files.** None serve only these sections; their wording is written inline in the components above. `copy/reporting-messages.ts` holds per-campaign metric wording tied to `packages/application/src/reporting.ts:37-46`, so keep it for campaign results.

**Packages**
- `packages/ui`: nothing used only by these sections.
- `packages/application/src/reporting.ts` is not wired to /reports (that page reads the fixture). Its portfolio and cohort functions (:193, :256, :287) are Reports-page ideas. `buildCampaignReportingRecord` (:72) is per-campaign, so keep it.
- `packages/ghl/src/lead-routing.ts` routes leads to HighLevel. Keep it.

**Unit and integration tests**
- Delete whole files:
  - `app/(authenticated)/reports/reports-review-surface.integration.test.tsx`
  - `features/reporting/components/reporting-screen.integration.test.tsx`
  - `dashboard-preview/workspace-report.unit.test.ts`
- Edit:
  - `workspace/workspace-screen.integration.test.tsx:10,66`
  - `workspace/navigation.unit.test.ts:14-19`
  - `shell/model/navigation.unit.test.ts:40-56`
  - `shell/components/app-shell.integration.test.tsx:30,56-58,72`
  - `ui-foundation/model/synthetic-ui.unit.test.ts:39-59` (the "nine-item" nav list)
  - The `navigation.items[*].id = "leads"` allowlist entries at `onboarding-review-surface.integration.test.tsx:103-107` and `connections-review-surface.integration.test.tsx:89-93`
- Shared (keep): `campaigns-review-surface.integration.test.tsx:7` and `setup-model.unit.test.ts:9-12`.

**Playwright specs**
- `tests/browser/workspace-pages.spec.ts`: tests at :92 (reports), :157 (automations at :161) and :175 (/leads at :203), plus the route list at :220-226.
- `tests/browser/review/workspace-pages.spec.ts`: route list :22-25, test at :74, and :165-175 ("Workspace tools").
- `tests/browser/dashboard-preview.spec.ts`: :15-27, :119 (:128, :134), :183-185, :283, :315.
- `tests/browser/product-onboarding.spec.ts`: :146 and :328-330.
- `tests/browser/design-quality.spec.ts`: :58, :352, and the test at :540-608.
- `tests/browser/ui-foundation-ux.spec.ts`: the test at :393-440 (/reports at :422).

**Screenshot baselines**
- Reports: 8 files (`tests/visual/screens/chromium/reports--default--{390,768,1180,1440}--{light,dark}.png`).
- Leads, Automations, Marketplace: 0 files each.
- About 256 other baselines show the side rail and will change when the nav items go: 112 in chromium (everything except email-preview) and 144 in review (campaign-detail, change-password, guided-setup, shell).

**Sign-off document** `docs/operations/evidence-packs/design-quality-signoff.md`: the row at :92 ("Reports | not connected"), plus notes at :269, :281 (R-14 "See your leads"), :283-286 (R-15, R-16), :345 (R-6) and :412 (F-1 Automations chip).

## 2. Prior requirements to supersede

PRD-001 has no AC IDs, so cite it by line.

| Where | Line | What it says |
|---|---|---|
| `in-work/prd-001.../prd-001-operation-automated-lo-index.md` | :58, :140 | Show spend, leads, appointments and pipeline outcomes (a dashboard) |
| `prd-001g-campaign-and-portfolio-reporting.md` | :19-28 | Loan officer dashboard and campaign history (move to campaign detail) |
| same | :30-34, :44-49 | Health exceptions; founding-cohort reporting |
| same | :51-55 | Agency portfolio, which is the /reports page |
| same | :57-63 | Realtor collaborator view |
| RGL-002, `prd-004-reviewable-go-live-index.md` | :57 | Overview honesty about spend and leads |
| 004A-AC-003, `prd-004a...md` | :35 | Same rule on the review URL |
| 004C-AC-004, `prd-004c...md` | :36 | Screenshots carry no fake spend or lead figures |
| 005E-AC-010, `prd-005e...md` | :68 | Requires `/reports` to show a not-connected state |
| PRD-006b | :28, :186-187 | Inventory of Reports page wording |
| 006B-AC-012 | :259 | Walk of the review nav |
| 006B-AC-017 | :264 | Honesty rule |
| PRD-006d D3 | :78 | Lists "reports (not connected)" as a screen in scope; axis 10 at :74 |
| 006D-AC-007, 008, 009, 012, 017 | :139-149 | Apply to every D3 screen, including Reports |
| `prd-007.../reports/2026-09-24-authenticated-pages-scope.md` | :3-9 | Every workspace destination resolves |
| `requirements/reports/2026-07-20-operation-automated-lo-bootstrap.md` | :27 | Shell includes Leads, Automations, Reports, Marketplace |
| `requirements/reports/2026-09-23-workspace-pages-quality-review.md` | :11, :14 | Automations and Leads pages |
| Design specs: `00-design-brief.md:57-75`, `03-components/application-shell-and-navigation.md:103-106`, `04-screens/onboarding-brand-and-platform-settings.md:71-78`, `04-screens/workspace-page-completion.md:11,15,16` | | Nine-item nav and page specs |

`EXECUTION_LEDGER.md` rows: GGL-001 :252, GGL-002 :253, CRR-082 :493 and :514, CRR-142 :641, CRR-147 :646, CRR-176/177/178/181/186 :675-685, and the log entry at :738 (reports pictures).

## 3. Campaign flow today

**Routes and components**
- `marketing/campaigns/new/page.tsx` renders `OpenHouseDraftBuilder`.
- Submitting posts to `/api/campaigns/preflight` (`open-house-draft-builder.tsx:187`), handled by `server/campaign-preflight-handler.ts`.
- The detail page `marketing/campaigns/[campaignRef]/page.tsx` renders `PersistedCampaignScreen`.
- Approval uses `CampaignApprovalControls`, which posts to `/api/campaigns/approve` (`campaign-approval-controls.tsx:105`).

**What a person does in review mode**
1. On /overview, click "Create an Open House Boost" (`overview-screen.tsx:110`). 1 click.
2. On the create page, fill 6 empty required fields: address, state, description, start, end, and "Where the ad runs". Realtor name also needs filling unless the profile has it. Tick 2 permission boxes. Headline, body, call to action, disclosure, consent and budgets ($25 daily, $125 total) are prefilled (`guided-setup/model/profile.ts:85-97`). Click "Save and run the checks" (:659-671). The result appears on the same page (:726-790).
3. Click "Open campaign" (:778).
4. On the detail page, click "Approve this version", then "Yes, approve" (`campaign-approval-controls.tsx:168-176`).

That is **3 pages and about 6 clicks, plus 2 checkboxes and 6 to 7 typed fields.** The guided setup walkthrough adds 3 steps before this and 1 after (`steps/step-model.ts:36-87`).

**Launch step: there is none, and it is disabled by design.**
- No launch route exists; `/api/campaigns` has only `approve` and `preflight`.
- `provider_publish` is always `available: false` (`packages/application/src/campaign-workspace-read.ts:104-107`), and `providerPublicationAuthorized: false` (:101).
- After approval the page says the campaign won't run as an ad until HighLevel and Meta are connected (`campaign-approval-controls.tsx:227`, `copy/user-language.ts:219-222`).
- The Meta adapter is a plan only: `META_ADAPTER_MODE = "fixture-plan"` (`packages/ghl/src/meta-adapter.ts:13`). Its publish route is allowlisted at :76-79 but the web app never calls it.
- The synthetic launch review only confirms a summary: "Nothing was launched" (`reporting/components/campaign-launch-review.tsx:183-191`).

**Where spend and leads show today**
- /reports. In review mode it shows six not-connected measures (`reports/page.tsx:15-37`). In synthetic mode it shows metrics through `reporting-acceptance-surface.tsx:368-374`.
- Overview "Your numbers" (`overview-screen.tsx:119-153`). In review mode every metric is not connected (`authenticated-workspace-data.ts:284-287`).
- The demo Reports and example campaign pages.
- **The campaign detail page shows only budgets, no results** (`persisted-campaign-screen.tsx:72-79`). The campaign list shows no metrics.

## 4. Claude Design canvases (`library/knowledge/private/ux-ui/05-html-examples/claude-design/`)

Only `Overview.dc.html` and `Dashboard.dc.html` contain `text/plain` logic, and it is just a theme toggle.

**Nav items shown**
- **Overview:** Overview, Marketing Suite, Brand Engine, Partners, Leads & Pipeline, Automations, Reports, Marketplace, Settings.
- **Studio, Preflight, CampaignDetail, Campaigns, Brand, Onboarding:** Dashboard, Campaigns, Partners, Brand & Compliance, Connections, Reports, Support.
- **Create, Launch, Welcome:** no product nav.

**Per canvas**
- **Create:** a dark rail holding a **6-step stepper**: Property & event, People, Brand & message, Assets & content, Routing & distribution, Generate & review. Shows "Saved 4 seconds ago" and "22% complete". Step 1 form: address, facts, AI description, photos, date and time, hosting Realtor, rights confirmation. Buttons: Back, "Step 1 of 6", "Continue to People". Right rail: what gets generated, what is already on file, AI allowance.
- **Studio:** version v2, "Edit inputs", primary "Run compliance preflight". Artifact tabs (page, PDF, QR, creative, copy, email, SMS); Regenerate and Download; artifact status and source profiles.
- **Preflight:** "Preflight & approval". Shows 1 blocking finding (with "Regenerate PDF"), 2 warnings, 14 passed. Right rail lists what approval covers and two required approvers. "Continue to launch review" is disabled.
- **Launch:** "Launch review" with a locked snapshot of the ad account, page, Instagram, form, pixel, budget, schedule, geography and Special Ad Category. "Publish to Meta" requires typing PUBLISH. A rail shows 5 progress stages plus an uncertain-reconciling state.
- **CampaignDetail:** Live; Pause, Duplicate, Open in Studio. **Six metrics: Spend, Leads, Cost per lead, Appointments, Applications, Funded.** Also approved artifacts, activity, Meta status, HighLevel routing, exceptions and versions.
- **Campaigns:** "+ New campaign", search, four filters, list or cards. Table columns include Budget/spend and Leads; 5 rows.
- **Overview:** greeting, status strip, 7 quick actions, 8 "Business pulse" metrics, active work, recent activity, attention queue (3), and 8 workspace modules. Footer at :135 says HighLevel remains your CRM system of record.
- **Brand:** "Brand & compliance profile", version 7, an 11-item section menu, identity, licenses, voice with AI suggestion, banned phrases, locked disclosures.
- **Onboarding:** "Let's get you launch-ready", "2 of 9" verified, two phases. The Meta connection step is expanded and blocked.
- **Welcome:** install checks, "Start setup" (about 15 minutes), sign-in link.

**The designed launch flow is 9 screens or steps:** 6 wizard steps, then Studio, then Preflight, then Launch. That is roughly 10 primary clicks plus typing PUBLISH and a separate Realtor approval, followed by 5 progress stages.

**PNG previews** (all 1440 by 1100):
- `platform-overview.png` (Overview)
- `platform-overview-responsive.png` (Overview Responsive)
- `design-system.png` (Design System)
- `campaign-performance.png` (Dashboard canvas: Marketing Suite expanded, 5 metric cards, recent campaigns, attention, connection health)

## 5. Overview page

**Where the repeated "aren't connected" text comes from**
- The sentence is `NOT_CONNECTED_SOURCE` (`copy/user-language.ts:31`). It is rendered:
  - in the page header (`overview-screen.tsx:51-53`);
  - on every health card (:95);
  - on every workspace card (:223).
- Review mode turns every health and workspace item into `setup_required` with that source (`authenticated-workspace-data.ts:242-251,282-283`).
- The "Setup required" label comes from `statusText` (`overview-screen.tsx:388-389`).
- Metric cards say "Not connected" through `packages/ui/src/components/metric.tsx:22,97-98`, built by `notConnectedReviewMetric` (`authenticated-workspace-data.ts:254-268`).
- The shell banner uses `NOT_CONNECTED_DISCLOSURE` (`user-language.ts:21-22`) at `app-shell.tsx:140-158`. The rail identity card adds one more at `user-language.ts:143`.
- On Overview alone that is **16 repeats of the sentence** (1 header, 6 health cards, 9 workspace cards) and **9 "Not connected" metrics**.

**How the walkthrough panel covers content**
- The layer is fixed, z-index 30, with no pointer events and no dimming scrim (`guided-setup.module.css:14-19`). The panel is fixed and capped at `min(28rem, 60vh)` (:27-33).
- `resolvePanelPlacement` (`model/panel-placement.ts:83-101`) puts the panel beside the target element if it fits, otherwise below it, clamped to the screen.
- Step 1 targets the full-width Quick actions row (`overview-screen.tsx:109`). There is no room beside it, so the panel drops below and covers the "Your numbers" metrics. You can see this in the baseline `tests/visual/screens/review/guided-setup--step-1-welcome--1440--light.png`.
- Below 768px wide it becomes a bottom sheet (`guided-setup.module.css:158-167`).

**The dark sidebar**
- The rail is `position: fixed; inset-block: 0`, with its own scroll (`app-shell.module.css:8-22`). It is sized to the window, not to the page.
- In full-page captures (`chromium/overview--default--1440--light.png`, which is 1440 by 5591) the dark rail stops after the first 900px. Any host that sizes its frame to the page height would show the same gap.
- In a live 1440 by 900 window the rail fills the height, but its contents overflow: the identity card is cut off at the bottom in the step-1 baseline.
- The exact cause of what the owner saw is UNKNOWN.

**What a brand-new self-serve account sees**
- Sign-up sends the person to /overview (`server/password-authentication-handler.ts:1037`) as a `location_admin` (:1024).
- Setup progress starts as `not_started`, so the walkthrough opens straight away (`guided-setup/model/progress.ts:52,147-150`).
- On screen:
  - the "Not connected yet" banner;
  - the unverified-email notice, if applicable;
  - 6 "Setup required" health cards and 2 quick actions;
  - 4 plus 5 "Not connected" metrics;
  - an empty attention list;
  - a "Coming later" row that includes links to /leads and /leads/pipeline;
  - a "No campaigns yet" card and an empty activity feed;
  - 9 "Setup required" module cards;
  - a design-reference gallery of page states (:230, kept in review mode at `authenticated-workspace-data.ts:291`);
  - the step-1 panel covering the metrics.
- The nav is the 11-item list you quoted, when homeowner reports are enabled.

## 6. Partners and Brand

**Partners.** Served by the catch-all route with the "partners" view, titled "Your Realtor partners" (`workspace-screen.tsx:35-38`). `PartnersEditor` (`workspace/preference-editors.tsx:137-330`) has search, "Add Realtor partner", partner cards with Edit and Remove, a form (name, brokerage, email, phone), and a remove-confirm dialog. Up to 25 partners (`workspace/model.ts:33-43`). Saved partners fill the create page's partner picker (`campaigns/new/page.tsx:34`).

**Brand.** In review mode `/brand` renders the "profile" view, titled "Report branding" (`brand/page.tsx:17-18`). `ReportBrandEditor` (`preference-editors.tsx:42-130`) edits name, company, email, phone, NMLS, company NMLS and tagline (`packages/contracts/src/homeowner-reports.ts:16-26`), with a preview card. The same editor is at /settings/profile. Synthetic mode shows `BrandProfileScreen` ("Brand and compliance details", `brand/components/brand-profile-screen.tsx:33-157`).

## 7. Documents that say "not a CRM" or "HighLevel is the system of record"

- `library/knowledge/private/ux-ui/00-design-brief.md`:
  - :5 calls the product an operating layer that does not attempt to replace HighLevel as the CRM system of record. The same sentence also lists automation and reporting among what it connects.
  - :7 makes Open House Boost the founding wedge, but says advertising is not the platform's identity. That conflicts with the new direction.
  - :44 says the product must not feel like a generic CRM clone.
- `in-work/prd-001.../prd-001-operation-automated-lo-index.md:18`; `prd-001j...md:30` (non-goal); `prd-001g...md:5`.
- `backlog/prd-002.../prd-002-operation-automated-lo-add-ons-index.md:21,101` (AC-6); `prd-002e...md:9,25`; `in-work/prd-007.../prd-007-homeowner-reports-index.md:23`.
- `knowledge/private/architecture/system-build-blueprint.md:23`; `product/project-map.md:199` (hard boundary 8); `product/marketplace-listing-copy-pack.md:72,186,200`; `product/source-asset-inventory.md:72`; `competitive/broker-marketplace-authenticated-teardown.md:56`.
- Public docs: `knowledge/public/overview/what-is-automated-lo.md:45`; `knowledge/public/faqs/open-house-boost-faq.md:95`.
- Design canvas: `claude-design/Overview.dc.html:135`.
- In the product: `workspace-screen.tsx:41`.
- QA: `prd-001.../qa/2026-07-20-system-build-quality-review.md:25,106` (NG-3).