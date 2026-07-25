# 06 — Running the Gray-Box Loop

The whole point of wiring MCP and assembling the scene: press Play and walk the Tier 0 loop
end-to-end. This guide is the bring-up + verification checklist. The loop steps and controls come
from `TIER0.md` §"Assembling the gray-box scene" and the spawner's debug log.

## The loop (the Tier 0 deliverable)

From the GDD §3 / `TIER0.md`:

> Stand on the station with a working O2 generator, take the shuttle down, walk the surface, salvage
> 3 resource types, craft the 3 starter tools, fight one mutation type, extract back to the station,
> survive one low-level raider assault. **If this isn't fun, stop and rethink before building
> anything below.**

## Bring-up: two paths

1. **Runtime spawn (zero setup):** add a `Tier0RuntimeSpawner` to an empty scene (or run
   `Drift → Create Bootstrap Scene (quick)`), press Play. `Build()` wires the whole world on `Awake`
   (it short-circuits if a `TopDownPlayerController` already exists). Fastest way to *play*, but the
   world is spawned each run, not committed.
2. **Authored scene:** run `Drift → Setup Tier 0 Gray Box` (`Tier0GrayBoxSetup`), open
   `Assets/Scenes/Tier0_GrayBox.unity`, press Play. This is the path toward a **committed** scene
   (`examples/02-spawner-to-committed-scene.md`).

Either way, MCP's role is to *enter Play mode, observe, and verify* — and, before that, to confirm
the scene matches the layout in `guides/04-scene-assembly.md`.

## The controls (gray-box)

From `TIER0.md` and the `Tier0GrayBoxSetup` dialog:

| Input | Action |
|---|---|
| `WASD` | Move (top-down) |
| Hold `Shift` | Sprint (drains suit power) |
| `Space` / LMB | Melee attack the mutation |
| Walk into cubes | Salvage / open tool caches |
| Stand on the cyan deck | Refill O2 (stepping off starts the drain) |
| `1` / `2` / `3` | Craft Cutter / Welder / Plasma Drill |
| `Tab` | Preview a deck plate in the build strip |
| Arrow keys | Move the build preview |
| `Enter` | Place the deck plate (if adjacency + material cost valid) |
| Blue pad | Descend to the planet |
| Gold pad | Extract back to the station |
| `R` | Repair the raid breach (once the Welder is crafted) |

## The end-to-end checklist (verify each beat)

Walk the loop and confirm each transition fires + the HUD checklist advances:

- [ ] **Start on the station** — O2 full while on the cyan deck.
- [ ] **Descend** — stand on the blue pad; player teleports to the planet drop point; O2 begins
      draining off the deck.
- [ ] **Sprint** — hold `Shift`; suit power drops; release to recover.
- [ ] **Salvage 3 resources** — walk into the scrap, polymer, and ore nodes; inventory fills.
- [ ] **Craft 3 tools** — `1`/`2`/`3` craft Cutter, Welder, Plasma Drill (needs the resources).
- [ ] **Open the 3 tool caches** — each gated cache opens only with its required tool.
- [ ] **Fight the mutation** — take a hit, attack it; `MutatedCrewEnemy` runs idle→chase→attack→
      return; `Health` resolves.
- [ ] **(Optional) build strip** — `Tab` preview, arrows move it, `Enter` places a deck plate when
      adjacency + cost are valid.
- [ ] **Extract** — stand on the gold pad; return to the station; the low-level raid breach starts.
- [ ] **Survive the raid** — repair the breach from the deck with `R` (Welder required).
- [ ] **HUD checklist marks the Tier 0 loop complete.**

## "Runs clean" vs "is it fun?"

This Guardian verifies **runs clean**: every beat fires, no console errors, the HUD completes. The
**"is it fun?"** call is the user's — it is the entire reason the gray-box exists (`CLAUDE.md` §4,
`TIER0.md`: *"Then ask the only question that matters: is the loop fun?"*). Do not declare the
objective done on "runs clean" alone; surface the clean run and hand the fun call to the user.
Polish/feel after the call is `game-feel-juice-guardian`'s; balance tweaks are
`game-balance-guardian`'s.

## When you can't Play (headless VM)

Per `AGENTS.md`, this VM has no interactive Editor. You cannot actually press Play here. In that
case:

- Verify the *logic* via the EditMode suite (`unity-test-ci-guardian`), which covers the spine.
- Document the bring-up steps and the layout you'd verify.
- **Flag the Play-mode verification as pending a real-Editor run** — never claim the loop "runs
  clean" if you couldn't run it (Hard Rule #8, severity rubric in `00-principles.md`).
