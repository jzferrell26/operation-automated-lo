# Security Audit Report: Actions major raid (`cursor/actions-major-ac42`)

**Audit date:** 2026-09-03
**Auditor:** security-guardian subagent
**Scope:** Delta vs `origin/main` (`0eff5f5`): `.github/workflows/ci.yml` SHA pins (checkout v7.0.1, cache v6.1.0, setup-node v7.0.0), raid ledger `library/requirements/reports/2026-09-03-actions-major-raid.md`, `NEXT_BATCH_LEDGER.md` watchdog rows, and map tip updates in `.cursor/rules/core/the-map.mdc` and `library/knowledge/private/product/project-map.md`. No application code. No lockfile change. No `@types/node` 26 / jsdom / jest-dom.
**Next.js version audited:** 16.2.11 (`apps/web/package.json` and `pnpm-lock.yaml`; unchanged by this raid)
**React version audited:** 19.2.7 (`pnpm-lock.yaml` resolved `react` / `react-dom`; unchanged by this raid)
**CVE watchlist last refreshed:** 2026-08-26 (`research/cve-watchlist.md`; 8 days old, not stale; 120-day freshness gate not triggered)

---

## Executive Summary

This audit ran first. No `*-qa-report.md` exists for `cursor/actions-major-ac42`. The raid is a GitHub Actions supply-chain pin bump, not an application change. Every `uses:` in `.github/workflows/ci.yml` is a 40-character SHA with a version comment; GitHub tag peel on 2026-09-03 matches the claimed releases. Workflow and job permissions stay `contents: read`. Checkout keeps `persist-credentials: false`. Setup-node keeps `node-version: 24.18.0` and `package-manager-cache: false`. Triggers stay `pull_request` / `push` / `workflow_dispatch`. Scorecard: 0 Critical, 0 High, 0 Medium, 0 Low. Financial and PII risk from this delta is none: no payment, auth, or PII surfaces changed. Verdict: **PASS**.

---

## Scorecard

| Category | Status | Findings |
|---|---|---|
| Financial / Payment Security | OK | 0 |
| PII Exposure | OK | 0 |
| Authentication & Authorization | OK | 0 |
| Injection Vulnerabilities | OK | 0 |
| Dependency Security | OK | 0 |
| Configuration & Headers | OK | 0 |
| Data Handling | OK | 0 |

Legend: **OK** = zero findings. **ATTN** = Medium/Low findings documented. **FAIL** = Critical/High findings (fixed in this session).

---

## Actions supply-chain verification (raid surface)

Checked against the raid plan and standing Actions rules. Line numbers are `.github/workflows/ci.yml`.

| Rule | Evidence | Result |
|---|---|---|
| 40-char SHA pins with version comments (not `@v7` tags) | checkout `@3d3c42e5aac5ba805825da76410c181273ba90b1` `# v7.0.1` at 27, 74, 118, 266; setup-node `@820762786026740c76f36085b0efc47a31fe5020` `# v7.0.0` at 32, 79, 123, 271; cache `@55cc8345863c7cc4c66a329aec7e433d2d1c52a9` `# v6.1.0` at 48, 95, 139, 287 | PASS |
| SHA equals peeled GitHub release tag | `actions/checkout@v7.0.1`, `actions/cache@v6.1.0`, `actions/setup-node@v7.0.0` resolved 2026-09-03 via GitHub git refs API; all three MATCH | PASS |
| `persist-credentials: false` on every checkout | 29, 76, 120, 268 (four of four checkout steps) | PASS |
| No `pull_request_target` / `workflow_run` | `on:` is `pull_request` (3), `push` (6), `workflow_dispatch` (10) only | PASS |
| `permissions: contents: read` at workflow and job level | workflow 12-13; jobs `verify` 23-24, `database` 68-69, `release-contract` 111-112, `preview-smoke` 256-257 | PASS |
| `package-manager-cache: false` retained | 35, 82, 126, 274 (four of four setup-node steps) | PASS |
| Node stays 24.18.0 | 34, 81, 125, 273; missing Node 26 is not a finding | PASS |
| Cache `path` / `key` / `restore-keys` unchanged | Diff vs `origin/main` rewrites only the `uses:` pin line | PASS |
| No mutable tag refs in `.github/workflows/` | Regex for `@vN` and short SHAs: no matches | PASS |
| No npm major / application / lockfile drift | `git diff --name-only origin/main...HEAD` is five files: workflow + two maps + two ledgers | PASS |

