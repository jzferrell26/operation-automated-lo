---
source_url: file:///c:/Users/mario/GitHub/guild-code/ai-tools/agents/session-zero.md
retrieved_on: 2026-05-20
source_type: internal-repo
authority: official
relevance: critical
topic: producer-mirror
weapon: dms-hand-weapon
---

# session-zero (producer Guardian)

## Summary
`session-zero` is the producer Guardian for the queue that `dms-hand` consumes. It encodes the inverse of `dms-hand`'s contract: where `dms-hand` deletes from the TOP and never inserts, `session-zero` appends to the BOTTOM and never edits. The two Guardians share the position-numbering invariants, the `NNN|guardian-name` row format, and the uniqueness check surface (`ai-tools/skills/dungeon-master/SKILL.md`). Reading this Guardian's file is how `weapon-forge` learns the canonical file-plumbing Guardian style (terse opening, paired-skill load on entry, numbered workflow, refuse-list at the bottom, pairing table at the end).

## Key quotations / statistics

- Frontmatter `proactive: true`: like `dms-hand`, `session-zero` is invoked on-demand by the user or an orchestrator, never volunteered. The proactive flag means it CAN be auto-triggered when the user names a topic that needs proposing.
- Opening identity statement: "You are **session-zero**, the proposal Guardian that births brand new guardians into the Guild AI Tools Factory. You sit at the very front of the factory pipeline. Your job is to take a topic from the caller and produce two atomic appends: 1. A full backlog entry in `ai-tools/proposed-guardians-backlog.md` with title, four metadata lines, Purpose, and search queries. 2. A minimal queue row in `ai-tools/proposed-guardians-queue.md` of the form `NNN|guardian-name`."
- Boundary statement: "You never build weapons. You never write command briefs. You never register Guardians with `dungeon-master`. Those are downstream steps that read the row you queued."
- Workflow step 7 (sequential appends): "In this order, sequentially, never in parallel: Append A: backlog entry. ... Append B: queue row. ... Increment `totals.rows` in the queue's YAML frontmatter. Update `date_updated:` to today's ISO date (YYYY-MM-DD). Update `last_updated_by:` to `session-zero`."
- Self-check item: "New entry was APPENDED, not inserted in the middle." -- Mirror invariant of `dms-hand`'s "deleted from the TOP, not the middle."
- Failure-mode refusal: "The caller wants you to renumber, reorder, or compact the queue. Refuse. Numbering is permanent." -- Same invariant `dms-hand` must enforce.
- Pairing table (line 173+): canonical format `dms-hand`'s file should mirror.

## Annotations for weapon-forge
- This file is the canonical TEMPLATE for `dms-hand`'s agent file at `ai-tools/agents/dms-hand.md`. `guardian-creator` (Phase 3) will write that file, but `weapon-forge` (Phase 2) should ensure `guides/` is structured so `guardian-creator` can produce a `dms-hand.md` that mirrors this shape:
  1. YAML frontmatter with `name`, `description` (proactive trigger phrases), `proactive: true`.
  2. Opening identity paragraph (one or two short paragraphs).
  3. "First action when invoked" section that loads the paired skill (`dms-hand-weapon`).
  4. Numbered Workflow section (one section per ACTION step from the Command Brief).
  5. "Failure modes to refuse" bulleted list (one bullet per SUBAGENT CRITICAL DIRECTIVE, restated as a refusal).
  6. Pairing table.
- The "sequentially, never in parallel" invariant from `session-zero` step 7 is the mirror of `dms-hand`'s "run the four phases in order; never skip or reorder." Both Guardians are file-plumbing-style; both refuse parallelism within their mutation sequence.
- `guides/00-principles.md` should cite this Guardian as the producer-side mirror to clarify the "we are the consumer; session-zero is the producer; together we maintain the FIFO invariant" framing.
- The pairing table at the end of `session-zero.md` is the format `dms-hand`'s pairing table should follow. Include rows for: This Guardian, Paired skill, Queue file, Backlog file, In-process file, Completed file, Dungeon Master roster file, Model matrix.
