# Security review: public financing HTTP factory

Date: 2026-10-14. Reviewer: independent security-guardian. Worktree: property-marketing-release. Base HEAD: 87480c429848b7108aefa011c4c89aa0304bf07a. Contract: accepted CTR-004 revision 1, SHA-256 59d0b203159f5c6c440621437bcd244f664f7a64901924b9a8b952a6a4d70dfa.

## Executive summary

Scoped PASS, cleared to proceed to fresh Quality on the two frozen sources and author handoff below. No Critical, High, Medium or Low finding detected in this packet. Coverage is a read-only defensive review of the HTTP factory, existing controlled-seam tests and relevant unchanged application/database contracts. No source edit, new payload, database/browser probe, credential access or provider request was performed.

This factory requires trusted runtime/source/storage and durable native limiter ports. It installs no Next route or configured production runtime. Those concrete bindings remain unfinished engineering. Thirty-five passing controlled-seam cases do not qualify real PDF/media bytes, public hosting, actual database locking, encryption, rate enforcement or browser cookies. The previous cleanup Security report b74925ed8105cfb4b0b96b114d32e6db6d074a1008544c41b8b5f33b55ea8dbe and its separate Quality retain their separate scope; no Quality report for this new HTTP packet was present at review entry.

Managed security-weapon, integrated procedures and relevant authorization/PII/application guidance were used. The managed CVE watchlist refreshed 2026-04-24 remains older than 120 days. No latest-advisory or fresh zero-dependency-advisory claim is made. The broad bundled scanner's writes, external audit and unrelated active files are outside this read-only brief; supported local static audits and released tests were used instead. Imported Svelte/Neon guidance was applied only where relevant to the actual Next.js/PostgreSQL project.

## Surface coverage checklist

### Application surface and sealed output

None detected. financing-release-public-http.ts:153-160 requires UUID identity, a separately resolved trusted runtime and exact approved HTTPS origin/path, with no query/hash. Request Host, forwarded headers, URL and body are expressly not tenant authority in the mandatory resolver contract at lines 42-44. That comment does not implement the resolver: its concrete persisted host/publication authorization remains required before route activation.

At lines 162-195 the factory obtains the current publication, checks its publication/origin identity, enters the resolved owner transaction, loads the current release and calls the existing assertFinancingReleaseEligible for read. That existing service recomputes current source, presentation, calculation/evidence hashes, validUntil, media and actual output parity. The factory additionally binds the loaded publication and canonical URL, checks evidence before and after response production and checks current time after awaited artifact reads. The supplied transaction implementation must retain its reviewed database locks and return-boundary recheck; unit stubs do not establish those properties.

At lines 197-281 only site, report.pdf and finite same-publication media references qualify. Site/PDF bytes must match their exact seal size/hash; media resolves the current source, matches its authority/manifest hash, finds a derived public media reference and verifies exact size/hash and normalization through the required port. No raw storage URL or arbitrary remote fetch is introduced. The response preserves sealed HTML bytes rather than injecting visitor data. Content types come from existing validated seal/media schemas.

### Authorization and tenancy

None detected in the factory. Publication-derived owner identity, current locked record, published eligibility and exact canonical URL govern reads. The request supplies no tenant, actor, source/evidence or stored artifact authority. Inquiry uses the existing captureFinancingInquiry service, which re-resolves current publication, checks current eligibility, reloads under its transaction, verifies evidence, binds consent/attribution and calls its atomic capture port.

Concrete approved-host resolution, public repository composition, source/media admission and original connection reservation behavior remain unqualified by this factory. There is no memory/default runtime implementation or automatic verifier in the packet. No independent database/concurrency execution occurred in this review.

### Secrets and environment

None detected. The server-only module requires a separate 32-byte inquiry signing key and copies its bytes at construction, lines 125-129. No key is exported, logged, placed in public configuration or serialized. Production must supply a secret from its approved server configuration; the synthetic test key is not such configuration. Static secret audit passes across six source roots and the public environment boundary.

### Anonymous inquiry and CSRF

None detected. readNonce at lines 130-152 accepts one cookie value, a bounded token and strict signed payload. Constant-time fixed-length HMAC verification precedes payload acceptance. Version, publication UUID, exact canonical origin, server request UUID and integer issue/expiry times are bound; future issue times, wrong lifetime, expired values, duplicate cookie values or invalid signatures refuse submission.

Eligible site GET alone issues the path-specific __Secure cookie with Secure, HttpOnly, SameSite=Strict and a fifteen-minute remaining lifetime at lines 253-272. Eligible reload preserves the valid signed request identity; PDF/media/HEAD create no inquiry cookie. The token contains no contact information, tenant/principal credentials, private record, evidence or storage key. Malformed/expired cookies cannot submit; the read path may issue a fresh visitor capability on a later eligible GET. Explicit new-inquiry initiation following changed retry content is still unimplemented user-flow work.

At lines 282-341 inquiry requires POST, exact canonical request origin, form content type and the signed cookie before admission/capture. formInput at lines 86-121 counts actual streamed bytes, cancels above 5,000 bytes, decodes UTF-8 and requires exactly one occurrence of each allowed field. No contact, tenant or request identity can be selected through extra form fields. Existing request schema additionally enforces bounded name/email, allowed intent, empty honeypot and explicit true consent. Missing, duplicate and unknown fields refuse; no phone/SMS or financial qualification input is added.

The durable native rate/quota port is mandatory. Unknown/malformed/unavailable admission returns sanitized 503; denial returns 429 with a bounded retry-after, before capture. This mandatory seam is not a real limiter implementation or qualification. Body time limits and admission/capture behavior must also be verified in the concrete hosting/runtime composition.

### Webhooks and third-party intake

