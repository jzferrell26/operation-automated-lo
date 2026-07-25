# 00 - Principles: the non-negotiables

These are the rules that hold no matter the client, platform, or campaign. They come from the Command Brief's SUBAGENT CRITICAL DIRECTIVES. Every other guide assumes these are already true.

## Deliverability gates everything

The single load-bearing rule. The most on-brand, highest-converting email is worthless if it lands in spam or gets the sending domain suspended. Never green-light a send without aligned SPF/DKIM/DMARC and active monitoring (Google Postmaster Tools + Microsoft SNDS/JMRP + Yahoo CFL).

The real-world driver: a client's Gmail sends were suspended and bounced on webinar day because Google Postmaster Tools was never set up, killing the campaign. The monitoring-enrollment gate exists to make that impossible to repeat (`../research/monitoring-warmup-hygiene.md`).

The 2026 reality that makes this non-optional: missing or misaligned authentication, or a spam rate over 0.3%, can produce hard rejects and effective domain suspension mid-campaign. Microsoft began rejecting non-compliant high-volume mail outright on May 5, 2025 with the code `550 5.7.515 Access denied, sending domain does not meet the required authentication level`, and Google moved to full enforcement in November 2025, blocking non-compliant mail before the inbox rather than spam-foldering it (`../research/sender-requirements-2026.md`).

## The priority order: auth > reputation > engagement > content

Spam filters score trust signals far more than keywords. The priority of what gets mail spam-foldered, highest first (`../research/spam-filter-html.md`):

1. Authentication (SPF/DKIM/DMARC) - top cause of legitimate mail being flagged.
2. Sender reputation (domain and IP history, complaint rate).
3. Engagement - opens, replies, "Not Junk," delete-without-reading, time-in-inbox. Gmail and Outlook use behavioral ML scoring, and engagement now dominates content scoring.
4. Content and HTML quality - least important, but still real for malformed or deceptive construction.

The consequence: HTML hygiene is a floor, not a lever. A clean-reputation domain can use the word "free"; a shot-reputation domain cannot. Never let a content tweak substitute for fixing authentication or reputation.

## No em dashes, ever

No em dashes (the long dash) or en dashes in any email copy, subject line, preheader, report, guide, or prose written for a human. Use a comma, colon, parentheses, period, or semicolon instead. Regular hyphens are fine. This is both a project rule and a global rule. Scan every output before shipping it. This is reinforced in the launch-copy research as a hard rule for all generated copy (`../research/launch-sequences-copy.md`).

## Every email ships complete

- A plain-text multipart/alternative part alongside the HTML, maintained (not garbage auto-strip). HTML-only is a spam-filter risk and breaks constrained clients (`../research/spam-filter-html.md`).
- Real alt text on every image, for deliverability, accessibility, and image-blocking fallback (`../research/spam-filter-html.md`).
- The email must make sense as plain text with all images off. No image-only emails (`../research/spam-filter-html.md`).

## Never use these patterns

- Spam-trigger patterns: ALL CAPS subject lines, excessive punctuation (multiple exclamation points, dollar-sign runs), misleading or clickbait subjects, deceptive From: identity. These correlate with low-quality mail and break CAN-SPAM honesty rules (`../research/spam-filter-html.md`).
- URL shorteners (bit.ly, tinyurl) on cold sends. GoHighLevel explicitly flags these; they correlate with spam and hide the destination (`../research/spam-filter-html.md`, `../research/gohighlevel-sending.md`).
- Image-only emails (see above).

## Respect list hygiene and warmup

Never send to an unwarmed domain or an unverified/stale list without a warmup and a sunset policy. A brand-new sending domain needs 4-8 weeks of warmup to reach production volume; rushing warmup is the number one cause of deliverability failure (`../research/monitoring-warmup-hygiene.md`). Full schedules and the sunset flow are in `03-monitoring-warmup-hygiene.md`.

## Brand voice is per-client and loaded explicitly

Client identity and brand voice are loaded as an explicit input pack, never hardcoded and never inferred from another client. Never bleed one client's voice into another's email. The pack format and Heather Ferrari (pack #1) are in `07-brand-voice-packs.md`.

## Cite specifics in every finding

Every finding names the exact thing: the exact DNS record, the exact spammy line, the exact byte weight, the exact missing header. "Your authentication looks off" is not a finding; "your `_dmarc.go.clientdomain.com` TXT record is absent, minimum required is `v=DMARC1; p=none;`" is.

## Honor CAN-SPAM and GDPR

- A working one-click unsubscribe (RFC 8058 List-Unsubscribe POST) for bulk and marketing mail, plus a visible unsubscribe link in the body (`../research/sender-requirements-2026.md`).
- Process unsubscribe requests within 48 hours (`../research/sender-requirements-2026.md`).
- A physical mailing address in the footer.
- Accurate From and Reply-To identity, no impersonation.

> Note: CAN-SPAM and GDPR statutory text was treated as a known directive from the Command Brief rather than independently re-researched in this sweep (`../research/research-summary.md`). The rules above are encoded as compliance requirements; for a specific jurisdictional edge case, mark it `> TODO: open question - needs human decision`.

## Numbers drift; date-stamp them

Spam-rate thresholds and enforcement dates are current as of 2026-06-25. Re-verify each quarter. When a guide quotes a threshold or a date, it is a snapshot, not a permanent constant (`../research/research-summary.md`).
