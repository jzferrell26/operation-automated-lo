# Security review: public financing runtime and native inquiry admission

Date: 2026-10-14. Independent reviewer: security-guardian. Worktree: property-marketing-release. Scope: the frozen fourteen-file runtime packet, seven-file admission packet and parent's exact scaffold integration below. Ownership: this report only.

## Executive summary

Scoped source PASS, cleared to proceed to fresh Quality for this combined packet. No Critical, High, Medium or Low finding detected. Native reads use exact server-selected publications and protected current database capability, immutable private bytes and financial/output parity. Public capture now requires durable admission at the database entry point as well as the existing signed nonce, origin, body and consent checks.

The default inquiry handler remains 503 before reading the body or acquiring its runtime. A trusted deployment-client resolver is required by explicit native composition and remains unimplemented/unqualified. Read activation also requires configured dedicated capability credentials, real source/release evidence and storage/hosting qualification. No configured whole-app public-serving, native backend concurrency or production completion is cleared here.

Automatic approval review rejected the author's configured whole-app startup with fixture database/storage hooks and an enabled dummy publication flag. Its stated reason was only "blocked by policy". This reviewer did not run, repackage or retry that action. Verification used existing controlled defensive tests, safe default-off exported handlers and static immutable artifacts. No new payload, probe, browser-server startup, PostgreSQL execution, credential access, provider action, source repair or Git mutation occurred.

Managed Security Weapon and integrated procedures were applied. The watchlist refreshed 2026-04-24 remains older than 120 days; refresh remains recommended. No online audit or latest-advisory claim is made. Broad scanner writes/external work are outside this brief; existing tests and supported static audits were used. Earlier separate output/HTTP reviews retain their historical scope; fresh Quality follows this combined source review. The unrelated publisher Quality HOLD is preserved and not cleared.

## Surface coverage checklist

### Public authority and routes

None detected. financing-release-public-runtime.ts:65-111 requires explicit read activation, a finite unique server publication list, exact HTTPS primary origin, dedicated database configuration and independent encryption/hash/nonce/client keys. Configuration refusals disclose no values or parser details. Server environment names are added to the existing public-secret guard. No synthetic principal, caller-selected tenant or permissive native admission fallback is installed.

canonicalPublicFinancingRequest at lines 123-149 checks UUID membership in that server list, exact raw Host, exact publication/resource path, no query/hash/credentials and canonical origin. Only an internal HTTP loopback URL may be canonicalized after exact raw Host validation; forwarded headers never choose the tenant or origin. Server configuration is not itself host-ownership evidence: current independently admitted native publication/source origin remains required. Custom-domain readiness is not supplied by this primary-origin packet.

All four Next route adapters export only their finite GET/HEAD or POST method, use nodejs and force-dynamic, and delegate to handlePublicFinancingRequest. The default function at lines 392-432 rejects inquiry composition before pool allocation/body capture and returns sanitized 503. Disabled/unconfigured reads return neutral 404; HEAD carries no response bytes. No temporary visitor plaintext is stored by a default refusal.

### Current source, storage and restricted ports

None detected. The concrete runtime at lines 248-365 uses PostgresPublicFinancingReleaseRepository with exact publication/origin and configured crypto. It resolves current source, verifies publication URL, owner location and source/evidence hashes before creating private storage/output ports. Sources needing unsupported identity assets refuse rather than silently substituting text-only identity. The property media locator at lines 152-183 derives only the existing source-owned private convention after checking exact admitted property reference, bytes, MIME, normalization, location and authority hash.

Public ports refuse generation, output storage writes, owner authorization, new identities and non-read/capture source stages. A selected snapshot must equal the exact loaded snapshot. Source resolution and evidence/byte checks remain current on every read through the protected repository. Its existing nested transaction support reuses the reserved capability connection and its final source checks remain. Source and immutable artifact possession do not bypass publication expiry/revocation.

Private R2 reads and actual renderer parity retain previously reviewed fixed-host/path/method/MIME/size/hash controls. No arbitrary user URL fetch, public bucket copy or durable unguarded object URL is introduced. No owned renderer layout, HTML, PDF policy, normalization, version or output seal is rewritten by the font expression change.

### Parity metadata cache

None detected. At runtime lines 117-119 and 327-355 only successful immutable verification metadata is cached: at most 32 SHA-256 keys for 60 monotonic seconds. The key includes full render input, kind, exact byte hash and pinned renderer/font identity. No bytes, source record, permissions, provenance, PII or in-flight/failed promise is retained.

