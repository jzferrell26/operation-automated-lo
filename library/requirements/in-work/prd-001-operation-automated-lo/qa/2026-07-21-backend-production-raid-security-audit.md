# Security Audit Report: Backend Production Raid

**Audit date:** 2026-07-21

**Auditor:** security-guardian subagent

**Branch:** `codex/oalo-production-backend-raid`

**Baseline:** `c3b25336f9594e2ed6fdc4bdcf25673a6284113b`

**Scope:** The full uncommitted diff from the baseline, including every application route, task authority, Trigger schedule, GHL and Anthropic transport, R2 storage, PostgreSQL adapter, RLS policy, `SECURITY DEFINER` function, grant, provider credential boundary, dependency, and test added or changed by the raid

**Next.js version audited:** 16.2.10

**React version audited:** 19.2.7
**CVE watchlist last refreshed:** 2026-04-25, within the 120-day freshness limit

## Executive Summary

The audit found two High vulnerabilities: task authority proofs were replayable against a modified task request, and publication cleanup could be directed at another tenant's known public object keys. Both were remediated with request-bound HMAC proofs and tenant-bound object namespaces plus database ownership verification. Three Moderate dependency advisories were also remediated. No Critical findings, unresolved dependency vulnerabilities, financial-data exposure, PII leakage, hardcoded credentials, or injection paths remain.

Three defense-in-depth Medium findings remain: no Content Security Policy, reuse of the R2 credential as an internal authorization key, and a presigned upload response that reports but cannot itself enforce the requested maximum byte count. Verification ran on Node 22.19.0 while the repository declares Node 24.18.0, so CI should repeat the clean gates on the declared runtime.

## Scorecard

| Category | Status | Findings |
|---|---|---:|
| Financial and payment security | OK | 0 |
| PII and secret exposure | OK | 0 |
| Authentication and authorization | FAIL, fixed | 1 High |
| Tenant isolation and data handling | FAIL, fixed | 1 High, 2 Medium open |
| Injection vulnerabilities | OK | 0 |
| Dependency security | ATTN, fixed | 3 Medium |
| Configuration and headers | ATTN | 1 Medium open |
| Application routes and external HTTP | OK | 0 |

`FAIL, fixed` records that a High issue was present and was closed in this session. It does not describe the final code state.

## Critical Findings

None detected.

## High Findings, Fixed in This Session

- [x] **Broken function-level authorization, task request replay** at `apps/tasks/src/core/production-runtime-composition.ts:52`, `apps/tasks/src/core/production-runtime-composition.ts:168`, and `apps/tasks/src/core/production-runtime-composition.ts:278`. The HMAC originally authenticated delivery and database identity but not the PDF manifest, Meta campaign ID, polling limit, or cleanup request. A valid proof could therefore be reused during its lifetime with a modified same-delivery request. The proof now carries a canonical request SHA-256 inside the signed payload, and all three wrappers pass the exact parsed request for constant-time authority verification at `apps/tasks/src/tasks/render-campaign-pdf.ts:30`, `apps/tasks/src/tasks/poll-meta-publish.ts:31`, and `apps/tasks/src/tasks/reconcile-publication-cleanup.ts:91`. A tampered-request rejection is verified at `tooling/tests/unit/task-workers/production-runtime-composition.test.ts:457`.

- [x] **Cross-tenant object deletion, publication cleanup IDOR** at `packages/storage/src/r2-object-store-client.ts:767` and `supabase/migrations/20260721010000_platform_foundation.sql:1319`. Cleanup formerly accepted any known `publicCampaignId`, version, and matching `campaigns/...` key while recording only the caller's database tenant, which could delete another tenant's public artifact. Published keys now use a SHA-256 tenant namespace at `packages/storage/src/production-storage.ts:52`; cleanup contracts persist `locationRef` at `packages/contracts/src/rendering-storage.ts:198` and `supabase/migrations/20260721010000_platform_foundation.sql:552`; the enqueue function verifies the reference against the active location's `ghl_location_id` before insertion and returns SQLSTATE `42501` on mismatch at `supabase/migrations/20260721010000_platform_foundation.sql:1322`; R2 accepts only the exact derived tenant prefix. The real database rejection is covered at `supabase/tests/reconciliation_primitives.pgtap.sql:273` and `packages/db/test/postgres-adapter.integration.test.mjs:446`.

