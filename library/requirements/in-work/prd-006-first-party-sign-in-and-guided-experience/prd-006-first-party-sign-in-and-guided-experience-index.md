# PRD-006: First-Party Sign-In and Guided Experience

> **Status:** In Work (moved from backlog at gauntlet raid start, 2026-09-19)
> **Priority:** P0. All four sub-features come from the product owner's own words on 2026-09-19, mid-raid, and the review URL is not usable by a real loan officer until they ship.
> **Effort:** XL (> 3d engineering across four sub-PRDs, plus the operator asks for email sending and initial passwords)
> **Schema changes:** Additive (006a adds three tables and thirteen `security definer` functions, amended 2026-09-19 from D1's original twelve, see 006a's Amendments; widens two check constraints on `platform.first_party_sessions`, and drops one function; 006c adds `platform.user_preferences`)
> **Close-out:** `security-guardian` then `quality-guardian` on the final tree, never reversed, and again after any later change to auth, session, token, rate-limit, or preferences code

---

## Overview

PRD-005 gives the review deployment real request authentication: a first-party session store, its `security definer` functions, the cookie, CSRF, audit rows, revocation, and a seeding script are merged on the raid branch (`EXECUTION_LEDGER.md`, rows `CRR-027` through `CRR-036`, `CRR-043`, `CRR-044`), and Wave 2 is building the credential exchange PRD-005b D4 designed: a persona selector plus an operator-held shared secret. On 2026-09-19 the product owner gave four requirements in his own words that change what that exchange must be and what the product must look and read like around it:

1. "We need the login to be email and password fyi, not single sign on. Make sure to author that." Then: "Also needs to be able to click forgot their password from the login screen in case."
2. "Language on the page needs to be user language, not operator language."
3. "Guided walkthrough is also a must."
4. "Design of the UI must be a 10/10. If it doesn't look good, that's an issue."

And, folded in the same day: "Think of it this way too, account set up needs to be quick and easy and take less than 5 mins. As soon as they log in, guided set up happens."

PRD-006 turns those into four sub-features. 006a replaces the persona-and-secret exchange with a real email and password login, self-serve sign-up behind a server-only switch, forgot-password and reset through an emailed link, a Resend-backed email port with an honest not-configured state, and per-account lockout and rate limits, while keeping every other part of PRD-005b. 006b defines the user-language contract, inventories every string that fails it, adds an automated guard, and requires a writing review. 006c ships a guided setup that starts on the first sign-in and walks a loan officer to a saved first Open House Boost, with server-side progress and a five-minute ceiling measured in a browser. 006d sets the design bar at the top score on every rubric axis for every screen, adds the primitives the new screens need, and requires a scored review, accessibility and visual regression checks, and a final sign-off from real screenshots.

This PRD does not authorize production traffic, HighLevel OAuth or the signed-context exchange, any provider write, a second Vercel project, or any change to the 28 `DEFERRED: LIVE HIGHLEVEL AUTH` rows; G1, G4, and G8 remain `ACCEPTED CONSTRAINT`. Transactional email for the product's own account emails is added, off by default, and is not one of the gated providers.

---

## Goals

- A loan officer signs in with an email and a password on the review deployment, clicks "Forgot your password?" when they need to, and resets it through an emailed link; HighLevel SSO stays out of scope and this login is the fallback beside it later.
- A first-time loan officer creates an account, signs in, is guided through setup, and has a persisted first campaign draft in under five minutes.
- Every word a signed-in user reads, on every page including sign-in, sign-up, forgot, reset, and every guided-setup step, is written for a mortgage loan officer, with the not-connected truths of PRD-004 preserved in that language.
- Guided setup starts automatically on the first sign-in and on every sign-in until finished, is resumable from the server, can be skipped and returned to, and ends with an honest statement of what happens next while nothing is connected.
- Every screen a user sees scores the top mark on every design axis at every frame in both themes, proven by review, axe, screenshots, and a final sign-off; anything less is a defect fixed in the batch.
- Everything PRD-005b built beneath the credential exchange is reused unchanged, and what PRD-006 supersedes is stated precisely so the ledger can reconcile.

