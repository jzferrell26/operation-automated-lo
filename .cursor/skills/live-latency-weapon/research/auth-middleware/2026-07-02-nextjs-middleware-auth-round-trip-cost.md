---
source_url: https://medium.com/@jamesleeht/how-to-use-supabase-auth-in-next-js-without-extra-latency-and-make-pages-load-faster-33a045d15c78
retrieved_on: 2026-07-02
source_type: blog
authority: practitioner
relevance: high
topic: auth-round-trip
weapon: live-latency-weapon
---

# Next.js middleware auth round-trip cost (search-aggregated finding)

## Summary
WebSearch-aggregated finding (Firecrawl/Exa unavailable) on the latency cost of calling `getUser()` (or equivalent session-validation calls) inside Next.js middleware. Directly informs Action 4 (per-request auth/DB round-trip counting), since every protected-route navigation typically pays this cost on top of any data-fetching round trips, and it compounds with the prefetch-storm finding (a storm of N prefetch requests each independently re-validating auth multiplies the round-trip cost by N).

## Key quotations / statistics
- "The suggested middleware makes a call to the getUser() method, which performs a network request to the authentication server, so the returned value is authentic and can be used to base authorization rules on. This creates extra round-trip time (RTT) on every guarded page."
- Explicit warning about scope creep: "if you have the guard on your landing page for some reason (perhaps in a navbar), this can affect your loading time and SEO on public pages" -- i.e. an auth check that runs broader than necessary (e.g. on every route including public ones) multiplies the round-trip tax unnecessarily.
- Database-backed session cost range: "Every authenticated request needs session validation, adding significant latency, with even well-optimized database queries adding 10-15ms of latency, with poorly optimized queries reaching 50-200ms." Useful as an order-of-magnitude reference the Guardian's report can cite when estimating how much of a measured round-trip total is attributable to auth specifically vs other queries.
- Architectural guidance for 2026: "Request arrives and middleware executes on the edge before any route processing begins -- this is your first opportunity to check authentication. Before loading any sensitive data, verify authentication again at the Data Access Layer -- this second check protects against middleware bypass vulnerabilities and ensures defense-in-depth." This two-layer pattern means TWO auth round trips can be present per request by design (middleware check + DAL check), which the Guardian's round-trip counting step should account for rather than treat as an anomaly.
- Optimization lever: "Use React's cache function to avoid unnecessary duplicate requests to the database during a render pass" -- request-scoped memoization that collapses N identical auth checks within one render into 1 actual round trip.

## Annotations for weapon-forge
- This source supports Action 4's counting methodology: an operator seeing "2 auth round trips per page" should not assume it is a bug (defense-in-depth is intentional per current 2026 guidance); the Guardian's report should distinguish "expected per-request auth cost" from "auth cost multiplied by an unrelated prefetch storm," since only the latter is the diagnosable, fixable bug.
- Flag for weapon-forge: this is a general auth-architecture note, not this Guardian's domain to fix (auth-guardian owns auth provider/session design decisions). The Weapon's guide should cite this source only for the round-trip COUNTING methodology, and explicitly route any auth-architecture redesign recommendation to auth-guardian, consistent with the Command Brief's routing boundaries (which name db-guardian, lighthouse-pagespeed-guardian, release-deploy-guardian, and devops-guardian, but implicitly also exclude auth-architecture ownership).
