# Campaign studio: Home and property preparation

Owner direction: improve the half-finished UX/UI and make the product visually compelling. First increment, October 6, 2026. Base `0d2187a5`, after merged PR #79. Chief implements and reviews directly; no subagents.

## 1. Scope and visual hierarchy

Home leads with the actual property-campaign capability: one property and partner can become a saved private page, flyer, QR and copy package. A two-column feature panel pairs the primary action with an original abstract document composition. A small private-draft notice states the boundary without competing with the headline. No photo import, financing calculation, public domain connection or five-funnel availability is implied.

The loan officer's next action is unmistakable. Creation-authorized roles see the property creation link; other roles see their campaign list. Existing ad selection, saved connection states, running campaigns and approvals remain below. Advertiser setup is not a prerequisite for preparing a private property draft. Property branding and partner requirements are explained by the actual preparation page. On phones, collapse the decorative paper stack to its compact four-output strip instead of making the customer scroll through a full screen of illustration.

Keep the existing top bar, current palette, Inter and 44px controls. Use `--sf-card`, `--st-info-bg`, `--bd-hairline`, `--tx-strong`, `--tx-body`, `--ac-primary` and existing hover/focus tokens. The static document illustration may use `--shadow-raised`; other cards do not acquire arbitrary shadow tiers. No new external library, webfont, stock photograph or continuous motion. One new type token, `--text-display-size: 2.5rem`, is mirrored between canonical and shipped tokens and restricted to the desktop studio heading. At 390px it uses `--text-page-size`.

## 2. Property form

Give the existing form a clear details-to-materials sequence without creating fake completed steps or hiding all inputs behind a wizard. Group facts, event times and permissions with visible section markers. Display a responsive summary of the user's entered address, description, chosen saved Realtor and saved brand beside the form on wide screens and after the form on smaller screens. It is explicitly an unsaved summary, not a generated artifact or a claimed final visual preview.

No additional data request, browser persistence or autosave is added. Fields remain local to the existing form state. All existing validation, server-owned identity, retries, pending-state prevention and permission clearing on partner changes remain unchanged. Missing brand or partner setup is visible with a recovery link. An uncertain save preserves the inputs and retry key. A read-only role never gets an enabled save action.

## 3. Verification and acceptance

| ID | Required evidence |
| --- | --- |
| UX-001 | Home has one h1 and one visually primary next action. The existing ad path remains accessible; role-based links never claim creation authority the server denies. |
| UX-002 | The property path is discoverable without a URL from support. The feature panel names only implemented private outputs and shows no fabricated financial or conversion data. |
| UX-003 | The form summary reflects real local field values and the selected saved partner; changing a partner clears the existing identity permission. No additional persistence or network side effect occurs while typing. |
| UX-004 | Pending/failed saves preserve the original behavior and input. Missing setup and read-only states remain truthful and actionable. |
| UX-005 | Home and the form render at 1440, 1180, 768 and 390px in Light and Dark without clipped controls, overlapping text or horizontal scroll. Each has zero axe violations and visible keyboard focus. |
| UX-006 | Reduced motion and 200% zoom remain usable. The illustration is decorative, uses no fake working QR, and does not duplicate text in the accessibility tree. |
| UX-007 | Existing provider, no-CRM, saved-data and approval tests pass. Screenshot updates are limited to intended screen changes and captured on the canonical Linux platform. |

## 4. Release boundary

This increment changes UI and a server-derived presentation capability, not database permissions, billing, provider activation, financial logic, DNS or public publication. It does not complete the financing report or five-funnel delivery. Future report/flyer/site work should follow the same output-first hierarchy, reusable brand system, typed data and clear next-action conventions. Owner visual approval is separate from automated and self-reviewed evidence.
