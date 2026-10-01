# PRD-008e: Finish-Line Hardening - Records and Independent Review

> **Parent:** [PRD-008](./prd-008-finish-line-hardening-index.md)
> **Status:** Complete in draft pull request #74 (merge pending the owner). 10 of its 15 criteria are VERIFIED in `EXECUTION_LEDGER.md` (`FLR-057` to `FLR-070`, and `FLR-074` for `008E-AC-015`). Five close at ship. `008E-AC-004` (`FLR-060`): the write-back of the held `CRR` rows is done and waits for a re-check by a pass other than the orchestrator. `008E-AC-006`, `008E-AC-007`, and `008E-AC-010` (`FLR-062`, `FLR-063`, `FLR-066`): the close-out quality report records each as PASS, and the orchestrator writes the rows. `008E-AC-014` (`FLR-070`): the move of this folder to `completed/`.
> **Priority:** P1
> **Schema changes:** None
> **Owner Guardians:** `library-guardian` (reconciliation, ledger, maps, README, library hygiene); `security-guardian` then `quality-guardian` (the PRD-007 independent review and the 004E re-audit)

## Goal

Make every status line, ledger cell, and map entry in the repository match what actually merged. Give PRD-007 the independent security and quality review it was released without. Leave the agent terrain map pointing at the true remaining work.

## Background (honest)

- **Stale status lines.** The sub-PRDs 005a to 005e and 006a to 006d still say "Draft", although their work merged in PR #67 (`58d77fd`). The PRD-006 index supersession table (around lines 109-116) labels `CRR-037` to `CRR-046` "(OPEN)", but the ledger records them DONE. Many open-question checkboxes in the PRD-005 and PRD-006 indexes and sub-PRDs were answered by amendments, security Rulings 2, 4 and 6, or merged code, but were never ticked.
- **Ledger cells.** The `CRR` tables in `EXECUTION_LEDGER.md` use DONE, OPEN, BLOCKED, and ACCEPTED CONSTRAINT. The 2026-09-21 quality audit verified 76 of 88 PRD-005 rows and 94 of 100 PRD-006 rows, but its results were never written back into the row cells. No ledger row exists for PRD-007.
- **PRD-007 has no independent review.** Its own reports say "No independent reviewer is claimed" (`reports/2026-09-24-security-review.md:5`) and "not an independent certification" (`reports/2026-09-24-quality-review.md:7`). `reports/2026-09-24-final-completion-audit.md` still lists "Complete CI and production deployment remain the final release actions".
- **The PR #72 release.** The post-merge canonical gate on `131c7f4` passed (run `35972386828`, 2026-09-24). Nothing in the repository records that, or the production deployment state of that commit.
- **PRD-004e.** `004E-AC-001`, `002`, and `007` were reopened, then remediated, and are "awaiting re-audit". `004E-AC-003` to `006` and `008` are DONE but not VERIFIED.
- **The README** still describes "an evidence-producing scaffold, not a production-ready campaign application" and says production "Not configured". A hosted, authenticated app now serves real sign-ups against a dedicated Supabase project. Campaign provider traffic is still disabled.
- **The maps.** The agent terrain map and the project map still carry the full September 16 checkpoint text next to the September 24 update. The project map header reads v1.12, but its changelog stops at v1.11.
- **Library hygiene.** The 2026-09-16 drift check found 24 library directories without a seeded `README.md`.

## Scope

- Status lines and checkboxes in `library/requirements/in-work/prd-005-*`, `prd-006-*`, `prd-004-*`, and `prd-007-*`.
- `EXECUTION_LEDGER.md`: write-back, a PRD-007 section, and the PRD-008 section's final state.
- PRD-007's `reports/` folder: the independent reviews and the release record.
- PRD-004's `qa/` folder: the 004E re-audit.
- `README.md`, `.cursor/rules/core/the-map.mdc`, `library/knowledge/private/product/project-map.md`, and `NEXT_BATCH_LEDGER.md`.
- Seeded `README.md` files for library directories that lack one.
- [`finish-line-operator-checklist.md`](../../../knowledge/private/operations/finish-line-operator-checklist.md): its status column.

