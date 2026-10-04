> Research input for [PRD-009](../prd-009-marketing-toolkit-index.md). Written 2026-10-01 by a read-only recon pass and copied here from the authoring session's scratch folder; only the snapshot-location sentence was rewritten. Listing Studio (`jzferrell26/listing-studio`) is a private repository owned by the product owner. This page cites its paths and describes its behaviour; it reproduces none of its source code, and no document in this repository may.

# Listing Studio (AutomatedRE) recon for PRD-009

Snapshot: jzferrell26/listing-studio origin/main `15e42829`, read from a read-only snapshot kept outside this repository. Paths below are relative to the Listing Studio repository root.

## Headline
Listing Studio has four things the toolkit can use:
- a working Zillow/Redfin import;
- a real HighLevel lead client;
- a lender-aware brand model, including loan officer plus Realtor co-marketing consent;
- a light visual system that ports cleanly.

It has no Meta ads code, and its create flow is a long single form, not a three-step wizard.

## 1. Stack
- next ^15.3.3, react ^19.1.0.
- Tailwind v4 is imported (`src/app/globals.css:18`), but no utility classes are used. The real system is about 340 global `ls-*` classes over CSS custom properties in `src/styles/*.css`. The `check:tokens` and `check:brand` scripts keep product tokens (`--ls-*`) separate from tenant tokens (`--tenant-*`).
- Supabase: `@supabase/ssr` 0.12.6, `supabase-js` 2.114, 60 migrations with RLS, private buckets `listing-photos` and `office-media`.
- Vitest 3 (343 test files), Playwright e2e (11 specs), visual regression, SQL tests.
- Licenses:
  - There is no LICENSE for the app code.
  - `LICENSE.dm-skills.md` covers only the vendored Guild folders.
  - The fonts are under OFL.
  - Nothing restricts copying the app code into another private repo the owner controls.

## 2. Property import (Zillow/Redfin URL to a saved property)
**UI.** `src/components/property-import/PropertyUrlImport.tsx` and `usePropertyUrlImport.ts`. Both POST to `src/app/api/listings/import/route.ts` with one of three actions.

**`preview`** (`src/lib/property-import/service.ts:17-32`):
- `urls.ts:3-19` accepts only exact Zillow `/homedetails/..._zpid` and Redfin `/ST/.../home/<id>` URLs.
- The page is fetched directly over HTTPS (`fetch.ts:13-72`: DNS pinned to public IPv4, 20 s timeout, 5 MiB cap, every redirect revalidated).
- Only on an HTTP 403 does it fall back to Firecrawl's keyless hosted MCP (`firecrawl.ts:11-12,99-101`).
- Extraction is a regex plus inert JSON parse of `__NEXT_DATA__`, ld+json and meta tags (`extract.ts:40-96`).
- It returns an HMAC-signed receipt that expires in 30 minutes (`receipt.ts`).

**`create`:** requires `permissionConfirmed` (`route.ts:36`), then saves through `ListingService` (`service.ts:37-72`).

**`photo`:** allowlisted CDNs only (`urls.ts:24`). Photos are re-encoded as JPEG, EXIF stripped, 12 maximum.

**Data, errors and limits.** Data lands in `listings.metadata jsonb` (`supabase/migrations/00001_init.sql:73-84`). Errors are a typed `PropertyImportError`. Previews are rate limited to 6 per minute per instance.

**Compliance.**
- Checkbox: "I am authorized to import this property content. I will verify it before publishing."
- `library/qa/url-import/security-review.md:27-29`: a public fetch "is not a license"; Redfin live import is "not qualified".
- The repo's own PRD flags photo copyright risk under VHT v. Zillow (`library/requirements/backlog/prd-001-listing-studio/prd-001-listing-studio-index.md:363`).
- **No document reviews Zillow's or Redfin's Terms of Use.** Live Redfin returns 403.

**Tests:** import 18, fetch 6, firecrawl 26, route 8, component 6, all on synthetic fixtures.

**Reuse.** The core (`types`, `urls`, `fetch`, `firecrawl`, `source`, `extract`, `receipt`, `draft`, `description`, about 500 lines) needs only Node built-ins. `service.ts` and `media.ts` are tied to its listing and photo services.

## 3. Agent profile and branding
**Tables** (`supabase/migrations/00050_office_studio.sql`):
- `office_agents` (:52-71): name, phone, email, title, tagline, license, website, headshot and logo IDs.
- `office_media` (:39-49): PNG only, 2 MiB.
- `office_settings`.

**Colors and footer** are in versioned `brand_spec_versions` (`00018_brand_specs.sql:96-109`), published through the RPC `office_publish_brand`.

**UI:** `src/components/office/AgentForm.tsx` and `BrandingForm.tsx` (11 color tokens plus the compliance footer).

**Lender-aware pieces:**
- A `lender_nmls` compliance shape (`BrandingForm.tsx:27-28`) and a demo lender brand (`src/lib/seams/brands/data/demo-lender.json`).
- Agent plus lender co-marketing with dual consent records (`src/lib/co-marketing/types.ts:33-120`, `00021_co_marketing.sql:96-160`).
- A `lender-featured` template (`src/templates/registry.ts:201`).

