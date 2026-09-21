# Security Audit Report: PRD-005 and PRD-006 batch (`claude/completion-review-2026-09-19`)

**Audit date:** 2026-09-21
**Auditor:** `security-guardian` (paired weapon: `security-weapon`)
**Scope:** every change on `claude/completion-review-2026-09-19` relative to `c140f11`; audited at `d4f5a76` (698 files, 92,547 insertions, 1,884 deletions; 344 of those files are visual screen baselines)
**Next.js version audited:** 16.3.3 (`apps/web/package.json:21`, resolved in `pnpm-lock.yaml:167`)
**React version audited:** 19.2.7 and react-dom 19.2.7 (resolved in `pnpm-lock.yaml:169-173`)
**CVE watchlist last refreshed:** 2026-04-24 (`guides/06-cve-tracker.md`), 2026-04-25 (`guides/07-known-critical-cves.md`). **150 days old, past the 120-day staleness threshold. See the Executive Summary.**

---

## Executive Summary

Zero Critical and zero High findings. Nothing was remediated because nothing in the Critical or High tiers was found, and neither Medium finding is a sub-five-line fix; this batch's authentication, credential, and tenant-isolation surfaces are the strongest this repository has produced. The most important observation is therefore not a defect but a staleness warning: the CVE intelligence backing this audit is 150 days old and must be refreshed before the next run.

The batch adds the highest-risk surface the product has shipped so far: first-party email and password sign-in, a password hash, single-use credential tokens, rate-limit counters, and a self-serve sign-up route. Every one of those lives behind the same `security definer` trust boundary PRD-005b established, with `set search_path = ''`, no dynamic SQL, generic 42501 refusals, forced row level security, and no runtime grant of any kind on the three credential tables. Every statement that crosses the boundary is parameterised. Password derivation is Argon2id at the OWASP baseline through `node:crypto`, with an explicit length check before `timingSafeEqual` and a fixed dummy hash on the unknown-user path. No secret, token, hash, password, or email address reaches a log line, an audit row, a response body, or a rendered attribute anywhere in the batch.

**Staleness note:** `research/cve-watchlist.md` and `guides/06-cve-tracker.md` were last refreshed on 2026-04-24 and `guides/07-known-critical-cves.md` on 2026-04-25. At 150 days this exceeds the weapon's own 120-day threshold. Re-run `forge-weapon` for `security-guardian` before the next audit. The two guides also disagree with each other about the React 19.2.x patch floor for CVE-2025-55182 (guide 06 says 19.2.1; guide 07 says 19.2.1 is still affected and 19.2.2 is the floor). The pinned 19.2.7 clears both readings, so the disagreement did not change this audit's verdict, but it should be reconciled in the refresh.

**Ordering:** this audit ran before `quality-guardian`, as required. No `*-qa-report.md` exists for this branch in either PRD's `qa/` folder; the three reports on file are a design review, a writing review, and a runbook review, none of which this audit invalidates.

---

## Scorecard

| Category | Status | Findings |
|---|---|---|
| Financial / Payment Security | OK | 0 (not applicable: no payment surface in this batch or this product) |
| PII Exposure | OK | 0 |
| Authentication & Authorization | ATTN | 2 Medium, 1 Low |
| Injection Vulnerabilities | OK | 0 |
| Dependency Security | OK | 0 |
| Configuration & Headers | OK | 0 |
| Data Handling | ATTN | 4 Low |

Legend: **OK** = zero findings · **ATTN** = Medium/Low findings documented · **FAIL** = Critical/High findings.

---

## Critical Findings (fixed in this session)

None detected.

Specifically checked and clear: no secret, connection string, or key committed anywhere on the branch; no `NEXT_PUBLIC_` variable carrying a secret (the public-env guard at `tooling/tests/unit/delivery-observability/public-env-guard.test.ts:133-173` now has a case for every new server variable, and both name-shape and registry checks reject each one); no plaintext password column (`platform.user_credentials.password_hash` is constrained to a PHC Argon2id or scrypt shape at `supabase/migrations/20260919140000_password_credentials.sql:243-247`); no authentication bypass; no RCE surface; no unpatched Tier 0 or Tier 1 CVE; no zero-width or bidirectional Unicode in any AI rules file.

---

## High Findings (fixed in this session)

None detected.

Specifically checked and clear:

