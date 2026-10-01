# Library Drift Report

> Type: Library schema v2 drift check, read-only | Date: 2026-10-01 | Author: `library-guardian` (lane L9, PRD-008e `008E-AC-012`) | Baseline: branch `gauntlet/w3-records` at `b5c9e19`

Read-only scan of `library/` against Library Schema v2, following guide 06 of the library weapon. The only change this pass made is the seeded READMEs listed below; it changed no PRD, IRD, knowledge document, or report, and wrote nothing under `library/notes/`.

## Result

No legacy v1 path, no invalid PRD or IRD folder name, and no duplicate PRD number. One low-severity drift (29 directories without a `README.md`) is fixed in this pass. One structural exception (PRD-007's `reports/` folder) is recorded as accepted.

| Check | Result |
| --- | --- |
| v1 path remnants (`library/knowledge-base/`, `library/architecture/`, `library/requirements/features/`, `library/requirements/issues/`, `library/qa/`) | None. All five paths are absent. |
| v1 strings in text (`knowledge-base`, `requirements/features`, `requirements/issues`, `library/qa/`, `feature-<###>`, `issue-<###>`) | Five files mention a legacy path, each as a reference to the legacy path and none as a live location: `knowledge/private/standards/documentation-framework.md` (names the legacy paths as legacy), `requirements/reports/2026-07-25-library-schema-v2-raid-qa-report.md` and `-security-audit.md` (the v2 migration's own records), `requirements/reports/2026-09-16-production-tonight-requirements-coverage-report.md` (the previous drift check), and `requirements/in-work/prd-008-finish-line-hardening/qa/2026-09-30-authoring-security-review.md`. No file matches `feature-<###>` or `issue-<###>`. |
| PRD folder naming `prd-<###>-<slug>/` | 8 folders, all conforming: `prd-002` in `backlog/`; `prd-001`, `003`, `004`, `005`, `006`, `007`, `008` in `in-work/`. `completed/` holds none. |
| IRD folder naming | No IRD folders exist. `issues/backlog/`, `issues/in-work/`, and `issues/completed/` hold only their `README.md`. `gh issue list --state all` returns no issues, so no IRD is owed. |
| Duplicate PRD numbers across `backlog/`, `in-work/`, `completed/` | None. 001 to 008 each appear once. The highest is 008. |
| Missing PRD index files | None. All 8 folders carry `prd-<###>-<slug>-index.md`. |
| Missing PRD `qa/` subfolders | One: `prd-007-homeowner-reports/` has `reports/` and no `qa/`. Accepted exception, below. |
| Sub-PRD letter sequences | Contiguous in every PRD: 001 `a` to `j`, 002 `a` to `h`, 003 `a` to `d`, 004 `a` to `e`, 005 `a` to `e`, 006 `a` to `d`, 008 `a` to `e`. PRD-007 has none. |
| `library/notes/` | `README.md` only. Not touched by this pass. |
| Folder READMEs | 29 directories lacked a `README.md`. All are seeded in this pass; a re-scan finds none missing outside `notes/`. |
| `standardize-library` and `guild-sync --status` | Not run. This repository defines neither script (`package.json` and `tooling/scripts/` carry no such entry), so the grep and directory checks above stand in for them. |

## Seeded READMEs (29)

Each states the directory's purpose in one or two lines, in the style of the existing READMEs.

- `knowledge/README.md`
- `knowledge/private/`: `ai`, `commercial`, `competitive`, `compliance`, `frontend`, `integrations`, `product`, `research`, `security`
- `knowledge/private/discovery/`: `assumption-maps`, `experiments`, `interview-scripts`
- `knowledge/private/ux-ui/`: `03-components`, `04-screens`, `05-html-examples`, `05-html-examples/claude-design/previews`
- `requirements/README.md`
- `requirements/backlog/prd-002-operation-automated-lo-add-ons/`
- `requirements/in-work/`: `prd-001-operation-automated-lo`, `prd-003-authenticated-product-activation`, `prd-004-reviewable-go-live`, `prd-005-authenticated-review-runtime`, `prd-006-first-party-sign-in-and-guided-experience`, `prd-007-homeowner-reports`, `prd-008-finish-line-hardening`
- `requirements/in-work/prd-007-homeowner-reports/reports/`
- `requirements/in-work/prd-001-operation-automated-lo/qa/evidence/` and `qa/evidence/ui-foundation/`

The 2026-09-16 coverage report counted 24 directories without a README. Five more have appeared since: `prd-005`, `prd-006`, `prd-007`, `prd-007/reports/`, and `prd-008`.

## Accepted exception: PRD-007 keeps its evidence in `reports/`

Schema v2 gives every PRD folder a `qa/` subfolder for its security and quality reports. PRD-007 (`requirements/in-work/prd-007-homeowner-reports/`) keeps eight reports dated 2026-09-24 in `reports/` instead.

This is accepted, not drift to fix. The PRD's reports have lived there since they were written; PRD-008e directs the independent reviews and the final completion audit to that same folder (`008E-AC-006` and `008E-AC-008`); and renaming it would re-point every inbound reference in the PRD-008 documents and the agent terrain map for no change in meaning. The folder's own README says it stands in for `qa/` and links back here. Revisit only if the folder is renamed with every inbound link updated in the same commit.

## Informational, no action

- `prd-001-operation-automated-lo/` sub-PRDs `001a` to `001i` omit the folder slug from their filenames (for example `prd-001a-tenant-installation-and-ghl-oauth.md`; `001j` conforms). The folder, the index, and the numbers all conform, so this is not an invalid PRD name. It predates schema v2 and renaming would break inbound links.
- The library catalog and the lifecycle READMEs already list PRD-007 and PRD-008 (`library/README.md`, `requirements/in-work/README.md`, `requirements/backlog/README.md`). Their inbound links are checked again by `008E-AC-014` at each lifecycle move.

## Method

- `find library -type d` (excluding `library/notes/`), testing each directory for `README.md`, before and after seeding.
- A test for each of the five v1 paths, then `git grep` for the legacy strings and for `feature-<###>` and `issue-<###>` over `library/`.
- A listing of every `requirements/*/*/` and `issues/*/*/` folder against `^prd-[0-9]{3,}-<slug>$`, with the index file and `qa/` folder checked in each.
- `gh issue list --state all --limit 100` for the IRD numbering rule.
