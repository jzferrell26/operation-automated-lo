# dms-hand-weapon

The procedural arsenal for `dms-hand`, the pipeline-controller Guardian of the Guild AI Tools Factory.

`dms-hand` consumes ONE row at a time from `ai-tools/proposed-guardians-queue.md`, drives it through the canonical five-phase Guardian-forging pipeline (command-center -> loremaster -> weapon-forge -> guardian-creator -> dm-registrar), and updates the four tracking files (`proposed-guardians-queue.md`, `proposed-guardians-in-process.md`, `proposed-guardians-completed.md`, `proposed-guardians-backlog.md`) along the way. This weapon encodes everything `dms-hand` needs to do that reliably: the move-before-work invariant, the strict FIFO pickup protocol, the per-phase dispatch contracts, the close-out lifecycle, and the failure-mode catalog.

It does NOT encode any product-domain knowledge. The worker phases own all substantive content.

## Start here

1. `SKILL.md` is the master index.
2. `guides/00-principles.md` is the philosophy: foreman vs craftsman, move-before-work, hierarchy.
3. `guides/01-pick-and-lock.md` is the operational core: how to atomically claim a queue row.
4. `guides/10-failure-modes.md` is the recovery catalog.

## Folder map

- `guides/` -- 12 numbered procedure files (`00-` through `11-`). Read in order on first use.
- `examples/` -- worked end-to-end runs (`happy-path.md`, `recovery-from-crashed-prior-run.md`).
- `templates/` -- canonical row formats and the final-report shape.
- `reports/` -- where past-run summaries accumulate over time.
- `research/` -- raw research notes from `loremaster` (do not edit; `weapon-forge` reads at build time).

## Pairing

- Guardian: [`ai-tools/agents/dms-hand.md`](../../agents/dms-hand.md)
- Command Brief: [`ai-tools/command-briefs/dms-hand-command-brief.md`](../../command-briefs/dms-hand-command-brief.md)
- Producer counterpart: [`ai-tools/agents/session-zero.md`](../../agents/session-zero.md) + [`ai-tools/skills/session-zero-weapon/`](../session-zero-weapon/)
