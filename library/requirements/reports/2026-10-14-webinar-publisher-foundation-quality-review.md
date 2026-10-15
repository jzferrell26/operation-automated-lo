# QA Report: Webinar publisher native foundation

**Plan document:** `WEBINAR_PUBLISHER_LEDGER.md`, Native boundary row, governed by Accepted CTR-003 revision 1 in `library/knowledge/private/contracts/CTR-003-webinar-highlevel-publisher.md`.
**Audit date:** October 14, 2026, America/Chicago.
**Base/head:** `codex/webinar-publisher`, `03dcfef7ca26547cdd843eaabd338b50857a06af`, plus the nine uncommitted native foundation files pinned below.
**Auditor:** Independent quality-guardian.

## Summary

PASS for the bounded repaired native contract/compiler/transport foundation after fresh Security. M-PUB-01 is CLOSED: the launch projection now reuses the actual CTR-002 UUID source-revision schema, and independent execution passed all 147 requested native/producer/legacy cases, with both package typechecks and all nine final source pins matching. No new Critical, Warning or Suggestion was detected; actual projection production, command confirmation/persistence, durable workers, withdrawal watcher, customer UI and provider App Test remain unimplemented or unqualified by this packet.

The accepted agreement SHA-256 is `dfc912bfa9f00892641936794ce0488adc1fdea3df6bdf7a997cb8f00a48fe23`. The exact preceding Security report SHA-256 is `f050c03787b68f50eb42e2070cf5498f823b78d8e465f38eb59a5e92a475561d`. Its final repair appendix supersedes its historical HOLD, closes M-PUB-01 and preserves the original failed probe without a waiver. Quality consumed the superseding two hashes and seven unchanged hashes after that fresh pass, not the earlier broken projection snapshot.

Ownership is only this new report and ignored checks under `test-results/quality-publisher/`. No source, test, export, contract, ledger, PRD, other report, migration, configuration, commit, push, provider call, paid action or hosted change was performed by Quality. The public-financing foundation and later integration correction are outside this assignment; the reviewed base remains 03dcfef.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ✅ | Assigned strict native mapping/compiler/media/transport boundaries are present; later runtime obligations remain explicit pending work. |
| Correctness | ✅ | Actual UUID producer compatibility, canonical projection integrity, linked parity, exact cents conversion, bounded IO and current mutation authority checks pass. |
| Alignment | ✅ | Additive v3 descriptors preserve legacy v2/property fixtures and unchanged CTR-002 source. No customer roles, direct Meta credential stack or excluded mutation added. |
| Gaps | ✅ | Unknown wire/cap/stop/media qualification refuses; post-dispatch uncertainty is preserved. Real authority and durable consumers are not inferred from injected doubles. |
| Detrimental | ✅ | Existing producer/legacy source bytes unchanged and selected regressions pass. M-PUB-01 repair changes only the intended schema/fixture/tests. |

## Critical Issues (must fix)

None detected in the assigned repaired foundation.

## Warnings (should fix)

None detected in the assigned repaired foundation. Missing later command/database/worker/UI consumers are scheduled source work, not solved by these adapter tests or by customer credentials.

## Suggestions (consider improving)

None detected in the assigned repaired foundation.

## Plan Item Traceability

`Pass in foundation` means the strict schema/compiler/native primitive is implemented and tested through injected local dependencies. `Pending consumer` or `Not qualified` gives no runtime/provider completion credit. PRD-001e, PRD-001g and PRD-010 remain incomplete at their broader shared boundaries.

