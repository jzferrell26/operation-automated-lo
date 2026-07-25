# n8n Workflow Audit Report

> Fill every `{{placeholder}}`. Delete this quote block before delivering. No em dashes anywhere.

- **Instance:** {{cuantico-main | voyze.ai}}
- **Workflow:** {{name}} (`{{workflow_id}}`)
- **Active state at audit time:** {{active | inactive}}
- **Audited by:** n8n-workflow-guardian
- **Date:** {{YYYY-MM-DD}}
- **Workflow JSON exported before audit:** {{yes | no}}

## Findings

| Node | Severity | Issue | Reason (research-grounded) | Fix |
|---|---|---|---|---|
| `{{node_name}}` | {{Critical | High | Medium | Low}} | {{exact issue}} | {{why, cite the guide/research}} | {{the concrete fix}} |
| `{{node_name}}` | {{...}} | {{...}} | {{...}} | {{...}} |

> Severity key (from `guides/02-audit-workflow.md`):
> - Critical: breaks or will break a live workflow with no edit-time error.
> - High: wrong-output or silent-data-loss risk.
> - Medium: resilience gap that surfaces under failure.
> - Low: style or maintainability.

## Bindings I could not verify from the API

> The API omits node credentials, so list any node whose binding you marked Unverified and how it
> must be confirmed (UI or test execution).

- `{{node_name}}` - {{how to confirm}}

## Out-of-scope items routed elsewhere

- {{finding}} -> {{contact-enrichment-guardian | gohighlevel-guardian | live-event-ops-guardian | security-guardian}}

## Verdict

{{Safe to ship | Fix the N Critical(s) first, then re-audit}}
