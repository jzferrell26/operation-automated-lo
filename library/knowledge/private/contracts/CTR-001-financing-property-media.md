# CTR-001: Financing property media

> **Status:** Accepted
> **Revision:** 1
> **Accepted by:** /root orchestrator (engineering scope), 2026-10-13 exact revision 1 read/freeze task message in this financing-contract session, under the user's delegated project authoring authority
> **Last reviewed:** 2026-10-13
> **Supersedes:** None
> **Superseded by:** None

The orchestrator reserved this exact record on October 13, 2026, read the complete revision 1, and froze its exact technical agreement for implementation under the user's delegated project authoring authority. The decision source is the `/root` task message: "I have read CTR-001 revision1 and freeze its exact technical agreement for implementation under the user's delegated project authoring authority." That engineering acceptance does not provide lender approval, public-release approval or user visual sign-off. An agreement and structural validation do not prove runtime conformance.

The reviewed Draft's SHA-256 was `04c7471d581e0cccf43442381d65c914939173f6da45598f57c3a566e86017b2`. Acceptance updates status, decision evidence and dependency/history metadata only; its technical terms are unchanged. Library/orchestrator owns the companion pointer and exact revision pin. Production storage/retention/quota and hosted qualification remain release obligations outside this engineering agreement.

## Boundary and scope

One boundary joins tenant-private property photograph intake, immutable saved financing comparisons, and their authenticated report/HTML/PDF consumers. New property facts and resolved media metadata belong to an explicit financing manifest v2. Existing comparison arithmetic, campaign persistence, and v1 saved records remain supported.

Only uploaded property JPEG/PNG photographs enter this increment. Identity headshots/logos, presets, remote imports, licensed template catalogs, public QR/site publication, sealed output approval, domain onboarding, and HighLevel delivery remain open. Recorded photograph rights are an author's attestation, not independently verified ownership or lender approval.

## Parties and owners

| Role                      | Owner                                        | Component                                                        |
| ------------------------- | -------------------------------------------- | ---------------------------------------------------------------- |
| Agreement and integration | Orchestrator, with contract-writing Guardian | This revision, execution ledger, final port integration          |
| Media producer            | Storage/database lane                        | Normalized bytes, metadata, rights, private reads and revocation |
| Snapshot producer         | Financing persistence/input lane             | Strict v2 request, saved facts and exact media projection        |
| Consumers                 | Financing output/UI lane                     | Authenticated report, private HTML site and real PDF             |
| Security and Quality      | Their independent Guardians, in order        | Verify implemented boundary and exact PAY subsets                |
| PRD links                 | Library/orchestrator                         | Parent requirements and accepted revision links                  |

## Sources and constraints

All behavior below is a proposed engineering agreement; the existing source establishes the reused foundations, not prior implementation of photo support.

