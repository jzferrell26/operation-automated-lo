# Hosted Ads library timeout diagnosis

Date: October 13, 2026, America/Chicago. Diagnosed by live-latency-guardian. Scope: read-only production diagnosis, not an implementation or release approval.

## Result

The authenticated Ads library navigation genuinely failed with a Vercel function timeout. Historical production logs match the browser's exact request identifier and record a 300-second execution followed by HTTP 504. A separate Campaigns request on the same deployment also timed out for 300 seconds. This is a production availability defect, not merely a browser connection reset. The precise stalled stage remains unproven.

No production configuration, deployment, database rows, provider state, credentials or customer messages were changed. No cookies or customer payloads were collected. Only this sanitized report was authored.

## Deployment attribution

Read-only Vercel CLI 58.4.4 and its authenticated GET API returned:

| Field | Verified value |
| --- | --- |
| Production URL | https://operation-automated-lo-web.vercel.app |
| Project scope | `jonathan-ferrell` |
| Deployment | `dpl_BjJ6EsTdK9uHbPhnBfKNeDsN8Tc7` |
| Deployment URL | `operation-automated-lo-oee1fzm9e-jonathan-ferrell.vercel.app` |
| Git SHA | `728d5f0eb463bbf6abfe2519470fa536c022fa15` |
| Git branch | `main` |
| Created | October 7, 2026, 07:03:25.357 UTC |
| State | READY, production, PROMOTED |
| Runtime/configuration | Node.js 24.x, Next.js, application root `apps/web`, Fluid enabled |
| Function region | `iad1` |
| Source dependency pin | Deployed SHA's `apps/web/package.json` pins Next.js 16.3.6 |

