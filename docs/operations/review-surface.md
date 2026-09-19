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

## Sign-in path (PRD-006a)

The authenticated pages read their session from an email and password sign-in, not from HighLevel single sign-on and not from the `local_synthetic` fixture principal:

- Sign-in page: `/sign-in`, with a visible "Forgot your password?" link.
- The other pages: `/sign-up` (served only when `OALO_SELF_SERVE_SIGNUP=enabled`), `/forgot-password`, `/reset-password`, `/verify-email`, and `/settings/account`.
- API routes: `POST /api/auth/sign-in`, `/api/auth/choose`, `/api/auth/sign-up`, `/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/auth/verify-email`, `/api/auth/sign-out`, and `/api/auth/change-password`.
- Setting up the workspaces, the people, and their first passwords: `docs/operations/review-session-seeding.md`.

PRD-006a replaces the persona selector PRD-005b D4 described. `/review/sign-in`, `POST /api/review/session`, `POST /api/review/session/sign-out`, and `OALO_REVIEW_SIGNIN_SECRET` no longer exist. PRD-006a's own sub-PRD and the seeding runbook are authoritative on the mechanics.

Signing in here proves nothing about HighLevel. It is this product's own login, it satisfies no `DEFERRED: LIVE HIGHLEVEL AUTH` row, and the sign-in page says so.

## Dispositions recorded 2026-09-19

### PR #50 (Dependabot minor and patch bump)

Not merged in this batch. State on 2026-09-19: `OPEN`, `mergeStateStatus: BEHIND`, `mergeable: MERGEABLE`, last updated 2026-09-16. Its checks on CI run `35106034087` show Application verification, Real PostgreSQL migrations and pgTAP, and Release and recovery contract all failing, and the Vercel deployment for that PR failed. Verified with `gh pr view 50` and `gh pr checks 50` on 2026-09-19. Action after PRD-005 merges: rebase the Dependabot branch onto the new `main` and re-evaluate CI before any merge decision. This document does not merge PR #50 and does not change any dependency.

### Subagent note

The completion review dated 2026-09-19 recommends continuing in one primary session without workers. The recon brief for this raid attributed a "no subagents" policy, dated 2026-09-14, to `AGENTS.md`; that attribution could not be verified. `AGENTS.md` at `c140f11` (last changed by PR #51 on 2026-09-14) describes subagents as this repository's Guardian model and contains no such restriction; a repository-wide search for the phrase found nothing at that commit. This batch (the PRD-005 gauntlet raid) ran under Claude Code with the owner's explicit instruction to execute the raid with armed Guardian sub-agents. That authorization is recorded here and in `EXECUTION_LEDGER.md`'s raid log rather than silently assumed.

## Honest labeling

The authenticated shell banner must remain:

- `HighLevel, Meta, and Stripe aren't connected to this workspace yet, so nothing here is live and nothing can be published.`
- `Not connected yet`

PRD-006b D4 reworded both lines from the wording PRD-005 shipped. Their meaning is unchanged and is what PRD-005e proof point 6 reads against: the banner states that nothing is connected and that nothing can be published, and no figure on the page is presented as live. The headline is one shared constant, `NOT_CONNECTED_HEADLINE` in `apps/web/src/copy/user-language.ts`, used by both the shell and the not-connected screen. The banner's accessible name is `Not connected yet: HighLevel, Meta, and Stripe`.

Review-mode spend, leads, and CRM tiles render as unavailable / not-connected. They must not show invented live counts.
