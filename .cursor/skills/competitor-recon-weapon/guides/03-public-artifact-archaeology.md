# 03 - Public-artifact archaeology

How to mine a competitor's PUBLIC artifacts for behavioral and API facts. This is legal to read (facts, not prose) and is often faster than a UI pass at answering "how does this actually work."

## The discovery-endpoint checklist

Probe the target's root domain AND its docs domain for these conventional paths. All were discoverable for Assistable without authentication.

- `/llms.txt` and `/llms-full.txt` (LLM-optimized doc summaries; a convention, not a standard, so a 404 proves nothing)
- `/openapi.json` and `/openapi.yaml` (the full API surface: endpoints, schemas, auth; the single highest-value artifact)
- `/auth.md` (auth walkthrough, sometimes served off the root domain)
- `/.well-known/api-catalog` (RFC 9727 standards-based API catalog)
- `/.well-known/ai-plugin.json` (legacy OpenAI plugin manifest)
- `/.well-known/agent-card.json` and `/.well-known/mcp.json` (newer agent/MCP self-description)

Basis: `research/external/2026-07-02-llms-txt-openapi-wellknown-discovery.md`; `research/internal/2026-07-02-assistable-agents-reference-repo.md` (Assistable serves openapi.json + auth.md off `www.assistable.ai` root, plus the .well-known set).

## Docs repos

Many SaaS products publish their docs as a public repo (Mintlify, Docusaurus, GitBook). If you can find it:

- The docs-platform config file (`docs.json`, `docusaurus.config.js`) is a fast map of the entire documented surface; every nav entry is a section to potentially inspect.
- Business-layer docs (wallet, billing, rebilling, permissions, limits) are where feature-gating logic is documented in plain language.
- Variable/merge-field catalogs surface the competitor's internal data model, a functional-parity checklist handed to you for free.
- Product step screenshots in `images/` confirm behavior (subject to the no-copy rule).

The Assistable docs repo resolved the billing-tab gate that two UI passes could not: `platform/subaccount-wallet.mdx` documented that the tab requires sub-account membership.

Basis: `research/internal/2026-07-02-assistable-docs-reference-repo.md`.

## Agent-distribution packages

A newer 2026 recon vector: files a competitor publishes specifically for AI agents.

- `AGENTS.md`, `SKILL.md` at repo/site root: structured capability declarations.
- Published MCP server packages (e.g., an `@vendor/mcp` npm package): the tool manifest is a structured map of the API operations the vendor considers agent-safe. Assistable ships `@assistableai/mcp`.
- Note: a declared capability is not proof of a shipped one. Verify against live behavior (guide 05).

Basis: `research/internal/2026-07-02-assistable-agents-reference-repo.md`.

## Discipline

- **Read facts, never copy prose** (Hard Rule 2). Endpoint lists, auth header formats, schema shapes are structural facts. Marketing description text is protected expression.
- **Local clones stay OUTSIDE the recon output tree** (Hard Rule 6 adjacent). Clone a competitor's public repo as a working reference kept outside your Guardian's git history; cite it by absolute local path; never vendor its files into your repo.
- **Log out-of-scope findings for routing, do not chase them.** The Assistable variable-catalog surfaced a merge-field parity gap outside the visual sweep; it was logged as a follow-up PRD candidate, not acted on mid-sweep.

## Example

- `examples/happy-path-saas-portal-teardown.md` (archaeology channel, including the docs-resolves-the-gate move)
