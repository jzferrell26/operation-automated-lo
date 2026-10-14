# QA Report: Financing outputs and daily temporary inquiry retention

**Plan document:** Accepted CTR-004 revision 1, `library/knowledge/private/contracts/CTR-004-public-financing-release.md`, constrained to the output, namespace repair and daily consumer assignments in `PROPERTY_RELEASE_LEDGER.md` and the two author handoffs below.
**Audit date:** 2026-10-14
**Base branch:** `origin/main`; assigned delta based on `39a971aed6f10e690af3305f3d7a0c61d6babfba`
**Head:** `codex/property-marketing-release`, `39a971aed6f10e690af3305f3d7a0c61d6babfba` plus the sixteen frozen source/test/dependency files recorded below
**Auditor:** Independent quality-guardian
**Report ownership:** Only this new report, explicitly assigned by the parent. No implementation, ledger, existing report, original artifact or Git mutation.

## Summary

Scoped PASS: the assigned concrete HTML/PDF/private-storage output increment, narrow scheduler namespace repair and actual daily cleanup consumer match the accepted engineering agreement, with no Critical or Warning finding in this packet. Independent verification passed 117 focused tests, web typechecking and the 16-package production build; all sixteen source pins and all forty-three preserved original artifact hashes and lengths match. This is an incremental source clearance: public product release remains HOLD pending the remaining source consumers, canonical PostgreSQL/CI and controlled hosted qualification.

Security ran first for this exact cycle. Its final scoped report is `2026-10-14-financing-output-final-security-review.md`, SHA-256 `057b1a1a077d1f15df7eb4df81803ce660028fc4cf2d640330a58cefe5e1975a`. It records closure of H-FIN-OUTPUT-01 and H-FIN-OUTPUT-02 for the finite owned Chromium subset. I read that review, independently checked its source pins and reran the existing durable regressions; I did not construct or execute additional security probes or change assertions.

CTR-004 SHA-256 is `59d0b203159f5c6c440621437bcd244f664f7a64901924b9a8b952a6a4d70dfa`. Human acceptance authorizes the engineering design, with actual lender evidence, public rights, customer publication, purchases and provider effects still requiring their applicable qualifications. The private v1/v2 source and fixed-purchase calculation remain the governing financial spine.

## Scorecard

Scores use 3 = complete at the assigned scope, 2 = partial, 1 = deficient and 0 = missing. They measure this packet, not the complete CTR-004 agreement or PAY criteria.

| Category | Status | Score | Notes |
| --- | --- | --- | --- |
| Completeness | Pass | 3/3 | Concrete producer/storage ports, finite syntax repair, namespace prerequisite and one combined scheduled consumer are present; future composition is explicitly tracked below |
| Correctness | Pass | 3/3 | Actual rendered/extracted bytes, financial and image parity, private MIME/hash fidelity and bounded aggregate cleanup pass existing positive/negative checks |
| Alignment | Pass | 3/3 | Server-owned resolved source, private object storage, HighLevel boundary, original calculator and existing Cron entry point retained |
| Gaps | Pass within scope | 3/3 | Rejection, rollback, authentication, resource bounds and original preservation are covered; source admission and public routes remain required future work |
| Detrimental Patterns | Pass | 3/3 | No global parser patch, authority widening, double purge budget, dependency version change or alteration to historical outputs detected |

Assigned scope: 15/15. No whole-product completion percentage is assigned. The Security report's advisory-intelligence freshness limitation remains a separate gate; this QA task makes no new online advisory or arbitrary-PDF security claim.

## Critical Issues (must fix)

None in the assigned frozen packet. This result does not clear a public financing release: the anonymous route, real source-admission resolver, saved setup/review/publication flow and HighLevel inquiry composition are still missing consumers.

## Warnings (should fix)

None in the assigned source packet. The root-owned ledger's description of 36 original pictures does not match the manifest's 34 PNGs plus two JSON evidence files. I reported the count correction to the parent and did not modify its active ledger. The manifest and all original bytes are internally consistent.

## Suggestions (consider improving)

None. Remaining engineering and release obligations are required work, not optional improvements.

## Plan Item Traceability

The parent explicitly assigned a bounded increment within CTR-004. Pass rows below qualify that increment. Deferred rows preserve the rest of the agreement without silently treating unreachable factories as a working public customer feature.

