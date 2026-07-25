---
source_url: https://help.gohighlevel.com/support/solutions/articles/48001161579-how-to-use-custom-fields
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: high
topic: ghl-field-types
weapon: contact-enrichment-weapon
---

# How to Create and Use Custom Fields within HighLevel (official support)

## Summary
Establishes the catalog of GHL custom field types the enrichment write-back must target, including the single-option / dropdown / radio family that the Command Brief calls SINGLE_OPTIONS. Confirms the field types exist; does NOT document the exact-value-match rule for option fields (that gap is routed to gohighlevel-guardian).

## Key quotations / statistics
- Field types: "Short Text, Long Text, Drop downs, Date Pickers, Phone, Email, Radio Selects, Checkbox Groups, URLs, and more."
- "The Dropdown (multiple) field can have a lot of options (50+) so there is no practical limit."
- The article "does not provide specific rules about whether entered values must exactly match pre-configured options" nor the "value vs label distinction."

## Annotations for weapon-forge
- Confirms SINGLE_OPTIONS-family fields = "Drop downs" / "Radio Selects" in GHL's UI vocabulary. The weapon's `guides/ghl-typed-writeback.md` SINGLE_OPTIONS section should map the brief's term to these UI types.
- The exact behavior the brief asserts (a written value must be EXACTLY one of the configured option values or it writes blank/errors) is NOT confirmed by GHL's public docs. It is asserted by the Command Brief and the Cuantico prior art (Grant/Carolyn SINGLE_OPTIONS gotcha). Weapon-forge should present it as a known internal gotcha and route the per-field option-value list to gohighlevel-guardian at design time.
- Practical teaching point: because option values are case- and string-exact, the Normalize step must map a provider's free-text output (e.g. "tx", "Texas") onto the field's configured option value via an explicit lookup/Set, not a raw passthrough.
