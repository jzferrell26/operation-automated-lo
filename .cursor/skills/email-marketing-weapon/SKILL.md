---
name: email-marketing-weapon
description: Deliverability-first email program toolkit for email-marketing-guardian. Equips the Guardian to run a go/no-go deliverability preflight (SPF/DKIM/DMARC alignment, Postmaster/SNDS/CFL enrollment, spam-rate thresholds), audit email HTML for spam and render risk, design cold cadences and warm 6-12 email launch runways, wire GoHighLevel / LeadConnector sends (dedicated sending domain, the p=reject footgun, phased warmup), and apply a pluggable per-client brand-voice pack (Heather Ferrari = pack #1). Use whenever email is being created, sent, or audited for any client on any platform. Never green-lights a send without aligned authentication and active monitoring. No em dashes, ever.
---

# email-marketing-weapon

The email program rulebook for `email-marketing-guardian`. It encodes the 2026 inbox-placement standard (authentication, reputation, monitoring, list hygiene, spam-filter HTML), campaign and launch-sequence frameworks, the GoHighLevel / LeadConnector runbook, and the per-client brand-voice pack format. Brand voice is a pluggable layer; deliverability is the non-negotiable gate every send must clear first.

All factual claims in the guides cite a file in `research/`. That folder is the audit trail: read it, never edit it.

## The one rule that gates everything

Deliverability gates everything. The most on-brand, highest-converting email is worthless if it lands in spam or gets the sending domain suspended. Never green-light a send without aligned SPF/DKIM/DMARC and active Postmaster/SNDS/CFL monitoring. A real client's Gmail sends were suspended on webinar day because Google Postmaster Tools was never set up. This Weapon exists to make that impossible to repeat. See `guides/00-principles.md`.

## Critical directives (the guardrails)

These come straight from the Command Brief's SUBAGENT CRITICAL DIRECTIVES. Full detail in `guides/00-principles.md`.

1. Deliverability gates everything. No send without aligned SPF/DKIM/DMARC and active Postmaster/SNDS/CFL monitoring.
2. No em dashes in any email copy, report, or prose, ever. Use commas, colons, parentheses, periods, semicolons.
3. Every email ships with a plain-text multipart alternative and real alt text on every image.
4. Never use spam-trigger patterns, misleading subject lines, link shorteners on cold sends, or image-only emails.
5. Respect list hygiene. Never send to an unwarmed domain or an unverified/stale list without a warmup and sunset policy.
6. Brand voice is per-client and loaded explicitly. Never bleed one client's voice into another's email.
7. Cite specifics in every finding: the exact DNS record, the exact spammy line, the exact byte weight.
8. Honor CAN-SPAM and GDPR: working one-click unsubscribe (RFC 8058 for bulk), a physical mailing address, accurate From/Reply-To.

## Routing table: request type to guide

| The request is about... | Go to |
|---|---|
| The non-negotiables, the priority order, the "why deliverability gates everything" | `guides/00-principles.md` |
| Pre-send go/no-go: auth alignment, monitoring enrollment, spam-rate gate, the verdict | `guides/01-deliverability-preflight.md` |
| The DNS records themselves: SPF, DKIM, DMARC ladder, BIMI/VMC/CMC | `guides/02-authentication-dns.md` |
| Postmaster Tools, SNDS/JMRP, Yahoo CFL, warmup ladders, list hygiene, sunset | `guides/03-monitoring-warmup-hygiene.md` |
| Auditing the HTML: text-to-image, plain-text part, alt text, links, 102KB clipping, MSO | `guides/04-spam-filter-html.md` |
| GoHighLevel / LeadConnector wiring: dedicated domain, p=reject footgun, warmup, merge tokens | `guides/05-gohighlevel-sending.md` |
| Designing the sequence: launch runway, webinar spine, subject + preheader, CTA, re-engagement | `guides/06-launch-sequences-copy.md` |
| Loading a client's voice: the brand-voice pack format, Heather Ferrari pack #1 | `guides/07-brand-voice-packs.md` |

## Workflow: how a job runs

1. Load the client's brand-voice pack (`guides/07`) so voice never leaks between clients.
2. Run the deliverability preflight (`guides/01`) and emit a go/no-go verdict. If no-go, stop and remediate. Auth and monitoring gate everything downstream.
3. For an audit: scan the HTML (`guides/04`) and produce severity-ranked findings.
4. For authoring: design the sequence (`guides/06`), apply the loaded voice, then wire the platform (`guides/05` for GoHighLevel).
5. Produce the report (`reports/` template, `templates/` for the stubs you fill in).

## Templates and reports

- `templates/deliverability-preflight-checklist.md` - the go/no-go checklist stub.
- `templates/spam-html-audit.md` - the per-email HTML audit stub.
- `templates/launch-sequence-plan.md` - the sequence planning stub.
- `templates/brand-voice-pack.md` - the per-client voice pack schema.
- `templates/email-template.html` - a clean, deliverability-safe HTML skeleton.
- `reports/deliverability-readiness-report.md` - the full output report matching the brief's EXPECTED OUTPUT.

## Worked examples

- `examples/audit-existing-email.md` - happy-path: auditing one email for deliverability and spam risk.
- `examples/build-webinar-launch-sequence.md` - edge case: a webinar launch runway for a brand-new client on an unwarmed domain.

## Scope boundary

This Weapon owns inbox placement, list hygiene, spam-filter and crawler friendliness, campaign and sequence strategy, copy craft, and platform wiring. It does not own SMS, paid ads, organic social, the n8n plumbing that triggers sends, or GoHighLevel field-key semantics. The Guardian diagnoses and specifies the exact DNS records; the operator or devops applies them. When research did not answer a question, the guides mark it `> TODO: open question - needs human decision` rather than inventing an answer.
