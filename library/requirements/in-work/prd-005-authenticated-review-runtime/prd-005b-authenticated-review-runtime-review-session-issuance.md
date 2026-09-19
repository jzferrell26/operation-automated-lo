# PRD-005b: Authenticated Review Runtime - Review Session Issuance and Session Store

> **Parent:** [PRD-005](./prd-005-authenticated-review-runtime-index.md)
> **Status:** Draft
> **Priority:** P1 (dependency of completion review finding C1)
> **Schema changes:** Additive (one table, one trigger, six `security definer` functions, RLS, grants, pgTAP)
> **Owner Guardians:** `db-guardian` (migration, functions, pgTAP), `supabase-platform-guardian` (RLS and grant shape on the local stack), `auth-guardian` (issuance, cookie, CSRF delivery, revocation), `runbook-writing-guardian` (seeding procedure)

## Goal

Give a real human the minimum honest way to obtain a real first-party session on the review deployment: an additive session store, an operator-authorized sign-in path that mints a session bound to seeded `platform.*` rows and sets the `__Host-oalo_session` cookie, sign-out and revocation, audit events for both, and a documented non-secret seeding procedure. The result is a session that passes through exactly the verification code 005a composes and the future HighLevel exchange will reuse.

## Background (honest)

- There is no session table anywhere in `supabase/migrations/` (two migrations: `20260721010000_platform_foundation.sql` and `20260915180000_campaign_activation.sql`). There is no session issuance route under `apps/web/src/app/api/` (five routes: two campaign commands, two health, one version). `FirstPartySessionLookup` and `FirstPartyHandoffStore` in `packages/auth/src/browser-session.ts:28-48` are interfaces with no implementation.
- Live HighLevel OAuth, signed-context exchange, sessions, and token refresh are disabled by design (`packages/ghl/src/live-oauth-disabled.ts`, `packages/auth/src/session-policy.ts:57-62,103-108`). G2 is externally gated. This sub-PRD does not build that exchange and does not satisfy any of the 28 `DEFERRED: LIVE HIGHLEVEL AUTH` criteria. It is the drop-in point: when the exchange exists, it will call the same issuance function with `issued_by = 'embedded_exchange'`.
- The cookie, its serialization, and its lifetime bounds exist: `FIRST_PARTY_SESSION_COOKIE = "__Host-oalo_session"`, `serializeFirstPartySessionCookie` (`HttpOnly; Secure; SameSite=Lax; Path=/`, `Max-Age` between 1 and 2,592,000 seconds), cookie value `^[A-Za-z0-9_-]{32,256}$` (`browser-session.ts:14,88-105`). `authenticateInboundFirstPartySession` (`inbound-session.ts:46-78`) validates the secret shape, calls the lookup, checks expiry, validates every ref with `SafeTenantReferenceSchema`, and compares the role version.
- `platform.role_bindings` has no version column. Its shape is `(id, location_id, user_id, role, granted_by, granted_at, revoked_at, created_at)` with `role_bindings_active_uq` unique on `(location_id, user_id, role) where revoked_at is null` (foundation migration lines 140-158). The recon brief left the version question open with two options; D2 below picks one.
- `platform.app_users` is not readable by `app_runtime` (line 1744), and every `app_runtime` policy needs `app.location_id` to be set. Session lookup by secret and persona resolution both happen before any principal exists. The foundation's own answer to this is `security definer` functions with `set search_path = ''` (`platform.set_app_context` at lines 891-931 reads `locations`, `role_bindings`, and `app_users` under the owner's privileges and raises `42501` otherwise). This sub-PRD follows that pattern rather than adding a new database role.
- `audit.events` (lines 715-737) takes `location_id`, `actor_type in ('user','support','system','webhook')`, `actor_id`, `subject_type`, `subject_id`, `action ~ '^[a-z][a-z0-9.-]+$'`, `result in ('success','denied','failed','uncertain')`, optional hashes, and `correlation_id` (1 to 200 chars). It has an append-only trigger. Session issuance and revocation events fit it without change.
- `docs/operations/database-runtime-role.md` requires that the application login role is not a member of `migration_owner`, not even `WITH SET true, INHERIT false`. Seeding writes to owner-only tables, so it runs with a separate login (the migration login), never the application login. The integration harness already seeds this way (`campaign-integration-support.mjs:259-287` inside `withMigrationOwnerTransaction`).
- `platform.marketplace_installations.status` allows `pending` (line 168). The principal contract requires an `installationRef`, so a review location carries one installation row in `pending` status, which is the honest state for a location on which nothing was installed.
- The existing `apps/web/src/server/campaign-approval-handler.unit.test.ts` already builds the embedded fixture with `generateKeyPairSync("ed25519")`, a mutation gate, and static ports (`:23-110`). The first-party variant of that fixture does not exist and is part of this sub-PRD's tests.

