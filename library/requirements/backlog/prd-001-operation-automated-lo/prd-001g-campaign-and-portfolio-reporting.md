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

## Out of scope

- Full business intelligence platform
- Borrower-level loan analytics
- Automated campaign optimization
- Cross-customer leaderboards
- Revenue recognition or accounting

## Verification

- Metric definitions are documented and tested against fixture events.
- Permission tests cover location user, agency admin, platform support, and unauthorized cross-tenant access.
- Reconciliation tests cover missing, duplicated, late, and corrected provider events.
- A quality review traces every visible metric to its source event or current GHL read.
