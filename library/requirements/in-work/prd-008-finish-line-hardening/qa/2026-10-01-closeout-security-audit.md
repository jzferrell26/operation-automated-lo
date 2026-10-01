# PRD-008 close-out security audit (FLH-003)

**Audit date:** 2026-10-01
**Auditor:** `security-guardian`, armed with `security-weapon` (model routing: opus, the final security gate)
**Tree audited:** `6f24a14` (worktree `oalo-g-closeout-sec`, branch `gauntlet/closeout-security`, cut from `claude/gauntlet-prd-008`)
**Run diff reviewed:** `git diff 36b58f1..6f24a14` (165 commits, 221 non-image files), plus the post-security PRD-007 fixes `git diff 566168a..43552c7`
**Versions audited:** Next.js 16.3.6, React and React DOM 19.3.0 (resolved in `pnpm-lock.yaml:2529`, `:2765`, `:2773`), Node 24.18.0
**CVE watchlist last refreshed:** 2026-04-24 (`security-weapon/research/cve-watchlist.md:3`). That is 160 days, past the Weapon's 120-day limit. See L-12.
**Mode:** audit and report only, as the orchestrator directed. The Weapon's "fix Critical and High in-session" rule did not apply; no product code, test, migration, or workflow was changed. This report is the only file this audit writes.

---

## Verdict

**FLH-003 FAILS on one Medium finding.** No Critical and no High finding exists in code or in `pnpm audit`. Both PRD-008a Medium findings are closed and proven (008A-AC-015 PASS). But the sign-in route has the same response-time account oracle that PRD-008a just removed from forgot-password: on a known address the route awaits one extra definer write (`recordSignInFailure`) that an unknown address never makes (M-1 below). It predates this run (PRD-006a, `58d77fd`), and neither the batch audit nor the authoring review caught it. It is on the final tree, so FLH-003 cannot pass, and CRR-130 cannot close, until it is fixed and re-audited.

The verdict table is at the end.

---

## Executive summary

The run's security work is sound. I checked each change the brief named against the code, and none has a Critical, High, or Medium defect:

- The change-password limit is consumed before the body is read and before any derivation.
- Forgot-password now awaits the same three round trips on both branches.
- Both migrations keep `security definer`, an empty `search_path`, and narrow grants, and pgTAP proves each of those.
- The approval role check now precedes the idempotent retry.
- `/api/version` returns three fields.
- The email preview frame is sandboxed without `allow-same-origin`.
- `pnpm audit --audit-level=moderate` and `--audit-level=low` both report no known vulnerabilities, with every stale override removed.

The one Medium (M-1) is pre-existing code the run did not touch. It matters for this gate because it is the identical defect, by mechanism and by consequence, to the forgot-password Medium that OD-1 required fixed. The batch audit's own reasoning sets its severity. I confirmed it dynamically with an instrumented-port probe, run from the scratchpad and not committed:

- On a known address, the route awaits `consumeRateLimit`, then `lookupCredential`, then `recordSignInFailure`.
- On an unknown address, it awaits only `consumeRateLimit` and `lookupCredential`.
- Both answer a byte-identical `401 {"error":"AUTH_CREDENTIALS_REJECTED"}`.

On the two known items:

- **(a) Deploy order: Low.** Failing closed is the correct and acceptable failure mode. Step 0 of the operator checklist covers it.
- **(b) The flaky test: not a product defect.** CI log evidence shows it straddled a 900-second window boundary. No path lets an unknown-address sign-in escape the limit.

---

## Arming and pre-flight

Weapon files read for this run:

- `SKILL.md`;
- `guides/00-principles.md`, with its severity rubric and never-downgrade rule;
- the section structure of guides `01` to `07`, applying catalogs A (vibe-coding), B (OWASP Top 10:2025), and C (PII and financial) to the run diff;
- `templates/security-audit-report.md`;
- `upstream-v2/GUIDE.md` and `upstream-v2/references/severity-rubric.md`;
- the freshness line of `research/cve-watchlist.md`.

The `upstream-v2` material is grounded in SvelteKit and Neon. I took its procedure and rubric and applied the React, Next.js, and Node catalogs to this code.

Documents read in full:

- the PRD-008 index (FLH-003, FLH-005, FLH-006, and the scope contract);
- `prd-008a-finish-line-hardening-security-and-dependency-closure.md`;
- `prd-006.../qa/2026-09-19-batch-security-audit.md`;
- `prd-007.../reports/2026-10-01-independent-security-review.md`;
- the CRR-130 row (`EXECUTION_LEDGER.md:629`).

**Ordering.** No `library/qa/` directory exists. This PRD's `qa/` folder holds:

- two authoring-time reviews (2026-09-30), which close nothing;
- the 008c writing review;
- the 008d baseline review.

No close-out quality report exists, so this audit is correctly ordered before `quality-guardian`.

---

## What was run

All commands ran on Node v24.18.0 through `bash -lc`.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0; tree unchanged |
| `pnpm audit --audit-level=moderate` | "No known vulnerabilities found", exit 0 |
| `pnpm audit --audit-level=low` | "No known vulnerabilities found", exit 0 |
| `vitest run --project unit --project integration --project contracts --project components` | 170 files, 1618 tests. One case timed out at 5 s under load (`tooling/tests/unit/design-quality/governed-controls.test.ts:175`). Rerun alone, it passes in 96 ms (6 of 6). No security test failed. |
| `vitest run --project contracts tests/security/` | 6 files, 35 tests passed, including all 10 cases of `provider-side-effect-default-off.test.ts` |
| `pnpm audit:secrets`, `pnpm audit:boundaries` | Both pass; the boundary fixture still rejects 2 prohibited edges |
| Definer scan over every migration (scratch script) | 56 latest function definitions. All 46 `security definer` functions set `search_path = ''`. No function body uses dynamic SQL: the only `execute pg_catalog.format(...)` calls sit in migration-time `do` blocks that format catalog-derived names with `%I`. No function is granted to `public`. |
| Hidden-Unicode scan over `.cursor/**`, `AGENTS.md`, `CLAUDE.md`, and the other rules files (3,655 files) | 5 hits, each a byte-order mark at offset 0 of an unchanged `.cursor` file. Benign; no zero-width, bidirectional, or tag characters anywhere. |
| Regex sweep of added non-test product lines | No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `NEXT_PUBLIC_`, browser storage, `console.log`, raw SQL, or `allow-same-origin` in markup |
| Sign-in instrumented-port probe | See M-1. A scratch vitest config and test in the session scratchpad, importing the handler by absolute path; nothing in the repository was written. |

Not run, per the run rules: `pnpm test:db` and `pnpm test:browser`. The database evidence instead comes from:

- CI run `36848467698` on `a37e238`, all four required checks `success`, including "Real PostgreSQL migrations and pgTAP";
- `git diff --stat a37e238..6f24a14 -- apps/web/src/server supabase packages`, which is empty, so that CI result covers the audited code. `a37e238` is an ancestor of `6f24a14`.

---

## Scorecard

| Category | Status | Findings |
|---|---|---|
| Financial / Payment Security | OK | 0. No payment surface; the Stripe charge-adapter absence is still pinned by `provider-side-effect-default-off.test.ts` |
| PII Exposure | ATTN | 1 Medium (M-1, account existence by timing); Lows carried from PRD-007 |
| Authentication & Authorization | ATTN | M-1; L-1, L-2, L-3, L-5 |
| Injection Vulnerabilities | OK | 0 |
| Dependency Security | OK | 0. `pnpm audit` is clean at low |
| Configuration & Headers | ATTN | L-4 and L-6, accepted residuals |
| Data Handling | ATTN | L-7 to L-11; PRD-007 carry-forwards |

---

## Critical findings

None detected. Specifically checked and clear:

- No secret in the diff, and `pnpm audit:secrets` passes.
- No `NEXT_PUBLIC_` variable added.
- No authentication bypass.
- No RCE surface: there are no Server Actions (`git grep "use server"` finds none), and React 19.3.0 is past every React2Shell floor.
- No unpatched Tier 0 or Tier 1 CVE.
- No hidden Unicode in any rules file.

## High findings

None detected. Specifically checked and clear:

- **IDOR.** The guided-setup binding stores a client-chosen `campaignRef` in the person's own progress (`guided-setup-provider.tsx:318`), but it is read back only through `loadWorkspaceCampaign` (`setup-preferences.ts:127`). That read is a principal-bound tenant transaction with a parameterised lookup (`packages/db/src/campaign-repository.ts:683-688`), and `projectCampaignWorkspace` refuses a foreign location. A reference from another workspace reads as `undefined`.
- **Injection.** Both migrations bind every value as a parameter or typed argument. No SQL is built from strings anywhere in the diff.
- **Token exposure.** A failed reset-token issuance after the response is swallowed without logging, rethrowing, or recording (`password-authentication-handler.ts:1141-1148`). `password-authentication-handler.unit.test.ts:323-379` scans every console level, the body, and the headers for the token, its hash, and the reset path.
- **XSS.** No new `dangerouslySetInnerHTML`. The email-preview frame is discussed under L-4.
- **Webhook signatures.** No webhook surface changed.
- **Cookie flags.** No cookie code changed.

---

## Medium findings (unresolved; FLH-003 is blocked on M-1)

### M-1. Sign-in response-time account oracle (identification failure, user enumeration)

- **Severity:** Medium.
- **File and line at `6f24a14`:**
  - `apps/web/src/server/password-authentication-handler.ts:766-772`: the known-address failure path, `await context.credentials.recordSignInFailure(...)` at `:767`.
  - The unknown-address path, `:744-749`, which throws after one dummy derivation and no database write.
  - The inaccurate claims beside them: the comment at `:718-720` ("That is what makes 'no account' and 'wrong password' indistinguishable in time as well as in the response body"), and the route comment at `apps/web/src/app/api/auth/sign-in/route.ts:14-16` ("so response time never depends on whether an account exists").
- **What is wrong.** Both branches spend one Argon2id derivation and answer a byte-identical 401. But a known address with a wrong password, or a locked account, then awaits `platform.record_password_sign_in_failure`, a definer write that updates the credential row and inserts an `auth.sign-in` denied audit row. The unknown branch makes no such round trip. The response time therefore says whether the address has an account.
- **Evidence.** The instrumented-port probe, built in the same style as the 008A-AC-013 proof, recorded these awaited calls:

  | Address | Calls awaited before the answer | Answer |
  |---|---|---|
  | known address, wrong password | `consumeRateLimit:sign_in_ip`, `lookupCredential`, `recordSignInFailure` | `401 {"error":"AUTH_CREDENTIALS_REJECTED"}` |
  | unknown address | `consumeRateLimit:sign_in_ip`, `lookupCredential` | `401 {"error":"AUTH_CREDENTIALS_REJECTED"}` |

  The routed response body is identical; only the work differs. No test pins sign-in timing equivalence: `006A-AC-013` counts derivations only.
- **Attack path.**
  1. An attacker posts `{ email, password: <anything> }` to `POST /api/auth/sign-in` for each candidate address.
  2. They measure the response time over a few samples per address.
  3. They classify each address as "has an account" when it is slower by one database round trip.

  The per-address limit (20 per 15 minutes, `:119`) slows this but does not stop it, and sign-in has no per-email limit, unlike forgot-password's 5 per hour. The Argon2id cost sits on both branches, so it adds variance but does not mask the difference. The difference grows if the function and database regions are far apart.

  Probing a real account does leave a denied audit row and counts toward its ten-failure lock. Probing a non-account leaves no trace at all.
- **Why Medium, and why not lower.** The batch audit rated the forgot-password oracle Medium (`2026-09-19-batch-security-audit.md:70`), and PRD-008a fixed it as a Medium under OD-1. M-1 has the same mechanism, one definer write awaited on the known branch alone, and the same consequence. Its exposure is if anything wider, because sign-in has no per-email cap.

  The same mitigation the batch audit weighed applies: sign-up discloses existence outright only while `OALO_SELF_SERVE_SIGNUP=enabled`, and it is off by default. So on a default deployment, M-1 is now the primary account oracle, the role the forgot-password oracle held before this run. Rating it below the finding it replaces would be the downgrade the rubric forbids. It is not High, because it discloses one bit about an address the caller already holds, and it grants no access.
- **Fix.** Make both branches await the same database work before answering, and prove it the way 008A-AC-013 proves forgot-password. Two acceptable routes:
  1. **Preferred.** Keep the failure write awaited, and add an equivalent awaited definer write on the unknown branch. For example, a new definer that records a subject-less `auth.sign-in` denied audit row. This keeps the lockout synchronous, and it also gives security Ruling 4's credential-stuffing alert the data it needs for unknown addresses. Cost: a migration, plus one name added to `RUNTIME_FUNCTION_CONTRACT_NAMES`, which needs `security-guardian` review.
  2. **Simpler.** Move `recordSignInFailure` into the `afterResponse` work the route already installs (`sign-in/route.ts:22`), as D3 did for issuance. Wrap it so a failure logs nothing that names the address. The trade, which must be recorded as accepted: the counter and the lock land after the response, so a parallel burst against one account can exceed ten guesses before the lock lands. The per-address window bounds that burst.

  Either route needs:
  - a unit test with a recording credential port, asserting identical awaited calls and byte-identical status, body, and headers on both branches;
  - the existing lockout tests (006A-AC-014) still green;
  - the two inaccurate comments corrected.

---

## Low findings and accepted residuals

New or re-rated in this audit:

- [ ] **L-1. Deploy-order dependency for change-password (known item a). Low (operational); failing closed is correct and acceptable.**
  - *Location:* `password-authentication-handler.ts:1567-1573`; `supabase/migrations/20260930180000_change_password_rate_limit.sql:51-60`, `:84-87`.
  - *What is wrong:* the old definer refuses scope `change_password_user` with 42501. If the PR #74 code reaches the hosted database first, `consumePersonLimit` throws, and the catch at `:1614-1621` answers every password change with the generic 401.
  - *Why it is acceptable:* the refusal happens after session resolution and before the body is read, so nothing is derived, written, or disclosed. Sign-in, sign-up, forgot, reset, and verify use other scopes and are unaffected. A person can still change their password through forgot-password and reset. The reverse order is safe: the migration is a pure widening, and old code never names the new scope.
  - *Why fail-closed is right:* failing open, for example by skipping the limit when the scope is refused, would silently reintroduce the closed Medium.
  - *Remaining risk:* a confusing message and an unavailable feature, not a security exposure.
  - *Fix:* already in place as operator checklist step 0 (`finish-line-operator-checklist.md:43`). Apply the migration before the merge.
- [ ] **L-2. `x-vercel-forwarded-for` read first: the platform's spoof-resistance is documented by implication, not stated. Low, NEEDS HUMAN REVIEW.**
  - *Location:* `password-authentication-handler.ts:377-414`; `apps/web/src/server/homeowners/share-throttle.ts:97-110`.
  - *What Vercel's page says* (re-fetched 2026-10-01, `last_updated` 2025-12-13): Vercel overwrites `x-forwarded-for` "to prevent IP spoofing"; `x-vercel-forwarded-for` is "identical to the `x-forwarded-for` header"; and `x-forwarded-for` "could be overwritten if you're using a proxy on top of Vercel". It does not say in so many words that a client-supplied `x-vercel-forwarded-for` is discarded.
  - *Attack path, if that reading is wrong:* reading this header first would let a caller pick a fresh rate-limit key per request, and both the sign-in limits and the share throttle would stop binding. That would be High, and a regression this run introduced.
  - *Why Low:* the documented equivalence and Vercel's ownership of the `x-vercel-*` namespace make this very unlikely, and Ruling 6 reached the same reading.
  - *Fix:* one deployed check before real accounts. On the preview deployment, send 21 sign-in requests for an address that does not exist, each with a different forged `x-vercel-forwarded-for`, from one client. The 21st must answer 429. Record the result under deployed qualification.
- [ ] **L-3. Fixed, aligned windows allow up to twice the limit in a burst across a boundary. Low, by design.**
  - *Location:* `20260930180000_change_password_rate_limit.sql:95-100` (unchanged arithmetic).
  - *What is wrong:* `consume_auth_rate_limit` aligns each window to `floor(epoch / window_seconds) * window_seconds`. A caller can spend 20 sign-ins just before a boundary and 20 just after.
  - *Why accepted:* this is inherent to fixed windows, and the per-account lockout still applies.
  - *Fix:* none required. It is recorded because it explains known item b.
