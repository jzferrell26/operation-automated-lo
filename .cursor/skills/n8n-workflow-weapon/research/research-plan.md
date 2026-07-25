# Research Plan: n8n-workflow-weapon

- **Depth tier:** deep
- **Time window:** 2026-06-29 back to 2025-12-29 (6 months default); extend to 12 months (back to 2025-06-29) only where 2026 material is thin on a stable API surface.
- **Page budget target:** deep tier (consume widely; categorize into ~10-15 topic groups). Tooling note: Firecrawl/Exa are NOT connected in this environment; using the WebSearch + WebFetch fallback, so the realistic gathered-source count is dozens of high-authority pages, not thousands of raw crawls.
- **Source breadth target:** official n8n docs (Workflow SDK, REST API, error handling, Data Tables, source control/versioning) as primary authority; n8n community forum + blog; GitHub (n8n-io repos, n8n-mcp); practitioner blogs; production-gotcha write-ups.

## Primary authority anchors
- docs.n8n.io (official) -- REST API, error handling, Data Tables, environments/source control, node reference.
- The n8n MCP server surface actually wired in THIS workspace (tools `get_sdk_reference`, `get_node_types`, `search_nodes`, `validate_workflow`, `create_workflow_from_code`, `update_workflow`, `publish_workflow`, `create_data_table`, etc.) -- the SDK reference is retrievable in-environment and is the most authoritative source for the SDK shape Cuantico uses.
- Cuantico internal prior art (from MEMORY.md): the voyze publish/version model, the REST API PUT allowed-key set, the credential-rebind-after-MCP-update gotcha, the global error handler workflow. These are captured as an internal-prior-art note, not re-researched.

## Initial queries (from session-zero / Command Brief)
1. "n8n Workflow SDK create_workflow_from_code node types 2026"
2. "n8n MCP update_workflow credential binding stripped re-bind 2026"
3. "n8n REST API PUT workflow allowed body settings keys 2026"
4. "n8n publish vs draft version model publish_workflow 2026"
5. "n8n production workflow gotchas error handling retries idempotency 2026"
6. "n8n self-hosted vs cloud workflow versioning best practices 2026"

## Expansion queries (authored by loremaster, deep tier)

### Branch from "Workflow SDK / create_workflow_from_code"
- "n8n MCP server create_workflow_from_code node type names parameters 2026"
- "n8n-mcp github node validation tool 2026"
- "n8n node type identifiers n8n-nodes-base list 2026"

### Branch from "MCP update_workflow credential strip"
- "n8n API credentials not returned GET workflow security 2026"
- "n8n update workflow credentials lost re-attach UI 2026"

### Branch from "REST API PUT allowed keys"
- "n8n public REST API update workflow PUT endpoint reference 2026"
- "n8n API workflow read-only fields id active versionId rejected 2026"
- "n8n activate workflow API endpoint /activate 2026"

### Branch from "publish vs draft version model"
- "n8n workflow versions history version control 2026"
- "n8n workflow active vs inactive draft execution 2026"

### Branch from "production gotchas / error handling / retries / idempotency"
- "n8n error trigger error workflow setup 2026"
- "n8n retryOnFail maxTries waitBetweenTries node settings 2026"
- "n8n idempotency dedupe remove duplicates workflow 2026"
- "n8n dead letter queue failed execution handling 2026"

### Branch from "self-hosted vs cloud versioning"
- "n8n environments source control git 2026"
- "n8n production environment best practices staging 2026"

### Branch (gap fill, authorized by Command Brief)
- "n8n Data Table API operations create add column rows 2026"
- "n8n Data Tables documentation limits 2026"

## Filing convention
- Raw fetched payloads (where saved) -> `.firecrawl/` is the skill's documented convention; since Firecrawl is not used, raw notes are folded directly into the per-source markdown files.
- One source = one file: `<YYYY-MM-DD>-<slug>.md` with YAML frontmatter (source_url, retrieved_on, source_type, authority, relevance, topic, weapon).
- Topic subfolders when a group exceeds ~10 files; otherwise flat with topic tags.
- `index.md` manifest updated after every file write.
- `research-summary.md` written last for the weapon-forge handoff.
