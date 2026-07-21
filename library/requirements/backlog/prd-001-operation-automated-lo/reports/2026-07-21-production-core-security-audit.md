# Production Core Security Audit

**Date:** 2026-07-21
**Scope:** Remaining locally raidable acceptance criteria across PRD-001j and PRD-001a through PRD-001i on `codex/oalo-production-core-raid`
**Guardian:** `security-guardian`, armed with `security-weapon`
**Verdict:** PASS WITH MODERATE FOLLOW-UP

## Executive summary

The production-core implementation has no Critical or High security findings and no remediation-worthy code finding. Deterministic scans and manual trust-boundary review found no hardcoded secret, token plaintext, raw card data, unsafe JWT handling, SQL injection, command injection, wildcard CORS, Unicode concealment, sensitive browser storage, or unvalidated production-provider fallback.

Three Moderate transitive dependency advisories remain. None is directly reachable through the shipped production paths under the current fail-closed boundaries. They do not block this raid, but they must remain visible until their owning dependency chains provide compatible patched versions.

## Finding counts

| Severity | Open | Remediated during audit |
| --- | ---: | ---: |
| Critical | 0 | 0 |
| High | 0 | 0 |
| Moderate | 3 | 0 |
| Low | 0 | 0 |

## Security scorecard

| Area | Result | Evidence |
| --- | --- | --- |
| Authentication and authorization | PASS for current scope | HighLevel OAuth, signed context, token refresh, and live tenant sessions remain explicitly deferred and fail closed. No synthetic or fixture path grants production authority. |
| Provider isolation | PASS | `packages/ghl/src/production-meta-read-transport.ts` exposes only exact allowlisted Meta GET routes, validates the active location, strictly parses responses, and has no default network or authentication implementation. |
| Task and idempotency boundaries | PASS | `apps/tasks/src/core/production-task-bindings.ts` requires configured production ports and a database-backed idempotency guard. Registered tasks cannot fall back to fixtures. |
| Rendering isolation | PASS | `packages/rendering/src/playwright-browser.ts` denies external network access, serves only the controlled local render host, and verifies exact asset checksums before rendering. |
| Object storage | PASS for the local contract | `packages/storage/src/production-object-store.ts` strictly verifies private and public receipt identities and records immutable withdrawal evidence. Deployed bucket policy remains an external environment proof. |
| Onboarding persistence | PASS for the local contract | `packages/application/src/onboarding-progress.ts` uses server-owned state and compare-and-swap concurrency. Its caller must derive and authorize scope from a validated server session when deferred authentication is introduced. |
| UI authority | PASS | Delivered browser surfaces remain synthetic and no-write. Approval, launch, artifact, and tenant authority remain server-owned and fail closed. |
| AI execution | PASS for the local contract | `packages/ai/src/production-generation.ts` uses injected primary and fallback transports, strictly validates boundaries, and provides no embedded secret, network client, or default provider. Live configured model execution remains deferred. |
| PII and financial data | PASS | Logs, traces, analytics, support schemas, task payloads, URLs, and browser state omit secrets, raw borrower data, raw card data, and full prompts or samples. |
| Dependency posture | ATTENTION | `pnpm audit --audit-level=high` reports 0 Critical, 0 High, and 3 Moderate transitive advisories. |

## Open Moderate findings

### SEC-PC-001: PostCSS transitive advisory

**Evidence:** The Next.js dependency chain resolves `postcss@8.4.31`, affected by GHSA-qx2v-qp2m-jg93. The patched range begins at 8.5.10.

**Impact:** The advisory concerns unsafe stringification of attacker-controlled CSS. The application does not accept arbitrary user CSS, and tenant accent values are projected from a fixed server allowlist.

**Required follow-up:** Upgrade through the owning Next.js dependency path when a compatible release resolves a patched PostCSS version. Keep arbitrary tenant CSS prohibited.

**Disposition:** Moderate and non-blocking for the current paths.

### SEC-PC-002: OpenTelemetry core transitive advisory

**Evidence:** The Trigger.dev dependency chain resolves `@opentelemetry/core@2.7.1`, affected by GHSA-8988-4f7v-96qf. The patched range begins at 2.8.0.