- [ ] **L-4. Email preview frame keeps `allow-scripts`. Low, accepted residual under 008A-AC-021's fallback.**
  - *Location:* `apps/web/src/app/(public)/email-preview/page.tsx:113`.
  - *Why accepted:*
    - The frame never gets `allow-same-origin`, so it runs in an opaque origin.
    - A `srcdoc` document inherits this page's CSP (`script-src 'self' 'nonce-...' 'strict-dynamic'`, `apps/web/src/security/content-security-policy.ts:28-40`), so an inline script without the nonce would not run even if one existed.
    - The templates escape every value, and every input here is a fixed placeholder (`page.tsx:39-42`).
    - The page is `notFound()` outside synthetic mode.
    - The reason is recorded at the call site (`:86-108`) and pinned by `email-preview-sandbox.integration.test.tsx`.
  - *Remaining risk:* none practical.
- [ ] **L-5. Change-password's per-person window can be spent by a stolen-session holder. Low, informational.**
  - *Location:* `password-authentication-handler.ts:525-540`, `:1567-1573`.
  - *What is wrong:* the key is the person, not the session. Ten requests from a stolen session block the real person's change-password for up to 15 minutes.
  - *Why accepted:* forgot-password and reset are unaffected, and a reset revokes the other sessions. D1a's reasoning, which keeps this route out of the lockout, applies equally here.
- [ ] **L-6. `/api/version` still answers `environment`, `buildId`, and `commit` to anyone. Low, accepted residual per D4.**
  - *Location:* `apps/web/src/app/api/version/route.ts:11-19`.
  - *Why accepted:* the repository is public, and the deployed proof (005E-AC-004) needs these fields.
- [ ] **L-7. Forgot-password still does post-response work on the known branch only. Low, informational.**
  - *Location:* `password-authentication-handler.ts:1131-1170`.
  - *What is wrong:* the background issuance, audit, and send hold a database connection after the answer, which a following request could in principle feel as pool contention.
  - *Why accepted:* this is second-order and noisy, and the D3 standard (identical awaited work before the answer) is met.
- [ ] **L-8. Generated password denylist. Low, accepted residual per OD-2 (008A-AC-022).** See the dedicated section below.
- [ ] **L-9. The share throttle does not count requests that present no address, and it is per instance. Low, carried from PRD-007 M-1's residual.**
  - *Location:* `share-throttle.ts:112-118`.
  - *Why accepted:* on Vercel the header is always present. The fleet-wide limit is the Vercel Firewall rule the activation runbook already asks for.
- [ ] **L-10. Ruling 4: credential-stuffing detection. Ruling 5: alert on the missing-forwarded-header line. Both open; deployment controls.**
  - The code half of Ruling 5 is done: `console.error`, value-free, once per process (`:407-413`, test at `password-authentication-handler.unit.test.ts:97-121`).
  - Both open halves are operator checklist item 8 (`finish-line-operator-checklist.md:52`).
  - Per-address keying of a full IPv6 address is one more reason the detection is needed. This is inside Ruling 4's scope, not a new finding.
- [ ] **L-11. Byte-order marks at offset 0 of five `.cursor` files. Informational.**
  - *Location:* for example `.cursor/agents/gohighlevel-guardian.md:1`.
  - *Why accepted:* none of these files changed in the run. A leading BOM carries no hidden instruction.
- [ ] **L-12. The Weapon's CVE intelligence is stale. Low.**
  - *What is wrong:* `research/cve-watchlist.md`, `guides/06`, and `guides/07` are dated 2026-04-24 and 2026-04-25, about 160 days old, past the 120-day limit.
  - *Why accepted:* the clean `pnpm audit` at low is the current assurance for anything published since. PRD-008 lists the refresh as a non-goal, because it belongs to the Neeson repository.
  - *Fix:* re-run `forge-weapon` for `security-guardian`.

---

## Item-by-item review of the run (brief item 1)

| Surface | Result | Evidence at `6f24a14` |
|---|---|---|
| Change-password rate limit | Sound | `AUTH_RATE_LIMITS.change_password_user` 10 per 900 s (`password-authentication-handler.ts:139`). Keyed on the session actor through `rateLimitKeyHash`, so only an HMAC reaches the table (`:525-540`). Consumed after session resolution and before the body is read, so malformed bodies count too (`:1566-1575`). A refusal answers the module's one 429 body. CSRF and origin are enforced by `resolveAuthenticatedPrincipal` before the limit is spent. |
| Forgot-password post-response issuance | Sound | Both branches await `forgot_ip`, `forgot_email`, and `lookupCredential`, then generate and hash a token (`:1098-1121`). Issuance, audit, and send run inside `schedule(...)` (`:1131-1170`). A refused issuance ends silently (`:1141-1148`). The answer is byte-identical. |
| Client-address precedence and unknown bucket | Sound in code; L-2 for the platform fact | Reads `x-vercel-forwarded-for`, then `x-forwarded-for`, then `x-real-ip`, first comma entry, 1 to 100 characters (`:377-406`). Otherwise the NUL-prefixed bucket (`:374`, used at `:509`). The bucket cannot be named by a caller, because `Headers` refuses a NUL. |
| Migration `20260930180000` | Sound | Pure widening of `auth_rate_limits_scope_ck` (`:51-60`) and of the inline guard (`:84-87`). `security definer`, `set search_path = ''`, and every argument still validated: scope allowlist, `^[0-9a-f]{64}$` key, bounded limit and window (`:80-92`). `create or replace` keeps the owner and the `app_runtime`-only grant. pgTAP re-reads `prosecdef`, `proconfig`, and the grants, and denies `public` and `support_runtime` (`supabase/tests/change_password_rate_limit.pgtap.sql:111-131`). |
| Migration `20261001090000` | Sound | Same input checks: kind allowlist, then every authority check through `homeowner.read_shared_report` before any write (`:66-68`). The only change is the `review_requested_at is null` predicate (`:72`), so one open request is the most a link holder can create, and a request while one is open writes nothing. Restated `security definer`, `search_path = ''`, `revoke ... from public`, and `grant ... to app_runtime` (`:62-63`, `:77-78`). Covered by `supabase/tests/homeowner_reports.pgtap.sql:1832-1855` (execute for `app_runtime` only; `public`, `anon`, `authenticated`, and the other runtime roles refused) and `:2031-2045` (owner, definer, empty search path), with the re-request cases from `:1599`. |
| Campaign approval role check before retry | Sound | The tenant check comes first (`campaign-approval-command.ts:194-197`). The role check, with a denied audit row, precedes `matchesExistingApproval` (`:208-227`). The idempotent retry still serves an authorized approver (`:229-237`). |
| Email preview sandbox | Low residual (L-4) | `page.tsx:113` with CSP inheritance, as above. |
| `/api/version` | Sound; Low residual (L-6) | `route.ts:11-19`. The 503 branch still names no setting (`:27-33`). |
| Homeowner share throttle | Sound; Low residual (L-9) | Runs after the shape and switch checks and before any database work, on both doors (`http.ts:355-364`; `home-report/[secret]/page.tsx:24`). Memory is bounded at 10,000 addresses (`share-throttle.ts:48-62`). |
| `/home-report/[secret]` not-found | Sound | Every unusable link, including a throttled caller, reaches one `notFound()` page (`page.tsx:21-26`; `not-found.tsx:19-27`). The no-referrer, no-store, and noindex headers come from `proxy.ts:50-56` by path. |
| Guided-setup provider binding | Sound | See High: IDOR. Only the decision value newly crosses the boundary, inside the same tenant (`setup-preferences.ts:110`). |
| `open-house-draft.ts` `images: []` | Sound | `open-house-draft.ts:125`. `CampaignManifestSchema` drops `.min(1)` and keeps `.max(20)` (`packages/contracts/src/campaign-foundation.ts:272-274`). No code indexes `images[0]`. Publishing stays off by default (FLH-005). |
| D-009 and D-010 CSS; the public open-house module | Nothing security-relevant | No `url(`, `@import`, or `content:` added to any stylesheet. `synthetic-open-house-v3/page.tsx` adds a CSS module and a `<main>` landmark, behind the unchanged `canRenderSyntheticDemo()` gate. |
| PRD-007 post-security fixes (`566168a..43552c7`) | Sound, and three earlier Lows close | Cron authorization now precedes every other setting read, with `timingSafeEqual` over equal lengths (`scheduler.ts:38-55`, `:129-133`). A mistyped homeowner setting fails closed: delivery off, lookup limit 0 (`workspace-page-data.ts:41-63`, `:103-107`; `runtime.ts:79-91`). The HighLevel answer shape becomes an upstream refusal and never the caller's fields (`highlevel.ts:103-113`). An unconfirmed save is held as uncertain (`:194-202`). `reportOrigin` runs before the attempt is reserved (`service.ts:191`). The PDF stale notice adds text only (`report-pdf.ts:149-155`). |
| Other run changes read | Nothing found | `/brand` in review mode now always uses the person's own scoped preferences read (`brand/page.tsx:9-18`), and `workspacePageData` still redirects an unauthenticated caller (`workspace-page-data.ts:110-117`). `synthetic-open-house-001` answers `notFound()` in review mode, which shrinks the surface. `tests/browser/review/helpers/verification-token.ts` is test-only and guarded to the disposable database. `seeding-bridge-reachability.test.ts` keeps the owner-privileged harness out of the application graph (008A-AC-018). |

