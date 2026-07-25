---
source_url: https://www.unifygtm.com/explore/waterfall-enrichment-b2b-contact-data
retrieved_on: 2026-06-29
source_type: blog
authority: practitioner
relevance: critical
topic: waterfall
weapon: contact-enrichment-weapon
---

# Waterfall Enrichment: The 2026 B2B Contact Data Architecture (Unify)

## Summary
Defines the canonical waterfall provider-fallback pattern: query multiple data providers in a defined priority order, stop on the first confident match, and only pay each downstream provider for the records earlier providers missed. This is the authoritative design reference for the Command Brief's ACTION step 2 (the waterfall). It also establishes provenance/source-attribution as a first-class output and email verification as a mandatory final gate before write-back.

## Key quotations / statistics
- "Sequential fallback with deduplication. Each downstream provider only processes records earlier sources missed... you only pay each downstream provider for the records it actually resolves."
- Stop rule: "the first confident match wins. No subsequent providers overwrite that data."
- Provider ordering: "Define provider priority based on ICP coverage (industry, geography, company size, persona)."
- Coverage stacking: single source 55-70%; two-source 70-85%; three-source 82-88%; four-source + email verification 85-92%.
- Diminishing returns: 2nd provider recovers "15-25% of misses", 3rd adds "another 8-12%", beyond four "3-5% per additional source" so "three to four providers represent the practical sweet spot."
- Verification gate reduces bounce from "8-15%" (single-source unverified) to "under 3%" on verified waterfall data; "Match rate and email accuracy are distinct metrics."
- Provenance: records sync to CRM "with source attribution", each field tagged with which provider supplied it.
- Cost example: on 1,000 prospects at 70% first-provider coverage, only 300 records flow to Provider 2.

## Annotations for weapon-forge
- This is the primary citation for a `guides/waterfall-design.md`. The stop-on-first-hit + only-pass-misses-downstream logic maps directly to an n8n IF/Filter branch after each provider call (route empty/low-confidence records to the next provider).
- The "source attribution per field" requirement is the external-source backing for the brief's CRITICAL DIRECTIVE 5 (record provenance). Recommend the weapon teach a `_source` / `_enriched_at` / `_confidence` companion field per enriched value.
- The "email verification as final gate" step belongs BEFORE the GHL write-back step in the canonical pipeline; weapon-forge should sequence it as Normalize -> Verify -> typed write-back.
- "Three to four providers is the sweet spot" gives the weapon a concrete default cap when an operator over-stacks providers.
- Consistent with the Cuantico prior art (Carolyn/Grant/Cuantico clones) which are provider-agnostic batched loops; this source supplies the provider-agnostic theory the brief asked the weapon to teach.