**Impact:** Unbounded baggage processing can increase memory consumption if untrusted baggage reaches the affected instrumentation path. The local application and task boundaries do not accept arbitrary baggage as business input.

**Required follow-up:** Upgrade the Trigger.dev and OpenTelemetry dependency chain to a compatible version that resolves `@opentelemetry/core` 2.8.0 or later. Bound and reject oversized incoming baggage at production ingress.

**Disposition:** Moderate and non-blocking for the current paths.

### SEC-PC-003: esbuild development-server advisory

**Evidence:** The Trigger.dev development dependency chain resolves `esbuild@0.23.1`, affected by GHSA-67mh-4wv8-2f99. The patched range begins at 0.24.3.

**Impact:** The affected behavior concerns requests to the esbuild development server. That server is not the deployed Next.js or registered task runtime.

**Required follow-up:** Upgrade the Trigger.dev dependency chain when compatible. Never expose the development server to an untrusted network.

**Disposition:** Moderate and non-blocking because the affected component is development-only in this repository.

## Trust-boundary decisions

- HighLevel authentication, live OAuth, signed context, token refresh, and tenant session validation remain deferred and fail closed.
- Meta production reads use an injected transport with an exact GET-only route allowlist, active-location binding, strict response parsing, and no default network or authentication client.
- Registered production tasks require configured ports and a database-backed idempotency guard. Fixture fallback is rejected.
- Playwright rendering denies external network access and validates exact checksums for controlled local assets.
- The object-store port verifies private and public receipt identities, while deployed bucket policy and cloud access controls remain external evidence.
- Onboarding persistence is server-owned, but the future caller must derive and authorize its scope from a validated server session.
- Browser UI remains synthetic and no-write. It cannot create provider authority or consequential action state.
- AI provider routing is injected and strictly parsed, with no embedded secret, default provider, or implicit network path.

## External and deferred evidence

Live provider connectivity, provider data terms, KMS and environment isolation, deployed storage policy, production smoke testing, HighLevel authentication, and real model execution remain external or explicitly deferred. These constraints are represented as blocked-external or in-progress ledger rows and are not silently claimed as local proof.

## Verification evidence

- Canonical `pnpm verify`: pass in 140.1 seconds.
- Typecheck: 16 packages pass.
- Production builds: 16 packages pass, including the Next.js production build.
- Unit tests: 34 files and 256 tests pass with 100 percent application coverage.
- Integration tests: 8 files and 22 tests pass.
- Contract and security tests: 7 files and 29 tests pass.
- Browser tests: 22 pinned Chromium tests pass.
- Visual tests: 2 files and 7 tests pass, including real Chromium raster and PDF evidence.
- Duplicate-code gate: 0 clones across 162 files.
- Package boundary audit: 16 packages and the rejection fixture pass.
- Product-type audit: pass.
- Secret audit: pass.
- Dependency threshold: pass with 0 Critical, 0 High, and 3 Moderate advisories.
- Security Weapon static and manual review: no hardcoded secret, token plaintext, raw card data, unsafe JWT pattern, SQL injection, command injection, wildcard CORS, Unicode concealment, sensitive browser storage, or unvalidated production fallback finding.
- Resolved framework versions: Next.js 16.2.10 and React 19.2.7, outside the applicable Critical watchlist ranges reviewed by the Weapon.

## Post-CI-repair security rerun

GitHub run `29825818357` exposed two clean-runner contract failures. The repair adds explicit source aliases for `@oalo/ghl` and `@oalo/rendering` to the test-only Vitest resolver and creates synthetic migration-compatibility evidence in the release-contract job before manifest validation.

Security reviewed the two-file delta after the full canonical gate passed again. Workflow permissions remain read-only, every action remains pinned to its existing commit SHA, no secret or external input enters the generated runtime manifests, every generated document is marked `fixtureOnly: true`, and all files stay under `RUNNER_TEMP`. The preview candidate continues to fail closed when production evidence is required. Secret, package-boundary, product-type, and dependency-threshold audits pass with the same three Moderate advisories and no new finding.

## Close-out

No Critical or High remediation remains. Quality Guardian may proceed. The three Moderate transitive dependency advisories remain documented as non-blocking follow-up work, and the external or deferred production proofs remain explicit in the execution ledger.