None detected. No provider or webhook adapter is added. Capture invokes the existing native service only. The response uses the actual receipt's finite pending, in_progress, delivered, failed, uncertain or blocked state. A saved inquiry is not relabeled delivered. HighLevel delivery and optional QR handoff remain separate unfinished consumers.

### Dependencies and supply chain

None detected in this delta: no dependency or lockfile change. Existing Next.js 16.3.8 / React 19.3.0 pins remain the earlier reviewed snapshot; no current external advisory lookup or online dependency audit occurred. The source-only fixture/calculator repair is separately reviewed and does not establish provider or lender evidence.

### Headers and transport

None detected in this packet. All responses carry private no-store, no-referrer, nosniff and noindex/nofollow/noarchive controls. Site CSP at lines 79-84 requires one exact sealed style block, uses its SHA-256 and refuses scripts, objects, cross-origin connect, framing and external resources. It retains same-origin form/media and data font behavior of the existing owned renderer. PDF has a sandbox/default-deny CSP and attachment disposition. No shared cache or durable unguarded redirect is used. Deployed headers/TLS/domain binding and actual browser cookie enforcement are not qualified here.

### AI-generated code patterns and error honesty

None detected. Trust is represented by required ports rather than client booleans, a guessed owner or a configured default. Read failures return the same neutral 404 text without financing values, inquiry form or owner/evidence details. Inquiry refuses malformed input, wrong origin/cookie, content type, over-limit body and method with the finite status paths. Changed retry content returns 409 preserving the original request identity; unavailable quota/dependency returns sanitized 503. No exception body, SQL, provider diagnostics, source/hash, credential or private storage reference is returned. Evidence/normalization/eligibility refusal does not become a successful report response.

### PII and logging hygiene

None detected. There are no logs, analytics calls, client storage writes or PII query parameters in this module. Accepted inputs are the minimum name/email/intent and explicit consent. The existing atomic capture service supplies the thirty-day expiry, immutable consent/attribution and receipt validation; encrypted persistence and outbox behavior require its concrete database binding. A cookie capability carries only non-PII identifiers/time/origin. This packet does not execute encryption, retention purge or provider delivery in a production environment.

## Findings detail

Critical: None detected. High: None detected. Medium: None detected. Low: None detected in the assigned source packet. Missing concrete bindings and qualification remain engineering/coverage limits, not a claim that these missing consumers are externally blocked.

## Remediation summary

| Severity | Count | Fixed by reviewer | Documented source findings |
| --- | --- | --- | --- |
| Critical | 0 | 0 | 0 |
| High | 0 | 0 | 0 |
| Medium | 0 | 0 | 0 |
| Low | 0 | 0 | 0 |

Only this report was authored. No source, migration, dependency, prior report, artifact, baseline, ledger, Git state, provider or deployed configuration was changed by the reviewer.

## Independent verification

| Check | Result |
| --- | --- |
| Existing public HTTP unit suite | 35 controlled-seam cases passed, one file, exit 0 |
| Web TypeScript | Passed |
| Focused lint and formatting | Passed |
| Boundary audit | Passed for 16 workspace packages |
| Secret audit | Passed for six source roots and public environment boundary |
| Product-type audit | Passed |
| Diff whitespace | Passed |
| Two source pins, handoff and accepted CTR-004 | Exact hashes match |
| Prior actual output originals | All 43 sizes/hashes unchanged, zero mismatches |

Unit command: pnpm exec vitest run --project unit apps/web/src/server/financing-release-public-http.unit.test.ts. Existing tests cover sealed byte preservation, strict resource/origin access, current expiry/evidence withdrawal, byte corruption and normalization denial, locked evidence recheck, cookie lifetime/signature/duplication, exact response-loss retry, form bounds/consent/field refusal, rate admission, status honesty and changed-content conflict. No new negative payload or probe was authored or executed by this reviewer.

The tests call actual application preparation/transition/capture services with controlled runtime, storage, normalization, parity, transaction and limiter seams. The supplied PDF begins with a deliberately synthetic controlled marker and media is four arbitrary test bytes. They are not real PDF/image qualification. The separately retained 43 actual renderer artifacts were only rehashed; they do not combine with these unit seams to prove a hosted serving/capture flow. No browser or real database test was run in this pass.

## Frozen scope

| File | SHA-256 |
| --- | --- |
| apps/web/src/server/financing-release-public-http.ts | 3cb7d73ff57b68fccb857b659a06484522a9ace4ba9c5a091e0fcf1498aaaca5 |
| apps/web/src/server/financing-release-public-http.unit.test.ts | ba5520fad8114d26e2121668136a8dfd2b23b4055dcafe240da38b9766167e99 |
| library/requirements/reports/2026-10-14-financing-public-http-handoff.md | 89b6254842e332780d04292f2abe762f06cbf433caf76b2d2cf208e4f9ae9f77 |

Original artifact manifest: 58df4b90c460e8c4e55bb597e3acd325ea0b2a6617eef3a8a9336f2db9375663. Previous cleanup review remains unchanged and separate.

## Re-evaluation

No Medium-or-above findings required fixes. Final frozen files were read, their existing defensive tests passed, and their raw hashes and handoff were verified. No open source finding prevents this factory packet from advancing to fresh Quality.

## Next step

Fresh quality-guardian should review this exact two-source packet against accepted CTR-004. Root retains repository-health, PR review, exact Git receipts and canonical CI gates. Implement and independently verify concrete approved-host/runtime/storage/source-admission/limiter bindings and Next routes, inquiry initiation flow, real encrypted database/browser behavior, provider delivery and any QR supplement before product/production completion. Preserve this report's controlled-seam and deployment limits; no customer publication, live inquiry, provider write, purchase, merge or deployment was performed or cleared here.
