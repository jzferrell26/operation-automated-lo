# Operation Automated LO Library Schema v2 Raid Ledger

## Raid contract

- Branch: `cursor/library-schema-v2-raid-cf67`
- Baseline: `cfcb41d426a477b62bb62fec4b9fe38f2b6d8460` on `cursor/pull-dm-skills-cf67` (dm-skills harness import), itself based on `origin/main` at `e3e15b2b11ed7f3546faf8cfc92ccb928daad3ff`
- Started: 2026-07-25
- Scope authority: librarian sync-audit questions from the dm-skills import session; `library-guardian` + `library-weapon` guide 06; Schema v2 path conventions in `.cursor/skills/library-weapon/SKILL.md`
- Authorized scope: documentation lifecycle only under `library/`, plus root ledger and README path repairs required by moves. No application code, package, CI, Supabase, provider, or production-traffic changes.
- Prohibited scope: inventing IRDs without GitHub issues; writing under `library/notes/` content (scaffold README seed only); rewriting QA report *findings* (move/rename and path updates only; authorship remains `quality-guardian` / `security-guardian`); closing G1 through G7; treating G8 as `PASS`.
- Status flow: `OPEN` -> `IN PROGRESS` -> `DONE` -> independently `VERIFIED`
- Completion rule: every LSV2 criterion must reach independent `VERIFIED` with path and link evidence. No partial credit for "mostly migrated."
- Close-out order: armed `security-guardian`, then armed `quality-guardian` (never reverse).

## Librarian decisions locked by this raid

This raid authorizes the affirmative answer to all five librarian questions from the 2026-07-25 sync audit:

| # | Question | Raid decision |
| --- | --- | --- |
| 1 | Full Schema v2 migrate now, or README-only first? | **Full migrate now.** Scaffold `library/issues/` and `library/notes/`; retire `library/knowledge-base/`, `library/qa/`, and `library/requirements/issues/`. |
| 2 | Move PRD-001 to `requirements/in-work/` now? | **Yes.** Move the entire PRD-001 folder. Status text becomes In Work; production traffic remains blocked on G1 through G7. |
| 3 | Home for `library/discovery/`? | **`library/knowledge/private/discovery/`.** Keep package contents; do not merge into `research/`. |
| 4 | Migrate PRD-001 `reports/` to `qa/` in the same pass? | **Yes, same pass.** Move all authored reports into `qa/`; remove empty `reports/`. Create empty `qa/` on PRD-002. |
| 5 | Delete or deprecate `library/knowledge-base/ai/README.md`? | **Delete** after confirming `library/knowledge/private/ai/` remains the source of truth and inbound links are repaired or removed. |

## Inventory at raid start

| Legacy or missing path | Contents / note |
| --- | --- |
| `library/knowledge-base/` | One file: `ai/README.md` (stale index into private AI docs and backlog PRD paths) |
| `library/qa/` | README plus design-system, discovery, and security standalone reports (7 markdown files under subfolders) |
| `library/requirements/issues/` | README only; v1 location |
| `library/discovery/` | G8 demand package: README, desired outcome, OST, assumption map, experiment, interview script, evidence register |
| `library/requirements/backlog/prd-001-operation-automated-lo/reports/` | 20 authored security/quality reports |
| `library/issues/` | Missing |
| `library/notes/` | Missing |
| `library/requirements/backlog/prd-001-operation-automated-lo/qa/` | Missing |
| `library/requirements/backlog/prd-002-operation-automated-lo-add-ons/qa/` | Missing |

Known inbound path references (non-exhaustive; Wave 3 must grep clean): `library/README.md`, root `README.md`, `PRODUCTION_EXECUTION_LEDGER.md`, architecture and competitive knowledge docs, and several report cross-links inside PRD-001 `reports/` and `library/qa/`.

## Acceptance-criteria ledger

