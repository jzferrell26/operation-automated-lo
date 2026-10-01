# PRD-009 design direction: the marketing toolkit

> Status: Proposal for owner review | Date: 2026-10-01 | Author: `design-system-guardian` | Branch: `claude/prd-009-marketing-toolkit` from `e89058e`
>
> Binding inputs: the owner's decisions OD-A to OD-G (2026-10-01, in chat). Where this document and an older brief, spec or PRD criterion disagree, the owner's decision wins and section 2.8 records the supersession.
>
> Companion files: [`01-open-decisions.md`](01-open-decisions.md) (what still needs the owner) and [`mockups/`](mockups/) (six static pages, previews in [`mockups/previews/`](mockups/previews/)).
>
> This is a design proposal. It changes no product code, test, screenshot, or design-system file. When the owner accepts it, `library-guardian` writes the PRD-009 criteria from it, and `ux-ui-guardian` carries it into `library/knowledge/private/ux-ui/`.

---

## 1. The direction on one page

1. **What the product is.** A marketing toolkit that launches Facebook ads for open houses and hands the leads to HighLevel. HighLevel stays the system of record for contacts, pipelines and automations (OD-A). The product does not look, or behave, like a CRM.
2. **The look.** Listing Studio's AutomatedRE layer: a very light page (`#f5f8fc`), white bordered cards with almost no shadow, navy (`#061e35`) for text, one action blue (`#005fcc`), 44px controls, Inter. Light is the design target; Dark stays available (OD-E).
3. **The menu.** Six items in a light top bar: Home, Campaigns, Brand, Realtor partners, Homeowner reports (only when turned on), Settings. Leads and Pipeline, Automations, Reports, Workspace tools, the Marketing Suite sub-menu and the "Expand Marketing" toggle go (OD-C, OD-D).
4. **First run.** Home asks one question, "Start an Open House Boost", with the property address as the first field and one primary button (OD-F). Beside it, a "Get set up" checklist with four items is the one place the page says what is and isn't connected. Below, "Running now" and "Needs your approval" each show one honest empty state. No metric wall. No floating walkthrough.
5. **The launch.** Three steps on one flow: Property and event, Make it yours, Review and launch. Step 3 shows the actual Facebook feed ad, a one-card check summary, the approval, then "Launch on Facebook". When Meta isn't connected, that button is disabled with one sentence that says what to do (OD-B).
6. **Results live on the campaign page.** Spend, leads sent to HighLevel, and cost per lead, each with an honest "Not live yet" until Meta and HighLevel are connected (OD-D).

What does not change: live Meta publishing stays off and gated; approval before launch stays (Housing Special Ad Category); no fake numbers; the user-language contract governs every sentence; the PRD-008b truthfulness rules for decided, sent-back and blocked versions.

---

## 2. The look (OD-E)

### 2.1 Navigation: a light top bar, not a left rail

**Decision: a light top bar.** It is white (`--sf-nav`), 64px tall, with one hairline under it. The current page is marked with a pale blue tint (`--st-info-bg`), navy text, semibold weight and `aria-current="page"`, so the mark is never colour alone.

Measured on the mockups with Playwright (labels at 14px, rendered in the Segoe UI fallback because no Inter file exists on this machine; see 2.2):

| Frame | What the bar does | Measured |
|---|---|---|
| 1440 | One row: mark and name, six menu labels, Help, account | Labels span 592px (355 to 948); the account cluster starts at 1095, so 147px spare |
| 1180 (inside HighLevel) | Same single row | Labels end at 828, account starts at 955: 127px spare for Inter's slightly wider glyphs |
| 768 | Two rows: name and account on top, the six labels on their own row | 592px of labels in a 704px row, no horizontal scroll |
| 390 | "Menu" button, name, Help icon, account | The six items open from the Menu button as a panel (the existing `Sheet` primitive in production) |

Why the top bar wins for this product:

- **Six items fit in one row** at every desktop frame and in a second row at 768, so the menu is always visible above 720px without any collapse toggle. The rail needed a person-controlled collapse at 1440, 1180 and 768 (brief section 14, rubric D-008) and still cost 272px of a 768 frame.
- **The 1180 frame is the app inside HighLevel.** The product is a Custom Page rendered inside HighLevel (`library/knowledge/private/integrations/ghl-marketplace-and-scopes.md:19`). HighLevel draws its own navigation beside that page, so a second left rail would put two side menus next to each other and take 232 to 272px from the 1180 frame. UNVERIFIED in this pass: the exact width and position of HighLevel's own navigation around a Custom Page; confirm in a sandbox location before build.
- **It matches the look the owner chose.** automatedre.com uses a light top navigation (checked on the live site 2026-10-01).
- **Honest note:** Listing Studio's signed-in app uses a light *left rail* (`src/styles/automatedre-components.css:26`, rail width `17rem` at `src/styles/ls-tokens.css:441`). We follow its colours and components, not its layout, because it has more destinations and is not embedded in HighLevel. The rail remains the alternative in open decision D-2.

What the bar holds: the product name on the left; the menu; on the right, Help and the account control (name, Light/Dark/System, Sign out). The theme control moves into the account menu so the bar stays calm; brief section 13's control is unchanged in behaviour.

### 2.2 Font: Inter

**Decision: Inter for everything a person reads.** Reasons:

1. **Geist has never rendered in production.** No Geist binary is in the repo; the font ruling says the product falls through to the system sans until one is vendored (`apps/web/public/fonts/README.md`, "The ruling"). So the "current font" a loan officer sees is Segoe UI or San Francisco, not Geist. Choosing Geist would be a new choice, not keeping one.
2. **It is the font of the look the owner picked.** The AutomatedRE layer sets `--ls-font-ui` to Inter (`src/styles/ls-tokens.css:426`), loaded in `src/app/layout.tsx:2,10` of Listing Studio. Two products from one owner should read as one family.
3. **It suits the job.** Inter has tabular figures for money and dates, which lets us drop the monospace "data font" from ordinary screens (see the token table).

**Delivery.** Follow the existing font pipeline exactly: vendor `inter-latin.woff2` (variable, Latin subset) and its upstream licence file into `apps/web/public/fonts/`, add one `@font-face` with `font-display: swap`, re-run the browser gate that forbids third-party requests, then redraw the baselines. Inter is published under the SIL Open Font License 1.1; UNVERIFIED in this pass, so the vendoring lane must place the unmodified upstream licence beside the file before it ships, as the README already requires.

**Monospace** survives only inside "Details for support" (version and support references). Numbers and dates use Inter with `font-variant-numeric: tabular-nums`.

### 2.3 Surfaces, cards, buttons

