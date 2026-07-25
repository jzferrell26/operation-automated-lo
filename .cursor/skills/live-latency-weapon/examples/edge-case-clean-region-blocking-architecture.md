# Edge case: clean region and network checks, architecture is the actual finding

Demonstrates that Steps 1-2 coming back clean does not mean the diagnosis is done, per `guides/01-diagnostic-sequence-overview.md` ("What to do when a step finds nothing").

## Input

> "Our marketing site feels sluggish when you click between pages, but I don't think it's a backend problem, our API responses are all under 100ms."

## Step 1: TTFB and header forensics (`guides/02-ttfb-header-forensics.md`)

```bash
curl -o /dev/null -D - -s -w "\nstarttransfer: %{time_starttransfer}s\ntotal: %{time_total}s\n" https://<live-site>.example.com/
```

`X-Vercel-Id` shows `sfo1::sfo1::...` -- compute and database are already colocated. `time_starttransfer` is low (under 150ms). No region mismatch. This step is filed as "clean," not skipped.

## Step 2: Network storm capture (`guides/03-network-storm-capture.md`)

Browser Network tab shows only 2-3 requests per navigation, all resolving quickly, no `5xx` responses. No storm detected. This step is also filed as "clean."

## Step 3: Round-trip counting (`guides/04-round-trip-counting.md`)

With no storm to investigate, this step confirms a normal, low round-trip count per navigation (1-2 requests, consistent with the operator's own report of sub-100ms API responses). Filed as "no finding," not skipped -- the absence of a problem here is itself useful evidence ruling out Steps 1-3 as the cause.

## Step 4: Architecture assessment (`guides/05-architecture-assessment.md`)

No `loading.tsx` exists for any route. Every navigation is a full server-rendered page load with no static shell and no streaming. Because the API itself IS fast (confirmed by Steps 1-3), the entire perceived-slowness complaint traces to this step alone: the user sees nothing until the ENTIRE page (including any non-critical, slower-to-fetch sections like a related-posts widget) finishes rendering server-side, even though the primary content was ready much earlier.

Live verification via the chunk-observer script (`guides/05-architecture-assessment.md`) confirms a single blocking HTML payload with no intermediate chunks -- streaming is not happening at all.

## Fix menu

| # | Fix | Effort | Expected impact | Verification |
|---|---|---|---|---|
| 1 | Add `loading.tsx` per route + wrap the related-posts widget in its own `<Suspense>` boundary | architectural (but narrowly scoped, since the site has few templates) | Primary content paints immediately; slow secondary sections stream in after | Re-run the chunk-observer script; confirm multiple timestamped chunks instead of one blocking payload |

## Why this example matters

This is the case the diagnostic sequence is explicitly designed to still catch even when the two "cheap" checks (region, storm) find nothing. Skipping Steps 3-4 because Steps 1-2 were clean would have produced a false "we couldn't find anything" report, when the actual, single-cause finding was waiting in Step 4. This is why `guides/01-diagnostic-sequence-overview.md` mandates running the full sequence rather than stopping early on a clean result.

## Guides demonstrated

`guides/01-diagnostic-sequence-overview.md` (the "run all four steps" directive specifically), `guides/05-architecture-assessment.md`.
