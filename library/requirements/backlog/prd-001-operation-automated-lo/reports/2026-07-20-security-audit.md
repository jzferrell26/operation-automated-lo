# Security Audit Report: Operation Automated LO Phase 0

- **Audit date:** 2026-07-20
- **Auditor:** security-guardian subagent
- **Scope:** Working tree changes from baseline `f3f2b05d33ffb5ca1657278f85ab816fba147727`, including `apps/**`, `packages/**`, `tests/**`, `tooling/**`, `.github/**`, `supabase/**`, root manifests and delivery configuration
- **Next.js version audited:** 16.2.10, exact resolved version
- **React version audited:** 19.2.7, exact resolved version for React and React DOM
- **CVE watchlist last refreshed:** 2026-04-24, 87 days old and within the 120-day freshness limit

---

## Executive Summary

No Critical or High vulnerability was detected in the Phase 0 React, Next.js, TypeScript, Node.js, Supabase, or CI surface. One Medium configuration finding was remediated with a tested non-CSP security-header baseline; four Medium follow-ups remain: three accepted transitive dependency advisories and the planned per-request nonce CSP required before interactive or tenant routes are authorized. Financial and PII exposure risk is low in this phase because the executable surface contains synthetic fixtures only, rejects secrets and customer data, has no production feature traffic, and exposes no live provider transport.

Phase 0 implementation QA has not run. The existing quality reports apply to documentation-only branches and explicitly state that no executable implementation was in their audit boundary, so this security close-out is correctly ordered before implementation quality verification.

---

## Scorecard

| Category | Status | Findings |
| --- | --- | ---: |
| Financial / Payment Security | OK | 0 |
| PII Exposure | OK | 0 |
| Authentication & Authorization | OK | 0 |
| Injection Vulnerabilities | OK | 0 |
| Dependency Security | ATTN | 3 Medium |
| Configuration & Headers | ATTN | 1 fixed Medium, 1 open Medium |
| Data Handling | OK | 0 |

Legend: **OK** = zero findings, **ATTN** = Medium or Low findings documented, **FAIL** = Critical or High findings.

---

## Critical Findings (fixed in this session)

None detected.

---

## High Findings (fixed in this session)

None detected.

---

## Medium Findings

- [x] **Missing baseline security headers** `apps/web/next.config.ts:5` - The initial Next.js configuration emitted no explicit transport, MIME-sniffing, framing, referrer, permissions, or cross-origin isolation headers. Seven headers now apply to every route and are asserted by `tests/security/web-security-headers.test.ts:5`.
- [ ] **Nonce-based CSP not yet installed** `apps/web/next.config.ts:5` - A static CSP without a nonce would break Next.js inline bootstrap behavior, and an `unsafe-inline` policy would provide false assurance. Add the route-class-specific nonce CSP from the threat model before Phase 2 introduces interactive, embedded, tenant, or theme-bootstrap behavior.
- [ ] **PostCSS transitive XSS advisory** `pnpm-lock.yaml:2374` - `postcss@8.4.31` is reported under GHSA-qx2v-qp2m-jg93. The Phase 0 app does not stringify tenant-controlled CSS, but the package should move to 8.5.10 or later through a tested Next.js-compatible resolution.
- [ ] **OpenTelemetry baggage allocation advisory** `pnpm-lock.yaml:736` - `@opentelemetry/core@2.7.1` is reported under GHSA-8988-4f7v-96qf. Phase 0 has no inbound provider or production telemetry traffic. Upgrade through a compatible Trigger.dev release or a regression-tested override.
- [ ] **esbuild development-server advisory** `pnpm-lock.yaml:1695` - `esbuild@0.23.1` is reported under GHSA-67mh-4wv8-2f99 through the Trigger.dev development toolchain. No development server is exposed by the audited verification path. Upgrade through Trigger.dev or a regression-tested override.

---

## Low Findings

None detected.

---

## Dependency Audit

