# Security Audit Report: Reverse-review High remediation

**Audit date:** 2026-08-26
**Auditor:** security-guardian (security-weapon)
**Scope:** Diff on `cursor/reverse-review-remediation-ac42` remediating reverse-review H1/H2/H3 and process M1/M6/M7 (ready probe isolation, lead-routing try boundary, `SET LOCAL ROLE`, CVE watchlist, PIT ledger cross-refs, secret scanner patterns).
**Next.js version audited:** 16.2.11 (`apps/web/package.json`)
**React version audited:** 19.2.7
**CVE watchlist last refreshed:** 2026-08-26 (within 120 days)

---

## Executive Summary

Remediation closes the three High findings from the 2026-08-26 reverse review without opening production traffic or inventing live HighLevel evidence. Highest residual risk remains external: HighLevel app approval still blocks Wave 1. No Critical findings. No new High findings in this diff. `pnpm audit --audit-level=high` clean; secret audit passes with expanded Stripe webhook/test/restricted-key patterns.

---

## Scorecard

| Category | Status | Findings |
|---|---|---|
| Financial / Payment Security | OK | 0 (scanner patterns extended; no payment path enabled) |
| PII Exposure | OK | 0 |
| Authentication & Authorization | OK | 0 (G2 still fail-closed / deferred) |
| Injection Vulnerabilities | OK | 0 (`SET LOCAL ROLE` uses hardcoded identifiers) |
| Dependency Security | OK | 0 |
| Configuration & Headers | OK | 0 |
| Data Handling | OK | 0 |

Legend: **OK** = zero findings · **ATTN** = Medium/Low findings documented · **FAIL** = Critical/High findings (fixed in this session).

---

## Critical Findings (fixed in this session)

None detected.

---

## High Findings (fixed in this session)

- [x] **H1 Ready probe isolation** `apps/web/src/app/api/health/ready/route.ts` — Preview/staging previously invoked live Anthropic/Postgres/R2 probes when secrets existed. Gate now requires `providerMode === "live"`; non-live non-local tiers use isolation stub checks. Readiness singleton fingerprints env so later configs are not sticky-wrong.
- [x] **H2 Lead-routing classification boundary** `packages/ghl/src/lead-routing.ts` — `state.load` / `reconcile` / first `save` moved inside the `try` so failures classify and retry like other provider steps.
- [x] **H3 Runtime role activation** `packages/db/src/transaction-context.ts` — Tenant and support transactions issue `SET LOCAL ROLE app_runtime` / `support_runtime` after `BEGIN` (opt-out via `OALO_DB_ASSUME_RUNTIME_ROLE=false` for admin tooling only). Documented in `docs/operations/database-runtime-role.md`.

---

## Medium Findings (follow-up required)

- [x] **M1 CVE watchlist stale** `.cursor/skills/security-weapon/research/cve-watchlist.md` — Refreshed 2026-08-26; added Trigger.dev pin note.
- [x] **M6 PIT seam docs** `NEXT_BATCH_LEDGER.md`, G2/G3 evidence packs — Cross-referenced `OALO_GHL_LOCATION_PIT_JSON` without committing secrets.
- [x] **M7 Secret scanner gaps** `tooling/scripts/audit-secrets.mjs` — Added `sk_test_*`, `whsec_*`, `rk_(live|test)_*` patterns.

Remaining reverse-review Mediums (M3–M5, M8–M21) are out of scope for this remediation raid and stay tracked in the reverse-review report.

---

## Low Findings (documentation only)

None detected in this diff.

---

## Dependency Audit

```text
pnpm audit --audit-level=high: No known vulnerabilities found
security-weapon scan.sh: npm-audit.json written under reports/scan-output/ (gitignored)
```

---

## Next.js Version Check

`next@16.2.11` and `react@19.2.7` are past CVE-2025-29927 / CVE-2025-55182 / CVE-2025-66478 patched floors recorded in the watchlist.

---

## Secrets / Unicode / Pattern sweep

- Secret audit: passed (6 roots) after pattern extension.
- Unicode scan of rules: no new findings attributed to this diff.
- Role SQL uses fixed literals `app_runtime` / `support_runtime` (no user-controlled interpolation).

---

## Residual risk / honesty bounds

- Production traffic remains disabled.
- 28 G2 criteria remain `DEFERRED: LIVE HIGHLEVEL AUTH`.
- Live ready probes still run in production isolation (`providerMode=live`); that is intentional for true production dependency health, not a regression of H1.
- H3 unit proof covers statement ordering on the FakeConnection path; live pooled-login grant verification remains an ops checklist item before production cutover (`docs/operations/database-runtime-role.md`).

---

## Verdict

**PASS** for this remediation branch. Critical/High reverse-review items H1–H3 closed in code + tests + docs. Safe to proceed to quality-guardian.
