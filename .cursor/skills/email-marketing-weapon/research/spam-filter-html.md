---
retrieved_on: 2026-06-25
source_type: vendor + practitioner + bug-tracker
authority: practitioner (Email on Acid, Mailgenius, Mailchimp, Litmus-adjacent)
relevance: high
topic: spam-filter-html
weapon: email-marketing-weapon
---

# Spam-Filter & Crawler Friendliness of Email HTML — 2026

## Primary sources
- Mailgenius, Perfect Email HTML best practices 2026 — https://www.mailgenius.com/email-html-best-practices/ (practitioner)
- Email on Acid, Gmail email clipping — https://www.emailonacid.com/blog/article/email-development/gmail-email-clipping/ (practitioner, authoritative on rendering)
- Mailchimp, Gmail is clipping my email — https://mailchimp.com/help/gmail-is-clipping-my-email/ (ESP official)
- DEV/MailPeek, Complete Guide to Email Client Rendering Differences 2026 — https://dev.to/mailpeek/the-complete-guide-to-email-client-rendering-differences-in-2026-243f (practitioner)
- hteumeuleu/email-bugs #41 (Gmail 102KB clipping) — https://github.com/hteumeuleu/email-bugs/issues/41 (bug tracker, authoritative)
- Omnisend, how to avoid spam filters 16 ways 2026 — https://www.omnisend.com/blog/how-to-avoid-spam-filters/ (practitioner)
- TrulyInbox, how spam filters work 2026 — https://www.trulyinbox.com/blog/how-email-spam-filters-work/ (practitioner)
- Mailflow Authority, image-to-text ratio: what data shows — https://mailflowauthority.com/email-content/image-to-text-ratio (practitioner)

## How filters actually score (2026 reality — priority order)
Filters score TRUST SIGNALS far more than keywords. Priority of what gets you spam-foldered:
1. **Authentication** (SPF/DKIM/DMARC) — top cause of legit mail being flagged.
2. **Sender reputation** (domain/IP history, complaint rate).
3. **Engagement** — Gmail and Outlook use AI/ML behavioral scoring: opens, replies, "Not Junk," delete-without-reading, time-in-inbox. Engagement now dominates content scoring.
4. **Content / HTML quality** — least important, but still real for malformed/deceptive construction.

So: HTML hygiene is a hygiene floor, not a magic lever. A clean-reputation domain can use the word "free"; a shot-reputation domain cannot.

## Spam-trigger words: the myth, stated precisely
- "Spam trigger words are largely a myth from the SpamAssassin era." A single word ("free", "guarantee", "$$$") only bites when reputation is ALREADY weak.
- Still avoid: ALL CAPS subject lines, excessive punctuation (!!!, $$$), misleading/clickbait subjects, and deceptive From: identity — these correlate with low-quality mail and ALSO break CAN-SPAM honesty rules.
- The Weapon's spam-lexicon scan should be a NIT-level signal, not a blocker, and should be reputation-aware in its framing.

## Text-to-image ratio
- No universal magic ratio; **60% text / 40% image is a reasonable starting guideline**.
- The REAL killer is the **all-image email** (single image, no live text): triggers filters, invisible to screen readers, breaks when images are blocked by default.
- Practical rule: **the email must make sense as plain text with all images off.**

## Plain-text multipart/alternative
- Always send **multipart/alternative** with a real plain-text part alongside the HTML. HTML-only is a spam-filter risk and breaks constrained clients.
- Most ESPs auto-generate the text part, but it should be MAINTAINED (not garbage auto-strip) — it reduces ambiguity and gives constrained clients a usable version.

## Alt text + accessibility
- Real alt text on every image (deliverability + accessibility + image-blocking fallback). Empty/missing alt is a finding.

## Link & redirect hygiene
- **No URL shorteners (bit.ly, tinyurl)** on cold sends — GoHighLevel explicitly flags these as problematic; they correlate with spam and hide the destination.
- Avoid mismatched/visible-vs-actual URL mismatches (a direct Outlook content-filter trigger).
- Keep redirect/tracking domains consistent with the sending domain where possible; a tracking domain on a separate low-rep host hurts.

## Gmail 102KB clipping limit (current, confirmed)
- Gmail clips messages whose **raw HTML exceeds ~102KB**, hiding the rest behind "View entire message." Clipping focuses on **HTML size only — referenced images do NOT count** (fetched separately).
- Consequences: unsubscribe link/footer/CTA can land below the clip → CAN-SPAM/one-click risk + lost conversions. Keep HTML under 102KB; put the unsubscribe + key CTA high enough to survive.
- When minifying, **use an email-specific minifier** so MSO conditional comments are not stripped.

## Outlook (classic / Word-engine) rendering
- Classic Outlook renders with the Word HTML engine. Use **MSO conditional comments** `<!--[if mso]>...<![endif]-->` for Outlook-only markup; other clients ignore them as comments.
- Use **VML** (wrapped in MSO conditionals) for background images and rounded/bulletproof buttons in Outlook.
- Use table-based layouts and inline CSS; modern CSS (flex/grid, many properties) is unreliable in classic Outlook.

## What the Weapon should encode (a spam/crawler scanner spec)
- A deterministic pre-send scan that flags, with severity:
  - Missing plain-text multipart/alternative (Blocker).
  - All-image / image-only email or text-to-image ratio below threshold (Risk).
  - Missing/empty alt text per image (Risk).
  - HTML size > 102KB or unsubscribe/CTA below the clip line (Risk).
  - URL shorteners on a cold send, mismatched link text vs href, off-domain tracking host (Risk).
  - Stripped/absent MSO conditionals where Outlook buttons/bg-images are used (Nit).
  - Spam-lexicon hits, ALL CAPS subject, punctuation spam, misleading subject (Nit, reputation-aware).
  - Broken/unresolved merge tokens (Blocker — looks broken AND can leak).
- Frame the whole scanner as SECONDARY to auth/reputation/engagement — content hygiene is the floor, not the lever.