- **Page:** `#f5f8fc`, very light blue-grey. **Cards:** white, 1px `#d6e2ee` border, 12px radius, a 1px shadow at 4% navy. The border is the edge; the shadow only keeps a card from looking pasted on.
- **Navy is text and the small mark only:** headings, body labels, the product mark, the avatar. No navy panels.
- **One action blue:** primary buttons, links, the focus ring, the selected step. Teal (`--ac-secondary`) is retired.
- **One obvious primary button per screen.** A disabled primary turns grey, so the screen's single enabled primary is the one blue button. Secondary buttons are white with a visible `#718399` edge.
- **Every control is at least 44px tall** at every width, not only on touch (AutomatedRE rule, `src/styles/automatedre-components.css:18-19`). Inputs use 16px text, so phones do not zoom.
- **Type:** page title 28px bold, section title 19px semibold, card title 16px semibold, body 16px, secondary 14px, caption 12px. This replaces the 13px body that made the product feel cramped.
- **Status chips** pair a glyph and words with colour, as today.

### 2.4 Token table: same names, new values

Implementation changes values in the existing semantic tokens, so components keep consuming the same names. Sources are paths in the Listing Studio snapshot (`jzferrell26/listing-studio` at `15e42829`) unless marked as a reason.

**Light (the design target).**

| Token | Old value | New value | Source |
|---|---|---|---|
| `--sf-canvas` | `#f3f6fa` | `#f5f8fc` | `src/styles/ls-tokens.css:391`, used as `--ls-bg` at `:396` |
| `--sf-card` | `#ffffff` | `#ffffff` | `ls-tokens.css:395,397` (unchanged) |
| `--sf-sunken` | `#f7f9fc` | `#f5f8fc` | `ls-tokens.css:398` |
| `--sf-nav` | `#0e1730` | `#ffffff` | `automatedre-components.css:26` (navigation on the surface colour); OD-E |
| `--sf-overlay` | `rgb(14 23 48 / 58%)` | `rgb(6 30 53 / 44%)` | `ls-tokens.css:400` |
| `--tx-strong` | `#1c2431` | `#061e35` | `ls-tokens.css:385,404-405` (brand navy as ink) |
| `--tx-body` | `#5b6574` | `#526579` | `ls-tokens.css:392,406-407` (brand slate) |
| `--tx-faint` | `#667085` | `#5f7186` | Reason: Listing Studio's lightest grey `#718399` (`:394,408`) is non-text only and measures 3.65 on the page, so this is slate lightened only as far as the 4.5 text floor allows (4.70 on the page) |
| `--tx-on-action` | `#ffffff` | `#ffffff` | Unchanged |
| `--tx-on-nav` | `#e8ecf5` | `#061e35` | Reason: the navigation is now light, so its text is navy |
| `--bd-hairline` | `#e9edf3` | `#d6e2ee` | `ls-tokens.css:393,401-402` |
| `--bd-input` | `#dfe5ee` | `#718399` | `ls-tokens.css:394,403`; `automatedre-components.css:20` (visible control edges) |
| `--ac-primary` | `#2f6fed` | `#005fcc` | `ls-tokens.css:387,410` (brand action blue) |
| `--ac-primary-hover` | `#1f4bb8` | `#004ea8` | `ls-tokens.css:388,411` |
| `--ac-primary-active` | `#193f9c` | `#003f88` | Reason: Listing Studio has no pressed value; one step darker than hover on the same hue |
| `--ac-secondary` | `#2b9d8f` | `#005fcc` | Reason: OD-E "one action blue". No CSS consumes this token today (only the export at `packages/ui/src/tokens.ts:25`), so retiring teal moves no screen |
| `--st-success-fg` / `-bg` | `#157a46` / `#e6f6ec` | `#137a50` / `#eaf8f0` | `ls-tokens.css:416-418` |
| `--st-warning-fg` / `-bg` | `#8a6112` / `#fdf3dd` | `#895900` / `#fff4d6` | `ls-tokens.css:419-421` |
| `--st-critical-fg` / `-bg` | `#c03a2e` / `#fdecea` | `#b42335` / `#fff0f2` | `ls-tokens.css:422-425` |
| `--st-info-fg` / `-bg` | `#285ecb` / `#eaf2ff` | `#005fcc` / `#eaf4ff` | `ls-tokens.css:410` and `:390` (ice). Links read `--st-info-fg` (`packages/ui/src/components/link.module.css:9`), so links become the action blue |
| `--st-neutral-fg` / `-bg` | `#5b6574` / `#eef1f6` | `#526579` / `#eef2f7` | Foreground `ls-tokens.css:392`; background is a reason: Listing Studio has no neutral chip, so it sits between its cloud and line values |
| `--st-uncertain-fg` / `-bg` | `#5d4fc1` / `#f3ecff` | unchanged | Reason: brief section 9 reserves purple for uncertain reconciliation; Listing Studio has no equivalent |
| `--focus-color` | `#2f6fed` | `#005fcc` | `ls-tokens.css:446-447` (ring in the action colour) |
| `--font-interface` | `"Geist", Inter, system-ui, ...` | `Inter, system-ui, -apple-system, "Segoe UI", sans-serif` | `ls-tokens.css:426`; section 2.2 |
| `--font-data` | `"Geist Mono", ui-monospace, ...` | `ui-monospace, SFMono-Regular, Consolas, monospace` | Reason: Geist Mono never loaded; monospace is kept only for "Details for support" |
| `--text-page-size` | `1.4375rem` (23px) | `1.75rem` (28px) | `automatedre-components.css:24` |
| `--text-section-size` | `1.0625rem` (17px) | `1.1875rem` (19px) | `ls-tokens.css:141` |
| `--text-card-size` | `0.875rem` (14px) | `1rem` (16px) | `ls-tokens.css:140` |
| `--text-body-size` | `0.8125rem` (13px) | `1rem` (16px) | `automatedre-components.css:4` |
| `--text-secondary-size` | `0.71875rem` (11.5px) | `0.875rem` (14px) | `automatedre-components.css:23` (field labels) |
| `--text-caption-size` | `0.65625rem` (10.5px) | `0.75rem` (12px) | `ls-tokens.css:137`; `automatedre-components.css:13` |
| `--weight-semibold` | (new) | `600` | `ls-tokens.css:154` |
| `--radius-control` | `0.5rem` | `0.5rem` | `ls-tokens.css:438` (unchanged) |
| `--radius-button` | `0.625rem` | `0.5rem` | `ls-tokens.css:438` (buttons and inputs share one radius) |
| `--radius-card` | `0.875rem` | `0.75rem` | `ls-tokens.css:439` |
| `--radius-panel` | `1rem` | `1rem` | `ls-tokens.css:440` (unchanged) |
| `--shadow-rest` | `0 1px 2px rgb(23 32 50 / 6%)` | `0 1px 2px rgb(6 30 53 / 5%)` | Reason: same weight, tinted to the new navy |
| `--shadow-card` | two layers, up to 18% | `0 1px 2px rgb(6 30 53 / 4%)` | `ls-tokens.css:199-203` (cards are bordered, not lifted); OD-E "minimal shadow" |
| `--shadow-raised` | two layers, up to 28% | `0 2px 4px rgb(6 30 53 / 4%), 0 8px 24px rgb(6 30 53 / 12%)` | `ls-tokens.css:444` (menus, dialogs) |
| `--space-12` | (new) | `3rem` | `ls-tokens.css:170` (band separation) |
| `--topbar-height` | (new) | `4rem` | `ls-tokens.css:442` |
| `--content-max` | (new) | `75rem` | `automatedre-components.css:44,46` (1200px content) |
| `--target-min-size` | `2.75rem` | `2.75rem` | `automatedre-components.css:18` (unchanged; now applied at every width) |
| Spacing `--space-1` to `--space-8`, motion, `--focus-width`, `--focus-offset`, breakpoints | | unchanged | Already compatible |