- [Parent requirement](../../../requirements/in-work/prd-010-campaign-recovery/payment-flyers-and-co-branded-sites.md): PAY-007, PAY-008, PAY-009, PAY-014 and PAY-015; immutable shared source, media rights, actual photograph bytes and tenant isolation.
- [Current increment](../../../requirements/in-work/prd-010-campaign-recovery/financing-report-increment.md): private text reports, deterministic arithmetic, template `1.0.0`, tenant/actor retry identity and legacy storage compatibility. Its historical branch/deployment status is not fresh hosted evidence.
- [Financing schemas](../../../../packages/contracts/src/campaign-foundation.ts): `FinancingCampaignManifestSchema` is strict v1, has `images: []`, and is one entry in the `blueprintId` discriminated campaign union. The outer campaign version remains schema v1.
- [Calculation contract](../../../../packages/contracts/src/financing-comparison.ts) and [calculation implementation](../../../../packages/domain/src/financing-comparison.ts): integer financial amounts, existing `FINANCING_CALCULATION_VERSION` and one-to-five scenarios remain unchanged.
- [Normalization](../../../../packages/rendering/src/image-normalization.ts): `normalizeUploadedImages` and `SharpImageNormalizationAdapter` decode JPEG/PNG, check declared type, reject multiple pages, orient, reencode, strip metadata and compute normalized-byte SHA-256. Their existing 25 MiB and 100 MP limits are wider than the proposed HTTP limits.
- [Storage keys](../../../../packages/storage/src/production-storage.ts) and [R2 client](../../../../packages/storage/src/r2-object-store-client.ts): confined private keys, immutable PUT/HEAD and existing signing/configuration. There is no current private-byte GET port; this increment must add it. A property upload is not a generated campaign artifact, so do not fake an artifact type/version merely to fit `store`.
- [Campaign composition](../../../../apps/web/src/server/campaign-persistence-runtime.ts), [local persistence](../../../../apps/web/src/server/local-campaign-store.ts) and [database repository](../../../../packages/db/src/campaign-repository.ts): principal-bound PostgreSQL and existing synthetic filesystem mode. There is no existing local property-photo byte store; add a confined adapter beside this foundation, not a second database platform.
- [Authentication](../../../../apps/web/src/server/authenticated-principal.ts), [authorization](../../../../packages/application/src/campaign-command-context.ts) and [database context](../../../../packages/db/src/transaction-context.ts): session-derived tenant/actor, existing origin/CSRF mutation gate, mutation roles `location_admin` and `campaign_creator`, tenant read checks and principal-bound transactions.
- [Save](../../../../apps/web/src/server/financing-save.ts), [verification](../../../../apps/web/src/server/financing-verification.ts), [HTTP](../../../../apps/web/src/server/financing-http.ts) and [outputs](../../../../apps/web/src/server/financing-output.ts): canonical manifest/calculation verification, unchanged actor/request retry derivation, strict bounded JSON and private headers.
- [HTML CSP](../../../../apps/web/src/server/property-package-html.ts): current sandbox blocks images and does not grant a same-origin sandbox. The new HTML needs a narrowly scoped `img-src data:` addition, not remote images or a relaxed shared public policy.

## Agreed behavior

### Exact structures

All new schemas are strict. References use the existing opaque-reference rules; SHA-256 is 64 lowercase hexadecimal characters; instants use existing offset-capable ISO validation. Required nullable facts mean unknown, never zero. The following are port/type definitions to implement against this frozen revision, not existing exported declarations.

```ts
type FinancingImageMime = "image/jpeg" | "image/png";
type FinancingRightsBasis = "owned" | "licensed" | "permission";

interface FinancingMediaRights {
  readonly schemaVersion: 1;
  readonly basis: FinancingRightsBasis;
  readonly confirmed: true;
  readonly attestedBy: string; // authenticated actorRef, server supplied
  readonly attestedAt: string; // server clock, stable across exact retries
  readonly scope: "tenant-private-financing";
}

interface FinancingMediaSnapshot {
  readonly mediaRef: string; // media_<32 lowercase hex>; never a storage key
  readonly sha256: string; // normalized bytes
  readonly mimeType: FinancingImageMime;
  readonly byteSize: number;
  readonly width: number;
  readonly height: number;
  readonly normalizationVersion: "1.0.0";
  readonly metadataRetained: false;
  readonly rights: FinancingMediaRights;
  readonly altText: string; // trimmed printable text, 1 to 300 characters
}

interface FinancingPropertyFacts {
  readonly listPriceMinor: number | null; // existing money bounds; >0 if supplied
  readonly bedrooms: number | null; // integer, 0 to 100
  readonly bathroomsHundredths: number | null; // integer, 0 to 10000
  readonly floorAreaSqFt: number | null; // integer, 1 to 1000000
  readonly confirmed: true; // explicit author confirmation of displayed facts
}

interface FinancingMediaRecord {
  readonly locationRef: string;
  readonly mediaRef: string;
  readonly createdBy: string;
  readonly requestId: string; // UUID
  readonly requestHash: string;
  readonly sourceSha256: string; // original upload bytes, internal only
  readonly sha256: string;
  readonly mimeType: FinancingImageMime;
  readonly byteSize: number;
  readonly width: number;
  readonly height: number;
  readonly normalizationVersion: "1.0.0";
  readonly metadataRetained: false;
  readonly rights: FinancingMediaRights;
  readonly createdAt: string;
}

interface FinancingMediaRevocation {
  readonly mediaRef: string;
  readonly revokedBy: string;
  readonly revokedAt: string;
}

interface FinancingMediaRepository {
  // Instance is principal-bound; no browser or caller-selected tenant parameter.
  find(mediaRef: string): Promise<
    | Readonly<{
        record: FinancingMediaRecord;
        revocation: FinancingMediaRevocation | null;
      }>
    | undefined
  >;
  commitReady(record: FinancingMediaRecord): Promise<FinancingMediaRecord>;
  revoke(mediaRef: string): Promise<FinancingMediaRevocation>;
}

interface FinancingMediaBytesPort {
  putImmutable(record: FinancingMediaRecord, bytes: Uint8Array): Promise<void>;
  read(record: FinancingMediaRecord): Promise<Uint8Array>;
}

interface ResolvedFinancingMedia {
  readonly snapshot: FinancingMediaSnapshot;
  readonly bytes: Uint8Array;
}
```