| # | Accepted requirement | Status | Implementation location | Notes |
| --- | --- | --- | --- | --- |
| NP-1 | Additive strict projection pins exact schema/contract revision and server identity evidence | Pass in foundation | `packages/contracts/src/webinar-provider-launch.ts:39-190`; compiler `:26-39` | Existing saved webinar manifest stays unchanged and disabled. Actual server-authoritative projection producer is pending. |
| M-PUB-01 | Preserve exact actual publication UUID source revision | Pass, CLOSED | Contract `:3`, `:52`; native tests `:805-879` | Reuses `WebinarDestinationSchema.shape.sourceRevision`; real existing manifest/destination schema round-trip, six non-UUID refusals, changed UUID/hash and native callback/parity coverage. No coercion or numeric mapping. |
| NP-2 | Use existing canonical SHA-256 representation over immutable projection | Pass in bounded projection | Compiler `:22-39`; legacy canonical source and native integrity tests | Whole projection body is hashed excluding its own hash. Known strict projection keys retain canonical ordering; changed material fields reject stale hashes. |
| NP-3 | Exact lender-only square traffic/feed/Housing/US geography | Pass in foundation | Contract `:64-131`; compiler `:129-179`; strict request DTOs `:219-267` | One image/adset/ad and no Realtor/alternate placements/protected targeting. Real provider Housing enforcement is not inferred. |
| NP-4 | Exact approved USD cents and declared budget semantics | Pass in foundation | Contract `:136-151`, `:175-189`; compiler `:41-47`, `:77-106`, `:153-159` | Exact cent-to-dollar conversion checked. Estimated arithmetic is not a hard cap; hard-cap input refuses as undocumented. |
| NP-5 | Frozen effective end, account timezone and current exact schedule proof | Pass in foundation; actual semantics not qualified | Contract `:132-135`, `:202-242`; compiler `:72-109` | No rounding/roll-forward. Offset datetime and observed stop must match exact end; provider precision/inclusivity still needs actual qualification. |
| NP-6 | Qualification is exact authorized evidence, never a Boolean ready switch | Pass at trusted seam | Contract `:199-245`; compiler `:74-109`; transport `:173-198`, `:246-255` | Synthetic compilation remains fixture-only and mutation transport refuses it. An `app_test` data label cannot replace current authoritative callback; that production callback is pending. |
| NP-7 | Media receipt binds full reviewed PNG, projection, URL, dimensions, length and interval | Pass in foundation | Media `:105-142`; contract `:248-266`; compiler `:110-128` | Actual supplied bytes and receipt are validated locally. Storage permanence and Meta ingestion remain unproven. |
| NP-8 | Actual bounded inert PNG structure/raster and binary multipart | Pass locally | `webinar-publisher-media.ts:38-104`, `:144-156`; native tests `:463-503` | CRC/chunk/raster/shape/digest/length and trailing/malformed data controls run against real synthetic PNG bytes. No app-cookie handoff. |
| NP-9 | Fixed HighLevel origin and literal per-operation native v3 descriptors | Pass in foundation | `webinar-publisher-wire.ts:5-31`; transport `:259-329` | New `/ads` registry separate from old `/ads-v2`; no global replacement of legacy location transport version. Actual native installation/version/scopes remain App Test gates. |
| NP-10 | Server location token, strict operation parameter/query/body bounds | Pass in foundation | Transport `:42-68`, `:150-165`, `:206-299` | Caller arbitrary routes/headers/URLs and read mutation fields refuse. Connection/session/operation ownership composition remains pending. |
| NP-11 | Discard integration/page access tokens before normalized hash | Pass locally | DTO response allowlists `:98-151`, decoder `:186-218`; transport `:364-389`; native tests `:253-291`, `:905-928` | Unknown nested token fields are stripped before returned normalized result and result hash. Authorization headers are excluded from request hashes. |
| NP-12 | Decoded response tenant/account/parent bindings and safe native IDs | Pass locally | DTO decoder `:186-218`; transport `:358-382` | Wrong location/account/campaign/adset acknowledgement refuses. No ID inferred from display name or request-side stand-in. |
| NP-13 | Exact lender copy/CTA/media/targeting/body parity before native draft write | Pass locally | Transport `:219-238`; compiler `:185-282` | Actual input body must match compiled approved projection; linked decoded entities compared independently. Real stored parent lineage is a current-authority obligation. |
| NP-14 | Exactly one native adset/ad and independent linked readback | Pass locally | Compiler `:205-282`; native tests `:209-242`, `:972-981` | Extra/missing children, identity/copy/destination/media/targeting drift refuse. Injected readback is not a live provider discovery result. |
| NP-15 | Current mutation authority immediately before fetch | Pass at required seam | Transport `:246-255`, `:344-354`; native tests `:322-340` | Authority callback executes before native fetch. Actual principal/role-version/installation/CTR-002 evidence/storage/confirmed lineage consumer remains pending. |
| NP-16 | Bounded IO, abort/deadline, redirects, body sizes and credential-free errors | Pass locally | Transport `:105-129`, `:134-149`, `:343-393`, `:397-430` | Timeout bounds even an injected fetch/token resolver ignoring cancellation. No provider failure body or token returned in errors. |
| NP-17 | Post-dispatch malformed/timeout/server response is uncertain, no blind retry | Pass locally | Transport `:344-394`; native tests `:373-443` | Requires reconciliation flag/classification, no automatic second creation. Durable stage persistence and reconciliation workflow are pending. |
| NP-18 | Bounded unauthenticated media retrieval without arbitrary host or credentials | Pass locally | Media `:22-36`; transport `:400-430` | Only configured documented storage origins, bounded PNG response and redirects refused. Real uploaded object lifetime/access is not certified. |
| NP-19 | Preserve queued acknowledgement and raw progress separately from live | Pass in DTO/transport | DTO status/progress `:7-19`, `:156-165`; native tests `:341-357`, `:942-956` | DRAFT/queue, complete/failed flags and absent Facebook IDs remain actual fields. No live state synthesized. Runtime poll/readback normalization is pending. |
| NP-20 | Current owner may pause after creative/end/qualification expiry | Pass at native authority seam | Transport `:188-197`, `:246-255`; native tests `:358-372`; Security independent stop probes | Pause omits media compilation/end-expiry gates while exact campaign/current authority remains required. This proves a primitive, not remote stop or automatic watcher. |
| NP-21 | Resume requires current evidence and unchanged schedule/budget | Pass in foundation; command consumer pending | Transport expiry/proof/current-authority checks; native pause/resume tests | Expired resume refuses; no budget/end reset. Actual explicit spending confirmation and fresh complete parity must be implemented by the consumer. |
| NP-22 | Reporting keeps missing metrics, provider statuses and Meta/CDP distinctions | Pass in raw decoder | DTO reporting `:170-185`; native tests `:528-580` | Decimal strings retained; absent metrics not zero. No aggregation, conversion proof or provider freshness UI implemented. |
| NP-23 | Separate launch action summary and exact human spending confirmation | Pending consumer | CTR-003 section 4; ledger Command/customer rows | No summary/commands/operations HTTP routes or confirmation hash producer in this packet. App approval is not spend authorization. |
| NP-24 | Atomic tenant/actor command dedupe, immutable operation/outbox | Pending consumer | CTR-003 section 5.1; reserved migration in ledger | No real operation repository, database migration or transactional outbox implementation here. Local compiler does not provide command replay semantics. |
| NP-25 | Fenced worker/current evidence before every side effect and success replay | Pending consumer | CTR-003 sections 1.4/5.2; ledger Durable consumer row | Native callback is necessary but is not a durable worker, session resolver or historical replay gate implementation. |
| NP-26 | Persist draft IDs/stages, bounded progress and uncertain reconciliation | Pending consumer | CTR-003 sections 5.3-5.8 | No stage ledger, queue, lease, poll checkpoint, durable cancellation or readback discovery logic here. Native primitives do not complete that lifecycle. |
| NP-27 | Accepted bounded withdrawal safety pause and truthful pending status | Pending consumer | CTR-003 section 6 and accepted dispositions | Owner adopted policy; watcher and independent system authority are unimplemented. Callback test or pause acknowledgement is not observed remote pause. |
| NP-28 | Customer single-LO launch/stop/status journey and truthful freshness | Pending consumer | Ledger Customer journey row; CTR-003 sections 4/6 | No added customer UI, role controls or mandatory second reviewer. No new browser/frame claim. |
| NP-29 | Mixed-version worker rejection, rollback reconciliation and stop capability | Pending consumer | CTR-003 Compatibility and rollout | Projection pins exist; supported worker rollout/rollback and persisted history still need implementation/qualification. |
| NP-30 | Keep exact producer/legacy/property contracts unchanged | Pass | Five base Git objects and adjacent tests | CTR-002 schema, evidence module, old meta adapter/v2 transport/meta-read transport remain byte-identical to 03dcfef. |
| NP-31 | Corrected source gets fresh Security then Quality | Pass | Exact superseding Security report and this report | M-PUB-01 failed original probe retained; only final source bytes receive this clearance. |
| NP-32 | Actual native App Test and controlled provider publication/stop/reporting | Not qualified | Wire assessment Remaining qualification; CTR-003 real-provider row | No token discovery, provider call, draft, publish, spend, actual ingestion or hosted execution performed by Quality or inferred from fixtures. |
| NG-1 | No direct Meta OAuth/Graph token stack or excluded provider mutations | Pass | Fixed descriptor registry and strict native DTOs | No delete, budget optimization, integration/account switching, customer messages or borrowed template permission. |
| NG-2 | No existing manifest enabled flag or global catalog approval changed | Pass | Unchanged producer Git objects; actual destination compatibility case | Distinct projection preserves disabled saved manifest and real human/lender/spend qualifications. |
| NG-3 | No one-step production-ready flag from synthetic data | Pass | Compile fixtureOnly; required current authority; ledger open stages | Passing qualification fixture does not create a production evidence record. |
| NG-4 | No whole PRD/project, lender/Marketplace acceptance or hosted outcome claim | Pass | Report scope and pending rows | Required release permissions, media/wire proof, current CI/MERGEABLE and controlled spend stay separate. |

