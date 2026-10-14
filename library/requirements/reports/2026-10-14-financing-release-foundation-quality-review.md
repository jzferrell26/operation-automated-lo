# QA Report: Public financing release foundation

**Plan document:** `PROPERTY_RELEASE_LEDGER.md`, Release boundary row, governed by Accepted CTR-004 revision 1 in `library/knowledge/private/contracts/CTR-004-public-financing-release.md`.
**Audit date:** October 14, 2026, America/Chicago.
**Base/head:** `codex/property-marketing-release`, `03dcfef7ca26547cdd843eaabd338b50857a06af`, plus the six foundation files pinned below.
**Auditor:** Independent quality-guardian.

## Summary

PASS for the bounded contract/application policy foundation after fresh Security, with no Critical, Warning or Suggestion detected in the assigned packet. Independent verification passed 143 cases across four files, matched all six source pins and the accepted agreement, and confirmed seven existing private source/calculation/output files remain byte-identical to the base Git objects. This is a port-only foundation: no public site, native rendered artifact, real authorization/database adapter, encrypted inquiry store, physical purge, export, HighLevel delivery, custom domain or QR supplement is qualified by this review.

The exact accepted agreement SHA-256 is `59d0b203159f5c6c440621437bcd244f664f7a64901924b9a8b952a6a4d70dfa`. The preceding independent Security report SHA-256 is `33d4486807e4bb2d46bae8e7e45dc33ce9ef6c51edb15fde32f09cd1ed238d73`; it passed the 115 new cases and found no unresolved issue, without source remediation. Quality reads the same frozen six files after that pass. The separate native publisher fix is outside this audit and receives no Quality clearance here.

Ownership is only this new report and ignored verification evidence under `test-results/quality-financing-release/`. Root-owned contracts, ledgers, PRD amendments and other active documentation were read without editing. No source, tests, exports, configuration, migration, other report, commit, push, deployment, customer capture or provider operation was performed by Quality.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ✅ | All assigned policy foundation obligations traced. Actual producer/consumer implementations remain separately pending. |
| Correctness | ✅ | Existing source/calculation integrity, current authority, immutable seals, replay/state and consented inquiry checks match the accepted engineering agreement at injected seams. |
| Alignment | ✅ | Separate strict envelope and additive exports preserve private v1/v2 and the five-funnel roster. No customer role administration or financial default introduced. |
| Gaps | ✅ | Required authority, normalization, parity, evidence-lock, persistence and encrypted-capture ports are explicit. Their runtime implementations are not inferred from mocks. |
| Detrimental | ✅ | No reproducible regression in selected private compatibility tests; existing private source files are unchanged. No new dependency or transport behavior. |

## Critical Issues (must fix)

None detected in the assigned foundation.

## Warnings (should fix)

None detected in the assigned foundation. The unimplemented runtime consumers below are planned later work, not resolved product requirements. This pass supplies no permission to enable a public route with no-op trust ports.

## Suggestions (consider improving)

None detected in the assigned foundation.

## Plan Item Traceability

`Pass at policy seam` means the orchestration or strict schema is implemented and tested with injected synthetic ports. It does not prove the port's production behavior. `Pending consumer` means there is no implementation credit for that contract obligation in these six files. No PAY-001 through PAY-016 or complete PRD criterion is closed by this report.