| ID | Plan requirement | Status | Implementation location | Notes |
| --- | --- | --- | --- | --- |
| OUT-01 | Immutable financial projection from the saved private source, supplied APR, original calculation and exact evidence hash | Pass | `apps/web/src/server/financing-release-html.ts:47-132` | Strict input schema, canonical presentation comparison and independent fixed-purchase recomputation refuse substituted public values; current runtime authority still belongs to the outer application |
| OUT-02 | Exact source-bound canonical HTTPS publication URL and issue/validity presentation | Pass | `financing-release-html.ts:96-130`, `:153-194` | Origin/publication equality, quote and authority channel/expiry bounds; renderer does not infer current publication eligibility |
| OUT-03 | Same saved financial rows and complete permitted identity, disclosure and validity text in actual site/PDF | Pass | `financing-release-html.ts:148-194`, `financing-release-render.ts:246-309`, `financing-release-pdf.ts:334-350` | Real DOM fields/rows and real page-stream glyph extraction, not copied request metadata; extra/omitted glyph inventory is checked separately from visual layout |
| OUT-04 | Responsive inert HTML with escaped content and eligibility-sensitive no-store policy | Pass | `financing-release-html.ts:198-288` | Responsive comparison/identity/photo presentation; exact output equality and actual DOM extraction; hashed inline style, disabled scripts/connects/objects and approved same-origin media |
| OUT-05 | Actual PDF generation with finite resource and concurrency bounds | Pass | `financing-release-render.ts:86-150`, `:206-243`, `financing-release-pdf.ts:224-332` | Two browser slots, 15-second launch/navigation/PDF bounds, 20 MiB/64 pages and bounded supported stream/font extraction; excess concurrency refuses instead of adding an unbounded queue |
| OUT-06 | Exact actual normalized image bytes, explicit public rights, source dimensions and painted image order/pixels | Pass | `financing-release-render.ts:38-84`, `:162-197`, `financing-release-pdf.ts:354-492` | Supported PNG/JPEG decoding, single-frame/no retained metadata, 12 MP per image, exact SHA/size/MIME/channel, finite total bytes/pixels and actual painted-image comparison; private permission does not grant public rights |
| OUT-07 | Refuse active PDF action chains while preserving the approved canonical link and ordinary structure names | Pass | `financing-release-pdf.ts:145-222`, `:334-346`, `financing-release-output.unit.test.ts:472-585` | Existing reviewed inline/indirect/array, Next/additional-action, unsupported action and exact-canonical tests pass; prior H01 finding remains preserved as history |
| OUT-08 | Reject escaped-name and duplicate-key loss before ordinary library parsing | Pass | `financing-release-pdf.ts:34-79`, `:247-255`, `financing-release-output.unit.test.ts:317-470` | Instance-local parser with depth 64, 200,000 object/name tokens and 1,024-byte name limit; matching dictionary-depth key sets; strings and length-delimited streams remain parser-owned; H02 regressions pass |
| OUT-09 | Unsupported PDF grammar fails closed within the owned producer subset | Pass for stated subset | `financing-release-pdf.ts:65-79`, `:224-260` | Object/xref streams, indirect stream Type, inexact stream recovery, invalid objects and encryption are outside the subset; does not establish every PDF syntax or parser differential |
| STORE-01 | Exact immutable owner/version-bound private artifact keys, MIME/length/hash verification and no public bucket copy | Pass | `financing-release-artifacts.ts:60-99`, `:100-239` | Required admitted media resolver; fixed account/bucket/path/method signed GET, bounded reads, aborts and reader cleanup; immutable PUT/HEAD then exact GET; storage possession is not anonymous authorization |
| STORE-02 | Runtime dependencies support the concrete Chromium consumer without a new package/version or exception | Pass | `apps/web/package.json:29`, `pnpm-lock.yaml` importer delta | Existing exact `@playwright/test` 1.63.0 added to web runtime dependencies; full production build passed; deployed Chromium provisioning remains a qualification |
| RET-01 | Reuse 30-day encrypted inquiry expiry/access policy, without inventing report retention or deleting HighLevel contacts | Pass for cleanup consumer | `supabase/migrations/20261014051000_financing_release.sql:513-522`, `apps/web/src/server/funnel-retention.ts:21-22` | Removes already-expired ciphertext by the database clock, retains sanitized delivery tombstones; no decryption or provider call; underlying capture/export policy was reviewed in the prior persistence packet |
| RET-02 | Preserve 12:15 UTC schedule and total 25,000-per-invocation purge bound | Pass | `apps/web/vercel.json:6`, `funnel-retention.ts:35-56`, migration `:541-550` | Existing route invokes one combined routine; three funnel and two financing batches of at most 5,000; the previous five-batch funnel-only loop is removed |
| RET-03 | Preserve Cron authentication, transaction role, rollback and HTTP response shape | Pass | `funnel-retention.ts:11-20`, `:23-65`, `apps/web/src/app/api/jobs/funnel-inquiries/route.ts:1-2` | Missing/invalid authorization refuses before DB access; strict nonnegative integer family/sum limits; success remains `{ removed: total }`; failure sanitized; connection released |
| RET-04 | Cleanup works while collection is disabled and grants only the missing scheduler namespace prerequisite | Pass for source delta | `funnel-retention.ts:21-22`, migration `:565-569`, `financing-release-retention.unit.test.ts:27-83` | Adds schema USAGE, not CREATE, private table access, export execution or role membership; existing fixed purge functions remain the only consumer path |
| RET-05 | Latest 1,000 unexpired owner export and subsequent scheduler cleanup remain independently qualified | Deferred canonical PostgreSQL rerun | `packages/db/test/financing-release-repository.integration.test.mjs:807-867` | Real database case asserts export ordering/content, schema-only privilege and combined purge. Existing CI failure followed successful export; actual WASM wire repair evidence belongs to the DB handoff. I did not run PostgreSQL or claim new concurrency proof |
| EVID-01 | Actual image/PDF/browser evidence, exact historical originals and meaningful rejection regressions | Pass at local evidence scope | `financing-release-output.unit.test.ts:19-585`, `financing-release-output-storage.unit.test.ts:68-153`, frozen originals manifest | Independent 117-test run includes actual Chromium generation/parity and existing reviewed actual-byte rejection cases; author guard-omission RED results remain attributed, not newly performed by this reviewer |
| EVID-02 | Security before fresh Quality, exact accepted plan/source pins, full gates before shipping | Pass ordering; CI deferred | Final Security `057b1a1...`, sixteen-pin table below | Current pins match; canonical full PostgreSQL/CI, repository health, current-main conflict/MERGEABLE and release qualification remain orchestrator obligations after commit |
| NEXT-01 | Resolve real saved source, authoritative lender/preset/quote/disclosure, public media/identity rights and current admission | Deferred outside assignment | Required ports in `packages/application/src/financing-release.ts:95-127`; artifact resolver `financing-release-artifacts.ts:50-56` | Mandatory concrete resolver remains future engineering; synthetic fixtures do not create lender authority or rights |
| NEXT-02 | Few-action saved customer setup, exact complete artifact review, explicit approval/publication and durable retry UI | Deferred outside assignment | CTR-004 immutable release and review sections; output handoff `:29-35` | This increment does not compose commands or customer UI; no PAY-001/010 completion claim |
| NEXT-03 | Anonymous `/p`, PDF/media and host eligibility, current expiry/revocation checks and neutral unavailable responses | Deferred outside assignment | CTR-004 anonymous projection section; `packages/application/src/financing-release.ts:585-613` foundation | Factories are called only from tests in this tree; build route inventory has no `/p` reader. No published property URL, actual host ownership or stale-cache qualification claimed |
| NEXT-04 | Per-visitor nonce, normalized consented encrypted inquiry, idempotent attribution and durable HighLevel delivery/readback | Deferred outside assignment | HTML form `financing-release-html.ts:279`, output handoff `:31-33` | First name/email/intent/honeypot and unchecked consent are present, but no request UUID/nonce or real route. Do not enable this form until capture/current release/consent/authority composition is complete |
| NEXT-05 | Canonical URL handoff to HighLevel QR and optional actual decoded/scan-qualified supplemental flyer | Deferred outside assignment | Accepted CTR-004 HighLevel QR section | No QR manager/generator added; existing plain canonical link does not establish a QR handoff or supplement |
| NEXT-06 | Practical one-page three-scenario payment flyer | Deferred outside assignment | PAY brief `:55`, output handoff `:15`, `:35` | Current PDF is an extended comparison report. Existing original PDFs have 4/5/9/4 pages. This is not a completed one-page flyer |
| NEXT-07 | Hosted Chromium/R2, actual daily purge activation, correct HighLevel installation/routing and controlled release/readback | Deferred qualification | Output handoff `:35`, retention handoff final paragraph | Source/test/build passes do not prove deployed runtime availability, production deletion or lasting-contact delivery |
| NG-01 | Preserve private manifests, exact calculator, five funnel kinds and accepted G1/G4/G8 dispositions | Pass | Scoped diff; renderer uses existing contracts and `calculateFinancingComparison` | No private source reinterpretation, sixth funnel kind, inferred financial eligibility, APR calculation or reopened accepted gate |
| NG-02 | No global parser mutation, dependency policy weakening, new test payload or replacement of historical HOLD/artifacts | Pass | Instance-local `QualifiedFinancingPdfParser`; independent pin/manifest checks | Review executed only existing cases and supported build/type checks. No guard/test assertions changed |
| NG-03 | No customer roles, live provider writes, messages, purchases, publication, migration or deployment effects | Pass | Assigned source packet and reviewer actions | Tenant/internal authority boundaries retained; tests use synthetic fixtures and transport substitutes, not actual customer/provider evidence |