- **IDOR and object-level authorization.** No route accepts an identity from the browser. Every request schema is `.strict()`, so a `locationId`, `userId`, `role`, or `bindingId` in a body is a 400 rather than a silently ignored extra (`apps/web/src/server/password-authentication-handler.ts:202-262`; `apps/web/src/server/setup-preferences.ts:307-309`). Change-password reads the credential by session actor rather than by a supplied address (`password-authentication-handler.ts:1489`), and the workspace-choice step names an index into a server-returned closed list rather than a location (`password-authentication-handler.ts:758-771`).
- **Injection.** Every credential and session contract is a parameterised `select` against a definer function (`apps/web/src/server/postgres-credential-ports.ts:182-378`). No `db.query` template literal, no string concatenation, no dynamic SQL in any of the seven migrations. The two preference contracts interpolate only the module constants `guided_setup.v1` and `setup_profile.v1` (`setup-preferences.ts:172-178`, constants at `apps/web/src/features/guided-setup/model/progress.ts:15` and `model/profile.ts:19`) and parameterise every caller value.
- **Secret and token exposure.** The Resend API key is never logged, never wrapped into a thrown error (the thrown `fetch` value is deliberately discarded because it can carry the request headers, `apps/web/src/server/email/resend-email-adapter.ts:72-76`), and never appears in a returned value. The URL token appears in the message body and nowhere else: not in the audit row, not in a log, not in a response, not in a `Set-Cookie`. Only the SHA-256 hash crosses the database boundary.
- **Session fixation and cookie flags.** The session cookie is `__Host-` prefixed, `HttpOnly`, `Secure`, `SameSite=Lax`; the cleared cookie carries the same attributes (`password-authentication-handler.ts:495`). Setting a password revokes every other session the person holds (`supabase/migrations/20260919200000_reset_completed_audit.sql:100-125`).
- **CSRF.** The mutation gate compares exact origin, exact host, and their agreement, then a session-bound HMAC token (`packages/auth/src/browser-session.ts:203-232`). The token rendered into the page meta element is `createSessionBoundCsrfToken` output, an HMAC over the session reference, never the cookie value (`apps/web/src/app/(authenticated)/layout.tsx:166-168`, derivation at `browser-session.ts:183-192`). Sign-out and resend-verification are forms, so their token is promoted from the body into the header before the request reaches the same gate rather than a weaker copy of it (`password-authentication-handler.ts:1400-1419`).
- **XSS.** One `dangerouslySetInnerHTML` in the whole application, carrying a fixed theme bootstrap string under a per-request CSP nonce (`apps/web/src/app/layout.tsx:35`). Both transactional email templates escape every interpolated value including the person's own name (`apps/web/src/server/email/email-templates.ts:12-36`).
- **Client-side storage.** No PII and no auth material in `localStorage`, `sessionStorage`, or IndexedDB anywhere in the batch. The single stored value is a theme preference of `"light"` or `"dark"`. Three separate guards assert this: `apps/web/src/features/guided-setup/guided-setup-constraints.unit.test.ts:32`, `apps/web/src/features/auth/components/auth-forms.integration.test.tsx:328`, and `apps/web/src/features/ui-foundation/model/no-live-paths.unit.test.ts:16`.
- **Server Component data leakage.** The shell session view is an explicit DTO. The degraded-read fallback introduced by Wave 7u no longer falls back to `principal.actorRef` and `principal.locationRef` but to two fixed strings that name nobody (`apps/web/src/server/runtime-authentication.ts:637-643`), so a failed display read cannot put an internal reference on screen.
- **Privilege escalation through the test harness.** `tests/security/database-privilege-escalation-boundary.test.ts:77-125` scans every shipped source path for owner elevation and trigger switches, asserts `packages/db/test/campaign-integration-support.mjs` is the only holder, asserts it re-enables every trigger inside the same transaction and never uses a bare `set role`, and asserts it is not reachable through the `@oalo/db` export map.

---

## Medium Findings (follow-up required)

- [ ] **Broken authentication and resource exhaustion: no rate limit on change-password.** `apps/web/src/server/password-authentication-handler.ts:1463`. `handleChangePassword` is the only credential-verifying route in the module with no `consumeAddressLimit` call and no per-user counter. A caller holding a valid session can drive unbounded Argon2id derivations at 19 MiB and roughly 29 ms each, and a wrong `currentPassword` there is counted against neither `failed_attempt_count` nor the ten-failure lockout, because only `platform.record_password_sign_in_failure` writes those. This is not a channel for guessing somebody else's password: the gate requires a verified session, an exact origin and host, and a session-bound CSRF token first. The exposure is memory and CPU exhaustion by a signed-in caller, plus an uncounted current-password guessing channel for whoever holds a stolen session. *Not fixed in-session:* the fix needs a new `change_password_user` scope, and the scope list is a check constraint on `platform.auth_rate_limits` plus an inline guard in `platform.consume_auth_rate_limit`, so it is a migration and well beyond the five-line exception. Recommended: add the scope in the same shape `resend_verification_user` was added by `supabase/migrations/20260919190000_verification_resend.sql:60-71`, keyed on `principal.actorId`.

- [ ] **Identification failure: response-time account oracle on forgot-password.** `apps/web/src/server/password-authentication-handler.ts:1042`. The module's own comment states that the token is generated and hashed on both paths "so an unknown address costs the same work. Only the persistence and the send are conditional." The persistence is the problem: the known-address path awaits `issueToken`, a definer write and a full database round trip, before it answers, while the unknown-address path returns at line 1046 with no round trip at all. The bodies are byte-identical, but the response times are not, so the enumeration resistance the route is built for is defeated by measurement. The exposure is bounded by the limits at lines 121-123: twenty per address per hour and five per email address per hour. *Not fixed in-session:* the honest fixes are to move the issuance into the same scheduled work the send already runs in, or to pad both paths to a fixed floor, and neither is a five-line change nor one this Guardian should make without re-proving the recovery suite. Note the interaction with Ruling 1 below: while `OALO_SELF_SERVE_SIGNUP` is `enabled`, sign-up discloses the same fact outright and far more cheaply, so this finding only becomes the primary oracle on a deployment with sign-up off, which is the default.

