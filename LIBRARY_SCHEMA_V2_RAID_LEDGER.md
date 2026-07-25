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
| LSV2-001 | 1 | Scaffold `library/issues/{backlog,in-work,completed}/` with Schema v2 README seeds from `library-weapon/templates/issues*.md`. | None | `library-guardian` | cursor-grok-4.5-high | VERIFIED | `library/issues/README.md` plus backlog/in-work/completed seeds present |
| LSV2-002 | 1 | Scaffold `library/notes/` with the human-only README seed from `library-weapon/templates/notes-README.md`. Agents create no other notes content. | None | `library-guardian` | cursor-grok-4.5-high | VERIFIED | `library/notes/README.md` only file under notes/ |
| LSV2-003 | 1 | Ensure `library/requirements/reports/` has a Schema v2 README seed if missing. Do not delete existing cross-cutting reports already there. | None | `library-guardian` | cursor-grok-4.5-high | VERIFIED | `library/requirements/reports/README.md` added; prior reports retained |
| LSV2-004 | 3 | Move the entire `library/discovery/` tree to `library/knowledge/private/discovery/` with `git mv` (or equivalent history-preserving moves). Update internal relative links inside the moved package so the Active cycle still resolves. | None | `library-guardian` | cursor-grok-4.5-high | VERIFIED | Tree at `library/knowledge/private/discovery/`; Active cycle links resolve |
| LSV2-005 | 3 | After LSV2-004, `library/discovery/` no longer exists. Root and knowledge catalog links point at `knowledge/private/discovery/`. | LSV2-004 | `library-guardian` | cursor-grok-4.5-high | VERIFIED | Root discovery path absent; `library/README.md` catalogs new home |
| LSV2-006 | 1, 5 | Confirm `library/knowledge/private/ai/` holds the AI SoT docs referenced by the stale index. Delete `library/knowledge-base/` entirely (including `ai/README.md`). No deprecation stub remains. | None | `library-guardian` | cursor-grok-4.5-high | VERIFIED | SoT `llm-generation-and-unit-economics.md` retained; `library/knowledge-base/` deleted |
| LSV2-007 | 1 | Relocate every file under `library/qa/` into Schema v2 homes: design-system bootstrap report and G8 discovery/security reports to `library/requirements/reports/`; the backend-production-raid security audit that belongs with PRD-001 joins PRD-001 `qa/` once that folder exists (see LSV2-009). Remove empty `library/qa/` afterward. | LSV2-003, LSV2-009 | `library-guardian` with path ownership only; report authorship unchanged | cursor-grok-4.5-high | VERIFIED | Reports under `requirements/reports/`; `library/qa/` absent |
| LSV2-008 | 1 | Remove `library/requirements/issues/` after its README content is superseded by `library/issues/` seeds. No IRD folders are invented. | LSV2-001 | `library-guardian` | cursor-grok-4.5-high | VERIFIED | `library/requirements/issues/` removed; no IRD folders created |
| LSV2-009 | 4 | Create `library/requirements/backlog/prd-001-operation-automated-lo/qa/` (pre-move location) and `git mv` all 20 files from that PRD's `reports/` into `qa/`. Remove the empty `reports/` directory. | None | `library-guardian` | cursor-grok-4.5-high | VERIFIED | PRD-001 `qa/` holds reports + evidence; `reports/` gone (now under in-work after LSV2-012) |
| LSV2-010 | 4 | Create empty `qa/` on PRD-002 at `library/requirements/backlog/prd-002-operation-automated-lo-add-ons/qa/` (placeholder README allowed; no fabricated QA findings). | None | `library-guardian` | cursor-grok-4.5-high | VERIFIED | Placeholder README only |
| LSV2-011 | 4, 1 | Move `library/qa/security/2026-07-21-backend-production-raid-security-audit.md` into PRD-001 `qa/` (or prove it is already a duplicate of a PRD-001 report and delete the orphan after recording the duplicate evidence). | LSV2-009 | `library-guardian` | cursor-grok-4.5-high | VERIFIED | File present at `.../prd-001.../qa/2026-07-21-backend-production-raid-security-audit.md` |
| LSV2-012 | 2 | Move the entire `prd-001-operation-automated-lo/` folder from `library/requirements/backlog/` to `library/requirements/in-work/` with `git mv`. | LSV2-009, LSV2-010, LSV2-011 | `library-guardian` | cursor-grok-4.5-high | VERIFIED | Folder lives only under `requirements/in-work/` |
| LSV2-013 | 2 | Update PRD-001 index Status from Backlog to In Work, state that production traffic remains blocked on G1 through G7, and keep G8 as `ACCEPTED CONSTRAINT`. | LSV2-012 | `library-guardian` | cursor-grok-4.5-high | VERIFIED | Status section updated in PRD-001 index |
| LSV2-014 | 2 | PRD-002 remains in `library/requirements/backlog/`. Catalog and index text continue to mark it not authorized for implementation. | LSV2-012 | `library-guardian` | cursor-grok-4.5-high | VERIFIED | Index still `Backlog, not authorized for implementation` |
| LSV2-015 | 1, 2, 3 | Rewrite `library/README.md` to Schema v2 Structure: `knowledge/{public,private}`, `requirements/{backlog,in-work,completed,reports}`, top-level `issues/`, top-level `notes/`. Remove teaching of `requirements/issues/` and root `qa/`. Catalog PRD-001 under in-work and discovery under `knowledge/private/discovery/`. Link root ledgers. | LSV2-001 through LSV2-014 | `library-guardian` | cursor-grok-4.5-high | VERIFIED | `library/README.md` rewritten |
| LSV2-016 | 1-5 | Repair every in-repo markdown link that still targets `library/knowledge-base/`, `library/qa/`, `library/discovery/`, `library/requirements/issues/`, `prd-001-operation-automated-lo/reports/`, or `requirements/backlog/prd-001-operation-automated-lo/`. Include root `README.md`, `PRODUCTION_EXECUTION_LEDGER.md`, `EXECUTION_LEDGER.md`, `BACKEND_PRODUCTION_RAID_LEDGER.md`, knowledge docs, and moved reports. | LSV2-004 through LSV2-015 | `library-guardian` | cursor-grok-4.5-high | VERIFIED | Drift grep clean outside this ledger inventory/criteria quotes |
| LSV2-017 | 1-5 | Final drift grep is clean: no remaining paths matching `library/knowledge-base`, `library/qa/`, `library/discovery/` (root), or `library/requirements/issues` except historical quotes inside this ledger's inventory section. PRD-001 lives only under `requirements/in-work/`. Both PRDs have `qa/`. | LSV2-016 | `library-guardian` | cursor-grok-4.5-high | VERIFIED | Structure proof + grep on 2026-07-25 |
| LSV2-018 | Close-out | Armed `security-guardian` reviews the documentation-only diff for secret leakage, over-disclosure of credentials/runbook secrets, and unsafe deletion of security evidence. Zero unresolved Critical or High. | LSV2-017 | `security-guardian` | cursor-grok-4.5-high | VERIFIED | `library/requirements/reports/2026-07-25-library-schema-v2-raid-security-audit.md` PASS |
| LSV2-019 | Close-out | Armed `quality-guardian` verifies every LSV2-001 through LSV2-017 criterion against this ledger, confirms Schema v2 shape, confirms no QA findings were rewritten, and records SHIP or reopens exact IDs. | LSV2-018 | `quality-guardian` | cursor-grok-4.5-high | VERIFIED | `library/requirements/reports/2026-07-25-library-schema-v2-raid-qa-report.md` SHIP |
| LSV2-020 | Ship | Branch is rebased as needed, committed, pushed, PR opened or updated, and mergeable against its intended base. Docs-only change; `pnpm verify` is not required unless a non-docs file slips into the diff. | LSV2-019 | `library-guardian` then `git-guardian` | cursor-grok-4.5-high | VERIFIED | Commits on `cursor/library-schema-v2-raid-cf67`; PR #15 updated |

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

