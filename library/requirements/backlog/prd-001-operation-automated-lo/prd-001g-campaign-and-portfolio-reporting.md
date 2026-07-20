# PRD 001g: Campaign and Portfolio Reporting

## Goal

Give each loan officer a clear campaign-to-loan view and give Cuantico an exception-focused founding-cohort operations view without copying the customer's CRM.

## Scope

- Loan officer campaign dashboard
- Campaign health and connection state
- Funnel metrics from spend through funded or closed outcome
- Blueprint performance
- Internal founding-cohort activation and support metrics
- Agency portfolio view after tenant authorization is defined
- Switchable light, dark, and system dashboard themes

## Acceptance criteria

### Loan officer dashboard

- Each campaign shows current version, status, approvers, publish time, budget, spend, leads, cost per lead, appointments, applications, and funded or closed outcomes when available.
- Metrics display source and last-updated time.
- Missing data is shown as unavailable, not zero.
- Test leads are excluded.
- Users can open the underlying public page, artifact, provider entity, GHL contact, or opportunity only when their role and platform permit it.

### Health and exceptions

- Dashboard surfaces expired or failed tokens, disconnected Meta assets, disapproved ads, stale reporting, failed lead routes, missing mappings, approval age, and reconciliation gaps.
- Every exception has a stable code, tenant-safe explanation, last attempt, correlation ID, and next action.
- Support notifications contain no secrets or unnecessary lead data.

### Blueprint learning

- Aggregate blueprint metrics use normalized, non-PII dimensions.
- Results can be grouped by blueprint version, offer, creative version, geography class, budget band, and landing-page version where sample size is adequate.
- The system does not expose one tenant's identifiable data to another tenant.
- Low-volume groups are suppressed from cross-tenant benchmarks.
- Performance does not automatically change live campaigns.

### Founding cohort

- Internal reporting tracks purchase, install, setup, first generation, first approval, first publish, first lead, first appointment or application, support time, and continuation.
- Cohort metrics support the product gates in PRD 001.
- Support-time entry is simple enough to be used consistently.

### Agency portfolio

- Agency rollup is disabled until an agency installation and role explicitly authorize every included location.
- Agency users cannot access locations where the app is not installed.
- Portfolio totals link to exceptions and campaign detail only for authorized locations.

### Theme switching

- The dashboard exposes Light, Dark, and System choices from a keyboard-accessible control with a visible selected state.
- A first-time user receives the resolved browser or operating-system preference.
- A manual Light or Dark choice persists under a product-specific browser storage key and wins over later system changes.
- Choosing System clears the manual override and follows live `prefers-color-scheme` changes.
- Switching applies immediately without navigation, data refetch, dashboard-state loss, or page reload.
- The resolved theme is applied before first paint with no visible flash of the wrong theme.
- Server rendering and hydration complete without theme-related warnings or content mismatch.
- The browser receives the matching `color-scheme` so native controls, scrollbars, and form fields follow the active mode.
- Every dashboard surface, chart, tooltip, table, modal, loading state, empty state, warning, error, hover, focus, selected, and disabled state uses semantic theme tokens.
- Components do not reference primitive palette tokens or raw color literals.
- Tenant branding overrides only allowlisted semantic tokens and defines valid values for both Light and Dark.
- Text and interactive controls meet WCAG AA contrast in both modes.
- Status and chart meaning are available through labels, shapes, patterns, or icons in addition to color.
- Theme preference contains no PII and cannot be selected for a different user or tenant through a request parameter.
- Theme changes do not modify campaign data, public pages, generated assets, approval state, or reporting calculations.

## Out of scope

- Full business intelligence platform
- Borrower-level loan analytics
- Automated campaign optimization
- Cross-customer leaderboards
- Revenue recognition or accounting
- User-authored themes or arbitrary CSS
- Theme switching for public campaign pages, PDFs, or ad creative

## Verification

- Metric definitions are documented and tested against fixture events.
- Permission tests cover location user, agency admin, platform support, and unauthorized cross-tenant access.
- Reconciliation tests cover missing, duplicated, late, and corrected provider events.
- A quality review traces every visible metric to its source event or current GHL read.
- Theme tests cover first visit, persisted Light, persisted Dark, System, operating-system changes, reload, embedded GHL navigation, standalone access, and tenant switching.
- Visual regression and accessibility checks pass in both modes for every supported dashboard route and state.
- CPU-throttled hard refresh shows no visible flash of the wrong theme.
