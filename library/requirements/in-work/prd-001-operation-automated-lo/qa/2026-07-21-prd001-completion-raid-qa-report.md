# QA Report: PRD-001 Completion Raid

Plan set: prd-001-operation-automated-lo-index.md plus PRD-001j and PRD-001a through PRD-001i

Authoritative execution ledger: PRODUCTION_EXECUTION_LEDGER.md

Security review: 2026-07-21-prd001-completion-raid-security-audit.md

Audit date: 2026-07-21

Baseline: origin/main at the audited working-tree snapshot

Branch: codex/oalo-prd001-completion-raid

Auditor: quality-guardian

## Verdict

DO NOT SHIP.

Security ran before Quality and reported no unresolved Critical or High finding, so the required ordering is valid. Quality then found two release-blocking Critical issues. Cookie-authenticated mutation policy does not enforce the required exact Origin-to-Host relationship, and the requested exact Node 24.18.0 verification gate failed in the real visual corpus. The local PostgreSQL and pgTAP stage passes when run separately.

The 297 acceptance rows resolve to 258 repository-side passes, 1 repository-side release-gate failure, 37 pure external or live-provider blocks, and 1 live-deferred row that also contains a repository-side Critical defect. PRD-001I AC001 is now supported by a source-bound, explicit confirmation flow on the repository side. PRD-001I AC007 moves from generic IN PROGRESS to an exact external evidence block because the offline evaluator passes but real configured primary and fallback outputs do not exist. This produces 38 external or deferred rows in total. G8 remains an accepted commercial constraint outside the 297-row table.

## Five-axis scorecard

| Axis | Result | Ruling |
| --- | --- | --- |
| Completeness | FAIL | All 297 rows are traced, but PRD-001J AC032 fails the current release gate and 38 rows still require external or live evidence. |
| Correctness | FAIL | Cookie mode accepts any configured allowed browser origin instead of requiring the cookie Origin to match Host exactly. |
| Alignment | PASS | Package boundaries, source contracts, provider allowlists, and synthetic-versus-live separation remain aligned with the indexed PRD set. |
| Gaps | FAIL | The exact full gate timed out in visual rendering. One auth boundary assertion and its negative test are absent. |
| Detrimental impact | FAIL | The auth mismatch weakens a required browser security boundary, and the release snapshot is not green. |

## Critical issues

### Critical 1: Cookie mutation origin is allowlisted but not same-host

Source requirements require cookie-authenticated mutations to use an exact Origin and Host match plus a session-bound CSRF token:

- library/requirements/in-work/prd-001-operation-automated-lo/prd-001j-operation-automated-lo-platform-foundation-runtime-and-delivery.md:94
- library/knowledge/private/architecture/system-runtime-contracts.md:105

The implementation in packages/auth/src/browser-session.ts:184-211 verifies Host against expectedHost and then checks whether Origin is any member of allowedBrowserOrigins. In cookie mode it adds the CSRF token check, but it never verifies that the accepted Origin host equals the request Host. The test in tooling/tests/unit/production-foundation/auth-policy.test.ts:303-348 configures both the first-party app origin and the HighLevel origin, proves the first origin for cookie mode and the second for bearer mode, but never proves cookie mode rejects the second allowed origin. A repository-wide call search found no higher handler boundary that adds this equality check.

This contradicts the required local fail-closed seam for PRD-001J AC028. Live HighLevel evidence remains deferred, but deferral does not authorize a weaker repository policy.

Required remediation: enforce exact cookie Origin-to-Host equality after canonical parsing, retain the allowlist for embedded bearer mode, and add a negative cookie test using the second allowed origin. Security must rerun before Quality after the fix.

### Critical 2: Exact release verification is red

The required command was executed exactly under Node 24.18.0:

npx --yes node@24.18.0 C:\Users\jzfer\AppData\Roaming\npm\node_modules\pnpm\bin\pnpm.cjs verify

It failed with exit code 1. tests/visual/prd001d-rendering.test.ts:75 timed out at 60 seconds in the test named "renders real tagged PDF bytes and stable browser rasters with all network access denied." The visual project reported 1 failed and 6 passed tests after about 63.5 seconds. Because verify short-circuits, preview E2E, browser, duplication, boundary, product-type, secret, dependency, build, and database stages did not run inside that invocation.

This reopens PRD-001J AC032 for the audited snapshot. A previous Security run passed the offline gate, so the symptom may be timing-sensitive, but the current release gate is still red and cannot be treated as passing evidence.

Required remediation: make the real visual corpus complete reliably within its bounded budget, then rerun the full exact command from a clean snapshot. Security must rerun before Quality.

## Warnings

### Warning 1: Application shell lacks the planned nonce-based CSP

The Security report retains one Medium defense-in-depth finding at apps/web/next.config.ts:5. The application shell has the other security headers but no Content-Security-Policy. The campaign renderer separately emits its restrictive public-page CSP, so PRD-001D AC010 remains supported. Add a nonce-based app CSP before production traffic.

### Warning 2: Several ledger evidence statements do not match their exact PRD-001D rows

The ledger remains complete by ID, but several evidence cells are shifted or describe a neighboring behavior. Examples include PRODUCTION_EXECUTION_LEDGER.md:258-259 and 263-266. The rows for file and pixel limits, metadata stripping, golden fixtures, accessibility, and performance point at different behavior than the exact criterion. The executed suites and prior evidence still cover the implementation families, but the authoritative ledger should be regenerated with row-specific evidence before it is used as a release artifact.

## PRD-level evidence map

