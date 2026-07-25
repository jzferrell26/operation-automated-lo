---
source_url: C:\Users\jzfer\cuantico-sms\library\knowledge-base\ux-ui\assistable-parity-gap-analysis.md
retrieved_on: 2026-07-02
source_type: internal-doc
authority: official
relevance: critical
topic: worked-precedent
weapon: live-latency-weapon
---

# cuantico-sms Assistable parity gap analysis, Part 1: Perceived performance (AUTHORITATIVE worked precedent)

## Summary
The internal document that is the entire reason live-latency-guardian exists. Ground truth: live side-by-side inspection of the createassistants.com (Assistable) portal vs the deployed cuantico-sms portal (agents.cuantico.us), captured 2026-07-02. Part 1 documents three verified root causes for the "laggy and sluggish" perceived-performance complaint, in impact order, each with a fix and (for 1.1) live verification of the fix.

## Key quotations / statistics
- Root cause 1.1 (CRITICAL, one-line fix), region mismatch: "`X-Vercel-Id: cle1::iad1::...` on dynamic routes: all server rendering and API execution happens in Washington DC while the database and Supabase Auth live in Oregon. Every DB or auth round trip is ~60-80ms of pure cross-country latency, and portal pages make several serial round trips (middleware getUser, getAuthContext, page queries). Fix: `"regions": ["pdx1"]` in vercel.json (Portland, adjacent to us-west-2). Expected: 3-10x reduction in server time per request."
- Root cause 1.2 (CRITICAL, small fix), RSC prefetch storm: "Network capture: a single portal page load fires 15+ dynamic RSC prefetch requests (every sidebar link plus per-row links, each `?_rsc=` request a full serverless render doing auth + queries). Observed one prefetch 503ing: our own middleware fail-closed 5s timeout tripping under the self-inflicted burst. Fix: `prefetch={false}` on portal/dashboard sidebar `<Link>`s (or hover-triggered prefetch), keep prefetch only on high-value targets."
- Root cause 1.3 (ARCHITECTURAL, raid scope), blocking SSR: "Assistable renders an instant skeleton shell for every surface (conversation list placeholders, metric card placeholders) and hydrates data client-side (batched tRPC + React Query). Our portal blocks the whole navigation on the server render, so every click 'hangs' for the full server time. Fix pattern: `loading.tsx` skeletons per portal route (streaming SSR gives the shell immediately), plus `<Suspense>` boundaries around data-heavy sections. This is what makes Assistable FEEL fast even when data is slow."
- The document explicitly frames PRD-040 as having "hit its written ACs but the shipped portal does not look or feel like Assistable" -- the canonical example of a feature passing acceptance criteria while still failing the perceived-performance bar, which is exactly the gap this Guardian is scoped to catch (lab-score-passing apps that still feel slow).
- The shipped fix landed in `Cuantico-AI/cuantico-sms` PR #16 (per the orchestrator's invocation context for this pipeline run; not independently re-verified via `gh` in this research pass, but treated as authoritative per the Command Brief).

## Annotations for weapon-forge
- This document IS the worked example the Weapon's guides should generalize from. Do not copy its exact section numbering (1.1/1.2/1.3) verbatim as the Weapon's structure; instead extract the underlying pattern (a fixed ordered sequence: header/TTFB forensics -> network storm capture -> round-trip counting -> architecture assessment) as the reusable diagnostic checklist, consistent with the Command Brief's IDEAS section.
- The "middleware getUser, getAuthContext, page queries" serial round-trip phrase is the direct evidence basis for Action 4 (per-request round-trip counting) and should be cross-referenced against `auth-middleware/2026-07-02-nextjs-middleware-auth-round-trip-cost.md` in this folder for the general (non-Supabase-specific) round-trip-counting methodology.
- The "fail-closed middleware timeout tripping into 503s" detail is the direct evidence basis for Critical Directive 4 (distinguish ordinary slowness from a self-DoSing storm) -- this is the single most important non-obvious finding in the whole precedent and should be highlighted prominently in the Weapon's guides, likely as its own named pattern ("self-inflicted 503 storm" or similar).
- This is internal, first-party, ground-truth evidence and takes priority over any external source in this folder if a conflict were to arise (none currently exists).
