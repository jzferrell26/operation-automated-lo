---
source_url: https://docs.n8n.io/integrations/builtin/rate-limits.md
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: high
topic: rate-limits
weapon: contact-enrichment-weapon
---

# Handling API Rate Limits (n8n official docs)

## Summary
Official n8n guidance for the throttle pattern that keeps a batched enrichment run from hammering the provider and GHL (Command Brief CRITICAL DIRECTIVE 2). The canonical pattern is Loop Over Items (Split in Batches) + Wait node, with manual tuning of batch size and wait interval in response to 429s. Retrieved via the documented `.md?ask=...` query interface because the HTML page 404s the fetcher.

## Key quotations / statistics
- Pattern: "Add **Loop Over Items (Split in Batches)** *before* the node that calls your API", then a Wait node set to "Resume -> After Time Interval", then connect the Wait node back to the Loop node to form a throttled cycle.
- Batch size: "Start with `1` to process single items, or use larger batches to reduce total API calls - adjust based on your API's capacity."
- Tuning rule: "when you hit **429 (too many requests)**, increase the Wait time or reduce **Batch Size**."
- The section "does not provide explicit exponential backoff or retry logic" - it is a manual, configurable throttle, not automatic rate-limit detection.

## Annotations for weapon-forge
- This is the official backing for `guides/rate-limit-throttle.md` and the brief's batchSize discipline. The SplitInBatches -> provider call -> Wait -> back-to-loop topology is the recommended skeleton.
- Because n8n gives no built-in backoff here, the weapon should explicitly recommend pairing this with the per-node Retry On Fail / error-branch mechanics owned by n8n-workflow-guardian (hand off the retry/backoff SDK detail there).
- Concrete default to teach: choose batch size and wait interval from the STRICTER of the two downstream limits (the enrichment provider vs the GHL API), since a single run touches both.
- 429-driven tuning ("increase Wait or reduce Batch Size") is the operator-facing remediation to document when a run gets throttled mid-list.
