# Security Audit Report: PRD-001 Core RAID

**Audit date:** 2026-08-12
**Auditor:** security-guardian subagent
**Scope:** Entire working-tree diff from baseline `43f1656b`, with focused review of campaign paid-ad projection and brand preflight, stored attestation authorities, the render browser discriminant and paid-ad source, Meta draft compilation, dependency overrides and lockfile changes, and all affected tests. The main paths were `packages/{contracts,domain,application,rendering,ghl}/**`, `apps/web/**`, `tooling/tests/**`, `tests/contracts/**`, `tests/visual/**`, `pnpm-workspace.yaml`, and `pnpm-lock.yaml`.
**Next.js version audited:** 16.2.11
**React version audited:** 19.2.7
**CVE watchlist last refreshed:** 2026-04-24, 110 days before this audit and within the 120-day freshness threshold

---

## Executive Summary

The most important finding was a High-severity fail-open asynchronous authorization seam: a database-backed stored attestation authority could return a rejected Promise while paid-ad rendering or Meta compilation continued. A second High-severity finding allowed unknown or misclassified identity assets and omitted advertiser contact or privacy URL fields from the paid-ad brand boundary. Both High findings were fixed with narrow changes and regression tests. No Critical findings, secrets, payment-data exposure, PII leakage, injection vulnerabilities, or vulnerable dependencies were detected. One pre-existing Medium configuration finding remains: the Next.js application has no global Content Security Policy.

This audit ran after `2026-08-12-production-path-qa-report.md`. Its verification predates the security fixes, so quality must run again before the branch is treated as shippable.

---

## Scorecard

| Category | Status | Findings |
|---|---|---:|
| Financial / Payment Security | OK | 0 |
| PII Exposure | OK | 0 |
| Authentication & Authorization | FAIL | 1 High, fixed |
| Injection Vulnerabilities | OK | 0 |
| Dependency Security | OK | 0 |
| Configuration & Headers | ATTN | 1 Medium |
| Data Handling | FAIL | 1 High, fixed |

Legend: **OK** = zero findings. **ATTN** = Medium or Low findings documented. **FAIL** = Critical or High findings fixed in this session.

---

## Critical Findings (fixed in this session)

None detected.

---

## High Findings (fixed in this session)

- [x] **Authorization fail-open for asynchronous stored attestation authorities** `packages/application/src/campaign-foundation.ts:189`, `packages/application/src/campaign-foundation.ts:202`, `packages/ghl/src/meta-adapter.ts:407`, `packages/ghl/src/meta-adapter.ts:513` - Both authority interfaces previously declared `assertAuthorized(...): void`, and both callers invoked them synchronously. TypeScript permits an `async` implementation to satisfy a void-return callback, so a database-backed authority could reject after rendering or compilation had already continued. Both interfaces now return `void | Promise<void>`, both application and Meta callers explicitly `await` authorization, rendering propagates the asynchronous contract, and regression tests prove rejected database-backed authorities fail closed.

- [x] **Incomplete paid-ad identity allowlist and text boundary** `packages/contracts/src/campaign-foundation.ts:150`, `packages/domain/src/campaign-foundation.ts:412`, `packages/domain/src/campaign-foundation.ts:475` - The paid-ad rules only denied known Realtor asset references. Unknown, misclassified, or composite brokerage identity assets could therefore pass, and advertiser contact fields plus the lead-form privacy URL were not all evaluated as identity-bearing text. The rules now positively allowlist lender paid-ad identity assets and approved property assets. The domain rejects all other identity or property assets and scans advertiser contact values plus `leadForm.privacyPolicyUrl` against prohibited brokerage identity text. Unit, rendering, and Meta contract tests cover brokerage, dual-brand, contact, URL, asset, tampering, and async-authority vectors.

---

## Medium Findings (follow-up required)

- [ ] **Missing global Content Security Policy** `apps/web/next.config.ts:5` - The application sets HSTS, `X-Content-Type-Options`, frame denial, referrer, permissions, COOP, and CORP headers, but it does not send a global `Content-Security-Policy`. Implement a nonce-based policy compatible with the inline theme bootstrap in `apps/web/src/app/layout.tsx`. This was not changed in the security close-out because a correct nonce rollout requires application-wide compatibility testing and exceeds the under-five-line Medium-fix allowance.

---

## Low Findings (documentation only)

None detected.

---

## Requested Focus Coverage

