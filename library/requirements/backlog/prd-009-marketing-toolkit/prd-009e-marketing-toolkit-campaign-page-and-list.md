# PRD-009e: Marketing Toolkit - The Campaign Page and the Campaigns List

> **Parent:** [PRD-009](./prd-009-marketing-toolkit-index.md)
> **Status:** Backlog. Authored 2026-10-01. Not started.
> **Priority:** P1. Results move here from the removed Reports page (OD-D).
> **Schema changes:** None
> **Owner Guardians:** `react-guardian` (both pages and their reads)

## Goal

Each campaign has one page that says, honestly, how it is doing (spend, leads sent to HighLevel, cost per lead), shows the ad that was approved, who approved it, and every version. The Campaigns list shows every Open House Boost with its true status and one action, "New Open House Boost". Nothing on either page is a CRM.

## Background (honest)

1. **The campaign page today** (`apps/web/src/app/(authenticated)/marketing/campaigns/[campaignRef]/page.tsx`, rendering `PersistedCampaignScreen`) shows budgets and no results (`apps/web/src/features/campaigns/components/persisted-campaign-screen.tsx:72-79`).
2. **The list today** (`apps/web/src/app/(authenticated)/marketing/campaigns/page.tsx`) renders cards under "Your campaigns" (`:28`, `:49-59`) and shows no metrics.
3. **Results exist as a per-campaign record.** `buildCampaignReportingRecord` (`packages/application/src/reporting.ts:72`) builds six figures, `REPORTING_METRIC_KEYS` (`:37-44`): spend, leads, cost per lead, appointments, applications, funded or closed. Their words live in `apps/web/src/copy/reporting-messages.ts`. No live source feeds any of them in review mode.
4. **Who approved.** The approval projection carries the decision, time, and role, not a name (`packages/application/src/campaign-workspace-read.ts:55-59`). `campaign.approval_decisions` records `actor_id` (`supabase/migrations/20260915180000_campaign_activation.sql:136-170`), and `platform.app_users` has `safe_display_name` (`supabase/migrations/20260721010000_platform_foundation.sql:130`).
5. **Status words are already decision-aware.** `campaignStateLabel` (`apps/web/src/copy/user-language.ts:260`) reads the recorded decision, so a sent-back version reads "Sent back for changes" (PRD-008b 008B-AC-009), and `campaign-list-decisions.integration.test.tsx` covers the list.

## Scope

- The campaign page and the list page, their server reads, and a new `apps/web/src/copy/campaign-page-messages.ts`.
- The ad preview and launch button components come from 009d and are reused, not copied.

## Non-Goals

- Appointments, applications, and funded or closed outcomes. They are HighLevel's (OD-A, PRD-002 AC-6) and are not shown.
- Search and filters on the list. The design drops them until there are enough campaigns to need them.
- Pause and Duplicate. They return with launching, in the Meta publish PRD.
- Any lead, contact, or pipeline view.

## Design decisions

### D1. Three results, and words when there is nothing to count

The results card shows only spend, leads sent to HighLevel, and cost per lead, read from the campaign's reporting record. A figure with no live value reads "Not live yet", never 0 and never a dash. When a value exists (from a future live source), the figure shows its source and when it was last updated, as `library/knowledge/private/ux-ui/03-components/metric-source-and-freshness.md` specifies.

### D2. Read-only older versions

An older version opens at a stable address of its own, read-only: no approve, launch, or "Make a new version" control.

## Acceptance criteria