## Non-Goals

- HighLevel OAuth, the signed-context exchange, token refresh, App Test evidence, or any flip of the 28 deferred rows. A password session is not HighLevel evidence.
- Multi-factor authentication, passkeys, social login, magic links, account deletion, email change, or team invitations.
- Production traffic, production cutover, a production database, or any change to `authenticatedWorkspaceMode`, `OALO_PRODUCTION_TRAFFIC`, the readiness checks, or the release manifest rules. The existing gates decide production; this PRD does not.
- Any HighLevel, Meta, Stripe, or lead-routing side effect. The guided setup's last step says they are not connected.
- Marketing email. The email port sends only the account emails 006a names.
- Localization, a general product-tour framework, a system-wide redesign, or cross-browser visual baselines.
- Editing `PRODUCTION_EXECUTION_LEDGER.md`, `EXECUTION_LEDGER.md` criterion rows, or any status in an existing PRD. The orchestrator reconciles the ledger using the supersession statement below.

---

## Sub-features

| Sub-PRD | Scope | Owner requirement | Status |
|---|---|---|---|
| [`prd-006a-first-party-sign-in-and-guided-experience-email-password-auth`](./prd-006a-first-party-sign-in-and-guided-experience-email-password-auth.md) | Email and password sign-in, self-serve sign-up behind `OALO_SELF_SERVE_SIGNUP`, forgot-password and reset by emailed link, email verification, sign-out, change-password; credential, token, and rate-limit tables with thirteen definer functions (amended from twelve, see 006a's Amendments); scrypt hashing and a password policy; lockout and rate limits; a Resend email port with an honest not-configured state; seeding extended for initial passwords; removal of the PRD-005b D4 persona path | 1 (and the five-minute rule's first two minutes) | Draft |
| [`prd-006b-first-party-sign-in-and-guided-experience-user-language`](./prd-006b-first-party-sign-in-and-guided-experience-user-language.md) | The user-language contract (audience, tone, forbidden and preferred vocabulary, honesty in user language), a line-level copy inventory, exact strings for the auth pages and emails, error codes as sentences, a source guard and a rendered-output guard, updated pinned tests, corrected public docs, and a writing review | 2 | Draft |
| [`prd-006c-first-party-sign-in-and-guided-experience-guided-setup`](./prd-006c-first-party-sign-in-and-guided-experience-guided-setup.md) | An in-house guided setup on the design system with a `data-tour` anchor registry, seven steps with per-step budgets from account creation to a saved and approved (or handed off) first Open House Boost, server-side progress and a small profile in `platform.user_preferences`, auto-start, resume, skip, reminder, restart, completion, keyboard and screen-reader behaviour, mobile behaviour, and a timed browser run in review mode over local TLS with a 300-second ceiling | 3 (and the five-minute rule) | Draft |
| [`prd-006d-first-party-sign-in-and-guided-experience-design-quality-bar`](./prd-006d-first-party-sign-in-and-guided-experience-design-quality-bar.md) | A ten-axis scored rubric with the bar at the top score on every axis for every screen, frame, theme, and state; the missing primitives (fields, password field, link, sheet and dialog, stepper, badge, live region); repair of font, token, breakpoint, and reduced-motion drift; axe at all four frames; token-derived contrast tests; Playwright screenshot baselines; the orchestrator's sign-off from real screenshots; and the rule that no UI ships without the review | 4 | Draft |

## Dependency order

