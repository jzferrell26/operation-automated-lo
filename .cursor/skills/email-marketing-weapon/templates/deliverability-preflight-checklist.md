# Deliverability preflight checklist (go / no-go)

Fill this in per campaign. See `../guides/01-deliverability-preflight.md`. A failing authentication or monitoring row is a Blocker (no-go).

- Client / brand-voice pack loaded: __________
- Sending domain / subdomain: __________
- Platform: __________
- List size / segment / volume per day: __________
- Cold or warm: __________

## Authentication and identity

| Check | Pass condition | Status (PASS / FAIL) | Exact record or setting | Fix if failing |
|---|---|---|---|---|
| SPF | Single TXT, <10 lookups, passes | | | |
| DKIM | Own-domain `d=`, 1024-bit min / 2048 rec | | | |
| DMARC present | `_dmarc.<domain>`, min `p=none` | | | |
| DMARC alignment | From: aligns with SPF or DKIM org-domain | | | |
| From / Reply-To | Accurate, functional, non-impersonating | | | |
| PTR | Valid forward + reverse DNS | | | |
| TLS | TLS/SSL on SMTP | | | |
| RFC 5322 | Compliant, no Gmail From: impersonation | | | |
| One-click unsubscribe | RFC 8058 List-Unsubscribe POST (bulk) | | | |
| Visible unsubscribe link | Present in body | | | |

## Monitoring enrollment (before bulk send)

| Feed | Active? | Note |
|---|---|---|
| Google Postmaster Tools (DKIM domain verified) | | Spam Rate + Compliance Status are the v2 panels |
| Microsoft SNDS + JMRP (feed linked to SNDS) | | Unlinked JMRP feeds are removed in 2026 |
| Yahoo CFL | | Needed for all DKIM domains |

## Reputation and hygiene

- Spam complaint rate: ______ % (target <0.1%, ceiling 0.3%)
- Hard-bounce rate: ______ %
- List validated at intake / re-validated <90 days: ______
- Warmup state appropriate for volume (new domain 4-8 wk; cold per-inbox ramp; GHL phased ramp): ______
- Subdomain separation (cold vs warm vs root): ______
- Sunset policy defined for unengaged: ______

## Verdict

- [ ] GO - every Blocker passes, all three monitoring feeds active, warmup appropriate, hygiene within thresholds.
- [ ] NO-GO - list each failing Blocker below with the exact record/setting and the exact fix.

Failing items / required fixes:

> Mark any client-specific unknown as: `> TODO: open question - needs human decision`