## Scope

- Migration: `platform.first_party_sessions` (D1), an update-restriction trigger, RLS, grants, and six `security definer` functions (D3).
- pgTAP suite `supabase/tests/first_party_sessions.pgtap.sql` covering the table, the trigger, each function's accept and refuse paths, the audit rows, and the role-version derivation.
- Review sign-in page and route, sign-out route, cookie handling, session-bound CSRF token delivery to the page.
- Audit events for issuance (success and denied) and revocation.
- Seeding script and operator procedure for one review location, one outsider location, two users on the review location (creator and approver), one outsider admin, and their bindings and pending installation rows.
- Tests: pgTAP, unit, Postgres-backed integration, route-level.

## Non-Goals

- HighLevel SSO, OAuth, or the signed-context exchange. Nothing here flips any G2 row.
- A general-purpose login product. The sign-in path exists only in review mode, is gated by an operator-held server secret, and is refused in production regardless of flags.
- Sessions for `realtor_collaborator` (no session role per 005a D2) or `platform_support` (no binding).
- Multi-location switching in the browser. A session is bound to one location at issuance.
- Session expiry sweeping, retention, or deletion. Rows are revocable and expire by timestamp; a sweep is a later operational task.
- The partitioned cookie and handoff flow (`PARTITIONED_SESSION_COOKIE`, `issueFirstPartyHandoff`). Those belong to the embedded-iframe path that arrives with the exchange.

## Design decisions

### D1. Session store

`platform.first_party_sessions`, created as `migration_owner` in a migration named `<timestamp>_first_party_sessions.sql` that sorts after `20260915180000`:

| Column | Type and constraint |
|---|---|
| `id` | `uuid primary key default gen_random_uuid()`; its hex is the canonical `session_<hex>` ref (005a D1) |
| `session_secret_hash` | `text not null unique`, `^[0-9a-f]{64}$` (SHA-256 of the cookie value) |
| `location_id` | `uuid not null references platform.locations (id) on delete restrict` |
| `user_id` | `uuid not null references platform.app_users (id) on delete restrict` |
| `role_binding_id` | `uuid not null references platform.role_bindings (id) on delete restrict` |
| `installation_id` | `uuid not null references platform.marketplace_installations (id) on delete restrict` |
| `session_role` | `text not null`, check in the six `SESSION_APPLICATION_ROLES` |
| `role_version` | `bigint not null check (role_version > 0)` (D2) |
| `issued_by` | `text not null check (issued_by in ('review_sign_in', 'embedded_exchange'))` |
| `issued_at` | `timestamptz not null default now()` |
| `expires_at` | `timestamptz not null`, check `expires_at > issued_at` and `expires_at <= issued_at + interval '30 days'` |
| `last_seen_at` | `timestamptz` |
| `revoked_at` | `timestamptz`, check `revoked_at is null or revoked_at >= issued_at` |
| `revocation_reason` | `text`, check `revocation_reason is null or revocation_reason in ('sign_out', 'operator', 'binding_revoked')`, and non-null exactly when `revoked_at` is non-null |
| `correlation_id` | `text not null`, length 1 to 200 (the issuance correlation) |
| `created_at` | `timestamptz not null default now()` |

Constraints and indexes: `unique (location_id, id)` following the foundation pattern; `(location_id, user_id, revoked_at)`; `(expires_at)`. RLS enabled with the three standard policies (`migration_owner` all; `app_runtime` select using `platform.tenant_matches(location_id)`; `support_runtime` select using `platform.support_context_allowed(location_id)`). `app_runtime` gets `select` only; every insert and update goes through the functions in D3. A `before update` trigger rejects any change to a column other than `last_seen_at`, `revoked_at`, and `revocation_reason`, and a `before delete` trigger rejects deletes, so identity columns are immutable once issued.

