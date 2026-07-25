---
source_url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool
retrieved_on: 2026-07-02
source_type: official-docs
authority: official
relevance: high
topic: capture-tooling
weapon: competitor-recon-weapon
---

# Browser-automation and computer-use tooling for authenticated capture (2026)

## Summary
The tooling landscape for the weapon's live-capture step, when interactive (agent-driven) capture is preferred over a scripted Playwright run. Covers Claude's computer-use tool, browser-automation MCP servers (Playwright MCP, Glance, Browser MCP, Firecrawl screenshot), and the model-precision notes. Establishes the tiered capture options the weapon should document, all backstopped by owner-assisted capture.

## Key quotations / statistics
- Computer use: "Claude's computer use tool provides screenshot capture capability to see what's currently displayed on screen, with Claude Sonnet 4.6 being more mechanically precise at clicking than Claude Opus 4.6, while Claude Opus 4.7 narrows that gap with comparable click precision and higher resolution limits."
- Glance: "an open-source MCP server that gives Claude Code a real Chromium browser with 30 tools to navigate pages, take screenshots Claude can actually see, click buttons, fill forms, run multi-step E2E scenarios, and do visual regression testing."
- Playwright MCP: "lets Claude navigate pages, click elements, fill forms, take screenshots, extract data, and handle authenticated sessions by connecting Claude to a running browser instance."
- Firecrawl MCP: "Scrape API, including screenshot format, so Claude can capture rendered images of any webpage."

## Annotations for weapon-forge
- `guides/authenticated-capture.md` tier list: (1) interactive agent capture via computer-use or a browser MCP (Playwright MCP / Glance / Browser MCP / Claude-in-Chrome) for exploratory walkthroughs and interactive-state capture; (2) scripted Playwright + storageState for reproducible multi-state captures (see the storageState note); (3) owner-assisted capture (ask the operator to screenshot) as the mandatory fallback when no tooling/access is available.
- The tier list is the operational answer to the Command Brief's open question about which browser tool to standardize on: document the options, pick per-availability, always keep owner-assisted as the backstop.
- Model-precision note is a minor operational tip (Sonnet for click precision), not load-bearing.

## Sources
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool
- https://www.producthunt.com/products/glance-give-claude-code-a-real-browser
- https://www.mindstudio.ai/blog/automate-browser-tasks-claude-code-playwright
- https://browsermcp.io/
