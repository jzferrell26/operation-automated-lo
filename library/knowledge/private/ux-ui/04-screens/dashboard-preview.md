# Dashboard preview for product testing

## Purpose and scope

### September 22 product redesign

Jonathan rejected the initial screens and their development-oriented wording. The revised direction keeps the approved navy/cobalt family and replaces the visual hierarchy and presentation of the demo product. The workspace is branded AutomatedLO. Navigation is grouped, uses meaningful icons, and supports quick search. A compact Demo workspace control owns the explanation of local sample data; repeated warning banners, "preview owner", "test inputs", "publishing authority", and browser-storage paragraphs are removed from everyday screens. Consequential actions retain a clear explanation at the point of use.

The overview prioritizes business metrics, a pipeline visualization, actionable follow-up, campaigns, and partner relationships. Settings is an editable company/profile workspace with category navigation and connected-app summaries, not six identical links. Campaigns, partner profiles, lead cards, assets, and reports use purpose-specific layouts. Search, filters, form saving, dialogs, and appearance controls must operate, not merely decorate the page.

Product-specific tokens live in `packages/ui/src/product-tokens.css`, exported as `@oalo/ui/product-tokens.css` and scoped by `data-product-shell` so the authenticated review's existing baseline is unaffected. They define the deep navigation/feature surface, high-contrast action colors, chart colors, 28px page titles, 14px body text, and 12px secondary text. Existing spacing, motion, field, dialog, link, and button primitives remain in use. Both themes, focus/hover states, 390/768/1180/1440 widths, and mobile navigation are verified in the browser. No additional dependencies or paid integrations are introduced.

Jonathan requested the complete dashboard live for visual testing on 2026-09-22. This release uses the existing application shell and the design brief sections 5, 6, 9, 14, 15, and 18. It does not claim the provider system is complete.

The server enables this surface only when `OALO_DASHBOARD_PREVIEW=enabled` and the existing workspace classifier permits a synthetic demo. Review authentication, tenant permissions, and production provider authority remain separate. No preview record is eligible for provider publication.

## Screens

The overview presents business pulse, campaign work, connection readiness, and recent activity in a compact desktop grid. It becomes one column on mobile. Marketing includes campaign browsing and creation, property pages, creative previews, and a clearly disabled ads connection. Partners and leads support search and local test edits; pipeline stages use keyboard-accessible selects. Brand and settings support browser-local preview preferences. Reports explain that every figure is sample data. Planned modules describe their availability without operational controls.

All navigation destinations have an intentional screen. Unknown paths render the not-found screen with noindex. Next.js may send HTTP 200 when the layout has already started streaming. The product homepage opens the overview. Developer acceptance matrices stay on the existing design/demo surfaces, outside this preview's overview.

## Storage and actions

Every product screen includes the compact Demo workspace control. Example campaigns and demo metrics carry a local label when useful. The demo explanation and reset controls are consolidated instead of repeated across every card. Test records live only in this browser, never in an unscoped server filesystem. Local storage is versioned, schema-validated, bounded, and loaded before mutation controls become usable. Storage failure is visible and cannot produce a saved confirmation. Reset requires confirmation and removes only this preview's records.

Campaign checks reuse the existing server compiler and deterministic rules in memory. The preview endpoint is explicitly gated, checks same-origin requests, and bounds body size. Browser campaign approvals are labeled test approvals; they never confer authenticated approval or publish authority. Real authentication, external messaging, ad spend, billing, and invitations are unavailable here.

## Layout correction

`ProductShell` owns the demo main landmark's layout and the generic section's width so dashboard sections can use the available workspace. Public landing pages and the existing authenticated review retain their current layouts and visual baselines. Navigation remains available at all heights: the sidebar's navigation scrolls independently, and the optional promotional card is omitted below 1080px viewport height so the profile controls remain reachable. Scrollable campaign tables establish a positioning context so visually hidden header labels do not expand the document at tablet widths. The Vercel ignore pattern for root reports artifacts is anchored to avoid dropping the application's `/reports` route.

## Validation

The section/dropdown/onboarding update is specified in `../03-components/select-and-product-setup.md`. `/onboarding` now contains a seven-step explicit-save setup journey, with a skippable welcome and persistent Help & setup. Shared `Select` replaces native product dropdowns. The existing guide placement functions are reused, with measured header clearance and a visibility check before side placement. Product guide selection uses fixed IDs and destinations; stored data never supplies executable selectors or external URLs.

Verify desktop, embedded, tablet, mobile, light/dark themes, keyboard-accessible dialogs, route coverage, local persistence after reload, separate browser isolation, blocked approval after failed checks, and zero live provider actions. Keep actual evidence in the release report.