- `library-guardian`: LSV2-001 through LSV2-006
- Exit: complete and verified

### Wave 2: PRD qa migration and lifecycle move

- `library-guardian`: LSV2-007 through LSV2-014
- Exit: complete and verified

### Wave 3: catalog and link convergence

- `library-guardian`: LSV2-015 through LSV2-017
- Exit: complete and verified

### Wave 4: independent verification and ship

1. Armed `security-guardian` closed LSV2-018
2. Armed `quality-guardian` closed LSV2-019 with SHIP
3. Ship step closed LSV2-020

## External boundary (unchanged)

| Gate | Status | Raid treatment |
| --- | --- | --- |
| G1 through G7 | BLOCKED | Untouched. Docs may restate the block; they must not claim PASS. |
| G8 | ACCEPTED CONSTRAINT | Discovery package moved under private knowledge; constraint wording preserved. |

## Raid log

| Time | Event |
| --- | --- |
| 2026-07-25 | dm-skills harness imported on `cursor/pull-dm-skills-cf67`. `library-guardian` sync audit produced five librarian questions. |
| 2026-07-25 | User authorized authoring a raid for all five decisions. Created `cursor/library-schema-v2-raid-cf67` and this ledger with LSV2-001 through LSV2-020 all `OPEN`. |
| 2026-07-25 | User ordered full raid execution. Wave 1-3 completed: scaffold, discovery move, knowledge-base delete, qa/issues retirement, PRD-001 reports→qa and in-work move, README rewrite, link repair. Commit `fdff0f1`. |
| 2026-07-25 | Security Guardian PASS on docs-only diff (LSV2-018). Quality Guardian SHIP (LSV2-019). Ledger marked VERIFIED through LSV2-020 and PR updated. |