```text
pnpm audit --audit-level=high
Critical: 0
High: 0
Moderate: 3 in the full tree, 2 in production dependencies
Low: 0

Moderate advisories:
- GHSA-qx2v-qp2m-jg93, postcss 8.4.31, production transitive through Next.js
- GHSA-8988-4f7v-96qf, @opentelemetry/core 2.7.1, production transitive through Trigger.dev
- GHSA-67mh-4wv8-2f99, esbuild 0.23.1, development transitive through Trigger.dev
```

The deterministic scan output was reviewed and removed. `reports/scan-output/` is gitignored and no scan scratch is part of the deliverable.

---

## Next.js and React Version Check

| CVE | Patched threshold | Current project | Status |
| --- | --- | --- | --- |
| CVE-2025-29927, middleware bypass | 14.2.25 / 15.2.3 | Next.js 16.2.10 | Patched; no middleware authorization surface exists |
| CVE-2025-55182, React2Shell RCE | React 19.2.2 or later per current upgrade catalog | React 19.2.7 | Patched |
| CVE-2025-66478, Next.js companion | Current patched Next.js | Next.js 16.2.10 | Patched |
| CVE-2025-55184, RSC denial of service | Next.js 16.0.10 or later on the 16.0 line | Next.js 16.2.10 | Patched |
| CVE-2025-55183, Server Function source exposure | Next.js 16.0.10 or later on the 16.0 line | Next.js 16.2.10 | Patched; no Server Actions exist |
| CVE-2026-27978, null-origin Server Action CSRF | Current patched Next.js | Next.js 16.2.10 | Patched; no Server Actions exist |

`pnpm why next`, `pnpm why react`, and `pnpm why react-dom` each resolved exactly one version: Next.js 16.2.10 and React / React DOM 19.2.7.

---

## Catalog Sweep Results

- **Secrets and environment:** No `.env` file is tracked. The source secret audit passed across `.github`, apps, packages, Supabase, tests, and tooling. No `NEXT_PUBLIC_` secret, private key, API key, JWT-shaped credential, or hardcoded payment credential was detected.
- **Hidden Unicode:** No zero-width, bidi-override, isolate, word-joiner, or BOM backdoor codepoint was detected in the executable, CI, configuration, or instruction surface.
- **Routes and actions:** The only route handlers are safe liveness and version endpoints. There is no middleware authorization boundary, Server Action, cookie, JWT verifier, database query, upload endpoint, payment endpoint, webhook, or user-controlled HTML sink in Phase 0.
- **React components:** No `dangerouslySetInnerHTML`, `eval`, `new Function`, client storage, external image source, enabled lead form, checkout, or provider mutation was detected. The demo uses static synthetic JSX and disabled controls.
- **Provider fixtures:** HighLevel fixtures are strict, sanitized, hash-protected, synthetic, and externally BLOCKED. Live capture throws by construction at `packages/ghl/src/live-capture.ts:18`.
- **CI:** Workflow permissions are read-only, checkout credentials are not persisted, all six external action uses are pinned to immutable SHAs, Node and pnpm are exact, and previews set stub-only and synthetic-only guards.
- **Supabase:** The project is local-only and unlinked, uses a dedicated 5542x port block, seeds no records, and asserts that Phase 0 has no tenant or provider-operation table. No production database, credential, RLS, or migration surface exists yet.
- **Rendering:** The malicious corpus rejects image active content, SVG, HTML, remote URLs including metadata endpoints, oversized files, mislabeled content, corrupt encoding, and high-decompression inputs without any network call.

---

## Phase 0 Security Criteria

| Criterion | Result | Evidence |
| --- | --- | --- |
| P0-018 malicious rendering inputs | DONE | `tests/security/rendering-input-security.test.ts:16`, eight required vectors rejected with zero network calls |
| P0-019 threat model and provider contract register | DONE | `tests/fixtures/security/phase0-threat-coverage.json:1`, strict schema in `packages/test-support/src/security-coverage.ts:65`, executable completeness and reference checks in `tests/security/phase0-boundary.test.ts:57` |
| P0-021 no production feature traffic | DONE | `packages/application/src/index.ts:11`, fail-closed environment parsing at `packages/config/src/index.ts:5`, blocked provider contracts, disabled adapter, and no-outbound-transport test at `tests/security/phase0-boundary.test.ts:80` |