1. **PRD-005 Wave 2 first.** It lands the PRD-005b D4 routes and the route-level Postgres proof of PRD-005a and PRD-005c. PRD-006a deletes the persona files Wave 2 creates (006a D9) and reuses everything else; starting 006a before Wave 2 merges would fork the same files.
2. **006d's primitives slice next, in parallel with 006a's backend.** The sign-in pages and the guided-setup panels are built on `TextField`, `PasswordField`, `FormField`, `Link`, `Sheet`, `Stepper`, `Badge`, and `LiveRegion` (006d D4), so those land before any new page. 006a's migration, definer functions, hashing, policy, rate limiter, email port, and route handlers need none of them and proceed at the same time.
3. **006a pages and routes.** Once the primitives exist, the auth pages are built with 006b's exact strings (006b D10) and reviewed against 006d's rubric.
4. **006b's guard and contract land early; its copy rewrite lands with each screen.** The forbidden-vocabulary guard and the contract document can merge before any UI change and then catch every later string. The inventory rows are applied as each screen is touched, and the pinned tests are updated in the same commits.
5. **006c after 006a.** Guided setup starts from sign-up and needs the seeded credentials, the profile-driven prefill, and the review-mode browser gate over local TLS, which 006c itself adds.
6. **006d's review and sign-off last, on the final tree**, after every screen, every step, and every string exists. The sign-off repeats after any fix.
7. **Close-out:** `security-guardian` on the final tree, then `quality-guardian`. Never the reverse. Security fixes to auth, session, token, rate-limit, or preferences code invalidate a prior quality result.

---

## Acceptance criteria

Module-level criteria. Sub-PRD criteria use the `006X-AC-NNN` scheme inside each file and name the owner requirement they trace to.

| ID | Criterion | Owner requirement |
|---|---|---|
| FSG-001 | Given the review deployment with the PRD-006 tree, when a loan officer with a seeded or self-created account submits their email and password on `/sign-in`, then they receive a first-party session through `platform.issue_first_party_session` with `issued_by 'password_sign_in'`, the shell shows their real name and workspace name, and every campaign read and mutation resolves through PRD-005a's composition unchanged; and when they enter a wrong password, an unknown email, or a locked account, they receive one identical generic response and no session. | 1 |
| FSG-002 | Given the sign-in page, when the user clicks "Forgot your password?" and submits their email, then they see the same confirmation whatever the outcome; with email configured they receive a single-use link that expires in 30 minutes and lets them set a new password, after which every earlier session is revoked and they are signed in; with email not configured the request still succeeds, an audit row records that no email was sent, and the operator runbook says how to set a password meanwhile. | 1 |
| FSG-003 | Given `OALO_SELF_SERVE_SIGNUP=enabled` on the review deployment, when a first-time loan officer creates an account and completes the guided setup, then a persisted first Open House Boost draft exists in their own workspace in under 300 seconds of simulated user time in the timed browser run, with per-step times within their budgets; and with the switch unset, sign-up is absent. | 1, 3 |
| FSG-004 | Given any page a signed-in user can reach, plus sign-in, sign-up, forgot, reset, verify, and choose, when its rendered text and inspected attributes are scanned, then no term from 006b's forbidden vocabulary and no internal identifier appears, the not-connected states read in 006b's language and remain true, and `technical-writing-craft-guardian`'s review is recorded with no blocking finding. | 2 |
| FSG-005 | Given a first sign-in, when `/overview` renders, then the guided setup opens without a click; given a skipped setup, a "Finish setup" reminder reopens it at the same step; given a closed tab and a fresh sign-in, it resumes from the server; given "Show me around again", it restarts; given "Done", it never auto-starts again; each proven in the review-mode browser run. | 3 |
| FSG-006 | Given every screen in 006d D3 at 1440, 1180, 768, and 390 in Light and Dark with its named states, when `ux-ui-guardian` scores it, axe runs, the contrast test runs, and the screenshot suite compares it, then every axis is at the top score, axe reports zero violations, contrast passes, and the baselines match; and the orchestrator's sign-off table in `docs/operations/evidence-packs/design-quality-signoff.md` records pass on every axis for the final tree. | 4 |
| FSG-007 | Given this PRD completes, then no HighLevel, Meta, Stripe, or lead-routing side effect is newly enabled by default (`tests/security/provider-side-effect-default-off.test.ts` passes unchanged), the email port is composed only when both email variables are set and never in synthetic mode, none of the 28 `DEFERRED: LIVE HIGHLEVEL AUTH` criterion rows flips, G1, G4, and G8 remain `ACCEPTED CONSTRAINT`, no second Vercel project exists, `authenticatedWorkspaceMode` is unchanged, and `PRODUCTION_EXECUTION_LEDGER.md` criterion rows are byte-identical to `c140f11`. (a raw string count of `DEFERRED: LIVE HIGHLEVEL AUTH` in `PRODUCTION_EXECUTION_LEDGER.md` returns 29: the 28 criterion rows this criterion means, plus one narrative changelog line, `2026-09-16`, that also contains the phrase while summarizing the count; "28" refers to criterion rows only, amended 2026-09-21, see Amendments) | Constraint |
| FSG-008 | Given the PRD's code changes, then `security-guardian` runs before `quality-guardian` on the final tree, both pass with no unresolved Critical, High, or Medium finding, and the design sign-off is repeated after any fix either review causes. | Constraint |

