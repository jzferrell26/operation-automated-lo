# Pillar 1: Frontend & Design Systems

## CRITICAL DIRECTIVES

Before acting in this domain you MUST load these skills via the Skill tool:

- `react-weapon`: owns React 18/19 architecture, bulletproof-react state layering, and data-fetching boundaries; the base layer nearly every frontend task sits on top of.
- `preact-weapon`: owns Preact signals, preact/compat migration, and embed-widget bundle discipline when the stack is Preact instead of React.
- `design-system-weapon`: owns bootstrapping a brand-new design system's seven-artifact source of truth; load before any greenfield UI work.
- `ux-ui-weapon`: owns steady-state enforcement of an existing design system, per-library integration rules, and pixel-perfect deltas.
- `dark-mode-theming-weapon`: owns the CSS variable token layer, `next-themes` wiring, and FOWT/hydration safety for theming.
- `typography-font-weapon`: owns typeface selection, fluid type scales, and the type-token architecture.
- `font-loading-weapon`: owns the font-display/preload/subsetting mechanics that make typography choices performant.
- `icon-system-weapon`: owns icon library selection, dynamic-import-by-name, and the icon accessibility contract.
- `image-optimization-weapon`: owns AVIF/WebP format selection, responsive srcset, and blur placeholders.
- `modal-toast-dialog-weapon`: owns the accessible overlay primitive selection (Radix, Vaul, Sonner, cmdk) and the six-point modal contract.
- `csv-xlsx-import-export-weapon`: owns the spreadsheet upload/export surface (parsing, column-mapping UX, Zod validation).
- `product-tour-onboarding-ui-weapon`: owns in-app tour/onboarding tooling and the tour-maintenance-as-code protocol.
- `markdown-mdx-content-pipeline-weapon`: owns the Markdown/MDX compile pipeline, syntax highlighting, and sanitization.
- `lighthouse-pagespeed-weapon`: owns Lighthouse/PageSpeed auditing, CI budgets, and the lab-vs-CrUX reconciliation.
- `seo-aeo-weapon`: owns Next.js triple-discovery optimization (search, AI Overviews, assistant citations).
- `website-weapon`: owns end-to-end SvelteKit + Payload + Supabase website builds via a 12-phase playbook.
- `expo-react-native-weapon`: owns getting an Expo/React Native mobile app build-ready: EAS build profiles, native-module config plugins, app config, navigation, offline-first patterns, and OTA via EAS Update.

---

## What this pillar collectively knows

This pillar covers everything a user sees and touches: component architecture, visual design systems, typography, media, accessible overlays, content pipelines, the performance/discoverability layer that determines whether anyone reaches the UI at all, and the mobile app layer that ships the same product surface to phones. Seventeen weapons split into five bands: **framework architecture** (react, preact, expo-react-native), **design-system authorship vs. enforcement** (design-system, ux-ui), **the token/asset layer** (dark-mode-theming, typography-font, font-loading, icon-system, image-optimization), **interactive surfaces** (modal-toast-dialog, csv-xlsx-import-export, product-tour-onboarding-ui, markdown-mdx-content-pipeline), and **discoverability/performance** (lighthouse-pagespeed, seo-aeo, website).

### Disambiguation table

