---
source_url: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.splitinbatches
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: batching
weapon: contact-enrichment-weapon
---

# Loop Over Items (Split in Batches) Node (n8n official docs)

## Summary
Authoritative mechanics for the batched-loop primitive at the heart of the Command Brief's ACTION step 1. Documents Batch Size, the two outputs (loop / done), the context variables (`noItemsLeft`, `currentRunIndex`), the Reset option, and the infinite-loop caveat. typeVersion 3 is current.

## Key quotations / statistics
- Batch Size = "the number of items to return with each call." Default batch size is 1 (process one item at a time).
- Two outputs: a **loop** output (one batch per iteration) and a **done** output (combined data after all iterations).
- The node "saves the original incoming data" and cycles until items are exhausted, then consolidates results.
- Context variables: `{{$("Loop Over Items").context["noItemsLeft"]}}` returns a boolean (false = items remain, true = all processed); `{{$("Loop Over Items").context["currentRunIndex"]}}` gives the current iteration index.
- Reset option: "will reset with the current input-data newly initialized with each loop" - useful for paginated APIs.
- Caveat: "if your termination condition never matches, your workflow execution will get stuck in an infinite loop."
- Example workflow references **typeVersion 3** of the Split in Batches node.

## Annotations for weapon-forge
- This is the canonical citation for `guides/batched-loop.md`. The loop/done two-output topology is the skeleton: provider calls + waterfall + normalize hang off the **loop** output; the GHL write-back / completion summary hangs off the **done** output.
- `noItemsLeft` and `currentRunIndex` are the supported way to drive loop-exit conditions and per-iteration logging; the weapon should prefer these over manual counters.
- The infinite-loop caveat is a real footgun for the waterfall: if the "pass misses to next provider" branch loops back without a termination guard, the run hangs. Weapon-forge should pair this with an explicit batch-exhaustion exit.
- Node mechanics (SDK-level) are n8n-workflow-guardian's lane per the brief; this note captures only the design-level mechanics the enrichment pattern composes.
