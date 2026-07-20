# PRD-002b: Realtor Collaboration Workspace

> **Status:** Backlog
> **Priority:** P1
> **Effort:** L (1-3d)

## Goal

Extend the base single-campaign approval experience into a reusable Realtor workspace that shows only assigned partnerships, campaigns, approved artifacts, and permitted lead outcomes.

## Dependencies

- PRD-001b partner profiles and co-brand permission
- PRD-001c campaign approval
- PRD-001g campaign reporting

## Scope

- Restricted Realtor identity and access
- Assigned campaign history and status
- Approval requests and decisions
- Approved artifact preview and sharing
- Aggregate lead and appointment visibility permitted by location policy
- Invitation, revocation, and access audit

## User stories

- As a Realtor, I can approve and share my assigned campaign without entering the loan officer's CRM.
- As a loan officer, I can reuse a verified partner relationship across campaigns.
- As a location admin, I can revoke a collaborator and prove which campaigns and artifacts the collaborator accessed.

## Acceptance criteria

- A Realtor can access only explicitly assigned partner and campaign records.
- The workspace never exposes other Realtors, unassigned campaigns, GHL contact records, borrower details, opportunity notes, credentials, or platform-support data.
- Invitation links are short-lived, single-purpose, and become invalid after acceptance, expiration, or revocation.
- Approval records identify the campaign version, artifact hashes, actor, role, decision, and timestamp.
- Aggregate lead or appointment counts are disabled by default and require tenant policy plus a minimum-data rule.
- Revocation blocks new sessions immediately and does not erase prior approval or access history.
- A Realtor can download or share only currently approved artifacts.
- The base campaign approval link remains available for tenants that do not purchase team workspace controls.

## Commercial gate

Test whether multi-Realtor history, reusable access, and portfolio controls should be a paid team feature. Do not charge separately for the minimum approval path required to make the base campaign useful.

## Out of scope

- Realtor CRM
- Buyer portal or IDX search
- Brokerage transaction management
- Direct access to HighLevel contacts or opportunities

## Related

- [PRD-002 index](./prd-002-operation-automated-lo-add-ons-index.md)
- [PRD-001b profiles](../prd-001-operation-automated-lo/prd-001b-brand-partner-and-compliance-profile.md)

