# PRD-009e: Marketing Toolkit - The Campaign Page and the Campaigns List

> **Parent:** [PRD-009](./prd-009-marketing-toolkit-index.md)
> **Status:** Backlog. Authored 2026-10-01; revised the same day for OD-H (no property fields; campaigns are library ads).
> **Priority:** P1. Results move here from the removed Reports page (OD-D).
> **Schema changes:** None
> **Owner Guardians:** `react-guardian` (both pages and their reads)

## Goal

Each campaign has one page that says, honestly, how it is doing (spend, leads sent to HighLevel, cost per lead), shows the exact library ad and words that were approved, who approved them, every version, and any library notice. The Campaigns list shows every campaign with its true status and one action, "Launch an ad". Neither page shows a property or anything from a CRM.

## Background (honest)

1. **The campaign page today** (`apps/web/src/app/(authenticated)/marketing/campaigns/[campaignRef]/page.tsx`, rendering `PersistedCampaignScreen`) shows budgets and no results (`apps/web/src/features/campaigns/components/persisted-campaign-screen.tsx:72-79`).
2. **The list today** (`apps/web/src/app/(authenticated)/marketing/campaigns/page.tsx`) is titled "Your campaigns" under the eyebrow "Open House Boost" (`:27-29`), with cards (`:49-59`) and an empty state that says "Create your first Open House Boost." (`:38-41`). It shows no metrics.
3. **Results exist as a per-campaign record.** `buildCampaignReportingRecord` (`packages/application/src/reporting.ts:72`) builds six figures, `REPORTING_METRIC_KEYS` (`:37-44`): spend, leads, cost per lead, appointments, applications, funded or closed. Their words live in `apps/web/src/copy/reporting-messages.ts`. No live source feeds any of them in review mode.
4. **Who approved.** The approval projection carries the decision, time, and role, not a name (`packages/application/src/campaign-workspace-read.ts:55-59`). `campaign.approval_decisions` records `actor_id`, `actor_role`, `decided_at`, and a `snapshot` that need only be a JSON object (`supabase/migrations/20260915180000_campaign_activation.sql:136-180`, the check at `:176`). The runtime role cannot read names: `app_runtime` holds no select on `platform.app_users` (`supabase/migrations/20260919120000_first_party_sessions.sql:21`, `:493`), and that table has no location column (`supabase/migrations/20260721010000_platform_foundation.sql:127-134`), so a grant on it would expose every user's name across tenants. The signed-in person's own name is already resolved for the shell through `platform.resolve_session_display` (`first_party_sessions.sql:498`), a scoped function, and reaches the server as the session's `displayName` (`apps/web/src/server/runtime-authentication.ts:645`).
5. **Status words are already decision-aware.** `campaignStateLabel` (`apps/web/src/copy/user-language.ts:260`) reads the recorded decision, so a sent-back version reads "Sent back for changes" (PRD-008b 008B-AC-009), and `campaign-list-decisions.integration.test.tsx` covers the list.
6. **Older campaigns exist.** Campaigns saved before PRD-009 are open house versions (`blueprintId: "open-house-boost"`); 009c keeps them parseable.

## Scope

- The campaign page and the list page, their server reads, and a new `apps/web/src/copy/campaign-page-messages.ts`.
- The ad preview, the brand band, and the launch button come from 009d; the tabs and the library notices' data from 009c. They are reused, not copied.

## Non-Goals

- Appointments, applications, and funded or closed outcomes. They are HighLevel's (OD-A, PRD-002 `AC-6`).
- Any property, address, open house, Realtor partner, contact, lead, or pipeline field.
- Search and filters on the list (D-17).
- Pause and Duplicate. They return with launching, in the Meta publish PRD.

## Design decisions

### D1. Three results, and words when there is nothing to count

The results card shows only spend, leads sent to HighLevel, and cost per lead, read from the campaign's reporting record. A figure with no live value reads "Not live yet", never 0 and never a dash. When a value exists (from a future live source), the figure shows its source and when it was last updated, as `library/knowledge/private/ux-ui/03-components/metric-source-and-freshness.md` specifies.

