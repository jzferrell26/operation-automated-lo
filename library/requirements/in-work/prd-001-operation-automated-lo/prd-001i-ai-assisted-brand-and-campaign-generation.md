# PRD 001i: AI-Assisted Brand and Campaign Generation

## Goal

Replace operator-driven Claude and ChatGPT work with a production-safe, product-funded LLM layer that helps a loan officer build a confirmed brand profile and generate brand-faithful campaign copy without making legal, compliance, or publish decisions.

## Dependencies

- 001a tenant installation and GHL OAuth
- 001b brand, partner, compliance, and routing profiles
- 001c campaign blueprint and preflight

## Scope

- AI-assisted brand-sample extraction and profile drafting
- Versioned model policy, prompt policy, and brand prompt snapshot
- Provider-neutral model client with evaluated primary, cheap, and fallback routes
- Structured campaign-copy generation and bounded repair
- Prompt caching and compact context compilation
- Per-location usage, cost, quota, and budget metering
- Customer-facing campaign and regeneration allowances
- Model evaluation corpus and promotion gate

## User stories

- As a loan officer, I can supply approved marketing samples and receive a proposed voice profile without manually writing a brand guide.
- As a loan officer, I can review and correct every proposed field before it becomes current.
- As a campaign creator, I can generate a complete text pack grounded in the exact confirmed brand, partner, property, compliance, and blueprint versions.
- As a location admin, I can see included campaign and regeneration usage without understanding tokens or model pricing.
- As a platform operator, I can attribute every model dollar to a location, feature, campaign, and model policy.

## Product contracts

### Brand assistance

- Structured identity, license, lender, disclosure, partner, routing, and consent fields are collected outside the LLM.
- Approved marketing samples may be used only for voice, style, pattern, phrasing, framework, and banned-language suggestions.
- The upload flow warns against and scans for borrower, application, credit, income, bank, Social Security, and private CRM data.
- Extracted fields retain source references and confidence or `needs_confirmation` state.
- A user explicitly confirms or edits each proposed field before a new `BrandProfileVersion` is current.
- The LLM cannot mark a license, disclosure, proof point, claim, rate, consent statement, partner permission, or profile section as approved.

### Prompt snapshot

- One immutable `BrandPromptSnapshot` and one deterministic `BrandRuleSet` are compiled from the same confirmed brand version.
- The prompt snapshot is compact and contains no duplicate narrative and structured representations of the same fact.
- The snapshot records brand version, compiler version, model-policy version, content hash, created time, and creating actor.
- A material brand edit creates a new snapshot. Prior campaign versions retain their original snapshot reference.
- Tenant and version-specific cache keys prevent cross-location context reuse.

### Campaign generation

- Each generation is grounded in frozen brand, compliance, partner, property, blueprint, and campaign-input versions.
- The provider returns strict structured output with hard input, output, and retry limits.
- Invalid structured output can enter one bounded repair path. Repeated failure returns a clear error and consumes no additional customer plan unit.
- A successful generation creates an immutable draft version. Regeneration creates a new draft version and never mutates approved content.
- Model output remains untrusted until deterministic preflight and required human approval succeed.
- Legal disclosures, compliance decisions, targeting eligibility, approval, publish, live-budget changes, and destructive operations never rely on a model result.

### Model policy and failover

- The initial policy uses a high-quality model for profile synthesis and final campaign copy, and a cheap model for extraction, classification, and repair.
- Provider and model names are configuration, not hardcoded business logic.
- A fallback is disabled until it passes the same golden evaluation corpus and structured-output thresholds as the primary.
- Failover is idempotent, bounded, and recorded. It cannot generate a second accepted draft after the first provider succeeded.
- Model or prompt changes are versioned and do not alter prior campaign output or approvals.

### Usage and commercial policy

- Claude and ChatGPT consumer subscriptions are never used as application credentials.
- Operation Automated LO owns production API billing and credentials.
- Every provider request records an `AiUsageEvent` with tenant, actor, feature, campaign, model, prompt version, token categories, estimated cost, latency, retry, and outcome.
- The founding $500 offer includes profile assistance and text generation for its 90-day period without paid overages.
- The proposed $197 monthly plan includes 10 campaign text packs and 30 individual asset regenerations per month.
- Customer-facing usage is described in campaign and regeneration units, not raw tokens or dollars.
- No unused cash-like credit balance, transfer, refund value, or cross-location sharing exists in the first release.
- A platform exception is required above $15 forecasted monthly text-model cost for one location.
- Image, video, audio, database-reactivation, and licensed-data generation are excluded from this text-generation allowance.

## Acceptance criteria

- A prepared user can complete an AI-assisted profile from approved samples during self-onboarding without Cuantico operating Claude or ChatGPT on the user's behalf.
- No AI suggestion becomes current without explicit user confirmation.
- Factual and compliance-sensitive fields cannot be inferred into an approved state.
- A campaign generation references exact immutable input and prompt versions.
- Static prompt content precedes variable content and produces measurable cache-read usage for multi-piece packs when the provider supports it.
- Cross-location cache-key and prompt-isolation tests pass.
- The primary and fallback pass the golden brand-fidelity, structured-output, banned-claim, framework, and no-invented-facts evaluation suite.
- Every accepted output passes deterministic preflight before approval is available.
- Provider timeout, malformed output, rate limit, refusal, and uncertain-response retries are bounded, idempotent, visible, and safely auditable.
- The customer can see remaining campaign packs and regenerations, while the platform can reconcile provider invoices to internal usage events.
- Budget and rate-limit tests prove one location cannot create unbounded provider spend.
- Logs, traces, analytics, and support screens contain no provider secret, raw borrower data, or unnecessary full prompt.
- A production security review approves provider data terms, retention, subprocessors, secret handling, and prompt-content boundaries.
- The measured founding-cohort text-model cost remains under $5 per active location per month at normal usage or triggers a pricing and routing review.

## Verification

- Use fixed brand samples and campaign briefs to compare primary, cheap, and fallback models before promotion.
- Reconcile a test month's `AiUsageEvent` totals with provider usage exports within an agreed tolerance.
- Load test location and user quotas, retry bounds, cache attribution, and concurrency controls.
- Run prompt-injection tests against uploaded samples and prove the output cannot alter system rules, compliance rules, provider routing, tools, or publish state.
- Run a founding-cohort usage review after 30, 60, and 90 days before enabling paid overages.

## Out of scope

- Model-generated or model-approved legal disclosures
- Autonomous compliance, approval, publishing, targeting, or budget decisions
- Customer-supplied API keys in the founding release
- Fine-tuning on customer content
- Generic chat assistant
- Generative images, video, voice, or database-reactivation content
- Cash-like credits, cross-location credit transfers, or ad-spend wallets

## Related

- [LLM generation and unit economics](../../../knowledge/private/ai/llm-generation-and-unit-economics.md)
- [Brand, partner, compliance, and routing profile](prd-001b-brand-partner-and-compliance-profile.md)
- [Campaign blueprint and preflight](prd-001c-campaign-blueprint-and-preflight.md)
