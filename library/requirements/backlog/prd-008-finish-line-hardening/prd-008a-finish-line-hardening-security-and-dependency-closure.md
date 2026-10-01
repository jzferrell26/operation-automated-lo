# PRD-008a: Finish-Line Hardening - Security and Dependency Closure

> **Parent:** [PRD-008](./prd-008-finish-line-hardening-index.md)
> **Status:** Draft
> **Priority:** P0. The dependency gate fails every pull request today.
> **Schema changes:** Additive (one migration widening a rate-limit scope list)
> **Owner Guardians:**
> - `dependency-audit-guardian`: the dependency lane
> - `security-guardian`: the code lane
> - `supabase-platform-guardian`: the migration and its pgTAP

## Goal

Return the canonical gate to green and leave no Critical, High, or Medium security finding open, in the dependency graph or in code. The second outcome closes `FSG-008` (`CRR-096`) on its own wording, per owner decision OD-1. The six Low findings from the batch audit are also closed or explicitly dispositioned, so the next audit starts from zero.

## Background (honest)

**Dependency graph.** On 2026-09-30, `pnpm audit` against the `131c7f4` lockfile reports 21 advisories:

| Severity | Package | Vulnerable | Patched | Advisory | Path |
|---|---|---|---|---|---|
| Critical | `next` | `>=16.2.0 <16.3.6` | `16.3.6` | GHSA-vcvr-r3jv-pc5j | `apps/web` direct (`16.3.3`) |
| High | `brace-expansion` | `>=4.0.0 <5.0.11` | `5.0.11` | GHSA-qhr7-859c-m2p7, GHSA-6j4f-fj2g-mc7p | `apps/tasks > trigger.dev > minimatch` |
| High | `fast-uri` | `>=3.0.0 <3.1.7` | `3.1.7` | GHSA-qw65-cvwx-89v3, GHSA-58mr-gqgx-xq4g (Dependabot #40) | `apps/tasks > trigger.dev > @modelcontextprotocol/sdk > ajv` |
| High | `undici` | `>=7.0.0 <7.29.1` | `7.29.1` | GHSA-rfgv-xxqx-mfg5, GHSA-w293-vg96-wgc3 | `jsdom` (root dev and `vitest`) |
| Moderate | `brace-expansion` | `<5.0.12` | `5.0.12` | GHSA-q2hr-2g5m-vwhr | as above |
| Moderate | `fast-uri` | `<3.1.8` | `3.1.8` | GHSA-hrr3-gc8f-f4qj | as above |
| Moderate | `ip-address` | `<=10.7.0` | `10.7.1` | GHSA-rpw4-54j3-4h4q, GHSA-2vr4-cq9g-pvrc (Dependabot #42), GHSA-j6r3-76f7-8jcv, GHSA-h3mg-xc3c-68pw | `apps/tasks > trigger.dev > @modelcontextprotocol/sdk > express-rate-limit` |
| Moderate and Low | `undici` | `<7.29.1` | `7.29.1` | eight further advisories | `jsdom` |

The Critical requires an application to pass attacker-controlled values into the Node.js `next/og` `ImageResponse`. `git grep` finds no `next/og`, no `ImageResponse`, and no `opengraph-image`, `twitter-image`, or `icon` route in `apps/` or `packages/`, so the deployed app is not affected. The upgrade is still required, because `pnpm verify` runs `pnpm audit --audit-level=high`.

Open Dependabot PR #70 carries `next` 16.3.6 and 16 other minor and patch updates. It fails four screenshot test cases from two test definitions after two retries (run `36447956877`): `tests/browser/design-quality.spec.ts:98` ("campaign-create at 390") and `:323` ("saving state"), each in Light and Dark. The dependency lane lands that group too. The baselines are redrawn once, in 008d, after every UI change.

**Code.** These findings are from the [PRD-005/006 batch security audit](../../in-work/prd-006-first-party-sign-in-and-guided-experience/qa/2026-09-19-batch-security-audit.md). Each one was still present at `131c7f4`:

| Severity | Finding | Location at `131c7f4` |
|---|---|---|
| Medium | No rate limit on change-password; a wrong current password counts against no limit | `apps/web/src/server/password-authentication-handler.ts:1470` (`handleChangePassword`) |
| Medium | A forgot-password response-time account oracle. Both paths await `lookupCredential`, but only the known-address path then awaits a further `issueToken` definer write (`:1054`) before it answers. The unknown-address path returns at `:1046`. | same file, `handleForgotPassword` at `:1011` |
| Low | `x-vercel-forwarded-for` is not read first, and a comment still calls the header unverified | same file, `clientAddressFor` at `:356` |
| Ruling 5 follow-up (not one of the six Lows) | The missing-forwarded-header line logs at `console.warn`, once per process | same file, `:364` |
| Low | Test-support modules under `apps/web/src/server/` import the owner-privileged seeding bridge | `password-authentication-support.ts:9`, `campaign-route-postgres-support.ts:18` |
| Low | `/api/version` returns build metadata to an unauthenticated caller | `apps/web/src/app/api/version/route.ts` |
| Low | The idempotent approval retry runs before the role check | `packages/application/src/campaign-approval-command.ts:198` vs `:238` |
| Low | The email preview frame has no `sandbox` attribute | `apps/web/src/app/(public)/email-preview/page.tsx:94-99` |
| Low | The password denylist is generated, not observed | `packages/auth/src/password-denylist.json` |

## Scope

- **Dependency lane:** `apps/web/package.json`, `apps/tasks/package.json`, every other `package.json` that PR #70's group touches, `pnpm-workspace.yaml`, and `pnpm-lock.yaml`. The `catalog` and `catalogs` entries in `pnpm-workspace.yaml` pin `react`, `react-dom`, `zod`, and `@types/node`, so PR #70's versions of those land there.
- **Code lane:**
  - the auth handler and its unit, integration, and Postgres tests;
  - one new migration plus its pgTAP coverage in `supabase/tests/`;
  - the approval command and its tests;
  - the email preview page;
  - the version route and its two tests;
  - the two support modules (moved or guarded);
  - the docs that document `OALO_SELF_SERVE_SIGNUP`.

## Non-Goals

- Redrawing any screenshot baseline. 008d owns the single redraw.
- Downgrading the audit gate below `--audit-level=high`, or adding an `auditConfig.ignoreCves` entry for any advisory above Low.
- Credential-stuffing detection, WAF rules, and alert routing. These are deployment controls in the operator checklist.
- Changing the sign-up duplicate-email disclosure (Ruling 1 keeps it while the route is off by default).

## Design decisions

### D1. Upgrade parents first, override only what no parent fixes, and replace stale pins

For each vulnerable transitive package, first try a parent upgrade (for example, a newer `trigger.dev` or `jsdom`). Where no released parent resolves the patched version, add a pnpm override pinned to the patched release within the same major. Confirm each result with `pnpm why <pkg>`. Next to each override, record the GHSA it answers and its removal condition: "remove when `<parent>` resolves `>=<patched>` on its own".

`pnpm-workspace.yaml` already contains entries from earlier advisory rounds that now pin vulnerable or stale versions. Replace or remove them; do not stack new entries on top:

- **Overrides:**
  - `fast-uri: 3.1.6` pins the exact release GHSA-58mr-gqgx-xq4g affects.
  - `brace-expansion: 5.0.8` and `brace-expansion@>=4.0.0 <5.0.9: ^5.0.9` both sit below the patched `5.0.12`.
- **Release-age exclusions (`minimumReleaseAgeExclude`):** `fast-uri@3.1.6`, `undici@7.29.0`, `ip-address@10.2.1 || 10.2.2 || 10.3.1`, and `brace-expansion@5.0.9`.

`pnpm-workspace.yaml:17-21` also excludes `@trigger.dev/build`, `@trigger.dev/core`, `@trigger.dev/schema-to-json`, and `@trigger.dev/sdk` at `4.5.12`, plus `trigger.dev@4.5.12`. Those entries go dead after the `4.6.4` bump in `008A-AC-004`; remove them.

The repository sets no `minimumReleaseAge` in `pnpm-workspace.yaml` or `.npmrc`, so pnpm 11's default of 1440 minutes applies. If a patched release is younger than that, add an exact-version exclusion naming the GHSA. Do not add a `minimumReleaseAge` key that lowers it.

### D1a. Why change-password guessing does not feed the lockout

The change-password limit (D2) caps current-password guessing from a stolen session, but it deliberately does not count toward the ten-failure sign-in lockout. If it did, anyone holding a stolen session could lock the real person out of their own account. That denial of service is worse than the bounded guessing the limit leaves. The ledger and the close-out security report should state this trade so a later audit does not reopen it as a gap.

### D2. `change_password_user` mirrors `resend_verification_user`

Widen the check constraint and the inline guard in the same shape as `supabase/migrations/20260919190000_verification_resend.sql:60-71`. Do not copy its constraint name. That migration dropped `auth_rate_limits_scope_check` and added `auth_rate_limits_scope_ck`, so the new migration must drop and re-add `auth_rate_limits_scope_ck`. Add `AUTH_RATE_LIMITS.change_password_user` with `attemptLimit: 10` and `windowSeconds: 900`, keyed on `principal.actorId`, and consume it before any password derivation. Ten attempts in fifteen minutes is ample for a person retyping a password and bounds the Argon2id cost to about 10 derivations per user per window.

### D3. Forgot-password: identical work before the answer

The preferred route is to move `issueToken` into the background work that already schedules the send, so both branches answer after the same synchronous work. Any route is acceptable if a test proves that neither branch awaits a database round trip the other branch does not. Padding to a fixed floor is acceptable only with a test that asserts the floor on both branches. The recovery suite is re-proven either way.

### D4. `/api/version` keeps only what the deployed proof reads

The deployed proof (005E-AC-004, ledger row `CRR-076`) reads `commit`, and expects `environment: "preview"`, from `/api/version`. The build id identifies the deployment.

- **Kept:** `environment`, `buildId`, `commit`.
- **No longer returned:** `contractVersion`, `phase`, `releaseVersions`. This applies to every caller: the route takes no request and resolves no principal, and no authenticated variant is added.

`005E-AC-003` (ledger row `CRR-075`) currently says the 200 body is "unchanged" with all six fields. PRD-005e has no Amendments section yet, so add one that amends `005E-AC-003` and cites 008A-AC-019. Update the `CRR-075` criterion text to match. In the same change, update every consumer of the removed fields:

- `tooling/tests/unit/delivery-observability/version-route.test.ts`
- `route.unit.test.ts`
- the manual smoke step at `docs/operations/cloud-environment-setup.md:155`, and any other step that reads the route

`tooling/tests/e2e-preview/` holds no `/api/version` test, so it has nothing to update.

## Acceptance criteria

### Dependency lane

| ID | Criterion |
|---|---|
| 008A-AC-001 | `apps/web/package.json` pins `next` at `16.3.6` or later, and the lockfile resolves no `next` in `>=16.2.0 <16.3.6`. |
| 008A-AC-002 | The lockfile resolves `brace-expansion >=5.0.12`, `fast-uri >=3.1.8`, `ip-address >=10.7.1`, and `undici >=7.29.1` on every path, through parent upgrades or D1 overrides. Each override records its GHSA and its removal condition. |
| 008A-AC-003 | `pnpm audit --audit-level=moderate` exits 0 on the final head, evaluated against the advisory database on the day of the final head. Advisories published during the run are in scope. Any Low advisory present on the final head is listed in the ledger with its GHSA and the reason no patched release resolves it. |
| 008A-AC-004 | Every update in PR #70's group is present at or above PR #70's version on the final head:<br>`@axe-core/playwright` 4.13.0, `@playwright/test` 1.63.0, `@testing-library/react` 16.3.3, `@testing-library/user-event` 14.6.7, `@types/node` 24.13.6, `jscpd` 5.3.2, `oxlint` 1.85.0, `prettier` 3.9.9, `turbo` 2.11.4, `zod` 4.6.5, `@trigger.dev/sdk` 4.6.4, `trigger.dev` 4.6.4, `next` 16.3.6, `react` 19.3.0, `react-dom` 19.3.0, `@types/react` 19.3.0, `@types/react-dom` 19.3.0. |
| 008A-AC-005 | `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test:unit`, `pnpm test:integration`, `pnpm test:contracts`, `pnpm build`, and `pnpm test:db` pass after the dependency lane. Every screenshot mismatch the lane causes is listed in the ledger by picture name and handed to 008d. |
| 008A-AC-006 | `verify:offline` still runs `pnpm audit --audit-level=high` or stricter, and no advisory above Low is ignored through configuration. |
| 008A-AC-007 | The final lockfile contains no version in the vulnerable range of Dependabot alert #40 (`fast-uri`) or alert #42 (`ip-address`). PR #70 has a comment linking the run's pull request and is closed as superseded. |
| 008A-AC-008 | No entry in `pnpm-workspace.yaml` `overrides` or `minimumReleaseAgeExclude` pins or excludes a version inside a vulnerable range from the Background table. The stale entries D1 names are removed or replaced, and the minimum release age is not lowered. |

### Code lane, Medium findings

ID `008A-AC-009` is intentionally unused, so the code lane starts at a round number. The ledger carries one row per criterion that exists.

| ID | Criterion |
|---|---|
| 008A-AC-010 | A new additive migration widens the `platform.auth_rate_limits` scope check constraint and the inline guard in `platform.consume_auth_rate_limit` to admit `change_password_user`. No existing scope, table, or column changes. |
| 008A-AC-011 | pgTAP proves that the widened constraint admits `change_password_user`, still rejects an unknown scope, and that `consume_auth_rate_limit` enforces the window for the new scope. |
| 008A-AC-012 | `handleChangePassword` consumes `AUTH_RATE_LIMITS.change_password_user` (10 per 900 seconds, keyed on `principal.actorId`) before any password derivation. A Postgres route test proves the eleventh attempt in the window answers `429` in the existing rate-limit response shape and performs no derivation; the test observes this through an instrumented hasher. |
| 008A-AC-013 | A test with instrumented ports proves `handleForgotPassword` performs the same awaited database work on the known-address and unknown-address branches before it answers, per D3. Response bodies, status codes, and headers stay byte-identical. |
| 008A-AC-014 | `password-recovery-handler.postgres.test.ts` passes after the change: a known address still receives a persisted, usable token, and the reset completes end to end. An unknown address persists nothing, and the existing per-address and per-email limits are unchanged. |
| 008A-AC-015 | The close-out security audit (FLH-003) records both Medium findings as closed, with the file and line of each fix. |

### Code lane, Low findings

| ID | Criterion |
|---|---|
| 008A-AC-016 | `clientAddressFor` reads `x-vercel-forwarded-for`, then `x-forwarded-for`, then `x-real-ip`, with a unit test for each precedence. The comment calling the header unverified is replaced with a citation of <https://vercel.com/docs/headers/request-headers> and the date it was checked. The comment also says this precedence is correct for Vercel, the only supported host, and that hosting anywhere else requires revisiting which header the platform sets and overwrites. |
| 008A-AC-017 | The missing-forwarded-header line is emitted with `console.error`, carries no request value, and still fires at most once per process. A unit test asserts the level. |
| 008A-AC-018 | No module that imports `packages/db/test/route-seeding-bridge.js` is reachable from a route, page, layout, or other non-test module. Either both support modules move out of `apps/web/src/`, or a guard test fails when a file under `apps/web/src/app/` transitively imports either module or the bridge. |
| 008A-AC-019 | Per D4, `GET /api/version` returns only `environment`, `buildId`, and `commit` to every caller, and keeps its existing status semantics. Both version-route unit tests and every documented step that reads the route are updated in the same change. PRD-005e gains an Amendments section that amends `005E-AC-003`, the `CRR-075` criterion text matches it, and `005E-AC-004` (`CRR-076`) can still be proved as written. |
| 008A-AC-020 | In `campaign-approval-command.ts`, the `CAMPAIGN_APPROVAL_ROLES` check runs before `matchesExistingApproval`. A principal without an approving role receives the role refusal even when an identical decision of theirs exists. An authorized approver's identical retry still returns the duplicate result, and the 005C retry tests stay green. |
| 008A-AC-021 | The email preview `<iframe>` carries `sandbox=""`, and the synthetic browser suite's axe run still reports zero violations for `/email-preview`. If `sandbox=""` fails an axe rule, use the most restrictive value that passes, and record the reason at the call site. That fallback must never combine `allow-scripts` with `allow-same-origin`, because together they let framed content remove its own sandbox. |
| 008A-AC-022 | Per OD-2's default, the close-out security report records the generated password denylist as an accepted Low residual, citing the batch audit's rationale. If the owner chose the alternative instead, the observed list replaces the generated one, its licence and source are recorded in the module header, and the policy tests pass. |
| 008A-AC-023 | Ruling 1's condition is stated in every file that `git grep -l OALO_SELF_SERVE_SIGNUP` returns, apart from test files, `qa/` and `reports/` records, and `EXECUTION_LEDGER.md`. The condition: the duplicate-email disclosure is acceptable only while sign-up is off by default, and turning it on by default requires moving to the emailed path. |
| 008A-AC-024 | A unit test proves that when the token-issuance port throws on the forgot-password path, nothing is logged, thrown, or returned that contains the token, the token hash, or the reset URL. |

## Files expected to change

- `apps/web/package.json`, `apps/tasks/package.json`, other workspace `package.json` files in PR #70's group, `pnpm-workspace.yaml` (`overrides`, `minimumReleaseAgeExclude`, `catalog`, `catalogs`), and `pnpm-lock.yaml`.
- `library/requirements/in-work/prd-005-authenticated-review-runtime/prd-005e-authenticated-review-runtime-deployed-qualification.md` (Amendments: the `005E-AC-003` shape) and the `CRR-075` criterion text in `EXECUTION_LEDGER.md`. The row's status does not change.
- `apps/web/src/server/password-authentication-handler.ts`, plus its unit, integration, and Postgres tests.
- `supabase/migrations/<timestamp>_change_password_rate_limit.sql` (new) and a pgTAP file in `supabase/tests/`.
- `packages/application/src/campaign-approval-command.ts` and its tests.
- `apps/web/src/app/(public)/email-preview/page.tsx`.
- `apps/web/src/app/api/version/route.ts`, `route.unit.test.ts`, and `tooling/tests/unit/delivery-observability/version-route.test.ts`.
- `apps/web/src/server/password-authentication-support.ts` and `apps/web/src/server/campaign-route-postgres-support.ts` (moved or guarded), and every importer.
- `docs/production-environments.md` and any other document describing `OALO_SELF_SERVE_SIGNUP`.

## Test plan

- **Unit** (`pnpm test:unit`): address-header precedence (008A-AC-016); log level (008A-AC-017); the forgot-password instrumented-port comparison (008A-AC-013); the approval role ordering (008A-AC-020); the version body (008A-AC-019); the import guard if that route is taken (008A-AC-018).
- **pgTAP and Postgres** (`pnpm test:db`): the scope constraint (008A-AC-011); the change-password 429 (008A-AC-012); the recovery suite (008A-AC-014).
- **Browser:** the email preview axe run (008A-AC-021).
- **Dependency:** `pnpm audit --audit-level=moderate` and `pnpm why` for each patched package (008A-AC-002, 008A-AC-003).

## Security notes

- The rate-limit migration is a check-constraint widening only. Re-read `consume_auth_rate_limit`'s definer body after the change to confirm the search path and grants are unchanged.
- Moving token issuance off the request path must not move the token, or any value derived from it, into a log, an error, or an audit row.

## Open questions

- [ ] None blocking.

## Related

- [Batch security audit, findings and Rulings 1, 5, 6](../../in-work/prd-006-first-party-sign-in-and-guided-experience/qa/2026-09-19-batch-security-audit.md)
- [PRD-006a](../../in-work/prd-006-first-party-sign-in-and-guided-experience/prd-006a-first-party-sign-in-and-guided-experience-email-password-auth.md)
- [PRD-005c (retry idempotency)](../../in-work/prd-005-authenticated-review-runtime/prd-005c-authenticated-review-runtime-correlation-and-retry-idempotency.md)