### Requirement traceability

| Owner requirement | Owning sub-PRDs | Module criteria |
|---|---|---|
| 1. Email and password login with forgot-password from the login screen; quick self-serve account creation | 006a | FSG-001, FSG-002, FSG-003 |
| 2. User language, not operator language | 006b (consumed by 006a, 006c, 006d) | FSG-004 |
| 3. Guided setup on first sign-in; whole setup under five minutes | 006c (starts in 006a) | FSG-003, FSG-005 |
| 4. Design is a 10 of 10, anything less is a defect | 006d (applies to every screen in 006a and 006c) | FSG-006 |

---

## What this PRD supersedes in PRD-005b

For the ledger's reconciliation. Nothing here changes a status in PRD-005; the orchestrator moves the rows.

**Superseded design decision.** PRD-005b D4, "Sign-in path": the `GET /review/sign-in` persona form, `POST /api/review/session` with a `persona` enum and a shared secret compared in constant time, the persona-to-location mapping through `OALO_REVIEW_LOCATION_ID` and `OALO_REVIEW_OUTSIDER_LOCATION_ID`, and `platform.resolve_review_persona`. Replaced by PRD-006a D1 through D5 and D9: an email and password exchange through `platform.lookup_password_credential`, scrypt verification in server code, `platform.list_sign_in_bindings`, and the same `platform.issue_first_party_session` call with `issued_by 'password_sign_in'`.

**Superseded environment variables.** PRD-005b D6's `OALO_REVIEW_SIGNIN_SECRET` (removed), `OALO_REVIEW_LOCATION_ID` and `OALO_REVIEW_OUTSIDER_LOCATION_ID` (removed from the application; the seeding script still prints the seeded ids for PRD-005e's proof). Added: `OALO_RESEND_API_KEY`, `OALO_EMAIL_FROM`, `OALO_SELF_SERVE_SIGNUP` (006a D7).

**Superseded criteria and ledger rows.**