**Where the values live, so the change is values and not components:**

1. `packages/ui/src/tokens.css` (`:root` and `[data-theme="dark"]`) and its mirror `library/knowledge/private/ux-ui/01-master-tokens.css` (both theme blocks and the `prefers-color-scheme` block).
2. **The action blue also lives in the tenant accent catalog.** `apps/web/src/app/globals.css:33-43` sets `--ac-primary`, `--ac-primary-hover` and `--tx-on-action` from `--tenant-accent-*`, which come from `apps/web/src/theme/tenant-accent.ts:16-27`. The default entry's Light `action` and `actionHover` must change to `#005fcc` and `#004ea8`, or the old cobalt keeps rendering.
3. `apps/web/src/theme/token-contrast.unit.test.ts` keeps working unchanged; it should gain `--bd-input` on `--sf-card` and `--sf-sunken` as interface pairs (see 2.5).
4. The one structural change is the shell: `apps/web/src/features/shell/components/app-shell.module.css` and its component move from a fixed dark rail to the top bar. Every other screen changes through tokens plus the screen redesigns in sections 4 to 7.

The six mockups declare exactly these token names and values in their `:root`, so they double as a check that the table produces the look.

### 2.5 Contrast, WCAG 2.2 AA, measured

Computed with the same relative-luminance formula as `contrastRatio` in `apps/web/src/theme/tenant-accent.ts`. Floors: 4.5 for text, 3.0 for interface edges and the focus ring.

**Light, text pairs (all pass).**

| Foreground | On canvas `#f5f8fc` | On card `#ffffff` | On sunken `#f5f8fc` |
|---|---|---|---|
| `--tx-strong` `#061e35` | 15.84 | 16.87 | 15.84 |
| `--tx-body` `#526579` | 5.64 | 6.01 | 5.64 |
| `--tx-faint` `#5f7186` | 4.70 | 5.01 | 4.70 |
| `--st-success-fg` `#137a50` | 5.02 | 5.35 | 5.02 |
| `--st-warning-fg` `#895900` | 5.64 | 6.01 | 5.64 |
| `--st-critical-fg` `#b42335` | 6.10 | 6.50 | 6.10 |
| `--st-info-fg` (links) `#005fcc` | 5.62 | 5.98 | 5.62 |
| `--st-neutral-fg` `#526579` | 5.64 | 6.01 | 5.64 |
| `--st-uncertain-fg` `#5d4fc1` | 5.88 | 6.26 | 5.88 |

| Pair | Ratio |
|---|---|
| `--tx-on-nav` on `--sf-nav` (navy on white bar) | 16.87 |
| White on `--ac-primary` / hover / active | 5.98 / 7.91 / 10.16 |
| Chip text on its own chip background: success, warning, critical, info, neutral, uncertain | 4.88, 5.49, 5.88, 5.38, 5.34, 5.44 |

**Light, interface edges and focus ring (all pass).**

| Pair | Ratio |
|---|---|
| `--ac-primary` (button fill) on canvas / card | 5.62 / 5.98 |
| `--bd-input` (field edge) on card / sunken | 3.88 / 3.65 |
| `--focus-color` on all ten surfaces a ring can land on (canvas, card, sunken, nav, six chip backgrounds) | 5.20 at worst |

`--bd-hairline` measures 1.31 on a card. It is decorative: a card is identified by its content and spacing, not its outline, which is the same reasoning rubric D-002 applied. No control relies on it.

**Dark.** All text pairs pass (lowest: `--st-critical-fg` on sunken, 5.49). White on the Dark action fills: 5.22, 5.98, 7.75. Field edge `#6b7385` on card 3.51, on sunken 3.19. Focus ring `#8bb0ff` 6.84 at worst across the ten Dark surfaces. `--ac-primary` in Dark is never text (3.20 on a card), exactly as today; links use `--st-info-fg` `#8bb0ff` (7.75 on a card).

### 2.6 What Dark becomes

The Light/Dark/System control stays. **Light is the design target and, as recommended in open decision D-5, the first-visit default.** Dark is checked but not designed screen by screen.

Dark keeps the values measured and signed on 2026-09-20 with four changes:

| Token (Dark) | Old | New | Reason |
|---|---|---|---|
| `--sf-nav` | `#0b1122` | `#1b1e25` | The top bar is a surface like a card, not a slab |
| `--bd-input` | `#454c5c` | `#6b7385` | Visible field edges, as in Light (3.51 on a card) |
| `--ac-secondary` | `#3db3a4` | `#3566d6` | Teal retired |
| `--shadow-card` | two layers, up to 70% | `0 1px 2px rgb(0 0 0 / 24%)` | Minimal shadow, as in Light |

Type, radius, spacing and motion are theme-independent. Listing Studio's own AutomatedRE app is light in both OS modes (`library/knowledge/private/listing-studio-ux-ui/screens/automatedre-brand-release.md:15`), so there is no Listing Studio Dark to copy; this keeps the repo's measured Dark. Preview: [`mockups/previews/home-first-run--1440--dark.png`](mockups/previews/home-first-run--1440--dark.png). Ads, public pages and PDFs never take the dashboard theme (brief section 13, unchanged): the mockups draw the ad in the loan officer's own brand colours in both themes.

### 2.7 Motion

Unchanged: `--motion-fast` 120ms, `--motion-base` 180ms, `--motion-slow` 240ms, one curve, all zero under `prefers-reduced-motion`. Nothing on Home moves on its own.

