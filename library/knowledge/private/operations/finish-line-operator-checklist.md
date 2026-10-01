# Finish-Line Operator Checklist

> Category: Operations | Version: 1.0 | Date: September 30, 2026 | Status: Active

This page lists every remaining item that only a person can close: a decision, an account, a credential, or a live provider. Items are in dependency order. Agent-executable work is in [PRD-008](../../../requirements/in-work/prd-008-finish-line-hardening/prd-008-finish-line-hardening-index.md), which a Gauntlet run can finish without anything on this page.

**Related:** [Project map](../product/project-map.md) · [Agent terrain map](../../../../.cursor/rules/core/the-map.mdc) · [Production-tonight operator runbook](production-tonight-operator-runbook.md) · [External Evidence Sprint](../../../../NEXT_BATCH_LEDGER.md)

## How to use this page

- **Each row points at the operative runbook.** This page sequences the work; it does not repeat the runbook steps.
- **"Return" names what to report back.** Report names, run IDs, commit SHAs, and yes or no observations. Never put a password, token, API key, connection string, or real customer data in git, a pull request, or an agent chat.
- **Do not flip a ledger row yourself.** The owning Guardian updates `EXECUTION_LEDGER.md` or `PRODUCTION_EXECUTION_LEDGER.md` from what you return.
- **Statuses are as of 2026-09-30.** PRD-008e (008E-AC-013) refreshes the Status column.

---

## 0. Before the Gauntlet run (this machine)

| # | Item | Why | Status |
|---|---|---|---|
| 0.1 | Install Node `24.18.0` (pinned in `.nvmrc`) and run `corepack enable`. `pnpm --version` must print `11.15.1`. | On 2026-09-30 this machine had Node `22.19.0`. The README forbids continuing on a mismatched toolchain. | **Done 2026-09-30.** Installed through `fnm` (user scope, winget `Schniz.fnm` 1.39.0), with Corepack enabled for Node 24. `~/.bashrc` and the PowerShell profile select 24.18.0 inside any folder pinned by `.node-version` or `.nvmrc`, and the system Node 22.19.0 everywhere else. Verified in fresh bash and PowerShell shells: Node v24.18.0 and pnpm 11.15.1 in the repository and its subfolders, with pnpm running scripts on v24.18.0. |
| 0.2 | Start Docker Desktop, and confirm `docker version` reports both Client and Server. | `pnpm test:db` needs it. On 2026-09-30 the engine was not running. Without it, the run falls back to CI for database proof. | **Done 2026-09-30.** Client and Server both report 29.4.3. |
| 0.3 | Confirm or change PRD-008 owner decisions OD-1 (fix both Medium findings: default) and OD-2 (accept the generated denylist: default). | The run applies the defaults unless you edit the PRD first. | **Confirmed 2026-09-30:** both defaults. |
| 0.4 | Optional: merge the authoring pull request (branch `claude/finish-line-prep-2026-09-30`, documentation only) with your ruleset bypass. | Its required `Application verification` check fails at `audit:dependencies` for the pre-existing reason PRD-008a fixes. If you merge it, the Gauntlet branches from `main`. If you don't, the Gauntlet continues on that branch and ships documents and fixes in one pull request that ends green. Both paths work; the second needs nothing from you. | **Chosen 2026-09-30:** merge PR #73 with the bypass. The Gauntlet then branches from `main`. |

## 1. Owner decisions