## Medium Findings

### Fixed in this session

- [x] **PostCSS XSS advisory GHSA-qx2v-qp2m-jg93.** The transitive version was 8.4.31. It is pinned to 8.5.10 at `pnpm-workspace.yaml:31`.
- [x] **OpenTelemetry baggage memory exhaustion advisory GHSA-8988-4f7v-96qf.** The transitive version was 2.7.1. It is pinned to 2.8.0 at `pnpm-workspace.yaml:28`.
- [x] **esbuild development-server request advisory GHSA-67mh-4wv8-2f99.** The transitive version was 0.23.1. It is pinned to 0.25.0 and explicitly approved at `pnpm-workspace.yaml:25` and `pnpm-workspace.yaml:30`.

### Follow-up required

- [ ] **Content Security Policy absent, pre-existing and unchanged from baseline** at `apps/web/next.config.ts:5`. HSTS, anti-sniffing, framing, referrer, permissions, COOP, and CORP headers are present, but there is no CSP. Add a nonce or hash based policy that accommodates the fixed theme bootstrap without enabling arbitrary inline script.
- [ ] **Credential purpose reuse** at `packages/storage/src/r2-object-store-client.ts:386`. `secretAccessKey` signs both AWS SigV4 requests and the application's private-transfer authorization token. Add a separate server-only HMAC key so compromise of one purpose does not automatically compromise the other.
- [ ] **Presigned upload byte ceiling is not cryptographically enforced** at `packages/storage/src/r2-object-store-client.ts:690`. `maximumBytes` is returned to the caller but is not a signed exact `Content-Length` condition. Enforce an exact signed content length, use a bounded upload proxy, or verify and quarantine oversized uploads before downstream use.

## Low Findings

None detected.

## Explicit Clean Checks

- **Financial and PCI data:** None detected. No PAN, CVC, bank account, or raw Stripe payment handling exists in the audited diff.
- **PII and credentials:** None detected. GHL PIT, Anthropic key, R2 credentials, database URL, task HMAC key, and scheduled authority remain server-only and are not logged or returned by routes.
- **Injection:** None detected. Database values are parameterized, provider URLs are constructed from fixed allowlisted routes, object keys are parsed and prefix-bound, and no command execution sink was introduced.
- **RLS, grants, and `SECURITY DEFINER`:** None detected after remediation. Tenant tables use forced RLS, functions use an empty `search_path`, public privileges are revoked, and runtime grants are explicit. Publication cleanup now verifies both internal context and external location identity.
- **Application routes:** None detected. `/api/health/live`, `/api/health/ready`, and `/api/version` expose only bounded operational state, never credentials or PII. Readiness and version responses are `no-store`; no mutation route was introduced.
- **External HTTP:** None detected. GHL, Anthropic, and R2 use fixed HTTPS destinations, bounded timeouts and response sizes, strict response schemas, generic errors, and no raw provider-body logging.
- **Trigger schedule and logs:** None detected. The production-only cleanup schedule uses bounded leases, retries, TTL, HMAC authority, and structured logs limited to schedule metadata and aggregate counts.
- **Unicode and rules-file backdoors:** None detected. The deterministic scan found no zero-width or bidirectional control characters.
- **Unsafe client rendering and storage:** None detected. The only `dangerouslySetInnerHTML` use is the fixed theme bootstrap and no sensitive value is written to browser storage.

## Dependency Audit

Final `pnpm audit --json` summary:

```text
critical: 0
high: 0
moderate: 0
low: 0
info: 0
total dependencies evaluated: 637
```

The production-only deterministic scan also reported zero advisories across 188 dependencies. Full output is ephemeral local scratch under `reports/scan-output/` and is not part of the deliverable.

## Framework CVE Check

