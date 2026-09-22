# PRD-005a: Authenticated Review Runtime - Runtime Authentication Composition

> **Parent:** [PRD-005](./prd-005-authenticated-review-runtime-index.md)
> **Status:** Draft
> **Priority:** P1 (completion review finding C1, functional release blocker)
> **Schema changes:** None in this sub-PRD (consumes the functions 005b adds)
> **Owner Guardians:** `auth-guardian` (composition and session ports), `typescript-node-guardian` (server modules and route wiring), `react-guardian` (layout, pages, browser helper), `db-guardian` (identity and role queries through the 005b functions)

## Goal

Replace the static local synthetic default in `createDefaultCampaignCommandPorts()` with a server-only runtime composition that builds `CampaignCommandPorts` from environment and Postgres, wire it into every campaign read and mutation entry point, and make the whole path fail closed outside synthetic mode. After this sub-PRD, a valid first-party session reaches the intended location and role on the review deployment, an invalid or absent one is denied, and no request ever receives the synthetic principal unless the deployment is explicitly synthetic.

## Background (honest)

Everything below was verified against `main` at `c140f11` on 2026-09-19.

- `apps/web/src/app/api/campaigns/approve/route.ts` and `preflight/route.ts` call `handleCampaignApproval(request)` and `handleCampaignPreflight(request)` with default arguments. Both handlers default `ports` to `createDefaultCampaignCommandPorts()` (`campaign-approval-handler.ts:52-56`, `campaign-preflight-handler.ts:25-29`).
- `apps/web/src/server/authenticated-principal.ts:156-175`: that default supplies a static identity directory for `location_localWorkspace001` / `principal_localUser001` and a static role binding (`campaign_creator`, version 1). It supplies no `firstPartySessions`, no `embedded`, and no `mutation` gate.
- The resolver is already fail-closed in the right direction: it throws `UnauthenticatedPrincipalError` when a bearer token arrives and `ports.embedded` is undefined (`:242-244`), when a cookie arrives and `ports.firstPartySessions` is undefined (`:288-290`), when a mutation arrives and `ports.mutation` is undefined (`:220-222`), and it only constructs the synthetic principal when `authenticatedWorkspaceMode(environment)` is `synthetic` (`:356-360`). `OALO_REVIEW_SURFACE=authorized` selects `review`, not `synthetic` (`authenticated-workspace-data.ts:145-147`). So on the review URL today every command is 401 and every read is an empty list. That is denial, not bypass, and it is the correct failure direction. It also means deployment variables alone cannot make the intended flow work, which is finding C1.
- Read paths use the same default: `campaign-workspace-reads.ts:76-81` (`loadWorkspaceCampaignsForRequest`, used by `app/(authenticated)/overview/page.tsx:11` and `marketing/campaigns/page.tsx:11`) and `app/(authenticated)/marketing/campaigns/[campaignRef]/page.tsx:19-23`. `loadWorkspaceCampaignsForRequest` swallows every error into `[]` (`:83-85`), so an unauthenticated review visitor sees a page that looks signed in with no campaigns.
- The authenticated layout (`app/(authenticated)/layout.tsx:9-19`) renders session identity and navigation from `loadAuthenticatedWorkspace()` fixtures, not from a verified principal. In review mode the fixture persona is anonymized ("Demo reviewer", "Demo workspace (not connected)") but it is still a fixture.
- The browser helper `apps/web/src/features/http/internal-api.ts:3-14` sends only `content-type`. It sends no `x-csrf-token` (`packages/auth/src/browser-session.ts:16`) and no correlation header. Both `campaign-approval-controls.tsx:52-59` and `open-house-draft-builder.tsx:46` post through it.
- The abstractions to reuse already exist and are tested: `FirstPartySessionLookup` and `EstablishedFirstPartySession` (`browser-session.ts:33-48`, interface only, no implementation anywhere in the repository), `assertBrowserMutationRequest` (`:204-233`, exact-origin allowlist, host match, session-bound CSRF for cookie mode), `createSessionBoundCsrfToken` (`:183-192`), `authenticateInboundEmbeddedSession` and `authenticateInboundFirstPartySession` (`inbound-session.ts:25-78`), `SESSION_APPLICATION_ROLES` (`session-policy.ts:5-12`), `AuthenticatedPrincipal` and `freezeAuthenticatedPrincipal` (`packages/application/src/campaign-command-context.ts:26-85`), and `createPrincipalBoundTenantContextAuthority` with `withTenantTransaction` (`packages/db/src/transaction-context.ts:30-41,174-188`).
- The reference-format mismatch: embedded claims and `SafeTenantReferenceSchema` accept `^[a-z][a-z0-9_-]{2,95}$` (`packages/contracts/src/tenant-installation.ts:3`, `embedded-session.ts:17`), while `freezeAuthenticatedPrincipal` requires `^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$` with 8 to 128 characters (`campaign-command-context.ts:10,63-65`). A token or session whose `sub`, `locationId`, `installationId`, or `sessionId` contains a hyphen or is shorter than 8 characters authenticates and then fails principal binding as a generic 401. Nothing today defines the canonical format in one place.
- The database roles are `location_admin, creator, approver, publisher, analyst, realtor_collaborator` (`supabase/migrations/20260721010000_platform_foundation.sql:140-147`). The application roles are `location_admin, campaign_creator, campaign_approver, campaign_publisher, viewer, platform_support` (`packages/contracts/src/launch-readiness.ts:91-98`). The only mapping between them in the repository is test code: `databaseRoleFor` in `packages/db/test/campaign-integration-support.mjs:365-369`, which maps two roles and collapses everything else to `location_admin`.
- `platform.locations` and `platform.app_users` carry no reference column. Campaign rows store `location_ref` and `created_by_actor_ref` as opaque text next to the UUIDs (`supabase/migrations/20260915180000_campaign_activation.sql`). The integration harness invents refs like `location_<token>` and seeds only the UUID rows (`campaign-integration-support.mjs:165-191,259-287`). A runtime identity directory therefore has to decide, once, how a ref maps to a row.
- Before a principal exists there is no tenant context, and `app_runtime`'s RLS policies key on `platform.tenant_matches(location_id)` (foundation migration lines 867-879), so identity and session lookups cannot run inside `withTenantTransaction`. `app_runtime` also has no `select` grant on `platform.app_users` (line 1744). The foundation solves exactly this class of problem with `security definer` functions (`platform.set_app_context` at lines 891-931, `platform.begin_support_access`). 005b adds the functions this sub-PRD calls.

