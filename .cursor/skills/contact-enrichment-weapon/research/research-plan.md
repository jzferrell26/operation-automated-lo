# Research Plan: contact-enrichment-weapon

- **Depth tier:** normal
- **Time window:** 2026-06-29 back to ~2026-01 (6 months); GHL/n8n canonical docs are version-current and treated as evergreen.
- **Page budget target:** ~10-15 triaged unique sources (normal tier: canonical docs + practitioner blogs + 1-2 industry references), filed as 8 per-source notes.
- **Source breadth target:** n8n official node docs (SplitInBatches, Merge, rate-limits), GoHighLevel official API + support docs (custom fields, DATE type), practitioner waterfall-enrichment guides (Unify, BetterContact), idempotency/dedupe practitioner guides (Bitscale, Clay/SyncGTM).

## Tooling note
Firecrawl/Exa were NOT connected for this run. Research conducted with WebSearch + WebFetch, plus the live n8n MCP server available for node mechanics if needed. The official n8n docs HTML 404s the fetcher; the documented `<path>.md?ask=...` query interface was used as the workaround (confirmed working for rate-limits.md). The GoHighLevel API marketplace docs page returned only its intro section via the fetcher (JS-rendered); the raw request-body JSON shape and the exact SINGLE_OPTIONS option-value rule were not extractable and are recorded as gaps routed to gohighlevel-guardian per the Command Brief's lane boundary.

## Initial queries (from session-zero / Command Brief)
- "contact data enrichment waterfall provider fallback pattern 2026"
- "n8n batched loop SplitInBatches enrichment workflow 2026"
- "GoHighLevel custom field DATE SINGLE_OPTIONS write-back typing 2026"
- "data enrichment normalize merge node n8n batchSize 2026"
- "lead enrichment idempotency dedupe re-run safety 2026"

## Expansion queries (authored by loremaster)
### Branch from "data enrichment normalize merge node n8n batchSize 2026"
- "data enrichment normalize merge node n8n batchSize rate limit best practice 2026" (rate-limit + Merge-by-matching-field focus)

### Branch from "GoHighLevel custom field DATE ... 2026"
- "GoHighLevel API date custom field format milliseconds timestamp no Z timezone gotcha" (to ground the brief's DATE no-Z gotcha in a primary source)

## Per-source files written
See index.md for the manifest. Eight per-source notes plus this plan, the index, and the summary.
