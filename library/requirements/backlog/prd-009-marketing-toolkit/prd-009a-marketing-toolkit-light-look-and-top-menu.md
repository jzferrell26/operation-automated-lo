# PRD-009a: Marketing Toolkit - The Light Look and the Top Menu

> **Parent:** [PRD-009](./prd-009-marketing-toolkit-index.md)
> **Status:** Backlog. Authored 2026-10-01; checked against OD-H the same day (the look and the menu are unchanged; only the register row numbers moved). Not started.
> **Priority:** P0. Every other sub-PRD renders inside the shell this one rebuilds.
> **Schema changes:** None
> **Owner Guardians:** `ux-ui-guardian` (tokens, shell, the `ux-ui/` amendment); `react-guardian` (the shell component and navigation sources); `typography-font-guardian` (Inter); `dark-mode-theming-guardian` (the first-visit theme)

## Goal

The signed-in product looks like the light AutomatedRE look the owner chose (OD-E) and is navigated from a light top bar with six items (OD-C, D-2):

- token values change, token names do not, so components keep consuming the same names;
- the action blue is `#005fcc` everywhere, including through the tenant accent;
- Inter is the interface font, vendored with its licence;
- Light is what a first visit shows, and the Light/Dark/System control stays;
- the top bar works at 1440, 1180, 768, and 390;
- the shell-wide not-connected banner and the account card's repeat of it are gone;
- `library/knowledge/private/ux-ui/` says all of this, with dated supersession notes.

## Background (honest)

1. **Tokens.** The values live in `packages/ui/src/tokens.css` (`:root` at line 5, `[data-theme="dark"]` at line 125; for example `--sf-nav: #0e1730` at :12, `--ac-primary: #2f6fed` at :27, `--ac-secondary: #2b9d8f` at :30, `--font-interface` at :77, `--font-data` at :79). The knowledge mirror `library/knowledge/private/ux-ui/01-master-tokens.css` carries the same tokens (`:root` at :109, dark at :196, and a `prefers-color-scheme` block at :242 that the shipped file does not need). No test compares the two files today.
2. **The old blue survives a token change.** `apps/web/src/app/globals.css:33-43` sets `--ac-primary`, `--ac-primary-hover`, and `--tx-on-action` from `--tenant-accent-*` whenever `data-tenant-accent` is set, and the default catalog entry in `apps/web/src/theme/tenant-accent.ts:15-27` is Light `#2f6fed` / `#1f4bb8`. Changing `tokens.css` alone leaves the old cobalt on every action.
3. **No font file exists.** `apps/web/public/fonts/` holds only `README.md`, whose 2026-09-19 ruling ships the system stack until a Geist binary and its licence are vendored. The browser gate in `tests/browser/ui-foundation-ux.spec.ts:21-25` aborts every request whose origin is not the application, so the font must be self-hosted. The design chose Inter (design `00-direction.md` section 2.2). Its upstream licence file (`github.com/rsms/inter`, `LICENSE.txt` on the default branch, read 2026-10-01) is the SIL Open Font License 1.1, copyright "The Inter Project Authors", with no Reserved Font Name. The vendoring lane re-reads the licence in the exact release it vendors.
4. **First visit follows the device.** `apps/web/src/theme/theme-bootstrap.ts:10` resolves to the operating-system preference when nothing is stored, and choosing System removes the stored key (`apps/web/src/theme/theme-preference.ts:23-26`). So a device set to dark shows Dark first, against D-5.
5. **The shell is a fixed dark rail.** `.desktopSidebar` is `position: fixed; inset-block: 0` with `inline-size: 17rem` on `--sf-nav` (`apps/web/src/features/shell/components/app-shell.module.css:8-22`). The shell renders a not-connected `<aside>` on every page (`app-shell.tsx:140-158`) and an "Expand Marketing" toggle (`app-shell.tsx:256`). The account line is `SIGNED_IN_SOURCE`, "Signed in with your email. HighLevel, Meta, and Stripe aren't connected yet." (`apps/web/src/copy/user-language.ts:142-143`).
6. **A second token file overrides the first on four of the six menu pages.** `packages/ui/src/product-tokens.css` re-declares global tokens on `[data-product-shell="true"]`: `--text-body-size: 0.875rem` (`:6`), `--text-section-size: 1.0625rem` (`:4`), `--ac-primary: #2856d9` with its hover and active (`:10-12`), and, in its Dark block (`:40-51`), `--sf-canvas`, `--sf-card`, `--sf-sunken`, `--tx-*`, `--bd-hairline`, `--bd-input`, and `--ac-primary*`. It is loaded by `apps/web/src/features/workspace/workspace-screen.tsx` (every catch-all page: Realtor partners, Settings and its sub-pages, and Brand in review mode), `apps/web/src/features/homeowners/workspace.tsx`, `shared-report.tsx`, `shared-report-unavailable.tsx`, and `apps/web/src/features/dashboard-preview/product-shell.tsx`. `apps/web/src/theme/type-tokens-defined.unit.test.ts:20` excludes those features from the defined-token check because "their tokens come from that file". Changing `tokens.css` alone would leave those pages with the old blue, 14 px body text, and the old Dark surfaces.
7. **The menu is built in three places.** The base items and the Marketing Suite sub-items come from `apps/web/src/fixtures/ui-foundation/synthetic-ui.ts:33-123`; `apps/web/src/features/workspace/navigation.ts:10-28` relabels some of them in the reports workspace; `apps/web/src/app/(authenticated)/layout.tsx:161-177` adds "Homeowner reports" only when `OALO_HOMEOWNER_REPORTS === "enabled"`. The local dashboard preview has its own list in `apps/web/src/features/dashboard-preview/product-shell.tsx:14-36`, including Leads and pipeline, Reports, Automations, and Getting started.

