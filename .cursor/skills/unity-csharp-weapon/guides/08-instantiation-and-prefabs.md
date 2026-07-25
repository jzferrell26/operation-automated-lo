# 08 — Instantiation and Prefabs

How Drift creates and destroys objects in code, the play-mode-aware destroy trap, and why Tier 0 builds its world from a code spawner instead of prefabs.

## The Tier 0 reality: a code spawner, not prefabs

Tier 0 deliberately ships **no committed `.unity` scene and no prefabs** (`AGENTS.md`, `CLAUDE.md` §3). The playable gray-box is assembled entirely in code by `Tier0RuntimeSpawner.Build()` (`ARCHITECTURE.md` §4), which is the canonical wiring diagram:

- Creates the player capsule and `AddComponent`s the eight-component stack (`04-component-composition.md`).
- Creates the O2 deck, shuttle pads, salvage nodes, enemy, and glue objects.
- Wires dependencies via `Configure(...)` — not scene references — so the same wiring works in code, in the editor, and in tests (`ARCHITECTURE.md` §4).

This is intentional for Tier 0's gray-box scope. Authored scenes and prefabs are how this *becomes* a real game (that's `unity-mcp-guardian`'s job — turning the code-built world into a committed `.unity` scene), but the **wiring contract** stays in the spawner. When you add a system to the loop, you add it to the spawner's `Build()` and its `Configure` wiring, and you update `ARCHITECTURE.md` §4.

## Instantiate patterns

When code does spawn objects:

- **`new GameObject(name)` + `AddComponent<T>()`** — the spawner's idiom for building composed objects from scratch (no prefab asset needed). Set the transform, then `Configure` the components.
- **`Instantiate(prefab)`** — when there *is* a prefab template (Tier 1+, or runtime-spawned content). Returns the clone; cache the components you need rather than re-`GetComponent`ing repeatedly.
- **`Instantiate(prefab, position, rotation, parent)`** — the overload that places and parents in one call, cheaper than instantiate-then-set.

For anything spawned repeatedly and destroyed (projectiles, salvage pickups, future raider waves), the answer is **object pooling**, not per-spawn `Instantiate`/`Destroy` — but pooling is a **performance** decision: surface it and hand the pooling design to `mobile-game-perf-guardian`. This Guardian owns that the spawn *shape* (composed components, `Configure` wiring) is correct.

## The destroy trap: no `Object.Destroy` in edit-mode-reachable code

This is `ARCHITECTURE.md` §7 and a **must-fix**: **editor-time `Object.Destroy` is illegal** — it throws `InvalidOperationException` ("Destroy may not be called from edit mode"). Any code that can run outside Play mode (which includes EditMode tests and editor tooling) must use a play-mode-aware helper:

```csharp
// Tier0RuntimeSpawner.DestroyObject — the canonical pattern
static void DestroyObject(Object obj)
{
    if (obj == null) return;
    if (Application.isPlaying) Object.Destroy(obj);
    else Object.DestroyImmediate(obj);   // edit-mode / test path
}
```

Note the asymmetry inside the spine: `MutatedCrewEnemy.OnDied` calls `Destroy(gameObject, 0.1f)` directly (`MutatedCrewEnemy.cs:222`) — that's fine **only because it runs from the death event during Play mode**, never in an EditMode test (where `Step` is driven but the enemy is never killed through the play loop). The rule: if there's any path where the destroy executes outside Play mode, route it through the `DestroyObject` helper. A bare `Object.Destroy` in a method an EditMode test might reach is a **must-fix**.

`DestroyImmediate` is for editor/test code only — never call it on a Play-mode object you'll touch later in the same frame; it removes the object synchronously and dangling references become `MissingReferenceException`s.

## Spawned-object lifecycle hygiene

- **Parent on spawn** to keep the hierarchy legible and let a single root teardown clean up children: `child.transform.SetParent(root.transform, false)`.
- **Cache components from the clone** immediately; don't `GetComponent` in a loop afterward.
- **Unsubscribe before destroy.** If the spawned object subscribed to events, its `OnDestroy` must detach them (`06-events-and-messaging.md`) — otherwise the destroyed object's handler fires later and throws.
- **`Configure` the clone** the same way the spawner configures hand-built objects — a clone with un-injected dependencies is half-wired.

## Prefabs (Tier 1 forward)

When the project moves from the code spawner to authored prefabs:

- A prefab is the serialized template; `Instantiate` clones it. Inspector-set `[SerializeField]` values come along (`05-serialization-and-inspector.md`).
- Prefab *variants* express "a raider that's like the base enemy but tougher" without code — composition + data, consistent with Hard Rule #3.
- Keep the `Configure` injection seam even with prefabs: cross-object references (the player transform a spawned enemy chases) are injected at spawn, not baked into the prefab. This preserves EditMode testability.

But none of this is Tier 0 — building a prefab pipeline now is a **tier violation** (Hard Rule #1). Flag it for Tier 1 and keep using the spawner.

## Findings to raise

- **Must-fix:** `Object.Destroy` (or any destroy) in a method reachable from EditMode/editor code without the `DestroyObject` play-mode guard.
- **Should-refactor:** a spawned/instantiated object left un-`Configure`d; components re-fetched in a loop after instantiation instead of cached; building a prefab/pooling pipeline in Tier 0 (tier violation — flag for Tier 1 / hand pooling to `mobile-game-perf-guardian`).
- **Note:** new loop systems are wired in `Tier0RuntimeSpawner.Build()` + `Configure`, and `ARCHITECTURE.md` §4 is updated in the same commit (Hard Rule #8).
