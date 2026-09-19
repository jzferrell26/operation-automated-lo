# PRD-005e: Authenticated Review Runtime - Deployed Qualification of the Review URL

> **Parent:** [PRD-005](./prd-005-authenticated-review-runtime-index.md)
> **Status:** Draft
> **Priority:** P1 for release acceptance (completion review finding C4), separate from C1's code work
> **Schema changes:** None
> **Owner Guardians:** `release-deploy-guardian` (preview deploy, env wiring verification, smoke), `devops-guardian` (Vercel project inspection, `/api/version` hardening), `security-guardian` and `quality-guardian` (close-out on the deployed SHA)

## Goal

Prove, on one recorded deployment SHA of the existing Vercel project backed by an isolated review database, that a real human with a real session can create, reload, and approve a persisted campaign through the shipped application, that an unauthorized user and another tenant cannot, and that providers stay visibly not connected with no side effect. Split the work into what agents can do now and what needs the operator, and state the operator asks exactly and without secrets.

## Background (honest)

- The completion review could not open the deployed site with its web tool, and its Vercel connector saw the Cuantico AI team only; a scoped request for `jonathan-ferrell` returned 403. That was a connector limitation. The orchestrator's recon on 2026-09-19 used the workstation's Vercel CLI (58.4.4, signed in as `jonathan-4064`), which reaches scope `jonathan-ferrell` and found the project: `operation-automated-lo-web`, ID `prj_3vsGKbHLbEmJBkokUpE3eRNXoRz2`, created 2026-09-14, root directory `apps/web`, Node 24.x, install command `corepack enable && pnpm install --frozen-lockfile`. This sub-PRD's author did not re-run the CLI; the project facts are recorded from that read-only inspection. Do not create a second project.
- Read-only HTTP probes on 2026-09-19 against `https://operation-automated-lo-web.vercel.app` (the latest production deployment, `Ready`): `/` 200, `/overview` 200, `/api/health/live` 200, `/api/health/ready` 503 with body `{"status":"unavailable","checks":[{"name":"configuration","ready":false,"code":"CONFIGURATION_INVALID"}]}`, and `/api/version` **500 with an empty body**. The author re-ran these probes and got identical results.
- The 503 is the fail-closed production-environment contract doing its job: outside local, `parseRuntimeEnvironment` requires every `OALO_*` server variable and a compatible release manifest (`docs/production-environments.md`), and that deployment does not have them. It is expected until the operator wires env.
- The empty 500 on `/api/version` is a route-hardening defect. `apps/web/src/app/api/version/route.ts:18-22` calls `parseRuntimeEnvironment(process.env)` with no `try`, so the same configuration failure that the readiness route turns into a handled 503 (`apps/web/src/app/api/health/ready/route.ts:143-169`) becomes an unhandled exception and an empty 500. The recon's diagnosis is a hypothesis until a unit test reproduces it; the criterion below requires that test.
- `tests/security/provider-side-effect-default-off.test.ts` and `/api/health/live`'s `productionTrafficEnabled: false` are the existing executable proof that no provider side effect is enabled by default (`GGL-005`, `GGL-006`).
- PR #50 (Dependabot, "bump the npm-minor-patch group across 1 directory with 17 updates") is OPEN, `mergeStateStatus: BEHIND`, `mergeable: MERGEABLE`, last updated 2026-09-16; its checks on run `35106034087` show Application verification, Real PostgreSQL migrations and pgTAP, and Release and recovery contract all failing, and the Vercel deployment failed. Verified with `gh pr view 50` and `gh pr checks 50` on 2026-09-19.
- The completion review's recommended order says "Continue in one primary session without workers" and describes itself as having started no workers or subagents. The recon brief attributed a 2026-09-14 "no subagents" policy to `AGENTS.md`; that attribution could not be verified. `AGENTS.md` at `c140f11` (last changed by PR #51 on 2026-09-14) describes subagents as the repository's Guardian model and contains no such policy, and a repository-wide search for the phrases found nothing. This batch runs under Claude Code with the owner's explicit instruction to run the gauntlet with Guardian sub-agents. That authorization is recorded here and in the raid log rather than silently assumed.
- The seven-point proof is the review's, restated verbatim in the criteria below. Points 1 through 5 require 005a and 005b on the deployed SHA. Points 6 and 7 hold on `c140f11` already but must be re-recorded on the same SHA as the others.

## Scope

### Agent-executable now

- Record the Vercel inspection in repository docs (names, IDs, root, runtime; no values).
- Diagnose and fix `/api/version` so a configuration failure is a handled 503 like readiness, with a unit test that reproduces the empty 500 first.
- Prepare the smoke script and evidence template for the seven-point proof.
- Record the PR #50 and subagent dispositions.

