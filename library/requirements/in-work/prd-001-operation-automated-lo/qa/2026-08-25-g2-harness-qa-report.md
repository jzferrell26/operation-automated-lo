# QA Report: G2 App Test live-capture harness

**Plan document:** Attached execution plan (External Evidence Sprint, Steps 2-4) plus `NEXT_BATCH_LEDGER.md`, `docs/operations/evidence-packs/g2-highlevel-app-test.md`, `PRODUCTION_EXECUTION_LEDGER.md`
**Audit date:** 2026-08-25
**Base branch:** `origin/main`
**Head:** `cursor/g2-app-test-harness-ac42` (post-security-fix commit `22e962c`)
**Auditor:** quality-guardian
**Prerequisite check:** `security-guardian` ran first and PASSed with fixes (`qa/2026-08-25-g2-harness-security-audit.md`); ordering rule satisfied. No prior `quality-guardian` report exists for this branch's harness work.

## Summary

The G2 App Test live-capture harness matches the plan on every verification point: capture is fail-closed by default, the matrix contains exactly the nine documented cases, the CLI and evidence pack document a coherent operator flow, and no criterion was fabricated as `VERIFIED` — all 28 G2-scoped rows in `PRODUCTION_EXECUTION_LEDGER.md` remain `DEFERRED: LIVE HIGHLEVEL AUTH` with a precise residual ask per case. The prior security audit's two remediations (sanitization blocklist for `id_token`/`code`-shaped keys, `.gitignore` coverage for the two operator scratch directories) are present and covered by regression tests. `pnpm test:contracts` (61/61) and `pnpm --filter @oalo/ghl typecheck` both pass clean in this session. **Verdict: PASS.** 0 Critical, 0 Warning, 1 Suggestion.

## Scorecard

| Category      | Status | Notes |
|---------------|--------|-------|
| Completeness  | ✅ | All six verify items satisfied; matrix, CLI, docs, and ledger rows are internally consistent |
| Correctness   | ✅ | Fail-closed default confirmed by live CLI run (exit 1) and by test suite; TOCTOU re-check on the authorized adapter also present |
| Alignment     | ✅ | Implementation matches the attached plan's Steps 2-4 exactly: harness, Wave 1 residual asks, ledger update |
| Gaps          | ✅ | No criterion was flipped to `VERIFIED`; residual-ask table is 9-for-9 against the matrix case catalog |
| Detrimental   | ✅ | No secrets, no over-claims in docs; security fixes verified present and regression-tested |

## Critical Issues (must fix)

None.

## Warnings (should fix)

None.

## Suggestions (consider improving)

- [ ] **Ambient-env test isolation in the pre-existing boundary test** — `tests/security/phase0-boundary.test.ts:154`

  This diff updated the assertion message on this line (`/disabled in Phase 0/i` → `/OALO_GHL_LIVE_CAPTURE=authorized/i`) but left the call as `createLiveCaptureAdapter()` with no explicit env argument, so it implicitly trusts that the ambient `process.env` in CI/local runs never carries `OALO_GHL_LIVE_CAPTURE=authorized`. The newer `tests/contracts/ghl/live-capture.test.ts` and `tests/contracts/ghl/safety.test.ts` both pass an explicit `{}` or authorized env object instead, which is more robust. Not a defect in this diff (the pattern predates it and all 61 contract tests pass today), but worth aligning the next time this file is touched.

  ```typescript
  const adapter = createLiveCaptureAdapter();
  expect(adapter.mode).toBe("disabled");
  ```

## Plan Item Traceability

