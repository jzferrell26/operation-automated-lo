# 04 - Client-bundle mining

How to extract structural facts from a competitor's shipped client JavaScript. This is the third capture channel: what is BUILT (even if not shipped or enabled).

## What a bundle leaks

Shipped client JS, and especially exposed `.js.map` source maps, leak: folder structure, module names, comments, API shapes, endpoint URLs, the frontend stack, libraries in use, and feature-flag names. These are details not meant to be public but are served publicly.

Basis: `research/external/2026-07-02-js-sourcemap-feature-flag-mining.md`.

## Method

1. Locate the shipped bundles (view-source, network tab, or the docs/app HTML).
2. Probe for adjacent `.js.map` source maps.
3. If present, extract the original module tree, endpoint constants, and feature-flag names.
4. Cross-reference endpoint constants against the openapi.json found in archaeology (guide 03).

Tooling exists for this (e.g., mapxtractor for source-map discovery and extraction), but the weapon uses only the read-public-artifacts subset.

## The 2026 case study

On 2026-03-31 a shipped npm package included a 59.8 MB `cli.js.map` mapping ~1,900 files and 512,000+ lines of unobfuscated source. Developers found feature flags for unshipped features, i.e. a partial roadmap, plus hidden easter eggs. This is the definitive example of the vector at scale, and a reminder of what a competitor can learn from YOUR bundle.

Basis: `research/external/2026-07-02-js-sourcemap-feature-flag-mining.md`.

## Discipline

- **Feature-flag names are the richest roadmap signal, but they are not proof.** A flag in the bundle does not mean the feature is shipped or enabled. Map every bundle finding to the verify-across-states directive (guide 05): confirm in live UI across account states before recording as a real capability.
- **Fact extraction only, never exploitation.** This is reading publicly-served files for structural facts, not credential theft. If you find a secret (API key, token) in a bundle, do NOT use it: log it and route to security-guardian / code-forensics-guardian. Using a leaked secret crosses from recon into unauthorized access.
- **Read facts, never copy prose** (Hard Rule 2). Extract the module tree and endpoint list, not any embedded copy.

## Boundary

mapxtractor and similar tools are framed as "offensive recon." This weapon does not do offensive security. Anything approaching secret exploitation, unauthorized access, or a legal/trade-secret judgment routes to code-forensics-guardian or security-guardian (Hard Rule 7).

Basis: `research/external/2026-07-02-js-sourcemap-feature-flag-mining.md`; `research/external/2026-07-02-reverse-engineering-saas-legal-boundaries.md`.

## Example

- `examples/happy-path-saas-portal-teardown.md` (bundle channel: feature-flag extraction feeding a verification step)
