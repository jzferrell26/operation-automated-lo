# PRD-009b: Marketing Toolkit - Home for a Brand-New Account

> **Parent:** [PRD-009](./prd-009-marketing-toolkit-index.md)
> **Status:** Backlog. Authored 2026-10-01. Not started.
> **Priority:** P0. This is the page the owner saw.
> **Schema changes:** None (reads `platform.marketplace_installations`, which `app_runtime` can already select)
> **Owner Guardians:** `react-guardian` (the page and its server read); `product-tour-onboarding-ui-guardian` (retiring the walkthrough, the inline checklist)

## Goal

A brand-new self-serve account lands on a calm Home that asks one question, "Start an Open House Boost", states once what is and is not connected, and shows honest empty lists. No metric wall, no floating panel, nothing borrowed from a CRM (OD-A, OD-F, D-11, D-15).

## Background (honest)

1. **Where a new account lands.** Sign-up answers with `next: OVERVIEW_PATH` (`apps/web/src/server/password-authentication-handler.ts:1037`) for a `location_admin` binding (`:1024`).
2. **What it sees today (review mode).** `toReviewOverview` (`apps/web/src/server/authenticated-workspace-data.ts:276-293`) turns every health and workspace item into `setup_required` and every metric into a "Not connected" metric (`notConnectedReviewMetric`, `:254`), and keeps the design-reference `stateMatrix`, which the screen renders at `apps/web/src/features/overview/components/overview-screen.tsx:230`. The screen shows "Quick actions" (`:106-111`), "Your numbers" (`:123`), and a "Coming later" row (`:131`) that links to `/leads` and `/leads/pipeline`. The recon counted 16 repeats of `NOT_CONNECTED_SOURCE` and 9 "Not connected" metrics on one page ([recon section 5](research/2026-10-01-oalo-toolkit-recon.md)).
3. **The floating walkthrough.** Setup progress starts `not_started` (`apps/web/src/features/guided-setup/model/progress.ts:52`), and auto-start happens while it is `not_started` or `in_progress` (`:146-150`). The panel layer is fixed with no scrim and the panel is capped at `min(28rem, 60vh)` (`guided-setup.module.css:14-33`); step 1 targets the full-width Quick actions row, so the panel drops below it and covers "Your numbers" (recon section 5).
4. **The saved setup profile.** `setup_profile.v1` (`apps/web/src/features/guided-setup/model/profile.ts:19`) holds `displayName`, `company`, `nmlsNumber`, `phone`, `realtorName`, and `realtorBrokerage` (`:25-34`). `campaignDraftPrefill` (`:83-96`) supplies the starter ad words and the $25 and $125 budgets.
5. **Where Home's facts live.** Brand and partners are per person in `platform.user_preferences`, under `workspace.brand.v1` and `workspace.partners.v1` (`apps/web/src/server/workspace-preferences.ts:39,54`). HighLevel installation state is `platform.marketplace_installations.status` (`supabase/migrations/20260721010000_platform_foundation.sql:161-180`), which `app_runtime` can select (`:1744`); no application code reads it yet. No table stores a Meta connection: the Meta adapter is a plan only (`META_ADAPTER_MODE = "fixture-plan"`, `packages/ghl/src/meta-adapter.ts:13`), and Meta is reached through HighLevel's ad-publishing routes (`:35-58`).

## Scope

- `apps/web/src/app/(authenticated)/overview/**`, `apps/web/src/features/overview/**`, and the overview part of `apps/web/src/server/authenticated-workspace-data.ts`.
- A new server read for the checklist states, and a new `apps/web/src/copy/home-messages.ts`.
- `apps/web/src/features/guided-setup/**` (removal, keeping the profile model), the shell's help controls, and `apps/web/src/app/api/setup/progress/**` (removal).

## Non-Goals

- Making any connection work. HighLevel and Meta stay not connected; "Connect" goes to Settings, which already says so.
- Deleting stored `guided_setup.v1` rows. They stay in the database and are no longer read.
- Live campaigns. None can exist in PRD-009, so "Running now" always shows its empty state on a real account.

## Design decisions

### D1. Composition

Exactly the design's composition (design `00-direction.md` section 4.1): a greeting, the start card (whose heading "Start an Open House Boost" is the page's `h1`), the "Get set up" card, "Running now", "Needs your approval", and the footer "HighLevel stays your CRM. Your contacts, pipelines and follow-up live there." At 768 and 390 the order is start card, checklist, running, approval.

