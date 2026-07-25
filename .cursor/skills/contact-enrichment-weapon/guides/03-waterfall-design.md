# 03 - Waterfall Provider Fallback

Covers Command Brief ACTION step 2 and CRITICAL DIRECTIVE 5 (provenance). This is the spine of the enrichment pattern. Grounded in `research/2026-06-29-waterfall-enrichment-unify.md` (the authoritative practitioner design) and corroborated by `research/2026-06-29-enrichment-cross-source-synthesis.md`.

## What a waterfall is

Query multiple data providers in a defined priority order, stop on the first confident match, and only pay each downstream provider for the records earlier providers missed. The quotation that defines it: "Sequential fallback with deduplication. Each downstream provider only processes records earlier sources missed... you only pay each downstream provider for the records it actually resolves."

## The two rules that make it a waterfall (not just parallel calls)

1. **Stop on first confident hit.** "The first confident match wins. No subsequent providers overwrite that data." Once a field is filled with a confident value, no later provider touches it.
2. **Only pass misses downstream.** After each provider call, branch the records: filled records skip the rest of the waterfall; only the empty / low-confidence records (the misses) flow to the next provider.

In n8n this maps to an **IF / Filter** branch immediately after each provider call: route empty-or-low-confidence records to the next provider, route filled records past it. This is the per-field source-attribution requirement made concrete.

## Provider order

Define provider priority by ICP coverage: "Define provider priority based on ICP coverage (industry, geography, company size, persona)." The single highest-coverage provider for the target audience goes first.

> TODO: open question - needs human decision before next refresh. The specific enrichment providers and their waterfall order are per-client and are a DESIGN-TIME input, not a research gap. Have the operator name the providers and order per run. Default the weapon to provider-agnostic logic and let the operator slot in the named providers.

## How many providers

Three to four is the practical sweet spot. The evidence:

- Coverage stacking: single source 55-70%; two-source 70-85%; three-source 82-88%; four-source + email verification 85-92%.
- Diminishing returns: the 2nd provider recovers 15-25% of misses, the 3rd adds another 8-12%, and beyond four it is only 3-5% per additional source. "Three to four providers represent the practical sweet spot."

When an operator over-stacks providers, cap at four and cite the diminishing-returns figures.

## Provenance (CRITICAL DIRECTIVE 5)

Records must sync to the CRM "with source attribution", each field tagged with which provider supplied it. Teach a companion-field set per enriched value:

- `_source` - which provider filled this field.
- `_enriched_at` - when (note: if this lands in a GHL DATE field, it must follow the DATE format rule in `guides/05-ghl-typed-writeback.md`).
- `_confidence` - the provider's confidence score, used later by the conditional-overwrite rule in `guides/06-idempotency-dedupe.md`.

## The email verification gate

Email verification is a MANDATORY final gate BEFORE write-back. Sequence the pipeline as: waterfall -> Normalize -> Verify -> typed write-back. Verification reduces bounce from 8-15% (single-source unverified) to under 3% on verified waterfall data. Match rate and email accuracy are distinct metrics: a provider can return an email that is wrong, so verify before you write and before any send relies on it.

## Termination guard

Because the "pass misses to next provider" branch loops, pair the waterfall with the batch-exhaustion exit from `guides/01-batched-loop.md`. A waterfall branch that loops back without a termination guard hangs the run (the infinite-loop footgun).

## Worked example

`examples/01-clone-carolyn-for-new-client.md` builds a three-provider waterfall with an IF-branch after each call and `_source` tagging.