Checkout v7 refuses fork code on `pull_request_target` / `workflow_run`. This workflow does not use those events, so the v4 to v7 jump does not change the trusted-checkout model here. Setup-node v7 dummy `NODE_AUTH_TOKEN` removal does not apply: no `registry-url` is set.

---

## Critical Findings (fixed in this session)

None detected.

---

## High Findings (fixed in this session)

None detected.

---

## Medium Findings (follow-up required)

None detected.

---

## Low Findings (documentation only)

None detected.

---

## Deterministic scan (weapon `scripts/scan.sh`)

Ran from repo root. Outputs in gitignored `reports/scan-output/`. This raid did not change application code; hits below are repo-wide regression leads, not new findings.

| Check | Result |
|---|---|
| `pnpm audit --prod --audit-level=high` | 0 critical, 0 high, 0 moderate, 0 low (149 production dependencies) |
| CVE version gate | `next@16.2.11`, `react@19.2.7`, `react-dom@19.2.7` |
| Unicode / Rules File Backdoor (`.cursor/rules`, `AGENTS.md`) | clean; no zero-width or bidirectional codepoints, including edited `.cursor/rules/core/the-map.mdc` |
| Hardcoded secrets / `NEXT_PUBLIC_` client leaks | no live secrets; `NEXT_PUBLIC_PROVIDER_TOKEN` is a negative test only |
| JWT `alg` / prototype pollution / SQL or command injection shapes | none |
| Tracked `.env*` | none |
| `next.config.*` headers at repo root | not present (app headers live under `apps/web`; unchanged by this raid) |

Catalog A/B/C application patterns (IDOR, XSS, PCI raw-card, Stripe webhook, Server Action auth, PII logs) have no coordinates in the raid diff. Pre-existing `dangerouslySetInnerHTML` at `apps/web/src/app/layout.tsx:35` is the nonce-bound theme bootstrap from Raid A and is out of this raid.

---

## Dependency Audit

```text
pnpm audit --prod --audit-level=high
vulnerabilities: info=0 low=0 moderate=0 high=0 critical=0
totalDependencies: 149
advisories: {}
```

Full output: `reports/scan-output/npm-audit.json` (gitignored). Lockfile was not modified by this raid. Node remains 24.18.0. `@types/node` 26, jsdom 30, and jest-dom 7 were correctly left out of scope.

---

## Next.js Version Check

| CVE | Patched threshold | Current project | Status |
|---|---|---|---|
| **CVE-2025-29927** (middleware bypass) | 14.2.25 / 15.2.3 | next 16.2.11 | patched |
| **CVE-2025-55182** (React2Shell RCE) | React 19.0.1 / 19.1.2 / 19.2.1 | react 19.2.7 | patched |
| **CVE-2025-66478** (Next.js companion) | latest 14.x / 15.x / 16.x with patched React | next 16.2.11 | patched |
| **CVE-2026-27978** (null-origin CSRF) | latest; do not add `'null'` to `allowedOrigins` | next 16.2.11 | patched (watchlist pin check 2026-08-26) |

Sources: `research/cve-watchlist.md` (2026-08-26) and `guides/06-cve-tracker.md`. This raid did not bump Next or React.

---

## Files Changed (remediation)

| File | Change Summary |
|---|---|
| `library/requirements/reports/2026-09-03-actions-major-security-audit.md` | This report only. No remediation diffs. |

`git diff` after triage: no in-session code edits. Raid implementation files were already on the branch (`a8a3eb2`) and required no security patch. Diff reviewed and confirmed security-scoped on 2026-09-03.

---

## Recommended Follow-Up (architectural)

None. The raid is a SHA-pin of already-reviewed GitHub-owned Actions majors. Cache restore-keys remain the pre-existing `pnpm-store-${{ runner.os }}-` prefix; install still uses `pnpm install --frozen-lockfile`, so a stale store restore cannot rewrite the lockfile. That pattern predates this raid and is not opened as a finding.

Honesty bounds held: no deferred HighLevel ACs flipped; no production traffic claimed; G1 / G4 / G8 not reopened.

---

## Ordering Note

This audit ran before `quality-guardian`, as required. No `*-qa-report.md` for `cursor/actions-major-ac42` exists under `library/requirements/reports/` or PRD `qa/` folders. `quality-guardian` may run next against `library/requirements/reports/2026-09-03-actions-major-raid.md`.

---

## Verdict

**PASS.** Zero Critical, High, or Medium findings. Proceed to `quality-guardian`.

---

*Generated by `security-guardian` using `security-weapon`. See `.cursor/skills/security-weapon/` for methodology.*
