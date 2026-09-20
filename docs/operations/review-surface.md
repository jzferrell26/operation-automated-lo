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
- API routes: `POST /api/auth/sign-in`, `/api/auth/choose`, `/api/auth/sign-up`, `/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/auth/verify-email`, `/api/auth/resend-verification`, `/api/auth/sign-out`, and `/api/auth/change-password`.
- The shell's unverified-email notice: a person whose email address is not confirmed reads "Confirm your email so you can reset your password later. Resend the link." above the page, and only on a deployment that has a sending domain. Without `OALO_RESEND_API_KEY` and `OALO_EMAIL_FROM` no message was ever sent, so nothing asks anyone to look for one and the notice does not appear. The control posts to `POST /api/auth/resend-verification`, which needs a valid session and the session-bound CSRF token, answers one fixed `303` to `/overview` whether or not a message went out, and is limited to five attempts per person per hour. Its audit action is `auth.verification-resent`, with subject `already_verified`, `not_configured`, `provider_error`, or the provider's message id; its rate-limit scope is `resend_verification_user`. Both are additions to PRD-006a D1's lists, made by `supabase/migrations/20260919180000_verification_resend.sql`.
- Telling a reset apart from a password change in the audit trail: a completed reset writes `auth.reset-completed` and a change made from `/settings/account` writes `auth.password-changed`. One row each, never both, and setting a first password writes neither. Both carry the canonical `actor_<hex>` subject, and neither ever carries a URL token, a token hash, or an address. `supabase/migrations/20260919200000_reset_completed_audit.sql` is where `platform.set_password` picks between them, from the reason it was already given.
- A locked account and the rows it leaves: ten consecutive wrong passwords write ten `auth.sign-in` `denied` rows and one `auth.lockout`, and lock the account for fifteen minutes. Attempts made while that lock is open keep writing their `auth.sign-in` `denied` row and change nothing else: they do not move the expiry and they do not count towards a new lock, so a reviewer reading a long run of denied rows on one account is reading attempts, not a lock that kept being renewed. Same migration.
- Requests that present no forwarded client address (neither `x-forwarded-for` nor `x-real-ip`) are counted in one fixed rate-limit bucket rather than skipping the per-address limits. A deployment sitting behind a platform that sets the header never uses that bucket; one that reaches this bucket has a proxy problem, and `apps/web/src/server/password-authentication-handler.ts` logs the missing header once per process by name.
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