| Surface | Result |
|---|---|
| Paid-ad projection | High asset and contact-field boundary gap fixed. Realtor or brokerage identity remains available to collateral but is denied from paid ads. |
| Stored attestation authorities | High async fail-open fixed in application rendering authorization and Meta compilation. |
| Render browser discriminant | No vulnerability found. Browser selection remains a closed discriminated contract, and rendered paid-ad documents carry a deny-all CSP with only inline styles permitted. |
| Meta compiler | High async authority gap fixed. Frozen paid-ad projection hashes and stored preflight bindings remain verified before provider presentation is compiled. |
| Dependency overrides | No vulnerable override or unbounded source found. Resolved overrides remain pinned through `pnpm-lock.yaml`; the rendering change adds only the internal `@oalo/application` workspace dependency. |
| Tests and fixtures | No production secrets or live customer PII found. Added malicious identity and asynchronous authority fixtures are synthetic. |

---

## Deterministic Scan Results

- `security-weapon/scripts/scan.ts` completed through the documented Windows fallback, `npx --yes tsx`. The repository does not declare `tsx` as a root executable, so the direct `pnpm exec tsx` form was unavailable.
- Hidden Unicode scan: no suspicious characters found.
- Environment-file inventory: no `.env*` files found in scope.
- Regex sweeps: no product hardcoded secrets, raw card data, token logging, dynamic code execution, shell interpolation, SQL injection, wildcard credentialed CORS, or unsafe JWT parsing found. Test and template matches were manually triaged as non-production data.
- `pnpm audit:secrets`: passed.
- `pnpm audit:dependencies`: passed with no known vulnerabilities.
- Manual configuration review covered the nested `apps/web/next.config.ts`, which the generic scanner did not auto-discover.

---

## Dependency Audit

```text
info:     0
low:      0
moderate: 0
high:     0
critical: 0
total dependencies inspected by npm audit: 189
```

Resolved dependency spot checks:

```text
Next.js: 16.2.11
React: 19.2.7
brace-expansion: 5.0.9
nanoid: 3.3.18
postcss: 8.5.26
tar: 7.5.21
ws: 8.21.0
@hono/node-server: 2.0.10
@opentelemetry/core: 2.8.0
engine.io: 6.6.7
esbuild: 0.25.0
sharp: 0.35.3
```

Full deterministic scan output is in ignored local scratch at `reports/scan-output/`.

---

## Framework CVE Check

| CVE / advisory | Patched threshold | Current project | Status |
|---|---|---|---|
| **CVE-2025-29927** (Next.js middleware authorization bypass) | 14.2.25 / 15.2.3 | Next.js 16.2.11 | Patched |
| **CVE-2025-55182** (React Server Components RCE) | React 19.0.1 / 19.1.2 / 19.2.1 | React 19.2.7 | Patched |
| **CVE-2025-66478** (Next.js React Server Components companion) | Patched 14.x / 15.x / 16.x release | Next.js 16.2.11 | Patched |
| **CVE-2026-64642** (Next.js proxy authorization bypass) | Next.js 16.2.11 | Next.js 16.2.11 | Patched |
| **CVE-2026-64645** (Next.js dynamic rewrite SSRF) | Next.js 16.2.11 | Next.js 16.2.11 | Patched |
| **GHSA-c4j6-fc7j-m34r** (Next.js WebSocket SSRF) | Next.js 16.2.5 | Next.js 16.2.11 | Patched |
| **GHSA-wfc6-r584-vfw7** (Next.js cache poisoning) | Next.js 16.2.5 | Next.js 16.2.11 | Patched |
| **GHSA-mg66-mrh9-m8jx** (Next.js Cache Components DoS) | Next.js 16.2.5 | Next.js 16.2.11 | Patched |

Current official advisory cross-checks included:

- <https://github.com/facebook/react/security/advisories/GHSA-fv66-9v8q-g76r>
- <https://github.com/vercel/next.js/security/advisories/GHSA-p9j2-gv94-2wf4>
- <https://github.com/advisories/GHSA-6gpp-xcg3-4w24>

The local watchlist is not older than its 120-day threshold, but it does not yet include the July 2026 Next.js advisories above. Refresh the weapon watchlist now rather than waiting for the date threshold.

---

## Verification Evidence

Post-remediation checks completed:

- TypeScript typecheck: passed.
- Targeted unit suites: 58 tests passed.
- Meta paid-ad brand boundary contract suite: 16 tests passed.
- `pnpm verify:offline`: passed, including formatting, lint, all package typechecks, 377 unit tests, 28 integration tests, 48 contract tests, 7 visual tests, 1 preview test, 22 browser tests, duplication audit with zero clones, boundary and product-type audits, secret and dependency audits, all package builds, and the Next.js production build.
- `git diff --check`: passed.
- The canonical repository engine is Node 24.18.0. The local verification host reported Node 22.19.0, so the Node engine warning remains an environment caveat, not a test failure.
- The completed pre-security tree had already passed 6 database orchestration tests and 126 pgTAP assertions. Security remediation did not touch migrations, database code, or SQL, so those database suites were not repeated locally.

---

## Files Changed (remediation)

