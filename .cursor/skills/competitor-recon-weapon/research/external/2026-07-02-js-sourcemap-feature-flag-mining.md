---
source_url: https://github.com/ccelikanil/mapxtractor
retrieved_on: 2026-07-02
source_type: github-readme
authority: practitioner
relevance: high
topic: client-bundle-mining
weapon: competitor-recon-weapon
---

# JS bundle / source-map feature-flag mining (client-bundle vendor-constant recon)

## Summary
The technical basis for the weapon's "client-bundle vendor-constant mining" ACTION step: shipped client JS (and especially exposed `.js.map` source maps) leaks folder structure, module names, API shapes, endpoints, and feature flags. The 2026 Claude Code source-map leak is the definitive case study of exactly this recon vector at scale, and doubles as a cautionary tale about what a competitor can learn from your own bundle.

## Key quotations / statistics
- Source maps leak "folder structure, module names, comments, API shapes, endpoints, frontend stack, libraries being used, and feature flags -- details not meant to be public. Parameters that control feature flags or access testing endpoints might appear as variable names, function arguments or URL fragments inside JavaScript scripts."
- Tooling: mapxtractor is "a lightweight offensive recon tool designed to discover exposed JavaScript SourceMaps (.js.map) ... and optionally extract original source code embedded inside them." A secret-scanner pass "identifies hardcoded secrets, internal infrastructure references, and hidden API endpoints."
- Case study: on 2026-03-31 a shipped npm package included "a 59.8 MB cli.js.map file that mapped roughly 1,900 files and over 512,000 lines of unobfuscated TypeScript." Developers "found feature flags for unshipped features, which means a partial roadmap and some hidden easter eggs." The exposure was "real competitive intelligence permanently in the public domain."

## Annotations for weapon-forge
- `guides/client-bundle-mining.md`: teach the method (locate shipped bundles, probe for `.js.map`, extract module tree + endpoint constants + feature-flag names) and the discipline (this is FACT extraction from publicly-served files, not credential theft; never use extracted secrets, log-and-route any secret found rather than using it).
- Feature-flag names in a bundle are the single richest roadmap signal, but map to the verify-across-states directive: a flag's presence in the bundle does not prove the feature is shipped/enabled; confirm in live UI across account states before recording.
- Ethics/scope boundary: mapxtractor is framed as an "offensive recon" tool; the weapon uses only the read-public-artifacts subset. Anything approaching secret exploitation or unauthorized access routes to code-forensics-guardian / security-guardian, not this Guardian.

## Sources
- https://github.com/ccelikanil/mapxtractor
- https://www.infoq.com/news/2026/04/claude-code-source-leak/
- https://layer5.io/blog/engineering/the-claude-code-source-leak-512000-lines-a-missing-npmignore-and-the-fastest-growing-repo-in-github-history/
- https://www.yeswehack.com/learn-bug-bounty/discover-map-hidden-endpoints-parameters
