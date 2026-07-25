---
source_url: https://bitscale.ai/blogs/lead-enrichment-workflow-for-outbound-teams-step-by-step-setup-guide
retrieved_on: 2026-06-29
source_type: blog
authority: practitioner
relevance: critical
topic: idempotency-dedupe
weapon: contact-enrichment-weapon
---

# Lead Enrichment Workflow for Outbound Teams (Bitscale)

## Summary
Practitioner reference for the re-run-safety / dedupe step (Command Brief ACTION step 5 and CRITICAL DIRECTIVE 3). Establishes the dedupe-before-enrich rule, the conditional write-back ("only overwrite if blank or higher confidence"), enrichment-metadata companion fields, and a re-enrichment cadence. This is the strongest external grounding for making every run idempotent.

## Key quotations / statistics
- Six stages: ICP Definition -> Lead Sourcing -> Waterfall Enrichment -> Data Verification -> CRM Sync & Field Mapping -> Sequencing.
- Dedupe rule: "deduplication first, matching on email and domain before creating any new records."
- Conditional write-back: "only overwrite a field if the existing value is blank or if the enriched value has a higher confidence score."
- Metadata: "Custom fields should capture enrichment metadata (source, timestamp, confidence score)."
- Re-enrichment cadence: triggered (re-enrich any contact inactive 90 days before reactivation); scheduled (quarterly audits flag records older than six months); rationale "Data decays at 22.5% to 30% per year."

## Annotations for weapon-forge
- This is the primary citation for `guides/idempotency-dedupe.md`. The conditional-overwrite rule ("blank OR higher confidence") is the exact mechanism the brief demands: never overwrite a good value with an empty enrichment result.
- The "enrichment metadata: source, timestamp, confidence" recommendation reinforces the provenance directive (CRITICAL DIRECTIVE 5) and supplies the companion-field design (`_source`, `_enriched_at`, `_confidence`).
- Maps onto the brief's open item on idempotency key: dedupe "on email and domain" is the practitioner default; the brief defaults to GHL contact id with a Data-Table-backed "already enriched" gate. Weapon should present both and recommend the GHL-contact-id + Data-Table gate for the Cuantico stack.
- The decay stat (22.5-30%/yr) justifies the scheduled re-run cadence and is corroborated by the Unify/Landbase figures captured in the waterfall and cross-source notes.