| File | Change Summary |
|---|---|
| `packages/contracts/src/campaign-foundation.ts` | Added positive allowlists for lender paid-ad identity assets and approved property assets. |
| `packages/domain/src/campaign-foundation.ts` | Enforced identity and property allowlists and included advertiser contact plus privacy URL in prohibited identity checks. |
| `packages/application/src/campaign-foundation.ts` | Made stored attestation authorization awaitable and fail closed. |
| `packages/rendering/src/paid-ad-render-sources.ts` | Propagated asynchronous paid-ad authorization through render source creation. |
| `packages/rendering/src/production-rendering.ts` | Awaited the authorized paid-ad render source. |
| `packages/ghl/src/meta-adapter.ts` | Made Meta stored-authority verification awaitable and updated derived return types. |
| `tooling/tests/unit/production-foundation/campaign-foundation.test.ts` | Added allowlist, contact/URL, and asynchronous stored-authority regression coverage. |
| `tooling/tests/unit/production-foundation/prd001d-rendering.test.ts` | Updated rendering rules and preserved fail-closed identity boundary coverage. |
| `tooling/tests/unit/production-foundation/meta-adapter.test.ts` | Updated asynchronous Meta compiler call sites and assertions. |
| `tests/contracts/ghl/meta-brand-boundary.test.ts` | Added database-backed asynchronous authority rejection coverage and preserved adversarial identity vectors. |

The post-remediation diff was reviewed and confirmed security-scoped on 2026-08-12. Unrelated implementation and ledger edits owned by other agents were preserved.

---

## Recommended Follow-Up (architectural)

- Implement and browser-test a nonce-based application CSP for `apps/web`, including the theme bootstrap path that currently uses deterministic inline script content.
- Refresh `security-weapon/research/cve-watchlist.md` with the July 2026 Next.js advisories. The current date is still within the documented freshness limit, but the catalog is no longer complete.
- Keep production implementations of both stored authorities backed by the authoritative preflight record and exercise their timeout, missing-record, hash-mismatch, and rejected-Promise paths in integration tests when persistence wiring lands.

---

## Ordering Note

`2026-08-12-production-path-qa-report.md` was present before this audit and predates the security remediation. Its results are stale for the current working tree. Re-run `quality-guardian` against this post-security tree before release. Security close-out itself is complete, and quality may proceed.

---