All external gates G1 through G8 remain `BLOCKED`. Nothing in this audit converts synthetic fixture evidence into provider, Marketplace, legal, lender, commercial, or production authorization.

---

## Verification Evidence

```text
Exact runtime: Node 24.18.0 through the checksum-verified local Node distribution
pnpm install --frozen-lockfile: PASS, 17 workspace projects
pnpm test:contracts: PASS, 7 files and 27 tests
pnpm format:check: PASS
pnpm lint: PASS
pnpm typecheck: PASS, 16 of 16 packages
pnpm audit:secrets: PASS
Hidden-Unicode scan: PASS, 0 findings
pnpm audit --audit-level=high: PASS, 0 Critical and 0 High
pnpm verify: PASS in 67.1 seconds
Test projects: PASS, 12 files and 35 tests total
Build: PASS, 16 of 16 workspace packages; Next.js produced only /, /demo, /api/health/live, and /api/version
```

---

## Files Changed (security remediation and harness)

| File | Change summary |
| --- | --- |
| `.gitignore` | Prevented deterministic scan scratch from entering source control |
| `apps/web/next.config.ts` | Added tested route-wide non-CSP security headers |
| `packages/config/src/index.ts` | Made production, live-provider, and non-synthetic Phase 0 settings fail closed |
| `packages/test-support/src/render-security.ts` | Added strict malicious media assessment harness |
| `packages/test-support/src/security-coverage.ts` | Added strict threat, test, and provider-gate register validation |
| `packages/test-support/src/index.ts` | Exported security harness contracts |
| `tests/fixtures/security/rendering/v1/malicious-inputs.json` | Added eight required malicious rendering vectors |
| `tests/fixtures/security/phase0-threat-coverage.json` | Added executable threat-to-test and provider-contract register |
| `tests/security/rendering-input-security.test.ts` | Proved rejection and zero-network behavior for P0-018 |
| `tests/security/phase0-boundary.test.ts` | Proved complete coverage mapping and no production or live-provider path |
| `tests/security/web-security-headers.test.ts` | Proved the route-wide header baseline |
| `vitest.config.ts` | Wired the security tests into the canonical contract project |

The working tree diff and status were reviewed on 2026-07-20. Security-owned changes are limited to the files above and this report. `EXECUTION_LEDGER.md` was not edited by security-guardian.

---

## Recommended Follow-Up

- Add the threat-model nonce CSP with separate embedded, first-party, handoff, and public route policies before Phase 2 or any route begins accepting tenant or user data.
- Resolve the three Moderate transitive advisories through compatible upstream releases or regression-tested overrides. Keep `pnpm audit --audit-level=high` as a release blocker.
- Preserve the executable threat register as phases are authorized. Replace each deferred entry with a named passing test before its planned phase exits.
- Re-run security-guardian if a route handler, Server Action, credential, remote migration, provider transport, production deployment, customer data path, payment path, or live callback is introduced.

---

## Post-Repair Security Refresh

- **Refresh scope:** Authorized Phase 0 repair files changed after the initial security audit.
**Refresh result:** PASS. No new Critical, High, Medium, or Low security finding was confirmed. The four previously documented Medium follow-ups remain unchanged.

### Final repair file inventory

