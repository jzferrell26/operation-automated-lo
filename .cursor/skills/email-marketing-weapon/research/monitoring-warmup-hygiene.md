---
retrieved_on: 2026-06-25
source_type: official-docs + vendor
authority: official (Google/Microsoft) + practitioner
relevance: critical
topic: monitoring-warmup-hygiene
weapon: email-marketing-weapon
---

# Monitoring, Domain Warmup, and List Hygiene — 2026

## Primary sources
- Google, Postmaster Tools dashboards — https://support.google.com/mail/answer/14668346 (official)
- Mailtrap, Google Postmaster Tools tutorial [2026] — https://mailtrap.io/blog/google-postmaster-tools/ (practitioner)
- Microsoft SNDS portal — https://sendersupport.olc.protection.outlook.com/snds/index (official)
- Mailtrap, Microsoft SNDS tutorial [2026] — https://mailtrap.io/blog/microsoft-snds/ (practitioner)
- InboxAlly, JMRP + SNDS setup — https://www.inboxally.com/docs/provider-deliverability-guides/microsoft-complaint-feedback-programs-jmrp-and-snds/ (practitioner)
- MailReach, how to warm up an email domain — https://www.mailreach.co/blog/how-to-warm-up-email-domain (practitioner)
- Omnisend, warm up email domain: 10 best practices 2026 — https://www.omnisend.com/blog/warm-up-email-domain/ (practitioner)
- Act-On + Mailgun, email sunset policy — https://act-on.com/learn/blog/hierarchy-of-engagement-and-email-sunset-policy-explained/ , https://www.mailgun.com/blog/deliverability/sunset-policies-unengaged-recipients/ (practitioner)

## Google Postmaster Tools (THE missing piece in the Heather suspension story)
- Setup: add and verify your **DKIM (d=) authentication domain** at the Postmaster Tools site. Google uses the DKIM domain to identify and group your traffic.
- What it monitors (Postmaster Tools v2, 2026):
  - **Spam Rate** — the single most important panel; % of Gmail recipients who clicked "Report Spam." This is the number that must stay < 0.1% (hard ceiling 0.3%).
  - **Compliance Status** — a checklist mapping directly to the bulk-sender requirements (auth alignment, one-click unsubscribe, spam rate).
  - **Authentication** — SPF/DKIM/DMARC pass rates; should be 99%+, anything < 95% signals misconfig or unauthorized sending.
  - **Delivery errors** and **encryption (TLS) %**.
- CHANGE in v2: **domain-reputation and IP-reputation dashboards were removed** in Postmaster Tools v2. Spam Rate + Compliance Status are now the primary signals. Do not instruct users to "check the reputation dashboard" — it no longer exists.

## Microsoft SNDS + JMRP
- **SNDS (Smart Network Data Services):** free; IP-level data — spam-trap hits, complaint rates, traffic volume, filter actions. Sign in at sendersupport.olc.protection.outlook.com/snds, request access, add IPs/CIDR blocks. Microsoft verifies control via WHOIS/DNS and sends confirmation to abuse@ or postmaster@ your domain.
- **JMRP (Junk Mail Reporting Program):** complaint feedback loop; real-time ARF-formatted notifications when Outlook/Hotmail users mark mail as spam. Set up at postmaster.live.com. Use the reports to suppress complainers.
- 2026 changes (note for the Weapon):
  - **All JMRP feeds must now link to an SNDS account; Microsoft removes unlinked feeds.**
  - **Automated SNDS access URLs (https://sendersupport.olc.protection.outlook.com/snds/...) are being deprecated by June 22, 2026** — update any scripted access.
- NOTE: SNDS/JMRP are IP-level and most useful when sending on a dedicated IP (GHL: dedicated IP recommended >200k weekly).

## Yahoo CFL
- Enroll in the **Complaint Feedback Loop (CFL)**; an active CFL is needed for ALL DKIM domains so complaints are processed quickly.

## Domain / sending-domain warmup
- Brand-new domain warmup: **4-8 weeks** to reach production volume (conservative path 3-4 weeks minimum). Never skip — rushing warmup is the #1 cause of deliverability failure.
- Cold-outreach per-inbox ramp (practitioner consensus): start **5/inbox/day**, +5-10/inbox/week, mature ceiling **25-40/inbox/day**. Above 40/inbox → add MORE inboxes, not more per-inbox volume. **Never increase volume >20% in a single day.**
- GoHighLevel official phased ramp (warm broadcast context): Stage 1 = 100/hour, 1,000/day; Stage 2 = 300/hour, 2,500/day; "up to 4 weeks" to warm a domain. (Also "an email a day for the first 5 days, then slow to a couple a week.")
- **Subdomain separation:** each sending subdomain has its OWN reputation and may need its own warmup. Send marketing from a subdomain (e.g. `mail.` or `go.clientdomain.com`) to protect the root domain's reputation. Keep cold and warm streams on separate subdomains/domains.
- Engagement (not just volume) builds reputation: replies, opens, stars, moving from spam to inbox. Authenticate FIRST (SPF/DKIM/DMARC) — warmup is far less effective without it.

## List hygiene + sunset policy
- Validate emails at first contact and re-validate ~every 90 days (GHL: $2.5/1000 validations).
- **Bounce + complaint thresholds:** keep complaints < 0.3% (target < 0.1%); keep hard-bounce rate low (clean stale lists before sending). Crossing these is what triggers spam-foldering or suspension.
- Sunset policy (deliverability protection):
  - Define "unengaged": no open/click in 6-12 months (B2C shorter, B2B longer). Inactivity thresholds by cadence — daily senders 60-90 days, weekly 90-120 days.
  - Run a **2-3 email re-engagement campaign over 4-6 weeks**, then move non-responders to a **suppression list** (do not just keep mailing them).
  - **Apple Mail Privacy Protection makes opens unreliable — use CLICKS as the primary engagement signal**, not opens.
  - Deliverability improvement from a sunset policy typically shows within **2-4 weeks**.

## What the Weapon should encode
- A "monitoring enrollment" preflight gate: Google Postmaster Tools (verify DKIM domain), Microsoft SNDS + JMRP (linked), Yahoo CFL — all three confirmed BEFORE any bulk send. This is the exact gap that killed the Heather webinar campaign.
- The v2 Postmaster reality: Spam Rate + Compliance Status are the panels that matter; reputation dashboards are gone.
- Two warmup schedules: a cold-outreach per-inbox ramp and a warm-broadcast (GHL phased) ramp.
- The subdomain-separation rule (root protected; cold and warm separated).
- A sunset/re-engagement flow template with click-based engagement and a hard suppression step.
- The June 22, 2026 SNDS URL deprecation and the JMRP-must-link-SNDS change as current footguns.
