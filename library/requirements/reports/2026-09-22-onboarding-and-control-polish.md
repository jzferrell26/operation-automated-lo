# AutomatedLO onboarding and control polish

## Outcome and scope

Jonathan requested cleaner form sections, professionally styled dropdowns, and full guided self onboarding for the product he is testing. This increment replaces the demo checklist with an explicit-save setup journey, adds reusable page walkthroughs, and corrects campaign layout and dropdown interaction defects. The existing hosted product remains a browser-scoped demonstration. Live account activation, identity verification, billing, and provider qualification are separate.

Specification: `library/knowledge/private/ux-ui/03-components/select-and-product-setup.md`. Implemented on the existing dashboard branch and PR 68; no parallel implementation, package upgrade, database migration, customer credential, or provider connection was introduced.

## Security self-review

This is a direct review by the implementing agent, not an independent penetration test.

| Area | Code reviewed and result |
| --- | --- |
| Runtime authority | The server's existing `canRenderDashboardPreview` gate is unchanged. Setup completion and guide progress cannot grant real session, approval, or publishing authority. |
| Saved data | `model.ts` adds a defaulted strict `productSetupSchema`. Existing v1 records retain their campaigns, partners, profile, and stages. `setup-model.ts` validates guide IDs, bounded step positions, and campaign references. The existing storage adapter rejects invalid or failed writes. |
| Guide destinations | `product-guides.ts` derives destinations from fixed page paths and validated campaign references. Guide selectors are source-defined; neither user text nor saved JSON can introduce executable selectors, arbitrary URLs, or scripts. Existing campaign anchors use the canonical registry selector. |
| Actions | `product-walkthrough.tsx` can update guide position, navigate, or focus a control. It never invokes save/approve/publish buttons. `setup-wizard.tsx` performs business edits only through explicit Save & continue actions. Connection review stays distinct from activation. |
| Content | Labels, descriptions, profile previews, and dropdown options render through React. No raw HTML, credentials, payment fields, or external requests were added. |
| Storage failure | Browser tests confirm that a failed write holds the setup step and does not claim completion. Guide replay preserves saved business records and unsaved profile editing. |
| Shared overlays | Select keeps DOM focus on its combobox and places its option list within the nearest modal or product shell. The overlay primitive now yields to keys already handled by nested widgets, so Escape closes the dropdown before its dialog. |

No critical or high issue was found in the changed UI and demo-state boundary. Use fictional details in this deployment. Browser storage is not authenticated shared storage and is not presented as production persistence.

## Quality scorecard

| Axis | Result |
| --- | --- |
| Completeness | Seven setup steps, first-visit welcome, eight walkthroughs, Help access, resume/replay, and campaign handoff are implemented. |
| Correctness | Completion depends on saved profile/brand/routing choices, explicit partner selection or skip, connection review, and a checked, explicitly approved saved campaign. Next alone does not complete business steps. |
| Alignment | Section headings sit inside their borders. Dropdowns share one token-based primitive. The existing product palette, layout hierarchy, user language, and authenticated guide remain in place. |
| Gaps | Live accounts, remote persistence, payment activation, invitations, and real campaign publication remain outside the demo release. Incomplete form edits require Save & continue; Pause setup preserves completed steps. |
| Detrimental patterns | No dependency/version churn, raw color literals, ungoverned controls, or duplicated native product dropdown path was introduced. Obsolete checklist and feature dropdown CSS were removed. |

## Validation evidence

- 1,134 unit, integration, and component tests passed across 118 files.
- Production web build, workspace/tooling type checks, lint, formatting, boundary audit, product-type audit, secret scan, and whitespace checks passed.
- Thirteen browser scenarios passed together locally: the existing dashboard suite plus full first-use setup, pause/reload/resume, explicit approval completion, blocked completion, failed storage, long-list keyboard selection, modal Escape ownership, four-width guide/section clearance, unsaved edit preservation, and light/dark setup accessibility.
- The additional all-eight-walkthrough inventory test passed after final selector qualification. It confirms every tip finds a real control and that walking through approval does not perform approval.
- The strengthened campaign clearance check requires each highlighted control to be visible below the actual header, within the viewport, and outside the helper panel at 1440, 1180, 768, and 390 pixels.
- The hosted verification command runs all fourteen scenarios together after publication. Its deployment identity and result are recorded in PR 68.

Local evidence lives under `test-results/dashboard-preview-local`; hosted evidence uses `test-results/dashboard-preview-live`. Existing screenshot baselines were not overwritten. The broader authenticated/database CI qualification is not claimed by these results.

## Corrections found during testing

The checks caught and resolved an uncontained compact dropdown label expanding the tablet pipeline, Escape closing a parent modal, a selected-step caption below contrast requirements, a side-positioned guide whose target could be below the viewport, and stale partner/connection guide anchors. Source guard findings were resolved through the existing anchor registry and a shared modal selector, not by disabling the guards. UI interaction tests use the app's already-declared DOM test dependencies.

## Deployment and recovery

Deploy to the existing `jonathan-ferrell/operation-automated-lo-web` project. No environment changes are required. The existing explicit preview flags remain in force. Refreshing picks up the new UI and additive setup defaults without deleting local records. The previous Vercel deployment remains available for UI rollback; older source does not understand the newly added setup field, so restoring old source should also provide a schema-compatible reader before preserving active test data is claimed.
