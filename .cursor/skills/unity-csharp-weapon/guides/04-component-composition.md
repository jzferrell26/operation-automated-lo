# 04 — Component Composition

Behaviour in Drift is assembled from small single-purpose components on a GameObject, not built up through deep MonoBehaviour inheritance. This is the Unity-native model and what `ARCHITECTURE.md` §4 describes.

## The player as the worked example

The player is not a `Player : Character : Entity` inheritance tower. It's a capsule carrying a stack of independent components (`ARCHITECTURE.md` §4):

```
Player (capsule + CharacterController)
  ├─ TopDownPlayerController   (movement, sprint)
  ├─ OxygenSystem              (signature meter)
  ├─ SuitPowerSystem           (sprint budget)
  ├─ Health                    (HP, Changed/Died)
  ├─ PlayerMeleeAttack         (combat)
  ├─ SalvageInventory          (slots/stacks)
  ├─ SimpleCrafter             (quick-craft)
  └─ Tier0BuildPlanner         (deck-plate preview)
```

Each component does one thing and knows almost nothing about the others. Want a player who can't sprint? Drop `SuitPowerSystem`. Want a destructible crate? Put `Health` on a cube. The enemy reuses `Health` the same way the player does (`MutatedCrewEnemy` is `[RequireComponent(typeof(Health))]`). Composition is what makes that reuse free.

## How components find each other

Three mechanisms, in order of preference:

### 1. `Configure(...)` injection (preferred for cross-object deps)

Explicit dependency injection. The component receives what it needs from a wiring authority (the spawner, the editor, or a test) instead of reaching out for it:

```csharp
// MutatedCrewEnemy.cs:84 — the FSM gets its target and leash anchor injected
public void Configure(Transform player, Vector3 spawnPosition)
{
    EnsureInitialized();
    _player = player;
    _spawnPosition = spawnPosition;
}
```

This is why the *same* wiring works in code, in the editor, and in tests (`ARCHITECTURE.md` §4, §7). `Tier0ObjectiveTracker`, `Tier0LoopController`, `Tier0RaiderAssault`, `Tier0ShuttlePad`, `Tier0BuildPlanner` all expose `Configure`. The spawner is the canonical caller (`09-the-drift-spine.md`).

### 2. `TryGetComponent` / `GetComponent` (for same-GameObject siblings)

When a component needs a sibling on the *same* GameObject, resolve it lazily and cache it:

```csharp
// TopDownPlayerController.EnsureDependencies()
if (_suitPower == null) _suitPower = GetComponent<SuitPowerSystem>();
```

`TryGetComponent` is preferred when the sibling is optional (no GC alloc on miss, clean bool branch) — see `LifeSupportZone.ApplyLifeSupport` resolving `OxygenSystem`/`SuitPowerSystem` on whatever entered the trigger:

```csharp
var hasOxygen = target.TryGetComponent<OxygenSystem>(out var oxygen);
```

### 3. `RequireComponent` (for mandatory siblings)

When a component cannot function without a sibling, declare it so Unity adds it and blocks removal:

```csharp
[RequireComponent(typeof(CharacterController))]
public class TopDownPlayerController : MonoBehaviour   // movement needs a controller
[RequireComponent(typeof(Health))]
public class MutatedCrewEnemy : MonoBehaviour           // an enemy that can't die is meaningless
```

## What NOT to do

- **`FindObjectOfType` / `GameObject.Find` in hot paths or as the primary wiring mechanism.** They scan the scene, don't survive renames, and can't be driven from a test. Use `Configure` injection. `MutatedCrewEnemy.Start` uses `FindGameObjectWithTag("Player")` *only as a fallback* and explicitly supports `Configure` so it never depends on the tag lookup (`MutatedCrewEnemy.cs:66-89`). A `FindObjectOfType` called every `Update` is a **should-refactor** (also a perf concern → `mobile-game-perf-guardian`).
- **Deep MonoBehaviour inheritance.** `Enemy : Character : MovableEntity : MonoBehaviour` fights Unity's component model and makes EditMode setup brittle. A shared *behaviour* (like HP) becomes a *component* (`Health`) every entity composes, not a base class. Plain-C# inheritance for non-MonoBehaviour helpers is fine; MonoBehaviour towers are a **should-refactor**.
- **Dungeon Master components.** One MonoBehaviour holding movement + inventory + combat + crafting is the inverse of composition. Split by responsibility — the player stack above is eight components for a reason.

## Composition + EditMode safety

Composition and the EditMode-safe pattern reinforce each other. Because `Configure` injects deps explicitly, a test can build the exact composed object it needs:

```csharp
var go = new GameObject();
var health = go.AddComponent<Health>();
var enemy = go.AddComponent<MutatedCrewEnemy>();
enemy.Configure(playerTransform, spawnPos);   // no Awake/Start needed
Assert.AreEqual(EnemyState.Idle, enemy.State);
```

If the enemy resolved its player only via `FindGameObjectWithTag` in `Start`, that test couldn't exist (`Start` doesn't run in EditMode — `01-monobehaviour-lifecycle.md`). Composition without `Configure` is half a solution.

## Findings to raise

- **Should-refactor:** deep MonoBehaviour inheritance where a shared component would do; a dungeon master component owning unrelated responsibilities; `FindObjectOfType`/`Find` as primary wiring or in a per-frame path; a mandatory sibling resolved without `RequireComponent`.
- **Style:** `GetComponent` where `TryGetComponent` reads cleaner for an optional sibling.
