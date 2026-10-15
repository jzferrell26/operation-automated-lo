# CTR-004: Public financing package release

> **Status:** Accepted
> **Revision:** 1
> **Accepted by:** Jonathan Ferrell, 2026-10-14 UTC (2026-10-13 America/Chicago) human response to request_user_input_async call_a3d8e442cefc42f3bde5fa5c51d7980e: "Adopt both plans (Recommended)". The question linked the exact CTR-003 and CTR-004 revision 1 files and stated the recommended policies. This is acceptance of engineering terms, not lender approval, provider qualification or real ad-spend authorization.
> **Last reviewed:** 2026-10-14
> **Supersedes:** None
> **Superseded by:** None

## Boundary and scope

Acceptance evidence: the reviewed Draft revision 1 had SHA-256 `8e5c5f4c4c3197e8d3dc53810bc6497430b330a78fbe11c3f9abf28ed23fa4ad`. Jonathan accepted both exact linked plans through the response above, as delivered by the root orchestrator to `/root/publisher_contract` on October 14 UTC. The accepted normative body below is byte-for-byte unchanged from that reviewed Draft. Historical words such as proposed describe its drafting context; acceptance now settles the engineering policies while leaving actual source and release qualifications unproven.

This proposed agreement governs the immutable release envelope passed from financing source preparation and collateral review to anonymous property-site readers, report downloads, optional externally created QR assets, and consented HighLevel inquiry delivery. It is one release boundary: every consumer must resolve the same exact approved package and its current eligibility. All terms below remain proposed until revision 1 is accepted.

The existing private financing manifests remain private. This record does not add a sixth kind to the five-funnel roster, expand financial-program eligibility, calculate APR, approve a lender's disclosures, activate collection, publish a customer site, or authorize a provider call. Source implementation and synthetic qualification can proceed once the engineering agreement is accepted; actual release requires the recorded release inputs described below.

## Parties and owners

| Role | Owner | PRD or component |
|---|---|---|
| Provider | Financing preparation owner, assigned by the orchestrator | Saved property, partner, preset and quote evidence; existing financing comparison calculator and version repository |
| Provider | Collateral review and publication owner, assigned by the orchestrator | Exact output bundle, approval records, current eligibility, public release envelope |
| Consumer | Property report/site owner, assigned by the orchestrator | Authenticated review, anonymous HTML, image and PDF routes |
| Consumer | HighLevel integration owner, assigned by the orchestrator | Durable inquiry claim, location-bound contact handoff and attribution readback |
| Consumer | Domain onboarding owner, assigned by the orchestrator | Canonical origin and verified custom-host binding; reuse PR #87 after qualification |
| Consumer | Loan officer using the connected HighLevel location | Copy canonical URL; create/manage a Website QR in HighLevel; optionally supply a verified inert QR image |
| Documentation owner | Library | PRD-010 payment/report/site and five-funnel requirements; appropriate PRD-001 dependencies |

No implementation file ownership is assigned by this draft. Shared exports, SQL identifiers and migrations require explicit assignments before engineering work.

## Sources and constraints

