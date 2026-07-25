---
name: dms-hand-weapon
description: Equips `dms-hand` to drive the Guild AI Tools Factory pipeline end-to-end for exactly ONE Guardian-forging cycle. Encodes the move-before-work invariant, the strict FIFO pickup protocol, the five-phase dispatch order (command-center -> loremaster -> weapon-forge -> guardian-creator -> dm-registrar), the row-format contracts of the four tracking files (`proposed-guardians-queue.md`, `proposed-guardians-in-process.md`, `proposed-guardians-completed.md`, `proposed-guardians-backlog.md`), the close-out lifecycle, and the failure-mode catalog. Use when invoking `dms-hand` or when reviewing the canonical contract between the factory's producer side (`session-zero`) and consumer side (`dms-hand` plus the four worker skills). Not for proposing new Guardians (use `session-zero-weapon` + `session-zero`), conducting research (use `loremaster`), authoring guides (use `weapon-forge`), writing Guardian files (use `guardian-creator`), or updating Dungeon Master's roster (use `dm-registrar`). `dms-hand-weapon` is the foreman's manual, not the craftsman's tools.
---

# dms-hand Weapon

Procedural arsenal for `dms-hand`, the pipeline-controller Guardian that consumes one row from the Guild AI Tools Factory queue per invocation and drives it through the canonical Guardian-forging pipeline.

This weapon is intentionally narrow. It encodes:

- The strict FIFO pickup protocol against `ai-tools/proposed-guardians-queue.md`.
- The move-before-work invariant that prevents sibling factory agents from racing on the same row.
- The five-phase dispatch order (command-center -> loremaster -> weapon-forge -> guardian-creator -> dm-registrar) with explicit success and failure checks per phase.
- The row-format contracts for all four tracking files.
- The close-out lifecycle that transitions a row from `in-process` to `completed` and flips the backlog checkbox to `[x]`.
- The failure-mode catalog with explicit recovery actions.
- The reporting contract for the final summary message.

It does NOT encode any product-domain knowledge. The worker phases own all substantive content.

## When this weapon applies

Load this weapon when `dms-hand` is invoked. Typical triggers:

- "Run the pipeline."
- "Process the next queued Guardian."
- "Advance the factory."
- "Drain one entry from the queue."
- "dms-hand, go."

Do NOT load it for:

- Proposing new Guardians into the queue (that is `session-zero` plus `session-zero-weapon`).
- Editing an existing backlog entry (no Guardian owns this today; manual edit only).
- Researching a domain (that is `loremaster`).
- Writing guides or `SKILL.md` content (that is `weapon-forge`).
- Authoring a Guardian file (that is `guardian-creator`).
- Mutating Dungeon Master's roster directly (that is `dm-registrar`).

## First action when this weapon is loaded

Read these in order before doing anything else:

1. **`guides/00-principles.md`** -- the move-before-work invariant, the one-entry-per-invocation rule, the foreman vs craftsman boundary, the hierarchical-orchestration justification. Cite-able from the Cursor Engineering "self-driving codebases" blog and the markdown-state-machine prior art (see `research/external/`).
2. **`guides/01-pick-and-lock.md`** -- the exact protocol for reading the top queue row, deleting it from the queue, appending to `in-process`, and updating the queue's YAML frontmatter. This is the operational core of the weapon.
3. **`guides/10-failure-modes.md`** -- the catalog of "what to do if X" because failure modes cascade and the earlier the Guardian knows the recovery story, the cleaner the run.

Then walk the rest of the guides in order. Each phase guide (`04-` through `08-`) is short on purpose: the substantive logic lives inside the worker skill or subagent, not here. `dms-hand-weapon`'s job is to specify the contract at the boundary.

## Folder layout

```text
dms-hand-weapon/
+- SKILL.md                          (this file)
+- README.md                         (one-page human overview)
+- guides/
|  +- 00-principles.md               (foreman vs craftsman, move-before-work, hierarchy)
|  +- 01-pick-and-lock.md            (Step 1-2 of ACTION)
|  +- 02-backlog-lookup.md           (Step 3 of ACTION)
|  +- 03-naming-contracts.md         (weapon name derivation, uniqueness checks)
|  +- 04-phase-1-command-center.md   (Step 4 of ACTION)
|  +- 05-phase-15-loremaster.md (Step 6 of ACTION; uses Task tool, not skill load)
|  +- 06-phase-2-weapon-forge.md     (Step 7 of ACTION)
|  +- 07-phase-3-guardian-creator.md    (Step 8 of ACTION)
|  +- 08-phase-4-dm-registrar.md    (Step 9 of ACTION)
|  +- 09-close-out.md                (Step 10 of ACTION: in-process -> completed, backlog [x])
|  +- 10-failure-modes.md            (queue empty, in-process non-empty, phase fails, naming conflict, etc.)
|  +- 11-reporting.md                (Step 11 of ACTION: final summary message format)
+- examples/
|  +- happy-path.md                  (worked end-to-end run from "queue has X at top" to "Guardian registered")
|  +- recovery-from-crashed-prior-run.md (what to do when in-process is non-empty on entry)
+- templates/
|  +- in-process-row.md              (canonical row format for in-process tracking file)
|  +- completed-row.md               (canonical row format for completed tracking file, with model triplet)
|  +- final-report.md                (stdout summary message shape)
+- reports/
|  +- README.md                      (what past-run summaries look like; accumulates over time)
+- research/                         (populated by loremaster; weapon-forge does not author)
   +- research-plan.md
   +- research-summary.md
   +- index.md
   +- internal/                      (6 source notes on canonical contract surfaces)
   +- external/                      (10 source notes on Cursor primitives, multi-agent prior art, FIFO mechanics)
```

