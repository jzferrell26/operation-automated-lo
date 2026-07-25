# Dungeon Master's Hand: Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `dms-hand`. Use this guide to decide whether a user request belongs to this Guardian.

**Guardian:** [`ai-tools/agents/dms-hand.md`](../../../agents/dms-hand.md)
**Weapon:** [`ai-tools/skills/dms-hand-weapon/`](../../dms-hand-weapon/)
**Command Brief:** [`ai-tools/command-briefs/dms-hand-command-brief.md`](../../../command-briefs/dms-hand-command-brief.md)
**Trigger policy:** proactive (with strictly explicit trigger phrases; never volunteers on topic alone)

---

## Domain

`dms-hand` is the Guild AI Tools Factory's pipeline-controller Guardian. It owns the end-to-end execution of a single Guardian-forging cycle: pick the top queue row from `ai-tools/proposed-guardians-queue.md`, lock it into `ai-tools/proposed-guardians-in-process.md`, look up its backlog metadata, drive the canonical five-phase pipeline (command-center, loremaster, weapon-forge, guardian-creator, dm-registrar) in order, then close out by moving the row to `ai-tools/proposed-guardians-completed.md` and flipping the backlog checkbox to `[x]`. It is the foreman, not the craftsman; it dispatches workers but does no domain research, guide authoring, or skill writing itself. Each invocation processes exactly ONE row and stops.

`dms-hand` is the consumption side of the queue that `session-zero` produces. The two share the same row-format and position-numbering contracts but never write the same files in the same direction.

## Trigger phrases

Route to `dms-hand` when the user says any of:

- "run the pipeline"
- "advance the factory"
- "process the next queued Guardian"
- "drain one entry from the queue"
- "dms-hand, go"
- "kick off the forge for the next row"
- "consume the top queue entry"

Only route on EXPLICIT, near-verbatim variants of these phrases. `dms-hand` is `proactive: true` for format consistency with other roster Guardians, but the trigger phrases are tight on purpose: this Guardian mutates four tracking files and dispatches four sub-skills (plus one subagent) per run. Volunteering on ambiguous topic mentions is a high-cost mistake.

## Do NOT route when

