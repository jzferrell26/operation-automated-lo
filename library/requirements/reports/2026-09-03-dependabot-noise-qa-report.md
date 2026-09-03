# QA Report: Dependabot noise control

**Plan:** Operator report of Dependabot flood after hygiene PR #31
**Audit date:** 2026-09-03
**Base:** `main` @ `718b7c1`
**Head:** `cursor/dependabot-noise-ac42`
**Auditor:** quality-guardian

## Summary

**Pass.** Dependabot now opens at most one grouped npm minor/patch PR and one grouped Actions minor/patch PR per week. Six major PRs closed. Grouped PR #35 left open because its CI failed.

## Scorecard

| Category | Status | Notes |
|---|---|---|
| Completeness | Pass | Ignore majors + group Actions + lower PR limits |
| Correctness | Pass | YAML matches Dependabot v2 ignore/group docs |
| Alignment | Pass | Matches dependency-audit-guardian "do not flood" guidance |
| Gaps | Pass | #35 still needs a human/CI decision |
| Detrimental | Pass | No lockfile or app changes |

## Critical Issues

None.

## Verdict

**SHIP** the config PR. Do not squash-merge Dependabot #35 until CI is green.
