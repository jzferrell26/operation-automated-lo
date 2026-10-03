# PRD-009c: Marketing Toolkit - The Ads Library

> **Parent:** [PRD-009](./prd-009-marketing-toolkit-index.md)
> **Status:** In Work (Gauntlet run started 2026-10-01). Authored 2026-10-01 after OD-H. It replaces the property-intake 009c of the first draft (commit `22e6b87`), which OD-H made moot.
> **Priority:** P0. Every ad the product launches comes from this library (OD-H).
> **Schema changes:** None in the database. The campaign manifest contract and the approval snapshot each gain a second variant, additively (D5).
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
6. **Who can tell environments apart.** Review mode is chosen by `OALO_REVIEW_SURFACE=authorized`, synthetic mode by `OALO_ENVIRONMENT` being `local` or `preview` (`apps/web/src/server/authenticated-workspace-data.ts:158-187`). The review test run uses `OALO_ENVIRONMENT: "local"` with `OALO_REVIEW_SURFACE: "authorized"` (`tooling/scripts/database/review-browser-run.mjs:66,74`). The hosted app is also review mode; its `OALO_ENVIRONMENT` value is not recorded in the repository (UNVERIFIED; the operator checklist records it, 009F-AC-014). Worse, the existing schemas default an unset `OALO_ENVIRONMENT` to `local` (`apps/web/src/server/authenticated-workspace-data.ts:136`; `packages/config/src/environment.ts:152` and `:259`), so "the environment is local", read through them, is true on any deployment that never set it. No existing value separates the review test run from the hosted app, which is why D3 reads the raw values and fails closed.
7. **Compliance rules that bind the library.** Paid advertising is never co-branded with a Realtor or brokerage (`library/knowledge/private/compliance/compliance-and-risk.md:19`, control 9, back in force under OD-H). Rates, APR, payments, down payments, loan terms, and teaser statements are controlled, not generated prose (`:48`). Every new blueprint and meaningful revision needs lender review (`:74`).
8. **Who can change `main`.** Read with `gh api` on 2026-10-01: the repository is public with forking allowed; its only collaborator is `jzferrell26` (admin); ruleset 20013790, "Repository hygiene baseline", is active and requires a pull request with **0** approving reviews (`required_approving_review_count: 0`, `require_code_owner_review: false`), the four required checks, and linear history, and lets the owner bypass it. `.github/CODEOWNERS:2` (`* @jzferrell26`) is therefore advisory. The real gate on a catalog change is that only the owner can merge, plus the automated tests.

## Scope

