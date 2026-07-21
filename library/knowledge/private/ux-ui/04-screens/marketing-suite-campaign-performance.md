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

## Founding-cohort support entry

Support-time entry uses one activity selector, one minutes field with a five-minute step, and one Add local entry action. The location is taken from the authorized screen context and is not re-entered. Validation is inline, the result is announced, and repeated entries follow the same field order. UI Foundation evidence stages the entry locally and makes no network request or saved-record claim.

## Authorized agency portfolio

Agency totals are computed and labeled as authorized-location totals. Each included location names its authorization evidence and may link to its own exception region and campaign detail. A location without explicit authorization renders no totals, protected values, exception link, or campaign link. Portfolio presentation never uses an inaccessible location as a placeholder.

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
