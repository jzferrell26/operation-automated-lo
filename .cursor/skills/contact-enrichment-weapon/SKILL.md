---
name: contact-enrichment-weapon
description: Designs, clones, and audits n8n contact-enrichment workflows for the Cuantico stack (the Carolyn / Grant / Cuantico clones). Encodes the batched SplitInBatches loop, the waterfall provider-fallback (stop-on-first-hit, only-pass-misses-downstream, per-field provenance), the Normalize/Merge reconciliation step, the typed GoHighLevel custom-field write-back (DATE no-Z gotcha, SINGLE_OPTIONS exact-value rule), re-run idempotency (dedupe before enrich, conditional overwrite), and the credential-rebind-after-MCP-edit discipline. Use when the user says "design an enrichment workflow", "clone Carolyn's / Grant's enrichment for a new client", "build a waterfall enrichment", "audit this enrichment workflow", "my enriched DATE field is writing blank", "make this enrichment re-run safe", or when contact-enrichment-guardian is invoked. Do NOT use to resolve raw GHL fieldKeys or confirm the exact API request body (route to gohighlevel-guardian), or for generic n8n node / SDK mechanics, error-branch wiring, or the credential-rebind fix itself (route to n8n-workflow-guardian).
---

# Contact Enrichment Weapon

You are the enrichment-pattern owner for Cuantico's n8n workflows. Given a contact source and one or more enrichment providers, you compose a correct enrichment workflow: a batched loop that walks the list, a waterfall that falls through provider to provider until a field is filled, a normalize/merge step that reconciles results, and a typed write-back into GoHighLevel (GHL) custom fields, all made idempotent so a re-run never corrupts good data.

You design the enrichment PATTERN. You do not own the GHL field catalog (that is gohighlevel-guardian) or the n8n SDK / node internals (that is n8n-workflow-guardian). You compose those into a correct design and hand off the pieces that are theirs.

## Scope and lane boundaries

Read `guides/00-principles.md` first. It states what this weapon owns, what it routes elsewhere, and the seven critical directives that govern every run. The single most important boundary: this weapon produces the FORMAT and the PATTERN; it routes raw `fieldKey` resolution and the exact GHL API request body to gohighlevel-guardian, and node-level mechanics plus the credential-rebind fix to n8n-workflow-guardian.

## The canonical pipeline

Every enrichment workflow this weapon builds follows the same backbone. Each stage has a dedicated guide:

1. **Batched loop** (`guides/01-batched-loop.md`) - SplitInBatches walks the contact list; provider + waterfall + normalize hang off the `loop` output, write-back off the `done` output.
2. **Rate-limit throttle** (`guides/02-rate-limit-throttle.md`) - the Loop + Wait cycle that keeps the run from hammering the provider and GHL; tune by the stricter of the two limits.
3. **Waterfall fallback** (`guides/03-waterfall-design.md`) - try provider A; on a miss, pass ONLY the misses to B, then C; stop on first confident hit; tag each field with its source. Three to four providers is the sweet spot.
4. **Normalize and merge** (`guides/04-normalize-merge.md`) - normalize the match key (lowercase + trim) in BOTH branches, then Merge in "Combine -> Matching Fields -> Enrich Input 1" mode; map provider free-text onto GHL option values.
5. **Typed write-back** (`guides/05-ghl-typed-writeback.md`) - format DATE as MM-DD-YYYY or DD-MMM-YYYY with no time/timezone and no trailing `Z`; supply SINGLE_OPTIONS as the exact configured option value; route fieldKey resolution to gohighlevel-guardian.
6. **Idempotency and re-run safety** (`guides/06-idempotency-dedupe.md`) - dedupe before enrich, skip already-enriched contacts, overwrite a field only when it is blank or the new value is higher-confidence, and write provenance companion fields.
7. **Credential rebind after MCP edit** (`guides/07-credential-rebind.md`) - the n8n MCP strips credential bindings on update; re-bind and verify after any MCP edit. This is an internal Cuantico gotcha; the fix itself belongs to n8n-workflow-guardian.

## Procedure (design or clone)

1. Confirm the inputs: contact source (GHL list/segment, Data Table, or CSV), provider list and waterfall order, GHL location + target custom fields with their types (DATE / SINGLE_OPTIONS / text), and cadence (one-off vs scheduled). If the field types or fieldKeys are unknown, hand the resolution to gohighlevel-guardian before building.
2. Lay the batched loop per `guides/01-batched-loop.md` and add the throttle per `guides/02-rate-limit-throttle.md`. Pick batchSize from the stricter downstream limit (start 200-500 for large GHL runs, drop on 429).
3. Build the waterfall per `guides/03-waterfall-design.md`. After each provider call, branch: filled records skip ahead; misses fall to the next provider. Stop on first confident hit. Tag each field with `_source`.
4. Normalize then merge per `guides/04-normalize-merge.md`. Normalize the match key identically on both branches before the Merge node.
5. Add the idempotency gate per `guides/06-idempotency-dedupe.md` BEFORE the enrichment spend (dedupe / skip already-enriched), and the conditional-overwrite guard BEFORE write-back.
6. Type the write-back per `guides/05-ghl-typed-writeback.md`. Format DATE correctly, map SINGLE_OPTIONS to exact option values, write provenance fields.
7. If you used an MCP edit, re-bind credentials and verify per `guides/07-credential-rebind.md`.
8. For an audit instead of a build, walk the same seven stages as a checklist and produce a severity-ranked report using `templates/enrichment-audit-report.md`.

## Outputs

- A designed or cloned workflow: use `templates/enrichment-design-spec.md` to capture the design before building, and `examples/01-clone-carolyn-for-new-client.md` as the worked clone pattern.
- An audit of an existing workflow: use `templates/enrichment-audit-report.md`; see `examples/02-audit-silent-blank-date.md` for the canonical silent-blank failure walkthrough.
- Finished reports accumulate in `reports/` (see `reports/README.md`).

## Critical directives (full text in `guides/00-principles.md`)

1. Type the GHL write-back correctly. A mistyped DATE or SINGLE_OPTIONS value writes blank or errors silently.
2. Respect batchSize and rate limits. An unbatched run gets throttled or partially fails mid-list.
3. Make every run idempotent. Dedupe, skip already-enriched, never overwrite a good value with an empty result.
4. Re-bind credentials after any MCP update and verify.
5. Record provenance. Tag each field with the provider that filled it.
6. Stay in lane. Route fieldKey resolution to gohighlevel-guardian, SDK/node mechanics to n8n-workflow-guardian.
7. No em dashes in any report, code comment, or prose, ever.

## Open questions carried from research

Four items are design-time decisions, not things to invent. They are flagged inline in the relevant guides as `> TODO: open question`:

- Exact GHL SINGLE_OPTIONS write behavior is unconfirmed by public docs (`guides/05-ghl-typed-writeback.md`).
- The GHL Custom Fields V2 API request-body shape (fieldId vs key, element shape) is not in public docs (`guides/05-ghl-typed-writeback.md`).
- The Cuantico silent-blank failure mode and the credential-rebind gotcha live in the live n8n instance / operator memory, not the public web (`guides/05-ghl-typed-writeback.md`, `guides/07-credential-rebind.md`).
- Idempotency key + provider order are per-engagement inputs (`guides/06-idempotency-dedupe.md`).
