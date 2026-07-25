# 00 - Principles and Scope

This guide states what contact-enrichment-weapon owns, what it routes elsewhere, and the seven critical directives that govern every run. Read it before any design or audit.

## What this weapon owns

The enrichment WORKFLOW DESIGN, end to end:

- The batched loop that walks a contact list (`guides/01-batched-loop.md`).
- The rate-limit throttle that protects the provider and GHL (`guides/02-rate-limit-throttle.md`).
- The waterfall provider-fallback and its provenance tagging (`guides/03-waterfall-design.md`).
- The normalize/merge reconciliation before write-back (`guides/04-normalize-merge.md`).
- The typed GHL custom-field write-back format (`guides/05-ghl-typed-writeback.md`).
- The idempotency / re-run-safety gates (`guides/06-idempotency-dedupe.md`).
- The post-MCP-edit credential-rebind discipline as a checklist item (`guides/07-credential-rebind.md`).

It is the enrichment-pattern owner across the Carolyn / Grant / Cuantico clones.

## What this weapon routes elsewhere

- **Raw GHL `fieldKey` resolution and the exact API request-body JSON** go to **gohighlevel-guardian**. This weapon produces the correct FORMAT (a date string in MM-DD-YYYY, an exact SINGLE_OPTIONS value); the field catalog and the endpoint body shape are the GHL Guardian's lane. Grounded in `research/2026-06-29-ghl-date-field-format.md` and `research/2026-06-29-ghl-custom-fields-types.md`, both of which note the lane boundary.
- **n8n node/SDK mechanics, error-branch wiring, retry/backoff, and the credential-rebind fix itself** go to **n8n-workflow-guardian**. This weapon composes node behavior at the design level; the SDK internals and the actual re-bind operation are that Guardian's lane. Grounded in `research/2026-06-29-n8n-splitinbatches-node.md` and `research/2026-06-29-n8n-rate-limits-wait-pattern.md`.

When a question crosses a boundary, name the receiving Guardian explicitly and hand off the specific sub-question rather than guessing.

## The seven critical directives

These come from the Command Brief's SUBAGENT CRITICAL DIRECTIVES. Every design and audit must honor them.

1. **Type the GHL write-back correctly.** DATE fields use the GHL date format (MM-DD-YYYY or DD-MMM-YYYY, no time/timezone, no `Z` suffix). SINGLE_OPTIONS must be exactly one of the field's configured option values. Why: a mistyped value writes blank or errors, and the failure is silent until someone notices the field is empty. See `guides/05-ghl-typed-writeback.md`.
2. **Respect batchSize and rate limits.** Why: an unbatched run hammers the provider and GHL and gets throttled or partially fails mid-list. See `guides/01-batched-loop.md` and `guides/02-rate-limit-throttle.md`.
3. **Make every run idempotent.** Dedupe and skip already-enriched contacts; never overwrite a good value with an empty enrichment result. Why: re-runs are normal; a non-idempotent run corrupts the very data it was meant to enrich. See `guides/06-idempotency-dedupe.md`.
4. **Re-bind credentials after any MCP update and verify.** Why: the n8n MCP strips credential bindings on update, silently breaking the next run. See `guides/07-credential-rebind.md`.
5. **Record provenance.** Capture which provider filled each field. Why: when a value is wrong, you need to know which provider to distrust. See `guides/03-waterfall-design.md`.
6. **Stay in lane.** Route raw fieldKey resolution to gohighlevel-guardian and workflow-SDK / node mechanics to n8n-workflow-guardian. Why: this Guardian owns the enrichment pattern, not the GHL field catalog or the SDK internals.
7. **No em dashes in any report, code comment, or prose, ever.** Use a comma, colon, parentheses, period, or semicolon instead.

## Worked examples that put these principles into practice

- `examples/01-clone-carolyn-for-new-client.md` - the happy-path clone that applies all seven directives.
- `examples/02-audit-silent-blank-date.md` - the edge case where directive 1 was violated and a DATE field silently wrote blank.
