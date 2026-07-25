# Launch sequence plan

Fill this in per campaign. Structure is client-agnostic (see `../guides/06-launch-sequences-copy.md`); the copy register comes from the loaded brand-voice pack (`../guides/07-brand-voice-packs.md`). No em dashes in any subject, preheader, or body line.

- Client / brand-voice pack: __________
- Campaign type (webinar / launch / cold cadence): __________
- Window (days): __________  Number of emails: __________
- Event date / time / timezone: __________
- Landing-page URL: __________
- Deliverability preflight verdict (must be GO before send): __________

## Cadence rule

Every other day in the main run, then back-load 2-3 emails in the final 48 hours. Over 50% buy at the last minute.

## Per-email plan

| # | Role | Send timing | Angle | Subject (30-50 char) | Preheader (~75 char) | Primary CTA (one only) |
|---|---|---|---|---|---|---|
| 1 | Invitation A | | outcome-focused | | | |
| 2 | Invitation B (non-registrants) | | different angle | | | |
| 3 | Day-before reminder | | | | | |
| 4 | One-hour-before reminder | | | | | |
| 5 | We're live (one link) | exact start time | | | | |
| 6 | Replay + follow-up | within 2-4h of end | | | | |
| 7 | Close: value | final 48h | | | | |
| 8 | Close: objection-handling | final 48h | | | | |
| 9 | Close: final call | final 48h | | | | |

(Add or remove rows to land in the 7-12 email window.)

## Registration-capture expectations (set with the client)

- Single invitation: 40-50% of total registrations at best.
- Follow-up with a different angle: another 20-30%.

## Per-email build checklist

For each email, build from `email-template.html` and confirm: plain-text part, alt text on every image, one primary CTA, unsubscribe + CTA above the 102KB clip, merge tokens validated, no em dashes.

> Mark any unknown as: `> TODO: open question - needs human decision`