---

## 008A-AC-015: both PRD-008a Medium findings are closed

| Medium (`prd-008a...md:39-40`) | Fix at `6f24a14` | Proof |
|---|---|---|
| No rate limit on change-password | `apps/web/src/server/password-authentication-handler.ts:139` (scope budget), `:525-540` (`consumePersonLimit`), `:1567-1573` (consumed before body and derivation). `supabase/migrations/20260930180000_change_password_rate_limit.sql:51-60` (constraint), `:84-87` (definer guard). | **Unit:** `password-authentication-handler.unit.test.ts:389-538`. A malformed body, a schema failure, and a mismatched confirmation each spend a slot; the eleventh request answers `429 AUTH_RATE_LIMITED` with zero derivations. **Postgres:** `password-authentication-handler.postgres.test.ts:1157`, "answers the eleventh attempt in the window with 429 and derives nothing for it" (ten `verify`, then 429, stored count `[11]`). **pgTAP:** `supabase/tests/change_password_rate_limit.pgtap.sql`, 19 assertions: constraint, guard, window, definer settings, grants. The database results are green in CI run `36848467698` ("Real PostgreSQL migrations and pgTAP: success"), and none of this code changed after it. |
| Forgot-password response-time oracle | `apps/web/src/server/password-authentication-handler.ts:1114-1121` (both branches stop after the same three awaited calls), `:1131-1148` (issuance moved into the scheduled work, failure swallowed) | **Unit:** `password-authentication-handler.unit.test.ts:264-312` (008A-AC-013): identical awaited calls `["consumeRateLimit:forgot_ip", "consumeRateLimit:forgot_email", "lookupCredential"]` on both branches; byte-identical status, body, and headers; issuance only in the known branch's scheduled work. **Unit:** `:323-379` (008A-AC-024): nothing leaks on a failed issuance. **Postgres:** `password-recovery-handler.postgres.test.ts:237-253` (008A-AC-014): an unknown address leaves no token and no audit row after the background work drains; the known address still resets end to end. Green in the same CI run. |

**PASS.** Both are closed on their own wording. M-1 is a separate, pre-existing instance of the second Medium's class on a different route, and it does not reopen this criterion.

---

## 008A-AC-022: the generated password denylist (accepted Low residual)

- **Residual.** `packages/auth/src/password-policy.ts:8` and `packages/auth/src/password-denylist.json`: 42,831 first-party entries generated by `tooling/scripts/auth/build-password-denylist.mjs`, not observed from a breach corpus.
- **Rationale, from the batch audit** (`2026-09-19-batch-security-audit.md:82`):
  - provenance and licence are documented honestly in the module header;
  - a generated list catches fewer real-world passwords than an observed one;
  - the twelve-character floor and the personal-fragment rule carry most of the weight.
- **Owner decision.** OD-2's default (record the Low as an accepted residual, download nothing) was confirmed by the product owner on 2026-09-30 (`prd-008-finish-line-hardening-index.md:117-122`).
- **No denylist file changed in the run.** `git diff --stat 36b58f1..6f24a14 -- packages/auth/ tooling/scripts/auth/` is empty, and `git log 36b58f1..6f24a14 -- packages/auth/src/password-denylist.json` returns no commit.

**PASS.**

---

## CRR-130 (`006A-AC-034`, `EXECUTION_LEDGER.md:629`)

The row asks `security-guardian` to review, on the final tree, five things. Results:

| Item | Result on `6f24a14` |
|---|---|
| Every definer body | Pass. All 46 latest `security definer` definitions set `search_path = ''`. None contains dynamic SQL. Every one is revoked from `public`: by the blanket `revoke execute on all functions in schema ... from public` at `20260721010000_platform_foundation.sql:1741` (after every definition in that file), or explicitly in each later migration. None is granted to `public`. The only auth-schema body changed in the run is `consume_auth_rate_limit`, reviewed above. The PRD-006a migrations `20260919120000` to `20260919210000` are byte-identical to what the batch audit reviewed. |
| Allowlist additions | Pass. `RUNTIME_FUNCTION_CONTRACT_NAMES` still holds the 26 names the batch audit traced (`packages/db/src/runtime-function-query.ts:65-92`). `packages/db/src` did not change in the run, and the new scope needed no new name. |
| Hashing module | Pass. `packages/auth/src` did not change. Re-read: Argon2id at m=19456, t=2, p=1, 16-byte salt, 32-byte tag (`password-hash.ts:31-39`); length check before `timingSafeEqual` (`:137-140`); `verifyPassword` refuses lengths over 128 without deriving (`:148`); fixed dummy hash for the unknown-user path. |
| Rate limiter | Pass on the limiter itself. Scopes, keyed hashes, the unknown-address bucket, the new person scope, and the fixed-window arithmetic are all as reviewed above (L-3 is by design). |
| Sign-up disclosure decision | Pass. Ruling 1's condition is now stated in all 13 non-test files that `git grep -l OALO_SELF_SERVE_SIGNUP` returns (008A-AC-023). The flag is still off unless exactly `enabled` (`password-authentication-handler.ts:199-201`). |
| "Neither leaves an unresolved Critical, High, or Medium finding" | **Fail.** M-1 is an unresolved Medium in the PRD-006a credential path this row covers. |

The row's other condition, `pnpm verify:offline` and `pnpm test:db` green on the final tree, is the orchestrator's to cite. This audit relied on CI run `36848467698` for the database results and on the orchestrator's `verify:offline` run on `d3ce3e4`.

**CRR-130 does not pass on `6f24a14`. Leave it DONE.** It can move to VERIFIED once M-1 is fixed and a security re-audit of that fix reports no unresolved Critical, High, or Medium finding.

---

## FLH-005: no provider side effect newly enabled

- `git diff --stat 36b58f1..6f24a14 -- tests/security/` is empty. `tests/security/provider-side-effect-default-off.test.ts` last changed at `58d77fd`, before the run, and all 10 of its cases pass on this tree.
- Every added non-test line that reads a provider or delivery switch compares against the exact word `enabled`:
  - `homeReportsEnabled`, `runtime.ts:51-54`;
  - `config?.OALO_HOMEOWNER_DELIVERY_ENABLED === "enabled"`, `workspace-page-data.ts:103`;
  - the cron gate, `scheduler.ts:135-140`.

  Each newly reachable failure path fails toward off:
  - a mistyped setting turns delivery off and sets the lookup limit to 0;
  - a link that cannot be made no longer spends the handoff, and still sends nothing;
  - an unconfirmed HighLevel save is held, not retried.
- No HighLevel, Meta, Stripe, RentCast, Resend, or lead-routing call was added. No default or `.default(...)` that enables a provider appears in the product diff. The only `"enabled"` literals added outside the comparisons above are in tests, or in the disposable review-run composition, which already set `OALO_SELF_SERVE_SIGNUP` before this run (`review-browser-run.mjs:75-78` gained only a comment).

**PASS.**

---

## Known item (a): deploy order

Rated **Low (operational)** as L-1. Failing closed is the correct and acceptable failure mode:

- nothing is derived, written, or disclosed;
- every other credential route keeps working;
- a person can still change their password through reset;
- the opposite failure mode would reopen the closed Medium.

The control is operator checklist step 0 (`finish-line-operator-checklist.md:43`): apply `20260930180000` and `20261001090000` before PR #74 is merged. That step marks the hosted-migration procedure UNVERIFIED because the repository documents no exact command. That is a records gap for the operator, not a security finding.

## Known item (b): the flaky unknown-address test

**No path lets an unknown-address sign-in escape the limit.** The paths:

- `consumeAddressLimit` runs before the body is read on sign-in (`:735`) and choose (`:825`), and always substitutes the bucket when `clientAddressFor` answers undefined (`:509`).
- The database counts every call: one upsert per call on the `(scope, key_hash, window_start)` key.
- A count can restart only in these ways:
  - a new window begins;
  - the test's own `resetRateLimitKey`, which clears one key and is used only by this test for this key (`password-authentication-handler.postgres.test.ts:1604`);
  - rotating `OALO_CSRF_SERVER_SECRET`, by design;
  - the 24-hour sweep, which deletes only windows older than a day.
- Other suites run in parallel against the same database, but nothing else spends or clears this key. A concurrent spender could only make the 429 come early, never late.

**The failure is the fixed-window boundary.** The evidence:

- Screen baselines run `36844271868`, attempt 1, job "Account screens and guided setup (review project)", failed with `AssertionError: expected -1 to be 20` at `password-authentication-handler.postgres.test.ts:1616`.
- The first assertion, that the first twenty answers are 401, passed. No answer was a 429.
- The failing test lasted 858 ms and was the last test in its file. The file's report was printed at `2026-10-01T09:45:00.86Z`, so the 21 requests ran from about `09:44:59.99Z` to `09:45:00.85Z`.
- 09:45:00 UTC is a multiple of 900 seconds, which is exactly the window edge `consume_auth_rate_limit` aligns to. The 21 attempts split across two windows, and neither reached 21.

**Test-only fix,** no product change needed:

- Before the loop, read `now()` from the pool. If fewer than about 30 seconds remain in the current 900-second window, wait until the next window starts.
- Alternatively, assert on the attempt counts summed across windows.
- Apply the same guard to the other window-spending route tests: `:702` (22 attempts), `:1157` (change-password), and the forgot, sign-up, and resend limit tests.

`006A-AC-015`'s "with a fixed clock" cannot hold for this window as written, because the window comes from the database clock and not from the handler's `nowEpochSeconds`. The pgTAP proof avoids the problem by running inside one transaction (`change_password_rate_limit.pgtap.sql:192-195`).

---

## Carried forward from the PRD-007 independent security review

Statuses on `6f24a14`. Items marked NEEDS HUMAN REVIEW keep that tag.

| Item | Status on `6f24a14` | Evidence |
|---|---|---|
| L-1 Shared report payload carries fields the homeowner does not need | Open | `home-report/[secret]/page.tsx:27` still hands the whole snapshot to the client component |
| L-2 Repeated review request acknowledged but not recorded | **Closed** | `20261001090000_homeowner_review_rerequest.sql:72`; pgTAP `homeowner_reports.pgtap.sql`; CI `36848467698` green |
| L-3 Public error mapping written for signed-in callers | Open | `apps/web/src/server/homeowners/http.ts:94-150` unchanged in substance |
| L-4 HighLevel wire details UNVERIFIED | Open, UNVERIFIED (PRD-007 W-7; operator step 6b) | `highlevel.ts:69` |
| L-5 Contact search lists the location's contacts to any writer. NEEDS HUMAN REVIEW | Open, NEEDS HUMAN REVIEW | unchanged |
| L-6 `user_preferences` user scoping only in application SQL | Open | unchanged |
| L-7 Client-supplied contact name kept when the first lookup fails | Open | unchanged |
| L-8 No cap on snapshots per property. NEEDS HUMAN REVIEW | Open, NEEDS HUMAN REVIEW | unchanged |
| L-9 Coverage gaps on security-relevant code | Partly closed | Handler-level cron tests (`scheduler.unit.test.ts:135-287`), share-origin and intent tests (`shared-report-intent.unit.test.ts`), and handoff tests (`handoff.unit.test.ts`) were added. The other gaps were not re-verified one by one and are carried as open. |
| L-10 The report link is a capability URL | Open, inherent | unchanged |
| L-11 The proxy skips prefetch-flagged requests | Open | `proxy.ts:59-69` unchanged |
| L-12 A delivery attempt is spent when link creation fails | **Closed** | `service.ts:191` (`a8d3f81`); `handoff.unit.test.ts` |
| L-13 No `server-only` marker on the homeowner server modules | Open | unchanged; boundary audit passes |
| L-14 The review button's failure sentence is generic, including on a 429 | Open | `features/homeowners/shared-report.tsx:22-25` |
| L-15 Retention, export, and deletion rules not defined. NEEDS HUMAN REVIEW | Open, NEEDS HUMAN REVIEW | go-live gate for the owner |
| L-16 Roles that may read financial snapshots. NEEDS HUMAN REVIEW | Open, NEEDS HUMAN REVIEW | unchanged |
| L-17 A HighLevel shape fault reported as the caller's input error | **Closed** | `highlevel.ts:103-113` (`9f51144`); `adapters.unit.test.ts` |
| L-18 One database failure can fail a whole monthly batch's response | Open | `scheduler.ts:151-163` (`Promise.all`, `repository.list()` outside the per-property `try`) |
| L-19 Stale CVE intelligence | Open | L-12 above |

From the batch audit: Rulings 4 and 5 (part 2) stay open as deployment controls (L-10 above). Every other batch-audit Low is closed by PRD-008a (008A-AC-016 to 021, 023), except the denylist, which is the accepted residual under 008A-AC-022.

---

## Dependency audit

```text
pnpm audit --audit-level=moderate   ->  No known vulnerabilities found   (exit 0, 2026-10-01)
pnpm audit --audit-level=low        ->  No known vulnerabilities found   (exit 0, 2026-10-01)
```

- `verify:offline` still runs `pnpm audit:dependencies` = `pnpm audit --audit-level=high` (`package.json:30`, `:34`). No `auditConfig`, `ignoreCves`, or `ignoreGhsas` exists anywhere (008A-AC-006).
- Every stale override and release-age exclusion that D1 named was removed: the `pnpm-workspace.yaml` diff drops `fast-uri`, `brace-expansion`, `undici`, `ip-address`, `hono`, and `@hono/node-server`, plus the `@trigger.dev/*@4.5.12` exclusions. The remaining exclusions (`tar@7.5.21`, `postcss@8.5.23`, `nanoid@3.3.16 || 3.3.17`) are not in any vulnerable range the audit reports.
- No new dependency name entered any manifest; every manifest change is a version bump from PR #70's group.

## Next.js and React version check

| CVE | Patched threshold | This tree | Status |
|---|---|---|---|
| GHSA-vcvr-r3jv-pc5j (`next/og` `ImageResponse` RCE) | `next` 16.3.6 | 16.3.6 | patched |
| CVE-2025-29927 (middleware bypass) | 14.2.25 / 15.2.3 | 16.3.6 | patched, and not relied on: `proxy.ts` is not an authorization boundary |
| CVE-2025-55182 (React2Shell) | 19.2.1 per guide 06; 19.2.2 per guide 07 | React 19.3.0 | patched under both readings |
| CVE-2025-66478, CVE-2025-55184, CVE-2025-55183 | 16.0.10 or later | 16.3.6 | patched |
| CVE-2026-27978 (Server Actions null origin) | latest | no Server Actions | not applicable |

---

## Files changed by this audit

| File | Change |
|---|---|
| `library/requirements/in-work/prd-008-finish-line-hardening/qa/2026-10-01-closeout-security-audit.md` | This report (new) |

No product code, test, migration, workflow, `EXECUTION_LEDGER.md`, or index file was changed. The scratch probe and scan scripts live in the session scratchpad, outside the repository. `git status` was clean before this report was added. The QA folder's `README.md` table does not list this report, because the brief allowed one file; the orchestrator can add the row.

---

## Ordering note

This audit ran before `quality-guardian`, as required, and changed no code, so nothing downstream is invalidated by it. The M-1 fix will change auth code. Under the PRD-008 index's close-out rule, a security fix to auth or rate-limit code invalidates any quality result taken before it. So `quality-guardian` (FLH-004) should run after the fix lands and a security re-audit of that fix passes, not before.

---

## Verdict table

| Criterion | Verdict | Basis |
|---|---|---|
| FLH-003 | **FAIL** | No Critical or High finding in code or `pnpm audit`, but one unresolved Medium: M-1, the sign-in response-time account oracle at `password-authentication-handler.ts:766-772` |
| 008A-AC-015 | **PASS** | Both PRD-008a Mediums are closed, with file and line of each fix and passing unit, Postgres, and pgTAP proofs |
| 008A-AC-022 | **PASS** | The generated denylist is recorded as an accepted Low residual under OD-2, citing the batch audit (`:82`); no denylist file changed in the run |
| CRR-130 | **FAIL** | The definer bodies, allowlist, hashing module, rate limiter, and sign-up decision all pass review, but M-1 is an unresolved Medium in this row's credential path. Leave the row DONE. |
| FLH-005 | **PASS** | `tests/security/` unchanged and green; no provider side effect newly enabled by default |

