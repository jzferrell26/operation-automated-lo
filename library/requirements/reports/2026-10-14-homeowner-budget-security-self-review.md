# Shared homeowner budget Security self-review

Scope: the delta after b192976 implementing the shared-budget plan. Reviewed inline by its author, not independently. Earlier Quality reports cover older snapshots; this new Security pass precedes a fresh Quality pass. No source remediation followed this review.

## Result

No blocking Critical or High finding in this increment. Hosted release and live provider qualification remain HOLD. This source does not authorize a subscription, allowance, key, deployment or account activation.

## Evidence

- `supabase/migrations/20261014170000_homeowner_provider_budget.sql:9`: the new aggregate contains no tenant, borrower, address, credential or balance data. Forced RLS has only a migration-owner policy. Runtime SELECT/UPDATE are denied. The two definer functions use an empty search_path and fully qualified objects; PUBLIC execute is revoked and only app_runtime gets execute. Actual native tests deny direct reads/resets and verify scheduler/support/reporting/anon lack execute.
- Migration line25: reservation requires the existing current-tenant writer check. Its one-row conditional UPDATE atomically enforces the enabled period and cap across workspaces. Neither a browser nor a runtime caller supplies a limit, period or reset value. A revoked actor is refused by existing context admission before execution; an active analyst's direct reservation returns false.
- `packages/db/src/homeowner-repository.ts:288`: only a fresh valuation reserves a global slot, after local quota/cache/retry checks, in the existing tenant transaction. Subsequent property or usage failures roll it back. Committed failed/deleted attempts keep the slot. No optional bypass or new outbound path was introduced. Both manual and scheduled requests already call this reservation before the RentCast adapter.
- Repository line186 and `apps/web/src/server/homeowners/http.ts:174`: availability reveals only a boolean, never the global count/cap. Missing budget blocks new valuations without removing saved-report access. The POST refusal uses503 and plain language. Tenant isolation, supplied mortgage data handling, CSRF, PDF/share policy, and provider endpoint remain unchanged.
- The migration seeds no budget. The documented operator rollover only replaces an expired, non-overlapping period and cannot reset the current period. The operator still needs actual approved account rights, UTC billing boundaries and a deliberate cap. Calls using the key outside this application remain outside its accounting; the operator guide states that limitation.

Five new real PostgreSQL17.11 cases pass, including competing tenants, exact retry, local CHECK-failure rollback, cache/reuse with zero remaining budget and privilege refusals. All23 existing homeowner repository/route cases pass with explicit synthetic budgets in a fresh disposable database. The prior seven-table assertion now requires eight and names the new table; no test was skipped or relaxed. All123 homeowner unit cases,158 contracts, typechecks, lint, boundaries, product types, formatting, secrets and zero-clone gate pass.

The deterministic scanner completed. Production dependency audit reports zero vulnerabilities; Unicode is clean. Its wildcard CORS hit is an unchanged Guild template. Root-only Next-config discovery still misses the monorepo config; this delta does not modify headers. Its pre-researched CVE catalog remains stale, as disclosed in the integration review. The previously accepted development-only braces advisory is unchanged.

## Source pins (SHA256 raw bytes)

| File | SHA256 |
| --- | --- |
| New budget migration | 0b285961658ec709e8868fae6c06854464e4fedc057d75964a69fd3d4580f434 |
| homeowner-repository.ts | 196976c3f48fcaf4849e169f35341dbba1a1dd49d254d571ed73e78b61a17071 |
| homeowners/http.ts | 3fce1fc4399ff5a26764f32293b85f991f2f3a902f1b9a27b6a5eadad9ab2652 |

The read-only hosted inventory establishes17 applied versions and9 absent source versions. No hosted state changed. Browser inventory is empty; no new signed-in walkthrough or enabled whole-app provider qualification is claimed. The earlier enabled fixture-only whole-app startup was rejected by automatic approval review as blocked by policy, and was not retried.
