# Campaign Lifecycle Screens

## Purpose

Define the connected experience from a new Open House Boost through generated artifacts, deterministic preflight, named approval, Meta publication, and reporting.

## Create

The six-step workflow reuses confirmed brand, licensing, disclosures, partner, routing, and provider mappings. It must not ask the user to retype canonical profile data per campaign.

Required states include autosaving, saved, incomplete, verifying, blocked, upload processing, asset rejected, and permission attestation missing.

## Studio

The Studio unifies page, PDF, QR destination, Meta creative, ad copy, email, and SMS under one campaign version. It displays source profile versions, regeneration allowances, artifact status, and approval availability.

## Preflight and approval

Blocking, warning, and passed rules are distinct. The right rail summarizes the exact approval scope and required approvers. A disabled continuation explains every unmet condition.

## Launch review

The launch screen requires exact confirmation for a real-money provider write. It uses the blueprint-controlled policy classification and accurate uncertain-write language. Publication progress remains visible until a terminal or reconciling state.

## Campaign detail

The detail view connects approved artifacts, Meta state, HighLevel routing, campaign outcomes, append-only activity, exceptions, and version history.

## Required cross-screen invariants

- Campaign version is visible near approval and publishing actions.
- Material edits create a new version.
- Approval never silently carries forward.
- Provider freshness is visible.
- Test leads are excluded.
- Unavailable is not zero.
- AI remains suggestion-only.
- Public artifacts do not inherit dashboard theme.

## Reference canvases

- `Create.dc.html`
- `Studio.dc.html`
- `Preflight.dc.html`
- `Launch.dc.html`
- `CampaignDetail.dc.html`