---

## Low Findings (documentation only)

- [ ] **Security misconfiguration, latent: `x-vercel-forwarded-for` is not read.** `apps/web/src/server/password-authentication-handler.ts:352`. `clientAddressFor` reads `x-forwarded-for` then `x-real-ip`. Verified correct for this deployment: see Ruling 6. The residual is that Vercel documents `x-forwarded-for` as the one address header that "could be overwritten if you're using a proxy on top of Vercel", while `x-vercel-forwarded-for` is not. If a proxy is ever placed in front of this deployment, the per-address limits would key on a value the client controls, and the credential-stuffing channel the unknown-address bucket was added to close would reopen. Recommended hardening, most-specific first, purely additive and safe for the review harness (which sets `x-forwarded-for`, `apps/web/src/server/password-authentication-support.ts:177`): read `x-vercel-forwarded-for`, then `x-forwarded-for`, then `x-real-ip`. Not applied in this session: nothing is wrong on the current deployment, and a change here would require the full browser gate to re-run while another lane holds the shared Docker lock.

- [ ] **Data handling, latent: test-support modules under `apps/web/src/server/` import the owner-privileged seeding bridge.** `apps/web/src/server/password-authentication-support.ts:8` and `apps/web/src/server/campaign-route-postgres-support.ts:18` (the second is pre-existing on `main`). Both import `seedReviewCredential` and the rate-limit reset from `packages/db/test/route-seeding-bridge.js`. Today only `*.postgres.test.ts` files import either module, so neither reaches a route, a page, or a bundle, and the elevation itself stays in the one sanctioned harness file. The hazard is latent rather than live: a future route file importing either module would pull seeding into the application graph. Recommended: either move both `*-support.ts` modules out of `src/`, or add a guard test asserting that no file under `app/` transitively imports them.

- [ ] **Information disclosure: unauthenticated build metadata on `/api/version`.** `apps/web/src/app/api/version/route.ts:18`. The 200 body carries environment, build id, commit, contract version, phase, and the release manifest versions to any caller. Pre-existing on `main`; this batch only added the 503 branch, and that branch is correct, answering a fixed `CONFIGURATION_INVALID` with no Zod issues and no environment values (lines 24-31).

- [ ] **Cryptographic hygiene: the password denylist is generated rather than observed.** `packages/auth/src/password-policy.ts:8` and `packages/auth/src/password-denylist.json`. 42,831 first-party entries built by `tooling/scripts/auth/build-password-denylist.mjs` from a seed set crossed with suffix, year, name, and word-pair patterns. Provenance and licence are documented honestly in the module header, and the agent that built it recorded that it had no network access rather than claiming a corpus it did not have. A generated list catches fewer real-world passwords than an observed one. The twelve-character floor and the personal-fragment rule carry most of the weight. Recommended when somebody with network access is available: drop in SecLists `10-million-password-list-top-10000.txt` (MIT); the loader needs only an array of lowercase strings.

- [ ] **Access-control ordering: the idempotent approval retry precedes the role check.** `packages/application/src/campaign-approval-command.ts:198`. `matchesExistingApproval` returns a committed result before the `CAMPAIGN_APPROVAL_ROLES` check at line 237. It is bounded hard: the evidence must belong to the caller's own location (line 195), and the existing decision must carry the caller's own `actorRef` and the same decision value (`campaign-approval-command.ts:167-172`). No state changes and no other actor's data is returned. The only consequence is that somebody whose approving role was revoked after they decided can still read their own decision back. This ordering is pre-existing; the Wave 3b reorder preserved it and correctly split `expectedRowVersion` out of the retry comparison so a legitimate retry is not called stale on the version its own commit advanced.

- [ ] **Defence in depth: framed email HTML has no `sandbox` attribute.** `apps/web/src/app/(public)/email-preview/page.tsx:96`. The preview frames generated email HTML with `srcDoc` and no `sandbox`. There is no injection path: every input is a fixed placeholder constant (lines 41-44), the templates escape everything (`email-templates.ts:12-18`), and the route is `notFound()` outside synthetic mode. A `sandbox` attribute would be defence in depth but would interact with the deliberate decision to keep the frame in the tab order for the `frame-focusable-content` check, so it is documented rather than applied.

---

## Dependency Audit

```text
pnpm audit --prod --audit-level=high
  info 0 · low 0 · moderate 0 · high 0 · critical 0
  dependencies 110 · devDependencies 0 · optionalDependencies 40 · totalDependencies 150
  advisories: {}
```

No new runtime dependency was added by this batch. Both new capabilities that would ordinarily pull one in were written against the platform instead, and the reasoning was recorded at the call site: Argon2id through `node:crypto`'s `argon2Sync` rather than an `argon2` package (`packages/auth/src/password-hash.ts:1-27`), and one `fetch` against Resend's documented endpoint rather than the `resend` package (`apps/web/src/server/email/resend-email-adapter.ts:7-20`). The password denylist is data resolved at build time, not a dependency.