| ID | Decision | Exact completion criterion | Dependencies | Owning Guardian | Model | Status | Verification evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LSV2-001 | 1 | Scaffold `library/issues/{backlog,in-work,completed}/` with Schema v2 README seeds from `library-weapon/templates/issues*.md`. | None | `library-guardian` | cursor-grok-4.5-high | OPEN | |
| LSV2-002 | 1 | Scaffold `library/notes/` with the human-only README seed from `library-weapon/templates/notes-README.md`. Agents create no other notes content. | None | `library-guardian` | cursor-grok-4.5-high | OPEN | |
| LSV2-003 | 1 | Ensure `library/requirements/reports/` has a Schema v2 README seed if missing. Do not delete existing cross-cutting reports already there. | None | `library-guardian` | cursor-grok-4.5-high | OPEN | |
| LSV2-004 | 3 | Move the entire `library/discovery/` tree to `library/knowledge/private/discovery/` with `git mv` (or equivalent history-preserving moves). Update internal relative links inside the moved package so the Active cycle still resolves. | None | `library-guardian` | cursor-grok-4.5-high | OPEN | |
| LSV2-005 | 3 | After LSV2-004, `library/discovery/` no longer exists. Root and knowledge catalog links point at `knowledge/private/discovery/`. | LSV2-004 | `library-guardian` | cursor-grok-4.5-high | OPEN | |
| LSV2-006 | 1, 5 | Confirm `library/knowledge/private/ai/` holds the AI SoT docs referenced by the stale index. Delete `library/knowledge-base/` entirely (including `ai/README.md`). No deprecation stub remains. | None | `library-guardian` | cursor-grok-4.5-high | OPEN | |
| LSV2-007 | 1 | Relocate every file under `library/qa/` into Schema v2 homes: design-system bootstrap report and G8 discovery/security reports to `library/requirements/reports/`; the backend-production-raid security audit that belongs with PRD-001 joins PRD-001 `qa/` once that folder exists (see LSV2-009). Remove empty `library/qa/` afterward. | LSV2-003, LSV2-009 | `library-guardian` with path ownership only; report authorship unchanged | cursor-grok-4.5-high | OPEN | |
| LSV2-008 | 1 | Remove `library/requirements/issues/` after its README content is superseded by `library/issues/` seeds. No IRD folders are invented. | LSV2-001 | `library-guardian` | cursor-grok-4.5-high | OPEN | |
| LSV2-009 | 4 | Create `library/requirements/backlog/prd-001-operation-automated-lo/qa/` (pre-move location) and `git mv` all 20 files from that PRD's `reports/` into `qa/`. Remove the empty `reports/` directory. | None | `library-guardian` | cursor-grok-4.5-high | OPEN | |
| LSV2-010 | 4 | Create empty `qa/` on PRD-002 at `library/requirements/backlog/prd-002-operation-automated-lo-add-ons/qa/` (placeholder README allowed; no fabricated QA findings). | None | `library-guardian` | cursor-grok-4.5-high | OPEN | |
| LSV2-011 | 4, 1 | Move `library/qa/security/2026-07-21-backend-production-raid-security-audit.md` into PRD-001 `qa/` (or prove it is already a duplicate of a PRD-001 report and delete the orphan after recording the duplicate evidence). | LSV2-009 | `library-guardian` | cursor-grok-4.5-high | OPEN | |
| LSV2-012 | 2 | Move the entire `prd-001-operation-automated-lo/` folder from `library/requirements/backlog/` to `library/requirements/in-work/` with `git mv`. | LSV2-009, LSV2-010, LSV2-011 | `library-guardian` | cursor-grok-4.5-high | OPEN | |
| LSV2-013 | 2 | Update PRD-001 index Status from Backlog to In Work, state that production traffic remains blocked on G1 through G7, and keep G8 as `ACCEPTED CONSTRAINT`. | LSV2-012 | `library-guardian` | cursor-grok-4.5-high | OPEN | |
| LSV2-014 | 2 | PRD-002 remains in `library/requirements/backlog/`. Catalog and index text continue to mark it not authorized for implementation. | LSV2-012 | `library-guardian` | cursor-grok-4.5-high | OPEN | |
| LSV2-015 | 1, 2, 3 | Rewrite `library/README.md` to Schema v2 Structure: `knowledge/{public,private}`, `requirements/{backlog,in-work,completed,reports}`, top-level `issues/`, top-level `notes/`. Remove teaching of `requirements/issues/` and root `qa/`. Catalog PRD-001 under in-work and discovery under `knowledge/private/discovery/`. Link root ledgers. | LSV2-001 through LSV2-014 | `library-guardian` | cursor-grok-4.5-high | OPEN | |
| LSV2-016 | 1-5 | Repair every in-repo markdown link that still targets `library/knowledge-base/`, `library/qa/`, `library/discovery/`, `library/requirements/issues/`, `prd-001-operation-automated-lo/reports/`, or `requirements/backlog/prd-001-operation-automated-lo/`. Include root `README.md`, `PRODUCTION_EXECUTION_LEDGER.md`, `EXECUTION_LEDGER.md`, `BACKEND_PRODUCTION_RAID_LEDGER.md`, knowledge docs, and moved reports. | LSV2-004 through LSV2-015 | `library-guardian` | cursor-grok-4.5-high | OPEN | |
| LSV2-017 | 1-5 | Final drift grep is clean: no remaining paths matching `library/knowledge-base`, `library/qa/`, `library/discovery/` (root), or `library/requirements/issues` except historical quotes inside this ledger's inventory section. PRD-001 lives only under `requirements/in-work/`. Both PRDs have `qa/`. | LSV2-016 | `library-guardian` | cursor-grok-4.5-high | OPEN | |
| LSV2-018 | Close-out | Armed `security-guardian` reviews the documentation-only diff for secret leakage, over-disclosure of credentials/runbook secrets, and unsafe deletion of security evidence. Zero unresolved Critical or High. | LSV2-017 | `security-guardian` | cursor-grok-4.5-high | OPEN | |
| LSV2-019 | Close-out | Armed `quality-guardian` verifies every LSV2-001 through LSV2-017 criterion against this ledger, confirms Schema v2 shape, confirms no QA findings were rewritten, and records SHIP or reopens exact IDs. | LSV2-018 | `quality-guardian` | cursor-grok-4.5-high | OPEN | |
| LSV2-020 | Ship | Branch is rebased as needed, committed, pushed, PR opened or updated, and mergeable against its intended base. Docs-only change; `pnpm verify` is not required unless a non-docs file slips into the diff. | LSV2-019 | `library-guardian` then `git-guardian` | cursor-grok-4.5-high | OPEN | |