### D2. Role version is derived, not stored on the binding

The version of a binding is `(extract(epoch from granted_at) * 1000000)::bigint` of the single active row for `(location_id, user_id, role)`. `extract(epoch ...)` returns `numeric` on PostgreSQL 17, so the multiplication is exact, the result is below `2^53` and therefore a safe integer in JavaScript, and `role_bindings_active_uq` guarantees at most one active row per triple.

Why derived rather than a new `role_version` column: a stored counter needs an increment path, and nothing in the schema owns one. Grants and revocations are already modelled as rows, so "the instant the active binding was granted" is a version that changes on exactly the events that should invalidate a session (revoke, re-grant, role change) and stays stable otherwise. A re-grant within the same microsecond is the only collision, and it re-grants the same role to the same user at the same location, which is not a state a stale session could exploit. `role_binding_id` is stored on the session for audit even though the version is what the verifier compares.

### D3. Six `security definer` functions

All owned by `migration_owner`, `set search_path = ''`, `execute` granted to `app_runtime` only (revoked from `public`), each with `raise exception using errcode = '42501'` on refusal so nothing leaks which check failed to the client:

| Function | Behaviour |
|---|---|
| `platform.resolve_review_persona(location_id uuid, binding_role text) returns uuid` | Returns the single `app_users.id` with an active binding of `binding_role` at an active location; raises when the count is 0 or greater than 1. Used only by the sign-in route. |
| `platform.issue_first_party_session(location_id uuid, user_id uuid, binding_role text, session_role text, session_secret_hash text, lifetime_seconds integer, issued_by text, correlation_id text) returns platform.first_party_sessions` | Verifies location active, user active, the active binding for `binding_role`, and an installation row for the location; computes `role_version` per D2; inserts; writes one `audit.events` row (`actor_type 'user'`, `subject_type 'first_party_session'`, `subject_id` = the canonical session ref, `action 'session.issued'`, `result 'success'`); returns the row. Refusals also write an audit row with `result 'denied'` when a location id is known, then raise. |
| `platform.lookup_first_party_session(session_secret_hash text) returns table (...)` | Returns at most one row and only when `revoked_at is null and expires_at > now()`, projecting `id, location_id, user_id, installation_id, session_role, role_version, expires_at`. Never returns the hash. Does not write. |
| `platform.current_role_version(location_id uuid, user_id uuid, binding_role text) returns bigint` | The D2 value for the active binding, or null when the location is not active, the user is not active, or no active binding exists. |
| `platform.touch_first_party_session(session_id uuid) returns void` | Sets `last_seen_at = now()` on an active session. Called on authenticated mutations only, not on reads. |
| `platform.revoke_first_party_session(session_id uuid, reason text, correlation_id text) returns boolean` | Sets `revoked_at` and `revocation_reason` when the row is active; writes `audit.events` `session.revoked`; returns whether a row changed. |

Two smaller definer predicates, `platform.location_is_active(uuid)` and `platform.actor_is_active(uuid)`, back 005a's identity directory. They return boolean and never raise.

Why definer functions rather than a new `auth_runtime` role: the foundation already uses this pattern for pre-context reads (`set_app_context`, `begin_support_access`), it adds no role to the `set true, inherit false` grant set, and it keeps the transaction helpers in `packages/db` unchanged apart from 005a's allowlisted context-free helper. The `auth_runtime` alternative was rejected on those grounds.

### D4. Sign-in path

