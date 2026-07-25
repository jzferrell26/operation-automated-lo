# Security Audit: G8 Founder Validation Package

**Audit date:** 2026-07-20

**Auditor:** security-guardian using security-weapon

**Scope:** Seven new files under `library/knowledge/private/discovery/` plus the security remediation recorded below.

**Application versions:** Next.js 16.2.10 and React 19.2.7 are inherited and unchanged by this documentation-only branch.

## Executive Summary

The G8 package is security-clean after one High financial-integrity design finding was remediated. The plan now requires signature-verified provider events or authenticated API read-back with idempotent reconciliation and explicitly rejects browser success redirects as payment evidence. No participant PII, payment-card data, provider credential, borrower data, live payment, external send, or provider action enters this branch.

## Scorecard

| Category | Status | Findings |
| --- | --- | ---: |
| Financial and payment security | OK after remediation | 1 High fixed |
| PII exposure | OK | 0 |
| Consent and research records | OK | 0 |
| Gate and evidence integrity | OK | 0 |
| External-action boundary | OK | 0 |
| Dependency security | ATTN | 3 inherited Moderate advisories |

## Critical Findings

None detected.

## High Findings Fixed

- [x] **Payment completion evidence could be underspecified** at `library/knowledge/private/discovery/experiments/2026-07-20-founding-cohort-demand.md:23`, `library/knowledge/private/discovery/experiments/2026-07-20-founding-cohort-demand.md:74`, and `library/knowledge/private/discovery/g8-evidence-register.md:28`. The initial wording called the payment provider authoritative but did not explicitly reject a client-controlled success redirect. The fixed contract requires a signature-verified provider event or authenticated API read-back, idempotent reconciliation, and rejection of browser success redirects.

## Medium Findings

None detected in the founder-validation package.

The repository dependency audit continues to report three previously documented Moderate transitive advisories. This branch does not change dependencies or runtime exposure.

## Low Findings

None detected.

## PII and Financial Review

- `library/knowledge/private/discovery/g8-evidence-register.md:55-63` prohibits payment-card data, credentials, borrower data, recordings, transcripts, direct identifiers, and customer screenshots in Git.
- `library/knowledge/private/discovery/g8-evidence-register.md:35-51` confines per-founder reconciliation to an access-controlled system and uses a pseudonymous evidence identifier plus an opaque payment reference.
- `library/knowledge/private/discovery/interview-scripts/2026-07-20-founding-cohort-demand.md:14-15` requires affirmative recording consent and prohibits borrower data, provider credentials, card data, and PII-bearing account screenshots.
- `library/knowledge/private/discovery/interview-scripts/2026-07-20-founding-cohort-demand.md:76-83` keeps research notes outside Git and requires PII removal from direct quotes.
- No raw card data, payment secret, provider token, email address, phone number, physical address, borrower record, or participant record is present in the diff.

## Gate Integrity Review

- G8 remains explicitly BLOCKED throughout the package.
- Completed payment is the primary signal. Registration, attendance, application, stated intent, and checkout start remain diagnostic only.
- Refunded, canceled, disputed, duplicated, complimentary, ineligible, test, or team-owned payments are excluded.
- A result of 10 to 14 does not authorize production.
- Offer, price, eligibility, refund, or demo-boundary changes create a new experiment version and cannot be pooled.
- An independent reviewer must reconcile the result before a G8 PASS decision.

## External-Action Review

This branch creates no email, checkout, charge, webhook, provider call, account mutation, ad spend, lead record, or production path. Event date, sender identity, payment URL, refund terms, privacy notice, deliverability, and checkout authorization remain explicit human-controlled preconditions.

## Verification Evidence

```text
Exact Node 24.18.0 and pnpm 11.15.1
pnpm install --frozen-lockfile: PASS, 17 workspace projects
pnpm audit:secrets: PASS across 6 source roots
pnpm audit --audit-level=high: PASS, 0 Critical, 0 High, 3 Moderate
git diff --check: PASS
Forbidden dash scan of changed files: PASS
Changed scope: library/knowledge/private/discovery plus this standalone security report only
```

## Files Changed for Remediation

| File | Change |
| --- | --- |
| `library/knowledge/private/discovery/experiments/2026-07-20-founding-cohort-demand.md` | Requires verified provider evidence, idempotent reconciliation, and rejects browser redirects. |
| `library/knowledge/private/discovery/g8-evidence-register.md` | Applies the same verified-source rule to the counting contract. |

## Follow-Up Before Experiment Launch

- Run a payments-guardian review of the selected hosted checkout and webhook implementation before accepting money.
- Obtain explicit approval for refund, cancellation, delivery, privacy, and cohort-start terms.
- Run email-marketing-guardian deliverability preflight before any invitation is scheduled.
- Keep actual participant and payment evidence in approved access-controlled systems, never in Git.

## Conclusion

Security PASS. Zero unresolved Critical or High findings remain. Quality-guardian must now verify the package against the discovery and G8 source requirements.
