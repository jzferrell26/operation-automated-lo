# Onboarding, Brand, and Platform Settings

## Onboarding

The onboarding command center has two phases.

Get Connected:

1. Install and permissions
2. Brand and compliance
3. HighLevel routing
4. Meta connection
5. Team responsibilities

Launch Readiness:

1. Dependency recheck
2. Synthetic lead
3. Results review
4. Launch Ready

Each item supports not started, in progress, blocked, complete, and stale. Completion comes from server-verified evidence, not browser state.

Use `OnboardingChecklist` for the five Get Connected items and four Launch Readiness items. Each shows its validated responsible role, evidence freshness, state glyph and text, and next safe action. Synthetic lead is explicitly synthetic, excluded from business metrics and production routing, and cannot create a false production-success claim. Launch Ready is server-verified only.

## Brand Engine

Required brand and compliance sections:

- Public identity
- Licenses and NMLS
- Brand assets
- Voice and messaging
- Approved proof points
- Banned phrases
- Disclosures
- Consent language
- Approved links
- Email identity
- Marketing samples
- Version history

AI suggestions require field-level confirmation. Human-verified identity, license, lender, disclosure, consent, and compliance values cannot be approved by AI.

Permission-restricted users never receive protected brand or compliance data as placeholders. The state names the required role, reason, and next safe action. Loading, empty, error, degraded, and permission-restricted regions use `AsyncState`; unavailable, stale, partial, and uncertain values retain source and freshness rather than presenting zero.

## Platform settings scope

The full platform design must add or maintain specifications for:

- Realtor Partners
- Connections and Permissions
- Leads and Pipeline
- Automations
- Reports
- Support and Exceptions
- Team and Roles
- AI Usage and Billing
- Theme and Account Settings
- Marketplace module status

These surfaces must use the same application shell, status taxonomy, semantic tokens, responsive behavior, and safe-action rules.

At 1180px, keep each checklist phase, current blocker, and next safe action visible while secondary evidence may compact. At 390px, use one column, place the next safe action before optional evidence, and preserve 44 by 44px targets. Focus uses the shared ring and cannot be obscured by sticky actions. Motion uses named buckets only, with immediate or opacity-only reduced-motion behavior.

## Design completion status

The preserved Claude package provides detailed canvases for Onboarding and Brand. The remaining platform settings surfaces are approved scope but still require dedicated canvases or implementation-ready screen specs before production UI work begins.

## Reference canvases

- `Welcome.dc.html`
- `Onboarding.dc.html`
- `Brand.dc.html`
- `Overview.dc.html`
- `Design System.dc.html`
