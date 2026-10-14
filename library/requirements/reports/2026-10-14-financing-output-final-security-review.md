# Financing output and daily retention: final scoped Security review

Date: 2026-10-14. Auditor: independent security-guardian. Branch: codex/property-marketing-release. Base: 39a971aed6f10e690af3305f3d7a0c61d6babfba. Scope: sixteen frozen sources/tests/dependency files listed below. CTR-004 revision 1: 59d0b203159f5c6c440621437bcd244f664f7a64901924b9a8b952a6a4d70dfa.

## Executive summary

Scoped PASS. H-FIN-OUTPUT-01 and H-FIN-OUTPUT-02 are closed for the supported, owned Chromium output subset by the author's current repair and passing existing reviewed regressions. No new Critical, High, Medium or Low finding was detected in this read-only defensive source review. The daily consumer preserves Cron authentication, the scheduler transaction and finite expired-inquiry cleanup while adding the financing family to the same total budget.

The parent narrowed this review to existing unit regressions, actual positive artifacts and static source checks: no new security payload, probe or external request was constructed or executed. Prior independent negative evidence and both HOLD reports remain unchanged. Fresh Quality follows this report. Earlier database Quality concerns older packets; no current output Quality was found. This is not a whole-branch, arbitrary uploaded-PDF, hosted service, actual daily cleanup, public inquiry or product completion clearance.

The managed CVE watchlist last refreshed 2026-04-24 remains beyond 120 days. Its separate refresh is still needed. No online dependency audit or latest-advisory claim was made in this reduced review. Dependency pins are unchanged from the prior zero-advisory production audit snapshot. Imported Svelte examples were applied only where relevant to this actual Next.js codebase.

## Scorecard

| Category | Result | Findings |
| --- | --- | --- |
| Financial and payment security | PASS within scope | None detected; immutable projection and parity retained |
| PII exposure | PASS within scope | None detected; cleanup uses ciphertext without decryption |
| Authentication and authorization | PASS within scope | Cron secret checked before connection; owner/private storage boundary retained |
| Injection and active content | PASS for producer subset | H01/H02 closed, no new finding detected |
| Dependency security | Unchanged reviewed snapshot | No new dependency/resolution; no fresh external advisory check |
| Configuration and headers | PASS within scope | Inert HTML/hash CSP/no-store controls retained; deployed enforcement pending |
| Data handling and cleanup | PASS for source delta | Single bounded combined purge, rollback on malformed results |

## Critical findings

None detected in the assigned scope.

## High findings and repair closure

No open High finding detected.

H-FIN-OUTPUT-01: financing-release-pdf.ts:153-230 retains bounded traversal of inline and indirect dictionaries, arrays and stream dictionaries, distinct visited sets, finite action fields and refusal of Next/additional actions. Only Type/S/URI action keys qualify; recognized links must match the exact approved source canonical URL in the subsequent parity check. Ordinary structure S names remain supported. Existing reviewed tests cover chain variants, unsupported actions, nested contexts, exact canonical binding and permitted original output.

H-FIN-OUTPUT-02: financing-release-pdf.ts:36-83 uses an instance-local subclass of the installed PDFParser before the ordinary PDFDocument load at lines 247-255. Every parsed name token containing # is refused from its original byte slice, before pdf-lib's case-sensitive name decoder can erase the distinction. This includes names as dictionary keys and values, literal aliases, escaped action keys and malformed escapes. Dictionary key sets are tracked at the matching parse depth, before Map insertion can discard a prior duplicate. Values increase parseObject depth, so ordinary name values are not mistaken for sibling dictionary keys. Nested dictionaries get independent key sets, popped in finally blocks.

Existing reviewed actual-byte tests cover lowercase/mixed/uppercase spellings, inline/indirect/array contexts, action values, duplicate keys and escaped collisions. They pass without modifying any test or validator. Earlier independent H01/H02 probes are retained as historical evidence; this reduced review did not execute or expand them. The preflight is a deliberately smaller producer subset, not a general PDF name-normalization implementation.

## Medium findings

None detected in this delta.

## Low findings

None detected. Intelligence freshness and remaining deployment/composition work are limits, not inferred source vulnerabilities.

## Parser review and limits