Every lookup is preceded by native locked evidence checks, and a successful cold verifier is followed by another evidence check before cache insertion. Application source/math/media/byte checks and final native transaction checks still run on hits. Existing tests exercise changed bytes despite a hit, source drift before R2, current evidence withdrawal, TTL expiry and failed verification followed by actual retry. The cache saves repeated renderer work; it is not permission or eligibility caching. Controlled timing measurements are not production latency evidence.

### Native admission, quota and capture bypass defense

None detected. The additive migration 20261014120000_financing_public_http.sql:9-30 creates one tenant admission table with forced RLS, migration-owner policy, three indexed relational references and no public/app/native-public table access. No role membership, customer role or existing-row rewrite is added. The five-second migration lock timeout remains explicit.

The security-definer admission entry has an empty search path and requires financing_public_runtime. At lines 43-70 it takes a publication advisory transaction lock, resolves the exact eligible protected scope, and rechecks it before every new admission or replay. Exact request/client replay occurs before counts and consumes no new slot; changed client hash conflicts. New admissions are bounded to 20 per client/publication in ten minutes and 5,000 per publication in a rolling day. Limits return finite retry delays without insertion. Serializable repository transactions fail closed instead of automatically retrying a conflict. Native independent-backend execution is still required to qualify concurrency.

At lines 76-104 the original capture function is renamed privately, direct public/app/native-public execution is revoked, and the same-signature wrapper restores only the original app/native entry capability. For financing_public_runtime the wrapper requires exact protected release/publication/location and an existing admitted request, locks that row, and refuses changed consumed content. It calls the preserved original guarded body, then records consumption/content hash atomically. Missing admission cannot call the private body or use the wrapper successfully. Original owner app capture remains under its existing authenticated source boundary.

The untouched original capture body still checks current publication/source scope, exact retry hash, thirty-day encrypted lifetime and removed/purged-request tombstones. Renaming preserves its implementation rather than copying a weaker replacement. The existing actual database test compares prosrc to the original migration, checks revoked private permissions and unadmitted wrapper denial; this reviewer read that evidence/test source and did not execute native SQL. The earlier integration extension adds native admission before the old anonymous successful capture while preserving its prior refusal/assertion and reserved-connection behavior.

### Client identity, nonce, privacy and logging

None detected. The admission repository copies a required 32-byte server key and derives a publication-separated HMAC from trusted deployment bytes after canonicalizing UUID case. SQL receives only publication/origin/request UUID and the HMAC, never the raw client bytes, secret, contact or request body. Driver/result errors are sanitized by existing HTTP/native boundaries. Unknown result shapes and invalid input refuse; there is no in-memory limiter or fabricated principal.

createNativePublicFinancingAdmission at runtime lines 194-230 requires the independent client key and a trusted deployment-client resolver. The resolver result must be nonempty bounded bytes. Host, forwarded visitor headers, cookies and request UUID are not accepted as a substitute for that resolver. Function presence and synthetic unit values do not implement or qualify its deployment identity policy. Default POST stays unavailable until that engineering is complete.

The existing HTTP preflight still validates exact origin, signed server request cookie, 900-second nonce lifetime, 5,000 actual streamed bytes, finite nonduplicated fields, empty honeypot and explicit consent before admission/capture. Only the quota Retry-After schema expands from 900 to 86,400 seconds to carry actual daily denial. Success's native zero is mapped to the unused one-second HTTP field; limited delays retain their actual value. No quota rejection invokes capture. The nonce lifetime is unchanged and no wait/retry loop is introduced.

Admission rows retain keyed quota/replay metadata, not plaintext inquiries. This packet does not alter the existing thirty-day ciphertext purge, latest-1,000 export, removal or sanitized tombstone contract, and adds no admission metadata purge schedule. No provider delivery, message or borrower financial qualification is collected or triggered by these files.

### Headers, CSP and static font

None detected. proxy.ts:35-45 delegates response CSP only for exact lower-case UUID site/PDF/64-hex media GET/HEAD and inquiry POST handlers. Unsupported methods/paths, private/auth routes and old funnels retain the existing nonce response policy. Every path still receives a fresh request nonce after visitor nonce/CSP headers are removed. The /p family receives no-referrer/no-store. The finite public handlers supply sealed hash/script-none policy or script-free refusal/media fallback; the proxy exemption does not authorize content.

