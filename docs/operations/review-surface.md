# Labeled HighLevel review surface

Use this when HighLevel reviewers need a live URL for the dashboard visual foundation. This is not production traffic, not App Test evidence, and not PRD-003 tenant persistence.

## Fail-closed default

`OALO_REVIEW_SURFACE` is unset by default. Production and staging then refuse the authenticated workspace unless local/preview synthetic rules already apply.

The exact enablement value is `authorized`. Values such as `true`, `1`, or `on` do not enable the surface.

## Required companion values

The review surface still refuses to render if providers are live:

| Variable | Value |
| --- | --- |
| `OALO_REVIEW_SURFACE` | `authorized` |
| `OALO_PROVIDER_MODE` | `stub` |
| `OALO_SYNTHETIC_DATA_ONLY` | `true` |
| `OALO_PRODUCTION_TRAFFIC` | `disabled` |

Do not set HighLevel, Meta, or Stripe live credentials for this surface. Do not create a second Vercel project.

## Existing Vercel project

- Team: `jonathan-ferrell`
- Project: `operation-automated-lo-web`
- Production host: `https://operation-automated-lo-web.vercel.app`
- Review route: `/overview`

Set `OALO_REVIEW_SURFACE=authorized` (and the stub/synthetic companions) on Production and Preview in that project, then redeploy the review branch. The homepage redirects to `/overview` when the review surface is authorized.

## Honest labeling

The authenticated shell banner must remain:

- `REVIEW SURFACE. Demo fixtures only. Not connected to HighLevel, Meta, or Stripe. These numbers are not live customer data.`
- `REVIEW / DEMO / NOT CONNECTED`

Review-mode spend, leads, and CRM tiles render as unavailable / not-connected. They must not show invented live counts.
