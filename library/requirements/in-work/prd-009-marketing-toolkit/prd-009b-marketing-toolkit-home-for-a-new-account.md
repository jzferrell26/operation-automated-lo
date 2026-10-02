# PRD-009b: Marketing Toolkit - Home for a Brand-New Account

> **Parent:** [PRD-009](./prd-009-marketing-toolkit-index.md)
> **Status:** In Work (Gauntlet run started 2026-10-01). Authored 2026-10-01; revised the same day for OD-H (the lead card goes to "Launch an ad", the checklist drops the Realtor partner).
> **Priority:** P0. This is the page the owner saw.
> **Schema changes:** None (reads `platform.marketplace_installations`, which `app_runtime` can already select)
> **Owner Guardians:** `react-guardian` (the page and its server read); `product-tour-onboarding-ui-guardian` (retiring the walkthrough, the inline checklist)

## Goal

A brand-new self-serve account lands on a calm Home that asks one question, "What do you want to promote?", leads to "Launch an ad", states once what is and is not connected, and shows honest empty lists. No metric wall, no floating panel, nothing borrowed from a CRM (OD-A, OD-F, OD-H, D-11, D-15, D-20).

## Background (honest)

1. **Where a new account lands.** Sign-up answers with `next: OVERVIEW_PATH` (`apps/web/src/server/password-authentication-handler.ts:1037`) for a `location_admin` binding (`:1024`).
2. **What it sees today (review mode).** `toReviewOverview` (`apps/web/src/server/authenticated-workspace-data.ts:276-293`) turns every health and workspace item into `setup_required` and every metric into a "Not connected" metric (`notConnectedReviewMetric`, `:254`), and keeps the design-reference `stateMatrix`, which the screen renders at `apps/web/src/features/overview/components/overview-screen.tsx:230`. The screen shows "Quick actions" (`:106-111`), "Your numbers" (`:123`), and a "Coming later" row (`:131`) that links to `/leads` and `/leads/pipeline`. The recon counted 16 repeats of `NOT_CONNECTED_SOURCE` and 9 "Not connected" metrics on one page ([recon section 5](research/2026-10-01-oalo-toolkit-recon.md)).
3. **The floating walkthrough.** Setup progress starts `not_started` (`apps/web/src/features/guided-setup/model/progress.ts:52`), and auto-start happens while it is `not_started` or `in_progress` (`:146-150`). The panel layer is fixed with no scrim and the panel is capped at `min(28rem, 60vh)` (`guided-setup.module.css:14-33`); step 1 targets the full-width Quick actions row, so the panel drops below it and covers "Your numbers" (recon section 5).
4. **The saved setup profile.** `setup_profile.v1` (`apps/web/src/features/guided-setup/model/profile.ts:19`) holds `displayName`, `company`, `nmlsNumber`, `phone`, `realtorName`, and `realtorBrokerage` (`:25-34`).
5. **Where Home's facts live.** The brand is per person in `platform.user_preferences` under `workspace.brand.v1` (`apps/web/src/server/workspace-preferences.ts:39,54`). HighLevel installation state is `platform.marketplace_installations.status` (`supabase/migrations/20260721010000_platform_foundation.sql:161-180`), which `app_runtime` can select (`:1744`); no application code reads it yet. No table stores a Meta connection: the Meta adapter is a plan only (`META_ADAPTER_MODE = "fixture-plan"`, `packages/ghl/src/meta-adapter.ts:13`).
6. **The library may be empty.** The real ads catalog ships empty and fills when the owner supplies ads (009c D2).

## Scope

- `apps/web/src/app/(authenticated)/overview/**`, `apps/web/src/features/overview/**`, and the overview part of `apps/web/src/server/authenticated-workspace-data.ts`.
- A new server read for the checklist states, and a new `apps/web/src/copy/home-messages.ts`.
- `apps/web/src/features/guided-setup/**` (removal, keeping the profile model), the shell's help controls, and `apps/web/src/app/api/setup/progress/**` (removal).

## Non-Goals

- Making any connection work. HighLevel and Meta stay not connected; "Connect" goes to Settings, which already says so.
- Deleting stored `guided_setup.v1` rows. They stay in the database and are no longer read.
- Live campaigns. None can exist in PRD-009, so "Running now" always shows its empty state on a real account.
- A Realtor partner item on Home (D-20).

