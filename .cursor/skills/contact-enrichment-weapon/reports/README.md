# Reports

This folder accumulates the outputs of past contact-enrichment-weapon runs over time: design specs for workflows that were built or cloned, and audit reports for workflows that were reviewed.

## Naming

- Audits: `{{YYYY-MM-DD}}-{{workflow_name}}-audit.md` from `templates/enrichment-audit-report.md`.
- Design specs: `{{YYYY-MM-DD}}-{{client_name}}-design-spec.md` from `templates/enrichment-design-spec.md`.

## Why keep them

A dated trail of enrichment designs and audits makes the next clone faster (start from the closest prior spec) and makes recurring failure modes visible (e.g. how often the DATE-with-`Z` silent-blank shows up). Each report should name any handoffs to gohighlevel-guardian or n8n-workflow-guardian so the trail is complete.
