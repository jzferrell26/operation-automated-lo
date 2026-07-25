# Template: final report

The shape of the final summary message `dms-hand` emits at the end of every run. Filled out per `guides/11-reporting.md`.

## Markdown skeleton

```markdown
## dms-hand cycle report

<one-line summary in past tense>

## Tracking-file deltas

| File | Before | After |
|---|---|---|
| `proposed-guardians-queue.md` | top row was `NNN\|guardian-name` | top row is `MMM\|next-guardian-name` |
| `proposed-guardians-in-process.md` | empty | empty (after close-out) |
| `proposed-guardians-completed.md` | <N> rows | <N+1> rows |
| `proposed-guardians-backlog.md` | `### [ ] N. guardian-name` | `### [x] N. guardian-name` |

## Artifacts produced

- Command Brief: `ai-tools/command-briefs/<guardian-name>-command-brief.md`
- Weapon folder: `ai-tools/skills/<weapon-name>/` (guides/ N files, examples/ N files, templates/ N files, research/ N files)
- Guardian file: `ai-tools/agents/<guardian-name>.md`
- Dungeon Master's roster: row added to `ai-tools/skills/dungeon-master/SKILL.md` (line ~NN)
- Dungeon Master-side guide: `ai-tools/skills/dungeon-master/guides/<guardian-name>.md`

## Phase timing

| Phase | Worker | Duration | Status |
|---|---|---|---|
| 1 | command-center | <h:mm:ss> | OK |
| 1.5 | loremaster | <h:mm:ss> | OK |
| 2 | weapon-forge | <h:mm:ss> | OK |
| 3 | guardian-creator | <h:mm:ss> | OK |
| 4 | dm-registrar | <h:mm:ss> | OK |
| 10 (close-out) | dms-hand | <h:mm:ss> | OK |

## Flags and warnings

- <flag 1, or "No flags or warnings.">
- <flag 2>

## Next steps for the orchestrator

<one sentence telling the orchestrator what to do next>

---

dms-hand stopped. Awaiting next invocation.
```

## Filled-in example (happy path)

```markdown
## dms-hand cycle report

Forged Guardian `001|nextjs-guardian`. Pipeline complete in 22 minutes 44 seconds.

## Tracking-file deltas

| File | Before | After |
|---|---|---|
| `proposed-guardians-queue.md` | top row was `001|nextjs-guardian` | top row is `002|cursor-ide-guardian` |
| `proposed-guardians-in-process.md` | empty | empty |
| `proposed-guardians-completed.md` | empty | 1 row |
| `proposed-guardians-backlog.md` | `### [ ] 1. nextjs-guardian` | `### [x] 1. nextjs-guardian` |

## Artifacts produced

- Command Brief: `ai-tools/command-briefs/nextjs-guardian-command-brief.md`
- Weapon folder: `ai-tools/skills/nextjs-weapon/` (guides/ 8 files, examples/ 3 files, templates/ 5 files, research/ 92 files)
- Guardian file: `ai-tools/agents/nextjs-guardian.md`
- Dungeon Master's roster: row added to `ai-tools/skills/dungeon-master/SKILL.md` (line 23)
- Dungeon Master-side guide: `ai-tools/skills/dungeon-master/guides/nextjs-guardian.md`

## Phase timing

| Phase | Worker | Duration | Status |
|---|---|---|---|
| 1 | command-center | 0:01:23 | OK |
| 1.5 | loremaster | 0:12:45 | OK |
| 2 | weapon-forge | 0:06:11 | OK |
| 3 | guardian-creator | 0:01:42 | OK |
| 4 | dm-registrar | 0:00:38 | OK |
| 10 (close-out) | dms-hand | 0:00:05 | OK |

## Flags and warnings

- No flags or warnings.

## Next steps for the orchestrator

Cycle complete. Invoke `dms-hand` again to process row `002|cursor-ide-guardian`, or stop here for human review.

---

dms-hand stopped. Awaiting next invocation.
```

## Filled-in example (failure at Phase 2)

```markdown
## dms-hand cycle report

Cycle stopped at Phase 2 (weapon-forge). Row `005|vite-guardian` remains in-process with failure marker.

## Tracking-file deltas

| File | Before | After |
|---|---|---|
| `proposed-guardians-queue.md` | top row was `005|vite-guardian` | top row is `006|shadcn-component-library-guardian` |
| `proposed-guardians-in-process.md` | empty | `005|vite-guardian|failed:weapon-forge|2026-05-20` |
| `proposed-guardians-completed.md` | empty | empty (no close-out happened) |
| `proposed-guardians-backlog.md` | `### [ ] 5. vite-guardian` | unchanged |

## Artifacts produced

- Command Brief: `ai-tools/command-briefs/vite-guardian-command-brief.md` (Phase 1 OK)
- Weapon folder research subfolder: `ai-tools/skills/vite-weapon/research/` (Phase 1.5 OK, 87 files)
- Weapon SKILL.md: NOT produced (Phase 2 failed)
- Guardian file: NOT produced
- Dungeon Master's roster: NOT updated
- Dungeon Master-side guide: NOT produced

## Phase timing

| Phase | Worker | Duration | Status |
|---|---|---|---|
| 1 | command-center | 0:01:18 | OK |
| 1.5 | loremaster | 0:18:22 | OK |
| 2 | weapon-forge | 0:04:47 | FAILED |
| 3 | guardian-creator | N/A | skipped |
| 4 | dm-registrar | N/A | skipped |
| 10 (close-out) | dms-hand | N/A | skipped |

## Flags and warnings

- Phase 2 weapon-forge returned without writing SKILL.md. Worker logs indicate a model timeout during synthesis.
- Research folder is intact at `ai-tools/skills/vite-weapon/research/`. A retry of Phase 2 can reuse it without re-running loremaster.

## Next steps for the orchestrator

Resolve the Phase 2 failure (see worker logs), then either: (a) re-invoke `dms-hand` to retry from Phase 2 against the existing in-process row, or (b) manually roll back the row to the queue and try again later.

---

dms-hand stopped. Awaiting next invocation.
```
