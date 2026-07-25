# Happy path: region mismatch + prefetch storm, both found and fixed

Generalized from the worked precedent in `research/internal/2026-07-02-cuantico-sms-assistable-parity-part1-perceived-performance.md`. Demonstrates `guides/01` through `guides/06` end to end.

## Input

> "Our SMS portal at `https://<live-app>.example.com` feels laggy and sluggish, especially clicking around the dashboard. Lighthouse says we're fine though."

The "Lighthouse says we're fine" detail is the trigger that distinguishes this task from `lighthouse-pagespeed-guardian`'s domain; see `guides/00-principles.md` framing (perceived performance is a distinct failure class from lab scores).

## Step 1: TTFB and header forensics (`guides/02-ttfb-header-forensics.md`)

```bash
curl -o /dev/null -D - -s -w "\nstarttransfer: %{time_starttransfer}s\ntotal: %{time_total}s\n" https://<live-app>.example.com/dashboard
```

Response headers include `X-Vercel-Id: cle1::iad1::...`. The app's database is hosted in `us-west-2` (Oregon). `iad1` is Washington D.C. This is a cross-country region mismatch. `time_starttransfer` comes back elevated, consistent with several serial ~60-80ms round trips.

## Step 2: Network storm capture (`guides/03-network-storm-capture.md`)

Browser Network tab capture of a single sidebar-navigation click shows 15+ requests firing near-simultaneously, most with an `?_rsc=` query parameter (Next.js RSC prefetch signature). One request returns `503`.

## Step 3: Round-trip counting (`guides/04-round-trip-counting.md`)

Of the 15 prefetch requests, all 15 hit the origin (no cache hits) and each independently performs `middleware getUser()` plus a page-level data query. Estimated round-trip cost: 15 x (region-mismatch latency + query cost), which compounds Step 1's finding rather than being an independent problem.

The `503` is investigated separately: it correlates with the app's own fail-closed middleware timeout (5s budget) tripping under the burst of 15 near-simultaneous requests. Per `guides/00-principles.md` Hard Rule 4, this is escalated as a correctness-adjacent finding, not filed as ordinary slowness.

## Step 4: Architecture assessment (`guides/05-architecture-assessment.md`)

No `loading.tsx` files exist for the dashboard routes. Navigation blocks on the full server render. This is filed as the third, architectural-tier finding.

## Fix menu (`guides/06-fix-menu-and-verification.md`)

| # | Fix | Effort | Expected impact | Verification |
|---|---|---|---|---|
| 1 | `"regions": ["pdx1"]` in `vercel.json` | one-line config | 3-10x reduction in server time per request | Re-run Step 1 curl post-deploy; confirm `pdx1` in `X-Vercel-Id` |
| 2 | `prefetch={false}` on dashboard sidebar `<Link>`s | small code change | Eliminates the 15-request storm and its self-DoS 503 | Re-run Step 2 capture post-deploy; confirm request count drop and no 503s |
| 3 | `loading.tsx` skeletons + `<Suspense>` boundaries per route | architectural | Removes blocking-navigation feel independent of raw server time | Re-run Step 4 live-chunk-observer script; confirm progressive chunk arrival |

## Live re-verification

Fix 1 deployed. Re-running Step 1's curl command shows `X-Vercel-Id: sfo1::pdx1::...` -- confirmed live, not just in config. Fix 2 deployed; re-running Step 2's capture shows request count dropped from 15+ to 2-3 (only high-value links still prefetch), and no further 503s observed. Fix 3 scoped as a larger implementation effort and not verified in this pass; flagged in the report as pending.

## Guides demonstrated

`guides/00-principles.md`, `guides/01-diagnostic-sequence-overview.md`, `guides/02-ttfb-header-forensics.md`, `guides/03-network-storm-capture.md`, `guides/04-round-trip-counting.md`, `guides/05-architecture-assessment.md`, `guides/06-fix-menu-and-verification.md`.