## Critical directives (lifted from the Command Brief)

These are the non-negotiables. They are repeated verbatim in `guides/00-principles.md` with full justification and citations.

- **Process exactly ONE queue entry per invocation.** Why: each entry deserves its own human sign-off moment between runs.
- **Strict FIFO. Always pick from the TOP of the queue.** Why: the queue's documented `pickup_protocol` requires it.
- **Move-before-work.** Why: prevents sibling factory agents from racing onto the same entry.
- **Never modify queue body ordering or renumber.** Why: positions are permanent identifiers.
- **Always read the backlog metadata block.** Why: model identifiers and depth tier are inputs downstream skills consume.
- **Run the five phases in order; never skip or reorder.** Why: each phase consumes the previous phase's output.
- **Stop after dm-registrar.** Why: the user explicitly requires a human review window between cycles.
- **Refuse to start a new cycle if `proposed-guardians-in-process.md` already contains a row.** Why: only one cycle in flight at a time.
- **Update tracking files atomically per step.** Why: partial updates produce a desync that is hard to recover from.
- **Do not perform domain research, write guides, or author `SKILL.md` content yourself.** Why: `dms-hand` is the foreman, not the craftsman.

## Slot mode (parallel batch execution)

Slot mode is an additive, non-breaking extension for running multiple dms-hand instances in parallel. It is activated when the orchestrator passes `slot=NN` in the invocation prompt. Full protocol in `guides/12-slot-mode.md`.

**Contract summary:**

| Surface | Slot-mode behavior |
|---|---|
| `proposed-guardians-in-process.md` | Never touched (orchestrator manages) |
| `proposed-guardians-queue.md` | Never touched (orchestrator already dequeued) |
| `proposed-guardians-completed.md` | Never touched (orchestrator appends batch-atomically) |
| `proposed-guardians-backlog.md` | Never touched (orchestrator flips batch-atomically) |
| `proposed-guardians-in-process-slot-NN.md` | Read on entry, deleted on success/written with failure marker on fail |
| `ai-tools/.batch-state/slot-NN-roster-add.md` | Written: ready-to-append dm-roster row |
| `ai-tools/.batch-state/slot-NN-backlog-flip.md` | Written: SEARCH/REPLACE pair for backlog checkbox flip |
| `ai-tools/.batch-state/slot-NN-completion.md` | Written: completed-log entry with model triplet |
| `ai-tools/.batch-state/slot-NN.done` | Written as final signal on success |
| `ai-tools/.batch-state/slot-NN.failed` | Written instead of .done when a phase fails |
| `dm-registrar` skill | NOT invoked; orchestrator runs it serially after all slots complete |

The three fragment files are the slot's contribution to the shared tracking state. The orchestrator applies them batch-atomically after all `.done` signals are present.

## Open contract drift (from research)

The research surfaced one contradiction between the Command Brief and the existing queue file that `dms-hand` MUST flag the first time it runs:

- `ai-tools/proposed-guardians-queue.md`'s `pickup_protocol` describes a ONE-stage lifecycle (queue -> completed).
- The Command Brief and this weapon specify a TWO-stage lifecycle (queue -> in-process -> completed).

Treat the two-stage lifecycle as authoritative for `dms-hand`'s behavior. Note the drift in the first invocation's final report and recommend that the user (or `session-zero`'s owner) update the queue file's frontmatter `pickup_protocol` text to match. The fix is documentation-only; the row-format contract is unchanged.

## Pairing

| Role | Artifact |
|---|---|
| This weapon | `ai-tools/skills/dms-hand-weapon/` |
| Paired Guardian | `ai-tools/agents/dms-hand.md` |
| Command Brief | `ai-tools/command-briefs/dms-hand-command-brief.md` |
| Producer-side counterpart (proposes queue rows) | `ai-tools/agents/session-zero.md` + `ai-tools/skills/session-zero-weapon/` |
| Phase 1 worker (skill) | `ai-tools/skills/command-center/` |
| Phase 1.5 worker (subagent, via Task) | `ai-tools/agents/loremaster.md` |
| Phase 2 worker (skill) | `ai-tools/skills/weapon-forge/` |
| Phase 3 worker (skill) | `ai-tools/skills/guardian-creator/` |
| Phase 4 worker (skill) | `ai-tools/skills/dungeon-master-registrar/` |
| Queue file (read top, delete row) | `ai-tools/proposed-guardians-queue.md` |
| In-process tracking file (append, then delete) | `ai-tools/proposed-guardians-in-process.md` |
| Completed log (append on close-out) | `ai-tools/proposed-guardians-completed.md` |
| Backlog (flip checkbox on close-out) | `ai-tools/proposed-guardians-backlog.md` |

---

*Forged by `weapon-forge` from `dms-hand-command-brief.md` and `research/`. Part of the Guild AI Tools Factory by [Mario Aldayuz a.k.a @thenotoriousllama](https://github.com/thenotoriousllama).*
