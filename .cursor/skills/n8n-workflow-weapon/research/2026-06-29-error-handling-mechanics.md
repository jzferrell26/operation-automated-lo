---
source_url: https://docs.n8n.io/flow-logic/error-handling/ (retrieved via Mintlify mirror https://mintlify.wiki/n8n-io/n8n/workflows/error-handling)
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: error-handling
weapon: n8n-workflow-weapon
---

# n8n error-handling mechanics: Error Trigger, error workflow, retries, continue-on-fail

## Summary
The authoritative reference for the error-handling MECHANICS the Guardian owns (Command Brief ACTION #7): error-trigger nodes, the per-workflow error workflow setting, node-level retry settings, and continue-on-fail / error-output behavior. Retrieved from the Mintlify mirror of the official n8n error-handling page because the live docs.n8n.io path 404s the fetcher.

## Key quotations / facts (verbatim)

Error Trigger:
> "The Error Trigger node initiates workflows when errors occur, providing access to complete error context for handling failures." An error workflow MUST start with the Error Trigger node.

Setting the error workflow (verbatim): set via workflow settings using `errorWorkflow: 'workflow-id'`. "When you create and set an error workflow, n8n runs it when an execution fails." One error workflow can serve many workflows.

Node-level retry settings (verbatim):
- `retryOnFail` — enables the retry mechanism (boolean).
- `maxTries` — number of retry attempts.
- `waitBetweenTries` — milliseconds between retries (e.g. `1000` for 1 second).

Retry flow (verbatim): node executes; on failure with `retryOnFail` true, waits `waitBetweenTries` ms and retries up to `maxTries` times; if any attempt succeeds, execution continues; if all fail, error-handling logic applies.

Continue-on-error options (verbatim):
- `continueOnFail`: `true` logs the error and continues; `false` stops the workflow (default: `false`).
- `alwaysOutputData`: `true` passes error data to next nodes; `false` passes an empty array.

Error data structure passed to the error workflow (verbatim):
- `execution.id`, `execution.mode`, `execution.startedAt`, `execution.workflowId`
- `error.message`, `error.stack`, `error.context` (with `itemIndex?`, `runIndex?`, `parameter?`)
- `node.name`, `node.type`, `node.parameters`
- accessed via expressions like `{{ $json.error.message }}`, `{{ $json.node.name }}`.

## Annotations for weapon-forge
- This is the source for the "error-handling mechanics" guide. The Guardian OWNS: (a) wiring an Error Trigger workflow, (b) setting `errorWorkflow` in each production workflow's settings, (c) adding node-level `retryOnFail`/`maxTries`/`waitBetweenTries` to flaky external calls, and (d) choosing `continueOnFail`/error-output for independent side effects. The SEVERITY-ROUTING POLICY (who gets paged, which Slack channel) stays a per-client decision per the brief.
- Cross-link to the SDK reference: in SDK code, the error-output wiring is `node.onError(handler)` with `onError: 'continueErrorOutput'` in the node config; the "don't block other side effects" pattern is `onError: 'continueRegularOutput'`. So the SDK exposes three onError modes: `continueErrorOutput`, `continueRegularOutput`, and the implicit stop.
- Gotcha to capture (from the community/issue results, not this page): default values for `maxTries`/`waitBetweenTries` are not stated in docs and have shifted across versions; the guide should set them EXPLICITLY rather than rely on a default. Also: retries on a non-idempotent node (e.g. an HTTP POST that charges a card) re-run the side effect — pair retries with idempotency (see `2026-06-29-idempotency-dedupe-webhook-retries.md`).
- The global-error-handler workflow pattern in Cuantico prior art (voyze `UlyC_ijANFkbvoYZzA6Kj`, severity routing to support-tickets / n8n-error-run / log-only) is the concrete instance of `errorWorkflow` + Error Trigger + a Switch on `error`/`node` fields.