- `GET /review/sign-in`: a server-rendered page, returned only when `canRenderReviewSurface(env)` is true; otherwise 404. It renders a persona select (`creator`, `approver`, `outsider`) and a secret field, and posts to `/api/review/session`. It is not linked from navigation. It carries the review disclosure banner.
- `POST /api/review/session`: refused with 404 when review mode is not active; refused with 403 when `OALO_ENVIRONMENT=production` regardless of any other flag; refused with 503 when `OALO_REVIEW_SIGNIN_SECRET`, `OALO_REVIEW_LOCATION_ID`, or `OALO_REVIEW_OUTSIDER_LOCATION_ID` is missing or malformed. Otherwise: origin and host are checked against the 005a mutation gate (no CSRF token yet, there is no session); the submitted secret is compared to `OALO_REVIEW_SIGNIN_SECRET` with `timingSafeEqual` on equal-length buffers; the persona is resolved server-side to `(location_id, binding_role, session_role)` from env and the 005a role map (`creator` and `approver` on `OALO_REVIEW_LOCATION_ID`, `outsider` is `location_admin` on `OALO_REVIEW_OUTSIDER_LOCATION_ID`); `resolve_review_persona` yields the user; a 32-byte random secret is generated, hashed, and `issue_first_party_session` runs with `lifetime_seconds = 43200` (12 hours) and `issued_by = 'review_sign_in'`; the response sets `__Host-oalo_session` via `serializeFirstPartySessionCookie` and redirects (303) to `/overview` for a form post or returns 200 JSON `{ sessionRef }` for a fetch. Any failure after the environment checks returns a single generic 401 with no detail, and the denied attempt is audited when a location id is known.
- The browser never chooses a location, user, or role. It chooses a persona name from a closed set, and the server maps that name through environment and the database.
- After sign-in, the authenticated layout (005a) computes `createSessionBoundCsrfToken({ serverSecret, sessionId })` and renders it in the `oalo-csrf-token` meta element. That token is what `postInternalJson` sends. The cookie value never reaches the page.
- `POST /api/review/session/sign-out`: requires a valid session and the full mutation gate including CSRF; calls `revoke_first_party_session(..., 'sign_out', ...)`; clears the cookie with `Max-Age=0`; redirects to `/review/sign-in`. The layout renders a sign-out control in review mode.

Why this is not synthetic impersonation: the synthetic principal is a constant handed to any visitor with no credential, no row, no expiry, and no audit. A review session requires a secret only the operator holds, binds to real `platform.locations`, `app_users`, `role_bindings`, and `marketplace_installations` rows, carries `authenticationMode: "first_party"`, expires, is revocable, is audited, and is verified on every request by the same `authenticateInboundFirstPartySession`, role-version, origin, host, and CSRF checks a future HighLevel-issued session will face. The one thing it replaces is the credential exchange, and it replaces it with an operator-authorized one.

### D5. Seeding

`tooling/scripts/database/seed-review-location.mjs` plus `docs/operations/review-session-seeding.md`:

- Runs against a connection string passed explicitly as `--review-database-url`, using the migration login (a member of `migration_owner`), never the application login. It assumes `migration_owner` inside a transaction exactly as the harness does.
- Guards: requires `--confirm-database <name>` equal to the database name in the URL; refuses when `platform.locations` contains any `active` row whose id is not one of the seeded ids (so it cannot run against a database that holds real tenants); refuses when `OALO_ENVIRONMENT=production` is set in the invoking shell.
- Seeds, idempotently by fixed documented UUIDs with `on conflict do nothing`: location A `Review location (not connected)` and location B `Review outsider location (not connected)`, both `status 'active'`; one `marketplace_installations` row per location with `status 'pending'`, `marketplace_app_id 'oalo-review-surface'`, and `external_install_id null`; users `Review creator`, `Review approver`, `Review outsider admin` (`safe_display_name`); bindings `creator` and `approver` on A, `location_admin` on B.
- Prints the three location and user UUIDs for the operator to paste into `OALO_REVIEW_LOCATION_ID` and `OALO_REVIEW_OUTSIDER_LOCATION_ID`. Prints no secret. The sign-in secret is generated by the operator (`openssl rand -base64 32` or equivalent, then URL-safe), stored in the Vercel project's server-only env and the operator's password manager, and shared with no agent.

### D6. Environment variables

| Variable | Kind |
|---|---|
| `OALO_REVIEW_SIGNIN_SECRET` (new) | server-only secret, at least 32 bytes |
| `OALO_REVIEW_LOCATION_ID` (new) | server-only, non-secret UUID |
| `OALO_REVIEW_OUTSIDER_LOCATION_ID` (new) | server-only, non-secret UUID |

All three are added to `docs/production-environments.md`. The secret name carries `SECRET` and the guard rejects any `NEXT_PUBLIC_` spelling.

## Acceptance criteria

