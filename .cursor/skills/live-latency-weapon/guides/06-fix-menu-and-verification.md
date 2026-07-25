# 06 - Fix Menu and Live Re-Verification

Step 5 of the diagnostic sequence. Ranks findings from Steps 1-4 into an effort/impact-ordered fix menu, then re-verifies each shipped fix against the LIVE deployment.

## Ranking rule

Order the fix menu from cheapest-and-highest-impact to most-expensive-and-architectural:

1. **One-line config fixes** (region pinning via `vercel.json`). Cheapest, often highest single-fix impact. Basis: the worked precedent expected "3-10x reduction in server time per request" from this single change (`research/internal/2026-07-02-cuantico-sms-assistable-parity-part1-perceived-performance.md`).
2. **Small targeted code fixes** (disabling prefetch on low-value links, adding `X-Accel-Buffering: no` if a proxy is buffering streamed responses). Small diff, contained blast radius.
3. **Architectural fixes** (introducing `loading.tsx` and `<Suspense>` boundaries across routes). Larger scope, often belongs in a dedicated implementation effort rather than a quick patch. The worked precedent explicitly scoped this as "raid scope" (i.e. a larger, planned implementation effort), distinct from the two smaller fixes above (`research/internal/2026-07-02-cuantico-sms-assistable-parity-part1-perceived-performance.md`).

Each fix-menu entry should state: the fix, the effort tier (one-line / small / architectural), and the expected impact (a number or range where research supports one, otherwise a qualitative statement).

## Report shape

Use `templates/diagnosis-report-template.md` for the full report structure. Each entry in the fix menu table should include a verification method specific to that fix (see below); do not use a single generic "re-test the site" verification step for every entry.

## Live re-verification, per fix type

**Region pin:** re-run the Step 1 curl command against the live URL post-deploy and confirm the NEW region code appears in the response header (e.g. `pdx1` instead of `iad1`). Config-file correctness is not sufficient evidence; the header must show the change live. Basis: Hard Rule 3, `guides/00-principles.md`.

**Prefetch fix:** re-run the Step 2 network capture on the same navigation and confirm the request count dropped. Also confirm no `5xx` responses remain if the storm was tripping a defensive timeout.

**Streaming/architecture fix:** re-run the Step 4 live-chunk-observer script (or the DevTools Timing-tab check) and confirm chunks now arrive progressively (early TTFB, staggered Content Download) rather than as a single blocking payload. Basis: `research/nextjs-streaming/2026-07-02-nextjs-streaming-guide.md`.

## Never declare "done" from local testing or from the lab score alone

A fix that looks correct in code review, passes locally, or even improves a Lighthouse score is NOT verified until the specific live-header or live-request-count check above has been re-run against production. This is the single most important discipline in this weapon (Hard Rule 3, `guides/00-principles.md`) and is exactly what separates this Guardian's practice from a lab-score-only performance review.

## Cross-references

- The report template this guide's output feeds: `templates/diagnosis-report-template.md`
- The urgency escalation for a self-DoS finding (report this above the normal fix-menu ranking): `guides/00-principles.md` (Hard Rule 4)
- Worked example showing a full fix menu and live re-verification: `examples/happy-path-region-and-prefetch-storm.md`
