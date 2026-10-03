# Operation Automated LO Design Brief

## 1. Product identity

Operation Automated LO is an operating layer for mortgage loan officers inside HighLevel. It connects brand management, Realtor partnerships, property marketing, campaign distribution, lead routing, automation, reporting, and future add-ons without attempting to replace HighLevel as the CRM system of record. _(Superseded on 2026-10-01 by PRD-009 (S-45; OD-A, OD-B, OD-H): Automated LO is a marketing toolkit whose core is launching ready-made Facebook ads from one curated, platform-wide ads library; HighLevel stays the system of record for contacts, pipelines, and automations. This sentence is kept as history.)_

The founding product wedge is Open House Boost. Advertising is a capability inside the Marketing Suite, not the identity of the entire platform. _(Superseded on 2026-10-01 by PRD-009 (S-45; OD-H, D-16): "Open House Boost" retires from the product; launching a curated library ad is the founding output, and advertising is the core of the product, not one capability of a suite.)_

## 2. Approved design source

The approved visual baseline is the second Claude Design package supplied on July 20, 2026: _(Superseded on 2026-10-01 by PRD-009 (S-46; OD-E, OD-G): the visual reference is Listing Studio's AutomatedRE layer and the PRD-009 mockups in `library/requirements/<lifecycle>/prd-009-marketing-toolkit/design/mockups/`; the Claude Design package below is history.)_

- Source file: `Cuantico Overview dashboard directions2.zip`
- SHA-256: `E9D7DB67971477D5817A7C75E46103A7D665BB3628044D61BB0227B01BB2A43D`
- Preserved files: [05-html-examples/claude-design](05-html-examples/claude-design)

The package establishes the root Platform Overview, the Marketing Suite campaign dashboard, responsive reference frames, Light and Dark semantic tokens, and the founding campaign workflow. _(Superseded on 2026-10-01 by PRD-009 (S-46): what the package established is history; the PRD-009 mockups are the reference.)_

## 3. Aesthetic anchors

The system combines these approved reference qualities without cloning any product:

- Broker Marketplace: restrained ambient entry motion and premium product presentation _(Superseded on 2026-10-01 by PRD-009 (S-47; OD-E, OD-F): the four anchors give way to the light AutomatedRE look; only Broker Marketplace's calm, one-question start is kept.)_
- UpHex: guided advertising workflow, connection visibility, and clear launch actions
- ListReports: practical property-marketing tools and asset generation
- MyHomeIQ: mortgage-oriented metrics, partner context, and business visibility

The resulting identity is a flat-modern operational interface with a deep navy anchor, cobalt primary actions, restrained teal accents, crisp cards, compact data, and carefully limited atmospheric color. _(Superseded on 2026-10-01 by PRD-009 (S-47; OD-E): the identity is the light look: a very light page, white bordered cards, navy for text only, one action blue `#005fcc`, Inter, and no teal.)_

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

- A generic CRM clone _(Amended on 2026-10-01 by PRD-009 (S-48; OD-A): now a hard rule. The product has no CRM pages: no lead lists, pipelines, contact views, or automations.)_
- A generic AI chatbot
- A crypto or trading dashboard
- A traditional bank portal
- A grid of disconnected marketplace products
- A page of identical cards with equal visual weight
- A glassmorphism demonstration
- A generic generated SaaS template

## 5. Product shell and module hierarchy

The root application shell represents the whole platform. _(Superseded on 2026-10-01 by PRD-009 (S-49; OD-C, OD-D, D-2, D-16): the shell is a light top bar with six items: Home, Campaigns, Brand, Realtor partners, Homeowner reports, and Settings. The Ads library is a tab of Campaigns. The nine-item navigation and the Marketing Suite sub-navigation below are history.)_

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

The campaign dashboard shown in `Dashboard.dc.html` is a Marketing Suite screen. It must not be used as the root Platform Overview. _(Superseded on 2026-10-01 by PRD-009 (S-49): there is no Marketing Suite; results live on each campaign's page.)_

## 6. Root overview purpose

The Platform Overview must answer five questions: _(Superseded on 2026-10-01 by PRD-009 (S-50; OD-F, OD-H): Home is the first-run page of design section 4 and PRD-009b: one question, "Launch an ad", a three-item checklist, and two honest lists. The questions and regions below are history.)_

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
- Automated LO workspace module status _(Superseded on 2026-10-01 by PRD-009 (S-50): the end of the superseded region list.)_

## 7. MVP capability boundaries

The founding interface may represent these core capabilities:

- Self-onboarding _(Superseded in part on 2026-10-01 by PRD-009 (S-51; OD-D, OD-H): curated library ads are the founding output and results live on each campaign's page; the add-ons list after this one stands.)_
- Brand and compliance profile
- Realtor partner profiles
- Open House Boost campaigns _(Superseded on 2026-10-01 by PRD-009 (S-51; OD-H, D-16): campaigns launched from the curated ads library.)_
- Property campaign pages
- PDFs, QR codes, creative, email, and SMS packages
- Deterministic preflight
- Named approvals
- HighLevel-connected Meta publishing
- HighLevel lead routing
- Campaign and outcome reporting _(Superseded on 2026-10-01 by PRD-009 (S-51; OD-D): results per campaign on its own page, not a reporting surface.)_
- AI-assisted brand and campaign drafting _(PRD-009 (S-51): the end of the list it supersedes in part; "PDFs, QR codes, creative, email, and SMS packages" above is no longer founding interface.)_

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

- Canvas: cool neutral background _(Superseded on 2026-10-01 by PRD-009 (S-52; OD-E): the navigation is a light top bar on the card colour, and borders are the depth.)_
- Card: high-contrast contained surface
- Sunken: form wells, grouped controls, and secondary regions
- Navigation: deep navy anchor _(Superseded on 2026-10-01 by PRD-009 (S-52; OD-E): a light top bar, white, with one hairline under it.)_
- Raised: modals, menus, and consequential confirmations

Depth is communicated through border, background contrast, and restrained named shadow tiers. Glass is allowed only on limited entry or overlay surfaces. It is not a general dashboard treatment. _(Superseded on 2026-10-01 by PRD-009 (S-52; OD-E): cards are bordered and carry only a 1px shadow at 4% navy; shadow tiers are not a depth language.)_

## 9. Color contract

All application UI consumes semantic tokens from `01-master-tokens.css`.

- Cobalt is the primary action color. _(Superseded on 2026-10-01 by PRD-009 (S-53; OD-E): one action blue, `#005fcc`.)_
- Teal is a supporting accent, not a second competing call to action. _(Superseded on 2026-10-01 by PRD-009 (S-53; OD-E): teal is retired; `--ac-secondary` is the action blue.)_
- Green means successful or healthy only.
- Amber means warning, attention, stale, or pending.
- Red means blocked, destructive, failed, or critical.
- Blue means informational, generated, processing, or active selection.
- Neutral means draft, inactive, unavailable, or completed where completion is not a live success state.
- Purple is reserved for uncertain provider reconciliation when it must be visually distinguished from ordinary publishing.

Status never depends on color alone. Every status pairs color with text and a glyph or icon.

Tenant branding may override only allowlisted semantic accents. Overrides must define valid Light and Dark values and pass contrast validation.

The focus ring is not one of those accents. Ruled 2026-09-20 with rubric delta D-001: `--focus-color` is its own token per theme, and no tenant value reaches it. The allowlist covers the action fill and the foreground that sits on it, which is what tenant contrast validation measures.

## 10. Typography

- Interface font: Geist, with system sans-serif fallback _(Superseded on 2026-10-01 by PRD-009 (S-54; OD-E): Inter, vendored in `apps/web/public/fonts/`. Monospace survives only inside "Details for support"; numbers and dates use Inter with tabular figures. The steps are 28, 19, 16, 16, 14, and 12px.)_
- Data, provider IDs, versions, hashes, timestamps, and correlation IDs: Geist Mono
- Page title: 23px, weight 700, negative 0.02em tracking
- Section title: 17px, weight 700 _(Superseded on 2026-10-01 by PRD-009 (design `00-direction.md` section 2.3): 19px at weight 600, `--weight-semibold`. Recorded here 2026-10-03 by the PRD-009 scored baseline review (R1-02, R4-09), which found titles no module weighed drawn at the browser's bold; `globals.css` sets the floor on `h2` to `h6`.)_
- Card title: 14px, weight 700 _(Superseded on 2026-10-01 by PRD-009 (design `00-direction.md` section 2.3): 16px at weight 600, `--weight-semibold`. Recorded 2026-10-03 with the section title above.)_
- Body and control: 13px, weight 500 where interactive _(Superseded on 2026-10-01 by PRD-009 (S-54): 16px.)_
- Secondary: 11.5px, weight 400
- Caption and freshness: 10.5px, weight 400 _(Superseded on 2026-10-01 by PRD-009 (S-54): 12px; the end of the superseded steps.)_

Production font delivery must be self-hosted or use the application font pipeline. The preserved canvases' Google Fonts link is reference-only.

## 11. Radius, spacing, and iconography

Approved radius scale:

- Controls: 8px
- Buttons: 10px _(Superseded on 2026-10-01 by PRD-009 (S-55; OD-E): 8px, the same as inputs.)_
- Cards: 12px to 14px _(Superseded on 2026-10-01 by PRD-009 (S-55; OD-E): 12px. Controls, panels, and badges are unchanged.)_
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

- First visit resolves the current operating-system preference. _(Superseded on 2026-10-01 by PRD-009 (S-56; D-5): the first visit is Light, whatever the device prefers. Two lines below is amended too: choosing System now stores `system` and still follows live device changes (009a D4).)_
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

Desktop uses the full navigation sidebar. Embedded layouts use a compact icon rail when necessary. Tablet uses a collapsible navigation rail. Mobile uses a top bar and accessible drawer. _(Superseded on 2026-10-01 by PRD-009 (S-57; D-2): a light top bar: one row at 1440 and 1180, two rows at 768 with the six links on their own row, and at 390 a Menu button that opens the six links in a sheet. The rail, its toggle, and the D-008 ruling below are history.)_

Ruled 2026-09-20 by `design-system-guardian`, closing rubric delta D-008, because "collapsible" left the 1180 and 768 frames open to two readings and the code had carried both:

- The 1440, 1180, and 768 frames all carry the same rail and the same toggle. They are not three rail designs; they are one rail a person can collapse.
- The rail opens expanded at every one of them. The compact rail is a choice a person makes, never the state they have to escape from.
- The consequence, stated rather than discovered: at 768 an expanded 17rem rail is 272px and leaves a 496px content column, and collapsing it to the 5rem compact rail returns the column to 688px. A 496px column still satisfies every rule below, so the cost is accepted.
- The collapsed choice is not required to persist across a reload.
- A fixed compact rail with no toggle at 768 or 1180 is a defect against this section, not an optimization. _(Superseded on 2026-10-01 by PRD-009 (S-57): no rail exists.)_

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
- The focus ring has its own color token per theme and never follows the tenant accent. Ruled 2026-09-20 by `design-system-guardian`, closing rubric delta D-001: the ring resolved from `--ac-primary`, and the Dark default accent measured below the 3.0 non-text floor on five of the ten surfaces a ring can land on. A ring is an accessibility affordance, not a brand surface. It is measured against every surface token in both themes by `apps/web/src/theme/token-contrast.unit.test.ts`, and a tenant accent that fails that sweep is not the ring's problem to absorb.
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