| ID | Criterion | Finding |
|---|---|---|
| 005B-AC-001 | The migration creates `platform.first_party_sessions` exactly as D1 specifies, with RLS enabled and the three standard policies, `select` for `app_runtime` and `support_runtime` only, no direct insert, update, or delete grant to any runtime role, and the update and delete restriction triggers; pgTAP asserts each of these. | C1 |
| 005B-AC-002 | The migration is additive: no existing table, column, constraint, index, policy, function, or grant changes; `supabase db reset --local` applies both prior migrations and this one in order; `pnpm test:db` discovers the new pgTAP file and the gate fails, not skips, if it is absent. | C1 |
| 005B-AC-003 | The six functions in D3 and the two predicates exist, are owned by `migration_owner`, are `security definer` with `set search_path = ''`, and have `execute` granted to `app_runtime` only; pgTAP asserts ownership, definer status, search path, and that `public` and `support_runtime` cannot execute them. | C1 |
| 005B-AC-004 | `issue_first_party_session` refuses (errcode `42501`) an inactive location, a suspended or deleted user, a missing binding, a revoked binding, a binding for a different role, a location without an installation row, and a `session_role` outside the six application roles; each refusal is a pgTAP case and none inserts a session row. | C1 |
| 005B-AC-005 | `issue_first_party_session` on success inserts one row with `role_version` equal to the D2 value for the binding, writes one `audit.events` row with `action 'session.issued'` and `result 'success'`, and returns the row; pgTAP asserts the version equality against a direct `extract` and the audit row's `subject_id` equals `session_<hex>` of the new id. | C1 |
| 005B-AC-006 | `lookup_first_party_session` returns the row for an active session and returns nothing for a revoked session, an expired session, or an unknown hash; it never projects `session_secret_hash`; pgTAP covers all four. | C1 |
| 005B-AC-007 | `current_role_version` returns the D2 value for an active binding and null for an inactive location, an inactive user, a revoked binding, or a role the user does not hold; after revoke and re-grant it returns a value different from the one before; pgTAP covers each. | C1 |
| 005B-AC-008 | `revoke_first_party_session` sets `revoked_at` and `revocation_reason`, writes `audit.events` `session.revoked`, returns true once and false on a second call, and `lookup_first_party_session` returns nothing afterwards; pgTAP covers the sequence. | C1 |
| 005B-AC-009 | The update trigger rejects a change to any column other than `last_seen_at`, `revoked_at`, and `revocation_reason`, and the delete trigger rejects deletes, both as `migration_owner`; pgTAP covers one identity column, one timestamp column, and a delete. | C1 |
| 005B-AC-010 | `resolve_review_persona` returns the single active user for a binding role at an active location and raises for zero or two candidates; pgTAP covers all three. | C1 |
| 005B-AC-011 | `GET /review/sign-in` returns 404 when review mode is not active and renders the persona form with the review disclosure banner when it is; `POST /api/review/session` returns 403 in production regardless of other flags, 404 outside review mode, and 503 when any D6 variable is missing or malformed; route-level tests cover each. | C1 |
| 005B-AC-012 | Through the exported `POST /api/review/session` with the real composition and a seeded disposable database: the correct secret and persona `creator` returns a `Set-Cookie` for `__Host-oalo_session` with `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=43200`, and a subsequent `POST /api/campaigns/preflight` carrying that cookie, the allowed origin, the expected host, and the rendered CSRF token succeeds; the wrong secret, a secret of a different length, an unknown persona, an unlisted origin, and a wrong host each return 401 with an identical body and set no cookie. | C1 |
| 005B-AC-013 | The secret comparison is `timingSafeEqual` on equal-length buffers with an explicit length check first; a unit test asserts the comparison function is called with buffers, and a review of the route by `security-guardian` confirms no early return leaks length. | Constraint |
| 005B-AC-014 | The browser cannot select a location, user, or role: the request schema for `POST /api/review/session` is `.strict()` with a single `persona` enum field; a test proves `locationId`, `userId`, `role`, and `installationId` in the body are rejected with 400. | Constraint |
| 005B-AC-015 | `POST /api/review/session/sign-out` requires a valid session and the full mutation gate including CSRF, revokes the session with reason `sign_out`, clears the cookie with `Max-Age=0`, and a following authenticated request returns 401; a request without the CSRF token does not revoke. | C1 |
| 005B-AC-016 | Every issuance attempt (success and denied where a location id is known) and every revocation produces exactly one `audit.events` row, proven at route level by counting rows before and after; no audit row, log line, or response contains the sign-in secret, the session secret, or the secret hash. | Constraint |
| 005B-AC-017 | The seeding script refuses without `--confirm-database`, refuses when the confirmation does not match the URL's database name, refuses when a foreign active location exists, refuses when `OALO_ENVIRONMENT=production` is set, is idempotent on a second run (zero new rows), seeds exactly the rows in D5, and prints the location and user UUIDs and nothing secret; tests run it against the disposable `oalo_test_` database inside `pnpm test:db`. | C1 |
| 005B-AC-018 | `docs/operations/review-session-seeding.md` documents the procedure end to end for an operator with no repository context: which login to use, the exact command, the guards, what to paste into which env variable, how to generate the sign-in secret, and what never goes in git; `runbook-writing-guardian` reviews it against the no-implied-context rule. | C1 |
| 005B-AC-019 | The sub-PRD states, and the sign-in page displays, that this path is not HighLevel SSO, does not satisfy any `DEFERRED: LIVE HIGHLEVEL AUTH` criterion, and exists only on the review surface; `PRODUCTION_EXECUTION_LEDGER.md` is untouched. | Constraint |
| 005B-AC-020 | No session row, function, or route becomes reachable in synthetic mode or production mode: in synthetic mode the routes return 404 and the composition uses no database; in production mode `POST /api/review/session` returns 403 before touching the database. | Constraint |

