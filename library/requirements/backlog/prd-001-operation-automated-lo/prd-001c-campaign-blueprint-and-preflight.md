# PRD 001c: Campaign Blueprint and Preflight

## Goal

Create an immutable Open House Boost campaign version from tenant profiles and property inputs, then block approval until deterministic preflight succeeds.

## Scope

- Versioned campaign and blueprint model
- Property and open-house input
- Listing and asset-rights attestation
- Render manifest compilation
- Brand, compliance, consent, targeting, and data-quality preflight
- Approval state machine
- Material-change detection

## Open House Boost inputs

- Property address and approved public facts
- Property description and photos
- Open-house date, time, timezone, and hosting Realtor
- Loan officer and Realtor profile versions
- Call to action and calendar
- Meta budget, dates, geography, page, form, pixel, and ad account selections
- Campaign tag, pipeline, owner, and optional workflow
- Permission and disclosure attestations

## Acceptance criteria

### Versioning

- Campaign input is immutable after a version is created.
- Blueprint, brand, compliance, partner, and routing version IDs are recorded in the campaign version.
- A canonical manifest hash changes when any material field changes.
- A material edit creates a new version and invalidates approvals for prior content.
- Prior versions and decisions remain readable.

### Preflight

- Preflight is deterministic, side-effect free, and separately testable.
- Blocking findings include a stable rule code, human description, affected field or artifact, and remediation.
- Warnings do not block but must appear in the approval summary.
- Rule sets cover required fields, image quality, dates, brand rules, banned phrases, merge tokens, disclosures, claim policy, consent text, partner permission, property permission, Meta Special Ad Category, targeting allowlist, budget bounds, and GHL routing completeness.
- Rate, APR, payment, or program terms are blocked in the first blueprint unless an explicitly approved tenant rule enables them.
- Custom audiences, ZIP targeting, protected targeting dimensions, Google, and LinkedIn are blocked.
- A preflight result records all input version IDs and the ruleset version.

### Approval

- Only an authorized approver can approve.
- Approval displays exact page, PDF, creative, copy, disclosure, targeting, budget, dates, form, and destination versions.
- Approval records actor, role, timestamp, IP-derived audit metadata, campaign version, and decision.
- Required Realtor and lender approvals are policy-driven.
- Approval links are short-lived, single-purpose, and cannot expose other tenant data.
- Publish checks approval freshness again instead of trusting UI state.

### State machine

- Invalid transitions fail closed.
- Generation, preflight, approval, publishing, live, pause, resume, completion, and archive events are append-only.
- Retrying a failed operation does not create a new campaign version.

## Out of scope

- Model-generated legal disclosures
- Automatic legal or lender approval
- More than one campaign blueprint
- Autonomous optimization

## Verification

- Golden tests cover valid and invalid manifests.
- Mutation tests prove each material field invalidates approval.
- Authorization tests prove creator, approver, publisher, and viewer boundaries.
- Lender compliance approves the rule inventory and Open House Boost golden examples.