| # | Accepted requirement | Status | Implementation location | Notes |
| --- | --- | --- | --- | --- |
| FND-1 | Separate strict v1 public envelope around unchanged private financing sources | Pass | `packages/contracts/src/financing-release.ts:233-310`; application `:153-166` | Existing private `reviewOnly`, disabled Meta and hashes are preserved, not migrated to public status. |
| FND-2 | Preserve fixed-purchase calculation and supplied values | Pass | `packages/application/src/financing-release.ts:157-165`, `:214-234` | Existing calculator recomputes results; missing costs/APR, future/expired quote and altered calculations refuse eligibility. No APR calculation or program rule added. |
| FND-3 | Strict principal/request references without browser trust/actor overrides | Pass at policy seam | Contracts `:37-39`, `:150-174`; application `:394-438` | Command authorization is a mandatory port before reservation. Actual session/CSRF/role and source resolver remain pending. |
| FND-4 | Current same-location evidence, validity and permitted channels | Pass at policy seam | Application `:138-151`, `:184-212` | Requires site/PDF channels, unrevoked authority, current issue/verification/expiry and exact bound content. Authoritative record creation/storage is pending. |
| FND-5 | Explicit property/partner/lender identity and content hashes | Pass | Application `:167-183`, `:197-212`; contracts `:92-142` | Identity selection is frozen and checked against source identity content. Missing image is an explicit text-only choice, never stock substitution. |
| FND-6 | Supplied preset, quote assumptions and approved disclosure bind exact inputs | Pass at policy seam | Application `:197-234`; contracts authority `:113-129` | No seeded evergreen rate, approved preset, fee or expiry. Actual lender verification and setup adapter remain pending. |
| FND-7 | Public media permission separate from CTR-001 private rights | Pass | Contracts `:71-91`; application `:236-272`; tests `:543-547` | Public scope and ordered exact asset/channel authority are required independently. Private attestations are not rewritten or expanded. |
| FND-8 | Exact normalized media bytes and identity/property selection | Pass at policy seam | Application `:236-280`; contracts `:71-100` | Length and SHA-256 are checked, then mandatory normalization port runs. Real image decoding, public media records and storage remain pending. |
| FND-9 | Complete responsive site and PDF consume one exact render plan | Pass at policy seam | Application `:427-460`; `FinancingReleaseRenderInput` `:129-136` | Plan contains source, public presentation, URL and hashes. Tests use small synthetic payloads, not native completed HTML/PDF. |
| FND-10 | Exact ordered output seals and successful readback before prepared | Pass at policy seam | Application `:449-509`; contracts `:175-190`, `:259-268` | Seal full supplied bytes; verify binding/parity, store, then re-read and verify before save. Actual parity extractor/renderer and immutable storage adapter are pending. |
| FND-11 | Public data allowlist, no private source/evidence/storage objects | Pass as data schema | Contracts `:191-231`; application `:282-320`, `:604-608` | Removes private quote source/confirmation and returns presentation only. Real HTML escaping, link previews and response cache/CSP headers remain pending. |
| FND-12 | Prepare/approve/publish distinct; exact human identity and hashes | Pass at policy seam | Application `:515-579`; contracts `:311-342` | Sole authorized LO may approve then publish; no second actor required. Underlying lender authority and actual session adapter are not supplied by a test principal. |
| FND-13 | Earliest quote/evidence expiry and material changes create new envelope | Pass | Application `:263-271`, `:341-377`, `:541-574` | Re-resolved evidence/source/result/presentation/URL must match original; existing immutable snapshot is not silently retargeted. |
| FND-14 | Current evidence required before successful retries | Pass at policy seam | Application `:407-419`, `:539-550`; unit tests `:707-717` | Completed prepare/approval/publication retries still require eligibility and evidence lock. Durable idempotency and serializable database execution are pending. |
| FND-15 | Transaction lock/compare-and-swap and rollback obligations explicit | Pass as interface contract | Application `:64-86`, `:121-125`, `:501-509`, `:577-579` | Synthetic serial rollback test adapter proves call ordering, not real PostgreSQL isolation. Actual commit-boundary authority locking needs implementation. |
| FND-16 | Reject/revoke survive source/provider unavailability | Pass at policy seam | Application `:542-545`, `:566-579`; tests `:755-783` | Revision/state and original audit evidence remain; refusal to resolve source does not prevent withdrawal. Durable revocation adapter is pending. |
| FND-17 | Anonymous UUID and server-owned exact-origin eligibility | Pass at policy seam | Application `:582-615`; contracts origin `:132-141` | Wrong, missing, revoked, expired or unavailable records collapse to NOT_FOUND/404. Real `/p` reader and trusted host binding middleware are pending. |
| FND-18 | Anonymous image/PDF capability stays publication-bound | Pending consumer | CTR-004 anonymous projection section; planned output owner | This packet returns a data projection only. It introduces no media/PDF HTTP read route, no-store behavior or bucket capability. |
| FND-19 | Minimal consented name/email inquiry, normalized strict fields | Pass as schema/policy | Contracts `:344-353`; application `:618-669` | Rejects phone/SMS consent, borrower finance data, browser attribution and retention overrides. UI unchecked consent and actual body/Origin/throttle gates are pending. |
| FND-20 | Atomic capture attribution and dedupe contract | Pass at policy seam | Application `:82-93`, `:634-672`; tests `:903-949` | Publication is reloaded inside tenant transaction and evidence lock precedes capture. Port receives immutable snapshot, consent content hash and normalized request. Real encrypted receipt/outbox is pending. |
| FND-21 | Refuse publication/evidence races before storing inquiry | Pass at synthetic seam | Unit tests `:935-949`, `:1036-1077`; application `:627-650` | Actual database concurrent revocation/isolation proof must follow the real adapter. No provider-race proof inferred. |
| FND-22 | Explicit 30-day transient inquiry policy | Pass at policy seam | Contracts `:36`, `:354-369`; application `:651-679` | Policy version and exact acceptance/expiry interval are checked. Timestamp is not encryption, access control or physical deletion. |
| FND-23 | Latest 1,000 unexpired owner export, expiry access, rotation/removal/purge | Pending consumer | CTR-004 consented inquiry section; root release ledger | No export/removal/purge implementation in these files. Preserve daily 12:15 UTC schedule and 25,000 purge bound when extending the real subsystem. |
| FND-24 | HighLevel durable current consent/release/routing before claim and dispatch | Pending consumer | Application stage enum `:45-46`; CTR-004 handoff section | Stage-name eligibility tests are not actual worker claim/dispatch or DND/readback/reconciliation implementation. |
| FND-25 | Canonical URL independent of QR; external HighLevel QR supplement later | Pending consumer, contract preserved | CTR-004 HighLevel QR section; amended PAY-010/PAY-012 | Baseline site/PDF may seal canonical URL. Actual QR bytes, decoded HTTPS chain/receipt and separate supplement approval remain unimplemented. No automatic QR API claimed. |
| FND-26 | Custom exact-host ownership/TLS and safe disconnect | Pending consumer | CTR-004 host section; PR #87 scope | Existing five funnel kinds are not broadened. No finished domain workflow or owned-host browser proof here. |
| FND-27 | Additive package exports and old private compatibility | Pass | Contracts index `:297`; application index `:266`; base Git provenance | Export-only additions. Seven existing source/calculator/output paths match 03dcfef Git objects. |
| FND-28 | Accepted producer/consumer agreement and exact dependencies | Pass, documentation scope | CTR-004; six amended PRD documents | Seven accepted CTR-003/004 links resolve across the six affected PRDs. Four public-financing documents pin CTR-004 revision 1 and its exact SHA-256. No full-product credit. |
| FND-29 | Preserve actual scan/QR requirements in PAY-010/PAY-012 | Pass, documentation scope | `payment-flyers-and-co-branded-sites.md:141-143` | Separate post-publication supplement, exact source/bytes and repeat scan proof match the accepted agreement. Native private QR output is not represented as public completion. |
| FND-30 | Independent Security then fresh scoped Quality | Pass | Pinned Security report; this report | Six executable source pins and accepted agreement remain unchanged. No separate publisher packet reviewed. |
| NG-1 | No financial authority/defaults, lender acceptance or private-right expansion | Pass | Strict authority/source checks and immutable private files | Synthetic evidence is not actual permission or rate qualification. |
| NG-2 | No new public runtime, provider activation or completed product claim | Pass | No production caller found outside these new exported policy modules | Consumer implementations and controlled release evidence still require assigned work and fresh review. |
| NG-3 | No second human/customer role management, sixth funnel or new QR manager | Pass at bounded policy seam | Authorize port comment and same-principal transition tests | Actual onboarding/session behavior is preserved in unchanged parent source; no new UI introduced. |
| NG-4 | No alteration of homeowner retention | Pass | Separate financing inquiry policy and single-LO direction | Accepted inquiry 30-day transient policy is distinct from report/PDF/source retention. |

