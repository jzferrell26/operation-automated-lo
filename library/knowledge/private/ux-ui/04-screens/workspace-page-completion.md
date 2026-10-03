# Workspace page completion

Governing brief: sections 5, 7, 14, 15, 16 and 18 of `../00-design-brief.md`.

## September 23, 2026 scope

Continue the approved dashboard aesthetic with useful secondary pages. Keep the existing demo boundary, theme tokens, shared form controls, explicit campaign approval, and connection requirements. This work does not activate providers or implement the future product portfolio.

> **Superseded in part on 2026-10-03 by PRD-009** (S-108, which completes S-66; OD-D, D-6): the dated notes below name three pages that are removed. The other pages in the list are removed too: Ads, Email and SMS, Templates, and Property sites and creative were Marketing Suite sub-pages that now redirect (009f D1), and Explore was the Marketplace page, which redirects to Home. The Verification paragraph's report exports, routing simulation, and "existing onboarding journey" lapse with them. The list is kept as history.

- Ads shows saved campaign readiness, planned budgets, status filters and direct review links. Unavailable delivery and spend must never appear as zero performance.
- Email and SMS provides editable, locally saved copy for invitations, buyer follow-up and partner updates. Copy and save actions report their actual result. No recipient selection, sending or scheduling is available.
- Automations explains and simulates the existing lead-routing preferences using a clearly labeled sample lead. The simulation has no provider side effects. _(Superseded on 2026-10-01 by PRD-009 (S-66; OD-D): the Automations page is removed.)_
- Templates gives Open House Boost a detailed package preview and an actionable entry to the existing campaign builder. Future templates remain labeled as planned.
- Explore links to the available product workflows. Future products are informational only.
- Property sites and creative distinguish example assets from saved campaigns awaiting generation. Search and format filters must have useful empty states.
- Reports exports the selected view and reflects current saved data. CSV cells neutralize spreadsheet formula prefixes, including after leading whitespace. _(Superseded on 2026-10-01 by PRD-009 (S-66; OD-D): the Reports page is removed.)_
- Lead lists and pipeline show stage totals, useful filters, saved-stage feedback and a next-step detail view. _(Superseded on 2026-10-01 by PRD-009 (S-66; OD-A, OD-D): the Leads and Pipeline pages are removed.)_

## Layout and interaction

Use one primary task per page, subordinate context alongside it and a clear next action. Retain semantic surface, border, text, status and spacing tokens. Panels stack on narrow content widths. Toolbars wrap, data regions scroll within their own boundaries, dialogs remain keyboard accessible, and controls meet the existing 44px mobile target rule. Respect both themes and reduced motion.

## Verification

Exercise route loading, search/filter recovery, draft save/reload, clipboard failure, report exports, routing simulation and campaign navigation. Review screenshots at desktop and mobile widths, run accessibility scans in both themes and preserve the existing onboarding journey.
