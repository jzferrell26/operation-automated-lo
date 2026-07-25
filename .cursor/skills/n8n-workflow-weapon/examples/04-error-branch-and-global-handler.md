# Example 04: Error Branch + Global Handler + Idempotency Gate

Demonstrates `guides/04-error-handling-mechanics.md` and `guides/07-idempotency-and-rerun-safety.md`.
Shows wiring node-level retry, a dead-letter error branch, the `errorWorkflow` setting pointing at
the global handler, and a Data-Table idempotency gate, all on one webhook workflow.

## Input the Guardian receives

> "This webhook workflow sends an SMS when a lead comes in. It sometimes double-texts people and
> sometimes the SMS provider 500s and we lose the lead. Make it resilient. (Cuantico main.)"

## What the Guardian does

Two distinct problems, two distinct mechanics:

### Double-texting -> idempotency gate (Guide 07)

The webhook provider uses at-least-once delivery, so retries arrive as new executions; Remove
Duplicates would not help (it only dedupes within one execution). Wire the canonical gate:

```
[Webhook]
  -> [Set: idempotency_key = {{ $json.body.event_id }}]
  -> [Data Table: Upsert key into `sms_idempotency` (match on idempotency_key)]
        - key already existed -> IF -> stop (BLOCK), no SMS
        - key newly inserted  -> proceed
  -> [Send SMS]   (retryOnFail: true, maxTries: 3, waitBetweenTries: 2000)
```

The gate runs BEFORE the SMS, so a duplicate webhook stops before any send. Source:
`research/2026-06-29-idempotency-dedupe-webhook-retries.md`.

### Lost leads on provider 500 -> retry + dead-letter + global handler (Guide 04)

1. Node-level retry on the Send SMS node: `retryOnFail: true`, `maxTries: 3`,
   `waitBetweenTries: 2000` (set explicitly, not left to a default).
2. Error output as a dead-letter: `onError: 'continueErrorOutput'` routes a still-failing send to a
   branch that writes the failed lead + error context into a `failed_sms` Data Table for replay,
   so the lead is never silently lost.
3. Set `errorWorkflow` in the workflow settings to the global error handler so execution-level
   failures also reach the central router.

The retry is only safe BECAUSE the idempotency gate already ran: a retry of a non-idempotent send
would otherwise double-text. The two mechanics are one design (Guide 04 + Guide 07).

## Output the Guardian produces (per `templates/change-report.md`)

> Instance: Cuantico main. Workflow: Lead SMS.
> Added: Data-Table idempotency gate (`sms_idempotency`, match on `event_id`) before the send;
> node-level retry on Send SMS (`maxTries: 3`, `waitBetweenTries: 2000`); error-output dead-letter
> to `failed_sms`; `errorWorkflow` set to the global handler.
> Policy note: severity routing / who-gets-paged left to the client (out of scope).
> Validated, credentials verified, published and confirmed active.

## Why this is the resilience pattern

It pairs idempotency with retry (the cardinal rule), uses a dead-letter so failures are recoverable
not lost, and wires the global handler, while explicitly leaving the severity-routing POLICY to the
client per the scope boundary.