| CVE | Tracked patched threshold | Current project | Status |
|---|---|---|---|
| CVE-2025-29927, Next.js middleware bypass | 14.2.25 or 15.2.3 | Next.js 16.2.10 | Patched |
| CVE-2025-55182, React2Shell RCE | React 19.0.1, 19.1.2, or 19.2.1 | React 19.2.7 | Patched |
| CVE-2025-66478, Next.js companion advisory | Current supported patched release | Next.js 16.2.10 | Patched |
| CVE-2026-27978, null-origin CSRF | Current supported patched release | Next.js 16.2.10 | Patched |

The additional Next.js and RSC upgrade-only issues in `security-weapon/guides/07-known-critical-cves.md` were checked against the resolved lockfile. No tracked vulnerable framework version remains.

## Verification Evidence

| Command | Result |
|---|---|
| `security-weapon/scripts/scan.sh` | PASS, zero dependency, Unicode, secret, PCI, injection, JWT, and CORS findings |
| `pnpm exec vitest run` on six security-focused files | PASS, 64 of 64 tests |
| `pnpm test:unit` | PASS, 41 files and 354 of 354 tests, 87.43 percent statement coverage |
| `pnpm test:db` | PASS, database orchestration plus all pgTAP suites, including reconciliation 45 of 45 and tenant isolation 13 of 13 |
| `pnpm format:check` | PASS |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS, 16 packages plus tooling |
| `pnpm jscpd` | PASS, zero clones |
| `pnpm audit:secrets` | PASS across six source roots |
| `pnpm audit --json` | PASS, zero vulnerabilities at every severity |
| `git diff --check` | PASS |

## Release-Gate Portability Addendum

After the original audit, the exact Node 24.18.0 release command exposed a launcher-only failure because the temporary Node distribution did not bundle npm beside `node.exe`. The database runner now accepts only an existing absolute `npm_execpath` whose basename is one of `npm-cli.js`, `pnpm.js`, `pnpm.cjs`, or `pnpm.mjs`. It executes that JavaScript CLI directly with the current Node process, keeps Supabase pinned to 2.109.1, uses `shell: false`, and retains fixed command arguments. No request data, tenant data, credential, or user input can select the executable path or command arguments.

Security Guardian reviewed this delta after implementation. No new injection, command construction, credential exposure, network-target expansion, or privilege boundary was introduced. Exact Node 24.18.0 checks passed: 6 of 6 database orchestration tests, all 126 pgTAP assertions after a clean reset, lint, 16-package plus tooling typecheck, the six-root secret audit, and the dependency audit with 0 known vulnerabilities. The release threshold remains 0 Critical and 0 unresolved High.

## Files Changed by Security Remediation

| Files | Change summary |
|---|---|
| `apps/tasks/src/core/production-runtime-composition.ts`, `apps/tasks/src/core/production-task-bindings.ts`, and three task wrappers | Bind HMAC authority to the complete task request |
| `packages/contracts/src/rendering-storage.ts`, `packages/storage/src/production-storage.ts`, `packages/storage/src/production-object-store.ts`, and `packages/storage/src/r2-object-store-client.ts` | Bind published artifacts and cleanup deletion to a tenant namespace |
| `packages/db/src/publication-cleanup.ts` and `supabase/migrations/20260721010000_platform_foundation.sql` | Persist and independently verify cleanup tenant identity |
| Focused task, storage, database, integration, and pgTAP tests | Prove tampered request and cross-tenant cleanup rejection |
| `pnpm-workspace.yaml` and `pnpm-lock.yaml` | Pin patched transitive dependencies |

The original security diff was reviewed with `git diff`, `git diff --check`, and targeted path inspection on 2026-07-21 before the release commit. No push, deployment, or live provider call was made during either security pass.

## Recommended Follow-up

- Resolve the three open Medium findings before enabling production traffic.
- Repeat the verification suite on the declared Node 24.18.0 runtime in CI.
- Run `quality-guardian` now. This audit ran in the required order before quality review.

*Generated by `security-guardian` using `security-weapon`.*