*Generated by `security-guardian` using `security-weapon`.*

---

## Re-audit (2026-10-01) on `31c9064`

**Auditor:** `security-guardian`, armed with `security-weapon` (model routing: opus, the final security gate). I did not write any of the code under review.
**Tree audited:** `31c9064` (worktree `oalo-g-closeout-sec2`, branch `gauntlet/closeout-security-2`), the integrated run tree.
**Range reviewed in full:** `git diff 6f24a14 31c9064 -- apps packages supabase tests tooling` (27 files, 22 commits), plus the eight non-code files in the range, including the one rules file.
**Mode:** audit and report only. No product code, test, migration, workflow, or `EXECUTION_LEDGER.md` was changed; this section is the only edit.
**CVE watchlist:** still dated 2026-04-24, 160 days old (L-12, carried).

### Verdict

**M-1 is closed. FLH-003 PASSES, with zero unresolved Critical, High, or Medium findings in code and in `pnpm audit`, conditional on the orchestrator's `pnpm verify` on `31c9064` being green.** That run is the only one that executes the database half of the fix: `supabase/tests/sign_in_without_account.pgtap.sql` and the two M-1 route tests. No CI run and no ledger row covers a tree containing `d01cb40` yet, and the run rules kept `pnpm test:db` out of this audit. If those proofs fail, M-1 is not closed and this verdict does not stand.

The evidence for the closure:

- Every sign-in refusal branch now awaits the same number and kind of round trips before its answer: three, the last a definer write. My instrumented-port probe confirms this on all eleven branches below.
- Each branch answers byte-identically.
- The remaining in-database cost difference between the two writes is a few statements inside one transaction, and both transactions now commit a write. I estimate it at a small fraction of the Argon2id jitter, which moves the attack from about 20 timed requests per address to thousands. Each of those requests against a real account writes a denied audit row, and the account locks after ten.

The new definer, its migration, and the allowlist entry pass review. R6 logs nothing personal and changes no authorization decision. The test-only changes add no production path.

Three new Lows are recorded:

- **L-13:** the residual cost difference.
- **L-14:** the deploy-order window, plus checklist wording that calls the new migration "not required for safety".
- **L-15:** the silent swallow of the new write's failures.

### Pre-flight

- No `library/qa/` directory exists. This PRD's `qa/` folder gained no quality report since the first audit; the only change there is the 008c writing review. So `quality-guardian` has not run, and this re-audit is correctly ordered before it.
- `3d6588b`, the public open-house page module and its browser test, is an ancestor of `6f24a14`. The first audit already reviewed it (item table, "D-009 and D-010 CSS; the public open-house module"), and nothing under it changed in this range.

### What was run

All commands ran on Node v24.18.0 through `bash -lc`. `node_modules` was present, so no install was needed.

| Command | Result |
|---|---|
| `pnpm audit --audit-level=moderate` | "No known vulnerabilities found", exit 0 |
| `pnpm audit --audit-level=low` | "No known vulnerabilities found", exit 0 |
| `vitest run --project unit --project integration --project contracts --project components` | 172 files, 1647 tests. Two cases timed out at 5 s under load from the parallel `pnpm verify`: `tests/security/database-privilege-escalation-boundary.test.ts:78` and `tooling/tests/unit/design-quality/governed-controls.test.ts:175`. Neither file changed in the range. Rerun alone, `--project contracts tests/security/` passes 6 files and 35 tests, and the governed-controls file passes 6 of 6. |
| Focused rerun of the proof files | `password-authentication-handler.unit.test.ts`, both `setup-preferences.*.unit.test.ts` files, `runtime-function-query.test.ts`, and `seeding-bridge-reachability.test.ts`: 5 files, 37 tests pass. `auth-email-default-off.test.ts` and `provider-side-effect-default-off.test.ts`: 2 files, 22 tests pass. |
| Sign-in instrumented-port probe (scratchpad only, not committed) | Eleven branches; see the M-1 table below. It imports the handler by absolute path through a scratch vitest config, as in the first audit. |
| Argon2id derivation timing (same probe) | 60 interleaved samples each on this machine, under load. Dummy hash: mean 32.15 ms, standard deviation 3.40 ms. Real hash: mean 31.27 ms, standard deviation 3.40 ms. The means differ by 1.4 standard errors, which is not significant. |
| Definer scan over every migration (scratch script) | 57 latest function definitions, 47 of them `security definer`, up one each from `6f24a14`. All 47 set `search_path = ''`. No `execute` appears in any definer body, and no execute grant names `public`. |
| Hidden-Unicode scan of the 35 files changed in the range, including `.cursor/rules/core/the-map.mdc` | 0 zero-width, bidirectional, tag, or byte-order-mark characters |
| Regex sweep of added non-test product lines | Only the two expected `search_path` lines. No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `NEXT_PUBLIC_`, browser storage, `console.log`, dynamic SQL, or grant to `public`. |
| `gh run list` (read-only) | The newest run is `36848467698` on `a37e238`, before the fix. No CI result covers `d01cb40`, `62a5c5e`, or `31c9064` yet. |

Not run:

- `pnpm test:db` and `pnpm test:browser`, per the run rules.
- A PostgreSQL timing of the two definers. The orchestrator holds Docker for this commit, and the only running database containers belong to other projects, so I did not touch them. The cost comparison below is reasoned from the SQL, and I say so wherever it matters.

### M-1: closed

**Awaited work on every branch.** These are the probe results at `31c9064`. Each port call answers after one real macrotask. "Same 401" means status 401 and the body `{"error":"AUTH_CREDENTIALS_REJECTED"}`. Every one of these branches also returned identical headers (`cache-control`, `content-type`, and both correlation headers), scheduled nothing after the response, and wrote nothing to the console.

| Branch | Awaited before the answer | Answer |
|---|---|---|
| Unknown address | `consumeRateLimit:sign_in_ip`, `lookupCredential`, `recordSignInWithoutAccount` | same 401 |
| Suspended account. `lookup_password_credential` joins on `actor.status = 'active'` (`20260919140000_password_credentials.sql:338-362`), so no row is returned | same three as the unknown address | same 401 |
| Known address, wrong password | `consumeRateLimit:sign_in_ip`, `lookupCredential`, `recordSignInFailure` | same 401 |
| Known address, open lock, correct password | same three as the wrong password | same 401 |
| Known address, open lock, wrong password | same three as the wrong password | same 401 |
| Unknown address, function missing (42883) | same three as the unknown address | same 401 |
| Unknown address, connection lost on the write | same three as the unknown address | same 401 |
| Known address, connection lost on the failure write | same three as the wrong password | same 401 (`refusalResponse`, `password-authentication-handler.ts:705-715`, maps every unclassified error to the generic body) |
| Known address, correct password, no binding | `consumeRateLimit`, `lookupCredential`, `recordSignInSuccess`, `listSignInBindings` | same 401. Reachable only with the correct password, so it is no oracle for someone without it. |
| Schema refusal (no password) | `consumeRateLimit:sign_in_ip` only | 400 `INVALID_AUTH_REQUEST`. Decided before the lookup, so it is independent of the account. |
| Known address, correct password | four calls, as for the no-binding case | 200 and the session cookie |

The rate-limited 429 is decided before the body is read (`:792`), so it too is independent of the account. In the repository, the same shape is pinned by `password-authentication-handler.unit.test.ts:492-607` and by the route tests at `password-authentication-handler.postgres.test.ts:1721-1844`. The route tests prove that two unknown attempts leave a count of 2 under the client address's key and that a known refusal adds nothing to it. They also prove that no audit row and no counter is keyed on the email, and that the code fails closed with SQLSTATE 42883 before the migration. Those route tests are the pending `test:db` evidence.

**What each write costs inside the database.** Both writes run through `queryRuntimeFunction` (`packages/db/src/runtime-function-query.ts:151-190`): the same four protocol statements, `begin`, `set local role app_runtime`, the definer call, and `commit`. Both transactions write rows, so both commits flush WAL. Before the fix, the unknown branch had no fourth round-trip transaction at all.

