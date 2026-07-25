---
source_url: https://n8n.io/workflows/3229-activate-and-deactivate-workflows-on-schedule-using-native-n8n-api/ (plus docs.n8n.io connect/n8n-api/authentication)
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: draft-vs-publish
weapon: n8n-workflow-weapon
---

# Draft vs publish / active vs inactive: the n8n version model and the activate API

## Summary
Evidence for the Command Brief's #2 Critical Directive ("an MCP update saves a DRAFT, not a live change; call publish_workflow to go live"). In n8n's public REST API, the `active` field is read-only on PUT, and a workflow is taken live via a SEPARATE endpoint. In the public-API vocabulary this activate/deactivate pair IS the "publish/unpublish" operation.

## Key quotations / statistics (verbatim)

> "The `workflow:activate` scope allows you to activate or deactivate a workflow, and this is referred to as 'publish/unpublish' in the public API using the endpoints `/workflows/{id}/activate` and `/workflows/{id}/deactivate`."

> The API key "should be sent in your API call as a header named X-N8N-API-KEY."

Corroborating fact (from the allowed-keys gist): `active` is a read-only field on `PUT /api/v1/workflows/{id}` — "use a separate `activate_workflow`/`deactivate_workflow` endpoint."

## Annotations for weapon-forge
- This nails the version model into concrete API mechanics. The "publish step" the Guardian must never skip = `POST /api/v1/workflows/{id}/activate` (REST) or the MCP `publish_workflow` tool (which the in-environment MCP server exposes). Editing the workflow body and NOT calling activate leaves the running instance on the OLD active version (or inactive), which is exactly the "fixed workflow keeps running the old version" failure mode in the brief.
- Distinguish three states the edit guide must keep straight: (1) the saved workflow definition (what PUT/`update_workflow` changes), (2) the active/inactive flag (what activate/deactivate toggles), and (3) workflow HISTORY versions stored in the instance DB (see `2026-06-29-workflow-history-and-source-control.md`). The MCP `update_workflow` writes (1) as a draft; `publish_workflow` flips (2).
- weapon-forge should encode a "go-live checklist": validate -> update body -> re-bind/verify credentials -> activate/publish -> confirm the active version is the new one (re-GET and compare, since `versionId` changes).
- Confidence: the activate/deactivate endpoint paths and the publish/unpublish framing are official (n8n template + API auth docs); raising relevance to critical because it is one of the brief's two top directives.
