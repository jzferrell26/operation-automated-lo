# QA report: PRD-007 homeowner reports (independent quality review)

**Plan document:** `library/requirements/in-work/prd-007-homeowner-reports/prd-007-homeowner-reports-index.md` (ten acceptance items), read with `docs/operations/homeowner-avm-activation.md` and the reports in this folder, including `2026-09-24-authenticated-pages-scope.md`
**Audit date:** 2026-10-01
**Criterion:** 008E-AC-006, part 2 (`quality-guardian`), PRD-008 Gauntlet run
**Base:** `566168a`, the independent security review, which was the head of `gauntlet/w3-reviews` when this audit started
**Head:** `gauntlet/w3-reviews` in worktree `oalo-g-w3rev`, at the commit that adds this report (the last commit on the branch). Remediation commits are listed under Files Changed. Nothing is pushed.
**Auditor:** `quality-guardian`, armed with `quality-weapon`
**Runtime:** Node v24.18.0 for every command run

## Arming and independence

**Arming.** Before reading any code I read `quality-weapon/SKILL.md`, the `upstream-v2/GUIDE.md` index it requires, `guides/00-principles.md`, `03-cross-reference-audit.md`, `04-five-axis-evaluation.md`, `05-severity-classification.md`, `06-report-writing.md`, the opening of `07-common-gaps.md`, and `templates/qa-report.md` with `templates/traceability-table.md`. I used the six-step procedure: locate the plan, inventory changes, cross-reference, five axes, severity, report.

**Ordering.** `security-guardian` ran first. Its report is `2026-10-01-independent-security-review.md` (PASS, Medium fixes `dc8ab04`, `98ec7e2`, `f46658c`). No independent QA report existed. The order is correct. One consequence is stated under "Departure from the default" below.

