# 02 - Authenticated capture

How to capture a competitor's logged-in UI as evidence. This is the primary evidence channel for a UX teardown.

## The capture tier list

Pick the highest tier available; always keep the last as a backstop.

1. **Interactive agent capture** (browser MCP or computer-use). Drive a real browser to navigate, open modals/panels, and screenshot. Best for exploratory walkthroughs and interactive-state capture (empty states, loading skeletons, conditional panels). Options observed 2026: Claude computer-use tool, Playwright MCP, Glance, Browser MCP, Claude-in-Chrome, Firecrawl screenshot. Basis: `research/external/2026-07-02-browser-automation-mcp-computer-use.md`.
2. **Scripted Playwright + storageState.** Log in once, save the session (cookies + localStorage + sessionStorage) to a `storageState.json`, and reuse it across reproducible capture runs. Best for capturing the SAME surface across multiple account states deterministically (one storageState per account condition). Basis: `research/external/2026-07-02-playwright-storagestate-screenshot-automation.md`.
3. **Owner-assisted capture** (Hard Rule 3). When neither tool is available or access is not lawfully obtainable, ask the operator to capture and hand over screenshots. Never fabricate or silently skip.

## storageState mechanics

- Global-setup performs login once and saves state to a file.
- Config points `storageState` at the file; capture runs reuse it via a browser context.
- Keep one storageState per role/account-state (admin, member, trial, paid, re-billed). This is the mechanical enabler for the verify-across-states directive (guide 05).
- storageState files hold live session tokens: they are credentials plus PII. Always `.gitignore` them. Never commit, never paste into external tools.

Basis: `research/external/2026-07-02-playwright-storagestate-screenshot-automation.md`.

## Capture discipline

- **Throwaway records only** (Hard Rule 1). Do not create/edit/delete real data. If a walkthrough requires creating a record to see a screen, use a clearly disposable test record and clean up.
- **Capture in task-flow order** (guide 01). Walk a real task end to end so the corpus reads like a walkthrough.
- **Interactive states need deliberate repeat passes.** A single walkthrough misses modals, panels, empty/loading states, and conditionally-rendered tabs. The Assistable run needed a second and third pass (sections 2.3b, 2.6b) to capture panel and settings states.
- **Record provenance immediately**: which account, what date, what method. Feeds the corpus README (guide 08) and the gap-analysis provenance header.

## The ToS caveat (open question)

Authenticated walkthroughs, even via your own or the operator's account, sit under the target's terms of service, which frequently prohibit reverse-engineering and competing-product data extraction. Default to owner-authorized accounts and throwaway records, and flag when a capture would require conduct the operator has not authorized. See `guides/06-legal-boundaries.md`.

> TODO: open question -- standardized capture tooling. This weapon documents the tier list but does not mandate a single default tool. If the operator wants one (e.g., Claude-in-Chrome for interactive, Playwright for reproducible), that is a user decision to encode at next refresh. (`research/research-summary.md`)

## Examples

- `examples/happy-path-saas-portal-teardown.md` (tier 1 + tier 2 capture)
- `examples/edge-case-owner-assisted-and-corrected-finding.md` (tier 3 fallback)
