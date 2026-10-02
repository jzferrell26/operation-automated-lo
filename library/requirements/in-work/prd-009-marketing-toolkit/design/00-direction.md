# PRD-009 design direction: the marketing toolkit

> Status: Proposal for owner review, revision 2 | Date: 2026-10-01 | Author: `design-system-guardian` | Branch: `claude/prd-009-marketing-toolkit` from `e89058e`
>
> Binding inputs: the owner's decisions OD-A to OD-H (2026-10-01, in chat). **Revision 2 follows OD-H:** a curated, platform-wide ads library replaces the open house ad builder. The property step, photo upload and its storage bucket, Zillow and Redfin import, and Realtor co-branding in ads are all dropped. The look and the top menu were approved unchanged ("Yes, as shown", D-2), so section 2 is unchanged except where it named the old flow. Where this document and an older brief, spec or PRD criterion disagree, the owner's decision wins and section 2.8 records the supersession.
>
> Companion files: [`01-open-decisions.md`](01-open-decisions.md) (what still needs the owner) and [`mockups/`](mockups/) (seven static pages, previews in [`mockups/previews/`](mockups/previews/)).
>
> This is a design proposal. It changes no product code, test, screenshot, or design-system file. The PRD-009 sub-PRDs on this branch already follow OD-H (009c is the ads library, 009d is Launch an ad). Where a sub-PRD and this document differ on a format, a string, or a state, the sub-PRD governs. When the owner accepts it, `ux-ui-guardian` carries it into `library/knowledge/private/ux-ui/`.

---

## 1. The direction on one page

