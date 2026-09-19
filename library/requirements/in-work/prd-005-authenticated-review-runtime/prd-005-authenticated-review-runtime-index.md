# PRD-005: Authenticated Review Runtime

> **Status:** Backlog
> **Priority:** P1. The 2026-09-19 completion review rates C1 (real request authentication) and C4 (deployed qualification) P1 and C2 (correlation validation and retry idempotency) and C3 (stale handoff documents) P2. They ride in one batch because C2's proof runs through the request path C1 builds, and C3 and C4 must cite what C1 and C2 actually merged.
> **Effort:** XL (> 3d engineering, plus operator time for the isolated review database and the deployed proof)
> **Schema changes:** Additive (005b adds a first-party session store and its functions; nothing existing changes shape)
> **Close-out:** `security-guardian` then `quality-guardian` on the final tree, never reversed, and again after any later change to auth, session, CSRF, or role code

---

## Overview

PRD-003 put the campaign domain, the tenant-scoped Postgres repositories, the verified-principal contract, and the human approval command on `main`. PRD-004d proved the create and approve round trips against real Postgres inside the canonical `pnpm test:db` gate (CI run `35058370796` at `dab2ec6`, merged as PR #65, `c140f11`). What is still missing is the piece a real person needs: the exported HTTP routes and the authenticated pages compose their authentication ports from a static local synthetic default, and outside synthetic mode that default denies everyone. The completion review dated 2026-09-19 (`C:\Users\jzfer\Downloads\oalo-completion-review-2026-09-19.md`, outside this repository) records this as finding C1 and adds three more: a correlation reference validation mismatch that turns some valid approvals into 400s and a retry ordering that turns an identical retry into a 409 (C2), handoff documents that still describe the Postgres gate as parked (C3), and no deployed proof of the review URL (C4).

PRD-005 closes those four findings and nothing else. It builds a server-only runtime composition that supplies real session, identity, role, and mutation-gate implementations to every campaign read and mutation entry point; adds the minimum honest way for a real human to obtain a real first-party session on the review deployment without HighLevel SSO; makes correlation handling and approval retries correct at the request boundary; reconciles the handoff documents against the ledger with evidence; and defines the deployed seven-point proof with an exact, non-secret operator ask.

This PRD does not authorize production traffic, provider writes, HighLevel OAuth or signed-context exchange, Meta, lead routing, Stripe, or any change to the 28 `DEFERRED: LIVE HIGHLEVEL AUTH` rows. G1, G4, and G8 remain `ACCEPTED CONSTRAINT`.

---

## Goals

- A real first-party session, minted through an operator-authorized path on the review deployment, reaches the intended `platform.locations` row and application role through the same verification code the future HighLevel exchange will use.
- Every campaign read (`/overview`, `/marketing/campaigns`, `/marketing/campaigns/[campaignRef]`, the authenticated layout) and every campaign mutation (`/api/campaigns/preflight`, `/api/campaigns/approve`) resolves its principal through the runtime composition, and outside synthetic mode a missing or invalid composition denies rather than falling back.
- Browser mutations carry the session-bound CSRF header and pass the exact-origin and host checks that already exist in `packages/auth`.
- Correlation references satisfy one contract at the handler, the application command, the denied-attempt path, and the tenant transaction, and an identical retried approval returns the idempotent duplicate result.
- The terrain rule, the project map, the operator runbook, the PRD-004 index, the smoke evidence pack, and the batch ledger agree with `EXECUTION_LEDGER.md` and PRD-004d, with a citation on every changed line.
- One recorded deployment SHA on the existing Vercel project, backed by an isolated review database, passes the review's seven-point proof with evidence retained outside git.

## Non-Goals

- HighLevel OAuth, signed-context exchange, token refresh, or App Test evidence. `packages/ghl/src/live-oauth-disabled.ts` stays disabled by design. G2 remains externally gated and nothing here satisfies any of its 28 deferred criteria.
- Synthetic impersonation on a review or production deployment. The `local_synthetic` principal stays available only when `authenticatedWorkspaceMode()` returns `synthetic`.
- Accepting a tenant, actor, installation, or role from the browser on any campaign command.
- Removing or weakening CSRF, origin, host, role-version, or expiry checks.
- A privileged database account standing in for tenant authorization. The application login role stays outside `migration_owner`, and every tenant read and write still runs under `app_runtime` with `platform.set_app_context`.
- Widening `OpaqueReferenceSchema` or any database check constraint to accept HTTP tracing strings.
- A second Vercel project, a production database, or any provider credential on the review deployment.
- PRD-002 add-ons, Marketplace submission (PRD-004b and 004c stay where they are), and anything in the External Evidence Sprint waves.

---

## Sub-features

| Sub-PRD | Scope | Finding | Status |
|---|---|---|---|
| [`prd-005a-authenticated-review-runtime-runtime-auth-composition`](./prd-005a-authenticated-review-runtime-runtime-auth-composition.md) | Server-only runtime composition of `CampaignCommandPorts` from environment and Postgres, wired into every read and mutation entry point, fail-closed outside synthetic mode, canonical reference format, browser CSRF header | C1 | Draft |
| [`prd-005b-authenticated-review-runtime-review-session-issuance`](./prd-005b-authenticated-review-runtime-review-session-issuance.md) | Additive first-party session store with pgTAP, operator-authorized review sign-in and sign-out, audit events, non-secret seeding procedure for a review location and two users | C1 dependency | Draft |
| [`prd-005c-authenticated-review-runtime-correlation-and-retry-idempotency`](./prd-005c-authenticated-review-runtime-correlation-and-retry-idempotency.md) | Canonical correlation reference at the request boundary, one validator across four sites, idempotent retry ordering, route-level regression matrix | C2 | Draft |
| [`prd-005d-authenticated-review-runtime-handoff-reconciliation`](./prd-005d-authenticated-review-runtime-handoff-reconciliation.md) | Reconcile terrain rule, project map, runbook, PRD-004 index, smoke pack, batch ledger, and library READMEs against the ledger and PRD-004d with evidence on every change | C3 | Draft |
| [`prd-005e-authenticated-review-runtime-deployed-qualification`](./prd-005e-authenticated-review-runtime-deployed-qualification.md) | Agent-executable inspection and `/api/version` hardening, preview deploy on the existing project, the seven-point proof, exact operator asks, PR #50 and subagent-note dispositions | C4 | Draft |

One sub-PRD per finding, with one exception: C1 is split into 005a (composition and wiring) and 005b (the session store and issuance path). The split exists because 005b is the only part that adds schema, needs pgTAP, and has a documented operator seeding step, and because 005b is the drop-in point for the future signed-context exchange. Keeping it separate keeps that boundary visible.

## Dependency order

1. **005b migration and database functions first.** 005a's Postgres-backed identity directory, role binding port, and session lookup call the `security definer` functions 005b adds, because before a principal exists there is no tenant context and `app_runtime` cannot read `platform.app_users` at all (foundation migration line 1744 grants it `select` on `locations`, `role_bindings`, and `marketplace_installations` only). The migration and its pgTAP suite must be green in `pnpm test:db` before 005a's route-level tests can run.
2. **005a composition and wiring.** Once the functions exist, 005a builds the ports, replaces every default-argument fallback, wires the pages and layout, and adds the CSRF header to the browser helper.
3. **005b sign-in, sign-out, and seeding.** The routes depend on 005a's cookie handling and mutation gate. 005a and 005b may merge in one PR; if they merge separately, 005b's migration ships with 005a and the routes follow.
4. **005c** is independent of 005a and 005b at the code level, but its route-level regression matrix must run through the real composition, so it lands after 005a. Its retry fix is one reorder in the application command and may be authored in parallel.
5. **005d** runs after 005a, 005b, and 005c merge, so every reconciled line can cite the PR, commit, and CI run that actually exist.
6. **005e** runs last on the merged tree. Its operator asks (isolated review database, server-only env names, sign-in secret, seeding run) go out on day one because they are the long pole.
7. **Close-out:** `security-guardian`, then `quality-guardian`, on the tree that 005e deploys. Do not run quality first. Security fixes to auth or session code invalidate a prior quality result.

---

## Acceptance criteria

Module-level criteria. Sub-PRD criteria use the `005X-AC-NNN` scheme inside each file and name the finding they trace to.

| ID | Criterion | Finding |
|---|---|---|
| ARR-001 | Given a review deployment (`OALO_ENVIRONMENT=preview`, `OALO_REVIEW_SURFACE=authorized`, `OALO_PROVIDER_MODE=stub`, `OALO_SYNTHETIC_DATA_ONLY=true`), when a request carries no valid first-party session, then every campaign read renders an unauthenticated state (no tenant data, no fixture persona presented as a session) and every campaign mutation returns 401, and no code path constructs the `local_synthetic` principal. | C1 |
| ARR-002 | Given a first-party session minted by 005b for a seeded creator, when the browser creates an Open House Boost through the exported `POST /api/campaigns/preflight` and reloads `/marketing/campaigns/[campaignRef]`, then the campaign is read back from Postgres for that location only, and a session for the seeded outsider location cannot read or mutate it. | C1, C4 |
| ARR-003 | Given a seeded approver session with current evidence, when approval is submitted through the exported `POST /api/campaigns/approve` with the browser's own headers (cookie, origin, host, `x-csrf-token`), then it commits, and an identical retried request that carries the pre-approval `expectedRowVersion` returns 200 with `duplicate: true` and writes no second command or audit row. | C1, C2 |
| ARR-004 | Given any `x-correlation-id` header value (canonical opaque, UUID, punctuation, absent, over-length), when an otherwise valid approval executes, then the HTTP outcome is independent of the header's shape and every stored correlation reference satisfies the opaque contract. | C2 |
| ARR-005 | Given the reconciled documents, when compared line by line to `EXECUTION_LEDGER.md` rows `GGL-001` through `GGL-B16` and to PRD-004d, then no document still describes `GGL-B16` as parked or the Postgres gate as unobserved, every changed status line cites a PR number, commit SHA, or CI run id, and no acceptance status changed. | C3 |
| ARR-006 | Given one recorded deployment SHA on `operation-automated-lo-web` backed by an isolated review database, when the seven-point proof in 005e runs, then all seven points pass with evidence retained outside git and only names, URLs, SHAs, and run ids recorded in git. | C4 |
| ARR-007 | Given this batch completes, then no HighLevel, Meta, Stripe, or lead-routing side effect is newly enabled by default, none of the 28 `DEFERRED: LIVE HIGHLEVEL AUTH` rows flips, G1, G4, and G8 remain `ACCEPTED CONSTRAINT`, no second Vercel project exists, and `PRODUCTION_EXECUTION_LEDGER.md` criterion rows are byte-identical to `c140f11`. | Constraint |
| ARR-008 | Given the batch's code changes, then `security-guardian` runs before `quality-guardian` on the final tree, and both pass with no unresolved Critical or High finding. | Constraint |

### Finding traceability

| Finding | Priority in review | Owning sub-PRDs | Module criteria |
|---|---|---|---|
| C1 real request authentication is not composed into the campaign endpoints | P1 | 005a, 005b | ARR-001, ARR-002, ARR-003 |
| C2 approval tracing IDs and event IDs have incompatible validation, plus the retry ordering | P2 | 005c | ARR-003, ARR-004 |
| C3 handoff documentation is stale | P2 | 005d | ARR-005 |
| C4 deployed qualification is not demonstrated | P1 for acceptance | 005e | ARR-006 |

---

## Data model changes

Additive only, owned by 005b: `platform.first_party_sessions` plus `security definer` functions for issuance, lookup, role-version resolution, revocation, and review persona resolution, with RLS and grants consistent with `supabase/migrations/20260721010000_platform_foundation.sql`. No existing table, column, constraint, or policy changes. The 28-character-minimum opaque check constraints on the campaign tables are untouched.

## API changes

- `POST /api/campaigns/preflight` and `POST /api/campaigns/approve`: no payload change. They now require a valid session and the browser mutation headers outside synthetic mode, and they emit `x-oalo-correlation-ref` on every response.
- New, review mode only: `GET /review/sign-in` (page), `POST /api/review/session` (issue), `POST /api/review/session/sign-out` (revoke). Refused with 404 outside review mode and always refused when `OALO_ENVIRONMENT=production`.
- `GET /api/version`: returns a handled 503 JSON body instead of an empty 500 when the environment contract is not satisfied.

---

## Open questions

- [ ] 005b: the operator's isolated review Postgres may be a managed instance whose database is named `postgres`. The seeding script's guard therefore checks for the absence of foreign active locations and requires an explicit `--confirm-database <name>` rather than a name prefix. Confirm the operator accepts that guard, or supply a dedicated database name.
- [ ] 005b: whether the review sign-in route needs a rate limiter in addition to a 32-byte secret, constant-time comparison, and audited failures. Recorded for `security-guardian` to rule on during close-out.
- [ ] 005e: whether the operator wants the review deployment on the existing `operation-automated-lo-web.vercel.app` production alias or on a preview URL of the same project. Either satisfies "no second project"; the OAuth callback decision in PRD-004b depends on it.
- [ ] 005a: whether to add a `session-runtime` check to `/api/health/ready` so a misconfigured composition is visible before the first 401. It is listed as a should in the 005a test plan, not as a criterion.

---

## Related

- Completion review (outside this repository): `C:\Users\jzfer\Downloads\oalo-completion-review-2026-09-19.md`
- [PRD-003: Authenticated Product Activation](../../in-work/prd-003-authenticated-product-activation/prd-003-authenticated-product-activation-index.md)
- [PRD-003b: session command context](../../in-work/prd-003-authenticated-product-activation/prd-003b-authenticated-product-activation-session-command-context.md) (the principal contract this PRD composes)
- [PRD-004: Reviewable Go-Live](../../in-work/prd-004-reviewable-go-live/prd-004-reviewable-go-live-index.md)
- [PRD-004a: preview deploy and smoke](../../in-work/prd-004-reviewable-go-live/prd-004a-reviewable-go-live-preview-deploy-smoke.md)
- [PRD-004d: real-Postgres command gate](../../in-work/prd-004-reviewable-go-live/prd-004d-reviewable-go-live-postgres-command-gate.md) (the proof C3 reconciles against)
- [Go-live raid ledger](../../../../EXECUTION_LEDGER.md#gauntlet-raid-go-live-remaining-in-repo-code) (`GGL-001` through `GGL-B16`)
- [Production environment contract](../../../../docs/production-environments.md)
- [Reviewable preview smoke evidence pack](../../../../docs/operations/evidence-packs/reviewable-preview-smoke.md)
- [Production tonight operator runbook](../../../knowledge/private/operations/production-tonight-operator-runbook.md)
- [Project map](../../../knowledge/private/product/project-map.md)
- [Agent terrain map](../../../../.cursor/rules/core/the-map.mdc)
- [Database runtime role activation](../../../../docs/operations/database-runtime-role.md)
- [2026-09-16 production-tonight coverage report](../../reports/2026-09-16-production-tonight-requirements-coverage-report.md)
