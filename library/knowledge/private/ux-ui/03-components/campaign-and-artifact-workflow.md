# Campaign and Artifact Workflow Components

## Purpose

Keep campaign inputs, generated artifacts, preflight results, approvals, provider publication, lead routing, and outcome reporting visibly connected to one immutable campaign version.

## Campaign stepper

> **Superseded on 2026-10-01 by PRD-009** (S-60; OD-B, OD-H): the six-stage stepper below gives way to the three steps of "Launch an ad": Choose an ad, Set it up, Review and launch.

Founding Open House Boost stages:

1. Property and event
2. People
3. Brand and message
4. Assets and content
5. Routing and distribution
6. Generate and review

The stepper displays save state, completeness, blocking requirements, and current position. It must not imply that visiting a step completes it. _(PRD-009 (S-60): the end of the superseded stepper.)_

## Artifact workspace

> **Superseded on 2026-10-01 by PRD-009** (S-60; OD-H): the artifact tabs below are not in the founding flow; a launch reviews the actual library ad instead. The publishing-progress states later in this file stand for the Meta publish PRD.

Artifact tabs:

- Public page
- PDF
- QR destination
- Meta creative
- Ad copy
- Email
- SMS

Every artifact displays status, version, source profile versions, preview state, and whether it is part of the current approval snapshot. _(PRD-009 (S-60): the end of the superseded artifact workspace.)_

Every generated synthetic creative displays an application preview and a Download original link for its exact immutable object. Preview and download use the same creative version, dimensions, MIME type, and approved output path. Dashboard theme never recolors the preview or downloaded original.

Public artifact preview is visually nested inside the application but uses the approved tenant-brand projection. Dashboard theme never changes artifact output.

## Artifact version actions

The campaign detail surface keeps immutable history visible while a user reviews an artifact version. Selecting Preview changes only the local review panel. It does not select a new current version, change approval, or modify history.

An approved public link is shown only for an approved artifact version and opens the public artifact in a separate browser context. Synthetic evidence routes stay inside the application origin and are labeled as synthetic.

Duplicate as new draft starts a separate draft projection from the selected source version. The source campaign identifier, source version, and existing history count remain visible after the interaction. During the UI Foundation phase, duplication is local-only evidence and performs no network or provider request.

## Preflight findings

Findings are grouped into Blocking, Warning, and Passed.

Each blocking or warning finding includes:

- Stable rule code
- Human explanation
- Affected field or artifact
- Why the rule matters
- How to fix it
- Responsible party

AI cannot dismiss, satisfy, waive, or approve a finding.

## Approval summary

The approval summary identifies exact versions for page, PDF, creative, copy, disclosures, targeting, budget, dates, form, and destination.

Material changes invalidate affected approvals and create a new campaign version. Prior decisions remain readable.

The approval scope renders as a labeled table on wide screens and remains an explicitly scrollable data region on narrow screens. It includes exactly page, PDF, creative, copy, disclosure, targeting, budget, dates, form, and destination versions.

### The three Launch an ad screens

_(Recorded on 2026-10-03 by the PRD-009 scored baseline review, pass 2, lane I: the rules the launch mockups draw that no other file stated, so a reviewer scores against this file and the mockups agree.)_