- Input is constrained to 20 MiB and a PDF header/EOF shape before parsing. The new preflight caps object recursion at 64, object/name tokens at 200,000 and names at 1,024 bytes. Graph traversal separately caps depth/pending/inspected values and rejects missing references. Page count, indirect object count, supported CMaps, individual stream inflation and aggregate decoded page streams remain bounded.
- Strings, comments and exact length-delimited binary streams stay parser-owned. Name rejection occurs in parseName, avoiding raw replacements in images/fonts/compressed content. Existing literal-string and stream positive regressions demonstrate that name-like data is not treated as a dictionary key.
- parseDictOrStream refuses ObjStm and XRef streams, plus indirect stream Type values. The stream fallback override refuses inexact/indirect length recovery. Strict invalid-object mode is used for both preflight and final load. Existing malformed/truncated dictionary and inexact-stream regressions pass. Existing encryption and object-stream refusal remains.
- No global parser prototype/module patch, package update, renderer byte rewrite or new dependency is introduced. Both passes use the same installed parser family. The inherited parser still contains general xref/header/root recovery machinery; this review does not establish complete PDF-spec validation, an arbitrary upload sandbox, every malformed syntax case or all possible parser differentials. It qualifies the stated owned producer subset and the repaired known findings using existing evidence.
- Actual financial text, source projection, identity/disclosure, exact canonical link, font and painted image-pixel/order verification remain. The private artifact factory still binds owner/version/derived immutable key and validates exact HTTPS R2 account/path/method, bounded MIME/size/hash bytes and admitted media resolution. Storage possession does not grant anonymous eligibility. No current public route is qualified here.

## Daily retention review

funnel-retention.ts:11-20 keeps bounded Cron secret parsing and constant-time comparison of fixed-size SHA-256 bearer digests before obtaining a connection. Missing configuration refuses with 503; invalid authorization refuses with 401 before database access. The public route remains the existing GET job adapter.

At lines 35-56, one transaction sets LOCAL scheduler_runtime and calls a single fixed campaign.purge_expired_marketing_inquiries() query. Strict parsing requires integer nonnegative family counts, funnel at most 15,000, financing at most 10,000, total at most 25,000 and exact sum. Invalid results or query failures roll back and produce the existing sanitized 503; successful commit returns only {removed: total}. Connection release remains in finally. Publication flags and decryption keys do not gate expiry cleanup.

The reviewed unchanged SQL at migration lines 513-522 deletes only inquiries whose expiry is due by the database clock, at most 5,000 per batch with FOR UPDATE SKIP LOCKED, and updates pending delivery tombstones. The combined routine at lines 541-550 runs three funnel and two financing batches. Its explicit empty search path and schema-qualified calls remain. The pre-existing funnel routine uses transaction now() for its expiry cutoff; the financing routine uses clock_timestamp(). Neither consumes a client-supplied cleanup date. This review makes no concurrent-database execution claim.

The namespace prerequisite remains only schema USAGE to scheduler_runtime at line 566, with already finite function execution. No CREATE, private table, export or membership widening is present. The unchanged vercel.json remains 12:15 UTC. No live deletion or deployed scheduler run occurred in this task.

## Independent verification

| Verification | Result |
| --- | --- |
| Existing five-file reviewed unit suite | 117 passed in five files, exit 0, 55.67 seconds: 99 output/storage/SQL plus 18 retention/delivery |
| Web typecheck | Passed |
| Lint | Passed |
| Boundary audit and existing rejection fixture | Passed for 16 workspace packages, rejected two prohibited edges |
| Product-type audit | Passed |
| Secret audit | Passed across six source roots and public environment boundary |
| Formatting of five changed validator/retention files | Passed |
| git diff --check | Passed |
| All sixteen source/dependency pins | Match frozen values |
| Unchanged schedule pin | b8671087f50f0b5206d3c11ff625d311500f134ecec0fae47ed7b9d98ea8cbb1 |
| Original artifact manifest | All 43 hashes and lengths match, zero mismatches |
| Prior HOLD reports | Both exact hashes unchanged |

Unit command: pnpm exec vitest run --project unit apps/web/src/server/financing-release-output.unit.test.ts apps/web/src/server/financing-release-output-storage.unit.test.ts tooling/tests/unit/financing-release-database.test.ts apps/web/src/server/funnel-delivery.unit.test.ts apps/web/src/server/financing-release-retention.unit.test.ts.

Existing positive Chromium generation/text/image/parity cases pass and write only unique OS temporary captures. Original PDF/HTML/PNG bytes were rehashed against their frozen manifest. An optional direct positive inspection command could not start because tsx is not installed; no dependency was installed or downloaded, and no extra positive inspection was claimed. The author's prior four-original positive results remain attributed to the author.