### Independent verification and attribution

| Check | Actual result | Ignored evidence |
| --- | --- | --- |
| Final repaired nine-file pins | All nine hashes match superseding Security table | `test-results/quality-publisher/source-pins.json` |
| Accepted agreement/Security identity | Exact CTR-003 and preceding repaired Security report match | Read-only SHA-256 checks |
| Initial native plus three legacy transport selections | Four files, 120 cases passed, 4.89 seconds, exit 0 | `focused-green.log` |
| Requested native/legacy/actual producer foundation selection | Four files, exactly 147 cases passed, 2.97 seconds, exit 0 | `producer-legacy-green.log` |
| Contracts TypeScript | Passed, exit 0 | `contracts-typecheck.log` |
| HighLevel TypeScript | Passed, exit 0 | `ghl-typecheck.log` |
| Producer/evidence/legacy provenance | Five selected existing files match base Git blobs exactly | Read-only Git hash comparison |
| Diff hygiene | `git diff --check` passed | Entry and handoff Git checks |

The requested 147-case selection is `native-adapter.test.ts` (78), the existing production-foundation `meta-adapter.test.ts` and `leadconnector-v2-http-transport.test.ts`, plus the 30-case `webinar-ads/webinar-foundation.test.ts`. The initial 120-case selection also included the three-case existing `meta-read-transport.test.ts`, instead of the producer foundation file. These selections overlap; they must not be summed into a 267-case result. The second selection supplies the exact requested producer boundary coverage. No assertion, timeout, coverage threshold, skip or global worker policy was changed.

