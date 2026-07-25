# Research Summary: competitor-recon-weapon

## Depth tier consumed
`normal` (degraded execution, see tooling note below). Target breadth for normal is ~100 pages; this run produced 13 substantive source notes (5 internal first-party + 8 external), which is below the nominal normal-tier page count but appropriate given (a) the domain's authority is concentrated in a small set of first-party precedents rather than a large web literature, and (b) the tooling degradation described below.

## Time window covered
2026-01-02 back to 2026-07-02 (6 months). Not extended beyond 6 months; all external sources are 2026-dated. Internal precedents are same-day (2026-07-02).

## Tooling degradation (graceful-degradation clause invoked)
Firecrawl (`firecrawl search/scrape/map/crawl`) and Exa (`web_search_exa`) were NOT available in this environment: no `firecrawl`/`exa` binaries on PATH and no `mcp__firecrawl__*` / `mcp__exa__*` tools in the session's tool surface. Per the loremaster contract's graceful-degradation rule, this run substituted:
- **WebSearch** (built-in) for discovery in place of `firecrawl search` / `web_search_exa`.
- **WebFetch** available for full-page retrieval (WebSearch snippets were sufficient for this normal-tier sweep, so WebFetch was held in reserve).
The substitution changed tooling, not method: recency-first, cite-don't-paraphrase, one-source-one-file discipline held throughout. No auth errors occurred (the tools were simply absent, not failing); per the contract, absence of research tooling was degraded around rather than escalated, because usable output was produced.

Additional execution note: the loremaster phase was first dispatched as a background subagent. That dispatch produced `research-plan.md` and the 5 internal source notes, but its completion signal never arrived (the background child was no longer alive). The orchestrator directed completion inline; dms-hand then removed two accidental duplicate internal notes it had begun drafting, preserved the richer background-produced internal notes, and added the 8 external notes, index, and this summary inline.

## Files written, by subfolder
- `internal/` : 5 (the first-party Assistable precedents: gap analysis, corpus README, docs repo, agents repo, chatwidget MIT fork)
- `external/` : 8 (teardown methodology, Playwright storageState capture, llms.txt/openapi discovery, MIT license scope, JS source-map mining, gap-analysis report structure, browser-automation tooling, reverse-engineering legal boundaries)
- root metadata : `research-plan.md`, `index.md`, `research-summary.md`

## The 5 most influential sources (with weapon-forge annotations)
1. `internal/2026-07-02-assistable-parity-gap-analysis.md` -- THE worked example. Its Part1(performance)/Part2(per-surface gap tables)/Part3(phased build order) shape, and its corrected-findings billing-tab arc, are the backbone of the weapon's method guide, gap-table template, and verify-across-states directive. weapon-forge should abstract the generic gap-table schema (surface / present-in-target / present-in-ours / severity / evidence-source / verification-state) from it, NOT copy its section list.
2. `internal/2026-07-02-assistable-chatwidget-mit-fork.md` -- the single best teaching example for the MIT-fork legal audit: LICENSE copyrighted to Rowy, README branded BuildShip, package named @assistable/chat-widget. Directly instantiates Critical Directive 6 (license scope is per-artifact). Cite it verbatim in `guides/legal-boundaries.md`.
3. `internal/2026-07-02-assistable-agents-reference-repo.md` -- the concrete discovery-endpoint checklist source (openapi.json + auth.md off root domain, .well-known/ai-plugin.json + agent-card.json + mcp.json, published @assistableai/mcp npm package). Feeds the public-artifact-archaeology probe list. Also shows the competitor publishing its own read-only-first agent-safety guidance, validating Critical Directive 1 as an industry norm.
4. `external/2026-07-02-reverse-engineering-saas-legal-boundaries.md` -- the four-lines framing (authentication / personal data / copyright / rate limiting) that justifies every hard rule in the weapon and the route-to-code-forensics-guardian boundary. The critical external source.
5. `internal/2026-07-02-assistable-reference-corpus-readme.md` -- the reusable corpus-README pattern (provenance header, role-split-then-module folder layout, four PII/usage-rule classes). Seeds `templates/reference-corpus-README-template.md`; also surfaces a real precedent-vs-directive tension (the precedent says "keep private," Critical Directive 5 requires redaction) that weapon-forge should resolve toward the stricter directive.

## Open questions that survived the research (for the user, not weapon-forge to invent)
1. **Standardized capture tooling.** The weapon documents a tier list (interactive browser MCP / scripted Playwright+storageState / owner-assisted fallback) but does not mandate one tool. If the operator wants a single default (e.g., Claude-in-Chrome for interactive, Playwright for reproducible), that is a user decision to encode.
2. **Corpus redaction protocol.** The precedent corpus README says "keep private" but does not define a redaction step; Critical Directive 5 requires redaction/exclusion of real PII. The user should decide the concrete standard (redact-before-commit vs private-repo-only) the weapon enforces.
3. **Authenticated-capture ToS posture.** Authenticated walkthroughs (even via the operator's own account) sit under the competitor's ToS, which often prohibits reverse-engineering / competing-product data extraction. The user/operator should confirm the acceptable posture (owner-authorized accounts, throwaway records, when to stop and route to code-forensics-guardian) rather than the weapon assuming it.

## Sources weapon-forge should re-fetch with deeper context
- The internal repos themselves (`~/assistable-docs-reference`, `~/assistable-agents-reference`, `~/assistable-chatwidget-reference`) if weapon-forge needs exact file trees for a worked example beyond what the internal notes captured.
- If Firecrawl/Exa become available, a deeper pass on browser-automation MCP options (Glance, Playwright MCP, Claude-in-Chrome) would strengthen `guides/authenticated-capture.md` beyond the WebSearch-snippet level used here.

---

Research for `competitor-recon-guardian` is complete at `ai-tools/skills/competitor-recon-weapon/research/` (13 files, depth: normal, window: 6 months). Ready to hand off to **weapon-forge**.
