# 01 - Diagnostic Sequence Overview

The fixed, ordered checklist every `live-latency-guardian` run follows. Each step is cheap-to-expensive in that order so the highest-impact, lowest-effort finding surfaces first.

## The sequence

1. **TTFB and header forensics** (`guides/02-ttfb-header-forensics.md`) -- one curl call against the live URL. Rules in or out a compute-vs-database region mismatch.
2. **Network-storm capture** (`guides/03-network-storm-capture.md`) -- browser network capture of a real navigation. Counts requests per navigation and flags prefetch/fan-out storms.
3. **Round-trip counting** (`guides/04-round-trip-counting.md`) -- for each request in a suspected storm, determine whether it triggers a real auth/DB round trip server-side. Produces the per-navigation round-trip total.
4. **Architecture assessment** (`guides/05-architecture-assessment.md`) -- determine whether navigation is blocking (full server render) or streaming (instant shell, progressive hydration).
5. **Fix menu and live re-verification** (`guides/06-fix-menu-and-verification.md`) -- rank findings by effort/impact, then re-check live headers/requests after any fix ships.

## Why this order

| Step | Cost | Why it comes here |
|---|---|---|
| 1. TTFB/headers | Seconds, one command | Cheapest possible check; a region mismatch is often the single highest-impact, lowest-effort fix (`research/vercel-region/2026-07-02-vercel-function-region-configuration.md`). Never skip it to jump straight to browser capture. |
| 2. Network storm | Minutes, needs a browser session or owner-assisted HAR | Second cheapest; reveals whether the "feels slow" complaint is actually a "feels slow because of a self-inflicted burst" complaint (`research/nextjs-prefetch/2026-07-02-nextjs-prefetching-guide.md`). |
| 3. Round-trip counting | Requires reading each flagged request's server-side behavior | Explains WHY the storm (if any) matters: a storm of 15 cached, static requests is harmless; a storm of 15 requests each re-validating auth and hitting the database is the actual bug (`research/auth-middleware/2026-07-02-nextjs-middleware-auth-round-trip-cost.md`). |
| 4. Architecture assessment | Requires reading route-level code or framework config | The deepest, most architectural check. Even a app with zero region mismatch and zero storm can still feel slow if every navigation blocks on a full server render instead of streaming a shell (`research/nextjs-streaming/2026-07-02-nextjs-streaming-guide.md`). |
| 5. Fix menu + verification | N/A (synthesis + post-deploy check) | Always last. A fix is not "done" until it is confirmed live, per Hard Rule 3 in `guides/00-principles.md`. |

## What to do when a step finds nothing

Do not stop the sequence early just because Step 1 or Step 2 comes back clean. A live app can simultaneously have zero region mismatch, zero prefetch storm, AND a blocking-SSR architecture problem. Run all four diagnostic steps (1 through 4) before assembling the fix menu, unless the caller has explicitly scoped the request to a single step (e.g. "just check the region header").

## Cross-references

- Full hard-rule justification for this ordering: `guides/00-principles.md`
- Worked example running the full sequence: `examples/happy-path-region-and-prefetch-storm.md`
- Edge case where Steps 1-2 come back clean and Step 4 is the actual finding: `examples/edge-case-clean-region-blocking-architecture.md`