### 2.8 What this supersedes

Dated 2026-10-01, on the owner's decisions OD-A to OD-G. On acceptance, `ux-ui-guardian` edits each file and adds a dated supersession note in place. Nothing is edited by this proposal.

**`library/knowledge/private/ux-ui/00-design-brief.md` (July 20 brief), by section.**

| Section | Lines | What is superseded | By |
|---|---|---|---|
| 1 Product identity | 5, 7 | "operating layer ... automation, reporting"; "Advertising is a capability ... not the identity" | OD-A, OD-B: a marketing toolkit whose core is the Facebook ad launch |
| 2 Approved design source | 11-17 | The Claude Design package as "the approved visual baseline" | Listing Studio's AutomatedRE layer and these mockups (section 9 below names each canvas's fate) |
| 3 Aesthetic anchors | 23-28 | The four anchors and "deep navy anchor, cobalt primary actions, restrained teal accents" | OD-E light look; OD-F keeps only Broker Marketplace's calm, one-question start |
| 4 Aesthetic boundaries | 32-51 | Nothing removed. "Must not feel like a generic CRM clone" (44) becomes a hard rule: no CRM pages | OD-A |
| 5 Shell and module hierarchy | 55-78 | The nine-item navigation and the Marketing Suite sub-navigation | Section 3 below |
| 6 Root overview purpose | 82-100 | The five questions and the seven required regions | Section 4 below (first-run Home) |
| 7 MVP capability boundaries | 106-117 | "Campaign and outcome reporting" as its own surface; "PDFs, QR codes, creative, email, and SMS packages" in the founding interface | Results per campaign (section 6); the Facebook ad is the founding output. The add-ons list (119-130) stands |
| 8 Surface metaphor and depth | 136-142 | "Navigation: deep navy anchor"; shadow tiers as a depth language | Light top bar; borders are the depth (2.3) |
| 9 Color contract | 148-149 | "Cobalt is the primary action color"; teal as a supporting accent | One action blue `#005fcc`; teal retired. Status colour rules (150-157) and the focus-ring rule (161) stand with new values |
| 10 Typography | 165-172 | Geist and Geist Mono; the 23/17/14/13/11.5/10.5 steps | Inter; 28/19/16/16/14/12 (2.2, 2.4) |
| 11 Radius, spacing, icons | 180-184 | Buttons 10px, cards 12 to 14px | Buttons 8px, cards 12px. Spacing and icon rules stand |
| 13 Themes | 220 | "First visit resolves the current operating-system preference" | Light on first visit, if the owner accepts D-5 |
| 14 Responsive | 248-256 | "Desktop uses the full navigation sidebar ... compact icon rail ... collapsible navigation rail", and the D-008 ruling | Top bar at 1440 and 1180, two-row bar at 768, Menu button at 390 (2.1) |

Sections 12, 15, 16, 17, 18, 19 and 20 stand. Section 15's "Pause and resume require explicit confirmation" and "Material edits create a new campaign version" apply unchanged to the new flow.

**Component and screen specs.**

| File | Lines | Superseded |
|---|---|---|
| `03-components/application-shell-and-navigation.md` | 11-15, 25-30, 97-109 | Fixed deep navy sidebar, rail and collapse rules, nine-item inventory |
| `03-components/onboarding-checklist.md` | 15-20 | The two phases (Get Connected, Launch Readiness) and nine items; replaced by the four-item Home checklist (4.2). The evidence rule (13: completion only from saved records) stands |
| `03-components/campaign-and-artifact-workflow.md` | 7-18, 20-32, 95-107 | The six-stage stepper; the seven artifact tabs in the founding flow; the publishing-progress states stay for when launch is turned on |
| `03-components/metric-source-and-freshness.md` | 28 | The business-pulse priority order |
| `04-screens/platform-overview.md` | whole file | Replaced by section 4 |
| `04-screens/campaign-lifecycle.md` | 7-23 | Six-step create, separate Studio, Preflight and Launch screens, typed confirmation; replaced by section 5. The invariants (29-38) stand |
| `04-screens/marketing-suite-campaign-performance.md` | whole file | Results move to the campaign page (section 6) |
| `04-screens/onboarding-brand-and-platform-settings.md` | 71-78 | Leads and Pipeline, Automations, Reports, Marketplace module status as settings surfaces |
| `04-screens/workspace-page-completion.md` | 11, 15, 16 | Pages for removed sections |
| `04-screens/homeowner-reports.md` | 13 | "Use the existing navy, cobalt ..." (the token names stand; the values change) |
| `06-review-rubric.md` | 57-60 (axis 10); D-002 (174-198); D-008 (227-255) | "Sibling of the canvases" becomes "sibling of the PRD-009 mockups"; D-002's unchanged field edge is superseded by visible edges; D-008's rail ruling has no rail to govern |

**Requirements and standards** (for `library-guardian` to cite when writing PRD-009; the recon lists them in full): PRD-001 index lines 58 and 140, PRD-001g 19-63, 005E-AC-010, PRD-006b's Reports inventory (28, 186-187), 006D D3's "reports (not connected)" screen (78) and the criteria that apply to it (006D-AC-007, 008, 009, 012, 017), and the PRD-006c walkthrough criteria named in 4.4. PRD-004 RGL-002 is **not** superseded; section 4.3 shows how the new Home still meets it. The user-language contract's section 5 strings that name Stripe are affected by open decision D-8.

---

## 3. Information architecture (OD-A, OD-C, OD-D)

### 3.1 The menu

| Item | What it is | Notes |
|---|---|---|
| Home | First-run start, setup checklist, what's running, what needs approval | Today's `/overview`, redesigned |
| Campaigns | The campaign list and the three-step launch | One primary action: "New Open House Boost" |
| Brand | The loan officer's brand: name, NMLS numbers, logo, colours, disclosure | One brand for ads and homeowner reports (today `/brand` is "Report branding") |
| Realtor partners | Saved partners, with each partner's agreement to co-branded ads | Owner kept it explicitly (OD-C); placement is open decision D-3 |
| Homeowner reports | PRD-007's reports | Shown only when the existing switch (`OALO_HOMEOWNER_REPORTS=enabled`, `apps/web/src/app/(authenticated)/layout.tsx:161-177`) is on; default is open decision D-4 |
| Settings | Account; Connections (HighLevel, Meta); Where new leads go in HighLevel | The lead hand-off stays because it is the "connector" part (OD-C) |

Settings is one page with three cards that link to the existing sub-pages; it is not a second menu.

### 3.2 What goes

