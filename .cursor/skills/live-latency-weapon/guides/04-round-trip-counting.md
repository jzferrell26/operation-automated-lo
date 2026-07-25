# 04 - Round-Trip Counting

Step 3 of the diagnostic sequence. For each request flagged in the network-storm capture, determine whether it triggers a real auth and/or database round trip server-side, and produce a per-navigation total.

## Why counting matters more than the storm itself

A storm of 15 requests that resolve from cache or a CDN edge is largely harmless. A storm of 15 requests that EACH independently re-validate auth and hit the database is the actual bug, because it multiplies the real backend cost by the storm's request count. The count, not the raw request number, is what explains "why does clicking feel slow." Basis: `research/internal/2026-07-02-cuantico-sms-assistable-parity-part1-perceived-performance.md` ("portal pages make several serial round trips (middleware getUser, getAuthContext, page queries)").

## What to check per request

For each request identified in Step 2 (`guides/03-network-storm-capture.md`):

1. Is the response served from a CDN/edge cache (check for `age`, `x-vercel-cache: HIT`, or similar caching headers), or does it hit the origin server?
2. If it hits the origin, does the route perform an auth check (session validation, `getUser()`-equivalent)? Middleware-layer auth checks are common and, per current 2026 guidance, INTENTIONALLY present twice in a well-architected app: once in middleware (edge, before routing) and once again in the Data Access Layer (defense-in-depth against middleware bypass). Two round trips per protected request is expected behavior, not automatically a bug. Basis: `research/auth-middleware/2026-07-02-nextjs-middleware-auth-round-trip-cost.md`.
3. Does the route perform a database query beyond the auth check? Even a well-optimized query typically costs 10-15ms; a poorly optimized one can cost 50-200ms. Use this as an order-of-magnitude reference when estimating how much of the measured total is attributable to the query itself versus network/region latency. Basis: same source.

## Producing the round-trip total

Report the total distinctly from the raw request count:

```
Navigation: clicking "Settings" in the sidebar
Total requests fired: 17
Requests served from cache: 2
Requests hitting origin with an auth check: 15
Requests additionally hitting the database: 15
Estimated auth-only round-trip cost: 15 x (60-80ms cross-region, if Step 1 found a mismatch)
```

This distinguishes "17 requests fired" (a raw count anyone can see in DevTools) from "15 of those actually cost real backend time" (the number that explains the perceived slowness and that a fix should target).

## What NOT to flag as a bug

Do not report "the app does two auth checks per request" as a finding on its own. The middleware-plus-DAL double-check pattern is current best practice for defense-in-depth (`research/auth-middleware/2026-07-02-nextjs-middleware-auth-round-trip-cost.md`). Only flag round-trip volume as a problem when:

- It is multiplied by an unrelated prefetch storm (Step 2's finding), or
- The auth check runs on routes that do not need it (e.g. a guard present on a public landing page "perhaps in a navbar," per the same source), or
- The total exceeds what a single real user action should require (a click should not trigger 15 independent server-side auth validations).

## Optimization levers worth citing in the report (not implementing directly)

React's `cache()` function can collapse N identical auth checks within a single render pass into one actual round trip. This is a code-level optimization; note it in the fix menu but hand off implementation specifics to the relevant language Guardian if the fix requires broader auth-architecture changes (see `guides/07-routing-boundaries.md`).

## Cross-references

- The storm this step measures against: `guides/03-network-storm-capture.md`
- The self-DoS urgency flag when round-trip volume trips a defensive timeout: `guides/00-principles.md` (Hard Rule 4)
- Worked example: `examples/happy-path-region-and-prefetch-storm.md`
