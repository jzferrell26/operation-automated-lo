# PRD-002h: Campaign Creative Media Packs

> **Status:** Backlog
> **Priority:** P3
> **Effort:** XL (> 3d)

## Goal

Offer bounded image and short-video variations for an approved campaign manifest without building a general-purpose design studio or hiding high model costs inside the base text plan.

## Scope

- Blueprint-specific image variations
- Approved photo expansion, background cleanup, and crop alternatives
- Short campaign video assembled from approved property and brand assets
- Moderation, provenance, generation history, and usage metering
- Human preview and explicit selection before campaign approval

## Acceptance criteria

- Generation accepts only assets the tenant has attested it may use.
- Uploaded and generated media is type-checked, size-limited, decoded and re-encoded, stripped of unnecessary metadata, and stored privately until accepted and approved.
- Every output records source asset IDs, campaign version, model and policy version, prompt hash, provider cost, moderation outcome, and creating actor.
- Generated media is visibly presented as a draft and cannot publish automatically.
- The product blocks deceptive property alterations, invented property features, discriminatory content, impersonation, and unapproved identity changes.
- A user can compare the source and generated output before accepting it into a new campaign draft.
- Failed or rejected generations follow a stated usage-refund rule and cannot create unbounded retries.
- Customer-facing units are media generations or media packs, not raw tokens or provider dollars.
- Provider cost, latency, failure rate, moderation rate, and support rate are reconciled before the feature leaves beta.
- Disabling the add-on preserves approved final artifacts for their documented retention period but prevents new generation.

## Commercial gate

Validate $29 to $99 usage packs and require a target gross margin after retries, moderation, storage, and support. Text-generation allowances cannot subsidize this feature.

## Out of scope

- Free-form design canvas
- General video editor, podcast tool, avatar, headshot studio, or music generator
- Autonomous ad creative rotation
- Property staging that changes material property facts
- Voice cloning

## Related

- [PRD-002 index](./prd-002-operation-automated-lo-add-ons-index.md)
- [AI-assisted brand and campaign generation](../../in-work/prd-001-operation-automated-lo/prd-001i-ai-assisted-brand-and-campaign-generation.md)
