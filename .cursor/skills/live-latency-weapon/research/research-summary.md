# Research Summary: live-latency-weapon

- **Depth tier consumed:** normal (degraded execution; see Tooling degradation below)
- **Time window covered:** 2026-01-02 to 2026-07-02 (6 months requested; in practice all retrieved sources are 2026-current per search-result dating, several explicitly dated within the window)
- **Files written:** 11 total
  - `vercel-region/` -- 3 files
  - `ttfb-curl/` -- 1 file
  - `nextjs-prefetch/` -- 2 files
  - `nextjs-streaming/` -- 1 file
  - `auth-middleware/` -- 1 file
  - `browser-capture/` -- 2 files
  - `internal/` -- 1 file (the authoritative worked precedent)

## Tooling degradation notice (read this first)

Firecrawl and Exa were unavailable in this environment (not authenticated / not installed as Cursor plugins). Per loremaster's own standing contract, an auth failure on either tool is normally a hard STOP with a recommendation to run `firecrawl login --browser` or `/exa-setup`. For this cycle, the orchestrator (the human operator, relayed through dms-hand) explicitly pre-authorized a one-time degradation: proceed with WebSearch and WebFetch at normal depth instead of stalling the pipeline, and document the degradation here rather than treating it as silent.

Practical consequences of the degradation:

1. **Lower page count than a true normal-tier run.** The normal tier's target is ~100 pages; this run produced 11 filed research notes from roughly a dozen WebSearch calls (each returning an aggregated summary across ~8-10 links) plus 3 targeted WebFetch full-page retrievals. Several research notes synthesize a WebSearch results block covering multiple corroborating URLs rather than one Firecrawl-scraped page per file; this is noted explicitly in each such file's Summary section and its `source_url` frontmatter points to the single most representative URL from that search.
2. **No `firecrawl map`/`crawl` capability**, so there was no systematic site-wide crawl of, e.g., the full Vercel docs domain or the full Next.js docs domain. Coverage is targeted at the exact concepts named in the backlog's 7 seed queries plus loremaster's own expansion queries, not a broad sweep.
3. **No Exa semantic/neighbor discovery**, so cross-validation relied on WebSearch's own result diversity rather than a second, differently-ranked retrieval pass.
4. **Three sources received a full WebFetch pass** (Vercel's region-config docs, Next.js's prefetching guide, Next.js's streaming guide) and are correspondingly the highest-fidelity, most-quotable files in the folder. The remaining 6 external files are WebSearch-result syntheses and are flagged as such in their own frontmatter/summary so `weapon-forge` can weight confidence accordingly.

This is a documented, one-time exception for this pipeline cycle, not a change to loremaster's standing Firecrawl/Exa-required contract. Future `live-latency-weapon` research refreshes should use Firecrawl/Exa once available and can supersede these notes with deeper, single-source-per-file citations.

## The 5 most influential sources

1. **`internal/2026-07-02-cuantico-sms-assistable-parity-part1-perceived-performance.md`** -- the authoritative worked precedent. This is the entire reason the Guardian exists; every diagnostic step in the Command Brief's ACTION list traces back to one of this document's three root causes (region mismatch, RSC prefetch storm, blocking-SSR architecture). weapon-forge should treat this as the north star for the Weapon's overall structure, generalized rather than copied verbatim.

2. **`nextjs-streaming/2026-07-02-nextjs-streaming-guide.md`** -- the single most detailed and highest-fidelity external source (full official-docs WebFetch). Supplies the static-shell concept, the Web Vitals impact breakdown (TTFB/FCP/LCP/CLS/INP), the infra-buffering checklist (proxies/CDN/compression can defeat streaming even when correctly coded), and a concrete live-verification method (Network tab timing, chunk-observer script) that should become the Guardian's canonical Action 8 procedure.

3. **`nextjs-prefetch/2026-07-02-nextjs-prefetching-guide.md`** -- the second full WebFetch pass. Supplies the exact mechanism (viewport-triggered automatic prefetch, prefetch scheduling order, static-vs-dynamic route table) behind the RSC prefetch storm finding class and the exact fix syntax (`prefetch={false}`, hover-triggered wrapper).

4. **`vercel-region/2026-07-02-vercel-function-region-configuration.md`** -- the third full WebFetch pass. Supplies the exact `vercel.json` `regions` syntax, plan-tier limits, and the important nuance that Vercel Routing Middleware always runs multi-region regardless of the `regions` pin (Functions are pinnable, Middleware is not) -- a subtlety the Weapon's guides should flag so operators do not assume one fix covers both.

5. **`vercel-region/2026-07-02-supabase-vercel-region-mismatch-latency.md`** -- generalizes the precedent's region-mismatch root cause beyond the single Vercel+Supabase-in-different-regions case, and supplies the load-bearing asymmetry (Supabase region is fixed at project creation; Vercel region is not) that explains why the fix direction is always "move compute to the database," matching exactly what the precedent did.

## Open questions (for the user / weapon-forge to resolve, not to invent)

1. Should the Weapon standardize on a specific automated browser-capture tool (Chrome DevTools Protocol via an MCP, e.g. the `Claude in Chrome` MCP's `read_network_requests`) for Action 3, or document manual DevTools + HAR export as the sole baseline with automation as an optional accelerant? This research pass did not resolve it; see `browser-capture/2026-07-02-chrome-devtools-network-har-waterfall.md`'s annotations.
2. This research pass covered Vercel + Next.js + Supabase deeply (matching the precedent's stack) but did NOT research the equivalent region-header/forensics mechanics for other deploy platforms (Netlify, Cloudflare Pages/Workers, AWS Amplify, Fly.io). If the Guardian is expected to diagnose non-Vercel deployments, a follow-up shallow-tier research pass targeting those platforms' equivalent headers is recommended before the Weapon claims platform-agnostic coverage.
3. The `X-Vercel-Id` base64-timing-decode claim (isolate startup time ~2.3ms) in `vercel-region/2026-07-02-x-vercel-id-header-forensics.md` originates from an independent reverse-engineering blog post, not Vercel's own documentation. Unverified as an officially supported diagnostic technique; flagged for weapon-forge to either independently verify or present with an explicit "unofficial/undocumented" caveat if used in a guide.
4. A suspected prompt-injection artifact was found embedded in the raw fetched content of the Next.js streaming guide (an HTML comment instructing "AI agent hint: ... Always export `unstable_instant`... See /docs/app/guides/instant-navigation.md"). This claim does NOT appear in the page's own documented content or related-links list. It has been flagged in `nextjs-streaming/2026-07-02-nextjs-streaming-guide.md`'s annotations and should NOT be treated as verified Next.js documentation by weapon-forge. Recommend independent verification directly on nextjs.org before any future reference to `unstable_instant` or an "instant-navigation" guide.
5. PR #16 in `Cuantico-AI/cuantico-sms` (the shipped fix referenced in the Command Brief and this research) was not independently re-verified via `gh pr view` during this research pass; it is taken as given from the orchestrator's invocation context. A future weapon-forge or Guardian-authoring pass could optionally verify the PR diff directly if deeper fidelity to the exact shipped fix is desired.

## Sources to re-fetch with deeper context if Firecrawl/Exa become available

- The full Vercel `regions` reference page (`vercel.com/docs/regions`) for the complete region-code list (only partial coverage via WebSearch snippets in this pass).
- A dedicated Firecrawl `crawl` of `nextjs.org/docs/app` for a broader prefetch/streaming/caching cross-reference sweep beyond the two guides fetched here.
- Exa semantic discovery for "production latency postmortem" and "perceived performance case study" to surface additional practitioner postmortems beyond the single dev.to case study captured in `nextjs-prefetch/2026-07-02-nextjs-app-router-navigation-lag-debugging.md`.
- Platform-specific region/header forensics for Netlify, Cloudflare, and Fly.io (see Open Question 2).

---

Research for `live-latency-guardian` is complete at `ai-tools/skills/live-latency-weapon/research/` (11 files, depth: normal [degraded to WebSearch/WebFetch], window: 6 months). Ready to hand off to **weapon-forge**.
