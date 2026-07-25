---
name: live-latency-weapon
description: Wall-clock perceived-performance diagnosis arsenal for live-latency-guardian. Use when a deployed web app "feels slow" or "laggy" despite passing Lighthouse/PageSpeed lab scores, or when diagnosing why navigation feels sluggish on a production or staging deployment. Runs a fixed diagnostic sequence against the LIVE URL: curl TTFB and response-header forensics (compute-vs-database region mismatch), browser network capture (RSC prefetch storms and similar request fan-out), per-request auth/DB round-trip counting, and blocking-vs-streaming architecture assessment, ending in a ranked fix menu re-verified against live headers and requests after deploy. Trigger on "the site feels slow", "diagnose our production latency", "why does navigation feel sluggish", "our Lighthouse score is good but it still feels laggy", "check for a region mismatch", "is our app streaming or blocking", or "live-latency-guardian go". Do NOT use for Lighthouse/PageSpeed lab-score optimization or CI performance budgets (lighthouse-pagespeed-guardian), executing or verifying a deploy (release-deploy-guardian), CDN/CI topology (devops-guardian), or database query tuning (db-guardian).
---

# live-latency-weapon

The arsenal for `live-latency-guardian`. It diagnoses why a deployed web app feels slow when lab scores say it should not, by running a fixed, ordered sequence of live checks and producing a ranked, effort/impact-scored fix menu that is re-verified against production after any fix ships.

This weapon is generalized from a real hand-run diagnosis: the cuantico-sms portal versus its own "laggy and sluggish" complaint, 2026-07-02. Throughout the guides, that diagnosis is the worked instance, never a template to copy verbatim. The checklist, commands, and directives are stack-agnostic where the research supports it, and explicitly scoped to Next.js/Vercel/Supabase where it does not (see the open questions in `research/research-summary.md`).

## First action when this weapon is loaded

Read these in order:

1. `guides/00-principles.md` -- the seven hard rules (live-only diagnosis, fixed order, live re-verification, self-DoS escalation, route-don't-absorb, owner-assisted fallback, no em dashes) with their justifications.
2. `guides/01-diagnostic-sequence-overview.md` -- the full ordered checklist every diagnosis run follows, and why the order matters.

Then walk the four diagnostic guides (`02` through `05`) in order for a full run, or jump to the specific guide the caller has scoped the request to (e.g. "just check the region header" -> `guides/02-ttfb-header-forensics.md` alone). Always finish with `guides/06-fix-menu-and-verification.md` to produce the ranked report, and consult `guides/07-routing-boundaries.md` before recommending any fix outside this Guardian's own scope.

## The seven hard rules (full text and justification in `guides/00-principles.md`)

1. **Always diagnose and verify against the LIVE deployment, never localhost.** Region mismatches and real network round trips do not reproduce locally.
2. **Fixed diagnostic order: TTFB/headers -> network storm -> round-trip counting -> architecture.** Cheapest, highest-impact check first.
3. **Never declare a fix verified without re-checking live headers or live request counts after deploy.** Config correctness is not evidence; the live artifact is.
4. **Distinguish ordinary slowness from a self-DoSing storm.** A prefetch burst that trips the app's own fail-closed timeout into 5xx errors is a correctness bug, escalate it.
5. **Route, do not absorb.** Lab scores to `lighthouse-pagespeed-guardian`, deploy mechanics to `release-deploy-guardian`, CDN/CI topology to `devops-guardian`, query tuning to `db-guardian`.
6. **Owner-assisted capture fallback.** When browser network-capture access is unavailable, request a sanitized HAR export or screenshots rather than skipping the step.
7. **No em dashes, in any report or prose output, ever.**

## The pipeline this weapon runs

```
scope target (live URL, symptom, prior lab scores if any)
  -> TTFB + header forensics (region mismatch check)
  -> network storm capture (prefetch/fan-out check)
  -> round-trip counting (auth/DB cost per navigation)
  -> architecture assessment (blocking vs streaming)
  -> fix menu, ranked by effort/impact
  -> live re-verification of each shipped fix
```

Run all four diagnostic steps even if the first ones come back clean; see `guides/01-diagnostic-sequence-overview.md` and the edge-case example for why stopping early on a clean result produces false negatives.

## Folder layout

```text
live-latency-weapon/
+- SKILL.md                              (this file)
+- README.md                             (one-page human overview)
+- guides/
|  +- 00-principles.md                   (the seven hard rules + justifications)
|  +- 01-diagnostic-sequence-overview.md (the ordered checklist and why the order matters)
|  +- 02-ttfb-header-forensics.md        (curl command, X-Vercel-Id reading, region-pin fix)
|  +- 03-network-storm-capture.md        (browser capture, RSC prefetch storm, prefetch={false} fix)
|  +- 04-round-trip-counting.md          (auth/DB round-trip counting methodology)
|  +- 05-architecture-assessment.md      (blocking vs streaming, loading.tsx/Suspense, live verification)
|  +- 06-fix-menu-and-verification.md    (ranking rule, report shape, live re-verification per fix type)
|  +- 07-routing-boundaries.md           (the four named routing boundaries)
+- examples/
|  +- happy-path-region-and-prefetch-storm.md            (full sequence, two findings, both fixed and verified)
|  +- edge-case-clean-region-blocking-architecture.md    (Steps 1-2 clean, Step 4 is the actual finding)
+- templates/
|  +- diagnosis-report-template.md       (the full report shape, per-fix verification fields)
+- reports/
|  +- README.md                          (how past diagnosis reports accumulate)
+- research/                             (populated by loremaster; DO NOT MODIFY)
```

## Routing boundaries (hard rule 5, expanded in `guides/07-routing-boundaries.md`)

| If the task is... | Route to |
|---|---|
| Lighthouse/PageSpeed lab-score optimization, CI performance budgets | `lighthouse-pagespeed-guardian` |
| Executing or verifying a deploy | `release-deploy-guardian` |
| CDN configuration, CI/CD pipeline topology | `devops-guardian` |
| Database query tuning (EXPLAIN, indexing) | `db-guardian` |
| Diagnose why a live app feels slow and produce a ranked fix menu | THIS weapon |

## Open questions carried from research (needs human decision before next refresh)

> TODO: These survived the literature sweep (`research/research-summary.md`) and are flagged here, not resolved by invention.
> 1. Should the weapon standardize on an automated browser-capture tool (a Chrome DevTools Protocol MCP) for Step 2, or keep manual DevTools + HAR export as the sole documented baseline? (`guides/03-network-storm-capture.md`)
> 2. This weapon's research covered Vercel + Next.js + Supabase region/header forensics deeply but did not research equivalent mechanics for Netlify, Cloudflare, or Fly.io. Platform-agnostic claims should not be made until a follow-on research pass covers those platforms. (`guides/02-ttfb-header-forensics.md`)
> 3. This research pass ran with Firecrawl and Exa unavailable (WebSearch/WebFetch substituted at normal depth, per the orchestrator's explicit one-time authorization). Several external research notes synthesize WebSearch result blocks rather than single-source Firecrawl scrapes; treat those files' confidence as slightly lower than the three full-WebFetch sources until a future refresh with Firecrawl/Exa available. (`research/research-summary.md`)

## Pairing

| Role | Artifact |
|---|---|
| This weapon | `ai-tools/skills/live-latency-weapon/` |
| Paired Guardian | `ai-tools/agents/live-latency-guardian.md` |
| Command Brief | `ai-tools/command-briefs/live-latency-guardian-command-brief.md` |
| Lab-score work (routed) | `lighthouse-pagespeed-guardian` |
| Deploy mechanics (routed) | `release-deploy-guardian` |
| CDN/CI topology (routed) | `devops-guardian` |
| DB query tuning (routed) | `db-guardian` |

---

*Forged by `weapon-forge` from `live-latency-guardian-command-brief.md` and `research/`. Part of the Guild AI Tools Factory by [Mario Aldayuz a.k.a @thenotoriousllama](https://github.com/thenotoriousllama).*
