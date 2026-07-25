# PRD-002c: Additional Campaign Blueprint Packs

> **Status:** Backlog
> **Priority:** P1
> **Effort:** XL (> 3d)

## Goal

Sell additional lender-reviewed campaign outcomes that reuse the base profile, artifact compiler, approval, GHL routing, Meta publishing, and reporting infrastructure.

## Candidate packs

1. New Listing Spotlight
2. Realtor Partner Campaign
3. Homebuyer Education Event
4. Buyer Preapproval Campaign

Each blueprint is independently versioned, entitled, tested, and approved. Purchasing a pack does not make every future version automatically available when material compliance or provider changes require renewed review.

## Acceptance criteria

- Every blueprint declares required inputs, profile fields, disclosures, outputs, channels, targeting rules, routing requirements, and completion event.
- A blueprint cannot reuse Open House Boost rules when its claims, audience, consent, or approval requirements differ.
- Every blueprint has deterministic golden manifests, preflight rules, visual fixtures, and lead-path tests.
- Blueprint entitlement is checked server-side before generation, approval, publication, and regeneration.
- A customer can preview what the pack produces before purchase without receiving a usable unwatermarked campaign.
- Template or ruleset changes create a new blueprint version and never alter a prior approved campaign.
- Pack-specific model usage is metered in campaign and regeneration units under the current AI usage policy.
- A pack can be retired for new campaigns while historical campaigns and audit records remain readable.

## Commercial gate

Require at least five paid design partners for a candidate blueprint and lender compliance approval of its golden examples. Candidate packaging is $49 to $149 per pack or inclusion in a higher recurring tier.

## Out of scope

- Open-ended prompt-to-campaign generation
- Customer-authored executable templates
- Automatic creation of new blueprints from competitor assets
- Google or LinkedIn publishing without separate provider research and PRD approval

## Related

- [PRD-002 index](./prd-002-operation-automated-lo-add-ons-index.md)
- [Campaign blueprint and preflight](../../in-work/prd-001-operation-automated-lo/prd-001c-campaign-blueprint-and-preflight.md)

