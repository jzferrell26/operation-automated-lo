# QA Report: PRD-008 Authoring Change Set (documentation only)

**Plan document:** the product owner's request "review pending work, author anything outstanding, and prep for a good solid Gauntlet run". No PRD governs the authoring itself, so the plan is that intent plus the Gauntlet's own bar (100% of a PRD set's criteria driven to VERIFIED, genuine external blockers parked only with an exact ask). Audited artifacts are listed under Scope.
**Audit date:** 2026-09-30
**Base branch:** `origin/main` at `131c7f4` (confirmed current with `git ls-remote`)
**Head:** `claude/finish-line-prep-2026-09-30` at `131c7f4` plus uncommitted working-tree changes. Nothing is committed or pushed.
**Auditor:** quality-guardian

## Arming confirmation

Armed before any review work. In this order I read `C:\Users\jzfer\the-neeson\skills\quality-weapon\SKILL.md`, then the guides it routes a requirements and documentation audit to: `guides/03-cross-reference-audit.md`, `guides/05-severity-classification.md`, `guides/06-report-writing.md`, and `templates/qa-report.md`. Guides 01 and 02 (locate the plan, inventory changes) were satisfied directly by the task statement and `git status` and `git diff`. Guides 00, 04, and 07 were not needed for a documentation audit. Findings use the Weapon's tiers: Critical blocks, Warning should fix, Suggestion optional.

**Ordering.** `security-guardian` ran first and PASSED (`qa/2026-09-30-authoring-security-review.md`: 0 Critical, 0 High, 0 Medium, 4 Low, 6 Info). No `*-qa-report.md` existed before this one. No ordering violation. Fix verification for that review is in the section "Prior-review fixes, verified".

## Scope

Documentation-only change set in the worktree `C:\Users\jzfer\Projects\operation-automated-lo-finish`:

- New: `library/requirements/backlog/prd-008-finish-line-hardening/` (index, 008a to 008e, `qa/README.md`, the security review) and `library/knowledge/private/operations/finish-line-operator-checklist.md`.
- Edited: `.cursor/rules/core/the-map.mdc`, `library/README.md`, `library/knowledge/private/operations/README.md`, `library/knowledge/private/product/project-map.md`, `library/requirements/backlog/README.md`.

Method: read every file in full; checked 45 factual claims against git, `gh` (read-only), a live `pnpm audit --json`, the GitHub advisory API, the pnpm and HighLevel docs, and the repository files; resolved every relative link; scanned for U+2013, U+2014, and hidden Unicode with Node. Nothing in the PRD set or checklist was edited.

## Summary

**Verdict: SHIP.** There is no Critical finding: every acceptance criterion is binary, none depends on an operator, a live provider, or a deploy, IDs and cross-references resolve, all relative links in the 14 files resolve, the added text has no em or en dashes, and the four Low items, two notes, and stray table row from the security review are fixed. The set carries 8 Warnings and 19 Suggestions. The Warnings are places where a literal-following Gauntlet run must make an unguided decision: when the pull request exists, who may write the ledger, where S-2 is captured, what happens to a fix after the single baseline redraw, who repairs links when the folder moves, the PRD-007 HighLevel ask, the partial-row write-back, and a nonexistent coverage reference. Five or more Warnings is a readiness signal under the Weapon's rubric, so read "SHIP" as "commit, then apply W-1 to W-8 before launching the Gauntlet", not "launch as is".

## Scorecard

| Category | Status | Notes |
|---|---|---|
| Completeness | ⚠️ | All 26 intake items land in PRD-008 or the checklist. Gaps: no exact HighLevel ask for PRD-007 item 9 (W-6), partial ledger rows unaddressed (W-7), folder-move bookkeeping unowned (W-5). |
| Correctness | ⚠️ | 45 claims checked: 36 verified, 4 verified with a precision note, 4 inaccurate (PR #70 count, S-2 project, nonexistent e2e coverage, PR range), 1 unverified external claim (checklist D-2). |
| Alignment | ✅ | Schema v2 naming, header style, qa/ scaffold, relative links, and the dash rule all hold. One non-v2 folder (PRD-007 `reports/`) is a Suggestion (S-7). |
| Gaps | ⚠️ | Pull request timing and the base commit (W-1), Wave 1 file ownership (W-2), S-2 project (W-3), post-redraw changes (W-4). |
| Detrimental | ✅ | No secret, hidden Unicode, em or en dash, or broken link. One mis-placed section in the project map (S-8). |

## Critical Issues (must fix)

None.

## Warnings (should fix)

- [ ] **W-1. The scope contract does not say how PRD-008 reaches the run, and it opens the pull request after the checks that need it**

  Location: `prd-008-finish-line-hardening-index.md:129`, `:132`, `:159-160`; `prd-008a-...md:121`; `prd-008d-...md:54`.

  Two sequencing gaps in one contract. (a) The contract's Base is "origin/main at `131c7f4` or later", but PRD-008 exists only in the uncommitted worktree. A pull request from the authoring branch is docs-only and still fails the required check `Application verification` at `audit:dependencies` (`package.json:30,34`: `pnpm audit --audit-level=high`, 21 advisories today), the exact defect 008a fixes. The ruleset (`Repository hygiene baseline`) requires all four checks with `strict_required_status_checks_policy: true`; only the owner is a bypass actor. (b) `FLH-002` (four required checks on the final head), `008A-AC-007` (comment on PR #70 "linking the run's pull request"), and `008D-AC-009` (checks pass on the head that installs baselines) all need an open pull request, and `Preview smoke contract` runs only `if: github.event_name == 'pull_request'` (`.github/workflows/ci.yml:295-300`). The wave plan opens the PR last, after the close-out that must already see those results.

  ```text
  index:132  ... Open one pull request. Comment on PR #70 and close it as superseded once its group lands.
  index:159  W3 --> CO["Close-out: security-guardian then quality-guardian, opus"]
  index:160  CO --> SHIP["Ship: rebase, push, PR, CI green"]
  ```

  Suggested: (a) append to the Base row: "The base is the commit that carries PRD-008. The authoring pull request is docs-only and fails `Application verification` at `audit:dependencies` for the reason 008a fixes, so either the owner merges it with the ruleset bypass (checklist item 0.4) or the run branches from the authoring branch tip and ships the documents and the fix in one pull request. The run takes the second path unless 0.4 is marked done." Add checklist item 0.4 with the same wording. (b) Replace the Actions row's "Open one pull request" with "Open the pull request as a draft once Wave 1 is pushed, push every later wave to it, and dispatch `screen-baselines.yml` on its branch. `008A-AC-007` is verified at ship, after the pull request number exists." Fix the Mermaid so PR creation precedes `V1`.

- [ ] **W-2. "The four lanes touch disjoint files" is not true once documents and the ledger are counted**

  Location: `prd-008-finish-line-hardening-index.md:82-85`; `prd-008a-...md:119,151`; `prd-008b-...md:67,76-81`; `prd-008c-...md:52`.

  The disjointness claim lists code files only. `EXECUTION_LEDGER.md` is written by the dependency lane (`008A-AC-003` lists Low advisories there, `008A-AC-005` lists screenshot mismatches there), the code lane (`008a:151` amends the `CRR-075` criterion text), the orchestrator (`index:131`, the `FLR-` section), and Wave 2 (`008D-AC-005`). Concurrent edits to one table file conflict. Separately, `008B-AC-003` requires a new sentence ("no property photo is attached") that must pass the guard, and the sentence module is `apps/web/src/copy/user-language.ts`, which 008c lists as its file (`008c:52`) and 008b omits (`008b:76-81`). Both lanes would edit it.

  Suggested: add after `index:85`: "Wave 1 lanes do not edit `EXECUTION_LEDGER.md`. Each lane records its ledger content (advisory dispositions, screenshot mismatches by picture name, the `CRR-075` text change) in its lane report, and the orchestrator writes it. `apps/web/src/copy/user-language.ts` belongs to 008c. 008b puts its sentences in a new `apps/web/src/copy/campaign-image-messages.ts`, which the guard scans automatically because it sits under `apps/web/src/copy`." Add that file to `008b` Files expected.

- [ ] **W-3. 008D puts state S-2 in the wrong screenshot project, which would leave a "not photographed" cell in the sign-off**

  Location: `prd-008d-...md:31`, `:52`, `:59-62`.

  `008D-AC-007` captures S-1, S-2, and S-3 "in the review project". The sign-off row for S-2 is `| Campaigns list | empty | synthetic | not photographed (S-2) ...` (`docs/operations/evidence-packs/design-quality-signoff.md:68`), and its own follow-up reads "a named empty state in the synthetic screenshot suite" (`:255-258`; "The synthetic workspace always seeds campaigns"). A review-project capture leaves the synthetic cell as it is, so `008D-AC-010` ("No 'not photographed' ... cell remains") cannot pass without rewriting the sign-off's recorded shape.

  Suggested: edit `008D-AC-007` and the Scope line to: "S-1 and S-3 are captured in the review project (`tests/visual/screens/review/`); S-2 is captured in the synthetic project (`tests/visual/screens/chromium/`) from a fixture workspace with no campaigns, because the synthetic workspace always seeds campaigns. All three at 1440, 1180, 768, and 390, Light and Dark, axe zero violations." Add the synthetic capture spec to Files expected.

- [ ] **W-4. Nothing governs a fix that lands after the single baseline redraw and the re-signed sign-off**

  Location: `prd-008-finish-line-hardening-index.md:88`; `prd-008d-...md:50,55`; `prd-008e-...md:49`.

  The design is "redrawn exactly once, after every UI and dependency change" and re-signed in Wave 2 (`008D-AC-005`, `008D-AC-010`). `008E-AC-006` then requires every Critical, High, or Medium finding on the homeowner surfaces to be fixed "within this run, with a passing test", and the close-out audits can also cause fixes. Any of those can change rendered output after the redraw. `FSG-008` (`EXECUTION_LEDGER.md:595`), which this PRD closes on its own wording, says "the design sign-off is repeated after any fix either review causes". The PRD has no rule for it, so the run either violates "exactly once" or ships a stale sign-off.

  Suggested: add `008D-AC-011`: "A fix made after `008D-AC-005` that changes rendered output or dependencies re-opens `008D-AC-005` and `008D-AC-010` for the affected pictures only. The second dispatch's run ID is recorded in the ledger, and the sign-off is re-signed against the final commit." Change `index:88` to "exactly once for the Wave 1 change set, and again only under `008D-AC-011`".

- [ ] **W-5. The Phase 0 folder move and the exit move break links and leave lifecycle tables stale, and no criterion owns the repair**

  Location: `prd-008-finish-line-hardening-index.md:127`, `:135`; `finish-line-operator-checklist.md:5`; `prd-008e-...md:30-32,55`.

  The run moves the folder to `in-work/` as its first commit and to `completed/` at exit. Five edited or new files link to the `backlog/` path: the checklist (`:5`), `.cursor/rules/core/the-map.mdc` (the new "Remaining agent-executable work" bullet), `library/README.md` (the PRD-008 row, lifecycle "Backlog"), `library/requirements/backlog/README.md:31`, and `project-map.md` (the finish-line table). All break at the first commit. `library/requirements/in-work/README.md` lists PRD-001 to PRD-006 only (no PRD-007, and it will lack PRD-008), and the precedent for a moved PRD is a lineage row in the backlog README (`backlog/README.md:29-30` for PRD-005 and PRD-006). `008E-AC-011` and `008E-AC-012` do not cover any of this, and FLH-007 is about dashes only.

  Suggested: add `008E-AC-014`: "When PRD-008 changes lifecycle folder, every inbound link (`git grep prd-008-finish-line-hardening`) and lifecycle label resolves: the checklist, the terrain map, the project map, `library/README.md`, `library/requirements/in-work/README.md` (add PRD-008 and the missing PRD-007 entry), and `library/requirements/backlog/README.md` (convert the PRD-008 row to a lineage row like PRD-005 and PRD-006). A link check over the changed files finds none broken." Make the Phase 0 step in the scope contract cite it.

- [ ] **W-6. `008E-AC-007` needs "the exact operator ask from the operator checklist" for PRD-007 item 9, and the checklist does not contain one**

  Location: `finish-line-operator-checklist.md:44`; `prd-008e-...md:50`.

  Step 6 compresses PRD-007's configuration into "Set the RentCast key ... HighLevel delivery is a separate, further opt-in", with no variable name for the key and nothing for item 9. The source (`library/requirements/in-work/prd-007-homeowner-reports/reports/2026-09-24-final-completion-audit.md:63-68`) lists three asks: `OALO_RENTCAST_API_KEY` with `OALO_HOMEOWNER_ALLOWED_LOCATION_IDS`, `OALO_HOMEOWNER_MONTHLY_LOOKUP_LIMIT`, and enabling `OALO_HOMEOWNER_LIVE_DATA`; `OALO_RESEND_API_KEY` with `OALO_EMAIL_FROM`; and a tenant-matched `OALO_HOMEOWNER_GHL_CONNECTIONS_JSON` entry with location ID, access token, report-link field, and reviewed workflow. The third has no counterpart.

  Suggested: split step 6 into 6a (live valuations: name `OALO_RENTCAST_API_KEY` plus the three existing names) and 6b ("Optional HighLevel delivery, PRD-007 item 9: a tenant-matched `OALO_HOMEOWNER_GHL_CONNECTIONS_JSON` entry (location ID, report-link custom field, reviewed workflow; the access token goes only into the server-only secret store, never git or chat), then explicit delivery activation per `homeowner-avm-activation.md`. Return: yes or no per qualification check."). Point `008E-AC-007` at "step 6a or 6b" for items 007-2, 007-8, and 007-9.

- [ ] **W-7. `008E-AC-004`'s write-back rule skips seven DONE rows the QA tables mark PARTIAL, and it would re-verify an amended row against its old text**

  Location: `prd-008e-...md:47`; `prd-008a-...md:142,151`.

  The rule moves a DONE row to VERIFIED when "its 2026-09-21 quality audit records PASS" and names CRR-094, 167, 181, 184, and 096 separately. The two QA tables also mark `CRR-008` and `CRR-071` (`qa/2026-09-19-prd-005-qa-report.md`) and `CRR-099`, `CRR-130`, `CRR-145`, `CRR-169`, `CRR-188` (`qa/2026-09-19-prd-006-qa-report.md`) PARTIAL. All seven are DONE in the ledger. The causes were resolved afterwards (`EXECUTION_LEDGER.md:735`: "Full gate ALL GREEN on `347177e`", the four em dashes replaced, "the sixteenth allowlisted name recorded in PRD-006a"), but the AC does not say so, so they stay DONE and the ledger does not match what merged. Separately, `008A-AC-019` rewrites the `CRR-075` criterion text; writing back VERIFIED from the 2026-09-21 PASS would certify the old text.

  Suggested: append to `008E-AC-004`: "Each QA-PARTIAL DONE row (CRR-008, 071, 099, 130, 145, 169, 188) becomes VERIFIED only with the follow-up evidence that resolved its cause cited (`347177e` full gate for 008, 130, 169, 188; the ledger prose fix for 071 and 145; the PRD-006a amendment for 099). Otherwise it stays DONE with the reason. `CRR-075` is verified on `008A-AC-019`'s evidence, not the 2026-09-21 report."

- [ ] **W-8. `008A-AC-019` and D4 depend on "e2e-preview coverage" for `/api/version` that does not exist, and "to an unauthenticated caller" still implies a second body**

  Location: `prd-008a-...md:95-107`, `:142`; `prd-008-finish-line-hardening-index.md:185`.

  `tooling/tests/e2e-preview/` holds only `health-route.test.ts`; nothing there calls `/api/version`. The `CRR-075` evidence records the same finding ("the only e2e-preview file ... tests /api/health/live, not /api/version", `EXECUTION_LEDGER.md:486`). The real consumers are the two unit tests (both exist) and a manual `curl` at `docs/operations/cloud-environment-setup.md:155`, which reads no removed field. The AC's "updated in the same change" is vacuous for the nonexistent item. The security review's note 1 (CRR-075 and CRR-076 conflict) is fixed, but the phrase "to an unauthenticated caller" (`008a:99-100,142`; `index:185`) still implies an authenticated caller gets more, and `apps/web/src/app/api/version/route.ts:18` takes no request and resolves no principal. D4 also says "Amend it in PRD-005e's Amendments section", but `prd-005e-...md` has no such section (`005a`, `005c`, and the PRD-006 index do).

  Suggested: in D4, `008A-AC-019`, and `index:185`, replace "the e2e-preview coverage" with "the `docs/operations/cloud-environment-setup.md:155` smoke step and any step that reads the route", replace "to an unauthenticated caller" with "to every caller (the route takes no request and resolves no principal; add no authenticated variant)", and say "add an Amendments section to PRD-005e".

## Suggestions (consider improving)

- [ ] **S-1. The precedent migration changes the constraint name; copying its shape drops the wrong one.** Location: `prd-008a-...md:89`, `:128`. `supabase/migrations/20260919190000_verification_resend.sql:63-65` drops `auth_rate_limits_scope_check` and adds `auth_rate_limits_scope_ck`. The new migration must drop `auth_rate_limits_scope_ck`. Add one sentence to D2.
- [ ] **S-2. `008A-AC-023` says "every document" with no bound.** Location: `prd-008a-...md:146`. Ten tracked files mention `OALO_SELF_SERVE_SIGNUP`, including immutable QA records and the ledger. Define the set: "every file `git grep -l OALO_SELF_SERVE_SIGNUP` returns outside `qa/`, `reports/`, and `EXECUTION_LEDGER.md`".
- [ ] **S-3. State what the repository's release age is.** Location: `prd-008a-...md:81`, `:122`. `pnpm-workspace.yaml` sets no `minimumReleaseAge`; the effective value is pnpm 11's default of 1440 minutes (pnpm docs, "Default: 1440 (since v11)"), which resolves the security review's UNVERIFIED note. "Not lowered" then means no key is added. Also `pnpm-workspace.yaml:17-21` excludes `@trigger.dev/*@4.5.12` and `trigger.dev@4.5.12`; they go dead after the 4.6.4 bump in `008A-AC-004`, so name them in D1 for removal.
- [ ] **S-4. 008C's file path and the claim about the machine code.** Location: `prd-008c-...md:18-19`, `:44`. `use-home-workspace.ts` is `apps/web/src/features/homeowners/use-home-workspace.ts`, not under `server/`. It reads only `message` (`:61-70`), so the code is not rendered today; `008C-AC-004` is a regression guard, not a red-first fix. Say so and add the path to Files expected if it changes.
- [ ] **S-5. 008B Files expected omits two existing tests and one branch.** Location: `prd-008b-...md:76-81`. `apps/web/src/app/(authenticated)/marketing/campaigns/campaigns-review-surface.integration.test.tsx:17` imports the slug page and `review-navigation-paths.integration.test.tsx` references it; `008B-AC-008` changes review-mode behaviour, so both change. `brand/page.tsx:13` has a third branch, `canRenderDashboardPreview()`, that `008B-AC-007` should state is unchanged.
- [ ] **S-6. ID gap `008A-AC-009`.** Location: `prd-008a-...md:113-126`. IDs run 001 to 008, then 010. FLH-001 and the one-row-per-criterion ledger rule invite a count check; say the gap is intentional or renumber.
- [ ] **S-7. PRD-007 uses `reports/`, not Schema v2 `qa/`.** Location: `prd-008e-...md:49,63`; `library/README.md:25` ("a `qa/` directory"). `008E-AC-006` writes independent reviews into `reports/`, and `008E-AC-012` requires a drift check with "no legacy v1 path". State the decision: create `qa/` for the new reviews or declare `reports/` an accepted exception in the drift report.
- [ ] **S-8. The new project-map section orphans an existing paragraph.** Location: `library/knowledge/private/product/project-map.md:47-80` and `:82`. The "### September 30 finish-line split" H3 sits between the September 24 table and its closing "Operational detail ... PRD-007" paragraph, so that paragraph now reads as part of the split. Move the H3 below that paragraph, before "## Historical September 16 status snapshot".
- [ ] **S-9. `qa/README.md` intro is stale.** Location: `qa/README.md:3-5`. It says "Empty scaffold" and "No report exists until the audits run", yet two reports exist. Reword to "Scaffold. Authoring-time reviews are listed below; the close-out audits (FLH-003, FLH-004) are written at the end of the run."
- [ ] **S-10. Unverified external claim.** Location: `finish-line-operator-checklist.md:31`. "Changing it after a Test Link install means reinstalling." The HighLevel TestingApp page is silent on this (fetched 2026-09-30). Label it UNVERIFIED or delete the sentence.
- [ ] **S-11. "No deployment" versus push, and the house rule on mergeability.** Location: `index:40`, `:132`, `FLH-002`. A pushed branch gets a Vercel Preview build (security review I-1, not applied). Add "a Preview build triggered by a push is not a deployment this PRD performs". Add "the pull request reports `MERGEABLE` (`gh pr view --json mergeable`)" to FLH-002 per the global PR conflict rule.
- [ ] **S-12. Hidden credential prerequisites.** Location: `index:130-135`. Several criteria need `gh` authenticated with `repo` and `workflow` scope and push rights (push, PR, `screen-baselines.yml` dispatch, PR #70 comment and close). List them under "Local prerequisites" so Phase 0 detects a gap before Wave 2.
- [ ] **S-13. `NEXT_BATCH_LEDGER.md` Branch row is stale as well.** Location: `prd-008e-...md:54`; `NEXT_BATCH_LEDGER.md:7` reads "`main` at `f4b79f7`". `008E-AC-011` updates only "Current park". Include the Branch row.
- [ ] **S-14. "Six Low findings" versus seven Low rows.** Location: `prd-008a-...md:41-47`. The batch audit has six Low findings; the missing-header log is its Ruling 5 follow-up. Label that row "Ruling 5 follow-up" so the count reconciles with the index's "six".
- [ ] **S-15. Three miscounts in Background text.** (a) `index:29` and `008a:33`: PR #70's run `36447956877` fails four test cases from two test definitions (`design-quality.spec.ts:98` at "campaign-create at 390" in Light and Dark; `:323` "saving state" in Light and Dark), not "two screenshot comparisons". (b) `008d:26`: "four 'pass, asserted (A-1)' cells" is eight (steps 1 and 2, at 1180 and 390, in two themes; sign-off `:83-84`); the index's "two A-1 rows" is correct. (c) `index:15`: "PRs #54 to #58" includes #56, a docs PR (App Test maps); PRD-003 is #54, #55, #57, #58.
- [ ] **S-16. Line and wording precision.** `008a:44` the email-preview frame is `:94-99`, not `:94-97`; `008b:27` the guard at `campaign-approval-controls.tsx:129` is the conditional, the button text is `:150`; `008a:40-41` and D3 say the unknown-address path "returns with no round trip", but both paths await `lookupCredential`; the difference is the further `issueToken` round trip (`password-authentication-handler.ts:1046,1054`).
- [ ] **S-17. Cite QA findings by title.** Location: `index:32`, `008b:25`, `008e:44`. The PRD-006 QA warnings are unnumbered bullets and the labels W-2, W-3, and W-5 are used inconsistently inside that report, and "PRD-005 QA suggestion S-1" collides with the sign-off's S-1. Add the bullet title beside each label.
- [ ] **S-18. Goal wording and moving advisories.** Location: `index:46`, `008a:116`. The Goal says `--audit-level=moderate` "reports nothing" while `008A-AC-003` allows listed Lows. Advisories landed daily from 2026-09-28 to 2026-09-30, so say `008A-AC-003` is evaluated against the advisory database on the final head's day and that new advisories in that window are in scope.
- [ ] **S-19. Security Info carry-overs not applied.** Security review I-3 (a criterion that a throwing `issueToken` port logs no token material) and I-6 (checklist row 1 should add "do not paste the reset link"; row 7 should repeat the evidence pack's definition of sanitized). Optional.

## Prior-review fixes, verified

| Item from the security review | Landed | Evidence |
|---|---|---|
| L-1 stale overrides and release-age quarantine | Yes | `008a:74-81` (D1) names `fast-uri: 3.1.6`, both `brace-expansion` entries, and the four `minimumReleaseAgeExclude` entries; `008A-AC-008` (`:122`) makes it a criterion; exclusions must be exact-version and never lower the age. Entries match `pnpm-workspace.yaml:24,25,26,28,41,48,49`. |
| L-2 `x-vercel-forwarded-for` trust assumption | Yes | `008A-AC-016` (`:139`) requires the comment to say the order is correct for Vercel only. |
| L-3 sandbox fallback | Yes | `008A-AC-021` (`:144`): never `allow-scripts` with `allow-same-origin`. |
| L-4 change-password limit does not feed the lockout | Yes | New D1a (`:83-85`) states the trade and requires the ledger and the close-out security report to record it. |
| Note: `/api/version` versus `CRR-075` and `CRR-076` | Yes, with residue | D4 keeps `environment`, `buildId`, `commit`; `008A-AC-019` amends `005E-AC-003` and `CRR-075` and keeps `005E-AC-004` provable. Residue is W-8. |
| Note: stray backlog README row | Yes | `library/requirements/backlog/README.md:31` is now contiguous with the table (no blank line before it). |
| I-1, I-3, I-6 (Info) | No | Optional; S-11 and S-19. |

## Verified claims

Result key: VERIFIED, PRECISION (true with a wording note), INACCURATE, UNVERIFIED.

| # | Claim | Evidence | Result |
|---|---|---|---|
| V-01 | `main` is at `131c7f4` (PR #72) | `git ls-remote origin refs/heads/main` returns `131c7f42ff1c`; `git log` shows PR #72 | VERIFIED |
| V-02 | Canonical gate green at `131c7f4` on 2026-09-24, run `35972386828` | `gh run view`: Phase 0 CI, push, `success`, headSha `131c7f42...`, 2026-09-24T07:56Z | VERIFIED |
| V-03 | PR #67 `58d77fd`, #69 `da8dfb9`, #71 `042f4e8`, #72 `131c7f4` | `gh pr view` each MERGED with those merge commits | VERIFIED |
| V-04 | PRD-003 is "PRs #54 to #58" | #54, #55, #57, #58 are PRD-003; #56 is "docs: correct App Test maps" | INACCURATE (S-15c) |
| V-05 | `pnpm audit`: 21 advisories, 1 Critical, 6 High, 11 Moderate, 3 Low | `pnpm audit --json`: `{"low":3,"moderate":11,"high":6,"critical":1}`; every GHSA id in the 008a table present; ip-address and brace-expansion rows show the strictest range | VERIFIED |
| V-06 | Critical is GHSA-vcvr-r3jv-pc5j, `next >=16.2.0 <16.3.6`, `apps/web` direct, pinned `16.3.3` | audit JSON `critical, next, >=16.2.0 <16.3.6, >=16.3.6`, path `apps__web>next`; advisory published 2026-09-30T14:48Z (after the green run) | VERIFIED |
| V-07 | No `next/og`, `ImageResponse`, or OG, Twitter, icon route | `git grep -nE "next/og\|ImageResponse"` over `apps packages tooling tests supabase scripts` exits 1; no matching route file | VERIFIED |
| V-08 | Alerts #40 (fast-uri, High) and #42 (ip-address) open, transitive | `gh api dependabot/alerts/40,42`: `state open`, `relationship transitive` | VERIFIED |
| V-09 | `pnpm verify` runs `pnpm audit --audit-level=high`; CI has no path filter | `package.json:30,34`; `ci.yml:3-9` triggers `pull_request` to `main` with no `paths` | VERIFIED |
| V-10 | PR #70: 17 updates; AC-004 versions match | PR body table lists 17 distinct packages and every version in `008A-AC-004` | VERIFIED |
| V-11 | PR #70 "fails two screenshot comparisons ... `:98` and `:323`", run `36447956877` | Run failed; log shows `:98` "campaign-create at 390" Light and Dark and `:323` "saving state" Light and Dark, three attempts each | INACCURATE (S-15a) |
| V-12 | Stale overrides and exclusions D1 names | `pnpm-workspace.yaml:41` `brace-expansion: 5.0.8`, `:48` `fast-uri: 3.1.6`, `:49` range; `:24,25,26,28` exclusions | VERIFIED |
| V-13 | `catalog` and `catalogs` pin react, react-dom, zod, `@types/node` | `pnpm-workspace.yaml:5-13` | VERIFIED |
| V-14 | Handler anchors `:1470`, `:1011`, `:356`, `:364`; forgot-password asymmetry | `handleChangePassword` `:1470`; `handleForgotPassword` `:1011`; `clientAddressFor` `:356`; `console.warn` `:364`; `issueToken` awaited only on the known path `:1054` | PRECISION (S-16) |
| V-15 | Support modules import the seeding bridge | `password-authentication-support.ts:9`, `campaign-route-postgres-support.ts:18` end the `route-seeding-bridge.js` import | VERIFIED |
| V-16 | Approval retry (`:198`) precedes the role check (`:238`) | `campaign-approval-command.ts:198` `matchesExistingApproval`; role check begins `:237` | VERIFIED |
| V-17 | Fabricated approved image at `open-house-draft.ts:120-126`; preflight does not require an image | `:120-126` `asset_propertyPlaceholder001`, `approvalStatus: "approved"`; `campaign-foundation.ts:217-238` use `.some(...)` | VERIFIED |
| V-18 | Approval card: decision from props `:71-78`, only `setStatus` `:107`, send-back control | `campaign-approval-controls.tsx:71-78`, `:107`; guard `:129`, button text `:150`; review spec capture `:144` | PRECISION (S-16) |
| V-19 | `/brand` depends on `OALO_HOMEOWNER_REPORTS` | `brand/page.tsx:14-18`; a third `canRenderDashboardPreview()` branch at `:13` | VERIFIED (S-5) |
| V-20 | Demo slug page answers in review mode and nothing links to it | `.../synthetic-open-house-001/page.tsx` renders `ReviewNotConnectedScreen`; two existing tests import or name it | VERIFIED (S-5) |
| V-21 | `reporting.ts` exclusion at `forbidden-vocabulary.test.ts:95-97`; guard roots omit `server/homeowners` | exclusion path at `:95`; `SCANNED_ROOTS` `:43-50` | VERIFIED |
| V-22 | `runtime.ts:140`, `:154`; `http.ts:104-105`; `workspace-screen.tsx:310` strings | all four lines read as quoted; `forbidden-vocabulary.ts` holds neither "adapter" nor "origin" | VERIFIED |
| V-23 | `use-home-workspace.ts` (around line 68) is on the machine-code path | file is under `features/homeowners/`; `:61-70` reads only `message` | PRECISION (S-4) |
| V-24 | Homeowner migration: 7 tables, 4 definer functions, grants | `20260924010000_homeowner_reports.sql` tables at `:22,48,64,84,92,107,121`; functions `:8,155,168,187`; grants `:19-20,184-185,203-204`; force RLS loop `:141` | VERIFIED |
| V-25 | Newest migration has no pgTAP; others do | 10 migrations, 12 `*.pgtap.sql` files, none named for homeowner; runner auto-discovers (`run-real-database-tests.mjs:89`) | VERIFIED |
| V-26 | Sign-off: 24 "not photographed" cells over S-1 to S-3; reviewed `74999a8`; four A-1 cells | `design-quality-signoff.md:55,68,89` (3 rows x 8 cells), `:6`; A-1 is 8 cells (`:83-84`) | VERIFIED; A-1 count INACCURATE (S-15b) |
| V-27 | S-2 belongs to the review project | Sign-off row `:68` project is `synthetic`; follow-up `:255-258` names the synthetic suite | INACCURATE (W-3) |
| V-28 | `CRR-075` and `CRR-076` text; "e2e-preview coverage" for `/api/version` | `EXECUTION_LEDGER.md:486-487`; `tooling/tests/e2e-preview/` has only `health-route.test.ts` | INACCURATE (W-8) |
| V-29 | `CRR-094`, `167`, `181`, `184` DONE; `CRR-096` OPEN with OD-1 text | `EXECUTION_LEDGER.md:593,666,680,683,595`; `CRR-096` evidence states the fix-or-amend choice | VERIFIED |
| V-30 | Operator-blocked set `CRR-006`, `076` to `084`, `088` | Ledger has exactly 11 BLOCKED CRR rows with those ids, and one OPEN (`CRR-096`) | VERIFIED |
| V-31 | 28 `DEFERRED: LIVE HIGHLEVEL AUTH` rows; `GGL-B01` to `B14` BLOCKED | `EXECUTION_LEDGER.md:239` count 28; all 14 `GGL-B` rows BLOCKED | VERIFIED |
| V-32 | No PRD-007 ledger rows | `grep -c PRD-007 EXECUTION_LEDGER.md` returns 0 | VERIFIED |
| V-33 | 2026-09-21 audit: 76 of 88 and 94 of 100; PR #67 77.8 s versus 78.0 s | `EXECUTION_LEDGER.md:735`; PRD-006 QA `:78`; `guided-setup-timing.md:13` | VERIFIED |
| V-34 | PRD-007 reports say "No independent reviewer is claimed" (`:5`) and "not an independent certification" (`:7`) | read at those lines; final completion audit lists the three configuration asks `:63-68` | VERIFIED |
| V-35 | PRD-005 and PRD-006 sub-PRDs say Draft; supersession table "(OPEN)" for `CRR-037` to `046` | all nine sub-PRD status lines read `Draft`; `prd-006-...-index.md:105-116` | VERIFIED |
| V-36 | 004E: `001`, `002`, `007` reopened; `003` to `006`, `008` DONE; `009` BLOCKED; no 004E audit | `prd-004e-...md:50-58`; `prd-004-.../qa/` holds only the 004d reports | VERIFIED |
| V-37 | README describes a Phase 0 scaffold and "Not configured" production | `README.md:3,11,25-26` | VERIFIED |
| V-38 | Project map header v1.12 and changelog stops at v1.11; 24 directories lack READMEs (2026-09-16) | `project-map.md` header and changelog; drift report `:95` | VERIFIED |
| V-39 | Four required check names; `Preview smoke contract` is PR-only | ruleset `required_status_checks`; `ci.yml:295-300` | VERIFIED |
| V-40 | Node `24.18.0`, pnpm `11.15.1`; machine has Node 22.19.0 and no Docker engine | `.nvmrc`, `package.json:6-9`; `node --version`; `docker version` cannot reach the engine | VERIFIED |
| V-41 | Checklist: PRD-005e asks 1 to 5, D-3 listing values, D-4 Ruling 1, env names, nine-case matrix, Rulings 4 and 5, waves 2 to 7 | `prd-005e-...md:105-116`; `prd-004e-...md:82-84`; batch audit `:200-207,226-243,266`; `homeowner-avm-activation.md:41-44`; `g2-highlevel-app-test.md:62-75` (nine cases); `NEXT_BATCH_LEDGER.md:27-33` | VERIFIED |
| V-42 | Checklist D-2: changing the hostname after a Test Link install means reinstalling | HighLevel TestingApp page fetched 2026-09-30: not stated | UNVERIFIED (S-10) |
| V-43 | The release age is "the repository's" setting | Not set in `pnpm-workspace.yaml` or `.npmrc`; pnpm 11 default 1440 minutes (pnpm docs) | PRECISION (S-3) |
| V-44 | Link integrity | Node script over 9 new files and the added lines of 5 edited files: 0 broken | VERIFIED |
| V-45 | FLH-007: no U+2013 or U+2014 | Node scan of 9 new files and all added diff lines: 0 hits, 0 hidden Unicode; only non-ASCII is U+00B7 in the checklist header | VERIFIED |

## Plan Item Traceability

Rows map the product owner's intake list to where it landed. `FLH` and `008X-AC` ids are the criteria that close the item.

| # | Plan Requirement | Status | Implementation Location | Notes |
|---|---|---|---|---|
| T-01 | Dependency audit, 21 advisories | ✅ | `008a` AC-001 to AC-008, `FLH-003` | D1 handles overrides; S-3, S-18 |
| T-02 | PR #70 (Dependabot group) | ⚠️ | `008a` AC-004, AC-007 | AC-007 needs an open pull request (W-1) |
| T-03 | Two Medium batch-audit findings | ✅ | `008a` AC-010 to AC-015, OD-1 | S-1 on the constraint name |
| T-04 | Six Low batch-audit findings | ✅ | `008a` AC-016 to AC-022, OD-2 | S-14 on the count |
| T-05 | W-5 approve control after approval | ✅ | `008b` AC-004 to AC-006 | |
| T-06 | Fabricated placeholder image | ✅ | `008b` AC-001 to AC-003 | W-2 on the copy module |
| T-07 | `/brand` flag coupling | ✅ | `008b` AC-007 | S-5 |
| T-08 | `synthetic-open-house-001` slug | ✅ | `008b` AC-008 | S-5 |
| T-09 | Homeowner server strings, "adapter", `reporting.ts` exclusion | ✅ | `008c` AC-001 to AC-007 | S-4 |
| T-10 | Homeowner pgTAP | ✅ | `008d` AC-001 to AC-004 | |
| T-11 | S-1, S-2, S-3 and A-1 | ⚠️ | `008d` AC-007, AC-008, AC-010 | S-2 project (W-3) |
| T-12 | One baseline redraw, rubric review, re-signed sign-off | ⚠️ | `008d` AC-005, AC-006, AC-009, AC-010 | Post-redraw fixes (W-4) |
| T-13 | Stale Draft status lines and checkboxes | ✅ | `008e` AC-001 to AC-003 | |
| T-14 | Ledger write-back, PRD-007 section | ⚠️ | `008e` AC-004, AC-005, AC-007 | Partial rows (W-7); item 9 ask (W-6) |
| T-15 | PRD-007 independent review | ✅ | `008e` AC-006, AC-008 | W-4; S-7 on the `reports/` folder |
| T-16 | 004E re-audit | ✅ | `008e` AC-009 | |
| T-17 | README Phase 0 boundary | ✅ | `008e` AC-010 | |
| T-18 | Terrain map, project map, next-batch ledger | ✅ | `008e` AC-011 | S-13 |
| T-19 | Library hygiene and drift check | ⚠️ | `008e` AC-012 | Move bookkeeping unowned (W-5) |
| T-20 | PR #72 release record | ✅ | `008e` AC-008 | |
| T-21 | PRD-005e operator asks | ✅ | checklist D-1, step 2 | |
| T-22 | `GGL-B01` to `GGL-B14` | ✅ | checklist steps 3, 4, 5, 7, 9 | All 14 mapped |
| T-23 | PRD-007 RentCast, Resend, HighLevel | ⚠️ | checklist steps 1 and 6 | No item 9 ask (W-6) |
| T-24 | Wave 1 G2 App Test | ✅ | checklist step 7 | |
| T-25 | Credential-stuffing control | ✅ | checklist step 8; PRD-008 Non-Goal | |
| T-26 | Toolchain and Docker prerequisites | ✅ | checklist 0.1, 0.2; `index:130` | W-1 adds 0.4 |
| NG-1 | PRD-008 holds only in-repo agent work | ✅ | `index:40`, Non-Goals | No AC needs an operator, a provider, or a deploy; S-12 on `gh` credentials |
| NG-2 | Checklist holds only human-only work | ✅ | checklist header | |
| NG-3 | No criterion status changed by authoring | ✅ | `the-map.mdc`, `project-map.md` v1.13 | |
| NG-4 | No em or en dashes in added text | ✅ | V-45 | |

## Files Changed

- `.cursor/rules/core/the-map.mdc` (M): adds the "September 30, 2026 finish-line prep" section above the September 24 update (+10 lines)
- `library/README.md` (M): PRD-005 and PRD-006 rows corrected to merged; PRD-007 and PRD-008 rows added
- `library/knowledge/private/operations/README.md` (M): indexes the new checklist
- `library/knowledge/private/operations/finish-line-operator-checklist.md` (A): human-only items in dependency order (57 lines)
- `library/knowledge/private/product/project-map.md` (M): v1.13, "September 30 finish-line split" section, changelog entry
- `library/requirements/backlog/README.md` (M): PRD-008 row
- `library/requirements/backlog/prd-008-finish-line-hardening/prd-008-finish-line-hardening-index.md` (A): module index, FLH criteria, owner decisions, Gauntlet scope contract, wave plan
- `library/requirements/backlog/prd-008-finish-line-hardening/prd-008a-finish-line-hardening-security-and-dependency-closure.md` (A): dependency and security closure, 22 criteria
- `library/requirements/backlog/prd-008-finish-line-hardening/prd-008b-finish-line-hardening-product-correctness.md` (A): four product statements made true, 8 criteria
- `library/requirements/backlog/prd-008-finish-line-hardening/prd-008c-finish-line-hardening-user-language-completion.md` (A): guard reach and copy, 7 criteria
- `library/requirements/backlog/prd-008-finish-line-hardening/prd-008d-finish-line-hardening-verification-depth.md` (A): homeowner pgTAP, baselines, sign-off, 10 criteria
- `library/requirements/backlog/prd-008-finish-line-hardening/prd-008e-finish-line-hardening-records-and-independent-review.md` (A): records, PRD-007 review, 13 criteria
- `library/requirements/backlog/prd-008-finish-line-hardening/qa/2026-09-30-authoring-qa-report.md` (A): this report
- `library/requirements/backlog/prd-008-finish-line-hardening/qa/2026-09-30-authoring-security-review.md` (A): authoring-time security review (PASS)
- `library/requirements/backlog/prd-008-finish-line-hardening/qa/README.md` (A): scaffold and report index; this audit adds one row