## Scope

- A server-only composition module that parses environment once per process, builds `CampaignCommandPorts`, and exposes a single resolver for handlers and pages.
- Embedded-session verification policy from environment (issuer, audience, public keys by kid, session-activity check backed by the 005b store).
- Browser mutation gate from environment (expected host from `OALO_APP_URL`, exact allowed origins from `OALO_ALLOWED_ORIGINS`, CSRF server secret from a new server-only variable).
- Postgres-backed identity directory, role binding port, and first-party session lookup, all calling the 005b `security definer` functions through a context-free runtime helper restricted to those functions.
- One production module for the database-role to application-role mapping, in both directions.
- One canonical reference format module in `packages/contracts`, with tests that prove it satisfies both existing schemas.
- Wiring into the exported approve and preflight routes, the three read entry points, and the authenticated layout.
- The browser helper sends `x-csrf-token` on every mutation.
- Fail-closed rules and their tests.

## Non-Goals

- Enabling synthetic impersonation on a review or production deployment. The synthetic ports are constructed only when `authenticatedWorkspaceMode()` returns `synthetic`.
- Accepting tenant, actor, installation, or role identifiers from the browser on any campaign command. The `.strict()` request schemas stay as they are and a test proves extra fields are rejected.
- Removing or relaxing CSRF, origin, host, expiry, or role-version checks in `packages/auth`.
- Weakening `freezeAuthenticatedPrincipal`, `OpaqueReferenceSchema`, or `SafeTenantReferenceSchema` to make the formats agree. The canonical format is chosen to satisfy both as they are.
- A privileged database account standing in for tenant authorization. Identity and session lookups go through narrowly scoped definer functions; every campaign read and write still runs under `app_runtime` with `set_app_context`.
- HighLevel OAuth or the signed-context exchange. The embedded policy is parsed and enforced so that a future issuer plugs in, but no issuer exists in this batch and bearer requests are refused when the policy is absent.
- Session issuance, sign-in pages, or the session table (005b).
- Correlation reference policy (005c).

