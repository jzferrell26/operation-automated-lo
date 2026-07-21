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
- Drawer focus is trapped, Escape closes it, background scroll is locked, and focus returns to the trigger.
- Touch targets are at least 44px by 44px.

### Location identity

- A direct-install location does not display an arbitrary tenant switcher.
- An authorized agency user may switch only among installed and authorized locations.
- Location identity comes from the validated session, never a browser-supplied location parameter.

### Theme control

- Light, Dark, and System form one keyboard-accessible segmented control.
- Selection includes a check glyph and fill.
- The control may live in the page header and user menu during the founding release.

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
