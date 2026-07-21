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

Optional setup guidance is separate from the checklist and has a clearly named Dismiss optional guidance control. Dismissal leaves both checklist phases, every item, and their progress visible. UI Foundation evidence keeps this state in the current client session only and does not claim cross-device persistence.

## Connections and permissions

The permission screen groups capabilities by business purpose and visibly distinguishes Required, Granted, Missing, and Optional with text and glyphs. Each capability names its purpose, current evidence, business impact, and next safe action. Missing required core access blocks Launch Ready, while missing optional access cannot be presented as a required blocker.

The screen exposes no raw token, OAuth secret, customer identifier, or inaccessible provider value. Synthetic evidence uses an internal return path and performs no reconnect or provider request.

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

### Canonical Open House Boost profile

Brand Engine presents one current canonical profile for the active location. Campaign creation reuses its confirmed identity, license, disclosures, links, approved assets, and brand values instead of collecting them again. A required-field summary names every missing Open House Boost value with its reason and next safe action. Profile completion does not claim legal approval.

### AI-assisted profile draft

Approved synthetic marketing samples may produce suggestions only for voice, tone, phrasing pattern, framework, signature language, and banned language. Each suggestion displays its source sample and a `needs confirmation` state. Accept suggestion stages that one field in a local profile draft and announces the result. It does not change the current canonical profile, approve a profile section, or perform a model or provider request.

Identity, company, NMLS, license, lender, disclosure, rate, proof, consent, partner permission, routing, and provider selections remain outside the AI acceptance surface. The screen names those protected field groups explicitly so suggestion-only behavior is not confused with factual confirmation.

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
