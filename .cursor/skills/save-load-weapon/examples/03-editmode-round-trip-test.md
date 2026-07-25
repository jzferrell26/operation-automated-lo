# Example 03 — An EditMode round-trip + migration test

> **Tier discipline:** Tier 1 prep (`guides/09-tier-discipline-note.md`). The test follows the same EditMode conventions as the existing `Runtime*Tests` suites so it's runnable via the batchmode command in `AGENTS.md` — the only verification this VM can run.

## What it covers

1. Inventory round-trips by **id** (capture → serialize → deserialize → apply), proving the id-not-reference rule end to end (`guides/03`).
2. An **unknown id** in a save is skipped, not thrown on.
3. A **v1 JSON** loads through the migration ladder to the current schema (`guides/04`, `examples/02`).

These match the test taxonomy in `guides/08-testing-save-load.md`.

## The test

```csharp
using System.IO;
using NUnit.Framework;
using UnityEngine;
using Drift.Data.Items;
using Drift.Gameplay.Inventory;
using Drift.Persistence;

namespace Drift.Tests
{
    public class RuntimeSaveLoadTests
    {
        string _tempDir;

        [SetUp]
        public void SetUp()
        {
            // Inject a unique temp root so tests never touch real persistentDataPath (guides/07)
            _tempDir = Path.Combine(Application.persistentDataPath, "test-" + System.Guid.NewGuid());
            Directory.CreateDirectory(_tempDir);
        }

        [TearDown]
        public void TearDown()
        {
            if (Directory.Exists(_tempDir)) Directory.Delete(_tempDir, recursive: true);
        }

        static ItemDefinition MakeItem(string id, int stackMax = 99)
        {
            // ScriptableObject.CreateInstance requires the Unity runtime -> batchmode (AGENTS.md)
            var def = ScriptableObject.CreateInstance<ItemDefinition>();
            def.id = id;
            def.displayName = id;
            def.stackMax = stackMax;
            return def;
        }

        [Test]
        public void Inventory_round_trips_by_id()
        {
            var scrap = MakeItem("scrap_metal");
            var welder = MakeItem("tool_welder", stackMax: 1);
            var db = new TestItemDatabase(scrap, welder);   // wraps ItemDatabase.TryGetById

            var inv = new GameObject("inv").AddComponent<SalvageInventory>();
            inv.Add(scrap, 14);     // Tier0Balance.ScrapMetalNodeAmount
            inv.Add(welder, 1);

            var service = new SaveService();
            service.Configure(rootDir: _tempDir, database: db);

            // Full round trip — no Play mode, no Awake (Hard Rule #11)
            SaveGameV2 model = service.Capture(inv);
            string json = service.Serialize(model);
            SaveGameV2 reloaded = service.Deserialize(json);

            var freshInv = new GameObject("fresh").AddComponent<SalvageInventory>();
            service.Apply(reloaded, freshInv);

            Assert.AreEqual(14, freshInv.GetCount("scrap_metal"));   // GetCount keys on the string id
            Assert.AreEqual(1,  freshInv.GetCount("tool_welder"));   // (SalvageInventory.cs:150)
        }

        [Test]
        public void Unknown_item_id_is_skipped_not_thrown()
        {
            var db = new TestItemDatabase(MakeItem("scrap_metal"));
            var service = new SaveService();
            service.Configure(rootDir: _tempDir, database: db);

            var model = new SaveGameV2();
            model.inventorySlots.Add(new InventorySlotSave { itemId = "scrap_metal", count = 5 });
            model.inventorySlots.Add(new InventorySlotSave { itemId = "removed_item", count = 3 }); // gone

            var inv = new GameObject("inv").AddComponent<SalvageInventory>();
            Assert.DoesNotThrow(() => service.Apply(model, inv));    // tolerant (guides/03)
            Assert.AreEqual(5, inv.GetCount("scrap_metal"));
            Assert.AreEqual(0, inv.GetCount("removed_item"));
        }

        [Test]
        public void V1_json_migrates_to_current_schema()
        {
            var service = new SaveService();
            service.Configure(rootDir: _tempDir, database: new TestItemDatabase(MakeItem("cutter")));

            // A v1 save: parallel arrays, old content id "tool_cutter", no durability (examples/02)
            string v1Json =
                "{\"schemaVersion\":1,\"itemIds\":[\"tool_cutter\"],\"counts\":[1],\"loopPhase\":0}";

            SaveGameV2 migrated = service.Deserialize(v1Json);       // runs the ladder internally

            Assert.AreEqual(2, migrated.schemaVersion);
            Assert.AreEqual(1, migrated.inventorySlots.Count);
            Assert.AreEqual("cutter", migrated.inventorySlots[0].itemId);   // id remapped
        }
    }
}
```

## Why each pattern is here

- **Injected `rootDir`** (`Configure`) → the test redirects all I/O to a temp dir and never pollutes the real `persistentDataPath/saves` (`guides/07`, `guides/08`).
- **`Capture`/`Serialize`/`Deserialize`/`Apply` are pure public methods** → the round trip runs with no Unity lifecycle, satisfying Hard Rule #11 / `ARCHITECTURE.md` §7.
- **Content built via `ScriptableObject.CreateInstance`** → the same approach the existing suite uses; requires batchmode (`AGENTS.md`), no order dependence.
- **Asserts on `GetCount(string)`** → proves the saved/restored value is keyed by **id**, the whole point of `guides/03`.

Place under `Assets/Tests/EditMode/RuntimeSaveLoadTests.cs` alongside the other `Runtime*Tests`, run via:

```
~/unity-setup/Editor/Unity -batchmode -nographics -projectPath /workspace \
  -runTests -testPlatform EditMode -testResults /tmp/results.xml -logFile /tmp/test.log \
  -testFilter "Drift.Tests.RuntimeSaveLoadTests"
```
