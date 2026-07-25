# 02 - TTFB and Header Forensics

Step 1 of the diagnostic sequence. A single curl invocation against the LIVE URL that either rules out or confirms a compute-vs-database region mismatch.

## The canonical command

```bash
curl -o /dev/null -D - -s -w "\nnamelookup: %{time_namelookup}s\nconnect: %{time_connect}s\nappconnect: %{time_appconnect}s\npretransfer: %{time_pretransfer}s\nstarttransfer: %{time_starttransfer}s\ntotal: %{time_total}s\n" https://<live-url>
```

- `-D -` dumps response headers to stdout in the same call, so the region header comes back alongside the timing breakdown in one shot.
- `-o /dev/null` discards the response body (you only need headers and timing).
- `-s` suppresses the progress meter.
- `-w "..."` is curl's write-out format string; the seven `time_*` variables are all in seconds.

Basis: `research/ttfb-curl/2026-07-02-curl-ttfb-header-forensics-syntax.md`.

## Reading the timing breakdown

- `time_starttransfer` is the closest single number to "time to first byte," but it includes the TLS handshake. For a cleaner isolate of server think-time alone, compute `time_starttransfer - time_appconnect`. Basis: "time_starttransfer - time_appconnect is practically the same as Time To First Byte (TTFB) from this client" (`research/ttfb-curl/2026-07-02-curl-ttfb-header-forensics-syntax.md`).
- `time_total` is the full request duration; compare it against `time_starttransfer` to see how much of the total was spent waiting on the server versus downloading the body.
- Run the command 3-5 times and take the median, not a single sample; network jitter can produce a misleading one-off reading.

## Reading the region header

On Vercel deployments, look for `X-Vercel-Id` in the dumped headers. It encodes the region(s) the request passed through and the region the function actually executed in, using short codes (`iad1` = Washington D.C., `sfo1` = San Francisco, `pdx1` = Portland, `cdg1` = Paris, `fra1` = Frankfurt, `lhr1` = London, `bom1` = Mumbai). Basis: `research/vercel-region/2026-07-02-x-vercel-id-header-forensics.md`.

> Note: the "isolate startup time" base64-decode technique referenced in some independent writeups is NOT documented by Vercel itself; treat it as unofficial and do not present it to the operator as a supported diagnostic without independent verification (`research/vercel-region/2026-07-02-x-vercel-id-header-forensics.md`, Annotations).

Other platforms use their own region-identifying headers; this weapon's research pass covered Vercel specifically (matching the worked precedent's stack). See the open question in `research/research-summary.md` about extending coverage to Netlify/Cloudflare/Fly.io before claiming platform-agnostic coverage.

## Diagnosing a mismatch

1. Identify the compute region from the response header (e.g. `iad1`).
2. Identify the database region from the project's own configuration (e.g. a Supabase project console shows its AWS region at creation; it cannot be changed after the fact -- `research/vercel-region/2026-07-02-supabase-vercel-region-mismatch-latency.md`).
3. If compute and database regions are on different coasts or continents, expect roughly 60-80ms of pure network latency PER round trip, and multiple round trips per page load compound this. Basis: "Every DB or auth round trip is ~60-80ms of pure cross-country latency" (`research/internal/2026-07-02-cuantico-sms-assistable-parity-part1-perceived-performance.md`).
4. Because the database region is normally the fixed side (cannot move after creation) and the compute region is normally the flexible side (can be repinned), the fix direction is almost always "move compute to match the database," not the reverse. Basis: `research/vercel-region/2026-07-02-supabase-vercel-region-mismatch-latency.md`.

## The fix

`vercel.json` at the project root:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["pdx1"]
}
```

Pick the region code nearest the database's actual region. Basis: `research/vercel-region/2026-07-02-vercel-function-region-configuration.md`. Per-function overrides are available via the `functions` property if different functions in the same project talk to different data sources in different regions (same source).

> Important nuance: Vercel Routing Middleware always deploys to all regions regardless of the `regions` pin. Pinning `regions` fixes where Functions execute, not where Middleware executes. If auth/session checks happen in Middleware, the region pin alone will not eliminate that specific round trip's regional cost; note this distinction in the report rather than implying one config change fixes everything. Basis: `research/vercel-region/2026-07-02-vercel-function-region-configuration.md`.

## Cross-references

- Live re-verification of this fix after deploy: `guides/06-fix-menu-and-verification.md`
- Worked example applying this exact command and fix: `examples/happy-path-region-and-prefetch-storm.md`
- Full hard-rule context (live-only diagnosis): `guides/00-principles.md`
