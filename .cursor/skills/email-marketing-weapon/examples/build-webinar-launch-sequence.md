# Example (edge case): a webinar launch sequence for a new client on an unwarmed domain

Demonstrates: `guides/00-principles.md`, `guides/01-deliverability-preflight.md`, `guides/05-gohighlevel-sending.md`, `guides/06-launch-sequences-copy.md`, `guides/07-brand-voice-packs.md`, and the `templates/launch-sequence-plan.md` + `templates/email-template.html` stubs.

This is the edge case because the deadline pressure pushes toward shipping before the domain is ready. Deliverability gates everything, so the answer is to gate the send, not the campaign idea.

## The request

"New client, brand-new sending subdomain `go.newclient.com` on GoHighLevel set up last week. We have a webinar in 9 days and want a full launch sequence. Build it."

## Step 1: the preflight blocks the timeline, not the work

A brand-new sending domain needs 4-8 weeks of warmup to reach production volume; rushing warmup is the number one cause of deliverability failure (`guides/03-monitoring-warmup-hygiene.md`). Sending a full webinar blast to a large list off a one-week-old domain in 9 days is a NO-GO (`guides/01-deliverability-preflight.md`).

Also flagged on the DMARC check: confirm the domain is not publishing `p=reject` on the root without the dedicated sending domain fully verified, which would bounce the mail outright (`guides/05-gohighlevel-sending.md`, `guides/02-authentication-dns.md`).

What the Guardian does instead of refusing the campaign:

- Specify the DNS records the operator must apply (SPF single record, DKIM on `go.newclient.com`, DMARC at `p=none` to start) and the monitoring enrollment (Postmaster Tools on the DKIM domain, SNDS + linked JMRP, Yahoo CFL) before any bulk send (`guides/01-deliverability-preflight.md`, `guides/03-monitoring-warmup-hygiene.md`).
- Recommend the smallest viable send for this webinar: mail only the most-engaged, recently-validated segment within the GoHighLevel Stage 1 ramp (100/hour, 1,000/day), and start the full warmup now for future launches (`guides/05-gohighlevel-sending.md`).
- Where the list exceeds the warmed capacity: > TODO: open question - needs human decision. Whether to delay the webinar, send to a capped engaged segment only, or send the broadcast from an already-warmed domain is an operator call.

## Step 2: load the voice pack and design the spine

Load the client's brand-voice pack first so copy stays in-voice and never borrows another client's register (`guides/07-brand-voice-packs.md`). Then lay the webinar spine onto the runway (`guides/06-launch-sequences-copy.md`), filling `templates/launch-sequence-plan.md`:

- Invitation A (outcome-framed angle).
- Invitation B to non-registrants (different subject/angle; captures another 20-30%).
- Day-before reminder.
- One-hour-before reminder.
- "We're live" one-link email at the exact start time (can lift live attendance 10-15%).
- Replay + follow-up within 2-4 hours of ending (same-day gets 2-3x next-day engagement).
- Close: 2-3 emails in the final 48 hours (value, objection-handling, final-call), because over 50% buy at the last minute.

## Step 3: write copy and build the HTML

- Subjects 30-50 characters, preheaders about 75 characters, one primary CTA per email, clarity over cleverness (`guides/06-launch-sequences-copy.md`).
- No em dashes in any line (`guides/00-principles.md`).
- Build each email from `templates/email-template.html`: table-based, inline-styled, plain-text-friendly, alt text on every image, an MSO-conditional CTA button, merge-token placeholders mapped to GoHighLevel fields, the unsubscribe + key CTA above the 102KB clip line (`guides/04-spam-filter-html.md`, `guides/05-gohighlevel-sending.md`).

## Outcome

The sequence is fully designed and in-voice, the HTML is deliverability-safe, and the send is gated behind warmup, authentication, and monitoring. The campaign ships when the domain is ready, on a capped engaged segment if the deadline holds; the deliverability gate is never waived to hit a date. This is the principle from `guides/00-principles.md` applied under deadline pressure.
