# Pre-flight Go / No-Go Verdict

Fill every placeholder. The verdict at the bottom is binding: a single NO-GO check means NO-GO. See `guides/01-preflight-gate.md`.

- **Client / event:** {{client_and_event}}
- **Operator (named owner):** {{operator_name}}
- **n8n instance:** {{instance_host}}
- **Date / time:** {{iso8601_timestamp}}
- **LIVE Deployment workflow id:** {{live_deploy_id}}
- **LIVE Intake workflow id (if in scope):** {{live_intake_id}}

| # | Check | Result (GO / NO-GO) | Evidence / note |
|---|---|---|---|
| P0 | Confirmed LIVE workflow id (not the archived clone) | {{p0_result}} | {{p0_note}} |
| P1 | Credentials bound, zero hardcoded secrets | {{p1_result}} | {{p1_note}} |
| P2 | Workflows published / active | {{p2_result}} | {{p2_note}} |
| P3 | Production trigger reachable (prod URL, not test URL) | {{p3_result}} | {{p3_note}} |
| P4 | Per-event config set (client, slot keys, tags, dormant-email safeguard) | {{p4_result}} | {{p4_note}} |
| P5 | Export-before-deploy snapshot taken | {{p5_result}} | snapshot: {{snapshot_location}} |

**Open questions still unresolved for this run** (record the operator decision or note still-default):
- Instance type/version: {{oq1_decision_or_default}}
- Snapshot storage location: {{oq2_decision_or_default}}
- Controlled-test cleanup policy: {{oq3_decision_or_default}}
- Watch-window length: {{oq4_decision_or_default}}

## VERDICT: {{GO_or_NO_GO}}

- If GO: proceed to `guides/02-deploy-sequence.md`.
- If NO-GO: stop. Failing check: {{failing_check}}. Hand-off (if structural): {{handoff_target}}.
