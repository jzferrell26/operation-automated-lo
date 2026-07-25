# Security Audit Report: Operation Automated LO Research and PRD Package

**Audit date:** 2026-07-19

**Auditor:** security-guardian

**Scope:** Repository research, architecture, threat model, and PRD 001 documents

**Next.js version audited:** Not applicable, no application code or dependency manifest exists

**React version audited:** Not applicable, no application code or dependency manifest exists

**CVE watchlist last refreshed:** 2026-04-25

## Executive Summary

This is a pre-implementation security design review, not a source-code audit. No Critical or High findings were detected in the research package, and the proposed architecture explicitly addresses tenant isolation, OAuth and token handling, approval integrity, webhook verification, public-page isolation, file uploads, PII minimization, and constrained ad commands. Three Medium design decisions must be closed before production, and the implementation must receive a new code, dependency, and configuration audit after a stack and lockfile exist.

## Scorecard

| Category | Status | Findings |
| --- | --- | --- |
| Financial / Payment Security | OK | Payments and ad-spend rebilling are outside the initial product scope. |
| PII Exposure | ATTN | Retention periods for consent, approval, and ad evidence remain open. |
| Authentication and Authorization | ATTN | The final approval-link challenge and paired-app permission model remain open. |
| Injection Vulnerabilities | OK | The design requires schema validation, output encoding, sanitization, upload controls, and renderer isolation. |
| Dependency Security | ATTN | No dependency manifest exists yet, so CVE and supply-chain checks cannot run. |
| Configuration and Headers | ATTN | The exact embedded-app `frame-ancestors` policy is not yet fixed. |
| Data Handling | ATTN | Production deletion and retention durations must be selected and tested. |

Legend: **OK** means no finding in the current design artifact. **ATTN** means a pre-production design or implementation gate remains. **FAIL** would mean a Critical or High finding.

## Critical Findings (fixed in this session)

None detected.

## High Findings (fixed in this session)

None detected.

## Medium Findings (follow-up required)

- [ ] **Close the Ads Publisher permission boundary before Marketplace submission**: `library/knowledge/private/integrations/ghl-marketplace-and-scopes.md:81`

  `adPublishing.write` covers more destructive behavior than the first release needs. The proposed paired core and Ads Publisher architecture is the correct least-privilege direction, but HighLevel acceptance of that pairing still requires App Test and Marketplace confirmation. Until that is resolved, the founding beta must use the documented server-side action allowlist, account allowlist, immutable approval gate, and no-delete policy.

- [ ] **Fix the embedded application session and framing policy**: `library/knowledge/private/security/threat-model.md:94`

  The exact HighLevel and white-label `frame-ancestors` allowlist remains open. Before implementation, document separate header policies for the embedded authenticated application and public campaign pages, define `Secure` and `SameSite` cookie behavior inside the iframe, and preserve the direct first-party URL fallback when browser privacy controls block the embedded session.

- [ ] **Select retention and deletion periods before collecting leads**: `library/knowledge/private/security/threat-model.md:94`

  The model identifies consent receipts, approval records, property assets, provider IDs, and lead attribution events, but production durations are not selected. Mortgage counsel and the privacy owner must approve a data-class retention table, deletion triggers, legal holds, export behavior, and downstream deletion responsibilities before production traffic.

## Low Findings (documentation only)

None detected.

## Dependency Audit

```text
Not applicable. The repository contains Markdown research and requirements only.
No package.json, lockfile, Python manifest, application source, or runtime image exists.
A dependency audit is mandatory when the implementation stack is introduced.
```

## Next.js Version Check

| CVE | Patched threshold | Current project | Status |
| --- | --- | --- | --- |
| CVE-2025-29927, middleware bypass | 14.2.25 / 15.2.3 | No Next.js dependency | Not applicable |
| CVE-2025-55182, React2Shell RCE | React 19.0.1 / 19.1.2 / 19.2.1 | No React dependency | Not applicable |
| CVE-2025-66478, Next.js companion | Latest supported patch | No Next.js dependency | Not applicable |
| CVE-2026-27978, null-origin CSRF | Latest supported patch | No Next.js dependency | Not applicable |

The security CVE reference was refreshed 85 days before this audit and is within the 120-day freshness gate. Versions must be checked again against current vendor advisories when dependencies are selected.

## Files Changed (remediation)

| File | Change Summary |
| --- | --- |
| `library/requirements/in-work/prd-001-operation-automated-lo/qa/2026-07-19-security-design-review.md` | Added the pre-implementation security review and production gates. |

The research diff was reviewed and confirmed to contain no application code, dependency manifests, executable scripts, credentials, API tokens, private keys, or client PII on 2026-07-19.

## Recommended Follow-Up (architectural)

- Make every tenanted repository API require a server-derived `location_id`; reject cross-tenant object IDs with a non-enumerating response.
- Use envelope encryption and a location-scoped refresh lock for GHL tokens. Never expose tokens to the browser or background-job payloads.
- Verify signed HighLevel context on the backend and issue a short-lived application session. Do not authorize from query parameters.
- Verify `X-GHL-Signature` with Ed25519 over the raw webhook body, store event identity before enqueue, and reject replay.
- Separate embedded-app framing headers from public-page headers. Public pages should not be frameable unless a documented campaign use case requires it.
- Render only a frozen public projection. Sanitize text, re-encode images, remove EXIF, block internal-network access from renderers, and use private storage by default.
- Keep the first release Meta-only. Make delete operations, custom-audience mutation, ad reselling, Google publishing, LinkedIn publishing, and unapproved budget changes unreachable in product code.
- Run the full security scan again after application code, dependencies, deployment configuration, and tests exist. Then run quality-guardian against the implemented acceptance criteria.

*Generated by security-guardian using security-weapon.*