| PRD | Evidence inspected | Quality ruling |
| --- | --- | --- |
| 001J | packages/auth/src, packages/db/src, Supabase migrations and pgTAP, release scripts, exact verification | One Critical auth seam plus red release gate |
| 001A | browser-session, embedded-session, oauth-state, token-lifecycle, tenant installation tests | Repository seams inspected; live HighLevel rows remain deferred |
| 001B | profile contracts, profile application service, confirmation and readiness tests | Repository criteria pass |
| 001C | campaign contracts, immutable versioning, preflight, approval, state-machine tests | Repository criteria pass |
| 001D | rendering package, Sharp 0.35.3 pin, visual corpus, storage and browser evidence | Implementation present, but current visual gate timed out |
| 001E | GHL Meta contracts, three distinct G4 fixture cases, route allowlists | Repository criteria pass; G3 and G4 evidence remains external |
| 001F | lead intake and routing, authoritative campaign resolution, tenant match, synthetic labels and tags | Repository criteria pass; live G5 synthetic lead remains external |
| 001G | reporting projection, filters, metrics, exceptions, cohort, portfolio, Realtor and theme tests | Repository criteria pass |
| 001H | onboarding access-mode projection, readiness, permissions, recovery and accessibility tests | Repository criteria pass; live embedded and first-party exercises remain deferred |
| 001I | source-bound review, explicit profile confirmation, golden corpus evaluator and generation tests | AC001 passes repository-side; AC007 requires real configured model output |

## Verification results

| Stage | Result | Exact evidence |
| --- | --- | --- |
| Runtime | PASS | Node 24.18.0 through the exact requested npx command |
| Format | PASS | Prettier accepted the audited tree |
| Lint | PASS | oxlint passed |
| Typecheck | PASS | 16 of 16 workspace packages plus tooling |
| Unit | PASS | 42 files, 364 tests, 87.48 percent statements and 84.02 percent branches |
| Integration | PASS | 8 files, 28 tests |
| Contracts | PASS | 7 files, 32 tests |
| Visual | FAIL | 2 files, 1 failed and 1 passed; 6 tests passed and 1 timed out |
| Downstream offline stages | SKIPPED | Exact verify stopped before preview E2E, browser, duplication, audits, and builds |
| Database in exact verify | SKIPPED | Exact verify stopped before test:db |
| Database standalone rerun | PASS | 2 orchestration files, 6 tests; 6 pgTAP files and 126 assertions; clean migration reset and cleanup |
| Diff check before report | PASS | git diff --check origin/main returned no error |

## Complete 297-row acceptance traceability

The ruling column is the Quality verdict for this snapshot. The ledger status column preserves the authoritative input state so every reclassification is visible.

