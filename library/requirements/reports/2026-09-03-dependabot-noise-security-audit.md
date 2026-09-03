# Security Audit Report: Dependabot noise control

**Audit date:** 2026-09-03
**Auditor:** security-guardian (delta)
**Scope:** `.github/dependabot.yml` plus closing major Dependabot PRs
**CVE watchlist last refreshed:** 2026-08-26

## Executive Summary

Config-only. No application code. Ignoring Dependabot major bumps reduces unreviewed Action/runtime jumps (checkout 4 to 7, setup-node 5 to 7, @types/node 24 to 26). Remaining open Dependabot PR #35 (18 minor/patch) failed CI and is not merged.

## Scorecard

| Category | Status | Findings |
|---|---|---|
| Financial / Payment Security | OK | 0 |
| PII Exposure | OK | 0 |
| Authentication & Authorization | OK | 0 |
| Injection Vulnerabilities | OK | 0 |
| Dependency Security | OK | High CVEs still gated by `pnpm audit --audit-level=high`; two moderate `qs` findings remain via Trigger.dev |
| Configuration & Headers | OK | Dependabot majors ignored |

## Critical / High

None detected.

## Residual

- Leave #35 closed-or-rebased by operator after CI is understood.
- Two moderate `qs` advisories (GHSA-x5fp-wj9c-mxmx, GHSA-4mjr-xmp4-gh2g) are transitive via Trigger.dev and do not fail the high audit gate.

## Verdict

**PASS.** Proceed to quality-guardian.
