# PRD-008d: Finish-Line Hardening - Verification Depth

> **Parent:** [PRD-008](./prd-008-finish-line-hardening-index.md)
> **Status:** Complete in draft pull request #74 (merge pending the owner). All 11 criteria are VERIFIED in `EXECUTION_LEDGER.md` (`FLR-046` to `FLR-056`): the homeowner pgTAP suite, the baseline redraws (the installed set is screen-baselines run `36844271868`, commit `cad9bf6`), the three named states and the A-1 rows, and the design sign-off re-signed against `cad9bf6`.
> **Priority:** P1
> **Schema changes:** None (adds a pgTAP suite)
> **Owner Guardians:** `db-guardian` (the pgTAP suite), `ux-ui-guardian` (the baseline redraw, the missing states, and the re-signed sign-off)

## Goal

Every migration has its own pgTAP suite. Every named design state has a photographed baseline and a signed pass on the final tree. The screenshot baselines are redrawn exactly once, after every UI and dependency change in this PRD, with each changed picture judged against the rubric.

## Background (honest)

1. **No pgTAP suite for the newest migration.** `supabase/migrations/20260924010000_homeowner_reports.sql` adds seven tables with forced row-level security: `homeowner.properties`, `reports`, `lookup_requests`, `usage_events`, `shares`, `events`, `deliveries`. It also adds four `security definer` functions:
   - `homeowner.allowed(uuid, boolean)`, granted to `app_runtime`;
   - `read_shared_report(text)` and `record_shared_event(text, text, uuid)`, granted to `app_runtime`;
   - `claim_due_properties(integer)`, granted to `scheduler_runtime` only.

   Each of the other nine migrations has pgTAP coverage. This one has none. `apps/web/src/server/homeowners/repository.postgres.test.ts` covers forced row-level security, denied public execution, and tenant isolation at the route level. Nothing tests the share functions' behaviour in SQL, or that only `scheduler_runtime` can claim due properties.
2. **Unphotographed design states.** [`design-quality-signoff.md`](../../../../docs/operations/evidence-packs/design-quality-signoff.md) has 24 "not photographed" cells across three named states:
   - S-1: Verify email, confirmed.
   - S-2: Campaigns list, empty.
   - S-3: Guided setup step 5, read the result, needs changes.

   It also has eight "pass, asserted (A-1)" cells: guided setup steps 1 and 2, at 1180 and 390, in both themes (`:83-84`).

   S-1 and S-3 belong to the review project. S-2 belongs to the synthetic project: the sign-off row is `synthetic` (`:68`), and its follow-up asks for "a named empty state in the synthetic screenshot suite" (`:255-258`), because the synthetic workspace always seeds campaigns. The sign-off reviewed `74999a8` rather than the final tree. These gaps keep `FSG-006`, `006C-AC-020`, `006D-AC-012`, and `006D-AC-015` partial in the [PRD-006 QA report](../../in-work/prd-006-first-party-sign-in-and-guided-experience/qa/2026-09-19-prd-006-qa-report.md).
3. **Baselines must move.** The PR #70 dependency group (landed by 008a) fails two screenshot comparisons. 008b changes the approval card and the image summary, and 008c changes homeowner copy. Baselines are drawn only on the comparing platform, the `ubuntu-24.04` runner, by `.github/workflows/screen-baselines.yml`. That workflow commits nothing: a person or agent downloads its artifacts into `tests/visual/screens/`, reviews each changed picture, and commits with the "Baseline change:" note that 006D-AC-013 requires.

## Scope

- `supabase/tests/homeowner_reports.pgtap.sql` (new).
- The review-project capture specs for S-1, S-3, and A-1, and a synthetic-project capture spec for S-2 that uses a fixture workspace with no campaigns.
- `tests/visual/screens/**`.
- `docs/operations/evidence-packs/design-quality-signoff.md`.

## Non-Goals

- Any schema change.
- Changing the rubric, the frames, or the comparison thresholds.
- Redrawing any baseline before every Wave 1 criterion is VERIFIED.

## Acceptance criteria