| Criterion | Quality ruling | Ledger status | Evidence |
| --- | --- | --- | --- |
| 001J-AC-001 | PASS | VERIFIED | Ledger row 84 plus the executed evidence summarized in this report. |
| 001J-AC-002 | PASS | VERIFIED | Ledger row 85 plus the executed evidence summarized in this report. |
| 001J-AC-003 | PASS | VERIFIED | Ledger row 86 plus the executed evidence summarized in this report. |
| 001J-AC-004 | PASS | VERIFIED | Ledger row 87 plus the executed evidence summarized in this report. |
| 001J-AC-005 | PASS | DONE | Ledger row 88 plus the executed evidence summarized in this report. |
| 001J-AC-006 | PASS | DONE | Ledger row 89 plus the executed evidence summarized in this report. |
| 001J-AC-007 | PASS | DONE | Ledger row 90 plus the executed evidence summarized in this report. |
| 001J-AC-008 | PASS | DONE | Ledger row 91 plus the executed evidence summarized in this report. |
| 001J-AC-009 | PASS | DONE | Ledger row 92 plus the executed evidence summarized in this report. |
| 001J-AC-010 | PASS | DONE | Ledger row 93 plus the executed evidence summarized in this report. |
| 001J-AC-011 | PASS | DONE | Ledger row 94 plus the executed evidence summarized in this report. |
| 001J-AC-012 | PASS | DONE | Ledger row 95 plus the executed evidence summarized in this report. |
| 001J-AC-013 | PASS | DONE | Ledger row 96 plus the executed evidence summarized in this report. |
| 001J-AC-014 | PASS | DONE | Ledger row 97 plus the executed evidence summarized in this report. |
| 001J-AC-015 | PASS | DONE | Ledger row 98 plus the executed evidence summarized in this report. |
| 001J-AC-016 | PASS | DONE | Ledger row 99 plus the executed evidence summarized in this report. |
| 001J-AC-017 | PASS | DONE | Ledger row 100 plus the executed evidence summarized in this report. |
| 001J-AC-018 | PASS | DONE | Ledger row 101 plus the executed evidence summarized in this report. |
| 001J-AC-019 | PASS | DONE | Ledger row 102 plus the executed evidence summarized in this report. |
| 001J-AC-020 | PASS | DONE | Ledger row 103 plus the executed evidence summarized in this report. |
| 001J-AC-021 | PASS | DONE | Ledger row 104 plus the executed evidence summarized in this report. |
| 001J-AC-022 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 105 and the external evidence register. |
| 001J-AC-023 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 106 and the external evidence register. |
| 001J-AC-024 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 107 and the external evidence register. |
| 001J-AC-025 | PASS | DONE | Ledger row 108 plus the executed evidence summarized in this report. |
| 001J-AC-026 | BLOCKED: external evidence | BLOCKED: EXTERNAL EVIDENCE | Ledger row 109 and the external evidence register. |
| 001J-AC-027 | PASS | DONE | Ledger row 110 plus the executed evidence summarized in this report. |
| 001J-AC-028 | CRITICAL plus DEFERRED | DEFERRED: LIVE HIGHLEVEL AUTH | packages/auth/src/browser-session.ts:184 and auth-policy.test.ts:303; live HighLevel evidence also remains deferred. |
| 001J-AC-029 | BLOCKED: external evidence | BLOCKED: EXTERNAL EVIDENCE | Ledger row 112 and the external evidence register. |
| 001J-AC-030 | PASS | DONE | Ledger row 113 plus the executed evidence summarized in this report. |
| 001J-AC-031 | PASS | DONE | Ledger row 114 plus the executed evidence summarized in this report. |
| 001J-AC-032 | CRITICAL: current exact gate failed | DONE | Current Quality run timed out in the real visual corpus before the downstream release stages. |
| 001J-AC-033 | BLOCKED: external evidence | BLOCKED: EXTERNAL EVIDENCE | Ledger row 116 and the external evidence register. |
| 001J-AC-034 | PASS | DONE | Ledger row 117 plus the executed evidence summarized in this report. |
| 001A-AC-001 | PASS | DONE | Ledger row 125 plus the executed evidence summarized in this report. |
| 001A-AC-002 | PASS | DONE | Ledger row 126 plus the executed evidence summarized in this report. |
| 001A-AC-003 | PASS | DONE | Ledger row 127 plus the executed evidence summarized in this report. |
| 001A-AC-004 | PASS | DONE | Ledger row 128 plus the executed evidence summarized in this report. |
| 001A-AC-005 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 129 and the external evidence register. |
| 001A-AC-006 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 130 and the external evidence register. |
| 001A-AC-007 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 131 and the external evidence register. |
| 001A-AC-008 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 132 and the external evidence register. |
| 001A-AC-009 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 133 and the external evidence register. |
| 001A-AC-010 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 134 and the external evidence register. |
| 001A-AC-011 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 135 and the external evidence register. |
| 001A-AC-012 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 136 and the external evidence register. |
| 001A-AC-013 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 137 and the external evidence register. |
| 001A-AC-014 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 138 and the external evidence register. |
| 001A-AC-015 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 139 and the external evidence register. |
| 001A-AC-016 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 140 and the external evidence register. |
| 001A-AC-017 | PASS | DONE | Ledger row 141 plus the executed evidence summarized in this report. |
| 001A-AC-018 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 142 and the external evidence register. |
| 001A-AC-019 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 143 and the external evidence register. |
| 001A-AC-020 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 144 and the external evidence register. |
| 001A-AC-021 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 145 and the external evidence register. |
| 001A-AC-022 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 146 and the external evidence register. |
| 001A-AC-023 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 147 and the external evidence register. |
| 001A-AC-024 | PASS | DONE | Ledger row 148 plus the executed evidence summarized in this report. |
| 001A-AC-025 | PASS | DONE | Ledger row 149 plus the executed evidence summarized in this report. |
| 001A-AC-026 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 150 and the external evidence register. |
| 001A-AC-027 | PASS | DONE | Ledger row 151 plus the executed evidence summarized in this report. |
| 001A-AC-028 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 152 and the external evidence register. |
| 001A-AC-029 | PASS | DONE | Ledger row 153 plus the executed evidence summarized in this report. |
| 001A-AC-030 | PASS | DONE | Ledger row 154 plus the executed evidence summarized in this report. |
| 001A-AC-031 | PASS | DONE | Ledger row 155 plus the executed evidence summarized in this report. |
| 001A-AC-032 | PASS | DONE | Ledger row 156 plus the executed evidence summarized in this report. |
| 001A-AC-033 | PASS | DONE | Ledger row 157 plus the executed evidence summarized in this report. |
| 001A-AC-034 | PASS | DONE | Ledger row 158 plus the executed evidence summarized in this report. |
| 001A-AC-035 | PASS | DONE | Ledger row 159 plus the executed evidence summarized in this report. |
| 001A-AC-036 | PASS | DONE | Ledger row 160 plus the executed evidence summarized in this report. |
| 001A-AC-037 | PASS | DONE | Ledger row 161 plus the executed evidence summarized in this report. |
| 001A-AC-038 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 162 and the external evidence register. |
| 001A-AC-039 | PASS | DONE | Ledger row 163 plus the executed evidence summarized in this report. |
| 001A-AC-040 | PASS | DONE | Ledger row 164 plus the executed evidence summarized in this report. |
| 001A-AC-041 | PASS | DONE | Ledger row 165 plus the executed evidence summarized in this report. |
| 001B-AC-001 | PASS | DONE | Ledger row 173 plus the executed evidence summarized in this report. |
| 001B-AC-002 | PASS | DONE | Ledger row 174 plus the executed evidence summarized in this report. |
| 001B-AC-003 | PASS | DONE | Ledger row 175 plus the executed evidence summarized in this report. |
| 001B-AC-004 | PASS | DONE | Ledger row 176 plus the executed evidence summarized in this report. |
| 001B-AC-005 | PASS | DONE | Ledger row 177 plus the executed evidence summarized in this report. |
| 001B-AC-006 | PASS | DONE | Ledger row 178 plus the executed evidence summarized in this report. |
| 001B-AC-007 | PASS | DONE | Ledger row 179 plus the executed evidence summarized in this report. |
| 001B-AC-008 | PASS | DONE | Ledger row 180 plus the executed evidence summarized in this report. |
| 001B-AC-009 | PASS | DONE | Ledger row 181 plus the executed evidence summarized in this report. |
| 001B-AC-010 | PASS | DONE | Ledger row 182 plus the executed evidence summarized in this report. |
| 001B-AC-011 | PASS | DONE | Ledger row 183 plus the executed evidence summarized in this report. |
| 001B-AC-012 | PASS | DONE | Ledger row 184 plus the executed evidence summarized in this report. |
| 001B-AC-013 | PASS | DONE | Ledger row 185 plus the executed evidence summarized in this report. |
| 001B-AC-014 | PASS | DONE | Ledger row 186 plus the executed evidence summarized in this report. |
| 001B-AC-015 | PASS | DONE | Ledger row 187 plus the executed evidence summarized in this report. |
| 001B-AC-016 | PASS | DONE | Ledger row 188 plus the executed evidence summarized in this report. |
| 001B-AC-017 | PASS | DONE | Ledger row 189 plus the executed evidence summarized in this report. |
| 001B-AC-018 | PASS | DONE | Ledger row 190 plus the executed evidence summarized in this report. |
| 001B-AC-019 | PASS | DONE | Ledger row 191 plus the executed evidence summarized in this report. |
| 001B-AC-020 | PASS | DONE | Ledger row 192 plus the executed evidence summarized in this report. |
| 001C-AC-001 | PASS | DONE | Ledger row 200 plus the executed evidence summarized in this report. |
| 001C-AC-002 | PASS | DONE | Ledger row 201 plus the executed evidence summarized in this report. |
| 001C-AC-003 | PASS | DONE | Ledger row 202 plus the executed evidence summarized in this report. |
| 001C-AC-004 | PASS | DONE | Ledger row 203 plus the executed evidence summarized in this report. |
| 001C-AC-005 | PASS | DONE | Ledger row 204 plus the executed evidence summarized in this report. |
| 001C-AC-006 | PASS | DONE | Ledger row 205 plus the executed evidence summarized in this report. |
| 001C-AC-007 | PASS | DONE | Ledger row 206 plus the executed evidence summarized in this report. |
| 001C-AC-008 | PASS | DONE | Ledger row 207 plus the executed evidence summarized in this report. |
| 001C-AC-009 | PASS | DONE | Ledger row 208 plus the executed evidence summarized in this report. |
| 001C-AC-010 | PASS | DONE | Ledger row 209 plus the executed evidence summarized in this report. |
| 001C-AC-011 | PASS | DONE | Ledger row 210 plus the executed evidence summarized in this report. |
| 001C-AC-012 | PASS | DONE | Ledger row 211 plus the executed evidence summarized in this report. |
| 001C-AC-013 | PASS | DONE | Ledger row 212 plus the executed evidence summarized in this report. |
| 001C-AC-014 | PASS | DONE | Ledger row 213 plus the executed evidence summarized in this report. |
| 001C-AC-015 | PASS | DONE | Ledger row 214 plus the executed evidence summarized in this report. |
| 001C-AC-016 | PASS | DONE | Ledger row 215 plus the executed evidence summarized in this report. |
| 001C-AC-017 | PASS | DONE | Ledger row 216 plus the executed evidence summarized in this report. |
| 001C-AC-018 | PASS | DONE | Ledger row 217 plus the executed evidence summarized in this report. |
| 001C-AC-019 | PASS | DONE | Ledger row 218 plus the executed evidence summarized in this report. |
| 001C-AC-020 | PASS | DONE | Ledger row 219 plus the executed evidence summarized in this report. |
| 001C-AC-021 | PASS | DONE | Ledger row 220 plus the executed evidence summarized in this report. |
| 001C-AC-022 | PASS | DONE | Ledger row 221 plus the executed evidence summarized in this report. |
| 001C-AC-023 | PASS | DONE | Ledger row 222 plus the executed evidence summarized in this report. |
| 001C-AC-024 | PASS | DONE | Ledger row 223 plus the executed evidence summarized in this report. |
| 001C-AC-025 | PASS | DONE | Ledger row 224 plus the executed evidence summarized in this report. |
| 001C-AC-026 | PASS | DONE | Ledger row 225 plus the executed evidence summarized in this report. |
| 001C-AC-027 | PASS | DONE | Ledger row 226 plus the executed evidence summarized in this report. |
| 001D-AC-001 | PASS | DONE | Ledger row 234 plus the executed evidence summarized in this report. |
| 001D-AC-002 | PASS | DONE | Ledger row 235 plus the executed evidence summarized in this report. |
| 001D-AC-003 | PASS | DONE | Ledger row 236 plus the executed evidence summarized in this report. |
| 001D-AC-004 | PASS | DONE | Ledger row 237 plus the executed evidence summarized in this report. |
| 001D-AC-005 | PASS | DONE | Ledger row 238 plus the executed evidence summarized in this report. |
| 001D-AC-006 | PASS | DONE | Ledger row 239 plus the executed evidence summarized in this report. |
| 001D-AC-007 | PASS | DONE | Ledger row 240 plus the executed evidence summarized in this report. |
| 001D-AC-008 | PASS | DONE | Ledger row 241 plus the executed evidence summarized in this report. |
| 001D-AC-009 | PASS | DONE | Ledger row 242 plus the executed evidence summarized in this report. |
| 001D-AC-010 | PASS | DONE | Ledger row 243 plus the executed evidence summarized in this report. |
| 001D-AC-011 | PASS | DONE | Ledger row 244 plus the executed evidence summarized in this report. |
| 001D-AC-012 | PASS | DONE | Ledger row 245 plus the executed evidence summarized in this report. |
| 001D-AC-013 | PASS | DONE | Ledger row 246 plus the executed evidence summarized in this report. |
| 001D-AC-014 | PASS | DONE | Ledger row 247 plus the executed evidence summarized in this report. |
| 001D-AC-015 | PASS | DONE | Ledger row 248 plus the executed evidence summarized in this report. |
| 001D-AC-016 | PASS | DONE | Ledger row 249 plus the executed evidence summarized in this report. |
| 001D-AC-017 | PASS | DONE | Ledger row 250 plus the executed evidence summarized in this report. |
| 001D-AC-018 | PASS | DONE | Ledger row 251 plus the executed evidence summarized in this report. |
| 001D-AC-019 | PASS | DONE | Ledger row 252 plus the executed evidence summarized in this report. |
| 001D-AC-020 | PASS | DONE | Ledger row 253 plus the executed evidence summarized in this report. |
| 001D-AC-021 | PASS | DONE | Ledger row 254 plus the executed evidence summarized in this report. |
| 001D-AC-022 | PASS | DONE | Ledger row 255 plus the executed evidence summarized in this report. |
| 001D-AC-023 | PASS | DONE | Ledger row 256 plus the executed evidence summarized in this report. |
| 001D-AC-024 | PASS | DONE | Ledger row 257 plus the executed evidence summarized in this report. |
| 001D-AC-025 | PASS | DONE | Ledger row 258 plus the executed evidence summarized in this report. |
| 001D-AC-026 | PASS | DONE | Ledger row 259 plus the executed evidence summarized in this report. |
| 001D-AC-027 | PASS | DONE | Ledger row 260 plus the executed evidence summarized in this report. |
| 001D-AC-028 | PASS | DONE | Ledger row 261 plus the executed evidence summarized in this report. |
| 001D-AC-029 | PASS | DONE | Ledger row 262 plus the executed evidence summarized in this report. |
| 001D-AC-030 | PASS | DONE | Ledger row 263 plus the executed evidence summarized in this report. |
| 001D-AC-031 | PASS | DONE | Ledger row 264 plus the executed evidence summarized in this report. |
| 001D-AC-032 | PASS | DONE | Ledger row 265 plus the executed evidence summarized in this report. |
| 001D-AC-033 | PASS | DONE | Ledger row 266 plus the executed evidence summarized in this report. |
| 001E-AC-001 | PASS | DONE | Ledger row 274 plus the executed evidence summarized in this report. |
| 001E-AC-002 | PASS | DONE | Ledger row 275 plus the executed evidence summarized in this report. |
| 001E-AC-003 | PASS | DONE | Ledger row 276 plus the executed evidence summarized in this report. |
| 001E-AC-004 | PASS | DONE | Ledger row 277 plus the executed evidence summarized in this report. |
| 001E-AC-005 | BLOCKED: external evidence | BLOCKED: EXTERNAL EVIDENCE | Ledger row 278 and the external evidence register. |
| 001E-AC-006 | BLOCKED: external evidence | BLOCKED: G3 / G4 | Ledger row 279 and the external evidence register. |
| 001E-AC-007 | PASS | DONE | Ledger row 280 plus the executed evidence summarized in this report. |
| 001E-AC-008 | PASS | DONE | Ledger row 281 plus the executed evidence summarized in this report. |
| 001E-AC-009 | PASS | DONE | Ledger row 282 plus the executed evidence summarized in this report. |
| 001E-AC-010 | PASS | DONE | Ledger row 283 plus the executed evidence summarized in this report. |
| 001E-AC-011 | PASS | DONE | Ledger row 284 plus the executed evidence summarized in this report. |
| 001E-AC-012 | PASS | DONE | Ledger row 285 plus the executed evidence summarized in this report. |
| 001E-AC-013 | PASS | DONE | Ledger row 286 plus the executed evidence summarized in this report. |
| 001E-AC-014 | PASS | DONE | Ledger row 287 plus the executed evidence summarized in this report. |
| 001E-AC-015 | PASS | DONE | Ledger row 288 plus the executed evidence summarized in this report. |
| 001E-AC-016 | PASS | DONE | Ledger row 289 plus the executed evidence summarized in this report. |
| 001E-AC-017 | PASS | DONE | Ledger row 290 plus the executed evidence summarized in this report. |
| 001E-AC-018 | PASS | DONE | Ledger row 291 plus the executed evidence summarized in this report. |
| 001E-AC-019 | PASS | DONE | Ledger row 292 plus the executed evidence summarized in this report. |
| 001E-AC-020 | PASS | DONE | Ledger row 293 plus the executed evidence summarized in this report. |
| 001E-AC-021 | PASS | DONE | Ledger row 294 plus the executed evidence summarized in this report. |
| 001E-AC-022 | PASS | DONE | Ledger row 295 plus the executed evidence summarized in this report. |
| 001E-AC-023 | PASS | DONE | Ledger row 296 plus the executed evidence summarized in this report. |
| 001E-AC-024 | PASS | DONE | Ledger row 297 plus the executed evidence summarized in this report. |
| 001E-AC-025 | PASS | DONE | Ledger row 298 plus the executed evidence summarized in this report. |
| 001E-AC-026 | PASS | DONE | Ledger row 299 plus the executed evidence summarized in this report. |
| 001E-AC-027 | PASS | DONE | Ledger row 300 plus the executed evidence summarized in this report. |
| 001E-AC-028 | PASS | DONE | Ledger row 301 plus the executed evidence summarized in this report. |
| 001E-AC-029 | PASS | DONE | Ledger row 302 plus the executed evidence summarized in this report. |
| 001E-AC-030 | PASS | DONE | Ledger row 303 plus the executed evidence summarized in this report. |
| 001E-AC-031 | PASS | DONE | Ledger row 304 plus the executed evidence summarized in this report. |
| 001E-AC-032 | PASS | DONE | Ledger row 305 plus the executed evidence summarized in this report. |
| 001F-AC-001 | PASS | DONE | Ledger row 313 plus the executed evidence summarized in this report. |
| 001F-AC-002 | PASS | DONE | Ledger row 314 plus the executed evidence summarized in this report. |
| 001F-AC-003 | PASS | DONE | Ledger row 315 plus the executed evidence summarized in this report. |
| 001F-AC-004 | PASS | DONE | Ledger row 316 plus the executed evidence summarized in this report. |
| 001F-AC-005 | PASS | DONE | Ledger row 317 plus the executed evidence summarized in this report. |
| 001F-AC-006 | PASS | DONE | Ledger row 318 plus the executed evidence summarized in this report. |
| 001F-AC-007 | PASS | DONE | Ledger row 319 plus the executed evidence summarized in this report. |
| 001F-AC-008 | PASS | DONE | Ledger row 320 plus the executed evidence summarized in this report. |
| 001F-AC-009 | PASS | DONE | Ledger row 321 plus the executed evidence summarized in this report. |
| 001F-AC-010 | PASS | DONE | Ledger row 322 plus the executed evidence summarized in this report. |
| 001F-AC-011 | PASS | DONE | Ledger row 323 plus the executed evidence summarized in this report. |
| 001F-AC-012 | PASS | DONE | Ledger row 324 plus the executed evidence summarized in this report. |
| 001F-AC-013 | PASS | DONE | Ledger row 325 plus the executed evidence summarized in this report. |
| 001F-AC-014 | PASS | DONE | Ledger row 326 plus the executed evidence summarized in this report. |
| 001F-AC-015 | PASS | DONE | Ledger row 327 plus the executed evidence summarized in this report. |
| 001F-AC-016 | PASS | DONE | Ledger row 328 plus the executed evidence summarized in this report. |
| 001F-AC-017 | PASS | DONE | Ledger row 329 plus the executed evidence summarized in this report. |
| 001F-AC-018 | PASS | DONE | Ledger row 330 plus the executed evidence summarized in this report. |
| 001F-AC-019 | PASS | DONE | Ledger row 331 plus the executed evidence summarized in this report. |
| 001F-AC-020 | PASS | DONE | Ledger row 332 plus the executed evidence summarized in this report. |
| 001F-AC-021 | PASS | DONE | Ledger row 333 plus the executed evidence summarized in this report. |
| 001F-AC-022 | PASS | DONE | Ledger row 334 plus the executed evidence summarized in this report. |
| 001F-AC-023 | PASS | DONE | Ledger row 335 plus the executed evidence summarized in this report. |
| 001F-AC-024 | PASS | DONE | Ledger row 336 plus the executed evidence summarized in this report. |
| 001F-AC-025 | PASS | DONE | Ledger row 337 plus the executed evidence summarized in this report. |
| 001F-AC-026 | BLOCKED: external evidence | BLOCKED: G5 | Ledger row 338 and the external evidence register. |
| 001F-AC-027 | PASS | DONE | Ledger row 339 plus the executed evidence summarized in this report. |
| 001F-AC-028 | PASS | DONE | Ledger row 340 plus the executed evidence summarized in this report. |
| 001F-AC-029 | PASS | DONE | Ledger row 341 plus the executed evidence summarized in this report. |
| 001H-AC-001 | BLOCKED: external evidence | BLOCKED: EXTERNAL EVIDENCE | Ledger row 349 and the external evidence register. |
| 001H-AC-002 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 350 and the external evidence register. |
| 001H-AC-003 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 351 and the external evidence register. |
| 001H-AC-004 | PASS | DONE | Ledger row 352 plus the executed evidence summarized in this report. |
| 001H-AC-005 | DEFERRED: live HighLevel | DEFERRED: LIVE HIGHLEVEL AUTH | Ledger row 353 and the external evidence register. |
| 001H-AC-006 | PASS | DONE | Ledger row 354 plus the executed evidence summarized in this report. |
| 001H-AC-007 | PASS | DONE | Ledger row 355 plus the executed evidence summarized in this report. |
| 001H-AC-008 | PASS | DONE | Ledger row 356 plus the executed evidence summarized in this report. |
| 001H-AC-009 | PASS | DONE | Ledger row 357 plus the executed evidence summarized in this report. |
| 001H-AC-010 | PASS | DONE | Ledger row 358 plus the executed evidence summarized in this report. |
| 001H-AC-011 | PASS | DONE | Ledger row 359 plus the executed evidence summarized in this report. |
| 001H-AC-012 | PASS | DONE | Ledger row 360 plus the executed evidence summarized in this report. |
| 001H-AC-013 | PASS | DONE | Ledger row 361 plus the executed evidence summarized in this report. |
| 001H-AC-014 | PASS | DONE | Ledger row 362 plus the executed evidence summarized in this report. |
| 001H-AC-015 | PASS | DONE | Ledger row 363 plus the executed evidence summarized in this report. |
| 001H-AC-016 | PASS | DONE | Ledger row 364 plus the executed evidence summarized in this report. |
| 001H-AC-017 | PASS | DONE | Ledger row 365 plus the executed evidence summarized in this report. |
| 001H-AC-018 | PASS | DONE | Ledger row 366 plus the executed evidence summarized in this report. |
| 001H-AC-019 | PASS | DONE | Ledger row 367 plus the executed evidence summarized in this report. |
| 001H-AC-020 | PASS | DONE | Ledger row 368 plus the executed evidence summarized in this report. |
| 001H-AC-021 | PASS | DONE | Ledger row 369 plus the executed evidence summarized in this report. |
| 001H-AC-022 | PASS | DONE | Ledger row 370 plus the executed evidence summarized in this report. |
| 001H-AC-023 | PASS | DONE | Ledger row 371 plus the executed evidence summarized in this report. |
| 001H-AC-024 | PASS | DONE | Ledger row 372 plus the executed evidence summarized in this report. |
| 001G-AC-001 | PASS | DONE | Ledger row 380 plus the executed evidence summarized in this report. |
| 001G-AC-002 | PASS | DONE | Ledger row 381 plus the executed evidence summarized in this report. |
| 001G-AC-003 | PASS | DONE | Ledger row 382 plus the executed evidence summarized in this report. |
| 001G-AC-004 | PASS | DONE | Ledger row 383 plus the executed evidence summarized in this report. |
| 001G-AC-005 | PASS | DONE | Ledger row 384 plus the executed evidence summarized in this report. |
| 001G-AC-006 | PASS | DONE | Ledger row 385 plus the executed evidence summarized in this report. |
| 001G-AC-007 | PASS | DONE | Ledger row 386 plus the executed evidence summarized in this report. |
| 001G-AC-008 | PASS | DONE | Ledger row 387 plus the executed evidence summarized in this report. |
| 001G-AC-009 | PASS | DONE | Ledger row 388 plus the executed evidence summarized in this report. |
| 001G-AC-010 | PASS | DONE | Ledger row 389 plus the executed evidence summarized in this report. |
| 001G-AC-011 | PASS | DONE | Ledger row 390 plus the executed evidence summarized in this report. |
| 001G-AC-012 | PASS | DONE | Ledger row 391 plus the executed evidence summarized in this report. |
| 001G-AC-013 | PASS | DONE | Ledger row 392 plus the executed evidence summarized in this report. |
| 001G-AC-014 | PASS | DONE | Ledger row 393 plus the executed evidence summarized in this report. |
| 001G-AC-015 | PASS | DONE | Ledger row 394 plus the executed evidence summarized in this report. |
| 001G-AC-016 | PASS | DONE | Ledger row 395 plus the executed evidence summarized in this report. |
| 001G-AC-017 | PASS | DONE | Ledger row 396 plus the executed evidence summarized in this report. |
| 001G-AC-018 | PASS | DONE | Ledger row 397 plus the executed evidence summarized in this report. |
| 001G-AC-019 | PASS | DONE | Ledger row 398 plus the executed evidence summarized in this report. |
| 001G-AC-020 | PASS | DONE | Ledger row 399 plus the executed evidence summarized in this report. |
| 001G-AC-021 | PASS | DONE | Ledger row 400 plus the executed evidence summarized in this report. |
| 001G-AC-022 | PASS | DONE | Ledger row 401 plus the executed evidence summarized in this report. |
| 001G-AC-023 | PASS | DONE | Ledger row 402 plus the executed evidence summarized in this report. |
| 001G-AC-024 | PASS | DONE | Ledger row 403 plus the executed evidence summarized in this report. |
| 001G-AC-025 | PASS | DONE | Ledger row 404 plus the executed evidence summarized in this report. |
| 001G-AC-026 | PASS | DONE | Ledger row 405 plus the executed evidence summarized in this report. |
| 001G-AC-027 | PASS | DONE | Ledger row 406 plus the executed evidence summarized in this report. |
| 001G-AC-028 | PASS | DONE | Ledger row 407 plus the executed evidence summarized in this report. |
| 001G-AC-029 | PASS | DONE | Ledger row 408 plus the executed evidence summarized in this report. |
| 001G-AC-030 | PASS | DONE | Ledger row 409 plus the executed evidence summarized in this report. |
| 001G-AC-031 | PASS | DONE | Ledger row 410 plus the executed evidence summarized in this report. |
| 001G-AC-032 | PASS | DONE | Ledger row 411 plus the executed evidence summarized in this report. |
| 001G-AC-033 | PASS | DONE | Ledger row 412 plus the executed evidence summarized in this report. |
| 001G-AC-034 | PASS | DONE | Ledger row 413 plus the executed evidence summarized in this report. |
| 001G-AC-035 | PASS | DONE | Ledger row 414 plus the executed evidence summarized in this report. |
| 001G-AC-036 | PASS | DONE | Ledger row 415 plus the executed evidence summarized in this report. |
| 001G-AC-037 | PASS | DONE | Ledger row 416 plus the executed evidence summarized in this report. |
| 001G-AC-038 | PASS | DONE | Ledger row 417 plus the executed evidence summarized in this report. |
| 001G-AC-039 | PASS | DONE | Ledger row 418 plus the executed evidence summarized in this report. |
| 001G-AC-040 | PASS | DONE | Ledger row 419 plus the executed evidence summarized in this report. |
| 001G-AC-041 | PASS | DONE | Ledger row 420 plus the executed evidence summarized in this report. |
| 001G-AC-042 | PASS | DONE | Ledger row 421 plus the executed evidence summarized in this report. |
| 001G-AC-043 | PASS | DONE | Ledger row 422 plus the executed evidence summarized in this report. |
| 001I-AC-001 | PASS: repository-side flow | IN PROGRESS | production-generation.ts:633, profile-foundation.ts:329, and ai-generation.test.ts:369 prove source-bound review and explicit confirmation. |
| 001I-AC-002 | PASS | DONE | Ledger row 431 plus the executed evidence summarized in this report. |
| 001I-AC-003 | PASS | DONE | Ledger row 432 plus the executed evidence summarized in this report. |
| 001I-AC-004 | PASS | DONE | Ledger row 433 plus the executed evidence summarized in this report. |
| 001I-AC-005 | PASS | DONE | Ledger row 434 plus the executed evidence summarized in this report. |
| 001I-AC-006 | PASS | DONE | Ledger row 435 plus the executed evidence summarized in this report. |
| 001I-AC-007 | BLOCKED: configured model evidence | IN PROGRESS | golden-evaluation.ts:53 and ai-generation.test.ts:732 prove the offline evaluator; real primary and fallback executions are absent. |
| 001I-AC-008 | PASS | DONE | Ledger row 437 plus the executed evidence summarized in this report. |
| 001I-AC-009 | PASS | DONE | Ledger row 438 plus the executed evidence summarized in this report. |
| 001I-AC-010 | PASS | DONE | Ledger row 439 plus the executed evidence summarized in this report. |
| 001I-AC-011 | PASS | DONE | Ledger row 440 plus the executed evidence summarized in this report. |
| 001I-AC-012 | PASS | DONE | Ledger row 441 plus the executed evidence summarized in this report. |
| 001I-AC-013 | BLOCKED: external evidence | BLOCKED: EXTERNAL EVIDENCE | Ledger row 442 and the external evidence register. |
| 001I-AC-014 | BLOCKED: external evidence | BLOCKED: EXTERNAL EVIDENCE | Ledger row 443 and the external evidence register. |