Full output: `reports/scan-output/npm-audit.json` (gitignored, ephemeral).

---

## Next.js Version Check

| CVE | Patched threshold | Current project | Status |
|---|---|---|---|
| **CVE-2025-29927** (middleware authorization bypass) | 14.2.25 / 15.2.3 | next 16.3.3 | patched |
| **CVE-2025-55182** (React2Shell RSC RCE, CVSS 10.0) | react 19.0.2 / 19.1.3 / 19.2.2 per guide 07; guide 06 says 19.2.1 | react 19.2.7 | patched under both readings |
| **CVE-2025-66478** (Next.js React2Shell companion) | latest 14.x / 15.x / 16.x with patched React | next 16.3.3 | patched |
| **CVE-2025-55184** (RSC denial of service) | 16.0.10 on the 16.x line | next 16.3.3 | patched |
| **CVE-2025-55183** (source-code exposure via Server Functions) | 16.0.10 on the 16.x line | next 16.3.3 | patched |
| **CVE-2026-27978 / GHSA-mq59-m269-xvcx** (`Origin: null` Server Actions CSRF) | latest | next 16.3.3 | patched; `experimental.serverActions.allowedOrigins` does not list `'null'`, and the application's own gate refuses a null origin independently (`packages/auth/src/browser-session.ts:216-221`) |

Versions were resolved from `pnpm-lock.yaml`, not `package.json`, as the weapon requires. Both are exact pins with no range.

Two structural notes. The middleware bypass class does not apply to this application even unpatched: `apps/web/src/proxy.ts:22-23` states in its own header that the proxy is not an authorization boundary and only hardens browser responses, and every route and page resolves its own principal through `resolveAuthenticatedPrincipal`. And the source-code exposure class is defanged by the batch's own discipline: a sweep for a hardcoded credential in any Server Action or `'use server'` body returns nothing, so there is no literal secret for 55183 to have leaked.

---

## Vibe-Coding Pattern Catalog (guide 02)

| Pattern | Result |
|---|---|
| A1 authentication vs authorization confusion | None detected |
| A2 middleware-only authorization | None detected (the proxy is explicitly not an authorization boundary; every route resolves its own principal) |
| A3 unpatched RSC deserialization | None detected (react 19.2.7) |
| A4 rules-file backdoor (hidden Unicode) | None detected; `reports/scan-output/unicode-scan.txt` clean across `.cursor/rules`, `.cursorrules`, `AGENTS.md`, `CLAUDE.md` |
| A5 hallucinated or squatted dependency | None detected; no dependency added |
| A6 Server Actions without origin validation or auth | None detected; no `'use server'` function in the batch, every mutation is a route handler behind the full gate |
| A7 overly permissive CORS | None detected; `allowedBrowserOrigins` refuses `'*'` and any non-exact origin (`browser-session.ts:216-220`) |
| A8 prototype-polluting merges | None detected; no `Object.assign` over parsed input, no lodash merge, every boundary schema is `.strict()` |

---

## PII and Financial Catalog (guide 04)

| Pattern | Result |
|---|---|
| C1 `NEXT_PUBLIC_` misuse | None detected; guard extended to every new variable |
| C2 PII in logging | None detected. Four log statements exist in runtime code and all four are value-free: the composition failure names the variable only (`runtime-authentication.ts:368-370`), the missing-address warning names the two header names only (`password-authentication-handler.ts:364-367`), the guided-setup save failure names what failed and carries only a client-side cause (`guided-setup-provider.tsx:107-109`), and the instrumentation record validates environment and build id against `^[A-Za-z0-9._:/+-]{1,128}$` and falls back to `"unknown"` (`apps/web/src/instrumentation.ts:8-23`). `onRequestError` logs a fixed event name and no error detail at all |
| C3 PII in URL query parameters | None detected. The two token-bearing paths carry an opaque token and never an address, and both receive `Referrer-Policy: no-referrer` and `Cache-Control: no-store` (`apps/web/src/proxy.ts:51-54`) |
| C4 over-fetching | None detected; every definer read returns a named column list |
| C5 Stripe and PCI | Not applicable; no payment surface |
| C6 unencrypted PII in client storage | None detected |
| C7 missing field-level authorization | None detected. `platform.unverified_email_display_for_user` is the narrowest possible read: it returns null for a person with no credential, an inactive person, and a confirmed address, so it can state nothing about a confirmed account (`supabase/migrations/20260919190000_verification_resend.sql:185-198`) |
| C8 Server Components leaking to the client bundle | None detected |
| C9 GDPR erasure and portability | Documented rather than absent. `docs/operations/retention-and-deletion.md` and `docs/operations/export.md` were both extended by this batch, and each of the three new tables carries a table comment naming itself to the retention, deletion, and export runbooks (`20260919140000_password_credentials.sql:1130-1135`). `platform.user_preferences` deliberately grants no `delete` to `app_runtime`; owner-privileged deletion for a subject request stays with the migration login under the runbook |

