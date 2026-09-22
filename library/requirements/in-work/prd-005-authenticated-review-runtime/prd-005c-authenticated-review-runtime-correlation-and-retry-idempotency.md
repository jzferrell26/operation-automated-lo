# PRD-005c: Authenticated Review Runtime - Correlation Reference Boundary and Approval Retry Idempotency

> **Parent:** [PRD-005](./prd-005-authenticated-review-runtime-index.md)
> **Status:** Draft
> **Priority:** P2 (completion review finding C2, correctness defect, plus the retry ordering the review flagged as an additional regression target)
> **Schema changes:** None
> **Owner Guardians:** `typescript-node-guardian` (handler, command, and validator changes), `http-rest-fundamentals-guardian` (header semantics and status-code honesty), `db-guardian` (validator adoption in the transaction context)

## Goal

Make correlation handling correct at the request boundary and make an identical retried approval idempotent. After this sub-PRD, one canonical opaque correlation reference is generated or mapped once per request, the same validator guards it at the handler, the application command, the denied-attempt path, and the tenant transaction, the inbound tracing header stays a distinct value that never reaches the database, and a retried approval that carries the pre-approval row version returns the duplicate result rather than a 409.

## Background (honest)

Verified at `c140f11`.

- `apps/web/src/server/campaign-approval-handler.ts:36,42-46`: `correlationRefFor` accepts an `x-correlation-id` matching `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,299}$` and passes it through unchanged. When the header is absent or fails that pattern it falls back to `correlation_approve_<last 24 chars of campaignRef>`.
- `packages/application/src/campaign-approval-command.ts:258-274`: that string becomes `CampaignEventSchema.correlationRef`, which is `OpaqueReferenceSchema` (`packages/contracts/src/campaign-foundation.ts:3-7,455-468`): 8 to 128 characters matching `^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$`. A UUID or `trace-123` passes the handler and throws a `ZodError` inside the command on an otherwise valid approval. `campaignCommandAuthErrorResponse` maps the `ZodError` to 400 `INVALID_CAMPAIGN_COMMAND` (`campaign-command-http.ts:46-51`), so a valid approval fails because of a tracing header.
- The same raw header reaches `recordDeniedAttempt` (`campaign-approval-command.ts:216-223`) and `commitApproval` (`:278-287`) as `correlationId`, and the tenant transaction validates correlation IDs with the wide pattern (`packages/db/src/transaction-context.ts:68,302`). `createCampaignTenantContext` in the application also uses the wide pattern (`campaign-command-context.ts:11,121`). Three validators, two shapes.
- The review reproduced the mismatch with a dependency-free comparison: `correlation_review123` accepted by both; `trace-123`, a UUID, and `correlation_` plus 129 `a` characters accepted by the HTTP helper and rejected by the event contract. PR #66 (closed unmerged, superseded by PR #65) independently hit the hyphen-versus-underscore trap in a test fixture, and the raid log records fixing `-denied` / `-approved` to `_denied` / `_approved` (`EXECUTION_LEDGER.md`, 2026-09-16 entry).
- The rest of the system already uses the opaque shape for correlation: every durable contract field named `correlationId` is `OpaqueReferenceSchema` (`packages/contracts/src/durable-foundation.ts:39,66,92,105,142`); the task worker emits `correlation_<digest>` (`apps/tasks/src/tasks/reconcile-publication-cleanup.ts:118`); the web persistence runtime emits `correlation_workspace_<sessionId>` (`campaign-persistence-runtime.ts:106-108`); the observability package generates `corr_<32 hex>` (`packages/observability/src/correlation.ts:4,54`), which is also opaque-shaped. The only source of non-opaque correlation values is the inbound HTTP header, so tightening the db-layer validator to the opaque shape breaks no existing caller. The wide `SAFE_REFERENCE_PATTERN` in `transaction-context.ts:68` stays for `subjectType` and `subjectId` in support contexts, which are not correlation IDs.
- Retry ordering: `executeHumanCampaignApproval` checks `hintsMatch` (`campaign-approval-command.ts:168-170`), which includes `expectedRowVersion` (`:138-140`), before the existing-approval duplicate branch (`:171-185`). The browser always sends `expectedRowVersion` (`campaign-approval-controls.tsx:52-59`). After a successful approval the row version has advanced, so a retried, otherwise identical request carrying the pre-approval version throws `CampaignApprovalStaleError` and the handler returns 409 `CAMPAIGN_APPROVAL_CONFLICT` (`campaign-command-http.ts:40-42`) instead of the `duplicate: true` result the command and repository were built to return (`campaign-repository.ts:796-813` has its own idempotent branch keyed on `commandKey`, but it is never reached). The existing unit test at `campaign-approval-handler.unit.test.ts:188-217` exercises a retry; the criterion below requires the retry to carry the pre-approval `expectedRowVersion` exactly as the browser does.