## Exact audited file inventory

Every new source file was read in full. Every tracked diff and changed public contract was inspected in context. The security report is included because it is the required predecessor to this Quality report. The QA report itself is listed last as the only file authored by Quality.

| State | File |
| --- | --- |
| M | PRODUCTION_EXECUTION_LEDGER.md |
| M | apps/web/src/features/onboarding/components/onboarding-screen.integration.test.tsx |
| M | apps/web/src/features/onboarding/components/onboarding-screen.tsx |
| M | apps/web/src/features/onboarding/components/onboarding.module.css |
| M | apps/web/src/features/reporting/components/reporting-screen.integration.test.tsx |
| M | apps/web/src/features/reporting/components/reporting.module.css |
| M | apps/web/src/features/reporting/components/reports-screen.tsx |
| M | apps/web/src/features/ui-foundation/model/synthetic-ui.ts |
| M | apps/web/src/fixtures/ui-foundation/synthetic-ui.ts |
| M | package.json |
| M | packages/ai/src/index.ts |
| M | packages/ai/src/production-generation.ts |
| M | packages/application/src/profile-foundation.ts |
| M | packages/auth/src/index.ts |
| M | packages/auth/tsconfig.json |
| M | packages/contracts/src/ai-generation.ts |
| M | packages/contracts/src/index.ts |
| M | packages/contracts/src/profile-foundation.ts |
| M | packages/ghl/src/lead-routing.ts |
| M | packages/rendering/package.json |
| M | pnpm-lock.yaml |
| M | pnpm-workspace.yaml |
| M | tests/contracts/ghl/fixtures/g4-special-category.json |
| M | tests/contracts/ghl/gates.test.ts |
| M | tooling/tests/unit/production-foundation/ai-generation.test.ts |
| M | tooling/tests/unit/production-foundation/lead-routing.test.ts |
| M | tooling/tests/unit/production-foundation/profile-foundation.test.ts |
| ?? | apps/web/src/features/reporting/components/reporting-acceptance-surface.tsx |
| ?? | apps/web/src/features/reporting/model/reporting-acceptance.ts |
| ?? | library/requirements/in-work/prd-001-operation-automated-lo/qa/2026-07-21-prd001-completion-raid-security-audit.md |
| ?? | packages/ai/src/golden-evaluation.ts |
| ?? | packages/auth/src/browser-session.ts |
| ?? | packages/auth/src/embedded-session.ts |
| ?? | packages/auth/src/oauth-state.ts |
| ?? | packages/auth/src/token-lifecycle.ts |
| ?? | tests/fixtures/ai/prd001i-golden-v1.json |
| ?? | tooling/tests/unit/production-foundation/auth-policy.test.ts |
| A | library/requirements/in-work/prd-001-operation-automated-lo/qa/2026-07-21-prd001-completion-raid-qa-report.md |

