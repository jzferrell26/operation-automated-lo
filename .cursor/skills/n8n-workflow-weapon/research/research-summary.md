# Research Summary: n8n-workflow-weapon

Authored by loremaster (Phase 1.5) for weapon-forge (Phase 2).

## Run parameters
- **Depth tier consumed:** deep.
- **Time window:** 2026-06-29 back ~6 months (Q1-Q2 2026 content); no source older than 12 months. The most recent dated practitioner source is 2026-03-28 (Data Tables); the security CVE cluster is Jan-Mar 2026; the instance-native MCP is April 2026.
- **Tooling used:** WebSearch + WebFetch fallback (Firecrawl and Exa are NOT connected in this environment), supplemented by the in-environment n8n MCP `get_sdk_reference` tool, which provided the single most authoritative source (the actual SDK reference the Cuantico instances use).
- **Files written:** 13 source files + index.md + research-plan.md + this summary, all in `ai-tools/skills/n8n-workflow-weapon/research/`.
  - rest-api-put: 3 files (allowed keys, endpoints, issue-19587)
  - workflow-sdk: 1; mcp-server: 1; credential-binding: 1; draft-vs-publish: 1; error-handling: 1; idempotency: 1; data-tables: 1; versioning: 1; security: 1; cuantico-prior-art: 1.

## The 5 most influential sources (with why)
1. **`2026-06-29-workflow-sdk-reference-in-environment.md`** (critical) — the verbatim SDK reference pulled from the live n8n MCP server. It is THE build-guide source: builder API, control-flow primitives, the `newCredential()` rule, and the item-multiplication / `alwaysOutputData` / 0-based-index / IF-Switch-conditions footguns. weapon-forge should derive the entire "build a workflow" guide and most of the audit checklist from this file rather than from training data.
2. **`2026-06-29-rest-api-update-workflow-allowed-keys.md`** (critical) — the exact allowed PUT body keys (`name`, `nodes`, `connections`, `settings`), the read-only fields to strip, and the verbatim "must NOT have additional properties" error. Directly answers Critical Directive #3 and is the spine of the safe-edit guide. Pair with issue-19587 (nested `settings` also rejects extras).
3. **`2026-06-29-mcp-update-credentials-stripped-and-blocked.md`** (critical) — evidence for the #1 directive: the API never returns credentials and an MCP round-trip drops bindings silently. Drives the mandatory "re-bind + verify after every MCP edit" step.
4. **`2026-06-29-activate-deactivate-publish-version-model.md`** (critical) — turns the abstract draft-vs-publish directive into concrete mechanics: `active` is read-only on PUT; going live is `/workflows/{id}/activate` (REST) or `publish_workflow` (MCP); the public API literally calls this "publish/unpublish."
5. **`2026-06-29-cuantico-internal-prior-art.md`** (critical) — the instance-specific ground truth (voyze publish model, cred-rebind step, the Global Error Handler `UlyC_ijANFkbvoYZzA6Kj`, the allowed-key set as Cuantico runs it). The tiebreaker whenever a public source and Cuantico reality diverge.

## Open questions that survived the research (for the OPERATOR, not weapon-forge to invent)
1. **`staticData` on PUT:** the Command Brief / Cuantico prior art lists `staticData` as an allowed PUT key, but the public gist lists it as a field to STRIP. Likely version-dependent. The operator (or a live test against each instance's Swagger UI at `.../api/v1/docs`) should confirm the true allowed-key set for the Cuantico main and voyze instances.
2. **Exact MCP credential-strip behavior by tool/version:** whether the IN-ENVIRONMENT instance-native MCP `update_workflow` strips credentials identically to the older community behavior is asserted from prior art, not freshly verified on 2026 builds. Recommend one controlled test (edit a throwaway workflow, check binding) per instance.
3. **Data Table JSON column type + `/datatables` API shape:** one practitioner source lists a JSON column type and a `/datatables` endpoint; the official node UI lists only Boolean/Date/Number/String. Verify per instance before building against a JSON column or the raw Data Tables API.
4. **Workflow-history (undo) availability:** community self-hosted has NO built-in workflow version history/undo; cloud and paid self-hosted do. Confirm whether the Cuantico main and voyze instances are on a plan that enables it. If not, export-before-edit is mandatory.

## Sources weapon-forge should re-fetch with deeper context (if building those guides)
- The official `docs.n8n.io` API reference and Data Tables pages 404'd the WebFetch tool on trailing-slash URLs; the content was recovered via DeepWiki/Mintlify mirrors and search snippets. If weapon-forge wants the exact OpenAPI schema (every settings key, the `/datatables` body), fetch each target instance's live Swagger UI at `N8N_HOST/api/v1/docs` — that is the version-accurate contract and beats any blog.
- czlonkowski/n8n-mcp README for the full `n8n_*` tool catalog IF the guides need to cover that external MCP; the in-environment guides should be written against the instance-native tool names (`create_workflow_from_code`, `update_workflow`, `publish_workflow`, `create_data_table`, etc.) that match the brief.

## Scope reminder for weapon-forge
Do NOT author a security catalog (route to security-guardian), the enrichment-loop DESIGN (contact-enrichment-guardian), GHL field semantics (gohighlevel-guardian), or live-event RUN ops (live-event-ops-guardian). This Guardian owns build/audit/safe-edit MECHANICS, the error-handling MECHANICS (not severity-routing policy), and the Data Table surface.