---

## Migration Trust Boundary Review

All seven migrations were read in full. Every function across them is owned by `migration_owner`, is `security definer` with `set search_path = ''`, contains no dynamic SQL, and refuses with errcode 42501 and one generic message. Specific confirmations the sub-PRDs asked for:

- **Grants.** `platform.user_credentials`, `platform.credential_tokens`, and `platform.auth_rate_limits` hold no grant of any kind for `app_runtime` or `support_runtime`; all three have RLS enabled and forced, with a single `migration_owner` policy. `platform.primary_location_for_user` is deliberately revoked from `public` and granted to nobody, because it is only called from inside the definer bodies (`20260919140000_password_credentials.sql:1084-1090`).
- **Single-use token.** `platform.consume_credential_token` is one atomic `update` whose predicate includes `consumed_at is null`, so two concurrent calls serialise on the row and exactly one wins; no row means refused, and refused is one answer whatever the reason (`20260919140000_password_credentials.sql:637-650`).
- **Lockout.** Ten consecutive failures lock for fifteen minutes. Wave 7j's rewrite closed a real denial of service: the original counter refreshed `locked_until` on every failure past the tenth, so anyone posting to a known address could hold it locked indefinitely at one request per fifteen minutes with no password at all. An attempt made during an open lock now writes the same denied audit row and changes neither the counter nor the lock (`20260919200000_reset_completed_audit.sql:200-231`). The route keeps its own generic refusal above it, and the comment correctly explains why the database is the layer that owns the rule.
- **Audit vocabulary.** `set_password` now writes `auth.reset-completed` for a reset and `auth.password-changed` for a change, and neither for an initial password. No password, hash, token, or address reaches an audit row; the subject stays the canonical `actor_<hex>` reference.
- **Role check.** `20260919180000_first_party_session_role_check.sql:104-112` refuses a session role the binding role does not map to. The `CASE` mirrors `packages/auth/src/role-binding-map.ts:29-36` exactly: five mapped pairs, `realtor_collaborator` to `null`, and `is distinct from` a null result refuses. `platform_support` has no binding role and so can never be issued a tenant session.
- **Policy identity reads.** `platform.password_policy_identity_for_reset_token` applies the same four liveness guards as the consume beside it, fixes the purpose at `password_reset`, writes nothing, and answers zero rows for an unknown hash (`20260919210000_password_policy_identity.sql:96-113`). The reset flow reads identity, evaluates the policy, and only then consumes, so a policy failure leaves the token usable (`password-authentication-handler.ts:1146-1163`).
- **Allowlist.** `RUNTIME_FUNCTION_CONTRACT_NAMES` holds twenty-six names (`packages/db/src/runtime-function-query.ts:68-94`). Each was traced to its caller: the only two modules in the repository that call `queryRuntimeFunction` are `postgres-authentication-ports.ts` and `postgres-credential-ports.ts`, and every name is reached from a pre-session path or from a path holding a verified session whose own actor id is the only identifier passed. The two names added by Wave 7u appear exactly once each.
- **Tenant isolation.** `platform.user_preferences` takes the ordinary three-policy shape keyed on `platform.tenant_matches(location_id)`, with no `delete` grant. Both the read and the write supply `principal.locationId` and `principal.actorId` from the verified principal, never from the body, and the request schemas are `.strict()` so a body naming either is a 400 (`setup-preferences.ts:262-284`, `307-309`).

---

## Later-Wave and Salvaged-Lane Review

The four lanes merged after the 2026-09-21 workstation crash without reports of their own (`3e0b3bb`, `f87d69c`, `e57a2fd`, `c0b5097`, from WIP commits `44b09bb`, `e0fede2`, `f3ebf7a`, `f811955`) were read as unreviewed diffs. Nothing in them is a finding. Two are security improvements in their own right: the workspace correlation reference became a SHA-256 digest rather than an interpolated session id, which both bounds its length and stops a session identifier being copied verbatim into a correlation column and a response header (`campaign-persistence-runtime.ts:108-142`); and `AuthenticatedWorkspaceUnavailableError` stopped being caught as an unauthenticated read, which is a fail-closed correction, because a deployment whose mode cannot be classified is broken rather than signed out, and no tenant row is read either way (`campaign-workspace-reads.ts:79-101`).

Other later waves, each checked against the question the batch posed:

- **Wave 7n** (`ab0fa1e`): the walkthrough's `MutationObserver` is disconnected on unmount alongside the cancelled animation frame and the detached ring (`guided-setup-step.tsx:327-331`). It observes `document.body` with `subtree`, which is wider than the app root, but its callback reads no node content: it checks `isConnected` and re-queries the anchor registry. Same-origin DOM structure only; nothing leaves the page. Not a finding.
- **Wave 7o** (`0b9c3fb`, `ead116a`): `fetch-depth: 0` deepens the checkout, but `persist-credentials: false` is retained, so no token is written into `.git/config`, and the secret sweep over the full history is clean. The workflow triggers on `pull_request`, never `pull_request_target`, with `permissions: contents: read`, and the untrusted pull request body reaches the gate through `env:` rather than interpolation into a `run:` block, which is GitHub's own script-injection mitigation. The guard cannot be bypassed by an unset `GITHUB_BASE_REF`: the runner sets it on every `pull_request` event, and unsetting it would require editing `ci.yml` itself.
- **Wave 7q** (`61cff02`): the synthetic design surface is gated on `canRenderSyntheticDemo()`, which resolves to `synthetic` only when the provider is `stub`, synthetic-data-only is `true`, the review flag is absent, and the environment is `local` or `preview` (`authenticated-workspace-data.ts:162-213`). Staging and production can never reach it, and review mode cannot either. The error boundary it exercises renders `error.digest` and nothing else, never a stack, a message, or an internal identifier (`route-boundary.tsx:28-40`). The unverified notice reveals nothing about a confirmed account, because the address behind it comes from a read that returns null for a confirmed one.
- **Wave 7p**: a failed preference write answers the same shape as a success apart from the status, through fixed codes `SETUP_PREFERENCE_INVALID`, `SETUP_PREFERENCE_FAILED`, and `SETUP_PREFERENCE_UNAVAILABLE` (`setup-preferences.ts:311-318`). No Postgres error text reaches the browser. The result step's campaign model carries four fields the browser already holds and deliberately drops the workspace projection's rule codes (`setup-preferences.ts:96-106`).
- **Wave 7r**: the room reserved under the docked sheet is derived from the panel's own `getBoundingClientRect` and the viewport's own dimensions, never from a value the browser can inject (`guided-setup-step.tsx:187-222`, `panel-placement.ts:164-221`). It is per-viewer presentational state with no cross-user effect.
- **Wave 7s** (`2ec5245`): no deployment mode changed. `createLocalSyntheticPrincipal` is reached from exactly one place, the synthetic branch of `resolveAuthenticatedSession`, after both credential paths have been exhausted and `authenticatedWorkspaceMode` has returned `synthetic` (`authenticated-principal.ts:428-433`). Moving the factory into its own module made the negative proof real rather than vacuous, which strengthens the boundary.
- **Waves 7t and 7u**: the support reference rendered on a generic fallback is the correlation reference the route answered with, read from the `x-oalo-correlation-ref` response header, or a fixed stand-in when the response carried none (`internal-api.ts:27-30`). It is never a secret and never an internal identifier beyond the reference the product already discloses, it is shown only when the code has no sentence of its own, and it lives inside the collapsed `data-support-details` region that the rendered-output guard subtracts before checking the rest of the page. Reference uniqueness holds: the canonical codec refuses any value that is not a strict lowercase RFC-4122 UUID before stripping hyphens, so two provider ids differing only by hyphens cannot both format and cannot collide (`packages/contracts/src/canonical-reference.ts:94-107`).

---

## Files Changed (remediation)

None. No Critical or High finding was detected, and neither Medium finding is a sub-five-line fix, so this Guardian made no code change. The only files this audit adds are this report and the two index rows below.

| File | Change Summary |
|---|---|
| `library/requirements/in-work/prd-006-first-party-sign-in-and-guided-experience/qa/2026-09-19-batch-security-audit.md` | This report (new) |
| `library/requirements/in-work/prd-006-first-party-sign-in-and-guided-experience/qa/README.md` | One row added to the reports table |
| `library/requirements/in-work/prd-005-authenticated-review-runtime/qa/README.md` | One pointer line added |

`git diff` reviewed and confirmed documentation-scoped on 2026-09-21. Because the change set touches no code, the verification performed was `pnpm format:check`. The full offline gate for this tree is green at `4e7ae09` (format, lint, typecheck, unit, integration, contracts, components, visual, e2e-preview, browser, jscpd, all four audits, and build, every one exit 0), and the database gate for `d4f5a76` was running under the shared Docker lock while this audit ran, so no browser, web server, or `pnpm test:db` command was issued from this lane.

---

## Rulings

### Ruling 1: the sign-up route's deliberate duplicate-email disclosure. KEEP, with one condition

`handlePasswordSignUp` answers a duplicate address with `200 {"state":"existing"}` (`password-authentication-handler.ts:851-853`), the one place in the batch where a caller learns whether an account exists. PRD-006a D5 makes the trade deliberately.

Ratified. The alternative, a sign-up that pretends to succeed and sends a "you already have an account" message instead, is better security theatre and worse security in this product's shape. It moves the disclosure into an email channel that this deployment may not even have configured, and on a deployment with no sending domain it would leave a real loan officer with no account, no message, and no explanation, which is a support call that ends with an operator reading the audit trail aloud. The exposure is genuinely bounded: ten sign-up attempts per address per hour, sign-in and forgot-password fully generic, and the disclosure is a single bit about an address the caller already typed.

The condition: this is only an acceptable trade while the route is off by default, and it is. Sign-up serves nothing unless `OALO_SELF_SERVE_SIGNUP` is exactly `enabled` (`password-authentication-handler.ts:184-186`), and a deployment that turns it on has accepted the trade knowingly. If self-serve sign-up ever becomes the default, revisit this and move to the emailed path, because a default-on enumeration oracle is a different risk from an opt-in one. Record that condition wherever the flag is documented.