| | Known: `platform.record_password_sign_in_failure` (`20260919200000_reset_completed_audit.sql:177-286`) | Unknown: `platform.record_sign_in_without_account` (`20261001120000_sign_in_without_account.sql:98-128`) |
|---|---|---|
| Statements in the body | Argument check. A primary-key probe `for update`, filtered on an open lock (`:203-208`). An `update` of the credential row (`:233-244`). `primary_location_for_user` (`:249-251`). One `insert into audit.events` (`:254-267`); on the tenth failure, a second one (`:268-281`). | Argument check. Window arithmetic. One upsert on `platform.auth_rate_limits` (`:118-126`). |
| Index entries written | The audit row adds six: the primary key, the `(location_id, id)` unique key, and the four secondary indexes at `20260721010000_platform_foundation.sql:739-745`. It also probes the `platform.locations` foreign key. | Two on the first attempt from an address in a window: the primary key and `auth_rate_limits_window_start_idx`. Later attempts update the one row version. |
| Commit | One WAL flush | One WAL flush |

The residual is about four more statements and about five more index entries inside one transaction that both branches already pay for. I estimate it at 0.1 to 0.3 ms on a warm database. **That figure is reasoned from the SQL, not measured.**

Against that, the Argon2id step alone has a standard deviation of about 3.4 ms on this machine. Telling a 0.2 ms mean difference apart at that noise level takes about 4,500 timed requests per address (two-sample, 5% significance, 80% power). Before the fix, the gap was a whole extra round-trip transaction with its own WAL flush, about 2 to 4 ms, which needs about 20 requests.

The defences do the rest:

- The per-address window (20 per 15 minutes) spreads that many requests over hundreds of address-windows.
- Against a real account, every request writes an `auth.sign-in` denied row, which is exactly what Ruling 4's alert keys on.
- The tenth request locks the account, which its owner sees.

**The oracle is defeated in practice.** The remaining difference is recorded as L-13.

**Comments.** The two comments the first audit called inaccurate are corrected: the handler's doc comment at `:768-778` and the route comment at `sign-in/route.ts:14-18`. The handler doc now states the true property, "exactly one awaited definer write". Two shorter comments still overstate it slightly, and L-13 records them.

### The new definer, migration, and allowlist entry

| Check | Result at `31c9064` |
|---|---|
| Empty `search_path` | `set search_path = ''`, `security definer`, owner `migration_owner` (`20261001120000_sign_in_without_account.sql:80`, `:102-103`). The body schema-qualifies every object: `pg_catalog.*` and `platform.auth_rate_limits`. pgTAP re-reads `prosecdef`, `proconfig`, and the owner (`sign_in_without_account.pgtap.sql:125-135`). |
| Input validation | A null key, or any key not matching `^[0-9a-f]{64}$`, raises 42501 with the one generic message (`:108-112`). The scope (`'sign_in_no_account'`) and the 900-second window are fixed in the body (`:114-123`), so the caller chooses neither. pgTAP refuses null, an email address, and uppercase hex (`:195-215`). The handler only ever passes an HMAC-SHA256 hex digest (`password-authentication-handler.ts:757-761`, `:357-363`). |
| Grants | `revoke ... from public` and `grant ... to app_runtime` (`:130-131`). pgTAP proves execute for `app_runtime`, and none for `public`, `anon`, `authenticated`, `scheduler_runtime`, `support_runtime`, or `reporting_runtime`, explicitly or by default (`:145-179`). It also proves that `app_runtime` still holds no grant on the table itself (`:180-188`). |
| Widened scope check cannot make the limiter refuse or allow on the new scope | The constraint widening is pure and keeps its name (`:83-92`; pgTAP `:69-118` re-proves all eight earlier scopes). `consume_auth_rate_limit` is not redefined. Its latest guard (`20260930180000_change_password_rate_limit.sql:84-87`) still lists eight scopes, so the new one raises 42501 there (pgTAP `:216-222`). The primary key includes `scope` (`20260919140000_password_credentials.sql:292`), so a new-scope row can never add to another scope's count. No code reads the scope: `git grep sign_in_no_account` finds only the handler's write and type comments. On the TypeScript side, `AuthAttemptCounterScope` is a separate type that `consumeRateLimit` does not accept (`credential-ports.ts:39-49`). |
| No personal data stored | The one argument is `HMAC-SHA256(OALO_CSRF_SERVER_SECRET, "rate-limit\0sign_in_no_account\0" + client address)`. That is the same kind of value the `sign_in_ip` row for the same request already holds, domain-separated by scope. Nothing derived from the email reaches the database: unit test `password-authentication-handler.unit.test.ts:529-553`, route test `password-authentication-handler.postgres.test.ts:1735-1775`. No audit row is written (pgTAP `:300-304`). Rows are swept after 24 hours by the delete in every `consume_auth_rate_limit` call (`20260930180000_change_password_rate_limit.sql:114-115`). Row growth is at most one row per client address per 15-minute window, behind the existing 20-per-window `sign_in_ip` limit. That is the same growth class as `sign_in_ip` and adds nothing new under L-10. |
| Lock class | Dropping and re-adding the check takes ACCESS EXCLUSIVE on a counter-only table for one validation. Accepted, as for `20260930180000`. |
| Allowlist entry `runtime.record-sign-in-without-account.v1` | **Approved.** It is a single static statement, `select platform.record_sign_in_without_account($1::text)`, with one bound parameter (`postgres-credential-ports.ts:264-271`). `queryRuntimeFunction` still enforces the name allowlist and `access: "read"` (`runtime-function-query.ts:156-167`). The function returns `void` and writes only platform counter rows, never tenant data, like `consume-auth-rate-limit.v1` beside it. The name sits at `:87` and is pinned by `runtime-function-query.test.ts:60-98` (27 names). |
| Swallowing a missing function, and every other failure | **Acceptable for the response, with two Lows.** The catch (`password-authentication-handler.ts:763-765`) creates no response difference: when the known branch's write fails, `refusalResponse` turns it into the same 401 (probe rows 7 and 8), and neither branch logs. It hides nothing from the client that should surface, and a database outage still fails `lookupCredential` first. It does hide a persistent failure from operators: a skipped migration or a lost grant silently removes the M-1 protection and the counter Ruling 4 needs (L-15). And in the missing-function case the rollback skips a WAL flush, so the gap partly reopens until the migration lands (L-14). |

### R6

- **No personal data, secret, or token in the logs.** The two new lines (`setup-preferences.ts:229-240`) are fixed sentences plus `failureKind`, which emits only `error.name` and `error.code`. Each must be at most 80 or 40 characters of `[A-Za-z0-9_.-]` (`:199-219`). There is never a message or a stack. Both unit files assert that the line carries no name, email, actor, session, location, or driver text (`setup-preferences.request-read.unit.test.ts:114-131`; `setup-preferences.awaiting-decision.unit.test.ts:71-90`).
- **No authorization decision changed.**
  - The approval-role check still runs before the campaign list is read (`:256`).
  - `UnauthenticatedPrincipalError` still yields the empty value (`:532`).
  - A principal known not to be an approver gets the empty value with no log (`:533-535`).
  - `canApprove` and `canCreate` still come from the session's role label (`layout.tsx:213-214`).
  - The new `campaigns_unread` standing changes only copy, and its anchor points at nothing (`step-model.ts:148-153`).
- **A caller cannot force the flag.** It is computed on the server from whether a read threw. It is read only for an authenticated shell (`layout.tsx:127-128`) and travels only as a server-rendered prop (`guided-setup-provider.tsx:505-509`). Changing it in one's own browser changes one's own copy and nothing else.

### Test-only changes

- **`withinOneRateLimitWindow` and `RATE_LIMIT_RUN_BUDGET_MS`** (`password-authentication-support.ts:257-306`) are sound. They read the database clock, refuse a budget that does not fit the window, wait out a near edge, and throw if a run still crossed one, so a count from two windows is never trusted. This is the test-only fix the first audit recommended for known item (b).
- **`readDatabaseClockMilliseconds`** (`packages/db/test/campaign-integration-support.mjs:899-920`, re-exported at `route-seeding-bridge.js:24`) runs one unelevated `select clock_timestamp()`.
- **No runtime bundle reaches either helper.** The two are imported only by the three `*.postgres.test.ts` files and the reachability test. `@oalo/db` exports only `./src/index.ts`. `seeding-bridge-reachability.test.ts` (008A-AC-018) walks the static import graph from every non-test module under `apps/web/src/`, fails if `password-authentication-support.ts` or anything under `packages/db/test/` is reachable, and passes on this tree.

