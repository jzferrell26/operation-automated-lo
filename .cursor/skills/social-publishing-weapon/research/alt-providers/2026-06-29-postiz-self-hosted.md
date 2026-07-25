---
source_url: https://docs.postiz.com/public-api/introduction
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: high
topic: postiz-self-hosted
weapon: social-publishing-weapon
---

# Postiz: self-hosted open-source social scheduler (API + rate limits)

## Summary
Postiz (gitroomhq/postiz-app) is the leading open-source, self-hosted social scheduler, the "Buffer/Hootsuite replacement." The arsenal weapon lists Postiz for self-hosted/data-residency but marks it "not yet runbooked." This source supplies the real API rate-limit facts and CORRECTS the Zernio marketing claim that Postiz is "unusable in production at 30 req/hour."

## Key quotations / statistics
- "The API has a rate limit of 90 requests per hour (100 for the cloud) that applies to ONLY the create post endpoint. You can schedule multiple posts in a single request to maximize throughput."
- "The rate limit is a single global value for the whole instance - it doesn't tier by subscription plan."
- SELF-HOSTED OVERRIDE: "self-hosters can adjust the per-hour limit with the `API_LIMIT` env var."
- Uses Redis for caching and rate limiting.
- Platforms: X, Bluesky, Mastodon, Discord, and others.
- Public API docs at docs.postiz.com/public-api/introduction. Repo: github.com/gitroomhq/postiz-app. Positioned as "agentic" (AI scheduling).

## Annotations for weapon-forge
- CORRECTION TO THE ZERNIO KNOCK: Zernio's blog claims Postiz is "unusable in production due to a 30 req/hour rate limit." The actual documented limit is 90/hour (100 cloud), applies ONLY to create-post, supports batch scheduling in one request, AND is fully configurable via `API_LIMIT` on self-hosted. weapon-forge MUST NOT repeat the "30 req/hour unusable" claim; the self-hosted limit is whatever the operator sets. This is a clear case of corroborating a vendor claim and finding it overstated.
- SELECTION-TABLE INPUT: Postiz is the right call for a self-hosted / data-residency requirement (the arsenal's row is correct), and it is genuinely production-viable when self-hosted because the rate limit is operator-controlled. It is now runbookable (the arsenal's "not yet runbooked" can be upgraded).
- The batch-schedule-in-one-request capability is relevant to the idempotency/manifest design: fewer create calls = fewer dedupe windows.
- PUBLISH-GATE: confirm Postiz's draft vs scheduled states in the public API before trusting; carry the same drafts-only caution.
