# Slack Alert (live-event deploy failure)

Reuses the existing Cuantico live-event error-handler / Slack-alert pattern. Carry the n8n Error Trigger fields (source: `research/2026-06-29-n8n-error-handling-error-trigger-docs.md`). The alert has a NAMED owner; it is not fire-and-forget. See `guides/04-triage-and-rollback.md` step T2.

```
:rotating_light: LIVE EVENT DEPLOY FAILURE

Client / event:   {{client_and_event}}
Workflow:         {{workflow_name}} ({{workflow_id}})
Failing node:     {{lastNodeExecuted}}
Error:            {{error_message}}
Execution:        {{execution_url}}
Detected at:      {{failure_timestamp}}
Owner:            @{{operator_name}}
Action:           Rolling back to known-good snapshot ({{snapshot_location}}). Re-verify to follow.
```

Notes:
- The Error Trigger fires only on an AUTOMATIC execution failure, so this alert is validated by the controlled production-trigger test, not a manual editor run.
- After rollback completes, post a follow-up: known-good restored at {{restored_timestamp}}, re-verified execution id {{reverify_execution_id}}, root cause handed to {{handoff_target}}.
