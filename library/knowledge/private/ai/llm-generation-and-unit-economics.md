# LLM Generation and Unit Economics

## Decision

Operation Automated LO must use product-owned API access for production generation. Jonathan's Claude and ChatGPT subscriptions cannot power a multi-tenant application because both vendors bill consumer chat subscriptions separately from API usage.

The founding release should include text generation in the $500 founding offer and the later $197 monthly plan. It should meter every model call internally, but it should not show customers a raw token or AI-credit wallet. Text generation costs are low enough that a customer-facing credit meter would add buying friction before it protects meaningful margin.

Recommendation valid as of July 20, 2026. Re-evaluate model quality, pricing, and data terms before production and at least quarterly.

## Brand Engine template review

The reviewed `brand-engine-template` revision `97a9b970defc` already captures useful brand facts:

- Identity, audience segments, core promise, and messaging pillars
- One or more voice registers with contamination boundaries
- Tone rules, content patterns, banned phrases, and approved replacements
- Named frameworks and their required components
- Confirmed proof points, offers, signature lines, and signoff
- Palette, typography, logo, email block order, sender identity, and CAN-SPAM fields
- Merge-token allowlist and deterministic preflight rules

The SaaS should preserve those concepts, but it should not copy the template's three-file operating model. `BRAND-GUIDE.md`, `brand-voice-pack.md`, and `brand-config.json` overlap, can drift, and are designed for an operator using Claude Chat or Claude Code. The current generator also injects the complete guide and voice pack into every content-piece prompt.

The scalable replacement is one validated, append-only `BrandProfileVersion` with three derived projections:

1. A human-readable brand profile shown in the application.
2. A compact, model-ready `BrandPromptSnapshot` containing only confirmed generation context.
3. A deterministic `BrandRuleSet` for banned phrases, framework fidelity, merge tokens, and other non-model preflight rules.

The prompt snapshot and rule set must share the same source version and content hash. Neither is separately editable.

## Mortgage-specific additions

The loan-officer profile extends the generic Brand Engine fields with:

- Individual and company NMLS display values
- Licensed states and public license display rules
- Lender or branch identity and approved Equal Housing assets
- Approved product, program, proof-point, testimonial, rate, APR, payment, and trigger-term policies
- State, company, campaign, channel, and claim-specific disclosure blocks
- Realtor and brokerage identity plus evidence of co-brand permission
- Consent language versions and approved calls to action
- Prohibited claims, phrases, targeting instructions, and unapproved merge fields

The model can organize and draft a proposed profile from user answers and approved samples. It cannot invent, verify, or approve licenses, disclosures, claims, testimonials, rates, consent language, or partner permission. Those fields remain structured user input with explicit attestation.

## AI-assisted profile flow

The self-onboarding flow should use the model in four bounded steps:

1. Collect structured identity, audience, visual, compliance, routing, and partner fields without an LLM.
2. Accept approved public-facing samples such as emails, posts, landing-page copy, or scripts. Reject borrower, application, credit, income, bank, Social Security, and private CRM data.
3. Extract suggested voice traits, content patterns, signature language, and banned-language candidates into a strict schema.
4. Present a field-by-field review. Only confirmed fields enter the current `BrandProfileVersion` and compiled prompt snapshot.

The user must be able to edit every suggestion. Empty evidence remains empty or `needs_confirmation`; the model never fills a factual gap.

## Model routing

### Initial policy

| Workload | Primary | Cheap path | Fallback | Reason |
| --- | --- | --- | --- | --- |
| Brand sample extraction | Claude Haiku 4.5 | Same | GPT-5.4 mini | Structured extraction is high-volume and reviewable. |
| Brand profile synthesis | Claude Sonnet 4.6 | GPT-5.6 luna after evaluation | GPT-5.6 luna | Voice synthesis is infrequent and quality-sensitive. |
| Final campaign copy | Claude Sonnet 4.6 | GPT-5.6 luna for approved low-risk blueprints after evaluation | GPT-5.6 luna | Brand fidelity matters more than the small token saving. |
| Classification and repair | Claude Haiku 4.5 | GPT-5.4 nano for deterministic candidates | GPT-5.4 mini | These tasks do not need frontier writing quality. |
| Compliance and publish decision | No model | No model | No model | Deterministic rules and named human approval remain authoritative. |