## Target tree after raid

```
library/
  README.md                          # Schema v2 catalog
  knowledge/
    public/
    private/
      discovery/                     # was library/discovery/
      ai/                            # unchanged SoT
      architecture/
      ...
  requirements/
    backlog/
      prd-002-operation-automated-lo-add-ons/
        qa/                          # empty scaffold
    in-work/
      prd-001-operation-automated-lo/
        qa/                          # former reports/ + any moved standalone PRD-001 audits
    completed/
    reports/                         # cross-cutting only (includes relocated G8/design-system reports)
  issues/
    backlog/
    in-work/
    completed/
  notes/                             # human-only; seeded README only
```

Absent after raid: `library/knowledge-base/`, `library/qa/`, `library/discovery/`, `library/requirements/issues/`, any PRD `reports/` directory.

## Dependency waves

### Wave 1: scaffold and relocate packages

- `library-guardian`: LSV2-001, LSV2-002, LSV2-003, LSV2-004, LSV2-005, LSV2-006
- Model: `cursor-grok-4.5-high` (docs lifecycle, path moves, low code risk)
- Exit: v2 roots exist; discovery lives under private knowledge; knowledge-base is gone; no agent writes under `notes/` beyond the seed README

### Wave 2: PRD qa migration and lifecycle move

- `library-guardian`: LSV2-007, LSV2-008, LSV2-009, LSV2-010, LSV2-011, LSV2-012, LSV2-013, LSV2-014
- Model: `cursor-grok-4.5-high`
- Coordinate with path-only handling of quality/security reports; do not edit finding bodies except link path fixes required for resolution
- Exit: PRD-001 is under `in-work/` with `qa/`; PRD-002 has empty `qa/` in backlog; legacy `requirements/issues/` and root `qa/` are gone

### Wave 3: catalog and link convergence

- `library-guardian`: LSV2-015, LSV2-016, LSV2-017
- Model: `cursor-grok-4.5-high`
- Exit: README teaches only Schema v2; repository-wide grep for retired paths is clean outside this ledger's inventory quotes

### Wave 4: independent verification and ship

1. Armed `security-guardian` closes LSV2-018
2. Armed `quality-guardian` closes LSV2-019
3. `library-guardian` / `git-guardian` close LSV2-020 (commit, push, PR, CI/docs mergeability)

Wave 4 exit: every LSV2 ID is `VERIFIED`, PR is open, raid log records SHIP.

## File ownership map

| Path glob | Owner during raid |
| --- | --- |
| `library/issues/**` | `library-guardian` |
| `library/notes/README.md` | `library-guardian` (seed only) |
| `library/knowledge/private/discovery/**` | `library-guardian` |
| `library/requirements/**` (moves, README, indexes, empty qa scaffolds) | `library-guardian` |
| `library/README.md` | `library-guardian` |
| Root ledgers and root `README.md` path strings | `library-guardian` (path repair only) |
| QA/security report *content* | unchanged authors; move/rename only |
| `apps/**`, `packages/**`, `supabase/**`, CI | out of scope |

## External boundary (unchanged)

| Gate | Status | Raid treatment |
| --- | --- | --- |
| G1 through G7 | BLOCKED | Untouched. Docs may restate the block; they must not claim PASS. |
| G8 | ACCEPTED CONSTRAINT | Discovery package moves under private knowledge; constraint wording preserved. |

## Raid log

| Time | Event |
| --- | --- |
| 2026-07-25 | dm-skills harness imported on `cursor/pull-dm-skills-cf67`. `library-guardian` sync audit produced five librarian questions. |
| 2026-07-25 | User authorized authoring a raid for all five decisions. Created `cursor/library-schema-v2-raid-cf67` and this ledger with LSV2-001 through LSV2-020 all `OPEN`. |
| | *(Execution waves not yet started.)* |

## Execution checklist (for `/loop`)

1. Branch already created: `cursor/library-schema-v2-raid-cf67`
2. Run Wave 1 to Wave 3 as `library-guardian` with `library-weapon` guides 00, 01, and 06 loaded as needed
3. Mark each criterion `DONE` with path evidence in this table when the owning Guardian finishes
4. Run `security-guardian` (LSV2-018), remediate Medium+
5. Run `quality-guardian` (LSV2-019) until SHIP
6. Commit, push, open/update PR (LSV2-020), notify with PR link
