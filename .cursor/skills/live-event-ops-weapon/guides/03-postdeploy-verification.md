# 03 - Post-deploy verification (Exit Criteria)

A successful deploy call is not proof the event works; a controlled test execution that succeeded is (Directive 3). This guide is the Exit-Criteria section of the runbook: it names a concrete watch window, not just a green dashboard (source: `research/2026-06-29-sreschool-operational-runbook-structure.md`).

Record every check pass/fail with the execution id in `templates/verification-report.md`.

## Step V1 - Fire the controlled test against the PRODUCTION trigger

Fire a deliberately benign, identifiable payload at the PRODUCTION trigger URL (the one confirmed in guide 01 P3), not the test URL. Why the production URL: only it exercises the live workflow as the client's real intake will; the test URL listener auto-closes after 120 seconds and production payloads do not appear in the editor (source: `research/2026-06-29-n8n-webhook-test-vs-production-url.md`). Make the payload recognizable (a test name/email matching the per-event tagging) so you can find and clean up the record.

```
# Send a benign test payload to the PRODUCTION webhook URL, matching the configured method.
curl -X POST "<PRODUCTION_WEBHOOK_URL>" \
  -H "Content-Type: application/json" \
  -d '{ "<slot_field_key>": "<test value>", "email": "livetest+<event>@example.com" }'
```

Expected output: an HTTP 200 from the webhook. Wait condition: the response only confirms receipt, not success; confirm via Executions next.

> TODO: open question - needs human decision before next refresh. Controlled-test cleanup policy: this step creates a real (test) intake record/tag/notification during a live client event. Apply the operator's decision (delete it, tag it test-only, or leave it) once V4 confirms which record it created. Source: `research/research-summary.md` open question 3.

## Step V2 - Find the execution and check status (fast go/no-go)

Find the execution the test produced and check its status. Use `includeData: false` for the fast status check; only pull data in triage (source: `research/2026-06-29-n8n-mcp-execution-monitoring-tools.md`).

```
search_executions({
  workflowId: "<LIVE_DEPLOY_ID>",
  status: ["success", "error", "crashed"],
  startedAfter: "<deploy_or_test_timestamp_ISO8601>",
  limit: 5
})
```

Expected output: the test execution appears with its id and status. Record the execution id in the verification report.

Branch on the result:
- **No execution appeared at all.** The workflow never ran. This is a trigger / activation / instance problem, not a node failure. Go to guide 04's triage triad (not activated / trigger misconfigured / server-side).
- **Execution appeared, status = success.** Proceed to V3.
- **Execution appeared, status = error or crashed.** Hard failure. Go to guide 04 (triage + Slack alert + rollback).
- **Execution stuck in running or waiting** past the watch window. A hung intake. Treat as a failure; go to guide 04.

The status enum is richer than the UI's four values; filter triage on `["error","crashed"]` and watch for stuck `["running","waiting"]` (source: `research/2026-06-29-n8n-mcp-execution-monitoring-tools.md`).

## Step V3 - Confirm the expected OUTPUTS were produced

Status success means the workflow ran clean; it does not yet prove it produced the right records, tags, and notifications. Confirm the outputs:

```
get_execution({
  workflowId: "<LIVE_DEPLOY_ID>",
  executionId: "<execution_id>",
  includeData: true,
  truncateData: 5
})
```

Expected output: the expected intake record was created, the correct tags applied, and the expected notification fired. Confirm against the per-event config from guide 01 P4 (slot field keys, lead-import tagging). UI alternative: open the execution in the Executions tab and inspect node IO; a fully green node path means success, a red node means a failure to triage (red/green outline is practitioner-observed UI behavior, source: `research/2026-06-29-n8n-troubleshooting-failed-run-triage.md`). Source for the inspect path: `research/2026-06-29-n8n-executions-view-inspect-retry.md`.

## Step V4 - Watch the window (do not walk away)

Watch the defined window before declaring live; do not deploy and walk away (source: `research/2026-06-29-hatchworks-n8n-production-best-practices-rollback.md`). During the window, re-run the V2 search filtered on `["error","crashed"]` and on stuck `["running","waiting"]`. Any error-status execution during the window is an objective escalation trigger (guide 04), not a judgment call.

```
# Re-poll during the watch window:
search_executions({
  workflowId: "<LIVE_DEPLOY_ID>",
  status: ["error", "crashed", "running", "waiting"],
  startedAfter: "<deploy_timestamp_ISO8601>",
  limit: 50
})
```

> TODO: open question - needs human decision before next refresh. Watch-window length: the concrete dwell time for these exit criteria (first N executions, or first M minutes). SRE and HatchWorks both say "name a time window" but the number is an operator call. Default placeholder until set: monitor the first 10 minutes AND the first 5 real executions, whichever is longer. Source: `research/research-summary.md` open question 4.

## Exit criteria

Declare LIVE only when ALL hold:
- The controlled test execution status = success (V2), with its execution id recorded.
- The expected records, tags, and notifications were produced (V3).
- The watch window elapsed with zero error/crashed executions and nothing stuck (V4).

Then apply the controlled-test cleanup policy (open question 3) to the test record. If any criterion fails, do not declare live; go to guide 04.

A passing verification run is in `examples/01-clean-deploy-happy-path.md`; a failing one is in `examples/02-failed-verification-rollback.md`.
