# Full Reverse Review Report: Operation Automated LO

**Audit date:** 2026-08-26
**Head:** `dc69de5` (`origin/main`, branch `cursor/full-reverse-review-ac42`)
**Mode:** Document-only. No application code was changed.
**Plan / terrain:** `prd-001-operation-automated-lo-index.md`, `PRODUCTION_EXECUTION_LEDGER.md`, `NEXT_BATCH_LEDGER.md`, `project-map.md`, `.cursor/rules/core/the-map.mdc`
**Auditors (parallel specialists):** quality-guardian, security-guardian (general-purpose full-repo; specialized security-review/bugbot tools skipped empty feature diffs), bugbot-style review, explore, dependency-audit-guardian, auth-guardian, gohighlevel-guardian, db-guardian, payments-guardian, react-guardian, github-repo-health-guardian

---

## Executive summary

**Repository-provable product: SHIP.** Offline verification re-ran green on this tip (`pnpm verify:offline` EXIT 0: format, lint, typecheck, 395 unit, 28 integration, 61 contracts, visual, browser, e2e-preview, jscpd, boundaries, product-types, secrets, `pnpm audit --audit-level=high` clean, full build). Status arithmetic holds: **305 = 267 VERIFIED + 28 DEFERRED: LIVE HIGHLEVEL AUTH + 7 BLOCKED: EXTERNAL EVIDENCE + 1 BLOCKED: G5 + 2 ACCEPTED CONSTRAINT**. No invented live HighLevel / Meta / Stripe / KMS / counsel evidence. G1 / G4 / G8 stay `ACCEPTED CONSTRAINT` (never `PASS`).

**Production traffic: NOT AUTHORIZED.** Wave 1 remains parked on HighLevel app approval. Fail-closed gates for live capture and live OAuth hold.

**Cross-specialist consensus:** 0 Critical exploitable defects in the shipped Phase 0 surface. Highest residual risks are (1) forward-looking wiring gaps that become load-bearing at G5/G6, (2) process hygiene (stale CVE watchlist, untracked security follow-ups, broken ledger generator), and (3) one High readiness-probe isolation concern on the web health surface.

---

## Live verification (this session)

| Gate | Result |
| --- | --- |
| `pnpm verify:offline` | PASS (EXIT 0) |
| Unit / integration / contracts / visual / browser / e2e-preview | 395 / 28 / 61 / 8 / 23 / 1 passed |
| `pnpm audit --audit-level=high` | No known vulnerabilities |
| `pnpm audit:secrets` / `audit:boundaries` | PASS |
| Local `pnpm test:db` | FAIL on this VM only (`npm-cli.js` missing beside `/exec-daemon/node`); CI `database` job owns real Postgres/pgTAP |

Versions: Next.js **16.2.11**, React **19.2.7**, Trigger.dev **4.5.12**, Node engine pin **24.18.0** (sandbox ran 22.14.0).

---

## Scorecard (rollup)

| Category | Status | Notes |
| --- | --- | --- |
| Completeness (locally provable) | PASS | 267 VERIFIED independently consistent with tests and ledgers |
| Correctness (fail-closed gates) | PASS | G2 live-capture and live-OAuth disabled paths hold; ledger honesty intact |
| Alignment (maps / harness / ledgers) | PASS | project-map, the-map, next-batch, production ledger agree |
| Security (Critical / High exploitable now) | PASS WITH FINDINGS | 0 Critical; no High currently exploitable on live paths; Medium process + forward-looking |
| Supply chain | PASS WITH WATCH | Audit clean; CVE watchlist stale; no Dependabot/Renovate bot |
| DB / RLS foundation | PASS WITH FINDINGS | Strong pgTAP/RLS design; runtime `SET ROLE` activation path needs confirmation |
| Web / React surface | PASS WITH FINDINGS | Synthetic UI disciplined; readiness probe is the main blast-radius concern |
| Billing | PASS (shell) | Fail-closed by absence; G6 BLOCKED honesty holds |
| Repo hygiene | ATTN | Missing PR/issue templates; single CODEOWNERS; no Dependabot |

---

## Critical findings

None.

---

## High findings (prioritize before next production-path milestone)

### H1. Readiness probe can fire live third-party calls outside production isolation intent

