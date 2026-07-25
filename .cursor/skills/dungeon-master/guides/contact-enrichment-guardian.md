# Routing guide: `contact-enrichment-guardian`

**Guardian:** [`ai-tools/agents/contact-enrichment-guardian.md`](../../agents/contact-enrichment-guardian.md)
**Weapon:** [`ai-tools/skills/contact-enrichment-weapon/`](../../skills/contact-enrichment-weapon/)
**Command Brief:** [`ai-tools/command-briefs/contact-enrichment-guardian-command-brief.md`](../../../command-briefs/contact-enrichment-guardian-command-brief.md)
**Trigger policy:** on-demand

## Domain
Design-and-build specialist for Cuantico's contact-enrichment workflows on n8n (the Carolyn / Grant /
Cuantico clones). It owns the enrichment PATTERN end to end: the batched SplitInBatches loop over the
contact list, the rate-limit throttle (Loop + Wait), the waterfall provider-fallback that tries
provider A then passes only the misses to B then C and stops on the first confident hit while tagging
each field with its `_source`, the Normalize/Merge step that reconciles provider field names onto the
canonical record, the typed GoHighLevel custom-field write-back (DATE with no trailing `Z`,
SINGLE_OPTIONS as the exact configured option value), re-run idempotency (dedupe before the enrichment
spend, never overwrite a good value with an empty result), and the credential-rebind-after-MCP-edit
discipline. It builds and edits enrichment workflows so it mutates live workflow state. It owns the
enrichment design, not the GHL field catalog or the SDK internals.

## Trigger phrases (route here)
- "design an enrichment workflow", "build a waterfall enrichment"
- "clone Carolyn's enrichment for a new client", "clone Grant's enrichment"
- "audit this enrichment workflow", "make this enrichment re-run safe"
- "my enriched DATE field is writing blank", "the enriched field came back empty"
- When an operator or a peer Guardian hands off an enrichment design or audit.
- Or when the request implicitly involves the batched-loop / waterfall / typed-write-back enrichment
  pattern on the Cuantico (or voyze.ai) n8n instance.

## Do NOT route here
- Raw GHL `fieldKey` resolution, the exact Custom Fields API request-body shape, or a ruling on
  SINGLE_OPTIONS write semantics -> `gohighlevel-guardian`. This Guardian consumes the resolved field,
  it does not own the GHL field catalog.
- Generic n8n node / SDK mechanics, error-branch wiring, the draft-vs-publish version model, or the
  credential-rebind OPERATION itself -> `n8n-workflow-guardian`. This Guardian composes those pieces
  into the enrichment pattern; it does not own the SDK internals.
- A security CVE catalog or vulnerability audit -> `security-guardian`.

If a request straddles two domains, prefer the narrower-scoped Guardian and let this one act as the
enrichment-pattern backup.

## Inputs the Guardian needs
Before invoking, ensure the user has provided (or you can infer):
- The contact source: a GHL list/segment, an n8n Data Table, or a CSV.
- The enrichment provider(s) and their waterfall order (provider-agnostic; named per run).
- The GHL location plus the target custom fields with their TYPES (DATE / SINGLE_OPTIONS / text).
- The run cadence: one-off vs scheduled.
- For an audit or clone: the existing enrichment workflow to audit, or the source clone (Carolyn's /
  Grant's) to copy for the new client.

If the target field types or `fieldKey`s are unknown, do not start building. That resolution is a
known boundary (Critical Directive: stay in lane); hand it to `gohighlevel-guardian` first.

## Outputs the Guardian produces
- A designed or cloned n8n enrichment workflow: batched loop + rate-limit throttle + waterfall +
  Normalize/Merge + typed write-back + dedupe gate. The workflow lives in the n8n instance.
- For a design or clone, a design spec captured first via the weapon's
  `templates/enrichment-design-spec.md`.
- For an audit, a severity-ranked findings report via the weapon's
  `templates/enrichment-audit-report.md`, returned to the caller.
- Per-field `_source` provenance tags written alongside the enriched values.
- Past design and audit reports accumulate in the weapon's `reports/`.

## Multi-Guardian sequences this Guardian participates in
- Operator hand-off -> `contact-enrichment-guardian`: an operator or peer Guardian requests an
  enrichment design, clone, or audit, which this Guardian executes (batched loop -> throttle ->
  waterfall -> normalize -> idempotency -> typed write-back -> rebind-if-MCP-edited).
- `contact-enrichment-guardian` -> `gohighlevel-guardian`: when the design needs a raw `fieldKey`,
  the Custom Fields API request body, or a SINGLE_OPTIONS write-behavior ruling, hand that piece off
  there, then compose the answer back into the enrichment pattern.
- `contact-enrichment-guardian` -> `n8n-workflow-guardian`: for node / SDK mechanics, error-branch
  wiring, the version model, or the credential-rebind operation itself. This is the design / build
  counterpart pairing: this Guardian owns the enrichment pattern, `n8n-workflow-guardian` owns the
  SDK mechanics it composes.

## Critical directives the orchestrator should respect
- Type the GHL write-back correctly: DATE fields use the GHL date format with no trailing `Z` and no
  time/timezone, and SINGLE_OPTIONS must be exactly one of the field's configured option values. A
  mistyped value writes blank or errors, and the failure is silent.
- Respect batchSize and rate limits: batch the run and throttle to the stricter of the provider and
  GHL limits. An unbatched run hammers both and fails mid-list.
- Make every run idempotent: dedupe and skip already-enriched contacts, and never overwrite a good
  value with an empty enrichment result. Re-runs are normal; a non-idempotent run corrupts the data
  it was meant to enrich.
- Re-bind credentials after any MCP update and verify. The n8n MCP strips credential bindings on
  update, silently breaking the next run.
- Record provenance: tag each field with the provider that filled it, so a wrong value is traceable
  to the provider to distrust.
- Stay in lane: route raw `fieldKey` resolution and the GHL API request body to
  `gohighlevel-guardian`, and SDK / node mechanics plus the credential-rebind operation to
  `n8n-workflow-guardian`.
- No em dashes in any report, code comment, or prose, ever.

(Full list lives in the Guardian file's `## Critical directives` section.)

## Paired Weapon
`ai-tools/skills/contact-enrichment-weapon/` (read `SKILL.md` first, then `guides/00-principles.md`
for the scope boundary and the seven critical directives before any design, clone, or audit action).

---

*Part of Dungeon Master's roster. See [`SKILL.md`](../SKILL.md) for the full Guild.*
