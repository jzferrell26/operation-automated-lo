---
retrieved_on: 2026-06-25
source_type: official-docs + practitioner
authority: official (HighLevel Support Portal) + practitioner
relevance: critical
topic: gohighlevel
weapon: email-marketing-weapon
---

# GoHighLevel / LeadConnector (LC Email) Sending & Deliverability — 2026

## Primary sources (HighLevel official support portal)
- Email Sending Guide: Best Practices & Email Warm Up — https://help.gohighlevel.com/support/solutions/articles/155000001021-email-sending-guide-email-best-practices-email-warm-up (official)
- Email Authentication - DMARC — https://help.gohighlevel.com/support/solutions/articles/48001224630-email-authentication-dmarc (official)
- Default Headers for Dedicated Sending Domains — https://help.gohighlevel.com/support/solutions/articles/155000004428-default-headers-for-dedicated-sending-domains (official)
- Google Postmaster Tools (HighLevel) — https://help.gohighlevel.com/support/solutions/articles/155000004150-google-postmaster-tools (official)
- Add and Verify Domain DNS Records in HighLevel — https://help.gohighlevel.com/support/solutions/articles/155000002220 (official)
## Secondary
- FunnelPandit, GHL Email Warmup & Deliverability Guide — https://www.funnelpandit.com/post/gohighlevel-email-deliverability-and-warmup-guide (practitioner)
- AutomatedMarketer, GoHighLevel Email Setup: Deliverability Guide — https://automatedmarketer.net/gohighlevel-email-setup-guide/ (practitioner)

## Architecture: LC Email + dedicated sending domain
- GHL's native sender is **LC Email** (LeadConnector, Mailgun-backed under the hood). It supports configuring a **dedicated sending domain** separate from GHL's shared infrastructure. (Custom SMTP is an alternative path with its own setup.)
- **Use a subdomain** (e.g. `mail.yourdomain.com` or `go.clientdomain.com`) as the dedicated sending domain to protect the root domain's reputation.
- Setup: create the dedicated sub-domain, add the required **TXT, CNAME and MX records** (or authorize Cloudflare/GoDaddy via the integration), verify the domain, and **set a matching From: header** (From-address must align with the sending domain — this is what carries DMARC alignment).

## DMARC on GHL (the load-bearing footgun)
- DMARC is **not required** to send from GHL's SHARED domain.
- **CRITICAL:** if your domain publishes `p=reject` (or strict quarantine) WITHOUT a configured dedicated sending domain, "most inbox providers will reject your messages, resulting in elevated bounces." Temporary workaround: revert DNS to `p=none` until the dedicated domain is configured, then re-escalate.
- GHL's recommended DMARC ladder: `v=DMARC1; p=none;` → `v=DMARC1; p=quarantine; pct=50;` → `v=DMARC1; p=reject;` once validated.
- For full control + Postmaster visibility, the DKIM `d=` should be the client's own dedicated domain, not GHL's shared domain.

## Warmup (GHL official phased ramp)
- Stage 1: **100/hour, 1,000/day.**
- Stage 2: **300/hour, 2,500/day.**
- "It can take up to **4 weeks** for a domain to be warmed up."
- Pacing guidance: "about an email a day for the first 5 days, then slow down to a couple a week."
- Dedicated IP recommended for high volume: **>200,000 weekly emails**, at **$59/month per IP** (otherwise stay on shared IP pool).

## List hygiene (GHL)
- Enable **email validation at first contact** and **re-validate every ~90 days** ($2.5 / 1,000 validations).
- "Stop sending to unengaged emails"; after 1-2 weeks of no engagement, slow that segment to weekly.
- Prefer **double opt-in**; cold outreach to non-opted contacts is "not recommended, especially for new domains."

## Content / technical rules (GHL)
- **Avoid URL shorteners** (bit.ly, tinyurl flagged).
- Always include an **unsubscribe link**.
- Keep emails concise with appropriate (not excessive) imagery.
- Enroll in **Google Postmaster Tools** (GHL has a dedicated help article for this) — verify the DKIM domain.

## What the Weapon should encode
- A GHL/LeadConnector setup runbook: dedicated subdomain → TXT/CNAME/MX records → verify → matching From: header → DKIM on own domain → enroll Postmaster Tools.
- The DMARC `p=reject`-without-dedicated-domain footgun as a top-line blocker check (this is the exact mechanism behind elevated bounces / suspension).
- The GHL phased warmup numbers (100/hr→1k/day, 300/hr→2.5k/day, ~4 weeks) as the warm-broadcast ramp for GHL tenants.
- GHL list-hygiene defaults (validate at intake, re-validate 90d, double opt-in, unsubscribe link, no shorteners).
- Dedicated-IP threshold (>200k/week, $59/mo) so the Guardian can advise shared-vs-dedicated IP per client volume.
- This is the primary platform per the Command Brief — make the GHL runbook first-class, not an afterthought.
