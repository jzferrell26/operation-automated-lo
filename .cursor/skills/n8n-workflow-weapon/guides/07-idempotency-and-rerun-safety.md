# Guide 07: Idempotency and Re-run Safety

The most actionable production-hardening guide for the webhook-triggered, side-effecting workflows
this Guardian serves. Source: `research/2026-06-29-idempotency-dedupe-webhook-retries.md`,
`research/2026-06-29-data-tables-surface.md`. Worked in `examples/04-error-branch-and-global-handler.md`
(the idempotency-gate variant) and tied to the audit checklist in `guides/02-audit-workflow.md`.

## The headline gap: Remove Duplicates does NOT survive webhook retries

n8n's built-in Remove Duplicates node only deduplicates WITHIN a single execution. Webhook retries
arrive as NEW executions, and Remove Duplicates has no memory of the previous run; by the time the
retry lands, the first execution is already gone. Webhook providers use AT-LEAST-ONCE delivery: if
a request times out or fails, they retry, which can run the same workflow twice. So Remove
Duplicates is the wrong tool for retry safety.

## The rule

Any workflow with a webhook trigger AND an irreversible side effect (charge, send SMS / email,
create a CRM record) MUST have an idempotency gate before the side effect runs. This is a Critical
audit finding when absent (Guide 02).

## The canonical idempotency-gate pattern

```
[Trigger / Event]
   -> [Compute idempotency_key]   (a stable key derived from the event, e.g. provider event id)
   -> [Dedupe Gate: check/lock the key in a store]
        - if key already present -> BLOCK: stop before any side effect
        - if key absent          -> record it, then PROCEED
   -> [Side effect]               (pair with Retry on Fail for transient HTTP errors)
```

When the first event arrives, the workflow records its idempotency key and proceeds. If the same
event arrives again (within the gate's retention window, e.g. 24 hours), the gate returns BLOCK and
the workflow stops before any side effect executes.

## The Data-Table-backed gate is the Cuantico-native default

Use an n8n Data Table as the gate's store, with an Upsert / insert-if-not-exists on the
idempotency key, instead of an external DB or Redis. This keeps the whole pattern inside n8n with
no external dependency. Data Tables list deduplication (store processed IDs) as an explicit use
case. Source: `research/2026-06-29-data-tables-surface.md`. See `guides/08-data-tables.md` for the
table operations.

## Pair retries with idempotency, always

`retryOnFail: true` on a non-idempotent node DOUBLES the side effect on retry. The gate is what
makes the retry safe. So the two patterns are one design: gate first, then retry the transient
failure. This is the explicit tie between Guide 04 (error handling) and this guide. Source:
`research/2026-06-29-error-handling-mechanics.md`,
`research/2026-06-29-idempotency-dedupe-webhook-retries.md`.

## Prune the gate table

A high-volume dedupe / idempotency table accumulates rows and the instance-wide Data Table cap is
50MB; periodically prune old keys or executions will eventually fail (Guide 08). Source:
`research/2026-06-29-data-tables-surface.md`.