## Design decisions

### D1. Canonical reference format

One module, `packages/contracts/src/canonical-reference.ts`, exported from the package index, defines the runtime reference format as `<prefix>_<32 lowercase hex characters>` where the hex is the UUID of the backing row with hyphens removed:

| Reference | Prefix | Backing row |
|---|---|---|
| `locationRef` | `location_` | `platform.locations.id` |
| `actorRef` | `actor_` | `platform.app_users.id` |
| `installationRef` | `installation_` | `platform.marketplace_installations.id` |
| `sessionId` | `session_` | `platform.first_party_sessions.id` (005b) |

Every canonical value is between 38 and 45 characters, contains only lowercase letters, digits, and one underscore, and therefore satisfies `SafeTenantReferenceSchema` (`^[a-z][a-z0-9_-]{2,95}$`), the opaque pattern in `freezeAuthenticatedPrincipal` (`^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$`, 8 to 128), the `OpaqueReferenceSchema` in contracts, the campaign table check constraints, and the embedded token's `SAFE_REFERENCE`. The module exports `formatLocationRef(uuid)`, `parseLocationRef(ref)`, the same pair for actor, installation, and session, and a `CanonicalReferenceSchema` used at the composition boundary.

Why derived from the UUID rather than a stored ref column: it needs no change to the foundation tables, it cannot produce two rows with one ref, parsing is a pure function, and the ref is never trusted from the browser (the principal comes from the session, and authorization keys on the UUID under RLS), so exposing the surrogate key in a ref costs nothing. The alternative, adding `location_ref` and `actor_ref` columns with unique indexes and generating refs at seed time, was rejected because it adds two columns to foundation tables and a generated-ref step to seeding for no tenant-boundary gain.

Existing rows written by the integration harness with `location_<token>` refs are test rows in disposable databases and are unaffected. The review database is fresh.

### D2. Role mapping in one place

`packages/auth/src/role-binding-map.ts`, exported from the package index, is the only mapping between database binding roles and application session roles:

| Database role (`platform.role_bindings.role`) | Application role (`ApplicationRoleSchema`) |
|---|---|
| `location_admin` | `location_admin` |
| `creator` | `campaign_creator` |
| `approver` | `campaign_approver` |
| `publisher` | `campaign_publisher` |
| `analyst` | `viewer` |
| `realtor_collaborator` | none (no session role; sign-in refused) |
| none | `platform_support` (no binding; support access is a `platform.support_grants` concern, not a session) |

`realtor_collaborator` maps to nothing because `viewer` would grant read access to every campaign in the location, and a collaborator's scope is narrower than that. Giving them a session is out of scope for this batch. The test-only `databaseRoleFor` in the harness is deleted and the harness imports the shared module.

### D3. A session carries exactly one role

`EstablishedFirstPartySession.role` is a single application role. When a user holds several active bindings, the session's role is the one chosen at issuance (005b's persona) and the role binding port checks that specific binding's version. No union, no highest-privilege selection.

### D4. Role version is derived from the active binding

Defined in 005b (D2 there) and consumed here: the version of a binding is `(extract(epoch from granted_at) * 1000000)::bigint` of the single active row for `(location_id, user_id, role)`, which `role_bindings_active_uq` guarantees is unique. A revoked binding with no re-grant yields no version, and the port returns `undefined`, which the resolver turns into `SessionPolicyError` and the handler into 401.

### D5. Fail closed at two points

The composition is parsed once per process. In review mode, if any required input is missing or invalid, the composition records a failure state. Every subsequent request resolves to `UnauthenticatedPrincipalError` (401 on mutations, unauthenticated rendering on reads). The failure is logged once, naming the variable, never the value. The composition never substitutes the synthetic ports. In synthetic mode the composition is the existing static ports and nothing about local development changes.

### D6. Context-free runtime helper

