# Post-Deploy Verification Report

One row per check, each with the execution id. See `guides/03-postdeploy-verification.md`. The event is LIVE only when every check passes and the watch window elapsed clean.

- **Client / event:** {{client_and_event}}
- **Operator (named owner):** {{operator_name}}
- **LIVE workflow id:** {{live_deploy_id}}
- **Deploy timestamp (startedAfter):** {{deploy_timestamp_iso8601}}
- **Controlled-test payload marker:** {{test_record_marker}}

| # | Check | Pass / Fail | Execution id | Note |
|---|---|---|---|---|
| V1 | Controlled test fired at PRODUCTION trigger (HTTP 200) | {{v1_result}} | n/a | {{v1_note}} |
| V2 | Test execution found, status = success | {{v2_result}} | {{v2_execution_id}} | {{v2_note}} |
| V3 | Expected outputs produced (records, tags, notifications) | {{v3_result}} | {{v3_execution_id}} | {{v3_note}} |
| V4 | Watch window elapsed: zero error/crashed, nothing stuck | {{v4_result}} | {{v4_execution_ids}} | window: {{watch_window}} |

**Controlled-test cleanup applied:** {{cleanup_action}} (per open question 3 decision)

## RESULT: {{LIVE_or_NOT_LIVE}}

- If LIVE: all checks passed; event declared live at {{declared_live_timestamp}}.
- If NOT LIVE: failing check {{failing_check}}; proceed to `guides/04-triage-and-rollback.md`. Rollback record: {{rollback_record_link}}.
