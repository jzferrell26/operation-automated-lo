# HighLevel webinar publisher wire qualification

Reviewed October 14, 2026 against source head `26ace47516e5c250e931b6d042d8c8942422188e`. This is a read-only source and official-documentation assessment for CTR-003 revision 1. The parent subsequently reported the owner's acceptance of that revision. Its contract author owns acceptance metadata. This document does not change the contract, approve lender creative, authorize provider writes, or claim implementation or App Test evidence.

The current official documents are sufficient to build a native typed adapter and exercise its commands through injected offline transports today. Customer credentials are unnecessary for that work. Exact schedule enforcement, total spending guarantees and actual image ingestion still require qualification before a real launch can be described as ready.

## Version and route decision

The [official versioning policy](https://marketplace.gohighlevel.com/docs/Versioning) explicitly defines named versions as request-header values. Its supported-version table lists v3, released June 11, 2026, alongside supported date versions. Consequently, `Version: v3` on the current Ads operation pages is an HTTP header requirement, not merely the Docusaurus navigation label. The old date-version documents exist separately. Do not silently interchange their schemas.

Keep `LEADCONNECTOR_V2_API_VERSION = "2021-07-28"` for the existing location probe and legacy transport tests. Add a separately named native Ads descriptor registry with literal v3 versions, typed query/body codecs and native paths. The existing `META_DOCUMENTATION_VERSION` constant and fixture compiler do not qualify a native request. In particular, preserve the existing `/ads-v2` fixture rather than silently changing its meaning. Use `/ads` for the newly qualified v3 single-image operation. The scope inventory contains both routes but establishes no interchangeability.

All native operations below use `https://services.leadconnectorhq.com`, server-resolved location credentials, `Authorization: Bearer`, and `Version: v3`. JSON mutations use `Content-Type: application/json`; media upload is multipart. Do not accept arbitrary headers, native location IDs, paths or URLs from a browser.

## Operation inventory

Each linked page was fetched successfully from the official public site. Publish and resume initially failed through the web text opener but succeeded through an ordinary read-only HTML request. Their current v3 descriptions no longer depend on the older 2023 page.

| Operation and official source | Native request | Success decoder and interpretation |
| --- | --- | --- |
| [Integration](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-get-integration/) | GET `/ad-publishing/facebook/integration`, query `locationId` | `locationId`, `status` (`connected`, `expired`, `disconnected`), `pricingModel`, optional `fbAdAccountId`, `fbDefaultPageId`, `pages`. Critically, page entries contain access tokens. Discard tokens before normalization, hashing, logging, auditing, UI or persistence. |
| [Accounts](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-get-ad-accounts/) | GET `/ad-publishing/facebook/ad-accounts`, query `locationId`; optional `type`, `next`, `fetchAll`, `limit` are strings | Array containing `id`, `name`, `accountStatus`, `currency`, `fundingType`, `integrationConnected`, optional business. Account IDs use `act_`. `integrationConnected` distinguishes the bound account from merely accessible accounts. Array response alone provides no documented cursor envelope. |
| [Account details](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-get-ad-account/) | GET `/ad-publishing/facebook/ad-accounts/:adAccountId`, query `locationId` | `id`, `name`, `accountStatus`, `currency`, `fundingType`, `timezoneName`, optional business. `timezoneName` is IANA. Validate USD, known usable state and the integration's exact account ID. |
| [Pages](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-get-pages/) | GET `/ad-publishing/facebook/pages`, query `locationId`; `fetchExisting`, `limit`, `after` | Without limit, page array. With limit on the existing-page fetch, `{ pages, paging }`; limit maximum 50, `after` is an opaque returned cursor. Page fields include `id`, `name`, `isConnected`, optional `isDefault`, `tosAccepted`. An incomplete traversal cannot prove a missing asset. |
| [Geography](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-search-targeting/) | GET `/ad-publishing/facebook/targeting/search`, query `locationId`, `type=geolocation`, `query`; optional `searchType` | Place array with required `key`, `name`, `type`, optional `country_code`, `country_name`, `region`, numeric `region_id` and support flags. Search output is snake_case. Allow only the agreed US region/city subset; unknown/missing country evidence refuses qualification. |
| [Campaign draft](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-upsert-campaign/) | PUT `/ad-publishing/facebook/campaigns`, JSON `locationId`, `name`, `objective`, `specialAdCategories`, explicit `isCampaignBudget` and `adsetBudgetSharing`; optional existing `id` | 200 saved campaign with `id`, `name`, `locationId`, `fbAdAccountId`, `objective`, `specialAdCategories`, `publishingStatus`, `source`, timestamps; optional `fbCampaignId`, `fbError`, metadata. Check returned location/account and exact objective/category. No input `fbAdAccountId` is documented for this upsert. |
| [Adset draft](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-upsert-adset/) | PUT `/ad-publishing/facebook/adsets`, JSON `locationId`, `campaignId`, `name`, `pageId`, `audience`, `budget`; optional existing `id` | 200 saved adset with `id`, `name`, `campaignId`, `publishingStatus`, `pageId`, `budget`, `audience`, timestamps; optional `fbAdSetId`, error and changes. Exact parent/page/targeting/budget parity is required. |
| [Ad draft](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-upsert-ad/) | PUT `/ad-publishing/facebook/ads`, JSON `locationId`, `campaignId`, `adsetId`, `name`, `mediaType: SINGLE`, `media`, `primaryTexts`, `headlines`, `descriptions`, `cta: LEARN_MORE`, `destinationLink`, `multiAdvertiserAds: false`; optional existing `id` | 200 saved ad: `id`, parents, status, format, variants, media, timestamps; optional Facebook ID, destination, changes/error. Send exactly one `{ text }` per approved copy variant, no expansion. Native media `type` enum is lowercase `image` or `video`, despite the top-level example showing uppercase `IMAGE`. Prefer the actual schema. |
| [Linked read-back](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-get-campaign/) | GET `/ad-publishing/facebook/campaign/:campaignId`, query `locationId`; optional `fields`, `source` | Campaign plus `adsets`, each containing `ads`. Check native IDs and exact one-adset/one-ad cardinality, parents, account, page, copy arrays, media, destination, audience and budget. Native service IDs differ from later Facebook IDs. |
| [Publish](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-publish-campaign/) | POST `/ad-publishing/facebook/campaigns/:campaignId/publish`, JSON `{ locationId }` | 200 queued linked campaign. Publication is asynchronous; initial DRAFT and missing Facebook IDs are allowed. The auto example contradicts the prose by showing child published IDs, so never infer final state from that example. Persist acknowledgement and poll separately. |
| [Progress](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-get-campaign-publishing-progress/) | GET `/ad-publishing/facebook/campaigns/:campaignId/publishing-progress`, query `locationId` | `campaignId`, `publishingStatus`, `total`, `processed`, `isComplete`, `hasFailed`. Completion can mean leaving PUBLISHING, including failure or review. It does not mean live. Require fresh linked evidence for the normalized outcome. |
| [Pause](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-pause-campaign/) | POST `/ad-publishing/facebook/campaigns/:campaignId/pause`, JSON `{ locationId }` | 200 `{ success: boolean }` acknowledgement. Only literal true acknowledges the operation; fetch current entities to establish paused state. |
| [Resume](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-resume-campaign/) | POST `/ad-publishing/facebook/campaigns/:campaignId/resume`, JSON `{ locationId }` | 200 `{ success: boolean }` acknowledgement. Revalidate the frozen campaign and current evidence first; read-back can still show review/issues rather than live. |
| [Campaign reporting](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/fb-get-campaign-reporting/) | GET `/ad-publishing/facebook/reporting/campaign/:campaignId`, query `locationId`, required `startDate`, `endDate` (`YYYY-MM-DD`) | Flat object, native campaign key `_id`, required `fbCampaignId`, local `publishingStatus`; optional insights are decimal strings. Draft campaigns without Facebook IDs are rejected. `results.lead` measures Meta actions, `leads` CDP contacts; their distinction must remain visible. Never sum overlapping action counts or label absent metrics zero. |

## Budget, dates and targeted delivery

The hidden child schema in the official adset documentation states `amount` in account currency. For USD, map safe integer cents to dollars by dividing by 100; never send cents unchanged. Its `budgetType` enum is DAILY or LIFETIME. The campaign-level Budget schema also specifies positive account-currency amount. Campaign budget mode removes adset monetary budgets; budget sharing can shift funds between sibling adsets. Initially use one adset and explicit false for campaign budget and sharing. Do not inherit an example's monetary values.

`scheduleStartDate` and `scheduleEndDate` are strings, with calendar-date examples. Neither child schema declares a date-time format, accepted offset precision, account-timezone conversion or end-date inclusivity. There is no additional documented hard total-cap field on this draft path. LIFETIME is a documented mode, but switching an approved daily budget to lifetime changes its spending semantics. A daily estimate and ceiling calculation is application arithmetic, not a documented provider guarantee. Refuse a real launch whose approved exact UTC end or hard total requirement cannot be represented and verified. Do not round, roll forward the end, claim polling enforces an instantaneous hard cap, or ask the user to invent API semantics.

Adset audience mapping is `geoLocations: [{ key, name, type, selectionType, countryCode, countryName }]`, using discovered native keys and `include` or `exclude`; the last two are optional documented camelCase input fields. Manual feed maps to `placementType: "manual"`, `placements: { facebook: ["feed"] }`. Radius units, if used, are schema enum `km` or `mi`, despite one example saying `mile`. Avoid radius assumptions and exclude demographic, interest, lookalike and retargeting extensions. Current DTO acceptance does not prove provider Housing enforcement. Traffic does not justify sending leads/sales-only conversion events or claiming conversion optimization.

The adset DTO has no documented standalone hard spend control. Its budget response may include `actualAmount`, whose relation to requested money is not defined sufficiently to reinterpret it. Reporting exposes actual stop timestamps, but that observation does not prove that every draft accepts equivalent timestamp precision.

## Exact creative delivery

[Media Storage upload](https://marketplace.gohighlevel.com/docs/ghl/medias/upload-media-content/) supports POST `/medias/upload-file` with v3 and sub-account `medias.write`, multipart `file`, `hosted`, `fileUrl`, `name`, optional `parentId`. Binary mode requires file; hosted mode requires fileUrl. Ordinary file limit is 25 MB. Success returns `{ fileId, url }`. This is a documented local adapter target; no actual upload was attempted.

Recommended first implementation uses binary upload of the immutable reviewed PNG, avoiding an authenticated application URL in provider media. The server issues the receipt only after bounded retrieval of the returned allowed storage object and comparison of SHA-256, PNG dimensions and byte length. Restrict storage hosts and paths through server configuration; do not fetch an arbitrary returned URL without SSRF and redirect controls. Upload success alone proves no digest, permanence, expiry or Meta ingestion. An adapter receipt must identify exactly what was verified and when. It must not invent provider immutability or lifetime.

The v3 ad schema requires media `src` and `type`; `name` is available. Use one `{ src, type: "image", name }`, retain exact approved bytes and copy, and omit video/poster fields. Private workspace download URLs require authentication and are unsuitable for native provider fetching. An alternative server-issued artifact lease is possible but must have a separately tested external-fetch capability and expiry policy. No lease lifetime is prescribed here.

## Response states, reliability and permission

Keep every native publishing status distinguishable: DRAFT, SCHEDULED, PUBLISHING, PUBLISHED, PAUSED, IN_REVIEW, WITH_ISSUES, REJECTED, ARCHIVED, FAILED. Campaign status is independent of child status. Unknown effective child states may normalize to IN_REVIEW under the provider's documented behavior. Campaign `fbError` can contain an informational child-pause notice, not just a failure. Decode and sanitize status lines rather than using nonempty strings as automatic failure proof.

The [scope inventory](https://marketplace.gohighlevel.com/docs/Authorization/Scopes/index.html) uses `adPublishing.readOnly` and `adPublishing.write`, sub-account scoped. Some operation renderings show `adPublishing.readonly` instead. Preserve the inventory spelling for installation requirements and validate actual grants during App Test. The broad write scope contains deletion, integration changes and other excluded operations: scope possession must never widen the adapter allowlist. No direct Meta OAuth/Graph credentials are needed or accepted by this implementation plan.

The reviewed pages provide success DTOs but no reliable operation-specific catalog of failed request bodies or idempotency guarantees. Preserve the existing sanitized error classification as application policy: 400/422 validation, 401/403 reconnect/access, 404 inaccessible, 409 conflict, 429 bounded backoff, GET 5xx transient and mutation 5xx/timeout/malformed acknowledgement uncertain. These classifications are not claims that every native endpoint returns each status. There is no documented native idempotency-key guarantee here. Reserve/fence locally, persist confirmed service IDs, reconcile uncertain writes, and never retry an uncertain creation blindly.

## Implementation ownership recommendation

These are recommendations for the parent to assign, not claims of ownership or permission to edit:

1. HighLevel owner: new `packages/ghl/src/highlevel-webinar-native-dtos.ts` and tests for strict requests and whitelisted, sanitized response transformations; new `highlevel-webinar-native-transport.ts` and tests for literal per-operation v3, fixed origin, token scoping, query/body location binding, bounded IO, redirects and uncertainty. Reuse transport helpers without changing legacy fixture semantics.
2. Media owner: separate binary-upload transport and immutable PNG receipt verification, with denial fixtures for changed bytes, non-PNG, unapproved hosts, redirected hosts, expired/revoked source and secret-bearing responses.
3. Application/database/task owners: CTR-003 frozen projection, exact confirmation, atomic outbox, persisted IDs, fenced action lineage, current-evidence checks before every side effect and replay, linked parity, progress/read-back and safety pause. No provider-ready flag may be set from a synthetic fixture.
4. UI owner: select only connected current assets, display exact daily versus estimated total semantics and timezone/end; distinguish draft, queue, review, live, paused, issues and unavailable metrics. No customer role controls or second-person requirement.

Useful adapter regression cases include a token sentinel returned inside integration pages, cents-to-dollar conversion, media enum case mismatch, unknown fields stripped before hashing, malicious body location ID, duplicate creation after a lost response, DRAFT queue acknowledgement, complete FAILED progress, PUBLISHED parent with paused child, resume followed by IN_REVIEW, decimal reporting strings and unsupported exact stop/cap. Run independent Security then Quality before implementation handoff; the parent should also load its repository-health closeout.

## Remaining qualification

Implementable now: native descriptors and schemas, deterministic mapping, safe discovery, media upload codec, byte receipt checks through injected retrieval, local durable orchestration, full refusal/reconciliation branches, and single-LO confirmation UI. No customer account is a blocker for those source tests.

Actual no-spend App Test must later establish granted scope/version, location and connected USD account/page, exact allowed Housing geography and placement read-back, decimal money interpretation, accepted schedule precision/timezone/end and native spending semantics, binary upload retrieval and actual ingestion, draft cardinality/parity and provider reconciliation. Actual publish/pause/resume and truthful reporting need separately authorized controlled provider evidence. This document makes no real provider call, campaign creation, ad spend, privilege change, deployment or recovery claim.

## Retrieval provenance

All sources below are official public HighLevel documentation, fetched October 14, 2026. HTML was fetched as text; hashes cover the UTF-8 encoding of the response text, not original network compression or a live account response. The 18-entry batch was retrieved between `2026-10-14T04:24:44.6804371Z` and `2026-10-14T04:24:46.2525619Z`. No complete third-party page was saved in this repository.

| Source, linked above | SHA-256 |
| --- | --- |
| Versioning | `7fb0a8c5b2beedd28a49d29736fe526d35335a472cf8863c6c4274b55a65c2e6` |
| Campaign upsert | `da8cc6a93394aa4e860ce5a0ef6f98089aa22f813d132f6d6455a25d7571469b` |
| Adset upsert | `a554513214c8148926bb71f8dc0568311366ede82d23620adbbe3b56f32e6f51` |
| Ad upsert | `e1d36ce246d26dc8f142f95e70ece18f6cb0da834ac2e81f7cc1a6632e9a5baa` |
| Publish | `4f790a706dbd744adec5bfd5df0af6427def98e838d9d3f44142d2b2166104df` |
| Pause | `1b4bd58a2fbc71ba05606cc889ec6afd7cd2347569cb1f4620717246033d2ca2` |
| Resume | `f91782132bc174046927bd1b9e378e9a6279fbfec91f77d11d726b9a81cb39d1` |
| Progress | `3d10affcc31642f1ef9a536fee490941e12be9e328886b99f6ea178ff684ae0a` |
| Linked read-back | `11123e6cca69cd0ec17d1e7a9ea9c3604a0d4bcb4971e81aa7b55b9d2354cb5d` |
| Integration | `b6a91728b07cf9a8c7fefb408b1757c2a1c70c48ff65a7d870d52a884b38bb59` |
| Accounts | `e23bec8ddd70adbfe32b3c658ea6e192fad4de685c0a49a3742f475cda2fe61d` |
| Account details | `2aa2d40da5baaf8086b4198427d974809ea81045ed9aa3ae89d54740f8f92410` |
| Pages | `0d9cd885813c5956f1eb11d5e25249cad7034f85b8b05991777c02ee651681eb` |
| Geography search | `d70a0202cef63f13283e7b7b54efa17cc6dffa5b79bd4bda0af6c972e88d1190` |
| Reporting | `429609f22d9f52a4a865a272bdbc1034525418e3ad037ed71d13de2d8c20e934` |
| Media upload | `71ba8d158b728835dd259b1d3f736d4f3a05b271d12b76202944c374d27a438a` |
| Scope inventory | `d4762f5ba24f58e8661f022ffa15d8c031a4b8a671c312adaa1355d85151f789` |

Nested schema evidence was read from the public document JavaScript without executing it:

| Official document asset | SHA-256 |
| --- | --- |
| [Adset chunk](https://marketplace.gohighlevel.com/docs/assets/js/a4d3c225.c16dae2b.js), current v3 `AdSetBudgetDTO`, audience and placement schema | `48c4d474ba010095cba5dcdf58711c61635c00d53b0404422be1b0177bb1840c` |
| [Campaign chunk](https://marketplace.gohighlevel.com/docs/assets/js/72e9bd3f.67c3cfa8.js), current v3 Budget schema | `67936c5eba7d3fd1b2162a04b2842334aa1b985b44e46414be5c643049df79da` |
| [Ad chunk](https://marketplace.gohighlevel.com/docs/assets/js/b7e74782.688e7a91.js), current v3 MediaDTO enum and variant schema | `3e170bdf7f353751acf2e2e8606275948c0963e8ba79afbaaaa91f38ec7cd9a7` |

The public site's main route registry tied each asset to its exact `version-v3/...api.mdx` module, and its runtime supplied content filenames. Nested amount/type descriptions were inspected directly; ambiguous date strings were not upgraded into documented timestamp guarantees. Existing source and Draft inventory were read only. This task owns only this knowledge document, made no commit or push, and ran no implementation tests.
