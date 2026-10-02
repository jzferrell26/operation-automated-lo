# PRD-009c: Marketing Toolkit - The Ads Library

> **Parent:** [PRD-009](./prd-009-marketing-toolkit-index.md)
> **Status:** Backlog. Authored 2026-10-01 after OD-H. It replaces the property-intake 009c of the first draft (commit `22e6b87`), which OD-H made moot.
> **Priority:** P0. Every ad the product launches comes from this library (OD-H).
> **Schema changes:** None in the database. The campaign manifest contract gains a second blueprint variant, additively (D5).
> **Owner Guardians:** `typescript-node-guardian` (the catalog schema, its validation, the loader, the manifest variant and its builder); `react-guardian` (the library page); `security-guardian` (the sample-catalog guard)

## Goal

One curated, platform-wide library of everyday loan officer ads, kept in the repository as a versioned catalog of data plus image files:

- a strict format, checked by a schema test that also reads every image file;
- versions and retirement that never change anything a person already approved (D-21);
- a binding into the campaign version, so an approval covers the exact library ad version plus the loan officer's edited words;
- an "Ads library" tab inside Campaigns, filtered by topic (D-17);
- a starter catalog of clearly marked sample ads that only the synthetic demo, the review test run, and tests ever load. The real library starts empty; the owner supplies the real ads (operator checklist, 009F-AC-014).

## Background (honest)

1. **The owner's decision (OD-H, 2026-10-01).** "We are just going to create a curated ads library. They select the one they want and launch. Nothing crazy." It holds "Everyday loan officer ads"; the owner supplies them ("You supply them"); a loan officer edits "Just the copy"; there is one library, curated "Only you (platform-wide)". There is no admin upload screen in PRD-009 ([owner direction, OD-H](research/2026-10-01-owner-direction-od-h.md)).
2. **The design** ([`design/00-direction.md`](design/00-direction.md) sections 5.1 to 5.5) fixes the names (D-16), the topics, the catalog fields, the brand band, and retirement. The designer's recommendation applies to every open decision the owner has not answered.
3. **The manifest today has one blueprint.** `packages/contracts/src/campaign-foundation.ts:236-237` fixes `schemaVersion: 1` and `blueprintId: z.literal("open-house-boost")`, with a required `property` block (`:238-247`) and `partner` block (`:275-280`). The `campaign.campaign_versions.manifest` column is a JSON object with no database check on the blueprint (`supabase/migrations/20260915180000_campaign_activation.sql`, the `manifest jsonb ... jsonb_typeof(manifest) = 'object'` check), so a new variant needs no migration. A version's approval binds its manifest hash, so whatever the manifest carries, the approval covers.
4. **Images.** The manifest's images carry an asset reference, an approval status, and pixel size (`campaign-foundation.ts:260-273`); preflight checks each present image's approval and size (`packages/domain/src/campaign-foundation.ts:217-238`). The open house ruleset's minimum is 1200 by 630 (`apps/web/src/server/open-house-draft.ts:171-172`), wider than the library's 1080-pixel art, so the library-ad ruleset sets its own minimum (D6).
5. **Static files and the origin rule.** The browser gate aborts any request to another origin (`tests/browser/ui-foundation-ux.spec.ts:21-25`), so library art is served from the application. Files under `apps/web/public/` are served to every deployment.
6. **Who can tell environments apart.** Review mode is chosen by `OALO_REVIEW_SURFACE=authorized`, synthetic mode by `OALO_ENVIRONMENT` being `local` or `preview` (`apps/web/src/server/authenticated-workspace-data.ts:158-187`). The review test run uses `OALO_ENVIRONMENT: "local"` with `OALO_REVIEW_SURFACE: "authorized"` (`tooling/scripts/database/review-browser-run.mjs:66,74`). The hosted app is also review mode; its `OALO_ENVIRONMENT` value is not recorded in the repository (UNVERIFIED). So no single existing value separates the review test run from the hosted app, which is why D3 adds an explicit flag.
7. **Compliance rules that bind the library.** Paid advertising is never co-branded with a Realtor or brokerage (`library/knowledge/private/compliance/compliance-and-risk.md:19`, control 9, back in force under OD-H). Rates, APR, payments, down payments, loan terms, and teaser statements are controlled, not generated prose (`:48`). Every new blueprint and meaningful revision needs lender review (`:74`).

## Scope

