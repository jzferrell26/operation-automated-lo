# 05 - Advance the cuantico-sms migration incrementally

ACTION 5 from the brief and directive #3. Port handlers/milestones to the GHL-native cuantico-sms engine behind the SAME external contract, document each step, and keep the live Assistable path working until cutover.

Sources: `research/cuantico-internal/2026-06-29-assistable-payload-contract-and-cuantico-sms.md` (the locked stack), `research/inngest/2026-06-29-inngest-idempotency-durable-webhooks.md` (durability/idempotency, the load-bearing correctness source), `research/inngest/2026-06-29-supabase-nextjs-production-stack.md` (Supabase pooling gotcha), `research/ghl-native/2026-06-29-ghl-conversation-ai-native-sms.md` (build-vs-buy backdrop and non-functional targets), and `research/ghl-api/2026-06-29-ghl-conversations-send-message-api.md` (the send-SMS write path).

## The locked stack (do not re-litigate)

The cuantico-sms stack is LOCKED. Do not reopen the stack choice.

- **Next.js** = the HTTP surface. The Inngest `serve()` handler mounts in a Next.js App Router route handler to expose the durable functions.
- **Inngest** = durability/orchestration. Functions are durable, retriable units triggered by events/crons/webhooks.
- **Supabase** = persistence. Conversation state, the message log, and the idempotency/audit table that backs the Inngest keys.

Repo: `cuantico-sms` (private). State: Sprint 0 scaffold done.

## The spine: ack-fast, then process durably

The recommended inbound architecture (from the Inngest durability note) is the migration's backbone:

1. **Thin Next.js route** receives the inbound webhook.
2. **Verify** the Assistable/GHL signature (`02-validate-webhook.md`).
3. **Ack 200 fast** so the provider does not retry on a slow handler.
4. **`inngest.send()`** the inbound event with a STABLE idempotency `id`.
5. **A durable function** does the LLM + tool-call + GHL `POST /conversations/messages` send, each external call wrapped in its own `step.run` so a retry never double-sends.

This decouples receipt from processing: respond immediately, process in the background.

## Idempotency (the correctness property that matters most)

An inbound SMS webhook can be delivered more than once. The receiver MUST derive a stable idempotency key so a redelivered inbound text does not double-send a reply.

- **Event-level**: set a unique event `id` on `inngest.send({ id: ... })`. Recommended key for SMS: the inbound message id, or `conversation_id` + message timestamp/hash.
- **Function-level**: an `idempotency` CEL expression on event data (e.g. concatenate `event.data.contactId + "-" + event.data.messageId`).
- **Exactly-once steps**: `step.run` caches each step's result so each runs exactly once even when the function retries. Wrap the GHL send in its own `step.run`.
- **WATCH the 24-hour window**: Inngest idempotency dedupes only within 24h. For SMS this is almost always fine, but do not assume permanent dedupe.

The deep Inngest mechanics (concurrency keys for per-contact ordering, retry tuning) belong to durable-workflows-guardian; you own the SMS-contract reason for them. The Supabase idempotency/audit table that records processed message ids is the persistence side; you specify WHAT to persist, db-guardian / supabase-platform-guardian own the schema and deploy (`04-routing-boundaries.md`).

## Supabase connection gotcha

The engine runs inside serverless Inngest functions (function-per-request). Use the **transaction-mode pooler URL** and **disable prepared statements** in the client. Without this, connection exhaustion under SMS burst load is the failure mode. Source: `research/inngest/2026-06-29-supabase-nextjs-production-stack.md`. Deep Supabase work routes to supabase-platform-guardian.

## The stable external contract

"Behind the same external contract" means: from Assistable's (or the contact's) point of view, nothing changes during the migration. The webhook URL, the tool-response shape, and the reply behavior stay constant while you move the implementation underneath. Port one handler at a time, verify parity against the live Assistable path, then switch traffic for that handler. Never cut the whole flow over at once.

## Build-vs-buy backdrop

The nearest off-the-shelf alternative is GHL's native Conversation AI ($97/mo/sub-account; sub-2s replies; cross-session memory per practitioner blogs, treat as directional not contractual). Frame cuantico-sms as the "Power User" custom path that earns its keep where native falls short (complex tool-calling, custom routing, multi-service funnels). Hold the engine to the concrete non-functional targets: sub-2s replies and conversation memory across sessions. Source: `research/ghl-native/2026-06-29-ghl-conversation-ai-native-sms.md`.

## Open items (operator input required)

> TODO: open question - needs human decision. Concrete cuantico-sms milestones beyond Sprint 0 are undefined and are an operator input. Do not invent a roadmap; ask the operator for the next milestone before porting. Source: `research/research-summary.md` open question 2.

> TODO: open question - needs human decision. Migration ownership boundary (does this Guardian own the BUILD code or only the integration + design + wiring?). See `04-routing-boundaries.md`. Resolve before committing to build work.

## Per-step output

Document every migration step with `templates/migration-step-note.md`. A worked step run is in `examples/03-migration-step-port-handler.md`.