The new compatibility case reads the existing `webinarVersion()` fixture through the actual `WebinarAdCampaignManifestSchema` and `WebinarDestinationSchema`, carries its unchanged UUID into the new projection and verifies stored JSON/hash round-trip. Six non-UUID inputs refuse without coercion. Another valid UUID changes the projection hash and refuses stale raw hash/qualification. The native callback receives that UUID and linked parity still passes. This is actual source-schema producer compatibility, not a real PostgreSQL save or provider campaign.

The native test file's HTTP fixture injects fetch, server token and current-authority callbacks. Its proof labeled `app_test` is synthetic test data, not an actual credentialed qualification record. Tests prove mutation refusal when the callback denies, synthetic proof refusal, documented body mapping, IO bounds, token discard, native response parity, uncertainty and exact real synthetic PNG verification. Real authority must resolve current session/tenant/install/role, immutable projection and qualified evidence before dispatch. No no-op callback may authorize a production action.

Security's independent repair appendix separately reports 78 native cases and three rebuilt producer/stop probes passing after the original Medium finding. Those are attributed Security executions. Its original failing UUID probe remains failed historical evidence, superseded only by the test-first source repair and fresh recheck. Quality did not edit its test copy, source or report.

The owner's full serial 3,169-case coverage pass predates the UUID repair and is retained as historical evidence for that snapshot. The owner's current 78-case focused coverage is attributed post-repair evidence; Quality did not reconstruct those coverage runs or infer a current whole-suite/CI pass. No broader duplicate build/coverage run was justified by a new finding. Current combined checks/CI and repository/mergeability remain root-owned gates.

