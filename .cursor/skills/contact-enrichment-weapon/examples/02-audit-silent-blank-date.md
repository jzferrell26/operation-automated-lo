# Example 02 - Audit: The Silent-Blank DATE Field (Edge Case / Failure)

Demonstrates auditing an existing workflow where CRITICAL DIRECTIVE 1 was violated and a DATE field silently wrote blank. Illustrates `guides/05-ghl-typed-writeback.md`, `guides/07-credential-rebind.md`, and the audit report template `templates/enrichment-audit-report.md`.

## Input (what the Guardian receives)

> "Audit Grant's enrichment clone for a new client. They say the `last_funding_date` field is empty for every contact even though the run reports success. Other fields populate fine."

## Investigation walkthrough (what the Guardian produces)

### Symptom

`last_funding_date` is blank on every contact; the run reports success; text fields populate. This is the textbook silent-blank failure: the write "succeeds" but the field stays empty (`guides/05`). The fact that only the DATE field is affected points straight at a DATE format violation, not a credential or mapping problem.

### Root cause

Inspect the Set node feeding the GHL write-back. It passes the provider's date through as a full ISO-8601 timestamp:

```
last_funding_date = 2025-09-14T00:00:00Z
```

GHL DATE fields accept only MM-DD-YYYY or DD-MMM-YYYY with no time and no timezone, so the trailing `Z` timestamp is the wrong shape and GHL drops it to blank (`guides/05`, grounded in `research/2026-06-29-ghl-date-field-format.md`).

> TODO: open question - needs human decision before next refresh. The exact silent-blank behavior is documented by the Cuantico prior art (Grant LaViale workflow `O736werRK9B8cPNa`), not public GHL docs. Confirm the precise failure signature against the live instance or via gohighlevel-guardian when remediating.

### Fix

Add a Set / Edit Fields "format date" step before write-back to coerce the provider date into MM-DD-YYYY:

```
2025-09-14T00:00:00Z  ->  09-14-2025
```

### Post-fix: rebind check

The fix was applied through the n8n MCP, so the credential bindings on the touched node were stripped (`guides/07`). Re-bind the GHL credential and verify in the UI before declaring the workflow fixed. `get_workflow_details` from the MCP will not show the binding, so confirm via the UI / REST.

## Output (the report)

Filed using `templates/enrichment-audit-report.md`:

| Severity | Finding | Stage | Fix |
|---|---|---|---|
| Critical | `last_funding_date` written as ISO timestamp with `Z`; GHL silently blanks it | Typed write-back | Add format-date Set step -> MM-DD-YYYY |
| High | MCP edit stripped GHL credential binding | Credential rebind | Re-bind GHL credential, verify in UI |
| Info | No `_enriched_at` / `_source` provenance fields present | Provenance | Recommend adding companion fields per `guides/03` |

Outcome: one Critical (the silent-blank cause), one High (the rebind), one Info (missing provenance). The DATE format violation is the canonical lesson of directive 1.
