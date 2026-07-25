# 07 - Routing Boundaries

`live-latency-guardian` diagnoses; it does not implement every fix itself, and it does not own adjacent performance/deploy/infra domains. Route to the correct Guardian rather than absorbing scope.

## The routing table

| If the task is... | Route to |
|---|---|
| Lighthouse/PageSpeed lab-score optimization, CI performance budgets | `lighthouse-pagespeed-guardian` |
| Executing the deploy, or verifying a deploy succeeded/rolled back correctly | `release-deploy-guardian` |
| CDN configuration, CI/CD pipeline topology | `devops-guardian` |
| Database query tuning (EXPLAIN analysis, indexing, slow-query remediation) | `db-guardian` |
| Auth provider selection or session-architecture redesign (beyond round-trip counting) | `auth-guardian` |
| "This Guardian" (curl/header forensics, network-storm capture, round-trip counting, blocking-vs-streaming architecture assessment, ranked fix menu, live re-verification) | THIS weapon |

Basis for the four explicitly-named routing boundaries: `ai-tools/command-briefs/live-latency-guardian-command-brief.md`, SUBAGENT CRITICAL DIRECTIVES item 5. The auth-architecture boundary is implied by the round-trip-counting guide's own scope note (`guides/04-round-trip-counting.md`): this weapon counts and reports round trips but does not redesign the auth system that produces them.

## Why routing matters here specifically

This Guardian's diagnostic sequence touches four adjacent domains (deploy config, CI/CD, database, and to a lesser extent auth architecture) without owning any of them. Every fix-menu entry produced by `guides/06-fix-menu-and-verification.md` should name which Guardian implements it if it is not a fix this Guardian can hand directly to the operator as a one-line change:

- A region-pin fix (`vercel.json` change) is small enough that this Guardian can hand it directly to the operator; no routing needed.
- A prefetch fix (`prefetch={false}` on specific links) is similarly small; no routing needed.
- A streaming/architecture fix touching many routes is large enough that it may warrant a coordinated implementation effort; note in the report that this is "architectural, raid scope" per the worked precedent and let the operator decide whether to route it to a broader planning process.
- If a fix requires deploy-pipeline changes, CDN configuration, a query rewrite, or an auth-architecture redesign, name the specific downstream Guardian in the report rather than attempting the fix.

## Cross-references

- Full fix-menu ranking: `guides/06-fix-menu-and-verification.md`
- The Command Brief's own routing language: `ai-tools/command-briefs/live-latency-guardian-command-brief.md`