## Non-Goals

- Changing any operator-blocked, deferred, or accepted-constraint row (FLH-006).
- Moving PRD-001, 003, 004, 005, 006, or 007 to `completed/`.
- Editing merged pull request bodies. Corrections are recorded in the ledger.

## Acceptance criteria

| ID | Criterion |
|---|---|
| 008E-AC-001 | Every PRD-005 and PRD-006 sub-PRD status line states its real state, citing PR #67 (`58d77fd`). Where an operator-blocked row keeps a sub-PRD open, the status line names that row. Both indexes stay "In Work", with a one-line reason naming the operator-blocked rows. |
| 008E-AC-002 | The PRD-006 index supersession table agrees with `EXECUTION_LEDGER.md` for every row it lists. |
| 008E-AC-003 | Every open-question checkbox in the PRD-005 and PRD-006 indexes and sub-PRDs is either ticked with a citation to the amendment, Ruling, or merged code that answered it, or left unticked. Each unticked question that needs the owner is listed in the operator checklist. |
| 008E-AC-004 | Every `CRR` row marked DONE whose 2026-09-21 quality audit records PASS becomes VERIFIED, citing that report. `CRR-094`, `CRR-167`, `CRR-181`, and `CRR-184` become VERIFIED only on 008d's cited evidence. `CRR-096` (`FSG-008`) becomes VERIFIED citing the close-out security report's zero-Medium result (FLH-003). Seven DONE rows the QA tables mark PARTIAL (`CRR-008`, `071`, `099`, `130`, `145`, `169`, `188`) become VERIFIED only when the follow-up evidence that resolved their cause is cited: the `347177e` full gate for 008, 130, 169, and 188; the ledger prose fix for 071 and 145; the PRD-006a amendment for 099. Otherwise each stays DONE, with the reason stated. `CRR-075` is verified on `008A-AC-019`'s evidence, not the 2026-09-21 report. Every operator-blocked row is unchanged. |
| 008E-AC-005 | The PRD-005 QA report's first suggestion, the `006A-AC-027` wording (not the design sign-off's state S-1), is applied. The PR #67 timing discrepancy (77.8 s in the body, 78.0 s in the evidence file) is recorded as a correction in the ledger. |
| 008E-AC-006 | `security-guardian` audits PRD-007's homeowner report and authenticated-page surfaces on the tree after 008c, and then `quality-guardian` audits them against PRD-007's ten acceptance items. Both reports are written to PRD-007's `reports/` folder, where that PRD keeps its evidence, and each states that it is independent of the implementing session. 008E-AC-012's drift report records PRD-007's `reports/` folder as an accepted exception to the Schema v2 `qa/` convention. Every Critical, High, or Medium finding is fixed within this run, with a passing test. |
| 008E-AC-007 | `EXECUTION_LEDGER.md` gains a PRD-007 section with one row per acceptance item. Items the independent quality review passes are VERIFIED. Items that need live configuration (007-2, 007-8, and 007-9 as "awaiting configuration") are BLOCKED, each with the exact operator ask from operator checklist step 6a (live valuations) or 6b (HighLevel delivery). |
| 008E-AC-008 | PRD-007's final completion audit records the post-merge canonical gate for `131c7f4` (run `35972386828`). It also records the production deployment state of `131c7f4`, read only from GitHub commit statuses or deployments. If that state cannot be determined there, the audit says so and the operator checklist carries the ask. |
| 008E-AC-009 | `quality-guardian` re-audits `004E-AC-001`, `002`, and `007`, and verifies `004E-AC-003` to `006` and `008` against the claim audit in `marketplace-listing-copy-pack.md`. The result is in PRD-004's `qa/` folder and the PRD-004e status lines match it. `004E-AC-009` stays BLOCKED. |
| 008E-AC-010 | The README "Phase 0 boundary" and "Where it runs" sections describe the current truth. They cover the hosted authenticated app and its database project, what is activated (sign-up, password sessions, workspace, homeowner reports with live lookups off), and what is not (HighLevel, Meta, Stripe, RentCast live data, lead routing, production campaign traffic). Each gate statement keeps its current status, and the sections link the operator checklist. |
| 008E-AC-011 | The agent terrain map's "Current tip" states the PRD-008 result and points at the operator checklist as the remaining work. The September 16 checkpoint is reduced to a short pointer under a heading that marks it historical. The project map gains a version and changelog entry for this PRD, adds the missing v1.12 entry, and its "Prioritized next steps" point at the checklist. The "Branch" and "Current park" rows in `NEXT_BATCH_LEDGER.md` agree with it; the "Branch" row still reads "`main` at `f4b79f7`". |
| 008E-AC-012 | A read-only drift check over `library/` is recorded in `library/requirements/reports/`. Every directory it finds without a `README.md` gets a seeded README stating the directory's purpose. The drift check finds no legacy v1 path, invalid PRD name, or duplicate PRD number. |
| 008E-AC-013 | The operator checklist's status column is updated with the run's results, including any ask added by 008E-AC-003 or 008E-AC-008. |
| 008E-AC-014 | Each time PRD-008 changes lifecycle folder (Phase 0 to `in-work/`, and to `completed/` at exit), every inbound link (`git grep -n prd-008-finish-line-hardening`) and lifecycle label resolves in the same commit. That covers the operator checklist, the terrain map, the project map, `library/README.md`, `library/requirements/in-work/README.md` (add PRD-008 and the missing PRD-007 entry), and `library/requirements/backlog/README.md` (convert the PRD-008 row to a lineage row, like PRD-005 and PRD-006). A relative-link check over the changed files finds none broken. |
| 008E-AC-015 | `library/knowledge/private/standards/user-language-contract.md` matches the guard 008c extended. Section 3 lists "adapter" and "origin". The section on how the automated guard reads the table describes the administrator-instruction phrase rule and the user-facing error classes (`USER_FACING_ERRORS`, including `HomeownerError`). The guard row in section 8 names the phrase rule. (Added 2026-10-01 from the 008c verifier finding; section 8 says the document wins over the guard, so the drift must close.) |