| # | Plan Requirement | Status | Implementation Location | Notes |
|---|---|---|---|---|
| V-1 | Env-gated live capture exists and defaults disabled | ✅ | `packages/ghl/src/live-capture.ts:51-53,143-151` | `isLiveCaptureAuthorized()` gates `createLiveCaptureAdapter()`; disabled adapter always throws `LiveCaptureDisabledError`. Live CLI run without the env var exited 1 in this session. |
| V-2 | Matrix has 9 cases | ✅ | `packages/ghl/src/g2-matrix.ts:3-67` | Exactly 9 entries in `G2_MATRIX_CASES`; asserted by `tests/contracts/ghl/live-capture.test.ts:104-108` (`toHaveLength(9)`, all `caseId`s unique). |
| V-2b | CLI documents operator flow | ✅ | `tooling/scripts/ghl/run-g2-app-test-matrix.mjs:1-139`, `docs/operations/evidence-packs/g2-highlevel-app-test.md:15-35` | `--list`, `--observation-dir`, `--out-dir` flags match the documented commands verbatim; `pnpm ghl:g2-matrix` script added in `package.json:31`. Verified live: `node tooling/scripts/ghl/run-g2-app-test-matrix.mjs --list` printed all 9 cases and the disabled-capture notice. |
| V-3 | Wave 1 did not invent VERIFIED; 28 criteria still DEFERRED with residual asks | ✅ | `PRODUCTION_EXECUTION_LEDGER.md` (28 rows matching `DEFERRED: LIVE HIGHLEVEL AUTH`, grep-counted), `docs/operations/evidence-packs/g2-highlevel-app-test.md:37-53` | `grep -c "DEFERRED: LIVE HIGHLEVEL AUTH" PRODUCTION_EXECUTION_LEDGER.md` returns exactly 28. The evidence pack's residual-ask table lists a 1:1 unblock action for each of the 9 `caseId`s; no row anywhere claims `VERIFIED`. |
| V-4 | Security report exists and remediations (sanitization id_token/code, gitignore tmp) are present | ✅ | `packages/ghl/src/sanitization.ts:5-6,11-12`, `.gitignore:17-18` | `FORBIDDEN_KEY_PATTERNS` includes `/id.?token/i`, `/token$/i`, `/^code$/i`, `/o?auth(?:orization)?[-_]?code/i` exactly as the security report describes. `.gitignore` adds `/tmp/g2-observations/` and `/tmp/g2-sanitized-fixtures/`. Both regression-tested in `tests/contracts/ghl/safety.test.ts:16-20` and `tests/contracts/ghl/live-capture.test.ts:83-102`. |
| V-5 | Re-run `pnpm test:contracts` if quick | ✅ | — | Ran in this session: `Test Files 9 passed (9)`, `Tests 61 passed (61)`. Also ran `pnpm --filter @oalo/ghl typecheck` clean, and a live `--list` invocation of the CLI (exit 0) plus a no-args invocation confirming fail-closed exit 1. |
| — | `NEXT_BATCH_LEDGER.md` Wave 1 status/watchdog/changelog reflect harness-shipped, operator-blocked state | ✅ | `NEXT_BATCH_LEDGER.md:74,169-171,182` | Status line, two new watchdog rows, and one changelog row all describe "Harness READY... Operator run BLOCKED" — no premature completion claim. |

## Files Changed

- `.gitignore` (M) — adds `/tmp/g2-observations/` and `/tmp/g2-sanitized-fixtures/` (security remediation, confirmed present)
- `NEXT_BATCH_LEDGER.md` (M) — Wave 1 status line, two watchdog rows, one changelog row; all consistent with "harness ready, operator blocked"
- `PRODUCTION_EXECUTION_LEDGER.md` (M) — exact-ask row for the G2 criteria updated to reference the harness; no criterion status changed to `VERIFIED`
- `docs/operations/evidence-packs/g2-highlevel-app-test.md` (M) — adds operator commands, Wave 1 residual-ask table (9 rows), `caseId` column on the matrix checklist, and an explicit prohibition on committing the literal authorized flag value
- `package.json` (M) — adds `ghl:g2-matrix` script pointing at the CLI
- `packages/ghl/src/evidence.ts` (M) — adds `CapturedEvidenceSchema` / `sanitized-live-capture` source discriminant, pins `provider.environment: app-test` and `externalStatus: CAPTURED_SANITIZED` together via `superRefine`
- `packages/ghl/src/g2-matrix.ts` (A) — 9-case matrix catalog and lookup helpers
- `packages/ghl/src/index.ts` (M) — re-exports `g2-matrix` and `live-capture`
- `packages/ghl/src/live-capture.ts` (M) — env-gated adapter factory, `LiveCaptureObservationSchema`, `captureAuthorized()` fixture-replay construction, TOCTOU re-check inside the authorized `capture()` closure
- `packages/ghl/src/sanitization.ts` (M) — security remediation: adds `id_token`/bare-`token`/`code`/`authorizationCode` key patterns to `FORBIDDEN_KEY_PATTERNS`
- `tests/contracts/ghl/live-capture.test.ts` (A) — end-to-end coverage of disabled default, unauthorized env values, successful sanitized capture, secret-bearing rejection (`accessToken`, `id_token`, `code`), and matrix-catalog completeness
- `tests/contracts/ghl/safety.test.ts` (M) — adds `id_token`/`ssoToken`/`token`/`code`/`authorizationCode` regression cases; updates disabled-adapter error-message assertion
- `tests/security/phase0-boundary.test.ts` (M) — updates disabled-adapter error-message assertion to match the new `LiveCaptureDisabledError` text
- `tooling/scripts/ghl/run-g2-app-test-matrix.mjs` (A) — operator-facing CLI: `--list`, `--observation-dir`, `--out-dir`; fail-closed without the authorized env var (verified live: exit 1)
