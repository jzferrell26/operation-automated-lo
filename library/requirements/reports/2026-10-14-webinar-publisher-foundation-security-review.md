# Webinar publisher foundation Security review

**Date:** October 14, 2026, America/Chicago. **Reviewer:** independent security-guardian. **Worktree:** `webinar-publisher`. **Head:** `03dcfef7ca26547cdd843eaabd338b50857a06af`, with the nine uncommitted implementation files pinned below. **Agreement:** Accepted CTR-003 revision 1, SHA-256 `dfc912bfa9f00892641936794ce0488adc1fdea3df6bdf7a997cb8f00a48fe23`.

## Executive summary

HOLD for fresh Quality handoff until M-PUB-01 is repaired and re-reviewed. One Medium producer/consumer compatibility defect was independently reproduced: the new launch projection requires an integer destination source revision, but the existing CTR-002 destination uses a UUID. No Critical or High finding was detected in the reviewed foundation. The 69 existing adapter cases pass; a separate independent probe exposes the missing real-destination compatibility check.

This is a native transport/compiler foundation review, not runtime publisher completion, native App Test qualification or spending authorization. Actual command authority, immutable projection production, current-evidence storage, durable operation/outbox, fenced worker, publication reconciliation, withdrawal watcher and customer flow remain unimplemented in this packet. Accepted engineering terms do not enable these operations or authorize real writes.

## Scope, operating manual and ordering

Read the native Security configuration and managed Weapon, its principles and applicable integrated v2 procedures, Accepted CTR-003, the root-owned execution ledger and dated official wire assessment. Inspected all nine source/test files and their existing contract/canonical-hash/transport seams. The parent integrated the reviewed PDF assertion correction by a fast-forward to 03dcfef; no publisher implementation hash changed during this audit.

Fresh Quality has not run for this foundation. Earlier integration Security/Quality reports cover its parent, not these new modules. This reviewer owns only this new report and ignored scratch; no source, test, contract, ledger, PRD or other agent file was edited. No commit, push, provider write, token discovery, account change, purchase, hosted configuration or deployment occurred. M-PUB-01 is returned to the parent for an assigned test-first repair, preserving source ownership.

## Scorecard

| Category | Finding/status |
| --- | --- |
| Financial/payment controls | No new finding; synthetic qualification cannot write, unsupported hard total cap and unproven schedule evidence refuse dispatch |
| PII/secrets | None detected; page token fields discarded before normalized hashing; credentials omitted from request hashes and errors |
| Authentication/tenant authority | No demonstrated bypass; mutation authority is a required trusted callback, actual composition still pending |
| Injection/SSRF | None detected; fixed API host/routes, bounded IDs/query/body, restricted unauthenticated media retrieval, redirects refused |
| Dependency/transport | No changed dependency or audit exception; production audit clean |
| Provenance/compatibility | One Medium unresolved: UUID destination revision cannot be projected |
| Runtime completeness | Partial foundation only; durable production and current-authority consumers remain open |

Critical findings: None detected. High findings: None detected. Low findings: None detected.

## Medium finding M-PUB-01: destination revision is incompatible with its authoritative producer

**Location:** `packages/contracts/src/webinar-provider-launch.ts:52`, `sourceRevision: z.number().int().positive()`.

The accepted agreement requires the exact CTR-002 publication source revision (`CTR-003-webinar-highlevel-publisher.md:63`). Its existing authoritative producer uses `WebinarDestinationSchema.sourceRevision: z.uuid()` at `packages/contracts/src/campaign-foundation.ts:492`; the frozen approval snapshot likewise uses a UUID at `:827`. The new adapter fixture at `tooling/tests/unit/webinar-publisher/native-adapter.test.ts:736` substitutes integer `1`, so its otherwise passing tests never cross the actual producer boundary.

A legitimate destination UUID is rejected by the new strict projection. Converting it to a guessed integer would lose the required source binding. This is Medium availability/provenance compatibility: actual saved destinations cannot be projected faithfully, but the current mismatch fails closed and no executable approval bypass or financial leak was demonstrated. It blocks this foundation's source handoff; it is not waived because the runtime consumer is still pending.