1. **What the product is.** A marketing toolkit that launches ready-made Facebook ads for loan officers and hands the leads to HighLevel. HighLevel stays the system of record for contacts, pipelines and automations (OD-A).
2. **The ads come from one library.** The owner curates a platform-wide library of everyday loan officer ads: first-time buyers, refinance, VA loans, pre-approval, down payment help. Each ad is an approved image plus words. A loan officer can change the words, never the image (OD-H).
3. **The launch is three steps** (OD-B as revised by OD-H): **Choose an ad**, **Set it up** (brand applied for you; words, budget, dates and area), **Review and launch** (the actual ad, a one-card check summary, Approve, then "Launch on Facebook", disabled with one honest sentence until Meta is connected).
4. **Plain names.** "Open House Boost" retires from the product. The flow is "Launch an ad", the collection is the "Ads library", the thing you set up is a campaign (the menu keeps "Campaigns"). See section 5.1 and open decision D-16.
5. **The look.** Listing Studio's AutomatedRE layer: a very light page, white bordered cards, navy for text, one action blue (`#005fcc`), 44px controls, Inter. Light is the design target; Dark stays (OD-E). Unchanged from revision 1.
6. **The menu.** Home, Campaigns, Brand, Realtor partners, Homeowner reports (always shown, owner's answer to D-4), Settings. The Ads library is a tab inside Campaigns, so the approved menu does not change.
7. **First run.** Home asks one question, "What do you want to promote?", with five topic buttons and one primary button, "Choose an ad". Beside it, a three-item "Get set up" checklist is the one place the page says what is and isn't connected.
8. **Results live on each campaign's page,** with an honest "Not live yet" until Meta and HighLevel are connected (OD-D).

What does not change: live Meta publishing stays off and gated; approval before launch stays and binds the exact version, including edited words; no fake numbers; the user-language contract; the PRD-008b truthfulness rules; compliance control 9, "Paid advertising is never co-branded with a Realtor or brokerage" (`library/knowledge/private/compliance/compliance-and-risk.md:19`), which OD-H puts back in force.

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
- **Honest note:** Listing Studio's signed-in app uses a light *left rail* (`src/styles/automatedre-components.css:26`, rail width `17rem` at `src/styles/ls-tokens.css:441`). We follow its colours and components, not its layout, because it has more destinations and is not embedded in HighLevel. The owner chose the top bar (D-2, "Yes, as shown").

What the bar holds: the product name on the left; the menu; on the right, Help and the account control (name, Light/Dark/System, Sign out). The theme control moves into the account menu so the bar stays calm; brief section 13's control is unchanged in behaviour.

### 2.2 Font: Inter

**Decision: Inter for everything a person reads.** Reasons:

1. **Geist has never rendered in production.** No Geist binary is in the repo; the font ruling says the product falls through to the system sans until one is vendored (`apps/web/public/fonts/README.md`, "The ruling"). So the "current font" a loan officer sees is Segoe UI or San Francisco, not Geist. Choosing Geist would be a new choice, not keeping one.
2. **It is the font of the look the owner picked.** The AutomatedRE layer sets `--ls-font-ui` to Inter (`src/styles/ls-tokens.css:426`), loaded in `src/app/layout.tsx:2,10` of Listing Studio. Two products from one owner should read as one family.
3. **It suits the job.** Inter has tabular figures for money and dates, which lets us drop the monospace "data font" from ordinary screens (see the token table).

**Delivery.** [`prd-009a-marketing-toolkit-light-look-and-top-menu.md`](../prd-009a-marketing-toolkit-light-look-and-top-menu.md) is the reference: 009A-AC-006 defines the vendored files and how they are verified, 009A-AC-007 the `@font-face` and the font tokens, and Background 3 the licence. In short: the unmodified upstream variable file `InterVariable.woff2` (352,240 bytes) and `LICENSE.txt` from the Inter release tag, each checked against the upstream tag commit and its git blob SHA-1, recorded with its SHA-256 in `apps/web/public/fonts/README.md`; one `@font-face` with `font-display: swap`; then the browser gate that forbids third-party requests, and redrawn baselines. Where this paragraph and 009a differ, 009a governs.

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

The Light/Dark/System control stays. **Light is the design target and, the first-visit default (D-5, recommendation applied).** Dark is checked but not designed screen by screen.

Dark keeps the values measured and signed on 2026-09-20 with four changes:

| Token (Dark) | Old | New | Reason |
|---|---|---|---|
| `--sf-nav` | `#0b1122` | `#1b1e25` | The top bar is a surface like a card, not a slab |
| `--bd-input` | `#454c5c` | `#6b7385` | Visible field edges, as in Light (3.51 on a card) |
| `--ac-secondary` | `#3db3a4` | `#3566d6` | Teal retired |
| `--shadow-card` | two layers, up to 70% | `0 1px 2px rgb(0 0 0 / 24%)` | Minimal shadow, as in Light |

Type, radius, spacing and motion are theme-independent. Listing Studio's own AutomatedRE app is light in both OS modes (`library/knowledge/private/listing-studio-ux-ui/screens/automatedre-brand-release.md:15`), so there is no Listing Studio Dark to copy; this keeps the repo's measured Dark. Preview: [`mockups/previews/home-first-run--1440--dark.png`](mockups/previews/home-first-run--1440--dark.png). Ads, public pages and PDFs never take the dashboard theme (brief section 13, unchanged): the ad (the library art plus the loan officer's brand band) looks the same in both themes.

### 2.7 Motion

Unchanged: `--motion-fast` 120ms, `--motion-base` 180ms, `--motion-slow` 240ms, one curve, all zero under `prefers-reduced-motion`. Nothing on Home moves on its own.

### 2.8 What this supersedes

Dated 2026-10-01, on the owner's decisions OD-A to OD-G. On acceptance, `ux-ui-guardian` edits each file and adds a dated supersession note in place. Nothing is edited by this proposal.

**`library/knowledge/private/ux-ui/00-design-brief.md` (July 20 brief), by section.**

| Section | Lines | What is superseded | By |
|---|---|---|---|
| 1 Product identity | 5, 7 | "operating layer ... automation, reporting"; "Advertising is a capability ... not the identity" | OD-A, OD-B, OD-H: a marketing toolkit whose core is launching ready-made Facebook ads from a curated library |
| 2 Approved design source | 11-17 | The Claude Design package as "the approved visual baseline" | Listing Studio's AutomatedRE layer and these mockups (section 10 below names each canvas's fate) |
| 3 Aesthetic anchors | 23-28 | The four anchors and "deep navy anchor, cobalt primary actions, restrained teal accents" | OD-E light look; OD-F keeps only Broker Marketplace's calm, one-question start |
| 4 Aesthetic boundaries | 32-51 | Nothing removed. "Must not feel like a generic CRM clone" (44) becomes a hard rule: no CRM pages | OD-A |
| 5 Shell and module hierarchy | 55-78 | The nine-item navigation and the Marketing Suite sub-navigation | Section 3 below |
| 6 Root overview purpose | 82-100 | The five questions and the seven required regions | Section 4 below (first-run Home) |
| 7 MVP capability boundaries | 106-117 | "Campaign and outcome reporting" as its own surface; "PDFs, QR codes, creative, email, and SMS packages" in the founding interface | Results per campaign (section 7); ads from the curated library are the founding output (OD-H). The add-ons list (119-130) stands |
| 8 Surface metaphor and depth | 136-142 | "Navigation: deep navy anchor"; shadow tiers as a depth language | Light top bar; borders are the depth (2.3) |
| 9 Color contract | 148-149 | "Cobalt is the primary action color"; teal as a supporting accent | One action blue `#005fcc`; teal retired. Status colour rules (150-157) and the focus-ring rule (161) stand with new values |
| 10 Typography | 165-172 | Geist and Geist Mono; the 23/17/14/13/11.5/10.5 steps | Inter; 28/19/16/16/14/12 (2.2, 2.4) |
| 11 Radius, spacing, icons | 180-184 | Buttons 10px, cards 12 to 14px | Buttons 8px, cards 12px. Spacing and icon rules stand |
| 13 Themes | 220 | "First visit resolves the current operating-system preference" | Light on first visit (D-5, recommendation applied) |
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
| `04-screens/campaign-lifecycle.md` | 7-23 | Six-step create, separate Studio, Preflight and Launch screens, typed confirmation; replaced by section 6, the library flow (OD-H). The invariants (29-38) stand |
| `04-screens/marketing-suite-campaign-performance.md` | whole file | Results move to the campaign page (section 7) |
| `04-screens/onboarding-brand-and-platform-settings.md` | 71-78 | Leads and Pipeline, Automations, Reports, Marketplace module status as settings surfaces |
| `04-screens/workspace-page-completion.md` | 11, 15, 16 | Pages for removed sections |
| `04-screens/homeowner-reports.md` | 13 | "Use the existing navy, cobalt ..." (the token names stand; the values change) |
| `06-review-rubric.md` | 57-60 (axis 10); D-002 (174-198); D-008 (227-255) | "Sibling of the canvases" becomes "sibling of the PRD-009 mockups"; D-002's unchanged field edge is superseded by visible edges; D-008's rail ruling has no rail to govern |

**Requirements and standards** (for `library-guardian` to cite when writing PRD-009; the recon lists them in full): PRD-001 index lines 58 and 140, PRD-001g 19-63, 005E-AC-010, PRD-006b's Reports inventory (28, 186-187), 006D D3's "reports (not connected)" screen (78) and the criteria that apply to it (006D-AC-007, 008, 009, 012, 017), and the PRD-006c walkthrough criteria named in 4.4. PRD-004 RGL-002 is **not** superseded; section 4.3 shows how the new Home still meets it. The user-language contract's section 5 strings that name Stripe change under D-8 (recommendation applied). On this branch, sub-PRDs 009c (property intake) and 009d (three-step launch) describe the open house flow that OD-H drops; 009c is superseded whole and 009d is rewritten from section 6. The compliance rule that ads avoid rate and payment claims (`compliance-and-risk.md:48`) is unchanged and now applies to every library ad.

---

## 3. Information architecture (OD-A, OD-C, OD-D, OD-H)

### 3.1 The menu

| Item | What it is | Notes |
|---|---|---|
| Home | First run: "Launch an ad", the setup checklist, what's running, what needs approval | Today's `/overview`, redesigned (section 4) |
| Campaigns | Two tabs: **Your campaigns** (the list) and **Ads library** (browse and filter). One primary action: "Launch an ad" | The library sits inside Campaigns so the approved menu stays as it is |
| Brand | The loan officer's name, title, NMLS number, company and company NMLS, brand colour, disclosure line (no logo upload in PRD-009; the band uses an initials tile, 009d Non-Goals) | Everything the ad's brand band needs (section 5.4). One brand for ads and homeowner reports |
| Realtor partners | The saved partner list | The owner kept it in the menu (OD-C); its purpose without co-branded ads is open decision D-20. It no longer feeds the ads or the setup checklist |
| Homeowner reports | PRD-007's reports | Always shown (owner's answer to D-4) |
| Settings | Account; Connections (HighLevel, Meta); Where new leads go in HighLevel | Unchanged from revision 1 |

