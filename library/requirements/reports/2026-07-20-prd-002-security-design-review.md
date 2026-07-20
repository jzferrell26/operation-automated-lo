# Security Design Review: PRD-002 Operation Automated LO Add-On Portfolio

**Audit date:** 2026-07-20  
**Auditor:** security-guardian  
**Scope:** PRD-002 index and eight sub-PRDs, plus the PRD-001 requirement additions made in the same change  
**Review type:** Documentation and product-security boundary review. No executable application or dependency files changed.  
**CVE watchlist last refreshed:** 2026-04-24, within the 120-day freshness window

---

## Executive Summary

The authored add-on portfolio now has explicit tenant isolation, hosted-payment, provider-secret, callback-verification, PII-minimization, public-link, data-rights, revocation, and media-upload requirements. Three High-severity design gaps were identified and corrected in the PRDs before quality review. No captured account PII, credentials, payment data, borrower records, or customer-specific values were detected in the changed documents.

---

## Scorecard

| Category | Status | Findings |
|---|---|---|
| Financial and Payment Security | PASS AFTER FIX | Hosted payment boundary added |
| PII Exposure | PASS AFTER FIX | URL, logging, telemetry, and support boundaries added |
| Authentication and Authorization | PASS AFTER FIX | Tenant-bound domain and collaborator rules present |
| Injection and Upload Safety | PASS AFTER FIX | Media decode, re-encode, metadata stripping, and private-default storage required |
| Dependency Security | NOT APPLICABLE | No executable code or dependency files changed |
| Provider and Callback Security | PASS AFTER FIX | Server-only credentials plus signed, replay-resistant, idempotent callbacks required |
| Data Handling | PASS | Minimization, consent, retention, deletion, revocation, and no shared-model training required |

---

## Critical Findings

None detected.

---

## High Findings Fixed in This Review

- [x] **Custom-domain takeover and cross-tenant routing:** `prd-002a-operation-automated-lo-add-ons-domains-analytics.md:34` now requires tenant-bound, expiring verification and unique hostname ownership. Lines 35 and 43 require re-verification plus routing and certificate deprovisioning after disconnect or transfer.
- [x] **Payment, provider-secret, and callback boundary:** `prd-002-operation-automated-lo-add-ons-index.md:91` now prevents raw card data from reaching the product. Line 92 requires server-only encrypted credentials and signed, replay-resistant, idempotent, tenant-bound callbacks.
- [x] **Consumer and mortgage data in URLs, logs, and telemetry:** `prd-002d-operation-automated-lo-add-ons-financing-scenarios.md:31`, `prd-002e-operation-automated-lo-add-ons-homeowner-intelligence.md:28`, and `prd-002f-operation-automated-lo-add-ons-refinance-signals.md:29` now require opaque identifiers and exclude raw consumer, property, loan, rate, value, equity, and provider-source records from those surfaces.

---

## Medium Findings

None detected.

---

## Low Findings

None detected.

---

## Sensitive-Data Scan

The changed document set was scanned for private-key blocks, Stripe secret-key shapes, JWT shapes, Social Security number shapes, payment-card-like values, email addresses, and US phone-number shapes. All match counts were zero.

---

## Required Implementation-Time Security Work

- Re-run the full application security audit after executable code and dependency manifests exist.
- Verify access-control tests for every collaborator, agency, location, entitlement, public link, provider callback, and support-access path.
- Verify provider data terms, Marketplace resale rights, retention, subprocessors, and incident-notification duties before enabling licensed-data add-ons.
- Test malicious uploads, public-link enumeration, hostname takeover, DNS transfer, callback replay, cross-tenant object access, and billing-entitlement forgery.

---

## Files Changed by Security Review

| File | Security change |
|---|---|
| `prd-002-operation-automated-lo-add-ons-index.md` | Added hosted-payment, provider-secret, callback, and safe-observability requirements |
| `prd-002a-operation-automated-lo-add-ons-domains-analytics.md` | Added tenant-bound hostname verification, re-verification, and deprovisioning |
| `prd-002d-operation-automated-lo-add-ons-financing-scenarios.md` | Added opaque public-link and analytics identifiers |
| `prd-002e-operation-automated-lo-add-ons-homeowner-intelligence.md` | Added PII-safe public-link, telemetry, log, and support requirements |
| `prd-002f-operation-automated-lo-add-ons-refinance-signals.md` | Added PII-safe URL, log, analytics, and notification requirements |
| `prd-002h-operation-automated-lo-add-ons-creative-media-packs.md` | Added media validation, re-encoding, metadata stripping, and private-default storage |

---

## Verdict

Security design review passed. The documents are ready for quality verification. This does not certify a future implementation.
