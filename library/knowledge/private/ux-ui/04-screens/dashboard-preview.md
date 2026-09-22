# Dashboard preview for product testing

## Purpose and scope

Jonathan requested the complete dashboard live for visual testing on 2026-09-22. This release uses the existing application shell and the design brief sections 5, 6, 9, 14, 15, and 18. It does not claim the provider system is complete.

The server enables this surface only when `OALO_DASHBOARD_PREVIEW=enabled` and the existing workspace classifier permits a synthetic demo. Review authentication, tenant permissions, and production provider authority remain separate. No preview record is eligible for provider publication.

## Screens

The overview presents business pulse, campaign work, connection readiness, and recent activity in a compact desktop grid. It becomes one column on mobile. Marketing includes campaign browsing and creation, property pages, creative previews, and a clearly disabled ads connection. Partners and leads support search and local test edits; pipeline stages use keyboard-accessible selects. Brand and settings support browser-local preview preferences. Reports explain that every figure is sample data. Planned modules describe their availability without operational controls.

All navigation destinations have an intentional screen. Unknown paths render the not-found screen with noindex. Next.js may send HTTP 200 when the layout has already started streaming. The product homepage opens the overview. Developer acceptance matrices stay on the existing design/demo surfaces, outside this preview's overview.

## Storage and actions

Every screen is labeled as a product preview with sample data. Test records live only in this browser, never in an unscoped server filesystem. Local storage is versioned, schema-validated, bounded, and loaded before mutation controls become usable. Storage failure is visible and cannot produce a saved confirmation. Reset requires confirmation and removes only this preview's records.

Campaign checks reuse the existing server compiler and deterministic rules in memory. The preview endpoint is explicitly gated, checks same-origin requests, and bounds body size. Browser campaign approvals are labeled test approvals; they never confer authenticated approval or publish authority. Real authentication, external messaging, ad spend, billing, and invitations are unavailable here.

## Layout correction

The preview shell owns the main landmark's layout. Its explicit `dashboardPreview` prop overrides the bootstrap grid's centering and the generic section's 44rem cap so dashboard sections can use the available workspace width. Public landing pages and the existing authenticated review retain their current layouts and visual baselines. Sidebar controls use the navigation foreground in preview mode. The Vercel ignore pattern for root reports artifacts is anchored to avoid dropping the application's `/reports` route.

## Validation

Verify desktop, embedded, tablet, mobile, light/dark themes, keyboard-accessible dialogs, route coverage, local persistence after reload, separate browser isolation, blocked approval after failed checks, and zero live provider actions. Keep actual evidence in the release report.