A new helper in `packages/db` runs `begin; set local role app_runtime; <one allowlisted contract>; commit` on a pooled connection without `set_app_context`. The allowlist is the set of 005b definer-function contracts by statement name; any other contract throws `DatabaseContextError("DB_CONTRACT_ACCESS_MISMATCH")`. The comment block in `transaction-context.ts:82-88` is extended to say why this helper exists and what it may call. This is the only place in the application that talks to the database without a tenant or support context.

### D7. Environment variables

| Variable | Kind | Used for |
|---|---|---|
| `OALO_DATABASE_URL` (existing) | server-only secret | pool for the identity, role, and session ports |
| `OALO_APP_URL` (existing, required outside local) | server-only | `expectedHost` for the mutation gate |
| `OALO_ALLOWED_ORIGINS` (existing, required outside local) | server-only | `allowedBrowserOrigins`, exact origins only |
| `OALO_CSRF_SERVER_SECRET` (new) | server-only secret, at least 32 bytes base64url | `csrfServerSecret` |
| `OALO_EMBEDDED_SESSION_ISSUER` (new, optional) | server-only | embedded policy `issuer` (https URL) |
| `OALO_EMBEDDED_SESSION_AUDIENCE` (new, optional) | server-only | embedded policy `audience` |
| `OALO_EMBEDDED_SESSION_PUBLIC_KEYS_JSON` (new, optional) | server-only | embedded policy `publicKeysById`, kid to SPKI PEM |

The three embedded variables are optional as a set: all present or all absent. When absent, `ports.embedded` is undefined and bearer requests keep failing closed exactly as today. Every new name is added to the required-variables section of `docs/production-environments.md`, and the public-env guard already rejects `SECRET`, `SESSION`, and `KEY` bearing names under any `NEXT_PUBLIC_` spelling.

## Acceptance criteria