### 3.2 What goes

Leads and Pipeline, Automations, Reports, Workspace tools, the Marketing Suite hub and its five sub-pages, and the "Expand Marketing" toggle, as in revision 1. OD-H adds: the property step, photo upload and the storage bucket, Zillow and Redfin import, and the Realtor partner picker in the launch flow.

### 3.3 Every old URL's fate

Unchanged from revision 1 except the rows marked **(OD-H)**. Keep the addresses of pages that survive (open decision D-12, recommendation applied).

| URL today | What it shows today | Fate |
|---|---|---|
| `/overview` | Overview | **Kept.** It is Home |
| `/marketing` | Marketing Suite hub | **Redirect** to `/marketing/campaigns` |
| `/marketing/campaigns` | Campaign list | **Kept.** The "Your campaigns" tab |
| `/marketing/campaigns/library` | (new) | **New (OD-H).** The "Ads library" tab. Proposed address; `?topic=refinance` filters |
| `/marketing/campaigns/new` | Create page | **Kept, reworked (OD-H).** The "Launch an ad" flow. `?topic=` opens step 1 filtered; `?ad=<id>` opens step 2 with that ad chosen; the step can live in the address so Back and reload work |
| `/marketing/campaigns/[campaignRef]` | Campaign detail | **Kept** (campaign page, section 7) |
| `/marketing/campaigns/synthetic-open-house-001` | Demo example | **Unchanged:** already not-found on a signed-in workspace |
| `/marketing/property-sites`, `/marketing/creative`, `/marketing/ads` | Marketing Suite sub-pages | **Redirect** to `/marketing/campaigns` |
| `/marketing/messaging` | Email and SMS drafts | **Redirect** to `/marketing/campaigns`; saved drafts kept (D-6, recommendation applied) |
| `/marketing/blueprints` | Campaign templates | **Redirect (OD-H)** to `/marketing/campaigns/library`: the library is what templates were reaching for |
| `/brand`, `/partners` | Brand, Realtor partners | **Kept** |
| `/leads`, `/leads/pipeline`, `/automations` | CRM pages | **Not-found** with "This page is gone. Your leads, pipelines and follow-up live in HighLevel." and "Go to Home" |
| `/reports` | Reports | **Redirect** to `/marketing/campaigns` (results live per campaign) |
| `/marketplace` | Workspace tools | **Redirect** to `/overview` |
| `/settings`, `/settings/account`, `/settings/connections`, `/settings/routing`, `/settings/billing` | Settings | **Kept** as in revision 1 |
| `/settings/profile`, `/settings/team` | Brand editor, access | **Redirect** to `/brand` and `/settings/account` |
| `/onboarding` | Onboarding checklist | **Redirect** to `/overview` |
| `/homeowners`, `/homeowners/new`, `/homeowners/[propertyId]` | Homeowner reports | **Kept**, always in the menu |
| `/design-surfaces` | Page-state gallery | **Unchanged:** not-found outside the local demo |

---

## 4. First-run Home (OD-F)

Mockup: [`mockups/home-first-run.html`](mockups/home-first-run.html). Previews at 1440, 1180, 768, 390 and 1440 Dark.

### 4.1 Composition

```
+--------------------------------------------------------------------------+
| Automated LO   Home  Campaigns  Brand  Realtor partners  ...  Help  (JR) |
+--------------------------------------------------------------------------+
  Welcome, Alex.
  +---------------------------------------------+  +----------------------+
  | Ads library                                 |  | Get set up  0 of 3   |
  | LAUNCH AN AD                        (h1)    |  | [progress]           |
  | One sentence: pick, brand added, approve.   |  | Connect HighLevel [Connect]
  | What do you want to promote?                |  | Connect Meta      [Connect]
  | (First-time buyers) (Refinance) (VA loans)  |  | Add your brand    [Add]  |
  | (Pre-approval) (Down payment help)          |  +----------------------+
  | [ Choose an ad ]                            |
  | (1) Choose an ad (2) Set it up (3) Review   |
  +---------------------------------------------+
  +---------------------+ +---------------------+
  | Running now         | | Needs your approval |
  +---------------------+ +---------------------+
            HighLevel stays your CRM. Your contacts, pipelines and follow-up live there.
```