- `packages/contracts/src/ads-library.ts` (the catalog schema) and the manifest variant in `packages/contracts/src/campaign-foundation.ts`.
- The real catalog `apps/web/src/features/ads-library/catalog/catalog.json`, its `README.md` and template, and real art under `apps/web/public/ads-library/`.
- The sample catalog `apps/web/src/fixtures/ads-library/sample-catalog.json`, sample art under `apps/web/src/fixtures/ads-library/art/`, its route, and the generator script.
- The catalog loader, the manifest builder, and the retirement rules on the server.
- The library page at `/marketing/campaigns/library`, inside the Campaigns tab strip that 009e owns (009E-AC-009).

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
| `images.tall.art` | Exactly `<id>/v<version>/tall.png` or `<id>/v<version>/tall.jpg`, built from the entry's own `id` and `version`: a PNG or JPEG of exactly 1080 by 1080, the top of the 4:5 ad |
| `images.square.art` | Exactly `<id>/v<version>/square.png` or `.jpg`, likewise: 1080 by 842, the top of the 1:1 ad |
| `images.tall.sha256`, `images.square.sha256` | The SHA-256 of the file's bytes, 64 lower-case hexadecimal characters |
| `images.alt` | 10 to 200 characters describing the image's words and picture |
| `defaults.headline`, `defaults.primaryText` | Within `editable`'s limits and passing the word checks of 009d D5 |
| `editable` | `headline.maxLength` at most 60, `primaryText.maxLength` at most 300 (product limits; Meta gives 27 characters for a headline and 50 to 150 for primary text only as recommendations, and no hard limit was found, so these stand: [Meta rules check](research/2026-10-02-meta-special-ad-category-check.md), section 6) |
| `callToAction` | One of `APPLY_NOW`, `DOWNLOAD`, `GET_QUOTE`, `LEARN_MORE`, `SIGN_UP`, or `SUBSCRIBE`, the values Meta allows on a lead-form ad (VERIFIED, [Meta rules check](research/2026-10-02-meta-special-ad-category-check.md), section 5), with `LEARN_MORE` by default; `CONTACT_US` and every message button are refused. Which of the six a given account is offered is UNVERIFIED, and the record asks for a counsel and lender decision before an ad uses `GET_QUOTE` or `APPLY_NOW` |
| `specialAdCategory` | `HOUSING` (D-19). No readable Meta page says which category an everyday mortgage ad takes (UNVERIFIED, [Meta rules check](research/2026-10-02-meta-special-ad-category-check.md), section 2), so Housing stays until counsel and the lender decide (009F-AC-014 part c) |
| `compliance.notes`, `compliance.requiredOnAd`, `compliance.blockedInWords` | As the design lists; `requiredOnAd` includes `nmls` and `equal-housing`; `notes` state rules in general terms, with no lender name or lender policy text, because the repository is public |
| `approval.approvedBy`, `approval.approvedOn` | The owner's handle `jzferrell26` (a handle, not a real name) and the date he approved this version; in the sample catalog, the literal "Sample catalog, not a real approval". The record of the approval is the owner's own merge of the pull request that adds the entry (D7) |
| `retired.on`, `retired.reason`, `retired.replacedBy` | Required exactly when `status` is `retired`; `replacedBy` names an `id` that exists |

009c part 1 shipped in Wave 1 with a five-value list that included `CONTACT_US` (`packages/contracts/src/ads-library.ts:27-33`). The Wave 2 009d lane applies the six-value list above to `packages/contracts/src/ads-library.ts`, its schema test `tooling/tests/unit/ads-library/catalog-entry-schema.test.ts`, and the catalog README's field table (`apps/web/src/features/ads-library/catalog/README.md:24`).

Each art file is at most 1 MiB, its type is decided by its magic bytes (not its extension), SVG is refused, and it carries no EXIF, XMP, IPTC, or PNG text metadata. `art` is never free text: anything other than the derived name, including `..`, a leading slash, a backslash, a colon, or a URL scheme, is refused. The real art lives under the fixed root `apps/web/public/ads-library/`, the sample art under `apps/web/src/fixtures/ads-library/art/`. The loader joins the derived name to its fixed root, resolves the real path, refuses it unless it stays inside that root and is a regular file, and checks each file's SHA-256 against the entry when it loads, refusing an entry whose bytes differ.

### D2. The two catalogs

- **The real catalog** starts as an empty list. It never holds a sample.
- **The sample catalog** holds at least eight sample ads across the five topics, like the mockups. Every entry has `sample: true`, a name that starts "Sample:", art with a large "SAMPLE" mark burned in, and the repository's own synthetic identity wherever a person or company appears ("Alex Morgan", "Prairie Home Lending", and the NMLS number "0000000", from `apps/web/src/features/brand/model/synthetic-brand-profile.ts`), never a made-up NMLS number that could belong to a real licensee. The word "synthetic" never appears in a sample's alt text, name, or default words, which the review-surface sweep reads; it may appear only inside the art's pixels. The art is generated by a deterministic script (`tooling/scripts/ads-library/generate-sample-art.mjs`, using the `sharp` 0.35.4 the lockfile already resolves) so its bytes are reproducible. Sample art lives outside `public/` and is served by a route that answers 404 unless samples are enabled (D3), so a deployment never serves it. The sample catalog and its art are read from disk only after the D3 guard passes; nothing imports them statically, so they are not in a deployment's bundle.
- **The sample art route** takes exactly three typed parts, `(adId, version, shape)`, with no catch-all segment. It looks the entry up in the loaded sample catalog, serves only that entry's derived art path through the loader's contained read, and answers 404 for anything else: an unknown id, a version that is not a positive integer, a shape other than `tall` or `square`, or any encoded separator.