### Agent-executable once the operator supplies the review database and env

- Deploy this branch (after 005a, 005b, 005c merge) to a preview deployment of `operation-automated-lo-web`; record the deployment URL and SHA.
- Verify `/api/version`, `/api/health/live`, and `/api/health/ready` on that deployment.
- Execute the seven-point proof with a browser and record the evidence outside git.

### Operator only

- Provision the isolated review Postgres and apply migrations with the migration login.
- Set the server-only env variables on the existing project's Preview environment.
- Generate the review sign-in secret and run the seeding script (005b D5).
- Perform the sign-in with the secret. Agents never hold the secret.

## Non-Goals

- A second Vercel project, a custom domain decision (PRD-004b), production cutover, or production traffic.
- Any provider credential on the review deployment. `OALO_PROVIDER_MODE` stays `stub`.
- Test Link, Developer Portal, or Marketplace steps (PRD-004b and 004c).
- Merging PR #50 or any dependency change in this batch.
- Flipping any of the 28 `DEFERRED: LIVE HIGHLEVEL AUTH` rows on the strength of a review sign-in. A review session is not HighLevel evidence.
- Entering secrets anywhere by an agent: not into Vercel, not into a form, not into a shell, not into chat.

## Acceptance criteria

| ID | Criterion | Finding |
|---|---|---|
| 005E-AC-001 | `docs/operations/review-surface.md` (or the smoke evidence pack) records the existing project's name, ID `prj_3vsGKbHLbEmJBkokUpE3eRNXoRz2`, scope `jonathan-ferrell`, root `apps/web`, Node 24.x, the inspection date, and the statement that no second project exists or will be created; no env value appears. | C4 |
| 005E-AC-002 | A unit test in `apps/web/src/app/api/version/route.unit.test.ts` calls `GET` with an environment that fails `parseRuntimeEnvironment` and, before the fix, observes a thrown error; after the fix, `GET` returns 503 with body `{ "status": "unavailable", "code": "CONFIGURATION_INVALID" }` and `Cache-Control: no-store, max-age=0`, and the body contains no environment variable name, value, or error message text. | C4 |
| 005E-AC-003 | With a valid environment, `/api/version` is unchanged: 200 with `environment`, `buildId`, `commit`, `contractVersion`, `phase`, and `releaseVersions`; the existing e2e-preview and unit coverage for the route passes. | C4 |
| 005E-AC-004 | After the operator wires env, one preview deployment of `operation-automated-lo-web` is built from the merged PRD-005 tree; its URL and 40-character SHA are recorded in the evidence pack; `/api/version` on it returns 200 with `commit` equal to that SHA and `environment: "preview"`; `/api/health/ready` returns 200 `ready`; `/api/health/live` reports `productionTrafficEnabled: false`. | C4 |
| 005E-AC-005 | **Proof point 1.** A valid real session (creator persona) reaches the intended location and role: after sign-in, the authenticated shell shows `Review location (not connected)` and the creator role label, and a request to the campaign list returns only that location's campaigns (empty on first sign-in). | C4 |
| 005E-AC-006 | **Proof point 2.** An Open House Boost created in the browser is present after navigating away to `/overview` and after a full page reload of `/marketing/campaigns/[campaignRef]`; the non-PII campaign ref is recorded. | C4 |
| 005E-AC-007 | **Proof point 3.** With the approver persona, approving the exact persisted version and evidence succeeds and the screen shows `Recorded approved`; with the creator persona on the same campaign, the approval control is permission-restricted and a direct `POST /api/campaigns/approve` returns 403 with no state change. | C4 |
| 005E-AC-008 | **Proof point 4.** A new browser context with a fresh approver session, and a fresh creator session, each observe the campaign in `approved` state on `/marketing/campaigns/[campaignRef]` and in the campaign list. | C4 |
| 005E-AC-009 | **Proof point 5.** With the outsider persona (a session on `OALO_REVIEW_OUTSIDER_LOCATION_ID`), the campaign list is empty, the detail URL for the campaign returns 404, and `POST /api/campaigns/approve` for that campaign ref returns 404 with no audit row on the review location. | C4 |
| 005E-AC-010 | **Proof point 6.** `/overview` and `/reports` on the deployment show not-connected states with the `REVIEW / DEMO / NOT CONNECTED` banner; no spend, lead, or CRM figure is presented as a live observation; screenshots are retained outside git and contain no secret. | C4 |
| 005E-AC-011 | **Proof point 7.** No ad publication, spend, lead delivery, billing, or other provider side effect occurs: `OALO_PROVIDER_MODE=stub` and `OALO_PRODUCTION_TRAFFIC=disabled` are confirmed by name on the deployment, `/api/health/live` reports `productionTrafficEnabled: false`, `tests/security/provider-side-effect-default-off.test.ts` passed in CI for the deployed SHA, and the preflight response on the deployment carries `providerPublicationAuthorized: false`. | C4 |
| 005E-AC-012 | The full seven-point sequence, sign-in through sign-out, is recorded once in the evidence log with timestamps, the deployment SHA, HTTP status codes, and campaign ref; the log lives outside git; the evidence pack in git holds only the deployment URL, SHA, CI run id, date, and pass or fail per point. | C4 |
| 005E-AC-013 | PR #50 disposition is recorded in the evidence pack and the raid log: not merged in this batch; state on 2026-09-19 (OPEN, BEHIND, all three CI jobs failing on run `35106034087`, Vercel deploy failed); action after PRD-005 merges is a Dependabot rebase and a fresh CI evaluation before any decision. | C4 |
| 005E-AC-014 | The subagent disposition is recorded in the raid log: the review's "one primary session without workers" recommendation, the absence of any such policy in `AGENTS.md` at `c140f11`, and the owner's explicit Claude Code gauntlet instruction under which this batch ran. | Constraint |
| 005E-AC-015 | Nothing in this sub-PRD flips a `DEFERRED: LIVE HIGHLEVEL AUTH` row, changes G1, G4, or G8, touches `PRODUCTION_EXECUTION_LEDGER.md`, or creates a Vercel project; `RGL-008` and `004D-AC-007` remain satisfied. | Constraint |
| 005E-AC-016 | The evidence pack's smoke checklist rows for `GGL-B01` through `GGL-B03` are updated only after the seven points pass, each with the deployment SHA, and the corresponding ledger rows move only by the orchestrator's close-out entry, not by this sub-PRD's author. | C4 |

