# PRD-007 independent security review

**Review date:** 2026-10-01
**Criterion:** 008E-AC-006, part 1 (`security-guardian`), PRD-008 Gauntlet run
**Reviewer:** `security-guardian`, armed with `security-weapon`
**Tree:** worktree `oalo-g-w3rev`, branch `gauntlet/w3-reviews`, starting at `b5c9e19`
**Versions audited:** Next.js 16.3.6, React 19.3.0 (resolved in `pnpm-lock.yaml`), Node 24.18.0
**CVE watchlist last refreshed:** 2026-04-24, about 160 days ago, which is past the 120-day limit. See "Dependency and version checks".

## Verdict

**PASS.** No Critical or High finding. Two Medium findings (M-1, M-2) were found and are fixed on this branch with red-first tests that now pass. Nineteen Low or informational items are documented and left alone, as the run rules require. No Critical, High or Medium finding is unresolved.

Two things the verdict does not claim. First, M-1 is fixed in the application as a per-instance backstop. The fleet-wide limit is a Vercel Firewall rule that has to be added at activation, and it is recorded in the activation runbook as a pre-sharing step. Second, nothing here was proven against a real Postgres, a built server or a browser, because the run rules forbid `pnpm test:db`, `pnpm test:browser`, `pnpm verify` and any server on the integrated run's ports. What that leaves pending is listed under "Not verified, pending heavy".

## Arming

I read `security-weapon/SKILL.md` and the guides it routes to before reading any code: `guides/00-principles.md` (severity rubric, never-downgrade rule), `01-scan-procedure.md`, `02-vibe-coding-patterns.md` (Catalog A), `03-owasp-top-10.md` (Catalog B), `04-pii-and-financial.md` (Catalog C), `05-remediation-playbooks.md`, `06-cve-tracker.md`, the opening of `07-known-critical-cves.md`, the `upstream-v2` index and `guides/01-audit-procedure.md`, and `templates/security-audit-report.md`. The `upstream-v2` guides are grounded in SvelteKit, Neon and WorkOS, which is not this stack, so I took their procedure and the Phase 1 to 4 workflow from them and applied the React, Next.js and Node catalogs to the code. Pre-flight found no `library/qa/` directory and no independent QA report for this branch. The only quality reports for PRD-007 are the implementing session's own self-reviews, so this review is correctly ordered before `quality-guardian`.

## Independence