| ID | Criterion | Finding |
|---|---|---|
| 005A-AC-001 | A server-only module `apps/web/src/server/runtime-authentication.ts` exports `resolveRuntimeCampaignCommandPorts(environment)`; `handleCampaignApproval`, `handleCampaignPreflight`, `loadWorkspaceCampaignsForRequest`, and the campaign detail page no longer default to `createDefaultCampaignCommandPorts()`; the static synthetic ports are constructed only when `authenticatedWorkspaceMode(environment) === "synthetic"`, proven by a unit test that spies on the factory. | C1 |
| 005A-AC-002 | In review mode, when `OALO_DATABASE_URL`, `OALO_CSRF_SERVER_SECRET`, `OALO_APP_URL`, or `OALO_ALLOWED_ORIGINS` is missing or invalid, every mutation returns 401 and every read renders unauthenticated; the synthetic ports are never constructed; the failure is logged once per process naming the variable and never its value. | C1 |
| 005A-AC-003 | The embedded policy is parsed from `OALO_EMBEDDED_SESSION_ISSUER`, `OALO_EMBEDDED_SESSION_AUDIENCE`, and `OALO_EMBEDDED_SESSION_PUBLIC_KEYS_JSON`; a partial set is a composition failure; when the set is absent `ports.embedded` is undefined and a bearer request returns 401; `isSessionActive` returns true only for a session ref present in the 005b store, not revoked, not expired. | C1 |
| 005A-AC-004 | The mutation gate uses the host of `OALO_APP_URL` as `expectedHost`, the exact entries of `OALO_ALLOWED_ORIGINS` as `allowedBrowserOrigins`, and the decoded `OALO_CSRF_SERVER_SECRET` (at least 32 bytes) as `csrfServerSecret`; through the exported `POST` route, a cookie-authenticated mutation with a wrong host, an unlisted origin, a missing `x-csrf-token`, or a token bound to a different session returns 401 and writes no campaign, command, approval, or audit row. | C1 |
| 005A-AC-005 | The Postgres-backed `IdentityDirectory` resolves `resolveLocationId(ref)` only when `ref` parses as a canonical location ref and the `platform.locations` row exists with `status = 'active'`, and `resolveActorId(ref)` only when the `platform.app_users` row exists with `status = 'active'`; every other input, including a well-formed ref for a missing or suspended row, resolves to `undefined` and the request to 401. | C1 |
| 005A-AC-006 | The Postgres-backed `RoleBindingPort.currentRoleVersion({ actorRef, locationRef, role })` maps `role` through the shared map, calls the 005b `current_role_version` function, and returns the derived version of the single active binding or `undefined`; a revoked binding, a suspended user, an inactive location, or a role the user does not hold returns `undefined`; a revoke followed by a re-grant returns a different version, so a session minted under the old binding is refused. | C1 |
| 005A-AC-007 | `packages/auth/src/role-binding-map.ts` is the only mapping between database roles and application roles in production code; it covers all six database roles and all six application roles in both directions per D2; it is exhaustively unit tested including the two "none" cases; `databaseRoleFor` in `packages/db/test/campaign-integration-support.mjs:365-369` is removed and the harness imports the shared module. | C1 |
| 005A-AC-008 | The Postgres-backed `FirstPartySessionLookup.getActive(secret, now)` hashes the secret with SHA-256, calls the 005b lookup function, and returns an `EstablishedFirstPartySession` only when the row is not revoked and `expires_at > now`, with `sessionId`, `userId`, `locationId`, and `installationId` in canonical form; the raw secret is never logged, stored, or compared in plaintext. | C1 |
| 005A-AC-009 | `packages/contracts/src/canonical-reference.ts` defines the format in D1 and exports format and parse functions plus `CanonicalReferenceSchema`; tests prove every canonical value passes `SafeTenantReferenceSchema`, `OpaqueReferenceSchema`, and `freezeAuthenticatedPrincipal`, and that a hyphenated reference, a 7-character reference, an uppercase-hex reference, and a 31-hex reference are each rejected at the composition boundary before `freezeAuthenticatedPrincipal` runs, with a distinct error class from the generic 401. | C1 |
| 005A-AC-010 | `/overview`, `/marketing/campaigns`, and `/marketing/campaigns/[campaignRef]` resolve the read principal through the runtime composition; in review mode without a valid session they redirect to `/review/sign-in` (005b) or render an explicit "not signed in" screen, and never render an empty tenant list or a fixture persona as if signed in; `loadWorkspaceCampaignsForRequest` no longer collapses `UnauthenticatedPrincipalError` into `[]`. | C1 |
| 005A-AC-011 | In review mode the authenticated layout derives session identity from the verified principal (location display name from `platform.locations.display_name`, user from `platform.app_users.safe_display_name`, role label from the application role) and projects navigation from that role; the synthetic fixture session is rendered only in synthetic mode; the review disclosure banner stays. | C1 |
| 005A-AC-012 | `postInternalJson` sends `x-csrf-token` on every request, reading the token from a server-rendered `<meta name="oalo-csrf-token">` element that the authenticated layout emits for a valid session (the token is `createSessionBoundCsrfToken` output, never the session secret); a component test proves the header is present and equal to the rendered token, and a unit test proves the layout never emits the cookie value. | C1 |
| 005A-AC-013 | Route-level tests through the exported `POST` in `apps/web/src/app/api/campaigns/approve/route.ts` and `preflight/route.ts`, with the real composition built from environment and a disposable Postgres inside `pnpm test:db`, cover: valid authorized session (200); absent session (401); expired session (401); revoked session (401); changed role version after revoke and re-grant (401); creator attempting approval (403 with one denied-attempt audit row); cross-tenant campaign ref from the outsider location (404); wrong origin, wrong host, missing CSRF, wrong CSRF (401 each); every negative case leaves the campaign, command, approval, and audit tables unchanged except the single denied row where the command specifies one. | C1 |
| 005A-AC-014 | Persistence across reload is proven at route level: create through the preflight route with a creator session, close and reopen the pool, resolve a fresh principal from the same session cookie, read through `loadWorkspaceCampaign`, and assert the version, preflight, and state are equal; then approve through the approve route with an approver session and assert a fresh read shows `approved`. | C1 |
| 005A-AC-015 | A test sets `OALO_ENVIRONMENT=preview`, `OALO_REVIEW_SURFACE=authorized`, `OALO_PROVIDER_MODE=stub`, `OALO_SYNTHETIC_DATA_ONLY=true`, no cookie, and no bearer, and asserts 401 on both exported routes and that `createLocalSyntheticPrincipal` is never invoked; a second test repeats it with `OALO_ENVIRONMENT=production` and asserts the same. | Constraint |
| 005A-AC-016 | Request bodies to either route that carry `locationRef`, `locationId`, `actorRef`, `installationRef`, `role`, or `roleVersion` are rejected with 400 by the existing `.strict()` schemas, proven by a test for each field. | Constraint |
| 005A-AC-017 | Every new environment name in D7 is listed in `docs/production-environments.md`, `pnpm audit:secrets` and the public-env guard tests prove no `NEXT_PUBLIC_` spelling of any of them is accepted, and `tooling/tests/unit/delivery-observability/public-env-guard.test.ts` gains one case per new secret-bearing name. | Constraint |
| 005A-AC-018 | No HighLevel, Meta, Stripe, or lead-routing side effect becomes reachable; `tests/security/provider-side-effect-default-off.test.ts` passes unchanged; nothing in this sub-PRD touches `packages/ghl/src/live-oauth-disabled.ts`. | Constraint |