**Independence.** This review ran in a session separate from the one that implemented PRD-007 (PRs #69, #71, #72) and separate from the security reviewer's session. I wrote none of the reviewed code, none of the self-reviews and none of the security review. I read the self-reviews and the security review only to learn what was claimed and what was handed to quality (L-2, L-4, L-9, L-12, L-17), and I checked each against the code. Where a report and the code disagreed I followed the code. One example: the security review says the cron route compares its secret "before any other work", but at `566168a` the route parsed the whole homeowner settings schema first (finding W-3).

**Departure from the default.** The Weapon's default rule is "report, don't fix". This run's brief assigns remediation of defects to this reviewer, so I fixed them, each in its own small commit with the red test in the same commit. The security pass at `566168a` therefore no longer describes the final tree. `git diff 566168a..HEAD -- apps packages` changes the order of checks in the cron route, the error classification in the HighLevel adapter, how the report runtime and workspace pages treat a mistyped setting, and the order of the handoff steps. I judge each security-neutral or a hardening, but `security-guardian` should read that diff before ship.

## Summary

**Verdict: PASS WITH WARNINGS. No Critical finding.** Items 1, 3, 4, 5, 6, 7 and 10 PASS in the repository. Items 2, 8 and 9 are confirmed AWAITING CONFIGURATION: everything about them that can be proven without a live provider passes, and what remains needs a RentCast credential (2, 8) or a tenant HighLevel connection (9). The authenticated-page scope (saved report branding, Realtor partners, message drafts) PASSES.

Item 6 failed on a strict reading ("stale ... data remain visible in both outputs": the PDF printed dates but never said a source had aged) and was fixed. Four further Warnings were fixed (W-3 to W-6), all with red-first tests. Two Warnings stay open: W-2 (a repeated review request after the loan officer has resolved the first is acknowledged but not recorded) needs a database change that cannot be proven without `pnpm test:db`, and W-7 (HighLevel wire facts the repository cannot settle) is closed only by operator step 6b. Seven Warnings is past the five-Warning signal in the severity guide; five are fixed and the two open ones each have a named owner and step.

Proof that only a heavy suite provides is pending: the real-database suites and pgTAP for items 1, 5, 7 and 8, and the browser, visual and accessibility matrix for item 10. They are listed under "Not verified, pending heavy". No provider request was made and no message was sent.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | Pass | All ten items and the authenticated-page scope are traced to code and tests. Items 2, 8, 9 are complete in code; their live proof needs configuration. |
| Correctness | Pass after fixes | Amortization cross-checked independently ($300,000 at 6% for 360 months, 60 payments: payment $1,798.65, balance $279,163.07, matching the pinned 179865 and 27_916_307). W-1 (PDF omits the stale notice) and W-3 to W-6 fixed. W-2 open. |
| Alignment | Pass with Warnings | Rules named in the brief hold (see the rule sweep below). W-2 makes one activation-runbook sentence untrue in an edge case. W-7 records a conflict in the HighLevel version sources. |
| Gaps | Warnings | Scheduler, handoff and shared-link intent had no handler-level tests; 4 new suites close that. Database and browser proof pending heavy. |
| Detrimental | Pass | No regression from the three security fixes found; their tests and the whole unit, integration, contracts and components projects pass. The same operator-mistake coupling the security fix removed from the public link was still present for signed-in users (W-6, fixed). |

### Rule sweep (the stated rules, each checked in code)

| Rule | Held | Where |
| --- | --- | --- |
| Unknowns stay unknown | Yes | Nullable fields map to `null` and render "Unavailable" or "?": `rentcast.ts:106-132`, `report-view.tsx:152-175,192-200`. Missing debt is never zero: `packages/application/src/homeowner-reports.ts:25-28`. |
| No invented confidence or closed-sale prices | Yes | No confidence field exists in `HomeValuationSchema`; the provider's similarity score is not read; comparables are `priceKind: "listing"` (`packages/contracts/src/homeowner-reports.ts:119`) and labelled as listings (`report-view.tsx:183`, `report-pdf.ts:196`). |
| Equity only with known mortgage data | Yes | `application/homeowner-reports.ts:23-35`; contradictory sources refused by `HomeMortgageSchema` (`contracts:39-94`). |
| Equity, sale proceeds and borrowing capacity are separate numbers | Yes | Separate functions `domain/homeowner-finance.ts:43-71`; separate cards `report-view.tsx:221,251`. |
| Idempotent billable calls | Yes | Item 5. |
| PDF and reads never call the valuation API | Yes | `report-pdf.ts` is a pure render; `http.ts:184-199` revises with `reuseReportId`; the detail read has no valuation port. |
| Share-link rules | Yes, with W-2 | Item 7. |
| Monthly enrollment defaults off; UTC months | Yes | `migration:31`, `features/homeowners/model.ts:159-163`, `domain/homeowner-finance.ts:73-85`, `homeowner-repository.ts:83-88`. |
| HighLevel owns contacts and communication; DND; one custom field; uncertain write held | Yes | Item 9. |

## Critical Issues (must fix)

None.

## Warnings (should fix)

- [x] **W-1. The downloadable PDF never says a source has aged (item 6).** Fixed in `dc5e1a1`. `apps/web/src/features/homeowners/report-pdf.ts:149-155` (at `566168a`: after line 139)

  Item 6 asks that dates and stale or missing data remain visible in both outputs. The report on screen shows a notice when the valuation or the mortgage information is more than 35 days old (`report-view.tsx:66-75`). The PDF printed both dates but nothing said a source had aged, so a file forwarded or printed later carried no warning. It now prints the same notice in the same words under the value block, judged against the moment the file is made, with the dates beside it.

  ```ts
  // at 566168a, directly after the source paragraph:
  section("Your equity picture");
  ```

  Red first: a report whose sources were 39 days old produced a PDF with no mention of age (2 of 4 new tests failed). Test: `apps/web/src/features/homeowners/report-pdf.unit.test.ts`, which reads the text drawn on each PDF page. Rendered output changed: the PDF only.

- [ ] **W-2. A repeated review request, after the loan officer has resolved the first, is acknowledged but never recorded (item 7).** OPEN. `supabase/migrations/20260924010000_homeowner_reports.sql:118,176-181`; `packages/db/src/homeowner-repository.ts:495-507`; `apps/web/src/server/homeowners/http.ts:394-400`; `apps/web/src/features/homeowners/shared-report.tsx:27`

  The migration allows one `review_requested` event per report forever, and `record_shared_event` sets the property's review flag only when its insert was new. "Mark reviewed" clears the flag but leaves the event. A homeowner who asks again on the same report is told "Your loan officer can now see your request", and the loan officer cannot. A second request while the first is still open is deduplicated correctly, and the database tests pin that case (`repository.postgres.test.ts:284`, pgTAP "a second review request for the same report is accepted"). The edge after resolution is not pinned anywhere. The activation runbook says "An explicit review request is recorded for the loan officer" (`homeowner-avm-activation.md`, sharing section), which is untrue here.

  ```sql
  if wanted_kind='review_requested' and inserted_count=1 then   -- a duplicate never re-raises the flag
    update homeowner.properties set review_requested_at=now(),updated_at=now() where ...
  ```

  Suggested: a new additive migration after `20260930180000` that replaces `homeowner.record_shared_event` so any accepted `review_requested` call runs `update ... set review_requested_at = coalesce(review_requested_at, now()) where ... and review_requested_at is null`. The event row stays unique, a pending request is not duplicated, and a resolved one can be raised again. Add one pgTAP assertion and one `repository.postgres.test.ts` case (request, resolve, request again, flag set). Whether a re-request after resolution is meant to be possible is a product question for `library-guardian`; the PRD text ("explicit and deduplicated") does not settle it.

  Why not fixed in this run: the change is to a security-definer function on a deployed schema, its only valid proof is `pnpm test:db` and pgTAP (forbidden here), and nothing at the application layer can tell the two cases apart (`app_runtime` has no update or delete on events and the function returns only a boolean). Severity is Warning: no data is exposed or lost and the path is uncommon. Pending heavy.

- [x] **W-3. The monthly job validated every homeowner setting before it checked who was calling (item 8, adjacent).** Fixed in `0b57547`. `apps/web/src/server/homeowners/scheduler.ts:129-134` (at `566168a`: lines 120-121)

  With one mistyped setting, an anonymous caller got a 400 naming the failing setting: the same fault the shared report link had before security finding M-2. The route now reads only the two cron secret settings first, answers anyone without the secret with 401 and nothing else, then validates the rest. A caller with the secret still gets the 400, which is the signal an operator needs.

  ```ts
  const config = HomeEnvironmentSchema.parse(environment);                       // at 566168a
  if (!authorizedHomeCron(request, config)) return homeJson({ error: "UNAUTHORIZED" }, 401);
  ```

  Red first: with a mistyped allowlist and no secret the route answered 400. Test: `apps/web/src/server/homeowners/scheduler.unit.test.ts` ("answers a caller with no secret the same way whether or not a homeowner setting is mistyped"). The same file adds the handler-level proof of item 8 (14 characterization tests); each was confirmed to fail when the matching line of `scheduler.ts` was broken.

- [x] **W-4. A handoff spent the report's one attempt when its link could not be made (item 9; security L-12).** Fixed in `a8d3f81`. `apps/web/src/server/homeowners/service.ts:188-192`

  The handoff reserves the report's single allowed attempt, then makes the link. When the deployment's web address is missing or malformed, the link fails before anything is written or sent, yet the attempt was already spent, the delivery closed as blocked, and that report could never be handed off again even after the setting was fixed. The address is now checked before the attempt is taken.

  ```ts
  reportOrigin(config);                              // new: fails before the attempt is spent
  if (!(await repository.reserveDelivery(id)))
  ```

  Red first: with no web address set the attempt was reserved and the refusal came after it. Test: `apps/web/src/server/homeowners/handoff.unit.test.ts` ("does not spend the report's one attempt when the report link cannot be made"). The same file adds nine service-level tests for item 9 around the adapter, which had none.

- [x] **W-5. An unexpected HighLevel answer reached the loan officer as "check the required report fields" (item 9; security L-17).** Fixed in `9f51144`. `apps/web/src/server/homeowners/highlevel.ts:103-113,196-202` (at `566168a`: lines 99,131,142,177 used a throwing parse); `apps/web/src/server/homeowners/http.ts:123-131`

  A contact or search answer in an unexpected shape raised a raw validation error that the route turned into a 400 "Check the required report fields and their values" with the failing field named. Nothing the loan officer typed caused it, and it is the most likely first failure at live qualification (W-7). The save step also threw where the workflow step beside it correctly held the handoff as uncertain. Both now use existing sentences: a contact that could not be verified, and a handoff HighLevel did not confirm, held as uncertain, with no workflow started. No new wording.

  Red first: all three cases raised a raw validation error. Tests: `apps/web/src/server/homeowners/adapters.unit.test.ts` (`describe("an answer from HighLevel that is not the shape it was expected in")`).

- [x] **W-6. One mistyped homeowner setting stopped every workspace page, and misreported itself to signed-in users (authenticated-page scope).** Fixed in `c47987b`. `apps/web/src/server/workspace-page-data.ts:41-52` (at `566168a`: line 36); `apps/web/src/server/homeowners/runtime.ts:79-91` (at `566168a`: line 79)

  The paid-lookup allowlist and the monthly allowance are edited by an operator for each approved workspace. Every one of sixteen workspace destinations parsed the whole homeowner schema before rendering, so one typo stopped them all. The report routes answered the same fault with "Check the required report fields and their values" and the setting's name, to a loan officer who typed nothing wrong and cannot change a deployment setting. The pages now read the on-or-off switch on its own and treat an unreadable setting as a valuation and HighLevel connection that is unavailable, which they already say. The report routes answer "Homeowner reports are unavailable right now" (an existing sentence) with no field named. Well-formed settings behave as before.

  Red first: both mistyped cases threw the validation error on every page and answered 400 with the field on the report workspace. Test: `apps/web/src/server/homeowners/settings-faults.unit.test.ts`.

- [ ] **W-7. HighLevel wire facts the repository cannot settle (item 9; security L-4).** OPEN, closed only by operator step 6b. `apps/web/src/server/homeowners/highlevel.ts:69,136-141,192,214`

  I made no HighLevel request. I checked the adapter against HighLevel's documentation on 2026-10-01 (page summaries from `marketplace.gohighlevel.com/docs/ghl/contacts/`) and found a conflict between sources:

  - **Version header.** The adapter sends `Version: "v3"` (`highlevel.ts:69`). The get contact, update contact, add contact to workflow and search contacts pages list `v3` as the available option, labelled "New", with a version selector offering `2023-02-21`, `2021-07-28` and `2021-04-15`. HighLevel's published OpenAPI file (`GoHighLevel/highlevel-api-docs`, `apps/contacts.json`) lists only `2021-07-28`, and this repository's own transport uses `2021-07-28` (`packages/ghl/src/leadconnector-v2-http-transport.ts:15`). Whether the live API accepts `v3` is UNVERIFIED.
  - **Matches the v3 pages.** The adapter's `succeeded` (update contact and add-to-workflow responses; the add-to-workflow page also lists a deprecated misspelled `succeded`), its `customFields` item with `id` and `fieldValue`, and the path `POST /contacts/:contactId/workflow/:workflowId` with `eventStartTime`.
  - **Not documented in either source.** The body of `POST /contacts/search` (`locationId`, `page`, `pageLimit`, `query`, `highlevel.ts:160-166`): the OpenAPI body is empty and the page shows no fields. UNVERIFIED.
  - **Do not-disturb shape.** The OpenAPI file lists `dndSettings` keys `Call`, `Email`, `SMS`, `WhatsApp`, `GMB`, `FB` with status `active`, `inactive` or `permanent`. The adapter lower-cases keys, and allows a contact only when `dnd` is `false`, both `email` and `sms` are present and every channel is `inactive` (`highlevel.ts:136-141`). How HighLevel presents a contact with no do-not-disturb history is UNVERIFIED: if it returns no channel entries, that contact stays blocked. That fails closed and is an intentional rule of the implementation, not a defect.

  Every failure mode here is closed: a rejected header or shape stops the read before anything is written, and the post-write paths hold the handoff as uncertain (W-5). So this is a qualification risk, not a safety fault. First live check at step 6b: a read-only contact lookup with the configured version and a contact known to have explicit do-not-disturb settings, before any write.

## Suggestions (consider improving)

- [ ] **S-1. Put the estimate label beside the first mortgage figure.** `apps/web/src/features/homeowners/report-view.tsx:118-120` and `report-pdf.ts:158`

  For an estimate from loan terms, the "Estimated from original terms" label sits in the assumptions block (`report-view.tsx:285-301`), not beside the first mortgage number it qualifies. Item 3's "visible estimate label" is met. A label on the figure would be harder to miss. This changes rendered screens (see the list under Verification run).

- [ ] **S-2. Correcting a loan balance on a saved linked report requires a live HighLevel read.** `apps/web/src/server/homeowners/service.ts:38-43,50-52`

  Revising a linked homeowner's report re-verifies the contact through HighLevel even though no valuation, handoff or message is involved. With `OALO_HOMEOWNER_LIVE_DATA` unset (the documented rollback) or HighLevel unreachable, a loan officer cannot correct a balance on a saved linked report, although property-only reports still can. Consider skipping the re-verification for a revision that keeps the same contact.

- [ ] **S-3. The monthly day anchor drifts, and a late run skips a month.** `apps/web/src/server/homeowners/scheduler.ts:109`

  `nextMonthlyRefresh(now, new Date(due).getUTCDate())` anchors on the previous due day. A schedule begun on the 29th to 31st settles on the short month's day after its first short month. A run that happens after midnight UTC of the next month schedules two months ahead. One refresh per UTC calendar month still holds, so item 8 is met. Consider anchoring on the enrollment day and computing the next month from `due`.

- [ ] **S-4. An exhausted allowance pauses a property under a generic reason.** `apps/web/src/server/homeowners/scheduler.ts:118`

  `HomeownerStoreError` (allowance reached, request already attempted, lookup pending) is not a `HomeownerError`, so the pause reason is `SCHEDULE_NEEDS_REVIEW`. The property is correctly paused and not retried, but the reason shown to the loan officer is generic. The current behavior is pinned in `scheduler.unit.test.ts` and would need that case updated.

- [ ] **S-5. Remaining coverage gaps from security L-9.** Two paths still have no route-level test: contact search (`http.ts:310-327`) and the support-role refusal in `runtime.ts:73`. The cron, handoff and shared-link-origin gaps are now closed.

## Plan Item Traceability

Verdicts: PASS, FAIL, AWAITING CONFIGURATION (the item genuinely needs a live provider credential or a deployment setting). "Pending heavy" names proof only a heavy suite provides.

| # | Plan requirement | Verdict | Implementation location | Notes |
| --- | --- | --- | --- | --- |
| 007-1 | Session-derived tenant and actor, CSRF, RLS, composite keys, support and collaborator denied | PASS | `runtime.ts:61-107`, `http.ts:19-85`, `migration:8-18,136-151` | Database proof pending heavy. |
| 007-2 | Server-only RentCast, gated live data, normalization, unknowns, listings, no invented confidence | AWAITING CONFIGURATION | `runtime.ts:110-153`, `rentcast.ts:77-203` | Everything provable offline passes. Live call needs step 6a. |
| 007-3 | Equity only with known debt; debt-free declared; amortized with payments and an estimate label; liens never zero | PASS | `contracts:39-94`, `application/homeowner-reports.ts:15-42`, `domain/homeowner-finance.ts:9-41` | S-1. |
| 007-4 | Retained retrieval time, input date, source, range, disclosures, version; separate equity, proceeds, capacity; not an appraisal | PASS | `contracts:122-169`, `report-view.tsx:221-308`, `report-pdf.ts:136-229` | Version retained in the snapshot, not displayed. |
| 007-5 | Durable idempotency and fingerprints; no repeated billable call; cache; auditable usage; explicit allowance | PASS | `service.ts:63-115`, `homeowner-repository.ts:203-331` | Database proof pending heavy. |
| 007-6 | Edits reuse the prior valuation; PDF and reads make no lookup; dates and stale or missing data visible in both outputs | PASS after fix | `http.ts:184-199`, `homeowner-repository.ts:262-267`, `report-pdf.ts:149-155` | W-1 fixed in `dc5e1a1`. |
| 007-7 | Explicit, expiring, revocable, opaque share links; private headers; a visit is not intent; explicit, deduplicated review requests | PASS with W-2 | `service.ts:118-152`, `http.ts:343-405`, `migration:92-119,155-183` | Database and real-server proof pending heavy. |
| 007-8 | Enrollment off by default, pausable, UTC months; checks authority and eligibility; no blind retries; unavailable configuration not presented as delivery | AWAITING CONFIGURATION | `scheduler.ts:124-190`, `migration:31,187-204`, `vercel.json:4` | Offline parts PASS with handler proof. Live refresh needs step 6a. |
| 007-9 | HighLevel owns contact and communication; location ownership; DND; one field; configured workflow only on authorization; uncertain write held | AWAITING CONFIGURATION | `highlevel.ts:52-222`, `service.ts:154-211` | W-4, W-5 fixed. W-7 open. Live check needs step 6b. |
| 007-10 | Management, creation and branded report screens in the design system, with states, mobile, themes, keyboard, explanations, current branding defaults | PASS | `workspace.tsx`, `builder.tsx`, `report-view.tsx`, `page-brand.ts:18-27` | Browser, visual and accessibility matrix pending heavy. |
| AUTH | Authenticated pages: saved report branding, Realtor partners, message drafts | PASS | `workspace-preferences.ts:75-173`, `preference-editors.tsx:42-506`, `open-house-draft-builder.tsx:500-515` | W-6 fixed. Database and browser proof pending heavy. |
| EXT | No real provider call or customer message as an implementation test | PASS | all new tests | The run made no RentCast, HighLevel or Resend request. |

### Evidence by item

**007-1, session, tenant, roles. PASS.** The location and actor come only from the verified session: `homeRuntime` resolves the principal through `resolveAuthenticatedPrincipal` for mutations (the CSRF gate) and `resolveAuthenticatedReadPrincipal` for reads, then builds the repository on a principal-bound tenant authority (`runtime.ts:61-107`). Every action schema is `.strict()` (`http.ts:19-85`), so a body cannot name a location or actor. Support is refused at `runtime.ts:73`, writers are `location_admin` and `campaign_creator` (`runtime.ts:57-59`), and the database has forced row level security on seven tables (`migration:136-151`) with `homeowner.allowed` keyed to the session (`:8-18`), composite foreign keys and a covering index for each. Tests: `routes.postgres.test.ts:119` (denies unauthenticated, foreign-origin, missing-CSRF and read-only writes before provider access) and `:220` (revoked session); `repository.postgres.test.ts:124` and `:362`. Pending heavy: all of those, and `supabase/tests/homeowner_reports.pgtap.sql`.

**007-2, valuation source. AWAITING CONFIGURATION (confirmed).** Proven in the repository: requests run only on the server (`rentcast.ts`, no `NEXT_PUBLIC_` use) and only when `OALO_HOMEOWNER_LIVE_DATA` is `enabled`, the workspace is in `OALO_HOMEOWNER_ALLOWED_LOCATION_IDS` and a key exists (`runtime.ts:142-153`); the default allowance 0 blocks fresh lookups (`runtime.ts:35`). The adapter sends one request to a fixed host with the key in a header, refuses redirects, times out at 12 seconds and bounds the body (`rentcast.ts:158-201`). It refuses a returned address that differs in street, unit, state or ZIP (`rentcast.ts:91-105`), keeps absent fields as `null`, labels comparables `listing`, reads no similarity score and has no sample fallback (`service.ts:91-96`). I checked the request and response shape against RentCast's documentation on 2026-10-01 (`/v1/avm/value`, `X-Api-Key`, `address`, `compCount` allowed 5 to 25 and sent as 5, `lookupSubjectAttributes`, `price`, `priceRangeLow`, `priceRangeHigh`, `subjectProperty`, and comparables with `status`, `price`, `distance`, `lastSeenDate`, `formattedAddress`). RentCast labels its range an 85 percent confidence band; the product does not repeat or invent any confidence figure. Tests: `adapters.unit.test.ts:24,45,70`, `service.unit.test.ts:38,66,88,170`. What remains and needs a live credential: a real response parsed by this schema, coverage of real addresses and the provider rights the PRD names. Unblocks: operator step 6a.

**007-3, equity and loan inputs. PASS.** `HomeMortgageSchema` rejects contradictory sources (`contracts:49-94`); equity is computed only when `allLiensConfirmed` and both balances are known (`application/homeowner-reports.ts:25-35`); the form never defaults the other balance to zero and says "Enter 0 only when confirmed" (`mortgage-fields.tsx:156`, `mortgageFromDraft` leaves a blank as `null`). The amortization formula is correct and I cross-checked it independently, not only against the pinned test values. Visible estimate label: `report-view.tsx:26-31,285-301` and `mortgage-fields.tsx:143-147`; PDF `report-pdf.ts:213-227`. Tests: `finance.unit.test.ts:22,60,97`. Suggestion S-1.

**007-4, retained facts and separation. PASS.** The snapshot keeps `retrievedAt`, `source`, range, `mortgage.asOf` and `calculationVersion: "home-equity-v1"` (`contracts:122-169`). Equity, sale proceeds and borrowing room are separate functions (`domain:43-71`) shown in separate cards (`report-view.tsx:221,251`); the PDF carries equity only. The disclaimers are in both outputs (`report-view.tsx:89,304-307`, `report-pdf.ts:146,229`). Test: `finance.unit.test.ts:45`.

**007-5, idempotency and allowance. PASS.** A request fingerprint (`service.ts:63-69`) is compared to the stored one (`homeowner-repository.ts:209`); a replay returns the saved outcome and never reaches the provider (`service.ts:79-88`); a used request id is refused even after deletion (`:216-229`); one pending lookup per property (`:248-260`); a fresh valuation is reused for 30 days (`:95-100,261-269`); the usage event and the request are written in one transaction before any network call (`:305-329`); the allowance counts the UTC calendar month (`:83-88,270`). Tests: `service.unit.test.ts:106,121,170`, `database-failures.unit.test.ts:99,120`, `adapters.unit.test.ts:70` (never retries failed or uncertain valuation requests); real database: `repository.postgres.test.ts:152,206,237` and `routes.postgres.test.ts:132`. Pending heavy: the four real-database tests.

**007-6, edits, PDF and reads. PASS after fix.** A revision calls `generateHomeReport` with `reuseReportId`, so it reuses the stored valuation and spends no allowance (`http.ts:184-199`, `homeowner-repository.ts:262-267`). The PDF is a pure render in the browser (`report-pdf.ts`, `use-home-workspace.ts:230`); the detail read has no valuation port (`http.ts:328-342`). Dates: both are printed in the PDF and the report. Stale data: the report shows the notice (`report-view.tsx:66-75`); the PDF did not, and now does (W-1). Missing data: "Unavailable" and "not supplied" in both. Tests: `report-pdf.unit.test.ts` (4), `service.unit.test.ts:220`, and `routes.postgres.test.ts:191` (shares the stored valuation, provider not called). Browser PDF journey `tests/browser/homeowner-reports.spec.ts:41`: pending heavy.

**007-7, share links and review requests. PASS with W-2.** Sharing needs `confirmed: true` (`http.ts:50-54`). The secret is 32 random bytes (`runtime.ts:56`) stored as SHA-256 (`service.ts:150`), shape-checked before any lookup (`http.ts:349`), expires at the earliest of 30 days and 35 days from each source date (`service.ts:135-143`, with the database check at `migration:102`) and is rechecked on every read for expiry, revocation, active author and role (`migration:155-167`). A new link revokes the report's others under a lock (`homeowner-repository.ts:450-479`); revocation by property is `:481-494`. Responses carry no-store, noindex and no-referrer (`errors.ts:12-17`, page metadata `page.tsx:10-14`, proxy for the page). A visit records nothing: no code posts a `viewed` event, and `shared-report-intent.unit.test.ts` proves a GET records nothing. A review request is recorded only from the page's own origin, with a key and a known event name (`http.ts:369-394`); the new unit suite proves each refusal. The M-1 throttle and the M-2 switch read are regression-checked: `share-throttle.unit.test.ts`, `shared-report-throttle.unit.test.ts`, `shared-report-environment.unit.test.ts` and `not-found.integration.test.tsx` all pass, and the throttle runs before any lookup on both doors. Real database: `repository.postgres.test.ts:253,284`, `routes.postgres.test.ts:191`, pgTAP review rows. Pending heavy: those. W-2 open.

**007-8, monthly refresh. AWAITING CONFIGURATION (confirmed), offline parts PASS.** Default off: `migration:31` and the demo default `features/homeowners/model.ts:159-163`. Pause: `http.ts:227-279` (a paused or off enrollment stores no next date; only a new explicit enrollment resumes). UTC calendar month: `nextMonthlyRefresh` (`domain:73-85`, tested at `finance.unit.test.ts:172` including 29 February and a year end) and the allowance month (`homeowner-repository.ts:83-88`). Authority: the claim function re-checks the creator's active role and the workspace and takes a five-minute lease (`migration:187-204`); the handler then requires the valuation connection, and for a linked homeowner the HighLevel connection and confirmed communication permission before any lookup (`scheduler.ts:56-90`). No blind retry: a failed or uncertain lookup pauses the property under a stable per-due-date request (`scheduler.ts:93-121`), and loan details older than 35 days are dropped from the new report (`scheduler.ts:26-36`). Unavailable configuration: enrollment is refused without the connections (`http.ts:236-245`), the job answers `enabled: false` and claims nothing when reports or live data are off or the runtime is not the signed-in review runtime, and the pages say what is not connected. Handler-level proof, new in this run: `scheduler.unit.test.ts` (15 tests). Not provable offline: a real provider refresh and the production cron run (`apps/web/vercel.json:4`, `0 12 * * *`; a preview deployment does not prove it). Unblocks: operator step 6a (and 6b for delivery of a refreshed report). Pending heavy: `repository.postgres.test.ts:326`.

**007-9, HighLevel. AWAITING CONFIGURATION (confirmed), offline parts PASS.** Location ownership: the contact's `locationId` must equal the mapped location, which must equal the workspace's stored one (`highlevel.ts:115`, `runtime.ts:110-153`). Do-not-disturb: global and every channel, with email and SMS required (`highlevel.ts:136-141`), re-read after the write. One field: the body is `customFields: [{ id: <configured field>, fieldValue }]` (`highlevel.ts:192`). The workflow starts only after a confirmed read-back, and only the configured workflow (`highlevel.ts:203-226`). Explicit authorization: `deliver` and enrollment delivery need `confirmed: true` (`http.ts:55-61`) and the property-only path cannot hand off (`service.ts:168-173`). Uncertain write held: one attempt per report (`homeowner-repository.ts:521-536`), an unconfirmed attempt is recorded as `uncertain` and never repeated (`service.ts:206`), and a human acknowledges the hold (`homeowner-repository.ts:565-590`). Tests: `adapters.unit.test.ts:89,121,149,169,190,229`, and the new `handoff.unit.test.ts` (nine tests). Not provable offline: HighLevel's real answers (W-7). Unblocks: operator step 6b, which needs step 6a first.

**007-10, screens. PASS (browser matrix pending heavy).** States: loading (`loading.tsx`, `workspace.tsx:806-811`), error (`error.tsx`), empty and no-match (`workspace.tsx:171-201`), not connected (`workspace.tsx:833-868`), unavailable report (`workspace.tsx:875-881`), no saved report (`workspace.tsx:421-471`). Explanations of source and assumptions: `report-view.tsx:278-309`. Branding defaults: saved personal branding, else the setup profile, else the location name (`page-brand.ts:18-27`); saving them is `preference-editors.tsx:42-135`. Component and integration evidence passes: `report-actions.integration.test.tsx`, `refusal-messages.integration.test.tsx`, `homeowners-review-surface.integration.test.tsx` (every screen, every dialog, in the user-language contract). Pending heavy: mobile layout, both themes, keyboard use and accessibility checks, which only a browser proves: `tests/browser/homeowner-reports.spec.ts:188`, `homeowner-avm.spec.ts`, `workspace-pages.spec.ts:211`, `review/workspace-pages.spec.ts:305`, `review/homeowner-language-sweep.spec.ts`.

**AUTH, authenticated-page completion scope. PASS.** Branding, partners and message drafts are stored per user and location under a closed key allowlist, a bounded payload and an explicit revision, with exact retries idempotent and a stale write refused (`workspace-preferences.ts:75-173`); support is refused (`:77-84`), viewer roles are read-only (`:75`). Branding feeds new reports only: `page-brand.ts:18` and `preference-editors.tsx:126` ("Changes apply to new reports"), and a saved report keeps its own brand. Saved partners are selectable in the campaign builder and grant no permission (`open-house-draft-builder.tsx:500-515`, `preference-editors.tsx:187`). Drafts are per channel and never send: "Draft copied. No message was sent." (`preference-editors.tsx:382`), and `starterMessage` carries bracketed placeholders, not invented facts (`features/workspace/model.ts:98-113`). No provider call is made from these pages. W-6 fixed. Tests: `model.unit.test.ts`, `workspace-screen.integration.test.tsx`, `settings-faults.unit.test.ts`. Pending heavy: `workspace-preferences.postgres.test.ts` (9 tests) and `review/workspace-pages.spec.ts`.

## Awaiting configuration: which operator step unblocks each

Source: `library/knowledge/private/operations/finish-line-operator-checklist.md`, section 2.

| Item | What is left | Operator step | Return to report |
| --- | --- | --- | --- |
| 007-2 | One controlled live qualification of the valuation source | **6a**: set `OALO_RENTCAST_API_KEY`, an explicit `OALO_HOMEOWNER_ALLOWED_LOCATION_IDS`, a deliberate `OALO_HOMEOWNER_MONTHLY_LOOKUP_LIMIT` and `OALO_HOMEOWNER_LIVE_DATA=enabled`, then run the qualification in the activation runbook ("Enable the valuation adapter") | Yes or no for: source shown, address matches, PDF downloaded, a retry made no new lookup |
| 007-8 | A real provider refresh and a real production cron run | **6a** (the same settings; `CRON_SECRET` is already present per the final completion audit). A refreshed report reaching a homeowner also needs **6b**. | Yes or no: the daily job ran with the secret and refreshed an enrolled property once |
| 007-9 | HighLevel's real answers and one reviewed delivery | **6b**, after 6a: add one tenant-matched entry to `OALO_HOMEOWNER_GHL_CONNECTIONS_JSON` (HighLevel location id, report-link field, reviewed workflow, access token in the hosting secret store only), then set `OALO_HOMEOWNER_DELIVERY_ENABLED=enabled` only after reviewing the workflow | Yes or no: ownership and do-not-disturb checks passed, the field read back, HighLevel accepted the workflow request. Then confirm delivery inside HighLevel. Also record which `Version` value HighLevel accepted (W-7). |

Two things the checklist step 6b does not yet say, because they surfaced in this review: the first live call should be a read-only contact lookup (W-7), and `OALO_APP_URL` must be the exact permanent HTTPS origin before any handoff (after `a8d3f81` a wrong value no longer spends the report's one attempt, but the handoff still cannot proceed).

## Not verified, pending heavy

- **Real database.** `repository.postgres.test.ts`, `routes.postgres.test.ts`, `workspace-preferences.postgres.test.ts` and `supabase/tests/homeowner_reports.pgtap.sql` need `pnpm test:db`. None of my changes touches SQL, the repository or a migration, so they cannot change those results, but the integrated run should repeat `pnpm test:db` on the final tree. W-2's fix needs new tests there.
- **Browser, visual and accessibility.** `pnpm test:browser` and `pnpm test:browser:dashboard`, including the homeowner, workspace-page and language-sweep specs. My changes alter no screen, but a browser run on the final tree is the only proof of that.
- **A real server.** The M-1 throttle's 429 path against a built server (named pending heavy by the security review) is still unproven.
- **Live providers.** RentCast and HighLevel behavior (steps 6a and 6b above).
- **Not run, per the run rules:** `pnpm test:db`, `pnpm test:browser`, `pnpm verify`, Supabase, any server on ports 3100, 3210 or 3443.

## Verification run

Node v24.18.0, on the final tree before this report was committed.

- `vitest --project unit`: 111 files, 1119 tests passed (this includes the user-language guard). At `566168a` the same project had 106 files and 1076 tests; the difference is 5 new files and 43 new tests.
- `vitest --project integration`: 40 files, 338 tests passed.
- `vitest --project contracts`: 13 files, 107 tests passed.
- `vitest --project components`: 4 files, 39 tests passed.
- `tsc --noEmit -p apps/web/tsconfig.json`, `oxlint` on `apps/web/src/server/homeowners` and `apps/web/src/features/homeowners`, and `prettier --check` on every file I changed: clean.
- `audit:boundaries`, `audit:secrets`, `audit:product-types` and `jscpd` (0 clones): pass.
- Mutation checks: for the scheduler, handoff and shared-link suites I broke the matching line of production code and confirmed the matching test failed, then restored it (5, 3 and 4 mutations).

**Rendered output changed by this run.** No screen changed. One output changed: the first page of the downloaded PDF gains a bold notice line under the source note when the valuation or mortgage information is more than 35 days old (W-1); the PDF of a current report is unchanged. For the screenshot redraw: no screen needs one. If S-1 is taken later it would change the Homeowner report detail screen, the shared report page and the print view.

## Files Changed

Remediation commits, oldest first, none pushed:

- `dc5e1a1` fix(web): say in the downloadable PDF when a source is more than 35 days old (W-1)
- `0b57547` fix(web): settle who is calling the monthly job before reading homeowner settings (W-3)
- `a8d3f81` fix(web): keep a report's one HighLevel handoff when its link cannot be made (W-4)
- `9f51144` fix(web): report an unexpected HighLevel answer as HighLevel's, not as the caller's fields (W-5)
- `c47987b` fix(web): treat a mistyped homeowner setting as an unavailable connection for signed-in users (W-6)
- `cce5235` test(web): prove a shared report visit records nothing and a review request must be explicit
- the commit that adds this report

Files:

- `apps/web/src/features/homeowners/report-pdf.ts` (M): stale notice, `now` parameter (W-1)
- `apps/web/src/features/homeowners/report-pdf.unit.test.ts` (A): reads the text drawn on each PDF page
- `apps/web/src/server/homeowners/adapters.unit.test.ts` (M): HighLevel answer-shape cases (W-5)
- `apps/web/src/server/homeowners/handoff.unit.test.ts` (A): service-level proof of item 9, and W-4
- `apps/web/src/server/homeowners/highlevel.ts` (M): unexpected answers are HighLevel's, not the caller's (W-5)
- `apps/web/src/server/homeowners/runtime.ts` (M): an unreadable setting is "reports unavailable" (W-6)
- `apps/web/src/server/homeowners/scheduler.ts` (M): authorize before reading other settings (W-3)
- `apps/web/src/server/homeowners/scheduler.unit.test.ts` (A): handler-level proof of item 8, and W-3
- `apps/web/src/server/homeowners/service.ts` (M): check the report address before spending the attempt (W-4)
- `apps/web/src/server/homeowners/settings-faults.unit.test.ts` (A): W-6
- `apps/web/src/server/homeowners/shared-report-intent.unit.test.ts` (A): item 7's door
- `apps/web/src/server/workspace-page-data.ts` (M): tolerate an unreadable homeowner setting (W-6)
- `library/requirements/in-work/prd-007-homeowner-reports/reports/2026-10-01-independent-quality-review.md` (A): this report

## Overall verdict

**PASS WITH WARNINGS.** The implementation matches the plan on all ten acceptance items as far as the repository can show. Items 2, 8 and 9 are correctly labelled AWAITING CONFIGURATION: live valuation (6a), a production refresh (6a) and HighLevel delivery (6b) cannot be proven without credentials, and nothing here claims they were. Item 6 had one real defect, now fixed. Open: W-2 (needs a database change and `pnpm test:db`) and W-7 (closed by step 6b). Before ship: re-run `pnpm test:db` and the browser suites on the final tree, and have `security-guardian` read `git diff 566168a..HEAD -- apps packages`.

## Recommended follow-up

- Add the repeated-review migration and tests (W-2), after `library-guardian` confirms a re-request after resolution is intended.
- At step 6b, make the first call a read-only contact lookup and record the accepted `Version` value (W-7). If HighLevel rejects `v3`, change `highlevel.ts:69` and nothing else is affected.
- Decide whether to surface the estimate label on the figure (S-1) and to skip contact re-verification for balance corrections (S-2).
- Security's carried items L-1, L-3, L-5, L-10, L-15 and L-16 are policy or design decisions and are unchanged by this review.
