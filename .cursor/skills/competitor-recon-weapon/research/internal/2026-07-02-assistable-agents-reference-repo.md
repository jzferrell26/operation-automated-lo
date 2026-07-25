---
source_url: C:\Users\jzfer\assistable-agents-reference (local clone of an Assistable-published agent-distribution repo)
retrieved_on: 2026-07-02
source_type: github-readme
authority: official
relevance: critical
topic: agent-discovery-endpoints
weapon: competitor-recon-weapon
---

# assistable-agents-reference local repo clone [internal worked example]

## Summary
A local clone of a small, purpose-built repo (`AGENTS.md`, `README.md`, `SKILL.md`, `examples/`) that Assistable publishes specifically so AI coding agents and AI tools can discover and integrate with its API. This is the concrete, already-in-hand example of the "published agent-distribution packages" and "llms.txt / auth.md / openapi.json ... discovery endpoints" language in the Guardian's Command Brief (ACTION step 4) and seed query 3 ("llms.txt openapi.json public API endpoint discovery competitor research 2026"). It demonstrates that competitor reconnaissance in 2026 increasingly includes a NEW category of public artifact: files competitors publish specifically for AI agents to read, not for humans.

## Key quotations / statistics
- From `AGENTS.md`: "**API base:** `https://api.assistable.ai/v3` (OpenAPI 3.1: https://www.assistable.ai/openapi.json)" and "**Auth:** `Authorization: Bearer ask_live_...` -- full walkthrough: https://www.assistable.ai/auth.md" -- confirms both `openapi.json` AND an `auth.md` file are served directly off the marketing domain root (`www.assistable.ai/openapi.json`, `www.assistable.ai/auth.md`), not the docs subdomain. This is a specific, checkable pattern: competitor root domains are worth probing for `/openapi.json`, `/auth.md`, `/llms.txt` even when a separate docs site exists.
- From `AGENTS.md`: "**Discovery:** https://www.assistable.ai/.well-known/ai-plugin.json · agent-card.json · mcp.json · api-catalog" -- a concrete list of `.well-known/` discovery endpoints beyond the classic `ai-plugin.json` (itself a legacy OpenAI plugin-manifest convention), including newer `agent-card.json` and `mcp.json` conventions for MCP server self-description.
- From `AGENTS.md`: "**MCP server:** `npx -y @assistableai/mcp` (set `ASSISTABLE_API_KEY`)" -- confirms the competitor ships an installable MCP server as a public npm package, itself a reconnaissance target (the package's tool list documents exactly which API operations the vendor considers agent-safe).
- From `SKILL.md` frontmatter: `name: assistable`, `description: Multi-channel voice AI...`, `metadata: version: 0.1.0, vendor: Assistable Machine Learning, Inc.` -- a structured, machine-readable capability summary in the same YAML-frontmatter-plus-markdown-body shape used by this very Guild AI Tools Factory's own skill files. Notable meta-observation: the format of a competitor's public SKILL.md is itself informative about how the competitor wants to be described/discovered by AI tooling, which is a legitimate reconnaissance signal (structural fact) distinct from copying its prose.
- From `AGENTS.md` "Safety for agents" section: "`list_*` / `get_*` operations are read-only and safe to call freely. `place_call`, `create_*`, `update_*` are **write/billable** actions -- confirm intent with the user first." -- the competitor's OWN published safety guidance for agents mirrors almost exactly the Guardian's Critical Directive 1 (never mutate live competitor data, throwaway records only). Useful validation that the read-only-first posture is now an industry norm being actively published by SaaS vendors themselves, not just an internal caution.

## Annotations for weapon-forge
- This repo justifies adding a specific, checkable step to the Weapon's public-artifact-archaeology guide: probe the target's root domain and docs domain for `/llms.txt`, `/openapi.json`, `/auth.md`, `/.well-known/ai-plugin.json`, `/.well-known/agent-card.json`, `/.well-known/mcp.json` before assuming none exist. All of these were discoverable for Assistable without any authentication.
- The existence of a published `@assistableai/mcp` npm package as a reconnaissance target is a pattern likely to generalize across 2026 SaaS competitors and should get its own guide callout: "check npm/PyPI for an official (or community) MCP server package published by the target; its tool manifest is a structured map of the API surface the vendor is willing to expose to agents."
- Caution to flag: this repo's CONTENT (the prose in AGENTS.md/SKILL.md) is itself competitor-authored marketing/integration copy. Reading it for structural facts (which endpoints exist, what auth scheme, what discovery files) is squarely in bounds per Critical Directive 2; copying its sentences verbatim into a gap-analysis report would not be. weapon-forge's guide should show this repo as an example where the LINE between "structural fact" (endpoint list, auth header format) and "competitor prose" (marketing description text) is unusually easy to draw cleanly, because the file itself segments machine-readable facts from human-readable description.
