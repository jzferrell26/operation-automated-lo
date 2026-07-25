# 01 - Batched Loop (SplitInBatches)

Covers Command Brief ACTION step 1. The batched loop is the skeleton of every enrichment workflow. Grounded in `research/2026-06-29-n8n-splitinbatches-node.md` (official n8n docs) and corroborated by `research/2026-06-29-enrichment-cross-source-synthesis.md`.

## Why batch at all

If you feed an unbatched list straight into a provider call, n8n fires every request at once. Practitioner sources report n8n "fires 500 API requests simultaneously" if you do not batch (`research/2026-06-29-enrichment-cross-source-synthesis.md`). That overruns provider and GHL rate limits and partially fails mid-list. Batching turns one large run into a sequence of short, resilient units of work.

## The node topology

Use the "Loop Over Items (Split in Batches)" node (typeVersion 3 is current per the official docs). It has two outputs:

- **loop** output - emits one batch per iteration. Hang the provider calls, the waterfall, and the normalize step off THIS output.
- **done** output - emits the combined data after all iterations finish. Hang the GHL write-back and the completion summary off THIS output.

The node saves the original incoming data and cycles until items are exhausted, then consolidates.

## Setting Batch Size

- `Batch Size` = the number of items returned per iteration. Default is 1 (one item at a time).
- For large GHL runs, start at 200-500 items per iteration (practitioner default in `research/2026-06-29-enrichment-cross-source-synthesis.md`), then tune DOWN if you hit a 429. See `guides/02-rate-limit-throttle.md`.
- Always choose the batch size from the STRICTER of the two downstream limits: the enrichment provider's limit vs the GHL API limit. A single run touches both.

## Driving loop exit and per-iteration logging

Prefer the node's own context variables over manual counters:

- `{{$("Loop Over Items").context["noItemsLeft"]}}` returns a boolean: `false` while items remain, `true` once all are processed. Use it as the loop-exit condition.
- `{{$("Loop Over Items").context["currentRunIndex"]}}` gives the current iteration index for logging.

The Reset option re-initializes the loop with new input data each pass, which is useful for paginated provider APIs.

## The infinite-loop footgun

The official docs warn: "if your termination condition never matches, your workflow execution will get stuck in an infinite loop." This is a real risk in the waterfall, where the "pass misses to the next provider" branch can loop back without a termination guard. Always pair the loop with an explicit batch-exhaustion exit driven by `noItemsLeft`. See `guides/03-waterfall-design.md` for how the waterfall branches must converge back without re-entering the loop indefinitely.

## Lane boundary

Node-level mechanics (the exact node JSON, connection wiring, typeVersion migration) are n8n-workflow-guardian's lane per the Command Brief. This guide captures only the design-level behavior the enrichment pattern composes.

## Worked example

`examples/01-clone-carolyn-for-new-client.md` shows the loop laid down first, with batchSize chosen from the stricter limit and the write-back hung off the `done` output.
