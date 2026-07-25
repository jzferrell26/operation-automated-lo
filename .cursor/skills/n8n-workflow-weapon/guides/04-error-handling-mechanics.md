# Guide 04: Error-Handling Mechanics

You own the MECHANICS of error handling. The severity-routing POLICY (who gets paged, which
channel) is a per-client decision and is OUT of scope. Source:
`research/2026-06-29-error-handling-mechanics.md`,
`research/2026-06-29-cuantico-internal-prior-art.md`. Worked in
`examples/04-error-branch-and-global-handler.md`.

## The four mechanics you wire

### 1. The Error Trigger workflow

An error workflow MUST start with the Error Trigger node, which gives the handler access to the
full error context. One error workflow can serve many production workflows. The error data passed
in includes:

- `execution.id`, `execution.mode`, `execution.startedAt`, `execution.workflowId`
- `error.message`, `error.stack`, `error.context` (with optional `itemIndex`, `runIndex`,
  `parameter`)
- `node.name`, `node.type`, `node.parameters`

Read them with expressions like `{{ $json.error.message }}` and `{{ $json.node.name }}`.

### 2. Set `errorWorkflow` on each production workflow

In the production workflow's settings, set `errorWorkflow: 'workflow-id'`. n8n runs that error
workflow whenever an execution fails. This is the per-workflow wiring that connects a workflow to
its handler.

### 3. Node-level retry / backoff on flaky external calls

- `retryOnFail` (boolean) - enables the retry mechanism.
- `maxTries` - number of attempts.
- `waitBetweenTries` - milliseconds between retries (e.g. `1000` for 1 second).

Flow: the node executes; on failure with `retryOnFail` true it waits `waitBetweenTries` ms and
retries up to `maxTries`; if any attempt succeeds, execution continues; if all fail, error
handling applies. **Set these EXPLICITLY**: the defaults for `maxTries` / `waitBetweenTries` are
not documented and have shifted across versions, so never rely on a default.

**Retry + idempotency are a pair.** A retry on a non-idempotent node (an HTTP POST that charges a
card, sends an SMS, creates a CRM record) re-runs the side effect. Pair every retry on a
side-effect node with an idempotency gate (`guides/07-idempotency-and-rerun-safety.md`). Source:
`research/2026-06-29-idempotency-dedupe-webhook-retries.md`.

### 4. Continue-on-fail and the error output (dead-letter)

- `continueOnFail: true` logs the error and continues; `false` (default) stops the workflow.
- `alwaysOutputData: true` passes error data to the next nodes; `false` passes an empty array.
  (Note the `alwaysOutputData` footgun from Guide 01: only use it when the empty case has a
  dedicated branch.)
- In SDK code the error-output wiring is `node.onError(handler)` with
  `onError: 'continueErrorOutput'` (route failures to a dead-letter / handler branch),
  `onError: 'continueRegularOutput'` (do not block other independent side effects), or the implicit
  stop.

A dead-letter branch is just an error-output branch that captures the failed item (and its error
context) into a store (a Data Table, a Slack message, a ticket) for later replay rather than
losing it.

## The global-error-handler pattern (the Cuantico instance)

The voyze Global Error Handler (`UlyC_ijANFkbvoYZzA6Kj`) is the concrete instance of this pattern:
an Error Trigger, then a Switch on the `error` / `node` fields that routes by severity
(support-tickets / n8n-error-run / log-only), with `@here` suppressed and specific users tagged
instead. This is the canonical worked example. You wire the Error Trigger, the Switch on error
fields, and the branches; the per-client choice of WHICH channel and WHO to tag is policy and stays
with the client. Source: `research/2026-06-29-cuantico-internal-prior-art.md`.

> Note: the severity-routing thresholds and channel destinations are a per-client POLICY decision,
> not this Guardian's to set. Wire the mechanism; leave the policy to the client.
