# 02 - Authentication and DNS: SPF, DKIM, DMARC, BIMI

This guide is the record-level detail behind the preflight's authentication rows. The Guardian diagnoses and specifies the exact records; the operator or devops applies them in DNS. Source unless noted: `../research/deliverability-authentication.md`.

## SPF

- A single TXT record at the sending domain listing authorized sending IPs and includes.
- Must stay under the 10-DNS-lookup limit. Exceeding it is a common silent failure; flatten the record if needed.
- For DMARC alignment, the SPF domain (Return-Path / envelope-from) should align with the From: domain. With most ESPs the envelope-from is the ESP's own domain, so in practice DKIM alignment usually carries DMARC, not SPF.
- A missing or invalid SPF record lets providers reject mail from unlisted IPs (`../research/sender-requirements-2026.md`).

## DKIM

- A cryptographic signature. The provider fetches the public key from `selector._domainkey.<yourdomain>`.
- Key length: 1024-bit minimum (Yahoo's floor), 2048-bit recommended by all providers (`../research/sender-requirements-2026.md`).
- The DKIM `d=` domain is what Google Postmaster Tools uses to identify and group your traffic. The `d=` domain must be the client's own (dedicated) domain, not the ESP's shared domain, for both reputation ownership and Postmaster visibility. This is load-bearing: getting it wrong means you cannot see your own spam rate.

## DMARC

- A TXT record at `_dmarc.<yourdomain>`. Minimum to comply: `v=DMARC1; p=none;`.
- Alignment: the From: org-domain must align with the SPF org-domain OR the DKIM org-domain. Relaxed alignment is acceptable.

### The DMARC escalation ladder

This is the standard remediation path. Move up only as alignment is validated by aggregate (rua) reports.

1. `v=DMARC1; p=none;` - monitor, collect aggregate reports. Confirm SPF and DKIM are passing and aligned.
2. `v=DMARC1; p=quarantine; pct=50;` - partial enforcement during validation.
3. `v=DMARC1; p=reject;` - full enforcement once aligned.

### The p=reject footgun (top-line check)

A root-domain `p=reject` (or strict quarantine) WITHOUT a properly configured dedicated sending domain causes most inbox providers to reject the ESP-sent mail, producing elevated bounces. This is a direct GoHighLevel failure mode (`../research/gohighlevel-sending.md`). The temporary workaround is to revert DNS to `p=none` until the dedicated sending domain is configured, then re-escalate. Always check the published DMARC policy against whether a dedicated sending domain exists before any send. Detail in `05-gohighlevel-sending.md`.

## BIMI + VMC/CMC (the brand logo in the inbox)

BIMI is an optional upside, never a prerequisite, and it has a hard gate.

- Hard prerequisite: DMARC must be at enforcement, p=quarantine OR p=reject. BIMI will NOT work at p=none. Never recommend BIMI before enforcement is reached.
- Flow: the provider verifies DMARC alignment at enforcement, fetches the SVG logo from the BIMI DNS record, then validates the certificate.
- Certificate types:
  - VMC (Verified Mark Certificate): requires a registered trademark. Supported by Gmail, Yahoo, Apple Mail.
  - CMC (Common Mark Certificate): for brands without a registered trademark; requires 12+ months of proven public logo use. Widens eligibility.
- Logo asset: SVG Tiny 1.2 Portable/Secure (SVG P/S), 1:1 aspect ratio, non-transparent background, no scripts/external refs/animations. Gmail wants a minimum of 96x96 px, sized in absolute pixels.
- Timeline: providers typically require 30+ consecutive days at DMARC enforcement before displaying the logo. Budget 4-8 weeks end to end (mostly the enforcement runway plus certificate vetting).

### The VMC-vs-CMC decision per client

Whether a client takes the VMC or CMC path depends on a client fact: does the client hold a registered trademark? If yes, VMC. If no but the logo has 12+ months of public use, CMC. This is a per-client determination.

> TODO: open question - needs human decision. Whether the first tenant (Heather Ferrari) holds a registered trademark is unknown and determines her BIMI path (VMC vs CMC). Do not assume; confirm with the operator before recommending a BIMI route (`../research/research-summary.md`).

## What to hand the operator

A DNS-record audit listing, for each of SPF, DKIM, and DMARC: the current state, the required state, and the exact record syntax to apply. Mark BIMI as a later-phase upside gated on reaching DMARC enforcement, not a blocker.
