# 07 - Credential Rebind After MCP Edit

Covers Command Brief ACTION step 6 and CRITICAL DIRECTIVE 4. This is an internal Cuantico operational gotcha, not a topic with public 2026 literature. Per `research/research-summary.md`, no external source addresses it; it is documented in the user's operator memory (`reference_n8n_mcp_strips_credentials`) and owned by n8n-workflow-guardian.

## The gotcha

When you edit an n8n workflow through the n8n MCP server, the update STRIPS the credential bindings from the affected nodes. The workflow looks fine in the editor, but the next run fails because the provider call or the GHL call has no credential attached. The failure is silent at edit time and only surfaces on the next execution.

## The rule

After ANY MCP-based edit to an enrichment workflow:

1. Re-bind the credentials on every node the MCP update touched (provider API credential, GHL credential, any Data-Table credential).
2. Verify the binding before declaring the workflow ready. Do not assume the edit preserved them.

A useful corollary: `get_workflow_details` from the MCP also omits node credentials, so you cannot confirm a binding from MCP output alone. Verify via the n8n UI or the REST API.

## Lane boundary

This weapon flags the rebind as a mandatory checklist step after any MCP edit. The actual re-bind operation and the deeper MCP-vs-REST-vs-SDK credential mechanics belong to **n8n-workflow-guardian** per the Command Brief. Hand off the fix; own the discipline of remembering to do it.

> TODO: open question - needs human decision before next refresh. The exact credential-rebind procedure and the current MCP strip behavior live in the live n8n instance and operator memory (`reference_n8n_mcp_strips_credentials`, the Grant / Carolyn / Cuantico clones), not on the public web. Pull the current procedure from n8n-workflow-guardian or the live instance when executing a real edit. This guide encodes the discipline; the operation is n8n-workflow-guardian's lane.

## When this applies

Only when an edit went through the MCP server. A purely UI-driven edit does not strip bindings. Prefer UI pastes for credential-bearing changes when practical, and always treat an MCP update as having stripped bindings until verified otherwise.

## Worked example

`examples/02-audit-silent-blank-date.md` includes the post-edit rebind verification as the final audit step after the DATE fix is applied via MCP.