### Findings

**Critical:** none detected. **High:** none detected. **Medium:** none. M-1 is closed, as shown above.

New Lows:

- [ ] **L-13. Residual in-database cost difference between the two refusal writes. Low, accepted residual.**
  - *Location:* `password-authentication-handler.ts:804-805` (unknown) against `:827-831` (known). The SQL comparison is in the table above.
  - *Failure path:* the known branch's definer runs about four more statements and writes about five more index entries than the unknown branch's, estimated at 0.1 to 0.3 ms. A related, already-present effect: parallel attempts at one real account queue on its credential row lock (`20260919200000_reset_completed_audit.sql:233`, or `:203-208` while locked), while unknown-address attempts from different client addresses touch different counter rows. The lookup's index hit or miss also differs slightly, as on forgot-password. Separating any of these needs thousands of timed requests per address, or a synchronized burst. Either way, the probes of a real account write denied audit rows and lock the account after ten.
  - *Fix:* none required. If a deployed measurement ever shows a separable gap, add a floor on refusal latency. Optionally, reword two comments to "the same number and kind of awaited round trips": the inline comment at `:802-803` ("costs what the wrong-password path costs") and the route comment at `sign-in/route.ts:17-18` ("the same database work").
- [ ] **L-14. Deploy-order window partly reopens M-1, and the checklist calls the migration "not required for safety". Low (operational), like L-1.**
  - *Location:* `password-authentication-handler.ts:745-750`, `:763-765`; `finish-line-operator-checklist.md:43` (step 0: "so nothing breaks") and `:64` (v1.4: "not required for safety").
  - *Failure path:* if the PR #74 code is deployed before `20261001120000` is applied, the unknown branch's definer call fails at parse time and the transaction rolls back without a WAL flush, while the known branch still commits a write. The gap is about the known definer's work plus one commit flush, estimated at 0.5 to 1.5 ms. Until the migration lands, that is roughly 80 to 700 timed requests per address, against 20 before the fix and thousands after it.
  - *Fix:*
    - Keep step 0's order: all three migrations before the merge. The step already asks for this.
    - Reword the v1.4 changelog line and step 0's "nothing breaks" to say that the sign-in timing protection depends on the third migration. Without it, the response stays correct, but the timing protection is only partial.
- [ ] **L-15. The no-account write swallows every failure without a trace. Low (observability).**
  - *Location:* `password-authentication-handler.ts:763-765`.
  - *Failure path:* any persistent failure leaves no signal, for example step 0 skipped, a lost grant, or a regression that sends a key the definer refuses. The M-1 protection then degrades silently (L-14), and the `sign_in_no_account` counter that Ruling 4's alert would use for unknown addresses stays empty.
  - *Fix:* inside the catch, log once per process one fixed line that carries only a short SQLSTATE token, never the address, the key, or the driver's message. Follow the pattern of the missing-forwarded-header line (`password-authentication-handler.ts:409-414`), and route it with Ruling 5's alert (checklist step 8). Keep the swallow itself.

Carried forward from the first audit:

- **L-1 to L-12:** all remain open with their existing ratings. L-2 is now an operator item in checklist step 8, with the exact 21-request check, and keeps its NEEDS HUMAN REVIEW tag. L-3's test-side consequence is fixed by `84caeda` and `78c2149`.
- **PRD-007 table:** unchanged. No file under `apps/web/src/server/homeowners/`, `apps/web/src/features/homeowners/`, or `apps/web/src/app/home-report/` changed in the range.

### Scorecard

| Category | Status | Findings |
|---|---|---|
| Financial / Payment Security | OK | 0. No payment surface changed. |
| PII Exposure | OK | 0. M-1 is closed. R6 logs only the error class and code. The new counter holds a keyed hash of the client address only. |
| Authentication & Authorization | ATTN | L-13, L-14, L-15 (new). L-1, L-2, L-3, L-5 (carried). |
| Injection Vulnerabilities | OK | 0. The new definer takes one bound parameter and contains no dynamic SQL. |
| Dependency Security | OK | 0. `pnpm audit` is clean at low. |
| Configuration & Headers | ATTN | L-4 and L-6, accepted residuals, carried |
| Data Handling | ATTN | L-7 to L-11, carried |

### 008A-AC-015, 008A-AC-022, and FLH-005 on `31c9064`

- **008A-AC-015: PASS, still.**
  - Change-password: its limit is at `password-authentication-handler.ts:140`, `consumePersonLimit` at `:535`, consumed before the body at `:1628`.
  - Forgot-password: its limits are consumed from `:1159` and its scheduled issuance is at `:1192`.
  - In this file, the range changes only three things: the parameter type of `rateLimitKeyHash`, the extraction of `countedClientAddress`, which `consumeAddressLimit` now calls with identical behaviour, and sign-in. The 008A-AC-012, 013, and 024 proofs pass in the focused rerun.
- **008A-AC-022: PASS, still.** `git diff --stat 6f24a14 31c9064 -- packages/auth/ tooling/scripts/auth/` is empty, and the OD-2 accepted residual stands.
- **FLH-005: PASS, still.** The only change under `tests/security/` is one `unreachable` stub for the new port method (`auth-email-default-off.test.ts:394`). That stub also asserts that the email-off path never calls it. `provider-side-effect-default-off.test.ts` is unchanged and passes. No added line reads a provider or delivery switch, and none adds a provider call. The only "HighLevel and Meta" text in the range is copy saying they are not connected.

### CRR-130 on `31c9064`

| Item | Result |
|---|---|
| Every definer body | **Pass.** All 47 latest `security definer` functions set `search_path = ''`, none has dynamic SQL, and none is granted to `public`. The one new body is reviewed above. |
| Allowlist additions | **Pass.** `runtime.record-sign-in-without-account.v1` is the one addition. It is reviewed and approved above, which is the `security-guardian` review `runtime-function-query.ts:67-68` asks for. |
| Hashing module | **Pass.** `packages/auth/src` is unchanged. The dummy and real derivations time the same (see What was run). |
| Rate limiter | **Pass.** `consume_auth_rate_limit` is unchanged, and the new scope is a counter that nothing can consume as a limit. |
| Sign-up disclosure decision | **Pass.** It is unchanged in the range. |
| "Neither leaves an unresolved Critical, High, or Medium finding" | **Pass.** M-1 is closed, and no new finding is above Low. |

**The review this row asks for passes on `31c9064`.** The row's other condition, `pnpm verify:offline` and `pnpm test:db` green on the final tree, is the orchestrator's to cite from its `pnpm verify` on this commit. With that cited, the row can move from DONE to VERIFIED.

### Ordering note

This re-audit changed no code, so `quality-guardian` (FLH-004) can run on `31c9064` once the orchestrator's `pnpm verify` is green. Two cases follow from the new Lows:

- **L-15's log line:** it is an auth-code change. Under the PRD-008 index's close-out rule it would need a security look and would invalidate any earlier quality result.
- **L-14's rewording:** it is documentation only and invalidates nothing.

### Verdict table (re-audit)

| Criterion | Verdict | Basis |
|---|---|---|
| FLH-003 | **PASS**, conditional on the orchestrator's `pnpm verify` on `31c9064` being green, including `sign_in_without_account.pgtap.sql` and the two M-1 route tests | Zero unresolved Critical, High, or Medium findings in code or `pnpm audit`. M-1 is closed: same awaited work and byte-identical answers on every refusal branch, and a residual estimated far below the derivation noise. Three new Lows (L-13 to L-15). |
| CRR-130 | **PASS** on the review | Definer bodies, the allowlist addition, the hashing module, the rate limiter, and the sign-up decision all pass. No unresolved Critical, High, or Medium finding. The `verify:offline` and `test:db` evidence is the orchestrator's to cite. |
| 008A-AC-015 | **PASS** | Both PRD-008a Mediums are still closed. The fixes are unchanged except for a line shift, and their proofs pass. |
| 008A-AC-022 | **PASS** | No denylist file changed. The OD-2 accepted Low residual stands. |
| FLH-005 | **PASS** | The only `tests/security/` change is one stub. No provider switch or call was added, and both security files pass. |

*Re-audit generated by `security-guardian` using `security-weapon`.*
