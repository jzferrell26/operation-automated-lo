# Security Audit Report: G2 App Test live-capture harness

**Audit date:** 2026-08-25
**Auditor:** security-guardian subagent
**Branch:** `cursor/g2-app-test-harness-ac42` (vs `origin/main`)
**Scope:** `packages/ghl/src/live-capture.ts`, `packages/ghl/src/g2-matrix.ts`, `packages/ghl/src/evidence.ts` (CAPTURED_SANITIZED schema extension), `packages/ghl/src/index.ts`, `tooling/scripts/ghl/run-g2-app-test-matrix.mjs`, `tests/contracts/ghl/live-capture.test.ts`, `tests/contracts/ghl/safety.test.ts`, `tests/security/phase0-boundary.test.ts`, `docs/operations/evidence-packs/g2-highlevel-app-test.md`, `package.json`, `NEXT_BATCH_LEDGER.md`, `PRODUCTION_EXECUTION_LEDGER.md`. Also read (unchanged, but load-bearing for the new capture path) `packages/ghl/src/sanitization.ts`.
**Next.js version audited:** 16.2.11 (`pnpm-lock.yaml`; not declared directly in this package's `package.json` — resolved via workspace root)
**React version audited:** 19.2.7 (`pnpm-lock.yaml`)
**CVE watchlist last refreshed:** 2026-04-24 — **123 days old, exceeds the 120-day freshness threshold.** Flagged below; recommend re-running `forge-weapon` for `security-guardian`.

---

## Executive Summary

The G2 App Test live-capture harness is a well-designed, fail-closed feature: capture is disabled by default, the disabled/authorized seam is covered by tests at three layers (`live-capture.test.ts`, `safety.test.ts`, `phase0-boundary.test.ts`), stored evidence is hard-pinned to `transport: "fixture-replay"` by both code construction and a Zod literal, and no secret defaults exist in docs, scripts, or `package.json`. The one substantive gap was in the pre-existing sanitization blocklist (`packages/ghl/src/sanitization.ts`) that this new feature now relies on as its sole runtime defense against leaking real OAuth secrets into committed evidence: it caught `accessToken`/`refreshToken`/`Bearer ...`/JWT-shaped strings/email/phone, but not bare `token`-suffixed keys (e.g. `id_token`, `ssoToken`) or OAuth `code` fields — exactly the shapes the `oauth_callback_success`, `location_token_exchange`, and `refresh_rotation` matrix cases are designed to capture. This is fixed in-session (High). A secondary defense-in-depth gap — the documented `tmp/g2-observations/` and `tmp/g2-sanitized-fixtures/` operator scratch directories were not in `.gitignore` — is also fixed in-session (Medium, trivial). No Critical findings. No secrets, PII, or spend data were found already committed to the repository.

**Verdict: PASS with fixes applied.** 0 Critical, 1 High (fixed), 2 Medium (1 fixed, 1 documented), 0 Low.

---

## Scorecard

| Category | Status | Findings |
|---|---|---|
| Financial / Payment Security | OK | 0 |
| PII Exposure | ATTN (fixed) | 1 High (fixed) |
| Authentication & Authorization | OK | 0 |
| Injection Vulnerabilities | OK | 0 |
| Dependency Security | ATTN | 1 Medium (CVE watchlist stale, documented) |
| Configuration & Headers | N/A | 0 (backend package; no `next.config.js` in scope) |
| Data Handling | ATTN (fixed) | 1 Medium (fixed) |

Legend: **OK** = zero findings · **ATTN** = Medium/Low findings documented · **FAIL** = Critical/High findings (fixed in this session).

---

## Critical Findings (fixed in this session)

None detected.

---

## High Findings (fixed in this session)

- [x] **PII / secret exposure — sanitization blocklist gap** `packages/ghl/src/sanitization.ts:1-21` — `FORBIDDEN_KEY_PATTERNS` blocked `accessToken`/`refreshToken` (via `/access.?token/i`, `/refresh.?token/i`) and Bearer/JWT-shaped/email/phone *values*, but did not block a bare `token`-suffixed key (e.g. `id_token`, `ssoToken`, `sessionToken`) or an OAuth `code` / `authorizationCode` key whose value is a short opaque string (not JWT-shaped, no `Bearer ` prefix). This gap sits directly in the blast radius of the new `captureAuthorized()` path in `live-capture.ts:106-141`, which is the only runtime gate standing between a real HighLevel App Test OAuth response and a `sanitized-live-capture` evidence record that gets written to disk and is expected to be promoted into `tests/contracts/ghl/fixtures/` (a git-tracked path). If an authorized operator captured a raw `oauth_callback_success`, `location_token_exchange`, or `refresh_rotation` response containing `id_token` or `code`, the previous blocklist would have let it through `assertFixtureIsSanitized()` unchanged.
  **Fix applied:** added `/id.?token/i`, `/token$/i`, `/^code$/i`, and `/o?auth(?:orization)?[-_]?code/i` to `FORBIDDEN_KEY_PATTERNS` in `packages/ghl/src/sanitization.ts`. Added regression tests in `tests/contracts/ghl/safety.test.ts` (bare `token`, `id_token`, `ssoToken`, `code`, `authorizationCode`) and `tests/contracts/ghl/live-capture.test.ts` (end-to-end through `createLiveCaptureAdapter(...).capture()` for `oauth_callback_success`). All 55 tests across `tests/contracts/ghl/` and `tests/security/phase0-boundary.test.ts` pass; `tsc --noEmit` for `@oalo/ghl` is clean.

---

## Medium Findings

- [x] **Data handling — missing `.gitignore` coverage for operator scratch directories** `docs/operations/evidence-packs/g2-highlevel-app-test.md:27-31` documents `tmp/g2-observations/` (raw operator observations) and `tmp/g2-sanitized-fixtures/` (adapter output, default `--out-dir`) as the working directories for a live capture run. Neither path was covered by `.gitignore`, so an operator running a reflexive `git add .` / `git add -A` after a capture session could stage these files before the documented human-review step ("Only then copy approved fixtures into `tests/contracts/ghl/fixtures/` under review") ever ran. This is a defense-in-depth gap, not an active leak: the files that would land there are already expected to have passed `assertFixtureIsSanitized()` (now hardened per the High finding above), so this compounds risk only in the event of a second failure.
  **Fix applied (trivial, <5 lines):** added `/tmp/g2-observations/` and `/tmp/g2-sanitized-fixtures/` to `.gitignore`.

- [ ] **PII exposure — free-text `captureNotes` has no generic secret-entropy check** `packages/ghl/src/live-capture.ts:42` (`captureNotes: z.string().min(1).max(500)`). This field is walked by the same `FORBIDDEN_VALUE_PATTERNS` as every other string in the draft (Bearer prefix, JWT shape, email, phone — see `sanitization.ts:23-28`), so it does catch those specific shapes even inside prose. It has no protection against an operator pasting a raw, non-JWT-shaped opaque secret into free text (e.g., "client_secret was xyz123..."). This is inherent to any free-text field and is already partially mitigated by the documented human-review gate before fixtures are promoted from `tmp/` into `tests/contracts/ghl/fixtures/`. **Recommended follow-up:** add an explicit reviewer checklist line in `docs/operations/evidence-packs/g2-highlevel-app-test.md` calling out `captureNotes` review for pasted secrets, or run a generic high-entropy-string scan (e.g. `detect-secrets`) over `tmp/g2-sanitized-fixtures/*.json` before promotion. Not fixed in-session (requires either a process change or a new dependency, not a <5-line code change).

- [ ] **CVE intelligence staleness** `research/cve-watchlist.md` (referenced via `.cursor/skills/security-weapon/guides/06-cve-tracker.md`) — `Last refreshed: 2026-04-24`, which is 123 days before this audit (2026-08-25), exceeding the 120-day freshness threshold defined in `guides/06-cve-tracker.md` and `SKILL.md`. This does not indicate an unpatched vulnerability in this branch (both `next@16.2.11` and `react@19.2.7` are well above every patched threshold in the current watchlist — see Next.js Version Check below), but the watchlist itself may be missing advisories published in the last four months. **Recommended follow-up:** re-run `forge-weapon` for `security-guardian` to refresh `research/cve-watchlist.md` and `guides/06-cve-tracker.md`.

---

## Low Findings (documentation only)

None detected.

---

## Must-Verify Checklist (per task scope)

1. **Default fail-closed without `OALO_GHL_LIVE_CAPTURE=authorized`.** VERIFIED. `isLiveCaptureAuthorized()` (`live-capture.ts:51-53`) gates `createLiveCaptureAdapter()`; the disabled adapter's `capture()` always rejects with `LiveCaptureDisabledError` (`live-capture.ts:143-151`). Covered by `live-capture.test.ts:12-27`, `safety.test.ts:28-33`, and `phase0-boundary.test.ts:153-157`. The CLI (`run-g2-app-test-matrix.mjs:74-96`) independently re-checks and exits non-zero / throws without the flag. Re-verified at call time inside the authorized adapter too (`live-capture.ts:155-160`), closing a revoked-mid-session TOCTOU gap.
2. **Authorized path never persists tokens/PII/spend.** VERIFIED AFTER FIX. `captureAuthorized()` calls `assertFixtureIsSanitized(draft)` before `createEvidenceRecord()`, which itself calls `assertFixtureOnlyRequest()` and `assertFixtureIsSanitized()` again (belt-and-suspenders). Structured field format is also constrained independently by `LiveCaptureObservationSchema` (`safeProviderIds` values must match `^[a-z][a-z0-9_-]{2,95}$`, `grantedScopes` items must match `^[A-Za-z0-9./_-]+$`), and the value-pattern JWT check (`\beyJ...\`) still catches a JWT even if it were smuggled through one of those slug-shaped fields. The one real gap (bare `token`/`code` keys) is fixed under the High finding above.
3. **Stored evidence always uses `transport: fixture-replay`.** VERIFIED. `buildFixtureRequest()` (`live-capture.ts:69-94`) hardcodes `transport: "fixture-replay"` regardless of authorization state — there is no code path that sets any other transport value for live-captured evidence. `GhlFixtureRequestSchema` (`evidence.ts:19-34`) additionally pins `transport: z.literal("fixture-replay")`, and `assertFixtureOnlyRequest()` throws if it is ever anything else. Confirmed by test assertion `record.request.transport === "fixture-replay"` in `live-capture.test.ts:62`.
4. **No secrets in docs/scripts defaults.** VERIFIED. `package.json`'s new `ghl:g2-matrix` script does not set the env var. The docs (`docs/operations/evidence-packs/g2-highlevel-app-test.md:17,71`) explicitly instruct operators never to commit the flag and list it under "Prohibited in git." No default value of `"authorized"` exists anywhere outside the exported string constant and test fixtures that intentionally pass it as a literal to exercise the authorized path. Grep across `*.{ts,js,mjs,json,md,yml,yaml}` confirmed no other occurrence.
5. **Fix Critical/High in session; Medium if trivial.** Done — see High and Medium sections above.

---

## Dependency Audit

```text
npm audit --audit-level=high: 0 critical, 0 high, 0 moderate, 0 low, 0 info (149 total dependencies)
```

Full output: `reports/scan-output/npm-audit.json` (ephemeral, gitignored).

---

## Next.js Version Check

| CVE | Patched threshold | Current project | Status |
|---|---|---|---|
| **CVE-2025-29927** (middleware bypass) | 14.2.25 / 15.2.3 | 16.2.11 | patched (newer major line) |
| **CVE-2025-55182** (React2Shell RCE) | React 19.0.1 / 19.1.2 / 19.2.1 | 19.2.7 | patched |
| **CVE-2025-66478** (Next.js companion) | latest 14.x / 15.x / 16.x | 16.2.11 | patched |
| **CVE-2026-27978** (null-origin CSRF) | latest | 16.2.11 | patched (no `experimental.serverActions.allowedOrigins: ['null']` found in repo) |

This audit's scope is a backend package (`packages/ghl`) with no route handlers, middleware, or Server Actions of its own; the above table is reported for completeness per the standing CVE-vigilance rule, not because this diff touches Next.js routing surface.

---

## Files Changed (remediation)

| File | Change Summary |
|---|---|
| `packages/ghl/src/sanitization.ts` | Added `FORBIDDEN_KEY_PATTERNS` entries for bare `*token` suffixes, `id_token`, `code`, and `authorizationCode`/`oauthCode` to close the High finding. |
| `.gitignore` | Added `/tmp/g2-observations/` and `/tmp/g2-sanitized-fixtures/` to close the Medium finding. |
| `tests/contracts/ghl/safety.test.ts` | Added regression cases for `id_token`, `ssoToken`, `token`, `code`, `authorizationCode`. |
| `tests/contracts/ghl/live-capture.test.ts` | Added end-to-end regression test capturing `id_token`/`code` through the authorized adapter and asserting `UnsafeFixtureError`. |

`git diff` reviewed and confirmed security-scoped on 2026-08-25 — the diff touches only the sanitization blocklist, `.gitignore`, and the two test files exercising the fix; no unrelated changes.

Verification run after fixes: `pnpm vitest run tests/contracts/ghl/ tests/security/phase0-boundary.test.ts` — 55/55 passed. `pnpm --filter @oalo/ghl typecheck` — clean.

---

## Recommended Follow-Up (architectural)

- Add a generic high-entropy-string / `detect-secrets`-style scan as a pre-commit or CI gate over any file under `tests/contracts/ghl/fixtures/**` — motivated by the free-text `captureNotes` residual gap (Medium, documented above). This closes the last realistic path for a human-typed secret to survive sanitization.
- Re-run `forge-weapon` for `security-guardian` to refresh `research/cve-watchlist.md` (currently 123 days stale) — motivated by the CVE-staleness finding (Medium, documented above).

---

## Ordering Note

This audit ran before `quality-guardian` for this branch, as required. No prior `*-qa-report.md` for `cursor/g2-app-test-harness-ac42` exists in `library/requirements/in-work/prd-001-operation-automated-lo/qa/` or `library/requirements/reports/` with content referencing this feature — the most recent QA reports in that folder (`2026-08-25-gauntlet-closeout-qa-report.md`, `2026-08-25-raid-a-csp-qa-report.md`) predate the two commits (`0cd839b`, `d1bfc3d`) that introduced this harness. `quality-guardian` should run next against the post-fix state of this branch.

---

*Generated by `security-guardian` using `security-weapon`. See `.cursor/skills/security-weapon/` for methodology.*
