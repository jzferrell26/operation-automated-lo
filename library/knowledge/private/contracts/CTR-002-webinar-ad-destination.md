# CTR-002: Prepared webinar ad and published destination

> **Status:** Accepted
> **Revision:** 2
> **Accepted by:** Root AutomatedLO engineering orchestrator, 2026-10-13 task /root/webinar_contract acceptance message approving the named engineering terms and instructing the clarifications recorded in revision 2 under Jonathan Ferrell's delegated implementation authority. This is engineering acceptance only, not owner/lender creative approval or provider permission.
> **Last reviewed:** 2026-10-13
> **Supersedes:** None
> **Superseded by:** None

## Boundary and scope

One immutable tenant campaign version binds an original prepared webinar template, edited words, saved lender identity, two final branded PNGs, budget, geography, schedule and a particular published webinar destination. Its exact evidence is presented for an actual human decision and checked again before any future provider operation.

This record defines an additive `webinar-ad` blueprint. It does not authorize global catalog approval, lender sign-off, a production publication, provider activation, spend, delivery, results or a custom domain. The initial increment saves and reviews campaigns and exports exact branded creatives. The provider launch remains disabled until its separately governed capability exists. Mandatory launch checks below govern any later consumer of this boundary; they do not claim that consumer exists today.

## Parties and owners

| Role | Owner | PRD or component |
| --- | --- | --- |
| Template provider | Webinar preparation implementation Guardian | Original pack, model, contained server asset loader |
| Publication provider | Funnel/database implementation Guardians | Saved funnel publications and narrowly scoped campaign destination resolution |
| Brand provider | Existing workspace preferences boundary | `readSavedAdBrand`, creator's saved lender identity |
| Producer | Campaign preparation implementation Guardian | Server prepare handler, immutable version and PNG renderer |
| Consumer | Campaign review implementation Guardian | Preflight, detail/list, human approval and branded download |
| Future consumer | Meta implementation Guardian | Separately authorized provider draft/read-back/launch capability |
| Record owner | Contract-writing Guardian | CTR-002; Library owns PRD dependency links |

## Sources and constraints

- [Campaign recovery](../../../requirements/in-work/prd-010-campaign-recovery/prd-010-campaign-recovery-index.md) preserves lender-only paid promotion, existing provider gates and older curated ads. [Funnel release](../../../requirements/in-work/prd-010-campaign-recovery/reference-funnel-release.md) distinguishes a saved draft from a reviewed platform-hosted publication.
- The October 13 user requests fifteen webinar-correlated ads with a click-launch workflow. Root's scoped task and October 13 engineering acceptance require creator-owned publication binding at save and tenant-authorized reviewer revalidation without broadening publication listing access.
- `apps/web/src/features/webinar-ads/model.ts` and its README describe exactly fifteen original `pending-review` entries, three per educational goal. Existing generic art panels are 1080 by 1080 and 1080 by 842, at most 1 MiB each. They have no catalog approval or bound destination.
- `apps/web/src/server/library-ad-save.ts`, `features/ads-library/server/library-ad-manifest.ts`, `packages/contracts/src/campaign-foundation.ts` and `packages/application/src/campaign-approval-command.ts` implement the separate approved-catalog path. Its literal approved image status cannot truthfully hold these pending templates.
- `apps/web/src/features/funnels/publication-model.ts`, `server/funnel-public-store.ts`, `server/funnel-public-http.ts` and `supabase/migrations/20261006230000_funnel_publication.sql` provide immutable snapshot, UUID publication, source revision, active flag and expiry. Owner reads filter tenant and publisher actor. The public snapshot capability checks active workspace/user, publisher role, active publication and expiry but does not return ownership evidence.
- `packages/application/src/campaign-command-context.ts` permits mutations by `location_admin` or `campaign_creator`, and approvals by `location_admin` or `campaign_approver`. `server/campaign-approval-handler.ts` obtains approver provenance from the principal and optional session display name. `features/campaigns/components/launch-on-facebook.tsx` has no provider operation.
- Source inspection is planning evidence. The existing source-pack unit evidence is recorded below; no new executable consumer or provider conformance is established by this contract.

## Agreed behavior

These terms are accepted engineering behavior at revision 2. Root's acceptance covers the exact named decisions and the renderer, copy and acyclic hashing clarifications below. External creative and release qualifications remain outside this acceptance.

### 1. Eligibility and version compatibility