**Independent reproduction:** ignored `test-results/security-publisher/independent-probe.test.ts` obtains a UUID through the actual existing `WebinarDestinationSchema.shape.sourceRevision`, inserts it into an otherwise valid launch input and expects successful parsing. It fails with `expected false to be true`. The same probe run separately passes the two stop-authority cases below. Evidence: `independent-probe.log`, one intended failure, two passes, exit 1. The original 69 cases were excluded only by this scratch run's name filter; no tracked skip or weakened assertion was introduced.

**Required repair:** preserve the exact UUID source revision, preferably reusing its existing authoritative schema. Add a test crossing the actual saved destination into projection construction and hash round-trip; reject the former integer fixture rather than coercing it. Do not amend the Accepted CTR or invent a numeric revision mapping. Re-run focused compatibility, native parity and stop checks, then obtain fresh Security and Quality. The parent assigns the source owner; no repair was made by this report-only auditor.

## Reviewed foundation controls and evidence limits

- `webinar-publisher-dtos.ts` uses strict native request schemas and explicit whitelisted responses. Integration/page objects discard unknown properties, including nested page access tokens, before `normalizedResultHash`. Provider error bodies and raw thrown exceptions never enter its error DTO. Request hashing deliberately excludes authorization headers.
- `webinar-publisher-wire.ts` freezes each method, route and literal v3 version. `webinar-publisher-transport.ts` keeps the existing legacy transport untouched, resolves the location credential server-side, derives the fixed API URL and permits only operation-specific parameter/query keys. It rejects extra read mutation fields, arbitrary URLs, redirects, incorrect location/parent/account acknowledgements and oversized/deadline failures. A post-dispatch failure is uncertainty, never blind retry.
- `webinar-publisher-compiler.ts` verifies canonical projection hashes, exact qualification/location/account/page/timezone/date/money binding, and required raster receipt evidence. It rejects undocumented hard-cap semantics, expiry and unproven stop mapping. USD cents map to account-currency major units without a silent unit change. Native body parity preserves Housing, US region/city, manual Facebook feed, one image, exact words, CTA and destination.
- `webinar-publisher-media.ts` confines media retrieval to configured documented storage origins, excluding userinfo/query/private hosts and traversal. Upload is binary multipart without app cookies; actual PNG CRC/chunk/raster/dimensions/length/hash checks bind the receipt to the reviewed bytes. URL or upload acknowledgement alone does not prove Meta ingestion, immutable hosting or lifetime. Actual receipt authority is a future trusted consumer, not an accepted browser attestation.
- Every mutation requires `authority.assertCurrent` before fetch. The callback must bind the current principal, tenant, installation, immutable stored projection, qualified provider evidence and confirmed entity lineage. Existing tests prove refusal when that callback rejects; their no-op fixture does not certify those missing production checks. GET primitives likewise need an owned application consumer before browser exposure.
- Publish returns its actual queued native state. Progress completion and `{ success: true }` pause/resume acknowledge no live or paused state without fresh linked readback. Reporting strings remain actual optional values; no absent metric becomes zero or fictitious conversion proof.

### Stop-spend semantics independently checked

Transport intentionally exempts pause from expired qualification/end checks and does not compile/fetch media for that action. The independent probe requests pause after both campaign end and qualification expiry with no media receipt: the current authority callback executes once with the exact campaign identity, and one pause request succeeds. Resume under the same expired evidence refuses without another fetch. A second probe rejects current owner authority and proves no pause fetch occurs.

These are two passing injected tests, not a remotely observed stop. The future callback must use current owner/confirmed-campaign/transport authority for pause independently of withdrawn creative/destination/media eligibility. Accepted bounded automatic withdrawal pause and uncertain-stop reconciliation still need actual command/worker implementations. The existing healthy acknowledgement test alone is not that implementation.

## Independent verification

