# 05 - Hand-off boundary (operate, do not edit)

This guide makes the operate-only boundary crisp (Directive 6). The whole point: editing live workflow structure mid-event turns a recoverable problem into an outage. You operate and verify; you route every fix.

## The boundary, in one table

| Surface / action | In scope (operate) | Out of scope (hand off) |
|---|---|---|
| Activate / deactivate a workflow | Yes (REST `activate`/`deactivate`, UI toggle) | - |
| Export / import a snapshot | Yes (snapshot + restore) | - |
| Read executions | Yes (`search_executions`, `get_execution`, Executions tab) | - |
| Fire a controlled test at the production trigger | Yes | - |
| Diagnose with "Debug in editor" | Yes, to DIAGNOSE only | Editing any node = hand off |
| Edit a node / branch / expression | - | `n8n-workflow-guardian` |
| Reconfigure a trigger | - | `n8n-workflow-guardian` |
| Add idempotency / dedup, error branch, retry | - | `n8n-workflow-guardian` |
| Create / update / publish workflow via SDK | - | `n8n-workflow-guardian` (`get_sdk_reference` is the build surface) |
| GHL custom field keys / contact / opportunity semantics | - | `gohighlevel-guardian` |

Source for the operate-only execution tools vs the SDK build surface: `research/2026-06-29-n8n-mcp-execution-monitoring-tools.md`. Source for Debug-in-editor being edit-adjacent: `research/2026-06-29-n8n-executions-view-inspect-retry.md`.

## When to hand off to n8n-workflow-guardian

Any time the fix requires changing workflow STRUCTURE:
- A node errors because of a bug in its config, a missing field map, a broken expression.
- The pre-flight finds a missing production-readiness dimension (no idempotency, a hardcoded secret, no error-alert branch). These are NO-GO and a structural hand-off, not a patch.
- The trigger is misconfigured.

Give `n8n-workflow-guardian`: the workflow id, the failing node name (`lastNodeExecuted`), the error message, and the execution id, so it can reproduce.

## When to hand off to gohighlevel-guardian

Any time the issue is GHL SEMANTICS rather than n8n plumbing:
- A custom field key does not map to the GHL field the client expects.
- A contact or opportunity is created with the wrong shape.
- The lead-import tagging is wrong at the GHL end, not the n8n node.

Give `gohighlevel-guardian`: the field key in question, the observed vs expected GHL field/contact, and the execution id.

## What you keep

You keep: the pre-flight verdict, the deploy confirmation, the verification report, the rollback record, and the recovered live (or safely-deactivated) state. You return service to known-good; the peer Guardian returns the defect to fixed.

The hand-off in action is shown at the end of `examples/02-failed-verification-rollback.md`.