1. Add `blueprintId: "webinar-ad"`, `schemaVersion: 1` to the existing manifest discriminated union. Keep the outer campaign/version schemas at 1. Add a distinct webinar approval snapshot variant. Do not widen `library-ad`, rewrite older JSON, add defaults to older parsed manifests or recompute their hashes.
2. The preparation registry remains separate from the approved catalog. It resolves the exact current template ID and positive integer version and verifies both original PNG byte digests, dimensions, type and contained derived paths before use. Missing, retired, replaced or changed source refuses preparation and approval. Current fifteen entries retain `pending-review`; eligibility means available for preparation only.
3. Frozen template evidence contains `id`, `version`, `goal`, `sourceHash`, the two source art digests and `rightsBasis: "platform-original"`. `sourceHash` is `canonicalCampaignHash` over the strict template value, including words, learning connection and art digests. No global reviewer, review date or lender authorization is synthesized. Rights qualification for a future source uses a separately accepted revision, not a browser checkbox.
4. Content bounds are visible plain text, headline 3 through 60 characters and primary text 3 through 300 characters. CTA is fixed server-side as `Learn more`; no claims, merge tokens or financing terms may be introduced through request fields. Existing saved lender brand supplies name, title, company, both NMLS identifiers, color preset, disclosure and consent wording. Missing identity fails readiness, never falls back to the synthetic brand in a real workspace. Preserve existing co-brand exclusion checks against saved partner names/company and unsupported claim checks.

### 2. Request and identity boundary

HTTP operation: `POST /api/campaigns/webinar-ads`, JSON, existing authenticated mutation origin/session boundary, bounded body at most 8 KiB. The strict body accepts only:

| Field | Type and meaning |
| --- | --- |
| `requestId` | UUID, exact-content retry identity scoped to principal tenant and actor |
| `templateId` | Exact prepared registry identifier |
| `templateVersion` | Positive integer, current registry version |
| `publicationId` | UUID identifying an existing published webinar, not authority by possession |
| `campaignRef` | Optional opaque reference to an accessible existing `webinar-ad` campaign |
| `expectedCampaignVersionRef` | Required opaque current reference when editing an existing campaign; absent for first preparation |
| `headline`, `primaryText` | Text within section 1 bounds |
| `endsOn` | ISO UTC date, interpreted by section 4 |
| `dailyBudgetDollars`, `totalBudgetDollars` | Finite values within the existing library input bounds: daily 5 through 1000, total 5 through 5000; persisted integer cents |
| `places` | Existing `AdPlacesInputSchema`; required usable geography, no ZIP/custom/protected targeting |

Browser-supplied URL, tenant, actor, brand, source snapshot, rights, artifact hash/path, review decision/name/date and provider authority are rejected. Brand and publication are resolved under the actual saving principal. A real mode rejects `local_synthetic` mutations. Saved records derive actor, server time and correlation from authenticated boundaries.

Successful first preparation returns 201; exact replay returns 200, the original version/preflight and `duplicate: true`. Output names the saved campaign/version, manifest and preflight hashes, row version and authenticated detail link. Neither response says published or globally approved. Invalid input returns 400, missing authentication 401, forbidden role/origin 403, inaccessible campaign/publication 404, stale/conflicting evidence 409, incomplete readiness 422, failed required runtime/render/persistence 503. Errors use sanitized `{ error: CODE }` plus existing correlation headers and user-facing next steps. No partial successful campaign or invented artifact is returned after failure.

### 3. Publication ownership and material destination