- The user says "propose a new Guardian", "add a guardian to the queue", "queue up a new subagent" -- that is `session-zero`, not `dms-hand`. `session-zero` produces queue rows; `dms-hand` consumes them.
- The user says "research the topic before weapon-forge" or "loremaster, gather sources" -- that is `loremaster` standalone. `dms-hand` invokes `loremaster` as Phase 1.5 of a full cycle; it does not run research in isolation.
- The user says "build this skill" or "scaffold the weapon folder" without naming the queue, the factory, or the pipeline -- that is `weapon-forge` standalone. `dms-hand` invokes `weapon-forge` as Phase 2.
- The user says "create the Guardian file" or "wire up the subagent" -- that is `guardian-creator` standalone. `dms-hand` invokes `guardian-creator` as Phase 3.
- The user says "register the Guardian with Dungeon Master" or "add to Dungeon Master's roster" -- that is `dm-registrar` standalone. `dms-hand` invokes `dm-registrar` as Phase 4.
- The user wants to forge a SPECIFIC Guardian out of order (e.g. "build `mongodb-guardian` next, skip `vue-nuxt-pinia-guardian`") -- `dms-hand` is strict FIFO. The user must either (a) wait for the FIFO progression to reach the desired row, or (b) manually rewrite the queue order (which violates `session-zero`'s position-numbering rules and is generally not recommended).
- The user wants `dms-hand` to keep going after a cycle (e.g. "now do the next one"). Strict one-cycle-per-invocation. The orchestrator (or human) must re-invoke `dms-hand` for the next row.

If a request straddles `dms-hand` and a single worker phase, prefer the worker phase. `dms-hand` should only fire for the full pipeline.

## Inputs the Guardian needs

Before invoking, ensure (or infer):

- A non-empty `ai-tools/proposed-guardians-queue.md`. If the queue is empty, `dms-hand` will stop with "queue empty" and report.
- An empty `ai-tools/proposed-guardians-in-process.md`. If it has an orphaned row from a prior failed cycle, `dms-hand` will STOP at pre-flight and surface the orphan for human resolution per `examples/recovery-from-crashed-prior-run.md`.
- A populated `ai-tools/proposed-guardians-backlog.md` with the matching `### [ ] N. guardian-name` heading and a complete metadata block for whatever row is currently at the top of the queue.
- Working access to the four downstream phase skills (`command-center`, `weapon-forge`, `guardian-creator`, `dm-registrar`) and the `loremaster` subagent.

If a required input is missing, do not invoke yet. Surface the gap to the user and let them decide whether to fix it (e.g., resolve an orphan row, populate the backlog metadata) before re-invoking.

## Outputs the Guardian produces

A successful `dms-hand` cycle produces:

- **Command Brief** at `ai-tools/command-briefs/<guardian-name>-command-brief.md`
- **Weapon folder** at `ai-tools/skills/<weapon-name>/` with `SKILL.md`, `README.md`, populated `guides/`, `examples/`, `templates/`, `reports/README.md`, and `research/`
- **Guardian file** at `ai-tools/agents/<guardian-name>.md`
- **Dungeon Master's roster** updated in `ai-tools/skills/dungeon-master/SKILL.md` with a new row plus a guide at `ai-tools/skills/dungeon-master/guides/<guardian-name>.md`
- **Tracking-file deltas**: queue row removed, in-process row appended-then-removed, completed row appended (with model triplet), backlog checkbox flipped to `[x]`
- **Final report**: a six-section markdown message to the caller summarizing all of the above, ending with the canonical stop line `dms-hand stopped. Awaiting next invocation.`

A failed cycle produces a partial set of artifacts plus an in-process row marked `|failed:<phase>|YYYY-MM-DD` for human recovery.

## Multi-Guardian sequences this Guardian participates in

### Guild AI Tools Factory pipeline (canonical Guardian-forging cycle)

This is the sequence `dms-hand` orchestrates. `dms-hand` is the root planner; the others are workers.

1. **`session-zero`** appends a new Guardian proposal to `proposed-guardians-backlog.md` and `proposed-guardians-queue.md`. (Producer side; `dms-hand` does not invoke `session-zero`.)
2. **`dms-hand`** picks the top queue row and locks it into in-process.
3. **`dms-hand`** invokes **`command-center`** to author the Command Brief. (Phase 1)
4. **`dms-hand`** scaffolds the weapon folder skeleton.
5. **`dms-hand`** invokes **`loremaster`** via the Task tool to conduct depth-calibrated research. (Phase 1.5)
6. **`dms-hand`** invokes **`weapon-forge`** to author the weapon's SKILL.md, guides, examples, templates, reports. (Phase 2)
7. **`dms-hand`** invokes **`guardian-creator`** to author the Guardian file. (Phase 3)
8. **`dms-hand`** invokes **`dm-registrar`** to add the roster row and author the dm-side guide. (Phase 4)
9. **`dms-hand`** closes out: in-process row to completed log (with model triplet), backlog checkbox to `[x]`.
10. **`dms-hand`** emits the final report and stops.

The next cycle starts only when `dms-hand` is re-invoked by the orchestrator. There is no auto-advance.

## Critical directives the orchestrator should respect

When routing requests to `dms-hand`, the orchestrator should understand and honor:

- **One cycle per invocation.** Do not ask `dms-hand` to "process the next three" or "keep going until the queue is empty". Each cycle requires its own invocation.
- **Strict FIFO from the top.** Do not pass a specific guardian name as input. `dms-hand` always picks the lowest-`NNN` row in the queue. If the user wants a specific row, they must wait for FIFO progression or manually edit the queue (not recommended).
- **No mid-cycle retries from the orchestrator.** If `dms-hand` reports a failed phase with an in-process marker, the orchestrator should surface the failure to the user and let the user decide the recovery option (retry from phase, roll back to queue, mark abandoned). Do not silently re-invoke `dms-hand` hoping the failure was transient.
- **Honor the stop line.** When `dms-hand` emits `dms-hand stopped. Awaiting next invocation.`, do not continue the conversation as if more was happening. The cycle is over.
- **Do not invoke `dms-hand` to run a single phase.** If the user wants only `command-center` or only `weapon-forge`, route directly to that skill, not to `dms-hand`.

(Full list of internal directives lives in the Guardian file's `## Critical directives` section. The orchestrator-facing subset is above.)

---

*Part of Dungeon Master's roster. See [`ai-tools/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