- [Payment/report/site brief](../../../requirements/in-work/prd-010-campaign-recovery/payment-flyers-and-co-branded-sites.md), PAY-001 through PAY-016, supplies the owner outcome and public-release constraints. Its financial inputs and permissions remain release inputs, not platform defaults.
- [Private financing increment](../../../requirements/in-work/prd-010-campaign-recovery/financing-report-increment.md) and [CTR-001 revision 1](CTR-001-financing-property-media.md) govern exact legacy source and private media compatibility. Existing photo attestations have the literal scope `tenant-private-financing`; they do not authorize public distribution.
- [Existing financing contracts](../../../../packages/contracts/src/financing-comparison.ts), [private save](../../../../apps/web/src/server/financing-save.ts), and [verification](../../../../apps/web/src/server/financing-verification.ts) provide fixed-purchase arithmetic version `1.0.0`, exact stored hashes, one-to-five scenarios, supplied APR and quote instants. `quote.confirmed` and free-form `quote.source` alone do not establish lender evidence.
- [Reference funnel release](../../../requirements/in-work/prd-010-campaign-recovery/reference-funnel-release.md) and [five-funnel product](../../../requirements/in-work/prd-010-campaign-recovery/turnkey-five-funnel-product.md) provide encrypted consented capture, truthful handoff status, retained owner export/revocation and domain isolation principles. Their exact five kinds and existing retention policy remain unchanged.
- [Existing inquiry capture](../../../../apps/web/src/server/funnel-public-http.ts), [encrypted store](../../../../apps/web/src/server/funnel-public-store.ts), and [delivery](../../../../apps/web/src/server/funnel-public-delivery.ts) are reusable architecture, not proof of a financing publication or complete property/partner attribution.
- [PR #87 at 5159b20ac5eda22c8428312efa5b1f85a4e02d22](https://github.com/jzferrell26/operation-automated-lo/pull/87) was inspected read-only through its GitHub diff. It authors hostname validation, an exact-host ownership TXT challenge and provider/TLS boundaries. Persistent binding, customer setup UI, routing and end-to-end qualification are unfinished. Its five-kind enum cannot silently be broadened to financing. Preserve its active author's files.
- Human instructions in this task, October 13: a single-LO product with no customer roles; HighLevel is the CRM/plugin host; prefer HighLevel QR functionality instead of another QR-management screen. The QR instruction settles that product direction, not the detailed proposed interfaces below.
- [HighLevel Website QR help](https://help.gohighlevel.com/support/solutions/articles/155000003196), checked October 13, confirms Sites > QR Codes > Create QR Code, Website type, supplied URL, destination editing and PNG download. [HighLevel Page Builder QR help](https://help.gohighlevel.com/support/solutions/articles/155000006568) confirms external URL destinations and a location-owned QR library. These documents support a user-operated handoff. This research has not established a public QR-generation API or automatic import API.

## Agreed behavior

### Immutable release envelope and authoritative preparation

The proposed native boundary is `FinancingReleaseSnapshot` schema version 1, a new envelope around an unchanged verified financing source version. It does not mutate the stored v1/v2 manifest, its `reviewOnly=true`, original hashes, or `meta.enabled=false`. It does not make generic financing campaign approval sufficient for collateral release. Older private sources remain readable and downloadable under their original private contracts.

Every envelope contains the following required server-resolved values. References use the repository's opaque reference constraints unless identified as UUIDs; hashes are lowercase SHA-256 hex; times are offset-qualified ISO instants. Objects are strict, with no inserted parse defaults.

| Field | Type and source | Required meaning |
|---|---|---|
| `schemaVersion` | Literal 1 | This envelope version |
| `releaseRef`, `locationRef`, `actorRef` | Opaque references | Server-owned identity; location and actor derive from the current principal |
| `campaignRef`, `campaignVersionRef`, `manifestHash` | Opaque references, hash | Exact existing immutable source |
| `propertyVersionRef` | Opaque reference | Confirmed saved property/facts version; null facts remain unknown |
| `partnerVersionRef`, `lenderIdentityVersionRef` | Opaque references | Saved authorized identities, never current mutable profile lookups in output |
| `presetVersionRef`, `presetHash` | Opaque reference, hash | Workspace-authorized immutable preset |
| `quoteEvidence` | Ordered nonempty evidence snapshots, one per scenario | Source authority, exact scenario/input hash, issue and expiry instants, verification record and allowed release channels |
| `disclosureVersionRef`, `disclosureHash` | Opaque reference, hash | Exact permitted disclosure text, language/channel scope and verification record |
| `mediaAuthorizations` | Ordered explicit public-use records | Exact property/identity asset hashes, permission basis, attesting actor/time, channel and validity; no private permission expansion |
| `calculationVersion`, `calculatedHash` | Literal `1.0.0`, hash | Results independently recomputed from source inputs by the existing fixed-purchase calculator |
| `templateVersionRef`, `templateHash`, `templateEntitlementRef` | Opaque references, hash, opaque reference | Exact original/workspace/licensed template and current authorized workspace |
| `routingProfileVersionRef`, `consentVersionRef`, `privacyUrl` | Opaque references, approved HTTPS URL | Exact property inquiry definition and authorized destination/consent |
| `outputSeals` | Ordered complete output descriptors | Output kind, MIME, byte size, exact byte hash, private artifact reference and renderer version |
| `bundleHash`, `preparedAt`, `validUntil` | Hash, instants | Canonical complete envelope hash and earliest applicable evidence/quote/preset/disclosure/media expiry |

Preparation resolves all references through the owning principal, checks current authorization and entitlement, revalidates stored source/calculation hashes, verifies actual normalized image bytes, and generates every mandatory output before setting `prepared`. A failed or partial run never becomes ready. Consumers cannot supply calculated totals, trusted hashes, server identities, approved status or storage keys.

An approved preset is workspace-specific configuration with explicit scenario structures, input requirements, source and verifier, issue/expiry instants, allowed channel and disclosure version. There is no seeded generic approved preset, evergreen rate, default fee/MI, inferred expiry or guessed eligibility rule. Selection yields the supplied one-to-five fixed-purchase scenarios; it does not create a qualification decision. Missing/null amounts do not become zero. A reused comparison resets private confirmations as today and needs fresh public evidence.

An authoritative quote-evidence record binds the existing scenario ID and canonical scenario/input hash to the permitted note rate, supplied APR, MI/fee/cost assumptions, source authority and exact permitted assumptions. Private evidence content stays in authorized private storage; public output shows only approved provenance/validity text. A checked box cannot create verified lender authority. Verification may be a separately recorded documented review by the LO where that LO is actually authorized by the lender; this contract requires no second human or customer role. No new APR or financial-product calculator is introduced. New program behavior still requires the brief's current official program and participating-lender qualification.

Lender/Realtor logos and headshots use saved immutable asset versions with recorded rights and verified inert normalized bytes. A missing asset is a setup issue or an explicit saved text-only presentation choice; never a stock/person substitution. Public authorization is a separate record, scoped to the exact hash and channels (`site`, `pdf` and optionally `qr-flyer`), and cannot rewrite CTR-001 rights. Switching partners changes the version and requires new relevant permission/review. Revocation denies future use without changing historical hashes.

### Output sealing, review and publication

Mandatory output kinds are the responsive report/site and the actual PDF. Each consumes the same saved amounts, labels, facts, both identities, ordered media, estimate notices, issue/validity instants and disclosures. Four/five scenarios use the explicit extended layout. No renderer performs a separate payment calculation. Retain current bounded byte, image and PDF-concurrency protections; separately version any new public renderer.

Collateral approval records bind `releaseRef`, `bundleHash`, all output seals, verified evidence revisions and the approving principal/time. Review displays the actual complete site/PDF and assumptions. Approval and publication are different commands. The owner may perform both when the underlying lender authority permits it. Internal authorization and tenant isolation remain authoritative; no customer role administration or artificial two-user workflow is added.

State progression is `preparing -> prepared -> approved -> published`. `preparation_failed`, `rejected`, `revoked`, `expired` and `unavailable` are truthful outcomes, not aliases for published. Revocation is append-only and survives provider outage/configuration pause. Expiry is checked against the current server instant on every new approval, publication, anonymous HTML/media/PDF access and delivery claim. Unknown current evidence or unavailable verification denies that release operation. A previously downloaded PDF cannot be recalled and must show its issue/validity dates.

A material source, identity, photo, preset, quote, disclosure, template, consent/destination or output change creates a new release envelope and review. It never rewrites an approved publication. The old publication remains valid only while its own exact evidence remains current and unrevoked. Publishing a newer package does not automatically retarget old URLs/QRs.

Proposed owner commands use authenticated, same-origin CSRF-protected operations scoped to the existing campaign/version. `POST /api/campaigns/property/financing/releases` prepares from references; `GET /api/campaigns/property/financing/releases/{releaseRef}` returns an owner-bound summary; `POST` to its `/approve`, `/publish` and `/revoke` children performs the named transition. Commands require a UUID `requestId`, exact source reference and expected bundle/evidence revision; client tenant/actor fields are rejected. Native API schemas and final export names belong to the implementation owner, not this document author.

Every mutation reserves a durable operation keyed by principal location, command and request ID. Its canonical content hash includes all selected ordered references and expected revisions. Exact retries resume/return the original operation; changed content returns 409. Revalidate current eligibility before an earlier successful result is returned as currently usable. A lost response returns an unavailable/pending state with the original retry identity; no browser-generated replacement ID, duplicate artifact or second publication is inferred. Version conflicts preserve the draft and require an explicit fresh command.

Errors use the product's existing sanitized error envelope: 400 malformed/unsupported input, 401 missing session, 403 invalid CSRF or denied command authority, 404 inaccessible resource, 409 revision/idempotency conflict, 422 failed release eligibility/output limit, 429 bounded quota and 503 unavailable/uncertain dependency. No raw provider/body/storage/SQL/evidence details escape. A public malformed, foreign, revoked, expired or unknown ID presents the same 404 unavailable response, with no owner/evidence disclosure.

### Anonymous projection and host ownership

Proposed public namespace is `/p/{publicationId}`, with UUID publication identity, plus same-publication `/report.pdf` and `/media/{assetRef}` resources. It is separate from `/f` and the exact five existing funnel kinds. Anonymous data is an explicit allowlist: authorized property/financial presentation, public contact/brand choices, approved disclosure, estimate/validity text and consented inquiry CTA. It contains no private borrower information, raw internal manifest, evidence object, bucket/storage key, auth token or principal cookie.

Public media and PDF always resolve through the active publication and exact sealed hashes. A guessed private media/artifact reference is not a public capability. No durable unguarded bucket URL bypasses publication checks. Use private storage; do not accept arbitrary server-side URL fetches for property, logo, headshot or QR bytes. Shared caches must not continue serving withdrawn rate-bearing bytes; use no-store for eligibility-sensitive responses. Link previews also obey the allowlist and current validity.

The proposed expiry/revocation behavior is a neutral unavailable page with no financing values or active inquiry form. There is no automatic stale-offer or non-rate fallback. An independently reviewed non-rate product would need a separately specified release, not a hidden downgrade.

Canonical origin is server-owned approved HTTPS configuration or an explicitly selected verified host binding for this owner/location. Request `Host`, forwarded headers and client URLs cannot select another tenant/origin. A custom host requires separately persisted exact-host ownership proof, hosting/routing status, valid TLS and current readiness. Stale, disconnected, unknown or conflicting bindings cannot expose content or submit into another location. Reuse qualified PR #87 primitives; do not treat its current source as finished domain onboarding. Platform-hosted public URLs are a source/publication option, not completion of FUN-005/FUN-006.

### HighLevel QR handoff

AutomatedLO exposes the currently eligible canonical publication URL for copying, plus concise guidance to use HighLevel's Website QR. The QR builder/library stays in HighLevel. No undocumented QR API, automatic generation claim or new AutomatedLO QR-management screen is introduced.

A plain canonical URL is usable independently of a QR. The initial required site/PDF bundle carries the canonical link without requiring a QR. Once that exact site is actually published and eligible, an optional QR flyer can be prepared as a separately sealed supplemental artifact referencing its existing `publicationId`, base `releaseRef` and `bundleHash`. This avoids pretending an unpublished destination passed a live scan check. The supplement retains the same financial/identity/media source and current evidence, has its own exact artifact hash and collateral approval, and does not mutate or replace the baseline publication/approval. Revocation, expiry or inaccessibility of the base publication also denies new supplement delivery/download. Any financial/source change uses a new ordinary release, not a supplement.

The optional QR asset is a user-supplied HighLevel PNG (or subsequently qualified normalized JPEG), processed as an inert bounded image under the asset boundary. SVG, PDF, scripts, remote arbitrary fetches and guessed storage URLs are not accepted as image input. Its exact normalized bytes/hash, owner location, permission record and a recorded scan-check receipt bind to the supplemental PDF output seal. The scan receipt records check time, decoded destination and observed HTTPS destination chain ending at this exact eligible publication; it is qualification evidence, not a bearer credential or perpetual guarantee. QR acceptance must verify the actual supplied bytes through a decoder or an explicitly recorded test by the authorized owner, never merely trust a typed destination field.

HighLevel dynamic QR redirects can be edited later. AutomatedLO does not claim to prevent or continuously detect those external edits, and never publishes `qrVerifiedForever`. The approved app publication enforces its own expiry/revocation on subsequent visits. Before distributing the optional QR flyer, repeat the scan/destination check; a changed destination requires a fresh verified QR placement/output and review. Existing private-review QR output remains private.

### Consented inquiry and durable HighLevel handoff

The proposed public inquiry has `requestId` UUID, `firstName` printable nonempty bounded text, normalized valid `email`, empty honeypot, explicit `consent=true`, and intent `property-information` or `financing-review`. No loan application, borrower balance, income or financial qualification fields are collected by this boundary. Phone/SMS marketing consent is a separate future input and channel contract; the minimum inquiry does not create it. The displayed consent is not prechecked, is approved for this LO/channel, and has an exact persisted version/hash and visible privacy link.

The server resolves property, partner, campaign/version, publication, owner location and verified HighLevel location from the immutable envelope, not query parameters or visitor fields. Persist normalized encrypted inquiry, consent snapshot/time and immutable attribution plus delivery operation atomically before an accepted response. Same publication/request/content returns the same receipt, with no duplicate inquiry/outbox; changed content conflicts. Bound same-origin requests, rate/quota and body sizes using qualified native capture protections. Customer PII is not logged, committed or copied into generic fixtures.

The proposed plugin inquiry policy reuses the existing documented funnel cleanup contract: encrypted contact-request access expires 30 days after server acceptance, owner export covers the latest 1,000 unexpired requests, and the daily bounded purge removes expired ciphertext. This is a proposed engineering reuse of the policy in the reference funnel release, not evidence of owner acceptance for this new boundary. The implementation must extend actual purge coverage to financing inquiries, preserve the documented 12:15 UTC schedule and 25,000-per-invocation bound, and test expiry separately from physical deletion. An expiry timestamp alone is not deletion. Public collection stays disabled until the privacy/consent notice accurately states this transient plugin behavior. The lasting contact belongs in HighLevel under its own policy; plugin cleanup neither deletes that contact nor represents its retention period. Revocation/pause retains owner export for still-unexpired records, removal capability and necessary sanitized delivery audit. Encryption-key rotation requires a compatible retained-data plan. This does not change homeowner report retention or invent a retention interval for report/PDF/source versions.

Delivery binds to the saved installation's current HighLevel location and a server-held scoped connection. Claim only one pending operation under tenant authority; revalidate release/consent/destination before starting the external side effect. Record `pending`, `in_progress`, `delivered`, `failed`, `uncertain` or `blocked`, with sanitized owner status. Accepted native capture does not mean delivered. Offline configuration leaves encrypted inquiry exportable and delivery pending/blocked. An uncertain provider mutation requires readback/reconciliation; no blind repeated contact or attribution creation.

The qualified HighLevel adapter must preserve property/partner/campaign/publication attribution and consent evidence on the correct contact/handoff, with a durable source-of-truth operation per inquiry. Field keys/IDs and provider write/readback shapes come from a server-verified routing profile, not invented literals or caller selections. A mutable contact-level last-source field alone cannot prove multiple inquiries were attributed. Preserve existing DND and contact consent; do not add workflows, appointments, subscriptions, automatic messages or paid ads. A revocation racing an already-started provider request cannot recall that request; store its actual reconciled outcome without claiming cancellation. Refusal before claim and before dispatch must be tested separately.

## Examples and edge cases

- Valid synthetic case: `campaign_sample0001`, private v2 source and three fixed-purchase scenarios, resolve to one exact authorized partner/preset/evidence set and output hashes. Synthetic evidence expires at `2030-03-12T23:00:00Z`. At `2030-03-12T22:00:00Z`, an authorized synthetic LO reviews the complete artifacts, approves the exact bundle, then explicitly publishes to `https://property.example.org/p/00000000-0000-4000-8000-000000000001`. This URL illustrates a verified-origin fixture, not a customer site or default origin. A HighLevel-created QR can be independently scan-qualified against that publication. No actual financial rate or customer value is supplied by this example.
- Private-only permission: a saved CTR-001 photo has correct bytes but no public-use record. Private report still follows its contract; public preparation returns a 422 eligibility blocker. The private attestation is neither rewritten nor presumed public.
- Boundary race: the quote expires after approval but before anonymous PDF access or a pending delivery claim. Those operations refuse and the public reader is unavailable, including exact retries of an earlier publication. Historical source/approval remains immutable.
- External QR drift: an owner edits a HighLevel QR destination to a different page after the recorded scan. The original downloaded image may still redirect there. The app cannot promise prevention; its original URL still enforces current eligibility. An updated QR flyer needs fresh check, output seal and approval.
- Duplicate inquiry: one synthetic request is durably captured, then its browser response is lost. Same publication/request/normalized data returns the original receipt; a changed email conflicts. Provider timeout after dispatch records uncertain, preserving inquiry and operation until qualified reconciliation.
- Domain reassignment: a different workspace presents the same public host or publication ID. Unproved/stale binding cannot route or select that workspace's data. Disconnect stops custom-host access without silently assigning old links to new content.

## Compatibility and rollout

- Native interface: new release envelope v1; source financing manifests v1/v2, calculation `1.0.0` and CTR-001 revision 1 remain unchanged. New public renderers, approval/evidence and inquiry schemas are separately versioned.
- Compatibility: additive private-source/release readers. Existing `/f` roster and stored published funnel snapshots remain exact. Existing private reports retain their interpretation; no automatic migration to public status.
- Order: accept the exact agreement, assign source/database/storage ownership, implement evidence/identity/preset resolution and immutable output bundle, then review/publication and anonymous readers, then qualified QR handoff and native inquiry/delivery, then real database/browser/image/PDF evidence, fresh Security followed by Quality and current-main/PR qualification.
- Mixed deployments: do not enable new release writes before all current readers and storage/revocation checks accept their version. Unsupported release versions are unavailable. Stop new writes with a compatible binary rather than rewrite historical data to fit an old binary. Retain owner export/revocation through rollback; no activation/deployment is authorized by this record.
- Actual activation needs authorized lender quote/disclosure/preset evidence, public media/template rights, approved origin/domain, privacy/retention/consent policy, correct installed HighLevel connection, and controlled hosted release/capture/readback evidence. Missing live inputs do not imply missing source work is externally blocked.

## Verification obligations

| Party | Check to run | Evidence location | State |
|---|---|---|---|
| Preparation provider | Exact old private fixtures/hash preservation; supplied preset/quote evidence resolution; wrong workspace, stale evidence, unknown-versus-zero and forged trust fields; source calculation recomputation | Assigned financing release contract/application tests | Planned |
| Media/identity provider | Decode and normalize actual inert bytes; public permission required independently of CTR-001; actual hashes; partner switch; rights/entitlement revocation; no arbitrary fetch or source-client asset | Assigned media/identity storage and PostgreSQL tests | Planned |
| Review/publication provider | Complete bundle and exact artifact review; sole-LO authority; conditional state transitions; concurrent/idempotent retries; revoke/expiry around retries and output access | Assigned release repository pgTAP, actual PostgreSQL and exported-route tests | Planned |
| Site/PDF consumers | Every saved financial row/identity/validity/disclosure matches sealed source; bounded photos; actual PDF/image bytes; no private metadata; anonymous expired/revoked/foreign denial; no stale-cache bypass | Assigned output extraction, browser, accessibility and individual visual evidence | Planned |
| Domain consumer | Exact-host ownership, TLS and readiness; same-origin capture; claim conflicts, stale proof, disconnect, spoofing and old-link isolation | Qualified PR #87 reuse plus property-host route tests and hosted controlled proof | Planned |
| QR consumer | Real provided image scan/destination chain to approved anonymous site; mutable HighLevel redirect limitation; invalid/stale/wrong-location image denial; no undocumented API assertion | Assigned optional QR-asset tests and authorized scan receipt | Planned |
| Capture/delivery consumer | Atomic encrypted inquiry/outbox, consent/attribution, actual HighLevel wire/readback profile, duplicates/timeout reconciliation, wrong destination, DND preservation, revoke before claim/dispatch and retention/export/removal | Assigned real PostgreSQL, browser and adapter tests; authorized hosted test inquiry/readback | Planned |
| Closeout | Independent Security, then fresh Quality against the exact accepted revision and source hashes; main conflict/MERGEABLE and CI evidence before shipping | Orchestrator's assigned reports and execution ledger | Planned |

Draft structural validation checks document shape and links only. No proposed test, fixture or record establishes runtime conformance or lender/public release approval.

### Accepted dispositions and outstanding qualification

The human adopted all four revision 1 proposals: unchanged private manifests with a separate exact public envelope and sole-LO review; `/p` with unavailable-on-expiry/revocation and verified host authority; minimal consented inquiry with the existing 30-day transient plugin policy and HighLevel as the lasting-contact owner; and HighLevel-managed QR handoff with optional separately reviewed image supplement and actual scan proof. Lender/quote/disclosure authority, public media rights, exact routing, domain and hosted verification remain release qualifications, not invented evidence.

The original decision inventory is preserved below for traceability. References to accepting a proposal are historical; the dispositions above now govern.

- Accept or revise this exact proposed envelope/sole-LO approval agreement: preserve private v1/v2 manifests, record public/channel permission separately, and bind approval to complete exact outputs plus verified quote/preset/disclosure evidence. This blocks finalization of PAY-005/006/008/010/011/014 shared interfaces, not independent research or private-source tests.
- Accept or revise the proposed public `/p` namespace and unavailable-on-expiry/revocation behavior, with server-owned canonical origin and separately qualified custom-host binding. This blocks finalization of PAY-011/012 and the property domain consumer.
- Accept or revise the minimal name/email/intent consented inquiry, with the proposed reuse of the existing 30-day transient inquiry access and bounded purge/export policy. HighLevel remains owner of the lasting contact. This blocks finalization of PAY-013 collection semantics; permitted public consent wording, lender authority and exact HighLevel mapping remain release inputs. No new human interval choice is required to implement the proposed policy and synthetic cleanup tests.
- Accept or revise the concrete HighLevel QR handoff: copy canonical URL, manage QR externally, optional verified inert QR image in a separately sealed flyer, retain actual scan proof and state the dynamic-redirect limitation. The owner already directed using HighLevel; Library must amend PAY-010/012 before claiming QR completion.

## PRD dependencies

| PRD or sub-PRD | Needed revision | Impact if changed |
|---|---|---|
| [Payment/report/site brief](../../../requirements/in-work/prd-010-campaign-recovery/payment-flyers-and-co-branded-sites.md) | CTR-004 revision 1, Accepted | PAY-001/005/006/008/010/011/012/013/014/016 public boundary remains unfinished; Library must adjust QR-specific criteria to the owner direction |
| [Financing increment](../../../requirements/in-work/prd-010-campaign-recovery/financing-report-increment.md) | CTR-004 revision 1, Accepted | Preserve private delivered scope and accurately separate new release envelope |
| [Five-funnel product](../../../requirements/in-work/prd-010-campaign-recovery/turnkey-five-funnel-product.md) | CTR-004 revision 1, Accepted | Property outcome and FUN-005/006/009 shared origin/attribution qualification; five-kind roster stays exact |
| [Campaign recovery index](../../../requirements/in-work/prd-010-campaign-recovery/prd-010-campaign-recovery-index.md) | CTR-004 revision 1, Accepted | Public financing implementation and provider/hosted qualifications need bounded evidence |

## Open decisions

- None.

## Change history

| Revision | Date | Compatibility | Decision and affected parties |
|---|---|---|---|
| 1 | 2026-10-13 | Draft, additive first release agreement | Assigned CTR-004 by `/root` for public financing/provider-consumer coordination. Existing owner outcome and QR direction recorded; exact proposed revision acceptance pending. No code, migration, lender review, site publication or provider effect granted. |
| 1 | 2026-10-14 | Accepted additive first release agreement, normative body unchanged | Jonathan Ferrell adopted both exact linked revision 1 plans in human response call_a3d8e442cefc42f3bde5fa5c51d7980e. Prior reviewed Draft SHA-256 `8e5c5f4c4c3197e8d3dc53810bc6497430b330a78fbe11c3f9abf28ed23fa4ad`. No lender approval, customer publication or provider effect was granted. |