| Situation | Weapon that owns it | Not this one |
|---|---|---|
| React 18/19 state layering, Server Components, Suspense/Actions | `react-weapon` | `ux-ui-weapon` (visual only) |
| Preact signals, preact/compat, embed widgets, Astro islands | `preact-weapon` | `react-weapon` |
| No design system exists yet, need the 7-artifact source of truth | `design-system-weapon` | `ux-ui-weapon` (steady-state only) |
| Design system exists, reviewing a PR against it, tenant theming | `ux-ui-weapon` | `design-system-weapon` (bootstrap only) |
| Dark mode flashing, CSS variable token layer, white-label swap | `dark-mode-theming-weapon` | `design-system-weapon` (token source, not runtime swap) |
| Choosing a typeface, building a fluid clamp() scale | `typography-font-weapon` | `font-loading-weapon` (loading mechanics, not aesthetics) |
| FOIT/FOUT, preload strategy, next/font config, CLS from fonts | `font-loading-weapon` | `typography-font-weapon` |
| Icon bundle bloat, dynamic icon loader, icon a11y | `icon-system-weapon` | none |
| AVIF/WebP choice, srcset/sizes, blur placeholders, LCP image | `image-optimization-weapon` | `lighthouse-pagespeed-weapon` (measures, doesn't fix) |
| Focus trap, Radix/Vaul/Sonner/cmdk selection, modal a11y | `modal-toast-dialog-weapon` | `ux-ui-weapon` (tokens, not primitive mechanics) |
| CSV/XLSX upload, column mapping wizard, streaming parse | `csv-xlsx-import-export-weapon` | none |
| Product tour/checklist tooling, tours breaking after deploy | `product-tour-onboarding-ui-weapon` | none |
| MDX compiler choice, remark/rehype plugins, Mermaid embeds | `markdown-mdx-content-pipeline-weapon` | `docs-site-weapon` (see Pillar 7, platform not pipeline) |
| Lighthouse CI setup, performance budgets, lab-vs-field gap | `lighthouse-pagespeed-weapon` | `image-optimization-weapon` / `font-loading-weapon` (the fixes it surfaces) |
| Next.js SEO, schema markup, AI Overview / assistant citation readiness | `seo-aeo-weapon` | `blogging-content-strategy-weapon` (see Pillar 6, copy not technical SEO) |
| Building a brand-new marketing/lead-gen site end to end | `website-weapon` | `design-system-weapon` (website-weapon calls it as a sub-phase) |
| EAS build profiles, expo config plugins, Expo Router vs React Navigation, OTA updates | `expo-react-native-weapon` | `react-weapon` (React WEB architecture) or `app-store-submission-weapon` (Pillar 6, the store listing side) |

### Canonical multi-weapon sequences

1. **New site bring-up:** `website-weapon` scaffolds the SvelteKit + Payload + Supabase monorepo through its 12-phase playbook (which itself invokes design-token and SEO phases) → `seo-aeo-weapon` runs the triple-discovery audit over rendered routes → `lighthouse-pagespeed-weapon` sets CI performance budgets.
2. **Design system bring-up, then steady state:** `design-system-weapon` interviews the user and materializes the 7-artifact source of truth (brief, tokens, utilities, component specs, screen specs, HTML examples, README) → `ux-ui-weapon` takes ownership for all evolution afterward. The README's change-control statement makes this handoff explicit; do not keep invoking `design-system-weapon` after day one.
3. **Token layer build-out:** `design-system-weapon` or `ux-ui-weapon` defines primitive/semantic tokens → `dark-mode-theming-weapon` wires the runtime CSS-variable swap layer on top → `typography-font-weapon` defines the type scale → `font-loading-weapon` makes it performant.
4. **Performance close-out:** `image-optimization-weapon` and `font-loading-weapon` fix the concrete assets → `lighthouse-pagespeed-weapon` re-measures and gates CI on the budget.
5. **Mobile app to store:** `expo-react-native-weapon` gets the app build-ready (eas.json profiles, native modules, app config, OTA channels) → Pillar 6's `app-store-submission-weapon` takes over for the listing, ASO, privacy compliance, and IAP; the two weapons explicitly split app layer from store layer.

### Load-bearing hard rules and gotchas

- **react-weapon vs preact-weapon are mutually exclusive per project** — never load both for the same codebase; check the framework first.
- **design-system-weapon does not do incremental maintenance.** If the user wants a PR reviewed or a token adjusted on an existing system, that is `ux-ui-weapon`, even if the phrasing sounds similar to "build a design system."
- **AVIF is the 2026 production default** for image format (93-95% browser coverage) per `image-optimization-weapon` — do not default to WebP without checking browser support requirements first.
- **The mismatched `sizes` attribute is the number-one `next/image` bug** per `image-optimization-weapon`; verify it explicitly rather than assuming `next/image` handles responsive sizing correctly by default.
- **Lighthouse lab scores and CrUX field data diverge on TBT vs INP** — a good lab score does not guarantee good field performance; `lighthouse-pagespeed-weapon` owns reconciling the two, do not treat a passing CI Lighthouse gate as proof of real-world speed.
- **Focus trap, escape, scroll lock, aria-modal, aria-labelledby, and focus return are all six required for an accessible modal** per `modal-toast-dialog-weapon` — partial implementation is a common footgun.
- **CSV injection (CWE-1236) is a real threat in spreadsheet exports/imports** — `csv-xlsx-import-export-weapon` requires tab-prefix or equivalent escaping on any cell value that could be interpreted as a formula.
- **The Expo SDK version pin is load-bearing and non-negotiable** per `expo-react-native-weapon` (SDK 56; the New Architecture is mandatory at SDK 55+), and OTA updates via EAS Update carry a JS-and-assets-only boundary: anything touching native code requires a full store build, not an OTA push.

---

## Cross-references to sibling pillars

- Security review of any UI surface (XSS in MDX, injection in CSV import, PII in forms) hands off to **Pillar 3: Security, Quality & Code Review**.
- Backend data contracts consumed by these frontend components live in **Pillar 2: Backend, Data & APIs**.
- Marketing copy, keyword strategy, and content calendars that precede SEO implementation live in **Pillar 6: Business, Growth & GTM** (`blogging-content-strategy-weapon`).
- Documentation-site platform selection (as opposed to the MDX pipeline itself) lives in **Pillar 7: Product Process & Documentation** (`docs-site-weapon`).
- CI wiring for Lighthouse budgets and image-pipeline build steps lives in **Pillar 4: Deploy & Live Operations** (`devops-weapon`); live wall-clock latency diagnosis of a deployed site is Pillar 4's `live-latency-weapon`.
- App-store listing, ASO, and IAP for the mobile app that `expo-react-native-weapon` builds live in **Pillar 6: Business, Growth & GTM** (`app-store-submission-weapon`).
