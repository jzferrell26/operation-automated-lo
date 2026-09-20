# Application Shell and Navigation

## Purpose

Present Operation Automated LO as one platform with connected modules. The shell must maintain the active HighLevel location, authenticated identity, role context, readiness state, and navigation position without suggesting access to unauthorized locations.

## Contract

### Desktop

- Fixed deep navy sidebar
- Product mark and name at the top
- Module hierarchy in the middle
- Current location and user identity at the bottom
- Expanded Marketing Suite reveals its sub-navigation
- One selected item uses fill, text weight, and icon treatment

### HighLevel embedded

- Compact icon rail at constrained widths
- Current location remains visible in the page header or accessible account control
- Tooltips and accessible names identify icon-only navigation items
- The shell must not assume third-party cookies are available

### Tablet and mobile

- Tablet uses a collapsible rail.
- Mobile uses a top bar and modal navigation drawer.

Ruled 2026-09-20 by `design-system-guardian`, closing rubric delta D-008 and matching brief section 14: the 1440, 1180, and 768 frames carry one rail and one toggle, not three rail designs. It opens expanded at all three, it collapses to the compact rail at all three, and its collapsed state is not required to persist across a reload. At 768 the expanded rail is 272px and leaves a 496px content column, which is accepted. Forcing the compact rail and hiding the toggle at a constrained frame is a defect against this line.
- Drawer focus is trapped, Escape closes it, background scroll is locked, and focus returns to the trigger.
- Touch targets are at least 44px by 44px.

### Location identity

- A direct-install location does not display an arbitrary tenant switcher.
- An authorized agency user may switch only among installed and authorized locations.
- Location identity comes from the validated session, never a browser-supplied location parameter.

### Roles and restricted navigation

- The shell exposes the validated role context: Loan Officer, Team Member, Agency User, Owner, or Compliance Approver, only where it informs an available action.
- Permission-restricted modules remain understandable without revealing protected records. The restricted state names the required role and a next safe action.
- Plan-restricted and planned modules are visually and semantically distinct. Planned means unavailable, not a disabled operational tool.
- Provider-degraded navigation retains the last safe known state and routes to status details; it must not initiate another uncertain provider write.

### Account control

Recorded 2026-09-20 by the PRD-006d named-state review, finding F-21. The folder named the
identity area and the embedded "accessible account control" but never said where the controls that
act on the session live, so the sign-out control had ended up as the first child of the page.

- The shell owns the session's own controls. Sign out lives in the topbar's account area, beside
  the theme control, at every frame. It never lives inside a page.
- The page's main landmark opens with the page's own title. A control above a page heading is a
  hierarchy defect (brief section 4 and rubric axis 1), whoever put it there.
- The control is the `Button` primitive at its 44 by 44 target with the shared focus ring, and its
  label comes from the copy module (PRD-006b D10's sign-out row, "Sign out").
- It is a plain form post with a hidden session-bound field. No client script is loaded into the
  shell to make one button work, and the control still cannot be pressed from another site.
- A shell with no session renders no account control, and says so in the page instead.

### Theme control

- Light, Dark, and System form one keyboard-accessible segmented control.
- Selection includes a check glyph and fill.
- The control may live in the page header and user menu during the founding release.

### Focus and motion

- Every shell control uses the shared 2px focus ring and 3px offset. Sticky headers, rails, and drawers must not obscure focused content.
- Hover and rail-toggle feedback use `--motion-fast`; drawer and modal navigation uses `--motion-slow`. Reduced motion removes spatial movement or uses opacity-only changes.

## Navigation inventory

- Overview
- Marketing Suite
- Brand Engine
- Partners
- Leads and Pipeline
- Automations
- Reports
- Marketplace
- Settings

Marketing Suite contains Campaigns, Property Sites, PDFs and Creative, Ads Manager, Email and SMS, and Blueprint Templates.

## States

- Default
- Hover
- Keyboard focus
- Selected
- Expanded
- Collapsed
- Permission restricted
- Module not included
- Planned add-on
- Offline or provider degraded

## Reference canvases

- `Overview.dc.html`
- `Overview Responsive.dc.html`
- `Dashboard.dc.html`
- `Welcome.dc.html`