| ID | Criterion | Test |
|---|---|---|
| 009E-AC-001 | The campaign page's header shows the eyebrow "Open House Boost", the address as the `h1`, one line with the open house time and the partner ("with <name> of <brokerage>" or "No Realtor partner"), and the decision-aware status chip. Its actions are "Make a new version" (secondary, 009D-AC-024) and "Launch on Facebook" (primary and disabled, from 009d's function), with that button's one sentence directly under the buttons. | Integration |
| 009E-AC-002 | The results card comes first and spans the content width. It shows Spend, Leads sent to HighLevel, and Cost per lead and no other figure. With no live values, each figure reads "Not live yet", the card carries one "Not live yet" chip and the sentence "This ad isn't running, so there is nothing to count yet. Spend comes from Meta, and leads are counted when they reach HighLevel.", and no digit appears in any figure. A component test with fixture values shows each figure with its source and last-updated time. | Component, Integration (review) |
| 009E-AC-003 | The page shows the ad with 009d's preview component, labelled "Version N", with the budget and run dates. | Component |
| 009E-AC-004 | The approval section says "Approved by <name> on <date>." with the approver's `safe_display_name` read through `actor_id` within the session's location, and "The approval covers version N only. A new version needs its own approval." With no approval it says nobody has approved this version yet. If the name cannot be read it says "An approver" rather than a reference. | Postgres route, Integration |
| 009E-AC-005 | The versions section lists every version of the campaign, newest first, each with its number, decision-aware chip, who saved it or sent it back, and when. An older version opens read-only at its own address (D2). | Postgres route, Integration |
| 009E-AC-006 | "Details for support" is a collapsed `<details>` holding only the version reference and the support reference (user-language contract section 6). | Component |
| 009E-AC-007 | The page renders no contact list, lead table, pipeline, appointment, application, or funded figure, and no link to `/leads`. | Integration, Source scan |
| 009E-AC-008 | The Campaigns list is titled "Campaigns", has one sentence ("Every Open House Boost in your workspace, newest first. Open one to see its ad, approval and results.") and one primary action, "New Open House Boost" to `/marketing/campaigns/new`. At 720 px and wider it is a table with Property (the link), Open house, Realtor partner, Status, and Last change; below 720 px it is cards with the same facts. It has no results column, no search, and no filters. | Integration, Browser (review) |
| 009E-AC-009 | Every status on the list comes from `campaignStateLabel`: a sent-back version reads "Sent back for changes" and a version whose checks found something reads "Needs changes". The existing `campaign-list-decisions.integration.test.tsx` cases still pass and new cases cover every state of 009d D9. | Integration |
| 009E-AC-010 | With no campaigns, the list shows "No campaigns yet", "Your Open House Boosts show here once you start one.", and the primary "New Open House Boost" inside the empty state, so the page still has exactly one primary action. | Integration |
| 009E-AC-011 | When a version's property details came from link import, the campaign page says so in one line naming the site and the date (for example "Property details came from a Zillow link on Oct 1, 2026."). The source address of the page and the receipt never appear. | Integration |

## Files expected to change

- `apps/web/src/app/(authenticated)/marketing/campaigns/[campaignRef]/page.tsx` and `apps/web/src/features/campaigns/components/persisted-campaign-screen.tsx` (rewritten) and their tests
- `apps/web/src/app/(authenticated)/marketing/campaigns/page.tsx` and its tests
- The campaign workspace read (approver name, version history), with Postgres route tests
- `apps/web/src/copy/campaign-page-messages.ts` (new)

## Test plan

- **Component:** results with and without values (009E-AC-002), the ad (003), support details (006).
- **Integration:** header and actions (001), the approval and version sections (004, 005), no CRM (007), the list in every state (008, 009, 010), the import line (011).
- **Postgres (`pnpm test:db`):** the approver's name and version history under tenant context (004, 005).
- **Browser (review):** the table and card layouts across frames (008).

## Security notes

- The approver's name is read from the same location only; a decision whose actor is not in the location shows "An approver".
- Older versions are read under the session's tenant context like the latest one.

## Open questions

- [ ] None blocking.

## Related

- [Design direction, sections 6 and 7](design/00-direction.md)
- [Mockups: campaign page](design/mockups/campaign-detail.html), [campaigns list](design/mockups/campaigns-list.html)
- [PRD-001g](../../in-work/prd-001-operation-automated-lo/prd-001g-campaign-and-portfolio-reporting.md), whose dashboard criteria move here (register rows S-07 and S-08)

## Amendments

None yet.