### Ruling 2: the seeding guard for a managed database named `postgres`. RATIFIED as written

PRD-005b left open how to guard a seeding run when a managed review instance may legitimately be called `postgres`, which makes a name prefix useless as a guard. The script's answer is three independent checks and no name heuristic, which is the right shape:

1. `assertNotProductionEnvironment` refuses `OALO_ENVIRONMENT=production` outright (`tooling/scripts/database/seed-review-location.mjs:214-215`).
2. `assertConfirmedDatabase` requires the operator to retype the exact database name as `--confirm-database` and matches it against the name in the connection URL, so a pasted production URL fails on a name the operator did not type (lines 198-206).
3. `assertNoForeignActiveLocations` refuses a database that already holds tenant locations, inside the transaction, before anything is written (line 530).

A name check would have been a guess about the environment; these are an assertion about the environment, an assertion about operator intent, and an assertion about the data actually present. Keep. One reinforcement worth noting rather than changing: the passwords are collected before a connection is taken, so a refused password or a cancelled prompt costs no transaction and leaves no partial state (lines 517-522).

### Ruling 3: the Argon2id parameters and the retained scrypt verification shape. RATIFIED

Argon2id at 19 MiB, `t = 2`, `p = 1`, a 16-byte salt and a 32-byte tag (`packages/auth/src/password-hash.ts:31-39`) is exactly the OWASP Password Storage Cheat Sheet's Argon2id baseline, and OWASP prefers Argon2id over scrypt, falling back only when Argon2id is unavailable. It is available on the pinned Node 24.18.0 without a flag and without an experimental warning, and the lane measured it at a median 28.7 ms against 255.1 ms for scrypt at the OWASP scrypt minimum. Preferring the stronger algorithm that is also nine times cheaper is not a trade at all. No new dependency was taken to get it.

The retained scrypt read is correct and should stay. Verification dispatches on the algorithm the stored PHC string names, and keeping the scrypt branch readable means a hash written by an older or fallback derivation still verifies rather than locking a person out of their own account. Nothing in the module writes a scrypt hash, and the column constraint accepts both shapes. Three details are right that are commonly wrong: the explicit length check precedes `timingSafeEqual`, which throws on unequal lengths (line 129); the unknown-user path derives against a fixed dummy hash so it costs exactly one derivation, the same as a wrong password (line 195 and `password-authentication-handler.ts:676-680`); and the password is NFC-normalised and never trimmed, because a leading space is part of the password the person chose.

One note for a future parameter bump, not a finding: `verifyPassword` re-derives using the parameters parsed out of the stored string, and the column constraint admits `m` up to seven digits, roughly 9.5 GiB. That is only reachable by something that can already write the credential column, which is `platform.set_password` and nothing else, and it always writes 19456. If a future path ever writes a hash from outside that function, bound the parsed parameters before deriving.

### Ruling 4: are the address limit and the lockout adequate against credential stuffing on a Vercel review deployment. ADEQUATE for a review deployment; one gap to close before production

Adequate, for this deployment and this threat. Twenty sign-in attempts per address per fifteen minutes (`password-authentication-handler.ts:121`; the twenty-first is refused, because `consume_auth_rate_limit` returns `attempt_count <= attempt_limit`) plus a ten-failure per-account lockout covers both shapes of the attack. Vertical brute force against one account dies at ten failures. Horizontal spraying across many accounts, which the lockout never sees because it never reaches ten failures on any one of them, dies at the address limit instead, and Ruling 6 confirms the address the limit keys on is one Vercel sets and overwrites rather than one the caller supplies. Wave 7j's unknown-address bucket closed the last hole, and closed it the right way round: the earlier behaviour skipped the limit entirely for a request presenting no forwarded header, which is not a smaller outage than a shared bucket but no limit at all, and one the caller selects, because the caller decides which headers a request carries. An attacker who could reach the origin without a proxy in front of it had an unmetered channel. The NUL prefix on the bucket key is a genuinely good detail: an HTTP header value cannot contain a NUL and `Headers` refuses one, so no caller can put itself in the shared bucket deliberately to spend somebody else's window.

What this is not adequate for, and what to close before this surface carries real customer accounts: there is no credential-stuffing detection, only rate limiting. Nothing notices a distributed campaign that stays under twenty attempts per address across thousands of addresses, which is what a real stuffing run looks like. For a review deployment with an operator-known audience that is proportionate. Before production, add either Vercel's WAF rate limiting in front of the application, or an alert on the `auth.sign-in` and `denied` audit rows the batch already writes faithfully for every refused attempt, which is the cheaper option because the data is already there.

### Ruling 5: the shared unknown-address bucket, and whether the missing-header warning should be an alert. BUCKET RATIFIED; the warning should become an alert

The bucket is right, for the reason the code's own comment gives and Ruling 4 restates: an unmetered channel the caller selects is strictly worse than one twenty-attempt window shared by every caller on a platform that never sets a forwarded header, and on a correctly fronted deployment the bucket stays empty because the platform sets the header on every request and no client can unset it. Keep it exactly as it is.

