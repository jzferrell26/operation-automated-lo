---
source_url: https://github.com/czlonkowski/n8n-mcp + https://generect.com/blog/n8n-mcp/
retrieved_on: 2026-06-29
source_type: github-readme
authority: practitioner
relevance: high
topic: mcp-server
weapon: n8n-workflow-weapon
---

# n8n MCP servers: instance-native MCP (April 2026) + czlonkowski/n8n-mcp tools and validation

## Summary
Maps the MCP surface the Guardian operates. Two relevant flavors exist: (1) the INSTANCE-NATIVE MCP server n8n shipped in April 2026 (built into n8n; create/validate/test/publish from a plain-English prompt — this is the surface whose tools are wired into this very workspace: `get_sdk_reference`, `get_node_types`, `search_nodes`, `validate_workflow`, `create_workflow_from_code`, `update_workflow`, `publish_workflow`, the Data Table tools, etc.), and (2) the community `czlonkowski/n8n-mcp` (the dominant external MCP, node-documentation-rich, diff-based workflow updates).

## Key quotations / statistics (verbatim)

Instance-native MCP (verbatim):
> "In April 2026, n8n shipped an instance-level MCP server built directly into n8n that gives your AI client ... the ability to create, validate, test, and publish entire workflows from a plain-English prompt."

czlonkowski/n8n-mcp coverage (verbatim): access to n8n's "2,063 workflow automation nodes (816 core + 1,247 community)"; "structured access to node documentation (87% coverage from official n8n docs), 265 AI-capable tool variants ... 156 ranked configurations extracted from popular templates."

czlonkowski workflow tools (verbatim exact names):
- `n8n_create_workflow` — deploy new workflows with nodes and connections
- `n8n_update_partial_workflow` — diff-based updates using an operations array
- `n8n_validate_workflow` — complete validation including AI Agent checks
- `n8n_autofix_workflow` — automatically fix common errors
- `n8n_test_workflow` — execute/trigger workflows
- node tools: `search_nodes`, `get_node` (modes minimal/standard/full/docs/search_properties/versions), `validate_node` (mode minimal|full)
- credentials: `n8n_manage_credentials` (list/get/create/update/delete/schema)

Validation progression (verbatim):
> "`validate_node({mode: 'minimal'})` -> `validate_node({mode: 'full', profile: 'runtime'})` -> `validate_workflow(workflow)` before deployment." Includes "minimum viable workflow validation that prevents single-node workflows and catches multi-node workflows with no connections."

Connection-syntax gotcha (verbatim): "The `addConnection` operation requires four separate string parameters." IF nodes "have two outputs (TRUE and FALSE). Use the `branch` parameter" — omitting it may route both connections to the same output.

Read-only deployment (verbatim): write operations can be disabled via `DISABLED_TOOLS` / `DISABLED_TOOL_OPERATIONS` env vars plus a read-only API key.

## Annotations for weapon-forge
- This clarifies which MCP the Guardian is actually driving: the IN-ENVIRONMENT tool names (`create_workflow_from_code`, `get_node_types`, `validate_workflow`, `update_workflow`, `publish_workflow`, `create_data_table`, etc.) are the instance-native MCP, NOT czlonkowski's `n8n_*`-prefixed tools. weapon-forge should write the guides against the in-environment tool names (which match the brief), and mention czlonkowski/n8n-mcp only as an alternative surface.
- The validate-before-deploy progression is the audit/build backbone: minimal node check -> full node check -> whole-workflow validate -> create/publish. Bakes Critical Directive #4 ("always validate") into a concrete sequence.
- The `n8n_update_partial_workflow` diff approach is the same tool that issue #19587 reports as broken/deprecated for some operations — reinforces the "prefer clean REST PUT or Clone-and-Create" stance in the edit guide.
- Authority "practitioner" because the GitHub READMEs/blogs are community-maintained; the April-2026 instance-native MCP claim is corroborated by the live tools present in this workspace, which is itself primary evidence.
