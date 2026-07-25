---
source_url: C:\Users\jzfer\assistable-docs-reference (local clone of github.com/assistable-ai/docs)
retrieved_on: 2026-07-02
source_type: github-readme
authority: official
relevance: critical
topic: public-artifact-archaeology
weapon: competitor-recon-weapon
---

# assistable-docs-reference local repo clone [internal worked example]

## Summary
A local clone of Assistable's public Mintlify documentation source (per the parity gap analysis, "166 files, updated 2026-04"). This is the canonical example of "public-artifact archaeology" named in the Guardian's ACTION step 4: docs repos, OpenAPI specs, and discovery endpoints as evidence sources for behavioral facts that a UI walkthrough alone cannot fully explain or verify. Top-level structure observed on disk: `api-reference/`, `get-started/`, `how-to-guides/`, `integrations/`, `monitor/`, `platform/`, `troubleshooting/`, `variables/`, `docs.json` (the Mintlify site config), plus `build/` and `deploy/` sections and an `images/` folder for product screenshots.

## Key quotations / statistics
- From `docs.json`: theme `"mint"` (Mintlify), navbar links to Homepage/Support/Roadmap, and a primary CTA button linking to `https://createassistants.com/dashboard` -- confirms the docs site and the live product dashboard are cross-linked and both publicly discoverable from the docs repo alone, without needing an account.
- Section names visible at top level (`platform/`, `variables/`, `monitor/`) map directly to functional areas the gap analysis needed to verify: the gap analysis (section 2.12) specifically cites `platform/subaccount-wallet.mdx` as the source that resolved the billing-tab visibility gate from "some accounts" to "member-invited accounts."
- `api-reference/` folder existing alongside a full OpenAPI 3.1 spec (referenced elsewhere as `https://www.assistable.ai/openapi.json`) demonstrates the openapi.json discovery pattern named in the Guardian's seed queries: a competitor's complete API surface (endpoints, schemas, auth) can be fully enumerated from a single public JSON file without any authenticated access.
- `variables/` folder (referenced in the gap analysis as `variables/available-variables.mdx`, "their merge-field catalog") is an example of a docs subsection that surfaces a competitor's internal data model (session variables, formatted date helpers) purely through public documentation, feeding a FUNCTIONAL gap (not visual) that the gap analysis explicitly logs as "a follow-up PRD candidate for the SMS/voice engine" rather than acting on it directly -- i.e., public-docs archaeology can surface findings outside the current recon scope, and the discipline is to log them for routing, not chase them mid-sweep.

## Annotations for weapon-forge
- This repo is the single clearest example of "read code/config for structural facts only" (Command Brief ACTION step 4). The guide should show the pattern: clone the target's public docs repo (if one exists) locally, treat it as a queryable reference alongside (not instead of) the live UI walkthrough, and cite specific files (e.g., `platform/subaccount-wallet.mdx`) rather than paraphrasing the whole repo.
- The Command Brief's critical directive "do NOT vendor into this repo" (i.e., don't copy this clone's files into the weapon's own repo) should be encoded as an explicit rule in weapon-forge's guide: local clones of a competitor's public repos are working references kept OUTSIDE the recon output tree, cited by absolute local path, never mirrored into the Guardian's own git history.
- `docs.json`'s Mintlify config format itself is a secondary, generalizable finding: many competitor SaaS products use Mintlify (or Docusaurus, GitBook, etc.) for public docs, and the site config file (`docs.json`, `docusaurus.config.js`, etc.) is itself a fast map of the competitor's entire documented surface area (every nav entry is a section to potentially inspect). weapon-forge's guide could suggest checking for the docs-platform config file as a first move when a target's docs repo is discoverable.