**The one question** is now "What do you want to promote?" (OD-F's calm, one-question start, applied to the library). The five topic buttons are small and secondary; each opens step 1 filtered to that topic. The one primary button, "Choose an ad", opens step 1 showing every ad. Either way the next screen is the library, so the click count is the same.

### 4.2 The "Get set up" checklist: three items

| Item | What it says | States | Action |
|---|---|---|---|
| Connect HighLevel | New leads from your ads go to your HighLevel account. | Not connected yet; Connected; Needs attention | Connect / Fix it |
| Connect Meta | Your Facebook page and ad account, so your ads can run. | Not connected yet; Connected; Needs attention | Connect / Fix it |
| Add your brand | Your name and NMLS number. They go on every ad automatically. | Not started; Done (name and NMLS number saved); Needs attention (NMLS number missing) | Add / Edit |

"Add a Realtor partner" leaves the checklist: under OD-H a partner changes nothing about an ad. The rest of revision 1's rules hold: one sentence states the consequence once ("You can set up an ad now. It runs once HighLevel and Meta are connected."); progress comes only from saved records; the card collapses to "You're set up" when done and reopens if something breaks.

_Amended 2026-10-02 by the PRD-009 writing review (MTK-008, W-2/W-3): the Meta sentence is "Your Facebook page and ad account. Meta needs both before an ad can launch.", and the action while nothing is connected is "See what's needed" in place of "Connect", because launching stays off in PRD-009 even when both accounts are connected and the page the action opens has no connect control. "Fix" stays for Needs attention. The intro sentence quoted above is replaced in section 9._

### 4.3 Connection status appears once

Unchanged: the shell-wide banner and its copy in the identity card go (D-11, recommendation applied). Each other page states a connection fact only where it changes what the person can do. PRD-004 RGL-002 still holds.

### 4.4 What replaces the floating walkthrough

Unchanged: the inline checklist, the "Step 1 of 3" indicator in the launch flow, and hints beside the fields (D-15, recommendation applied). Nothing ever covers content. The PRD-006c criteria to retire or rewrite: 006C-AC-005 (opens on first render), 006C-AC-006 (the seven steps), 006C-AC-008 (the "Finish setup" chip), 006C-AC-009 ("Show me around again"), 006C-AC-010 to 006C-AC-013 (panel and sheet behaviour), and 006C-AC-018 (the final step's not-connected statement). The five-minute target (006C-AC-015) stays, measured on the library flow.

### 4.5 The two lists below

Unchanged rules (an icon, what would be here, why, at most one action). "Running now" links to "Launch an ad"; "Needs your approval" has no action and reads the recorded decision, so a sent-back version never appears there.

---

## 5. The Ads library (OD-H)

Mockups: [`mockups/ads-library.html`](mockups/ads-library.html) (browse) and [`mockups/launch-step-1-choose.html`](mockups/launch-step-1-choose.html) (choose). Eight sample ads across five topics, drawn in SVG and marked "Sample image".

### 5.1 Naming

| Thing | Name in the product | Why |
|---|---|---|
| The collection | **Ads library** | Says what it is. A loan officer reads "templates" or "blueprints" as something to build from |
| One entry | **an ad** | Plain; matches "Launch on Facebook" |
| The flow | **Launch an ad** | The owner's "click click launch". Steps: **Choose an ad**, **Set it up**, **Review and launch** |
| What a loan officer sets up from an ad | **a campaign**, named after the ad ("First home, start here") | The approved menu says "Campaigns"; a campaign is one ad with your words, budget, dates and area |
| Topics | First-time buyers, Refinance, VA loans, Pre-approval, Down payment help | The owner's own examples, in sentence case |
| Retired | "Open House Boost" | It no longer describes the ads (OD-H). It survives only in history documents |

The alternative, renaming the menu item "Campaigns" to "Ads", is open decision D-16.

### 5.2 Where the library appears

- **Campaigns, "Ads library" tab:** browse. Topic chips with counts ("All 8", "Refinance 2"), then a grid of ad cards. Each card shows the ad **with the viewer's own brand already applied**, its topic label, its name, its default headline, "Version 3. Reviewed Oct 1, 2026.", and "Use this ad".
- **Launch an ad, step 1:** the same cards and filter inside the step indicator. "Use this ad" goes straight to step 2; there is no separate Continue.
- **Home:** the topic buttons open step 1 filtered.
- **No search and no sorting** while the library fits on a screen (open decision D-17).
- **Brand not set up yet:** cards show a placeholder band, "Your name and NMLS number go here", and the person can still set up an ad; the checks send it back until Brand has a name and NMLS number.
- **Grid:** four cards a row at 1440, three at 1180, two at 768, one at 390. The topic chips scroll sideways on a phone instead of wrapping into a tall block.

### 5.3 The catalog: what each ad needs

**[`prd-009c-marketing-toolkit-ads-library.md`](../prd-009c-marketing-toolkit-ads-library.md) D1 governs the format.** This section summarizes it for design readers; where the two differ, 009c wins and this section is the bug. The library lives in the repository as a versioned catalog of data plus image files, and adding or changing an ad is a small reviewed change merged by the owner (009c D7). There is no upload screen in PRD-009.

**Where it lives** (009c Scope and D2): the real catalog is `apps/web/src/features/ads-library/catalog/catalog.json`, a list of entries that starts empty, with its art under `apps/web/public/ads-library/`. The sample catalog is `apps/web/src/fixtures/ads-library/sample-catalog.json`, with its art under `apps/web/src/fixtures/ads-library/art/`, loaded only when the sample guard passes (009c D3).

| Field | Rule (009c D1) |
|---|---|
| `id` | Lower-case kebab case, at most 60 characters, stable for the life of the ad, never reused |
| `version` | Integer from 1; versions of one `id` are contiguous. An existing `(id, version)` is never edited; a change is a new version |
| `status` | `active` or `retired` on an ad's highest version; `replaced` on every lower version |
| `sample` | `true` in the sample catalog, `false` in the real catalog, without exception |
| `topic` | One of `first-time-buyers`, `refinance`, `va-loans`, `pre-approval`, `down-payment-help` |
| `name` | 3 to 60 characters; the card title and the campaign's name. Sample entries start "Sample:" |
| `images.tall.art` | Exactly `<id>/v<version>/tall.png` or `.jpg`: a PNG or JPEG of exactly **1080 by 1080**, the top of the 4:5 ad. The product composes it to 1080 by 1350 by adding the 270px brand band (5.4) |
| `images.square.art` | Exactly `<id>/v<version>/square.png` or `.jpg`: **1080 by 842**, the top of the 1:1 ad. Composed to 1080 by 1080 with the 238px band |
| `images.tall.sha256`, `images.square.sha256` | The SHA-256 of each file's bytes, 64 lower-case hexadecimal characters. The loader refuses an entry whose bytes differ |
| `images.alt` | 10 to 200 characters describing the image's words and picture |
| `defaults.headline`, `defaults.primaryText` | Prefilled words, within `editable`'s limits and passing the word checks of 009d D5 |
| `editable` | `headline.maxLength` at most 60, `primaryText.maxLength` at most 300. Product limits; Meta's own limits are UNVERIFIED |
| `callToAction` | One value from a fixed list, `LEARN_MORE` by default; Meta's allowed list is UNVERIFIED |
| `specialAdCategory` | `HOUSING` until `meta-ads-guardian` confirms otherwise (D-19) |
| `compliance.notes`, `compliance.requiredOnAd`, `compliance.blockedInWords` | `requiredOnAd` includes `nmls` and `equal-housing`; `notes` state rules in general terms, with no lender name or lender policy text, because the repository is public |
| `approval.approvedBy`, `approval.approvedOn` | The owner's handle `jzferrell26` (a handle, not a real name) and the date he approved this version. In the sample catalog, the literal "Sample catalog, not a real approval" |
| `retired.on`, `retired.reason`, `retired.replacedBy` | Required exactly when `status` is `retired`; `replacedBy` names an `id` that exists |

The art rules in 009c D1 also hold: each file at most 1 MiB, its type decided by its magic bytes, SVG refused, no EXIF, XMP, IPTC, or PNG text metadata, and `art` never free text (the loader derives the path from `id` and `version`, keeps it inside its fixed root, and checks the digest at load).

An entry in the real catalog's shape. **Illustrative only:** the two `sha256` values are placeholders that stand for the real files' digests, and 009c D1 governs every field.

```json
{
  "id": "first-home-start-here",
  "version": 3,
  "status": "active",
  "sample": false,
  "topic": "first-time-buyers",
  "name": "First home, start here",
  "images": {
    "tall": {
      "art": "first-home-start-here/v3/tall.png",
      "sha256": "0000000000000000000000000000000000000000000000000000000000000000"
    },
    "square": {
      "art": "first-home-start-here/v3/square.png",
      "sha256": "0000000000000000000000000000000000000000000000000000000000000000"
    },
    "alt": "Your first home starts here, with a house and a key"
  },
  "defaults": {
    "headline": "Buying your first home? Start with a plan.",
    "primaryText": "I help first-time buyers understand every step, from pre-approval to closing day. Send me a message and let's talk about where you are today."
  },
  "editable": { "headline": { "maxLength": 60 }, "primaryText": { "maxLength": 300 } },
  "callToAction": "LEARN_MORE",
  "specialAdCategory": "HOUSING",
  "compliance": {
    "notes": "No rates, payments or loan terms.",
    "requiredOnAd": ["nmls", "equal-housing"],
    "blockedInWords": ["rate-claims", "payment-claims", "term-claims", "guarantees", "realtor-or-brokerage-names"]
  },
  "approval": { "approvedBy": "jzferrell26", "approvedOn": "2026-10-01" }
}
```

**What a campaign version records from the library** (the `library-ad` manifest variant, 009c D5): `libraryAd` (`id`, `version`); `content` (the edited `headline` and `body`, the library's `callToAction`, the disclosure line and lead form wording read from the person's saved Brand, and empty `claims`, `mergeTokens`, and `financingTerms`); `images` (each art file with a reference derived from the ad's `id`, `version` and shape, `approvalStatus: "approved"`, its exact size, and `contentSha256` copied from the catalog); `advertiser` (the frozen band values and nothing else about any person); `schedule` (`startsAt`, null for "when you launch it", and `endsAt`); `meta` (the Housing category, `placements: ["facebook_feed"]`, country, regions (states), cities, the always-empty ZIP, custom audience and protected-dimension lists, and the budgets); and `routing`. The variant has no `partner` or `property` block and no key that can hold a Realtor or brokerage identity. Because the manifest hash covers all of it, an approval covers that library ad version, its art bytes, those words, and that brand.

### 5.4 How the loan officer's brand goes on an ad

The product composes every ad from two parts: the library's art, which nobody but the curator changes, and a **brand band** drawn from Brand, which the loan officer never edits on the ad itself.

- **Where:** the bottom 20% of the tall ad (270px of 1350) and the bottom 22% of the square ad. The curator keeps that zone plain in the art.
- **What, left to right:** an initials tile in the brand colour (PRD-009 has no logo upload, 009d Non-Goals); the name in bold, then title and NMLS number; the company name on the right; the disclosure line from Brand along the bottom ("Equal Housing Opportunity.").
- **Colour:** the band is white with navy text, so its contrast never depends on the loan officer's colours. The brand colour appears only as the thin rule above the band and behind the initials tile. Making the whole band brand-coloured is open decision D-24.
- **Missing pieces:** the initials tile is the only mark in PRD-009, so no ad waits for a logo (D-25); no NMLS number fails the checks with "Add your NMLS number in Brand", so the version cannot be approved; a long name wraps to two lines and then shrinks to a floor before it truncates.
- **The Facebook post header** shows the loan officer's Facebook page name once Meta is connected; until then, the preview uses the Brand name.
- **Frozen at "Save and check":** the brand values, the library ad id and version, and the edited words are saved together as one version, the same freeze Listing Studio applies to its marketing snapshot (recon: `src/lib/office/data.ts:35-53`). Approval binds that exact version. Editing Brand later never changes an approved version; the campaign page offers "Make a new version" to pick up the new brand.
- **Realtor names never appear** on a paid ad (control 9). The edited words are checked for Realtor and brokerage names too.

### 5.5 Retiring an ad, and new versions of an ad

The library never deletes an ad. Retiring it hides it from new choices; the effect on campaigns depends on where each one stands.

| Campaign stands at | What happens when its ad is retired |
|---|---|
| Draft, or saved but not decided | It cannot be approved. It shows "Ad retired" and "This ad was taken out of the library on <date>, so this draft can't be approved. Your budget, dates and area are kept." with one action, "Choose another ad" (the step 3 mockup draws this state) |
| Approved, not launched | Recommended: it cannot launch; the same notice and "Choose another ad"; the approval does not carry over to a new ad (open decision D-21) |
| Running (once launching exists) | Recommended: it keeps running to its end date with one added line on its page; a retirement marked as a compliance withdrawal flags it "Needs attention". Stopping a live ad needs the future Meta publish work (D-21) |
| Finished | Nothing changes. Its page still shows the exact ad, version and words it ran with |

**A new version of an ad** (version 3 becomes 4) never changes an existing campaign. A draft still on the older version shows "A newer version of this ad is in the library" with "Use the new version", which replaces its words with the new defaults after asking. Approved and running campaigns keep their version.

---

## 6. Launch an ad: three steps (OD-B as revised by OD-H)

Mockups: [`launch-step-1-choose.html`](mockups/launch-step-1-choose.html), [`launch-step-2-set-up.html`](mockups/launch-step-2-set-up.html), [`launch-step-3-review-and-launch.html`](mockups/launch-step-3-review-and-launch.html) (Meta not connected).

### 6.1 Step 1, Choose an ad

The library grid inside the step indicator (5.2), filtered when the person came from a topic button. "Use this ad" on a card moves to step 2 with that ad. Cancel returns to where the person started. On a choosing screen the choices are the actions, so every card button is secondary and no single blue button competes with the ads.

### 6.2 Step 2, Set it up

- **Your brand on the ad:** a read-only summary of what the band will carry, with "Change in Brand", and one line: "Added for you from Brand. The image and layout come from the library and can't be changed."
- **Ad words:** Headline and Ad text, prefilled with the library's words, each with a live character count, plus "Use the library words" to undo edits. The disclosure is shown locked. One hint: "Don't add rates, payments or loan terms here. The checks will send them back for changes."
- **Budget and dates:** daily $25 and total $350 prefilled; "Starts: when you launch it"; "Ends" prefilled 14 days out. The defaults are open decision D-22 (today's floor of $25 a day, `features/guided-setup/model/profile.ts:94-95`, is kept).
- **Where it shows:** places, not people. Chips for each city or state added ("Austin, TX", each with a 44px remove button), an "Add a city or state" field, and one line: "Mortgage ads can't be aimed by age, gender or ZIP code, so you choose places, not people. Meta may also widen a small area." "Shows in: the Facebook feed." What this offers under the Special Ad Category rules is open decision D-18; the exact current Meta rules are UNVERIFIED. The first time, the person types one city; after that the last area is prefilled. Before Meta is connected, places are saved by name and matched to Meta's locations when it is (the connection already models country, region and city, `packages/ghl/src/meta-adapter.ts:287-293`).
- **A live preview** of the actual ad beside the form at 1440 and 1180, below it on narrow screens.
- Actions: Back, then "Save and check" with "We save this version and run the checks. Nothing is published."

### 6.3 Step 3, Review and launch

- **The actual ad** in a generic Facebook feed frame (no Meta branding), with the Tall (4:5) and Square (1:1) switch; tall is the default (D-10, recommendation applied). A caption says the image is the library's and the band is the loan officer's brand.
- **"What you approve":** "Checks passed" and the count, "See what we checked" (NMLS on the ad, Equal Housing line on the ad, no rate, payment or term claims in your words, no age, gender or ZIP targeting), then the facts the approval covers: the library ad and version, which words were changed, budget, run dates, who sees it and where, and where new leads go. One "Change" link back to step 2.
- **Approve this version:** the existing control and copy (`features/campaigns/components/campaign-approval-controls.tsx:169-170`), now "Approving applies to this exact version, with your words. Nothing is published or sent."
- **Launch:** "Launch on Facebook", disabled until Meta is connected, with one sentence tied by `aria-describedby`: "Meta isn't connected yet, so connect it in Settings to launch this ad." In PRD-009 it stays disabled even when Meta is connected, with "Launching on Facebook isn't turned on for your workspace yet. Nothing has been published." (PRD-009 index: no launch route in this PRD).
- **Details for support:** collapsed; holds the version, the library ad id and version, and the support reference.

### 6.4 Clicks and fields, today against target

Today's figures are from the recon and the create page (`open-house-draft-builder.tsx:436-671`). The target is the happy path for a workspace owner who can approve.

| Measure | Today | Revision 1 (open house) | **Target now (library)** |
|---|---|---|---|
| Screens to approval | 3 | 4 | **4**: Home, Choose, Set up, Review |
| Clicks to approval | about 6 | 6 | **6 the first time**: Choose an ad, Use this ad, Add (the city), Save and check, Approve this version, Yes, approve. **5 after that**, when the area is remembered |
| Clicks to launch | no launch step | 8 | **8 the first time, 7 after**, once Meta is connected and launching is turned on |
| Fields to fill | 6 to 7 | 3 | **1 the first time** (one city), **0 after that**. Words, budget and dates are prefilled |
| Checkboxes | 2 | 1 | **0**. The owner supplies the library images and answers for their rights; the property and Realtor permissions have nothing left to cover |
| Uploads | 0 | 1 photo | **0** |
| Overlay walkthrough steps | 4 | 0 | **0** |
| Sign-up to approved, timed | under 300 s | under 300 s | **under 300 s**, the existing bar, measured on this flow; expected to be far lower |

### 6.5 Approval rules and the PRD-008b states

The rules do not change: an approver or workspace owner approves one exact version, now including the edited words and the frozen brand; any edit makes a new version; approval never publishes; a person who cannot approve gets the hand-off link. Every surface reads the recorded decision (008B-AC-004, 008B-AC-009 to 008B-AC-011). The step 3 mockup draws each state at the bottom of the page.

| State | Step 3 | Campaign page | Campaigns list | Home |
|---|---|---|---|---|
| Ready for approval | Approve (primary) and Send back. Launch disabled with one sentence: the Meta sentence while Meta isn't connected, otherwise "Approve this version first." | Status "Ready for approval" with the same approve card | Chip "Ready for approval" | Under "Needs your approval" |
| Ready for approval, viewer can't approve | "You can't approve campaigns in this workspace. Send this link to an approver." with Copy the link | Same | Same chip | For approvers only |
| Needs changes | Chip "Needs changes", the plain fix ("Take 'low rates' out of the headline. Ads can't state rate claims."), "Fix it" back to step 2 | Same, with "Make a new version" | Chip "Needs changes" | Not listed |
| Approved, Meta not connected | Chip "Approved", "Approved by <name>, <role>, on <date>. The approval covers this version and these words only." (009E-AC-004); Launch disabled with the Meta sentence | Same | Chip "Approved" | Not listed |
| Approved, launching not turned on | Launch disabled: "Launching on Facebook isn't turned on for your workspace yet. Nothing has been published." | Same | Chip "Approved" | Not listed |
| Sent back for changes | "It was sent back for changes, so it needs a new version before anyone can approve it." and "Make a new version" | Same; the version list shows who sent it back | Chip "Sent back for changes" | Never under approval |
| Ad retired (draft or undecided) | Chip "Ad retired", the notice from 5.5, "Choose another ad" | Same | Chip "Ad retired" | Not listed |
| Launching, live, paused, finished (future, gated) | The progress states; "Live" only after Meta confirms | Status follows Meta, with results | Matching chip | Under "Running now" |

---

## 7. The campaign page

Mockup: [`mockups/campaign-detail.html`](mockups/campaign-detail.html) (approved, not launched). No property anywhere.

- **Header:** eyebrow "From the ads library, First-time buyers"; the ad's name as the title; one line with run dates, area and budget; the status chip. Actions: "Make a new version" (secondary) and "Launch on Facebook" (primary, disabled) with the one Meta sentence directly under the buttons.
- **Results**, first and full width: Spend, Leads sent to HighLevel, Cost per lead, each "Not live yet" under one chip and one sentence, never a zero. Unchanged from revision 1.
- **The ad:** the feed preview of the approved version, plus the library ad and version, which words were changed, and who it shows to.
- **Approval:** "Approved by <name>, <role>, on <date>." and that it covers this version and these words only (009E-AC-004).
- **Versions:** each version, its chip, who saved it or sent it back, and when.
- **Library notices,** one line each, only when they apply: the ad was retired (5.5); a newer version exists; Brand changed after approval ("Make a new version to use it").
- **Details for support:** collapsed.

## 8. The Campaigns list

Mockup: [`mockups/campaigns-list.html`](mockups/campaigns-list.html).

- Title "Campaigns", the two tabs ("Your campaigns", "Ads library"), one primary action "Launch an ad".
- **Table at 720px and wider:** Ad (a small thumbnail, decorative, and the name as the link), Topic, Runs, Where it shows, Status, Last change. **Cards below 720px** with the same facts.
- No results column (results live on each campaign page).
- Status chips read the recorded decision (`campaignStateLabel`).
- Empty state: "No campaigns yet", "Pick an ad from the library to set up your first one.", action "Launch an ad". _(Amended 2026-10-02 by the PRD-009 writing review (MTK-008, W-10): with no ad in the library the sentence is the library's own, "No ads in the library yet. New ads are added after they're reviewed, so there's nothing to set up until then.", because there is nothing to pick.)_

---

## 9. Copy

Every sentence in the mockups follows the user-language contract: second person, plain words, no internal nouns, no dashes, no claim that anything is live or launched. New or changed strings since revision 1:

| Where | String |
|---|---|
| Home heading | Launch an ad |
| Home lead | Pick a ready-made Facebook ad for loan officers. Your name and NMLS number go on it for you. You set the budget, dates and area, then approve it. |
| Home question | What do you want to promote? |
| Checklist intro | You can set up an ad now. It runs once HighLevel and Meta are connected. |
| Library lead | Ready-made ads for loan officers, reviewed before they're added. Your name and NMLS number go on each one automatically. You can change the words; the image stays as it is. |
| Step 2 brand line | Added for you from Brand. The image and layout come from the library and can't be changed. |
| Step 2 words hint | Don't add rates, payments or loan terms here. The checks will send them back for changes. |
| Step 2 area hint | Mortgage ads can't be aimed by age, gender or ZIP code, so you choose places, not people. Meta may also widen a small area. |
| Approve line | Approving applies to this exact version, with your words. Nothing is published or sent. |
| Retired ad | This ad was taken out of the library on <date>, so this draft can't be approved. Your budget, dates and area are kept. |
| Retired ad, approved campaign | This ad was taken out of the library on <date>. This campaign keeps the version you approved. |
| Newer version | A newer version of this ad is in the library. |
| Launch, Meta not connected | Meta isn't connected yet, so connect it in Settings to launch this ad. |
| Launch, not turned on | Launching on Facebook isn't turned on for your workspace yet. Nothing has been published. |

_Amended 2026-10-02 by the PRD-009 writing review (MTK-008, W-2/W-3): the checklist intro is "You can set up an ad now. Launching it on Facebook isn't turned on yet, and it needs HighLevel and Meta connected.", because launching stays off in PRD-009 even when both accounts are connected, and the connection actions say "See what's needed" while nothing is connected, because the page they open has no connect control._

_Amended 2026-10-02 by the PRD-009 writing review (MTK-008, W-8): the retired-ad sentence for an approved campaign ends "This campaign keeps its approved version.", because the reader may not be the person who approved it._

The area hint states the product's own rule (it never offers those choices, `compliance-and-risk.md:65-72`). The clause "Meta may also widen a small area" depends on Meta's current rules and stays UNVERIFIED until checked (D-18).

---

## 10. The Claude Design canvases: what carries over

The canvases stay in the repo as history and stop being the visual reference.

| Canvas | Fate | What carries over |
|---|---|---|
| `Overview.dc.html` | Retired | Only the idea that HighLevel stays the CRM (its line 135), now Home's footer |
| `Overview Responsive.dc.html` | Retired | Nothing; frames redrawn with the top bar |
| `Dashboard.dc.html` | Retired | The three results move to each campaign page |
| `Campaigns.dc.html` | Reworked | The list with status and one "new" action, now with the Ads library tab; its search and four filters wait (D-17) |
| `Create.dc.html` (six-step wizard) | **Retired (OD-H)** | Nothing: the property, people and assets steps are gone. The library plus "Set it up" replace the whole wizard |
| `Studio.dc.html` | Retired | The idea that you review the real output, now step 3 |
| `Preflight.dc.html` | Folded into step 3 | Blocking findings with a fix action, and "what approval covers", as one card |
| `Launch.dc.html` | Folded into step 3 | The snapshot of what launches (budget, schedule, area, category) and, later, the progress states; typing PUBLISH is dropped |
| `CampaignDetail.dc.html` | Reworked | Status, the ad, versions, approval; three results instead of six; no property |
| `Brand.dc.html` | Reworked later | The locked disclosure and the NMLS identity, now feeding the brand band |
| `Onboarding.dc.html` | Replaced | The three-item Home checklist |
| `Welcome.dc.html` | Retired | Nothing |
| `Design System.dc.html` | Superseded | Token names survive; values from section 2.4 |
| `AutomatedLO Directions.dc.html` | History only | Nothing |

---

## 11. Unverified, and what checks it

| Claim | Status | Who checks |
|---|---|---|
| Meta's current Special Ad Category rules for mortgage ads: which category (Housing, or Meta's financial products category), allowed location types, any minimum area, and whether Meta widens small areas | UNVERIFIED | `meta-ads-guardian` and research gate G3, before PRD-009 build fixes D-18 and D-19 |
| Facebook feed image sizes (1080 by 1350, 1080 by 1080), headline and text limits, the allowed button labels | UNVERIFIED | Same |
| HighLevel's own navigation beside the Custom Page at the 1180 frame | UNVERIFIED | A sandbox location |
| Inter's licence and the exact vendored files | Read upstream by 009a (Background 3: SIL Open Font License 1.1; 009A-AC-006: tag commit, sizes, git blob SHA-1s) | The vendoring lane, against 009A-AC-006 |
| The check names in the step 3 mockup | Illustrative; drawn from `compliance-and-risk.md` (Regulation Z, targeting, control 9) | The PRD-009 checks criteria |

Everything else was read from the files cited, in this worktree or in the Listing Studio snapshot, on 2026-10-01.

## 12. Mockups and how they were checked

Seven self-contained HTML files in [`mockups/`](mockups/): `home-first-run`, `ads-library`, `launch-step-1-choose`, `launch-step-2-set-up`, `launch-step-3-review-and-launch`, `campaign-detail`, `campaigns-list`. Inline CSS and SVG only, no scripts, no external requests. Every page carries a strip saying the strings and states are illustrative and the sub-PRDs govern, and every ad image carries a "Sample image" tag. People and companies use the repository's own sample identity, as the sample catalog does (009c D2): Alex Morgan, Prairie Home Lending, NMLS 0000000, from `apps/web/src/features/brand/model/synthetic-brand-profile.ts`. No other person is named, and no made-up NMLS number appears. The eight sample ads avoid rate, payment and term claims.

Checked on 2026-10-01 with Playwright 1.63.0 and `@axe-core/playwright` 4.13.0 from this repo, using a throwaway script outside the repo:

- Full-page screenshots of all seven pages at 1440 by 900 and 390 by 844, plus Home at 1180 by 900, 768 by 1024 and 1440 Dark: 17 PNGs in [`mockups/previews/`](mockups/previews/). The revision 1 `create-step-*` mockups and previews are deleted.
- No horizontal overflow at any frame; the menu never overlaps the account cluster; every control at least 44px tall; zero requests outside the file.
- axe with the WCAG 2.0, 2.1 and 2.2 A and AA rule sets plus best practices: **0 violations** on all 17 frames, 656 passing checks in total.
- Font: the previews render in Segoe UI because no Inter file is on this machine and the mockups may not fetch one.