### Independent verification and limitations

| Check | Actual result | Ignored evidence |
| --- | --- | --- |
| Source and Security/contract provenance | All six exact file hashes, Accepted CTR-004 and preceding Security report match | `test-results/quality-financing-release/source-pins.json`; raw hash checks |
| Serial unit/contracts plus selected private compatibility | Four files, 143 cases passed, 23.59 seconds, exit 0 | `focused-green.log` |
| Contracts package TypeScript | Passed, exit 0 | `contracts-typecheck.log` |
| Application package TypeScript | Passed, exit 0 | `application-typecheck.log` |
| Existing private-source provenance | Seven selected private files match base Git objects exactly | Read-only `git hash-object`/`git rev-parse` comparison |
| Accepted dependency link check | Seven references resolve in six amended PRD files | Read-only relative path/revision checks |
| Diff hygiene | `git diff --check` passes | Entry and handoff Git checks |

The 143 selected cases comprise the 115 new release unit/contracts cases and 28 selected existing private calculation/v2 cases. The implementation owner's separate reported selection is 145 cases with 30 private compatibility cases; that is attributed evidence and is not substituted for this reviewer's actual count. The owner's reported new application module coverage is 100% in all four metrics with unchanged thresholds; Quality did not rerun or independently reconstruct that coverage execution. No full combined suite, actual PostgreSQL, native public PDF/browser or live-provider test was run by Quality for this packet.