## Files expected to change

- `library/requirements/in-work/prd-005-authenticated-review-runtime/**` (status lines, checkboxes)
- `library/requirements/in-work/prd-006-first-party-sign-in-and-guided-experience/**` (status lines, supersession table, checkboxes)
- `library/requirements/in-work/prd-004-reviewable-go-live/prd-004e-*.md` and `qa/`
- `library/requirements/in-work/prd-007-homeowner-reports/reports/**`
- `EXECUTION_LEDGER.md`, `NEXT_BATCH_LEDGER.md`
- `README.md`, `.cursor/rules/core/the-map.mdc`, `library/knowledge/private/product/project-map.md`
- `library/knowledge/private/operations/finish-line-operator-checklist.md`
- New `README.md` files under `library/`
- `library/requirements/in-work/README.md` and `library/requirements/backlog/README.md` (lifecycle rows)
- `library/requirements/reports/<date>-library-drift-report.md` (new)

## Test plan

- Documentation only, apart from fixes that 008E-AC-006 requires. For each fix: a passing test, then `pnpm verify` and `pnpm test:db`.
- The ledger write-back is checked by a second pass that samples at least 20 changed rows against the cited report lines.

## Open questions

- [ ] None blocking.

## Related

- [PRD-005 QA report](../../in-work/prd-005-authenticated-review-runtime/qa/2026-09-19-prd-005-qa-report.md)
- [PRD-006 QA report](../../in-work/prd-006-first-party-sign-in-and-guided-experience/qa/2026-09-19-prd-006-qa-report.md)
- [PRD-007 reports](../../in-work/prd-007-homeowner-reports/reports/)
- [Production-tonight requirements coverage report](../../reports/2026-09-16-production-tonight-requirements-coverage-report.md)