1. Saving resolves a publication owned by the saving actor in the principal's tenant. Only `live-webinar` and `on-demand` qualify. A private studio revision or any other funnel kind is rejected. Keep the existing owner-only list/export/revoke rights.
2. A reviewer obtains only the publication named by an accessible immutable campaign version. A narrowly scoped server/database capability proves tenant and publisher ownership against that version's `createdBy`; a caller may not pass another tenant, publisher or free-standing publication to gain lookup rights. Approval revalidation must work for a distinct authorized tenant approver. The anonymous public capability is also checked for current availability but cannot replace ownership proof.
3. The frozen destination is a strict value with `publicationId` UUID, `kind` enum above, `sourceRevision` UUID, `publisherActorRef` opaque reference, `snapshotHash` 64 lowercase hex, `publicUrl` server-derived HTTPS URL, `publishedAt` and `expiresAt` offset datetimes and `eventStartsAt` offset datetime for live webinar, otherwise null. Local-only test origin may use the existing explicitly local HTTP authority. Derive URL solely from validated canonical app origin plus `/f/` plus publication UUID. No custom URL, joining/recording/booking URL, visitor receipt, inquiry or token enters this manifest.
4. `snapshotHash` is the existing canonical campaign hash over the complete strict persisted `FunnelSnapshot` before access-only fields are redacted. This proves material identity without duplicating gated access URLs in new ad records or review DTOs. `destinationHash` is the canonical hash over the frozen destination value. The campaign manifest and approval snapshot cover both hashes and URL.
5. Preparation and approval require publication enabled, active, unexpired, accessible through the current public capability and publication blockers clear for its immutable snapshot. Live start must remain in the future. The requested URL does not prove external video uptime, webinar enrollment, captions, optional HighLevel handoff or conversion.
6. Private draft edits leave the existing immutable publication untouched and do not invalidate a campaign bound to it. Republishing creates a new publication/source revision. It does not silently retarget or invalidate an active older publication. Selecting that new publication requires a new campaign version and fresh approval. Taking the referenced publication offline, its expiry, publisher/workspace/role withdrawal, public collection disabled, source hash mismatch or canonical origin change blocks approval and any provider operation against the old version, including an otherwise identical retry.

### 4. Schedule, spend and targeting

Persist the current lender-only identity, Meta Housing special category, Facebook feed placement, US country, permitted states/cities, empty ZIP/audience/protected lists and validated integer-cent budget. Preparing or approving budget is not spending authorization.

`startsAt` is null for this increment. Requested end is `endsOn` at `23:59:59.000Z`. Effective `endsAt` is the earliest of requested end, publication expiry and live webinar start when present. It must be in the future. The save response's version, review DTO and approval snapshot carry this exact effective UTC timestamp; the review states the actual stop time and why it differs from the selected end day. A later launch rejects a version whose effective end has passed and revalidates exact budget/geography/schedule; it cannot rewrite them in place.

### 5. Final raster evidence

1. Generate two metadata-free final PNGs on the server: `tall` 1080 by 1350 and `square` 1080 by 1080. The original registry art panel and its embedded text remain unchanged. Add a lender-only footer with frozen saved lender identity/disclosure, using a versioned deterministic renderer and repository-bundled fixed font bytes. No system font fallback or remote font fetch participates. The renderer version pins the recipe, font digests and runtime qualification. No Realtor/brokerage identity or source-client assets enter paid output.
2. Edited Facebook headline and primary text are frozen separate placement copy, not a promise that the original illustrated panel's embedded lettering changes. The exact review must show both final raster images and that exact edited placement copy together, along with CTA/destination/disclosures. Approval covers the whole manifest. Copy/download explanations preserve this distinction; never present default panel lettering as evidence that edited Facebook copy was rendered into it.
3. The immutable manifest records an exact two-item ordered tuple (tall then square) containing `shape`, opaque `assetRef`, `rendererVersion`, `contentSha256`, `width`, `height`, `byteLength` and plain alt text. A final PNG is at most 2 MiB. Source eligibility and verified raster readiness are separate from human approval; do not put literal `approved` on pending art to bypass the shared image rule. Use a webinar-specific readiness rule with an actual human decision separately recorded.
4. Render and verify actual bytes before immutable version creation. References derive from campaign/version, shape and content digest; a reserved ref is never availability evidence. This increment uses deterministic regeneration from the frozen manifest inputs and bundled fixed renderer/fonts. Every output read and decision re-renders and checks the exact frozen digest, dimensions and length. A changed font/runtime/recipe cannot silently alter an approved output: mismatches fail closed with 503 and require a new version. A successful download never rerenders from current brand or template defaults. No new object-storage authority is required by this choice.
5. Output operation: authenticated `GET /api/campaigns/webinar-ads/{campaignRef}/{campaignVersionRef}/{shape}` where shape is exactly tall or square. Resolve version under tenant access, derive source paths internally, return `image/png`, private/no-store, `nosniff`, attachment with a derived safe filename; no filesystem path, external fetch or browser body participates. Unknown/foreign records return 404. Missing/corrupt bytes return 503. Approved and pending downloads use the exact same reviewed pixels; adjacent interface/copy states actual review standing. A download is not a launch.
6. Historical tenant-readable versions and their exact PNGs remain inspectable after source/destination withdrawal. Their review/read DTO visibly states current refusal and suppresses approve/launch actions. Withdrawal cannot recall previous downloads or delete audit evidence.

