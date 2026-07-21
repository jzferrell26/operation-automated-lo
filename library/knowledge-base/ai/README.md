# Operation Automated LO AI Layer

This directory indexes the production AI contract for Operation Automated LO.

## Source of truth

- [PRD-001i](../../requirements/backlog/prd-001-operation-automated-lo/prd-001i-ai-assisted-brand-and-campaign-generation.md) defines product behavior and acceptance.
- [LLM generation and unit economics](../../knowledge/private/ai/llm-generation-and-unit-economics.md) defines model routing, prompt caching, cost, privacy, and commercial policy.
- PRD-001b defines confirmation and sensitive-field ownership.
- PRD-001c defines deterministic preflight, approval, and campaign versioning.

## Product-specific decisions

- The provider seam is neutral and configuration supplies provider and model identifiers. No model identifier is hardcoded in business logic.
- The product-owned provider adapter may use direct provider APIs. This product-specific decision overrides the Guild's generic OpenRouter default until the source document is revised.
- Every provider attempt produces a safe trace and an `AiUsageEvent`.
- Prompt context is tenant-scoped and version-scoped. Stable content precedes variable content. The instruction hierarchy is last within the stable system prefix.
- Model output is untrusted. It cannot approve, publish, select targeting, change budget, or create compliance decisions.
- Live provider calls remain disabled in this Raid. Fixture ports prove local contracts without credentials, customer data, or production traffic.

## Open production gates

- Primary and fallback model promotion requires execution of the same golden corpus against real configured models.
- Provider data terms, retention, subprocessors, secret handling, and prompt boundaries require a production security review.
- Founding-cohort unit economics remain an accepted constraint until measured usage exists.