- **Sources:** react-guardian; corroborated by explore
- **Coords:** `apps/web/src/app/api/health/ready/route.ts:126-132`, `apps/web/src/server/production-readiness-runtime.ts:76-107`, `packages/config/src/environment.ts` preview/staging isolation descriptors
- **Issue:** Ready check branches mainly on `environment === "local"`. Preview/staging still invoke `productionReadinessRuntime(...).probe()`, which can hit real Anthropic, Postgres, and R2 when credentials are present, despite stub/synthetic isolation intent for those tiers.
- **Why High:** Blast radius if real secrets are provisioned into non-prod to "make health green."
- **Remediation direction:** Gate probe construction on `providerMode` / `dataClassification` (or force stub probes outside production), add caching/backoff, and wire HighLevel token only when intentional.

### H2. `routeLeadToGhl` performs unguarded I/O before error classification

- **Sources:** bugbot-style review
- **Coords:** `packages/ghl/src/lead-routing.ts:248-254` (I/O before `try` at ~256)
- **Issue:** `state.load`, `provider.reconcile`, and first `state.save` run outside the classification / retry path.
- **Why High (forward):** Inert while G5 is blocked; becomes a silent retry/classification regression the moment lead routing goes live.
- **Remediation direction:** Move those calls inside the `try` / classification boundary before G5 wiring.

### H3. No observed runtime path activates `app_runtime` via `SET ROLE`

- **Sources:** db-guardian (Must-Fix); handoff to security
- **Coords:** `supabase/migrations/20260721010000_platform_foundation.sql` role grants with `INHERIT false`; `packages/db/src/transaction-context.ts` sets app context but does not `SET ROLE`
- **Issue:** RLS policies target `app_runtime` / related roles; production connection-role activation is not demonstrated outside pgTAP scaffolding.
- **Why High:** Tenant boundary enforcement point is unverified for the real pooled login role.
- **Remediation direction:** Document and test the production-shaped login credential path that issues `SET LOCAL ROLE`, or prove equivalent inheritance; add an integration test that is not a hardcoded pgTAP role switch alone.

---

## Medium findings (should fix / track)

| ID | Area | Summary | Coords / evidence |
| --- | --- | --- | --- |
| M1 | Security process | CVE watchlist stale (>120 days; Last refreshed 2026-04-24) | `.cursor/skills/security-weapon/research/cve-watchlist.md` |
| M2 | Security process | Watchlist lacks Trigger.dev coverage | same; `apps/tasks` pins 4.5.12 (currently past known fix lines) |
| M3 | Quality / tooling | Broken orphan ledger generator (`ENOENT` on backlog path) | `tooling/scripts/generate-production-execution-ledger.mjs` |
| M4 | Quality / web | Next.js deprecates `middleware` file convention (`proxy` preferred); untracked | `apps/web/src/middleware.ts` |
| M5 | Quality process | Security follow-ups documented but not converted to backlog/watchdog rows | G2 harness security audit; Gauntlet QA suggestion |
| M6 | Auth / docs | Live-capable PIT seam (`OALO_GHL_LOCATION_PIT_JSON`) not cross-referenced in G2/G3 ledger narrative | `packages/config/src/production-task-runtime.ts`, `apps/tasks/.../production-runtime-composition.ts` |
| M7 | Payments / secrets | Secret scanner misses `whsec_*`, `sk_test_*`, `rk_*` patterns | `tooling/scripts/audit-secrets.mjs` |
| M8 | Payments / schema | Billing write grants / customers-subscriptions tables incomplete for future G6 | migration + architecture docs |
| M9 | Payments / schema | `webhook_receipts` lacks processed-requires-signature constraint | platform foundation migration |
| M10 | React / CSP | Global `style-src 'unsafe-inline'` for one accent use case | `apps/web/src/security/content-security-policy.ts` |
| M11 | React | `(authenticated)` route group has no auth check (safe only while synthetic) | `apps/web/src/app/(authenticated)/layout.tsx` |
| M12 | React | Ready probe: no cache/backoff; module singleton ignores later env; GHL ready permanently degraded without token | ready route + production-readiness-runtime |
| M13 | React | `no-live-paths` static scan covers only 2 of several synthetic sources | `no-live-paths.unit.test.ts` |
| M14 | GHL | Meta asset-read reuses connection schema for five endpoints | `production-meta-read-transport.ts` |
| M15 | GHL | G3/G4 fixture paths drift from `META_ROUTE_ALLOWLIST` | `tests/contracts/ghl/fixtures/g3-*.json`, `g4-*.json` |
| M16 | Bugbot | IPv6 SSRF helper misses NAT64/6to4 forms (no live caller yet) | `packages/application/src/profile-foundation.ts` `isPrivateIpv6` |
| M17 | Bugbot | Dead `preflightHasOnlyDeterministicInputs` always returns true | `packages/domain/src/campaign-foundation.ts` |
| M18 | DB | Reporting RLS `using (true)` relies on column grants for isolation | migration campaigns_reporting_status_only |
| M19 | DB | Dead `validate-phase0.ps1` contradicts current migrations | `supabase/scripts/validate-phase0.ps1` |
| M20 | Repo health | No PR/issue templates; no Dependabot/Renovate; single-owner CODEOWNERS; squash-only not historically enforced | `.github/` |
| M21 | Explore | `@oalo/auth` and `@oalo/observability` built but unwired into apps; billing is phase-0 shell | package inventory |

