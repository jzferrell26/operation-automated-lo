# Platform Overview

## Purpose

Provide a cross-system operating view for the loan officer. This is the root application screen and must remain useful when no ad campaign is active.

## Required composition

### Header

- Personalized business-level heading
- Current HighLevel location
- Last system verification
- Light, Dark, and System control
- Launch Ready or Attention Required status
- Authorized Create action

The header identifies the validated active role when it affects available actions. Restricted viewers see no protected values and receive the required role plus next safe action for blocked work.

### Health strip

- HighLevel
- Routing
- Meta
- Brand version
- Team and approvals
- Freshness

### Quick actions

- Create marketing campaign
- Build property site
- Generate PDF and creative
- Add Realtor partner
- Review leads
- Open HighLevel pipeline
- Resolve highest-priority connection issue

### Business pulse

- New leads
- Appointments
- Opportunities
- Applications
- Funded or closed outcome
- Active partners
- Active campaigns
- Pending approvals

External metrics show source and freshness. Unavailable values remain unavailable.

Synthetic leads are labeled and excluded from Business Pulse and production routing. Metrics distinguish `current`, `stale`, `partial`, `unavailable`, `uncertain`, and `permission_restricted` without color-only meaning.

### Active work

Mix campaign, partner, property-site, AI-confirmation, and system events. Do not limit the list to Meta campaigns.

### Attention queue

Prioritize connection, approval, routing, brand, compliance, billing, and usage blockers across modules.

### Recent activity

Provide module filters for Marketing, Partners, Leads, Brand, and System.

### Workspace status

Show each module as active, attention required, setup required, plan restricted, or planned. Do not present future modules as working tools.

## Responsive priority

At 1180px, compact navigation and preserve Business Pulse, Active Work, and Attention. At 390px, show readiness, two highest-value quick actions, the four most useful metrics, and the attention queue before lower-priority content.

The 1180px Business Pulse priority is New leads, Appointments, Opportunities, Applications, then Funded or closed outcome, Active partners, Active campaigns, and Pending approvals. At 390px, render New leads, Appointments, Opportunities, and Pending approvals before lower-priority metrics. The two mobile quick actions are the highest safe authorized action and Resolve highest-priority connection issue when attention exists; otherwise use Create marketing campaign and Review leads.

## Edge cases

- New customer with no business activity
- Setup incomplete
- Multiple simultaneous blockers
- All healthy but no active campaign
- Provider degradation
- Funded data not connected
- Permission-restricted viewer
- Agency user with authorized location switching

For loading, empty, error, permission-restricted, and degraded states, use `AsyncState` variants. Degraded provider writes show the last safe known state, reconciliation progress, and a correlation ID, and block duplicate writes. Empty new-customer screens show setup or creation actions only when authorized.

## Interaction quality

The overview uses `Button`, `SafeAction`, `ThemeSegmentedControl`, `Metric`, and `AsyncState`, not local equivalents. Focus must remain visible around sticky header and action regions. Use only named motion buckets, and render reduced-motion transitions immediately or opacity-only.

## Reference canvases

- `Overview.dc.html`
- `Overview Responsive.dc.html`
