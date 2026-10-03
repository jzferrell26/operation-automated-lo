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
- **Captions.** "Updates as you type" beside the preview's title, and the two lines under the ad on step 3, are `--text-caption-size` in `--tx-faint`. Every other sentence on the three screens (notes, hints, the save note, the sentences in the decision cards, "What to fix") is `--text-secondary-size`, in `--tx-body` unless a state colours it.
- **Cards.** "Your ad so far" is the shared `Card` at `padding="lg"`, with its children one `--space-4` apart, like the form beside it and every card on step 3. No card on these screens states its own edge, radius, or padding. The last child of a card sits one card inset (`--space-6`) from its foot, so a live region that says nothing yet leaves the flow instead of leaving a gap.
- **Facts.** Each fact is a group of its label and its value: side by side (`8rem` label) from 48rem up, and the label over its value, `0` apart, below 48rem.
- **Dates.** A date is one unit. It never breaks across two lines (`white-space: nowrap` on `time`), so a date that does not fit moves whole to the next line.
- **Shape switch (Tall and Square).** Its words are `--text-secondary-size` at `--weight-medium`; the chosen shape takes `--st-info-bg` and `--weight-semibold`, so the choice shows in more than the radio's dot. It is not the theme control, which keeps its own selected state.
- **Phone.** The save note starts at the start edge under the stacked buttons, and "Add" is as wide as the place field above it.
- **Glyphs.** "Launch on Facebook" draws `rocket`; "Back" draws `chevron-left`; a topic is the neutral `Badge` with `tag`, at the chip step (12px), with no size or padding of its own.

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