## Files expected to change

Verified paths and line ranges at `c140f11`; new files are marked.

- `apps/web/src/server/runtime-authentication.ts` (new): composition, fail-closed state, single resolver.
- `apps/web/src/server/postgres-authentication-ports.ts` (new): identity directory, role binding port, first-party session lookup, embedded `isSessionActive`, all through the 005b functions.
- `apps/web/src/server/authenticated-principal.ts:156-175`: `createDefaultCampaignCommandPorts` stays for synthetic mode and tests, but no production caller uses it as a default outside that mode; `:36-69` interfaces unchanged.
- `apps/web/src/server/campaign-approval-handler.ts:52-56` and `campaign-preflight-handler.ts:25-29`: default `ports` argument replaced by the runtime resolver.
- `apps/web/src/server/campaign-workspace-reads.ts:53-86`: `loadOverviewCampaigns` and `loadWorkspaceCampaignsForRequest` stop swallowing `UnauthenticatedPrincipalError`; the read entry points use the runtime resolver.
- `apps/web/src/app/(authenticated)/marketing/campaigns/[campaignRef]/page.tsx:16-30`, `overview/page.tsx:8-11`, `marketing/campaigns/page.tsx:9-11`: principal from the runtime resolver; unauthenticated branch.
- `apps/web/src/app/(authenticated)/layout.tsx:9-19`: principal-derived session view model and navigation in review mode; CSRF meta tag.
- `apps/web/src/features/shell/components/app-shell.tsx:17-35` and `apps/web/src/features/shell/model/navigation.ts:33-40`: accept a principal-derived session shape alongside the fixture shape.
- `apps/web/src/features/http/internal-api.ts:3-14`: send `x-csrf-token`.
- `packages/contracts/src/canonical-reference.ts` (new) and `packages/contracts/src/index.ts`: export.
- `packages/auth/src/role-binding-map.ts` (new) and `packages/auth/src/index.ts`: export.
- `packages/db/src/transaction-context.ts:82-88` and a new `packages/db/src/runtime-function-query.ts`: the context-free allowlisted helper (D6); export from `packages/db/src/index.ts`.
- `packages/db/test/campaign-integration-support.mjs:365-369`: delete `databaseRoleFor`, import the shared map.
- `docs/production-environments.md`: new server variables (D7).
- `tooling/scripts/database/run-real-database-tests.mjs`: run a new vitest project for `apps/web/src/**/*.postgres.test.ts` after the disposable database is migrated, with the same fail-not-skip and empty-discovery-is-an-error rules as the existing integration step; `vitest.config.ts`: the new project.
- Tests: `apps/web/src/server/runtime-authentication.unit.test.ts`, `postgres-authentication-ports.postgres.test.ts`, `campaign-approval-handler.postgres.test.ts`, `campaign-preflight-handler.postgres.test.ts` (new); `packages/contracts/src/canonical-reference.test.ts`, `packages/auth/src/role-binding-map.test.ts` (new); component test for the browser helper under `apps/web/src/features/http/`.

## Test plan