## Files expected to change

- `supabase/migrations/<timestamp>_first_party_sessions.sql` (new): D1 table, triggers, RLS, grants, D3 functions and predicates.
- `supabase/tests/first_party_sessions.pgtap.sql` (new): discovered by `tooling/scripts/database/run-real-database-tests.mjs:43-45` (`supabase/tests/*.pgtap.sql`).
- `apps/web/src/app/review/sign-in/page.tsx` (new): server-rendered form, review mode only.
- `apps/web/src/app/api/review/session/route.ts` and `apps/web/src/app/api/review/session/sign-out/route.ts` (new).
- `apps/web/src/server/review-session-handler.ts` (new): issuance and revocation logic behind the routes, testable with an injected environment and ports like the campaign handlers.
- `apps/web/src/server/postgres-authentication-ports.ts` (005a): session lookup, `isSessionActive`, and `touch` on mutations call the D3 functions.
- `apps/web/src/app/(authenticated)/layout.tsx`: sign-out control and the CSRF meta element (shared with 005a).
- `apps/web/src/server/campaign-command-http.ts:19-53`: no new error class needed; the review handler reuses `UnauthenticatedPrincipalError` for the generic 401.
- `tooling/scripts/database/seed-review-location.mjs` (new) and `docs/operations/review-session-seeding.md` (new).
- `docs/production-environments.md`: D6 variables; `docs/operations/review-surface.md`: a pointer to the sign-in path and the seeding procedure.
- `packages/auth/src/index.ts`: export of the first-party session fixture helper used by tests, if one is added alongside the existing embedded fixture pattern.
- Tests: `apps/web/src/server/review-session-handler.unit.test.ts`, `review-session-handler.postgres.test.ts` (new, in the 005a `apps/web/src/**/*.postgres.test.ts` project); `tooling/tests/database/seed-review-location.test.ts` (new, in the existing `database` vitest project for the guard logic) plus an execution against the disposable database in the gate.

## Test plan

- **pgTAP** (`pnpm test:db`): the whole of 005B-AC-001 through 005B-AC-010, written in the style of `supabase/tests/campaign_activation.pgtap.sql` (fixed UUIDs, `set local role migration_owner` for seeding, `pg_temp.capture_sqlstate` for refusals).
- **Unit** (`pnpm test:unit`): environment parsing for D6; persona to `(location, binding role, session role)` mapping through the shared role map; constant-time comparison; cookie serialization parameters; strict request schema; production and non-review refusals with no database access (spy on the pool factory).
- **Integration against real Postgres** (`pnpm test:db`): issuance and lookup through the functions from Node with the disposable database; the seeding script's guards and idempotency.
- **Route-level through the exported handlers** (`pnpm test:db`, `apps/web/src/**/*.postgres.test.ts`): 005B-AC-011, 012, 015, 016, driving `POST` from the route files with browser-shaped `Request` objects, then chaining into the campaign routes to prove the minted session is accepted by 005a's composition.
- **Browser**: the deployed review-mode sign-in, create, reload, approve, and sign-out sequence is 005e's seven-point proof. No local Playwright spec exercises sign-in because the local browser suite runs in synthetic mode, where the routes are 404 by design (005B-AC-020).