## Design decisions

### D1. Composition

The design's composition (`design/00-direction.md` section 4.1): a greeting; the start card, whose heading "Launch an ad" is the page's `h1`, with the lead sentence (as 009d D3 corrects it), the question "What do you want to promote?", one small secondary button per topic that has an active ad, the one primary button "Choose an ad", and the three step labels; the "Get set up" card; "Running now"; "Needs your approval"; and the footer "HighLevel stays your CRM. Your contacts, pipelines and follow-up live there." At 768 and 390 the order is start card, checklist, running, approval.

A topic button opens step 1 filtered to that topic; "Choose an ad" opens step 1 with every ad. With an empty library the card shows 009C-AC-012's sentence in place of the topic buttons, and "Choose an ad" still opens step 1, which says the same.

### D2. Checklist states come from saved records only

| Item | Done or Connected when | Needs attention when | Otherwise |
|---|---|---|---|
| Connect HighLevel | an installation for the session's location has status `active` | status `missing_scope` or `reconnect_required` | Not connected yet: no installation, or status `pending`, `revoked`, or `uninstalled` (the six statuses the table allows, `supabase/migrations/20260721010000_platform_foundation.sql:168-169`) |
| Connect Meta | never in PRD-009: no Meta connection is stored | never in PRD-009 | Not connected yet |
| Add your brand | the person's saved brand has a name and an NMLS number | a brand is saved without an NMLS number | Not started |

"N of 3 done" counts Connected and Done. The intro is "You can set up an ad now. It runs once HighLevel and Meta are connected." The brand item says "Your name and NMLS number. They go on every ad automatically." (009d D3). Nothing is read from browser storage or inferred from clicks (`library/knowledge/private/ux-ui/03-components/onboarding-checklist.md:13`).

### D3. "Needs your approval" is for people who can approve

A person who can approve (`location_admin` or `campaign_approver`) sees the card. Anyone else does not, because "Nothing to approve" would be the wrong sentence for someone who never approves. The list reads the recorded decision, as PRD-008b requires (008B-AC-009).

### D4. Retire the walkthrough, keep the profile

The floating panel, its steps, the "Finish setup" chip, panel placement, the anchor registry, the help menu's "Show me around again", and `POST /api/setup/progress` are removed. `setup_profile.v1`, its schema in `profile.ts`, and `POST /api/setup/profile` stay; the Brand form reads the profile to prefill (009D-AC-003). The profile's Realtor fields are kept in storage and read by nothing.

The removal runs in two parts so no two lanes edit the same file and no test fails between waves. In Wave 2 this lane removes every use outside `apps/web/src/features/campaigns/`: the provider and `GuidedSetupShellControls` in `apps/web/src/app/(authenticated)/layout.tsx` (009a has finished with that file in Wave 1), the overview anchors, the help menu item, the progress half of `apps/web/src/server/setup-preferences.ts` (`:16-27`, `:337-341`, `:391-412`), and the progress route. In the same change it deletes all six `tests/browser/review/guided-setup.*.spec.ts` files (009g writes a new timed spec in Wave 4), removes `putTheWalkthroughAside` and `restartGuidedSetup` (`tests/browser/review/helpers/review-session.ts:19`, `tests/browser/review/helpers/guided-setup-journey.ts:201`) and every call to them, and removes the `finish-setup-chip` capture (`tests/browser/review/design-quality.spec.ts:815`), because those helpers and that capture click or photograph controls this change removes. The one exception is `review-campaign-decision.spec.ts`, which 009d owns in Wave 2 and removes its own calls from. 009d removes the uses inside `features/campaigns/` in the same wave. In Wave 3, after both have merged, this lane deletes `apps/web/src/features/guided-setup/**` (except `model/profile.ts`) and `apps/web/src/copy/guided-setup-messages.ts`, which nothing imports by then.

## Acceptance criteria

