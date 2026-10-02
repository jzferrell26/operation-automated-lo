# PRD-009c: Marketing Toolkit - Property Intake: Photos, Storage, and Link Import

> **Parent:** [PRD-009](./prd-009-marketing-toolkit-index.md)
> **Status:** Backlog. Authored 2026-10-01. Not started.
> **Priority:** P0. The ad needs a photo, and the owner chose link import (D-1).
> **Schema changes:** Additive. Two migrations: two append-only tenant tables, three new rate-limit scopes, one private Storage bucket with a restrictive policy. One new pgTAP suite.
> **Owner Guardians:** `supabase-platform-guardian` (migrations, bucket, policy, pgTAP, the Storage client); `security-guardian` (upload validation, the hardened fetch, receipts, the lane review); `typescript-node-guardian` (the import port and its tests)

## Goal

Give step 1 of the launch flow two honest ways to bring a property in, both server-side and both guarded:

- **Photo upload**, stored in a private Supabase Storage bucket, recorded in a tenant table, and served back only through the application's own origin.
- **Zillow or Redfin link import**, lifted from Listing Studio with every guard the owner named: the permission checkbox, the exact-URL allowlist, the hardened fetch, the photo CDN allowlist, the rate limit, and provenance.

Manual entry stays available whatever happens to either.

## Why this is its own sub-PRD

The suggested split put intake inside the launch flow. It is separated because it carries the PRD's only migrations, its only outbound fetch to a third-party site, and its largest security surface. It has a different owner (`supabase-platform-guardian` with `security-guardian`), it can be proven entirely at the route and database level, and 009d consumes it through two routes. Splitting lets it run in Wave 1 in parallel with the shell, and lets `security-guardian` review it before the flow is built on top (009C-AC-017).

## Background (honest)

