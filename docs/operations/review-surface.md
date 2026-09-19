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
- Project ID: `prj_3vsGKbHLbEmJBkokUpE3eRNXoRz2`
- Root directory: `apps/web`
- Node runtime: `24.x`
- Install command: `corepack enable && pnpm install --frozen-lockfile`
- Production host: `https://operation-automated-lo-web.vercel.app`
- Review route: `/overview`

Set `OALO_REVIEW_SURFACE=authorized` (and the stub/synthetic companions) on Production and Preview in that project, then redeploy the review branch. The homepage redirects to `/overview` when the review surface is authorized.

**No second Vercel project exists or will be created for this review surface.** The review deployment (production alias or a preview URL, decided in PRD-005e's open questions) stays on this one project, `operation-automated-lo-web`, `prj_3vsGKbHLbEmJBkokUpE3eRNXoRz2`.

## Project inspection record (2026-09-19)

Read-only inspection, recorded per PRD-005e (`005E-AC-001`). No environment variable value appears anywhere in this section, only names and inspection results.

- Inspection date: 2026-09-19.
- Project facts confirmed: name `operation-automated-lo-web`, ID `prj_3vsGKbHLbEmJBkokUpE3eRNXoRz2`, scope `jonathan-ferrell`, root `apps/web`, Node 24.x, created 2026-09-14.
- Read-only HTTP probes against `https://operation-automated-lo-web.vercel.app` (latest production deployment, `Ready` at inspection time):
  - `/` returned 200.
  - `/overview` returned 200.
  - `/api/health/live` returned 200.
  - `/api/health/ready` returned 503 with body `{"status":"unavailable","checks":[{"name":"configuration","ready":false,"code":"CONFIGURATION_INVALID"}]}`. This is the fail-closed production-environment contract working as designed; the deployment has no `OALO_*` variables set yet.
  - `/api/version` returned an empty 500. This was a route-hardening defect, not the environment contract: `parseRuntimeEnvironment` threw and nothing caught it. Fixed in this batch (`005E-AC-002`); see `apps/web/src/app/api/version/route.ts` and `apps/web/src/app/api/version/route.unit.test.ts`.

## Review sign-in path (PRD-005b, Wave 2)

The review surface's authenticated pages will read their session from a first-party sign-in path, not from HighLevel SSO and not from the `local_synthetic` fixture principal:

- Sign-in page: `/review/sign-in`.
- Sign-in and sign-out API routes: `POST /api/review/session`, `POST /api/review/session/sign-out`.
- Seeding procedure for the review location and its two review users: `docs/operations/review-session-seeding.md`.

These paths are added by PRD-005b and wired into the review surface in Wave 2 of the PRD-005 raid. This document records the pointer; PRD-005b's own sub-PRD and `docs/operations/review-session-seeding.md` are authoritative on the mechanics. A review sign-in session is not HighLevel evidence and does not satisfy any `DEFERRED: LIVE HIGHLEVEL AUTH` row.

## Dispositions recorded 2026-09-19

### PR #50 (Dependabot minor and patch bump)

Not merged in this batch. State on 2026-09-19: `OPEN`, `mergeStateStatus: BEHIND`, `mergeable: MERGEABLE`, last updated 2026-09-16. Its checks on CI run `35106034087` show Application verification, Real PostgreSQL migrations and pgTAP, and Release and recovery contract all failing, and the Vercel deployment for that PR failed. Verified with `gh pr view 50` and `gh pr checks 50` on 2026-09-19. Action after PRD-005 merges: rebase the Dependabot branch onto the new `main` and re-evaluate CI before any merge decision. This document does not merge PR #50 and does not change any dependency.

### Subagent note

The completion review dated 2026-09-19 recommends continuing in one primary session without workers. The recon brief for this raid attributed a "no subagents" policy, dated 2026-09-14, to `AGENTS.md`; that attribution could not be verified. `AGENTS.md` at `c140f11` (last changed by PR #51 on 2026-09-14) describes subagents as this repository's Guardian model and contains no such restriction; a repository-wide search for the phrase found nothing at that commit. This batch (the PRD-005 gauntlet raid) ran under Claude Code with the owner's explicit instruction to execute the raid with armed Guardian sub-agents. That authorization is recorded here and in `EXECUTION_LEDGER.md`'s raid log rather than silently assumed.

## Honest labeling

The authenticated shell banner must remain:

- `REVIEW SURFACE. Demo fixtures only. Not connected to HighLevel, Meta, or Stripe. These numbers are not live customer data.`
- `REVIEW / DEMO / NOT CONNECTED`

Review-mode spend, leads, and CRM tiles render as unavailable / not-connected. They must not show invented live counts.
