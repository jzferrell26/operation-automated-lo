---
source_url: https://help.gohighlevel.com/support/solutions/articles/48001216170-action-update-contact-field-date-type-field
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: ghl-date-typing
weapon: contact-enrichment-weapon
---

# Update Contact Field - Date type field (GoHighLevel official support)

## Summary
The authoritative GHL reference for how a DATE-type contact custom field must be formatted. Confirms the Command Brief's #1 CRITICAL DIRECTIVE and the DATE no-`Z` gotcha: GHL date fields take a plain date string (MM-DD-YYYY or DD-MMM-YYYY) with no time/timezone component. A full ISO-8601 timestamp with a trailing `Z` is NOT the expected shape for these fields.

## Key quotations / statistics
- Accepted formats: **MM-DD-YYYY** (e.g. 12-21-2021) and **DD-MMM-YYYY** (e.g. 21-OCT-2021).
- "The documentation does not mention support for time or timezone elements. Only date values are addressed."
- The support article does not document the blank-on-mismatch failure mode (that is established by the Cuantico Grant/Carolyn prior art, where a mis-typed date silently writes blank).

## Annotations for weapon-forge
- This is the primary external citation for `guides/ghl-typed-writeback.md`, DATE section. Pair it with the Cuantico prior art (Grant LaViale workflow O736werRK9B8cPNa) which is the internal authority on the silent-blank failure mode.
- The "no time/timezone" finding is the grounding for the brief's "no `Z` suffix" rule: a date sent as `2026-06-29T00:00:00Z` is the wrong shape; send the date-only string in one of the two accepted formats.
- IMPORTANT lane boundary: the brief routes raw fieldKey resolution and the exact API request-body JSON to gohighlevel-guardian. This note documents the FORMAT the enrichment pattern must produce; the exact endpoint body keys are gohighlevel-guardian's to confirm at design time.
- Recommend the weapon teach a Set/Edit-Fields "format date" step (or GHL's Date/Time Formatter premium action) immediately before write-back to coerce provider date outputs into MM-DD-YYYY.

## Related sources seen (not separately filed)
- GHL Custom Fields V2 API (marketplace.gohighlevel.com/docs/ghl/custom-fields/custom-fields-v-2-api): confirms field types "text, numeric, selection options and special fields like date/time or signature" but the JS-rendered page returned only its intro to the fetcher; the request-body JSON shape and SINGLE_OPTIONS value rule were not extractable (see research-summary gaps).
- GHL "How to use Custom Fields" support article: enumerates field types incl. "Drop downs, Date Pickers, Radio Selects, Checkbox Groups"; multi-select dropdowns can hold "50+" options.
