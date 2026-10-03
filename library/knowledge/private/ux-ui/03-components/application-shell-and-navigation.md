# Application Shell and Navigation

## Purpose

Present Operation Automated LO as one platform with connected modules. The shell must maintain the active HighLevel location, authenticated identity, role context, readiness state, and navigation position without suggesting access to unauthorized locations.

## Contract

### Desktop

- Fixed deep navy sidebar _(Superseded on 2026-10-01 by PRD-009 (S-58; D-2, OD-E): a light top bar; see "The top bar (PRD-009a)" at the end of this file.)_
- Product mark and name at the top
- Module hierarchy in the middle
- Current location and user identity at the bottom
- Expanded Marketing Suite reveals its sub-navigation _(Superseded on 2026-10-01 by PRD-009 (S-58; OD-C, OD-D): there is no Marketing Suite and no sub-navigation.)_
- One selected item uses fill, text weight, and icon treatment

### HighLevel embedded

- Compact icon rail at constrained widths
- Current location remains visible in the page header or accessible account control
- Tooltips and accessible names identify icon-only navigation items
- The shell must not assume third-party cookies are available

### Tablet and mobile

> **Superseded on 2026-10-01 by PRD-009** (S-58; D-2): the collapsible tablet rail, the mobile drawer, and the D-008 ruling below are history. At 768 the top bar takes two rows; at 390 a Menu button opens the six links in the `Sheet` primitive, focus moves into it, and Escape closes it and returns focus to Menu.

- Tablet uses a collapsible rail.
- Mobile uses a top bar and modal navigation drawer.

Ruled 2026-09-20 by `design-system-guardian`, closing rubric delta D-008 and matching brief section 14: the 1440, 1180, and 768 frames carry one rail and one toggle, not three rail designs. It opens expanded at all three, it collapses to the compact rail at all three, and its collapsed state is not required to persist across a reload. At 768 the expanded rail is 272px and leaves a 496px content column, which is accepted. Forcing the compact rail and hiding the toggle at a constrained frame is a defect against this line. _(Superseded on 2026-10-01 by PRD-009 (S-58, S-70): no rail exists.)_
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

### The topbar says that it is sticky

Recorded 2026-09-20 by Wave 7r, closing the reopened 006C-AC-013. The topbar is
`position: sticky` at the block start on every frame, so it holds the first
several rows of the viewport, and anything that scrolls the page has to leave
that space alone: PRD-006c D7 asks that the guided-setup panel never obscure the
focused element or the shell's sticky header. The walkthrough had been scrolling
an anchored element to the 16px viewport margin, which put the first control
inside a tall element underneath the topbar. Measured in the review browser run:
"Dark 1180x900 1. Welcome: a tap at the centre of the element does not reach it
... Received: header.app-shell-module__topbar".

- The topbar carries `data-shell-sticky-header="true"`. It is the shell naming
  its own pinned element, so anything that scrolls the page can measure it
  without reading this file's class names, and a surface without the chrome
  simply finds nothing.
- The guided setup reads it into its placement model as `Viewport.blockStart`
  (`apps/web/src/features/guided-setup/model/panel-placement.ts`). The model
  itself knows nothing about the shell; the attribute is what crosses.
- Nothing in the shell imports the walkthrough or is aware of it, which is the
  same arrangement the "Finish setup" chip and the help menu keep: the shell
  takes them as a slot.

### Theme control

- Light, Dark, and System form one keyboard-accessible segmented control.
- Selection includes a check glyph and fill.
- The control may live in the page header and user menu during the founding release.

### Focus and motion

- Every shell control uses the shared 2px focus ring and 3px offset. Sticky headers, rails, and drawers must not obscure focused content.
- Hover and rail-toggle feedback use `--motion-fast`; drawer and modal navigation uses `--motion-slow`. Reduced motion removes spatial movement or uses opacity-only changes.

## Navigation inventory

> **Superseded on 2026-10-01 by PRD-009** (S-58; OD-C, D-2): the menu is six items, Home, Campaigns, Brand, Realtor partners, Homeowner reports, and Settings, defined once in `MAIN_MENU` (`apps/web/src/features/shell/model/navigation.ts`). The nine items and the Marketing Suite list below are history.

- Overview
- Marketing Suite
- Brand Engine
- Partners
- Leads and Pipeline
- Automations
- Reports
- Marketplace
- Settings

Marketing Suite contains Campaigns, Property Sites, PDFs and Creative, Ads Manager, Email and SMS, and Blueprint Templates. _(Superseded on 2026-10-01 by PRD-009 (S-58): the end of the superseded inventory.)_

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

