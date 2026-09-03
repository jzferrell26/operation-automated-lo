# QA Report: Actions major raid

**Plan document:** `library/requirements/reports/2026-09-03-actions-major-raid.md`
**Audit date:** 2026-09-03
**Base branch:** `main` @ `0eff5f5` (PR #39)
**Head:** `cursor/actions-major-ac42` @ `f2c25e8`
**Auditor:** quality-guardian

Ordering: `security-guardian` already ran and produced `library/requirements/reports/2026-09-03-actions-major-security-audit.md` with verdict PASS and zero Critical, High, or Medium findings. This audit ran after that report. No ordering violation.

Inventory at audit start: clean tree vs `origin/main...HEAD` (six committed files). This report is the only file written in this session.

## Summary

**Pass.** The Actions major raid matches the plan: every `actions/checkout`, `actions/cache`, and `actions/setup-node` use in `.github/workflows/ci.yml` is SHA-pinned to the specified v7.0.1 / v6.1.0 / v7.0.0 commits with version comments, and the rest of the workflow contract is unchanged. AM-010 is satisfied by the security report; AM-011 is this report. Zero Critical and zero Warning findings. One Suggestion: flip the raid ledger AM-010 and AM-011 status cells from OPEN to DONE now that both artifacts exist.

## Scorecard

| Category      | Status | Notes |
|---------------|--------|-------|
| Completeness  | ✅ | All 11 AM rows and 6 NG rows traced. AM-010 is the security report. AM-011 is this report. |
| Correctness   | ✅ | Pins, comments, `persist-credentials`, Node `24.18.0`, cache keys, triggers, and permissions match the plan. The `ci.yml` diff is `uses:` lines only. |
| Alignment     | ✅ | No npm majors, no application code, no G1 / G4 / G8 reopen, no deferred HighLevel AC flips. Maps still park Wave 1 on HighLevel approval. |
| Gaps          | ✅ | No implied CI-contract gaps. Job commands, concurrency, and required check names are unchanged (NG-006). |
| Detrimental   | ✅ | No regressions, no mutable `@vN` tags, no secrets, no lockfile or application drift. |

## Critical Issues (must fix)

None.

## Warnings (should fix)

None.

## Suggestions (consider improving)

- [ ] **Flip raid-ledger AM-010 and AM-011 from OPEN to DONE** - `library/requirements/reports/2026-09-03-actions-major-raid.md:58-59`

  Both closeout artifacts now exist and pass the stated bar (security: zero Medium or higher; this report: zero Critical and zero Warning). The plan still marks those two rows OPEN because the ledger was authored before Wave 2 and Wave 3 ran. That OPEN text is not an implementation gap. Suggested: `library-guardian` updates those two Status cells to DONE so the raid ledger matches the artifacts.

  ```markdown
  | AM-010 | `security-guardian` report exists for this branch and has no open Medium or higher | OPEN |
  | AM-011 | `quality-guardian` report exists for this branch, run after security, and has no open Medium or higher | OPEN |
  ```

## Plan Item Traceability

| #      | Plan Requirement | Status | Implementation Location | Notes |
|--------|------------------|--------|-------------------------|-------|
| AM-001 | Every `actions/checkout` use in `.github/workflows/ci.yml` is SHA-pinned to v7.0.1 `3d3c42e5aac5ba805825da76410c181273ba90b1` with a version comment | ✅ | `.github/workflows/ci.yml:27`, `:74`, `:118`, `:266` | Four of four uses. 40-char SHA. Comment `# v7.0.1`. |
| AM-002 | Every checkout step keeps `persist-credentials: false` | ✅ | `.github/workflows/ci.yml:29`, `:76`, `:120`, `:268` | Present on all four checkout steps. |
| AM-003 | Every `actions/setup-node` use is SHA-pinned to v7.0.0 `820762786026740c76f36085b0efc47a31fe5020` with a version comment | ✅ | `.github/workflows/ci.yml:32`, `:79`, `:123`, `:271` | Four of four uses. 40-char SHA. Comment `# v7.0.0`. |
| AM-004 | Every setup-node step keeps `node-version: 24.18.0` and `package-manager-cache: false` | ✅ | `.github/workflows/ci.yml:34-35`, `:81-82`, `:125-126`, `:273-274` | Both keys present on all four setup-node steps. No `registry-url`. |
| AM-005 | Every `actions/cache` use is SHA-pinned to v6.1.0 `55cc8345863c7cc4c66a329aec7e433d2d1c52a9` with a version comment | ✅ | `.github/workflows/ci.yml:48`, `:95`, `:139`, `:287` | Four of four uses. 40-char SHA. Comment `# v6.1.0`. |
| AM-006 | Cache `path`, `key`, and `restore-keys` are unchanged | ✅ | `.github/workflows/ci.yml:50-53` (same block at `:97-100`, `:141-144`, `:289-292`) | `git diff origin/main...HEAD -- .github/workflows/ci.yml` rewrites only `uses:` lines. `path` / `key` / `restore-keys` match `origin/main`. |
| AM-007 | Workflow `on:` stays `pull_request` / `push` / `workflow_dispatch`. No `pull_request_target` or `workflow_run` | ✅ | `.github/workflows/ci.yml:3-10` | Repo-wide YAML grep for `pull_request_target` and `workflow_run`: no matches. |
| AM-008 | Workflow-level and job-level `permissions: contents: read` stay | ✅ | `.github/workflows/ci.yml:12-13` (workflow); `:23-24` (`verify`); `:68-69` (`database`); `:111-112` (`release-contract`); `:256-257` (`preview-smoke`) | Five of five blocks are `contents: read` only. |
| AM-009 | Diff does not bump npm majors (`@types/node`, jsdom, `@testing-library/jest-dom`) or application code | ✅ | `git diff --name-only origin/main...HEAD` (six files, none under `apps/`, `packages/`, `package.json`, or lockfile) | Root `package.json` still has `@types/node` `24.13.3`, `jsdom` `29.1.1`, `@testing-library/jest-dom` `6.9.1`. |
| AM-010 | `security-guardian` report exists for this branch and has no open Medium or higher | ✅ | `library/requirements/reports/2026-09-03-actions-major-security-audit.md:14`, `:149` | Verdict PASS. Scorecard: 0 Critical, 0 High, 0 Medium, 0 Low. Ran before this audit. |
| AM-011 | `quality-guardian` report exists for this branch, run after security, and has no open Medium or higher | ✅ | `library/requirements/reports/2026-09-03-actions-major-qa-report.md` (this file) | Plan row still says OPEN. That is expected until this artifact is written. Do not treat the OPEN cell as a fail. |
| NG-001 | Do not take `@types/node` 26 while `engines.node` is `24.18.0` | ✅ | n/a | Honored. No `package.json` or lockfile in the diff. `@types/node` remains `24.13.3`. |
| NG-002 | Do not bump jsdom 30 or jest-dom 7 in this raid | ✅ | n/a | Honored. `jsdom` remains `29.1.1`. `@testing-library/jest-dom` remains `6.9.1`. |
| NG-003 | Do not replay Dependabot #35 npm minors | ✅ | n/a | Honored. No npm dependency files in the diff. |
| NG-004 | Do not reopen G1 / G4 / G8 or flip deferred HighLevel ACs | ✅ | `.cursor/rules/core/the-map.mdc:21`, `:36`; `library/knowledge/private/product/project-map.md:34`, `:38-40` | Honored. G1 / G4 / G8 stay `ACCEPTED CONSTRAINT`. Counts stay 267 `VERIFIED` / 28 `DEFERRED: LIVE HIGHLEVEL AUTH`. `PRODUCTION_EXECUTION_LEDGER.md` is not in the diff. |
| NG-005 | Do not claim production traffic authorized | ✅ | `library/knowledge/private/product/project-map.md:37`; `.cursor/rules/core/the-map.mdc:36` | Honored. Maps still say production traffic is disabled / not authorized. |
| NG-006 | Do not change CI job commands, concurrency, or required check names | ✅ | `.github/workflows/ci.yml:15-17` (concurrency); `:20-21`, `:64-65`, `:108-109`, `:248-249` (job ids and `name:`) | Honored. After stripping `uses:` pin lines, the `ci.yml` diff is empty. Job names stay `Application verification`, `Real PostgreSQL migrations and pgTAP`, `Release and recovery contract`, `Preview smoke contract`. Workflow name stays `Phase 0 CI`. |

## Files Changed

- `.cursor/rules/core/the-map.mdc` (M) - tip moved to `0eff5f5` (PR #39). Records the Actions major raid as the SHA-pinned follow-up. Deferred HighLevel ACs and G1 / G4 / G8 unchanged.
- `.github/workflows/ci.yml` (M) - twelve `uses:` pins only: checkout v4.2.2 to v7.0.1, cache v4.3.0 to v6.1.0, setup-node v5.0.0 to v7.0.0. No `with:`, `run:`, trigger, permission, concurrency, or job-name edits.
- `NEXT_BATCH_LEDGER.md` (M) - watchdog, changelog, and process-follow-up rows for this raid. npm majors stay deferred. HighLevel approval row stays the critical path.
- `library/knowledge/private/product/project-map.md` (M) - Delivery cell records hygiene PR #31, Dependabot PR #39, and this raid as the planned SHA-pinned follow-up. Live Wave 1 stays parked.
- `library/requirements/reports/2026-09-03-actions-major-raid.md` (A) - raid plan (source of truth for this audit).
- `library/requirements/reports/2026-09-03-actions-major-security-audit.md` (A) - Wave 2 security report (PASS). Satisfies AM-010.

Wave 4 (Phase 0 CI on the PR) is the next plan wave after this report. It is not an AM-* acceptance criterion and is not a QA gap.
