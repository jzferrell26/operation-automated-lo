# PRD-005d: Authenticated Review Runtime - Handoff Documentation Reconciliation

> **Parent:** [PRD-005](./prd-005-authenticated-review-runtime-index.md)
> **Status:** Draft
> **Priority:** P2 (completion review finding C3, execution and acceptance accuracy)
> **Schema changes:** None
> **Owner Guardians:** `library-guardian` (every document below), `technical-writing-craft-guardian` (writing review of the runbook and map diffs)

## Goal

Bring every handoff document into agreement with the authoritative ledger (`EXECUTION_LEDGER.md` rows `GGL-001` through `GGL-B16`) and PRD-004d, so the next agent or operator resumes from the real state: the Postgres gate is closed and verified, the runtime request wiring is not yet proven (C1), and the deployed browser proof and provider acceptance remain separate. Every changed line cites evidence. No acceptance status changes.

This sub-PRD is a plan to reconcile. It is not the reconciliation. Authoring it changed nothing in the documents it names.

## Background (honest)

Verified at `c140f11` on 2026-09-19. The authoritative state:

- `EXECUTION_LEDGER.md` row `GGL-B16` is **CLOSED**; rows `GGL-001` through `GGL-010` are **VERIFIED**; the raid log records CI run `35058370796` at head `dab2ec6` running both round trips green, and PR #65 merged as `c140f11` on 2026-09-16.
- PRD-004d's status line reads **Complete**: route R5 adopted, `GGL-008` and `GGL-009` VERIFIED, gate wired into `pnpm test:db`, "No operator action required". Its blockers table says none remain. The QA report and security audit for that gate exist at `library/requirements/in-work/prd-004-reviewable-go-live/qa/2026-09-16-ggl-b16-postgres-gate-qa-report.md` and `2026-09-16-ggl-b16-postgres-gate-security-audit.md`.
- The main CI run for `c140f11` is `35160226796`: Application verification, Real PostgreSQL migrations and pgTAP, and Release and recovery contract all succeeded; Preview smoke contract was skipped because that job runs only on pull requests (`.github/workflows/ci.yml`, `if: github.event_name == 'pull_request'`). The skip is by design and is not proof of the deployed journey.
- PR #66 is **CLOSED** unmerged (2026-09-18). It was a separate approach to the same gate and must not be reopened because a stale document still describes the gate as blocked.

The stale statements, each verified by opening the file:

| Document | Stale statement | Correct statement and evidence |
|---|---|---|
| `.cursor/rules/core/the-map.mdc`, "Current tip" | `main` tip (as of 2026-09-16): `deeb3e2` (PR #62) | `c140f11` (PR #65, 2026-09-16), preceded by `daa498e` (PR #64) and `86ef97d` (PR #63) |
| same, "Current tip" bullet 2 | rows `GGL-B01` through `GGL-B16` (blocked operator asks) | `GGL-B01` through `GGL-B15` blocked or accepted; `GGL-B16` CLOSED (CI run `35058370796`, `dab2ec6`, PR #65) |
| same, "Done" bullet on PRD-004a | `GGL-008`/`GGL-009` DONE (code), BLOCKED (automated gate) as `GGL-B16` | `GGL-008` and `GGL-009` VERIFIED in the canonical `pnpm test:db` gate (CI run `35058370796`) |
| same, "Pending / blocked" row "Real-Postgres CI gate (`GGL-B16`)" | Parked; "Last locally provable row"; pick route R1/R2 | Row removed or marked CLOSED with the run id; route R5 adopted (PRD-004d) |
| same, whole rule | no mention of C1 | Add: runtime request authentication is not composed on `main` (completion review C1); owned by PRD-005; the review URL denies until 005a and 005b merge |
| `library/knowledge/private/product/project-map.md` header | Version 1.10, status date 2026-09-16 | Version 1.11, status date the reconciliation date, changelog entry |
| same, "Status snapshot" Delivery row | `GGL-008`/`GGL-009` DONE (code), BLOCKED (automated gate) as `GGL-B16`, now owned by PRD-004d | VERIFIED (PR #65, `c140f11`, CI run `35058370796`); PRD-004d Complete |
| same, "Done (repository-proved)" item 8 | PRD-004d now owns `GGL-B16` (the last locally provable row) | PRD-004d closed `GGL-B16` on 2026-09-16 (PR #65) |
| same, "Pending (external / operator)" item 6 | `GGL-B16` real-Postgres command tests in canonical CI ... Needs one observed run or a provisioning-route decision | Item removed; replaced by a pending item for PRD-005 (C1 runtime composition, C2, C4) |
| same, "Parallel in-repo product activation" paragraph | `GGL-008`/`GGL-009` DONE (code), BLOCKED (automated gate) as `GGL-B16` | VERIFIED; and an honest sentence that the exported routes still compose synthetic ports by default (C1), owned by PRD-005 |
| `library/knowledge/private/operations/production-tonight-operator-runbook.md` header | Version 1.0 | Version 1.1, changelog entry |
| same, Step 7 | Optional: close the real-Postgres gate ... the three provisioning routes ... last locally provable row | Closed: `GGL-B16` CLOSED by PR #65 (`c140f11`), CI run `35058370796`; no operator action |
| same, "Status at a glance" row 7 | Tests exist; no observed run | Closed (CI run `35058370796`) |
| same, closing line | "Nothing in steps 1 to 7 requires new application code." | Replaced: step 2's create, reload, approve sequence requires PRD-005a and PRD-005b on the deployed SHA, because the default request composition on `c140f11` denies every non-synthetic session (completion review C1). Steps 1, 3, 4, 5, and 6 remain operator-only. |
| same, Step 1 | the remaining required `OALO_*` contract variables | Add the PRD-005 server-only names once they exist in `docs/production-environments.md`, by reference, not by list |
| PRD-004 index, sub-features table, 004d row | In work. Tests on `main`; no observed run; CI wiring parked as `GGL-B16` | Complete (PR #65, `c140f11`; CI run `35058370796`) |
| PRD-004 index, Status section, paragraph under the table | the create and approve round-trip tests exist on `main` but have never been executed, so `GGL-008`/`GGL-009` are DONE (code) and not VERIFIED | `GGL-008` and `GGL-009` VERIFIED in the canonical gate; the deployed navigate-and-reload proof remains `GGL-B01` through `GGL-B03` and is now sequenced behind PRD-005 |
| PRD-004 index, Status table, RGL-003 | BLOCKED: needs a review preview URL and `OALO_DATABASE_URL` | Unchanged status, with an added note: automated half VERIFIED (004d); deployed half additionally requires PRD-005a and 005b (C1) |
| PRD-004 index, Open questions | Which real-Postgres provisioning route closes `GGL-B16`? Routes R1 through R4 ... | Resolved: R5, recorded in PRD-004d |
| PRD-004 index, "Execute in order" paragraph | 004d needs a database URL or a provisioning route decision | 004d complete |
| `docs/operations/evidence-packs/reviewable-preview-smoke.md`, "Honest status" table | `GGL-008` / `GGL-009`: DONE (code) / BLOCKED (automated gate), parked as `GGL-B16`; run `pnpm --filter @oalo/db test:postgres` with `OALO_TEST_DATABASE_URL` | VERIFIED (CI run `35058370796`); reproduce with `pnpm test:db` (the gate provisions the disposable database itself) |
| same, header line | `main` at `f4b79f7` | `main` at `c140f11` |
| same, "Need from user before smoke" | four asks | Add the PRD-005 asks by reference to PRD-005e |
| `NEXT_BATCH_LEDGER.md` row 12 ("Current park") | Remaining work is operator-only | Remaining work is PRD-005 (C1, C2, C3, C4) plus the operator half; PRD-004d complete |
| same, row 67 (`library-guardian` PRD-004d) | Owns `GGL-B16`, the last locally provable row. Needs one observed run or a route decision (R1/R2) | Complete (PR #65); `library-guardian` now owns PRD-005d |
| `library/requirements/in-work/README.md` | lists 004a, 004b, 004c only | Add 004d **done** (PR #65, `c140f11`) and 004e content authored; pointer to PRD-005 in backlog |
| `library/README.md`, "PRD catalog" | lists PRD-001 and PRD-002 only | Add PRD-003 (In Work), PRD-004 (In Work), PRD-005 (Backlog) rows with one-line scopes |
| `library/requirements/backlog/README.md`, "Current backlog" | PRD-002 only, before this PRD was authored | PRD-005 row (added when this PRD was created; verify it is present) |

Mirror trees: `.claude/` does not exist in the repository at `c140f11`, and `.codex/` contains only `README.md` and `prompts/dungeon-master.md`, neither of which carries a copy of the terrain rule. `AGENTS.md` says the identical trees exist at `.claude/`; that sentence is also stale and is corrected in the same pass. No other mirror of `the-map.mdc` exists.

The four-way distinction that every changed line must preserve, in the review's words: domain and database proof (what `pnpm test:db` proves), runtime request wiring (what 005a and 005b add), deployed browser proof (what 005e records on a URL), and authorized provider acceptance (G2 through G7, untouched).

## Scope

- Edit exactly the documents in the table above, for exactly the statements listed, plus any other sentence in those files that repeats one of the stale claims verbatim.
- Add a changelog entry to the project map (v1.11) and the runbook (v1.1).
- Record PR #66's closed, unmerged status next to every citation of PR #65 so nobody reopens it.
- Add the PRD-005 pointer to the terrain rule, the project map, the in-work README, the library README catalog, and the batch ledger.
- Correct the `AGENTS.md` mirror-tree sentence.

## Non-Goals

- Changing any acceptance-criterion status in `PRODUCTION_EXECUTION_LEDGER.md`, any `DEFERRED: LIVE HIGHLEVEL AUTH` row, or any `GGL-*` row in `EXECUTION_LEDGER.md`. Documents move to match the ledger; the ledger does not move to match documents.
- Reopening G1, G4, or G8.
- Marking `RGL-003`, `004A-AC-004`, `004A-AC-005`, or `APA-*` parent exit as VERIFIED on a deployed URL. That is 005e's evidence to record, later.
- Rewriting prose outside the stale statements. Additive, surgical edits only.
- Editing `PRD-004d` itself. It is already correct and is the reference.

## Acceptance criteria

| ID | Criterion | Finding |
|---|---|---|
| 005D-AC-001 | `.cursor/rules/core/the-map.mdc` shows the current tip as `c140f11` (PR #65) or later, shows `GGL-B16` as CLOSED with CI run `35058370796` at `dab2ec6`, no longer contains the phrase "last locally provable row" or "pick route R1/R2", and carries a C1 sentence pointing at PRD-005; the absence of `.claude/` and of any terrain copy under `.codex/` is recorded in the PR description. | C3 |
| 005D-AC-002 | `project-map.md` is v1.11 with a changelog entry dated the reconciliation date; the Delivery row, Done item 8, Pending item 6, and the "Parallel in-repo product activation" paragraph read as the table specifies; the map states plainly that on `main` the exported campaign routes compose synthetic ports by default and that PRD-005 owns the fix. | C3 |
| 005D-AC-003 | The operator runbook is v1.1 with a changelog entry; Step 7 and status row 7 read Closed with the run id; the sentence "Nothing in steps 1 to 7 requires new application code" is gone and its replacement names PRD-005a and 005b as required for step 2; Steps 1, 3, 4, 5, and 6 are unchanged apart from the Step 1 reference to the new env names. | C3 |
| 005D-AC-004 | The PRD-004 index's 004d row reads Complete with PR and run id, the "never been executed" paragraph is replaced, the RGL-003 status keeps BLOCKED with the added note, the R1 through R4 open question is marked resolved by R5, and no other status cell in either table changes (proven by `git diff` showing only those hunks). | C3 |
| 005D-AC-005 | `reviewable-preview-smoke.md` shows `main` at `c140f11`, `GGL-008`/`GGL-009` VERIFIED with the run id, the reproduction command `pnpm test:db`, and a reference to PRD-005e's operator asks; the smoke checklist rows are unchanged. | C3 |
| 005D-AC-006 | `NEXT_BATCH_LEDGER.md` rows 12 and 67 read as the table specifies, and the ledger's own changelog table gains one dated row for this reconciliation. | C3 |
| 005D-AC-007 | `library/requirements/in-work/README.md` lists 004d done and 004e authored; `library/README.md` PRD catalog lists PRD-003, PRD-004, and PRD-005 with lifecycle; `library/requirements/backlog/README.md` lists PRD-005; `AGENTS.md` no longer claims a `.claude/` tree exists. | C3 |
| 005D-AC-008 | Every changed status statement across all files cites at least one of: a PR number, a commit SHA, or a CI run id; the PR description contains a table with one row per changed statement, its file, its evidence, and which of the four proof classes it belongs to. | C3 |
| 005D-AC-009 | `PRODUCTION_EXECUTION_LEDGER.md` is byte-identical to `c140f11`; no `DEFERRED: LIVE HIGHLEVEL AUTH` row, no `GGL-*` row, and no G1, G4, or G8 disposition changes; `git diff --stat c140f11` in the PR shows none of those files. | Constraint |
| 005D-AC-010 | No changed line claims a deployed browser proof, a Test Link result, or provider acceptance; every reconciled line that mentions `GGL-B01` through `GGL-B03` keeps them BLOCKED and sequences them behind PRD-005a and 005b. | C3 |
| 005D-AC-011 | PR #66 is described as closed and unmerged wherever PR #65 is cited as the gate's proof. | C3 |
| 005D-AC-012 | No em dash or en dash appears in any added line (scan of `git diff --diff-filter=AM` added lines for U+2014 and U+2013); relative links in every edited file resolve (a link check script run in the PR). | Constraint |
| 005D-AC-013 | `technical-writing-craft-guardian` reviews the runbook and terrain rule diffs for reader clarity and records no blocking finding; `security-guardian` then `quality-guardian` include these documents in the batch close-out. | Constraint |

## Files expected to change

- `.cursor/rules/core/the-map.mdc`
- `library/knowledge/private/product/project-map.md`
- `library/knowledge/private/operations/production-tonight-operator-runbook.md`
- `library/requirements/in-work/prd-004-reviewable-go-live/prd-004-reviewable-go-live-index.md`
- `docs/operations/evidence-packs/reviewable-preview-smoke.md`
- `NEXT_BATCH_LEDGER.md`
- `library/requirements/in-work/README.md`
- `library/README.md`
- `library/requirements/backlog/README.md` (verify the PRD-005 row)
- `AGENTS.md` (mirror-tree sentence only)

Not changed: `PRODUCTION_EXECUTION_LEDGER.md`, `EXECUTION_LEDGER.md` criterion rows (a raid-log entry for this batch is added by the orchestrator, not a row change), PRD-004a through 004e, PRD-003.

## Test plan

- **Link check:** a one-off script resolves every relative link in the edited files and fails on a missing target.
- **Dash scan:** `git diff c140f11 -- <files> | grep '^+' | grep -P '[\x{2013}\x{2014}]'` returns nothing.
- **Status-flip guard:** `git diff --stat c140f11 -- PRODUCTION_EXECUTION_LEDGER.md` is empty; `git diff c140f11 -- EXECUTION_LEDGER.md` touches only the raid log.
- **Evidence table:** the PR description's table is checked by `quality-guardian` against each cited PR, SHA, and run id using `gh pr view`, `git show`, and `gh run view`.
- No unit, integration, route, or browser tests: this sub-PRD changes no code.

## Security notes

- No secret, connection string, token, or PII may enter any of these files. The runbook's "Send back" lines already ask for names, not values; keep that shape.
- The reconciliation must not describe the review sign-in secret or seeded UUIDs as values; it references the env variable names only.

## Open questions

- [ ] Whether to record the PRD-005 batch in `EXECUTION_LEDGER.md` as a new raid section (the orchestrator's decision at raid start) or only in the raid log. Either is fine for this sub-PRD; the criterion is that GGL rows do not change.

## Exact operator ask

None.

## Blockers (honest)

| Blocker | Owner | Unblock |
|---|---|---|
| Must cite merged evidence for 005a, 005b, and 005c | Engineering | Land those sub-PRDs first; then reconcile in one PR |

## Related

- [PRD-004d: real-Postgres command gate](../../in-work/prd-004-reviewable-go-live/prd-004d-reviewable-go-live-postgres-command-gate.md) (the reference document)
- [PRD-004 index](../../in-work/prd-004-reviewable-go-live/prd-004-reviewable-go-live-index.md)
- [Go-live raid ledger](../../../../EXECUTION_LEDGER.md#gauntlet-raid-go-live-remaining-in-repo-code)
- [Production tonight operator runbook](../../../knowledge/private/operations/production-tonight-operator-runbook.md)
- [Project map](../../../knowledge/private/product/project-map.md)
- [Agent terrain map](../../../../.cursor/rules/core/the-map.mdc)
- [Reviewable preview smoke evidence pack](../../../../docs/operations/evidence-packs/reviewable-preview-smoke.md)
- [Next batch ledger](../../../../NEXT_BATCH_LEDGER.md)
- [2026-09-16 coverage report](../../reports/2026-09-16-production-tonight-requirements-coverage-report.md) (the last reconciliation, for the format of its coverage table)
- [GGL-B16 QA report](../../in-work/prd-004-reviewable-go-live/qa/2026-09-16-ggl-b16-postgres-gate-qa-report.md)