## Security notes

- The sign-in secret is a bearer credential for minting sessions. It is held by the operator only, compared in constant time, never logged, and never shared with an agent. Rotating it is a Vercel env change and a redeploy; existing sessions remain valid until expiry or revocation because they are bound to rows, not to the secret.
- Session secrets are 32 random bytes, stored only as SHA-256 hashes. A database read cannot reproduce a valid cookie.
- The route is refused in production before any database access. `OALO_REVIEW_SURFACE=authorized` in production still cannot enable it (005B-AC-020).
- Audit coverage: every issuance and revocation is a row in the append-only `audit.events`. Denied issuance attempts are audited when the persona resolved to a known location; attempts that fail the secret check before persona resolution are logged (without the secret) and counted, and the open question on rate limiting is for `security-guardian`.
- The definer functions are the trust boundary. `security-guardian` reviews each body for `search_path`, input validation, and the absence of dynamic SQL.
- The seeded review location is real data in an isolated database and must never be created in production; the script's guards and the operator procedure both say so.

## Open questions

- [ ] Rate limiting on `POST /api/review/session` beyond secret entropy and audited failures. Recommendation: not required for a review surface with a 32-byte secret; `security-guardian` rules at close-out.
- [ ] The managed review database may be named `postgres`. D5's guard uses an explicit `--confirm-database` and the foreign-active-location check instead of a name prefix. Confirm with the operator.
- [ ] Session lifetime: 12 hours is chosen so a reviewer's day fits in one session and an abandoned session dies overnight. Confirm or adjust; the bound is 30 days by the existing cookie serializer.

## Exact operator ask

Collected in [PRD-005e](./prd-005e-authenticated-review-runtime-deployed-qualification.md). Specific to this sub-PRD: run `seed-review-location.mjs` once against the isolated review database with the migration login, paste the printed UUIDs into `OALO_REVIEW_LOCATION_ID` and `OALO_REVIEW_OUTSIDER_LOCATION_ID`, generate and set `OALO_REVIEW_SIGNIN_SECRET`, and confirm the database name for the `--confirm-database` guard. Nothing secret comes back to any agent.

## Blockers (honest)

| Blocker | Owner | Unblock |
|---|---|---|
| Isolated review Postgres does not exist | Operator | Provision one (never production), apply migrations with the migration login, hand over only the env variable names set |
| Sign-in secret and seeded UUIDs | Operator | Generate the secret, run the seeding script, set the three D6 variables server-only on the existing Vercel project |
| Local pgTAP runs need Docker | Engineering | CI `database` job has it; the workstation has Docker Desktop per the recon but its daemon state must be re-checked |

## Related

- [PRD-005a: runtime authentication composition](./prd-005a-authenticated-review-runtime-runtime-auth-composition.md) (consumes D3; defines the canonical ref format and role map)
- [PRD-003a: campaign persistence](../../in-work/prd-003-authenticated-product-activation/prd-003a-authenticated-product-activation-campaign-persistence.md) (the additive migration precedent)
- [PRD-003b: session command context](../../in-work/prd-003-authenticated-product-activation/prd-003b-authenticated-product-activation-session-command-context.md)
- [PRD-004d: real-Postgres command gate](../../in-work/prd-004-reviewable-go-live/prd-004d-reviewable-go-live-postgres-command-gate.md) (why the harness assumes `migration_owner`)
- [Database runtime role activation](../../../../docs/operations/database-runtime-role.md) (the app login must not be a member of `migration_owner`)
- [Labeled HighLevel review surface](../../../../docs/operations/review-surface.md)
- [G2 App Test evidence pack](../../../../docs/operations/evidence-packs/g2-highlevel-app-test.md) (what this sub-PRD does not satisfy)