### Independent verification

- `pnpm exec vitest run --project unit apps/web/src/server/financing-release-output.unit.test.ts apps/web/src/server/financing-release-output-storage.unit.test.ts tooling/tests/unit/financing-release-database.test.ts apps/web/src/server/funnel-delivery.unit.test.ts apps/web/src/server/financing-release-retention.unit.test.ts`: 117 passed in five files, exit 0, 55.76 seconds. Includes 99 output/storage/SQL cases and 18 retention/delivery cases; overlapping author/Security totals are not added.
- `pnpm --filter @oalo/web typecheck`: passed, exit 0.
- `pnpm build`: 16 successful tasks, exit 0, 38.459 seconds. Fifteen workspace package results used the unchanged build cache; web was rebuilt, compiled and typechecked, and static generation completed. This is not a clean install or hosted build claim.
- `git diff --check`: passed. The main-to-head diff was inventoried as 424 inherited/current files; the reviewed packet is precisely the sixteen source/dependency/test files below. Other existing reviewed source increments and active root-owned ledger edits were not requalified or modified.
- All sixteen current Security source pins: independently hashed, all match before testing and again after the tests/build. All forty-three artifact hash/length checks were also repeated after verification, with zero mismatches.
- Forty-three original artifact hash and length checks: zero mismatches. Actual composition is four PDF files, three HTML files, thirty-four PNG files and two JSON evidence files. The manifest remains `58df4b90c460e8c4e55bb597e3acd325ea0b2a6617eef3a8a9336f2db9375663`.
- Existing frozen browser evidence records four synthetic desktop/mobile 3/5-scenario captures with no outward requests, page errors, horizontal overflow or automated tagged WCAG 2.1 AA violations. This evidence is attributed to the author; this reviewer did not rerun a full browser/accessibility or visual audit. Hash integrity is not independent visual approval.

