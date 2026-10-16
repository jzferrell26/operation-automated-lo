# CTR-003: Webinar campaign command and HighLevel publisher

> **Status:** Accepted
> **Revision:** 1
> **Accepted by:** Jonathan Ferrell, 2026-10-14 UTC (2026-10-13 America/Chicago) human response to request_user_input_async call_a3d8e442cefc42f3bde5fa5c51d7980e: "Adopt both plans (Recommended)". The question linked the exact CTR-003 and CTR-004 revision 1 files and stated the recommended policies. This is acceptance of engineering terms, not lender approval, provider qualification or real ad-spend authorization.
> **Last reviewed:** 2026-10-14
> **Supersedes:** None
> **Superseded by:** None

## Boundary and scope

Acceptance evidence: the reviewed Draft revision 1 had SHA-256 `c90941936bed98bb76ca6381f49f621f01d2dc17d7c9d22618dc7a4a71bc04d8`. Jonathan accepted both exact linked plans through the response above, as delivered by the root orchestrator to `/root/publisher_contract` on October 14 UTC. The accepted normative body below is byte-for-byte unchanged from that reviewed Draft. Historical words such as proposed describe its drafting context; acceptance now settles the engineering policies while leaving actual source and release qualifications unproven.

This proposed agreement binds one immutable, reviewed webinar campaign to a separately persisted launch operation, its exact spending confirmation, location-authorized HighLevel draft, provider read-back and durable publication lifecycle. The browser, application command, database/outbox, HighLevel adapter and task worker must agree on the same evidence. Every rule under Agreed behavior is proposed until this revision is expressly accepted.

It extends the consumer boundary of [CTR-002](CTR-002-webinar-ad-destination.md), revision 2, without changing that record or the saved manifest. Its `meta.enabled: false` remains unchanged. Provider publication is represented by a distinct operation and projection, never by editing approved JSON. This contract does not approve creative, lender use, Marketplace privileges, production credentials, a deployment or ad spend. Property collateral, QR management, bulk messages and new customer roles are outside its scope.

## Parties and owners

| Role | Owner | PRD or component |
| --- | --- | --- |
| Prepared evidence provider | Webinar preparation and review owner | CTR-002 revision 2, application current-evidence authority and immutable campaign versions |
| Connection and wire provider | HighLevel integration owner | `packages/ghl`, location token authority, documented Ads Publisher adapter |
| Command producer | Application and web implementation owners | Launch summary, exact confirmation, operation reservation and mutation handlers |
| Persistence provider | Database owner | Operation identity, fenced leases, atomic outbox and audit history |
| Consumer | Durable task owner | Draft creation, read-back, publish, reconciliation, pause and resume |
| Consumer | Campaign and reporting UI owners | Truthful operation status, provider freshness and remediation |
| Agreement owner | Contract-writing Guardian | This record; Library owns PRD links |

No implementation ownership is assigned by this table. The orchestrator assigns disjoint source files before execution.

## Sources and constraints

