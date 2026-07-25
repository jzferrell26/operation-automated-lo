# Pillar 7: Product Process & Documentation

## CRITICAL DIRECTIVES

Before acting in this domain you MUST load these skills via the Skill tool:

- `adr-writing-weapon`: owns Architecture Decision Records (Nygard/MADR format, supersession lifecycle).
- `agile-scrum-weapon`: owns Scrum ceremonies, roles, and anti-pattern diagnosis ("is this actually Scrum?").
- `discovery-research-weapon`: owns continuous product discovery (Teresa Torres cadence, Opportunity Solution Trees, JTBD interviews).
- `estimation-weapon`: owns sizing and forecasting methodology (Fibonacci, T-shirt sizing, NoEstimates, Monte Carlo forecasting).
- `kanban-flow-weapon`: owns the Kanban method: WIP limits, flow metrics, Little's Law diagnostics.
- `okr-goal-setting-weapon`: owns OKR authorship, grading, and the output-vs-input discipline.
- `retrospective-weapon`: owns retrospective format selection and follow-through enforcement on action items.
- `readme-writing-weapon`: owns README authorship as a conversion surface, not just a manual.
- `technical-writing-craft-weapon`: owns documentation writing craft itself: Diataxis framework, inverted-pyramid prose, code-example discipline.
- `docs-site-weapon`: owns developer-facing documentation-site platform selection (Docusaurus, Mintlify, Starlight) and docs-as-code CI.
- `knowledge-weapon`: owns narrative knowledge documentation (system overviews, architecture diagrams) distinct from PRDs.
- `library-weapon`: owns the full documentation lifecycle: PRDs, IRDs, backwards-PRDs, and the `library/` folder structure itself.
- `wiki-weapon`: owns per-repo code-entity extraction into an atomic, cross-referenced wiki with backlinks.

---

## What this pillar collectively knows

This pillar covers how teams decide what to build, track how they are building it, and write down what they built and why. It splits into three bands: **process methodology** (agile-scrum, discovery-research, estimation, kanban-flow, okr-goal-setting, retrospective — how the team organizes and paces its work), **decision and knowledge documentation** (adr-writing, knowledge-weapon, library-weapon, wiki-weapon — the durable record of what was decided and how the system actually works), and **writing craft and delivery surfaces** (readme-writing, technical-writing-craft, docs-site — how that record is written well and where it is published).

### Disambiguation table

| Situation | Weapon that owns it | Not this one |
|---|---|---|
| Recording an architecture decision, superseding an old one | `adr-writing-weapon` | `library-weapon` (owns PRDs/IRDs, not ADRs) |
| Is this actually Scrum, DoD templates, anti-pattern diagnosis | `agile-scrum-weapon` | `kanban-flow-weapon` (different methodology, different metrics) |
| Opportunity Solution Trees, JTBD interviews, "what should we build" | `discovery-research-weapon` | `product-feedback-roadmap-weapon` (Pillar 6, reactive backlog not proactive discovery) |
| Story points mean nothing, NoEstimates, Monte Carlo forecasting | `estimation-weapon` | `agile-scrum-weapon` (ceremony cadence, not sizing method) |
| WIP limits, cycle time, Little's Law | `kanban-flow-weapon` | `agile-scrum-weapon` (sprint-based, not flow-based) |
| Writing/grading OKRs, sandbagged vs ambitious goals | `okr-goal-setting-weapon` | `estimation-weapon` (forecasting delivery, not setting goals) |
| Which retro format, psychological safety, action-item follow-through | `retrospective-weapon` | `agile-scrum-weapon` (retro is one Scrum ceremony among several; this weapon owns the format/facilitation depth) |
| Writing a README that converts visitors | `readme-writing-weapon` | `technical-writing-craft-weapon` (general docs craft, not README-specific conversion structure) |
| Diataxis framework, inverted-pyramid prose, ghostwriting a guide | `technical-writing-craft-weapon` | `docs-site-weapon` (platform, not prose quality) |
| Docusaurus vs Mintlify vs Starlight, docs-as-code CI | `docs-site-weapon` | `knowledge-base-help-center-weapon` (Pillar 6, customer-facing not developer-facing) |
| System overview docs, architecture narrative, auth flow diagram | `knowledge-weapon` | `library-weapon` (never touches PRDs; `library-weapon` never touches narrative knowledge docs) |
| Writing a feature PRD, ingesting a GitHub issue into an IRD | `library-weapon` | `knowledge-weapon` (distinct domains, explicitly non-overlapping) |
| Extracting functions/classes/endpoints into an atomic cross-referenced wiki | `wiki-weapon` | `knowledge-weapon` (wiki is atomic entity extraction; knowledge is human narrative prose) |