- **Unit** (`pnpm test:unit`): composition parsing for every variable in D7 (present, absent, malformed, partial embedded set); fail-closed state; synthetic-mode gate; canonical reference format and parse round trips against all three schemas; role map exhaustiveness in both directions; CSRF meta emission without the cookie value; strict-schema rejection of browser-supplied identity fields.
- **Integration against real Postgres** (`pnpm test:db`, the canonical gate): identity directory and role binding port against seeded rows through the 005b functions, covering active, suspended user, inactive location, revoked binding, wrong role, and revoke-then-re-grant; session lookup against issued, expired, and revoked rows; the context-free helper refusing a non-allowlisted contract.
- **Route-level through the exported handler** (`pnpm test:db`, new `apps/web/src/**/*.postgres.test.ts` project): the full 005A-AC-013 matrix and the 005A-AC-014 reload proof, invoking `POST` from `route.ts` with a `Request` that carries the cookie, origin, host, and CSRF header exactly as a browser would.
- **Browser** (`pnpm test:browser`, Playwright against `next start` on `127.0.0.1:3100` in synthetic mode): a spec asserts the mutation request from the draft builder carries `x-csrf-token` whenever the page rendered one, and that no request carries the `__Host-oalo_session` value in a header other than `cookie`. The deployed review-mode browser proof is 005e's.
- **Should, not a criterion:** a `session-runtime` check in `/api/health/ready` that reports `CONFIGURATION_INVALID` when the composition failed, so a misconfigured review deployment is visible before the first 401.

## Security notes

- The composition never falls back to the synthetic principal outside synthetic mode. The review's forbidden shortcuts are each a non-goal above and each has a criterion that proves its absence (005A-AC-015 impersonation, 005A-AC-016 browser identity fields, 005A-AC-004 CSRF and origin, 005A-AC-006 role verification, D6 and 005b for the database account).
- The session secret is compared only as a SHA-256 hash inside the 005b lookup function. The page embeds the session-bound CSRF token, which is an HMAC of the session ref under a server secret, not the cookie value.
- The context-free helper is the one path that reads without tenant context. Its allowlist is enumerated, tested, and reviewed by `security-guardian`; adding a contract to it is a security change.
- Public keys for the embedded policy are public material and may live in an env variable; they are still server-only because the name carries `KEY` and the guard rejects any `NEXT_PUBLIC_` spelling.
- Logging: composition failures name variables, never values. Session refs may be logged; session secrets and CSRF tokens may not.

## Open questions

- [ ] Should the unauthenticated read branch redirect to `/review/sign-in` or render an inline "not signed in" screen? Redirect is the recommendation because it keeps the fixture shell out of the review path entirely; either satisfies 005A-AC-010.
- [ ] Whether `/api/health/ready` should carry a `session-runtime` check (listed as a should in the test plan).

## Exact operator ask

None for the code. The operator asks that make this sub-PRD provable on a deployed URL (isolated review database, server-only env names, the sign-in secret, and the seeding run) are collected once in [PRD-005e](./prd-005e-authenticated-review-runtime-deployed-qualification.md).

## Blockers (honest)

| Blocker | Owner | Unblock |
|---|---|---|
| 005b definer functions and session table | Engineering (005b) | Merge 005b's migration and pgTAP first, or in the same PR |
| Route-level Postgres tests need a Docker-capable runner | CI `database` job on `ubuntu-24.04` | Already available; local runs need Docker Desktop, which the recon confirmed is installed on the workstation but must be re-checked before use |

## Related

- [PRD-005b: review session issuance and store](./prd-005b-authenticated-review-runtime-review-session-issuance.md)
- [PRD-005c: correlation and retry idempotency](./prd-005c-authenticated-review-runtime-correlation-and-retry-idempotency.md)
- [PRD-003b: session command context](../../in-work/prd-003-authenticated-product-activation/prd-003b-authenticated-product-activation-session-command-context.md) (principal contract, `003B-AC-001` through `007`, and the risk note on UUID versus opaque identity that D1 resolves)
- [PRD-004d: real-Postgres command gate](../../in-work/prd-004-reviewable-go-live/prd-004d-reviewable-go-live-postgres-command-gate.md) (the gate the new route-level tests join)
- [Database runtime role activation](../../../../docs/operations/database-runtime-role.md)
- [Production environment contract](../../../../docs/production-environments.md)

