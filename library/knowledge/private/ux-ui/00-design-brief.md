# Operation Automated LO Design Brief

## 1. Product identity

Operation Automated LO is an operating layer for mortgage loan officers inside HighLevel. It connects brand management, Realtor partnerships, property marketing, campaign distribution, lead routing, automation, reporting, and future add-ons without attempting to replace HighLevel as the CRM system of record.

The founding product wedge is Open House Boost. Advertising is a capability inside the Marketing Suite, not the identity of the entire platform.

## 2. Approved design source

The approved visual baseline is the second Claude Design package supplied on July 20, 2026:

- Source file: `Cuantico Overview dashboard directions2.zip`
- SHA-256: `E9D7DB67971477D5817A7C75E46103A7D665BB3628044D61BB0227B01BB2A43D`
- Preserved files: [05-html-examples/claude-design](05-html-examples/claude-design)

The package establishes the root Platform Overview, the Marketing Suite campaign dashboard, responsive reference frames, Light and Dark semantic tokens, and the founding campaign workflow.

## 3. Aesthetic anchors

The system combines these approved reference qualities without cloning any product:

- Broker Marketplace: restrained ambient entry motion and premium product presentation
- UpHex: guided advertising workflow, connection visibility, and clear launch actions
- ListReports: practical property-marketing tools and asset generation
- MyHomeIQ: mortgage-oriented metrics, partner context, and business visibility

The resulting identity is a flat-modern operational interface with a deep navy anchor, cobalt primary actions, restrained teal accents, crisp cards, compact data, and carefully limited atmospheric color.

## 4. Aesthetic boundaries

The interface must feel:

- Trustworthy
- Capable
- Modern
- Calm under pressure
- Premium without luxury signaling
- Marketing-aware without visual noise
- Compliance-aware without resembling a legal portal

The interface must not feel like:

- A generic CRM clone
- A generic AI chatbot
- A crypto or trading dashboard
- A traditional bank portal
- A grid of disconnected marketplace products
- A page of identical cards with equal visual weight
- A glassmorphism demonstration
- A generic generated SaaS template

## 5. Product shell and module hierarchy

The root application shell represents the whole platform.

Primary navigation:

1. Overview
2. Marketing Suite
3. Brand Engine
4. Partners
5. Leads and Pipeline
6. Automations
7. Reports
8. Marketplace
9. Settings

Marketing Suite sub-navigation:

- Campaigns
- Property Sites
- PDFs and Creative
- Ads Manager
- Email and SMS
- Blueprint Templates

The campaign dashboard shown in `Dashboard.dc.html` is a Marketing Suite screen. It must not be used as the root Platform Overview.

## 6. Root overview purpose

The Platform Overview must answer five questions:

1. Is the customer ready and connected?
2. What requires attention?
3. What changed in the business?
4. What is the next safe action?
5. Which modules are available, active, blocked, or planned?

The root overview remains useful when no advertisement is active. Spend and cost per lead belong to Marketing Suite and must not dominate the platform home.

Required overview regions:

- Business and system status
- Authorized quick actions
- Business pulse
- Active work across modules
- Cross-system attention queue
- Recent cross-system activity
- Automated LO workspace module status

## 7. MVP capability boundaries

The founding interface may represent these core capabilities:

- Self-onboarding
- Brand and compliance profile
- Realtor partner profiles
- Open House Boost campaigns
- Property campaign pages
- PDFs, QR codes, creative, email, and SMS packages
- Deterministic preflight
- Named approvals
- HighLevel-connected Meta publishing
- HighLevel lead routing
- Campaign and outcome reporting
- AI-assisted brand and campaign drafting

Future add-ons may appear only as clearly labeled planned or unavailable modules:

- Custom domains and advanced analytics
- Expanded Realtor workspace
- Additional blueprint packs
- Financing-scenario tools
- Homeowner intelligence
- Refinance signals
- Agency portfolio management
- Advanced creative media packs

The interface must not imply that an unbuilt or commercially unverified add-on is operational.

## 8. Surface metaphor and depth

The primary metaphor is a crisp operational workspace.

- Canvas: cool neutral background
- Card: high-contrast contained surface
- Sunken: form wells, grouped controls, and secondary regions
- Navigation: deep navy anchor
- Raised: modals, menus, and consequential confirmations

Depth is communicated through border, background contrast, and restrained named shadow tiers. Glass is allowed only on limited entry or overlay surfaces. It is not a general dashboard treatment.

## 9. Color contract

All application UI consumes semantic tokens from `01-master-tokens.css`.

- Cobalt is the primary action color.
- Teal is a supporting accent, not a second competing call to action.
- Green means successful or healthy only.
- Amber means warning, attention, stale, or pending.
- Red means blocked, destructive, failed, or critical.
- Blue means informational, generated, processing, or active selection.
- Neutral means draft, inactive, unavailable, or completed where completion is not a live success state.
- Purple is reserved for uncertain provider reconciliation when it must be visually distinguished from ordinary publishing.

Status never depends on color alone. Every status pairs color with text and a glyph or icon.

Tenant branding may override only allowlisted semantic accents. Overrides must define valid Light and Dark values and pass contrast validation.

## 10. Typography

- Interface font: Geist, with system sans-serif fallback
- Data, provider IDs, versions, hashes, timestamps, and correlation IDs: Geist Mono
- Page title: 23px, weight 700, negative 0.02em tracking
- Section title: 17px, weight 700
- Card title: 14px, weight 700
- Body and control: 13px, weight 500 where interactive
- Secondary: 11.5px, weight 400
- Caption and freshness: 10.5px, weight 400