## Scope

- One exported correlation schema and one boundary function that yields a canonical reference per request.
- Adoption of that schema at the four sites: handler, `createCampaignTenantContext`, the denied-attempt path, and `validateTenantContext` for `correlationId`.
- The inbound tracing header kept as a distinct value: echoed, logged, never persisted into a correlation column.
- Reorder in the approval command so an identical retry is idempotent.
- Route-level regression matrix through the exported route with an authorized approver and current evidence.

## Non-Goals

- Widening `OpaqueReferenceSchema`, `CampaignEventSchema`, or any database check constraint.
- Changing the observability package's `corr_` correlation context or the W3C `traceparent` handling. That layer keeps its own identifiers; this sub-PRD only decides what reaches the campaign domain and the database.
- Changing the preflight handler's correlation policy beyond adopting the same boundary function, so both routes behave identically.
- Any change to the approval decision semantics, the stale-evidence rules, or the `commandKey` idempotency in the repository.

## Design decisions

### D1. One schema, exported once

`packages/contracts/src/campaign-foundation.ts:3-7` exports `OpaqueReferenceSchema` (today a module-private `const`) and adds `CorrelationReferenceSchema = OpaqueReferenceSchema`. `packages/contracts/src/index.ts` exports both. The private copy in `campaign-approval-handler.ts:18-22` is deleted in favour of the import, which also removes a jscpd duplicate.

### D2. Canonical reference at the boundary

A shared server function `correlationReferenceForRequest(request, routeName)` in `apps/web/src/server/correlation-boundary.ts`:

1. Reads `x-correlation-id`. If present and it matches the tracing pattern `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,299}$`, it is the request's `tracingId`. Otherwise `tracingId` is undefined.
2. Produces `correlationRef = correlation_<routeName>_<24 hex>` where the 24 hex characters are the first 24 of `sha256(tracingId)` when a tracing id exists, and of 16 random bytes otherwise. `routeName` is `approve` or `preflight`. The result is 43 or 45 characters and always satisfies `CorrelationReferenceSchema`; the function parses its own output with the schema before returning.
3. Returns `{ correlationRef, tracingId }`.

Deriving from the header when one exists makes the same trace map to the same reference on retries, which is useful for joining audit rows to an upstream trace, and it costs nothing because correlation columns are not unique keys (`audit_events_correlation_idx` is a plain index; command idempotency is by `commandKey`).

### D3. Tracing id stays distinct

Every campaign command response carries `x-oalo-correlation-ref: <correlationRef>`. When a tracing id was accepted, the response also echoes `x-correlation-id` unchanged. The tracing id is passed to the observability layer as a log attribute and never assigned to any field named `correlationRef` or `correlationId`.

### D4. Validator adoption

- Handler: the boundary function is the only producer.
- Application: `createCampaignTenantContext` (`campaign-command-context.ts:121`) validates with `CorrelationReferenceSchema` instead of the wide pattern; the wide `CORRELATION_PATTERN` constant at `:11` is removed.
- Denied-attempt path and commit: unchanged call sites, now receiving only canonical values; a test asserts it.
- Database: `validateTenantContext` (`transaction-context.ts:298-309`) validates `correlationId` with `CorrelationReferenceSchema`; `SAFE_REFERENCE_PATTERN` remains for `subjectType` and `subjectId` in `validateSupportContext`. The PR records the caller inventory from the background section so the tightening is reviewable.

### D5. Retry ordering

In `executeHumanCampaignApproval`, after the location check (`:165-167`) and before `hintsMatch`, evaluate the duplicate branch: if `evidence.existingApproval` exists for the same `campaignVersionRef`, the same `actorRef`, and the same `decision`, and the caller's `expectedCampaignVersionRef`, `expectedManifestHash`, and `expectedPreflightResultHash` (when supplied) each match the evidence, return the committed duplicate result with the current state and row version. `expectedRowVersion` is deliberately excluded from that comparison because a successful commit always advances it. Every other path keeps its current order: a mismatched version ref, manifest hash, or preflight hash still fails `hintsMatch` as stale, a different actor's identical decision on an approved campaign still fails as stale, and a non-`awaiting_approval` state still fails as not ready.

## Acceptance criteria

