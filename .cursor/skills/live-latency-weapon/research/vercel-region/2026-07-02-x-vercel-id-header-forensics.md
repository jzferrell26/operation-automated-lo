---
source_url: https://http.dev/x-vercel-id
retrieved_on: 2026-07-02
source_type: blog
authority: practitioner
relevance: critical
topic: header-forensics
weapon: live-latency-weapon
---

# X-Vercel-Id header forensics (search-aggregated finding)

## Summary
WebSearch-aggregated finding (Firecrawl/Exa unavailable; this note synthesizes a WebSearch results block rather than a single scraped page -- see degradation note in research-summary.md) on the `X-Vercel-Id` response header. The header carries a request identifier assigned by Vercel's edge network encoding the regions a request passed through and the region a function actually executed in, for both Edge and Serverless functions. This is the exact header the cuantico-sms precedent read to confirm the `iad1` compute region before the fix, and to confirm `pdx1` after the fix.

## Key quotations / statistics
- "This header contains a list of Vercel regions your request hit, as well as the region the function was executed in (for both Edge and Serverless)."
- Vercel uses short region identifiers: `iad1` (Ashburn/Washington D.C.), `sfo1` (San Francisco), `cdg1` (Paris), `lhr1` (London), `bom1` (Mumbai), `fra1` (Frankfurt), `pdx1` (Portland).
- Format: "a short alphanumeric node identifier, a Unix timestamp in milliseconds, and a hex-encoded hash, separated by hyphens."
- A February 2026 independent reverse-engineering writeup found the header's timing internals are base64-encoded and can reveal isolate startup time (~2.3ms), suggesting the header carries more diagnostic payload than just the region code for those willing to decode it further.
- The header also functions as loop-prevention: "When Vercel sees its own X-Vercel-Id on an incoming request, the platform detects a routing loop and stops the request."

## Annotations for weapon-forge
- This is the primary evidence for the Guardian's "read `X-Vercel-Id` to find the compute region" diagnostic step. Pair with the `curl -w` timing note (see `ttfb-curl/`) for the full "curl + header forensics" combined command the Guardian's guide should teach.
- Flag for weapon-forge: because this note synthesizes a WebSearch results summary rather than a single authoritative scrape (tooling degradation), the guide author should treat the region-code list and loop-prevention behavior as reasonably solid (corroborated across multiple search-result snippets) but verify the base64-timing-decode claim against Vercel's official docs before presenting it as a supported/documented feature, since it originates from an independent (non-Vercel) reverse-engineering blog post, not an official source.
- No contradiction with the official `regions` config doc in this folder.