Leads and Pipeline, Automations, Reports, Workspace tools (`/marketplace`), the Marketing Suite hub and its five sub-pages, and the "Expand Marketing" toggle (`features/shell/components/app-shell.tsx:256`). The demo-mode menu (`features/dashboard-preview/product-shell.tsx:14-36`) follows the same list. The recon's removal footprint (files, tests, 8 Reports baselines, about 256 rail baselines) is the implementation lane's checklist.

### 3.3 Every old URL's fate

Recommendation: keep the URLs of pages that survive (the app runs inside HighLevel, where nobody sees the address bar, and every test and baseline already uses them). Renaming is open decision D-12.

| URL today | What it shows today | Fate |
|---|---|---|
| `/overview` | Overview | **Kept.** It is Home |
| `/marketing` | Marketing Suite hub | **Redirect** to `/marketing/campaigns` |
| `/marketing/campaigns` | Campaign list | **Kept** (Campaigns) |
| `/marketing/campaigns/new` | Create page | **Kept.** Becomes the three-step flow (the step can live in the address, for example `?step=2`, so Back and reload work) |
| `/marketing/campaigns/[campaignRef]` | Campaign detail | **Kept** (campaign page) |
| `/marketing/campaigns/synthetic-open-house-001` | Demo example | **Unchanged:** already not-found on a signed-in workspace (its `page.tsx`, PRD-008b 008B-AC-008) |
| `/marketing/property-sites` | Saved campaigns plus a not-connected card | **Redirect** to `/marketing/campaigns` |
| `/marketing/creative` | Creative library | **Redirect** to `/marketing/campaigns` (each campaign page shows its ad) |
| `/marketing/ads` | Ads Manager | **Redirect** to `/marketing/campaigns` |
| `/marketing/messaging` | Email and SMS drafts editor | **Redirect** to `/marketing/campaigns`; saved drafts stay in the database, never deleted (open decision D-6) |
| `/marketing/blueprints` | Campaign templates | **Redirect** to `/marketing/campaigns/new` |
| `/brand` | Report branding | **Kept** (Brand) |
| `/partners` | Realtor partners | **Kept** |
| `/leads` | Leads and Pipeline | **Not-found.** The job moved to HighLevel (OD-A). The not-found page says: "This page is gone. Your leads, pipelines and follow-up live in HighLevel." with "Go to Home" |
| `/leads/pipeline` | Pipeline | **Not-found**, same sentence |
| `/automations` | Automations | **Not-found**, same sentence. Its lead-routing piece survives at `/settings/routing` |
| `/reports` | Reports | **Redirect** to `/marketing/campaigns`: results now live on each campaign's page (OD-D) |
| `/marketplace` | Workspace tools | **Redirect** to `/overview` |
| `/settings` | Settings hub | **Kept**: Account, Connections, Where new leads go |
| `/settings/account` | Change password | **Kept**, becomes Account (name, password, workspace access, plan and usage link) |
| `/settings/connections` | Connections | **Kept** (HighLevel, Meta) |
| `/settings/routing` | Lead routing | **Kept**, titled "Where new leads go in HighLevel" |
| `/settings/profile` | Same brand editor as `/brand` | **Redirect** to `/brand` |
| `/settings/team` | Your workspace access | **Redirect** to `/settings/account` |
| `/settings/billing` | Valuation allowance; billing not enabled | **Kept**, linked from Account as "Plan and usage" (open decision D-8) |
| `/onboarding` | Onboarding checklist screen | **Redirect** to `/overview`: the checklist lives on Home |
| `/homeowners`, `/homeowners/new`, `/homeowners/[propertyId]` | Homeowner reports | **Kept**, menu item only when turned on. What these pages do today when the switch is off is UNVERIFIED in this pass (the page itself has no gate); the implementation lane checks and keeps that behaviour |
| `/design-surfaces` | Page-state gallery | **Unchanged:** not-found outside the local demo (`design-surfaces/page.tsx:69`) |
| Public pages (`/sign-in`, `/sign-up`, `/home-report/[secret]`, ...) | | Unchanged |

---

## 4. First-run Home (OD-F)

Mockup: [`mockups/home-first-run.html`](mockups/home-first-run.html). Previews at 1440, 1180, 768, 390 and 1440 Dark.

### 4.1 Composition

```
+--------------------------------------------------------------------------+
| Automated LO   Home  Campaigns  Brand  Realtor partners  ...  Help  (JR) |
+--------------------------------------------------------------------------+
  Welcome, Jordan.
  +---------------------------------------------+  +----------------------+
  | Open House Boost                            |  | Get set up  0 of 4   |
  | START AN OPEN HOUSE BOOST           (h1)    |  | [progress]           |
  | One sentence: what happens in three steps.  |  | Connect HighLevel  [Connect]
  | Property address [____________] [ Start ]   |  | Connect Meta       [Connect]
  | (1) Property and event (2) Make it yours    |  | Add your brand     [Add] |
  | (3) Review and launch                       |  | Add a Realtor partner [Add]
  +---------------------------------------------+  |                      |
  +---------------------+ +---------------------+  |                      |
  | Running now         | | Needs your approval |  |                      |
  | (icon) No ads running| | (icon) Nothing to  |  |                      |
  | why; one link       | | approve; why        |  |                      |
  +---------------------+ +---------------------+  +----------------------+
            HighLevel stays your CRM. Your contacts, pipelines and follow-up live there.
```

At 768 and 390 the order is: start card, checklist, running, approval. The address field and "Start" are the first things a keyboard or screen-reader user reaches after the menu.

**The one question.** "Start an Open House Boost", the address as the first step, one primary button "Start". Typing the address and pressing Start opens step 1 with the address filled in. We borrow Open House Genie's calm, single-card opening and nothing else: no tool catalogue, rate ticker, AutoPilot, agent monitor, or its branding (OD-F).

### 4.2 The "Get set up" checklist

Rendered inline as a card. It is never a floating panel and never covers anything.

| Item | What it says | States (glyph plus words, never colour alone) | Action |
|---|---|---|---|
| Connect HighLevel | New leads from your ads go to your HighLevel account. | Not connected yet; Connected; Needs attention (for example a lapsed connection) | Connect / Fix it |
| Connect Meta | Your Facebook page and ad account, so your ads can run. | Not connected yet; Connected; Needs attention | Connect / Fix it |
| Add your brand | Your name, NMLS number, logo and colors, used on every ad. | Not started; Done | Add / Edit |
| Add a Realtor partner | The agent hosting the open house, so the ad is co-branded. | Not started; Done | Add / Add another |

