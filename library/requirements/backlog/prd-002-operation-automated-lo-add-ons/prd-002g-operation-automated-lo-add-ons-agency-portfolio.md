# PRD-002g: Agency Portfolio and White-Label Distribution

> **Status:** Backlog
> **Priority:** P2
> **Effort:** XL (> 3d)

## Goal

Let an authorized HighLevel agency install, govern, support, and report on entitled mortgage locations without creating implicit cross-location access.

## Scope

- Agency plan and location entitlements
- Bulk install progress and local-setup handoff
- Delegated administration and support roles
- Cross-location exception and activation summaries
- Allowlisted agency branding
- Location-level consent to portfolio inclusion

## Acceptance criteria

- Agency membership never grants access to a location unless the application is installed and the location is explicitly authorized for the agency portfolio.
- Every location retains its own profile versions, approvals, tokens, mappings, entitlements, data retention, and uninstall state.
- Agency totals suppress PII and low-volume detail unless the user has explicit location access.
- Delegated support is time-limited, purpose-bound, revocable, and fully audited.
- Bulk install cannot complete local attestations, Meta selection, GHL routing verification, or synthetic lead tests on behalf of the location administrator.
- White-label controls accept only allowlisted semantic theme and identity fields and cannot inject scripts or arbitrary CSS.
- Agency billing clearly identifies included locations, overage behavior, suspension effects, and location ownership after cancellation.
- Removing a location from an agency portfolio does not uninstall the location or delete its campaign history.

## Commercial gate

Validate a $497 to $997 agency-level range with location tiers. Proceed only when support and delegated-access design preserve target gross margin and do not require hidden operator onboarding.

## Out of scope

- Agency access to every sub-account by default
- Reselling Meta ad spend
- Shared cross-location contact database
- Arbitrary customer code or theme injection
- Replacing HighLevel SaaS mode or rebilling

## Related

- [PRD-002 index](./prd-002-operation-automated-lo-add-ons-index.md)
- [Tenant installation and GHL OAuth](../prd-001-operation-automated-lo/prd-001a-tenant-installation-and-ghl-oauth.md)

