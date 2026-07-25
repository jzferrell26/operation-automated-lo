---
source_url: https://docs.zernio.com/mcp
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: zernio-mcp
weapon: social-publishing-weapon
---

# Zernio MCP server: tools, auth, and the DEFAULT-SCHEDULED footgun

## Summary
The Zernio MCP server reference. Two critical findings: (1) the concrete MCP wiring (URL, auth, 300+ tools auto-generated from the OpenAPI spec), and (2) a NEW FOOTGUN that mirrors the GHL scheduled-auto-publishes danger: Zernio MCP posting DEFAULTS to SCHEDULED mode (60 min out). You must explicitly pass `is_draft=true` to get the safe draft. This is exactly the kind of "default is unsafe" trap the publish-gate invariant exists to catch.

## Key quotations / statistics
- MCP URL: `https://mcp.zernio.com/mcp`
- Auth: OAuth sign-in (recommended for Claude Desktop) OR API key via `Authorization: Bearer` header.
- Clients: Claude Desktop (Settings -> Connectors -> Add custom connector), Cursor (`.cursor/mcp.json`, HTTP type), ChatGPT (connector with OAuth), any MCP client.
- "300+ tools auto-generated from the Zernio OpenAPI spec."
- Tool categories: Posts (create, publish, schedule, cross-post), Media management/upload, Ads/campaigns, WhatsApp broadcasts/templates, Inbox conversations, Contact management/sequences, Comment automations, Analytics + best-time-to-post, Webhooks/integrations.
- DEFAULT BEHAVIOR (verbatim): "Posts default to scheduled mode (60 minutes out). Users must explicitly set `publish_now=true` or `is_draft=true` to override this default and either publish immediately or save as draft."

## Annotations for weapon-forge
- NEW CRITICAL FOOTGUN: Zernio's MCP DEFAULTS to SCHEDULED (60 min out), NOT draft. An agent that creates a post via Zernio MCP WITHOUT setting `is_draft=true` will auto-publish in 60 minutes with no approval. This is the Zernio analogue of the GHL `status:"scheduled"` trap. weapon-forge MUST add this to the footgun catalog and require `is_draft=true` on every Zernio MCP create in the drafts-only gate.
- EXACT FIELD NAMES for the Zernio runbook: `is_draft=true` (safe draft), `publish_now=true` (immediate). Default (neither set) = scheduled 60 min. The drafts-only guard for Zernio MCP = always `is_draft=true`.
- The 300+ tools are auto-generated from the OpenAPI spec - so the REST `/posts` create with a draft field and the MCP `is_draft` flag are the same underlying capability. weapon-forge can document one publish-gate rule that covers both REST and MCP surfaces.
- MCP wiring detail (URL, .cursor/mcp.json, connector setup) is directly reusable in an examples/ file for the Cursor/Claude agent integration.
- This finding strengthens the publish-gate guide's thesis: across GHL (scheduled auto-publishes) AND Zernio MCP (defaults to scheduled), the UNSAFE behavior is the DEFAULT. The Guardian's value is forcing draft explicitly every time.