## Scope

- `packages/ui/src/tokens.css`, `packages/ui/src/tokens.ts`, `packages/ui/src/product-tokens.css`, and `library/knowledge/private/ux-ui/01-master-tokens.css`.
- `apps/web/src/theme/**` (tenant accent, theme bootstrap and preference, contrast and token tests).
- `apps/web/public/fonts/**` and the `@font-face` block in `apps/web/src/app/globals.css`.
- `apps/web/src/features/shell/**`, `apps/web/src/app/(authenticated)/layout.tsx`, the navigation sources named in Background 7, and their tests.
- The dashboard preview's shell and walkthrough: `apps/web/src/features/dashboard-preview/product-shell.tsx` (its menu, and its mounts of the walkthrough and setup welcome), `product-help.tsx` (its links into the walkthrough guides), and `product-walkthrough.tsx` and `product-guides.ts` (removed). The preview's screens and its `setup-wizard.tsx` belong to 009f; the orchestrator merges this lane and 009f's Wave 1 code lane together, because this lane removes the shell's import of a file 009f deletes.
- `library/knowledge/private/ux-ui/**` (the dated supersession notes for the register rows that live there).

## Non-Goals

- Page compositions. Home is 009b, the launch flow 009d, the campaign page and list 009e.
- Removing pages and routes. That is 009f; this sub-PRD only stops linking to them.
- Revising `apps/web/src/copy/user-language.ts`. 009f owns that file; this lane stops rendering the banner constants and leaves their deletion to 009f.
- Redesigning the local dashboard preview's own screens. It gets the tokens, which are global, and the six-item menu; its screen compositions stay.
- A product logo. The wordmark ships (D-14); a supplied logo is a later swap.
- Subsetting or otherwise modifying the font. The upstream file is vendored unmodified.

## Design decisions

### D1. Values from the design table are normative

The Light values in [`design/00-direction.md`](design/00-direction.md) section 2.4 and the four Dark changes in section 2.6 are the specification. The lane does not re-derive them. Where a value cannot pass the contrast test (009A-AC-003), the lane stops and records the conflict in this file's Amendments rather than choosing a new value alone.

### D2. One menu definition

The six items (Home `/overview`, Campaigns `/marketing/campaigns`, Brand `/brand`, Realtor partners `/partners`, Homeowner reports `/homeowners`, Settings `/settings`) are defined once and read by the review shell, the synthetic shell, and the dashboard preview shell. The labels are the owner's ("Yes, as shown"). The addresses are today's (D-12). Homeowner reports is listed for every account regardless of `OALO_HOMEOWNER_REPORTS` (D-4), and the existing role projection (`projectNavigationForSession`, capability `reports:read`) still decides whether a given role sees it. The Ads library is a tab inside Campaigns (009c), not a menu item, so the approved menu does not change under OD-H (D-16).

