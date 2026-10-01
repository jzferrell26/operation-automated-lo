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