- One sentence above the items states the consequence once: "You can start an ad now. It runs once HighLevel and Meta are connected."
- Progress ("0 of 4 done") comes only from saved records and connection state read on the server, never from clicks or browser storage (the existing rule at `03-components/onboarding-checklist.md:13`, and Listing Studio's `screens/office-launch-checklist.md`).
- When all four are done, the card collapses to one line, "You're set up", with a link to review it. If something later breaks (a lapsed connection), the card reopens on its own with that item marked "Needs attention".
- "Connect" for HighLevel and Meta goes to Settings > Connections. Brand goes to Brand; partner goes to Realtor partners. The person comes back to Home.

### 4.3 Connection status appears once

Today one brand-new Home says "HighLevel, Meta, and Stripe aren't connected" 16 times and shows 9 "Not connected" metric cards (recon section 5). The new Home says it in exactly one place, the checklist card. To make that true:

- The shell-wide not-connected banner (`features/shell/components/app-shell.tsx:140-158`) and the rail identity card's copy of it (`copy/user-language.ts:143`) are removed (open decision D-11).
- Each other page states a fact only where it changes what the person can do: the disabled "Launch on Facebook" button, the results card on a campaign page, "New leads go to" on step 3.
- **PRD-004 RGL-002 still holds:** Home shows honest empty and not-connected states and no unlabeled demo data.

### 4.4 What replaces the floating walkthrough (PRD-006c)

Options evaluated:

| Option | Covers content? | Works inside HighLevel at 1180 and on a phone? | Verdict |
|---|---|---|---|
| Keep the floating panel, re-placed | Yes, by design: it is fixed above the page (`guided-setup.module.css:14-33`); today it covers "Your numbers" | It becomes a bottom sheet under 768, covering 40% of the screen | Rejected |
| A welcome modal on first visit | Yes, the whole page | Blocks the one question the page asks | Rejected |
| **Inline checklist plus an in-flow step indicator** | Never | Yes, it is ordinary page content | **Recommended** |

The recommendation is three things, all ordinary page content:

1. **The Home checklist** (4.2) carries setup.
2. **The step indicator** on the launch flow ("Step 1 of 3", with Done marks on finished steps) carries orientation. It is the existing `Stepper` primitive with three steps instead of six.
3. **Inline hints next to the field they explain** carry the teaching ("The first photo is the one in the ad."; "We save this version and run the checks. Nothing is published.").

Help stays in the top bar for anyone who wants more. What PRD-006c built that still has value stays: the saved setup profile that prefills the ad (`platform.user_preferences`, `setup_profile.v1`) and the five-minute target, now measured on the three-step flow. Criteria to retire or rewrite when PRD-009 is written: 006C-AC-005 (opens on first render), 006C-AC-006 (the seven steps), 006C-AC-008 (the "Finish setup" chip), 006C-AC-009 ("Show me around again"), 006C-AC-010 to 006C-AC-013 (panel and sheet behaviour), and 006C-AC-018 (the final step's not-connected statement, now the checklist's job). The owner confirms the retirement in open decision D-15.

### 4.5 The two lists below

Each uses Listing Studio's empty-state rule (`library/knowledge/private/listing-studio-ux-ui/state-doctrine.md` section 2; `src/components/studio/EmptyState.tsx:9-17`): an icon, what would be here, why it is empty, and at most one action.

| List | Empty title | Why | Action |
|---|---|---|---|
| Running now | No ads running | An ad shows here, with its spend and leads, once you launch it. | "Start an Open House Boost" (a link that moves focus to the address field, so the page still has one primary button) |
| Needs your approval | Nothing to approve | A campaign waits here after its checks pass, until someone approves it or sends it back. | None: there is nothing to do |

Once campaigns exist, each list shows up to three rows (address, open house date, status chip, one link) and "See all campaigns". "Needs your approval" reads the recorded decision (PRD-008b 008B-AC-009): a sent-back version never appears there.

---

## 5. The three-step launch (OD-B)

Mockups: [`create-step-1-property.html`](mockups/create-step-1-property.html), [`create-step-2-make-it-yours.html`](mockups/create-step-2-make-it-yours.html), [`create-step-3-review-and-launch.html`](mockups/create-step-3-review-and-launch.html) (Meta not connected).

### 5.1 Step 1, Property and event

- **Property address**, filled in from Home. One field; no separate State select (the address carries it).
- **Link import is not shown.** Zillow or Redfin link import appears only behind an owner switch, as a second way in above the address (open decision D-1). The mockup marks the spot with a dashed note, not with live controls.
- **The open house:** Date, Starts, Ends. Ends is prefilled two hours after Starts, with a hint saying so.
- **Photos:** upload, the first one is "In the ad", with stated limits shown before the person picks a file (Listing Studio's rule, `state-doctrine.md` section 7). The limits in the mockup ("JPG or PNG, up to 10 photos") are placeholders until the Meta image rules are checked (UNVERIFIED).
- **About the home (optional):** one line, used in the ad words. Today's description is required; making it optional is open decision D-13.
- **One permission box:** "I have permission to market this property and to use these photos in ads." The Realtor's permission moves to the partner record (open decision D-7).
- Actions: Cancel (secondary), Continue (primary).

### 5.2 Step 2, Make it yours

- **Your brand:** a summary of the saved brand (name, company, NMLS) with "Change in Brand". If no brand exists yet, this card becomes the short brand form in place, so nobody leaves the flow.
- **Realtor partner:** radio cards of saved partners, each saying whether that partner agreed to co-branded ads; "No partner"; "Add a Realtor partner". The last partner used is preselected.
- **Ad words,** prefilled from the setup profile and this open house (today's starter text, `features/guided-setup/model/profile.ts:49-56`), all editable: Headline and Ad text. The disclosure comes from the brand and is shown locked. The lead-form consent wording stays prefilled from the brand, behind a "Lead form wording" disclosure (not drawn in the mockup).
- **Budget:** daily $25 and total $125 prefilled (today's floor, `profile.ts:94-95`), with "The ad runs around the property until the open house ends. Housing ads have their own rules. We apply them for you, every time." Today's required "Where the ad runs" field is prefilled from the address under the housing rules, so it is no longer typed.
- **A live ad preview** beside the form at 1440 and 1180, below it on narrow screens.
- Actions: Back, then "Save and check", with "We save this version and run the checks. Nothing is published." This is today's "Save and run the checks": it saves the version and runs the existing checks.

### 5.3 Step 3, Review and launch

- **The actual ad:** a Facebook feed post (page name, "Sponsored", ad text, the image, headline and button), with a Tall (4:5, 1080 by 1350) and Square (1:1, 1080 by 1080) switch (default is open decision D-10). The image is the cover photo plus a band in the loan officer's brand colours carrying the open house time, address, both people, the NMLS number and the Equal Housing Opportunity line. Facebook's exact frame, button labels and image rules are UNVERIFIED in this pass and belong to research gate G3; the mockup draws a generic feed post with no Meta branding.
- **"What you approve":** one card. "Checks passed" chip and a one-line count, a "See what we checked" disclosure, then budget, run dates, who sees it, and where new leads go, with one "Change" link back to step 2. Approval covers exactly these, so they sit above the approve button.
- **Approve this version:** the existing control and copy (`features/campaigns/components/campaign-approval-controls.tsx:169-170`): "Approving applies to this exact version. Nothing is published or sent." Primary "Approve this version", secondary "Send back for changes", and the status line.
- **Launch:** "Launch on Facebook". With Meta not connected it is disabled, and one sentence, tied to the button with `aria-describedby`, says what to do: "Meta isn't connected yet, so connect it in Settings to launch this ad."
- **Details for support:** collapsed, holding the version and support reference (user-language contract section 6).

When launching is possible, "Launch on Facebook" opens an inline confirmation that names the consequence in plain words (Listing Studio's pattern, `ListingMarketing.tsx:93-95`): the page, the budget, the dates, "Your ad starts running and spending once Meta approves it." No typed PUBLISH (the Launch canvas's pattern) is required. The publishing progress states from `03-components/campaign-and-artifact-workflow.md:95-107` apply then, and the page never says "Live" until Meta reports it.

### 5.4 Clicks and fields, today against target

Today's figures are from the recon (section 3) and the create page (`open-house-draft-builder.tsx:436-671`). The target is the happy path for a workspace owner who can approve and has used a partner before.

| Measure | Today | Target | How |
|---|---|---|---|
| Screens to approval | 3 (Overview, create, campaign page) | 4 short ones (Home, three steps), no detour to the campaign page to approve | Approval sits in step 3 |
| Clicks to approval | about 6 | **6**: Start, Add photos, Continue, Save and check, Approve this version, Yes, approve | +1 only when changing the preselected partner |
| Clicks to launch | none: no launch step exists | **8**: the 6 above plus Launch on Facebook and its confirmation | Only once Meta is connected and launching is turned on |
| Fields to fill | 6 to 7 (address, state, description, start, end, where the ad runs, and the Realtor name if not in the profile) | **3**: address, date, start time | State is in the address; end time, ad words, area, budget and partner are prefilled; the description is optional |
| Checkboxes | 2 | **1** | The Realtor's permission lives on the partner record (D-7) |
| Photo uploads | 0 (no ad image today) | 1 | The ad needs an image |
| Overlay walkthrough steps | 3 before and 1 after | **0** | Section 4.4 |
| Sign-up to approved, timed | Under 300 s (006C-AC-015) | Under 300 s, measured on this flow | Keep the timed spec, rewritten for three steps |

The honest trade: the first-ever launch adds a photo upload and a partner choice that today's flow does not have, because today's flow never made an ad. Typing drops by more than half.

### 5.5 Approval rules and the PRD-008b states

The approval rules do not change: an approver or workspace owner approves one exact version; a material edit makes a new version and invalidates approval; approval never publishes; a person who cannot approve gets the hand-off link. Every surface reads the recorded decision, not only the stored state (008B-AC-004, 008B-AC-009 to 008B-AC-011). The step 3 mockup draws the approval and launch cards in each state at the bottom of the page.

| State | Step 3 | Campaign page | Campaigns list | Home |
|---|---|---|---|---|
| Ready for approval (checks passed, no decision) | Approve (primary) and Send back. Launch disabled with one sentence: the Meta sentence while Meta isn't connected (the mockup's case), otherwise "Approve this version first." | Status "Ready for approval"; the same approve card | Chip "Ready for approval" | Listed under "Needs your approval" |
| Ready for approval, viewer can't approve | "You can't approve campaigns in this workspace. Send this link to an approver." with Copy the link | Same hand-off card | Chip "Ready for approval" | Listed for approvers only |
| Needs changes (checks found something; blocked) | Chip "Needs changes", what to fix in one plain line, "Fix it" (primary, returns to the step that holds the field); Approve disabled with its reason | Same chip and fix list; "Make a new version" | Chip "Needs changes" | Not listed |
| Approved, Meta not connected | Chip "Approved", "Approved by <name> on <date>. The approval covers this version only."; Launch disabled with the one Meta sentence | Status "Approved"; Launch disabled with the same sentence | Chip "Approved" | Not listed |
| Approved, Meta connected, launching not turned on yet | Launch disabled: "Launching on Facebook isn't turned on for your workspace yet. Nothing has been published." | Same | Chip "Approved" | Not listed |
| Sent back for changes | Chip "Sent back for changes", "It was sent back for changes, so it needs a new version before anyone can approve it.", "Make a new version" (primary); no approve, no hand-off | Same chip; the version list shows who sent it back and when | Chip "Sent back for changes" | Never listed under approval |
| Launching, live, paused, finished (future, gated) | The progress states; "Live" only after Meta confirms | Status follows Meta, with results | Matching chip | Listed under "Running now" |

The strings in quotation marks above that exist today come from `copy/user-language.ts` (`CAMPAIGN_SENT_BACK_LABEL`, `CAMPAIGN_SENT_BACK_NEEDS_NEW_VERSION`, `CHECK_RESULT_READY`, `CHECK_RESULT_NEEDS_CHANGES`) and `campaign-approval-controls.tsx:219-240`. New strings are listed in section 8.

---

## 6. The campaign page

Mockup: [`mockups/campaign-detail.html`](mockups/campaign-detail.html) (approved, not launched).

- **Header:** "Open House Boost", the address as the title, the open house and partner in one line, the status chip. Actions: "Make a new version" (secondary) and "Launch on Facebook" (primary, disabled here), with the one Meta sentence directly under the buttons.
- **Results**, first and full width: Spend, Leads sent to HighLevel, Cost per lead. Before anything is live, the card carries one chip "Not live yet" and one sentence: "This ad isn't running, so there is nothing to count yet. Spend comes from Meta, and leads are counted when they reach HighLevel." Each figure reads "Not live yet", never a zero (user-language contract section 5, rule 1). Once live, each figure shows its source and freshness (`03-components/metric-source-and-freshness.md`).
- **The ad:** the same feed preview, labelled with its version, plus budget and run dates.
- **Approval:** who approved, when, and that it covers this version only.
- **Versions:** each version, its chip, who saved it or sent it back, and when; older versions open read-only.
- **Details for support:** collapsed.

No pipeline, contact list, or lead table appears here: a lead's life after the hand-off belongs to HighLevel.

## 7. The Campaigns list

Mockup: [`mockups/campaigns-list.html`](mockups/campaigns-list.html).

- Title "Campaigns", one sentence, one primary action: "New Open House Boost".
- **A table at 720px and wider:** Property (the link), Open house, Realtor partner, Status chip, Last change. **Cards below 720px** with the same facts.
- **No results column.** Five rows of "Not live yet" would repeat the same fact five times; results live on each campaign page (OD-D).
- Status chips use the decision-aware label (`campaignStateLabel`, `copy/user-language.ts`), so a sent-back version reads "Sent back for changes" here too.
- Empty state: "No campaigns yet", "Your Open House Boosts show here once you start one.", action "New Open House Boost" (the page's primary, moved into the empty state).

---

## 8. Copy

Every sentence in the mockups follows the user-language contract: second person, plain words, no internal nouns (no "region", "preflight", "provider", "route"), no dashes, and no claim that anything is live or launched. New or changed strings, for the copy module:

| Where | String |
|---|---|
| Home heading | Start an Open House Boost |
| Home lead | Enter the property address. Then add the open house time and photos, put your brand and your Realtor partner on it, and look at the actual Facebook ad before you approve it. |
| Checklist intro | You can start an ad now. It runs once HighLevel and Meta are connected. |
| Checklist states | Not connected yet; Connected; Needs attention; Not started; Done |
| Running now, empty | No ads running. An ad shows here, with its spend and leads, once you launch it. |
| Approval, empty | Nothing to approve. A campaign waits here after its checks pass, until someone approves it or sends it back. |
| Home footer | HighLevel stays your CRM. Your contacts, pipelines and follow-up live there. |
| Step 2 hint | We save this version and run the checks. Nothing is published. |
| Launch, Meta not connected | Meta isn't connected yet, so connect it in Settings to launch this ad. |
| Launch, not turned on | Launching on Facebook isn't turned on for your workspace yet. Nothing has been published. |
| Results, not live | This ad isn't running, so there is nothing to count yet. Spend comes from Meta, and leads are counted when they reach HighLevel. |
| Removed pages | This page is gone. Your leads, pipelines and follow-up live in HighLevel. |

The contract's section 5 strings that name Stripe ("HighLevel, Meta, and Stripe aren't connected ...") stay in force until the owner rules on D-8; the new Home does not use them.

---

## 9. The Claude Design canvases: what carries over

The canvases in `library/knowledge/private/ux-ui/05-html-examples/claude-design/` stay in the repo as history. They stop being the visual reference (rubric axis 10).

| Canvas | Fate | What carries over |
|---|---|---|
| `Overview.dc.html` | Retired | Only the footer idea that HighLevel stays the CRM (its line 135), now Home's footer |
| `Overview Responsive.dc.html` | Retired | Nothing; the 1180 and 390 frames are redrawn as a top bar and Menu button |
| `Dashboard.dc.html` (Marketing Suite performance) | Retired | The three results (spend, leads, cost per lead) move to each campaign page |
| `Campaigns.dc.html` | Reworked | The list with status and one "New" action; search and four filters dropped until there are enough campaigns to need them |
| `Create.dc.html` (six-step wizard) | Replaced | Step 1's fields (address, date and time, photos, rights confirmation) become step 1; the six-step dark stepper and the "22% complete" meter do not |
| `Studio.dc.html` | Retired | The idea that the reviewed thing is the real output, now the step 3 ad preview |
| `Preflight.dc.html` | Folded into step 3 | Blocking findings with a fix action, and "what approval covers", as one compact card |
| `Launch.dc.html` | Folded into step 3 | The snapshot of what launches (page, budget, schedule, area, housing category) and the progress states; typing PUBLISH is dropped for a plain-words confirmation |
| `CampaignDetail.dc.html` | Reworked | Status, the ad, versions, approval; six metrics become three; Pause and Duplicate return only once launching is on |
| `Brand.dc.html` | Reworked later | The locked disclosure and NMLS identity; the eleven-section menu is out of PRD-009's scope |
| `Onboarding.dc.html` | Replaced | The nine-item, two-phase checklist becomes the four-item Home checklist |
| `Welcome.dc.html` | Retired | Nothing; sign-up already lands on Home |
| `Design System.dc.html` | Superseded | Token names survive; values come from section 2.4 |
| `AutomatedLO Directions.dc.html` | History only | Nothing |

---

## 10. Unverified, and what checks it

| Claim | Status | Who checks |
|---|---|---|
| HighLevel draws its own navigation beside the Custom Page at the 1180 frame, and how wide it is | UNVERIFIED | A sandbox location, before the shell is built |
| Inter is under the SIL Open Font License 1.1 | UNVERIFIED here | The vendoring lane, by reading the upstream licence it commits |
| Facebook feed image sizes (1080 by 1080, 1080 by 1350), the button labels Meta allows, image text rules | UNVERIFIED | `meta-ads-guardian` and research gate G3 |
| The housing rules the step 3 check list shows (no age, gender or ZIP targeting; the minimum area) | The brief lists ZIP targeting as never exposed (section 15); the rest is UNVERIFIED | The existing campaign checks and gate G3; the mockup's check names are illustrative |
| Photo limits | Placeholder | The implementation PRD, from the Meta image rules |
| What `/homeowners` does when the switch is off | UNVERIFIED | The implementation lane |

Everything else in this document was read from the files it cites in this worktree or in the Listing Studio snapshot, on 2026-10-01.

## 11. Mockups and how they were checked

Six self-contained HTML files in [`mockups/`](mockups/): inline CSS and SVG only, no scripts, no external requests. Every page carries a "Design mockup" strip saying that each name, address, photo, date and count is a made-up sample; sample addresses contain the word "Sample"; the check count is labelled "(sample count)".

Checked on 2026-10-01 with Playwright 1.63.0 and `@axe-core/playwright` 4.13.0 from this repo, using a throwaway script outside the repo:

- Full-page screenshots of all six pages at 1440 by 900 and 390 by 844, plus Home at 1180 by 900, 768 by 1024 and 1440 Dark: 15 PNGs in [`mockups/previews/`](mockups/previews/).
- No horizontal overflow at any frame; the menu never overlaps the account cluster; every control (buttons, links outside running text, inputs, choice cards, menu items) at least 44px tall; zero requests outside the file.
- axe with the WCAG 2.0, 2.1 and 2.2 A and AA rule sets plus best practices: **0 violations** on all 15 frames, 610 passing checks in total.
- Font: the previews render in Segoe UI because no Inter file is on this machine and the mockups may not fetch one. With Inter vendored, glyphs are slightly wider; the 1180 bar has 127px to spare.