The renderer delta only expresses its two existing fixed font paths statically. Both supported cwd branches resolve the same pinned font bytes, hash f8051d65db9b84447725125371871f36c382b14be90bf417771b059ea77e5947. Tracing includes that exact font for four routes. This reviewer checked each retained route inventory: 385 entries, pinned font present, zero library/tmp/AGENTS/env paths. All 43 actual PDF/HTML/PNG/JSON originals retain their exact byte lengths/hashes; no baseline or artifact was regenerated.

### Dependencies, environment and AI-generated guard preservation

None detected in this delta. No final dependency/lockfile change. Existing public-env guard tests now cover the added server-only names and pass. Scaffold changes are exactly plan 30 to 31, tenant count 39 to 40, description and the explicit admissions has_table. Generic ownership, enabled/forced RLS and indexed-FK assertions remain unchanged. Narrow DB exports add only the repository and its two types. No guard, quota, reservation, timeout, original source policy or test assertion is weakened.

### Webhooks and third-party effects

None detected in the delta. Native inquiry stores encrypted data through the existing service only; it does not call HighLevel. No webhook, ad launch, provider write, QR builder or purchase is added. HighLevel delivery, optional external QR qualification, customer review/publication UI, identity-media locator and hosted evidence remain separate unfinished work.

## Findings detail and remediation

Critical: None detected. High: None detected. Medium: None detected. Low: None detected in this combined source packet. Only this report was authored. No source repair, old report, artifact, baseline, grant, dependency, ledger or Git mutation was made by the reviewer.

| Severity | Count | Fixed by reviewer | Documented source findings |
| --- | --- | --- | --- |
| Critical | 0 | 0 | 0 |
| High | 0 | 0 | 0 |
| Medium | 0 | 0 | 0 |
| Low | 0 | 0 | 0 |

## Independent verification and limits

| Check | Result |
| --- | --- |
| Runtime/HTTP/exported routes/proxy/native admission/application/database units | 223 passed in seven files |
| Existing public-env guard units | 47 passed |
| Compiled admission and release connectionless checks | 23 passed, overlap with source adapter tests |
| Web, DB and tooling TypeScript | Passed |
| Full lint and focused formatting | Passed |
| Boundary, secrets and product-type audits | Passed |
| Diff whitespace | Passed |
| Handoffs and all 26 listed source/support/diagnostic pins | Match raw hashes |
| Static trace inventories and pinned font | Four inventories checked, 385 entries each, no forbidden trace paths |
| Original artifact manifest | 43 exact hashes/lengths, zero mismatches |

The existing runtime unit exercises real public repository interfaces, signed private GET descriptors and actual native financial HTML/PDF extraction using controlled SQL and R2 transport. It also checks source drift, bytes/evidence withdrawal, parity cache and native admission mapping. No real database or provider was accessed. Exported default-off tests call the real route functions without activating publication or configured capture. Existing proxy cases test request nonce/header stripping and exact response-policy delegation. They do not establish deployed framework behavior.

The authors retain safe actual default-off whole-app and isolated static HTML header/font proofs. Their capture preceded only the final internal public write-port refusal; policy semantics were unchanged and current handler tests passed afterward. Those author proofs are attributed evidence, not newly executed here, and the isolated static HTML is not configured whole-app serving qualification.

The attributed PostgreSQL 17.5 WASM diagnostic applies 21 migrations and passes 27 actual-driver cases, leaves zero active fixture locations, then unchanged seeder inserts ten rows and zero on its rerun. Its frozen log/hash matches. It uses one backend and the ignored release/reacquire hook for an already committed raw scope reservation. It does not qualify independent native backend races, same-reservation proof, pgTAP, hosted migration or browser/provider behavior. This reviewer ran only connectionless/native-source checks; current-head canonical native CI remains required.

The separate publisher thirteen-file Quality HOLD and its two 104/105 failures remain unresolved. Later unchanged 105-pass runs and the inconclusive cause are not evidence of a repair. This property review does not clear that Warning or authorize more configured-server experiments.

## Frozen runtime source pins