*Generated by `security-guardian` using `security-weapon`. See `C:\Users\jzfer\.agents\skills\security-weapon\` for methodology.*

---

## Post-Remediation Addendum: 2026-08-12 09:27 CDT

### Superseding Current Status

This addendum preserves the original audit above and supersedes its current-status summary for the tree after the 001D-AC-021 remediation. The focused re-audit found one additional High issue in the newly introduced paid-only asset byte boundary. It was fixed in this session. Cumulative status is now 0 Critical, 3 High fixed, 1 Medium open, and 0 Low. No unresolved Critical or High finding remains. The original global application CSP Medium finding remains open.

`2026-08-12-prd001-core-raid-qa-report.md` predates the changes and verification in this addendum. That quality report is stale and must be rerun.

### Additional High Finding (fixed)

- [x] **Approved asset checksum did not bound or validate decoder input** `packages/rendering/src/playwright-browser.ts:42`, `packages/rendering/src/playwright-browser.ts:283` - The new browser path verified the loaded bytes against the manifest SHA-256, but checksum equality only proves that the fetched bytes are the bytes named by the manifest. It does not prove that those bytes are a safe image. Before remediation, a checksum-correct but mislabeled, corrupt, oversized, multi-frame, dimension-mismatched, or high-decompression image could reach Chromium's decoder. A malicious approved payload could therefore exhaust renderer memory or exploit a content-type assumption. The adapter now rejects empty or encoded assets over 25 MiB, uses Sharp with warnings treated as failures and unlimited decoding disabled, limits input to approximately 10.5 million pixels, requires the decoded JPEG or PNG format and dimensions to match the paid-only manifest, requires one frame, performs a full raw decode capped at 40 MiB, then requires Chromium `img.decode()` and nonzero natural dimensions before capture. SHA-256 verification remains mandatory and occurs before the decoder guard.

### Focused Trust-Boundary Results

| Surface | Post-remediation security result |
|---|---|
| Paid-only asset manifest and authority | PASS. The strict manifest permits only approved JPEG or PNG identity and property assets, rejects duplicate role assignment, binds to the campaign version and paid-ad projection hash, validates its canonical manifest hash, and must exactly match the identity and property reference sets requested from the paid projection. The asset authority is awaited at `packages/rendering/src/paid-ad-render-sources.ts:135`; missing output, rejection, or malformed output fails before browser or storage access. |
| Brand authority ordering | PASS. Stored brand authorization is awaited before the paid asset authority is called. An asynchronous brand rejection prevents the asset lookup. An asynchronous asset-authority rejection prevents source generation. Regression evidence is at `tooling/tests/unit/production-foundation/prd001d-rendering.test.ts:394`. |
| Realtor and collateral isolation | PASS. `PaidAdBrowserRenderInput` carries only `paidAdContext` and the authorized paid source, never the collateral `RenderManifest`. The source derives asset refs only from the paid projection and exact paid-only manifest. Tests prove the serialized browser input excludes the collateral manifest ref, partner profile, Realtor display name, Realtor assets, and collateral asset checksum at `tooling/tests/unit/production-foundation/prd001d-rendering.test.ts:662`. Property images and lender identity images remain present. |
| Asset URL routing and path traversal | PASS. Asset references are restricted opaque identifiers and are encoded into relative paths. Playwright accepts only the exact `https://render.invalid` origin, exact approved path, empty query, GET method, and image resource type at `packages/rendering/src/playwright-browser.ts:261`. Unknown refs, normalized traversal paths, alternate origins, and non-image use fail closed. |
| SSRF and network access | PASS. Every browser request is intercepted. Only the generated document and exact approved image routes can be fulfilled. The IMDS address `169.254.169.254` is rejected in the visual security test at `tests/visual/prd001d-rendering.test.ts:285`, and no loader request is made for the rejected URL. No caller-controlled remote URL reaches the asset loader. |
| Byte checksum and storage substitution | PASS. The adapter recomputes SHA-256 from returned bytes and compares it to the authorized manifest at `packages/rendering/src/playwright-browser.ts:283`. A mismatched loader response is rejected before content validation and browser decode. |
| Content type, corrupt image, and decompression | PASS after High remediation. Decoded format, exact dimensions, single-frame shape, input pixels, encoded size, and raw decoded size are enforced before route fulfillment. Mislabeled JPEG-as-PNG and high-decompression fixtures are rejected by the real adapter. Existing upload normalization and the eight-vector malicious rendering corpus remain green. |
| CSP and response hardening | PASS for the isolated render document. The paid source now explicitly denies base, connect, font, form, frame, object, and script capabilities, permits images only from self, and retains controlled inline CSS at `packages/rendering/src/paid-ad-render-sources.ts:206`. Asset responses are private, no-store, and `nosniff`. The controlled inline CSS is generated from escaped text and validated numeric geometry; all browser requests still pass through the exact route allowlist. The separate application-wide CSP Medium finding above remains open. |
| Image rendering and output | PASS. The browser fully decodes each image, verifies nonzero natural dimensions, and then captures the raster. The visual suite proves property, focal crop, lender identity, and safe-zone pixels appear at 1080 by 1080. Output MIME and dimensions remain checked before private storage. |

### Additional Remediation Files

| File | Security change |
|---|---|
| `packages/rendering/src/playwright-browser.ts` | Added encoded and decoded size bounds, Sharp content validation, exact route method/type/query checks, full browser image-decode verification, and hardened asset response headers. |
| `packages/rendering/src/paid-ad-render-sources.ts` | Expanded the isolated renderer CSP with explicit deny directives while preserving only self-hosted images and controlled inline CSS. |
| `tooling/tests/unit/production-foundation/prd001d-rendering.test.ts` | Added fail-closed asynchronous brand and asset authority coverage plus explicit CSP assertions. |
| `tests/visual/prd001d-rendering.test.ts` | Added real-browser rejection evidence for unknown routes, IMDS SSRF, path traversal, checksum mismatch, MIME mismatch, and decompression limits while retaining visible-pixel crop evidence. |

### Focused Verification

- Security-weapon deterministic scan: passed. No new secret, Unicode, vulnerable-pattern, environment-file, dependency, Next.js, or React finding.
- `pnpm audit:secrets`: passed across six source roots.
- `pnpm audit:dependencies`: passed with no known vulnerabilities.
- `pnpm --filter @oalo/rendering typecheck`: passed.
- `pnpm exec tsc --noEmit -p tsconfig.tooling.json`: passed.
- Focused Oxlint across the four changed source and test files: passed.
- Focused rendering unit suite: 21 tests passed.
- Rendering security corpus plus Meta paid-ad contract suite: 17 tests passed.
- Focused visual suite: 6 tests passed, including successful paid-only raster pixels and the new adversarial byte and routing cases.
- Prettier check on the focused files: passed.
- `git diff --check`: passed.
- Verification ran under local Node 22.19.0 and emitted the repository's expected Node 24.18.0 engine warning. No check failed because of the warning.

### Post-Remediation Gate

Security close-out is complete for the 001D-AC-021 remediation. No Realtor or collateral browser data path, SSRF, path traversal, content-type confusion, unchecked decompression, checksum bypass, or asynchronous authority fail-open remains in the audited surface. Quality may rerun against this post-security tree. No commit or push was performed.
