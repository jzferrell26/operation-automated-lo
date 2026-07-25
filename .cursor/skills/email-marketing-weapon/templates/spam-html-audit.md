# Spam / crawler HTML audit (per email)

Fill this in per email. See `../guides/04-spam-filter-html.md`. Content hygiene is the floor, not the lever: frame findings as secondary to authentication, reputation, and engagement.

- Email / subject: __________
- Sending domain: __________
- Raw HTML size: ______ KB
- Cold or warm send: __________

| Check | Result | Severity | Exact detail (line / image / byte weight) | Fix |
|---|---|---|---|---|
| Plain-text multipart/alternative present | | Blocker | | |
| All merge tokens resolve | | Blocker | | |
| Not image-only; makes sense with images off | | Risk | | |
| Alt text on every image | | Risk | | |
| HTML under 102KB; unsub + CTA above clip | | Risk | | |
| Link hygiene (no shorteners on cold, text=href, on-domain tracking) | | Risk | | |
| MSO conditionals intact (Outlook buttons/bg) | | Nit | | |
| Subject / lexicon (no ALL CAPS, no punct spam, not misleading) | | Nit (reputation-aware) | | |

## Notes

- Escalate a Nit to a Risk when domain reputation is already weak.
- Every finding names the exact thing: the exact line, the exact image, the exact byte weight.

> Mark any unknown as: `> TODO: open question - needs human decision`
