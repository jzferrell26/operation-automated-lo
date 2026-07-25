# Example 03 - Migration step (port one handler to cuantico-sms)

Demonstrates: `guides/05-migration.md` (ack-fast-then-process-durably, idempotency, the stable external contract) and `guides/04-routing-boundaries.md`. Exercises directive 3.

## Input (what the Guardian receives)

> Operator: "Port the `book_appointment` handler from the Assistable config to the cuantico-sms engine. Keep the live Assistable flow working. This is the next milestone after Sprint 0."

## Output (what the Guardian produces)

### Step note (filled from `templates/migration-step-note.md`)

**Handler ported:** `book_appointment`
**External contract held constant:** the tool `url`, `parameters` schema, and TOOL_RESULT shape are unchanged from the live Assistable tool. Assistable still POSTs the same `body.args` + `body.metadata` payload; only the implementation behind the URL moves.

**New shape in cuantico-sms (Next.js + Inngest + Supabase):**

```
1. Thin Next.js App Router route receives POST /api/assistable/tools/book_appointment
2. VERIFY the Assistable signature (guide 02)
   > TODO: open question - confirm the exact signature scheme from the cuantico-sms repo.
3. ACK 200 fast (do not block on the booking)
4. inngest.send({
     id: `book-appt-${contact_id}-${inbound_message_id}`,   // stable idempotency key
     name: "sms/book_appointment.requested",
     data: { contact_id, location_id, requested_date, service }
   })
5. Durable function "book-appointment":
     step.run("resolve-availability", ...)
     step.run("create-appointment", ...)
     step.run("ghl-send-confirmation", () => POST /conversations/messages)  // routed contract, guide 06
   Each external call is its own step.run so a retry never double-books or double-sends.
```

**Idempotency:** event-level `id` = `book-appt-${contact_id}-${inbound_message_id}`; this dedupes a redelivered inbound within Inngest's 24h window so the contact is not double-booked or double-texted.

**Persistence (Supabase):** record the processed `inbound_message_id` in the idempotency/audit table; persist the appointment + the tool-call audit. Schema design routed to db-guardian; deploy routed to supabase-platform-guardian (guide 04). Connection: transaction-mode pooler URL, prepared statements disabled (serverless function-per-request).

**Routing:** the GHL send + the contact/field write go through gohighlevel-guardian's contract; this handler owns the tool-call wiring and the SMS-agent contract only.

**Cutover plan (no live break):** run the cuantico-sms handler in parallel, verify parity against the live Assistable path for this one tool, then switch the `book_appointment` tool `url` to the cuantico-sms endpoint. Other tools stay on Assistable until individually ported. Never cut the whole flow at once (directive 3).

**Open items surfaced:** the post-Sprint-0 milestone list is otherwise undefined (operator input); the exact signature scheme is a repo re-fetch.

## Why this is a correct migration step

One handler, ack-fast then durable, a stable idempotency key, the external contract unchanged, side effects routed, and a parallel-then-switch cutover that never breaks the live SMS flow.