---

## Low / informational (selected)

- Lead-routing fail-closed today by structural absence of a live adapter; prefer an explicit disabled seam before G5 (gohighlevel-guardian I1).
- `FORBIDDEN_LIVE_PATH_PATTERNS` `/integration/i` would block capturing legitimate `get-integration` (gohighlevel L1).
- Trigger.dev `runtime: "node-22"` vs engines `24.18.0` drift (security L-1).
- Blanket `frame-ancestors 'none'` correct for Phase 0; needs scoped exception before GHL iframe (security M-3 / must-verify).
- Deployment-manifest external exercise attestation is structural, not cryptographic proof of G6 (payments S4).

---

## Specialist verdicts (one line each)

| Specialist | Verdict |
| --- | --- |
| Quality | SHIP for repository-proved code; NOT production-authorized; 0 Critical, 3 Warnings |
| Security (full-repo) | PASS WITH FINDINGS; 0 Critical/High exploitable; Medium process gaps |
| Bugbot-style | Coherent and fail-closed today; 1 High forward (lead-routing try boundary) |
| Explore | Phase 0 scaffold with intentional stubs; auth/observability/billing unwired or shell |
| Dependency audit | Good; Next/React/Trigger past known fixed versions; refresh watchlist; consider Renovate |
| Auth | G2 deferred honesty holds; Medium doc gap for PIT seam |
| GHL/Meta | 0 Critical/High; Medium schema/fixture drift; live paths fail-closed |
| DB/RLS | Strong foundation; Must-Fix role-activation verification |
| Payments | Fail-closed by absence; G6 honesty holds; scanner + schema prep for G6 |
| React/web | Strong synthetic isolation; High ready-probe isolation concern |
| GitHub repo health | Medium hygiene only (templates, bots, CODEOWNERS, merge history) |

---

## Recommended next actions (no code in this PR)

1. **Track and schedule fixes** for H1 (ready probe isolation), H2 (lead-routing try boundary before G5), H3 (DB role activation proof).
2. **Process:** refresh CVE watchlist (+ Trigger.dev); add Dependabot/Renovate; convert security follow-ups into `NEXT_BATCH_LEDGER` watchdog or issues; fix or delete broken ledger generator; note Next middleware→proxy migration.
3. **Docs:** cross-reference `OALO_GHL_LOCATION_PIT_JSON` in G2/G3 ledger rows; keep HighLevel app-approval park unchanged.
4. **Do not** flip deferred ACs or claim production authorization from this review.

---

## Definition of done for this review

- [x] Parallel specialist reverse reviews completed (document-only)
- [x] Offline verification evidence captured
- [x] Consolidated findings authored under `library/requirements/reports/`
- [x] Remediation raid for H1/H2/H3 + process M1/M6/M7 (separate PR; see changelog)

---

## Changelog

- 2026-08-26: Initial full reverse review on `dc69de5`.
- 2026-08-26: Remediation on `cursor/reverse-review-remediation-ac42`: H1 ready-probe gated on `providerMode === "live"`; H2 lead-routing early I/O moved inside classification `try`; H3 `SET LOCAL ROLE` in `withTenantTransaction` / `withSupportTransaction` plus ops doc; M1 CVE watchlist refresh; M6 PIT ledger/evidence cross-refs; M7 secret scanner patterns for `whsec_*` / `sk_test_*` / `rk_*`.
