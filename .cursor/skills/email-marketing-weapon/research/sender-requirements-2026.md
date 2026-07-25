---
retrieved_on: 2026-06-25
source_type: official-docs + vendor
authority: official (Google/Yahoo/Microsoft) + practitioner (Validity/RedSift)
relevance: critical
topic: sender-requirements
weapon: email-marketing-weapon
---

# Mailbox-Provider Bulk Sender Requirements (Google, Yahoo, Microsoft) — 2026 state

## Primary sources
- Google, Email sender guidelines FAQ — https://support.google.com/a/answer/14229414 (retrieved 2026-06-25, official)
- Google, Email sender guidelines — https://support.google.com/a/answer/81126 (official)
- Yahoo Sender Hub / best practices — https://senders.yahooinc.com/best-practices/ (retrieved 2026-06-25, official)
- Microsoft, "Strengthening Email Ecosystem: Outlook's New Requirements for High-Volume Senders" — https://techcommunity.microsoft.com/blog/microsoftdefenderforoffice365blog/.../4399730 (official; body not machine-extractable, corroborated via Validity below)
- Validity, "Keeping the Inbox Safe: Microsoft's New Bulk Email Rules Explained" — https://www.validity.com/blog/keeping-the-inbox-safe-microsofts-new-bulk-email-rules-explained/ (practitioner, corroborates Microsoft)
- Red Sift, 2026 bulk email sender requirements checklist — https://redsift.com/guides/bulk-email-sender-requirements (practitioner)
- PowerDMARC, Bulk Email Sender Rules Google/Yahoo/Microsoft/Apple 2026 — https://powerdmarc.com/bulk-email-sender-requirements/ (practitioner)

## Key takeaways (quoted figures)

### Definition of "bulk sender"
- Google: "any email sender that sends close to 5,000 messages or more to personal Gmail accounts within a 24-hour period."
- Yahoo & Microsoft: same ~5,000/day threshold to their respective consumer domains (Outlook.com, Hotmail, Live for Microsoft; yahoo.com/aol.com for Yahoo).
- IMPORTANT: the authentication requirements (SPF+DKIM+DMARC) are now de-facto table stakes for ALL senders, not just bulk — Microsoft and Google now reject non-compliant mail outright.

### Spam complaint rate thresholds
- Google: keep spam rate **below 0.1%**; **never reach 0.3% or higher**. Senders exceeding 0.3% become "ineligible for mitigation." Practitioner consensus safe-operating target is **0.08%** (≈ <1 complaint per 1,250 sends).
- Yahoo: "Keep your spam rate below 0.3%" (applies to all senders and bulk senders). Buffer target also ~0.1%.
- Microsoft: the May 2025 blog did NOT publish an explicit numeric complaint threshold, but JMRP complaint data >0.3% is cited by practitioners as a leading cause of degradation. Treat 0.3% as the hard ceiling, 0.1% as the working target across all three.

### Authentication (all three providers)
- **SPF AND DKIM both required** (not either/or). Missing them → temporary/permanent failure codes or spam foldering.
- **DMARC required at minimum p=none.** Google: "DMARC record is missing (Minimum policy of none, p=none)" → "Delivery support or mitigations unavailable."
- **DMARC alignment required:** "the organizational domain in the sender From: header must be aligned with either the SPF organizational domain or the DKIM organizational domain." Relaxed alignment is acceptable (Yahoo explicitly).
- DKIM key length: Yahoo requires **minimum 1024-bit**; **2048-bit recommended** by all.

### Infrastructure (Google-stated, applies broadly)
- Valid **forward and reverse DNS (PTR) records** required.
- **TLS/SSL required** for SMTP connections.
- Messages must follow **RFC 5322** format (and not impersonate Gmail From: headers).

### One-click unsubscribe (RFC 8058)
- Required for **marketing and promotional** messages.
- Must add **List-Unsubscribe** header supporting **one-click (RFC 8058 POST)**.
- A visible unsubscribe link must ALSO be in the message body.
- Process unsubscribe requests within **48 hours / 2 days** (Google "48 hours"; Yahoo "within 2 days").

### Enforcement timeline (load-bearing — this is the "what suspended a client" story)
- Original Google/Yahoo mandate: **February 2024**. Still the live standard.
- **Microsoft: May 5, 2025** — Outlook began routing non-compliant high-volume mail to Junk; amended statement says they now **reject** outright. Rejection code: `550; 5.7.515 Access denied, sending domain [SenderDomain] does not meet the required authentication level.`
- **Google: November 2025** — "ramping up enforcement on non-compliant traffic." Non-compliant mail is now blocked/rejected before the inbox, not merely spam-foldered. This is "Full Enforcement."
- Net 2026 reality: missing/misaligned auth or a spam rate over 0.3% can produce hard rejects and effective domain suspension mid-campaign.

## What the Weapon should encode
- A go/no-go preflight table keyed to all three providers: SPF pass + DKIM pass + DMARC ≥ p=none with alignment + spam rate < 0.3% (target < 0.1%) + RFC 8058 one-click unsubscribe + visible unsubscribe link + functional From/Reply-To + PTR + TLS + RFC 5322.
- The 5,000/day "bulk" definition as the trigger for stricter scrutiny, but auth requirements applied to EVERY send.
- The exact `550 5.7.515` Microsoft reject code and the November-2025 Google enforcement note as the "why this gates everything" justification.
- The 48-hour unsubscribe-processing SLA as a hard rule.
