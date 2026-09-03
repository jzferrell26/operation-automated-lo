# Security Audit Report: Repo hygiene raid

**Audit date:** 2026-09-03
**Auditor:** security-guardian (focused delta)
**Scope:** `cursor/repo-hygiene-m20-ac42` vs `main` (`56d90f6`)
**Next.js / React:** 16.2.11 / 19.2.7
**CVE watchlist last refreshed:** 2026-08-26

## Executive Summary

Hygiene-only raid. CSP proxy rename preserves nonce stripping and request-CSP mirror. Ledger regenerator no longer overwrites the canonical AC ledger by default (footgun closed). No Critical or High findings in the diff.

## Scorecard

| Category | Status | Findings |
|---|---|---|
| Financial / Payment Security | OK | 0 |
| PII Exposure | OK | 0 |
| Authentication & Authorization | OK | 0 |
| Injection Vulnerabilities | OK | 0 |
| Dependency Security | OK | Dependabot config added (alerts enablement is human/org) |
| Configuration & Headers | OK | Proxy rename; CSP behavior unchanged |
| Data Handling | OK | Canonical ledger protected from accidental regenerate |

## Critical Findings

None detected.

## High Findings

None detected.

## Medium Findings

- [x] **Ledger regenerator overwrite footgun** `tooling/scripts/generate-production-execution-ledger.mjs` - Default write moved to `tmp/`; `--write-canonical` required to overwrite `PRODUCTION_EXECUTION_LEDGER.md`.

## Low Findings

None detected in this diff.

## Residual risk / human settings

Agent cannot PATCH repo merge settings (403). Owner should disable rebase merge and set ruleset merge methods to squash only.

## Verdict

**PASS** for hygiene raid. Proceed to quality-guardian.
