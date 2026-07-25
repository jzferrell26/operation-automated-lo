# Example (happy path): auditing an existing email for deliverability and spam risk

Demonstrates: `guides/01-deliverability-preflight.md`, `guides/02-authentication-dns.md`, `guides/04-spam-filter-html.md`, and the `reports/deliverability-readiness-report.md` output.

## The request

"Here is a broadcast HTML email and the sending domain `go.clientdomain.com`. We send about 8,000 per day to a warm list on GoHighLevel. Is it safe to send?"

## Step 1: load the voice pack, then run the preflight

8,000/day to one provider's consumer accounts crosses the 5,000/24h bulk threshold, so the strict bulk scrutiny applies and the authentication rows are mandatory (`guides/01-deliverability-preflight.md`). The Guardian loads the client's brand-voice pack first (`guides/07-brand-voice-packs.md`) so any copy notes stay in-voice, then walks the preflight table.

Findings against the preflight table:

- SPF: single TXT record, passes, under 10 lookups. PASS.
- DKIM: signs with `go.clientdomain.com` (the client's own domain), 2048-bit. PASS.
- DMARC: `_dmarc.go.clientdomain.com` present at `v=DMARC1; p=none;`, DKIM-aligned. PASS (minimum met).
- Spam rate: Postmaster Tools Spam Rate panel reads 0.06%. PASS (below the 0.1% target, `guides/03-monitoring-warmup-hygiene.md`).
- Monitoring enrollment: Google Postmaster Tools verified on the DKIM domain. Microsoft SNDS present but the JMRP feed is NOT linked to the SNDS account. Microsoft removes unlinked feeds in 2026 (`guides/03-monitoring-warmup-hygiene.md`). FINDING.
- One-click unsubscribe + visible link: List-Unsubscribe header present with RFC 8058 one-click, visible link in body. PASS.

## Step 2: scan the HTML

Per `guides/04-spam-filter-html.md`:

- Plain-text multipart/alternative: present and maintained. PASS.
- Merge tokens: all resolve in a test render. PASS.
- Image-only check: the email reads fine with images off. PASS.
- Alt text: one hero image has empty alt. FINDING (Risk).
- 102KB clipping: raw HTML is 118KB, over the ~102KB clip. The unsubscribe footer renders below the clip line in Gmail. FINDING (Risk, and a CAN-SPAM exposure because the one-click link can be clipped away).
- Link hygiene: no shorteners, tracking domain matches the sending domain, link text matches href. PASS.
- MSO conditionals: the CTA button has its MSO conditional intact. PASS.
- Subject/lexicon: subject is 44 characters, specific, no ALL CAPS, no punctuation spam. PASS.

## Step 3: the verdict and report

Verdict: NO-GO until two items are fixed, because one touches a bulk-sender compliance feed and one risks clipping the one-click unsubscribe.

Severity-ranked findings (written into `reports/deliverability-readiness-report.md`):

- Risk: HTML is 118KB, over the ~102KB Gmail clip; the unsubscribe footer falls below the clip line. Fix: trim HTML below 102KB with an email-specific minifier (so MSO conditionals survive) and move the unsubscribe + primary CTA above the clip (`guides/04-spam-filter-html.md`).
- Risk: hero image has empty alt text. Fix: add descriptive alt text (`guides/04-spam-filter-html.md`).
- Nit/operational: JMRP feed is not linked to the SNDS account. Fix: link the feed before the next bulk send so Microsoft does not drop it (`guides/03-monitoring-warmup-hygiene.md`).

Authentication and reputation are clean, so this is a fast fix: tighten the HTML, add alt text, link JMRP, then re-run the preflight to flip the verdict to GO. Every finding cites the exact byte weight, the exact image, and the exact feed, per the principle in `guides/00-principles.md`.