| # | Decision | Recommendation | Unblocks | Status |
|---|---|---|---|---|
| D-1 | **Which database the PRD-005e deployed proof uses.** PRD-005e says "an isolated review Postgres URL, never production", on the Vercel Preview environment. Since then, the hosted app on `operation-automated-lo-web` has been running against the dedicated Supabase project `vonesqpyfsrhasuxfiiz`, and real sign-ups are possible there. | Follow 005e as written: create a separate review database for Preview, so proof runs never touch the project that holds real accounts. The alternative is to amend 005e to accept the hosted project, but then the seeded proof people live beside real users. | Section 2, item 2 | Open |
| D-2 | **Hostname for the Marketplace callback and Custom Page URL** (`GGL-B05`). | Choose the hostname that will be permanent. UNVERIFIED: whether changing it after a Test Link install forces a reinstall. HighLevel's testing documentation, checked 2026-09-30, does not say. | `GGL-B05` to `GGL-B07` | Open |
| D-3 | **Listing values:** support email, publisher display name, and pricing ([PRD-004e](../../../requirements/in-work/prd-004-reviewable-go-live/prd-004e-reviewable-go-live-listing-content-and-demo-script.md)). None was invented. | Provide all three before capture. | `GGL-B09` | Open |
| D-4 | **Self-serve sign-up default.** Security Ruling 1 accepts the sign-up duplicate-email disclosure only while `OALO_SELF_SERVE_SIGNUP` is off by default. | Keep it opt-in per deployment. Turning it on by default requires the emailed path first. | Keeps Ruling 1 valid | Standing |

## 2. Operator steps, in order