### Canonical multi-weapon sequences

1. **Compounding documentation:** `wiki-weapon` runs across code chunks and writes atomic entity pages with backlinks (functions, endpoints, tables, feature flags) → `library-weapon` authors per-module narrative documentation, reading the wiki at query time to enrich its narratives. Neither replaces the other: `wiki-weapon` builds the cross-reference graph, `library-weapon` writes the human-readable story around it.
2. **Decision-to-record pipeline:** an architectural choice is made during implementation → `adr-writing-weapon` records it in Nygard/MADR format → if the decision has broader system implications, `knowledge-weapon` folds it into the relevant narrative overview doc.
3. **Process health check:** `agile-scrum-weapon` or `kanban-flow-weapon` (whichever methodology is in use) audits ceremony/flow health → `retrospective-weapon` runs the retro that surfaces what to change → `okr-goal-setting-weapon` or `estimation-weapon` recalibrates goals/forecasts based on what the retro surfaced.
4. **Docs quality pass:** `technical-writing-craft-weapon` reviews prose quality against Diataxis → `readme-writing-weapon` specifically restructures the README as a conversion surface → `docs-site-weapon` ensures the platform and CI pipeline actually publish the result.

### Load-bearing hard rules and gotchas

- **`knowledge-weapon` and `library-weapon` never touch each other's artifact types.** `library-weapon` owns PRDs and IRDs; `knowledge-weapon` owns narrative knowledge docs. This is stated as an explicit non-overlap in the corpus, not just a convention — do not let one weapon draft the other's artifact type.
- **`wiki-weapon` never mutates the global state files** (`index.md`, `log.md`, `hot.md`, the hash manifest) — those are owned by the Guild VS Code extension's TypeScript driver, which runs the reconciliation pass after all parallel `wiki-weapon` invocations finish.
- **Migrating DRF/DoD templates or estimation frameworks onto a team is honesty-first**: `agile-scrum-weapon` explicitly audits whether a team's process is "actually Scrum" rather than assuming the label is accurate; do not accept a team's self-description of its process without auditing the ceremonies against the framework.
- **The NoEstimates movement is presented with its evidence base**, not as settled doctrine, per `estimation-weapon` — treat it as one option among several sizing frameworks to weigh against the team's context, not a default recommendation.
- **README-driven development treats the README as written before the code**, per `readme-writing-weapon`, for greenfield projects — this is a sequencing rule, not just a style preference.

---

## Cross-references to sibling pillars

- The code entities `wiki-weapon` extracts and the ADRs `adr-writing-weapon` records both originate from implementation work across every engineering pillar (1, 2, 5, 8, 9).
- API-specific documentation (OpenAPI enrichment, SDK generation) is **Pillar 2: Backend, Data & APIs** (`api-docs-weapon`), not this pillar's `docs-site-weapon`.
- Customer-facing knowledge bases (as opposed to developer docs) are **Pillar 6: Business, Growth & GTM** (`knowledge-base-help-center-weapon`).
- The factory pipeline that builds and registers new Guardians/Weapons has its own distinct five-phase process, documented in **Pillar 10: Factory & Orchestration**, and does not route through this pillar's general product-process methodology.
