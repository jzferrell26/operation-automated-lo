---
source_url: https://blog.logrocket.com/curl-measure-rtt/
retrieved_on: 2026-07-02
source_type: blog
authority: practitioner
relevance: critical
topic: ttfb-measurement
weapon: live-latency-weapon
---

# curl -w timing syntax for TTFB / round-trip measurement (search-aggregated finding)

## Summary
WebSearch-aggregated finding (Firecrawl/Exa unavailable; synthesizes a WebSearch results block covering multiple corroborating sources including makandracards.com, LogRocket, and Cloudflare's own blog on connection timing) on curl's `-w`/`--write-out` flag for capturing TTFB and full request-timing breakdowns against a live URL. This is the exact tool and syntax class used as Action 1 in the Guardian's diagnostic sequence.

## Key quotations / statistics
- Canonical command: `curl -o /dev/null -w "Connect: %{time_connect} TTFB: %{time_starttransfer} Total time: %{time_total} \n" https://example.com/`
- `time_starttransfer`: "The time, in seconds, it took from the start until the first byte was just about to be transferred. This includes time_pretransfer and also the time the server needed to calculate the result."
- `time_total`: "The total time, in seconds, that the full operation lasted."
- TTFB calculation refinement: "time_starttransfer - time_appconnect is practically the same as Time To First Byte (TTFB) from this client" -- i.e. subtracting the TLS handshake time from `time_starttransfer` isolates pure server-think-time from connection setup.
- Full timing variable list available via `-w`: `time_namelookup`, `time_connect`, `time_appconnect`, `time_pretransfer`, `time_redirect`, `time_starttransfer`, `time_total` (all in seconds).

## Annotations for weapon-forge
- This is the primary citation for the Guardian's exact curl invocation. The Weapon's guide should present the full breakdown command (all seven timing variables plus `-D -` to also dump response headers in the same call, so `X-Vercel-Id` and timing come back together) as the canonical single-command diagnostic.
- Recommend the guide teach the `time_starttransfer - time_appconnect` refinement explicitly, since raw `time_starttransfer` conflates TLS handshake cost with server think-time and could mislead an operator into blaming the backend for what is actually a slow TLS handshake.
- No contradiction with other sources; this is standard, stable curl behavior not specific to any 2026 change.
