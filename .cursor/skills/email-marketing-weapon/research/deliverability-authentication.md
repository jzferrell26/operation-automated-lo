---
retrieved_on: 2026-06-25
source_type: official-docs + standards + vendor
authority: official (Google/BIMI Group/DigiCert) + practitioner
relevance: critical
topic: authentication
weapon: email-marketing-weapon
---

# Email Authentication: SPF, DKIM, DMARC, BIMI/VMC — 2026

## Primary sources
- Google, Set up BIMI — https://knowledge.workspace.google.com/admin/security/set-up-bimi (official)
- BIMI Group Implementation Guide — https://bimigroup.org/implementation-guide/ (standards body)
- DigiCert, Mark Certificates for BIMI: VMC and CMC setup — https://www.digicert.com/blog/bimi-setup-guide-for-vmc-and-cmc (CA, authoritative)
- Red Sift, "BIMI in 2026: verified logos, CMCs, fastest path to inbox display" — https://redsift.com/guides/bimi-in-2026-verified-logos-cmcs-and-the-fastest-path-to-inbox-display (practitioner)
- Validity, "BIMI Requirements: a Guide to VMC, CMC, and Apple Business Connect" — https://www.validity.com/blog/bimi-requirements-a-guide-to-vmc-cmc-and-apple-business-connect/ (practitioner)
- RFC 8058 (List-Unsubscribe one-click) — IETF standard, referenced in sender-requirements-2026.md

## SPF
- TXT record at the sending domain listing authorized sending IPs/includes. Yahoo: invalid/missing SPF lets providers reject mail from unlisted IPs.
- Must be a SINGLE TXT record, kept under the 10-DNS-lookup limit (flatten if exceeded; a common silent failure).
- For DMARC alignment, the SPF domain (Return-Path / envelope-from) should align with the From: domain. With most ESPs the envelope-from is the ESP's domain, so DKIM alignment usually carries DMARC.

## DKIM
- Cryptographic signature; provider fetches the public key from `selector._domainkey.yourdomain`.
- Key length: **1024-bit minimum (Yahoo), 2048-bit recommended.**
- DKIM `d=` domain is what Google Postmaster Tools uses to identify and group your traffic — so the DKIM domain should be your own (dedicated) domain, not the ESP's shared domain, for both reputation ownership and Postmaster visibility.

## DMARC
- TXT record at `_dmarc.yourdomain`. Minimum to comply: `v=DMARC1; p=none;`.
- Recommended escalation path (GoHighLevel official + general best practice):
  1. `v=DMARC1; p=none;` (monitor, collect aggregate rua reports)
  2. `v=DMARC1; p=quarantine; pct=50;` (partial enforcement during validation)
  3. `v=DMARC1; p=reject;` (full enforcement once aligned)
- Alignment: From: org-domain must align with SPF org-domain OR DKIM org-domain. Relaxed alignment acceptable.
- GOTCHA: a root-domain `p=reject` WITHOUT a properly configured dedicated sending domain causes most inbox providers to reject your ESP-sent mail → elevated bounces. (See gohighlevel-sending.md.)

## BIMI + VMC/CMC (brand logo in inbox)
- **Hard prerequisite: DMARC at enforcement — p=quarantine OR p=reject. BIMI will NOT work at p=none.**
- Flow: provider verifies DMARC alignment at enforcement → fetches SVG logo from BIMI DNS record → validates the VMC or CMC certificate.
- Certificate types:
  - **VMC (Verified Mark Certificate):** requires a **registered trademark**. Supported by Gmail, Yahoo, Apple Mail.
  - **CMC (Common Mark Certificate):** arrived 2024-2025; for brands WITHOUT a registered trademark; requires **12+ months of proven public logo use**. Widens eligibility.
- Logo asset: **SVG Tiny 1.2 Portable/Secure (SVG P/S)**, **1:1 aspect ratio**, non-transparent background, **no scripts/external refs/animations**. Gmail wants **min 96x96 px**, size specified in absolute pixels.
- Timeline: providers typically require the domain to stay at DMARC enforcement **30+ consecutive days** before displaying the logo. Budget **4-8 weeks** end to end (mostly DMARC-enforcement runway + certificate vetting).

## What the Weapon should encode
- A DNS-record audit checklist: SPF (single record, <10 lookups, aligned), DKIM (own-domain d=, 2048-bit), DMARC (present, alignment, policy level), with the exact record syntax for each.
- The DMARC escalation ladder (none → quarantine/pct → reject) as the standard remediation path.
- BIMI as an OPTIONAL upside that REQUIRES p=quarantine/reject first — never recommend BIMI before enforcement is reached.
- The VMC-vs-CMC decision (registered trademark vs 12-month logo-use) so the Guardian can advise per client (e.g. whether Heather Ferrari has a registered mark).
- The "p=reject on root domain without dedicated sending domain = bounces" footgun, prominently, because it is a direct GoHighLevel failure mode.