### D2. The brand item's sentence is corrected

The design's sentence says the brand holds "logo and colors". PRD-009 ships no logo upload (index Non-Goals), and the brand gains one ad color (009d D4). The item therefore says "Your name, NMLS number and ad color, used on every ad." so the checklist promises nothing the product cannot do.

### D3. Checklist states come from saved records only

| Item | Done or Connected when | Needs attention when | Otherwise |
|---|---|---|---|
| Connect HighLevel | an installation for the session's location has status `active` | status `missing_scope` or `reconnect_required` | Not connected yet |
| Connect Meta | never in PRD-009: no Meta connection is stored | never in PRD-009 | Not connected yet |
| Add your brand | the person's `workspace.brand.v1` has a non-empty name, company, and NMLS number | never | Not started |
| Add a Realtor partner | the person's `workspace.partners.v1` has at least one partner | never | Not started |

"N of 4 done" counts Connected and Done. Nothing is read from browser storage or inferred from clicks (the rule at `library/knowledge/private/ux-ui/03-components/onboarding-checklist.md:13`).

### D4. "Needs your approval" is for people who can approve

A person who can approve (`location_admin` or `campaign_approver`) sees the card. Anyone else does not, because "Nothing to approve" would be the wrong sentence for someone who never approves. The list reads the recorded decision, as PRD-008b requires (008B-AC-009).

### D5. Retire the walkthrough, keep the profile

The floating panel, its steps, the "Finish setup" chip, panel placement, the anchor registry, the help menu's "Show me around again", and `POST /api/setup/progress` are removed. `setup_profile.v1`, its schema in `profile.ts`, and `POST /api/setup/profile` stay; the launch flow reads the profile to prefill (009d).

### D6. The address does not travel in the URL

"Start" carries the typed address into step 1 through client navigation state, not a query string, so a property address never lands in request logs. A reload of step 1 shows the field empty, which is honest: nothing was saved.

## Acceptance criteria

| ID | Criterion | Test |
|---|---|---|
| 009B-AC-001 | In review mode, `/overview` for a workspace owner renders, after the top bar and in DOM order: the greeting, the start card, the "Get set up" card, "Running now", "Needs your approval", and the footer sentence of D1. It renders no metric, "Your numbers", "Quick actions", "Coming later", workspace module card, attention list, activity feed, or design-reference gallery. | Integration (review) |
| 009B-AC-002 | The start card holds one "Property address" field, one primary "Start" button, and the three step labels. "Start" with an empty field shows the field's error and stays on Home. "Start" with an address opens step 1 of `/marketing/campaigns/new` with the address filled in, and the resulting URL contains no part of the address (D6). | Component, Browser (review) |
| 009B-AC-003 | The address field and "Start" are the first focusable controls after the skip link and the top bar. At 768 and 390 the cards stack in the order of D1. | Browser (review) |
| 009B-AC-004 | The "Get set up" card shows the four items of D3 with the design's sentences (the brand sentence as D2 corrects it). Each state is shown as a glyph plus words. A Postgres-backed test seeds each row of D3 (installation `active`, `missing_scope`, none; brand complete, brand without NMLS, none; partners present, none) and asserts the state the server read returns. | Postgres (`pnpm test:db`), Integration |
| 009B-AC-005 | "N of 4 done" equals the count of Connected and Done items from the server read. A source scan finds no `localStorage`, `sessionStorage`, or IndexedDB use in the Home feature. | Unit, Source scan |
| 009B-AC-006 | When all four items are done the card collapses to one line, "You're set up", with a link to review the items. When any item is "Needs attention" the card is open with that item marked. | Integration |
| 009B-AC-007 | Each item's action is a link with an accessible name that includes its item ("Connect HighLevel", "Connect Meta", "Add your brand", "Add a Realtor partner"): both connections go to `/settings/connections`, the brand to `/brand`, the partner to `/partners`. | Integration |
| 009B-AC-008 | On Home for a brand-new account, every sentence that says HighLevel or Meta is not connected sits inside the "Get set up" card: its intro "You can start an ad now. It runs once HighLevel and Meta are connected." and the two item states. `NOT_CONNECTED_SOURCE`, `NOT_CONNECTED_DISCLOSURE`, and the "Not connected" metric text appear nowhere on the page. | Integration, Browser (review) |
| 009B-AC-009 | "Running now" lists up to three live campaigns (address, open house date, status chip, one link) and "See all campaigns" when there are more. With none, it shows the empty state: an icon, "No ads running", "An ad shows here, with its spend and leads, once you launch it.", and a link "Start an Open House Boost" that moves focus to the address field (a link, so the page keeps one primary button). A component test covers zero and one live campaign (the live state injected, because none can exist in PRD-009). | Component |
| 009B-AC-010 | For a person who can approve, "Needs your approval" lists up to three campaigns whose latest version passed its checks and has no recorded decision, newest first, and its empty state otherwise ("Nothing to approve", "A campaign waits here after its checks pass, until someone approves it or sends it back."). An approved, sent-back, or needs-changes version never appears. A person who cannot approve does not see the card. Integration tests cover undecided, approved, sent-back, and needs-changes versions for an approver and a creator, written red first. | Integration, Postgres |
| 009B-AC-011 | After a real sign-up in the review project, the first render of `/overview` contains no element with `role="dialog"` and no floating panel. The removals of D5 are complete: a source scan finds no guided-setup provider, panel, step, chip, panel-placement, anchor-registry, or "Show me around again" code, and `POST /api/setup/progress` answers 404. A Postgres test shows an existing `guided_setup.v1` row is still present after the change. | Browser (review), Source scan, Postgres |
| 009B-AC-012 | `setup_profile.v1` stays readable and writable through `POST /api/setup/profile`, whose existing route tests pass. When a person has a profile but no saved brand, step 2's brand form is prefilled from `displayName`, `company`, `nmlsNumber`, and `phone`; when they have a profile Realtor but no saved partner, step 2 offers that Realtor as a partner to add. | Integration, Postgres |
| 009B-AC-013 | On the review URL, Home shows honest empty and not-connected states and no unlabelled sample data. `RGL-002` (ledger `GGL-001`) and `004A-AC-003` (ledger `GGL-002`) are re-proved on the new Home by the honesty suites, and those rows cite this criterion. | Integration (review) |
| 009B-AC-014 | In synthetic mode Home has the same composition, fed by fixture campaigns that the page labels as sample data, and it links to no removed section. | Integration (synthetic) |
| 009B-AC-015 | The Help control in the top bar opens a help menu that contains no walkthrough restart, at every frame. | Integration |

