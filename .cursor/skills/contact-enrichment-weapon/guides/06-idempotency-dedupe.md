# 06 - Idempotency and Re-Run Safety

Covers Command Brief ACTION step 5 and CRITICAL DIRECTIVE 3. Grounded in `research/2026-06-29-idempotency-dedupe-bitscale.md` (practitioner) and corroborated by `research/2026-06-29-enrichment-cross-source-synthesis.md`.

## Why this matters

Re-runs are normal. Workflows get re-triggered, schedules fire quarterly, and operators re-run a failed batch. A non-idempotent run double-enriches, burns provider credits, and (worst) overwrites a good value with an empty enrichment result, corrupting the very data it was meant to fill. Every run this weapon designs must be safe to run twice.

## Three gates

### 1. Dedupe BEFORE enrich

Deduplicate first, before any provider spend or record creation. The practitioner rule: "deduplication first, matching on email and domain before creating any new records." Dedupe-before-enrich also "saves credits" because you do not pay to enrich the same record twice.

In the Cuantico stack, also skip contacts already marked enriched (the "already enriched" gate) so a re-run does not re-process them.

### 2. Conditional overwrite (the no-empty-overwrite rule)

Before write-back, guard each field: "only overwrite a field if the existing value is blank OR if the enriched value has a higher confidence score." Concretely, an IF node before the GHL write-back:

- If the GHL field is currently blank -> write the enriched value.
- Else if the new value's `_confidence` (from `guides/03-waterfall-design.md`) is higher than the stored confidence -> overwrite.
- Else -> skip the write (keep the good existing value).

This is the exact mechanism the brief demands: never overwrite a good value with an empty enrichment result.

### 3. Provenance / metadata companion fields

Write enrichment metadata alongside each value: "source, timestamp, confidence score." These are the `_source`, `_enriched_at`, `_confidence` companion fields from `guides/03-waterfall-design.md`. They power the conditional-overwrite comparison and let you trace a wrong value back to its provider (CRITICAL DIRECTIVE 5). Remember `_enriched_at`, if stored in a GHL DATE field, must follow the DATE format rule in `guides/05-ghl-typed-writeback.md`.

## Choosing the idempotency key

> TODO: open question - needs human decision before next refresh. The idempotency / dedupe key is a per-workflow design input. Practitioner sources default to email + domain. The Command Brief defaults to the GHL contact id plus a Data-Table-backed "already enriched" gate. For the Cuantico stack, recommend the GHL-contact-id + Data-Table gate; confirm per engagement. Whatever key is chosen becomes the Merge match field and MUST be normalized identically on both branches (`guides/04-normalize-merge.md`).

## Re-enrichment cadence (scheduled runs)

Data decays roughly 22.5% to 30% per year (about 2.1% per month), corroborated across Unify / Landbase / Bitscale / SyncGTM. Two cadences:

- **Triggered**: re-enrich a contact inactive 90 days before reactivation.
- **Scheduled**: a quarterly audit flags records older than six months for re-enrichment.

The decay stat justifies scheduling re-runs at all, and the idempotency gates above are what make those scheduled re-runs safe.

## Worked example

`examples/01-clone-carolyn-for-new-client.md` adds the dedupe gate before the loop and the conditional-overwrite IF before write-back.
