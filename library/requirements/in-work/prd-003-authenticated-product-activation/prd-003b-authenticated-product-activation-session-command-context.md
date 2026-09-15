# PRD-003b: Authenticated Product Activation - Session Command Context

> **Parent:** [PRD-003](./prd-003-authenticated-product-activation-index.md)
> **Status:** Done (`2ee2634`, PR #55)
> **Priority:** P0
> **Schema changes:** None expected

## Goal

Turn the authenticated web session into the sole authority for tenant, actor, installation, and role on campaign commands, replacing synthetic hard-coded principals such as `location_localWorkspace001` and `principal_localUser001` outside explicit local mode.

## Scope

- Introduce one server-side authenticated principal abstraction usable by route handlers and Server Actions.
- Resolve embedded HighLevel sessions and first-party sessions into the same application principal shape.
- Build `TenantContextAuthority` from that principal for database transactions.
- Map verified application roles to campaign permissions without trusting browser-provided roles.
- Reject missing, expired, revoked, mismatched-location, or stale-role sessions before application command execution.
- Keep a deliberate local synthetic principal adapter available only when the authenticated workspace mode explicitly permits synthetic operation.

## Non-Goals

- Completing the external HighLevel App Test matrix (G2 remains externally gated).
- Adding new OAuth scopes or changing HighLevel token storage.
- Provider publishing authority.
- General-purpose organization/agency switching in the browser.

## Principal contract

The server-facing principal should expose only verified data required by the application layer, for example:

- actor/user reference and UUID used for audit/database context
- `locationId` and location reference
- installation reference
- current role and role-binding version
- session identifier
- authentication mode (`embedded`, `first_party`, or explicit `local_synthetic`)

The browser must not be able to supply or override the first five fields through a command payload.

## User stories

### US-003B.1 - Create in the correct tenant

**As a** signed-in loan officer, **I want** campaign creation automatically bound to my verified location, **so that** I cannot accidentally or maliciously create data in another tenant.

Acceptance criteria:

- `003B-AC-001`: campaign creation derives location from the verified session and ignores/rejects any browser-supplied tenant field.
- `003B-AC-002`: session location and database transaction location must match before any campaign SQL runs.
- `003B-AC-003`: a valid campaign ref belonging to another location resolves as not accessible and never leaks whether the resource exists.

### US-003B.2 - Enforce current role

**As a** platform operator, **I want** campaign actions checked against the user's current role binding, **so that** stale or elevated client state cannot authorize a mutation.

Acceptance criteria:

- `003B-AC-004`: stale role versions fail before command execution.
- `003B-AC-005`: `campaign_creator` may create/freeze a campaign but cannot approve it solely by being its creator.
- `003B-AC-006`: `campaign_approver` may reach the approval command only after server-side authority checks.
- `003B-AC-007`: `viewer` cannot execute campaign mutations.

## Application boundary

- Add a web-server adapter that resolves the current session into an application principal.
- Add an `ApprovalAuthorityPort` implementation backed by verified role/session context and persisted tenant membership/role mapping as required.
- All command handlers construct correlation IDs server-side and pass the principal through application/use-case boundaries rather than reading global request state deep in repositories.

## Files expected to change

- `apps/web/src/server/*session*` or a new authenticated-principal module
- `packages/auth/src/*` only where an adapter contract is missing
- `packages/db/src/transaction-context.ts` only if the authority adapter needs a safe extension
- campaign route handlers / Server Actions
- auth/session contract and integration tests

## Test plan

- Unit: embedded and first-party sessions normalize to the same principal contract.
- Unit: local synthetic principal is impossible when environment mode is staging/production-capable.
- Integration: request body cannot override location, actor, role, or installation.
- Integration: revoked/stale session and role binding fail closed.
- Security: cross-tenant campaign ref and role-tampering cases.

## Risks

- Mixing UUID database actor IDs with opaque provider/user refs can create inconsistent audit identity. The adapter must define the mapping once.
- A convenience fallback to synthetic identity outside local mode would silently defeat the entire tenant boundary and is a release blocker.

