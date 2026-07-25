# 04 - Triage, escalation, and rollback (Escalation + atomic rollback)

This is the failure path: triage the failed run, fire the Slack alert and surface to the operator, then roll back to the last-known-good. It is the Escalation section plus the atomic rollback path of the runbook skeleton (source: `research/2026-06-29-sreschool-operational-runbook-structure.md`). The rollback time budget is under 10 minutes (source: `research/2026-06-29-hatchworks-n8n-production-best-practices-rollback.md`).

Record the whole episode in `templates/rollback-record.md`.

## Step T1 - Triage: which node, what error

First split on whether the workflow ran at all (this distinction is load-bearing, source: `research/2026-06-29-n8n-troubleshooting-failed-run-triage.md`):

- **No execution appeared (the workflow never ran).** Run the triage triad: (1) is the workflow activated? (re-check `get_workflow_details` active), (2) is the trigger misconfigured? (production URL registered, method matches), (3) is there a server-side/instance issue? This is a trigger/activation/instance problem.
- **An execution appeared but errored or crashed.** Pull the failing node IO:

```
get_execution({
  workflowId: "<LIVE_DEPLOY_ID>",
  executionId: "<execution_id>",
  includeData: true,
  nodeNames: ["<lastNodeExecuted>"],
  truncateData: 5
})
```

`lastNodeExecuted` plus `error.message` answer "which node, what error" (source: `research/2026-06-29-n8n-error-handling-error-trigger-docs.md`, `research/2026-06-29-n8n-mcp-execution-monitoring-tools.md`). UI alternative: the red-outlined node on the canvas shows where it broke. You may use "Debug in editor" to DIAGNOSE only; do not edit the node (Directive 6).

Expected output: the failing node name and the error message, recorded.

## Step T2 - Escalate: Slack alert + surface to the operator

Escalation is objective, not social: any failed execution on the controlled test, or any error-status execution during the watch window, triggers escalation (source: `research/2026-06-29-sreschool-operational-runbook-structure.md`). Surface to the operator directly AND fire the Slack alert using the existing Cuantico live-event error-handler / Slack-alert pattern. The alert carries a named owner; it is not fire-and-forget (source: `research/2026-06-29-hatchworks-n8n-production-best-practices-rollback.md`).

The alert payload should carry the Error Trigger fields (source: `research/2026-06-29-n8n-error-handling-error-trigger-docs.md`): `workflow.name`, `execution.url`, `lastNodeExecuted`, `error.message`. Use `templates/slack-alert.md`.

Testing caveat: the n8n Error Trigger fires only on an AUTOMATIC execution failure, not a manual run. The controlled test (guide 03) is an automatic production-trigger execution, so it is what validates the alert path; you cannot prove the alert works with a manual editor run.

Expected output: a posted Slack alert and the operator informed, with the failing node and error.

## Step T3 - Rollback: deactivate, restore, re-activate, re-verify

Execute the rollback to return to the last-known-good. The sequence (source: `research/2026-06-29-n8n-public-rest-api-activate-deactivate.md`):

### T3a - Deactivate to stop intake immediately

REST API path (primary, headless, not deprecated):

```
curl -X POST "https://<n8n-host>/api/v1/workflows/<LIVE_DEPLOY_ID>/deactivate" \
  -H "X-N8N-API-KEY: <key>"
# And the intake workflow if in scope:
curl -X POST "https://<n8n-host>/api/v1/workflows/<LIVE_INTAKE_ID>/deactivate" \
  -H "X-N8N-API-KEY: <key>"
```

UI path (fallback): toggle the workflow Inactive / unpublish.
CLI path (self-hosted, pre-2.0 only; deprecated in 2.0): `n8n update:workflow --id=<LIVE_DEPLOY_ID> --active=false`.

Expected output: the workflow is inactive; intake has stopped. Wait condition: confirm `active: false`.

### T3b - Restore the export-before-deploy snapshot

```
# CLI (self-hosted). NOTE: import deactivates by default; use --activeState=fromJson to preserve, or re-activate in T3c.
n8n import:workflow --input=snapshots/<date>-live-event-deployment.json
# UI / REST: Import from File using the snapshot JSON saved in guide 01 P5.
```

Expected output: the known-good workflow JSON is restored. Footgun: `import:workflow` deactivates the imported workflow by DEFAULT, so after a restore the workflow is OFF unless you used `--activeState=fromJson` or re-activate it next (source: `research/2026-06-29-n8n-cli-commands-export-import-activate.md`). Restoring onto the SAME instance reconnects credentials by name/id automatically; a cross-instance restore needs the matching credentials to exist (source: `research/2026-06-29-n8n-export-import-workflows-docs.md`).

### T3c - Re-activate the known-good

```
curl -X POST "https://<n8n-host>/api/v1/workflows/<LIVE_DEPLOY_ID>/activate" \
  -H "X-N8N-API-KEY: <key>"
```

Expected output: the restored known-good is active again. Do not skip this; otherwise intake stays down silently after the restore.

### T3d - Re-verify the restored known-good

A rollback is not complete until you prove the restored state actually works. Re-run guide 03's verification loop (controlled test, status check, output check) against the restored workflow. Only then is the rollback done.

Expected output: a green verification against the restored known-good. Total rollback budget: under 10 minutes.

## Step T4 - Hand off the root cause

The rollback restored service; it did not fix the defect. Hand the root cause off (Directive 6, guide 05): a workflow-structure defect to `n8n-workflow-guardian`, a GHL field/contact issue to `gohighlevel-guardian`. You operated and recovered; you do not edit the fix.

A full triage-alert-rollback episode is in `examples/02-failed-verification-rollback.md`.