Production font delivery must be self-hosted or use the application font pipeline. The preserved canvases' Google Fonts link is reference-only.

## 11. Radius, spacing, and iconography

Approved radius scale:

- Controls: 8px
- Buttons: 10px
- Cards: 12px to 14px
- Large panels and modals: 16px
- Status badges: pill only when the compact status shape is useful

Approved spacing scale:

- 4px
- 8px
- 12px
- 16px
- 20px
- 24px
- 32px

Icons use a consistent Lucide-compatible outline language:

- Stroke: 1.5px
- Sizes: 16px, 20px, and 24px
- Decorative icons are hidden from assistive technology.
- Semantic icons receive an accessible label through their control or surrounding text.
- Feature code consumes a product Icon wrapper, not raw library imports.

## 12. Motion

Named motion buckets:

- Fast: 120ms for hover, press, and toggle feedback
- Base: 180ms for tabs, badges, small reveals, and state changes
- Slow: 240ms for drawers, modals, and theme transitions

Ambient motion is limited to Welcome and installation surfaces. Operational dashboards, tables, reports, campaign editing, approvals, and metrics must not contain continuously drifting decoration.

Every motion path honors `prefers-reduced-motion`. Reduced motion removes ambient animation and converts spatial transitions to immediate or opacity-only changes.

## 13. Light, Dark, and System themes

The authenticated product supports Light, Dark, and System preferences.

- First visit resolves the current operating-system preference.
- Light or Dark manual selection persists for the current user.
- System clears the manual override and follows live preference changes.
- Theme changes apply without reload, navigation, data refetch, or state loss.
- Theme applies before first paint.
- Native controls receive the correct `color-scheme`.
- Every control and state must work in both themes.

Dashboard theme never changes:

- Public campaign pages
- PDFs
- QR destinations
- Meta creative
- Approved artifact hashes
- Campaign approvals

Those outputs render from approved tenant brand and artifact versions.

## 14. Responsive and embedded behavior

Required reference widths:

- 1440px desktop
- 1180px HighLevel embedded view
- 768px tablet
- 390px mobile

Desktop uses the full navigation sidebar. Embedded layouts use a compact icon rail when necessary. Tablet uses a collapsible navigation rail. Mobile uses a top bar and accessible drawer.

Responsive rules:

- Right-side panels move below primary content when width is constrained.
- Metrics wrap in an intentional priority order.
- Tables become labeled cards or explicitly scrollable data regions.
- Forms become one column.
- Sticky actions never cover fields, errors, or safe-area insets.
- Approval and publish context remains visible near the action.
- Touch targets are at least 44px by 44px for the supported mobile experience.

## 15. Operational truth and safe actions

The interface must never promise provider behavior that has not been verified.

- Special Ad Category is policy-controlled and blueprint-specific. Do not hardcode one universal category.
- An uncertain provider write enters `uncertain_reconciling` and blocks another write until read-back completes.
- Do not claim every failed provider operation rolls back cleanly.
- Do not expose delete, audience upload, lookalike, protected targeting, ZIP targeting, Google Ads, LinkedIn Ads, Meta disconnect, or automatic budget and targeting optimization.
- Pause and resume require explicit confirmation.
- Material edits create a new campaign version and invalidate affected approvals.

Every disabled consequential action explains why it is disabled and gives the next safe action.

## 16. Data, freshness, and missing values

Every externally sourced metric displays its source and freshness.

- Missing data is `Unavailable`, never zero.
- Test leads are excluded and labeled.
- Stale data is distinct from missing data.
- Partial and uncertain results are visible.
- Cross-tenant or unauthorized data is never represented, even as a placeholder.
- Provider identifiers are shown only where useful and permitted.

## 17. AI interaction

AI appears as an inline assistive capability, not the primary navigation model.

Allowed interaction patterns:

- Draft from approved samples
- Suggest campaign copy
- Rewrite within confirmed brand rules
- Generate approved-scope alternatives

AI output remains an untrusted suggestion until a user accepts it and deterministic preflight passes.

AI cannot:

- Confirm identity or licenses
- Approve compliance fields
- Waive preflight findings
- Approve a campaign
- Select prohibited targeting
- Publish an advertisement
- Change a live budget
- Override a blocked state

Customer usage is expressed as included campaign generations, regenerations, and campaign packs, not raw token billing.

## 18. Accessibility baseline

- Meet WCAG AA contrast in Light and Dark themes.
- Preserve visible keyboard focus with a 2px ring and 3px offset.
- Ensure focus is not obscured by sticky headers, drawers, or footers.
- Do not require drag-only interaction.
- Provide accessible names for icon-only controls.
- Pair status color with text and shape.
- Provide keyboard and screen-reader behavior for segmented controls, tabs, menus, dialogs, drawers, data tables, and campaign steppers.
- Use concise inline errors connected to the affected field.
- Provide accessible authentication without cognitive-function tests.

## 19. Source canvas limitations

The preserved `.dc.html` canvases contain inline styles, raw colors, static fixture data, placeholder images, and reference-only external font links. These are acceptable inside the preserved design artifact and forbidden as a production implementation strategy.

Before a screen ships, engineering and `ux-ui-guardian` must verify:

- Semantic token use
- Product component wrappers
- Light and Dark behavior
- Embedded and mobile composition
- All interactive states
- Accessibility
- Provider and compliance truth
- Acceptance criteria from the relevant PRD

## 20. Change control

System-level changes to aesthetic, module hierarchy, token architecture, or library posture require `design-system-guardian` review and an update to this brief.

Normal screen and component evolution is owned by `ux-ui-guardian`. Each implementation review must cite this brief or the applicable component and screen specification.