### D3. The synthetic demo keeps one sample-data line

D-11 removes the not-connected banner because the signed-in product must state connection facts once, where they matter. The local synthetic demo is different: it shows sample figures, and the user-language contract requires sample data to be labelled (section 4, "sample data (local demo only)"). So review mode renders no banner, and synthetic mode renders one short sample-data line in the top bar region and nothing else.

### D4. Light on first visit, System kept honest

With nothing stored, the bootstrap resolves Light whatever the device says (D-5). Choosing System now stores `system` instead of clearing the key, so the person's choice survives reloads and System still follows live device changes. Light and Dark persist as today.

### D5. One token source for every page

`product-tokens.css` stops re-declaring global tokens. Its `[data-product-shell]` block keeps only the `--product-*` and print names; it no longer sets `--ac-primary*`, `--text-*-size`, or `--weight-semibold`. Its Dark block no longer sets `--sf-*`, `--tx-*`, `--bd-*`, or `--ac-primary*`. Brand, Realtor partners, Settings and its sub-pages, Homeowner reports, the shared report, and the dashboard preview then read `tokens.css`. The dashboard preview's own navy navigation (`--product-nav*`) stays: it is the local-only demo the Non-Goals leave alone.

## Acceptance criteria

| ID | Criterion | Test |
|---|---|---|
| 009A-AC-001 | Every token in `design/00-direction.md` section 2.4 (Light) and section 2.6 (the four Dark changes) carries its new value in `packages/ui/src/tokens.css` and in all theme blocks of `library/knowledge/private/ux-ui/01-master-tokens.css`. Tokens the tables mark unchanged keep their values. A new unit test reads both files and fails on any mismatch with the tables or between the two files. The same test fails if `packages/ui/src/product-tokens.css` declares any token named in section 2.4 or 2.6 (D5), and if any stylesheet under `apps/web/src` or `packages/ui/src` contains a retired value: `#2856d9`, `#2148b5`, `#1b3b94` (the product action blue), `#101827`, `#172234`, `#1d2b40`, `#445771`, `#3e67dd`, `#3559c0`, `#2c4ca7` (the product Dark block), `#2f6fed`, `#1f4bb8`, `#193f9c` (the old action blue), `#2b9d8f`, `#3db3a4` (teal), `#0e1730`, `#0b1122` (the old navigation), or `#454c5c` (the old Dark field edge), or declares `--text-body-size` with any value but `1rem`. | Unit |
| 009A-AC-002 | The new tokens `--weight-semibold`, `--space-12`, `--topbar-height`, and `--content-max` exist in both files. `--space-7` is defined (or its uses are replaced), which closes PRD-008 follow-up Quality L-1. A unit test fails if any `var(--name)` in `apps/web/src` or `packages/ui/src` CSS names a token that no theme block defines, and `type-tokens-defined.unit.test.ts` no longer excludes `homeowners` and `workspace` (`:20`); it keeps the dashboard preview's `--product-*` names. | Unit |
| 009A-AC-003 | `apps/web/src/theme/token-contrast.unit.test.ts` covers the pairs in design section 2.5, adds `--bd-input` on `--sf-card` and on `--sf-sunken` at 3.0 or more and `--tx-on-nav` on `--sf-nav` at 4.5 or more, in Light and Dark, and passes. | Unit |
| 009A-AC-004 | The default entry in `apps/web/src/theme/tenant-accent.ts` has Light `action` `#005fcc` and `actionHover` `#004ea8`. With `data-tenant-accent` set and Light active, the computed `--ac-primary` is `#005fcc` and the computed body font size is 16 px on Home, `/brand`, `/partners`, `/settings`, and `/homeowners`, each checked separately; in Dark the same pages show the `tokens.css` Dark surface values, not the product Dark block's. `tenant-accent.test.ts` is updated and passes. | Unit, Browser (synthetic, review) |
| 009A-AC-005 | `--ac-secondary` equals the action blue in both themes, its export in `packages/ui/src/tokens.ts` matches, and a source scan finds no stylesheet that consumes `--ac-secondary`. | Unit, Source scan |
| 009A-AC-006 | `apps/web/public/fonts/` holds the upstream Inter variable file `InterVariable.woff2` and `LICENSE.txt`, both unmodified, taken from the upstream git tree at a release tag (at `v4.1`, read 2026-10-01: tag commit `e3a3d4c57d5ecc01453a575621882a384c1995a3`; `docs/font-files/InterVariable.woff2`, 352,240 bytes, git blob `5a8d3e72ad7ffb62af3b146e1b1f54ab5813a212`; `LICENSE.txt`, 4,380 bytes, git blob `9b2ca37b3ffc77391d8b2ebef4a974ef32bf46ea`). `apps/web/public/fonts/README.md` records the tag, the tag commit, each file's upstream path, byte size, git blob SHA-1 (as `gh api 'repos/rsms/inter/contents/<path>?ref=<tag>'` reports it), and SHA-256, the download date, and that the Geist ruling is superseded on that date; it also records that the release API reports `digest: null` for the release archive, so no archive digest is relied on. A unit test recomputes each vendored file's git blob SHA-1 (SHA-1 over `blob <byte length>`, a zero byte, then the bytes) and SHA-256 and compares them with the README, and asserts that `LICENSE.txt` contains "SIL OPEN FONT LICENSE Version 1.1" and "Copyright (c) 2016 The Inter Project Authors". | Unit, Record check |
| 009A-AC-007 | `globals.css` declares one `@font-face` for family `Inter` from `/fonts/`, with `font-display: swap` and the variable weight range. `--font-interface` is `Inter, system-ui, -apple-system, "Segoe UI", sans-serif`. `--font-data` is the system monospace stack and is used only inside "Details for support". A browser test confirms `document.fonts.check("16px Inter")` after load on a signed-in page, and the origin gate at `tests/browser/ui-foundation-ux.spec.ts:21-25` still passes with the font served from the application origin. `apps/web/src/security/content-security-policy.ts` (which already allows `font-src 'self'`) and `apps/web/src/proxy.ts` are unchanged by this PRD. | Browser (synthetic), Source scan |
| 009A-AC-008 | With no stored preference and `prefers-color-scheme: dark` emulated, the first paint of any page has `data-theme="light"` (set by the head script, so there is no flash). Choosing System stores `system`, follows a live device change, and survives a reload. Choosing Light or Dark persists across reloads. Unit tests cover the bootstrap script and `theme-preference.ts`; a browser test covers the first visit and the System choice. | Unit, Browser (synthetic) |
| 009A-AC-009 | On every signed-in page, in review and synthetic modes, the shell renders one `<header>` holding: the "Automated LO" wordmark linking to `/overview`; a `<nav>` named "Main" with exactly the six links of D2, in order; Help; and an account control holding the person's name, the Light/Dark/System choice, and Sign out. The current page's link carries `aria-current="page"` and is marked by a tint and weight, not by colour alone. No left rail and no collapse toggle exist. This holds for a workspace owner; for a role without access to an item, the same six labels show and the restricted one is non-interactive text with its reason (`projectNavigationForSession`, `apps/web/src/features/shell/model/navigation.ts:67-95`). | Integration, Browser (synthetic, review) |
| 009A-AC-010 | "Homeowner reports" is in the menu whether `OALO_HOMEOWNER_REPORTS` is set or unset, and the existing role projection still applies. `layout.tsx` no longer conditions the item on the flag. An integration test covers both flag states and a role without `reports:read`. | Integration |
| 009A-AC-011 | At 1440 by 900 and 1180 by 900 the bar is one row and the menu's box never overlaps the account cluster's box. At 768 by 1024 the bar is two rows (name and account first, the six links second). At 390 by 844 a "Menu" button opens the six links in the existing `Sheet` primitive; focus moves into the sheet, and Escape closes it and returns focus to "Menu". No frame scrolls horizontally. axe reports zero violations at each frame in Light and Dark. | Browser (synthetic, review) |
| 009A-AC-012 | Every interactive control in the bar is at least 44 px tall at every frame, not only on touch. | Browser (synthetic) |
| 009A-AC-013 | In review mode no signed-in page renders the shell-wide not-connected `<aside>` (`app-shell.tsx:140-158`), and the account control states only who is signed in, with no connection clause. In synthetic mode exactly one sample-data line renders in the top bar region (D3). The review-surface sweep is extended to assert both on every review route. | Integration |
| 009A-AC-014 | The menu of D2 is the only menu: the review, synthetic, and dashboard preview shells each yield exactly the six labels in order, and none lists Leads and Pipeline, Automations, Reports, Marketplace or Workspace tools, the Marketing Suite or any of its sub-items, or Getting started. `marketingItems` and the "Expand Marketing" toggle are removed. The navigation unit tests (including the nine-item list at `apps/web/src/features/ui-foundation/model/synthetic-ui.unit.test.ts:39-59`) assert the six. | Unit |
| 009A-AC-015 | Every register row in [009f](./prd-009f-marketing-toolkit-removals-and-records.md) whose file is under `library/knowledge/private/ux-ui/` (rows S-45 to S-71 and S-100 to S-103) is applied in that file: a dated note in place names PRD-009 and the reason, and the superseded text stays readable (quoted or struck, never deleted); a script finds "PRD-009" within 3 lines of each cited line. The ux-ui `README.md` names the PRD-009 mockups as the visual reference and the Claude Design canvases as history. A second pass checks each row against its file. | Record check |

