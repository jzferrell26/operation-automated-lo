# Research Plan: competitor-recon-weapon

- **Depth tier:** normal
- **Time window:** 2026-01-02 back to 2026-07-02 (6 months), extendable to 12 months only with explicit user consent
- **Page budget target:** ~100 pages (normal tier: canonical docs + practitioner blogs + GitHub READMEs + 1-2 industry reports)
- **Source breadth target:** official docs (Firecrawl/llms.txt/openapi.json ecosystem writeups), practitioner blogs (UX teardown methodology, reverse engineering), GitHub READMEs (browser-automation MCP tooling, MIT license practice), internal prior-art (the Assistable precedent itself, treated as an authoritative internal source category)

## Tooling availability note (read before the query list)

Firecrawl (`firecrawl search/scrape/map/crawl`) and Exa (`web_search_exa`) are NOT available as CLI or MCP tools in this sandboxed dms-hand headless run. No `firecrawl`/`exa` binaries are on PATH, and no `mcp__firecrawl__*` / `mcp__exa__*` tools appear in the deferred tool list surfaced to this session. Per the loremaster contract's graceful-degradation clause, this run substitutes:
- **WebSearch** (Claude Code's built-in search tool) in place of `firecrawl search` / `web_search_exa` for discovery.
- **WebFetch** in place of `firecrawl scrape` for full-page retrieval where WebSearch snippets are insufficient.

This is documented in full in `research-summary.md`. The substitution changes tooling, not method: the same recency-first, cite-don't-paraphrase, one-source-one-file discipline applies throughout.

## Initial queries (from `session-zero` via the backlog entry, carried into the Command Brief)

- "competitor product teardown UX gap analysis methodology 2026"
- "browser automation screenshot capture authenticated SaaS app walkthrough 2026"
- "llms.txt openapi.json public API endpoint discovery competitor research 2026"
- "reverse engineering SaaS product feature parity analysis 2026"
- "MIT licensed open source fork legal code liftable audit 2026"
- "client bundle vendor constant mining JS reconnaissance 2026"
- "competitive gap analysis report structure PRD input 2026"

## Internal prior-art sources (read directly, no search tooling required)

These are AUTHORITATIVE per the Command Brief and are the reason this Guardian exists. Filed under `research/internal/`:

1. `C:\Users\jzfer\cuantico-sms\library\knowledge-base\ux-ui\assistable-parity-gap-analysis.md` (12-section worked gap analysis, corrected-findings billing-tab lesson)
2. `C:\Users\jzfer\cuantico-sms\library\knowledge-base\ux-ui\assistable-reference\README.md` and folder structure (Agency Side / Subaccount Side corpus organization + PII usage rules)
3. `C:\Users\jzfer\assistable-docs-reference` (public Mintlify docs repo clone: openapi.json, auth.md pattern, variables catalog)
4. `C:\Users\jzfer\assistable-agents-reference` (AGENTS.md / SKILL.md / .well-known discovery pattern -- the llms.txt-adjacent agent-distribution package precedent)
5. `C:\Users\jzfer\assistable-chatwidget-reference` (MIT-licensed fork with foreign upstream origin -- the license-scope-is-per-artifact cautionary example)

## Expansion queries (authored by loremaster)

### Branch from "competitor product teardown UX gap analysis methodology 2026"
- "SaaS competitive teardown template product managers 2026"
- "feature comparison matrix severity scoring gap analysis 2026"
- "UX audit heuristic evaluation competitor benchmarking 2026"

### Branch from "browser automation screenshot capture authenticated SaaS app walkthrough 2026"
- "Playwright authenticated session storage state screenshot automation 2026"
- "Claude computer use browser automation SaaS walkthrough capture 2026"
- "Puppeteer vs Playwright authenticated flow testing 2026"

### Branch from "llms.txt openapi.json public API endpoint discovery competitor research 2026"
- "llms.txt standard adoption AI agent discovery 2026"
- ".well-known ai-plugin.json agent-card.json discovery endpoints 2026"
- "AGENTS.md convention SKILL.md agent distribution package 2026"

### Branch from "reverse engineering SaaS product feature parity analysis 2026"
- "org-slug URL enumeration multi-tenant SaaS reconnaissance ethics 2026"
- "competitor API reverse engineering legal boundaries terms of service 2026"

### Branch from "MIT licensed open source fork legal code liftable audit 2026"
- "MIT license scope third party assets bundled fonts branding 2026"
- "open source license compliance audit checklist SPDX 2026"

### Branch from "client bundle vendor constant mining JS reconnaissance 2026"
- "JS bundle source map feature flag extraction competitive intelligence 2026"
- "webpack bundle analyzer reverse engineering frontend config 2026"

### Branch from "competitive gap analysis report structure PRD input 2026"
- "gap analysis report template severity evidence source PRD 2026"
- "phased build order roadmap recommendation from competitive audit 2026"

## Execution order

1. Internal prior-art files (no tooling risk, highest authority) -- done first.
2. WebSearch pass over the 7 seed queries.
3. WebSearch pass over expansion queries where seed results were thin.
4. WebFetch on the 5-8 highest-value URLs surfaced (official docs, canonical GitHub repos) for full-content citation.
5. index.md and research-summary.md written last.