| Check | Actual result |
| --- | --- |
| Native adapter unit file | 69 cases passed, 8.74 seconds, exit 0; `test-results/security-publisher/focused-green.log` |
| Actual CTR-002 compatibility probe | One intended RED, expected true/received false; `independent-probe.log` |
| Expired/no-media pause and current owner refusal probes | Two passed in that same mixed-result scratch run; no tracked mutation |
| Managed deterministic scanner | Exit 0, hidden rules Unicode clean; `scan.log`, `scan-output/` |
| Fresh production registry audit | Zero advisories at every severity, 153 production/optional dependencies |
| Secret/package-boundary audits | Passed; negative fixture refused both forbidden package edges |
| Exact Accepted agreement | Independently matched dfc912bf full hash above |
| Source pins/diff hygiene | Nine exact hashes recorded below; `git diff --check` passed |

The managed CVE watchlist remains dated April 24, beyond 120 days; refresh its intelligence through the Guild owner. The current registry audit supplements that stale matrix. No dependency changes occurred. The shared locked Next.js 16.3.8/React 19.3.0 parent qualification is not a new framework audit here. The native wire assessment links official HighLevel sources and preserves remaining precision/cap/ingestion qualification; no real provider request was performed by this review.

The owner's wider 108-case, full regression and pending coverage statements remain attributed evidence. This reviewer did not rerun a whole coverage/build suite. The older full run's PDF timeout is not credited as success; the fast-forward contains its reviewed test correction but does not establish a new publisher full-coverage pass.

## Frozen source pins

| File | SHA-256 |
| --- | --- |
| `packages/contracts/src/webinar-provider-launch.ts` | `d6a7e560d70a75fe278107289784063987e5c76baacb6096af2a86f5fc8e6c10` |
| `packages/contracts/src/index.ts` | `6efe540179891f1e14b6fc2f7b63d613699e639bd8014f39f82a660fd5def3ea` |
| `packages/ghl/src/webinar-publisher-compiler.ts` | `58d2d5f3bd3010e13aa7bd926cd5701d7c57282b84995c84942e21d7fb0dde29` |
| `packages/ghl/src/webinar-publisher-dtos.ts` | `b7af7d89dc361ccec70e4c05f2716a071e6784d7e1eb26bc576afe71fe2cff78` |
| `packages/ghl/src/webinar-publisher-media.ts` | `c98892c26b1940c96ada413240c920617cef12c9f04781cc6ec44d2acd8f6a1c` |
| `packages/ghl/src/webinar-publisher-transport.ts` | `a8ea55b3553a94ef72a1b3339407f58e1e62378abc5ece77dcbcce71d947deed` |
| `packages/ghl/src/webinar-publisher-wire.ts` | `708eea9127a85e71831e55f6d4a555cfcd26901893a21990ee2d7c52cf874f4f` |
| `packages/ghl/src/index.ts` | `df43889ad6ad16025a1a43a413e0a50346f95f65c17643b9f6f3f8396ebd8203` |
| `tooling/tests/unit/webinar-publisher/native-adapter.test.ts` | `6940dccab19341b445e9d1cd553d14b8ddda1de13442a4e42b39dee4f42cec0e` |

## Files changed and handoff

Only this report and ignored audit scratch were authored. No production repair, new waiver or live effect occurred. Publisher handoff stays HOLD for M-PUB-01. After its assigned repair, fresh Security must re-evaluate before Quality. Durable runtime, actual native App Test, full final-head checks, owned media/quote/lender inputs, current-main MERGEABLE and controlled hosted/spend authorization remain root-owned qualifications.

## Fresh Security re-evaluation after M-PUB-01 repair

**Result: PASS for fresh scoped Quality. M-PUB-01 is CLOSED.** This appendix supersedes the initial foundation HOLD, while preserving its original finding and evidence. Reviewed at unchanged parent head `03dcfef7ca26547cdd843eaabd338b50857a06af`, with only the two implementation hashes below superseding their initial entries. The initial report's complete SHA-256 was `cc32f5445f64fe9d3e37c56ff1a43602de5e8514a7059a66923cc5e2b723ad53`. No earlier failed probe or full-run failure is reclassified as a pass.

