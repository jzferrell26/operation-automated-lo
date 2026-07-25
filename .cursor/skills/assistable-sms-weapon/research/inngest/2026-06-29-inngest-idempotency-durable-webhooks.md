---
source_url: https://www.inngest.com/docs/guides/handling-idempotency ; https://www.inngest.com/blog/building-webhooks-that-scale ; https://www.inngest.com/docs/learn/inngest-functions ; https://www.inngest.com/docs/learn/serving-inngest-functions
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: inngest-durability
weapon: assistable-sms-weapon
---

# Inngest durable functions + idempotency for the cuantico-sms engine (2026)

## Summary

Inngest is the durability/orchestration layer of the locked cuantico-sms stack (Next.js + Inngest + Supabase). It provides a `serve()` HTTP handler you mount in a Next.js route to expose functions; functions are durable, retriable units triggered by events, crons, or webhooks. Two idempotency levels matter for an SMS webhook handler: event-level (producer-set unique event `id`) and function-level (`idempotency` CEL expression). Each unique key suppresses duplicate execution for a 24-hour window. Inside a function, `step.run` checkpoints cache results so each step runs exactly once even when the function retries. The recommended inbound-webhook architecture decouples receipt from processing: acknowledge fast, push the payload to Inngest, process durably in the background.

## Key quotations / statistics

- Serving: "Inngest provides a serve() handler which adds an API endpoint to your router, and you expose your functions to Inngest through this HTTP endpoint" (Next.js, Express, Python, etc.).
- Functions: "Inngest functions are durable, retriable units of background logic that run on your own compute and are triggered by events, cron schedules, or webhooks."
- Event-level idempotency: set a unique event `id` -- `await inngest.send({ id: \`checkout-completed-${cartId}\`, name: 'cart/checkout.completed', data: {...} })`. Constraint: prevents duplicate execution "over a 24 hour period."
- Function-level idempotency: `idempotency: 'event.data.cartId'` (a CEL expression on event data). Concatenate for granularity: `event.data.userId + "-" + event.data.organizationId`. "Each unique expression will only trigger one function execution per 24 hour period."
- Exactly-once steps: "The durable execution engine ensures each step executes exactly once, even if the workflow function itself runs multiple times. Steps run once, cache their result, and retry independently on failure."
- Webhook architecture: "respond immediately and do the processing in the background"; "Your webhook receives the payload, immediately pushes the payload to a message queue, a log or a database for later processing." Build handlers so that "if the handler runs multiple times it produces the same side effects and results exactly once." Use a "dead letter queue" to inspect/replay failures; throttling controls "manage rate limits and back pressure."
- Feb 2026: Inngest released Agent Skills including `inngest-events` (event design + idempotency) and `inngest-durable-functions`.

## Annotations for weapon-forge

- This is the load-bearing correctness source for the migration guide. An inbound SMS webhook can be delivered more than once; the cuantico-sms receiver must derive a stable idempotency key. Recommended key for SMS: the inbound message id (or `conversation_id` + message timestamp/hash) so a redelivered inbound text does not double-send a reply. Document both the event-level `id` and a function-level `idempotency` CEL expression.
- WATCH the 24-hour window: Inngest idempotency dedupes only within 24h. For SMS this is almost always fine (you do not want to reprocess the same inbound twice in a day), but flag it so the weapon does not assume permanent dedupe.
- Recommended architecture for cuantico-sms inbound: thin Next.js route -> verify Assistable/GHL signature -> ack 200 fast -> `inngest.send()` the inbound event (with a stable `id`) -> a durable function does the LLM + tool-call + GHL `POST /conversations/messages` send, each external call wrapped in its own `step.run` so a retry never double-sends. This is the spine of the migration guide.
- Per-contact ordering/concurrency: Inngest concurrency keys (out of scope of the fetched pages but a known Inngest feature) let you serialize processing per contact so two rapid inbound texts do not race. Cross-reference durable-workflows-guardian for the per-key concurrency pattern; this Guardian owns the SMS-contract reason for it, the mechanics belong to the durable-workflows/typescript-node Guardians.
- `serve()` mounts in a Next.js App Router route handler -- ties the Inngest layer to the Next.js layer of the stack. Supabase is the persistence layer (conversation state, message log, idempotency/audit records); confirm the schema with db-guardian / supabase-platform-guardian during the build.