## Files expected to change

- `packages/ui/src/tokens.css`, `packages/ui/src/tokens.ts`, `packages/ui/src/product-tokens.css`
- `library/knowledge/private/ux-ui/01-master-tokens.css` and the other `ux-ui/` files the register names
- `apps/web/src/theme/tenant-accent.ts`, `theme-bootstrap.ts`, `theme-preference.ts`, `ThemeControl.tsx`, and their tests; a new token-parity unit test
- `apps/web/public/fonts/` (the font, `LICENSE.txt`, `README.md`) and `apps/web/src/app/globals.css`
- `apps/web/src/features/shell/components/app-shell.tsx`, `app-shell.module.css`, and their tests
- `apps/web/src/app/(authenticated)/layout.tsx`
- `apps/web/src/fixtures/ui-foundation/synthetic-ui.ts`, `apps/web/src/features/workspace/navigation.ts`, `apps/web/src/features/dashboard-preview/product-shell.tsx`, and their navigation tests, including `apps/web/src/features/ui-foundation/model/synthetic-ui.unit.test.ts` (this lane owns these tests in Wave 1, so 009f does not edit them)
- `apps/web/src/features/dashboard-preview/product-help.tsx`; `product-walkthrough.tsx` and `product-guides.ts` (removed); `walkthrough.module.css`, pruned to the classes `product-help.tsx` still uses (009F-AC-005)
- `apps/web/src/theme/type-tokens-defined.unit.test.ts`
- `tests/browser/ui-foundation-ux.spec.ts` (this lane owns it in Wave 1): its rail and drawer tests rewritten for the top menu, and its `/onboarding` and `/reports` visits (`:224`, `:279`, `:311`, `:399`, `:422`) changed in the same merge that removes those pages, so the UX contract test opens Home (009G-AC-010)
- `tests/browser/review/design-quality.spec.ts`: the `collapsed-rail` and `mobile-drawer` captures (`:830`, `:842`), removed with the rail

