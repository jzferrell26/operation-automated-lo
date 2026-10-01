# QA report: PRD-008 Finish-Line Hardening, close-out (FLH-004)

**Plan document:** `library/requirements/in-work/prd-008-finish-line-hardening/prd-008-finish-line-hardening-index.md`, with sub-PRDs 008a to 008e and their Amendments
**Audit date:** 2026-10-01
**Base:** `36b58f1` (`main` before the run, PR #73)
**Head:** `99502dd` on `gauntlet/closeout-quality` (worktree `oalo-g-closeout-qa`). Its code equals `5585ee9`; the only difference is `EXECUTION_LEDGER.md` (`git diff --stat 5585ee9 99502dd`: one file).
**Auditor:** `quality-guardian`, armed with `quality-weapon` (model routing: opus, the final quality gate)
**Mode:** read-only. No test suite, build, or browser run. One read-only `pnpm audit --audit-level=low` was run (network only). This report is the only file written.

## Ordering

`security-guardian` ran first and passed, in the right order: the FLH-003 audit on `6f24a14`, a re-audit on `31c9064` after the M-1 fix, and a final look on `311fd45` after the L-15 fix (`qa/2026-10-01-closeout-security-audit.md:447-722`). Every code commit after `311fd45` is a merge or the ledger (`git diff 311fd45 5585ee9 -- apps packages supabase tests tooling` covers only `a3987ed`, test fixtures, which the final look read). The order is correct and this audit proceeds.

## Summary

**Verdict: FIX FIRST, on one Medium records finding. No Critical or High finding, and no code defect at Medium or above.** The product, security, language, and verification work is sound and traced: 008a, 008b (including the decision-aware surfaces 008B-AC-009 to 011 and the R6 failed-read path), 008c, and 008d all PASS on `99502dd`, and both redraws are independently verified. The one Medium is in the records PRD itself: 008E-AC-004 is not complete, yet its ledger row FLR-060 reads VERIFIED. Five CRR rows whose named evidence is already VERIFIED (`CRR-075`, `CRR-094`, `CRR-167`, `CRR-181`, `CRR-184`) are still DONE, and the PRD-005 and PRD-006 status lines describe them as waiting. The fix is a ledger and status-line write-back; it changes no code and no rendered output, so it needs no security re-run and no redraw.

FLH-002 is PENDING the orchestrator's `pnpm verify` on `5585ee9` and the ship push. Five more criteria close only at ship by the PRD's own design (FLH-001, 008A-AC-003, 008A-AC-007, 008E-AC-001's final refresh, 008E-AC-014). Twenty Low and seven Info items are recorded, none blocking.

## Scorecard

| Category | Status | Notes |
|---|---|---|
| Completeness | Warning | 66 of 74 criteria PASS on `99502dd`. 008E-AC-004 FAILS (M-1). FLH-001, FLH-002, 008A-AC-003, 008A-AC-007, 008E-AC-001, 008E-AC-014 are PENDING-SHIP; FLH-004 is this report. |
| Correctness | Pass | No regression found in the product diff (81 non-test source files, 5,319 added lines). The decision-aware surfaces, the approval card, the walkthrough standings, and the R6 failed-read path behave as the criteria state. |
| Alignment | Pass with Lows | Records agree with code and with each other on the three PRD-008 migrations, the hosted state, and PR #74. Lows: one architecture doc, one ledger evidence cell, one checklist step, and stale comments. |
| Gaps | Warning | The CRR write-back for rows whose evidence now exists (M-1). PRD-007's independent quality report still records W-2 as open (L-12). |
| Detrimental | Pass | No secret, no new provider default, no protected-row status change (FLH-006), no dash in any added line (FLH-007). One undefined spacing token is pre-existing (L-1). |

## Findings at Medium or above (fix before ship)

### Critical

None.

### High

None.

### Medium

- [ ] **M-1. 008E-AC-004 is not complete, and FLR-060 claims VERIFIED.** Medium.
  - **Where:** `EXECUTION_LEDGER.md:820` (FLR-060, Status VERIFIED); the held rows at `EXECUTION_LEDGER.md:486` (`CRR-075`, DONE), `:593` (`CRR-094`, DONE), `:595` (`CRR-096`, OPEN), `:629` (`CRR-130`, DONE), `:666` (`CRR-167`, DONE), `:680` (`CRR-181`, DONE), `:683` (`CRR-184`, DONE). Status lines that describe them as waiting: `prd-005-authenticated-review-runtime-index.md:3`, `prd-005e-...-deployed-qualification.md:4`, `prd-006-...-index.md:3`, `prd-006a-...-email-password-auth.md:4`, `prd-006c-...-guided-setup.md:4`, `prd-006d-...-design-quality-bar.md:4`.
  - **What is wrong:** 008E-AC-004 says `CRR-094`, `167`, `181`, and `184` become VERIFIED on 008d's cited evidence, and `CRR-075` on 008A-AC-019's evidence. That evidence is VERIFIED in this ledger: FLR-025 (008A-AC-019) at `:785`, and FLR-050 to FLR-056 (008D-AC-005 to 011) at `:810-816`. The five rows were never written back. FLR-060's own evidence cell says they are "Held", but its Status cell says VERIFIED. `CRR-096` (FSG-008) and `CRR-130` (006A-AC-034) were correctly held for FLH-003, which now passes conditionally (`closeout-security-audit.md:643`, `:716`).
  - **Why it matters:** PRD-008's stated goal is that every ledger cell and status line matches what merged. A VERIFIED row over an incomplete criterion is the exact defect this PRD exists to remove, and FLH-004 asks for every criterion passing.
  - **Fix:**
    1. Write `CRR-075` to VERIFIED citing FLR-025 (008A-AC-019; `apps/web/src/app/api/version/route.ts:11-19`). Write `CRR-094`, `CRR-167`, `CRR-181`, and `CRR-184` to VERIFIED citing FLR-050 to FLR-056 and `docs/operations/evidence-packs/design-quality-signoff.md` (signed against `cad9bf6`).
    2. Write `CRR-130` and `CRR-096` to VERIFIED citing the FLH-003 re-audit and final look (`closeout-security-audit.md:643`, `:716`), this report, and the green `pnpm verify` on `5585ee9`, once that result is in. FSG-008's design re-sign condition is met: no fix either review caused changed a baselined picture after `cad9bf6` (see 008D-AC-011 below).
    3. Set FLR-060 to DONE until steps 1 and 2 land, then VERIFIED. Refresh the six status lines above in the same commit (this is also 008E-AC-001's owed refresh, FLR-057 at `:817`).
    4. Have a pass other than the orchestrator re-check the seven rows and six status lines, as 008E-AC-004's test plan asks of the write-back. Records only: no security re-run and no redraw.

## Low findings

- [ ] **L-1. `--space-7` is undefined, so two blocks lose their vertical padding (known item a).** Low, pre-existing since `58d77fd`.
  - **Where:** `apps/web/src/app/(public)/email-preview/email-preview.module.css:12`, `apps/web/src/features/auth/components/auth-form.module.css:10` (`padding-block: var(--space-7);`). `packages/ui/src/tokens.css:94-100` defines `--space-1` to `--space-6` and `--space-8`, and no `--space-7`.
  - **What is wrong:** `var()` of an undefined property with no fallback makes the declaration invalid at computed-value time, so `padding-block` computes to 0.
  - **Why Low:** the pages centre the panel vertically, so at the four baseline frames nothing touches the edge (`tests/visual/screens/review/sign-in--default--390--light.png`), and `ux-ui-guardian` scored every affected picture 3 twice. At a short viewport the panel can meet the frame. The run fixed the same class of defect in the same file (R-17, `auth-form.module.css:132-134`) and added a guard, `apps/web/src/theme/type-tokens-defined.unit.test.ts:47`, that matches only `--weight-`, `--text-`, and `--font-` and reads no stylesheet under `apps/web/src/app/` except `globals.css`, so it cannot catch this one.
  - **Fix (after ship):** use a defined step (`--space-8` is the nearest) and widen the guard to every `var(--...)` and to `apps/web/src/app/**/*.module.css`. The value change moves the sign-in, sign-up, verify, reset, and email-preview pictures, so it needs a redraw under 006D-AC-013; do it in the next UI batch, not this ship.
- [ ] **L-2. R4: "Fix what the checks found, then save it again." reaches approvers who cannot edit (known item b).** Low. `apps/web/src/features/campaigns/components/campaign-approval-controls.tsx:238`; `apps/web/src/copy/guided-setup-messages.ts:149`. The writing review's own replacement: "The campaign creator fixes what the checks found and saves it again." (`qa/2026-10-01-008c-writing-review.md:184`). Non-blocking because the card's "Ask" row names the creator.
- [ ] **L-3. R5: step 7 promises an approver who cannot create that they will launch campaigns (known item b).** Low. `apps/web/src/copy/guided-setup-messages.ts:196-197` (`noneTail`). Fix: drop the second sentence, as `tailWithoutLaunch` (`:210`) already does for a sent-back campaign.
- [ ] **L-4. R7: step 7's failed-read lead is an error with no next action (known item b).** Low. `apps/web/src/copy/guided-setup-messages.ts:203` joined at `apps/web/src/features/guided-setup/steps/step-model.ts` (`whatHappensNextBody`, case `campaigns_unread`). A person resumed straight onto step 7 from the "Finish setup" chip meets "We couldn't load the campaigns waiting for your approval just now." with nothing to do, against user-language contract section 2, rule 7. Fix as proposed in `008c-writing-review.md:254`: add "Open your campaigns to see if one is waiting." and end on the shorter tail, which also closes L-3.
- [ ] **L-5. The design sign-off names `cad9bf6`, not the final commit.** Low. `docs/operations/evidence-packs/design-quality-signoff.md:9-11`. 008D-AC-010 and 011 ask for a re-sign "against the final tree's commit". I checked that the substance holds: no file under `tests/visual/` changed after `cad9bf6`, and every later rendered-code change is outside every baselined state (see 008D-AC-011 below). Fix at ship: one line naming the ship commit and stating that no baselined screen changed after `cad9bf6`.
- [ ] **L-6. Rows FLR-071 and FLR-072 have ten cells under an eight-column header.** Low. `EXECUTION_LEDGER.md:831-832`. Each carries an empty Requirement cell and repeats the criterion ID, so a Markdown renderer shows "W1 fix lane" as the Status, "sonnet" as the Evidence, and drops the real VERIFIED status and evidence. Fix: remove the empty fourth cell and the repeated ID, as rows FLR-073 and FLR-074 (`:833-834`) already are.
- [ ] **L-7. Checklist step 6a omits the cron secret that HOR-008's ask includes.** Low. `library/knowledge/private/operations/finish-line-operator-checklist.md:49` lists the RentCast key, the allowed locations, the lookup limit, and the live switch, and links the runbook section "Enable the valuation adapter". `EXECUTION_LEDGER.md:925` (HOR-008) asks for step 6a "plus CRON_SECRET (or OALO_HOMEOWNER_CRON_SECRET)". The secret is documented only in the runbook's next section (`docs/operations/homeowner-avm-activation.md:54-56`). An operator following the checklist alone cannot unblock PRD-007 item 8. Fix: add `CRON_SECRET` to step 6a with that section's link, so the ledger ask and the checklist agree.
- [ ] **L-8. The architecture contract still lists "schema compatibility" for `/api/version`.** Low. `library/knowledge/private/architecture/system-runtime-contracts.md:69`. Since 008A-AC-019 the route returns only `environment`, `buildId`, and `commit` (`apps/web/src/app/api/version/route.ts:11-19`). The L2 lane routed this to 008e (`EXECUTION_LEDGER.md:867`) and it was not done. 008A-AC-019 names "documented steps", so this is doc drift, not a criterion failure. Fix: reword the row to the three fields.
- [ ] **L-9. CRR-058's evidence describes the old ordering and was written back as VERIFIED.** Low. `EXECUTION_LEDGER.md:469` still says a creator gets "409 on an approved one, pinned separately". Since 008A-AC-020 the creator gets 403 with one denied audit row, and the test was re-pinned (`apps/web/src/server/campaign-approval-handler.correlation.postgres.test.ts`, "returns 403, not 409, when a creator attempts an already approved campaign"). The criterion text still holds. Routed to 008e at `EXECUTION_LEDGER.md:867` and not done. Fix: append a dated note citing 008A-AC-020.
- [ ] **L-10. Eight comments still say "the pinned Next 16.3.3", and the raid log calls them fixed.** Low. `apps/web/src/app/api/auth/{change-password,choose,forgot-password,resend-verification,reset-password,sign-up,verify-email}/route.ts:14` and `apps/web/src/server/password-authentication-handler.ts:281`; `apps/web/package.json:21` pins `16.3.6`. `EXECUTION_LEDGER.md:860` says "fixed at integration". The claim about `after` is still true on 16.3.6. Fix: say "16.3.6" or drop the version, and correct the raid-log line.
- [ ] **L-11. The project map's Database row does not mention the three pending migrations.** Low. `library/knowledge/private/product/project-map.md:42` says "Ten tracked migrations applied", which was true on 2026-09-24. README (`README.md:30`), the terrain map (`.cursor/rules/core/the-map.mdc:17`), `NEXT_BATCH_LEDGER.md:12`, and checklist step 0 (`finish-line-operator-checklist.md:43`) all say the three PRD-008 migrations are not recorded as applied. Fix: add the same UNVERIFIED sentence and a step 0 link at the ship refresh.
- [ ] **L-12. PRD-007's independent quality report still says W-2 is open and database proof is pending.** Low. `library/requirements/in-work/prd-007-homeowner-reports/reports/2026-10-01-independent-quality-review.md:25`, `:70`, `:203-207`. W-2 was fixed by `2de43cc` (migration `20261001090000_homeowner_review_rerequest.sql`, pgTAP), and the heavy suites ran green afterwards (CI `36848467698`). HOR-001, 005, 007, and 010 (`EXECUTION_LEDGER.md:918-927`) cite this report as their VERIFIED source. Fix: a dated addendum recording the W-2 fix and the heavy runs that closed "pending heavy".
- [ ] **L-13. Sub-PRD status lines and the index's sub-feature table still read "Draft".** Low. `prd-008a-...md:4` to `prd-008e-...md:4`; `prd-008-finish-line-hardening-index.md:68-72`. Fix with the exit lifecycle move (008E-AC-014).
- [ ] **L-14. Approval records carry constant profile references (routed here from the 004E re-audit).** Low, pre-existing, outside PRD-008's criteria. `apps/web/src/server/open-house-draft.ts:91-95` records `brandprofile_local001`, `complianceprofile_local001`, `partnerprofile_local001`, and `routingprofile_local001` on every version. No screen renders them, so no user-visible statement is false, but staleness checks keyed on `inputVersions` (`packages/application/src/campaign-foundation.ts:543-569`) can never see a profile change, and the listing copy's "built from your settings" claim is untrue for the same reason (004E re-audit F-02). Fix: a future PRD, owned by `library-guardian`, alongside photo intake.
- [ ] **L-15. Sentences name a step that has no control: "a new version", "save it again".** Low, pre-existing product gap. `apps/web/src/copy/user-language.ts` (`CAMPAIGN_SENT_BACK_NEEDS_NEW_VERSION`), `guided-setup-messages.ts:100-101`, `apps/web/src/copy/reporting-messages.ts` (`ad_disapproved`). No route saves a new version of an existing campaign (`008c-writing-review.md:190`). The statements are true; the action is unavailable in the product. Owner decision: an edit flow, or wording that names who can make the new version.
- [ ] **L-16. `ReportingException.explanation` now carries the snake_case code (S5).** Low, latent. `packages/application/src/reporting.ts:162`. No screen reads it today. Fix when the first screen renders an exception: read `REPORTING_EXCEPTION_EXPLANATIONS[code]` and assert no snake_case token renders.
- [ ] **L-17. Onboarding evidence shows a raw ISO timestamp (known item f).** Low, pre-existing. `packages/ui/src/components/onboarding-checklist.tsx:130-131` renders `evidence.verifiedAt` (for example `2026-07-21T14:30:00.000Z`) as text; the run wrapped it in `<time>` without formatting it. The onboarding page reads fixture data (`apps/web/src/app/(authenticated)/onboarding/page.tsx:8`), so this mainly reaches synthetic mode. Fix: format it as the reports screen does.
- [ ] **L-18. The walkthrough panel puts the progress track before the step content, so step 2's fields start below the panel's fold (known item f).** Low, pre-existing (PRD-006c). `qa/2026-10-01-008d-baseline-review.md:252-255`.
- [ ] **L-19. The handler comment states more than L-2 of the security audit established.** Low. `apps/web/src/server/password-authentication-handler.ts:389-395` says Vercel "sets and overwrites all three, so a caller cannot choose the value". The close-out security audit (L-2) found Vercel's page implies this for `x-vercel-forwarded-for` but does not state it, and checklist step 8 carries the deployed check. Fix: after step 8's check, either cite its result or soften the sentence. Not now: an auth-file edit after the final security look would reopen the ordering rule for no behaviour change.
- [ ] **L-20. Security Lows L-1 to L-15 of the close-out audit, and the carried PRD-007 Lows (known item g).** Low each, as carried, none raised by this audit. Each has a disposition and an owner in `closeout-security-audit.md:179-237`, `:364-390`, `:578-596`, `:699-710`; the operator-owned ones (L-2 deployed header check, L-10 Rulings 4 and 5, L-14 deploy order, L-15's alert) are in checklist steps 0 and 8 (`finish-line-operator-checklist.md:43`, `:52`). L-12 (stale CVE intelligence) belongs to the Neeson repository, a PRD-008 non-goal.

## Info

- **I-1. `governed-controls.test.ts` times out at 5 s under heavy parallel load (known item c).** Pre-existing; passes alone and in CI. `tooling/tests/unit/design-quality/governed-controls.test.ts`. Test-infrastructure only; a longer per-test timeout would remove the noise.
- **I-2. One synthetic browser test (campaign-detail at 768, light) failed once locally under load (known item d).** A stylesheet had not arrived within 10 s while other suites ran; the retry passed 149 of 149 (`EXECUTION_LEDGER.md:909`). Not a product defect. CI is the authority (`36848467698` green).
- **I-3. The synthetic public open-house page's 30rem measure is not in the design brief (known item e).** `apps/web/src/app/public/synthetic-open-house-v3/synthetic-open-house.module.css:44`. The module states its reasoning (`:12-20`), uses `rem` like every other product measure (26rem, 38rem, 44rem, 72rem), and the page is a synthetic stand-in served only in local and preview builds, with no rubric row and no baseline. Recommendation for `design-system-guardian`: add a reading-measure rule to the brief so the next public page does not choose one.
- **I-4. Observations in the baseline review (known item f).** Recorded and not deltas: the decided campaign page says "won't run as an ad yet" in four places; at 1440 the step 5 panel covers part of "Your next steps"; the rail's identity card meets the fold at 900px; the public page's padding (since fixed by `3d6588b`). `qa/2026-10-01-008d-baseline-review.md:252-255`, `:751-762`. None changes a criterion.
- **I-5. FLR-005's evidence says `tests/security/` is unchanged.** `EXECUTION_LEDGER.md:765`. True at `6f24a14`; since `d01cb40`, `tests/security/auth-email-default-off.test.ts` gained one stub (`recordSignInWithoutAccount: () => unreachable(...)`), which keeps the test's port complete and is neutral. `provider-side-effect-default-off.test.ts` is unchanged by the run. FLH-005 still passes.
- **I-6. `waitingRef.current` is written during render.** `apps/web/src/features/guided-setup/guided-setup-provider.tsx:485`. React advises against writing refs during render; a discarded concurrent render could leave a stale value for `goToStep`. No observed effect.
- **I-7. This report needs a row in `qa/README.md`.** This audit writes one file only, so the orchestrator adds the index row.

## Known items (a) to (g), rated

| Item | Rating | Where |
|---|---|---|
| (a) `--space-7` undefined | Low (L-1) | `email-preview.module.css:12`, `auth-form.module.css:10` |
| (b) R4, R5, R7 | Low each (L-2, L-3, L-4) | `campaign-approval-controls.tsx:238`, `guided-setup-messages.ts:149`, `:196-197`, `:203` |
| (c) `governed-controls.test.ts` 5 s timeout | Info (I-1) | test infrastructure |
| (d) one synthetic browser flake under load | Info (I-2) | local load, CI green |
| (e) 30rem measure | Info (I-3) | `synthetic-open-house.module.css:44` |
| (f) baseline-review observations | Low (L-17, L-18) and Info (I-4) | `onboarding-checklist.tsx:130-131`; walkthrough panel |
| (g) security L-1 to L-15 as carried | Low each (L-20) | `closeout-security-audit.md` |

## Records truthfulness (brief item 3)

Checked against code and against each other on `99502dd`:

- **Three migrations.** `supabase/migrations/` holds 13 migrations, ten at `36b58f1` plus `20260930180000`, `20261001090000`, and `20261001120000`. Checklist v1.4 step 0 lists all three in timestamp order (`finish-line-operator-checklist.md:43`, header `:3`, changelog `:64`). README (`:30`), the terrain map (`:17`), and `NEXT_BATCH_LEDGER.md:12` all say "three" and say what fails without the first. The checklist's dependency statements match the code: the change-password route consumes scope `change_password_user` (`password-authentication-handler.ts:537`, consumed at `:1658` in `handleChangePassword`); `record_shared_event` keeps its signature (`20261001090000_homeowner_review_rerequest.sql`); `recordSignInWithoutAccount` swallows failure behind the same 401 (`password-authentication-handler.ts:763-781`). Only the project map's Database row lags (L-11).
- **PR #74 state.** The maps say draft, open, not merged, 74 criteria. `gh pr view 74`: OPEN, draft, head `a37e238`, MERGEABLE, CLEAN. Agrees. All three need the ship refresh FLR-067 names.
- **README** (008E-AC-010). Phase 0 boundary (`README.md:9-22`) and Where it runs (`:24-33`) state the hosted app, what is and is not activated, and gate statuses unchanged, and both link the operator checklist (`:22`, `:30`). The `081048e` fix is present: `git show 081048e` changes `README.md` by one line, the Where it runs link.
- **PRD-007 amendment.** `prd-007-homeowner-reports-index.md:44-51` settles item 7 ("deduplicated while one is open; after the loan officer marks it reviewed, a new request is recorded"). It matches the migration (the update runs only `where ... review_requested_at is null`) and the runbook (`homeowner-avm-activation.md:70`).
- **Links.** 76 changed Markdown files, 484 relative links, 0 broken.
- **Ledger.** M-1, L-6, L-9, L-10, I-5 above.

## Plan item traceability

Status key: PASS on `99502dd`; FAIL; PENDING-SHIP (closes only at ship, by the PRD's design or the orchestrator's verify). "Verified by" names the pass other than the implementer, as FLH-001 asks; "this audit" means I re-checked it here.

### Module criteria

| ID | Status | Evidence on `99502dd` | Notes |
|---|---|---|---|
| FLH-001 | PENDING-SHIP | See "FLH-001: who verified what" below | Six rows are not yet VERIFIED; three of them are verified by this audit |
| FLH-002 | PENDING-SHIP | CI `36848467698` on `a37e238`: all four required checks success. `gh pr view 74`: MERGEABLE, CLEAN. `origin/main` still `36b58f1` | 40 commits after `a37e238` are unpushed. Needs the orchestrator's `pnpm verify` and `test:db` on `5585ee9`, then the four checks on the pushed head and MERGEABLE |
| FLH-003 | PASS (conditional) | `qa/2026-10-01-closeout-security-audit.md:643`, `:716`: zero unresolved Critical, High, or Medium in code or `pnpm audit` | Conditional on the same `pnpm verify` as FLH-002 |
| FLH-004 | FAIL on this pass | This report | Passes when M-1 is fixed and re-checked |
| FLH-005 | PASS | `tests/security/provider-side-effect-default-off.test.ts` not in `git diff 36b58f1..99502dd`; security report `:305-321` | I-5 |
| FLH-006 | PASS | Row-by-row diff of `EXECUTION_LEDGER.md` statuses: 168 rows changed; 167 DONE to VERIFIED, each citation-backed (161 cite a QA line that names the criterion and PASS; 6 PARTIAL rows cite their follow-up evidence as 008E-AC-004 requires); `CRR-075` changed text only. All 25 BLOCKED rows and the ACCEPTED CONSTRAINT row unchanged; no other ledger file in the diff | I verified all 167 citations, not a sample |
| FLH-007 | PASS | 0 U+2014 or U+2013 in any added line of the 237 non-image files; 0 in any added file | 21 pre-existing dashes sit in unedited lines of five modified files (`the-map.mdc:59-78`, `EXECUTION_LEDGER.md:319-388`, `NEXT_BATCH_LEDGER.md:22-76`, `project-map.md:120-314`, `in-work/README.md:15-17`). Read as outside the criterion because the global rule forbids rewriting them; `library-guardian` may confirm |

### 008a

| ID | Status | Evidence | Verified by |
|---|---|---|---|
| 008A-AC-001 | PASS | `apps/web/package.json:21` `16.3.6`; lockfile resolves only `next@16.3.6` | Orchestrator; this audit |
| 008A-AC-002 | PASS | Lockfile: `brace-expansion@5.0.12`, `fast-uri@3.1.8`, `ip-address@10.7.2`, `undici@7.30.0`, single versions through parent ranges; no override added | Orchestrator; this audit |
| 008A-AC-003 | PENDING-SHIP | `pnpm audit --audit-level=low` on this worktree, 2026-10-01, Node 24.18.0: "No known vulnerabilities found" | Re-run on the final head at ship |
| 008A-AC-004 | PASS | All 17 PR #70 versions present at or above target across the root, `apps/*`, `packages/*`, and the catalog (`zod`, `react`, `react-dom` 4.6.5, 19.3.0, 19.3.0 in `pnpm-workspace.yaml`) | Orchestrator; this audit |
| 008A-AC-005 | PASS | Integrated runs `EXECUTION_LEDGER.md:885`, `:889`; lane mismatches listed by picture name `:889` | Orchestrator |
| 008A-AC-006 | PASS | `package.json:30` (`--audit-level=high`), `:34` (`verify:offline`); no `auditConfig` or ignore | Orchestrator; this audit |
| 008A-AC-007 | PENDING-SHIP | Lockfile half PASS (fast-uri 3.1.8, ip-address 10.7.2); PR #70 OPEN with one comment | Comment and close at ship |
| 008A-AC-008 | PASS | `pnpm-workspace.yaml` overrides and `minimumReleaseAgeExclude` hold none of the Background ranges; no `minimumReleaseAge` key | Orchestrator; this audit |
| 008A-AC-010 | PASS | `supabase/migrations/20260930180000_change_password_rate_limit.sql` | Independent verifier |
| 008A-AC-011 | PASS | `supabase/tests/change_password_rate_limit.pgtap.sql` | Verifier plus heavy run |
| 008A-AC-012 | PASS | `password-authentication-handler.ts:537` (`consumePersonLimit`), consumed at `:1658` before any derivation in `handleChangePassword` (`:1643`); Postgres route test | Verifier plus heavy run |
| 008A-AC-013 | PASS | `handleForgotPassword` (`password-authentication-handler.ts:1175`) issues the token inside the scheduled work (`:1225`); unit test | Verifier |
| 008A-AC-014 | PASS | `password-recovery-handler.postgres.test.ts` | Verifier plus heavy run |
| 008A-AC-015 | PASS | `closeout-security-audit.md:261-270` | Orchestrator reading FLH-003 |
| 008A-AC-016 | PASS | `password-authentication-handler.ts:380-414`; three precedence tests | Verifier (re-fetched the page) |
| 008A-AC-017 | PASS | `password-authentication-handler.ts:412`; unit test | Verifier |
| 008A-AC-018 | PASS | `tooling/tests/unit/runtime-authentication/seeding-bridge-reachability.test.ts` | Verifier |
| 008A-AC-019 | PASS | `apps/web/src/app/api/version/route.ts:11-19`; both tests; PRD-005e Amendments; `CRR-075` text `EXECUTION_LEDGER.md:486` | Verifier; L-8 is adjacent drift |
| 008A-AC-020 | PASS | `packages/application/src/campaign-approval-command.ts:214` before `:229` | Verifier; L-9 |
| 008A-AC-021 | PASS | `email-preview/page.tsx:113` `sandbox="allow-scripts"`, reason `:93-108`, never `allow-same-origin`; `email-preview-sandbox.integration.test.tsx` | Verifier ruling plus heavy run |
| 008A-AC-022 | PASS | `closeout-security-audit.md:272-284` | Orchestrator reading FLH-003 |
| 008A-AC-023 | PASS | 13 in-bound files state Ruling 1's condition; security CRR-130 table | Verifier; security |
| 008A-AC-024 | PASS | Issuance catch at `password-authentication-handler.ts:1225-1240`; unit test | Verifier |

### 008b

| ID | Status | Evidence | Verified by |
|---|---|---|---|
| 008B-AC-001 | PASS | `open-house-draft.ts:125` `images: []`; `placeholder-asset-guard.unit.test.ts`; the ID appears in no non-test source; contract `.min(1)` removed (`packages/contracts/src/campaign-foundation.ts:272-274`, Amendment) | Verifier; this audit |
| 008B-AC-002 | PASS | `apps/web/src/server/campaign-no-image.postgres.test.ts` | Verifier plus heavy run |
| 008B-AC-003 | PASS (by vacuity) | No signed-in screen summarises images; `copy/campaign-image-messages.ts:21` plus its tripwire test | Re-verifier ruling |
| 008B-AC-004 | PASS | `campaign-approval-controls.tsx:126-139` (outcome, walkthrough report, `router.refresh()`), `:151-165` (decided card, no controls) | Re-verifier |
| 008B-AC-005 | PASS | Refusal and unreachable paths keep controls; five tests | Verifier |
| 008B-AC-006 | PASS | `tests/browser/review/review-campaign-decision.spec.ts:149-155` | Heavy run `b5c9e19`; CI |
| 008B-AC-007 | PASS | `brand/page.tsx:9-19`; `brand-page.integration.test.tsx`; `workspace-brand-reports-flag.postgres.test.ts` | Verifier plus heavy run |
| 008B-AC-008 | PASS | `synthetic-open-house-001/page.tsx` `notFound()` in review mode | Verifier plus heavy run |
| 008B-AC-009 | PASS | `campaignStateLabel` (`copy/user-language.ts`); detail `persisted-campaign-screen.tsx:37-41`, `:47`, `:70`, `:129-135`, `:148`; list `campaigns/page.tsx:51`; overview `overview-screen.tsx:180`; next steps `campaign-workspace-read.ts:162-168`; `campaign-list-decisions` and `overview-campaign-decisions` integration tests | Re-verifier; this audit |
| 008B-AC-010 | PASS | Hand-off only when undecided and not blocking (`campaign-approval-controls.tsx:209`); approver pick requires no decision (`setup-preferences.ts`, `selectCampaignAwaitingDecision`; `guided-setup-provider.tsx:478-485`); `canCreate` from the create command's roles (`layout.tsx:78-80`, `:214`); `campaign-hand-off-decisions.integration.test.tsx` | Re-verifier plus heavy run; writing Re-review 4 |
| 008B-AC-011 | PASS | `step-model.ts` (`approveOrHandOffStep`, `readTheResultBody`, `whatHappensNextBody`); step 7 says approved only for `approved`. R6 failed-read path: a failed list read logs class and code only and returns `READ_FAILED` (`setup-preferences.ts:256-267`); a failed whole read returns `awaitingDecisionFailed: true` for anyone not known to be a non-approver (`:526-538`); the provider maps it to `campaigns_unread` only for an approver who cannot create (`guided-setup-provider.tsx:498-509`); "nothing is waiting" is never said about an unread list | Re-verifier; writing Re-review 5; this audit. L-4 (R7) is a Low on the same path |

### 008c

| ID | Status | Evidence | Verified by |
|---|---|---|---|
| 008C-AC-001 | PASS | `forbidden-vocabulary.test.ts:48-53` scan roots include `server/homeowners`; fixture red proof `:466-502` | Independent verifier |
| 008C-AC-002 | PASS | `copy/forbidden-vocabulary.ts:84-85`; phrase rule `:138` | Verifier |
| 008C-AC-003 | PASS | `server/homeowners/runtime.ts` rewritten refusals; `workspace-screen.tsx:310` | Verifier; writing review |
| 008C-AC-004 | PASS | `refusal-messages.integration.test.tsx` | Verifier |
| 008C-AC-005 | PASS | `packages/application/src/reporting.ts` returns keys; `copy/reporting-messages.ts`; no exclusion left (`forbidden-vocabulary.test.ts:403-414`) | Verifier; L-16 |
| 008C-AC-006 | PASS | Vitest sweep, 21 review-mode cases; shared-report not-found page (`ddd6deb`) | Verifier |
| 008C-AC-007 | PASS | `qa/2026-10-01-008c-writing-review.md:83-100` (Re-review 1: 0 blocking) | Writing reviewer, separate from the 008c lane |

### 008d

| ID | Status | Evidence | Verified by |
|---|---|---|---|
| 008D-AC-001 | PASS | `supabase/tests/homeowner_reports.pgtap.sql` | Verifier (mutation run) |
| 008D-AC-002 | PASS | Same suite, isolation and support refusals | Verifier |
| 008D-AC-003 | PASS | Same suite, share functions with same-id cross-tenant fixtures | Verifier plus heavy run |
| 008D-AC-004 | PASS | Same suite, `claim_due_properties` grants and `homeowner.allowed` | Verifier |
| 008D-AC-005 | PASS | `gh run list --workflow screen-baselines.yml`: exactly six dispatches on 2026-10-01: `36823126319`, `36825957221`, `36828316006` (`gauntlet/008d-baselines`), `36838168997`, `36841695906`, `36844271868` (`gauntlet/008d-fix`); first for Wave 1, the rest under 008D-AC-011; PRD-008d Amendments record the four close-out-bound rows and the lane branches | Independent verifiers; this audit |
| 008D-AC-006 | PASS | `qa/2026-10-01-008d-baseline-review.md`: first redraw (210 M, 40 A, 8 D) and second (343 M), every picture 3, R-1 to R-21 fixed with tests | Independent verifiers |
| 008D-AC-007 | PASS | 8 `chromium/campaigns--empty--*`, 8 `review/verify-email--confirmed--*`, 8 `review/guided-setup--step-5-read-the-result-needs-changes--*` | Verifier; this audit (counts) |
| 008D-AC-008 | PASS | 8 `review/guided-setup--step-{1-welcome,2-your-details}--{1180,390}--*` | Verifier; this audit (counts) |
| 008D-AC-009 | PASS | PR #74 body carries both "Baseline change:" notes; CI `36848467698` on `a37e238` (the first PR head carrying `cad9bf6`'s set): four checks success | Orchestrator; this audit |
| 008D-AC-010 | PASS | `design-quality-signoff.md:9-11`, no "not photographed" or "asserted" cell | Verifier. L-5: name the final commit at ship |
| 008D-AC-011 | PASS | No change under `tests/visual/` after `cad9bf6`. Later rendered-code changes: R6 (`07fd4e7`, `c829b4d`) adds text only for a failed read, which no baseline captures (success-path code unchanged); M-1 and L-15 change no rendered output; `3d6588b` changes the synthetic public page, which no screenshot visits | Independent verifier (second redraw); this audit for the post-`cad9bf6` range |

### 008e

| ID | Status | Evidence | Verified by |
|---|---|---|---|
| 008E-AC-001 | PENDING-SHIP | Status lines `prd-005-...-index.md:3`, `005a` to `005e:4`, `prd-006-...-index.md:3`, `006a` to `006d:4` state the real state against the current ledger and name the operator-blocked rows | Verifier at `4c3d7ab`. The owed refresh is part of M-1 |
| 008E-AC-002 | PASS | PRD-006 index supersession table has no OPEN label for `CRR-037` to `046` | Orchestrator |
| 008E-AC-003 | PASS | 27 ticked questions carry a citation; unticked ones carry dated notes; owner questions in checklist D-6 | Orchestrator; this audit (spot read of all PRD-005 and PRD-006 checkboxes) |
| 008E-AC-004 | **FAIL** | 167 rows written back and all citations check out (this audit); five rows with available evidence not written back; FLR-060 over-claims | M-1 |
| 008E-AC-005 | PASS | `prd-006a-...md:272`, `:385` (dated amendment); timing correction `EXECUTION_LEDGER.md:888` | Orchestrator; this audit (the ledger half was written by the orchestrator, so this audit is its independent check) |
| 008E-AC-006 | PASS | Both reports in PRD-007 `reports/`, each with an Independence section (`2026-10-01-independent-security-review.md`, "Independence"; `2026-10-01-independent-quality-review.md:17`); drift report exception `library/requirements/reports/2026-10-01-library-drift-report.md:41-43`; security M-1, M-2 and the W-2 Medium fixed with tests (`2de43cc`, pgTAP); post-fix range read by FLH-003 (`closeout-security-audit.md:5`, `:371`) | This audit. FLR-062 can move to VERIFIED citing it. L-12 |
| 008E-AC-007 | PASS | `EXECUTION_LEDGER.md:912-927`: HOR-001 to 010; items 1, 3, 4, 5, 6, 7, 10 VERIFIED; 2, 8, 9 BLOCKED with step 6a or 6b asks | This audit (the orchestrator appended the rows). FLR-063 can move to VERIFIED citing it. L-7 |
| 008E-AC-008 | PASS | PRD-007 final completion audit records run `35972386828` and Vercel Production deployment `6632971599` for `131c7f4` | Orchestrator |
| 008E-AC-009 | PASS | `prd-004-reviewable-go-live/qa/2026-10-01-004e-re-audit.md:50-59`; PRD-004e status cells match it; `004E-AC-009` still BLOCKED | Orchestrator; this audit |
| 008E-AC-010 | PASS | `README.md:9-22`, `:24-33`; link at `:30` from `081048e` | This audit. FLR-066 can move to VERIFIED citing it |
| 008E-AC-011 | PASS | `the-map.mdc:12-19` (current tip), `:29-31` (historical pointer); `project-map.md:3` (v1.14), `:235-239`, `:308-310`; `NEXT_BATCH_LEDGER.md` Branch and Current park rows agree | Verifier at `4c3d7ab`; caveat fixed in `081048e`, checked here. Refresh at ship; L-11 |
| 008E-AC-012 | PASS | Drift report present; `find library -type d` without `README.md`: none | Orchestrator; this audit |
| 008E-AC-013 | PASS | Checklist v1.4 (`:3`, `:64`); step 0 and step 8 match the code and the security audit | Verifier at `4c3d7ab`; this audit for v1.4. Final status cells at ship |
| 008E-AC-014 | PENDING-SHIP | Phase 0 move done with inbound links resolved; `library/requirements/in-work/README.md:28-32`; `backlog/README.md:31` lineage row; 484 relative links resolve | The exit move happens at ship |
| 008E-AC-015 | PASS | `user-language-contract.md:3` (v1.1), `:42`, `:51-55`, `:74-75`, `:138` | Orchestrator; this audit |

### FLH-001: who verified what

FLH-001 asks that every 008* criterion is VERIFIED by a pass other than the one that implemented it. On `99502dd`:

- **Not yet VERIFIED in the ledger:** FLR-010 (008A-AC-003, ship), FLR-014 (008A-AC-007, ship), FLR-062 (008E-AC-006), FLR-063 (008E-AC-007), FLR-066 (008E-AC-010), FLR-070 (008E-AC-014, ship). This audit is the independent pass for 008E-AC-006, 007, and 010; the orchestrator can set those three to VERIFIED citing this report.
- **Verified only by the orchestrator, where the orchestrator did not implement:** FLR-008, 009, 011, 013, 015 (L1 implemented), FLR-021 and FLR-028 (security recorded them), FLR-058, 059, 064, 065, 068, 074 (L8 or L9 implemented). **Judgement: acceptable.** The orchestrator is a separate pass from each lane, and each check is mechanical and reproducible. I re-ran the ones that matter most for the gate (008A-AC-001, 002, 004, 006, 008, and the audit for 003) and got the same result.
- **Verified by the same pass that implemented it:**
  - FLR-060 (008E-AC-004): the orchestrator applied the write-back and sampled it itself. **Judgement: not independent as recorded.** This audit checked all 167 written-back rows against their cited lines, so the written part is now independently verified. The unwritten part is M-1.
  - FLR-061 (008E-AC-005), the ledger correction half: the orchestrator wrote and checked it. **Judgement: now independently verified** by this audit (`EXECUTION_LEDGER.md:888` records the 77.8 s against 78.0 s correction; no merged body was edited).
  - FLR-063 (008E-AC-007): the orchestrator appended the HOR rows and marked the row "verify in the close-out". **Judgement: verified here.**
  - FLR-066 (008E-AC-010) and FLR-067 (008E-AC-011): the orchestrator fixed the verifier's gaps in `081048e`. **Judgement: verified here** (`README.md:30`; `NEXT_BATCH_LEDGER.md:12` names step 0).
- **Implementer-only verification of product code:** none found. Every 008a, 008b, 008c, and 008d row names an independent verifier, a re-verifier, or a separate writing or design reviewer.

FLH-001 closes at ship once M-1 is fixed and re-checked by a non-orchestrator pass and the ship-bound rows close.

## Verdict

**FIX FIRST.**

1. **M-1 (Medium):** write back `CRR-075`, `CRR-094`, `CRR-167`, `CRR-181`, `CRR-184` now; `CRR-096` and `CRR-130` once `pnpm verify` on `5585ee9` is green; set FLR-060 to match; refresh the six PRD-005 and PRD-006 status lines; have a non-orchestrator pass re-check. Records only: no code change, no security re-run, no redraw.

Then ship as the scope contract describes: the orchestrator's `pnpm verify` result (FLH-002, and FLH-003's condition), `pnpm audit` on the final head (008A-AC-003), push and the four required checks plus MERGEABLE (FLH-002), PR #70 comment and close (008A-AC-007), the exit lifecycle move with link repair (008E-AC-014), and the ship refresh of the maps and checklist status cells. Fold Lows L-5, L-6, L-7, L-9, L-10, L-11, L-12, and L-13 into that records commit if convenient; none blocks. L-1 belongs to the next UI batch because it needs a redraw.

## Files changed by the run

`git diff --stat 36b58f1..99502dd`: 609 files, 19,893 insertions, 1,583 deletions, 198 commits. Grouped by area; one line per file would add about 600 lines and no information:

- `apps/web/src/server/` (M and A): change-password limit, forgot-password timing, sign-in no-account write (M-1), address precedence, seeding-bridge guard, `images: []`, setup-preferences decision and R6, homeowner runtime, http, scheduler, share throttle, workspace data; with unit, integration, and Postgres tests.
- `apps/web/src/features/` (M and A): approval card, campaign detail, list, and overview decision-aware labels, guided-setup provider, steps, and model, homeowner PDF and unavailable page, workspace copy, reporting surfaces, and D-009, D-010, R-1 to R-21 stylesheet fixes.
- `apps/web/src/app/` (M and A): brand page, demo-slug not-found, version route, email-preview sandbox, shared-report not-found, layout `canCreate`, account page, globals (D-009, D-010), synthetic public page.
- `apps/web/src/copy/` (M and A): user language, guided-setup messages, image, reporting, and shared-report messages, forbidden vocabulary.
- `packages/` (M): approval role order, decision-aware next actions, reporting keys, manifest `images` contract, runtime-function allowlist, UI primitives and overlay, package versions.
- `supabase/` (A): three migrations and three pgTAP suites.
- `tests/`, `tooling/` (M and A): browser specs and helpers for S-1, S-2, S-3, A-1, the decision state, the homeowner sweep, the public page; contract, unit, and integration guards.
- `tests/visual/screens/` (M, A, D): 372 baseline pictures from two redraws.
- `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `package.json` files (M): the dependency lane.
- `docs/`, `library/`, `README.md`, maps, ledgers (M, A, R): records, reviews, seeded READMEs, the PRD-008 move to `in-work/`.

Model routing for this audit: opus, because it is the final quality gate and judges every criterion on the whole tree.

## Re-check (2026-10-01) on `468e281`

**Head:** `468e281` on `gauntlet/closeout-quality-2` (worktree `oalo-g-closeout-qa2`), the same commit as the pushed head of PR #74 (`claude/gauntlet-prd-008`).
**Plan document:** the same PRD-008 set, now at `library/requirements/completed/prd-008-finish-line-hardening/` (moved by `bc86d8b`; the header above keeps the path it had on `99502dd`).
**Auditor:** `quality-guardian`, armed with `quality-weapon` (model routing: opus, the last gate before ship).
**Mode:** read-only except for this appended section. No test suite or build. Commands run: `git`, read-only `gh`, one `pnpm audit` (network), and scratch scripts that parse the ledger and check links.
**Taken as given, not re-run:** the orchestrator's full `pnpm verify` on `5585ee9` (exit 0; no log is in the repository). CI on the final head is its independent confirmation.

### Scope and ordering

- Since `99502dd`: 12 commits (`b267fa6` to `468e281`) changing 35 files. All are Markdown except the terrain map, `.cursor/rules/core/the-map.mdc`.
- `git diff --stat 5585ee9 468e281 -- apps packages supabase tests tooling pnpm-lock.yaml package.json pnpm-workspace.yaml` is empty.
- The security final look on `311fd45` therefore still covers every line of code on this head, and the order (security, then quality) holds.
- Nothing security-relevant changed. The one operational edit, checklist step 6a, names `CRON_SECRET` and `OALO_HOMEOWNER_CRON_SECRET` by name and never a value. No security re-run is needed.

### Verdict

**SHIP.**

- **M-1 is fixed, and this section is the independent re-check of the fix:**
  - all seven held `CRR` rows are VERIFIED, with citations that hold;
  - `CRR-058` carries the 008A-AC-020 note;
  - rows `FLR-071` and `FLR-072` have eight cells;
  - the refreshed PRD-005 and PRD-006 status lines state the true counts and name every row that is not VERIFIED.
- **008E-AC-004 and 008E-AC-001 now PASS.**
- **The Lows chosen for fixing are fixed correctly.**
- **No new finding is at Medium or above.** There are four new Lows (N-1 to N-4) and one Info (N-5); none blocks.

Five ledger rows are not yet VERIFIED. Each is closed by this re-check or by the ship itself; see "FLH-001 recount" below. To ship:

1. **One records commit.** It changes nothing but Markdown records. It writes `FLR-001`, `FLR-004`, `FLR-060`, and `FLR-070` to VERIFIED, citing this section. In the same commit, it updates every string under "Record drift" below. If the rows close and those strings stay, the records will claim "62 of 74" and "close at ship" over a fully VERIFIED ledger. That is the M-1 defect class again.
2. **CI on the final head.** The four required checks are green on that commit, and `gh pr view 74` reports `MERGEABLE` (FLH-002). Then `FLR-002` moves to VERIFIED.
3. **The PR #74 description.** Complete it at ship (N-4).

This verdict covers Markdown record changes only. If anything else changes after this commit, it needs a new check.

### Criteria not PASS in the first report

| ID | First report on `99502dd` | Re-check on `468e281` | Evidence |
|---|---|---|---|
| FLH-001 | PENDING-SHIP | PENDING-SHIP, closes in the records commit | Every 008* row is VERIFIED by a pass other than its implementer, except `FLR-060` and `FLR-070`, which this re-check verifies. The orchestrator did the work behind `FLR-010` and `FLR-014` and also wrote them VERIFIED; this re-check is their independent pass (see 008A-AC-003 and 008A-AC-007 below). |
| FLH-002 | PENDING-SHIP | PENDING-SHIP (CI on the final head) | Full `pnpm verify`, including `test:db`, exited 0 on `5585ee9` (`EXECUTION_LEDGER.md:762`, `:911`). No code, lockfile, or package file has changed since. CI run `36867017282` on `468e281`, when this was written: Application verification success; Release and recovery contract success; Real PostgreSQL migrations and pgTAP in progress; Preview smoke contract not yet started. `gh pr view 74`: OPEN, draft, head `468e281`, `MERGEABLE`, with `mergeStateStatus` BLOCKED while checks run. `origin/main` is still `36b58f1`. |
| FLH-003 | PASS (conditional) | PASS | Its condition, a green `pnpm verify` with `test:db` on the final code, is met on `5585ee9`. The final look covered that code (see Ordering above). `FLR-003` is VERIFIED at `:763`. |
| FLH-004 | FAIL on that pass | PASS | This section. Every criterion passes on `468e281` except FLH-002's CI half and FLH-001's last two rows. By the PRD's design, both close after this report. |
| 008A-AC-003 | PENDING-SHIP | PASS | I ran `pnpm audit --audit-level=low` on `468e281` at 2026-10-01 13:18 UTC (Node 24.18.0, pnpm 11.15.1): "No known vulnerabilities found", exit 0. `--audit-level=moderate` also exits 0. The lockfile has not changed since `5585ee9`. The criterion is evaluated against the final head's day, so re-run the audit if that head lands on a later day. |
| 008A-AC-007 | PENDING-SHIP | PASS | `gh pr view 70`: CLOSED at 2026-10-01T13:11:57Z, not merged. Comment `issuecomment-5932175925` (13:11:55Z) opens "Superseded by #74" and gives the reasons. The lockfile half is unchanged. |
| 008E-AC-001 | PENDING-SHIP | PASS | See "Status lines (`0df8947`)" below. |
| 008E-AC-004 | FAIL (M-1) | PASS | See "M-1 re-check" below. `FLR-060` now reads DONE, which is accurate; it moves to VERIFIED citing this section. |
| 008E-AC-014 | PENDING-SHIP | PASS, with N-3 | See "Exit move and link check" below. |

**Passing criteria re-checked because their ledger rows changed.** All still PASS:

- **FLH-005:** nothing in the code changed after `5585ee9`, so `tests/security/provider-side-effect-default-off.test.ts` is untouched.
- **FLH-006 and FLH-007:** see the FLH-005, FLH-006, and FLH-007 section below.
- **008E-AC-006, 007, and 010:** `FLR-062`, `FLR-063`, and `FLR-066` are now VERIFIED and cite the first report, which was the independent pass it named for them.

### M-1 re-check

Each written-back row, checked against the line it cites:

| Row | Status on `468e281` | Citation | Checked |
|---|---|---|---|
| `CRR-075` (`EXECUTION_LEDGER.md:486`) | VERIFIED | `FLR-025`; `route.ts:11-19` | `FLR-025` (008A-AC-019) is VERIFIED at `:785`. `apps/web/src/app/api/version/route.ts:11-19` returns exactly `environment`, `buildId`, and `commit`; the 503 `CONFIGURATION_INVALID` is at `:26-33`. Holds. |
| `CRR-094` (`:593`) | VERIFIED | `FLR-050` to `FLR-056`; sign-off re-signed against `cad9bf6` from run `36844271868` | `:810-816` are all VERIFIED. `design-quality-signoff.md:10-12` names `cad9bf6` and run `36844271868`. `gh run view 36844271868`: Screen baselines, head `eaf34e6`, attempt 2, success. Holds. |
| `CRR-096` (`:595`) | VERIFIED | OD-1; 008A-AC-015; the security re-audit and final look; this report; 008D-AC-011; the verify on `5585ee9` | OD-1 is at `prd-008-finish-line-hardening-index.md:140`. `closeout-security-audit.md:643` and `:716` record PASS. Also checked: the 008D-AC-011 row of this report and `FLR-002`. Holds, but two of its phrases were written before this re-check existed (N-5). |
| `CRR-130` (`:629`) | VERIFIED | The verify and `test:db` on `5585ee9`; 47 definer bodies; allowlist entry `runtime.record-sign-in-without-account.v1` | `closeout-security-audit.md:490` counts 47 definer functions, all with `search_path = ''`. `:552` and `:624` approve the allowlist entry, and `:623` passes every definer body. The run counts match `FLR-002` and raid log `:911`. Holds. |
| `CRR-167` (`:666`) | VERIFIED | `FLR-053` (008D-AC-008), `FLR-055` (008D-AC-010) | `:813` and `:815` are VERIFIED. Holds. |
| `CRR-181` (`:680`) | VERIFIED | `FLR-050`, `051`, and `056`; run `36844271868`; CI `36848467698` | `:810`, `:811`, and `:816` are VERIFIED. CI run `36848467698` on `a37e238` passed all four jobs. `cad9bf6` is an ancestor of `a37e238`, and nothing under `tests/visual/` changes between them. Holds. |
| `CRR-184` (`:683`) | VERIFIED | `FLR-055`; no not-photographed or asserted cell | `:815` was VERIFIED by an independent verifier. Holds. |
| `CRR-058` (`:469`) | VERIFIED, status unchanged | The 008A-AC-020 note | The note states the new 403 ordering and names the re-pinned test. That test exists: `apps/web/src/server/campaign-approval-handler.correlation.postgres.test.ts:255`, "returns 403, not 409, when a creator attempts an already approved campaign". L-9 is fixed. |
| `FLR-071`, `FLR-072` (`:831-832`) | VERIFIED | | Split the way GitHub renders tables (on every unescaped pipe), each row has eight cells; on `99502dd` each had ten. Status and Evidence now sit under their own headers. L-6 is fixed. `CRR-096` also went from nine cells to eight. |

**`CRR` totals on `468e281`.** The 188 rows read 174 VERIFIED, 3 DONE, 11 BLOCKED (operator), and 0 OPEN. The three DONE rows are `CRR-036` to `CRR-038`, which PRD-006a superseded; each row says so. On `36b58f1` the same rows read 0, 176, 11, and 1. PRD-008 therefore wrote back 174 rows. A pass other than the orchestrator has now checked every one: 167 in the first report, and 7 here.

**Status changes from `99502dd` to `468e281`.** The whole ledger, by ID:

- `CRR-075`, `094`, `130`, `167`, `181`, and `184`: DONE to VERIFIED.
- `CRR-096`: OPEN to VERIFIED.
- `FLR-002`: OPEN to DONE.
- `FLR-003`, `010`, `014`, `062`, `063`, and `066`: DONE to VERIFIED.
- `FLR-006` and `007`: OPEN to VERIFIED.
- `FLR-060`: VERIFIED to DONE.

No BLOCKED, DEFERRED, or ACCEPTED CONSTRAINT row changed, and no `HOR` row changed.

### Status lines (`0df8947`), 008E-AC-001

I counted the ledger rows by source sub-PRD and compared each status line with the count:

| Status line | Says | Ledger on `468e281` | Names every row not VERIFIED |
|---|---|---|---|
| PRD-005 index `:3` | 74 of 88. The other 14 are `CRR-036` to `038` (DONE, superseded) and 11 operator-blocked rows: `CRR-006`, `076` to `084`, and `088` | 74 VERIFIED, 3 DONE, 11 BLOCKED | Yes |
| 005a `:4` | All 18 | 18 VERIFIED | Not needed |
| 005b `:4` | 17 of 20; `CRR-036` to `038` superseded and DONE | 17 VERIFIED, 3 DONE | Yes |
| 005c `:4` and 005d `:4` | All 13 each | 13 and 13 VERIFIED | Not needed |
| 005e `:4` | 6 of 16; blocked: `CRR-076` to `084`, `088`, and the index row `CRR-006` | 6 VERIFIED, 10 BLOCKED, plus the index row | Yes |
| PRD-006 index `:3` | All 100 | 100 VERIFIED | Not needed |
| 006a, 006b, 006c, and 006d `:4` | All 34, 17, 22, and 19 | 34, 17, 22, and 19 VERIFIED | Not needed |

- Every line cites PR #67 (`58d77fd`).
- Both indexes stay In Work, with a one-line reason that names the operator-blocked rows.
- `library/README.md`'s PRD-006 row agrees: "All 100 of its ledger rows are VERIFIED, including `FSG-008`".
- No line in either PRD folder still says a written-back row is waiting. A `git grep` for "still DONE", "stays OPEN", "moves to VERIFIED", and similar wording finds nothing.

PASS. `FLR-057`'s evidence cell has not caught up with the refresh (N-1).

### Lows fixed since the first report

| Low | Commit | Result | Check |
|---|---|---|---|
| L-5 | `eac8aca` | Fixed, with N-4 | `design-quality-signoff.md:13-17` records the re-check. `git diff cad9bf6 468e281 -- tests/visual` is empty, so the statement also holds on this head. |
| L-6 | `fd8f9d5` | Fixed | See "M-1 re-check" above. |
| L-7 | `8d8d49b` | Fixed | Step 6a's names and behaviour match the code. In `apps/web/src/server/homeowners/scheduler.ts`, `CronSecretsSchema` and `authorizedHomeCron` (`:38-54`) read `OALO_HOMEOWNER_CRON_SECRET ?? CRON_SECRET`. They refuse a secret shorter than 32 or longer than 512 characters, and they compare `Bearer <secret>` in constant time. The job answers 401 before it reads any other setting (`:131-133`). `apps/web/vercel.json` runs `/api/jobs/homeowner-reports` on the schedule `0 12 * * *`. The linked runbook section, "Optional monthly updates and HighLevel handoff", exists (`homeowner-avm-activation.md:54-56`). The source of "already present" is `2026-09-24-final-completion-audit.md:83`, and the checklist marks that claim UNVERIFIED. The checklist is now v1.5, with a changelog line. |
| L-8 | `858b9ed` | Fixed | `system-runtime-contracts.md:69` lists the three fields and the 503 `CONFIGURATION_INVALID`, matching `route.ts:11-33`. The header reads v1.2, with a changelog line. |
| L-9 | `fd8f9d5` | Fixed | See "M-1 re-check" above. |
| L-11 | `a6e8d4c` | Fixed | `project-map.md:42` names the three newest files in `supabase/migrations/` as UNVERIFIED on the hosted database and links checklist step 0. |
| L-12 | `caedd1c` | Fixed | The addendum is at `2026-10-01-independent-quality-review.md:264-295`, and the original findings are untouched. Its claims check out: `2de43cc` is an ancestor of both `a37e238` and `5585ee9`; `homeowner_reports.pgtap.sql:42` is `plan(244)`; CI run `36848467698` passed all four jobs. It correctly leaves the 429-against-a-built-server bullet UNVERIFIED. |
| L-13 | `bc86d8b` | Fixed | The index and 008a to 008e no longer read Draft, and the index's sub-feature table reads Complete. |

### Exit move and link check, 008E-AC-014

`bc86d8b` moves the folder with `git mv` to the same depth, so links from inside the folder to the rest of the repository are unchanged.

**Lifecycle labels.** All of these place PRD-008 in `completed/`:

- the index and 008a to 008e, which read "Complete in draft PR #74";
- `library/README.md:32`, which lists PRD-008 as Completed;
- `completed/README.md:7-11`, which lists it;
- `in-work/README.md:34`, which records it as moved out and keeps the PRD-007 entry;
- `backlog/README.md:31`, now a lineage row that points to `completed/`;
- these files, which point to `completed/`:
  - the terrain map;
  - `project-map.md:56` and `:85`;
  - `NEXT_BATCH_LEDGER.md`;
  - `README.md`;
  - the checklist intro (`:5`);
  - the user-language contract;
  - the review rubric;
  - the design sign-off.

**My relative-link check.** Method: inline Markdown links outside code spans and fences, resolved against `git ls-files`, with the heading anchor checked wherever a link carries one.

| File set | Relative links | Broken | Anchors checked | Bad anchors |
|---|---|---|---|---|
| The 25 files `git grep -l prd-008-finish-line-hardening` returns, including `EXECUTION_LEDGER.md` | 255 | 0 | 5 | 0 |
| The 35 files changed since `99502dd` | 377 | 0 | 9 | 0 |

- In the first set, 21 links, from 17 files, resolve into the PRD-008 folder.
- `EXECUTION_LEDGER.md` has 5 relative links, none broken. Its four PRD-008 links point to `completed/`.
- The raid log's "371 links, 0 broken" counts a different set of files. Both counts find nothing broken.

**Text that still says `in-work/prd-008`.** None of these is a link:

- `qa/2026-10-01-008d-baseline-review.md:260` and `:767`, the verbatim "Baseline change:" notes;
- this report's header (`:3`);
- `closeout-security-audit.md:421`, the report's own path when it was written;
- `library/requirements/reports/2026-10-01-library-drift-report.md:14`, a dated snapshot.

Each records where a file was at the time, so leaving them is correct.

One gap: the ledger links were repointed one commit after the move (N-3).

### Lows left as follow-ups

| Low | Disposition | Acceptable? | Recorded where |
|---|---|---|---|
| L-1 (`--space-7`) | Next UI batch | Yes. Changing the value moves the sign-in, sign-up, verify, reset, and email-preview pictures, so it needs a redraw under 006D-AC-013. Doing that now would reopen 008D-AC-011 and the sign-off. Both uses remain (`email-preview.module.css:12`, `auth-form.module.css:10`). | This report (L-1) only |
| L-2, L-3, L-4 (R4, R5, R7) | Copy follow-up | Yes. Replacement wording is already written (`008c-writing-review.md:184`, `:254`). Changing user-visible copy now would need another writing review and could move baselined pictures. | This report and the 008c writing review |
| L-10 (eight "16.3.3" comments) | Leave the comments as they are | Yes. There are eight: `apps/web/src/app/api/auth/{change-password,choose,forgot-password,resend-verification,reset-password,sign-up,verify-email}/route.ts:14` and `password-authentication-handler.ts:281`, while `apps/web/package.json:21` pins `next` `16.3.6`. Editing auth files after the final security look would reopen the review order for a comment. The raid log entry at `EXECUTION_LEDGER.md:910` corrects the earlier "fixed at integration" claim at `:860`, which stays as written. | Raid log `:910`; this report |
| L-14 to L-19 | A future PRD, an owner decision, or the next UI batch, as each finding states | Yes. Each is pre-existing or outside PRD-008's criteria, and the first report names an owner or a fix for each. | This report only |

The dispositions are acceptable. The record is thin, though: see N-2.

### FLH-001 recount on `468e281`

`FLR-001` to `FLR-074`: 74 rows with 74 unique IDs and none missing. 69 are VERIFIED. These 5 are not:

| Row | Criterion | Status | What closes it |
|---|---|---|---|
| `FLR-001` | FLH-001 | OPEN, no evidence | Writing `FLR-060` and `FLR-070` to VERIFIED, citing this section. Every 008* row is then VERIFIED by a pass other than its implementer. |
| `FLR-002` | FLH-002 | DONE | The four required checks green on the final pushed head, and `MERGEABLE`. CI run `36867017282` on `468e281` previews that. The final head will be the records commit after this one. |
| `FLR-004` | FLH-004 | OPEN, no evidence | This section, verdict SHIP. |
| `FLR-060` | 008E-AC-004 | DONE | This section (M-1 re-check). In the same edit, replace its stale sentence (N-1). |
| `FLR-070` | 008E-AC-014 | OPEN, no evidence | This section (Exit move and link check), with N-3 stated in the row's evidence. |

These are the five rows the brief expected; there are no others.

### FLH-005, FLH-006, and FLH-007 on `468e281`

- **FLH-005 holds.** No code, test, or package file has changed since `5585ee9`.
- **FLH-006 holds.** The status changes listed under "M-1 re-check" touch no protected status. The later write-backs are the citation-backed exception that 008e allows.
- **FLH-007 holds.** I counted lines that contain U+2014 or U+2013:
  - lines added in `36b58f1..468e281`, across all non-image files: 0;
  - lines added since `99502dd`: 0;
  - commit messages since `99502dd`: 0.

  The scan is not blind: it finds the pre-existing dashes in lines nobody edited, for example four in `the-map.mdc`.

### New findings

None at Medium or above.

- [ ] **N-1. Two ledger evidence cells are out of date.** Low.
  - **Where:** `EXECUTION_LEDGER.md:820` (`FLR-060`) and `:817` (`FLR-057`, VERIFIED).
  - **What is wrong:**
    - `FLR-060` still says "CRR-096 and CRR-130 follow once the final `pnpm verify` on `5585ee9` is green". `211b519` has written both back.
    - `FLR-057` still says "One refresh owed at ship when CRR-130 closes with FLH-003". The refresh is `0df8947`, and this section is its independent check.
  - **Fix, in the records commit:**
    - Rewrite `FLR-060`'s evidence: all seven rows written back (`fd8f9d5`, `211b519`) and re-checked here.
    - Append to `FLR-057`: "refreshed in `0df8947`; re-checked by the close-out quality re-check".
- [ ] **N-2. The deferred Lows have no forward-looking home.** Low.
  - **What is wrong:** L-1 to L-4 and L-14 to L-19 exist only in this report. L-10 is also in the raid log. Once PRD-008 sits in `completed/`, no backlog, batch ledger, or open-questions list carries them, so the next UI batch has no pointer to L-1's redraw-bound fix or to the copy in L-2 to L-4.
  - **Fix:** in the records commit, if convenient, add a short "Carried follow-ups" list to the PRD-008 index or to `NEXT_BATCH_LEDGER.md`:
    - L-1: next UI batch, with a redraw;
    - L-2 to L-4: copy;
    - L-10 and L-19: the auth comments, after checklist step 8's deployed check;
    - L-14 to L-18: a future PRD or an owner decision.

    It does not block the ship.
- [ ] **N-3. The ledger's PRD-008 links were repointed one commit after the move.** Low.
  - **Where:** `EXECUTION_LEDGER.md` at `bc86d8b` and `f47a9f2`; repaired in `468e281`.
  - **What is wrong:**
    - 008E-AC-014 says every inbound link resolves "in the same commit" as the move.
    - Lane commits may not touch the ledger, so `bc86d8b`, the lane's move commit, left it alone. The merge `f47a9f2`, which brought the move onto the run branch, did not repoint it either.
    - At both commits, `EXECUTION_LEDGER.md` keeps four links to `library/requirements/in-work/prd-008-finish-line-hardening/`, which no longer exists. `468e281` repoints them.
  - **Why Low:** the delivered tree resolves every link, so the criterion's purpose holds, and I pass it. The letter of the criterion was missed only at `f47a9f2`.
  - **Fix:**
    - Say this plainly in `FLR-070`'s evidence; do not claim the same commit.
    - Merge with a squash. The repository allows only squash and rebase merges (`gh repo view`: `mergeCommitAllowed` false), and a squash keeps the broken intermediate state off `main`.
- [ ] **N-4. The design sign-off and PR #74 do not yet agree.** Low.
  - **Where:** `design-quality-signoff.md:13-17` and the PR #74 description.
  - **What is wrong:**
    - The sign-off says the re-check "is recorded in PR #74", and it calls `211b519` the run's final head. Its claim about `tests/visual/` also holds on `468e281`.
    - The PR #74 description does not record the re-check:
      - its screens section still reads "To be completed at ship";
      - it says "70 acceptance criteria";
      - it links `library/requirements/in-work/prd-008-finish-line-hardening/...`, a path that no longer exists;
      - it describes the run as in progress.
  - **Fix at ship:** complete the PR description, which the Gauntlet's ship step requires anyway. It needs:
    - 74 criteria and the `completed/` path;
    - the final ledger;
    - the wave plan;
    - the model selections;
    - the guardian results;
    - the design sign-off re-check.

    The sign-off line can stay as it is, because it is tied to a named commit and is true.
- **N-5. Two records claimed this re-check before it ran.** Info.
  - **Where:** `CRR-096`'s evidence (`:595`) says the quality Medium was "fixed in `fd8f9d5`, independently re-checked". `qa/README.md:14` says "fixed in `fd8f9d5` and re-checked".
  - **What is wrong:**
    - Both were written before this re-check. They become true with this commit.
    - The M-1 fix spans three commits, not `fd8f9d5` alone: `211b519` wrote back `CRR-096` and `CRR-130`, and `0df8947` refreshed the status lines.
  - **Fix (optional):** name all three commits.

### Record drift: strings to change when the last rows close

Each string below is true today, because it is tied to `211b519` or describes rows as closing at ship. Each goes stale once `FLR-001`, `002`, `004`, `060`, and `070` close. Change them all in that records commit.

1. `library/requirements/completed/prd-008-finish-line-hardening/prd-008-finish-line-hardening-index.md:3`
   - Now: "In `EXECUTION_LEDGER.md` 62 of the 74 `FLR` rows read VERIFIED at `211b519`. The other 12 close at ship and are listed under "Ledger status at the exit move" below."
   - Change to: all 74 rows VERIFIED at the closing commit.
2. The same file, `:68` (the 008a row)
   - Now: "21 of 23 criteria VERIFIED; `008A-AC-003` and `008A-AC-007` close at ship".
   - Change to: "All 23 criteria VERIFIED".
3. The same file, `:72` (the 008e row)
   - Now: "10 of 15 criteria VERIFIED; `008E-AC-004`, `008E-AC-006`, `008E-AC-007`, `008E-AC-010`, and `008E-AC-014` close at ship".
   - Change to: "All 15 criteria VERIFIED".
4. The same file, `:74-91`
   - Now:
     - the heading "Ledger status at the exit move";
     - the paragraph at `:76`, which begins "Counted from `EXECUTION_LEDGER.md` at `211b519`: 62 of the 74 `FLR` rows are VERIFIED. The other 12 are below";
     - the 12-row table at `:78-91`. Seven of its rows are already stale on `468e281`: `FLR-006`, `007`, `010`, `014`, `062`, `063`, and `066` are VERIFIED.
   - Change to: one paragraph saying all 74 are VERIFIED. Keep the fact that the folder moved with 12 rows open, at the orchestrator's direction.
5. `prd-008a-finish-line-hardening-security-and-dependency-closure.md:4`
   - Now: "21 of its 23 criteria are VERIFIED", through "Two close at ship by the PRD's design", including "(it was clean at moderate and low on `6f24a14`)".
   - Change to: all 23 VERIFIED, citing the audit on the final head and the close of PR #70.
6. `prd-008e-finish-line-hardening-records-and-independent-review.md:4`
   - Now: "10 of its 15 criteria are VERIFIED", "Five close at ship.", and the rest of that line.
   - Change to: all 15 VERIFIED.
7. `.cursor/rules/core/the-map.mdc:15`
   - Now: "62 of its 74 ledger rows read VERIFIED at `211b519`; the other 12 close at ship, and the PRD's index lists them."
   - Change to: all 74 ledger rows VERIFIED.
8. `library/knowledge/private/product/project-map.md:85`
   - Now: "62 of the 74 rows read VERIFIED at `211b519`, and the other 12 close at ship (the PRD's [index](...) lists them)."
   - Change to: all 74 rows VERIFIED.
   - Also bump the header at `:3` (now v1.15) and add a v1.16 changelog line. Leave the v1.15 line at `:308` as history.
9. `library/requirements/completed/README.md:10`
   - Now: "12 of its 74 ledger rows close at ship; the [index](...) lists them".
   - Change to: all 74 ledger rows VERIFIED.
10. `library/README.md:32` (the PRD-008 row)
    - Now: "The ship-bound ledger rows are listed in the PRD's index."
    - Change to: all 74 ledger rows are VERIFIED.
11. `EXECUTION_LEDGER.md`
    - Fill the empty evidence cells of `FLR-001`, `FLR-004`, and `FLR-070`.
    - Rewrite the evidence of `FLR-060` (`:820`) and `FLR-057` (`:817`) (N-1).
    - Add the final CI run and `MERGEABLE` to `FLR-002` (`:762`).
    - Add one raid-log line.
12. Optional: in `qa/README.md:14`, add "re-checked on `468e281`: SHIP".

Outside the repository: the PR #74 description (N-4).

**Searching for these strings.** `git grep -e "62 of" -e "of its 23" -e "of its 15"` finds items 1, 4, 5, 6, 7, and 8, plus the v1.15 changelog line, which stays. Items 2, 3, 9, and 10 use other words ("21 of 23", "10 of 15", "12 of its 74", "ship-bound"). Add `-e "close at ship" -e "ship-bound" -e "211b519"` to find them; the sign-off's `211b519` is tied to its commit and may stay.

Model routing for this re-check: opus, because it is the last gate before ship.