Use a provider-neutral `LlmClient` interface and versioned model policy. Start with direct provider APIs through the existing AI SDK seam. Do not add a gateway to the founding release unless provider failover, cost attribution, or operational controls cannot be met directly. This keeps the early mortgage product's subprocessor list and failure surface smaller.

Every model or prompt change requires a fixed evaluation corpus containing representative loan-officer profiles, campaign briefs, banned claims, incomplete frameworks, and expected structured output. A fallback is eligible only after it passes the same thresholds as the primary model.

## Prompt and caching architecture

The stable prefix must contain the prompt policy, `BrandPromptSnapshot`, blueprint instructions, output schema, and allowed factual inputs. Per-piece variables belong at the end. This exact-prefix shape enables provider prompt caching.

The current Brand Engine loop makes one model call per piece and resends overlapping brand documents each time. Operation Automated LO should instead:

- Compile one compact prompt snapshot per confirmed brand version.
- Remove duplicate prose already represented in structured fields.
- Use an explicit tenant, brand-version, blueprint-version, and model-policy cache key where supported.
- Generate bounded structured JSON, validate it, and retain raw provider output only as long as operationally required.
- Record cache-write, cache-read, uncached-input, and output tokens separately.
- Never cache or send unrelated GHL contact, opportunity, borrower, or conversation data.

Anthropic currently prices five-minute cache writes at 1.25 times base input, one-hour writes at 2 times base input, and cache reads at 0.1 times base input. OpenAI prompt caching is available for prompts of at least 1,024 tokens; GPT-5.6-family cache writes are 1.25 times input and cached reads use the model's cached-input rate.

## Cost model

### Current reference prices

Prices are per one million tokens and were verified from official provider pages on July 20, 2026.

| Model | Input | Cached input | Output |
| --- | ---: | ---: | ---: |
| Claude Sonnet 4.6 | $3.00 | $0.30 | $15.00 |
| Claude Haiku 4.5 | $1.00 | $0.10 | $5.00 |
| GPT-5.6 luna | $1.00 | $0.10 | $6.00 |
| GPT-5.4 mini | $0.75 | $0.075 | $4.50 |

Claude Sonnet 5 has temporary introductory pricing through August 31, 2026. Do not base the product margin on a promotional rate or switch models without an evaluation.

### Brand profile estimate

Conservative assumption: 25,000 total input tokens, 8,000 output tokens, and 30 percent retry or repair headroom across extraction, synthesis, and validation.

| Model path | Base calculation | Cost with headroom |
| --- | --- | ---: |
| Claude Sonnet 4.6 only | `(0.025 x $3) + (0.008 x $15)` | about $0.25 |
| GPT-5.6 luna only | `(0.025 x $1) + (0.008 x $6)` | about $0.10 |
| Claude Haiku 4.5 only | `(0.025 x $1) + (0.008 x $5)` | about $0.09 |

The recommended mixed path should budget $0.15 to $0.30 for initial profile creation. This is a one-time or infrequent cost.

### Twelve-piece campaign estimate

Conservative assumption: 12 model calls, 4,000 input tokens per piece, 7,000 total output tokens, and 25 percent retry or repair headroom.

| Model path | Estimated cost per campaign pack |
| --- | ---: |
| Claude Sonnet 4.6, no effective cache | about $0.31 |
| Claude Sonnet 4.6, cache-optimized shared prefix | about $0.20 |
| GPT-5.6 luna, no effective cache | about $0.11 |
| GPT-5.6 luna, cache-optimized shared prefix | about $0.08 |

The safe planning range is $0.20 to $0.50 per campaign text pack. This range leaves room for validation, repair, provider variance, and a limited number of regenerations.