| PRD-005b criterion | Ledger row | Disposition under PRD-006 |
|---|---|---|
| `005B-AC-010` (`resolve_review_persona` behaviour) | CRR-036 (DONE) | Superseded: the function is dropped by 006a D1; its pgTAP cases are removed. Its DONE state was true when recorded and stays recorded; the ledger notes the drop. |
| `005B-AC-011` (`GET /review/sign-in`, `POST /api/review/session` 403/404/503 matrix) | CRR-037 (OPEN) | Superseded by `006A-AC-020` and `006A-AC-026` (the `/sign-in` and `/sign-up` pages, the mode gates, and the 404 behaviour outside review mode). |
| `005B-AC-012` (correct secret and persona issue a session; five refusals identical) | CRR-038 (OPEN) | Superseded by `006A-AC-012` and `006A-AC-013` (correct credentials issue a session; seven refusals identical). |
| `005B-AC-013` (constant-time secret comparison) | CRR-039 (OPEN) | Carried forward to the password comparison in `006A-AC-010` (length check then `timingSafeEqual` on derived keys). |
| `005B-AC-014` (browser cannot select location, user, or role; `.strict()` single-field schema) | CRR-040 (OPEN) | Carried forward in `006A-AC-016` and `006A-AC-020` (the choose step offers only server-listed bindings; identity fields rejected with 400). |
| `005B-AC-015` (sign-out with full mutation gate) | CRR-041 (OPEN) | Carried forward unchanged in `006A-AC-022`; the path moves from `/api/review/session/sign-out` to `/api/auth/sign-out`. |
| `005B-AC-016` (one audit row per issuance and revocation; no secret in any row, log, or response) | CRR-042 (OPEN) | Carried forward and widened in `006A-AC-031`. |
| `005B-AC-019` (the page states this is not HighLevel SSO and satisfies no deferred row) | CRR-045 (OPEN) | Carried forward in user language: the sign-in footer line in 006b D10 ("This sign-in is separate from HighLevel. Connecting HighLevel comes later.") and `006A-AC-032`. |
| `005B-AC-020` (routes unreachable in synthetic and production modes) | CRR-046 (OPEN) | Carried forward in `006A-AC-026`, with the production behaviour restated: the routes return 404 wherever `authenticatedWorkspaceMode` refuses to serve, which is production without the review flag. |

**Kept unchanged from PRD-005b** (rows stay as they are): `005B-AC-001` through `009` (the table, its functions other than the persona one, triggers, grants), `005B-AC-017` and `018` (seeding and its runbook, which 006a D8 extends rather than replaces), and every PRD-005a and PRD-005c row. `005A-AC-011` (CRR-019, display names in the shell) is closed by `006A-AC-028` if PRD-005 Wave 2 has not closed it first.

**Other documents this PRD changes that PRD-005 wrote.** `docs/operations/review-session-seeding.md` (rewritten by 006a D8), `docs/operations/review-surface.md:52-60` (the sign-in path pointer) and `:72-79` (the banner strings, reworded by 006b D4 with meaning unchanged, which is how PRD-005e proof point 6 is read), and `docs/production-environments.md:43-55,94-110` (the variable list).

---

## Data model changes

