# Example 01 - Clean deploy, happy path

Demonstrates the full four-phase run when everything is green. Illustrates `guides/01-preflight-gate.md`, `guides/02-deploy-sequence.md`, and `guides/03-postdeploy-verification.md`.

## Input (what the Guardian receives)

> "Deploy the live event for client bill_rookstool. It's the Live Event Deployment workflow plus intake. Nothing structural changed since last week, we just need it active and verified for the event at 2pm. Workflow ids: deploy = WF_DEPLOY_123, intake = WF_INTAKE_456."

## Phase 1 - Pre-flight gate

- P0: `search_workflows({ query: "Live Event Deployment" })` returns `WF_DEPLOY_123` named "Live Event Deployment (bill_rookstool) LIVE". Operator confirms it is the live one, not the `...CLONE` archived copy. GO.
- P1: Both workflows scanned; all credential nodes bound by reference; no API key typed into any HTTP Request header. GO.
- P2: `get_workflow_details({ workflowId: "WF_DEPLOY_123" })` shows `active: false` (expected, this deploy activates it); intake shows `active: false` too. Noted for D2.
- P3: Production webhook path confirmed registered once published; test URL explicitly avoided. GO.
- P4: Slot field keys, lead-import tag `live-event-2026q2`, dormant-email safeguard all match this event. GO.
- P5: Snapshots downloaded: `snapshots/2026-06-29-live-event-deployment.json` and `snapshots/2026-06-29-live-event-intake.json`, taken BEFORE any change. P1 re-confirmed clean so the snapshot carries no plaintext secret. GO.

Open questions for this run: instance type still default (REST + MCP + UI primary); snapshot stored in the cuantico repo `snapshots/`; cleanup policy = tag the test record `test-only`; watch window = first 10 minutes / first 5 executions (default). Verdict written to `templates/preflight-go-no-go.md`.

**VERDICT: GO.**

## Phase 2 - Deploy sequence

- D1: Posted start notice to the live-event Slack channel naming the operator as owner.
- D2: `POST /api/v1/workflows/WF_DEPLOY_123/activate` returns success; same for `WF_INTAKE_456`.
- D3: `get_workflow_details` shows `active: true` on both. Confirmed.
- D4: Deploy confirmation emitted; deploy timestamp `2026-06-29T13:45:00Z` captured for the verification search.

A deploy confirmation is not proof it works. Proceeding to verification.

## Phase 3 - Post-deploy verification

- V1: `curl -X POST "<PRODUCTION_WEBHOOK_URL>" -d '{ "slot_1": "Test Lead", "email": "livetest+q2@example.com" }'` returns HTTP 200.
- V2: `search_executions({ workflowId: "WF_DEPLOY_123", status: ["success","error","crashed"], startedAfter: "2026-06-29T13:45:00Z", limit: 5 })` returns execution `EX_9001` with status `success`.
- V3: `get_execution({ workflowId: "WF_DEPLOY_123", executionId: "EX_9001", includeData: true, truncateData: 5 })` shows the intake record created, tag `live-event-2026q2` applied, notification fired. Matches the per-event config.
- V4: Re-polled `["error","crashed","running","waiting"]` across the first 10 minutes; zero hard failures, nothing stuck.

Cleanup: test record `EX_9001` tagged `test-only` per the run decision.

**RESULT: LIVE.** Declared live at `2026-06-29T13:57:00Z`. Verification report written to `templates/verification-report.md`. No rollback needed.

## Why this is the happy path

Every gate was green, the controlled test succeeded against the PRODUCTION trigger (not the 120s test URL), outputs were confirmed via execution data (not the editor canvas), and the watch window elapsed clean. The Guardian operated and verified; it edited nothing.