- `packages/contracts/src/ads-library.ts` (the catalog schema) and the manifest variant in `packages/contracts/src/campaign-foundation.ts`.
- The real catalog `apps/web/src/features/ads-library/catalog/catalog.json`, its `README.md` and template, and real art under `apps/web/public/ads-library/`.
- The sample catalog `apps/web/src/fixtures/ads-library/sample-catalog.json`, sample art under `apps/web/src/fixtures/ads-library/art/`, its route, and the generator script.
- The catalog loader, the manifest builder, and the retirement rules on the server.
- The library page at `/marketing/campaigns/library` and the Campaigns tabs.

The three-step flow, the brand band, and the checks on the words are 009d's. The Campaigns list and the campaign page are 009e's.

## Non-Goals

- An admin upload screen or any in-product way to add, edit, or retire an ad. Adding an ad is a reviewed pull request (D7).
- Per-company libraries (OD-H: "Only you (platform-wide)").
- Search or sorting in the library (D-17).
- A raster ad image for Meta upload. The ad is composed in HTML; producing the file Meta needs belongs to the future Meta publish PRD.
- Any real ad. PRD-009 ships the format, the empty real catalog, and the samples; the owner supplies the first real ads afterwards.

## Design decisions

### D1. The catalog format

One entry per ad version, as `design/00-direction.md` section 5.3 lists, with these exact rules:

| Field | Rule |
|---|---|
| `id` | Lower-case kebab case, at most 60 characters, stable for the life of the ad, never reused |
| `version` | Integer from 1; versions of one `id` are contiguous |
| `status` | `active` or `retired` on an ad's highest version; `replaced` on every lower version |
| `sample` | `true` in the sample catalog, `false` in the real catalog, without exception |
| `topic` | One of `first-time-buyers`, `refinance`, `va-loans`, `pre-approval`, `down-payment-help` |
| `name` | 3 to 60 characters; the card title and the campaign's name |
| `images.tall.art` | A PNG or JPEG of exactly 1080 by 1080, the top of the 4:5 ad |
| `images.square.art` | A PNG or JPEG of exactly 1080 by 842, the top of the 1:1 ad |
| `images.alt` | 10 to 200 characters describing the image's words and picture |
| `defaults.headline`, `defaults.primaryText` | Within `editable`'s limits and passing the word checks of 009d D5 |
| `editable` | `headline.maxLength` at most 60, `primaryText.maxLength` at most 300 (product limits; Meta's own limits are UNVERIFIED and checked under 009D-AC-012) |
| `callToAction` | One value from a fixed list, `LEARN_MORE` by default (Meta's allowed list is UNVERIFIED) |
| `specialAdCategory` | `HOUSING` until `meta-ads-guardian` confirms otherwise (D-19) |
| `compliance.notes`, `compliance.requiredOnAd`, `compliance.blockedInWords` | As the design lists; `requiredOnAd` includes `nmls` and `equal-housing` |
| `approval.approvedBy`, `approval.approvedOn` | Who approved this version for the library, and the date |
| `retired.on`, `retired.reason`, `retired.replacedBy` | Required exactly when `status` is `retired`; `replacedBy` names an `id` that exists |

Each art file is at most 1 MiB. The real art lives at `apps/web/public/ads-library/<id>/v<version>/tall.<ext>` and `square.<ext>`.

### D2. The two catalogs

- **The real catalog** starts as an empty list. It never holds a sample.
- **The sample catalog** holds at least eight sample ads across the five topics, like the mockups. Every entry has `sample: true`, a name that starts "Sample:", and art with a large "SAMPLE" mark burned in. The art is generated by a deterministic script (`tooling/scripts/ads-library/generate-sample-art.mjs`, using the `sharp` 0.35.4 the lockfile already resolves) so its bytes are reproducible. Sample art lives outside `public/` and is served by a route that answers 404 unless samples are enabled (D3), so a deployment never serves it.

### D3. Samples load only on purpose

The loader returns the sample catalog only when **both** `OALO_ENVIRONMENT` is `local` **and** `OALO_ADS_LIBRARY_SAMPLES` is `enabled`. The local synthetic demo instructions, the review test run (`review-browser-run.mjs`), and the test helpers set the flag; no deployment does, and `docs/production-environments.md` says never to. In every other case the loader returns the real catalog only. As a third guard, every sample renders a visible "Sample ad" label wherever it appears (card, preview, campaign page), so a misconfiguration could never pass a sample off as a real ad.

### D4. Versions and retirement (D-21)

- A new version of an ad never changes an existing campaign version. A saved but undecided campaign version on an older version shows "A newer version of this ad is in the library." with "Use the new version", which asks first and then makes a new campaign version with the new defaults.
- Retiring an ad hides it from the library and from step 1. A saved but undecided campaign version on a retired ad cannot be approved; it shows "Ad retired", the design's notice, and "Choose another ad", which keeps its budget, dates, and area.
- An approved campaign version on a retired ad cannot launch, and its approval does not carry over to another ad.
- Running and finished campaigns cannot exist in PRD-009 (nothing launches); their rules in design section 5.5 wait for the Meta publish PRD.

### D5. The binding: a second manifest variant

The manifest contract becomes a union on `blueprintId`. `open-house-boost` stays exactly as it is, so every saved version still parses. The new `library-ad` variant carries:

- `libraryAd`: `id` and `version`;
- `content`: the edited `headline` and `body` (the primary text), the library's `callToAction`, the disclosure line and the lead form wording, and empty `claims`, `mergeTokens`, and `financingTerms`;
- `images`: the two art files, each with a reference derived from the ad's `id`, `version`, and shape, `approvalStatus: "approved"` (the curator approved them), and their exact size;
- `advertiser`: the frozen brand values the band shows (009d D3);
- `schedule`: `startsAt` (null for "when you launch it") and `endsAt`;
- `meta`: the Housing category, `placements: ["facebook_feed"]`, country, regions (states), cities, the always-empty ZIP, custom audience, and protected-dimension lists, and the budgets;
- `routing`, as the open house variant has it.

A pure builder makes this manifest from a catalog entry, the edited words, the brand, the schedule, the area, and the budgets. Because the manifest hash covers all of it, approving a version approves exactly that library ad version, those words, and that brand.

### D6. The library-ad ruleset's image minimum

The library-ad ruleset accepts images of at least 1080 by 842, the smallest art the format allows. The open house ruleset keeps its 1200 by 630.

### D7. Adding an ad is a reviewed change

Every file in the repository is owned by the owner (`.github/CODEOWNERS:2`, `* @jzferrell26`), so a new or retired ad is a pull request the owner reviews. The catalog `README.md` says how: the format, the art sizes, a template entry, how to add a version and how to retire an ad, and that each new ad needs the lender review `compliance-and-risk.md:74` requires before it is marked approved.

## Acceptance criteria

| ID | Criterion | Test |
|---|---|---|
| 009C-AC-001 | `packages/contracts/src/ads-library.ts` exports a strict schema for one catalog entry with every rule in D1. A unit test proves each rule refuses a bad value (a reused or non-kebab `id`, a non-contiguous version, an active lower version, a retired entry with no `retired` block, a `sample` mismatch, an unknown topic, an over-limit `editable`, an unlisted call to action, a category other than `HOUSING`). | Unit |
| 009C-AC-002 | A schema test loads the real catalog and the sample catalog and, for every entry, checks the schema, that each `(id, version)` is unique, that each referenced art file exists, is PNG or JPEG, is exactly the size D1 states (read from the file), and is at most 1 MiB, that real entries reference only real art paths and samples only sample paths, and that the default words pass the word checks of 009d D5. It runs in `pnpm test:unit`. | Unit (schema test) |
| 009C-AC-003 | The real catalog file exists and is an empty list. The sample catalog holds at least eight entries covering all five topics, each with `sample: true`, a name starting "Sample:", and generated art carrying a "SAMPLE" mark. Running the generator twice produces byte-identical files. | Unit, Source scan |
| 009C-AC-004 | The loader follows D3: a unit test covers every combination of `OALO_ENVIRONMENT` (`local`, `preview`, `production`, unset) and the flag (`enabled`, other, unset), with review mode on and off, and only `local` plus `enabled` returns samples. The sample art route answers 404 in every other case. `docs/production-environments.md` and the README's synthetic demo section name the flag and say it is never set on a deployment. | Unit, Integration, Record check |
| 009C-AC-005 | Every place a sample ad appears (a library card, step 1, the step 2 and step 3 previews, the campaign page, the Campaigns list) shows a visible "Sample ad" label with an accessible name. | Component, Integration |
| 009C-AC-006 | The manifest contract is a union on `blueprintId` with the `library-ad` variant of D5; every stored `open-house-boost` manifest still parses (a test parses the repository's existing manifest fixtures). The builder is a pure function with unit tests, and the library-ad ruleset has the image minimum of D6. | Unit |
| 009C-AC-007 | A Postgres test saves a library-ad version through the application layer, approves it, and proves that a version with different words, a different library ad version, or different brand values has a different manifest hash and is not covered by the first approval. | Postgres (`pnpm test:db`) |
| 009C-AC-008 | Retirement follows D4: the approve route (`apps/web/src/server/campaign-approval-handler.ts`) refuses an undecided version whose library ad is retired, with a plain message; the launch reason for an approved version on a retired ad is the retired notice (009D-AC-016); retired and replaced ads never appear in the library or step 1, while their entries still render for the campaigns that used them. | Postgres route, Unit, Integration |
| 009C-AC-009 | "Use the new version" appears only for an undecided campaign version on an older library ad version; it asks before replacing the words and saves a new campaign version on the new library ad version; an approved version never changes its library ad version. | Integration, Postgres |
| 009C-AC-010 | `/marketing/campaigns` and `/marketing/campaigns/library` are two tabs of one page, "Your campaigns" and "Ads library", with one primary action, "Launch an ad". The library tab has the design's lead sentence (corrected as 009d D3 states), topic chips with counts ("All N" and one per topic that has an active ad) that filter in place and through `?topic=`, and a grid of four cards a row at 1440, three at 1180, two at 768, and one at 390, with the chips scrolling sideways at 390. No search box and no sort control exist. | Integration, Browser (review) |
| 009C-AC-011 | Each card shows the ad's art with the viewer's own brand band applied (009d's band; the placeholder band when the viewer has no brand), its topic, its name, its default headline, "Version N. Reviewed <date>.", and "Use this ad", which opens step 2 of "Launch an ad" with that ad. Within a topic, newer approvals come first. | Component, Integration |
| 009C-AC-012 | With no active ad (the real catalog as shipped), the library tab, step 1, and Home's start card say so in one sentence ("No ads in the library yet. New ads are added after they're reviewed.") and show no topic chips. | Integration (review) |
| 009C-AC-013 | Library art is served from the application origin: a browser test with ads on screen records no request to another origin. Each image's alternative text is the catalog's `images.alt`; the brand band is real text, so a screen reader reads the name and NMLS number. axe reports zero violations on the library tab at the four frames in both themes. | Browser (review), Component |
| 009C-AC-014 | The catalog `README.md` and a template entry exist as D7 describes, and the operator checklist item (009F-AC-014) links them. | Record check |

## Files expected to change

- `packages/contracts/src/ads-library.ts` (new), `packages/contracts/src/campaign-foundation.ts`, and their tests
- `apps/web/src/features/ads-library/**` (new: catalog, loader, library page components, README, template)
- `apps/web/src/fixtures/ads-library/**` (new: sample catalog and art), `tooling/scripts/ads-library/generate-sample-art.mjs` (new), and the sample art route
- `apps/web/src/app/(authenticated)/marketing/campaigns/library/**` (new) and the Campaigns tabs in `apps/web/src/app/(authenticated)/marketing/campaigns/page.tsx`
- `apps/web/src/server/campaign-approval-handler.ts` (the retirement refusal) and its tests
- `tooling/scripts/database/review-browser-run.mjs` (sets the flag), `README.md` (the synthetic demo section), `docs/production-environments.md`

## Test plan

- **Unit:** the schema (009C-AC-001), the schema test over both catalogs and their files (002), the generator (003), the loader (004), the variant and builder (006), retirement and replacement listing (008).
- **Postgres (`pnpm test:db`):** the binding (007), the retirement refusal (008), new versions (009).
- **Component and integration:** sample labels (005), tabs, chips, and cards (010, 011), the empty library (012).
- **Browser (review):** the grid at four frames (010), the origin rule and axe (013).
- **Record check:** documentation (004, 014).

## Security notes

- The real and sample catalogs are separated in three independent ways (D3), and the sample art is unreachable on a deployment.
- The catalog is code: it changes only through a reviewed pull request, and the schema test runs in CI on every change.
- Library art is a static file from the application origin; nothing is fetched from elsewhere at runtime.

## Open questions

- [ ] Which Special Ad Category everyday mortgage ads need (D-19). Default `HOUSING`; `meta-ads-guardian` checks during the run (009D-AC-012).
- [ ] Meta's allowed call-to-action values and text limits. UNVERIFIED; checked under 009D-AC-012.

## Related

- [Design direction, section 5](design/00-direction.md)
- [Open decisions D-16, D-17, D-19, D-21](design/01-open-decisions.md)
- [Mockups: ads library](design/mockups/ads-library.html), [step 1](design/mockups/launch-step-1-choose.html)
- [Compliance and risk](../../../knowledge/private/compliance/compliance-and-risk.md)

## Amendments

None yet.