| ID | Criterion | Finding |
|---|---|---|
| 005C-AC-001 | `packages/contracts` exports `OpaqueReferenceSchema` and `CorrelationReferenceSchema`, and `campaign-approval-handler.ts` no longer defines a private copy; `pnpm jscpd` passes. | C2 |
| 005C-AC-002 | `correlationReferenceForRequest` exists as D2 specifies; unit tests prove that for a canonical header, a UUID header, `trace-123`, a header with `.`, `:`, `/`, and `-`, an absent header, a 301-character header, and a 129-character opaque-looking header, the returned `correlationRef` always parses with `CorrelationReferenceSchema` and has the `correlation_<route>_` prefix, and that `tracingId` is set only for headers matching the tracing pattern. | C2 |
| 005C-AC-003 | Both campaign routes use the boundary function; a test asserts the `correlationRef` handed to `executeHumanCampaignApproval` and to `createCampaignPersistenceAdapter`'s tenant context is the boundary output and never the raw header. | C2 |
| 005C-AC-004 | Every campaign command response carries `x-oalo-correlation-ref` equal to the canonical reference, and echoes `x-correlation-id` only when the inbound value matched the tracing pattern; route-level tests assert both headers for the accepted and rejected header cases. | C2 |
| 005C-AC-005 | `createCampaignTenantContext` validates with `CorrelationReferenceSchema` and the wide `CORRELATION_PATTERN` in `campaign-command-context.ts:11` is removed; a unit test proves a UUID correlation id now throws `CampaignPrincipalInvalidError` at the application boundary. | C2 |
| 005C-AC-006 | `validateTenantContext` validates `correlationId` with `CorrelationReferenceSchema`; `validateSupportContext` keeps the wide pattern for `subjectType` and `subjectId`; `transaction-context.test.mjs` gains cases for a UUID correlation id (rejected) and a canonical one (accepted); the PR description records the caller inventory from the background section. | C2 |
| 005C-AC-007 | Through the exported `POST /api/campaigns/approve` with an authorized approver session and current evidence against real Postgres, each of these headers yields 200 with a committed approval and a stored `correlation_id` on the command execution and audit rows that satisfies the opaque contract: canonical `correlation_review123`, a UUID, `trace-123`, a value containing `.`, `:`, `/`, and `-`, no header, a 301-character value, and a 129-character opaque-looking value. | C2 |
| 005C-AC-008 | The `x-correlation-id` matrix in 005C-AC-007 runs identically against `POST /api/campaigns/preflight` with a creator session and yields 200 for every case. | C2 |
| 005C-AC-009 | The denied-attempt path records the canonical reference: a creator attempting approval yields 403 and exactly one `audit.events` row whose `correlation_id` equals the response's `x-oalo-correlation-ref`. | C2 |
| 005C-AC-010 | The retry fix is in `executeHumanCampaignApproval` as D5 specifies; a unit test with an in-memory repository proves that after a committed approval, an identical request carrying the pre-approval `expectedRowVersion` and the same version ref, manifest hash, and preflight hash returns `kind: "committed"`, `duplicate: true`, the post-approval `rowVersion`, and the original decision, and that the repository's `commitApproval` is not invoked on the retry. | C2 |
| 005C-AC-011 | Through the exported route against real Postgres with the browser's exact payload shape (`campaignRef`, `decision`, `expectedCampaignVersionRef`, `expectedManifestHash`, `expectedPreflightResultHash`, `expectedRowVersion`): the first approval returns 200 `duplicate: false`; the byte-identical retry returns 200 `duplicate: true` with the same `approvalRef`; the campaign has one approval decision, one command execution, and one success audit row after both calls. | C2 |
| 005C-AC-012 | Negative retry cases stay correct: a retry with a stale `expectedCampaignVersionRef` returns 409; a different approver's identical decision on the approved campaign returns 409; a retry with `decision: "rejected"` after an approval returns 409; a creator's retry returns 403; each proven through the exported route. | C2 |
| 005C-AC-013 | `pnpm test:contracts` and `tests/security/**` pass unchanged; no `OpaqueReferenceSchema` regex, length bound, or database check constraint is modified (asserted by a test that pins the regex source and by `git diff` on `supabase/migrations/`). | Constraint |

## Files expected to change

- `packages/contracts/src/campaign-foundation.ts:3-7` (export) and `packages/contracts/src/index.ts` (add the two exports).
- `apps/web/src/server/correlation-boundary.ts` (new) and `correlation-boundary.unit.test.ts` (new).
- `apps/web/src/server/campaign-approval-handler.ts:18-22,36,42-46,67,87-99`: delete the private schema and pattern, use the boundary, add response headers.
- `apps/web/src/server/campaign-preflight-handler.ts:25-66`: use the boundary, add response headers.
- `apps/web/src/server/campaign-persistence-runtime.ts:106-108,130-134`: accept the request's canonical reference for the tenant context instead of deriving one from the session id, so the same reference reaches the transaction, the command, and the event.
- `packages/application/src/campaign-command-context.ts:11,116-129`: adopt the shared schema.
- `packages/application/src/campaign-approval-command.ts:163-191`: D5 reorder.
- `packages/db/src/transaction-context.ts:68,298-309`: adopt the shared schema for `correlationId`.
- Tests: `packages/application/test` or `src` unit tests for the command reorder; `packages/db/test/transaction-context.test.mjs`; `apps/web/src/server/campaign-approval-handler.unit.test.ts:188-217` (retry with the pre-approval row version); route-level Postgres tests in the 005a `apps/web/src/**/*.postgres.test.ts` project.

