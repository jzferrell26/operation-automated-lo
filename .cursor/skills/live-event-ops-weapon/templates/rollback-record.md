# Rollback Record

Filled when a rollback was executed. Captures what failed, the escalation, the rollback steps, and the root-cause hand-off. See `guides/04-triage-and-rollback.md`. Target: under 10 minutes from failure detection to re-verified known-good.

- **Client / event:** {{client_and_event}}
- **Operator (named owner):** {{operator_name}}
- **LIVE workflow id(s):** {{live_workflow_ids}}
- **Snapshot restored:** {{snapshot_location}}
- **Failure detected at:** {{failure_timestamp}}
- **Known-good restored at:** {{restored_timestamp}}
- **Total rollback time:** {{rollback_duration}}

## Triage (T1)

- **Ran at all?** {{no_execution_or_errored}}
- **Failing node (lastNodeExecuted):** {{failing_node}}
- **Error message:** {{error_message}}
- **Triage execution id:** {{triage_execution_id}}

## Escalation (T2)

- **Slack alert fired:** {{yes_no}} (channel: {{slack_channel}})
- **Operator informed:** {{yes_no}}
- **Objective trigger that fired escalation:** {{escalation_trigger}}

## Rollback steps (T3)

| Step | Action | Done | Note |
|---|---|---|---|
| T3a | Deactivate to stop intake | {{t3a_done}} | confirmed active: false {{t3a_note}} |
| T3b | Restore export-before-deploy snapshot | {{t3b_done}} | {{t3b_note}} |
| T3c | Re-activate the known-good | {{t3c_done}} | confirmed active: true {{t3c_note}} |
| T3d | Re-verify restored known-good (guide 03 loop) | {{t3d_done}} | verify execution id {{t3d_execution_id}} |

## Root-cause hand-off (T4)

- **Handed to:** {{n8n_workflow_guardian_or_gohighlevel_guardian}}
- **Defect summary:** {{defect_summary}}
- **Context passed (workflow id, node, error, execution id):** {{handoff_context}}