## External evidence disposition

The final 38-row external or deferred set consists of 28 live HighLevel Auth rows, 7 rows labeled BLOCKED: EXTERNAL EVIDENCE in the ledger, 1 G3/G4 row, 1 G5 row, and PRD-001I AC007. PRD-001J AC028 remains inside the live HighLevel set but also carries the local Critical described above.

Still required:

- Authorized direct-install and agency-install HighLevel exercises, signed Custom Page context, OAuth, refresh, uninstall, reinstall, role, embedded-session, and first-party fallback evidence.
- Real environment KMS rotation and cross-environment denial.
- Preview, staging, and production isolation evidence.
- Production smoke, rollback, restore, synthetic and reconciliation exercises.
- Controlled HighLevel and Meta App Test evidence for all three Special Ad Category campaign types.
- One authorized no-spend synthetic lead route with full read-back.
- A timed prepared-location onboarding run.
- Real configured primary and fallback AI runs against the same golden corpus.
- Legal and provider data-term approval.
- Founding-cohort 30, 60, and 90-day cost evidence.
- Live billing lifecycle evidence under G6.
- Fifteen paid founding customers for G8, which remains an accepted constraint and is not an acceptance-row pass.

## Files not modified by Quality

Quality did not alter source, tests, manifests, the lockfile, PRDs, the execution ledger, or the Security report. This report is the only Quality write.

## Final ruling

Return the implementation loop to Security after fixing the exact cookie Origin-to-Host boundary and the red visual release gate. Do not ship or claim PRD-001 repository completion until the full exact Node 24.18.0 verify command passes and both close-out Guardians rerun in order.

This interim ruling is superseded by `2026-07-21-prd001-completion-raid-qa-report-post-security-fixes.md`.
