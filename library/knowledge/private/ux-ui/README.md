# Operation Automated LO UX/UI Source of Truth

This folder defines the approved design scope for Operation Automated LO. It converts the July 20, 2026 Claude Design canvases into a repository-owned design contract.

## Visual reference since 2026-10-01: the PRD-009 mockups

Amended on 2026-10-01 by PRD-009 (009A-AC-015; owner decisions OD-E and OD-G, design answer D-2). The visual reference for every screen is the light AutomatedRE look in the **PRD-009 mockups**: the seven static pages in `library/requirements/<lifecycle>/prd-009-marketing-toolkit/design/mockups/` (today `in-work/`, then `completed/`) and their previews in `mockups/previews/`, read with `design/00-direction.md` sections 2 and 3. Where a mockup and a PRD-009 sub-PRD differ on a format, a string, or a state, the sub-PRD governs.

The **Claude Design canvases** in [05-html-examples/claude-design](05-html-examples/claude-design) are **history**: they record the July 20, 2026 direction (the deep navy rail, cobalt and teal, Geist) that PRD-009 superseded. They stay in the repository and stay readable; they are no longer what a screen is checked against. Every file in this folder that PRD-009 changed carries a dated note beside the text it supersedes, which stays readable.

## Authority order

When sources disagree, use this order:

1. Approved PRDs, security requirements, compliance constraints, and verified provider contracts
2. [Design brief](00-design-brief.md)
3. [Master tokens](01-master-tokens.css) and [surface utilities](02-surfaces-and-borders.css)
4. Component and screen specifications
5. The PRD-009 mockups (amended on 2026-10-01 by PRD-009: they replace the Claude Design HTML canvases here, and the canvases are history)

The canvases are visual reference photographs. They are not production code, provider truth, accessibility proof, or authorization to implement a blocked feature. _(Amended on 2026-10-01 by PRD-009: the same holds for the PRD-009 mockups, and the canvases are now history rather than the reference.)_

## Artifact map

| Artifact | Purpose | Status |
|---|---|---|
| [00-design-brief.md](00-design-brief.md) | Product-wide visual, interaction, responsive, and safety contract | Approved design scope |
| [01-master-tokens.css](01-master-tokens.css) | Semantic Light and Dark tokens | Reconciled 2026-09-19 with `packages/ui/src/tokens.css`. **Signed 2026-09-20 by `design-system-guardian`** after auditing that reconciliation rather than accepting it: all 69 `:root` properties and all 31 `[data-theme="dark"]` properties compared one by one against the shipped file and identical; all eleven ratios quoted in the file header recomputed and reproduced; the `02` reference-only annotation checked against the product; this table checked. One defect found and fixed, the incomplete `prefers-color-scheme` block. `--focus-color` changed in both files the same day, closing rubric delta D-001. Contrast enforced by `apps/web/src/theme/token-contrast.unit.test.ts`. **Amended 2026-10-01 by PRD-009a**: the light AutomatedRE values (design section 2.4) and the four Dark changes (section 2.6), in every theme block of both files, held to the design tables and to each other by `apps/web/src/theme/token-parity.unit.test.ts` |
| [02-surfaces-and-borders.css](02-surfaces-and-borders.css) | Named surfaces, focus, motion, and elevation utilities | Reference only since 2026-09-19; the product implements these as `oalo-*` in `packages/ui/src/components/primitives.css`, and the file carries the mapping |
| [06-review-rubric.md](06-review-rubric.md) | The scored review every user-visible screen passes before it ships | Approved scope, PRD-006d D1 to D3; first full review recorded 2026-09-19 |
| [../../../requirements/in-work/prd-006-first-party-sign-in-and-guided-experience/qa/2026-09-19-prd-006d-design-review.md](../../../requirements/in-work/prd-006-first-party-sign-in-and-guided-experience/qa/2026-09-19-prd-006d-design-review.md) | The first scored review against the rubric: thirteen findings, each with a file, a line, and a token-term delta, all fixed | Recorded 2026-09-19 |
| [../../../../tests/visual/screens/README.md](../../../../tests/visual/screens/README.md) | The committed screenshot baselines, what they are not (the rendering goldens), how they are named, and how a change to one is reviewed | Landed 2026-09-19, PRD-006d D8 |
| [03-components/application-shell-and-navigation.md](03-components/application-shell-and-navigation.md) | Platform shell and navigation contract | Approved scope; the light top bar and the six-item menu added 2026-10-01 (PRD-009a), the rail kept as history |
| [03-components/status-feedback-and-attention.md](03-components/status-feedback-and-attention.md) | Status, attention, disabled, and uncertain-state behavior | Approved scope |
| [03-components/campaign-and-artifact-workflow.md](03-components/campaign-and-artifact-workflow.md) | Campaign, artifact, preflight, approval, and launch components | Approved scope |
| [03-components/form-field-and-text-inputs.md](03-components/form-field-and-text-inputs.md) | `FormField`, `TextField`, `TextArea`, `PasswordField` | Approved scope, shipped 2026-09-19 |
| [03-components/link.md](03-components/link.md) | `Link`, the product link primitive | Approved scope, shipped 2026-09-19 |
| [03-components/sheet-and-dialog.md](03-components/sheet-and-dialog.md) | `Dialog`, `Sheet`, `SheetAnchor`, the dismissable layers | Approved scope, shipped 2026-09-19 |
| [03-components/stepper.md](03-components/stepper.md) | `Stepper`, guided and campaign progress | Approved scope, shipped 2026-09-19 |
| [03-components/badge-and-live-region.md](03-components/badge-and-live-region.md) | `Badge` and `LiveRegion` | Approved scope, shipped 2026-09-19 |
| [../../../../apps/web/public/fonts/README.md](../../../../apps/web/public/fonts/README.md) | The font pipeline ruling for design brief section 10 | Recorded 2026-09-19, revisited when a licensed Geist build is vendored. **Superseded 2026-10-01 by PRD-009a**: Inter v4.1 is vendored unmodified with its licence, and the record carries each file's git blob SHA-1 and SHA-256 |
| [../../../requirements/in-work/prd-009-marketing-toolkit/design/00-direction.md](../../../requirements/in-work/prd-009-marketing-toolkit/design/00-direction.md) | PRD-009's design direction and, beside it, the mockups that are the visual reference | Owner-approved 2026-10-01 (OD-E, D-2); moves to `completed/` with PRD-009 |
| [04-screens/platform-overview.md](04-screens/platform-overview.md) | Root platform overview | Approved scope |
| [04-screens/marketing-suite-campaign-performance.md](04-screens/marketing-suite-campaign-performance.md) | Campaign performance module | Approved scope |
| [04-screens/campaign-lifecycle.md](04-screens/campaign-lifecycle.md) | Campaign creation through reporting | Approved scope |
| [04-screens/onboarding-brand-and-platform-settings.md](04-screens/onboarding-brand-and-platform-settings.md) | Setup, brand, connections, roles, usage, and settings | Approved scope |
| [05-html-examples/claude-design/README.md](05-html-examples/claude-design/README.md) | Source manifest and canvas instructions | Preserved source; history since 2026-10-01 (PRD-009) |

## Ownership

`design-system-guardian` owns system-level changes to this folder. After bootstrap, `ux-ui-guardian` owns normal enforcement, component additions, screen additions, and implementation review.

Production React code must consume product wrappers and semantic tokens. It must not copy the canvas inline styles, raw hex values, placeholder provider claims, or static fixture state directly.