No new security payload, probe, mutation or provider request was generated. Existing actual-byte negative regressions ran unchanged, and actual Chromium positive regeneration writes to unique OS temporary directories, preserving the original evidence. Author preflight-omission RED evidence (three failed existing assertions) and earlier painted-image/action-chain RED evidence are documented in the preserved handoff; they were not repeated or relabeled as independent new evidence. Full canonical PostgreSQL migration, pgTAP and same-head CI remain required. Prior global memory access was unavailable; no raw mount workaround or client-data persistence occurred.

### Frozen evidence

| Record | Independently verified SHA-256 |
| --- | --- |
| Accepted CTR-004 revision 1 | 59d0b203159f5c6c440621437bcd244f664f7a64901924b9a8b952a6a4d70dfa |
| Final scoped Security | 057b1a1a077d1f15df7eb4df81803ce660028fc4cf2d640330a58cefe5e1975a |
| Output author handoff | 133128f65bd8d72feed0e42429446c7aed67f3451eba1871e0e01ab12147125b |
| Preserved first 15,919 handoff bytes | eaeef632d66de03021e05705dfd89e561a5a06dd811a79e0b83623b8040f6e43 |
| Daily consumer handoff | 3e7a9433e5478eea376430b695be35cd0b008c86d262521537c00eb7352ce1a0 |
| Original artifact manifest | 58df4b90c460e8c4e55bb597e3acd325ea0b2a6617eef3a8a9336f2db9375663 |
| Preserved H01 Security HOLD | d4285b44c201b6809ee9368027a3cb45872ab1158ab9598e9ee6334879e7e72b |
| Preserved H02 Security HOLD | 3d44cbe2b78f80578565eaca4999be6644e1f5330099427b61a5c7d6fbe59576 |