The byte port is server-only and must derive the key internally from validated metadata:

```text
locations/<locationRef>/financing-media/<mediaRef>/<normalizedSha256>.<jpg|png>
```

The prefix is private; extension is selected from the validated normalized MIME. No filename, browser-supplied key, URL, query, path segment, local file path or bucket name enters key derivation. R2 uses only the configured private bucket. Filesystem mode derives the same relative key beneath a trusted checkout/test store directory; resolved paths and real parent directories must remain confined, including symlink checks. Filesystem mode is allowed only by the current explicit local/synthetic runtime mode, never as an accidental production fallback.

### Intake, rights and byte bounds

`POST /api/campaigns/property/financing/media` accepts one raw binary body. Headers are `Content-Type: image/jpeg|image/png`, `X-OALO-Media-Request-Id: <UUID>`, `X-OALO-Media-Rights-Basis: owned|licensed|permission`, `X-OALO-Media-Rights-Confirmed: true`, and the existing CSRF request header. Rights headers contain only these enumerated values, not free-form license text, external URLs or identifying correspondence. JSON, multipart, SVG, GIF, WebP, remote imports and arbitrary fetch targets are unsupported for this increment.

Authenticate and authorize before consuming the body. Enforce 1 to 2,097,152 bytes through a bounded stream reader, including absent/incorrect Content-Length; cancel a rejected stream. Before expensive reencoding, inspect decoded dimensions/page count with Sharp bounded to 12,000,000 input pixels. Width and height must each be 400 to 6000, decoded type must match declared MIME, and page/frame count must be one. Call the existing normalizer, then reject normalized output above 2,097,152 bytes, outside the same dimension/pixel limits or retaining metadata. Hash normalized bytes, not the original file, for every consumer.

Allow at most two concurrent image normalizations per process; excess returns 429 with `Retry-After: 3`. This is a bounded process guard, not a distributed quota. A snapshot has zero to six unique ordered media references and at most 12,582,912 normalized bytes in total. Zero is an explicit text-only private choice; never insert a stock or synthetic replacement. Photo-led evidence requires at least one real uploaded photograph, and the first item is the hero. Alt text belongs to the saved placement, so editing it creates a new comparison rather than mutating an uploaded byte record.

Upload success returns 201 and `{ mediaRef, sha256, mimeType, byteSize, width, height, normalizationVersion, metadataRetained, rights }`. Exact ready replay returns 200 with the same record and original attestation instant. Both responses use existing private/no-store/noindex headers and contain no original checksum, key, bucket, signed transfer or public URL.

