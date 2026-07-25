# 03 - Monitoring, warmup, and list hygiene

Reputation is earned and watched. This guide covers the three monitoring feeds that must be enrolled before bulk send, the two warmup ladders, and the list-hygiene and sunset discipline. Source unless noted: `../research/monitoring-warmup-hygiene.md`.

## Monitoring enrollment (enroll BEFORE bulk send)

All three confirmed active before any bulk send. This is the exact gap that killed the first client's webinar campaign.

### Google Postmaster Tools

- Setup: add and verify the DKIM `d=` authentication domain at the Postmaster Tools site. Google uses the DKIM domain to identify and group traffic.
- Panels that matter in v2 (2026):
  - Spam Rate - the single most important panel; the percentage of Gmail recipients who clicked Report Spam. Must stay below 0.1%, hard ceiling 0.3%.
  - Compliance Status - a checklist mapping directly to the bulk-sender requirements (auth alignment, one-click unsubscribe, spam rate).
  - Authentication - SPF/DKIM/DMARC pass rates; should be 99%+, anything below 95% signals misconfiguration or unauthorized sending.
  - Delivery errors and encryption (TLS) percentage.
- v2 change: the domain-reputation and IP-reputation dashboards were REMOVED. Spam Rate + Compliance Status are the primary signals now. Do not tell anyone to check a reputation dashboard.

### Microsoft SNDS + JMRP

- SNDS (Smart Network Data Services): free, IP-level data (spam-trap hits, complaint rates, volume, filter actions). Sign in, request access, add IPs/CIDR. Microsoft verifies control via WHOIS/DNS and confirms to abuse@ or postmaster@.
- JMRP (Junk Mail Reporting Program): a complaint feedback loop with real-time ARF notifications when Outlook/Hotmail users mark spam. Use it to suppress complainers.
- 2026 footguns: all JMRP feeds must now link to an SNDS account or Microsoft removes them; automated SNDS access URLs are being deprecated by June 22, 2026, so update any scripted access.
- SNDS/JMRP are IP-level and most useful on a dedicated IP (GoHighLevel recommends a dedicated IP above 200k weekly).

### Yahoo CFL

- Enroll in the Complaint Feedback Loop. An active CFL is needed for all DKIM domains so complaints are processed quickly.

## Warmup ladders

Authenticate FIRST (SPF/DKIM/DMARC); warmup is far less effective without it. Engagement, not just volume, builds reputation: replies, opens, stars, moving mail from spam to inbox.

### Cold-outreach per-inbox ramp

- Start 5/inbox/day.
- Increase 5-10/inbox/week.
- Mature ceiling 25-40/inbox/day.
- Above 40/inbox: add MORE inboxes, not more per-inbox volume.
- Never increase volume more than 20% in a single day.

### Warm-broadcast ramp (GoHighLevel phased, `../research/gohighlevel-sending.md`)

- Stage 1: 100/hour, 1,000/day.
- Stage 2: 300/hour, 2,500/day.
- Up to 4 weeks to warm a domain.
- Pacing: about an email a day for the first 5 days, then slow to a couple a week.

### New-domain warmup

- A brand-new sending domain takes 4-8 weeks to reach production volume (conservative path 3-4 weeks minimum). Never skip; rushing warmup is the number one cause of deliverability failure.

### Subdomain separation

- Each sending subdomain has its own reputation and may need its own warmup.
- Send marketing from a subdomain (for example `mail.` or `go.clientdomain.com`) to protect the root domain's reputation.
- Keep cold and warm streams on separate subdomains or domains.

## List hygiene

- Validate emails at first contact and re-validate about every 90 days (GoHighLevel: about $2.5 per 1,000 validations, `../research/gohighlevel-sending.md`).
- Keep complaints below 0.3% (target below 0.1%) and hard-bounce rate low. Clean stale lists before sending. Crossing these triggers spam-foldering or suspension.

## Sunset policy

- Define "unengaged": no open/click in 6-12 months (B2C shorter, B2B longer). By cadence: daily senders 60-90 days, weekly 90-120 days.
- Run a 2-3 email re-engagement campaign over 4-6 weeks, then move non-responders to a suppression list. Do not just keep mailing them.
- Apple Mail Privacy Protection makes opens unreliable. Use CLICKS as the primary engagement signal, not opens.
- Deliverability improvement from a sunset policy typically shows within 2-4 weeks.

The re-engagement copy structure lives in `06-launch-sequences-copy.md`; the engagement signal and suppression step are the deliverability half.
