---
source_url: https://community.n8n.io/t/credentials-unavailable-for-workflows-created-via-n8ns-api/183099 (plus corroborating docs/deepwiki search synthesis)
retrieved_on: 2026-06-29
source_type: community
authority: official
relevance: critical
topic: credential-binding
weapon: n8n-workflow-weapon
---

# Credentials and the n8n API: GET omits them, create/update doesn't bind them

## Summary
Synthesis of the n8n security model around credentials in the API surface, gathered from the community thread on "credentials unavailable for workflows created via n8n's API," the DeepWiki "Workflows and Credentials API" page, and the official credentials docs. This is the evidence base for the Command Brief's #1 Critical Directive: the MCP `update_workflow` strips credential bindings and `get_workflow_details` omits node credentials, so you cannot audit binding from the API alone.

## Key quotations / facts (verbatim)

n8n intentionally blocks credential read via the public API:
> "n8n intentionally blocks LIST and GET operations for credentials via REST API to prevent credential exposure." "Credentials in n8n Database are encrypted with AES-256, the REST API blocks List/Get operations, and only n8n UI can view credentials."

The node stores only a REFERENCE, not the secret:
> "once credentials are saved, you can select them from a dropdown list within the node, where the node only stores a reference to the credential, not the secret itself, making your workflows safe to share and export."

Consequence for API-created/updated workflows (community thread): workflows created or modified via the API arrive with their credential references missing/unbound, so they must be re-attached in the UI (or via a credential-bearing payload) before the workflow can run.

## Annotations for weapon-forge
- This source backs the highest-severity directive. The mechanics: (1) a GET/`get_workflow_details` does not return node credential bindings, so an audit of "is this node bound?" cannot be done from API output — it must be done in the UI or by attempting a test execution; (2) an MCP `update_workflow` that round-trips a workflow without the binding will leave nodes unbound, silently breaking a live workflow with NO error at edit time.
- The safe-edit guide must therefore mandate: after ANY MCP-based change, re-bind credentials (UI paste or a REST update that carries the credential reference) and VERIFY the binding (test execution or UI check) before declaring done. This is the credential-rebind step in Cuantico prior art (Carolyn/Grant/voyze workflows).
- Pairs with the SDK `newCredential()` rule: on a from-scratch build, `newCredential('Name')` creates the reference; on an edit, the existing reference must be preserved, which is exactly why REST PUT (preserves the bound reference if you echo back the node's credential block) is safer than a naive MCP round-trip that drops it.
- Open question for the operator (flag in summary): the precise behavior differs by n8n version and by which MCP tool is used (instance-native MCP vs czlonkowski n8n-mcp vs raw REST). The Guardian should treat "credentials survived the edit" as something to VERIFY every time, never assume.