## The top bar (PRD-009a)

Recorded 2026-10-01 by `ux-ui-guardian` for PRD-009a (owner decisions OD-C and OD-E, design
answer D-2 "Yes, as shown"). This section governs the shell; the rail, drawer, and nine-item
inventory above are superseded in place and kept as history. Visual reference: the PRD-009
mockups, `library/requirements/<lifecycle>/prd-009-marketing-toolkit/design/mockups/` and their
previews (design `00-direction.md` section 2.1).

### Contract

- One `<header>` on every signed-in page: the "Automated LO" wordmark (an initials tile and the
  name) linking Home, a `<nav>` named "Main" with the six items, Help, and the account control.
  A skip link ("Skip to content") comes first and lands on `#main-content`.
- The six items, in this order, at today's addresses: Home `/overview`, Campaigns
  `/marketing/campaigns`, Brand `/brand`, Realtor partners `/partners`, Homeowner reports
  `/homeowners`, Settings `/settings`. They are defined once, in `MAIN_MENU`
  (`apps/web/src/features/shell/model/navigation.ts`), and the review shell, the synthetic shell,
  and the dashboard preview all read it. The Ads library is a tab of Campaigns, not a menu item.
- Homeowner reports is listed for every account. `projectNavigationForSession` still decides
  access from the session's capabilities (`reports:read`, and `settings:read` for Settings): a
  role without access sees the same six labels, and the restricted one is text with a lock and its
  reason (the reason is its accessible description, shown on hover and keyboard focus in the bar
  and always in the Menu sheet).
- The current page: `aria-current="page"`, a `--st-info-bg` tint, `--tx-on-nav` text, and
  `--weight-semibold`. The mark is never colour alone.
- The account control holds the person's name, their role and workspace, the Light/Dark/System
  choice (`ThemeControl`), and Sign out (a plain form post). It states who is signed in and
  nothing else: no connection clause. It opens as a `Sheet` aligned to the bar's end edge.
- No shell-wide not-connected banner (D-11). Connection facts are stated once, where they matter.
  The local synthetic demo keeps one sample-data line in the top bar region (009a D3).

### Frames

| Frame | The bar |
|---|---|
| 1440, 1180 | One row: wordmark, menu, Help, account. The menu's box never overlaps the account cluster. |
| 768 | Two rows: wordmark and the account cluster first, the six links on their own row under a hairline. |
| 390 | A "Menu" button, the name, Help as an icon with its name kept for assistive technology, and the account initials. Menu opens the six links in the `Sheet` primitive (a bottom sheet at this frame); focus moves into it, and Escape closes it and returns focus to Menu. |

No frame scrolls sideways, and every control in the bar is at least `--target-min-size` (44px)
tall at every frame, not only on touch.

### The page column and its rhythm

The shell's `main` is the mockups' `.page` (`home-first-run.html:179` and `:420`): a `--content-max`
column, centred, on `padding: var(--space-8)` above 720px and `padding: var(--space-6) var(--space-4)`
below it, and the blocks it stacks (the unverified-email notice, then the page) stand one page gap
apart: `row-gap: var(--space-6)` above 720px, `var(--space-5)` below it. A page's own top-level
blocks (the page head, then the cards) follow the same two values in the page's module, and its
`padding="lg"` cards inset `--space-6`, then `--space-5` below 720px (see
[card-and-surface.md](card-and-surface.md)). The 719.98px edge is the same for all four, so the
column edge, the gap and the card inset change at one width.

_(Recorded 2026-10-03 by the PRD-009 scored baseline review, pass 2, R4-13: the shell kept
`--space-6` at 390, so a notice stood 24px above the page where the mockup draws 20px.)_

### Tokens

`--sf-nav` (white in Light, `#1b1e25` in Dark), `--tx-on-nav`, `--bd-hairline` under the bar,
`--topbar-height` (4rem) for the first row, and `--content-max` (75rem) for the bar's inner
measure and the page column. The page reserves the bar's height as scroll padding
(`html { scroll-padding-block-start }` in `globals.css`), so a focused control is never under it.

### Tests

`apps/web/src/features/shell/components/app-shell.integration.test.tsx`,
`apps/web/src/app/(authenticated)/top-bar-menu.integration.test.tsx`,
`apps/web/src/features/shell/model/navigation.unit.test.ts`, and
`tests/browser/ui-foundation-ux.spec.ts` (the four frames, the 44px heights, axe in Light and
Dark).