`GET /api/campaigns/property/financing/media/[mediaRef]` resolves a read session and the principal-bound record, checks current revocation, loads bounded bytes, verifies exact length, SHA-256 and decoded normalized MIME/dimensions, then returns the matching image content type and private headers. A known same-tenant revoked reference returns 410. Missing and foreign references are indistinguishable 404 responses. A role allowed to read tenant campaigns may read same-tenant photographs; uploading/revoking requires the existing campaign mutation role and CSRF/origin gate. An opaque reference grants no access itself.

`POST /api/campaigns/property/financing/media/[mediaRef]/revoke` uses the mutation gate, permits an empty body only, and records server actor/time. It is idempotent and returns 200 `{ mediaRef, revokedAt }`. UI need only remove a placement from the current draft, with wording that removal does not revoke the underlying photograph. A separate rights-revocation operation blocks every subsequent same-tenant render/read that uses it.

Error envelope is `{ error: <stable code> }`: 400 `FINANCING_MEDIA_INVALID`, 413 `FINANCING_MEDIA_TOO_LARGE`, 415 `FINANCING_MEDIA_UNSUPPORTED`, 404 `FINANCING_MEDIA_NOT_FOUND`, 409 `FINANCING_MEDIA_CONFLICT`, 410 `FINANCING_MEDIA_REVOKED`, 422 `FINANCING_MEDIA_INTEGRITY_FAILED`, 429 `FINANCING_MEDIA_BUSY`, 503 `FINANCING_MEDIA_UNAVAILABLE`. Authentication, role and CSRF failures reuse the existing sanitized authentication error mapping. Do not return decoder internals, provider exceptions, keys or rights correspondence.

### Retry, readiness and retention

Derive `mediaRef` from the first 32 hex characters of SHA-256 of `financing-media:<locationRef>:<actorRef>:<requestId>`. `requestHash` is the canonical hash of `{ sourceSha256, declaredMimeType, rightsBasis, rightsConfirmed: true }`. A repeated actor/request with changed bytes or rights is 409; exact replay returns the persisted original record before reencoding. Different actors and tenants never share the retry identity.

Write immutable normalized bytes first, verify their exact readback, then commit a ready metadata record. Repository uniqueness is `(location_id, media_ref)` and `(location_id, created_by, request_id)`. Concurrent exact commits converge on one original record; conflicts never overwrite. If a storage write or readback fails, there is no ready record. If metadata commit fails after storage succeeds, a retry can complete that upload; orphaned bytes remain private and are never returned as success. UI retains the file, rights choice, form fields and stable request ID on uncertain failure. Changing the selected file after a failed upload needs a new request ID.

Records and normalized bytes are retained for this increment; there is no automatic age-based deletion or TTL that can break saved versions. Revocation is a separate append-only record, does not alter saved manifest hashes or photograph metadata, and denies subsequent bytes/rendering. Previously downloaded files cannot be recalled. Removing a photograph from a new draft does not change an earlier snapshot. Upload garbage collection, permanent erasure, distributed quota and production retention policy remain release qualifications; never claim this process guard fully implements them.

### Saved comparison v2

Keep the exact existing v1 financing schema and template `1.0.0`, with no parse-time defaults, transforms, inserted fact fields or media arrays. Publish `FinancingCampaignManifestV1Schema`, `FinancingCampaignManifestV2Schema` and `FinancingCampaignManifestSchema` (the v1/v2 union). Update the outer campaign schema with a union arrangement that supports one `blueprintId=financing-comparison` entry containing two `schemaVersion` cases. Do not add duplicate financing siblings to the existing blueprint discriminated union. Keep `CampaignVersion.schemaVersion=1` and all other campaign blueprints unchanged.

The v2 manifest has required `schemaVersion: 2`, `templateVersion: "2.0.0"`, the current financing fields, and `property.facts: FinancingPropertyFacts` plus `property.media: readonly FinancingMediaSnapshot[]`. Inherited `images` remains exactly `[]`, avoiding false generic image approval. `reviewOnly=true`, Meta disabled/zero budgets, missing routing, private notices and existing independent refusal of financing approval remain unchanged. The calculation version remains `1.0.0`; new facts do not affect arithmetic. List price and illustrated purchase price are separately labelled, even when equal.

