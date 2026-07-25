# 08 — EditMode-Testable AI

This is the load-bearing guide. CLAUDE.md Hard Rule #11 is the law that keeps DRIFT's spine green, and it bites AI hardest because an FSM is *all* per-frame logic. Read `Assets/Tests/EditMode/RuntimeEnemyTests.cs` beside this guide — it is the pattern you preserve.

## 1. The constraint, restated

> Unity does **not** run `Awake`/`Start`/`Update` on script-added components in EditMode.

`RuntimeEnemyTests` builds enemies with `AddComponent<MutatedCrewEnemy>()` (`RuntimeEnemyTests.cs:114`). None of that enemy's lifecycle methods fire. So if the FSM's state were initialized only in `Awake`, or its target acquired only in `Start`, or its transitions driven only by `Update`, the tests could not run the FSM at all. The three patterns below exist precisely to defeat that.

## 2. The three patterns (with the real code)

### Pattern 1 — Lazy init (`EnsureInitialized()`)

State is initialized behind an idempotent guard, called from `Awake` **and from every public entry point** (`MutatedCrewEnemy.cs:36-56`):

```csharp
void Awake() => EnsureInitialized();

void EnsureInitialized()
{
    if (_initialized) return;
    _health = GetComponent<Health>();
    _spawnPosition = transform.position;
    _initialized = true;
    if (_health != null) _health.Died += OnDied;
}
```

And critically, `Step` and `Configure` *also* call it (`MutatedCrewEnemy.cs:88`, `:102`). That's why a test can `AddComponent` then immediately `Step` — the first `Step` initializes. **A field initialized only in `Awake` is a must-fix:** it's `null`/`default` in EditMode.

### Pattern 2 — Explicit `Configure(...)`

Dependencies are injected, not resolved through tags/scene lookups (`MutatedCrewEnemy.cs:84-89`):

```csharp
public void Configure(Transform player, Vector3 spawnPosition)
{
    EnsureInitialized();
    _player = player;
    _spawnPosition = spawnPosition;
}
```

The production `Start` tag lookup still exists as a fallback (`MutatedCrewEnemy.cs:66-78`), but tests never use it — they `Configure` a hand-built player (`RuntimeEnemyTests.cs:37`). **Perception/targets resolved *only* in `Start` are a must-fix:** the test has no tagged scene.

### Pattern 3 — Extracted `Step`/`Tick`

Frame logic lives in a public method taking `deltaSeconds`; `Update` only forwards `Time.deltaTime` (`MutatedCrewEnemy.cs:91-100`):

```csharp
void Update() => Step(Time.deltaTime);
public EnemyState Step(float deltaSeconds) { /* the whole FSM */ }
```

`Step` **returns the resulting state** so the test can assert on it directly. **Logic that only runs inside `Update` is a must-fix:** the test can't reach it.

## 3. The test shape (model on this)

`RuntimeEnemyTests` is the template for every AI test (`examples/03` walks through writing one):

1. **Build the actors by hand** — `CreateEnemy` and `CreatePlayer` `AddComponent` the pieces and track them for teardown (`RuntimeEnemyTests.cs:109-123`).
2. **`Configure` the FSM** — `enemy.Configure(player.transform, spawnAnchor)` (`RuntimeEnemyTests.cs:37`).
3. **Drive `Step` deterministically** — pass explicit `deltaSeconds`, step as many times as the transition needs, assert on the returned/queried state:
   ```csharp
   Assert.AreEqual(EnemyState.Chase, enemy.Step(0.1f));        // one-step transition
   enemy.Step(0.1f); enemy.Step(0.1f); enemy.Step(0.1f);       // idle->chase->attack->swing
   Assert.AreEqual(EnemyState.Attack, enemy.State);
   ```
4. **Control the world between steps** — place the player near/far, set the spawn anchor beyond leash, to drive each branch (`RuntimeEnemyTests.cs:98-107` drives the leash/Return path by anchoring spawn 30 units away).
5. **Tear down with `DestroyImmediate`** — never `Destroy` (illegal in EditMode), in `[TearDown]` (`RuntimeEnemyTests.cs:18-30`).

## 4. The branches you must cover

The shipped suite covers the canonical FSM exhaustively — match this bar for any state you add:

| Test | Branch | Reference |
|---|---|---|
| `DetectsPlayerInRange_AndEntersChase` | Idle→Chase | `RuntimeEnemyTests.cs:32` |
| `StaysIdle_WhenPlayerOutOfRange` | Idle stays | `:42` |
| `StaysIdle_WithNoTarget` | null-target guard | `:52` |
| `Chase_MovesTowardThePlayer` | Chase action closes gap | `:60` |
| `Attacks_PlayerInRange_ThenRespectsCooldown` | Chase→Attack + cooldown | `:77` |
| `ReturnsToSpawn_WhenLeashed` | Chase→Return past leash | `:97` |

For a new state, write: the transition *into* it, the transition(s) *out of* it, the *action* it performs per step, and any *guard* (cooldown/timer). A state without all four covered is a should-refactor at minimum.

## 5. Seams for the things physics can't test

EditMode has no live physics against script-added objects. Anything that would call `Physics.Raycast`/`OverlapSphere` inside `Step` (LOS in `guides/03`, avoidance in `guides/04`) must go behind an injectable delegate so a test can drive both branches:

```csharp
public Func<Vector3, Vector3, bool> LineOfSightCheck = DefaultRaycast;
```

The test sets `enemy.LineOfSightCheck = (_, _) => false;` and asserts the FSM behaves accordingly via `Step`. **A physics query hardwired into `Step` is a must-fix** — it makes the transition untestable and non-deterministic.

## 6. Cleanup that survives EditMode

`MutatedCrewEnemy.OnDied` calls `Destroy(gameObject, 0.1f)` (`MutatedCrewEnemy.cs:220-223`). That's fine in Play mode but illegal in EditMode. The spine's rule (`ARCHITECTURE.md` §7): editor-time `Object.Destroy` is illegal — use the play-mode-aware helper (`Tier0RuntimeSpawner.DestroyObject`) when code may run outside Play, and `DestroyImmediate` in tests. If a new death/cleanup path calls bare `Destroy` on a code path a test exercises, that's a must-fix.

## 7. The testability checklist (apply to every AI change)

- [ ] State initialized via `EnsureInitialized()`, called from `Awake` AND every public entry point.
- [ ] Dependencies injected via `Configure(...)`; nothing essential resolved only in `Start`.
- [ ] All frame logic in an extracted `Step`/`Tick(deltaSeconds)`; `Update` only forwards `Time.deltaTime`.
- [ ] `Step` exposes the resulting state (return value or property) for assertions.
- [ ] Every new transition has a `Step`-driven EditMode test (into, out of, action, guard).
- [ ] Physics-dependent perception is behind an injectable seam.
- [ ] Cleanup tolerates EditMode (no bare `Destroy` on tested paths; `DestroyImmediate` in teardown).