- [Meta launch requirements](../../../requirements/in-work/prd-001-operation-automated-lo/prd-001e-meta-ad-launch.md) require HighLevel transport, Housing, lender-only ads, approved immutable versions, explicit final confirmation, durable publishing, uncertain-write reconciliation and pause/resume. Direct Meta OAuth or Graph credential storage, deletion and automatic optimization are excluded. Its permission split is required before public release, not before local source development.
- [Campaign recovery](../../../requirements/in-work/prd-010-campaign-recovery/prd-010-campaign-recovery-index.md) and [funnel release](../../../requirements/in-work/prd-010-campaign-recovery/reference-funnel-release.md) distinguish native public webinar destinations from saved previews and optional CRM delivery. CTR-002 revision 2 is present with SHA-256 `47dba3f41499d50141c2bfc5a3a7f67468524d4a3f39a1f96a8506b8ac957f28` at source head `26ace47516e5c250e931b6d042d8c8942422188e`.
- Jonathan's October 13 session direction is a single-LO product with no roles. Proposed enforcement below uses the existing `location_admin` authority internally for that sole account owner, including self-review; it adds no customer role management or mandatory second reviewer. Tenant isolation and current principal verification remain mandatory.
- Inspected source: `packages/ghl/src/meta-adapter.ts` declares `fixture-plan` and `REQUIRES_HIGHLEVEL_APP_TEST`; its compiler emits `fixturePayload`, not native wire DTOs. `leadconnector-v2-http-transport.ts` has bounded injectable HTTP and token seams but sends `Version: 2021-07-28` globally. Its ad route is `/ads-v2`. `apps/tasks/src/core/production-poll-meta-publish.ts` polls only. `launch-on-facebook.tsx` has no publication command. These are reusable seams, not working draft/publish evidence.
- Current official [campaign upsert](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-upsert-campaign/), [adset upsert](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-upsert-adset/) and [ad upsert](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-upsert-ad/) pages retrieved October 14 show `Version: v3`. Campaign and adset routes match the source allowlist; the ad page specifies `/ads`, differing from its `/ads-v2`. Older official `2023-02-21` pages also exist. The [scope inventory](https://marketplace.gohighlevel.com/docs/Authorization/Scopes/index.html) lists both ad routes, so it alone cannot settle which body belongs to `/ads-v2`.
- Official [publish](https://marketplace.gohighlevel.com/docs/2023-02-21/ghl/ad-publishing/fb-publish-campaign/index.html) documents an asynchronous queue acknowledgement. [Progress](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-get-campaign-publishing-progress/) and [linked campaign read](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-get-campaign/) provide separate evidence. A successful publish HTTP response need not contain Facebook IDs or a live status. The unversioned publish page failed this retrieval; the older page is explicitly the source for its request description.
- [Geolocation search](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-search-targeting/) returns provider place identities; [ad account discovery](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-get-ad-accounts/) distinguishes the location-connected account; [account details](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-get-ad-account/) exposes currency and timezone. [Pause](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-pause-campaign/) is documented. Resume is already in the source allowlist and official scope inventory, but its operation page failed retrieval and its full response mapping remains unverified.
- Vendor documentation is mutable and does not prove live access. The adapter owner must preserve a dated endpoint/version/field evidence inventory and sanitized actual App Test results before production qualification. No private credentials or customer payloads belong in that evidence.

## Agreed behavior

### 1. Distinct projection and current authority

1. Introduce an additive `webinar-provider-launch` projection with `schemaVersion: 1` and pinned contract ID/revision. Do not widen the existing property paid-ad projection or allow a webinar through its property fallback. Unknown variants fail closed. The projection contains only lender identity, the exact approved placement copy, qualified creative, destination, Housing, assets, geographies and budget/schedule.
2. Server authority derives tenant, actor, location installation and current role from the authenticated principal. Browser location IDs, provider tokens, provider URLs, reviewer names, timestamps, source snapshots and asset receipts are rejected. Real commands reject `local_synthetic`; injected offline ports can still exercise every command and worker branch.
3. The sole LO with current `location_admin` authority may save, review and explicitly launch their own campaign. Successful preparation or app approval is never lender authorization or spending confirmation. The command verifies tenant/version access, current preflight, decision provenance and any required real release qualifications separately.
4. Every command, worker side-effect boundary and exact replay success rechecks current authority and CTR-002 evidence: source registry/art, bound publication, publisher/workspace standing, approved words/brand and actual final raster digests. The worker reads authority through a server port, not a browser claim or serialized historic role. Retries may return historical audit observations even after withdrawal, but must return a current refusal instead of a successful actionable replay.
5. A material change to campaign, assets, geographies, objective, creative selection, dates or budget requires a new immutable launch projection and human decision covering the complete summary. If it changes CTR-002 campaign fields, create a new campaign version and app approval too. Never silently attach newly chosen assets to an earlier reviewed launch projection. No new approval is inherited from a previous operation.

### 2. Proposed strict launch projection

All fields below are required except the explicitly nullable values. Refs use existing opaque-reference validators; application hashes use existing canonical campaign SHA-256 representation, not a second incompatible hash convention. Native IDs are bounded strings validated at the adapter boundary. Times are offset datetimes normalized to UTC. Money is nonnegative safe integer USD cents.

| Field | Meaning |
| --- | --- |
| `schemaVersion`, `contractRevision` | Literal 1 and exact accepted CTR revision; unknown revision refuses execution |
| `projectionRef`, `projectionHash` | Server-reserved opaque identity and canonical hash of the full projection excluding its own hash |
| `locationRef`, `campaignRef`, `campaignVersionRef` | Immutable accessible tenant/version identity |
| `manifestHash`, `preflightHash`, `approvalRef` | Exact prepared manifest, current successful preflight and human decision |
| `destination` | Exact CTR-002 publication ID, source revision, snapshot hash, destination hash and server HTTPS public URL |
| `templateSourceHash`, `brandHash`, `copyHash` | Exact current source and reviewed lender presentation; no partner fields |
| `creative` | Exactly one selected final image: shape, asset ref, digest, dimensions, byte length and renderer version; square proposed for initial Facebook feed |
| `assets` | Connected HighLevel location ID resolved server-side, selected Facebook ad account and page IDs, discovery evidence hash, currency `USD` and account IANA timezone |
| `objective`, `cta`, `placements` | Proposed literals `OUTCOME_TRAFFIC`, `LEARN_MORE` and Facebook feed only |
| `specialAdCategories` | Exact list containing `HOUSING`; no `NONE`, alternate category experiment or caller targeting expansion |
| `geographies` | Ordered deduplicated permitted US state/city provider keys with type and safe display label; each tied to server discovery and the approved manifest place; exclusions represented explicitly |
| `schedule` | `startPolicy: immediate`, exact frozen CTR-002 `endsAt`, account timezone and qualified native schedule mapping; no rounding beyond approved end |
| `budget` | Exact approved daily and total USD cents, declared native budget mode, qualified conversion/version and immutable bound evidence; no invented hard-cap promise |
| `providerContract` | Evidence revision, per-operation version map and canonical wire mapping hash |
| `createdBy`, `createdAt` | Server actor ref and server time |

`startsAt: null` in the saved manifest remains unchanged. Immediate launch timing is disclosed in the separate summary. A delayed queue that cannot still satisfy the approved end and spend constraints must refuse, never roll the end forward. A provider schema incapable of representing a frozen requirement returns `PROVIDER_CONTRACT_UNQUALIFIED`; no silent truncation or invented field.

### 3. Native wire qualification and allowlist

Use `https://services.leadconnectorhq.com` only, with the resolved sub-account token server-side. HTTP method, route template, version, query keys, request schema and response decoder are allowlisted per operation. No browser supplied path, arbitrary URL or token participates. Existing global location transport version must not be globally replaced merely to support Ads; unrelated location probes preserve their own qualified version.

The official documentation supports local native DTO work on these routes. This table is a source inventory, not evidence of executing them:

| Operation | Documented method and path | Source qualification |
| --- | --- | --- |
| Discovery | GET `/ad-publishing/facebook/integration`, `/pages`, `/ad-accounts`, `/ad-accounts/:adAccountId` | Current operation pages; location query from server token authority; pagination handled without treating missing pages as availability |
| Permitted geography | GET `/ad-publishing/facebook/targeting/search` | `type=geolocation` only; validate returned country/type/key; never interest, demographic or language expansion |
| Campaign draft | PUT `/ad-publishing/facebook/campaigns` | Current v3 page: location/name/objective/special categories; response `id`, location, ad account, publication status and optional Facebook ID |
| Adset draft | PUT `/ad-publishing/facebook/adsets` | Current v3 page: location, parent campaign, page, audience and budget; response saved adset identity and parent/status |
| Ad draft | PUT `/ad-publishing/facebook/ads` | Current v3 page: location, parents, `mediaType`, exact media/copy arrays, `cta`, `destinationLink`; not the unqualified `/ads-v2` fixture body |
| Draft parity | GET `/ad-publishing/facebook/campaign/:campaignId` | Linked campaign/adsets/ads, typed decoder and expected entity cardinality |
| Publish | POST `/ad-publishing/facebook/campaigns/:campaignId/publish` | Older 2023-02-21 page: required location body, 200 queued entity; current-version compatibility still to qualify |
| Progress | GET `/ad-publishing/facebook/campaigns/:campaignId/publishing-progress` | Current page: location query, campaign ID, status, total/processed and complete/failed flags |
| Pause/resume | POST `/ad-publishing/facebook/campaigns/:campaignId/pause` and `/resume` | Pause page and scope inventory; current resume decoder remains to qualify |
| Reporting | GET `/ad-publishing/facebook/reporting/campaign/:campaignId` | Existing allowlist; provider owner must qualify current request/response separately |

Native upserts are JSON and documented success is 200. Campaign upsert must use `OUTCOME_TRAFFIC` and `HOUSING` under this proposal. Single-image ads send one `primaryTexts` and one `headlines` entry with exact reviewed text, no variation, unrelated description or merge expansion. Native media uses a qualified server-issued delivery receipt; authenticated private PNG download links cannot be passed as provider-fetchable media.

Provider responses are parsed at IO. Persist location-matching provider IDs only after decoded confirmed response or successful reconciled read-back. Native HighLevel IDs and later Facebook IDs are distinct nullable sets. Scope inventory names `adPublishing.readOnly` and `adPublishing.write`, both sub-account scoped; actual granted spelling and permitted operation/version must be verified against installation evidence. Do not enable broader operations because the write scope includes them.

Draft creation cannot choose an arbitrary ad account by adding an undocumented field. Initially permit only the currently connected usable USD account and compare the returned `fbAdAccountId` to the selected account. Any provider-side integration/account switch is outside this allowlist. A page must be currently exposed and accessible to that account/location.

Qualified media receipt is a strict server value: projection ref, asset ref/digest, provider delivery ref, approved HTTPS origin/path identity, delivered digest/dimensions/length, availability expiry and evidence revision. It proves the exact reviewed bytes are retrievable by the provider for the needed ingestion interval. It must never carry an auth cookie or workspace credential. URL leases or HighLevel Media Storage are possible adapter mechanisms; actual route/scope/expiry behavior must be sourced and tested before real draft writes. URL comparison alone does not establish pixel integrity after provider ingestion.

Unsettled wire issues are typed capability refusals. Local implementations use injected documented DTO responses and separate uncertainty cases. Fixtures are labeled synthetic and cannot set production qualification or provider-live status.

### 4. Exact final confirmation and application operations

Proposed app HTTP operations use the existing origin, session and bounded JSON mutation boundary. Their names are new proposals, not existing routes:

- `POST /api/campaigns/webinar-publisher/summary`: strict campaign/version refs, expected manifest/preflight hashes and asset/geography selections. Returns an immutable projection plus server summary hash and current refusals. Reading a summary creates no external write.
- `POST /api/campaigns/webinar-publisher/commands`: strict `requestId` UUID, `projectionRef`, `expectedProjectionHash`, `expectedRowVersion` positive integer, `action` enum `draft | publish | cancel | pause | resume`, and `confirmationHash`. Unknown fields are rejected. Confirmation covers the current exact action, projection, provider entity refs where available and displayed summary, not a generic checked checkbox.
- `GET /api/campaigns/webinar-publisher/operations/{operationRef}`: tenant-authorized operation/result plus provider freshness; it never fetches another tenant by provider ID supplied from the browser.

First accepted command returns 202 with `{ operationRef, action, state, duplicate: false, correlationRef }`; exact current-authorized retry returns 200 and the original operation with `duplicate: true`, without another side effect. 400 invalid body, 401 missing session, 403 forbidden principal/origin, 404 inaccessible projection/operation, 409 stale row/evidence or reused request ID with different content, 422 readiness/refusal, 503 required infrastructure failure. Sanitized `{ error: CODE }` uses existing correlation headers. No provider payload, token or filesystem path enters error copy.

The launch summary displays advertiser, account and page, actual reviewed raster/copy, webinar destination, Housing, all geographies, USD budget mode/limits, start policy, exact effective UTC stop plus account-local display, and remaining provider/lender qualification. Separate human confirmation authorizes only that launch projection and action. Existing preparation approval does not imply it. `publish` cannot be scheduled automatically merely because `draft` was confirmed.

### 5. Persistence, ordering and uncertainty

1. Atomically reserve a unique command identity scoped to tenant, actor and request UUID plus normalized request hash; write immutable operation evidence and its durable outbox message in one database transaction. Same ID/different content is 409. One active launch lineage per projection serializes concurrent commands. Outbox message carries schema/contract revision, operation ref, tenant ref, action, projection hash and correlation ref, without tokens or duplicated private publication contents.
2. Worker claims use a persisted fenced lease and bounded deadline. Check cancellation, current authority, evidence and qualified capability after claiming and immediately before each external mutation. At-least-once task delivery is expected. A generic prior confirmed ledger does not bypass fresh authority checks or prove the current action has succeeded.
3. Proposed state vocabulary: `reserved`, `drafting`, `draft_ready`, `publish_queued`, `publishing`, `in_review`, `live`, `pause_pending`, `paused`, `resume_pending`, `cancelled`, `blocked`, `failed`, `uncertain`. Preserve separate provider state, operation action/disposition, observed-at time, lease generation and last safe failure. A draft operation can finish at `draft_ready`; do not label it live.
4. Draft workflow is campaign upsert, persisted confirmed ID, adset upsert, persisted confirmed ID, one ad upsert, persisted confirmed ID, then linked read-back parity. Each stage has a unique operation-stage ledger key and bounded request. No claim of provider idempotency is made by sending an arbitrary header. Provider creation IDs cannot be assumed client-chosen unless the documented request and App Test prove that behavior.
5. Parity covers account/page/parent linkage, exact objective/category, lender-only words, CTA/destination, image identity and ingestion evidence, geography/placements, currency/native amount conversion and exact schedule. Provider-generated IDs/timestamps are normalized away only through documented rules. Missing required proof, extra unexpected adsets/ads, drift, duplicate entities or default targeting is a refusal; differing safe field paths are recorded. Do not populate a read-back DTO from the request and call it parity.
6. Explicit publish revalidates the projection, current approval and media/destination, obtains fresh provider draft parity and then sends one publish request. A 200 acknowledgement transitions to `publish_queued`, not `live`. Polling has bounded per-run budget/backoff, respects provider retry metadata and persists checkpoints. Exhausted polls leave truthful pending/uncertain state, never fabricate failure or repeat publish to obtain progress.
7. Network timeout, disconnect, invalid success response or failure after possible mutation is `uncertain`. Record safe stage/request hash and confirmed IDs, release or fence the lease, and reconcile through typed provider reads. Retry a write only after reliable evidence it was not applied; if no confirmed ID/correlation exists for discovery, block for operator reconciliation. Do not search by display name alone, infer absence from paginated partial data or issue another creation. Successfully applied publish/pause/resume is observed, not replayed blindly.
8. Provider `isComplete` is not sufficient proof of live delivery. `DRAFT`, `IN_REVIEW`, `PAUSED`, `FAILED`, `WITH_ISSUES`, `REJECTED`, missing Facebook IDs or contradictory child statuses remain their actual state. `live` requires qualified current linked entity/status evidence and all required provider IDs. It still does not prove impressions, clicks, registrations or lead delivery.
9. `cancel` before dispatch marks the queued local operation cancelled and prevents future dispatch. A cancellation during a provider write races with it and must be shown as pending reconciliation. It cannot recall an already-started request or delete remote drafts. If publishing may already have occurred, reconciliation may require an explicit confirmed pause. Deletion remains unavailable.

### 6. Pause, resume, withdrawal and reporting

Pause is available to the current authorized sole owner for the owned confirmed provider campaign even when the creative/destination has become ineligible. Requiring a fresh creative approval to stop spend would defeat that control. It requires exact campaign identity, action confirmation, healthy qualified transport and uncertain-write reconciliation. It cannot retarget or alter budget.

Resume requires current unexpired evidence, authority, complete parity, healthy assets, remaining valid dates and explicit spending confirmation. It cannot revive an expired webinar, use a new publication silently, or reset budget/start/end. A new material version never overwrites a live prior provider campaign.

On evidence withdrawal, local commands and retry success refuse immediately. Proposed safety policy is to enqueue a bounded best-effort pause of a known owned live campaign under system authority and show `pause_pending` until observed. This policy needs explicit acceptance and a source-owned authority design; absent that acceptance the product must say that refusal does not establish remote pause. Never claim already downloaded images or provider impressions were recalled.

Reports preserve raw decoded provider standing separately from normalized product state. Missing metrics are null/unavailable, never zero. Show actual observation time, last successful sync and failed/stale status; never use local task completion time as provider freshness. Spending decimals require validated currency conversion. `live`, app approval, publication availability and verified CRM delivery remain separate observations.

Attempt audit stores server actor/role-version provenance, approval/projection refs and hashes, action/stage, idempotency identity, safe request/response classification, confirmed provider IDs, correlation and server timestamps. Logs omit tokens, image lease secrets, private gated webinar URLs, raw response bodies and customer data. Historical immutable evidence remains readable under tenant access without reopening provider actions.

## Examples and edge cases

- Synthetic valid planning example: sole owner `actor_lo_demo`, tenant `loc_demo`, reviewed `cmp_demo` version `cpv_demo`, a published on-demand webinar ending `2026-10-30T23:59:59.000Z`, Facebook feed square art with its verified SHA-256, $10 daily and $100 total approved inputs, current connected USD account `act_123456789`, page `123456789`, and one qualified US city key. Summary proposes `OUTCOME_TRAFFIC`/`LEARN_MORE`/`HOUSING`. A launch may proceed only when native budget/schedule/media mapping is qualified and the exact projection and final action are confirmed. Otherwise it returns a typed unqualified refusal, not a provider draft.
- Draft success example: injected native upserts return `hl_campaign_demo`, `hl_adset_demo`, `hl_ad_demo`; linked read proves exact parity. Local operation becomes `draft_ready`; no Facebook ID is invented and no publish command is sent.
- Uncertain publish example: provider accepts the mutation but the response is lost. Local state is `uncertain`. Duplicate task first reconciles the same confirmed HighLevel campaign. Observed `IN_REVIEW` is shown as in review, no second publish request is sent, and the product does not report live.
- Withdrawal replay example: an earlier publish operation was accepted, then its webinar publication is revoked. An identical browser retry returns the current evidence refusal after tenant/role checks. History can still show its earlier provider acknowledgement. Proposed safety pause is reported separately until confirmed.
- Stop-spend example: expired destination prevents resume but does not prevent a current owner requesting pause of the correctly bound existing provider campaign. A pause timeout reconciles before any repeat.
- Foreign/account drift example: authenticated tenant cannot read another operation ref; response is 404. Provider read-back on a different ad account is a parity refusal even when the page and campaign name match.

## Compatibility and rollout

- Native interface version: proposed per-operation current documented Ads versions, with v3 DTOs where observed and older publish evidence explicitly qualified separately; no blanket production version claim.
- This agreement: first separate webinar publishing boundary. Additive to CTR-002 revision 2, old library/open-house manifests and fixture adapters. It does not supersede them. The `/ads-v2` and global transport-version differences are unresolved compatibility issues, not permission to rewrite existing fixture semantics.
- Mixed versions: workers reject unknown contract/task/projection revision before mutation. Old workers cannot consume new outbox messages. Existing workers continue processing their own supported task kinds. A rollout must deploy supported consumers before producers can enable new commands.
- Production writes remain default-disabled until source, current wire qualification, Security then Quality, explicit Marketplace permission disposition, installation/token/asset readiness and controlled provider test evidence are complete. Missing owner credentials do not block offline implementation. Missing proven wire detail blocks only that real operation's activation, not local state-machine and typed refusal work.
- Rollback disables new command production and mutation dispatch, retains immutable audit/confirmed IDs and reconciliation visibility, and preserves stop-spend capability for already known campaigns through a qualified supported consumer. A configuration rollback is not evidence that a remotely running ad stopped.

## Verification obligations

| Party | Check to run | Evidence location | State |
| --- | --- | --- | --- |
| Source/wire provider | Dated current route/version/field inventory, decoded request/response fixtures, conflicting routes documented, auth and account binding | Future source-owned GHL adapter evidence linked by Library | Planned |
| Evidence provider | Current destination/source/art/approval refusal before decision, command, dispatch and duplicate success | Existing CTR-002 evidence plus future regression tests | Planned |
| Command and database producer | Transactional outbox, duplicate/stale/concurrent reservations, tenant denial, lease fencing, no send before confirm | Future unit and real PostgreSQL tests | Planned |
| Durable consumer | Draft stages, read-back differences, lost responses, repeated deliveries, cancellation races, bounded polls, role/evidence changes and pause/resume | Future injected transport tests and source CI | Planned |
| Media provider | Exact reviewed PNG byte/shape receipt, provider-fetch access, expiry, tamper and no auth-cookie leakage | Future synthetic media tests and actual no-spend App Test | Planned |
| UI consumer | Single-LO save/review/select/confirm/draft/publish/status/pause/resume journey, exact action summary, no false live or hard-cap claim | Future desktop/mobile browser and accessibility evidence | Planned |
| Real provider owner | Sanitized no-spend discovery/draft/read-back; explicit controlled publish, actual progress and pause/resume; auth expiry/rejection/uncertainty | PRD-001e provider qualification records | Not run |
| Security then Quality | Independent source review, broad-scope allowlist, private evidence/redaction, native compatibility and end-to-end obligations | Future scoped repository reports | Not run |

Documentation and this draft establish no running conformance. Contract structural validation establishes fields/links only.

### Accepted dispositions and outstanding qualification

The human adopted revision 1, including initial website traffic, one square Facebook-feed ad, exact spending confirmation, and bounded best-effort pause when current evidence becomes invalid. D1 exact acceptance, D2 initial objective/cardinality and D6 withdrawal policy are settled. D3 adopts honest qualified budget mapping and refusal until the requirements can be represented; no hard-cap or native budget guarantee was invented. D4, D5 and D7 remain source/provider qualification obligations under the accepted fail-closed rules, not unresolved changes to those rules.

The original decision and qualification inventory is preserved below for traceability. References to accepting a proposal are historical; the dispositions above now govern.

- D1, exact revision acceptance: Jonathan must accept the current proposed engineering agreement before its affected shared PRDs are finalized. It is separate from any lender, provider or spending authorization.
- D2, objective and creative cardinality: recommend initial website traffic, no conversion pixel requirement, one square ad in one adset on Facebook feed. Keep tall downloadable. Conversion-optimized registration, both-image multi-ad or Instagram delivery requires an explicit revised projection, qualification and summary. Blocks final compiler/UI agreement, not documented DTO research.
- D3, spend semantics: recommend refusing real launch until both approved daily/total inputs and exact stop can be represented honestly by qualified native controls. Do not claim a hard total cap from daily budget multiplication or delayed reporting. Decide native budget mode and whether a new reviewed version with a supported budget model is needed. Blocks actual budget compilation/publish qualification; injected refusal/state tests can proceed.
- D4, account, schedule and native wire: source owner must resolve v3 versus older per-operation versions, `/ads` versus existing `/ads-v2`, account binding, money units and UTC end precision with documented schema and no-spend App Test evidence. Recommend the documented current `/ads` v3 candidate without silently upgrading old fixtures. This is a technical qualification, not a request for the user to supply invented wire fields.
- D5, media ingestion: source owner must qualify an immutable exact-PNG delivery mechanism and lifetime without using private download links as public URLs. The server media receipt interface above is proposed; specific native routes/scopes remain unclaimed. Blocks real media handoff, not offline byte-integrity tests.
- D6, withdrawal safety: recommend automatic bounded best-effort pause of a known owned live campaign when current source/publication/approval becomes invalid, with truthful pending/failure status. Confirm that policy and assign its independent server authority and revocation watcher. Blocks final automatic-stop policy; manual pause and current-refusal semantics are otherwise specified.
- D7, public Marketplace release: verify separate Ads Publisher versus one application with a strictly reviewed write allowlist before public release, as PRD-001e requires. It does not block local development.

## PRD dependencies

| PRD or sub-PRD | Needed revision | Impact if changed |
| --- | --- | --- |
| [Meta ad launch](../../../requirements/in-work/prd-001-operation-automated-lo/prd-001e-meta-ad-launch.md) | Proposed CTR-003 revision 1 after acceptance | Native webinar provider projection, final spend confirmation, command lifecycle and wire qualification |
| [Reporting](../../../requirements/in-work/prd-001-operation-automated-lo/prd-001g-campaign-and-portfolio-reporting.md) | Proposed CTR-003 revision 1 after acceptance | Provider states, freshness, unknown metrics and truthful outcomes |
| [Campaign recovery](../../../requirements/in-work/prd-010-campaign-recovery/prd-010-campaign-recovery-index.md) | Proposed CTR-003 revision 1 after acceptance | Fifteen prepared choices acquire a separately qualified click-launch consumer |

Library must add exact accepted pins after acceptance. No dependency or PRD was edited by this author. These PRDs remain incomplete at this shared boundary while the record is Draft.

## Open decisions

- None.

## Change history

| Revision | Date | Compatibility | Decision and affected parties |
| --- | --- | --- | --- |
| 1 | 2026-10-14 | Draft first agreement | Parent task `/root/publisher_contract` assigned CTR-003 and two files only; no exact owner acceptance yet. Research/source inventory and proposed terms for web/application/database/GHL/tasks/reporting owners. |
| 1 | 2026-10-14 | Accepted first agreement, normative body unchanged | Jonathan Ferrell adopted both exact linked revision 1 plans in human response call_a3d8e442cefc42f3bde5fa5c51d7980e. Prior reviewed Draft SHA-256 `c90941936bed98bb76ca6381f49f621f01d2dc17d7c9d22618dc7a4a71bc04d8`. Native wire/App Test, lender release and real spending remain separate qualifications. |