| ID | Criterion |
|---|---|
| 008D-AC-001 | `supabase/tests/homeowner_reports.pgtap.sql` runs in `pnpm test:db`. It proves that each of the seven `homeowner` tables has row-level security enabled and forced. |
| 008D-AC-002 | The suite proves tenant isolation on every homeowner table under `app_runtime` with `platform.set_app_context`. One location's context reads and writes none of another location's rows. Support roles and unrelated collaborator roles read no homeowner financial data (PRD-007 acceptance 1). |
| 008D-AC-003 | The suite proves `read_shared_report` returns the intended report for a valid share secret. It returns nothing for an expired, revoked, or unknown secret, and never returns another report. `record_shared_event` records nothing for an expired, revoked, or unknown secret. |
| 008D-AC-004 | The suite proves `claim_due_properties` can be executed by `scheduler_runtime` and is refused for `app_runtime`, `anon`, `authenticated`, and `public`. It also proves `homeowner.allowed` behaves as the migration's grants and comments state. |
| 008D-AC-005 | Every Wave 1 criterion is VERIFIED before `screen-baselines.yml` is dispatched. It is dispatched exactly once on the run branch for the Wave 1 change set (any later dispatch happens only under 008D-AC-011). The run ID is recorded in the ledger. |
| 008D-AC-006 | `ux-ui-guardian` reviews every picture that changed against `library/knowledge/private/ux-ui/06-review-rubric.md`. It attributes each change to its cause (the dependency group, 008b, or 008c) and records the result in PRD-008's `qa/` folder. Any picture that falls below the top score on an axis is a defect, fixed before the baselines are committed. |
| 008D-AC-007 | Baselines exist and are compared for S-1, S-2, and S-3 at 1440, 1180, 768, and 390 in Light and Dark, with axe reporting zero violations on each. S-1 (fresh verification token) and S-3 (a draft that fails one rule) are captured in the review project, in `tests/visual/screens/review/`. S-2 is captured in the synthetic project, in `tests/visual/screens/chromium/`, from a fixture workspace with no campaigns. |
| 008D-AC-008 | Guided setup steps 1 and 2 at 1180 and 390, in both themes, are photographed and compared, not asserted. |
| 008D-AC-009 | The committed baselines carry the "Baseline change:" note that 006D-AC-013 requires. The `Application verification` and `Real PostgreSQL migrations and pgTAP` checks pass on the head that installs them. |
| 008D-AC-010 | `design-quality-signoff.md` is re-signed against the final tree's commit. No "not photographed" or "asserted" cell remains. Every cell records a pass on every axis. The rows for the approval card after a decision (008b) and every homeowner screen whose copy 008c changed are re-scored. |
| 008D-AC-011 | Any fix made after 008D-AC-005 that changes rendered output or dependencies, including a fix caused by 008E-AC-006 or by the close-out audits, re-opens 008D-AC-005 and 008D-AC-010 for the affected pictures only. The second dispatch's run ID is recorded in the ledger, and the sign-off is re-signed against the final commit. This follows `FSG-008`'s rule that the design sign-off is repeated after any fix a review causes. |

## Files expected to change

- `supabase/tests/homeowner_reports.pgtap.sql` (new)
- `tests/browser/review/**` capture specs for S-1, S-3, and A-1
- The synthetic-project capture spec and fixture for S-2 (under `tests/browser/`, next to `design-quality.spec.ts`)
- `tests/visual/screens/chromium/**` and `tests/visual/screens/review/**`
- `docs/operations/evidence-packs/design-quality-signoff.md`

## Test plan

- **pgTAP** (`pnpm test:db`): 008D-AC-001 to 008D-AC-004.
- **Browser and visual** (CI on the run branch, after the redraw): 008D-AC-007 to 008D-AC-009.
- **Review:** `ux-ui-guardian`'s scored review and the re-signed sign-off (008D-AC-006, 008D-AC-010).

## Security notes

- Every capture uses synthetic data or the seeded review people only. Screenshots that come from a deployed URL stay outside git, per the sign-off's existing retention statement.
- The pgTAP suite creates its fixtures inside its own transaction and rolls back, as the other suites do.

## Open questions

- [ ] None blocking.

## Related

- [PRD-006d design quality bar](../../in-work/prd-006-first-party-sign-in-and-guided-experience/prd-006d-first-party-sign-in-and-guided-experience-design-quality-bar.md)
- [`tests/visual/screens/README.md`](../../../../tests/visual/screens/README.md)
- [PRD-007 index](../../in-work/prd-007-homeowner-reports/prd-007-homeowner-reports-index.md)

## Amendments

- **2026-10-01, how 008D-AC-005's precondition applies to four close-out criteria.** 008D-AC-005 asks that every Wave 1 criterion is VERIFIED before `screen-baselines.yml` is dispatched. Four Wave 1 criteria have a closing event that this PRD itself places after the dispatch:
  - 008A-AC-003: the audit is re-run on the final head.
  - 008A-AC-007: PR #70 is commented on and closed at ship.
  - 008A-AC-015 and 008A-AC-022: each is recorded by the FLH-003 security report.

  At the first dispatch (run 36823126319, 2026-10-01T06:07:26Z) each of the four had its implementation verified by a separate pass, and each waited only on its closing event (ledger rows FLR-010, FLR-014, FLR-021 and FLR-028). None of them changes rendered output. Every other Wave 1 criterion was VERIFIED. The precondition is read as applying to every Wave 1 criterion except those closing events. The independent verifier of 008D-AC-005 found this gap between the criterion's text and the run's order, and recommended recording it rather than redrawing.
- **2026-10-01, where the redraws ran.** All three dispatches ran on the lane branch `gauntlet/008d-baselines`, which was cut from the integrated run tree `0cf31ab` and merged into `claude/gauntlet-prd-008` at `9b25e97`. The rendered code at the lane head equals the run head. The intent of "on the run branch" is one redraw of the run's code, and that is what happened. The three later dispatches under 008D-AC-011 (runs 36838168997, 36841695906 and 36844271868, for the D-009 and D-010 fix and review fixes R-14 to R-21) ran on the lane branch `gauntlet/008d-fix`, cut from the run branch at `814939f` and merged at `2f50b96`, on the same terms.