### D2. Names come from the decider's own session, never from a cross-tenant read

When a person approves or sends back a version, the approval command records their own session display name in the decision's evidence, as `approverDisplayName` inside the `snapshot` JSON (009C-AC-015), read from their own session through the existing `platform.resolve_session_display`; if that read yields only the fallback name, nothing is recorded. The page shows that recorded name, as text, always beside the role ("Approved by <name>, workspace owner, on <date>."), because the name is whatever the person typed at sign-up (`platform.app_users.safe_display_name`, 1 to 200 characters, `supabase/migrations/20260721010000_platform_foundation.sql:130`) and is not verified; `actor_id` and `actor_role` are the authoritative record. The name is personal data in an append-only table (`approval_decisions_append_only`, `supabase/migrations/20260915180000_campaign_activation.sql:266-268`), so it cannot be corrected or erased later. A decision without one (every decision made before PRD-009) shows the role and time instead: "Approved by the workspace owner on <date>." or "Approved by an approver on <date>.", from `actor_role`. No grant on `platform.app_users`, no new function, and no migration is needed; a grant on `platform.app_users` to `app_runtime` is not acceptable. A saved version shows "Saved on <date>", with "by you" when the viewer saved it, because a saver's name is not recorded.

### D3. Read-only older versions

An older version opens at a stable address of its own, read-only: no approve, launch, or "Make a new version" control.

### D4. Campaigns from before the library

An open house campaign saved before PRD-009 opens read-only with one line, "Made with the earlier open house flow.", its saved words, and its recorded decisions. It has no "Make a new version"; the page offers "Launch an ad" instead. Its property fields are not shown.

## Acceptance criteria

