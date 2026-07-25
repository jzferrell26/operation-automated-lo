# Security Audit Report: G8 Accepted Constraint

**Audit date:** 2026-07-20
**Auditor:** security-guardian using security-weapon
**Scope:** The 11 active Markdown files changed by `codex/g8-accepted-constraint`, reviewed against `origin/main`
**Next.js version audited:** 16.2.10
**React version audited:** 19.2.7
**CVE watchlist last refreshed:** 2026-04-24, within the 120-day freshness limit

## Executive Summary

Security PASS. The documentation-only decision record has zero Critical or High findings, does not expose PII or secrets, does not claim that payment or founder evidence exists, and does not authorize production while G1 through G7 remain blocked. Three inherited Moderate dependency advisories remain documented; this branch changes no dependency, runtime, UI, schema, provider, payment, or CI surface.

## Scorecard

| Category | Status | Findings |
| --- | --- | ---: |
| Financial / Payment Security | OK | 0 |
| PII Exposure | OK | 0 |
| Authentication & Authorization | OK | 0 |
| Injection Vulnerabilities | OK | 0 |
| Dependency Security | ATTN | 3 inherited Moderate advisories |
| Configuration & Headers | OK | 0 |
| Data Handling | OK | 0 |

Legend: **OK** means zero findings. **ATTN** means Medium or Low findings are documented. **FAIL** means Critical or High findings exist.

## Critical Findings (fixed in this session)

None detected.

## High Findings (fixed in this session)

None detected.

## Medium Findings (follow-up required)

None introduced by this branch.

The repository dependency audit reports three inherited Moderate advisories in `esbuild`, `postcss`, and `@opentelemetry/core`. The branch changes no package manifest or lockfile, and the release-blocking threshold remains clear at zero Critical and zero High findings.

## Low Findings (documentation only)

None detected.

## Decision and Financial Integrity Review

- `library/knowledge/private/research/2026-build-readiness-and-research-gate.md:11` records the dated product-owner directive, states that no evidence of 15 paid founders exists, and says commercial validation remains unproven.
- `library/knowledge/private/research/2026-build-readiness-and-research-gate.md:150` records G8 as `ACCEPTED CONSTRAINT: COMMERCIAL VALIDATION UNPROVEN`, never `PASS`.
- `library/knowledge/private/discovery/g8-evidence-register.md:7-15` preserves the evidence boundary, contains no live participant records, and limits the decision to G8.
- `library/requirements/in-work/prd-001-operation-automated-lo/prd-001-operation-automated-lo-index.md:180` requires a stop, kill, or reshape review if the post-start demand target is missed before expansion or additional investment.

No founder account, payment record, payment-card value, provider credential, borrower record, email address, phone number, physical address, or raw research artifact appears in the diff.

## Production Authorization Review

- `README.md:17` keeps G1 through G7 blocked and requires an explicit closure state for each before production.
- `README.md:26` states that G8 does not authorize production.
- `library/knowledge/private/research/2026-build-readiness-and-research-gate.md:152` prohibits production while any of G1 through G7 remains blocked.
- `library/requirements/in-work/prd-001-operation-automated-lo/prd-001-operation-automated-lo-index.md:5` keeps production implementation blocked by G1 through G7.

The accepted commercial risk is not represented as proof of demand, permission to spend, permission to collect customer data, or permission to perform a live provider write.

## Dependency Audit

```text
Exact toolchain: Node 24.18.0, pnpm 11.15.1
pnpm audit:secrets: PASS across 6 source roots
pnpm audit --audit-level=high: PASS
Critical: 0
High: 0
Moderate: 3
Low: 0
```

Inherited Moderate advisories:

1. `esbuild`: development-server request and response exposure.
2. `postcss`: unescaped closing style tag in CSS stringify output.
3. `@opentelemetry/core`: unbounded memory allocation in W3C baggage propagation.

## Next.js Version Check

| CVE | Patched threshold | Current project | Status |
| --- | --- | --- | --- |
| **CVE-2025-29927** middleware bypass | 14.2.25 / 15.2.3 | Next.js 16.2.10 | Patched |
| **CVE-2025-55182** React2Shell RCE | React 19.0.1 / 19.1.2 / 19.2.1 | React 19.2.7 | Patched |
| **CVE-2025-66478** Next.js companion | Current patched 14.x / 15.x / 16.x | Next.js 16.2.10 | Patched |
| **CVE-2026-27978** null-origin CSRF | Current patched release | Next.js 16.2.10 | Patched |

## Files Changed (remediation)

No remediation changes were required. This report is the only file added by the security close-out.

## Recommended Follow-Up (architectural)

- Continue tracking the three inherited Moderate advisories through the existing dependency-review process.
- Run a payments-guardian review before any hosted checkout, charge, refund, webhook, or reconciliation flow is implemented.
- Keep participant and payment evidence in approved access-controlled systems, never in Git.

## Conclusion

Security PASS. Zero unresolved Critical or High findings remain. Quality-guardian may now verify the decision record against G8W-001 through G8W-008.

*Generated by `security-guardian` using `security-weapon`.*