- **Crumbs.** "Campaigns" is `Link` with `variant="sentence"`, so it is the crumb's own `--text-secondary-size`; the current crumb carries `aria-current="page"` in `--tx-strong` at `--weight-medium`; the row stands `--target-min-size` tall.
- **Captions.** "Updates as you type" beside the preview's title, and the two lines under the ad on step 3, are `--text-caption-size` in `--tx-faint`. Every other sentence on the three screens is `--text-secondary-size`. The notes, the hints, the save note, and the approve line are in `--tx-body`; the sentences in the decision cards (approved, sent back, retired, cannot approve) and the "What to fix" items are in `--tx-strong`, as the mockup draws them (`launch-step-3-review-and-launch.html`, `.small` under the card, with only the approve line `.muted`), unless a state colours them. _(Amended on 2026-10-03 by the PRD-009 scored baseline review, pass 3 (R1 P3-03): this line first named the decision-card sentences and "What to fix" as `--tx-body`, which the mockup does not draw and three of the four cards did not use. Where a written spec line and the PRD-009 mockup disagree on a screen's look, the mockup wins, so the line follows it.)_
- **Cards.** "Your ad so far" is the shared `Card` at `padding="lg"`, with its children one `--space-4` apart, like the form beside it and every card on step 3. No card on these screens states its own edge, radius, or padding. The last child of a card sits one card inset (`--space-6`) from its foot, so a live region that says nothing yet leaves the flow instead of leaving a gap.
- **Facts.** Each fact is a group of its label and its value: side by side (`8rem` label) from 48rem up, and the label over its value, `0` apart, below 48rem.
- **Dates.** A date is one unit. It never breaks across two lines (`white-space: nowrap` on `time`), so a date that does not fit moves whole to the next line.
- **Shape switch (Tall and Square).** Its words are `--text-secondary-size` at `--weight-medium`; the chosen shape takes `--st-info-bg` and `--weight-semibold`, so the choice shows in more than the radio's dot. It is not the theme control, which keeps its own selected state.
- **Phone.** The save note starts at the start edge, above the stacked buttons, and "Add" is as wide as the place field above it.
- **Save note.** It is the last child of step 2's actions row, on a line of its own, so it is one `--space-3` from the buttons it describes at every frame (the mockup's `.form-actions__note`): under them from 720px up, above "Save and check" on a phone, where the row is a column that does not wrap.
- **Glyphs.** "Launch on Facebook" draws `rocket`; "Back" draws `chevron-left`; "See what we checked" draws `chevron-right` before its words; a topic is the neutral `Badge` with `tag`, at the chip step (12px), with no size or padding of its own.
- **Disclosures.** "See what we checked" is the mockup's `details.disclosure > summary`: a row of the glyph and its words (`display: flex`, so the browser's own triangle is not drawn), `--text-secondary-size` at `--weight-semibold` in `--st-info-fg`, with the 44px target. "Details for support" is the same summary in a card padded `--space-1` above and below its inline inset (the mockup's `details.card.support`); it is the one rule on step 3 and on the campaign page.
- **Link actions.** "Fix it", "Make a new version", and "Choose another ad" are `Link` with `variant="action"` and `size="sm"`: the twin of "Copy the link", so the secondary step at the shared `--weight-medium` (every button keeps 500) with the 44px target. The campaign page's primary link keeps the same weight at the body step. The three are primary actions, so each draws its edge in the action colour (`--ac-primary`, and `--ac-primary-hover` on hover), as the mockups' `btn--primary` does, and no grey `--bd-input` ring shows around the fill. _(Recorded on 2026-10-03 by the PRD-009 scored baseline review, pass 4, R1 F4-01.)_ The campaign page's "Launch an ad" is the plain `inline` link, which has no edge to restate.
- **The ad card.** It is the shared `Card` at `padding="none"` (so it carries `--shadow-card`), then the art, the body (`--space-4` above, `--space-5` at the sides and below), and a foot for the action (`--space-5` at the sides and below), so "Use this ad" sits one body inset under the version line and the actions line up across a row.

### The campaign page and the Campaigns list

_(Recorded on 2026-10-03 by the PRD-009 scored baseline review, pass 3.)_

- **Campaigns list.** At 720px and wider the table's Ad cell keeps its decorative thumbnail at every frame (beside the name; above it from 720px to 767px, where six columns, the widest status chip, and a tile beside the name do not fit), and the name's column never shrinks under its longest unbreakable word; on a phone card the status chip is a line of its own and "Last change" is a caption on the line after it.
- **Version words.** "library version 2" is one unit: its words are joined with no-break spaces, so a value that wraps never leaves the number on a line of its own.
- **Approval card.** Its first sentence ("Approved by ...", "Sent back for changes by ...", or "Nobody has approved this version yet.") is the card's lead and is `--tx-strong`, as step 3 draws the same sentence; the sentence under it ("The approval covers this version and these words only...") is the quiet `--tx-body`. Both are the secondary step. _(Recorded on 2026-10-03 by the PRD-009 scored baseline review, pass 4, R2 F4-1; the mockup is `campaign-detail.html:553`.)_
- **Saved words.** On a campaign saved before PRD-009 the main column's card ("The saved words") is titled at `--text-section-size`, as "The ad" and "Results" are, and not at the card step the side cards use.

### A campaign's name and dates in a list row

_(Recorded on 2026-10-04 by the PRD-009 final scored review, FU-1 and FU-2. Home's two lists, "Running now" and "Needs your approval", are rows of the same shape as the Campaigns list, so the rules above that cover a row cover them.)_

- **The name.** A campaign's name that leads a row is `Link` with `variant="title"`: an ink title in `--tx-strong` at `--weight-semibold`, no underline until hover, `--target-min-size` tall, with the shared focus ring. It is the same in the Campaigns table, the Campaigns phone cards, and Home's two lists, and it is one definition (`03-components/link.md`, "A name in a list row"), so no list restyles it in its own module. Home had drawn it as the blue underlined `inline` link at `--weight-medium`, where the mockups' `.row-link` and `.list-card a` draw an ink title (`home-first-run.html:393` and `:398`).
- **The dates.** A date in Home's rows is one unit and never breaks across two lines, as it does on the Launch screens (the "Dates" line above), the Campaigns list, and the campaign page: `white-space: nowrap` on `time` inside Home's `.rows` (`overview.module.css`). A date that does not fit moves whole to the next line. It is a local rule on Home's rows, not a change to the global `time` rule.

## Meta connection and asset selection

Campaign launch review names the active synthetic location and its connected or blocked Meta state. Selected ad account, page, optional Instagram identity, lead form, and pixel each display a safe synthetic provider ID and safe display name. Missing or inaccessible assets have a named remediation and cannot be represented by an unlabeled placeholder.

Only fixture-backed values render during UI Foundation work. The connection region performs no provider discovery, reconnect, disconnect, or write request.

## Publish confirmation

Publishing requires explicit confirmation of the immutable snapshot and displays:

- Campaign version
- Ad account
- Page and Instagram identity
- Lead form and pixel
- Budget and schedule
- Geography
- Blueprint-controlled policy classification
- Creative and copy
- Destination
- Approval state
- Provider connection state

The final summary lists every approved target, exclusion, budget amount and cadence, start date, end date, and timezone. The final confirmation opens the product confirmation surface, repeats campaign scope and result, and stages only a local confirmation result during UI Foundation work. It never claims a provider draft, publication, or spend change.

No delete, prohibited targeting, audience upload, disconnect, or automatic optimization control is present.

## Publishing progress

Supported UI states:

- Preparing
- Creating draft
- Reading back
- Verifying exact match
- Publishing
- Awaiting provider
- Live
- Failed
- Uncertain, reconciling

## Reference canvases

- `Create.dc.html`
- `Studio.dc.html`
- `Preflight.dc.html`
- `Launch.dc.html`
- `CampaignDetail.dc.html`