This review was done in a session separate from the one that implemented PRD-007 (PRs #69, #71, #72). The reviewer wrote none of the reviewed code and none of its self-reviews. The PRD-007 reports in this folder say "No independent reviewer is claimed". I read them only to learn what was claimed, and I checked each claim against the code rather than accepting it.

## Scope

Reviewed in full unless noted:

- `apps/web/src/server/homeowners/` (runtime, http, service, scheduler, RentCast adapter, HighLevel adapter, errors, page brand)
- `apps/web/src/app/api/homeowner-reports/**`, `apps/web/src/app/api/jobs/homeowner-reports/route.ts`
- `apps/web/src/app/(authenticated)/homeowners/**`, `apps/web/src/app/(public)/home-report/**`
- `apps/web/src/features/homeowners/**` (all read for dangerous sinks; `workspace.tsx` and `builder.tsx` skimmed for logic, `report-pdf.ts`, `report-view.tsx`, `shared-report.tsx`, `use-home-workspace.ts` and `model.ts` read in full)
- the PRD-007 authenticated-page settings: `apps/web/src/server/workspace-preferences.ts`, `workspace-page-data.ts`, `apps/web/src/features/workspace/model.ts`, `apps/web/src/app/api/workspace/preferences/route.ts`
- `packages/db/src/homeowner-repository.ts`, `packages/contracts/src/homeowner-reports.ts`, `packages/application/src/homeowner-reports.ts`, `packages/domain/src/homeowner-finance.ts`
- `supabase/migrations/20260924010000_homeowner_reports.sql`, and the `user_preferences` migration the settings use
- `apps/web/src/proxy.ts` and `apps/web/next.config.ts` for the `/home-report` rules
- the spec (PRD-007 index, ten acceptance items), `docs/operations/homeowner-avm-activation.md`, and every report in this folder

Not read line by line: `supabase/tests/homeowner_reports.pgtap.sql` (1926 lines; I read the role and support sections, lines 976 to 1139 and 1810 to 1831, and did not run it) and the CSS.

## Executive summary

The surfaces are carefully built. Every tenant boundary I traced is enforced twice, in the SQL the repository sends and again by forced row level security keyed to the verified session. Share links are 256-bit secrets stored as hashes and rechecked on every read. The billable-call path reserves before it calls out. The cron secret is compared in constant time and work is leased. I found no path to cross-tenant access, no secret handling fault, no injection and no PII in logs, analytics or errors.

The two Medium findings are both about the public report link, the one door in this feature that answers anyone. M-1: it did unlimited database work for any well-shaped link, with no throttle of any kind. M-2: it validated every homeowner setting just to read the on-or-off switch, so one mistyped operator setting (the paid-lookup allowlist is edited per approved workspace) would have taken down every homeowner's link and named the setting to the caller.

## Scorecard

| Category | Status | Findings |
| --- | --- | --- |
| Financial / payment security | OK | 0 (no card data; Stripe is not in this feature) |
| PII exposure | ATTN | 0 Critical or High; Low items L-1, L-5, L-7, L-15, L-16 |
| Authentication and authorization | OK | 0 (tenant, CSRF, role and cron checks traced and sound) |
| Injection | OK | 0 |
| Dependency security | OK | 0 (`pnpm audit` clean; one new runtime dependency, `pdf-lib@1.17.1`) |
| Configuration and headers | ATTN | M-1 and M-2 fixed; Low items L-3, L-11 |
| Data handling and availability | ATTN | Low items L-2, L-8, L-12, L-18 |

## Critical findings

None detected.

## High findings

None detected.

## Medium findings (both fixed in this run)

### M-1. The public report page and endpoint had no throttle and did database work for any well-shaped link

- **Evidence at the starting commit `b5c9e19`.** `apps/web/src/server/homeowners/http.ts:338-388` (`handleSharedHomeReport`) and `apps/web/src/app/(public)/home-report/[secret]/page.tsx:15-27` answer anyone. Any 64-character hex string passes the shape check and then runs `readSharedHomeReport` (`packages/db/src/homeowner-repository.ts:646-706`), which checks out a connection and runs begin, switch role, query and commit, whether or not a report exists. The sign-in routes count attempts per address (`password-authentication-handler.ts:116-140`); nothing counted these.
- **Why Medium.** Nobody can find a real link by asking (256 bits), so this is not an enumeration or secrecy failure. The exposure is that an anonymous caller can spend the shared database connections on links that do not exist, which also starves sign-in and the signed-in app. The rubric lists missing rate limits as Medium. It is an availability finding, with no data exposure.
- **Why not in `proxy.ts`.** The proxy matcher skips any request carrying a `purpose: prefetch` or `next-router-prefetch` header (`proxy.ts:60-70`), so a limiter there is bypassed by adding a header. The limit had to live in the handler and the page.
- **Fix (commits `dc8ab04`, `98ec7e2`).** New `apps/web/src/server/homeowners/share-throttle.ts`: a bounded per-address fixed-window counter (60 reads and 10 review requests a minute per address, at most 10,000 addresses remembered). The address comes from the platform's forwarded headers in the same order and on the same trust as the existing sign-in limiter. `handleSharedHomeReport` refuses a caller past its limit with 429, `Retry-After` and the usual private headers before any lookup. The page sends such a caller to the same unavailable page as any other link it cannot show. A link that is not shaped like a link spends nothing. A request that names no address is not counted, so local runs and the browser suites are unaffected. The activation runbook now asks for a Vercel Firewall rate-limit rule for the fleet-wide limit, because this counter is in memory and per instance. No rendered output changes for a link within its allowance and no dependency changed, so `008D-AC-011` does not re-open the design sign-off.
- **Tests (red first).** Before the limiter was wired in, the endpoint cases failed with 404 and 200 where 429 was expected, and the page case made 62 lookups where 60 were allowed.
  - `apps/web/src/server/homeowners/share-throttle.unit.test.ts`: window, reset, per-address isolation, memory bound, address header order and limits.
  - `apps/web/src/server/homeowners/shared-report-throttle.unit.test.ts`: the endpoint refuses past the limit with a wait and private headers and without a lookup, malformed links spend nothing, callers are isolated, the review-request allowance is smaller, and a request with no address is never held back.
  - `apps/web/src/app/(public)/home-report/[secret]/not-found.integration.test.tsx`: the page half. `homeowners-review-surface.integration.test.tsx` gained a request-scope mock so its sweep keeps reading the real page.
- **Residual.** Per-instance, so it bounds one address on one warm instance and is a backstop, not the fleet limit (see runbook). The review button (`features/homeowners/shared-report.tsx:22-26`) reports any refusal as "no longer available", including a 429, which takes more than ten clicks a minute from one address to see (L-14).

### M-2. The public report routes validated every homeowner setting to read one switch

- **Evidence at `b5c9e19`.** `apps/web/src/server/homeowners/http.ts:346` and `apps/web/src/app/(public)/home-report/[secret]/page.tsx:21` called `HomeEnvironmentSchema.parse(...)` (`runtime.ts:19-42`) only to read `OALO_HOMEOWNER_REPORTS`. That schema also validates the paid-lookup allowlist (`OALO_HOMEOWNER_ALLOWED_LOCATION_IDS`, UUID list), the monthly allowance (`OALO_HOMEOWNER_MONTHLY_LOOKUP_LIMIT`) and other settings. The runbook has operators edit the allowlist each time a workspace is approved. One mistyped entry therefore made every homeowner's shared link fail: the page threw, and the endpoint answered 400 with `fields` set to the failing setting's name (`http.ts:123`), to an anonymous caller.
- **Why Medium.** A verbose error response to an anonymous caller is Medium in the rubric, and the coupling is a plausible operator mistake with a blast radius of every homeowner link. Only the setting's name leaks, never its value, which keeps it from High.
- **Fix (commit `f46658c`).** `homeReportsEnabled` in `runtime.ts:51` reads only the on-or-off switch, never throws, and is true only for the exact word `enabled`. `http.ts:351` and `page.tsx:21` use it. Authenticated routes still validate the full schema.
- **Tests (red first).** With a mistyped allowlist the page threw the validation error and the endpoint answered 400, instead of showing the link or the usual unavailable page. `shared-report-environment.unit.test.ts` covers the helper and the endpoint (a live link answers 200, an unknown link answers the usual 404 with no setting named, a switched-off deployment still answers 404). `not-found.integration.test.tsx` covers the page.

## Low findings (documented only)

Items marked NEEDS HUMAN REVIEW are ones where the severity is a judgement about a product or policy decision, with the reasoning given so it is not a silent downgrade.

- [ ] **L-1. The shared report carries fields the homeowner does not need.** `supabase/migrations/20260924010000_homeowner_reports.sql:155-157` redacts only `input.contactId`, and `apps/web/src/app/(public)/home-report/[secret]/page.tsx:27` hands the whole snapshot to a client component, so it is serialized into the page and the JSON endpoint. That includes `input.requestId`, `input.propertyId`, `input.communicationBasis`, `input.association` and `input.confirmedProperty`. None is a secret or credential and none is PII beyond the intended homeowner name, address and balances. Recommended: a public view type listing exactly what the report shows.
- [ ] **L-2. A second review request, after the loan officer resolves the first, is acknowledged but never recorded.** `homeowner_review_once_idx` (migration `:118`) allows one `review_requested` event per report forever, and `record_shared_event` (`:168-183`) only sets `review_requested_at` when its insert was new. After `resolveReview` clears the flag (`homeowner-repository.ts:495-507`), a later click still gets "Your loan officer can now see your request" (`http.ts:398`). This is a truthfulness and function fault, not a security one. Handed to `quality-guardian`.
- [ ] **L-3. Public error mapping is written for signed-in callers.** `homeError` (`http.ts:94-150`) answers a store outage as "Sign in with an account that has access to this workspace" (`:136-137`) and answers any validation error with `fields` (`:128`). On the public routes a homeowner has no account to sign in to, and a provider or database shape fault surfaces as a 400 "check your fields". The setting-name leak is fixed in M-2, and what remains is wording and status on a failure path.
- [ ] **L-4. HighLevel wire details are UNVERIFIED and differ from the repo's own convention.** `server/homeowners/highlevel.ts:69` sends `Version: "v3"`, while `packages/ghl/src/leadconnector-v2-http-transport.ts:15` uses `2021-07-28`. `:175` writes the report link under `fieldValue`, and `:177` and `:194` require a response literal `succeeded: true`. I made no HighLevel request, as the run rules require, and did not fetch HighLevel documents, so I cannot say which is right. If any is wrong the failure is closed (read-back fails, no workflow starts, delivery is held), so this is not a security fault. Verify against the HighLevel contact docs before `OALO_HOMEOWNER_DELIVERY_ENABLED` is set. Handed to `quality-guardian` and the activation checklist.
- [ ] **L-5. Contact search lists the whole location's contacts to any report writer, with no throttle. NEEDS HUMAN REVIEW.** `highlevel.ts:140-151` and `http.ts:310-327` return up to 20 names and email addresses per query to a `location_admin` or `campaign_creator` in that location. HighLevel's own per-user contact restrictions are not mirrored, so a staff member who can see only assigned contacts in HighLevel can see more here. Reasoning for Low: the audience is same-workspace staff the owner already gave the creator role, there is no cross-workspace exposure, and the PRD names HighLevel as authority only for ownership and communication, which are checked. If per-user HighLevel scoping matters, it needs a decision, not a patch.
- [ ] **L-6. Personal settings are scoped to the user only in application SQL.** The `user_preferences` row policy (`20260919160000_user_preferences.sql:60-63`) checks the workspace, not the user, and `workspace-preferences.ts:36-39,51` supplies `user_id` itself. The support role can read these rows under an audited grant (same file, `:64-65`). This is a defense-in-depth gap from PRD-006c, not a PRD-007 defect, and every query I read passes the actor.
- [ ] **L-7. A client-supplied contact name is stored when the first lookup fails.** `homeowner-repository.ts:288-303` inserts the request's `contactName` before any provider call, and `complete` replaces it with the verified name (`:376-384`). If the first lookup fails, the property keeps the typed name. It is shown only inside the same workspace.
- [ ] **L-8. There is no cap on snapshots per property for a writer.** `reserve`/`complete` insert one report per revision (`homeowner-repository.ts:334-366`), and `revise` spends no allowance. The list returns only the latest 120 (`:92`), so storage can grow past what is shown. It needs a writer in the same workspace. NEEDS HUMAN REVIEW: a quota is a product decision.
- [ ] **L-9. Coverage gaps on security-relevant code.** No test drives `handleHomeSchedule` (`scheduler.ts:115-177`): only `authorizedHomeCron`, `scheduledRequestId` and `scheduledMortgage` are tested (`finance.unit.test.ts:195-210`), so the 401, disabled, claim and pause paths are untested at handler level. The application-layer support denial (`runtime.ts:73`) has no test of its own; the database denial is in pgTAP. There is no route test for contact search or for a cross-origin share POST (`http.ts:369-380`). The logic reads correctly, so these are coverage notes for `quality-guardian`.
- [ ] **L-10. The report link is a capability URL.** Its secret is in the path, so it appears in platform request logs and in a browser's print header and footer. The runbook already warns about logs (`homeowner-avm-activation.md:66`). This is inherent to the design.
- [ ] **L-11. The proxy skips prefetch-flagged requests.** `proxy.ts:60-70` means `no-referrer`, `no-store` and `noindex` (`proxy.ts:20-23,51-56`) and the CSP do not apply to a request carrying `purpose: prefetch`. Next's dynamic-page default is `no-store`, and the page's own robots and referrer metadata (`page.tsx:10-14`) still apply, so the practical gap is small. I confirmed from Next's router source (`resolve-routes.js`) that, when the proxy does run, its headers override `next.config.ts`'s `strict-origin-when-cross-origin`.
- [ ] **L-12. A delivery attempt is consumed when link creation fails before anything is written.** `service.ts:188-202` records `blocked` and `homeowner-repository.ts:521-536` allows one attempt per report, so that report can never be handed off again. A new report is needed. It is conservative and safe, but costs a regeneration.
- [ ] **L-13. No `server-only` marker on the server modules.** `apps/web/src/server/homeowners/*.ts` rely on `node:crypto` imports and the boundary audit (`pnpm audit:boundaries` passes) to stay out of the client bundle. Hygiene only.
- [ ] **L-14. The review button's failure sentence is generic.** `features/homeowners/shared-report.tsx:22-26` says the link is no longer available for any non-OK answer, including the new 429 from M-1. Changing it needs new copy through the user-language guard.
- [ ] **L-15. Retention, export and account-deletion rules are not defined. NEEDS HUMAN REVIEW.** The runbook says they "must be selected for the actual deployment before collecting customer data" (`homeowner-avm-activation.md:72`). Property removal does delete snapshots and links (migration cascades `:57,101,114,131`), but there is no export and no purge job. Reasoning for Low: the product is US mortgage work with no stated EU exposure, no live customer data exists yet, and the PRD itself defers the decision. It is a go-live gate for the owner, not a code defect.
- [ ] **L-16. Roles that may read financial snapshots. NEEDS HUMAN REVIEW.** `homeowner.allowed` (migration `:16`) lets approver, publisher and analyst (session roles `campaign_approver`, `campaign_publisher`, `viewer`) read every property and mortgage balance in their workspace, and pgTAP pins it (`homeowner_reports.pgtap.sql:1810-1831`). Support and the collaborator role are refused: `realtor_collaborator` has no session role (`packages/auth/src/role-binding-map.ts:9,35`) and no database read, and support has no policy (pgTAP `:976-1010`). That matches the PRD's wording, so I treat it as met. The owner should confirm that read access for roles with no homeowner duty is intended.
- [ ] **L-17. A shape fault in the HighLevel contact read is reported as the caller's own input error.** `highlevel.ts:99,131` use `parse` rather than `safeParse`, so on the report-creation path an unexpected provider answer comes back as the 400 "check the required report fields" (`http.ts:123-129`), before any billable work and with the failing path in `fields`. On the handoff path the same fault is correctly treated as uncertain (`service.ts:201`).
- [ ] **L-18. One database failure can fail a whole monthly batch's response.** `scheduler.ts:138-168` awaits `Promise.all` over a batch, and `repository.list()` is outside the per-property `try`. The other claimed properties keep running, their leases expire after five minutes, and the deterministic request ids (`scheduler.ts:21-24`) stop a repeat from looking up again, so nothing is lost or doubled.
- [ ] **L-19. The Weapon's own CVE intelligence is stale.** See the next section.

## Checked and found sound

Each item the review brief named, with where I looked. Nothing here needed a change.

- **Tenant from session only.** `runtime.ts:61-99` takes the principal from the verified session and builds the repository with `createPrincipalBoundTenantContextAuthority`. Every action schema is `.strict()` (`http.ts:19-85`), so a body cannot name a location or actor; `routes.postgres.test.ts:119-131` asserts an injected `locationId` is a 400. Every SQL statement in `homeowner-repository.ts` binds `tx.context.locationId`.
- **CSRF on every mutation.** `http.ts:161` passes `request.method !== "GET"`; `runtime.ts:71` selects the mutation resolver, which runs `assertMutationGate` (`authenticated-principal.ts:284,337-338,377-378`). Contact search is a POST and asks for mutation (`http.ts:312`). Preferences do the same (`workspace-preferences.ts` `workspacePrincipal`). The public share POST has no session to bind a token to, so it checks the origin against the host and `sec-fetch-site` (`http.ts:369-380`). The cron route uses a bearer secret.
- **RLS and composite keys.** Seven tables, all `enable` and `force row level security` (migration `:136-147`), composite `(location_id, id)` keys and indexed composite foreign keys, `app_runtime` has no `update` or `delete` on reports or events (`:148-151`), and the capability functions are `security definer` with `search_path = ''`, revoked from public and granted to named roles (`:184-185,203-204`). Snapshot size is bounded (`:59`) and share lifetime is bounded to 35 days (`:102`).
- **Role gating.** Support is denied in the application (`runtime.ts:73`) and has no database policy; the collaborator has no session role; writers are `location_admin` and `campaign_creator` only (`runtime.ts:57`, migration `:16`). See L-16 for the read set.
- **Share-link secrecy.** 32 random bytes as 64 hex (`runtime.ts:56`, `service.ts:134`), stored as SHA-256 (`:150`, migration `:96`), shape-checked before any lookup (`http.ts` `/^[a-f0-9]{64}$/`). Reads recheck expiry, revocation, property, active workspace, active author and the author's current role (migration `:155-167`) and re-apply the 35-day freshness rule. Creating a link revokes the previous one under a workspace lock (`homeowner-repository.ts:450-494`). Every unusable link gets one answer: the same JSON and the same page (`not-found.tsx`), so which links exist is never stated, and the response headers are the same whatever the link says (`proxy.shared-report.unit.test.ts`). No-store, noindex and no-referrer come from `errors.ts:12-17`, `proxy.ts:20-56` and the page metadata. A hash index lookup of a hash cannot leak the secret by timing. The `viewed` and `review_requested` events are one row per report (migration `:118-119`), so a link holder cannot flood the events table. A forged origin on a valid link answers 403 where an invalid link answers 404, which could confirm a link someone already holds, and nothing more.
- **RentCast key.** Read from `OALO_RENTCAST_API_KEY` only on the server (`runtime.ts:34,139-142`), sent in a header (`rentcast.ts:165`), never in a URL, an error, a log line or a response. The host and path are fixed (`rentcast.ts:159`), redirects are refused (`:167`), the call times out at 12 seconds (`:168`) and the body is read with a 300,000-byte bound (`:189`). Provider bodies are never returned. `homeConnectionsFor` only exposes booleans to the page (`workspace-page-data.ts:90-91`). *Provider endpoint, parameter and header names themselves were not re-verified by me against RentCast documents (no provider contact allowed); the security properties above are from the code.*
- **Allowance and no double lookup.** `reserve` takes a workspace lock, checks the stored request fingerprint, rejects a reused id even after property deletion (`homeowner-repository.ts:203-229`), blocks a second pending lookup per property (`:248-260`), and writes the request and the usage event in one transaction before any network call (`:305-329`). A retry returns the saved outcome and never reaches the provider (`service.ts:79-88`). A cached or reused valuation spends nothing (`:261-271`). The default allowance of 0 blocks fresh lookups (`runtime.ts:35`), and live data needs both the switch and a listed workspace (`runtime.ts:133-135`).
- **SSRF and injection in address handling.** The address is a bounded, schema-checked object (`packages/contracts/src/homeowner-reports.ts:8-15`), becomes one URL-encoded query value to a fixed host, and is otherwise only a database parameter, React text or PDF text. SQL is parameterized throughout. Contact ids are `^[A-Za-z0-9_-]{1,100}$` (`:7`) and `encodeURIComponent`-ed, and the workflow id has its own pattern (`highlevel.ts:10`).
- **HighLevel handoff.** The token comes from a server-only setting and is only ever sent as a bearer header (`highlevel.ts:66-70`). The mapped location must equal the stored one (`runtime.ts:121-127`) and each contact's `locationId` must equal it (`highlevel.ts:100-105`). Delivery needs global do-not-disturb false, email and SMS channels present, and every channel inactive (`:117-127`), and re-checks that after the write (`:178-183`). It writes only the configured field, reads it back, and starts the workflow only on a confirmed read-back (`:174-200`). The attempt is reserved first (`service.ts:188`), and an unconfirmed write is held, with one delivery per contact in flight (migration `:134`). A handoff never repeats.
- **Cron.** `scheduler.ts:37-45` requires a secret of at least 32 characters, bounds both lengths and compares equal-length buffers with `timingSafeEqual`, before any other work (`:121`). Claiming is `for update skip locked` with a five-minute lease and a cap of 10 (migration `:187-204`), restricted to `scheduler_runtime`, and re-checks the creator's active role and workspace. Request ids are derived from the property and due date (`scheduler.ts:21-24`), so a replay finds its own saved result.
- **PDF.** Built in the browser from the saved snapshot with `pdf-lib`'s standard fonts, text only (`report-pdf.ts`): no links, forms, scripts or embedded files. Every string is schema-bounded, `wrap` splits on whitespace so a pasted newline cannot add lines, and characters the font cannot encode are refused with a user sentence (`:242-247`). No lookup happens when a PDF is opened.
- **Input validation.** Request bodies, share events, provider responses (RentCast and HighLevel), environment settings, database rows and stored preferences are all parsed with zod at the boundary, strict where the shape is ours. Both `JSON.parse` calls in scope (`errors.ts:44`, `runtime.ts:111`) feed zod. There is no `Object.assign` or merge of untrusted input, no `eval`, no `dangerouslySetInnerHTML`, and no shell or file access in scope.
- **PII in logs, analytics, errors.** No `console`, analytics or error-tracking call exists in scope. Unexpected errors become one generic sentence with no detail (`http.ts:141-149`), and stored failure detail is a short code (migration `:43`). No browser storage is used for real data (the fictional demo only).
- **Rules-file and secrets sweeps.** No hidden Unicode in `AGENTS.md`, `RULES.md`, `SKILLS.md`, `HOOKS.md`, `.cursor` or the homeowner files; no `NEXT_PUBLIC_` variable, key-shaped literal or committed `.env`; `pnpm audit:secrets` passes.

## Not verified, pending heavy

- **Real-database proof.** `repository.postgres.test.ts`, `routes.postgres.test.ts`, `workspace-preferences.postgres.test.ts` and `supabase/tests/homeowner_reports.pgtap.sql` need `pnpm test:db`, which the run rules forbid. My two fixes do not touch SQL, the repository or a migration, so they cannot change those results, but the integrated `pnpm test:db` should be rerun on the final tree. I read the migration and the repository instead and relied on the implementing session's recorded results for the database behaviour.
- **M-1 against a real server.** The 429 path is proven by unit and integration tests with mocked database reads. A check against a built server with `OALO_HOMEOWNER_REPORTS=enabled` and a forwarded-address header is **pending heavy**. I tried a throwaway `next dev` on an unused port; it could not resolve the workspace packages because they are not built, so no real-runtime evidence was obtained. I stopped that server, reverted the `next-env.d.ts` change it made, and deleted the `apps/web/AGENTS.md`, `apps/web/CLAUDE.md` and `apps/web/.next` files it generated. The review browser deployment does not enable homeowner reports (`tests/browser/review/homeowner-language-sweep.spec.ts:35`), so there is no existing browser spec that could cover it either.
- **Browser and design suites.** `pnpm test:browser` and the visual baselines were not run. The fixes add no rendered output for a link inside its allowance and the limiter is skipped when no address header is present, so I expect no change, but that is a prediction.
- **HighLevel and RentCast contract details.** See L-4 and the RentCast note above. No provider request was made.

## Dependency and version checks

```text
pnpm audit --audit-level=low   ->   No known vulnerabilities found   (run at the start; no dependency changed afterwards)
```

| CVE | Patched threshold | This tree | Status |
| --- | --- | --- | --- |
| CVE-2025-29927 (middleware bypass) | 14.2.25 / 15.2.3 | Next 16.3.6; the proxy is not an authorization boundary and every route resolves its own principal | patched, and not relied on |
| CVE-2025-55182 (React2Shell) | React 19.0.1 / 19.1.2 / 19.2.1 (catalog `07`: 19.2.2) | React 19.3.0 | patched |
| CVE-2025-66478, 55184, 55183 | 16.0.10 or later | Next 16.3.6 | patched |
| CVE-2026-27978 (Server Actions null origin) | latest | no Server Actions in the repo (`grep "use server"` finds none) | not applicable |

**L-19, stale intelligence.** `research/cve-watchlist.md` and `guides/06-cve-tracker.md` were last refreshed 2026-04-24, and `07` on 2026-04-25. That is about 160 days, past the 120-day limit. Advisories published after April are not in the Weapon, so a clean `pnpm audit` is the only current assurance for them. Re-run `forge-weapon` for `security-guardian` to refresh. The one new runtime dependency for PRD-007, `pdf-lib@1.17.1`, is a long-established package pinned exactly, loaded lazily in the browser only; it is not a hallucinated or squatted name (Catalog A5).

## Files changed

| File | Change |
| --- | --- |
| `apps/web/src/server/homeowners/share-throttle.ts` (new) | Per-address bounded counter and the shared-report allowances (M-1) |
| `apps/web/src/server/homeowners/http.ts` | Refuse a caller past its limit before any lookup; `homeJson` takes extra headers (M-1); read the on-or-off switch with `homeReportsEnabled` (M-2) |
| `apps/web/src/app/(public)/home-report/[secret]/page.tsx` | Same allowance for the page (M-1); `homeReportsEnabled` (M-2) |
| `apps/web/src/server/homeowners/runtime.ts` | `homeReportsEnabled` (M-2) |
| `docs/operations/homeowner-avm-activation.md` | Backstop described; Vercel Firewall rule asked for before sharing live reports (M-1) |
| `share-throttle.unit.test.ts`, `shared-report-throttle.unit.test.ts`, `shared-report-environment.unit.test.ts` (new) | Tests for M-1 and M-2 |
| `not-found.integration.test.tsx`, `homeowners-review-surface.integration.test.tsx` | Page tests for M-1 and M-2; request-scope mock for the sweep |

Commits, none pushed:

- `dc8ab04` fix(web): limit how often one address can open a shared report (review M-1)
- `98ec7e2` test(web): give the shared report page a request scope in the review-surface sweep
- `f46658c` fix(web): answer a shared report link without validating unrelated settings (review M-2)
- the commit that adds this report

`git diff b5c9e19..HEAD -- apps packages docs supabase tests` was reviewed and holds only the changes above. No migration, dependency, secret, provider setting or user-visible copy for an ordinary view changed. The one new user-visible sentence, the refusal text in `http.ts`, passes the user-language guard.

## Verification run

On the final tree, Node v24.18.0:

- `vitest --project unit`: 106 files, 1076 tests passed (this includes the user-language guard)
- `vitest --project integration`: 40 files, 338 tests passed
- `vitest --project contracts`: 13 files, 107 tests passed (security suites)
- `vitest --project components`: 4 files, 39 tests passed
- `oxlint` on the changed directories and `tsc --noEmit` for `@oalo/web`: clean
- `prettier --check` on every changed file: clean
- `audit:boundaries`, `audit:secrets`, `audit:product-types` and `jscpd` (0 clones): pass
- Baseline before any change: 5 homeowner unit files, 43 tests, passing

Not run, per the run rules: `pnpm test:db`, `pnpm test:browser`, `pnpm verify`, Supabase, any server on 3100, 3210 or 3443, and any RentCast, HighLevel or Resend request.

## Recommended follow-up

- Add the Vercel Firewall rate-limit rule named in the runbook before the first live share link (motivated by M-1).
- Replace the shared report's payload with a public view type (L-1) and keep it with a database function that returns only those fields.
- Decide and record retention, export and removal rules for homeowner data before activation (L-15), and whether read access should extend beyond the creator and admin roles (L-16).
- Decide whether contact search should honour HighLevel's per-user contact restrictions (L-5).
- Verify the HighLevel version header, write key and response keys against the contact documentation before enabling delivery (L-4).
- Add handler-level tests for the cron route and for the support-role and share-origin refusals (L-9).
- Refresh the Weapon's CVE intelligence (L-19).

## Notes for `quality-guardian`

- Re-check against these fixes: the 2026-09-24 self-reviews in this folder predate them, and the share-link behaviour now includes a refusal path.
- L-2 (a repeated review request is acknowledged but not recorded) and L-12 (a blocked delivery cannot be retried) are function issues against acceptance items 7 and 9, and are yours to weigh.
- L-4 touches acceptance item 9's provider contract and is UNVERIFIED here.
- The 004e re-audit asked to be re-checked if share links, review requests or the HighLevel handoff changed. Behaviour did not change for any caller within its allowance, and what is stored, shared or sent is unchanged.

## Ordering note

This audit ran before `quality-guardian`, as required. No independent QA report exists for this branch. The implementing session's own quality reviews (`2026-09-24-quality-review.md`, `2026-09-24-authenticated-pages-quality.md`) predate these fixes and should not be treated as covering them.