| File | Security review result |
| --- | --- |
| `README.md` | PASS. Phase 0 limits, local destructive database scope, Trigger.dev warning, provider restrictions, and blocked external gates are accurate and explicit. |
| `apps/tasks/src/core/validate-render-fixtures.ts` | PASS. Parses unknown input through the versioned request schema and returns a strict result with production traffic and network access fixed to `false`. |
| `apps/tasks/src/local/run-phase-zero.ts` | PASS. Imports only the local core and Zod, uses a frozen constant request, rejects every CLI argument, and emits no secret, PII, provider identifier, or remote destination. |
| `apps/tasks/src/tasks/validate-render-fixtures.ts` | PASS. The Trigger.dev adapter delegates to the same validated core and adds no provider operation. It is not imported by the local runner. |
| `apps/tasks/src/index.ts` | PASS. Exports the core and separately gated task adapter. The local executable bypasses this root export and imports the core path directly. |
| `apps/tasks/package.json` | PASS. `run:local` builds the bounded workspace slice and runs the compiled local entry point. `trigger dev` remains a separate command and README warns that it needs separate authorization. |
| `package.json` | PASS. `tasks:local` delegates only to the task package local script. Verification, secret, dependency, boundary, and type gates remain intact. |
| `pnpm-lock.yaml` | PASS. No dependency regression. Next.js remains 16.2.10, React remains 19.2.7, and Trigger.dev SDK and CLI remain 4.5.5. The same three Moderate advisories remain, with zero Critical or High advisory. |
| `library/requirements/backlog/prd-001-operation-automated-lo/reports/2026-07-20-security-audit.md` | Updated with this refresh evidence. |

### Local runner boundary proof

- `pnpm tasks:local` completed successfully and returned exactly `fixtureSet: rendering-v1`, schema version 1, `phase: phase-0-evidence-harness`, `productionTrafficEnabled: false`, and `networkAccessRequired: false`.
- Node ESM runtime tracing of `apps/tasks/dist/src/local/run-phase-zero.js` found zero `@trigger.dev` or `trigger.dev` module loads. The compiled entry point imports only Zod and `../core/validate-render-fixtures.js`.
- `pnpm tasks:local -- unexpected-argument` exited 1 through the zero-length Zod argument schema and emitted no success result.
- No `fetch`, Axios, Node HTTP request, command execution, shell spawn, dynamic evaluation, secret, token, customer, borrower, email, or phone path exists in the local runner or core.
- The README does not imply that Trigger.dev is safe to run locally. It explicitly prohibits the Trigger CLI for fixture validation and requires separate authorization for a designated non-production project.

### Refresh commands and results

```text
node --version
PASS: v24.18.0

pnpm --version
PASS: 11.15.1

pnpm install --frozen-lockfile
PASS: 17 workspace projects, already up to date

pnpm tasks:local
PASS: fixture-only result, productionTrafficEnabled false, networkAccessRequired false

NODE_DEBUG=esm node apps/tasks/dist/src/local/run-phase-zero.js
PASS: 0 Trigger.dev runtime import matches

pnpm tasks:local -- unexpected-argument
PASS: rejected with exit code 1, no success object emitted

Hidden Unicode scan over all eight repair files
PASS: 0 hidden Unicode findings

Security pattern sweep over README and task runner sources
PASS: no unexpected network, provider, command, secret, PII, or dynamic-code path

pnpm audit --audit-level=high
PASS: 0 Critical, 0 High, 3 previously documented Moderate advisories

pnpm why next
PASS: one resolved Next.js version, 16.2.10

pnpm why react
PASS: one resolved React version, 19.2.7

pnpm why @trigger.dev/sdk
PASS: one resolved SDK version, 4.5.5

pnpm why trigger.dev
PASS: one resolved CLI version, 4.5.5

pnpm verify
PASS in 22.7 seconds under exact Node 24.18.0 and pnpm 11.15.1
PASS: 12 test files, 35 tests, 16 of 16 package typechecks and builds
PASS: formatting, lint, database, contracts, visual, preview, duplication, boundaries, product types, secrets, dependencies, and build
```

### Refresh conclusion

The post-repair local runner does not escape the Phase 0 boundary. It cannot import or execute Trigger.dev through `pnpm tasks:local`, rejects all supplied arguments before producing output, contains no live provider or production feature path, and introduces no dependency or documentation security regression. No security remediation was required during this refresh. `EXECUTION_LEDGER.md` was not edited.

---

## CI Repair Security Refresh

