# Research Plan: email-marketing-weapon

- **Depth tier:** deep
- **Time window:** 2025-12-25 back to 2026-06-25 (6 months default; extend toward 12 months only where the canonical rule predates the window, e.g. Feb 2024 Google/Yahoo mandates that are still the live standard)
- **Page budget target:** ~100+ unique authoritative pages (deep tier)
- **Source breadth target:** official sender docs (Google/Yahoo/Microsoft), RFCs, M3AAWG, DMARC.org/BIMI Group, reputable deliverability vendors (Valimail, Postmark, Mailtrap, EmailGeeks, GlockApps), GoHighLevel docs + practitioner guides, launch-copy practitioners.
- **Tooling note:** Firecrawl and Exa MCP tools are NOT available in this environment. Falling back to WebSearch + WebFetch per loremaster fallback protocol. Raw fetches summarized directly into research files (no `.firecrawl/` JSON payloads possible without the Firecrawl tool).

## Initial queries (from Command Brief, authored by command-center)
- "Google bulk sender requirements 2026 spam rate one-click unsubscribe authentication"
- "Yahoo sender requirements 2026 DKIM DMARC alignment"
- "Microsoft Outlook deliverability SNDS JMRP sender requirements 2026"
- "email domain warmup schedule new sending domain 2026 best practices"
- "DMARC enforcement BIMI VMC setup guide 2026"
- "email spam filter triggers Gmail Outlook 2026 HTML coding best practices"
- "GoHighLevel LeadConnector dedicated sending domain deliverability setup 2026"
- "cold email deliverability infrastructure inbox placement subdomain separation 2026"
- "high converting webinar email launch sequence cadence subject lines 2026"

## Themes -> output files
1. `deliverability-authentication.md` — SPF, DKIM, DMARC alignment/enforcement, BIMI + VMC, DNS record specifics.
2. `sender-requirements-2026.md` — Google/Yahoo/Microsoft bulk-sender mandates, the <0.3% / 0.1% spam thresholds, one-click unsubscribe RFC 8058, enforcement timeline.
3. `monitoring-warmup-hygiene.md` — Google Postmaster Tools, Microsoft SNDS/JMRP, domain/IP warmup schedules, subdomain separation, list hygiene, bounce/complaint thresholds and suspension mechanics.
4. `spam-filter-html.md` — Gmail/Outlook render quirks, text-to-image ratio, plain-text multipart, alt text, link hygiene, 102KB Gmail clipping, MSO conditionals, spam-trigger lexicon.
5. `launch-sequences-copy.md` — webinar/launch cadence (6-12 emails), subject lines + preheaders, CTA discipline, re-engagement/sunset flows.
6. `gohighlevel-sending.md` — LeadConnector dedicated sending domain setup, email builder, deliverability specifics.
7. `research-summary.md` — index manifest + top sources + open questions + gaps for weapon-forge.

## Expansion queries (authored by loremaster, deep tier)
### Branch from sender-requirements
- "Google one-click unsubscribe RFC 8058 List-Unsubscribe-Post header 2026"
- "Gmail spam complaint rate 0.3% threshold what happens enforcement"
- "Yahoo Microsoft bulk sender requirements 5000 emails per day 2026 update"
### Branch from authentication
- "DMARC p=quarantine vs reject alignment relaxed strict 2026"
- "BIMI VMC CMC common mark certificate Gmail Apple Mail 2026"
### Branch from warmup/hygiene
- "Google Postmaster Tools setup domain reputation spam rate dashboard 2026"
- "Microsoft SNDS signup Smart Network Data Services JMRP 2026"
- "email list sunset policy re-engagement unengaged subscribers deliverability"
### Branch from spam-filter HTML
- "Gmail 102KB email clipping limit 2026 message clipped"
- "Outlook MSO conditional comments VML button email HTML 2026"
- "email spam trigger words 2026 myth text to image ratio"
### Branch from launch copy
- "webinar email sequence high converting Jeff Walker PLF launch 2026"
- "email subject line open rate best practices preheader 2026"
### Branch from GoHighLevel
- "GoHighLevel dedicated domain LC email deliverability mailgun 2026"
- "GoHighLevel email warmup DMARC setup spam folder fix 2026"
