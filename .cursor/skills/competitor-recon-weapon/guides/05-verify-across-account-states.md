# 05 - Verify across account states

The discipline that prevents false negatives, and the single most important quality gate in a teardown. Hard Rule 4.

## The problem

A feature that looks absent in one account state may be conditionally rendered by another. Recording "competitor lacks X" when X is merely gated is a false negative that misleads every downstream consumer (the PRD author, the strategy verdict).

## The canonical cautionary tale: the Assistable billing tab

The billing surface was initially recorded as ABSENT from the client-facing settings. Then:

1. A second look on a RE-BILLED test account showed a sixth settings tab (Billing) that a non-rebilled account did not have. Finding corrected: billing is present, conditionally.
2. The competitor's own public docs (`platform/subaccount-wallet.mdx`) then refined it further: the tab's visibility gate is sub-account MEMBERSHIP, not a bespoke rebilling flag.

The finding self-corrected twice: absent -> present-on-rebilled -> gated-by-membership. Recording the first read as final would have produced a wrong gap.

Basis: `research/internal/2026-07-02-assistable-parity-gap-analysis.md` (sections 2.10 through 2.12).

## The account-state matrix

Before recording a gap, check the states relevant to the product. Common axes:

- Plan tier: trial vs paid vs enterprise
- Data state: empty vs populated (many surfaces only render with data)
- Role: admin vs member vs owner
- Tenancy: single-location vs multi-location / agency vs sub-account
- Billing state: billed vs re-billed vs comped
- Feature flags: any flag names found in the client bundle (guide 04)

Keep one storageState per state (guide 02) so re-capture is deterministic.

## The verification-state field

Every finding in the gap table (guide 07) carries a `verification-state`:

- `confirmed` -- verified across the relevant account states
- `single-state` -- observed in one state only, not yet cross-checked (treat as provisional)
- `docs-resolved` -- ambiguity resolved by the competitor's public docs
- `corrected` -- a prior reading was revised (record the arc, as the billing-tab example does)
- `not-inspected` -- explicitly out of this pass (coverage honesty, not a confirmed absence)

## Triangulation resolves ambiguity

When live UI and another channel disagree, the public docs (guide 03) usually explain the gate. Use archaeology to resolve, not just to corroborate.

## Example

- `examples/edge-case-owner-assisted-and-corrected-finding.md` walks the billing-tab correction explicitly.
