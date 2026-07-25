# 05 - Typed GHL Custom-Field Write-Back

Covers Command Brief ACTION step 4 and CRITICAL DIRECTIVE 1 (the most important directive). Grounded in `research/2026-06-29-ghl-date-field-format.md` and `research/2026-06-29-ghl-custom-fields-types.md` (both official GHL support docs).

## Why this is directive #1

A mistyped GHL custom-field value does not throw a loud error. It writes blank or fails silently, and nobody notices until someone looks at the field and finds it empty. The whole enrichment run can "succeed" while quietly corrupting the data it was meant to fill. Get the FORMAT exactly right.

## DATE fields (the no-`Z` gotcha)

GHL DATE-type custom fields take a plain date string with NO time and NO timezone:

- Accepted formats: **MM-DD-YYYY** (e.g. `12-21-2021`) and **DD-MMM-YYYY** (e.g. `21-OCT-2021`).
- The GHL docs do not mention support for time or timezone elements. Only date values are addressed.
- Therefore a full ISO-8601 timestamp with a trailing `Z` (e.g. `2026-06-29T00:00:00Z`) is the WRONG shape. Strip the time and timezone; send the date-only string in one of the two accepted formats.

Teach a **Set / Edit Fields** "format date" step (or GHL's Date/Time Formatter premium action) immediately before write-back to coerce every provider date output into MM-DD-YYYY. Provider date outputs vary wildly; normalize them all to one accepted format at this single choke point.

> TODO: open question - needs human decision before next refresh. The Cuantico-internal silent-blank failure mode (a mis-typed DATE writing blank) is documented by the live n8n prior art, NOT public GHL docs. The Grant LaViale workflow (n8n `O736werRK9B8cPNa`) and the Carolyn / Cuantico clones are the authoritative internal reference. Pull the exact failure signature from the live instance, or via n8n-workflow-guardian / gohighlevel-guardian, when building or auditing. The public support doc confirms the FORMAT but not the failure mode.

## SINGLE_OPTIONS fields (the exact-value rule)

SINGLE_OPTIONS in the brief's vocabulary = GHL's "Drop downs" / "Radio Selects" (and the multi-select dropdown, which can hold 50+ options). The write-back must supply a value that is EXACTLY one of the field's configured option values:

- The Normalize step (`guides/04-normalize-merge.md`) must map the provider's free-text output onto the field's configured option value via an explicit lookup / Set. A raw passthrough of `"Texas"` when the option value is `"TX"` writes blank.
- Option values are case- and string-exact. Treat them as literal tokens, not free text.

> TODO: open question - needs human decision before next refresh. The exact SINGLE_OPTIONS write behavior (that a written value must EXACTLY match a configured option value or it writes blank/errors, and the value-vs-label distinction) is NOT confirmed by public GHL support or API docs. It is asserted by the Command Brief and the Cuantico prior art only. RESOLVE the per-field option-value list and the exact-match rule via gohighlevel-guardian at design time (per the brief's lane boundary). Present it to the operator as a known internal gotcha, not a documented fact.

## text fields

Plain text fields are the forgiving case: pass the normalized value through. Still trim whitespace and apply any per-client casing in the Normalize step.

## Resolving fieldKeys and the API body (route out)

This guide produces the correct FORMAT. It does NOT resolve which `fieldKey` each value targets, nor the exact request-body JSON.

> TODO: open question - needs human decision before next refresh. The exact GHL Custom Fields V2 API request-body shape (fieldId vs key, the customFields array element shape for DATE and SINGLE_OPTIONS) was not extractable from public docs (the marketplace page is JS-rendered and returned only its intro). Route the fieldKey resolution and the request-body shape to gohighlevel-guardian at design time. Do NOT re-derive it here.

## Pipeline position and the verify gate

Write-back is the LAST stage, off the loop's `done` output (`guides/01-batched-loop.md`), and AFTER the mandatory email-verify gate (`guides/03-waterfall-design.md`): waterfall -> Normalize -> Merge -> Verify -> typed write-back. Apply the conditional-overwrite guard from `guides/06-idempotency-dedupe.md` immediately before writing so a blank enrichment never overwrites a good value.

## Worked examples

- `examples/01-clone-carolyn-for-new-client.md` formats a DATE to MM-DD-YYYY and maps a state to its SINGLE_OPTIONS value before write-back.
- `examples/02-audit-silent-blank-date.md` is the canonical case where an ISO timestamp with a `Z` silently wrote blank.