- **Refresh scope:** The only implementation change is `package-manager-cache: false` on both SHA-pinned `actions/setup-node` steps in `.github/workflows/ci.yml:35` and `.github/workflows/ci.yml:84`.
- **Refresh result:** PASS. No new Critical, High, Medium, or Low security finding was confirmed.
- **Permission boundary:** PASS. Global and job permissions remain `contents: read`; checkout credentials remain non-persistent; no secret context, write permission, privileged trigger, or new environment authority was added.
- **Action integrity:** PASS. Every external action remains pinned to a 40-character commit SHA. `git ls-remote` matched setup-node v5.0.0 to `a0853c24544627f65ddf259abe73b1d18a591444`, cache v4.3.0 to `0057852bfaa89a56745cba8c7296529d2fc39830`, and checkout v4.2.2 to `11bd71901bbe5b1630ceea73d27597364c9af683`. The pinned setup-node `action.yml` defines `package-manager-cache` as the supported switch for disabling automatic package-manager caching.
- **Cache safety:** PASS. In both jobs the explicit `actions/cache` step runs only after `corepack enable`, exact pnpm version confirmation, and `pnpm store path --silent` resolution. Its path comes only from the named store-path step, its primary key is scoped by runner OS and `pnpm-lock.yaml` hash, and installation remains frozen-lockfile enforced. The repair removes setup-node's implicit cache attempt without adding another cache writer, mutable key input, cross-OS archive, secret, or untrusted event expression. Pull-request cache scope, the content-addressed pnpm store, read-only workflow permissions, and frozen dependency resolution prevent this change from creating a privileged cache-poisoning path.
- **Expression and command safety:** PASS. No pull-request title, body, branch name, actor-controlled input, or other untrusted event field is interpolated into a shell command. Existing expressions are limited to workflow concurrency, event classification, runner OS, a prior step output, and `hashFiles('pnpm-lock.yaml')`.
- **Scope control:** PASS. No action, trigger, job, command, dependency, permission, secret, provider path, or production path was added. The repair changes exactly two boolean workflow inputs.

### CI refresh verification evidence

```text
git diff -- .github/workflows/ci.yml
PASS: exactly two added package-manager-cache: false inputs

git ls-remote for actions/setup-node v5.0.0, actions/cache v4.3.0, and actions/checkout v4.2.2
PASS: all workflow SHAs match their declared upstream tags

actionlint 1.7.7, container digest sha256:887a259a5a534f3c4f36cb02dca341673c6089431057242cdc931e9f133147e9
PASS: 0 workflow findings

pnpm exec prettier --check .github/workflows/ci.yml
PASS

Static workflow assertions
PASS: both setup-node cache disables present
PASS: all six action uses SHA-pinned
PASS: no write permission, secret context, privileged trigger, or hidden Unicode
PASS: both explicit cache steps follow Corepack and pnpm store-path resolution
PASS: both cache paths use steps.pnpm-store.outputs.path
PASS: both primary keys bind runner OS and pnpm-lock.yaml hash

Exact Node 24.18.0 and pnpm 11.15.1
pnpm install --frozen-lockfile && pnpm verify
PASS with exit code 0 in 26.8 seconds
PASS: 17 workspace projects installed, 12 test files and 35 tests
PASS: 16 of 16 package typechecks and builds
PASS: formatting, lint, database, contracts, visual, preview, duplication, boundaries, product types, secrets, dependencies, and build
PASS: 0 Critical and 0 High dependency advisories; 3 previously documented Moderate advisories unchanged
```

### CI refresh conclusion

The CI-only repair safely disables setup-node's premature automatic package-manager cache lookup while preserving the explicit, pinned, lockfile-bound pnpm store cache. It introduces no permission expansion, action-pin regression, cache-poisoning escalation, untrusted input injection, secret exposure, supply-chain regression, or Phase 0 scope expansion. No implementation or workflow remediation was required. `EXECUTION_LEDGER.md` and the QA report were not edited.

---

*Generated by security-guardian using security-weapon.*