| ID | Criterion | Test |
|---|---|---|
| 009B-AC-001 | In review mode, `/overview` for a workspace owner renders, after the top bar and in DOM order: the greeting, the start card, the "Get set up" card, "Running now", "Needs your approval", and the footer sentence of D1. It renders no metric, "Your numbers", "Quick actions", "Coming later", workspace module card, attention list, activity feed, design-reference gallery, or Realtor partner item. | Integration (review) |
| 009B-AC-002 | The start card is D1's: `h1` "Launch an ad", the corrected lead sentence, "What do you want to promote?", one secondary button per topic with an active ad (each opening step 1 with `?topic=`), the one primary "Choose an ad" (opening step 1 unfiltered), and the three step labels "Choose an ad", "Set it up", "Review and launch". With an empty library it shows the empty sentence instead of topic buttons. | Component, Integration, Browser (review) |
| 009B-AC-003 | "Choose an ad" is the first focusable control after the skip link and the top bar, followed by the topic buttons. At 768 and 390 the cards stack in the order of D1. | Browser (review) |
| 009B-AC-004 | The "Get set up" card shows the three items of D2 with their sentences. Each state is shown as a glyph plus words. A Postgres-backed test seeds each row of D2 (installation `active`, `missing_scope`, `reconnect_required`, `pending`, `revoked`, `uninstalled`, and none; brand with name and NMLS, brand without NMLS, no brand) and asserts the state the server read returns. | Postgres (`pnpm test:db`), Integration |
| 009B-AC-005 | "N of 3 done" equals the count of Connected and Done items from the server read. A source scan finds no `localStorage`, `sessionStorage`, or IndexedDB use in the Home feature. | Unit, Source scan |
| 009B-AC-006 | When all three items are done the card collapses to one line, "You're set up", with a link to review the items. When any item is "Needs attention" the card is open with that item marked. | Integration |
| 009B-AC-007 | Each item's action is a link with an accessible name that includes its item ("Connect HighLevel", "Connect Meta", "Add your brand"): both connections go to `/settings/connections` and the brand to `/brand`. | Integration |
| 009B-AC-008 | On Home for a brand-new account, every sentence that says HighLevel or Meta is not connected sits inside the "Get set up" card: its intro and the two item states. `NOT_CONNECTED_SOURCE`, `NOT_CONNECTED_DISCLOSURE`, and the "Not connected" metric text appear nowhere on the page. | Integration, Browser (review) |
| 009B-AC-009 | "Running now" lists up to three live campaigns (the ad's name, run dates, status chip, one link) and "See all campaigns" when there are more. With none, it shows the empty state: an icon, "No ads running", "An ad shows here, with its spend and leads, once you launch it.", and a link "Launch an ad" (a link, so the page keeps one primary button). A component test covers zero and one live campaign (the live state injected, because none can exist in PRD-009). | Component |
| 009B-AC-010 | For a person who can approve, "Needs your approval" lists up to three campaigns whose latest version passed its checks and has no recorded decision, newest first, and its empty state otherwise ("Nothing to approve", "A campaign waits here after its checks pass, until someone approves it or sends it back."). An approved, sent-back, needs-changes, or ad-retired version never appears. A person who cannot approve does not see the card. Integration tests cover each of those states for an approver and a creator, written red first. | Integration, Postgres |
| 009B-AC-011 | After a real sign-up in the review project, the first render of `/overview` contains no element with `role="dialog"` and no floating panel. The removals of D4 are complete: a source scan finds no guided-setup provider, panel, step, chip, panel-placement, anchor-registry, or "Show me around again" code (verified after Wave 3, when this lane's cleanup has deleted `apps/web/src/features/guided-setup/**`; the ledger row stays OPEN until then), and `POST /api/setup/progress` answers 404. A Postgres test shows an existing `guided_setup.v1` row is still present after the change. | Browser (review), Source scan, Postgres |
| 009B-AC-012 | `setup_profile.v1` stays readable and writable through `POST /api/setup/profile`, whose existing route tests pass; the route's schema accepts and drops `realtorName` and `realtorBrokerage` on write, and no screen or ad reads their stored values (the retention and export documents still name them, 006C-AC-021). When a person has a profile but no saved brand, the Brand form is prefilled from `displayName`, `company`, `nmlsNumber`, and `phone`. | Integration, Postgres |
| 009B-AC-013 | On the review URL, Home shows honest empty and not-connected states and no unlabelled sample data. `RGL-002` (ledger `GGL-001`) and `004A-AC-003` (ledger `GGL-002`) are re-proved on the new Home by the honesty suites, and those rows cite this criterion. | Integration (review) |
| 009B-AC-014 | In synthetic mode Home has the same composition, fed by fixture campaigns and the sample ads catalog, every sample labelled as 009C-AC-005 requires, and it links to no removed section. | Integration (synthetic) |
| 009B-AC-015 | The Help control in the top bar opens a help menu that contains no walkthrough restart, at every frame. | Integration |

## Files expected to change

- `apps/web/src/app/(authenticated)/overview/page.tsx`
- `apps/web/src/features/overview/components/overview-screen.tsx` (rewritten) and its tests
- `apps/web/src/server/authenticated-workspace-data.ts` (the overview projection) and a new checklist read under `apps/web/src/server/`
- `apps/web/src/copy/home-messages.ts` (new)
- `apps/web/src/features/guided-setup/**` (removed in Wave 3, except `model/profile.ts` and what the Brand prefill needs), `apps/web/src/copy/guided-setup-messages.ts` (removed in Wave 3), `apps/web/src/app/api/setup/progress/**` (removed), the shell help controls
- `apps/web/src/app/(authenticated)/layout.tsx` (the provider and shell controls) and `apps/web/src/server/setup-preferences.ts` (the progress half)
- In Wave 2, the tests that put the walkthrough aside or name it: `tests/browser/design-quality.spec.ts`, `tests/browser/helpers/design-quality.ts`, `tests/browser/review/design-quality.spec.ts` (also the `finish-setup-chip` capture), `homeowner-language-sweep.spec.ts`, `review-change-password-saved.spec.ts`, `workspace-pages.spec.ts`, `helpers/review-session.ts`, and `helpers/guided-setup-journey.ts` (`review-campaign-decision.spec.ts` is 009d's in that wave)
- `apps/web/src/fixtures/ui-foundation/synthetic-ui.ts` (the overview fixture rows that name removed sections)
- `tests/browser/review/guided-setup.accessibility.spec.ts`, `guided-setup.hand-off.spec.ts`, `guided-setup.resume.spec.ts`, `guided-setup.tablet-anchoring.spec.ts`, `guided-setup.walkthrough-captures.spec.ts`, and `guided-setup.timed.spec.ts` (removed in Wave 2; 009g writes a new timed spec); `helpers/guided-setup-journey.ts` keeps `freshEmail` and `signUpFreshAccount`

## Test plan

- **Unit:** the progress count (009B-AC-005).
- **Component:** the start card (002), "Running now" (009).
- **Integration (review and synthetic):** composition (001, 014), checklist rendering and links (004, 006, 007), the single statement (008), the approval list (010), the profile prefill (012), the honesty re-proof (013), the help menu (015).
- **Postgres (`pnpm test:db`):** checklist reads for each state (004), the approval list (010), the retained progress row (011), the profile route (012).
- **Browser (review):** the start card and topics (002), focus order (003), the new-account first render (011).

## Security notes

- The checklist read runs under the session's tenant context through the existing `app_runtime` grant; it reads one location's installation rows and the signed-in person's own preferences.
- Removing `POST /api/setup/progress` removes a write route; nothing replaces it.

## Open questions

- [ ] None blocking. What Realtor partners is for is an owner question recorded in the index (D-20).

## Related

- [Design direction, section 4](design/00-direction.md)
- [Mockup: Home, first run](design/mockups/home-first-run.html)
- [PRD-006c guided setup](../../in-work/prd-006-first-party-sign-in-and-guided-experience/prd-006c-first-party-sign-in-and-guided-experience-guided-setup.md), whose retired criteria are rows in the [009f register](./prd-009f-marketing-toolkit-removals-and-records.md)
- [PRD-008b product correctness](../../completed/prd-008-finish-line-hardening/prd-008b-finish-line-hardening-product-correctness.md)

## Amendments

- **2026-10-01, OD-H.** The start card now leads to "Launch an ad" through a topic question instead of a property address box, and the checklist has three items instead of four ("Add a Realtor partner" left, D-20). The first draft (`22e6b87`) carried the address box and the partner item; git history keeps it.
