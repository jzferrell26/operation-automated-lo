# 04 - Spam-filter and crawler-friendly HTML

This is the HTML hygiene floor. Frame everything here as SECONDARY to authentication, reputation, and engagement. Content hygiene is the floor, not the lever: a clean-reputation domain can use the word "free"; a shot-reputation domain cannot (`../research/spam-filter-html.md`). Source unless noted: `../research/spam-filter-html.md`.

Use this guide to drive the scan in `../templates/spam-html-audit.md`.

## Where content sits in the priority order

Filters score trust signals far more than keywords. The order, highest first: authentication, then sender reputation, then engagement (Gmail and Outlook use behavioral ML scoring), then content/HTML quality, which is least important but still real for malformed or deceptive construction. Never let a content fix stand in for an auth or reputation fix.

## The deterministic scan (with severity)

Run these checks on every email. Severities below are the defaults; escalate a Nit to a Risk when reputation is already weak.

| Check | Finding when it fails | Severity |
|---|---|---|
| Plain-text multipart/alternative present | Missing plain-text part | Blocker |
| Merge tokens all resolve | Broken/unresolved token (looks broken and can leak data) | Blocker |
| Not an image-only email; makes sense with images off | All-image email, or text-to-image ratio below threshold | Risk |
| Alt text on every image | Missing or empty alt text per image | Risk |
| HTML under 102KB; unsubscribe + key CTA above the clip line | Over 102KB, or unsubscribe/CTA below the clip | Risk |
| Link hygiene | URL shortener on a cold send, link text vs href mismatch, off-domain tracking host | Risk |
| MSO conditionals intact where Outlook buttons/bg-images are used | Stripped or absent MSO conditionals | Nit |
| Subject and lexicon | Spam-lexicon hits, ALL CAPS subject, punctuation spam, misleading subject | Nit (reputation-aware) |

## Plain-text multipart/alternative

Always send multipart/alternative with a real plain-text part alongside the HTML. HTML-only is a spam-filter risk and breaks constrained clients. Most ESPs auto-generate the text part, but it must be maintained, not a garbage auto-strip; a clean text part reduces ambiguity and gives constrained clients a usable version.

## Text-to-image ratio

- No universal magic ratio. 60% text / 40% image is a reasonable starting guideline.
- The real killer is the all-image email (single image, no live text): it triggers filters, is invisible to screen readers, and breaks when images are blocked by default.
- Practical rule: the email must make sense as plain text with all images off.

## Alt text and accessibility

Real alt text on every image, for deliverability, accessibility, and the image-blocking fallback. Empty or missing alt is a finding. The HTML skeleton in `../templates/email-template.html` ships with alt-text placeholders on every image slot.

## Link and redirect hygiene

- No URL shorteners (bit.ly, tinyurl) on cold sends. GoHighLevel explicitly flags these (`../research/gohighlevel-sending.md`); they correlate with spam and hide the destination.
- Avoid visible-text-vs-actual-URL mismatches; this is a direct Outlook content-filter trigger.
- Keep redirect/tracking domains consistent with the sending domain where possible. A tracking domain on a separate low-reputation host hurts.

> Gap note: cold-email tracking/redirect infrastructure (custom tracking-subdomain reputation) was only lightly covered in research. The rule above (no shorteners, consistent tracking domain) is grounded, but a deep custom-tracking-subdomain decision should be flagged `> TODO: open question - needs human decision` if cold outreach becomes a heavy use case (`../research/research-summary.md`).

## Gmail 102KB clipping

- Gmail clips messages whose raw HTML exceeds about 102KB, hiding the rest behind "View entire message." Clipping counts HTML size only; referenced images do NOT count (they are fetched separately).
- Consequence: an unsubscribe link, footer, or CTA can land below the clip, creating a CAN-SPAM / one-click risk and lost conversions.
- Keep HTML under 102KB and put the unsubscribe link and key CTA high enough to survive the clip.
- When minifying, use an email-specific minifier so MSO conditional comments are not stripped.

## Outlook (classic / Word-engine) rendering

- Classic Outlook renders with the Word HTML engine. Use MSO conditional comments `<!--[if mso]>...<![endif]-->` for Outlook-only markup; other clients ignore them as comments.
- Use VML (wrapped in MSO conditionals) for background images and bulletproof/rounded buttons in Outlook.
- Use table-based layouts and inline CSS. Modern CSS (flex, grid, many properties) is unreliable in classic Outlook.

The skeleton in `../templates/email-template.html` is table-based, inline-styled, ships a plain-text-friendly structure, and reserves an MSO-conditional slot for an Outlook button.

## Spam-trigger words: the myth, stated precisely

Spam trigger words are largely a myth from the SpamAssassin era. A single word ("free", "guarantee", a dollar-sign run) only bites when reputation is already weak. Still avoid ALL CAPS subjects, excessive punctuation, misleading/clickbait subjects, and deceptive From: identity, because they correlate with low-quality mail AND break CAN-SPAM honesty. The lexicon scan is a Nit-level, reputation-aware signal, not a blocker.
