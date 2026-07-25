# 05 - GoHighLevel / LeadConnector sending

GoHighLevel (via LC Email, LeadConnector) is the primary platform per the Command Brief. This runbook is first-class, not an afterthought. Source unless noted: `../research/gohighlevel-sending.md`.

## Architecture: LC Email + dedicated sending domain

- GoHighLevel's native sender is LC Email (LeadConnector, Mailgun-backed under the hood). It supports a dedicated sending domain separate from GoHighLevel's shared infrastructure. Custom SMTP is an alternative path with its own setup.
- Use a subdomain (for example `mail.yourdomain.com` or `go.clientdomain.com`) as the dedicated sending domain to protect the root domain's reputation.

## Setup runbook

1. Create the dedicated subdomain (for example `go.clientdomain.com`).
2. Add the required TXT, CNAME, and MX records, or authorize Cloudflare/GoDaddy via the integration.
3. Verify the domain.
4. Set a matching From: header. The From-address must align with the sending domain; this is what carries DMARC alignment.
5. Put the DKIM `d=` on the client's own dedicated domain (not GoHighLevel's shared domain) for full control and Google Postmaster visibility.
6. Enroll in Google Postmaster Tools (GoHighLevel has a dedicated help article); verify the DKIM domain.

> Re-fetch candidate: the exact header/record values from GoHighLevel's "Default Headers for Dedicated Sending Domains" article were not pulled verbatim in research. For a live setup, confirm the current exact values against that article before handing them to the operator (`../research/research-summary.md`).

## The DMARC p=reject footgun (top-line blocker check)

This is the load-bearing GoHighLevel failure mode and a direct mechanism behind elevated bounces and effective suspension.

- DMARC is NOT required to send from GoHighLevel's shared domain.
- CRITICAL: if the domain publishes `p=reject` (or strict quarantine) WITHOUT a configured dedicated sending domain, most inbox providers will reject the messages, resulting in elevated bounces.
- Temporary workaround: revert DNS to `v=DMARC1; p=none;` until the dedicated sending domain is configured, then re-escalate up the ladder.
- GoHighLevel's recommended DMARC ladder: `v=DMARC1; p=none;` then `v=DMARC1; p=quarantine; pct=50;` then `v=DMARC1; p=reject;` once validated. (Matches the general ladder in `02-authentication-dns.md`.)

Always check the published DMARC policy against whether a dedicated sending domain exists before any GoHighLevel send.

## Warmup (GoHighLevel phased ramp)

- Stage 1: 100/hour, 1,000/day.
- Stage 2: 300/hour, 2,500/day.
- Up to 4 weeks to warm a domain.
- Pacing: about an email a day for the first 5 days, then slow to a couple a week.
- Dedicated IP recommended for high volume above 200,000 weekly emails, at about $59/month per IP. Below that, stay on the shared IP pool.

## List hygiene (GoHighLevel defaults)

- Enable email validation at first contact and re-validate about every 90 days (about $2.5 per 1,000 validations).
- Stop sending to unengaged emails; after 1-2 weeks of no engagement, slow that segment to weekly.
- Prefer double opt-in. Cold outreach to non-opted contacts is not recommended, especially for new domains.

## Content and technical rules (GoHighLevel)

- Avoid URL shorteners (bit.ly, tinyurl flagged).
- Always include an unsubscribe link.
- Keep emails concise with appropriate (not excessive) imagery.

## Email-builder and merge tokens

- Produce GoHighLevel/LeadConnector-ready template HTML with correct merge tokens.
- Validate that every merge token resolves before send; a broken token is a Blocker (it looks broken and can leak data, per `04-spam-filter-html.md`).
- The HTML skeleton in `../templates/email-template.html` uses clearly marked merge-token placeholders so the operator can map them to the client's GoHighLevel custom fields.

> Field-key semantics (which GoHighLevel custom field maps to which token) are out of scope for this Weapon; that belongs to gohighlevel-guardian. This Weapon ensures the tokens are present, marked, and validated, not which field-key string is correct for a given location.
