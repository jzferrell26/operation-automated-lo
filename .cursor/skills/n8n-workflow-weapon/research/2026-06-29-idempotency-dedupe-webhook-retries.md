---
source_url: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.removeduplicates/ + https://medium.com/@duckweave/webhook-replays-in-n8n-the-duplicate-event-trap-43126d472d01 + https://github.com/aari-ai/n8n-webhook-idempotency
retrieved_on: 2026-06-29
source_type: blog
authority: practitioner
relevance: high
topic: idempotency
weapon: n8n-workflow-weapon
---

# Idempotency, deduplication, and webhook-retry safety in n8n (2026)

## Summary
Production-gotcha cluster on idempotency. The headline finding: n8n's built-in Remove Duplicates node only dedupes WITHIN a single execution, so it does nothing for at-least-once webhook retries that arrive as separate executions. The correct pattern is an external idempotency gate keyed on a stable idempotency key, checked/locked in a store (DB, Redis, or an n8n Data Table) before any side effect runs. Multiple early-2026 community templates and the `aari-ai/n8n-webhook-idempotency` repo implement this.

## Key quotations / statistics (verbatim)

Remove Duplicates limitation (verbatim):
> "n8n's built-in Remove Duplicates node only deduplicates within a single execution. Webhook retries arrive as new executions — the Remove Duplicates node has no memory of the previous run. By the time the retry lands, the first execution is already gone."

At-least-once delivery (verbatim):
> "Webhook providers use at-least-once delivery. If a request times out or fails, they retry the webhook — which can cause the same workflow to execute twice."

Idempotency-gate pattern (verbatim):
> "This workflow adds an idempotency check before any side effect runs. When the first event arrives, the workflow records its idempotency key and proceeds normally. If the same event arrives again within 24 hours, the gate returns a BLOCK decision and the workflow stops before any side effects execute."

Canonical pattern (verbatim):
> "[Trigger/Event] -> [Compute idempotency_key] -> [Dedupe Gate: lock/check key in DB/Redis] to handle retries safely while using Retry on Fail for transient HTTP errors."

The `aari-ai/n8n-webhook-idempotency` repo (verbatim): "Prevent duplicate webhook executions in n8n using an idempotency gate. Works with Stripe, GitHub, Shopify, and any at-least-once delivery provider."

## Annotations for weapon-forge
- This is the source for the "idempotency / re-run safety" guide. The audit checklist item: any workflow with a webhook trigger AND an irreversible side effect (charge, send SMS/email, create CRM record) MUST have an idempotency gate; Remove Duplicates is NOT sufficient.
- Direct tie to error handling: `retryOnFail` on a non-idempotent node DOUBLES the side effect on retry. The guide must pair retries with idempotency, exactly as the canonical pattern states.
- Strong synergy with the in-scope Data Table surface: the dedupe gate's "check/lock key" store can be an n8n Data Table (Insert-if-not-exists / Upsert on the idempotency key) instead of an external DB/Redis — keeping the whole pattern inside n8n. weapon-forge should show the Data-Table-backed idempotency gate as the Cuantico-native default (no external dependency).
- Relevance high (not critical) because it is a production-hardening concern rather than one of the two top brief directives, but it is the most actionable "gotcha" content for the contact-enrichment and SMS-adjacent workflows this Guardian serves.
