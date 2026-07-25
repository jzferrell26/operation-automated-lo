# 01 - Deliverability preflight: the go/no-go gate

This is the gate every send passes before any copy ships. It produces an explicit go / no-go verdict with the exact fixes. Run it for every campaign. If it returns no-go, stop and remediate; do not proceed to authoring or sending.

Fill in `../templates/deliverability-preflight-checklist.md` as you work, and roll the result into `../reports/deliverability-readiness-report.md`.

## Why this exists

A client's webinar campaign was suspended on send day because monitoring was never enrolled. This preflight is the structural fix: it forces authentication alignment and monitoring enrollment to be verified before a single bulk message goes out (`../research/monitoring-warmup-hygiene.md`).

## The preflight table (all three providers)

Verify every row. A failure on an authentication or monitoring row is a Blocker (no-go). Source: `../research/sender-requirements-2026.md`.

| Check | Pass condition | Severity if failing |
|---|---|---|
| SPF | Single TXT record, under 10 DNS lookups, passes | Blocker |
| DKIM | Signs with the client's own (dedicated) domain `d=`, 1024-bit minimum, 2048-bit recommended | Blocker |
| DMARC present | TXT at `_dmarc.<domain>`, minimum `v=DMARC1; p=none;` | Blocker |
| DMARC alignment | From: org-domain aligns with SPF org-domain OR DKIM org-domain (relaxed acceptable) | Blocker |
| Spam complaint rate | Below 0.1% target; never reaches 0.3% | Blocker at 0.3%+, Risk approaching |
| One-click unsubscribe | List-Unsubscribe header with RFC 8058 one-click POST, for marketing/bulk | Blocker for bulk |
| Visible unsubscribe link | Present in the message body | Blocker for bulk |
| From / Reply-To | Accurate, functional, non-impersonating | Blocker |
| PTR (reverse DNS) | Valid forward and reverse DNS | Risk |
| TLS | TLS/SSL on SMTP connections | Risk |
| RFC 5322 | Message follows RFC 5322, does not impersonate Gmail From: headers | Risk |

The 5,000-messages-per-24-hours-to-one-provider figure is the definition of a "bulk sender" and triggers the strictest scrutiny, but the authentication rows above now apply to EVERY send, not just bulk: Microsoft and Google reject non-compliant mail outright (`../research/sender-requirements-2026.md`).

## The monitoring-enrollment gate (the piece that was missing)

Before any bulk send, confirm all three are enrolled and active. This is the exact gap that killed the first client's campaign (`../research/monitoring-warmup-hygiene.md`).

- Google Postmaster Tools: the DKIM `d=` domain is added and verified. Google groups traffic by the DKIM domain.
- Microsoft SNDS + JMRP: access requested, IPs/CIDR added, and the JMRP feed is linked to the SNDS account (Microsoft removes unlinked feeds as of 2026).
- Yahoo CFL (Complaint Feedback Loop): enrolled for all DKIM domains.

In Postmaster Tools v2 the panels that matter are Spam Rate and Compliance Status. The domain-reputation and IP-reputation dashboards were removed; do not instruct anyone to "check the reputation dashboard," it no longer exists (`../research/monitoring-warmup-hygiene.md`).

## The warmup-state gate

- New sending domain: confirm it has been through 4-8 weeks of warmup before production volume. An unwarmed domain at volume is a no-go (`../research/monitoring-warmup-hygiene.md`).
- Cold stream: confirm the per-inbox ramp (start 5/inbox/day, mature ceiling 25-40/inbox/day; above 40, add inboxes, not volume) (`../research/monitoring-warmup-hygiene.md`).
- Warm broadcast on GoHighLevel: confirm the phased ramp (Stage 1 = 100/hour, 1,000/day; Stage 2 = 300/hour, 2,500/day; up to 4 weeks) (`../research/gohighlevel-sending.md`).
- Subdomain separation: marketing sends from a subdomain; cold and warm streams on separate subdomains/domains; root protected (`../research/monitoring-warmup-hygiene.md`).

## The list-hygiene gate

- Complaints below 0.3% (target below 0.1%); hard-bounce rate low; stale lists cleaned before sending (`../research/monitoring-warmup-hygiene.md`).
- Emails validated at first contact and re-validated about every 90 days (`../research/monitoring-warmup-hygiene.md`).
- A sunset policy defined for unengaged contacts (see `03-monitoring-warmup-hygiene.md`).

## The verdict

Emit one of:

- GO: every Blocker row passes, all three monitoring feeds are active, warmup state is appropriate for the volume, and list hygiene is within thresholds.
- NO-GO: one or more Blockers fail. List each failing row with the exact record or setting and the exact fix. Cite the specific DNS record or value, never a vague "auth looks off."

When a fact needed for the verdict is a client-specific unknown that research could not supply (for example whether the client holds a registered trademark for BIMI), mark it `> TODO: open question - needs human decision` and do not guess.