| File | SHA-256 |
| --- | --- |
| apps/web/src/server/financing-release-public-runtime.ts | 73682e199e765c23e2c6d9e53d5b0127ca4c5389498e2edf62b9f94e19848bad |
| apps/web/src/server/financing-release-public-runtime.unit.test.ts | 986d805bca842db25293648576a0c7c52bbacf759d43c5ed901e21ceff700c79 |
| apps/web/src/server/financing-release-public-http.ts | 771b0d8a6c38da824fac8e57589454cdfe9daa00a6a041f61dd9c3d93fbcc9b7 |
| apps/web/src/server/financing-release-public-http.unit.test.ts | 2e6a297dffe542e2935102c64827c2c0f81b6f47934356e71266a6534512ca48 |
| apps/web/src/app/p/[publicationId]/route.ts | fbff12f36c0f06d5eb92b159a87bd430f90adcbc85789ec4a2778735c072e4f0 |
| apps/web/src/app/p/[publicationId]/report.pdf/route.ts | 6c6e0893ce5cad6415046240278d75f1ce73fdbc6c9e26c4d73471459d580697 |
| apps/web/src/app/p/[publicationId]/media/[assetRef]/route.ts | 55196986ae91a97117023f8ad35948eef3b3545dee2e866dd9674d2d0c6908be |
| apps/web/src/app/p/[publicationId]/inquiry/route.ts | 295eb4549f3ce34fdb1954a5fb15b4ac2764b693c96bcacc36b555f3473df0c7 |
| apps/web/src/app/p/public-routes.unit.test.ts | 4f12f5c51abd75cb2a0d6691abf815d987a3b75e34612407eb9c57aed953817d |
| apps/web/src/proxy.ts | d58a5bea6c49690ba102f26a4179077daa64ce7cfe3c1c4a0394093fdbf28142 |
| apps/web/src/proxy.unit.test.ts | 97ceb6603f15fd425ea628656f219cd87d7e245dfb38286783f3a1dfaa61af3f |
| apps/web/src/server/financing-release-render.ts | 1105629082bd10c2eaf8907987275804592b88c4f63bf0f5edf3efb5542d75c1 |
| apps/web/next.config.ts | 5466fd534b1ac899646b00cb445415cb08b270cc59b47a3086bd7ac653906ff5 |
| packages/config/src/public-env-guard.ts | 662e9e2fb877d095e0f95fd2e6239ad510a9d0deef6c5a129cec0eb8e68bf709 |

## Frozen admission and scaffold source pins

| File | SHA-256 |
| --- | --- |
| supabase/migrations/20261014120000_financing_public_http.sql | 6d4237ad9760401ed56946ea9e3aee98aa2c41a3ac9f82b3cbcd259ad76316c9 |
| packages/db/src/financing-public-inquiry-admission-repository.ts | d0073e0961b6a5e05de6e54d08662b27ad52e7bc97db892cc0a0fbeb795453c5 |
| packages/db/src/index.ts | 4d025f4c96e1728f70ac972d7a3b378e40825fa58b32c681c8a0a3fae342d4b4 |
| packages/db/test/financing-public-inquiry-admission-repository.integration.test.mjs | 184c65d6eaa61bb373a6b57db7556f91d7f14fb5c5ccf4b9d3434b2f4971bfc3 |
| packages/db/test/financing-public-inquiry-admission-repository.test.mjs | 74a9d6d21891a69ec0902b8f2f87d914b681e187d170489414c4405482bd82d0 |
| packages/db/test/financing-release-repository.integration.test.mjs | f6b4c8227457940e3ff935a028821ed30394ff3f74fd3250a72bc7ec79924ecf |
| tooling/tests/unit/financing-public-inquiry-admission.test.ts | b776fbf10a79144d4762a6aabc20122174743b847c2ec981a9028579e6bf587e |
| supabase/tests/phase0_scaffold.pgtap.sql | 7754d5ca562951bd413fe7a6b7477f811d5ebb8fc873ca4aaaa06e775df659e2 |

Runtime handoff: 86f2d425232e90c10408306cd9e48abc8d2cd0ed91e67c038614a852f578cd79. Admission handoff: 13dd477b12c538dd1651dfe5dbb3a503803ba25a2994295e2493b46e24806717. Original manifest: 58df4b90c460e8c4e55bb597e3acd325ea0b2a6617eef3a8a9336f2db9375663. Old financing SQL and fixture remain the two unchanged support pins in the admission handoff.

## Re-evaluation and next step

No Medium-or-above source finding required fixes. Final combined sources and scaffold diff were read; existing defensive units, immutable artifacts and raw pins passed. Fresh Quality may review this exact combined packet. Root retains repository-health, PR review, exact Git receipts and current-head canonical CI gates.

Trusted deployment-client resolver/policy, public identity-media locator, configured real capability/storage/Chromium/host qualification, customer preparation/review UI and HighLevel inquiry delivery remain engineering or release requirements. No configured startup bypass, purchase, actual contact/provider mutation, migration deployment, ad spend, merge or product/production completion was performed or cleared.
