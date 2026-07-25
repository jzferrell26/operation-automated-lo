# Research Plan: live-latency-weapon

- **Depth tier:** normal
- **Time window:** 2026-01-02 back to 2026-07-02 (6 months)
- **Page budget target:** ~30-40 pages (degraded from the ~100-page normal-tier target; see tooling note below)
- **Source breadth target:** official platform docs (Vercel, Next.js, Supabase), practitioner blogs, GitHub READMEs/issues, curl/HTTP reference material

## Tooling degradation notice

Firecrawl and Exa are unavailable in this environment (not authenticated / not installed). Per loremaster's own failure-mode contract ("Firecrawl or Exa returns auth errors... Stop... Do not silently fall back to other tools (the research will not be auditable)"), a hard stop would normally apply. However, the orchestrator (dms-hand's caller) explicitly pre-authorized degrading to WebSearch/WebFetch at normal depth for this run, with the degradation documented here and in `research-summary.md` rather than stalling the pipeline. This is a documented exception for this cycle only, not a change to loremaster's standing contract.

Practical effect: page budget and source breadth are lower than a Firecrawl/Exa-powered normal-tier run would achieve (WebSearch returns snippet-level results; WebFetch retrieves one URL at a time with no crawl/map capability). Coverage favors authoritative primary docs over broad long-tail practitioner content.

## Initial queries (from `session-zero` backlog entry 11)

- "Vercel X-Vercel-Id header region function edge diagnosis 2026"
- "Next.js RSC prefetch storm Link component dynamic render fan-out 2026"
- "curl TTFB header forensics production latency debugging 2026"
- "Next.js streaming SSR loading.tsx Suspense vs blocking render 2026"
- "compute database region mismatch latency Vercel Supabase 2026"
- "middleware auth getUser round trip caching Next.js production 2026"
- "perceived performance production site feels slow diagnosis methodology 2026"

## Expansion queries (authored by loremaster, inline run)

### Branch from "Vercel X-Vercel-Id header region function edge diagnosis 2026"
- "Vercel function region configuration vercel.json regions 2026"
- "Vercel X-Vercel-Id header format decode region"

### Branch from "Next.js RSC prefetch storm Link component dynamic render fan-out 2026"
- "Next.js Link prefetch false disable App Router 2026"
- "Next.js App Router prefetch cost dynamic routes"

### Branch from "curl TTFB header forensics production latency debugging 2026"
- "curl -w time_starttransfer time_total TTFB measurement syntax"

### Branch from "Next.js streaming SSR loading.tsx Suspense vs blocking render 2026"
- "Next.js loading.tsx instant loading states streaming"
- "Next.js Suspense boundary data fetching perceived performance"

### Branch from "compute database region mismatch latency Vercel Supabase 2026"
- "Supabase project region selection latency Vercel function colocated"

### Branch from "middleware auth getUser round trip caching Next.js production 2026"
- "Next.js middleware performance auth session round trip cost"

## Internal prior art (read directly, no web fetch needed)

- `C:\Users\jzfer\cuantico-sms\library\knowledge-base\ux-ui\assistable-parity-gap-analysis.md` Part 1 (the worked precedent: region mismatch, RSC prefetch storm, blocking-SSR architecture).