### 6. Save, edits, preflight and decision provenance

1. First save and each material edit create an immutable campaign version. Manifest hash covers every field above plus request hash and current input-version references. Template, words, destination, brand, renderer output, dates, budget or targeting changes require fresh preflight and human decision. Earlier approval never transfers. Compare expected current version transactionally to refuse stale edits; concurrent same-content retries converge to one version.
2. Reserve deterministic campaign/version references first from a domain-separated hash of authenticated tenant, actor and request UUID (retain the accessible existing campaign reference for an edit). Resolve normalized strict request, brand, template and destination; render using those frozen inputs and reserved references; calculate actual final PNG evidence; then calculate request hash over the normalized request plus the resolved evidence and reserved references, excluding the request hash itself, manifest hash and any approval. Finally build the manifest containing that request hash and calculate its canonical manifest hash. This order is acyclic; neither raster bytes nor identifier derivation depends on a hash that contains itself. Exact retries return original evidence and server timestamps. Reusing an ID for different resolved content returns 409. New evidence that would alter the frozen value requires a new request ID; no overwrite, false recovery success or duplicated version after an uncertain response.
3. Preflight has a dedicated versioned webinar ruleset covering current eligibility, rights/source integrity, verified final images, complete lender brand, words/claim/co-brand checks, current bound publication and valid schedule/geography/budget. No inherited constant `routing.validationStatus: valid` is treated as proof of optional HighLevel installation or delivery. Native inquiry destination can be eligible while optional HighLevel handoff is unconfigured; interface says so accurately.
4. Reuse `POST /api/campaigns/approve` with the existing actual role and origin/session checks. For webinar decisions the exact expected version, manifest hash, preflight hash and row version are required. Revalidate current template/art, bound publication and final PNG integrity after access/role checks and before any approval write or approval retry success. An exact previously committed decision retry may ignore the advanced row version only as existing command semantics do; revoked role, current destination/source refusal and changed substantive evidence still refuse it.
5. Add a webinar approval snapshot that includes template ID/version/source hash, both actual final PNG digests, destination hash/publication/source revision/snapshot hash, brand/copy/disclosure evidence, exact effective `endsAt` UTC timestamp and targeting/budget/date hashes. Actor kind is human, authoritative actor/role come from principal, decision time comes from server, optional display name comes only from the decision maker's own session. No automated catalog or lender endorsement is added.
6. Successful app approval means this authorized human approved this exact tenant version. Owner creative acceptance, lender authorization, live-provider qualification and separate launch/spend confirmation remain external obligations until real evidence is attached through their own governed boundary. UI must not equate app approval with them.
7. Server reads and UI actions use the same refusal rules as commands. Add explicit `webinar-ad` branches in all manifest consumers; the property fallback must never parse it as open-house data. Current approval refusal is derived at read time, not written over historical approval or inferred from a stale chip.

## Examples and edge cases

- Valid: a signed-in creator chooses current original `webinar-plan-first` version 1, a live publication they own, saved lender Brand, plain edited words, future UTC end date, $10 daily/$100 total and Illinois. Server verifies owner/publication/material hashes, generates both branded PNGs and saves one awaiting-review version. A distinct tenant `campaign_approver` reviews that version and can record their own exact decision after the narrow creator-publication check. No source registry entry becomes globally approved.
- Exact retry: the creator repeats the same request UUID and normalized/resolved content after losing the response. One original version is returned. Changing budget with that UUID yields 409; retry after the bound page is offline is refused and never advertises readiness.
- Edit: the owner edits the private studio headline. The old published snapshot and bound ad remain unchanged. Publishing the new revision yields another UUID. Selecting it for the ad creates another immutable campaign version and fresh approval. Explicit revocation of the old UUID blocks its approval/launch even if the original approval was recorded before revocation.
- Error: a caller pastes another user's publication UUID, a private editor link, custom URL or hand-written approval name. The server rejects the request without exposing the other publisher's snapshot or writing a campaign. A valid reviewer receives only the destination evidence of the accessible campaign they are reviewing.
- Raster drift: upgraded font output differs by one byte. The frozen digest does not match and the download/decision fails rather than silently delivering new pixels under an old approval.

## Compatibility and rollout