## Test plan

- **Unit** (`pnpm test:unit`): the boundary function matrix (005C-AC-002); handler wiring (005C-AC-003); application validator (005C-AC-005); the reorder with an in-memory repository (005C-AC-010); the regex pin (005C-AC-013).
- **Integration against real Postgres** (`pnpm test:db`): `transaction-context.test.mjs` additions (005C-AC-006); a command-level case in `packages/db/test/campaign-command.integration.test.mjs` for the retry through `executeHumanCampaignApproval` with the Postgres repository.
- **Route-level through the exported handler** (`pnpm test:db`, `apps/web/src/**/*.postgres.test.ts`): 005C-AC-004, 007, 008, 009, 011, 012, each with the real composition from 005a and sessions minted by 005b's issuance function.
- **Browser**: none specific. The deployed approve-then-retry step in 005e's proof exercises the browser payload against the fixed ordering.

## Security notes

- No tracing string reaches a database column or a domain event. The canonical reference is server-generated and schema-parsed before use.
- Deriving the reference from a hash of the tracing header does not let a client choose a stored value: the stored value is always `correlation_<route>_<hex>`.
- The retry reorder returns the existing decision only when the caller's identity, decision, and evidence hints match. It never returns another actor's decision as the caller's own and never bypasses the role check for a non-approver (005C-AC-012).
- Response headers expose only the canonical reference and the caller's own tracing id.

## Open questions

- [ ] Whether the observability correlation context (`corr_<hex>`) should be seeded from the canonical reference so logs and audit rows share one value. Recommended, but it touches `packages/observability` and is not required to close C2.

## Exact operator ask

None. Everything in this sub-PRD is provable in CI.

## Blockers (honest)

| Blocker | Owner | Unblock |
|---|---|---|
| Route-level Postgres tests need 005a's composition and 005b's issuance | Engineering | Land 005a and 005b first, or stage the route-level cases behind them in the same PR |

## Related

- [PRD-005a: runtime authentication composition](./prd-005a-authenticated-review-runtime-runtime-auth-composition.md)
- [PRD-003c: human approval](../../in-work/prd-003-authenticated-product-activation/prd-003c-authenticated-product-activation-human-approval.md) (the approval command this sub-PRD corrects)
- [PRD-004d: real-Postgres command gate](../../in-work/prd-004-reviewable-go-live/prd-004d-reviewable-go-live-postgres-command-gate.md) (the raid log entry that first hit the hyphen trap)
- [Go-live raid ledger](../../../../EXECUTION_LEDGER.md#gauntlet-raid-go-live-remaining-in-repo-code)

## Amendments

- **2026-09-21, 005C-AC-006, the correlation cases are now reachable from a gate.** Text said: 005C-AC-006 names `transaction-context.test.mjs`'s two correlation-ref cases (a UUID correlation id rejected, a canonical one accepted) and a caller-inventory note in the PR description, with no statement of which `pnpm` script runs the file. Actual prior state, per the landing commit's own body: `packages/db/test/transaction-context.test.mjs` was reachable from no gate. The unit project's include globs do not cover `packages/db/test`, and the database driver discovered only the `*.integration.test.mjs` half of that directory; `@oalo/db` declares its own `test` script for these files, but nothing in `pnpm verify:offline` or `pnpm test:db` ran `turbo run test` to invoke it. The two cases existed and asserted correctly; no command in the repository's gate set ever executed the file they lived in. Code does (Wave 7s, commit `2ec5245`): `tooling/scripts/database/run-real-database-tests.mjs` gains `discoverDatabaseUnitTestFiles` (`packages/db/test/*.test.mjs` minus the `.integration.test.mjs` suffix) and a setup step that runs the discovered files with `node --test` directly, after the build that writes the `dist` they import and before the local Postgres stack starts, because they need no database; an empty discovery throws rather than silently shrinking the plan, matching the existing integration-discovery rule. `pnpm test:db` now runs this step: 19 tests, 19 pass, including "rejects a UUID-shaped correlation id and accepts the canonical opaque form" (005C-AC-006's own case). The same orphan sweep found three other files under `packages/db/test` reachable from no gate (`campaign-repository.test.mjs`, `foundation-contracts.test.mjs`, `postgres-adapter.test.mjs`); all three now run in the same step. Why: closes a gate gap the criterion's own text did not disclose. Touches: 005C-AC-006.