| ID | Criterion | Test |
|---|---|---|
| 009E-AC-001 | The campaign page's header shows the eyebrow "From the ads library, <topic>", the ad's name as the `h1`, one line with the run dates, where it shows, and the budget, and the decision-aware status chip. Its actions are "Make a new version" (secondary, 009D-AC-020) and "Launch on Facebook" (primary and disabled, from 009d's function), with that button's one sentence directly under the buttons. | Integration |
| 009E-AC-002 | The results card comes first and spans the content width. It shows Spend, Leads sent to HighLevel, and Cost per lead and no other figure. With no live values, each figure reads "Not live yet", the card carries one "Not live yet" chip and the sentence "This ad isn't running, so there is nothing to count yet. Spend comes from Meta, and leads are counted when they reach HighLevel.", and no digit appears in any figure. A component test with fixture values shows each figure with its source and last-updated time. | Component, Integration (review) |
| 009E-AC-003 | The page shows the approved version's ad with 009d's preview and brand band, labelled "Version N", with the library ad's name and version, which words were changed, and who it shows to (the area and "the Facebook feed"). | Component |
| 009E-AC-004 | The approval section follows D2: "Approved by <name>, <role>, on <date>." with the name recorded in the decision's evidence at decision time and always shown beside the role, or the role sentence when none is recorded, then "The approval covers this version and these words only. A new version needs its own approval." With no approval it says nobody has approved this version yet. A Postgres test approves as a seeded approver and reads back their own display name; a second test reads a decision recorded without a name and sees the role sentence; the existing pgTAP assertion that `app_runtime` cannot select `platform.app_users` (`supabase/tests/first_party_sessions.pgtap.sql:299-300`) still passes, and no migration was added. A route test posts an `approverDisplayName` in the approve request and gets 400, because the name comes only from the server's session read. `docs/operations/retention-and-deletion.md` and `docs/operations/export.md` name `campaign.approval_decisions.snapshot.approverDisplayName` as personal data, as `006C-AC-021` does for the setup profile. | Postgres route, Integration, pgTAP, Record check |
| 009E-AC-005 | The versions section lists every version of the campaign, newest first, each with its number, decision-aware chip, and who saved it or sent it back and when, as D2 allows. An older version opens read-only at its own address (D3), whose version number must be a positive integer. A request from another location for any older version's address answers exactly as an unknown reference does. | Postgres route, Integration |
| 009E-AC-006 | One-line library notices appear only when they apply, each with at most one action: the ad was retired (009c D4, with "Choose another ad" for an undecided version); a newer version of the ad exists (with "Use the new version" for an undecided version, 009C-AC-009); Brand changed after this version was saved ("Make a new version to use it."). | Integration |
| 009E-AC-007 | "Details for support" is a collapsed `<details>` holding only the version reference, the library ad's `id` and version, and the support reference (user-language contract section 6). | Component |
| 009E-AC-008 | The page renders no address, open house time, Realtor partner, contact list, lead table, pipeline, appointment, application, or funded figure, and no link to `/leads`. A source scan of both pages' components agrees. | Integration, Source scan |
| 009E-AC-009 | The Campaigns page has the tabs "Your campaigns" and "Ads library" (009C-AC-010) and one primary action, "Launch an ad". At 720 px and wider "Your campaigns" is a table with Ad (a decorative thumbnail and the name as the link), Topic, Runs, Where it shows, Status, and Last change; below 720 px it is cards with the same facts. It has no results column, no search, and no filters. | Integration, Browser (review) |
| 009E-AC-010 | Every status on the list comes from `campaignStateLabel`, extended for "Ad retired": a sent-back version reads "Sent back for changes" and a version whose checks found something reads "Needs changes". The existing `campaign-list-decisions.integration.test.tsx` cases still pass and new cases cover every state of 009d D8. | Integration |
| 009E-AC-011 | With no campaigns, "Your campaigns" shows "No campaigns yet", "Pick an ad from the library to set up your first one.", and the primary "Launch an ad" inside the empty state, so the page still has exactly one primary action. | Integration |
| 009E-AC-012 | A campaign saved before PRD-009 renders as D4 states: read-only, the one line, its words and decisions, no property field, no "Make a new version", and "Launch an ad" offered instead; on the list it shows its saved headline as its name and "Earlier flow" as its topic. A Postgres test seeds one such version. | Postgres route, Integration |

## Files expected to change

- `apps/web/src/app/(authenticated)/marketing/campaigns/[campaignRef]/page.tsx` and `apps/web/src/features/campaigns/components/persisted-campaign-screen.tsx` (rewritten) and their tests
- `apps/web/src/app/(authenticated)/marketing/campaigns/page.tsx` and its tests
- The campaign workspace read (approver name, version history, library notices), with Postgres route tests
- `apps/web/src/copy/campaign-page-messages.ts` (new)

## Test plan

- **Component:** results with and without values (009E-AC-002), the ad (003), support details (007).
- **Integration:** header and actions (001), approval and versions (004, 005), notices (006), no property or CRM (008), the list in every state (009 to 011), older campaigns (012).
- **Postgres (`pnpm test:db`):** the approver's name, version history, and older campaigns under tenant context (004, 005, 012).
- **Browser (review):** the table and card layouts across frames (009).

## Security notes

- No new read of `platform.app_users`: the name shown is the one the decider's own session recorded (D2), and an older decision shows only its role.
- Older versions are read under the session's tenant context like the latest one.

## Open questions

- [ ] None blocking.

## Related

- [Design direction, sections 7 and 8](design/00-direction.md)
- [Mockups: campaign page](design/mockups/campaign-detail.html), [campaigns list](design/mockups/campaigns-list.html)
- [PRD-001g](../../in-work/prd-001-operation-automated-lo/prd-001g-campaign-and-portfolio-reporting.md), whose dashboard criteria move here (009f register)

## Amendments

- **2026-10-01, OD-H.** The header, the ad section, the table columns, and the empty state follow the library flow, and no property field remains. The first draft (`22e6b87`) described open house campaigns; git history keeps it.
