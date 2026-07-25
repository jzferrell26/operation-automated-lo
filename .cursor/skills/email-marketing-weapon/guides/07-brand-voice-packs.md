# 07 - Brand-voice packs (the pluggable per-client layer)

Brand voice is a per-client layer loaded explicitly, never hardcoded and never inferred from another client. This guide defines the pack format and ships Heather Ferrari as pack #1.

> Source note: research did NOT define this schema. It is out of loremaster's scope and client-specific, and the research-summary flags it as an open question for the user/weapon-forge to specify (`../research/research-summary.md`). The schema below is a weapon-forge craftsmanship decision, not a researched fact. The structure templates it sits on top of ARE researched (`../research/launch-sequences-copy.md`). Client-specific facts that research could not supply are marked as TODOs below.

## How the pack is used

1. The Guardian loads exactly one pack at the start of a job.
2. The pack supplies the copy register, signature devices, offers, and design tokens that sit on top of the client-agnostic sequence structure in `06-launch-sequences-copy.md`.
3. Voice never leaks between clients. If no pack is loaded, do not write copy from a generic voice; ask for the pack.

## The pack schema

A pack is a small markdown file (one per client). Fill in `../templates/brand-voice-pack.md`. Fields:

- `client`: client name.
- `one_liner`: who they are and who they serve, in one sentence.
- `voice`: 3-6 adjectives plus a one-paragraph description of tone.
- `signature_devices`: the recurring rhetorical moves (for example a named reframe), with a short example of each.
- `do`: phrases, framings, and moves that are on-brand.
- `dont`: phrases and moves that are off-brand (always includes: no em dashes).
- `offers`: the products/programs, with the transformation each promises.
- `assets`: book, signature talk, lead magnet, anything referenced in copy.
- `design_system`: the visual tokens (colors, type) used in HTML emails.
- `proven_sequences`: any launch cadence already validated for this client, referenced as a starting structure.
- `compliance`: From/Reply-To identity, physical mailing address for the footer, sending domain.

## Pack #1: Heather Ferrari

This is the first tenant, not the only one. The Command Brief names her signature device, design direction, offers, and book as the seed of this pack. Where the brief gives a concrete value it is recorded; where a value is a client fact research could not supply, it is a TODO.

- `client`: Heather Ferrari.
- `one_liner`: > TODO: open question - needs human decision. Confirm the exact positioning line and audience with the operator.
- `voice`: direct, warm, challenging. The defining move is the "truth bomb" reframe: name the uncomfortable truth the reader is avoiding, then reframe it into a next action. (Signature device named in the Command Brief.)
- `signature_devices`:
  - The "truth bomb" reframe: lead by naming the avoided truth, then pivot to the reframe and the action. (Command Brief.)
- `do`: lead with the transformation, not the format (consistent with the launch-copy reframe in `../research/launch-sequences-copy.md`); use the truth-bomb reframe as the hook.
- `dont`: no em dashes (project hard rule, `../research/launch-sequences-copy.md`); no clickbait or misleading subjects (`../research/spam-filter-html.md`).
- `offers`: her offers and her book are the named assets (Command Brief). > TODO: open question - needs human decision. The exact offer names, price points, and the book title/positioning were not supplied by research; confirm with the operator before writing offer copy.
- `assets`: her book. > TODO: open question - needs human decision. Confirm the book title and how it is referenced in copy.
- `design_system`: cream / slate / teal / gold palette (per the forge directive and Command Brief framing). > TODO: open question - needs human decision. Confirm exact hex values and the typeface pairing before building branded HTML. (The memory note references a Cormorant/DM Sans direction; confirm against the live brand guide.)
- `proven_sequences`: a proven 6-12 email launch cadence exists for her (the brief references a prior June launch as the first reusable cadence). Use it as the structural starting point, layered on the spine in `06-launch-sequences-copy.md`. > TODO: open question - needs human decision. Confirm the exact per-email cadence from the prior launch.
- `compliance`: > TODO: open question - needs human decision. Confirm her From/Reply-To identity, physical mailing address for the footer, and the exact sending domain/subdomain before any send.
- BIMI path: > TODO: open question - needs human decision. Whether Heather holds a registered trademark (VMC) or qualifies via 12-month logo use (CMC) is unknown and gates her BIMI route (`../research/deliverability-authentication.md`, `../research/research-summary.md`).

## Adding a new client pack

Copy `../templates/brand-voice-pack.md`, fill every field, and mark any unknown client fact as `> TODO: open question - needs human decision` rather than inventing it. A pack is ready to use only when the `compliance` block is complete, because no send clears the preflight without an accurate From/Reply-To, a physical address, and a confirmed sending domain (`../research/sender-requirements-2026.md`).