The bundled broad scan writes outside assigned ownership and traverses other active work; this reduced task used supported local audits and scoped static reading instead. No new proof/config, attack payload, source change or external request was made. Global memory access was previously unavailable; no raw mount workaround or client-data persistence was used.

## Frozen handoffs and originals

Author handoff: 133128f65bd8d72feed0e42429446c7aed67f3451eba1871e0e01ab12147125b. Its preserved first 15,919 bytes still hash to eaeef632d66de03021e05705dfd89e561a5a06dd811a79e0b83623b8040f6e43.

Retention handoff: 3e7a9433e5478eea376430b695be35cd0b008c86d262521537c00eb7352ce1a0. Original manifest: 58df4b90c460e8c4e55bb597e3acd325ea0b2a6617eef3a8a9336f2db9375663. Historical H01 HOLD: d4285b44c201b6809ee9368027a3cb45872ab1158ab9598e9ee6334879e7e72b. Historical H02 HOLD: 3d44cbe2b78f80578565eaca4999be6644e1f5330099427b61a5c7d6fbe59576.

## Frozen source pins

| File | SHA-256 |
| --- | --- |
| apps/web/src/server/financing-release-render.ts | c78709c28bf7e10585d35dba7ad755771aaf6f63df66e261713f258bad39a279 |
| apps/web/src/server/financing-release-html.ts | b4a4621873723e9245cd3bcfcd77bf9fc4f4133edc1e35a7b1a2c910d0a406a3 |
| apps/web/src/server/financing-release-pdf.ts | c6bd6c0f4e0f30280690f6919a064d50d74757d1084bca376ddec7815e601514 |
| apps/web/src/server/financing-release-artifacts.ts | b26213adb171cb6b09c539a2a1bba806eff23230e23ccd4748cf98dbb8544aac |
| apps/web/src/server/financing-release-output-fixture.js | 201809eeb62ef78e0c081ea0c7df6de5c34cc368c428f48bba4edec8a6a53f63 |
| apps/web/src/server/financing-release-output-fixture.d.ts | ae38b940f65162b0350c8dad7adb64f689caa7c622a35d4efc86d7f7411214bd |
| apps/web/src/server/financing-release-output.unit.test.ts | 32daeedf50987924bafe9c16862e99b772757dec2bec443cf12021442494a0ee |
| apps/web/src/server/financing-release-output-storage.unit.test.ts | bfede711b4c57ac19e1ecc2a4a9721ef4de32ab3943fc91b8c55af1985c412a3 |
| apps/web/package.json | 3d009dd3f93dec0921036e5f1df9405a148a250e37904bf91517f9d0cc6a998b |
| pnpm-lock.yaml | eae2bc37f24180a04f24d414f93a13c25e1931d59e3d1bfafe816309a01db231 |
| supabase/migrations/20261014051000_financing_release.sql | 0b0bd282e4a12ef47ccc512d6ab63527210c93f80c1ef8282ad08ef81bb70104 |
| packages/db/test/financing-release-repository.integration.test.mjs | 0607a6a27aba8243cd760e062eb879ce45e3a5bc140126774062f9e79c53fec6 |
| tooling/tests/unit/financing-release-database.test.ts | 3f8aea02a0729509e6f71cc8a9741923486ffe1bf280dee37c8af5128b7313d8 |
| apps/web/src/server/funnel-retention.ts | 71790fdb06176666c6d299aeaa591cb6c638a7ac533ed01d358d90014e59cd4d |
| apps/web/src/server/funnel-delivery.unit.test.ts | 70b140ea5da3de6e30468e428783a772a33089b8ddbe80c0ae80327ac5992337 |
| apps/web/src/server/financing-release-retention.unit.test.ts | 149ffe4f52444a09f71a14b1571e1bc0504b9d4a5f3983f3de73473a4df4eca5 |

## Reviewer changes and remaining work

Only this new report was created. No source, migration, dependency, existing report, original artifact, baseline, ledger, Git state or live service was modified by this reviewer. The first read command used an unset worktree binding and read the primary checkout's old retention file; the binding was corrected immediately and all review conclusions, pins and tests use the assigned property worktree.

Fresh Quality must verify this exact packet next. Full canonical PostgreSQL and hosted qualification remain necessary. Current source/media/identity admission, anonymous route/host eligibility, per-visitor inquiry nonce and capture/delivery composition, saved setup/review/publication UI, real rights, hosted Chromium/R2, one-page flyer and HighLevel QR supplement remain parent-owned work. This source consumer closes the missing daily purge call, not proof a production daily job ran. Repository health and PR review are orchestrator gates before commit/push; no merge, deployment or provider release is authorized here.
