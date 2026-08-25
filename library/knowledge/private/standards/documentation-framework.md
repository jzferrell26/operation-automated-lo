# Documentation Framework

> Category: Standards | Version: 1.0 | Date: August 2026 | Status: Canonical

The single source of truth for how documentation is written in Operation Automated LO. Every document (feature PRDs, issue IRDs, QA reports, architecture docs, knowledge docs, guides) must conform to the standards defined here. If a document type is not covered, add a new section to this file rather than inventing a local convention.

This repository uses **Library Schema v2**. Legacy v1 paths (`library/knowledge-base/`, `library/requirements/features/`, `library/requirements/issues/`, `library/qa/`) are historical only. Do not create new content there.

---

## 1. Document Types

| Type | Purpose | Location | Primary audience |
|---|---|---|---|
| **Issue IRD** | Implementation plan for a specific GitHub issue | `library/issues/{backlog,in-work,completed}/ird-<###>-<slug>/ird-<###>-<slug>-index.md` | Implementation engineer |
| **Feature PRD** | Planned feature spec (forward or retroactive) | `library/requirements/{backlog,in-work,completed}/prd-<###>-<slug>/prd-<###>-<slug>-index.md` | Implementation engineer |
| **PRD sub-feature** | Independently implementable slice of a PRD | Same PRD folder: `prd-<###><letter>-<slug>-<feature>.md` | Implementation engineer |
| **QA Report (tied)** | Audit of an implementation against its plan | The plan's own `qa/` subfolder | Team lead, author of the feature |
| **QA Report (standalone)** | Audit not tied to a single plan | `library/requirements/reports/<date>-<type>-report.md` | Team lead, audit reviewer |
| **ADR** | Locked architectural decision | `library/knowledge/private/architecture/ADR-<n>-<kebab-slug>.md` | Senior engineers, architects |
| **Architecture Doc** | System design, data flows, component relationships | `library/knowledge/private/architecture/` | Senior engineers, architects |
| **Integration Doc** | Third-party service configuration and error handling | `library/knowledge/private/integrations/` | DevOps, engineers wiring services |
| **UX/UI Standard** | Visual design language, tokens, components, patterns | `library/knowledge/private/ux-ui/` | Designers, frontend devs |
| **Product Doc** | Product vision, scope, boundaries, project map | `library/knowledge/private/product/` | Team, stakeholders |
| **Research Doc** | Build-readiness gates, external research | `library/knowledge/private/research/` | Product, engineering |
| **Security Doc** | Threat models and security posture | `library/knowledge/private/security/` | Security, engineering |
| **Standards Doc** | Rules for writing documentation itself | `library/knowledge/private/standards/` | All contributors |
| **Public Guide** | Customer-facing how-to or overview | `library/knowledge/public/<domain>/<kebab-slug>.md` | Customers, partners |

---

## 2. Universal Document Header

Every markdown file under `library/knowledge/private/` or `library/knowledge/public/` starts with:

```markdown
# <Document Title>

> Category: <Type> | Version: <X.Y> | Date: <Month YYYY> | Status: <Active | Draft | Archived>

<One-sentence description of what this document covers and who should read it.>

**Related:**
- [Link to related doc]
- [Link to source code: `src/path/to/file.ts`]
```

- **Version**: starts at `1.0`; patch bumps (`1.0` to `1.1`) for additions, minor bumps (`1.x` to `2.0`) for reorganizations.
- **Date**: current month/year on the last meaningful edit.
- **Status** values:
  - `Active`: current, should be kept up to date
  - `Draft`: work in progress, not authoritative
  - `Archived`: historical, no longer maintained
  - `Canonical`: (for standards docs only) highest authority; overrides ad-hoc conventions

Requirements-type docs (issue IRDs, feature PRDs, QA reports) use a different header format documented in their respective weapon guides under `.cursor/skills/library-weapon/guides/`.

---

## 3. Filename Conventions

| Document type | Folder + filename pattern | Example |
|---|---|---|
| Issue IRD index | `ird-<###>-<slug>/ird-<###>-<slug>-index.md` | `ird-042-stale-cached-responses/ird-042-stale-cached-responses-index.md` |
| Feature PRD index | `prd-<###>-<slug>/prd-<###>-<slug>-index.md` | `prd-001-operation-automated-lo/prd-001-operation-automated-lo-index.md` |
| PRD sub-feature | `prd-<###><letter>-<slug>-<feature>.md` | `prd-001a-tenant-installation-and-oauth.md` |
| QA report (tied to plan) | `<plan-folder>/qa/<date>-<type>-report.md` or `qa/prd-<###>-<slug>-qa.md` | `qa/2026-08-12-prd001-core-raid-qa-report.md` |
| QA report (standalone) | `library/requirements/reports/<date>-<type>-report.md` | `2026-07-25-library-schema-v2-raid-qa-report.md` |
| ADR | `architecture/ADR-<n>-<kebab-slug>.md` | `architecture/ADR-001-use-highlevel-as-meta-authority.md` |
| Knowledge doc | `<domain>/<kebab-slug>.md` (no numeric prefix) | `product/project-map.md` |

