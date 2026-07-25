# Example 02 — Converting the Code-Built World into a Committed Authored Scene

**Scenario:** the gray-box currently exists only as code — `Tier0RuntimeSpawner.Build()` spawns it
at runtime, and `Tier0GrayBoxSetup` can author it on demand, but `AGENTS.md` notes there's **no
committed `.unity` scene, no `.meta`, no full ProjectSettings**. The Tier 0 endgame is a *committed*
scene you open and Play, not a world re-spawned every run. This is how you get there. (`save-load`
is out of scope — this is about committing the *scene asset*, not a save file.)

## Why a committed scene is the goal

- `Tier0RuntimeSpawner` is great for *playing now* but rebuilds the world each run from in-memory
  `ScriptableObject.CreateInstance` — nothing persists, nothing is inspectable in the Project.
- A committed scene + on-disk data assets + prefabs is what makes the loop **reproducibly playable**
  and turns the `[IN PROGRESS]` Status-Map items (station hub, shuttle→planet) into real assets.
- `AGENTS.md`: once `.meta` files are generated on first import, they **"should be committed."**

## Step 1 — Author the assets + scene deterministically

Run **`Drift → Setup Tier 0 Gray Box`** (`Tier0GrayBoxSetup.SetupTier0GrayBox`). This is the
deterministic path (Hard Rule #4) and it produces exactly what you need to commit:

- Data assets: `Assets/Data/Items/*` (6 items), `Assets/Data/Crafting/*` (3 recipes), plus
  `ItemDatabase_Tier0` and `RecipeDatabase_Tier0`.
- Prefabs: `Assets/Prefabs/Tier0/{SalvageNode,Player,O2Generator,MutatedCrew}.prefab`.
- Scene: `Assets/Scenes/Tier0_GrayBox.unity` — fully wired (player, deck, pads, nodes, caches,
  enemy, loop controller, camera, HUD).

Because the command is idempotent (`LoadOrCreatePrefabRoot` / `EnsureComponent`), re-running it is
safe and yields the same world.

## Step 2 — Verify via MCP, then Play

- Open `Assets/Scenes/Tier0_GrayBox.unity`.
- Use MCP to read the Hierarchy and confirm it matches the canonical layout
  (`guides/04-scene-assembly.md`): player + 9 components, O2 deck trigger, both pads `Configure`d, 3
  nodes + 3 caches, the enemy present (the menu command's enemy prefab finds its target via
  `MutatedCrewEnemy.Start()`'s `Player`-tag lookup, not an explicit `Configure` — so confirm the
  player is tagged `Player`), camera + HUD.
- Press Play and walk the loop (`guides/06`). Confirm the HUD checklist completes.

## Step 3 — Decide how the committed scene bootstraps

Two valid shapes:

1. **Authored scene only** — the `Tier0_GrayBox.unity` the menu command saved already contains every
   object. No spawner needed. This is the cleanest committed deliverable.
2. **Authored scene + bootstrap** — keep a minimal scene with a `Tier0RuntimeSpawner` (the
   `Drift → Create Bootstrap Scene (quick)` shape). Simpler to commit, but the world is still
   code-spawned at runtime — so it doesn't actually retire the "build from code" state.

For the Tier 0 *deliverable*, prefer shape 1: the world is real assets, committed, inspectable.

## Step 4 — Commit the scene + its `.meta` (Hard Rule #9)

Commit:

- `Assets/Scenes/Tier0_GrayBox.unity` **and** `Tier0_GrayBox.unity.meta`.
- The data assets, prefabs, and **their `.meta` files** (Unity regenerates `.meta` on first import;
  `AGENTS.md` says they should then be committed).
- Whatever `ProjectSettings/*.asset` the setup touched (it ensures the `Player` tag via
  `TagManager.asset`) — commit those too if they're newly generated.

> **Scope reminder:** committing a scene is a *structure* change. Per `CLAUDE.md` Hard Rule #8,
> update `ARCHITECTURE.md`'s scene-structure section and the `CLAUDE.md` §3 Status-Map lines (the
> station-hub + shuttle→planet items move toward `[DONE]`) **in the same commit**. The actual C#
> source belongs to `unity-csharp-guardian`; the headless green re-verify belongs to
> `unity-test-ci-guardian`. Commit hygiene: this is one scoped change (`CLAUDE.md` Hard Rule #9).

## Step 5 — Re-verify green in a real Editor

`CLAUDE.md` §4's definition of done requires the EditMode suite green **in a real Unity editor**, not
just headless-authored. Hand that to `unity-test-ci-guardian`. If you committed the scene from a
headless context, **flag the Play-mode verification as pending a real-Editor run** (`guides/08`).

## Done when

`Assets/Scenes/Tier0_GrayBox.unity` (+ `.meta`) is committed, opens, and Plays the full loop; the
gray-box is no longer code-spawned; `ARCHITECTURE.md` + `CLAUDE.md` §3 reflect it.
