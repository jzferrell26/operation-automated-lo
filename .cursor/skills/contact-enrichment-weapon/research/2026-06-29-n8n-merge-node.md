---
source_url: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.merge
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: high
topic: normalize-merge
weapon: contact-enrichment-weapon
---

# Merge Node (n8n official docs)

## Summary
Authoritative reference for the normalize/merge step (Command Brief ACTION step 3). The Merge node reconciles a base contact branch with one or more enrichment-result branches. The "Combine by Matching Fields" mode with an "Enrich Input 1" output type is the exact join the enrichment pattern needs: keep the base contact, add matching enriched data.

## Key quotations / statistics
- Modes: **Append** ("Keep data from all inputs"), **Combine** (Matching Fields / Position / All Possible Combinations), **SQL Query** (v1.49.0+, supports LEFT/RIGHT JOIN via AlaSQL), **Choose Branch** (v0.194.0+).
- Combine-by-Matching-Fields join types: **Keep Matches** (inner), **Keep Non-Matches**, **Keep Everything** (outer), **Enrich Input 1** ("Keep all data from Input 1, and add matching data from Input 2" - left join), **Enrich Input 2** (right join).
- Match config: specify comparison fields in **Input 1 Field** and **Input 2 Field**.
- Clash handling: prioritize either input, or "Always Add Input Number to Field Names" to preserve both conflicting values.
- "The documentation provides no explicit guidance on normalizing match keys beforehand." (Normalization is the workflow author's responsibility.)
- Version notes: Matching Fields / Position modes v0.194.0+; multiple-input + SQL Query v1.49.0+.

## Annotations for weapon-forge
- `guides/normalize-merge.md` should use "Combine -> Matching Fields -> Enrich Input 1" as the default recipe (base contact = Input 1, enrichment result = Input 2).
- The doc's silence on key normalization is itself load-bearing: because Merge does an exact field-value comparison, the weapon MUST teach a Set/Edit-Fields normalization step BEFORE Merge (lowercase + trim the match key, e.g. email or GHL contact id). This corroborates the c-sharpcorner/AiMe practitioner guidance captured separately.
- Clash handling ("Add Input Number to Field Names") is the mechanism for keeping provider provenance when two providers return the same field - relevant to CRITICAL DIRECTIVE 5.
- Idempotency key choice (the brief's open item) intersects here: whichever key is chosen (GHL contact id default) is the Merge match field and must be normalized identically on both branches.
