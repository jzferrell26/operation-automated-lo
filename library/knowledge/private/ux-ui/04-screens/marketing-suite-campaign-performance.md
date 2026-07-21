# Marketing Suite Campaign Performance

## Purpose

Show campaign-specific advertising and conversion performance inside the Marketing Suite. This screen is not the product root.

## Required composition

- Breadcrumb: Overview, Marketing Suite, Campaigns
- Current campaign summary or current portfolio period
- Theme control
- Launch Ready state
- New campaign action
- Spend, leads, cost per lead, appointments, and funded or closed metrics
- Recent campaigns with versions, approvals, spend, and lead results
- Campaign-specific attention queue
- Meta and HighLevel connection health
- Call to create the next Open House Boost

## Rules

- Spend and cost per lead can receive strong emphasis here.
- Metrics display source and freshness.
- Missing funded data is unavailable, not zero.
- Campaign status includes label and glyph.
- Property images and artifact thumbnails use approved or safe placeholder assets.
- A campaign row links to the campaign record, not directly to an unauthorized provider resource.

## Edge cases

- No campaigns
- Draft-only portfolio
- Campaign awaiting approval
- Live campaign with stale reporting
- Meta disconnected
- Lead-routing failure
- Completed campaigns only
- Viewer without publish permission

## Reference canvases

- `Dashboard.dc.html`
- `Campaigns.dc.html`
- `CampaignDetail.dc.html`
