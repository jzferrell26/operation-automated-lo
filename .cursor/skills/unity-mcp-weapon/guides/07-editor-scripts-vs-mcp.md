# 07 — Editor Scripts vs MCP-Driven Assembly

DRIFT has **three** ways to bring the gray-box into existence. Knowing which to reach for is the
single highest-leverage decision in this Weapon (Hard Rule #4). All three exist in the repo today.

## The three paths

### 1. `Tier0RuntimeSpawner` — runtime spawn (no scene, no setup)

`Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0RuntimeSpawner.cs`. A `MonoBehaviour` you drop on an
empty scene; on `Awake` (if `spawnOnAwake` and no player exists yet) it runs `Build()`, which wires
the **entire** world at runtime — items, recipes, player, deck, pads, nodes, enemy, HUD. Also
reachable via the `[ContextMenu("Build Tier 0 Now")]` entry.

- **Strengths:** zero setup; Play works on a bare scene; the data lives in memory
  (`ScriptableObject.CreateInstance`), so nothing has to be authored on disk.
- **Weakness:** the world is **recreated every run**. It is not a committed, inspectable, authored
  scene. Great for *playing now*; wrong as the Tier 0 *deliverable*.

### 2. `Tier0GrayBoxSetup` — editor menu commands (deterministic authored assets + scene)

`Assets/Scripts/Drift/Editor/Tier0GrayBoxSetup.cs` (`#if UNITY_EDITOR`). Two menu items:

- **`Drift → Create Bootstrap Scene (quick)`** — makes a scene with just a `Tier0RuntimeSpawner` in
  it (so path 1 runs on Play). One-liner bridge to the runtime spawner.
- **`Drift → Setup Tier 0 Gray Box`** — the full deterministic build: ensures folders + the `Player`
  tag, authors **real data assets** (`Assets/Data/Items/*`, `Assets/Data/Crafting/*`, the
  `ItemDatabase`/`RecipeDatabase`), builds **real prefabs** (`Assets/Prefabs/Tier0/*`), and writes a
  **saved scene** `Assets/Scenes/Tier0_GrayBox.unity`.

- **Strengths:** idempotent (`LoadOrCreatePrefabRoot` / `EnsureComponent`), produces persisted
  assets + a committable scene, repeatable identically. This is the path toward the **committed**
  Tier 0 scene.
- **Weakness:** it's a fixed recipe — it builds exactly what it builds. Tweaks beyond it need
  editing the script (→ `unity-csharp-guardian`) or MCP.

### 3. MCP-driven assembly — the agent drives the Editor live

The agent uses MCP tools to create/manipulate objects in the active scene
(`guides/03`–`05`). Flexible and interactive: inspect, tweak, add ad-hoc objects, verify, iterate.

- **Strengths:** flexibility; the agent can respond to what it sees; good for verification, small
  edits, and exploratory tweaks.
- **Weakness:** non-deterministic if freehanded; easy to drift from the canonical layout; slower for
  building the whole world than calling path 2.

## The decision rule

| Goal | Use |
|---|---|
| Just play the loop *right now*, throwaway | **Path 1** (`Tier0RuntimeSpawner`) |
| Produce the committed, authored Tier 0 scene + assets | **Path 2** (`Drift → Setup Tier 0 Gray Box`), then MCP to verify |
| Inspect / tweak / add an ad-hoc object / verify a live scene | **Path 3** (MCP) |
| A repeatable build the agent should extend | Extend **Path 2**'s idempotent pattern (`templates/editor-menu-setup.cs`) |

**Default for the Tier 0 endgame: Path 2 to build, Path 3 to verify and refine.** Don't hand-rebuild
via MCP what the menu command already builds idempotently (Hard Rule #4). MCP's value is the
*flexible* half — driving, inspecting, tweaking — not re-deriving a solved deterministic build.

## Why both code-built paths exist (and why MCP doesn't replace them)

The GDD's framing: *code is the solved part; scene assembly and feel are yours, and MCP is how the
agent helps with the in-Editor half* (`MCP.md`, `TIER0.md`). The editor scripts solve the
deterministic build; MCP fills the interactive gap (the "create a cube," the inspect, the tweak, the
Play-test verification). They are complementary, not competitors. The committed-scene endgame
(`examples/02-spawner-to-committed-scene.md`) leans on Path 2 precisely because determinism +
on-disk assets are what a committed scene needs.

## When the agent should write a new editor command vs drive via MCP

- **One-off / exploratory** → drive via MCP. No new code.
- **Repeatable / part of the build** → propose a new `MenuItem` command in the idempotent
  `Tier0GrayBoxSetup` style (template in `templates/editor-menu-setup.cs`), and **hand the actual C#
  authoring to `unity-csharp-guardian`**. This Guardian designs the bring-up; it doesn't own the
  gameplay/editor source.
