# Security Design Review: 2026 Research Completeness and PRD Gate

**Audit date:** 2026-07-20  
**Auditor:** security-guardian  
**Scope:** 2026 build-readiness research, architecture and integration updates, PRD-001 gate updates, PRD-002 readiness register, and all future add-on PRDs in the current change  
**Review type:** Documentation and product-security boundary review. No executable application or dependency files changed.  
**CVE watchlist last refreshed:** 2026-04-24, within the 120-day freshness window

---

## Executive summary

The research-first change passes security design review after one workflow-data-minimization fix. The selected architecture now requires database-enforced location isolation, server-only OAuth and Marketplace secrets, an explicit HighLevel action allowlist, immutable approval before the separate publish command, Ed25519 webhook verification, hosted payments, private source assets, short-lived object access, durable idempotency, and PII-safe logs and events.

Production remains blocked by the App Test, Marketplace, lender, counsel, billing, lead-path, and demand gates. This review approves the documentation boundary. It does not approve a future implementation or any licensed-data add-on.

---

## Scorecard

| Category | Status | Evidence |
| --- | --- | --- |
| Authentication and tenant isolation | PASS | Signed HighLevel context, short-lived product session, location-bound commands, Postgres RLS, and cross-tenant tests are required. |
| OAuth and provider credentials | PASS | Token exchange is backend-only, tokens are encrypted, refresh is coordinated, and browser and support surfaces exclude credentials. |
| HighLevel Ads Manager authorization | PASS | The broad `adPublishing.write` scope is constrained by a server-side method and route allowlist, named approval, explicit publish, and forbidden-operation tests. |
| Webhooks and replay | PASS | New code uses `X-GHL-Signature` Ed25519 over the raw body, durable deduplication, fast acknowledgement, and reconciliation. |
| Billing and card data | PASS | Stripe-hosted Checkout or provider-hosted fields prevent raw card numbers and security codes from reaching the product. HighLevel billing authorization is tested idempotently. |
| Public assets and uploads | PASS | Private source storage, short-lived presigned access, validation, re-encoding, metadata stripping, and a separate published projection are required. |
| Durable workflow data | PASS AFTER FIX | Workflow event payloads now contain opaque job and tenant references only, and workers fetch authorized data server-side. |
| AI data and authority | PASS | Product API credentials are server-only, usage is tenant-attributed, model output is untrusted draft content, and models cannot approve or publish. |
| Licensed-data add-ons | BLOCKED BY DESIGN | Property, valuation, equity, and refinance products cannot enter implementation before provider rights, legal basis, retention, deletion, and economics are approved. |

---

## Findings fixed in this review

- [x] **Medium: durable workflow history could become an unnecessary copy of sensitive data.** The architecture named Inngest but did not explicitly constrain event payloads. The research gate and system architecture now require opaque tenant and job references only, server-side authorized data fetch, exclusion of OAuth tokens and raw lead payloads, and DPA and retention approval before production.

No Critical or High findings remain in the documentation set.

---

## Sensitive-data scan

Twenty-three changed Markdown files were scanned for private-key blocks, Stripe secret-key shapes, JWT shapes, Social Security number shapes, email addresses, US phone numbers, and payment-card-like values.

- Private keys: 0
- Stripe secret shapes: 0
- JWT shapes: 0
- Social Security number shapes: 0
- Email addresses: 0
- US phone numbers: 0
- Payment-card-like matches: 8 false positives, all public documentation article IDs in URLs

No Broker Marketplace account data, customer PII, credentials, payment data, borrower records, or authenticated screenshots are present in the change.

---

## Required implementation-time security verification

1. Prove database and repository cross-tenant isolation for every table and object path, including service-role and support paths.
2. Prove the HighLevel action allowlist cannot invoke deletes, audience mutations, integration changes, Google or LinkedIn writes, reselling, or autonomous budget changes.
3. Test OAuth state, context forgery, refresh races, uninstall, reconnect, token leakage, and tenant swapping.
4. Test webhook raw-body signatures, altered bodies, replay, duplicates, out-of-order events, delayed delivery, and circuit-breaker recovery.
5. Test Stripe and HighLevel billing state transitions for duplicate, delayed, failed, cancelled, refunded, uninstalled, and transferred accounts.
6. Test malicious uploads, presigned URL leakage, public projection overreach, object enumeration, custom-domain takeover, and tenant-prefix bypass.
7. Verify Inngest, Supabase, Vercel, Cloudflare, Stripe, AI provider, monitoring, and support subprocessors, DPAs, retention, deletion, and incident-notification terms.
8. Run dependency, application, and infrastructure security audits after executable code and deployment configuration exist.

---

## Verdict

PASS for the research and PRD design change. Production implementation remains a no-go until the build-readiness gates close and the implementation receives a fresh security review followed by quality verification.