- Native interface version: campaign/version schema 1 with additive `webinar-ad` variant; separate new prepare/output routes. Existing library, open-house and financing variants remain byte/hash compatible. CTR revision 2 is the first accepted agreement for this boundary; revision 1 was a Draft.
- This is additive for old consumers only when they are upgraded to explicit exhaustive handling before new versions are produced. Older application builds do not understand webinar records. Gate new preparation until all manifest read, preflight, approval, repository decoding and UI consumers support the variant.
- Database manifest storage accepts JSON objects, but approval snapshots, role-scoped publication resolution and transactional save semantics still need real database verification. A narrowly scoped additive database capability may be required; root reserves its migration identifier separately. Do not widen owner publication RLS or choose a migration number in this contract.
- Rolling back to a build without the new variant disables new webinar preparation. Retain immutable records and any additive capability; do not mutate them into old approved library ads. The release owner must either retain compatible readers or explicitly qualify how legacy list/detail reads isolate unsupported records before rollback.
- Existing globally approved catalog stays truthful and separate. Original preparation pack source rights do not become lender approval. Existing UI baseline/date fixes and Financing CTR-001 are independent and unaffected.

## Verification obligations

| Party | Check to run | Evidence location | State |
| --- | --- | --- | --- |
| Template provider | Actual file digest/dimensions/type/metadata/path tests; missing, changed, retired and version replacement refusal | New webinar server loader tests and root webinar ledger | Planned |
| Publication provider | Real PostgreSQL creator ownership, tenant isolation, narrow distinct-reviewer lookup, no list/export/revoke expansion, public withdrawal/expiry/publisher-role checks | Reserved additive migration pgTAP and route Postgres tests | Planned |
| Producer | Real prepare handler save/reload; strict forbidden fields; exact replay/concurrency/conflict/stale edit; actual PNG bytes and no partial success | Prepare integration/Postgres tests and retained synthetic artifacts | Planned |
| Review consumer | Exact material snapshot; actual role/provenance decision; source/destination/raster drift before retry; historical version reads; all old hashes/readers preserved | Approval/detail/read regressions and real PostgreSQL tests | Planned |
| Renderer/UI consumer | Both actual branded PNGs equal approved preview; visible identity/disclosure and readable long text at desktop/tablet/phone light/dark; scoped accessibility and no overflow | Actual browser captures/download digests and independent UX report | Planned |
| Future provider consumer | Recheck evidence immediately before provider request; separate actual authority, confirmations, bounded spend and read-back; no launch on offline/retired data | Future provider qualification; source launch stays disabled here | Blocked pending separately authorized provider implementation/evidence |
| Closeout | Security, then independent Quality against accepted exact revision; GitHub repository/PR health before commit/push and current-head mergeability | Root batch review reports and CI | Planned |

## PRD dependencies

| PRD or sub-PRD | Needed revision | Impact if changed |
| --- | --- | --- |
| [PRD-010 campaign recovery](../../../requirements/in-work/prd-010-campaign-recovery/prd-010-campaign-recovery-index.md) | CTR-002 revision 2 | Webinar paid preparation/review and later provider path depend on exact evidence boundary; implementation proof remains open |
| [Reference funnel release](../../../requirements/in-work/prd-010-campaign-recovery/reference-funnel-release.md) | CTR-002 revision 2 for new consumer only | Ownership/snapshot/public availability remain unchanged; new narrow reader requires verification |

Library must add exact accepted revision links. Historical completed PRD-009 is a compatibility obligation, not reopened acceptance work. Acceptance does not finalize dependent PRDs or prove implementation.

## Open decisions

- None.

## Change history

| Revision | Date | Compatibility | Decision and affected parties |
| --- | --- | --- | --- |
| 1 | 2026-10-13 | Draft, first additive agreement | Reserved by root for this task. Contract-writing Guardian proposes exact shared terms from source and recon. Acceptance pending; all verification obligations remain planned. |
| 2 | 2026-10-13 | First accepted additive agreement | Root explicitly accepted engineering terms and instructed fixed-font deterministic regeneration, unmodified original panels with lender-only footer, separate exact Facebook copy review and acyclic reference/render/request/manifest hashing. Root authority is delegated implementation ownership, not creative/lender approval or provider permission. Source pack check ran: 15 entries, longest headline 48 characters, longest primary text 200; existing model unit suite passed 7 tests including every default's conservative claim guard and source artifact checks. New provider/consumer verification remains planned. |