The test adapter at `tooling/tests/unit/financing-release.test.ts:291-401` serializes an in-memory map and rolls back records/operations/inquiries. The fixtures contain three-byte media doubles, small synthetic HTML/PDF payloads and no-op normalization/parity/authorization authority seams. Tests meaningfully prove digest binding, independent public-right requirements, strict command/request fields, current checks, state/retry/capture ordering and refusal when injected ports fail. They do not establish valid PNG/PDF syntax, complete rendered financial rows, cryptographic at-rest storage, actual RLS, database locks or an authorized lender record. Real consumers must implement the ports; no no-op adapter may qualify a release.

Search of production `apps`/`packages` outside the two new modules found no current caller of their public prepare/read/capture policy and trust ports. There is no enabled financing release HTTP surface in this packet. Thus HTTP 401/403/429 envelopes, same-origin CSRF, body/throttle bounds, real no-store availability pages, owner review UI, encrypted export/removal/purge and HighLevel side effects remain separately unimplemented. Required authority and output parity are interfaces, not permission booleans or runtime proof.

The full contract validator's seven prior CTR-001/002 heuristic findings remain documented by their owners. New accepted PRD links were checked read-only; no validator suppression or unrelated document rewrite was performed by Quality. The older next-wave plan initially retained pre-acceptance Draft/owner-questionnaire text. Root corrected its top current-direction section during this audit and explicitly labeled the lower observations historical; Quality read that correction, confirmed both accepted contract pins remain unchanged, and records current plan SHA-256 `69826afcde67915b0bd448a5e1392f488d8eaea2bc0e87d2be3764fe1c3954ac`. Single-LO choices and existing per-report PDF/manual removal govern; no role questionnaire or automatic homeowner interval is reopened.

### Frozen source pins and handoff

| File | SHA-256 |
| --- | --- |
| `packages/contracts/src/financing-release.ts` | `c07822758fda0b05dfeb09824cf7493ab9b1aed6bcb9084ed0d3e082cc953039` |
| `packages/contracts/src/index.ts` | `2168d9850d82a3cc7b2f97f7867d24c484e216fd8e953a6f312b7cf2e3fb2724` |
| `packages/application/src/financing-release.ts` | `a6447d9a950d799eb64e2915121ea43cb486ef6e25e3c94282571608257815f9` |
| `packages/application/src/index.ts` | `f87607f30f4437b21a40b7a509a38cdf8b2898c14296f62471ce63de94bd31a3` |
| `tooling/tests/unit/financing-release.test.ts` | `ec6d8638db8b668c33f54b9e4c0b5c1214001727a940e9195292016bb545a603` |
| `tooling/tests/contracts/financing-release.test.ts` | `ac41d68628211e6e4955a3ad4c5aee28c151928e64d2fc211ba7da892357dac4` |

The foundation is clear for root's next bounded consumer assignments and reviewable source handling. Final runtime implementations, actual database/browser/byte extraction evidence, Security then fresh Quality on those new consumers, repository-health/current-main/CI/MERGEABLE and authorized controlled release remain root gates. No whole PAY/FUN/PRD or product completion, customer publication, hosted rollback compatibility, private artifact availability, lender/quote authorization, photo rights or live HighLevel outcome is certified here.

## Files Changed

Only the assigned six-file foundation packet is inventoried here; root-owned contract/ledger/PRD documentation and Security report are inputs consumed unchanged by Quality. The sole reviewer-authored path is this new Quality report.

- `packages/application/src/financing-release.ts` (A): strict immutable release policy, current source/evidence/output checks, transition/replay and inquiry orchestration over mandatory trust ports.
- `packages/application/src/index.ts` (M): additive export of the new application policy.
- `packages/contracts/src/financing-release.ts` (A): strict authority, selection, snapshot, seal, public-presentation and inquiry policy schemas/types.
- `packages/contracts/src/index.ts` (M): additive export of the new release contracts.
- `tooling/tests/contracts/financing-release.test.ts` (A): strict command and minimal consented anonymous input refusal/normalization cases.
- `tooling/tests/unit/financing-release.test.ts` (A): synthetic policy, byte/hash/state/retry/current-evidence and capture-race regressions with private compatibility fixtures.
- `library/requirements/reports/2026-10-14-financing-release-foundation-quality-review.md` (A, reviewer): fresh ordered Quality report and exact scope/provenance only.