Additive, owned by 006a: `platform.user_credentials`, `platform.credential_tokens`, `platform.auth_rate_limits`, all with RLS forced and no runtime grants, and thirteen `security definer` functions (amended 2026-09-19 from twelve, see 006a's Amendments); two check constraints on `platform.first_party_sessions` widened (`issued_by` gains `password_sign_in` and `password_reset`; `revocation_reason` gains `password_changed`); `platform.resolve_review_persona` dropped. Additive, owned by 006c: `platform.user_preferences` with the standard tenant policies and `select, insert, update` for `app_runtime`. No existing column, index, or policy changes shape.

## API changes

- New: `POST /api/auth/sign-in`, `sign-up`, `forgot-password`, `reset-password`, `verify-email`, `sign-out`, `change-password`, `choose`; pages `/sign-in`, `/sign-in/choose`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify-email`, `/settings/account`. All 404 in synthetic mode and wherever the workspace mode refuses to serve.
- New: `POST /api/setup/progress`, `POST /api/setup/profile` (session and CSRF required).
- Removed: `GET /review/sign-in`, `POST /api/review/session`, `POST /api/review/session/sign-out` (PRD-005b D4, built in Wave 2).
- Unchanged: `POST /api/campaigns/preflight`, `POST /api/campaigns/approve`, `/api/health/*`, `/api/version`.

---

## Open questions

- [ ] 006a: Argon2 availability on the pinned Node 24.18.0 (the author could only run 22.19.0); the scrypt cost on the deployed runtime; the client-address header on Vercel; `after()` on Next 16.3.3. Each is marked UNVERIFIED in 006a.
- [ ] 006a: whether `security-guardian` ratifies the deliberate "that email already has an account" disclosure on sign-up (sign-in and forgot-password stay generic).
- [ ] 006a and 006b: terms of service and privacy policy links on sign-up; no such pages exist in the repository.
- [ ] 006b: whether the onboarding checklist phase names, fixed in the design brief and pinned by the browser suite, change to user language in this batch.
- [ ] 006c: the `database` CI job's timeout once the review-mode browser run is added.
- [ ] 006d: self-hosted Geist versus the system font stack, pending the licence check and `typography-font-guardian`'s ruling.
- [ ] PRD-005e: whether the review deployment is the production alias or a preview URL of the same project (unchanged from PRD-005's open question; the reset link's `OALO_APP_URL` depends on it).

---

## Related

- [PRD-005: Authenticated Review Runtime](../../in-work/prd-005-authenticated-review-runtime/prd-005-authenticated-review-runtime-index.md) (the store, composition, and proof this PRD builds on)
- [PRD-005b: review session issuance and store](../../in-work/prd-005-authenticated-review-runtime/prd-005b-authenticated-review-runtime-review-session-issuance.md) (D4 there is superseded; everything else is reused)
- [PRD-005a: runtime authentication composition](../../in-work/prd-005-authenticated-review-runtime/prd-005a-authenticated-review-runtime-runtime-auth-composition.md)
- [PRD-005e: deployed qualification](../../in-work/prd-005-authenticated-review-runtime/prd-005e-authenticated-review-runtime-deployed-qualification.md) (the seven-point proof, now performed by real users with real passwords)
- [PRD-004: Reviewable Go-Live](../../in-work/prd-004-reviewable-go-live/prd-004-reviewable-go-live-index.md) (`RGL-002`, the honesty rule 006b rewords and keeps)
- [PRD-003: Authenticated Product Activation](../../in-work/prd-003-authenticated-product-activation/prd-003-authenticated-product-activation-index.md) (`first_party` as an authentication mode, the campaign domain the guided setup drives)
- [Go-live raid ledger, PRD-005 section](../../../../EXECUTION_LEDGER.md#gauntlet-raid-completion-review-c1-through-c4-prd-005)
- [Production environment contract](../../../../docs/production-environments.md)
- [Review session seeding runbook](../../../../docs/operations/review-session-seeding.md)
- [Labeled HighLevel review surface](../../../../docs/operations/review-surface.md)
- [UX/UI source of truth](../../../knowledge/private/ux-ui/README.md)
- [What Automated LO does today](../../../knowledge/public/overview/what-is-automated-lo.md) and the [Open House Boost FAQ](../../../knowledge/public/faqs/open-house-boost-faq.md)
- [Agent terrain map](../../../../.cursor/rules/core/the-map.mdc)

## Amendments

Dated amendments recording where a shipped decision differs from this PRD set's drafted text live in the sub-PRDs the decision touches, not here: 006a carries the hashing algorithm, the definer function list (twice amended: 2026-09-19 to thirteen, 2026-09-21 to fifteen), the reset landing address (closed 2026-09-21, superseding the 2026-09-19 "known gap" entry), the change-password refusal response, and the reset-completed audit action; 006b carries the persisted-campaign heading and, as of 2026-09-21, the source guard's `packages/application/src` widening, the campaign next-action copy's move into `apps/web/src/copy/user-language.ts`, and the support reference's four surfaces; 006c carries the review server's environment name; 006d carries where the screenshot comparison runs and the focus-ring measurement's precision. This index's own FSG-007 row carries a 2026-09-21 clarifying note on the `DEFERRED: LIVE HIGHLEVEL AUTH` count. See each sub-PRD's own "## Amendments" section for the full dated entries.