Search of production `apps`/`packages` outside the new native compiler/transport modules found no consumer calling this publisher foundation. No app command, persistent projection producer, worker or web UI is wired to it yet. Dated official wire documentation supports this local candidate mapping; actual native App Test must still establish scopes, connected account/page, precise end/zone/budget semantics, media ingestion/cardinality and readback. The new `Version: v3` registry does not certify its production qualification simply by matching a documentation page.

### Frozen source pins and released handoff

| File | Final SHA-256 |
| --- | --- |
| `packages/contracts/src/webinar-provider-launch.ts` | `d79693b26a93f0db7c95bec66dfc9431f69e2b719997811531812d2228a5b69d` |
| `packages/contracts/src/index.ts` | `6efe540179891f1e14b6fc2f7b63d613699e639bd8014f39f82a660fd5def3ea` |
| `packages/ghl/src/webinar-publisher-compiler.ts` | `58d2d5f3bd3010e13aa7bd926cd5701d7c57282b84995c84942e21d7fb0dde29` |
| `packages/ghl/src/webinar-publisher-dtos.ts` | `b7af7d89dc361ccec70e4c05f2716a071e6784d7e1eb26bc576afe71fe2cff78` |
| `packages/ghl/src/webinar-publisher-media.ts` | `c98892c26b1940c96ada413240c920617cef12c9f04781cc6ec44d2acd8f6a1c` |
| `packages/ghl/src/webinar-publisher-transport.ts` | `a8ea55b3553a94ef72a1b3339407f58e1e62378abc5ece77dcbcce71d947deed` |
| `packages/ghl/src/webinar-publisher-wire.ts` | `708eea9127a85e71831e55f6d4a555cfcd26901893a21990ee2d7c52cf874f4f` |
| `packages/ghl/src/index.ts` | `df43889ad6ad16025a1a43a413e0a50346f95f65c17643b9f6f3f8396ebd8203` |
| `tooling/tests/unit/webinar-publisher/native-adapter.test.ts` | `f88fab7d42b590f26b54e529c49c8eda7a5ef79a1945bca55503e69d6afade65` |

The repaired native foundation is clear for the next assigned producer/consumer implementation and reviewable source handling. Actual app/database/task/UI implementations, current source/CI qualification, fresh reviews of those new consumers, owner/lender/Marketplace/native App Test and controlled hosted/spending evidence remain required before release. This report releases only its own file/evidence ownership; no automatic stop or live-ad success is certified.

## Files Changed

This is the complete assigned nine-file executable inventory, not the surrounding root-owned uncommitted contract/ledger/PRD packet. Only the last path was authored by Quality.

- `packages/contracts/src/index.ts` (M): additive export of the strict publisher projection/qualification/media contracts.
- `packages/contracts/src/webinar-provider-launch.ts` (A): pinned additive launch projection, actual UUID source revision, bounded qualification and media receipt schemas/types.
- `packages/ghl/src/index.ts` (M): additive exports of the separately named native publisher modules.
- `packages/ghl/src/webinar-publisher-compiler.ts` (A): canonical projection, qualified native budget/schedule/media compilation and independent linked parity.
- `packages/ghl/src/webinar-publisher-dtos.ts` (A): strict native mutation codecs and whitelisted credential-free decoded discovery/status/reporting results.
- `packages/ghl/src/webinar-publisher-media.ts` (A): confined media origins, real PNG structure/raster/digest checks, receipt and binary multipart construction.
- `packages/ghl/src/webinar-publisher-transport.ts` (A): fixed scoped/versioned bounded native IO, mandatory mutation authority, refusal and post-dispatch uncertainty.
- `packages/ghl/src/webinar-publisher-wire.ts` (A): frozen method/path/version registry and candidate wire-mapping fingerprint.
- `tooling/tests/unit/webinar-publisher/native-adapter.test.ts` (A): 78 native/producer compatibility/parity/media/deadline/redaction/refusal cases, including M-PUB-01 repair proof.
- `library/requirements/reports/2026-10-14-webinar-publisher-foundation-quality-review.md` (A, reviewer): fresh post-Security Quality report and exact scope/provenance only.