**Numbering rules:**

- `<###>` is **3-digit zero-padded** (`006`, `046`, `093`, `100`). 4+ digit natural width.
- IRD numbers follow the GitHub issue number. Never invent an IRD number without a matching GitHub issue.
- PRD numbers are repo-local sequential; take `max + 1` from existing folders across `backlog/`, `in-work/`, and `completed/`.
- Sub-PRD letters are alphabetical per parent PRD: `prd-007a`, `prd-007b`, `prd-007c`.
- Titles are lowercase kebab-case, 60 characters or fewer.
- The optional ClickUp suffix `-ck-<clickupId>` may appear on the index filename only, never on the folder name.

---

## 4. Folder Location Rules

| Folder | Meaning |
|---|---|
| `library/requirements/backlog/prd-<###>-<slug>/` | Planned PRD, not yet in implementation. |
| `library/requirements/in-work/prd-<###>-<slug>/` | PRD actively being implemented. |
| `library/requirements/completed/prd-<###>-<slug>/` | PRD has shipped. Move the entire folder (index, sub-PRDs, and `qa/`). |
| `library/issues/backlog/ird-<###>-<slug>/` | Issue IRD queued (GitHub issue OPEN). |
| `library/issues/in-work/ird-<###>-<slug>/` | Issue IRD actively being implemented. |
| `library/issues/completed/ird-<###>-<slug>/` | Issue resolved (GitHub issue CLOSED). Move the entire folder. |
| `<plan-folder>/qa/` | QA reports tied to that specific PRD or IRD. Travel with the folder when it moves. |
| `library/requirements/reports/` | Standalone security and quality reports not attached to a single PRD or IRD. |
| `library/knowledge/private/<domain>/` | Internal engineering and business knowledge. |
| `library/knowledge/public/<domain>/` | Customer-facing documentation. |
| `library/notes/` | Human-only scratch space. Agents never read or write here. |

Move folders when lifecycle status changes. Never edit lifecycle state in frontmatter alone.

---

## 5. Writing Rules (all doc types)

1. **Ground every claim in code.** Quote source with file path and line range; never paraphrase signatures.
2. **One topic per document.** Split if a doc exceeds roughly 500 lines.
3. **Progressive disclosure.** Open with why this exists and who should read it; deep details below.
4. **Link out, don't duplicate.** If another doc covers a subtopic, link to it.
5. **Diagrams use mermaid.** Prefer `flowchart TD` or `sequenceDiagram`. No explicit colors.
6. **No time-sensitive language.** Avoid "currently", "recently", "as of". Use explicit dates.
7. **No personal opinions.** Docs describe decisions and rationale, not preferences.
8. **No em dashes or en dashes in new prose.** Use hyphen, comma, colon, or parentheses.

---

## 6. Cross-Linking Conventions

- Use relative paths: `[title](../relative/path.md)`.
- Link to code with file paths (and line numbers where useful): `` `src/routes/users.ts:42-80` ``.
- PRDs and IRDs link to their related issues, features, and QA reports in a **Related** section at the end.
- Knowledge docs link to the PRDs that drove them (when applicable) and to source code.

---

## 7. Diagram Rules

- Mermaid preferred (renders on GitHub).
- Use `flowchart TD` (top-down) for process flows; `sequenceDiagram` for temporal flows; `erDiagram` for data models.
- Node IDs: no spaces (use `camelCase` or `under_scores`).
- No explicit colors (breaks dark mode).
- No `click` events.
- Quote labels containing parentheses, brackets, or colons.

---

## 8. Versioning and Dates

- **Versioning** is per-document, not repo-wide. Bump on meaningful content change.
- **Dates** use the current month/year (from the system clock), not arbitrary timestamps.
- Each document optionally ends with a **Changelog** section listing version bumps.

---

## 9. Ownership

- Requirements docs (issue IRDs, feature PRDs) are owned by the implementation author.
- QA report content in PRD/IRD `qa/` folders and `library/requirements/reports/` is authored by `quality-guardian` and `security-guardian`.
- Knowledge docs are owned by the team collectively. Anyone may edit with a PR.
- Standards docs (this file included) require team consensus before changing.

---

## 10. Bootstrap

When `library-guardian initialize` seeds a repo:

1. Confirm this framework's header Date and Version match the repo's bootstrap date.
2. Replace project-name placeholders in seeded README files with the repo's actual name.
3. Edit any section that does not match team conventions, then commit.
4. Start using the agent: ingest issues, plan features, document architecture.

---

## Changelog

- v1.0 (August 2026): Initial Schema v2 framework for Operation Automated LO. Seeded by Gauntlet Raid B scaffold close-out.