## Files expected to change

- `apps/web/src/app/(authenticated)/overview/page.tsx`
- `apps/web/src/features/overview/components/overview-screen.tsx` (rewritten) and its tests
- `apps/web/src/server/authenticated-workspace-data.ts` (the overview projection) and a new checklist read under `apps/web/src/server/`
- `apps/web/src/copy/home-messages.ts` (new)
- `apps/web/src/features/guided-setup/**` (removed, except `model/profile.ts` and what the profile prefill needs), `apps/web/src/app/api/setup/progress/**` (removed), the shell help controls
- `apps/web/src/fixtures/ui-foundation/synthetic-ui.ts` (the overview fixture rows that name removed sections)
- `tests/browser/review/guided-setup.*.spec.ts` (removed or re-scoped; the timed spec moves to 009g)

## Test plan

- **Unit:** the progress count (009B-AC-005).
- **Component:** the start card (002), "Running now" (009).
- **Integration (review and synthetic):** composition (001, 014), checklist rendering and links (004, 006, 007), the single statement (008), approval list (010), profile prefill (012), honesty re-proof (013), help menu (015).
- **Postgres (`pnpm test:db`):** checklist reads for each state (004), the approval list (010), the retained progress row (011), the profile route (012).
- **Browser (review):** start and URL (002), focus order (003), the new-account first render (011).

## Security notes

- The checklist read runs under the session's tenant context through the existing `app_runtime` grant; it reads one location's installation rows and the signed-in person's own preferences.
- Removing `POST /api/setup/progress` removes a write route; nothing replaces it.

## Open questions

- [ ] None blocking.

## Related

- [Design direction, section 4](design/00-direction.md)
- [Mockup: Home, first run](design/mockups/home-first-run.html)
- [PRD-006c guided setup](../../in-work/prd-006-first-party-sign-in-and-guided-experience/prd-006c-first-party-sign-in-and-guided-experience-guided-setup.md), whose retired criteria are rows S-16 to S-32 of the [009f register](./prd-009f-marketing-toolkit-removals-and-records.md)
- [PRD-008b product correctness](../../completed/prd-008-finish-line-hardening/prd-008b-finish-line-hardening-product-correctness.md)

## Amendments

None yet.
