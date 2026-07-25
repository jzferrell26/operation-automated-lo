# 08 — Testing save/load (EditMode round-trip)

A save system you can't test headless is a save system you can't trust on this project — the EditMode suite is the only verification this VM can run (`AGENTS.md`). And EditMode has a hard constraint: **Unity does not call `Awake`/`Start`/`Update` on script-added components** (CLAUDE.md Hard Rule #11, `ARCHITECTURE.md` §7). The save service must be built around that, exactly like the rest of the spine.

## The three patterns (same as the spine)

`ARCHITECTURE.md` §7 lists the conventions every testable MonoBehaviour follows; the save service follows them too:

1. **Lazy init** — any state the service needs is set up in an `EnsureInitialized()` guard called from every public entry point, not only `Awake`. (Mirrors `SalvageInventory.EnsureSlots()` at `SalvageInventory.cs:241`.)
2. **Explicit `Configure(...)`** — inject the save root directory and the `ItemDatabase` (for rehydration) rather than resolving them only in `Awake`. This is also what lets a test redirect the save path to a temp dir (`guides/07`).
3. **Extracted pure steps** — `Capture`, `Apply`, `Serialize`, `Deserialize`, and `RunMigrations` are public methods with no Unity lifecycle dependency, so a test drives them directly.

## The round-trip test

The core test: capture runtime state → serialize → deserialize → apply to fresh runtime → assert the new runtime equals the old. No Play mode, no `Awake`.

```csharp
[Test]
public void Inventory_round_trips_by_id()
{
    // Arrange — build content + a configured inventory in EditMode
    var db = TestDatabase.WithItems("scrap_metal", "tool_welder");
    var inv = new GameObject().AddComponent<SalvageInventory>();
    inv.Add(db.Get("scrap_metal"), 14);          // matches Tier0Balance.ScrapMetalNodeAmount
    inv.Add(db.Get("tool_welder"), 1);

    var service = new SaveService();
    service.Configure(rootDir: TempDir(), database: db);

    // Act — full round trip through the model + serializer
    SaveGameV2 model = service.Capture(inv);
    string json = service.Serialize(model);
    SaveGameV2 reloaded = service.Deserialize(json);
    var freshInv = new GameObject().AddComponent<SalvageInventory>();
    service.Apply(reloaded, freshInv);

    // Assert — counts survive, keyed by id (NOT by object reference)
    Assert.AreEqual(14, freshInv.GetCount("scrap_metal"));
    Assert.AreEqual(1,  freshInv.GetCount("tool_welder"));
}
```

`SalvageInventory.GetCount(string)` (`SalvageInventory.cs:150`) makes this assertion clean — it already keys on the string id, so the test proves the id-not-reference rule end to end.

## Tests every save system needs

| Test | What it proves |
|---|---|
| **Round-trip equality** | Capture→serialize→deserialize→apply yields equal state. The core contract. |
| **ID rehydration** | A saved `itemId` resolves back to the right `ItemDefinition` via `TryGetById`. |
| **Unknown id is tolerated** | A save referencing a removed id skips the entry and does not throw (`guides/03`). |
| **Versioning** | A v1 JSON loaded by the current build runs migrations and ends at the current schema (`guides/04`, `examples/02`). |
| **Atomic write leaves a good file** | After `Save`, `save.json` parses; a simulated mid-write failure leaves `.bak` recoverable (`guides/05`). |
| **Corrupt primary falls back to `.bak`** | Garbage in `save.json` → load uses the backup, never throws. |
| **Fresh start on total corruption** | Both files garbage → load returns a fresh save, no exception. |

## Test-isolation discipline

- **Inject the save root** (`Configure(rootDir)`) and point it at a unique temp dir per test; delete it in `[TearDown]`. Never write to the real `persistentDataPath/saves` from a test.
- **Build content in code**, not from project assets — `ScriptableObject.CreateInstance<ItemDefinition>()` then set `id` (this is how the existing suite builds items; `ScriptableObject.CreateInstance` needs the Unity runtime, hence batchmode — `AGENTS.md`).
- **No order dependence** — each test creates its own inventory, database, and temp dir.

## Editor-time `Object.Destroy` caveat

Tearing down test GameObjects in EditMode must use the play-mode-aware destroy helper, not `Object.Destroy` (illegal in edit mode) — `ARCHITECTURE.md` §7 calls this out (`Tier0RuntimeSpawner.DestroyObject`). Apply the same in save tests' teardown.

## Checklist

- [ ] `Capture`/`Apply`/`Serialize`/`Deserialize`/`RunMigrations` are pure public methods, no `Awake` dependency.
- [ ] Save root + database injected via `Configure(...)`; tests redirect to a temp dir.
- [ ] Round-trip, rehydration, unknown-id, versioning, atomic-write, corruption-fallback tests all present.
- [ ] Tests build content via `ScriptableObject.CreateInstance`; no order dependence; temp dirs cleaned up.
- [ ] Lives under `Assets/Tests/EditMode/` as a `Runtime*Tests`-style suite, runnable via the batchmode command in `AGENTS.md`.