The assigned owner changed `packages/contracts/src/webinar-provider-launch.ts:3`, `:52` to import and reuse the actual `WebinarDestinationSchema.shape.sourceRevision`. There is no integer coercion, guessed numeric mapping, new contract revision or altered existing CTR-002 producer. The native fixture now carries a UUID, with nine meaningful compatibility cases added at `tooling/tests/unit/webinar-publisher/native-adapter.test.ts:805-879`.

Security re-evaluated the complete consequential nine-file packet against its previously inspected controls. Independently recomputed all seven unchanged source hashes and the Accepted CTR-003 digest, all identical. Reopened and inspected both changed files, their actual producer/fixture seam, compiler hashing, transport authority call and pause/resume guards. The immutable projection, native money/targeting/body/readback checks, token-discard order, fixed-host/media bounds, uncertainty behavior and stop policy remain unchanged. No new Critical, High, Medium or Low finding was detected; no unresolved Security finding is waived.

### Independent compatibility and stop verification

The actual reviewed native unit file passed all **78 cases** in **12.74 seconds**, exit 0. Evidence: `test-results/security-publisher/m-pub01-native-recheck.log`. Its new producer-crossing case parses the existing `webinarVersion()` manifest through the real webinar manifest and destination schemas, constructs the launch projection with that exact UUID and verifies stored hash round-trip. The saved source and disabled provider field stay unchanged. Integer 1/0/-1, string `"1"`, malformed text and null all refuse without coercion. A different valid UUID changes the projection hash, rejects a stale raw hash and refuses prior qualification. The actual transport receives the UUID in the required current-authority callback and retains native readback parity.

The auditor also rebuilt its ignored independent probe from the current reviewed test source and repeated the same three controls used during the initial audit. All **three passed**, **2.56 seconds** total, exit 0. Evidence: `m-pub01-independent-recheck.log`. The formerly failing actual CTR-002 UUID compatibility assertion now succeeds. Pause remains available after campaign/proof expiry without a media receipt, calls exact current authority once and dispatches once; expired resume refuses without another dispatch. Current-owner rejection still prevents pause fetch. The other 78 tests were merely unselected by the scratch probe's name filter, not changed or skipped in the actual reviewed suite. No tracked test/source was edited by Security.

Source lint, explicit-path Prettier and `git diff --check` passed independently. Evidence: `m-pub01-lint.log`, `m-pub01-format.log`. The original runtime seven-file scope, private credential handling and package/dependency bytes did not change, so no broad dependency/build/coverage rerun was performed for this repair. The owner's wider 147-case selection, RED tests and focused coverage are attributed owner evidence, not executions by this reviewer. A new whole publisher full-coverage or CI pass is not inferred from those local checks.

### Superseding pins and bounded handoff

| File | Final SHA-256 |
| --- | --- |
| `packages/contracts/src/webinar-provider-launch.ts` | `d79693b26a93f0db7c95bec66dfc9431f69e2b719997811531812d2228a5b69d` |
| `tooling/tests/unit/webinar-publisher/native-adapter.test.ts` | `f88fab7d42b590f26b54e529c49c8eda7a5ef79a1945bca55503e69d6afade65` |

The remaining seven original pins remain exact, and Accepted CTR-003 remains `dfc912bfa9f00892641936794ce0488adc1fdea3df6bdf7a997cb8f00a48fe23`. The public-financing foundation was not reopened or changed by this repair. The prior stale-intelligence caveat, synthetic/test authority limits and unimplemented production consumers remain fully applicable.

The repaired native foundation is released for fresh Quality on these exact final bytes. It does not complete command/persistence, actual authority, durable outbox/worker, explicit spend confirmation, automatic withdrawal pause, hosted/native App Test or customer outcome work. Root retains current full gates/CI, repository/MERGEABLE and actual provider/lender/hosted qualification. This auditor appended only this existing report and ignored check evidence, with no commit, push or live effect. Ownership is released.