## Files Changed

Sorted inventory of the assigned packet. A/M is relative to the assigned `39a971ae` base; the migration and integration-test changes qualify only the namespace repair and its guards, not a fresh audit of every earlier persistence requirement.

| File | Change and purpose | Frozen SHA-256 |
| --- | --- | --- |
| apps/web/package.json | M: existing exact Chromium test/runtime package declared for web | 3d009dd3f93dec0921036e5f1df9405a148a250e37904bf91517f9d0cc6a998b |
| apps/web/src/server/financing-release-artifacts.ts | A: exact private artifact/media transfer and byte verification | b26213adb171cb6b09c539a2a1bba806eff23230e23ccd4748cf98dbb8544aac |
| apps/web/src/server/financing-release-html.ts | A: strict source projection, shared rows and inert responsive HTML | b4a4621873723e9245cd3bcfcd77bf9fc4f4133edc1e35a7b1a2c910d0a406a3 |
| apps/web/src/server/financing-release-output-fixture.d.ts | A: typed synthetic output fixture declarations | ae38b940f65162b0350c8dad7adb64f689caa7c622a35d4efc86d7f7411214bd |
| apps/web/src/server/financing-release-output-fixture.js | A: synthetic permitted source/media test construction | 201809eeb62ef78e0c081ea0c7df6de5c34cc368c428f48bba4edec8a6a53f63 |
| apps/web/src/server/financing-release-output-storage.unit.test.ts | A: private actual-byte transport success/refusal cases | bfede711b4c57ac19e1ecc2a4a9721ef4de32ab3943fc91b8c55af1985c412a3 |
| apps/web/src/server/financing-release-output.unit.test.ts | A: actual Chromium/text/image cases and preserved reviewed parser/action regressions | 32daeedf50987924bafe9c16862e99b772757dec2bec443cf12021442494a0ee |
| apps/web/src/server/financing-release-pdf.ts | A: bounded producer syntax/action inspection and real text/image parity | c6bd6c0f4e0f30280690f6919a064d50d74757d1084bca376ddec7815e601514 |
| apps/web/src/server/financing-release-render.ts | A: concrete media decoding and Chromium render/parity ports | c78709c28bf7e10585d35dba7ad755771aaf6f63df66e261713f258bad39a279 |
| apps/web/src/server/financing-release-retention.unit.test.ts | A: bounded aggregate daily cleanup and rollback regressions | 149ffe4f52444a09f71a14b1571e1bc0504b9d4a5f3983f3de73473a4df4eca5 |
| apps/web/src/server/funnel-delivery.unit.test.ts | M: existing retention assertion follows the combined routine | 70b140ea5da3de6e30468e428783a772a33089b8ddbe80c0ae80327ac5992337 |
| apps/web/src/server/funnel-retention.ts | M: one authenticated transactional shared purge with strict aggregate parsing | 71790fdb06176666c6d299aeaa591cb6c638a7ac533ed01d358d90014e59cd4d |
| packages/db/test/financing-release-repository.integration.test.mjs | M: exact scheduler namespace/negative privilege assertions after latest-1,000 export | 0607a6a27aba8243cd760e062eb879ce45e3a5bc140126774062f9e79c53fec6 |
| pnpm-lock.yaml | M: web importer uses the existing exact Chromium package resolution | eae2bc37f24180a04f24d414f93a13c25e1931d59e3d1bfafe816309a01db231 |
| supabase/migrations/20261014051000_financing_release.sql | M: only missing campaign schema USAGE added for the finite scheduler | 0b0bd282e4a12ef47ccc512d6ab63527210c93f80c1ef8282ad08ef81bb70104 |
| tooling/tests/unit/financing-release-database.test.ts | M: schema prerequisite and no table/CREATE privilege assertions | 3f8aea02a0729509e6f71cc8a9741923486ffe1bf280dee37c8af5128b7313d8 |

Unchanged schedule pin: `apps/web/vercel.json`, `b8671087f50f0b5206d3c11ff625d311500f134ecec0fae47ed7b9d98ea8cbb1`.

This review creates only `library/requirements/reports/2026-10-14-financing-output-final-quality-review.md`. It preserves all prior reports, handoff history and actual artifacts. It grants no merge, provider, production-deletion or deployment authority. The parent may integrate this source increment and proceed to full CI and the required remaining consumers.
