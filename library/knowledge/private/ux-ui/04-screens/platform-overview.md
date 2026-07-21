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

## Edge cases

- New customer with no business activity
- Setup incomplete
- Multiple simultaneous blockers
- All healthy but no active campaign
- Provider degradation
- Funded data not connected
- Permission-restricted viewer
- Agency user with authorized location switching

## Reference canvases

- `Overview.dc.html`
- `Overview Responsive.dc.html`
