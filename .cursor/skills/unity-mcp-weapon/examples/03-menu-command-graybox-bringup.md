# Example 03 — Menu-Command-Driven Gray-Box Bring-Up

**Scenario:** you want the gray-box up *now*, deterministically, with the least chance of drift, and
then you want the agent to verify it and Play-test the loop. This is the recommended default
(`guides/07`, Hard Rule #4): **menu command to build, MCP to verify and refine.**

## Step 0 — Bridge wired, smoke test green

Confirm bridge **Running**, client configured, connection **Allowed**, and "create a cube" appeared
in the Hierarchy (`guides/02`–`03`). If the headless VM blocks this, see "headless" at the bottom.

## Step 1 — Build the world with one menu command

Run **`Drift → Setup Tier 0 Gray Box`** (`Tier0GrayBoxSetup.SetupTier0GrayBox`). It will, in order
(from the source):

1. `EnsureFolders()` — `Assets/Data/Items`, `Assets/Data/Crafting`, `Assets/Prefabs/Tier0`,
   `Assets/Scenes`.
2. `EnsurePlayerTag()` — adds the `Player` tag to `TagManager.asset` if missing.
3. `CreateTier0Content()` — 6 items (3 resources + 3 tools), 3 recipes, `ItemDatabase_Tier0`,
   `RecipeDatabase_Tier0`.
4. `EnsureSalvageNodePrefab()`, `EnsurePlayerPrefab(...)`, `EnsureO2GeneratorPrefab()`,
   `EnsureEnemyPrefab()` — the 4 prefabs, idempotently.
5. `CreateGrayBoxScene(...)` — a fresh empty scene wired with light, floor, markers, the player
   instance, the O2 deck (+ raid stub + objective tracker), the loop controller, both shuttle pads,
   3 salvage nodes + 3 tool caches, the enemy, the camera rig, and the HUD; saved to
   `Assets/Scenes/Tier0_GrayBox.unity`.
6. A confirmation dialog listing the controls.

This reproduces the canonical layout in `guides/04-scene-assembly.md` exactly, every time.

> **Quick alternative:** `Drift → Create Bootstrap Scene (quick)` makes a tiny scene containing only
> a `Tier0RuntimeSpawner`, which builds the world at runtime on Play. Use it for a throwaway play;
> use `Setup Tier 0 Gray Box` when you want the committed assets/scene (`examples/02`).

## Step 2 — Verify via MCP

With the scene open, drive MCP to verify (don't assume the build is perfect):

- Read the console — clean?
- Read the Hierarchy — does it match the assembly checklist (`guides/04`)? Player + 9 components,
  O2 deck trigger (deck visual collider removed), both pads `Configure`d to the loop, 3 nodes + 3
  caches, the enemy present (note: the menu command's enemy prefab is *not* `Configure`d with a
  target — unlike `Tier0RuntimeSpawner`, `Tier0GrayBoxSetup` relies on `MutatedCrewEnemy.Start()`'s
  `Player`-tag lookup, so confirm the player is tagged `Player`), camera follow + HUD present.
- Spot-check a couple of `Configure(...)` targets are wired.

## Step 3 — Play-test the loop

Enter Play mode and walk the loop (`guides/06`): descend (blue pad) → salvage 3 resources → craft 3
tools (`1`/`2`/`3`) → open the 3 caches → fight the mutation → extract (gold pad) → repair the raid
breach (`R`, Welder required) → HUD checklist completes.

This Guardian confirms it **runs clean**. The **"is it fun?"** call is the user's (`guides/06`,
`CLAUDE.md` §4). Hand polish to `game-feel-juice-guardian` and balance tweaks to
`game-balance-guardian`.

## Step 4 — (Optional) make ad-hoc tweaks via MCP

If the Play test surfaces a small placement issue (a node too far to reach, the enemy too close),
use MCP to nudge it — but if the tweak is *systematic*, fix it in `Tier0GrayBoxSetup` /
`Tier0RuntimeSpawner` (→ `unity-csharp-guardian`) and re-run the command, so the deterministic build
stays the source of truth. Don't let MCP tweaks silently diverge from the spawner (Hard Rule #5).

## Step 5 — Commit if this is the deliverable

If you're producing the committed scene, follow `examples/02-spawner-to-committed-scene.md` Steps
4-5 (commit the scene + `.meta`, update `ARCHITECTURE.md` + `CLAUDE.md` §3, re-verify green in a
real Editor).

## Headless VM

If you're on the headless VM (`AGENTS.md`), you can't run the menu command or Play here — the Editor
is interactive-only. Verify the spine via the EditMode suite (`unity-test-ci-guardian`), document the
bring-up, and **flag the menu-command + Play steps as pending a real-Editor run** (`guides/08`, Hard
Rule #8).
