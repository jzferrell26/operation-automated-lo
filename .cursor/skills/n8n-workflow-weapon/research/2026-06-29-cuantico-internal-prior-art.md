---
source_url: Cuantico internal (MEMORY.md references; verified prior art, not web-researched)
retrieved_on: 2026-06-29
source_type: internal-prior-art
authority: official
relevance: critical
topic: cuantico-prior-art
weapon: n8n-workflow-weapon
---

# Cuantico internal prior art (authoritative, instance-specific)

## Summary
The Command Brief names Cuantico-specific prior art as authoritative reference material. This file captures it as a single internal-prior-art note so weapon-forge has it alongside the web sources. It is NOT web-researched; it is verified institutional knowledge from the operator's memory and the existing Cursor-skills repo. Where it conflicts with a public source, this prior art reflects what is true for the Cuantico/voyze instances specifically.

## Key facts (from Cuantico memory / prior art)

Instances in scope:
- Cuantico main n8n instance.
- voyze.ai n8n instance (`n8n.voyze.ai`). Known workflow IDs include Alex FUB<->GHL sync, Lofty->GHL Sync `y2YAfuNh4wsTxhFj`, Live Event Intake `kilYxgLgaoiaIMLA`, and the Global Error Handler `UlyC_ijANFkbvoYZzA6Kj`.

Publish/version model (voyze, verified): an MCP `update_workflow` SAVES A DRAFT; you must `publish_workflow` to go live. This matches the public-API activate/deactivate ("publish/unpublish") model.

Credential-rebind step (verified, Carolyn / Grant / voyze enrichment clones): after an MCP `update_workflow`, credential bindings are lost/stripped and must be re-attached (UI paste preferred, or a REST update that carries the reference) and VERIFIED before the workflow is trusted. `get_workflow_details` does not return node credentials, so binding cannot be audited from MCP output alone.

REST API PUT (verified): REST PUT preserves node credentials (unlike a naive MCP update). The allowed body keys are name / nodes / connections / settings / staticData; read-only/system fields are rejected. (Note the public-source nuance: some n8n versions reject `staticData` and nested `settings` extras — verify per instance.)

n8n MCP edit discipline (verified): prefer UI pastes for credential-sensitive edits; warn before an MCP push; after `update_workflow`, re-bind credentials. `get_workflow_details` strips credential bindings so you cannot audit cred attachment from it — check the UI or REST.

n8n REST API PUT gotchas (verified): allowed body/settings keys are constrained; REST preserves node credentials (unlike MCP). MCP update saves a draft; must `publish_workflow` to go live.

Global error handler pattern (voyze `UlyC_ijANFkbvoYZzA6Kj`, verified): Error Trigger -> severity routing (support-tickets / n8n-error-run / log-only), `@here`-suppressed -> tag users; a documented safe MCP-edit pattern. The Guardian owns the MECHANICS; the severity-routing POLICY is per-client.

Live Event Intake gotcha (voyze `kilYxgLgaoiaIMLA`, verified): slot field keys; lead-import tagging; a dormant-email safeguard and a form-placeholder mis-route gotcha.

Contact-enrichment prior art (Carolyn / Grant / Cuantico clones): batched-loop enrichment (SplitInBatches), waterfall provider fallback, GHL custom-field write-back typing (DATE and SINGLE_OPTIONS field gotchas), batchSize / Normalize node discipline, cred-rebind after MCP update. (This Guardian owns the SDK/MCP mechanics; the enrichment-loop DESIGN routes to contact-enrichment-guardian, GHL field semantics to gohighlevel-guardian.)

## Annotations for weapon-forge
- Treat this as the highest-trust source for INSTANCE behavior. When a public source and this prior art disagree (e.g. whether REST preserves credentials, whether `staticData` is allowed), the guides should state the public-source nuance but default to the Cuantico-verified behavior and tell the Guardian to verify against the target instance's Swagger UI.
- The voyze Global Error Handler is the concrete worked example for the error-handling guide; the Live Event Intake and enrichment clones are the worked examples for build/edit guides. weapon-forge can reference these IDs as "the canonical Cuantico instances of each pattern" without re-deriving them.
- The routing boundaries are load-bearing: build/edit/audit MECHANICS = this Guardian; enrichment loop DESIGN = contact-enrichment-guardian; GHL field/contact semantics = gohighlevel-guardian; live-event RUN ops = live-event-ops-guardian. Encode these as the "do not cross" lines in SKILL.md.