## Files expected to change

- `apps/web/src/app/api/version/route.ts:18-22`: wrap in `try`, return the handled 503 (mirror `health/ready/route.ts:157-168`).
- `apps/web/src/app/api/version/route.unit.test.ts` (new).
- `docs/operations/evidence-packs/reviewable-preview-smoke.md`: seven-point proof rows, deployment SHA, project facts, PR #50 disposition (sequenced after 005d's reconciliation of the same file).
- `docs/operations/review-surface.md`: project inspection record and the pointer to the PRD-005 sign-in path.
- `tooling/scripts/smoke/review-seven-point-proof.mjs` (new, optional): drives the HTTP half of the proof against a URL with a session cookie supplied by the operator's browser session export, never with the sign-in secret; the browser half stays manual and screenshotted.
- `EXECUTION_LEDGER.md` raid log: dispositions (orchestrator writes the entries).

## Test plan

- **Unit** (`pnpm test:unit`): 005E-AC-002 and 005E-AC-003.
- **Integration against real Postgres**: none specific; the seven points run against the deployed review database, not the disposable test database.
- **Route-level**: none beyond 005a, 005b, and 005c; this sub-PRD proves those on a URL.
- **Browser** (manual with the operator's session, recorded step by step): 005E-AC-005 through 005E-AC-012, using two browser contexts for point 4 and a third for point 5. Curl or the optional script confirms the HTTP-only assertions (403 and 404 responses, headers, health routes). Playwright is not used against the deployment because the sign-in secret must never be in a script or an environment an agent controls.

## Security notes

- Agents never receive the sign-in secret, the database URL, or any env value. The operator signs in; agents observe the resulting pages and responses and record status codes, headers, and non-PII refs.
- The review database holds seeded, non-customer rows only. Screenshots must not include the browser's cookie store, dev tools, or the sign-in form with a value in it.
- Everything the proof records in git is a name, URL, SHA, run id, date, or pass or fail. `docs/operations/evidence-packs/reviewable-preview-smoke.md` already lists what is prohibited in git; that list applies.
- The `/api/version` fix must not echo the failing variable's name or the parser's message; the readiness route's shape is the model.
- `security-guardian` reviews the deployed SHA's env variable **names** (not values) against `docs/production-environments.md` and the public-env allowlist before `quality-guardian` records the proof.

## Open questions

- [ ] Preview URL versus the production alias of the same project for the review deployment (the OAuth callback in PRD-004b depends on this). Either is "no second project".
- [ ] Whether the optional HTTP proof script is worth writing, or whether curl transcripts pasted into the outside-git log are enough. Recommendation: curl, unless the proof must be repeated more than twice.

## Exact operator ask

Everything below is a name or an instruction. No value is requested through any agent channel.

1. **An isolated review Postgres URL, never production.** A fresh PostgreSQL 17 database on a managed instance, reachable over TLS. Apply `supabase/migrations/*.sql` in order with a migration login that is a member of `migration_owner`. The application login the app will use must be granted `app_runtime` and `support_runtime` `WITH SET true, INHERIT false` and must **not** be a member of `migration_owner` (see `docs/operations/database-runtime-role.md`). Set the application login's URL as `OALO_DATABASE_URL`, server-only, on the Preview environment of `operation-automated-lo-web`. Tell us the database name so the seeding guard can be confirmed; do not tell us the URL.
2. **Server-only env names on the existing project's Preview environment**, per `docs/production-environments.md`: `OALO_ENVIRONMENT=preview`, `OALO_APP_URL`, `OALO_ALLOWED_ORIGINS`, `OALO_PROVIDER_MODE=stub`, `OALO_SYNTHETIC_DATA_ONLY=true`, `OALO_DATA_CLASSIFICATION`, `OALO_STRIPE_MODE`, `OALO_TRIGGER_ENVIRONMENT`, `OALO_SUPABASE_MODE`, `OALO_PRODUCTION_TRAFFIC=disabled`, `OALO_BUILD_COMMIT`, `OALO_BUILD_ID`, `OALO_DATABASE_ID`, `OALO_TASK_PROJECT_ID`, `OALO_SECRET_SCOPE_ID`, `OALO_PRIVATE_STORAGE_ID`, `OALO_PUBLISHED_STORAGE_ID`, `OALO_PROVIDER_APP_ID`, `OALO_RELEASE_MANIFEST_JSON`, `OALO_REVIEW_SURFACE=authorized`, `OALO_DATABASE_URL`, plus the PRD-005 additions `OALO_CSRF_SERVER_SECRET`, `OALO_REVIEW_SIGNIN_SECRET`, `OALO_REVIEW_LOCATION_ID`, and `OALO_REVIEW_OUTSIDER_LOCATION_ID`. Send back the list of names you set, the deployment URL, and the SHA. Never a value. Nothing with a `NEXT_PUBLIC_` prefix beyond the three allowlisted names.
3. **The review sign-in secret.** Generate at least 32 random bytes (`openssl rand -base64 32`, then make it URL-safe), store it in `OALO_REVIEW_SIGNIN_SECRET` on Vercel and in your password manager, and keep it. You will type it into the sign-in page yourself during the proof. No agent will ask for it, and if one does, refuse.
4. **Run the seeding script once** against the review database with the migration login: `node tooling/scripts/database/seed-review-location.mjs --review-database-url <url> --confirm-database <name>` (005b D5). Paste back only the three printed UUIDs for `OALO_REVIEW_LOCATION_ID` and `OALO_REVIEW_OUTSIDER_LOCATION_ID`.
5. **Be present for the proof.** Sign in as `creator`, `approver`, and `outsider` when asked, in separate browser contexts, and allow the screenshots listed in 005E-AC-010 to be taken without any secret on screen.

## Blockers (honest)

| Blocker | Owner | Unblock |
|---|---|---|
| No isolated review database exists | Operator | Ask 1 |
| Required `OALO_*` env not set on the project (readiness is 503 today) | Operator | Ask 2 |
| No sign-in secret or seeded rows | Operator | Asks 3 and 4 |
| 005a, 005b, 005c not yet merged | Engineering | Land them first; the deploy in 005E-AC-004 is from the merged tree |
| `/api/version` empty 500 | Engineering (agent-executable now) | 005E-AC-002 |

## Related

- [PRD-004a: preview deploy and smoke](../../in-work/prd-004-reviewable-go-live/prd-004a-reviewable-go-live-preview-deploy-smoke.md) (the criteria this proof finally exercises on a URL)
- [PRD-004b: portal and Test Link](../../in-work/prd-004-reviewable-go-live/prd-004b-reviewable-go-live-portal-and-test-link.md) (the hostname decision)
- [Reviewable preview smoke evidence pack](../../../../docs/operations/evidence-packs/reviewable-preview-smoke.md)
- [Production environment contract](../../../../docs/production-environments.md)
- [Labeled HighLevel review surface](../../../../docs/operations/review-surface.md)
- [Database runtime role activation](../../../../docs/operations/database-runtime-role.md)
- [Cloud environment setup runbook](../../../../docs/operations/cloud-environment-setup.md)
- [Go-live raid ledger](../../../../EXECUTION_LEDGER.md#gauntlet-raid-go-live-remaining-in-repo-code) (`GGL-B01` through `GGL-B03`)