| # | Step | Operative runbook | Unblocks | Return | Status |
|---|---|---|---|---|---|
| 1 | **Turn on password-recovery email for the hosted app.** Set `OALO_RESEND_API_KEY` and `OALO_EMAIL_FROM` (server-only) on the deployment that serves real sign-ups, from a verified sending domain. The PRD-007 final completion audit records both as absent. Until they are set, a real user who forgets a password cannot reset it. | [`homeowner-avm-activation.md`](../../../../docs/operations/homeowner-avm-activation.md) ("Configure the existing transactional email adapter"), [`docs/production-environments.md`](../../../../docs/production-environments.md) | Real-user account recovery | Yes or no: a reset email arrived at an inbox you control and the reset completed. The deployment SHA. Never paste the reset link anywhere; it is a live credential until used or expired. | Open |
| 2 | **PRD-005e deployed qualification.** Asks 1 to 5 in [PRD-005e "Exact operator ask"](../../../requirements/in-work/prd-005-authenticated-review-runtime/prd-005e-authenticated-review-runtime-deployed-qualification.md): an isolated review database per D-1, Preview env names only, passwords through `seed-review-location.mjs --set-password`, one seeding run, and you present for the seven-point proof. | [`review-session-seeding.md`](../../../../docs/operations/review-session-seeding.md) | `CRR-006`, `CRR-076` to `CRR-084`, `CRR-088` | The review database name (never its URL), the deployed SHA, and confirmation that you were present. Screenshots stay outside git. | Open |
| 3 | **Reviewable preview smoke** on the existing project, with no second project. | [Production-tonight runbook](production-tonight-operator-runbook.md), [`reviewable-preview-smoke.md`](../../../../docs/operations/evidence-packs/reviewable-preview-smoke.md) | `GGL-B01` to `GGL-B03`, PRD-003 parent exit | The smoke log location (outside git) and pass or fail per step. | Open, after step 2 |
| 4 | **Developer Portal inspection and Test Link install** into a sandbox location. Try the sandbox and Test Link now; prior Marketplace approval is not documented as required. | [Marketplace submission packet](../product/highlevel-marketplace-submission.md), [PRD-004b](../../../requirements/in-work/prd-004-reviewable-go-live/prd-004b-reviewable-go-live-portal-and-test-link.md) | `GGL-B04` to `GGL-B08` | Portal checklist answers, the hostname from D-2, and the sandbox location's name. No tokens. | Open, needs D-2 |
| 5 | **Capture and submit the listing** for the demonstrated scope only. | [Listing copy pack](../product/marketplace-listing-copy-pack.md), [PRD-004c](../../../requirements/in-work/prd-004-reviewable-go-live/prd-004c-reviewable-go-live-marketplace-submission.md) | `GGL-B09`, `004E-AC-009` | The submission reference and date. | Open, needs steps 3 and 4 and D-3 |
| 6a | **Live homeowner valuations (optional).** Set these server-only:<br>- `OALO_RENTCAST_API_KEY`<br>- an explicit `OALO_HOMEOWNER_ALLOWED_LOCATION_IDS`<br>- a deliberate `OALO_HOMEOWNER_MONTHLY_LOOKUP_LIMIT`<br>- `OALO_HOMEOWNER_LIVE_DATA=enabled`<br>Then run one controlled live qualification. | [`homeowner-avm-activation.md`](../../../../docs/operations/homeowner-avm-activation.md) ("Enable the valuation adapter") | PRD-007 items 2 and 8 | Yes or no per qualification check: source shown, address matches, PDF downloaded, and a retry made no new lookup. | Open |
| 6b | **HighLevel report delivery (optional, after 6a).** Add one tenant-matched entry to the server-only `OALO_HOMEOWNER_GHL_CONNECTIONS_JSON`, carrying the HighLevel location ID, the report-link custom field, a reviewed workflow, and the access token. The token goes only into the hosting secret store, never git or chat. Then set `OALO_HOMEOWNER_DELIVERY_ENABLED=enabled` only after reviewing the workflow. | [`homeowner-avm-activation.md`](../../../../docs/operations/homeowner-avm-activation.md) ("Optional monthly updates and HighLevel handoff") | PRD-007 item 9 | Yes or no: contact ownership and DND checks passed, the field read back, and HighLevel accepted the workflow request. Then confirm delivery inside HighLevel. | Open |
| 7 | **HighLevel App Test, Wave 1 G2.** Run the nine-case matrix with `OALO_GHL_LIVE_CAPTURE=authorized` only in your own shell. Do not commit that value. | [`g2-highlevel-app-test.md`](../../../../docs/operations/evidence-packs/g2-highlevel-app-test.md) | `GGL-B10` (the 28 `DEFERRED: LIVE HIGHLEVEL AUTH` rows) | Fixtures sanitized as the evidence pack defines (no token, secret, or personal data), handed to `gohighlevel-guardian`, who flips rows only after `pnpm test:contracts` passes. | Open, needs step 4 |
| 8 | **Before real customer accounts: credential-stuffing control.** Either Vercel WAF rate limiting in front of the app, or an alert on the `auth.sign-in` and `denied` audit rows (security Ruling 4). Also route the missing-forwarded-header error line to an alert (Ruling 5). | [Batch security audit, Rulings 4 and 5](../../../requirements/in-work/prd-006-first-party-sign-in-and-guided-experience/qa/2026-09-19-batch-security-audit.md), [`alert-response.md`](../../../../docs/operations/alert-response.md) | Production-readiness of the sign-in surface | Which control you chose, and where the alert routes. | Open |
| 9 | **Waves 2 to 7** of the External Evidence Sprint:<br>- environment isolation and KMS rotation (`GGL-B11`)<br>- G3 Meta no-spend<br>- G5 isolated synthetic lead (`GGL-B14`)<br>- G6 billing lifecycle<br>- G7 counsel, lender compliance, and AI data review (`GGL-B13`)<br>- timed Launch Ready and AI cost (`GGL-B12`) | [`NEXT_BATCH_LEDGER.md`](../../../../NEXT_BATCH_LEDGER.md), [`evidence-packs/`](../../../../docs/operations/evidence-packs/README.md) | The remaining PRD-001 `BLOCKED` rows and production campaign traffic | Per evidence pack | Parked until a named owner exists |

## 3. What stays true regardless

- G1, G4, and G8 are `ACCEPTED CONSTRAINT`. Do not reopen them without the product owner.
- Production campaign traffic, provider writes, ad spend, and billing stay disabled until their gates pass.
- Nothing on this page may be completed by inventing evidence. A blocked row stays blocked until its real return arrives.

## Changelog

- v1.0 (2026-09-30): First consolidation. Drawn from PRD-005e's exact operator ask, the production-tonight runbook, the PRD-007 final completion audit, the batch security audit Rulings 1, 4, and 5, and the External Evidence Sprint. Decisions D-1 and D-2 are newly made explicit. The two toolchain gaps in section 0 were observed on the authoring machine on 2026-09-30.
