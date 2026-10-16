# Shared homeowner provider budget increment

Owner: Chief, working sequentially in the main-based completion-resume branch. This is an engineering increment under the existing completion request. It purchases no provider subscription and configures no hosted account.

1. Add an unseeded, private RentCast billing-period budget and an atomic reservation function. Only an operator with migration-owner authority may configure the actual approved period and cap. Runtime callers cannot reset or inspect the aggregate. Require an active tenant writer; default to refusal without an active budget.
2. Reserve the global attempt inside the existing homeowner reservation transaction, after retry/cache/local-allowance checks and before any provider HTTP. A rollback restores the counter; a committed attempted request keeps its slot even if the provider fails or its report is removed. Saved reads, exact retries and cached/reused reports spend no new slot.
3. Verify real PostgreSQL concurrency across two workspaces, authorization and ACL refusals, expired/future/disabled/zero budgets, failure rollback, cache and retry behavior. Give existing native homeowner fixtures an explicit synthetic budget in the disposable test database. Preserve existing assertions.
4. Explain temporary valuation unavailability without exposing shared account counts or settings to customers. Do not add customer roles, QR functionality, a default allowance, automatic paid rollover or a provider credential.
5. Run scoped implementation checks, Security self-review, then Quality self-review and PR review. Canonical CI must confirm the final head. These sequential author reviews are not independent reviews.

Current routes still need qualified RentCast account rights and deployment configuration. This increment does not resolve the parked provider qualification or complete the whole product.