Keep legacy unversioned save requests accepted as their exact v1 shape. The new form sends a strict request with `schemaVersion: 2`, `propertyFacts`, and `propertyMedia: [{ mediaRef, altText }]`, plus the original input fields. The browser never supplies resolved hashes, rights, actor/tenant, calculated results, template versions, storage keys or approvals. Save resolves media through the principal-bound repository, verifies bytes/current rights and constructs the complete snapshot server-side. Null facts display as Not supplied. Reuse of any saved comparison resets quote, cost/permission and fact confirmations, retains original quote instants, and requires a new save request ID. Reused media are references to original rights records and must be revalidated, not silently reattested.

Retain the existing `financing:<locationRef>:<actorRef>:<requestId>` campaign identity and canonical request hash. Request shape/version, media order, alt text or facts changes are content changes and therefore conflict on that request ID. Exact retry returns the original saved version. If revocation occurs concurrently with save, consumers still check revocation before returning output; a saved source is not a ready or approved generated package. Failed/409 saves leave the original user draft visible and preserve retry identity where content is unchanged.

No new campaign version table or photo base64 column is needed. The existing JSONB manifest accepts v2 source objects; reserve only `20261013210000_financing_media.sql` for the media metadata/revocation tables and RLS, if needed. Store no raw or normalized bytes in campaign JSON or PostgreSQL. Existing manifest/calculation verification stays on every output and reuse path, with unsupported schema/template versions refused instead of routed through a latest renderer.

### Actual output consumption

Add `resolveFinancingMedia(report, repository, bytePort)` to produce an ordered array of `ResolvedFinancingMedia` after tenant authorization and saved manifest/calculation verification. Compare record fields and saved rights against the exact snapshot; current revocation is checked separately. Verify every photo's bytes, MIME, dimensions, size and hash before output. Missing/corrupt/revoked photographs make a v2 photo output unavailable with the stable errors above; no dropped image, substituted photograph or empty hero can produce success.

Dispatch v1 to its current `financingReportPdf`/HTML layout and v2 to explicit `2.0.0` renderers. V2 PDF uses `pdf-lib.embedJpg`/`embedPng` on the verified normalized bytes and displays identical saved amounts/labels/quote validity. Embed all selected photos, with the hero leading and remaining photos in an explicit supporting gallery/appendix. Three scenarios use the original photo-led portrait comparison; four/five use an explicit landscape or extended report, preserving every amount and disclosure without microscopic type. Long descriptions can continue on supporting pages. Do not promise an arbitrary five-scenario/long-copy package fits one page.

Private site HTML embeds the verified bytes as data-image sources, never remote/signed storage URLs. Its route CSP adds only `img-src data:` to the existing hashed-style/script-free sandbox policy; keep all other restrictions. The authenticated application report may use the authenticated media GET URLs with explicit dimensions and original alt text. Both consume the same ordered saved snapshots and facts. Rendered HTML is capped at 20 MiB and PDF at 20 MiB; exceedance returns 422 `FINANCING_OUTPUT_TOO_LARGE`, never partial bytes. Loading images is bounded/sequential. Preserve the existing PDF concurrency limit and deterministic output metadata. No public projection, artifact approval or ready-package claim is introduced.

## Examples and edge cases

