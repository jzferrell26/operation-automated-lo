# Deliverability readiness report: <CAMPAIGN / CLIENT>

Matches the Command Brief's EXPECTED OUTPUT: a deliverability readiness verdict, a spam/crawler audit, and copy notes, all severity-ranked, every finding citing the exact record, line, or byte weight. No em dashes.

- **Date**: <YYYY-MM-DD>
- **Client / brand-voice pack**: <name>
- **Sending domain / subdomain**: <domain>
- **Platform**: <GoHighLevel / other>
- **Campaign**: <type, list size, volume/day, cold or warm>
- **Prepared by**: email-marketing-guardian

---

## 1. Verdict

> **GO** or **NO-GO**

One-line rationale. If NO-GO, the blocking items are listed in section 2 with exact fixes.

## 2. Deliverability readiness (severity-ranked)

Severity scale: Blocker (no-go) > Risk > Nit.

| # | Severity | Finding | Exact record / setting | Remediation |
|---|---|---|---|---|
| | Blocker | | | |
| | Risk | | | |
| | Nit | | | |

Monitoring enrollment status (Postmaster Tools / SNDS+JMRP / Yahoo CFL): <state>.
Warmup state vs volume: <state>.
Spam complaint rate: <%> (target <0.1%, ceiling 0.3%).

## 3. Spam / crawler HTML audit (per email, severity-ranked)

For each email, the result of the scan in `../templates/spam-html-audit.md`.

### <email name / subject>

| # | Severity | Finding | Exact detail (line / image / byte weight) | Remediation |
|---|---|---|---|---|
| | Blocker | | | |
| | Risk | | | |
| | Nit | | | |

## 4. Copy notes

Per-email notes against the loaded brand voice and the launch structure (subject/preheader length, one-CTA discipline, angle rotation, no em dashes). Severity-ranked where a note blocks send (for example a misleading subject is a CAN-SPAM issue, not a style nit).

| # | Severity | Email | Note | Suggested change |
|---|---|---|---|---|
| | | | | |

## 5. Open questions

Items needing a human decision (client facts research could not supply, seed-test gating choices, BIMI path, etc.):

> TODO: open question - needs human decision. <describe>
