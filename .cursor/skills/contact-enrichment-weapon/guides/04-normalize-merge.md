# 04 - Normalize and Merge

Covers Command Brief ACTION step 3. Grounded in `research/2026-06-29-n8n-merge-node.md` (official n8n docs) and `research/2026-06-29-enrichment-cross-source-synthesis.md` (the normalize-before-merge mechanic the official doc omits).

## The job

Reconcile the base contact branch with one or more enrichment-result branches into a single canonical contact record before write-back. Provider outputs arrive with different field names and shapes; this step unifies them.

## The Merge recipe

Use the Merge node in **Combine** mode:

- Mode: **Combine** -> **Matching Fields**.
- Output type: **Enrich Input 1** ("Keep all data from Input 1, and add matching data from Input 2"). This is a left join: base contact = Input 1, enrichment result = Input 2. The base contact is always kept; matching enriched data is added.
- Match config: set the comparison field in **Input 1 Field** and **Input 2 Field** (the idempotency / match key, see below).

Other available join types (Keep Matches = inner, Keep Non-Matches, Keep Everything = outer, Enrich Input 2 = right join) and modes (Append, SQL Query in v1.49.0+, Choose Branch) exist, but "Combine -> Matching Fields -> Enrich Input 1" is the default enrichment recipe.

## Normalize the match key BEFORE Merge (the load-bearing step)

The official Merge doc "provides no explicit guidance on normalizing match keys beforehand." Because Merge does an EXACT field-value comparison, normalization is the workflow author's responsibility and MUST be taught, not assumed:

- Add a **Set / Edit Fields** node BEFORE Merge on BOTH branches.
- Normalize the match key identically on both: lowercase + trim whitespace (e.g. on email, or normalize the GHL contact id format).
- If the keys are not normalized identically, the Merge silently matches nothing and the enrichment is dropped on the floor.

Whatever idempotency key is chosen (GHL contact id by default, see `guides/06-idempotency-dedupe.md`) becomes the Merge match field and must be normalized identically on both branches.

## Map provider free-text onto GHL option values

For any field that targets a GHL SINGLE_OPTIONS (dropdown / radio) field, the Normalize step must MAP the provider's free-text output onto the field's exact configured option value, via an explicit lookup / Set, not a raw passthrough. Example: a provider returns `"tx"` or `"Texas"` but the GHL option value is `"TX"`. A raw passthrough writes blank. See the exact-value rule in `guides/05-ghl-typed-writeback.md`.

## Keeping provenance through a clash

When two providers return the same field, use the Merge clash-handling option "Always Add Input Number to Field Names" to preserve both conflicting values rather than silently dropping one. This supports the provenance directive (CRITICAL DIRECTIVE 5) by keeping both sources visible for the resolution logic.

## Pipeline position

Normalize/Merge sits AFTER the waterfall and BEFORE the verify + typed write-back: waterfall -> Normalize -> Merge -> Verify -> write-back.

## Worked example

`examples/01-clone-carolyn-for-new-client.md` adds Set nodes to lowercase the email on both branches before a Combine -> Matching Fields -> Enrich Input 1 Merge.