## Amendments

- **2026-09-21, 005A-AC-015, the never-invoked half made real.** Text said: 005A-AC-015 requires a test that "asserts 401 on both exported routes and that `createLocalSyntheticPrincipal` is never invoked" under `preview`/`production` without review-mode credentials. Actual prior state, per the landing commit's own body: that half was not actually proven. The resolver's only production call of `createLocalSyntheticPrincipal` went through `authenticated-principal.ts`'s own local module binding to a function declared beside it, and `vi.mock('./authenticated-principal.js')` replaces only the namespace an importer sees, never a module's reference to its own export, so the spy at `runtime-authentication.unit.test.ts:296,303` recorded nothing the resolver did, and `not.toHaveBeenCalled()` held even on a build that constructed a synthetic principal on a review or production deployment. Code does (Wave 7s, commit `2ec5245`): the factory and its constants move to their own module, `apps/web/src/server/local-synthetic-principal.ts`, which `runtime-authentication.ts`'s resolver imports directly and which `authenticated-principal.ts` re-exports, so the seam the test mocks is now the seam the production path actually crosses. The test gained a positive control on the same exported route in local synthetic mode (proving the mock fires when it should), and the production-mode negative case now drives both exported routes rather than only approve. Verified by mutation: loosening the mode guard makes the spy assertion alone report "expected vi.fn() to not be called at all, but actually been called 2 times." Why: makes 005A-AC-015's never-invoked half a real proof instead of a vacuously-passing one. Touches: 005A-AC-015.
- **2026-09-21, 005A-AC-011, the session-display fallback no longer renders a canonical reference.** Text said: 005A-AC-011 describes the success path only (deriving the location and user display names from the verified principal through the display read) and is silent on what the shell renders when that read fails or is unreachable. Code does (Wave 7u, commit `79edb3e`): `resolveRuntimeShellSession` in `apps/web/src/server/runtime-authentication.ts` now wraps the display read in `resolveSessionDisplayNames`, which catches any failure and returns `undefined`; the caller's fallback changed from `principal.actorRef` / `principal.locationRef` (a raw canonical reference, for example `actor_<32 hex>`) to `SESSION_USER_FALLBACK` ("You") and `SESSION_WORKSPACE_FALLBACK` ("Your workspace"), both from `apps/web/src/copy/user-language.ts`. Before this landed, an unreachable or erroring display read also failed the whole authenticated layout, because the read was awaited bare with no catch; a transient failure on this one optional read took down every page inside the shell for a person who was signed in and entitled to see them. Why: closes two problems the criterion's success-path wording did not disclose: a canonical-reference leak on a degraded read (which 006B-AC-006 forbids product-wide, and which this composition itself was the one source of), and a needless full-page failure on a read whose own contract already answers `undefined` for an inactive location or person. Touches: 005A-AC-011.
- **2026-09-21, 005A-AC-010, `campaign-workspace-reads.ts` no longer treats a workspace-classification failure as signed-out.** Text said: 005A-AC-010 requires that in review mode without a valid session the read pages redirect or render an explicit "not signed in" screen and "never render an empty tenant list or a fixture persona as if signed in," and names only `UnauthenticatedPrincipalError` as the error `loadWorkspaceCampaignsForRequest` must stop swallowing into `[]`. Code does (Wave 7u, commit `79edb3e`): `apps/web/src/server/campaign-workspace-reads.ts`'s `readWorkspaceCampaignsForRequest` and `readWorkspaceCampaignForRequest` now catch only `UnauthenticatedPrincipalError` into the "not signed in" read result; `AuthenticatedWorkspaceUnavailableError` (a deployment whose workspace mode cannot be classified) now propagates to the route's error boundary instead of being caught into the same result. Before this landed both error types were caught identically. Why, per the function's own updated comment: a deployment that cannot classify its workspace mode is broken, not signed out; catching it here sent an operator to retype credentials that were never the problem, and hid a misconfigured host behind ordinary "please sign in" product behaviour. Propagating it still fails closed: no tenant row is read or rendered either way. Touches: 005A-AC-010.