**Overturn the warning's severity.** `clientAddressFor` warns once per process through `console.warn` when neither header is present (`password-authentication-handler.ts:362-368`). One `console.warn` per process is the wrong volume for what it means. When that line fires, every caller on the deployment is sharing one twenty-attempt window, so the sign-in route is effectively down for everybody, and it fires exactly once, in whichever cold start happened to be first, into a log nobody is reading at the moment it matters. Two changes, neither of which this Guardian made in-session, because the second is a deployment decision rather than a code one:

1. Raise it to `console.error`. That is a one-word change and it puts the line in whatever error stream the deployment actually watches.
2. Route it to an alert. The condition is binary, it is per-deployment rather than per-request, and it means the rate limiter has degraded to a single shared window. It deserves to page somebody, not to sit in a log.

Recording it here rather than changing it: at `console.warn` the line is accurate and value-free, which is what makes it safe; what it lacks is an audience. That is a deployment concern, and the operator runbook is where the alert belongs.

### Ruling 6: the forwarded-header name on Vercel. VERIFIED CORRECT against Vercel's documentation

The open question was never checked against the vendor, because the agent that wrote the limiter had no network access and said so at the call site. It is checked now, against <https://vercel.com/docs/headers/request-headers> (last updated 2025-12-13).

Vercel's documentation states three things that settle it:

- **`x-forwarded-for`** is "the public IP address of the client that made the request", and Vercel overwrites it and does not forward external IPs when it sits behind a proxy, a restriction the documentation says is in place specifically to prevent IP spoofing. The only exception is an Enterprise account that has purchased and enabled a Trusted Proxy.
- **`x-real-ip`** is documented as identical to the `x-forwarded-for` header.
- **`x-vercel-forwarded-for`** is also identical to it, with the documented difference that `x-forwarded-for` "could be overwritten if you're using a proxy on top of Vercel."

So `clientAddressFor` reads the right headers, in a defensible order, and both of them are present and platform-set on Vercel. The per-address limits bind on this deployment, the value they key on cannot be spoofed by the caller, and the `UNKNOWN_CLIENT_ADDRESS_BUCKET` fallback stays empty in production. The comment at `password-authentication-handler.ts:354-358` saying the header could not be verified should be replaced with this citation.

One hardening, recorded as the first Low finding above rather than applied: read `x-vercel-forwarded-for` first. It is the one address header Vercel documents as surviving a proxy placed on top of Vercel, so reading it most-specific-first makes the limiter correct under a future fronting proxy as well as today, and it is purely additive, because the header is simply absent off Vercel.

---

## Recommended Follow-Up (architectural)

1. **Add a `change_password_user` rate-limit scope**, motivated by the first Medium finding at `password-authentication-handler.ts:1463`. Follow the shape `resend_verification_user` was added in (`20260919190000_verification_resend.sql:60-71`): widen the check constraint, widen the inline guard in `consume_auth_rate_limit`, add the scope to `AUTH_RATE_LIMITS`, and key it on `principal.actorId`.
2. **Close the forgot-password timing oracle**, motivated by the second Medium finding at `password-authentication-handler.ts:1042`. Either move `issueToken` into the already-scheduled background work, or pad both paths to a fixed response floor. Re-prove `password-recovery-handler.postgres.test.ts` either way.
3. **Read `x-vercel-forwarded-for` first, and replace the unverified comment with Ruling 6's citation**, motivated by the first Low finding and Ruling 6.
4. **Move the two `*-postgres-support.ts` modules out of `apps/web/src/server/`, or add a guard test asserting no route or page transitively imports them**, motivated by the second Low finding.
5. **Raise the missing-forwarded-header warning to an error and route it to an alert**, motivated by Ruling 5.
6. **Add credential-stuffing detection before this surface carries real accounts**, motivated by Ruling 4. Vercel WAF rate limiting in front, or an alert on the `auth.sign-in` and `denied` audit rows the batch already writes.
7. **Refresh the CVE intelligence.** `research/cve-watchlist.md` and `guides/06-cve-tracker.md` are 150 days old, past the weapon's 120-day threshold, and guides 06 and 07 disagree about the React 19.2.x patch floor. Re-run `forge-weapon` for `security-guardian`.

---

## Ordering Note

This audit ran before `quality-guardian`, as required. No QA report existed for this branch when it ran, and no code was changed by it, so nothing downstream is invalidated.

---

*Generated by `security-guardian` using `security-weapon`. Weapon files read on this run: `SKILL.md`, `guides/00-principles.md`, `guides/01-scan-procedure.md`, `guides/02-vibe-coding-patterns.md`, `guides/03-owasp-top-10.md`, `guides/04-pii-and-financial.md`, `guides/05-remediation-playbooks.md` (section index), `guides/06-cve-tracker.md`, `guides/07-known-critical-cves.md`, `templates/security-audit-report.md`, `research/cve-watchlist.md`, and `scripts/scan.sh`, which was executed against this tree.*
