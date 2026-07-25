# 00 - Principles

The seven hard rules that govern every `live-latency-guardian` diagnosis. Read this guide first; the rest of the weapon assumes you have internalized these principles.

## The seven hard rules

1. **Always diagnose and verify against the LIVE deployment, never localhost or a dev server.** Region mismatches, edge-function routing, and real network round trips do not reproduce locally. The entire class of bug this Guardian exists to catch is invisible on localhost. Basis: the whole diagnostic sequence in `research/internal/2026-07-02-cuantico-sms-assistable-parity-part1-perceived-performance.md` was only findable by inspecting the deployed `X-Vercel-Id` header, which does not exist on `localhost:3000`.

2. **Follow the fixed diagnostic order: TTFB/header forensics first, then network-storm capture, then round-trip counting, then architecture assessment.** A single curl call (cheap, seconds) should rule out or confirm the highest-impact, lowest-effort fix (region pinning) before spending time on browser capture and architectural analysis. See `guides/01-diagnostic-sequence-overview.md` for the full ordered checklist.

3. **Never declare a fix verified without re-checking live headers or live request counts after deploy.** This is the corrected-findings discipline from the precedent: the region-pin fix was only confirmed live by observing `pdx1` appear in the `X-Vercel-Id` header post-deploy (`research/internal/2026-07-02-cuantico-sms-assistable-parity-part1-perceived-performance.md`), not by trusting the `vercel.json` config change alone. See `guides/06-fix-menu-and-verification.md`.

4. **Distinguish ordinary slowness from a request storm severe enough to trip the app's own defensive systems.** A storm that self-DoSes the app via its own fail-closed middleware timeout (producing 503s) is a correctness bug, not just a perceived-performance annoyance, and must be flagged with higher urgency in the report. Basis: "Observed one prefetch 503ing: our own middleware fail-closed 5s timeout tripping under the self-inflicted burst" (`research/internal/2026-07-02-cuantico-sms-assistable-parity-part1-perceived-performance.md`).

5. **Route, do not absorb.** Lighthouse/PageSpeed lab scores and CI budgets go to `lighthouse-pagespeed-guardian`. Deploy execution and deploy verification go to `release-deploy-guardian`. CDN/CI topology decisions go to `devops-guardian`. Database query tuning (EXPLAIN work, indexing) goes to `db-guardian`. This Guardian diagnoses perceived performance across compute, network, and architecture; it does not own the lab-score tooling, the deploy mechanics, the infra topology, or the query-plan tuning that a fix might ultimately require. See `guides/07-routing-boundaries.md`.

6. **When browser network-capture access is unavailable, request owner-assisted capture rather than fabricating or skipping the step.** Screenshots of the Network tab, a HAR export, or curl output the operator runs themselves are all acceptable substitutes. An unverified claim about request-storm severity is worse than an explicitly flagged coverage gap. Basis: `research/browser-capture/2026-07-02-chrome-devtools-network-har-waterfall.md` documents the sanitized-HAR-export path as the safe handoff mechanism.

7. **No em dashes in any report or prose output, ever.**

## Why "live, not local" is the load-bearing rule

Every other rule in this weapon is downstream of Rule 1. The three root causes in the worked precedent are all live-deployment-only phenomena:

- Region mismatch is invisible locally because a local dev server and a local (or tunneled) database are typically on the same machine or the same low-latency network; the cross-country round trip only exists once both sides are deployed to their real regions.
- The RSC prefetch storm exists in local dev too, but the self-DoS 503 failure mode depends on real network latency and a real middleware timeout budget interacting with real concurrent request volume; it is far less likely to trip locally where round trips are near-instant.
- Blocking-vs-streaming architecture differences are visible locally in relative terms (you can feel a blocking page take longer than a streaming one even in dev) but the ABSOLUTE perceived-performance gap that matters to a real user is a function of real network latency, which only exists in production.

Every diagnostic action in `guides/02` through `05` therefore begins with "against the live URL," not "in your local dev environment."

## Cross-references

- Full ordered diagnostic checklist: `guides/01-diagnostic-sequence-overview.md`
- The worked precedent underlying all seven rules: `research/internal/2026-07-02-cuantico-sms-assistable-parity-part1-perceived-performance.md`
- Worked example applying these rules end to end: `examples/happy-path-region-and-prefetch-storm.md`
