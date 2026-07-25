---
source_url: https://buildwithfern.com/post/optimizing-api-docs-ai-agents-llms-txt-guide
retrieved_on: 2026-07-02
source_type: blog
authority: practitioner
relevance: high
topic: discovery-endpoints
weapon: competitor-recon-weapon
---

# llms.txt / openapi.json / .well-known/api-catalog discovery conventions (2026)

## Summary
The current-standard framing for the machine-readable discovery endpoints competitor-recon-guardian probes during public-artifact archaeology. Confirms the conventional paths, their status (convention vs RFC), and who actually consumes them in 2026. Corroborates the internal `assistable-agents-reference` finding (Assistable serves openapi.json, auth.md, and .well-known descriptors off its root domain).

## Key quotations / statistics
- llms.txt: "a plain text file at your-docs-site.com/llms.txt that lists URLs to your documentation pages ... an open proposal by Jeremy Howard, not an RFC or W3C standard, with no standards body behind it and no enforcement mechanism."
- Conventional discoverable paths: "llms.txt and llms-full.txt for LLM-optimized summaries, and /openapi.json or /openapi.yaml for full machine-readable specs."
- New standard endpoint: "Fern docs sites expose a standards-based API catalog at /.well-known/api-catalog (per RFC 9727), letting AI agents and MCP clients discover your APIs without scraping HTML."
- Adoption reality check: "AI coding assistants (Cursor, Claude Code) and custom AI agents use llms.txt actively, though general inference by ChatGPT, Claude, or Perplexity doesn't use llms.txt as of early 2026."

## Annotations for weapon-forge
- Concrete probe checklist for `guides/public-artifact-archaeology.md`: `/llms.txt`, `/llms-full.txt`, `/openapi.json`, `/openapi.yaml`, `/.well-known/api-catalog` (RFC 9727), plus the legacy `/.well-known/ai-plugin.json` and newer `agent-card.json` / `mcp.json` seen in the internal agents-reference note.
- openapi.json is the single highest-value artifact: a full API surface (endpoints, schemas, auth) enumerable without authentication, complementing the UI walkthrough with the machine contract.
- Note the convention-not-standard status of llms.txt: presence is informative, absence proves nothing. The guide should say "probe these paths, but a 404 is not evidence the capability is missing."

## Sources
- https://buildwithfern.com/post/optimizing-api-docs-ai-agents-llms-txt-guide
- https://buildwithfern.com/post/best-llms-txt-implementation-platforms-ai-discoverable-apis
- https://dacharycarey.com/2026/05/01/github-docs-api-llms-txt/