### Location and cohort economics

- One active location producing 10 campaign packs per month should consume about $2 to $5 in text-model cost.
- A heavy location producing 30 packs plus frequent regenerations should remain under a $15 monthly text-model guardrail.
- Twenty founding locations producing 10 packs per month for the included 90 days should cost roughly $150 to $230 in total text-model spend, including profile creation and operational headroom.
- That founding-cohort estimate is about 1.5 to 2.3 percent of the $10,000 founding revenue.

These estimates exclude image or video generation, audio transcription, licensed property data, storage, rendering compute, email or SMS, and client-funded Meta spend. Server-rendered pages, PDFs, QR codes, and template-based creative should not consume LLM credits.

## Customer pricing and credits

### Founding release

- Include the AI-assisted brand profile and campaign text generation in the $500 founding offer and its 90-day period.
- Do not charge founders per token, expose provider model names as a pricing choice, or require their API keys.
- Display plan usage as campaigns and regenerations, not tokens.
- Collect 90 days of actual usage before enabling paid overages.

### Recurring plan

The proposed $197 monthly plan should include:

- One current brand profile with assisted refreshes when material business facts change
- 10 complete campaign text packs per month
- 30 individual asset regenerations per month
- Internal fair-use and abuse limits

Unused included usage should not create a cash-like stored-value balance in the first release.

If paid overages are justified by telemetry, sell campaign capacity rather than AI tokens. A provisional add-on is 10 additional campaign packs for $29. Confirm demand and support impact before enabling it. Image, video, large-scale database content, or other materially higher-cost generation must use a separate metered unit and PRD.

## Internal usage and budget controls

Every request writes an `AiUsageEvent` with:

- Location, user, feature, campaign, brand version, and correlation ID
- Provider, model, model-policy version, prompt version, and request ID
- Cache-write, cache-read, uncached-input, output, and total tokens
- Estimated provider cost, charged plan unit, latency, retry count, and outcome
- Safe failure classification without raw secrets or unnecessary prompt content

Initial controls:

- Alert at $5 forecasted monthly text-model cost per location.
- Route eligible extraction and repair work to the cheap tier before final copy quality is reduced.
- Require a platform budget exception above $15 per location per month.
- Apply per-user and per-location rate limits, idempotency, maximum input size, maximum output tokens, and bounded retries.
- Record failed and provider-rejected requests without charging a customer plan unit unless a usable generation was returned.

## Privacy and compliance boundaries

- Product API keys remain server-only and are never supplied by a customer or exposed to the embedded page.
- Brand samples are tenant-isolated, encrypted at rest, and deleted according to the tenant retention policy after profile compilation unless the user elects to retain them.
- Prompts must contain public marketing content and the minimum approved brand facts. They must not contain borrower, application, credit, income, bank, Social Security, or private CRM information.
- Model output is untrusted content. It passes schema validation, deterministic brand and compliance preflight, malware and URL controls where relevant, and named human approval.
- Provider inputs and outputs are not enabled for training or feedback sharing.
- Anthropic's standard API retention is currently up to 30 days unless another agreement applies. OpenAI's API abuse-monitoring logs can also retain customer content for up to 30 days by default. Provider choice and final configuration require a security and data-processing review before production.

## Sources

- [Anthropic API pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Anthropic prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Anthropic commercial API retention](https://privacy.anthropic.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data)
- [Anthropic API billing is separate from Claude subscriptions](https://support.anthropic.com/en/articles/9876003-i-subscribe-to-a-paid-claude-ai-plan-why-do-i-have-to-pay-separately-for-api-usage-on-console)
- [OpenAI API pricing](https://developers.openai.com/api/docs/pricing)
- [OpenAI prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- [OpenAI API data controls](https://platform.openai.com/docs/models/default-usage-policies-by-endpoint)
- [OpenAI API billing is separate from ChatGPT](https://help.openai.com/en/articles/9039756-billing-settings-in-chatgpt-vs-platform)
