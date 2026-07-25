# Enrichment Workflow Audit - {{workflow_name}}

Audit of an existing enrichment workflow against the seven critical directives. File the completed report in `reports/` named `{{YYYY-MM-DD}}-{{workflow_name}}-audit.md`. Resolve every `{{placeholder}}`.

- **Workflow:** {{workflow_name}} ({{n8n_workflow_id}})
- **Audited by:** contact-enrichment-guardian
- **Date:** {{YYYY-MM-DD}}
- **Trigger / cadence:** {{one_off | scheduled}}

## Scorecard

| Stage | Status | Notes |
|---|---|---|
| Batched loop | {{pass | fail | n/a}} | {{...}} |
| Rate-limit throttle | {{pass | fail | n/a}} | {{...}} |
| Waterfall + provenance | {{pass | fail | n/a}} | {{...}} |
| Normalize / merge | {{pass | fail | n/a}} | {{...}} |
| Typed write-back (DATE / SINGLE_OPTIONS) | {{pass | fail | n/a}} | {{...}} |
| Idempotency / re-run safety | {{pass | fail | n/a}} | {{...}} |
| Credential rebind discipline | {{pass | fail | n/a}} | {{...}} |

## Findings (severity-ranked)

| Severity | Finding | Stage | Evidence | Fix |
|---|---|---|---|---|
| {{Critical | High | Medium | Low | Info}} | {{what is wrong}} | {{stage}} | {{node / value}} | {{remediation}} |

Severity guide:
- **Critical** - silently corrupts or drops data (e.g. DATE with `Z` writing blank, no conditional-overwrite guard).
- **High** - breaks a run or a binding (e.g. unbound credential after MCP edit, no throttle so it 429s mid-list).
- **Medium** - degrades quality (e.g. missing email-verify gate, over-stacked providers past four).
- **Low / Info** - hygiene (e.g. missing provenance fields, undocumented 429 remediation).

## Handoffs

- To **gohighlevel-guardian:** {{fieldKey / option-value / API-body questions}}
- To **n8n-workflow-guardian:** {{node mechanics / credential-rebind operation / retry-backoff}}

## Open questions carried

> TODO: {{any per-engagement design decision or unconfirmed-public-doc item}}

## Recommendation

{{ship | fix-then-ship | block}} - {{one-line summary}}