The pending completion branches and their Next.js patch are not this deployed artifact. Function-specific duration overrides were not exposed by the inspected metadata; the actual 300-second timeout is verified from runtime logs. Vercel documents HTTP 504 when a function exceeds its execution duration. [Function limits](https://vercel.com/docs/functions/limitations), [timeout diagnostic](https://vercel.com/docs/errors/function_invocation_timeout).

## Step 1: live timing and response headers

Anonymous GET requests discarded response bodies and recorded only status, route, timing and Vercel region header:

| Route | TTFB seconds | Total seconds | HTTP |
| --- | ---: | ---: | ---: |
| `/marketing/campaigns` | 0.996108 | 0.996490 | 200 |
| `/marketing/campaigns` | 0.263095 | 0.263605 | 200 |
| `/marketing/campaigns/library` | 0.248574 | 0.249207 | 200 |
| `/marketing/campaigns/library` | 0.197549 | 0.198036 | 200 |

The first request was October 14, 00:36:40.814 UTC; follow-up samples were around 00:40:58 UTC. The headers showed `cle1::iad1` and cache MISS. `cle1` is the edge observation; `iad1` is independently confirmed by deployment and project configuration. Database region has not been attributable to this deployment without inspecting secret values. Region mismatch is therefore inconclusive. These anonymous responses do not exercise the signed-in session and saved-brand reads, and do not prove authenticated route health.

## Step 2: authenticated failure and network coverage

Root's authenticated CUA tab displayed HTTP 504, `FUNCTION_INVOCATION_TIMEOUT`, with request ID `cle1::q5nw7-1791937658158-bdcb1b70eb6d`. Production logs matched its identifier suffix:

| Request start, UTC | Request ID suffix | Route | Status | Runtime message |
| --- | --- | --- | ---: | --- |
| October 14, 00:27:38.158 | `q5nw7-1791937658158-bdcb1b70eb6d` | `/marketing/campaigns/library` | 504 | Task timed out after 300 seconds |
| October 13, 23:44:30.527 | `p6x6q-1791935070527-fee77356fcae` | `/marketing/campaigns` | 504 | Task timed out after 300 seconds |

The narrow 00:26:00 through 00:33:00 UTC historical query returned two matching Campaigns/library requests: Campaigns 200 at 00:26:31.007 and this library 504. It did not show a burst, but it is not a complete browser network capture. No trace ID or cause-specific database code was exposed for the timed-out request. The source field was `serverless-middleware` for the Ads failure; the earlier Campaigns failure appeared under either `serverless` or `serverless-middleware` across queries. Do not infer that the application proxy is the slow component from this classification.

The deployed `proxy.ts` is synchronous nonce/CSP/header work with no auth or database await. Campaigns tab links use the `@oalo/ui` Link primitive, which renders a plain anchor rather than Next.js Link prefetch. These facts weaken the stock RSC-prefetch-storm hypothesis for this specific click. A self-induced request storm is not established.

Coverage gap: authenticated browser request counts, cache counts and full waterfall were not available to this Guardian. Root was asked to supply sanitized timing or an owner-assisted HAR/waterfall. Root subsequently reported that the error-page reload had no observable new request, retained the same error ID and left its network event cursor unchanged at 16. A separate user-opened tab was healthy, authenticated and showed empty Campaigns. That establishes intermittent authenticated availability, not recovery of the failed library route. No credentials should be included in further capture evidence.

## Step 3: source seams and round trips

The following source seams were checked against the deployed SHA; they have no diff in the inspected primary branch:

- `apps/web/src/server/runtime-authentication.ts`: the authenticated layout resolves a first-party principal, then session display, then optional email-verification status. Optional-read catches handle rejection, but do not create a deadline for a promise that never settles.
- `apps/web/src/server/authenticated-principal.ts`: first-party resolution performs session lookup, current binding version, and location/actor identity lookups. The two identity lookups run concurrently. These are required authorization decisions, not automatically defects.
- `apps/web/src/app/(authenticated)/marketing/campaigns/library/ads-library-page-data.ts`: the page resolves its principal separately, then awaits the catalog and saved-brand read together before constructing its screen.
- `apps/web/src/server/ad-brand-read.ts` and `workspace-preferences.ts`: the saved-brand path reads tenant-scoped preferences through the separate campaign pool. The deployed real catalog is empty, so large art enumeration is not supported as an explanation.
- `packages/db/src/runtime-function-query.ts`: each runtime function reserves a connection and executes BEGIN, optional runtime-role assumption, its allowlisted SQL and COMMIT.
- `packages/db/src/transaction-context.ts`: tenant preferences reserve a connection, establish and verify tenant context, read preferences, then commit and release.
- `packages/db/src/postgres-adapter.ts:81`: connection acquisition directly awaits `postgres.reserve()` without an application acquisition deadline. Defaults are ten connections per pool, ten-second connection startup timeout, thirty-second statement timeout and thirty-second idle-in-transaction timeout. These are distinct budgets. Connection startup and SQL statement limits do not establish an end-to-end request or acquisition-queue deadline. [Postgres.js connection and concurrency documentation](https://github.com/porsager/postgres).

For a successful first-party full render, source implies four runtime contracts for the page principal and one tenant-preferences transaction. A concurrently rendered layout adds four more principal contracts, one display contract and optionally one email-verification contract. That is nine or ten runtime contracts plus the preferences transaction, not an observed production query count. Render reuse, execution order and the stalled stage require actual spans. No measured database latency or per-navigation SQL total is available.

## Step 4: blocking and streaming

There is an inherited `(authenticated)/loading.tsx`, but no dedicated library loading file or granular library data Suspense boundary. The layout awaits authentication and identity decoration; the library page awaits all its data before producing its screen. A slow layout read can prevent the inherited page fallback from helping.

An anonymous live chunk probe with `Accept-Encoding: identity` received headers at 289 ms and six body chunks at 291 to 292 ms, without logging their contents. This proves chunked transport works for the anonymous response. It does not verify progressive authenticated rendering. Root's 504 means this particular authenticated invocation failed to finish; it does not identify whether earlier authenticated chunks were emitted or buffered.

## Ranked next probes and conditional fixes

| Priority | Next action | Effort/impact | Owner | Verification |
| --- | --- | --- | --- | --- |
| 1 | Add safe elapsed-stage observations at pool acquisition, principal lookup/binding, shell decoration and saved-brand/preferences boundaries. Correlate with the Vercel request, recording stage, elapsed time and safe error code only. Pair with read-only database/pooler wait and connection counts. | Small diagnostic change; highest value for finding the actual stalled wait. Pool acquisition or a shared authenticated DB wait is the leading source-supported hypothesis, not a proven root cause. | TypeScript/Node Guardian with DB Guardian | Reproduce the same signed-in navigation and identify the last completed stage plus the wait duration. |
| 2 | If acquisition waiting is confirmed, implement bounded acquisition and request budgets with correct late-connection cleanup. Bound optional display/brand failures so they reach an honest degraded screen. Preserve authorization and tenant verification. | Small-to-medium change; prevents five-minute hangs, but a degraded response alone is not recovery. | TypeScript/Node Guardian with DB and Security review | Live request completes within its budget, no leaked reservations, mandatory-auth failure stays closed, and repeated healthy navigations succeed. |
| 3 | Confirm the actual production database region and pooler configuration from non-secret project metadata. Pin compute only if a material mismatch is confirmed. | Potentially small configuration change; impact unknown until measured. | DevOps or release/deploy Guardian | Live execution header matches selected region, and authenticated timings improve across repeated samples. |
| 4 | Capture an authenticated sanitized waterfall. Investigate fanout only if the capture demonstrates it. Add granular streaming boundaries if the wait is legitimate and still harms navigation. | Conditional architectural work; improves feedback, cannot cure the stalled backend by itself. | React Guardian | Compare actual request counts and authenticated first-shell/chunk timing before and after, with no 5xx. |

Do not increase the Vercel duration limit as the first response to an ordinary page navigation hanging for five minutes. Do not enable demo mode, expose samples, skip authentication or turn a failed brand read into a claimed saved brand.

## Re-verification status

No fix was shipped or verified. Production failure is confirmed; exact cause, database region, authenticated waterfall and progressive rendering remain open. The next implementation should close Security then Quality and be rechecked on this hosted authenticated route before claiming recovery.

## Continued signed-in walkthrough

Root separately opened the homeowner list in the user's existing tab. It loaded with no tracked properties or reports, zero lookup allowance, and a notice that valuations require connection. The creation route showed its loading state; a subsequent Brand navigation ended at another actual504 `FUNCTION_INVOCATION_TIMEOUT`. Native screenshot and accessibility state confirmed `/brand` and request ID `cle1::fh6rp-1791938780684-5c8aac1fe4da`. The Brand request's exact runtime duration was not separately checked in production logs here. Do not describe the earlier creation loading state as a confirmed homeowner504.

This broader authenticated failure supports investigating shared runtime boundaries, but still does not identify the stalled stage. The sanitized browser event buffer returned no usable waterfall. A separate main-based source branch is preparing a bounded acquisition deadline, late-reservation cleanup and opt-in safe elapsed-stage diagnostics. Source verification, deployment and hosted recovery remain separate open criteria.

The funnel library subsequently loaded its five field-edited private previews. Opening the Live webinar editor ended at another confirmed504 `FUNCTION_INVOCATION_TIMEOUT`: `/marketing/campaigns/funnels/live-webinar`, request ID `cle1::9ddm7-1791940002849-55ae05e9949a`. Native accessibility state verified the route and error. No editor save or publication was performed. This confirms another affected authenticated route, without establishing its exact stalled stage or runtime duration.