### D3. Samples load only on purpose

The guard fails closed. The loader returns the sample catalog only when **all** of these hold, each read from the raw `process.env` and never through a schema default:

1. `OALO_ADS_LIBRARY_SAMPLES` is exactly `enabled` (the explicit test or synthetic flag);
2. `OALO_ENVIRONMENT` is exactly the string `local` (unset is not local);
3. the environment is not deployment-shaped: `VERCEL`, `VERCEL_ENV`, and `OALO_RELEASE_MANIFEST_JSON` (required outside local, `docs/production-environments.md`) are all unset.

Any deployment-shaped signal refuses samples even when the flag is set. Vercel sets `VERCEL=1` only when a project exposes its system environment variables, a per-project setting, so it is one signal among three, not the only one (Vercel's system environment variables documentation, as the authoring security review read it on 2026-10-01). The local synthetic demo instructions, the review test run (`review-browser-run.mjs`), and the test helpers set the flag; no deployment does, and `docs/production-environments.md` says never to. Every sample also renders a visible "Sample ad" label wherever it appears; the label is a courtesy, not a guard.

### D4. Versions and retirement (D-21)

- A new version of an ad never changes an existing campaign version. A saved but undecided campaign version on an older version shows "A newer version of this ad is in the library." with "Use the new version", which asks first and then makes a new campaign version with the new defaults.
- The approval command (`executeHumanCampaignApproval`, `packages/application/src/campaign-approval-command.ts:187`) resolves the version's library ad through a catalog port after its role check (`:213-228`), so every caller gets the same rule. It refuses unless the entry is found, `active`, the highest version, and its art digests equal the version's (D5). A replaced version gets the "newer version" notice below instead of an approval. The port is a required parameter of `executeHumanCampaignApproval`, never optional, and its one caller, the route handler (`apps/web/src/server/campaign-approval-handler.ts:55`), composes it from this sub-PRD's loader and passes it, in the same Wave 1 lane that changes the signature.
- Retiring an ad hides it from the library and from step 1. A saved but undecided campaign version on a retired ad cannot be approved; it shows "Ad retired", the design's notice, and "Choose another ad", which keeps its budget, dates, and area.
- An approved campaign version on a retired ad cannot launch, and its approval does not carry over to another ad.
- Running and finished campaigns cannot exist in PRD-009 (nothing launches); their rules in design section 5.5 wait for the Meta publish PRD.

### D5. The binding: a second manifest variant

The manifest contract becomes a union on `blueprintId`. `open-house-boost` stays exactly as it is, so every saved version still parses. The new `library-ad` variant carries:

- `libraryAd`: `id` and `version`;
- `content`: the edited `headline` and `body` (the primary text), the library's `callToAction`, the disclosure line and the lead form wording read on the server from the person's saved Brand (009D-AC-024), and empty `claims`, `mergeTokens`, and `financingTerms`;
- `images`: the two art files, each with a reference `libimg_` followed by the first 40 hexadecimal characters of the SHA-256 of `<id>:<version>:<shape>:<sha256>` (which satisfies `OpaqueReferenceSchema`, `packages/contracts/src/campaign-foundation.ts:3-7`), `approvalStatus: "approved"` (the curator approved them), their exact size, and `contentSha256` copied from the catalog, so the manifest hash covers the pixels;
- `advertiser`: the frozen brand values the band shows (009d D3), and nothing else about any person;
- `schedule`: `startsAt` (null for "when you launch it") and `endsAt`;
- `meta`: the Housing category, `placements: ["facebook_feed"]`, country, regions (states), cities, the always-empty ZIP, custom audience, and protected-dimension lists, and the budgets;
- `routing`, as the open house variant has it.

A pure builder makes this manifest from a catalog entry, the edited words, the brand, the schedule, the area, and the budgets. Because the manifest hash covers all of it, approving a version approves exactly that library ad version, its art bytes, those words, and that brand.

The variant has **no** `partner` block, no `property` block, and no key that can hold a Realtor or brokerage identity, so compliance control 9 holds by structure for library ads, not only by a check.

**The approval snapshot.** `createApprovalDecision` (`packages/application/src/campaign-foundation.ts:354-372`) builds today's snapshot from `manifest.artifacts.*` and `manifest.property.*`, which the library-ad variant does not have; for an open house version the artifact references are random per draft (`apps/web/src/server/open-house-draft.ts:130-141`). `ApprovalSnapshotSchema` (`packages/contracts/src/campaign-foundation.ts:405-420`) therefore becomes a union too. The library-ad snapshot carries the library ad's `id` and `version`, both art digests, a `creativeVersionRef` (`libcreative_` plus 40 hexadecimal characters of the SHA-256 over the id, version, and both digests), a `copyVersionRef` (`libcopy_` plus the same over the edited headline and primary text), a `disclosureVersionRef` (`libdisclosure_` plus the same over the disclosure line), and `targetingHash`, `budgetHash`, and `datesHash` (from `schedule`); no field is a random per-draft reference. Both snapshot variants may also carry `approverDisplayName`, which 009E-AC-004 defines. The decision's `snapshot` column accepts any JSON object (`supabase/migrations/20260915180000_campaign_activation.sql:176`), so no migration is needed.

### D6. The library-ad ruleset's image minimum

The library-ad ruleset accepts images of at least 1080 by 842, the smallest art the format allows. The open house ruleset keeps its 1200 by 630.

### D7. Adding an ad is a reviewed change

Only the repository owner can merge to `main` today (Background 8). The ruleset requires 0 approving reviews and CODEOWNERS is advisory, so the owner's own merge of the pull request is the gate and the approval record for a new, changed, or retired ad, and the schema, art-digest, immutability, and sample-guard tests are the automated gate. The owner gives an agent the ads in a session or a private channel, never through a public issue; the agent opens the pull request, and no text from an outside account ever supplies an `approval` block. The catalog `README.md` says how: the format, the art sizes, a template entry, how to add a version and how to retire an ad, and that each new ad needs the lender review `compliance-and-risk.md:74` requires before the owner merges it, and that an existing `(id, version)` is never edited: a change is a new version.

## Acceptance criteria

| ID | Criterion | Test |
|---|---|---|
| 009C-AC-001 | `packages/contracts/src/ads-library.ts` exports a strict schema for one catalog entry with every rule in D1. A unit test proves each rule refuses a bad value (a reused or non-kebab `id`, a non-contiguous version, an active lower version, a retired entry with no `retired` block, a `sample` mismatch, an unknown topic, an over-limit `editable`, an unlisted call to action (including `CONTACT_US`; the list is exactly D1's six values with `LEARN_MORE` the default, applied by the Wave 2 009d lane), a category other than `HOUSING`, an `art` value other than the derived name (including `../x.png`, `/etc/x.png`, `a\b.png`, `c:x.png`, `https://x/a.png`, and another ad's path), a digest that is not 64 lower-case hexadecimal characters). | Unit |
| 009C-AC-002 | A schema test loads the real catalog and the sample catalog and, for every entry, checks the schema, that each `(id, version)` is unique, that each referenced art file exists under its fixed root as a regular file, is PNG or JPEG by magic bytes (SVG refused), is exactly the size D1 states (read from the file), is at most 1 MiB, carries no EXIF, XMP, IPTC, or PNG text metadata, and has the SHA-256 the entry records, that real entries reference only real art paths and samples only sample paths, and that the default words pass the word checks of 009d D5. An immutability test, offline, compares every entry with a committed append-only `catalog.lock.json` of each `(id, version)`'s digests, defaults, and `editable` limits and fails on any change or removed line; CI additionally compares against `origin/main` when it is fetched. It runs in `pnpm test:unit`. | Unit (schema test) |
| 009C-AC-003 | The real catalog file exists and is an empty list. The sample catalog holds at least eight entries covering all five topics, each with `sample: true`, a name starting "Sample:", `approval.approvedBy` equal to "Sample catalog, not a real approval", only the repository's synthetic identity (D2), and generated art carrying a "SAMPLE" mark. Running the generator twice produces byte-identical files. | Unit, Source scan |
| 009C-AC-004 | The loader fails closed as D3 states. A unit test covers every combination of `OALO_ENVIRONMENT` (`local`, `preview`, `production`, unset), the flag (`enabled`, `true`, other, unset), and each deployment-shaped signal (`VERCEL`, `VERCEL_ENV`, `OALO_RELEASE_MANIFEST_JSON`, each alone), with review mode on and off: only the flag `enabled` with `local` and no deployment-shaped signal returns samples, and every case with a deployment-shaped signal refuses them even with the flag set. The test proves the loader never reads the environment through a schema default. The sample art route answers 404 in every refused case. A source-scan test fails if `OALO_ADS_LIBRARY_SAMPLES` appears outside an allowlist (the loader, `review-browser-run.mjs`, `playwright.config.ts`, `tooling/tests/database/review-browser-run.test.ts`, the test helpers, the README, `docs/production-environments.md`). The synthetic Playwright web server (`playwright.config.ts:101-107`, which today sets only `OALO_LOCAL_CAMPAIGN_STORE`) sets both `OALO_ENVIRONMENT: "local"` and `OALO_ADS_LIBRARY_SAMPLES: "enabled"` in its `webServer.env`, so the synthetic project shows sample ads; `review-browser-run.mjs` sets the same two values, and `review-browser-run.test.ts` asserts the flag beside its existing environment assertions (`:24-35`); the dashboard preview configuration (`playwright.dashboard-preview.config.ts:41`, `OALO_ENVIRONMENT: "preview"`) sets neither, so the preview's library is empty, and a build-output scan finds no sample catalog entry and no sample art in the production build. `docs/production-environments.md` and the README's synthetic demo section name the flag and say it is never set on a deployment. | Unit, Integration, Source scan, Record check |
| 009C-AC-005 | Every place a sample ad appears (a library card, step 1, the step 2 and step 3 previews, the campaign page, the Campaigns list) shows a visible "Sample ad" label with an accessible name. | Component, Integration |
| 009C-AC-006 | The manifest contract is a union on `blueprintId` with the `library-ad` variant of D5; every stored `open-house-boost` manifest still parses (a test parses the repository's existing manifest fixtures). The builder is a pure function with unit tests that copies each art file's `contentSha256` from the catalog, and the library-ad ruleset has the image minimum of D6. A schema test walks the `library-ad` variant at every depth and finds no key named or holding a partner, Realtor, brokerage, collateral, or co-brand identity (`partner`, `realtor`, `brokerage`, `collateral`, `coBrand`, or any key containing them). | Unit |
| 009C-AC-007 | A Postgres test saves a library-ad version through the application layer, approves it, and proves that a version with different words, a different library ad version, a different art digest, or different brand values has a different manifest hash and is not covered by the first approval. | Postgres (`pnpm test:db`) |
| 009C-AC-008 | Retirement follows D4: the approval command, through its catalog port and after its role check, refuses an undecided version whose library ad is retired, replaced, missing from the catalog, or whose art digests differ from the catalog's, each with a plain message, so the route (`apps/web/src/server/campaign-approval-handler.ts`) and any other caller get the same refusal, and a `@ts-expect-error` line in the command's unit test shows that a call without the port does not type-check; the launch reason for an approved version on a retired ad is the retired notice (009D-AC-016); retired and replaced ads never appear in the library or step 1, while their entries still render for the campaigns that used them. | Postgres route, Unit, Integration |
| 009C-AC-009 | "Use the new version" appears only for an undecided campaign version on an older library ad version; it asks before replacing the words and saves a new campaign version on the new library ad version; an approved version never changes its library ad version. | Integration, Postgres |
| 009C-AC-010 | The "Ads library" tab at `/marketing/campaigns/library` (its own `library/page.tsx`, inside the tab strip 009E-AC-009 owns) has the design's lead sentence (corrected as 009d D3 states), topic chips with counts ("All N" and one per topic that has an active ad) that filter in place and through `?topic=`, and a grid of four cards a row at 1440, three at 1180, two at 768, and one at 390, with the chips scrolling sideways at 390, using the chips, card, and grid components 009d builds for step 1. No search box and no sort control exist. | Integration, Browser (review) |
| 009C-AC-011 | Each card shows the ad's art with the viewer's own brand band applied (009d's band; the placeholder band when the viewer has no brand), its topic, its name, its default headline, "Version N. Reviewed <date>.", and "Use this ad", which opens step 2 of "Launch an ad" with that ad. Within a topic, newer approvals come first. | Component, Integration |
| 009C-AC-012 | With no active ad (the real catalog as shipped), the library tab, step 1, and Home's start card say so in one sentence ("No ads in the library yet. New ads are added after they're reviewed, so there's nothing to set up until then.") and show no topic chips. 009G-AC-001 photographs this state from a review server started without the samples flag. _(Amended 2026-10-03 by the PRD-009 writing review delta check (MTK-008, D-1): the sentence is fixed and its words do not change. Home's start card and the Campaigns list's empty description still say it whole. The library tab and step 1 draw the shared empty state, which has a title and a description of its own, so they say the sentence's two halves there: "No ads in the library yet" as the title and "New ads are added after they're reviewed, so there's nothing to set up until then." as the description. The state also carries an "Empty" chip, and a title that restated the first half made the one fact read three times.)_ | Integration (review), Browser (review) |
| 009C-AC-013 | Library art is served from the application origin: a browser test with ads on screen records no request to another origin. Each image's alternative text is the catalog's `images.alt`; the brand band is real text, so a screen reader reads the name and NMLS number. axe reports zero violations on the library tab at the four frames in both themes. The loader module imports `server-only`, the library pages are server components that pass only display fields (name, topic, default words, alt text, art path, version, reviewed date) to client components, and a source scan finds no client file importing the loader or a catalog file, so `compliance` and `approval` never reach a public bundle. | Browser (review), Component, Source scan |
| 009C-AC-014 | The catalog `README.md` and a template entry exist as D7 describes. The README states that the owner's own merge is the approval record, that the ruleset requires 0 reviews (Background 8), that ads arrive through a session or a private channel and never a public issue, that `compliance.notes` holds no lender name or policy text, and that an existing `(id, version)` is never edited. The operator checklist item (009F-AC-014) links them. | Record check |
| 009C-AC-015 | `ApprovalSnapshotSchema` is a union, and `createApprovalDecision` builds a library-ad version's snapshot as D5 states, with no random per-draft reference. A unit test shows two versions that differ in one word, in one art digest, in the disclosure line, or in the run dates produce different snapshots, and that an open house version's snapshot is unchanged. | Unit |
| 009C-AC-016 | The sample art route follows D2's lookup rule. With samples enabled, a test requests `..%2f..%2fpackage.json`, `%2e%2e/`, an absolute path, a backslash path, an unknown id, a version of `0` and of `1.5`, and a shape of `wide`, and gets 404 each time; it requests a known sample and gets its bytes with the stored content type. The route has no catch-all segment (source scan). | Integration, Source scan |

## Files expected to change

- `packages/contracts/src/ads-library.ts` (new), `packages/contracts/src/campaign-foundation.ts`, and their tests
- `apps/web/src/features/ads-library/**` (new: catalog, loader, library page components, README, template)
- `apps/web/src/fixtures/ads-library/**` (new: sample catalog and art), `tooling/scripts/ads-library/generate-sample-art.mjs` (new), and the sample art route
- `apps/web/src/app/(authenticated)/marketing/campaigns/library/**` (new); the Campaigns tab strip in `apps/web/src/app/(authenticated)/marketing/campaigns/page.tsx` belongs to 009e
- `packages/application/src/campaign-approval-command.ts` and `packages/application/src/campaign-foundation.ts` (the catalog port, the refusal, the snapshot union) and their tests
- `apps/web/src/server/campaign-approval-handler.ts` (Wave 1: the call at `:55` composes the required catalog port from the loader and passes it; 009e edits the file again in Wave 3 to record the name) and its tests, `campaign-approval-handler.unit.test.ts`, `campaign-approval-handler.postgres.test.ts`, and `campaign-approval-handler.correlation.postgres.test.ts`
- `packages/domain/src/campaign-foundation.ts`, `packages/application/src/campaign-workspace-read.ts` (`:207-226`), and `apps/web/src/server/dashboard-preview-handler.ts` (`:65-81`): in Wave 1 their manifest reads narrow on `blueprintId` for the union (the index run rule on exported types); 009d and 009e own the first two later, and 009d removes the third
- `tooling/scripts/database/review-browser-run.mjs` and `playwright.config.ts` (set the flag and `local`), `tooling/tests/database/review-browser-run.test.ts`, `README.md` (the synthetic demo section), `docs/production-environments.md`

## Test plan

- **Unit:** the schema (009C-AC-001), the schema test over both catalogs and their files (002), the generator (003), the loader (004), the variant and builder (006), retirement and replacement listing (008).
- **Postgres (`pnpm test:db`):** the binding (007), the retirement refusal (008), new versions (009).
- **Component and integration:** sample labels (005), tabs, chips, and cards (010, 011), the empty library (012).
- **Browser (review):** the grid at four frames (010), the origin rule and axe (013).
- **Record check:** documentation (004, 014).

## Security notes

- The sample guard fails closed (D3): it reads raw values, treats unset as not local, and refuses on any deployment-shaped signal; the sample catalog is not in a deployment's bundle, and the sample art route has a fixed lookup with no path from the request.
- Art paths are derived, contained, and digest-checked at load (D1), and the manifest and the approval snapshot both carry the digests (D5), so an approval covers the exact pixels.
- The catalog is code. Only the owner can merge, the ruleset requires 0 reviews, so the owner's merge is the approval record, and the schema, digest, immutability, and sample-guard tests run in CI on every change (D7). No outside account's text can supply an approval.
- Library art is a static file from the application origin; nothing is fetched from elsewhere at runtime.

## Open questions

- [ ] Which Special Ad Category everyday mortgage ads need (D-19). Still UNVERIFIED after the [Meta rules check](research/2026-10-02-meta-special-ad-category-check.md) (section 2); `HOUSING` stays the default and counsel and the lender decide (009F-AC-014 part c).
- [ ] Meta's call-to-action values and text limits. The lead-form list is VERIFIED and applied (D1; [Meta rules check](research/2026-10-02-meta-special-ad-category-check.md), section 5). Still UNVERIFIED: which of the six buttons a given account's industry is offered, and any hard headline or primary text limit (sections 5 and 6).

## Related

- [Design direction, section 5](design/00-direction.md)
- [Open decisions D-16, D-17, D-19, D-21](design/01-open-decisions.md)
- [Mockups: ads library](design/mockups/ads-library.html), [step 1](design/mockups/launch-step-1-choose.html)
- [Compliance and risk](../../../knowledge/private/compliance/compliance-and-risk.md)

## Amendments

- **2026-10-02, the Meta rules check (009D-AC-012)** ([Meta rules check](research/2026-10-02-meta-special-ad-category-check.md), index Amendments). E4: `callToAction` is one of the six values Meta allows on a lead-form ad, `LEARN_MORE` by default, and `CONTACT_US` is refused (D1, 009C-AC-001); the Wave 2 009d lane applies it to the shipped schema, its test, and the catalog README. The `editable` limits and `specialAdCategory` rows point at the record. No criterion was added or removed.