## Test plan

- **Unit:** token values and parity (009A-AC-001, 002), contrast (003), tenant accent (004), teal (005), font files and licence (006), theme start-up (008), menu sources (014).
- **Integration:** the shell header and menu (009), the homeowner item in both flag states (010), the banner sweep (013).
- **Browser:** font loading under the origin gate (007), first visit in dark (008), the four frames and the Menu sheet (011), control heights (012).
- **Record check:** the `ux-ui/` notes (015).

Screenshot baselines are not redrawn here. 009g redraws once for the whole change set.

## Security notes

- The font is a static file served from the application origin. Nothing is fetched at runtime.
- The theme bootstrap still reads only the fixed storage key. Storing `system` adds no new value to it.
- The account control keeps Sign out as a form post through the existing route.

## Open questions

- [ ] None blocking. Whether HighLevel draws its own navigation beside the Custom Page at the 1180 frame is UNVERIFIED (design sections 2.1 and 11); the top bar does not depend on the answer, because it takes no width from the side.

## Related

- [Design direction, sections 2 and 3](design/00-direction.md)
- [Open decisions D-2, D-5, D-11, D-14](design/01-open-decisions.md)
- [Font pipeline ruling](../../../../apps/web/public/fonts/README.md)
- [Design brief](../../../knowledge/private/ux-ui/00-design-brief.md)

## Amendments

None yet.
