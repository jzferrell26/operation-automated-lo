# Example 02 - Failed verification, triage, Slack alert, rollback

Demonstrates the failure path: a green pre-flight and deploy, but the controlled test errors. Illustrates `guides/03-postdeploy-verification.md` (the fail branch), `guides/04-triage-and-rollback.md`, and `guides/05-handoff-boundary.md`.

## Input (what the Guardian receives)

> "Re-deploy the live event for client bill_rookstool. n8n-workflow-guardian pushed a change to the intake mapping yesterday. Take it live and verify. deploy = WF_DEPLOY_123, intake = WF_INTAKE_456."

## Phase 1 and 2 - green

- Pre-flight: all six checks GO. Snapshots taken: `snapshots/2026-06-29-live-event-deployment.json`, `snapshots/2026-06-29-live-event-intake.json`. VERDICT: GO.
- Deploy: `POST .../activate` on both; `active: true` confirmed; deploy timestamp `2026-06-29T16:10:00Z` captured.

## Phase 3 - verification FAILS

- V1: `curl` to the production webhook returns HTTP 200 (received).
- V2: `search_executions({ workflowId: "WF_DEPLOY_123", status: ["success","error","crashed"], startedAfter: "2026-06-29T16:10:00Z", limit: 5 })` returns execution `EX_9090` with status `error`.

An execution appeared but errored: this is a node-level failure (the workflow ran and broke), not a trigger/activation problem. Go to triage.

## Phase 4 - triage, escalate, roll back

### T1 - triage

```
get_execution({ workflowId: "WF_DEPLOY_123", executionId: "EX_9090",
  includeData: true, nodeNames: ["Map Intake Fields"], truncateData: 5 })
```

`lastNodeExecuted = "Map Intake Fields"`, `error.message = "Cannot read property 'slot_2' of undefined"`. The yesterday's mapping change referenced a slot key the payload does not carry. Diagnosed via execution data; no node was edited.

### T2 - escalate

Slack alert fired on the existing live-event error-handler pattern, carrying `workflow.name`, `execution.url`, `lastNodeExecuted`, `error.message`, owner `@operator`. Operator informed directly. Objective trigger: an error-status execution on the controlled test.

### T3 - rollback (under 10 minutes)

- T3a: `POST /api/v1/workflows/WF_DEPLOY_123/deactivate` and `.../WF_INTAKE_456/deactivate`; confirmed `active: false`. Intake stopped.
- T3b: Restored `snapshots/2026-06-29-live-event-intake.json` via Import from File (the known-good from before yesterday's change). Same instance, so credentials reconnected by name/id.
- T3c: `POST .../WF_INTAKE_456/activate`; confirmed `active: true`. (Import deactivates by default, so this re-activate is mandatory.)
- T3d: Re-ran the guide 03 loop against the restored intake. Controlled test execution `EX_9099` status `success`, outputs correct. Rollback complete in 6 minutes.

Rollback recorded in `templates/rollback-record.md`.

### T4 - hand off the root cause

The rollback restored service; it did not fix the mapping bug. Handed to `n8n-workflow-guardian`: workflow `WF_INTAKE_456`, node `Map Intake Fields`, error `Cannot read property 'slot_2' of undefined`, execution `EX_9090`. If the deeper question were "which GHL field should `slot_2` map to," that half goes to `gohighlevel-guardian`.

## Why this is the instructive failure

The deploy call succeeded and `active: true` was true, yet the event did NOT work; only the controlled test execution surfaced it (Directive 3). Because the snapshot was taken in pre-flight (Directive 4), rollback was a deactivate-restore-reactivate-reverify in minutes, not a scramble. And the Guardian recovered service without editing a single node, then handed the defect to the right peer (Directive 6).
