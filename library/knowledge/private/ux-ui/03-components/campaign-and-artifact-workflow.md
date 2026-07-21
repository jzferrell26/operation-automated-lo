# Campaign and Artifact Workflow Components

## Purpose

Keep campaign inputs, generated artifacts, preflight results, approvals, provider publication, lead routing, and outcome reporting visibly connected to one immutable campaign version.

## Campaign stepper

Founding Open House Boost stages:

1. Property and event
2. People
3. Brand and message
4. Assets and content
5. Routing and distribution
6. Generate and review

The stepper displays save state, completeness, blocking requirements, and current position. It must not imply that visiting a step completes it.

## Artifact workspace

Artifact tabs:

- Public page
- PDF
- QR destination
- Meta creative
- Ad copy
- Email
- SMS

Every artifact displays status, version, source profile versions, preview state, and whether it is part of the current approval snapshot.

Public artifact preview is visually nested inside the application but uses the approved tenant-brand projection. Dashboard theme never changes artifact output.

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