**How brand reaches outputs:** `marketingSelection` (`src/lib/office/data.ts:35-53`) freezes a MarketingSnapshot onto the listing. Later profile edits never rewrite outputs already made.

## 4. Create flow UI
- The three steps exist only as homepage copy (`src/app/page.tsx:28-32`).
- In the app there are three screens:
  1. office home (`src/app/offices/[workspaceId]/[[...path]]/page.tsx:108-111`);
  2. new listing, one long form (`src/app/listings/new/NewListingForm.tsx`): collapsible URL import, template, design, two roster selects, website fields, facts, Save;
  3. listing detail with `ListingMarketing.tsx` for generating and publishing.
- The import happy path is about 11 clicks. There is no stepper.
- Good patterns to model:
  - review the actual stored output before sharing (`ListingMarketing.tsx:83-88`);
  - an inline publish confirmation that states the consequence in plain words (`:93-95`);
  - an optional approval gate fingerprinted to the content, so any edit invalidates approval, and approval does not auto-publish (`PublicationReviewPanel.tsx`, `00060_publication_review.sql`).
- First run: a launch checklist ("X of 6 steps", `OfficeLaunchChecklist.tsx`), three tiles, and "Your first listing starts here" with one button. Empty-state rule: an icon, a title, why it is empty, and one action (`EmptyState.tsx:9-17`).

## 5. Visual language (the "lighter AutomatedRE look" the owner prefers)
- **Fonts:** IBM Plex Sans/Mono, switched to Inter under the AutomatedRE brand layer (`src/app/layout.tsx:2-10`).
- **Tokens in `src/styles/ls-tokens.css`:**
  - neutral grays with no tint (:49-66), six ink levels (:75-80), one accent #0860A4 (:88-93);
  - type scale 11, 12, 13, 14, 16, 19, 23, 28, 34 px (:133-145);
  - nine spacing steps from 2 to 48 px (:158-166);
  - radii 3, 5, 7, 10 px (:188-192);
  - two shadows only; cards use borders, not shadows (:199-208);
  - dark theme from :237.
- **AutomatedRE brand colors:** navy #061E35 (text and anchor only), action blue #005FCC, background #F5F8FC (`ls-tokens.css:383-410`).
- **Components:**
  - buttons: `ls-components.css:242-296`, 44 px minimum height under the brand layer (`automatedre-components.css:15-18`);
  - cards: white, 1px border, 0.5rem radius, 24px padding (`agency-console.css:78-79`).
- **Designer reading list:**
  - `library/knowledge/private/listing-studio-ux-ui/`: `design-brief.md`, `screens/automatedre-brand-release.md`, `token-boundary.md`, `state-doctrine.md`, `master-tokens.css`, `components/`, `html-examples/`.
  - `src/styles/`: `ls-tokens.css`, `ls-components.css`, `agency-console.css`, `office-studio.css`, `automatedre-components.css`.
- **The public site** (https://www.automatedre.com) shows the look:
  - a white background and a large bold headline with a blue second line;
  - one solid blue primary button and one outline secondary;
  - a light rounded card holding the real product output;
  - a light pale-blue feature strip;
  - a light top navigation.

## 6. Output rendering
- The registry is `src/templates/registry.ts`, with Letter and postcard pages at 300 DPI.
- Pipeline: `src/lib/render/pipeline.ts`, using server-side sharp compositing of SVG layers (`office-canvas.ts:15-80`).
- Facebook ad sizes (1080x1080, 1080x1350) are reachable, but each needs new layout code. The drawing primitives (photo crop with focus, fitted text, QR) reuse cleanly.
- The closest existing output is the 1200x630 share image (`src/app/p/[slug]/opengraph-image.tsx:21`).

## 7. Meta and HighLevel
- **Meta ads:** none.
- **HighLevel:** `src/lib/leads/ghl-client.ts` implements `CrmLeadPort`:
  - contact upsert and opportunities against `services.leadconnectorhq.com`, Version 2021-07-28;
  - per-location API key, stored encrypted in `tenant_crm_configs`;
  - no OAuth or Marketplace app code;
  - signed office webhooks in `src/lib/office/webhooks/`.

## 8. Reuse ratings
| Area | Rating | Main risk |
| --- | --- | --- |
| Property import | LIFT the core; MODEL service and media | Legal: scraping, plus Zillow photos in paid ads with no Terms of Use review; hosted 403s; Firecrawl free-tier limits |
| Branding profile | MODEL | RPCs and RLS are tied to its tenant model |
| Create flow | MODEL its review and confirm patterns | It is a dense single form, not click-click-launch |
| Visual tokens | LIFT the `ls-tokens.css` values; MODEL the components | Global `ls-*` classes must be converted to CSS modules |
| Output rendering | LIFT the drawing primitives; MODEL the ad layouts | Serverless font rendering; Meta creative rules not encoded |

UNKNOWN: whether the Firecrawl keyless path has worked in production since 2026-09-26.
