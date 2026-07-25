# 05 — GameObject & Prefab Ops

The mechanics of creating objects, attaching/configuring components, and building prefabs — both via
MCP and via the editor-script patterns DRIFT already uses. The DRIFT conventions here come straight
from `Tier0GrayBoxSetup.cs` and `Tier0RuntimeSpawner.cs`; mirror them so MCP-built objects match
editor-built ones.

## GameObject creation

The spawner uses three primitives, which is all the gray-box needs:

| Object | Primitive | Source |
|---|---|---|
| Player, enemy | `Capsule` | `CreatePlayer`, `CreateEnemy` |
| Salvage nodes, tool caches, deck | `Cube` | `CreateSalvage`, `CreateToolCache`, `CreateO2Deck` |
| Shuttle pads | `Cylinder` | `CreateShuttlePad` |
| Floor | `Plane` | `CreateFloor` |
| Markers, O2 root, loop controller, HUD | empty `GameObject` | `CreateMarker`, `CreateO2Deck`, `Build` |

When driving via MCP, ask for the primitive by name, set its transform (position/scale/rotation),
and adjust its collider (most gray-box objects use a **trigger** collider; the deck visual has its
collider **removed** and the trigger lives on the parent).

### Collider discipline (mirror the spawner)

- Salvage nodes, tool caches, shuttle pads: the primitive's collider is set to **`isTrigger =
  true`**.
- The O2 `Deck` cube: collider **removed**; the trigger `BoxCollider` lives on the `O2Generator`
  root, not the visual.
- The player: the default `CapsuleCollider` is **destroyed** and a `CharacterController` is added in
  its place.

Getting this wrong is the most common reason the loop "looks right but doesn't trigger."

## Component attach + configure — the two wiring styles

DRIFT components are written to be wired in two ways. Know which a given component wants:

### Style A — `Configure(...)` / `ConfigureRecipes(...)` (runtime + EditMode-safe)

This is the **preferred** style and what `Tier0RuntimeSpawner` uses, because Unity does **not** run
`Awake`/`Start`/`Update` on script-added components in EditMode (`CLAUDE.md` Hard Rule #11,
`ARCHITECTURE.md` §7). Explicit `Configure` calls do the wiring deterministically. Examples from the
spawner:

- `Tier0BuildPlanner.Configure(inventory, database)`
- `SimpleCrafter.ConfigureRecipes(quickRecipes)`
- `Tier0RaiderAssault.Configure(breach, objectives, position)`
- `Tier0LoopController.Configure(player.transform, stationSpawn, planetSpawn, objectives, assault)`
- `Tier0ShuttlePad.Configure(loop, objectives, extractsToStation)`
- `SalvageNode.Configure(item, amount)` / `Configure(item, amount, requiredToolId)`
- `MutatedCrewEnemy.Configure(player, position)`
- `TopDownFollowCamera.SetTarget(target)`

When the agent (or generated editor code) wires these, **call the `Configure` method** rather than
poking serialized fields. (Adding/removing/altering a `Configure` signature is
`unity-csharp-guardian`'s job — this Guardian only *calls* them.)

### Style B — `SerializedObject` field assignment (editor-asset path)

`Tier0GrayBoxSetup` wires prefab/scene fields through `SerializedObject` when building **assets**
(because it's setting persisted serialized values, not runtime state). Example:

```csharp
var serialized = new SerializedObject(salvage);
serialized.FindProperty("item").objectReferenceValue = item;
serialized.FindProperty("amount").intValue = amount;
serialized.FindProperty("requiredToolItemId").stringValue = requiredToolItemId ?? string.Empty;
serialized.ApplyModifiedPropertiesWithoutUndo();
```

Use Style B only inside editor scripts that author assets. For live-scene runtime wiring, Style A is
cleaner and EditMode-safe.

## The prefab pattern (from `Tier0GrayBoxSetup`)

`Tier0GrayBoxSetup` builds reusable prefabs idempotently. The pattern is worth copying verbatim
(see `templates/editor-menu-setup.cs`):

1. **`LoadOrCreatePrefabRoot(path, create)`** — if the prefab already exists, `LoadPrefabContents`;
   otherwise run the `create` factory. This is what makes the setup **re-runnable**.
2. **`EnsureComponent<T>(root)`** — `GetComponent<T>() ?? AddComponent<T>()`. Never double-adds.
3. Configure the component (height/radius, serialized fields, etc.).
4. **`SavePrefab(root, path)`** — `PrefabUtility.SaveAsPrefabAsset` + `UnloadPrefabContents`.

The four prefabs the setup builds: `SalvageNode.prefab`, `Player.prefab`, `O2Generator.prefab`,
`MutatedCrew.prefab` — all under `Assets/Prefabs/Tier0/`.

## Idempotency is the rule (Hard Rule #7)

Every assembly op should be safe to run twice:

- Prefabs: load-or-create.
- Components: ensure (get-or-add), never blind-add.
- The scene: the setup uses `EditorSceneManager.NewScene(EmptyScene)` then instantiates prefabs, so
  re-running produces the same world.

When driving via MCP, apply the same discipline: check whether an object/component exists before
adding it, and read it back after (`guides/03-driving-the-editor.md`). A half-applied, non-idempotent
op is harder to debug than a clean re-run.

## Tinting

The gray-box uses `GrayBoxVisuals.Tint(go, color)` for every colored object. The exact colors are in
the layout table (`guides/04-scene-assembly.md`). Tints are cosmetic — a tint mismatch is a **note**,
never a blocker (severity rubric in `00-principles.md`).