- Valid: a synthetic actor in `location_sample0001` uploads one authorized original JPEG, request `00000000-0000-4000-8000-000000000001`, basis `owned`, confirmed `true`. Normalization yields a 1200x800 image of 180000 bytes. The returned opaque reference, actual computed hash and server attestation become a v2 property-media snapshot when that actor saves a three-scenario private comparison. The JSON contains no photograph bytes/key. Report, embedded private HTML and embedded-image PDF show that exact photograph and the same saved totals.
- Foreign: a user from `location_sample0002` presents the opaque reference through GET or save. The tenant-bound lookup returns no record, yielding 404 without disclosure of ownership or storage details.
- Retry: the first upload writes bytes but the client loses the response. Repeating the same request ID/bytes/rights yields the original record once committed, preserving its attestation. Changed bytes with that ID yield 409. An uncertain comparison save similarly reuses its unchanged request ID.
- Revocation: a photograph was saved with a comparison. Revoking it preserves the immutable version/hash while subsequent media GET, site and PDF are unavailable. A new comparison without that placement is a distinct saved source. Previously downloaded PDFs remain outside recall.
- Legacy: a preexisting v1 manifest parses to exactly the original value and retains its stored canonical hash/template `1.0.0`. It does not acquire v2 defaults or data images. An unknown schema/template is refused.

## Compatibility and rollout

- Native interface version: media record/rights v1, request/financing manifest v2, template `2.0.0`; calculation and outer campaign version remain v1.
- Compatibility: additive reader/request support with exact legacy values retained. New media creation and v2 writes depend on compatible storage and readers.
- Order: freeze contract, implement metadata/byte ports and v1/v2 schemas, then snapshot save/read, then form/output integration, then real database/image/PDF/browser evidence, Security, Quality and PR qualification.
- Rollback: retain both readers/renderers after any v2 record exists. An older binary that accepts only v1 cannot be a valid rollback. Stop new v2 writes with a compatible build if necessary; never rewrite or delete saved versions to make an old reader appear healthy.

### Runtime file and export ownership

| Lane                 | Exact files/exports owned after assignment                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Dependency                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Storage/database     | New `packages/contracts/src/financing-media.ts`: media/rights/facts schemas and exports. `packages/contracts/src/index.ts`: export wiring only, coordinated with snapshot lane. New `packages/application/src/financing-media.ts`: repository/byte/resolved types. New `packages/db/src/financing-media-repository.ts`: principal-bound metadata/revocation repository. Reserved `supabase/migrations/20261013210000_financing_media.sql` plus its tests. New `packages/storage/src/financing-media-storage.ts`: confined key and local adapter. `packages/storage/src/r2-object-store-client.ts`: `putPrivateMedia`/`readPrivateMedia` confined byte extensions, retaining existing methods. Package indexes: their lane's exports only. | Frozen agreement                        |
| Storage HTTP/runtime | New `apps/web/src/server/financing-media-{runtime,http,service}.ts`: composition, handlers, normalization/readback/rights/retry resolution. New API `.../financing/media/route.ts`, `.../media/[mediaRef]/route.ts`, `.../media/[mediaRef]/revoke/route.ts`. Add tests scoped to these files. Existing auth/CSRF policy is consumed, not rewritten.                                                                                                                                                                                                                                                                                                                                                                                       | Metadata/byte ports                     |
| Snapshot/input       | `packages/contracts/src/campaign-foundation.ts`: v1/v2 union. `apps/web/src/server/financing-save.ts`, `financing-verification.ts`, `financing-http.ts`, `financing-context.ts`: save/read/reuse media/facts. `apps/web/src/features/financing/model.ts`, `form-model.ts`, `form.tsx`: typed request/form/projection, upload/remove/retry behavior. `apps/web/src/copy/financing-messages.ts`: agreed state/error copy. Existing associated tests.                                                                                                                                                                                                                                                                                        | Stable media schemas and resolver       |
| Output/UI            | `apps/web/src/server/financing-html.ts`, `financing-pdf.ts`, `financing-output.ts`: version dispatch, exact HTML/PDF consumption and output caps. `apps/web/src/features/financing/report.tsx`, `financing.module.css`: responsive photo report. New output-layout helpers/tests as assigned. Reuse `propertyDraftHtmlCsp` source policy by deriving a financing-only extension; do not edit that shared helper unless orchestrator assigns it.                                                                                                                                                                                                                                                                                           | Stable v2 view and resolved byte bundle |
| Orchestrator         | Shared export integration, `packages/application/src/index.ts`, any campaign-summary consumers of the union, authenticated page composition that resolves report bytes, ledger and handoff links. Assign this shared integration explicitly before parallel workers start.                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Both producer lanes                     |

