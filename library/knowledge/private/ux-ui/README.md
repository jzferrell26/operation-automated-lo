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
| [01-master-tokens.css](01-master-tokens.css) | Semantic Light and Dark tokens | Reconciled 2026-09-19 with `packages/ui/src/tokens.css`; contrast enforced by `apps/web/src/theme/token-contrast.unit.test.ts` |
| [02-surfaces-and-borders.css](02-surfaces-and-borders.css) | Named surfaces, focus, motion, and elevation utilities | Reference only since 2026-09-19; the product implements these as `oalo-*` in `packages/ui/src/components/primitives.css`, and the file carries the mapping |
| [06-review-rubric.md](06-review-rubric.md) | The scored review every user-visible screen passes before it ships | Approved scope, PRD-006d D1 to D3 |
| [03-components/application-shell-and-navigation.md](03-components/application-shell-and-navigation.md) | Platform shell and navigation contract | Approved scope |
| [03-components/status-feedback-and-attention.md](03-components/status-feedback-and-attention.md) | Status, attention, disabled, and uncertain-state behavior | Approved scope |
| [03-components/campaign-and-artifact-workflow.md](03-components/campaign-and-artifact-workflow.md) | Campaign, artifact, preflight, approval, and launch components | Approved scope |
| [03-components/form-field-and-text-inputs.md](03-components/form-field-and-text-inputs.md) | `FormField`, `TextField`, `TextArea`, `PasswordField` | Approved scope, shipped 2026-09-19 |
| [03-components/link.md](03-components/link.md) | `Link`, the product link primitive | Approved scope, shipped 2026-09-19 |
| [03-components/sheet-and-dialog.md](03-components/sheet-and-dialog.md) | `Dialog`, `Sheet`, `SheetAnchor`, the dismissable layers | Approved scope, shipped 2026-09-19 |
| [03-components/stepper.md](03-components/stepper.md) | `Stepper`, guided and campaign progress | Approved scope, shipped 2026-09-19 |
| [03-components/badge-and-live-region.md](03-components/badge-and-live-region.md) | `Badge` and `LiveRegion` | Approved scope, shipped 2026-09-19 |
| [../../../../apps/web/public/fonts/README.md](../../../../apps/web/public/fonts/README.md) | The font pipeline ruling for design brief section 10 | Recorded 2026-09-19, revisited when a licensed Geist build is vendored |
| [04-screens/platform-overview.md](04-screens/platform-overview.md) | Root platform overview | Approved scope |
| [04-screens/marketing-suite-campaign-performance.md](04-screens/marketing-suite-campaign-performance.md) | Campaign performance module | Approved scope |
| [04-screens/campaign-lifecycle.md](04-screens/campaign-lifecycle.md) | Campaign creation through reporting | Approved scope |
| [04-screens/onboarding-brand-and-platform-settings.md](04-screens/onboarding-brand-and-platform-settings.md) | Setup, brand, connections, roles, usage, and settings | Approved scope |
| [05-html-examples/claude-design/README.md](05-html-examples/claude-design/README.md) | Source manifest and canvas instructions | Preserved source |

## Ownership

`design-system-guardian` owns system-level changes to this folder. After bootstrap, `ux-ui-guardian` owns normal enforcement, component additions, screen additions, and implementation review.

Production React code must consume product wrappers and semantic tokens. It must not copy the canvas inline styles, raw hex values, placeholder provider claims, or static fixture state directly.
