---
source_url: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.errortrigger/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: high
topic: failure-escalation
weapon: live-event-ops-weapon
---

# n8n Docs: Error Trigger node and error workflows

## Summary
Official n8n error-handling documentation. Authoritative for the escalation-on-failure path (the brief's Slack-alert pattern) and for understanding exactly what failure metadata is available to surface to the operator. Cuantico already runs a global error-handler / Slack-alert workflow on this pattern.

## Key quotations / statistics
- Setting an error workflow (verbatim): "An error workflow runs automatically when a workflow execution fails. Set it in the failing workflow's Workflow Settings -> Error workflow, and that error workflow must start with the Error Trigger node."
- Data received (normal, post-trigger errors): the Error Trigger receives "an array with one object containing: execution: id, url, retryOf (only for retries), error (message, stack), lastNodeExecuted, mode; workflow: id, name".
- Data received (trigger-node failures): the payload "include[s] top-level trigger.error (includes name, cause, timestamp, node, etc.)" with reduced execution fields.
- Testing limitation (verbatim): "You can't test error workflows by running the main workflow manually; Error Trigger runs only when an automatic execution errors."

## Annotations for weapon-forge
- This is the escalation half of step 4 of the brief: on failure, the operator + a Slack alert. The error-workflow payload (workflow name, execution url, lastNodeExecuted, error.message) is exactly the content a Slack alert should carry -- weapon-forge can template the alert from these fields.
- TRIAGE MAPPING: `lastNodeExecuted` + `error.message` answer "which node, what error" from the brief's triage step. Pair with `get_execution(includeData:true, nodeNames:[lastNodeExecuted])` from the MCP tools source to pull the failing node's IO.
- IMPORTANT TESTING CAVEAT: the error workflow only fires on an AUTOMATIC execution failure, not a manual run. So during pre-flight, you cannot prove the Slack-alert path works by manually running the workflow -- the runbook should note the alert path is validated by the controlled production-trigger test (which is an automatic execution), not a manual editor run.
- Cuantico prior art: this maps directly to the existing live-event error handler / Slack alert pattern in the operator's memory. weapon-forge should reference that internal pattern, not reinvent it.
