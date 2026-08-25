---
ai_description: |
  Contains PRD folders planned but not yet started. This is where
  library-guardian creates new PRD folders on "write a PRD for X".
  PRD folder naming: prd-<###>-<kebab-slug>/ (3-digit zero-padded).
  PRD number: take max+1 from all prd-* folders across backlog/,
  in-work/, and completed/ in this repo.
  Each PRD folder must contain: prd-<###>-<slug>-index.md (always),
  prd-<###><letter>-<slug>-<feature>.md (one per sub-feature, optional),
  qa/ subfolder (empty on creation; quality-guardian writes QA reports here).
  Move entire folder to in-work/ when implementation begins.
human_description: |
  PRDs planned but not yet started. Create new PRDs here.
  - Naming: prd-007-feature-name/ with prd-007-feature-name-index.md inside
  - Sub-features: prd-007a-feature-name-backend.md, prd-007b-feature-name-ui.md
  - QA folder: qa/prd-007-feature-name-qa.md (created by quality-guardian)
  Move to in-work/ when implementation begins.
---

# Requirements: Backlog

Planned PRDs not yet in implementation. All new PRD folders are created here.

## Current backlog (this repo)

| PRD | Folder | Authorization |
|---|---|---|
| PRD-002 | [prd-002-operation-automated-lo-add-ons/](prd-002-operation-automated-lo-add-ons/prd-002-operation-automated-lo-add-ons-index.md) | Future add-on portfolio. **Not authorized for implementation.** Independently gated expansion modules preserved for after PRD-001 core completion. |

PRD-001 lives in `library/requirements/in-work/` and is the only authorized founding implementation.

## Creating a new PRD

1. Find `max_n` across `backlog/prd-*/`, `in-work/prd-*/`, `completed/prd-*/`.
2. Create `prd-<max_n + 1>-<kebab-slug>/`.
3. Create `prd-<###>-<slug>-index.md` (module overview and feature list).
4. Create `qa/` subfolder (empty; `quality-guardian` writes reports here).
5. Add sub-PRDs `prd-<###>a-<slug>-<feature>.md` etc. as needed.

## Lifecycle

Move the entire PRD folder (index, sub-PRDs, and `qa/`) to `library/requirements/in-work/` when implementation begins. Move to `library/requirements/completed/` only after security and quality review pass.

## Related

- [Library README](../../README.md)
- [Documentation framework](../../knowledge/private/standards/documentation-framework.md)
- [Project map](../../knowledge/private/product/project-map.md)
