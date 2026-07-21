# Operation Automated LO UX/UI Source of Truth

This folder defines the approved design scope for Operation Automated LO. It converts the July 20, 2026 Claude Design canvases into a repository-owned design contract.

## Authority order

When sources disagree, use this order:

1. Approved PRDs, security requirements, compliance constraints, and verified provider contracts
2. [Design brief](00-design-brief.md)
3. [Master tokens](01-master-tokens.css) and [surface utilities](02-surfaces-and-borders.css)
4. Component and screen specifications
5. Claude Design HTML canvases

The canvases are visual reference photographs. They are not production code, provider truth, accessibility proof, or authorization to implement a blocked feature.

## Artifact map

| Artifact | Purpose | Status |
|---|---|---|
| [00-design-brief.md](00-design-brief.md) | Product-wide visual, interaction, responsive, and safety contract | Approved design scope |
| [01-master-tokens.css](01-master-tokens.css) | Semantic Light and Dark tokens | Approved baseline, implementation must validate contrast |
| [02-surfaces-and-borders.css](02-surfaces-and-borders.css) | Named surfaces, focus, motion, and elevation utilities | Approved baseline |
| [03-components/application-shell-and-navigation.md](03-components/application-shell-and-navigation.md) | Platform shell and navigation contract | Approved scope |
| [03-components/status-feedback-and-attention.md](03-components/status-feedback-and-attention.md) | Status, attention, disabled, and uncertain-state behavior | Approved scope |
| [03-components/campaign-and-artifact-workflow.md](03-components/campaign-and-artifact-workflow.md) | Campaign, artifact, preflight, approval, and launch components | Approved scope |
| [04-screens/platform-overview.md](04-screens/platform-overview.md) | Root platform overview | Approved scope |
| [04-screens/marketing-suite-campaign-performance.md](04-screens/marketing-suite-campaign-performance.md) | Campaign performance module | Approved scope |
| [04-screens/campaign-lifecycle.md](04-screens/campaign-lifecycle.md) | Campaign creation through reporting | Approved scope |
| [04-screens/onboarding-brand-and-platform-settings.md](04-screens/onboarding-brand-and-platform-settings.md) | Setup, brand, connections, roles, usage, and settings | Approved scope |
| [05-html-examples/claude-design/README.md](05-html-examples/claude-design/README.md) | Source manifest and canvas instructions | Preserved source |

## Ownership

`design-system-guardian` owns system-level changes to this folder. After bootstrap, `ux-ui-guardian` owns normal enforcement, component additions, screen additions, and implementation review.

Production React code must consume product wrappers and semantic tokens. It must not copy the canvas inline styles, raw hex values, placeholder provider claims, or static fixture state directly.