1. **No photo intake exists.** The create page has no image input, and a saved version records `images: []` (PRD-008b D1; `apps/web/src/server/open-house-draft.ts:120-126`). The manifest contract allows up to 20 images (`packages/contracts/src/campaign-foundation.ts:260-273`), and preflight checks each present image for approval and size (`packages/domain/src/campaign-foundation.ts:217-238`) against the ruleset minimum of 1200 by 630 (`open-house-draft.ts:171-172`).
2. **No application code uses object storage today.** No migration touches `storage.*`. The architecture blueprint plans Cloudflare R2 for objects (`library/knowledge/private/architecture/system-build-blueprint.md:256-286`), and `packages/storage/src/r2-object-store-client.ts` exists with configuration in `packages/config/src/production-services.ts:26-35`, but no R2 account or variable exists for the hosted app. The hosted database is a Supabase project, and `pnpm test:db` runs the full local Supabase stack (`supabase start`, `tooling/scripts/database/run-real-database-tests.mjs:265`), which includes Storage.
3. **The table pattern to follow.** Campaign tables use three standard policies (all for `migration_owner`, tenant-matched for `app_runtime`, support-context select for `support_runtime`), `select, insert` grants, and the `campaign.reject_immutable_mutation()` trigger (`supabase/migrations/20260915180000_campaign_activation.sql:226-279`). Rate-limit scopes are widened the way `supabase/migrations/20260930180000_change_password_rate_limit.sql` widened them for `change_password_user`.
4. **Image tooling.** `sharp` 0.35.4 is already in the lockfile (`packages/rendering/package.json:21`, root `package.json:49`).
5. **Listing Studio's import** ([recon section 2](research/2026-10-01-listing-studio-recon.md)), at snapshot `15e42829`:
   - exact page URLs only: Zillow `/homedetails/..._zpid` and Redfin `/ST/.../home/<id>` on four exact hosts, HTTPS, no port or credentials (`src/lib/property-import/urls.ts:3-19`);
   - a photo CDN allowlist per provider (`urls.ts:20-28`) and a public-IPv4 check (`urls.ts:30-39`);
   - a hardened fetch: DNS resolved and pinned to public IPv4 addresses, a 20 second deadline, 5 MiB page and 10 MiB photo caps, identity encoding only, every redirect revalidated against the same property, at most four redirects, and a content-type check (`src/lib/property-import/fetch.ts:13-72`);
   - extraction from inert JSON and meta tags, no script execution (`extract.ts:40-96`);
   - an HMAC-signed receipt bound to the tenant and person that expires in 30 minutes (`receipt.ts`), keyed from its own Supabase secret;
   - private provenance (`provenance.ts`);
   - the permission checkbox "I am authorized to import this property content. I will verify it before publishing." (`src/components/property-import/PropertyUrlImport.tsx:60`), enforced server-side (`src/app/api/listings/import/route.ts:36`);
   - a per-instance, in-memory rate limit of 6 previews and 60 other actions per minute per person (`route.ts:16-24`);
   - a Firecrawl hosted fallback used only after an HTTP 403 (`firecrawl.ts`);
   - tests on synthetic fixtures. Counted as `it` and `it.each` blocks at `15e42829`: 20 in `src/lib/property-import/import.test.ts`, 7 in `fetch.test.ts`, 33 in `firecrawl.test.ts`, 8 in `src/app/api/listings/import/route.test.ts`, and 6 in `src/components/property-import/PropertyUrlImport.test.tsx`. (The recon's figures, 18, 6, 26, 8, and 6, counted differently.)
   Its own security review says a public fetch "is not a license" and that live Redfin import is "not qualified"; live Redfin returns 403; no document reviews Zillow's or Redfin's Terms of Use.
6. **The owner accepted the legal risk.** D-1: "Yes, include it", against the designer's recommendation, knowing there is no Terms of Use review and that Zillow photos in paid ads carry copyright risk. The PRD records the risk (index, Risks) and routes a counsel review to the operator checklist (009F-AC-014).

## Scope

- Two migrations and `supabase/tests/property_intake.pgtap.sql`.
- A server-only module `apps/web/src/server/property-intake/` (the Storage client, upload validation, the import port).
- Routes `POST /api/campaigns/photos`, `GET /api/campaigns/photos/[photoRef]`, and `POST /api/campaigns/import`.
- `apps/web/src/features/http/user-messages.ts` entries for every new refusal code, and a new `apps/web/src/copy/property-intake-messages.ts`.
- `docs/production-environments.md`, `docs/operations/retention-and-deletion.md`, `docs/operations/export.md`.

The step 1 controls that call these routes belong to 009d.

## Non-Goals

- The Firecrawl fallback (D5).
- A logo or headshot upload.
- Deleting photos. Rows and objects are append-only in PRD-009; deletion waits for the retention rule the operator checklist already tracks (decision D-7, item L-15).
- Producing a raster ad image for Meta. That belongs to the future Meta publish PRD.
- Any live request to Zillow or Redfin during the run. Every test uses synthetic fixtures.

## Design decisions

### D1. Supabase Storage, not R2, for property photos

The orchestrator's direction for this PRD is a Supabase Storage bucket with its policy in a migration and a pgTAP suite. That departs from the blueprint's R2 plan, so it is recorded: the hosted Supabase project already exists, the local test stack already runs Storage, and no R2 account exists. R2 stays the plan for published artifacts. Register row S-69 adds a dated note to the blueprint. Owner confirmation is requested in the index (AD-2), with this as the default.

### D2. Two append-only tables

- `campaign.property_imports`: `id uuid`, `location_id`, `created_by` (app user), `provider` (`zillow` or `redfin`), `source_url`, `source_status`, `source_sha256`, `fetched_at`, `permission_confirmed_at`, `created_at`.
- `campaign.property_photos`: `id uuid`, `location_id`, `created_by`, `object_key` (unique), `sha256`, `content_type` (`image/jpeg` or `image/png`), `width`, `height`, `byte_size`, `acquisition` (`upload` or `import`), `import_id` (nullable, references `property_imports` in the same location), `created_at`.

Both follow Background 3 exactly: RLS enabled and forced, the three standard policies, `select, insert` for `app_runtime`, `select` for `support_runtime`, no update or delete grant, and the immutability trigger. A photo's reference in a campaign version is `propertyphoto_<32 hex>`, which matches `OpaqueReferenceSchema` (`packages/contracts/src/campaign-foundation.ts:3-7`).

### D3. The bucket and its policy

Migration B creates a private bucket `property-photos` (`public = false`, `file_size_limit` 10 MiB, `allowed_mime_types` `image/jpeg` and `image/png`) and a restrictive policy on `storage.objects` that denies `anon` and `authenticated` any access to that bucket, so a later permissive policy cannot open it. The application never uses those roles: it reaches Storage only from the server with a server-only secret key. The bucket statements need the role that owns the `storage` schema, not `migration_owner`, so they live in their own migration file whose header names the role; `supabase-platform-guardian` confirms on the local stack which role that is. Whether the hosted migration login can run them is UNVERIFIED, so the operator step (009F-AC-014) says so.

Object keys follow the blueprint's shape: `locations/<location_id>/photos/<photo_id>/<sha256>.<ext>`.

### D4. Server-only configuration, fail closed

Two new server-only variables, a set: `OALO_PHOTO_STORAGE_URL` (the project's HTTPS URL) and `OALO_PHOTO_STORAGE_SECRET_KEY`. Both present composes the Storage client; both absent composes a not-configured client that makes no request; exactly one present is a composition failure logged by variable name. This is the email pair's pattern (`docs/production-environments.md`, "Email and password sign-in server variables"). Which Supabase key type the Storage API accepts here (a legacy service role key or a new secret key) is UNVERIFIED; `supabase-platform-guardian` settles it against Supabase's documentation before the client is written. The receipt key is not a storage secret: it is derived by HKDF-SHA256 from the existing `OALO_CSRF_SERVER_SECRET` with the info string `oalo/property-import/receipt/v1`, so import needs no further variable. `security-guardian` rules on that derivation in its lane review.

### D5. No Firecrawl fallback

The owner's list of guards does not include it, and it would send property URLs to a third-party scraping service that this product has never reviewed as a processor. A 403 or 429 from the site becomes the plain message that the page could not be read, with manual entry offered. The 33 Firecrawl test definitions are not ported.

### D6. A durable rate limit, not a per-instance one

Listing Studio's limit is in memory per server instance (`route.ts:16-24`), which a serverless deployment spreads across instances. This port uses the platform's existing durable counter, `platform.consume_auth_rate_limit`, with three new scopes keyed on the person: `property_import_preview_user` (6 per 60 seconds), `property_import_photo_user` (60 per 60 seconds), and `property_photo_upload_user` (30 per 60 seconds). None feeds the sign-in lockout.

### D7. Two boxes on the import path, one on the manual path

Listing Studio's import box ("I am authorized to import this property content. I will verify it before publishing.") is required before any fetch, server-side. Step 1's own box (009d) is still required to save, because it covers marketing the property and using the photos in ads. A person who types the address and uploads photos sees only step 1's box.

### D8. Messages follow the user-language contract

Listing Studio's messages name HTTP status codes, "automated access", and "provider" (for example `fetch.ts`, the 403 branch; `urls.ts`, the photo host check). Each refusal here has its own code mapped to two plain sentences in `apps/web/src/features/http/user-messages.ts`, with no status number, no "provider", and no internal noun.

## Acceptance criteria

| ID | Criterion | Test |
|---|---|---|
| 009C-AC-001 | Migration A (`supabase/migrations/<timestamp>_property_intake.sql`, under `set role migration_owner`) creates the two tables of D2 with their checks and the foreign key from photo to import within one location; enables and forces RLS; creates the three standard policies; grants `select, insert` to `app_runtime` and `select` to `support_runtime` and nothing else; attaches the immutability trigger; and widens the rate-limit scope list with the three scopes of D6 the way `20260930180000_change_password_rate_limit.sql` did. Its header states migration safety, lock class, and roll-forward, in that file's form. | pgTAP |
| 009C-AC-002 | Migration B (`supabase/migrations/<timestamp+1>_property_photos_bucket.sql`) creates the private bucket and the restrictive policy of D3, under the role its header names, and nothing else. | pgTAP |
| 009C-AC-003 | `supabase/tests/property_intake.pgtap.sql` runs in `pnpm test:db` and proves: RLS enabled and forced on both tables; tenant isolation under `app_runtime` with `platform.set_app_context` (one location reads and writes none of another's rows); no update or delete for `app_runtime`, and the trigger refuses one; support reads only with a support context; the bucket's `public`, size limit, and MIME list; the restrictive policy's presence; as `anon` and as `authenticated`, a select on `storage.objects` for the bucket returns no rows and an insert is refused; the three new scopes are accepted by `platform.consume_auth_rate_limit` and an unknown scope is still refused. | pgTAP |
| 009C-AC-004 | The Storage client in `apps/web/src/server/property-intake/` composes as D4 states (both, neither, exactly one), never reads a `NEXT_PUBLIC_` name, and is the only code that talks to Storage. Unit tests use a stub transport for put, get, a 4xx, a 5xx, and a timeout. | Unit |
| 009C-AC-005 | `POST /api/campaigns/photos` requires a session and the full mutation gate including CSRF, and a role that may create campaigns. It accepts one file per request of at most 10 MiB; checks the real bytes (a JPEG or PNG signature, decodes, at least 1200 by 630, at most 40 megapixels); re-encodes with `sharp`, dropping all metadata; stores the object at the key of D3; inserts a `property_photos` row with `acquisition = 'upload'`; spends one `property_photo_upload_user` unit; and answers the photo reference, width, and height. Route tests on real PostgreSQL cover acceptance and each refusal: no session, missing CSRF, wrong role, too large, wrong type, a renamed non-image, too small, too many pixels, rate limited, storage not configured. | Postgres route (`pnpm test:db`), Unit |
| 009C-AC-006 | `GET /api/campaigns/photos/[photoRef]` requires a session, reads the row under the session's tenant context, and streams the bytes from Storage with the stored content type, `Cache-Control: private`, and `X-Content-Type-Options: nosniff`. A reference from another location, an unknown reference, and a not-configured store all answer the same 404. A review-project browser test with photos on screen records every request and finds none outside the application origin, the rule `tests/browser/ui-foundation-ux.spec.ts:21-25` enforces for the synthetic project. | Postgres route, Browser (review) |
| 009C-AC-007 | When the storage pair is absent, every upload control says in one sentence that photo upload isn't set up for the workspace yet and that support can finish it, no request goes to Storage, and the rest of the flow still saves a version with no photo. | Integration |
| 009C-AC-008 | The import module ports, with equivalent behaviour, Listing Studio's exact-URL allowlist, photo CDN allowlist, public-IPv4 check, hardened fetch, inert extraction, receipt, and provenance (Background 5), and nothing from `firecrawl.ts` (D5). It is server-only and takes its fetch as an injected dependency. | Unit |
| 009C-AC-009 | Every test definition in Listing Studio's `import.test.ts`, `fetch.test.ts`, `route.test.ts`, and `PropertyUrlImport.test.tsx` (41 at `15e42829`, Background 5) has an equivalent here on synthetic fixtures, or a recorded reason it does not apply (for example the listing-creation action this port does not have). The mapping table is in the lane report and the ledger row. | Unit, Component, Postgres route |
| 009C-AC-010 | `POST /api/campaigns/import` has two actions. `preview` requires a session, the mutation gate, `permissionConfirmed: true` for the box of D7 (refused otherwise, server-side), and one `property_import_preview_user` unit; it answers the address, state, ZIP code, a short description, the list of allowlisted photo URLs, and a receipt token. `photo` takes a receipt and a photo index, fetches only from the allowlisted CDN, validates and re-encodes as in 009C-AC-005, writes the `property_imports` row the first time the receipt is used, stores the photo with `acquisition = 'import'` and that `import_id`, and spends one `property_import_photo_user` unit. Route tests cover each refusal: no box, a non-property URL, a disallowed host, a redirect away from the property, a private address, a timeout, a page too large, a disallowed photo host, rate limited. | Postgres route, Unit |
| 009C-AC-011 | Receipts are signed with the key of D4 and expire after 30 minutes. A receipt from another location or person, an expired receipt, and a tampered receipt are refused. With `OALO_CSRF_SERVER_SECRET` absent, import refuses with the not-set-up message and fetches nothing. | Unit |
| 009C-AC-012 | Every refusal code from the three routes maps to a pair of plain sentences in `apps/web/src/features/http/user-messages.ts`; a unit test asserts every exported code has a mapping; none of the sentences contains a status number, "provider", "automated", or another forbidden term; the source guard passes. | Unit |
| 009C-AC-013 | No test makes a network request to Zillow, Redfin, or their CDNs: the default fetch is replaced in every test, and a guard test fails if it is reached. Fixtures are synthetic pages and generated images that name no real property, and their README says so. | Unit, Source scan |
| 009C-AC-014 | Provenance stays private: no source URL, receipt, or import row reaches the ad preview, a public page, or a campaign's manifest content. The campaign page may say where property details came from (009E-AC-011). | Integration, Source scan |
| 009C-AC-015 | Manual entry always works: with import unused, refused, failed, or not configured, the address field and photo upload still work, and the import control is a secondary action, never the step's primary button. | Component |
| 009C-AC-016 | `docs/production-environments.md` lists the two variables of D4 as a server-only set with the pair semantics. `docs/operations/retention-and-deletion.md` and `docs/operations/export.md` name `campaign.property_imports`, `campaign.property_photos`, and the `property-photos` bucket as user data (including source URLs) and say that photos stay until the retention rule tracked in the operator checklist defines deletion. | Record check |
| 009C-AC-017 | `security-guardian` reviews this sub-PRD's surface (both migrations, the policy, the three routes, upload validation, the hardened fetch, receipts and the key derivation) before Wave 2 starts, writes its report to this PRD's `qa/` folder, and reports zero unresolved Critical, High, or Medium findings. | Review |

## Files expected to change

- `supabase/migrations/<timestamp>_property_intake.sql` and `supabase/migrations/<timestamp+1>_property_photos_bucket.sql` (new)
- `supabase/tests/property_intake.pgtap.sql` (new)
- `apps/web/src/server/property-intake/**` (new) and its tests and fixtures
- `apps/web/src/app/api/campaigns/photos/**`, `apps/web/src/app/api/campaigns/import/**` (new)
- `apps/web/src/features/http/user-messages.ts`, `apps/web/src/copy/property-intake-messages.ts` (new)
- `apps/web/package.json` (adds the workspace's existing `sharp` 0.35.4; no new package enters the lockfile)
- `docs/production-environments.md`, `docs/operations/retention-and-deletion.md`, `docs/operations/export.md`

## Test plan

- **pgTAP (`pnpm test:db`):** 009C-AC-001 to 003.
- **Unit:** the Storage client (004), validation (005), the port and its mapped tests (008, 009), receipts (011), messages (012), the network guard (013).
- **Postgres route (`pnpm test:db`):** upload and read (005, 006), import (009, 010).
- **Integration and component:** not-configured state (007), provenance boundaries (014), manual entry (015).
- **Browser (review):** the origin gate with photos on screen (006).
- **Review:** `security-guardian`'s lane report (017).

## Security notes

- The fetch is the server-side request forgery surface. Its guards are the ones Listing Studio's own review accepted, plus a durable rate limit (D6). Redirects are revalidated against the same property ID, and every resolved address must be public IPv4.
- Uploaded bytes are never trusted: the signature, decode, size, and pixel count are checked before anything is stored, and the stored file is a fresh re-encode with no metadata, so no EXIF location data is kept.
- Photos are served only from the application origin, so the browser never holds a Storage URL or key, and the content security policy needs no new origin.
- The two tables are append-only and tenant-isolated in the database, not only in the route.

## Open questions

- [ ] **Which role creates the bucket on the hosted project** (D3). UNVERIFIED; routed to the operator step.
- [ ] **Which Supabase key type the Storage client sends** (D4). UNVERIFIED; settled by `supabase-platform-guardian` before the client is written, recorded in Amendments.
- [ ] **Photo limits** (10 photos, 10 MiB, 1200 by 630 minimum) are product limits. Meta's own image rules are UNVERIFIED and belong to research gate G3.

## Related

- [Listing Studio recon, sections 2 and 8](research/2026-10-01-listing-studio-recon.md)
- [Open decision D-1](design/01-open-decisions.md)
- [System build blueprint, object storage](../../../knowledge/private/architecture/system-build-blueprint.md)
- [Compliance and risk](../../../knowledge/private/compliance/compliance-and-risk.md)

## Amendments

None yet.