These are future ownership assignments, not permission for this contract author to edit runtime files. Avoid concurrent edits to package indexes, model/CSS or shared tests. Output/UI receives model types read-only after the snapshot lane freezes them; form uses the CSS contract with additions integrated by its owner.

## Verification obligations

| Party             | Check to run                                                                                                                                                                                     | Evidence location                                               | State   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | ------- |
| Media provider    | Actual JPEG/PNG decode, malformed/mismatched/multiframe/metadata/bomb/overflow, missing Content-Length, normalized readback corruption, exact/concurrent retry and rights failure                | New media service/storage unit and PostgreSQL integration tests | Planned |
| Database provider | Current role/tenant transaction and RLS, foreign reference denial, immutable ready metadata, concurrent uniqueness and append-only revocation                                                    | Reserved migration pgTAP plus repository integration tests      | Planned |
| Snapshot producer | Frozen facts/media/rights, strict override denial, duplicate/max photos, 409 and uncertain save, old/new schema/hash round trips, revocation after save                                          | Financing save/read and real exported route tests               | Planned |
| Output consumers  | Actual PDF image XObjects/decoded fixture pixels, HTML data images matching normalized hashes, same financial rows/validity/version, corruption/refusal, v1 deterministic bytes unchanged        | Financing PDF/HTML tests and saved-v1 fixture                   | Planned |
| UI consumer       | Real upload/save/report/site/PDF journey, remove versus revoke, retained file/draft on failure, no stock fallback, long facts/alt/copy at four widths and both themes, all one-to-five scenarios | Assigned browser tests and visual evidence                      | Planned |
| Closeout          | Fresh Security, then Quality against exact ledger rows and remaining full PAY scope; current-main and MERGEABLE check before ship                                                                | Respective reports and PR evidence                              | Planned |

Structural validator limitation, October 13: the paired Weapon's `validate_contracts.py` applies an angle-bracket placeholder regex to the complete document, including code. It flags literal TypeScript generic return types and symbolic key/header notation in this frozen agreement as template placeholders. Its dependency scan also treats `CTR-001` inside a Markdown target filename as an unversioned mention even when that link's label correctly pins `CTR-001 revision 1`. Those are intentional literal syntax, not unresolved decisions. The orchestrator explicitly directed preserving this notation and reporting the false positives rather than rewriting the accepted agreement to satisfy the heuristic. The exact revision tokens and local links must still be checked separately; structural checking does not prove runtime conformance.

## PRD dependencies

| PRD or sub-PRD                                                                                                        | Needed revision              | Impact if changed                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [Payment/report/site](../../../requirements/in-work/prd-010-campaign-recovery/payment-flyers-and-co-branded-sites.md) | CTR-001 revision 1, Accepted | PAY-007/008/009/014 subsets depend on this media/snapshot agreement; agreement acceptance does not complete the full product |
| [Current financing increment](../../../requirements/in-work/prd-010-campaign-recovery/financing-report-increment.md)  | CTR-001 revision 1, Accepted | Legacy v1 compatibility and new private-photo scope need an accurate additive amendment from Library                         |
| [Financing photo execution ledger](../../../../FINANCING_PHOTOS_LEDGER.md)                                            | CTR-001 revision 1, Accepted | FP-MEDIA, FP-PERSIST and FP-OUTPUT can begin against the frozen engineering agreement; runtime verification remains required |

## Open decisions

- None.

## Change history

| Revision | Date       | Compatibility                            | Decision and affected parties                                                                                                                                                                                                                                                |
| -------- | ---------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | 2026-10-13 | Accepted, additive engineering agreement | `/root` read and froze exact revision 1 by task message under delegated project authoring authority. Draft SHA-256 recorded above. Provider, snapshot and output lanes implement these unchanged technical terms; lender/public-release/user visual approval is not granted. |
