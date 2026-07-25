// templates/save-service.cs
//
// Tier 1 PREP template — the atomic save/load service for DRIFT.
// DESIGN artifact (guides/09-tier-discipline-note.md): save is deferred to Tier 1
// (GDD §3 gray-box has no save). Do not add mid-Tier-0 without explicit scope elevation.
//
// Encodes:
//   - Atomic write: temp + flush + rename; one .bak backup (guides/05).
//   - Load fallback chain: primary -> backup -> fresh; never hard-crash (guides/05).
//   - persistentDataPath ONLY, via an INJECTED root so tests can redirect it (guides/07).
//   - EditMode-testable: lazy-init + Configure(...) + pure Capture/Apply/Serialize/Deserialize,
//     so a round-trip runs with no Awake/Start (CLAUDE.md Hard Rule #11, ARCHITECTURE.md §7).
//   - IDs not references: Apply rehydrates via the database's TryGetById (guides/03).

using System;
using System.IO;
using System.Collections.Generic;
using UnityEngine;
using Drift.Data.Items;
using Drift.Gameplay.Inventory;

namespace Drift.Persistence
{
    /// <summary>Minimal lookup the service needs to rehydrate ids -> items (guides/03).</summary>
    public interface IItemLookup
    {
        bool TryGetById(string id, out ItemDefinition item);
    }

    public class SaveService
    {
        string _rootDir;
        IItemLookup _items;
        bool _configured;

        const string SaveName = "save.json";
        const string TempName = "save.tmp";
        const string BakName  = "save.bak";

        /// <summary>
        /// Inject the save root and item lookup. In production pass
        /// Application.persistentDataPath; in tests pass a temp dir (guides/07, guides/08).
        /// </summary>
        public void Configure(string rootDir, IItemLookup database)
        {
            _rootDir = rootDir;
            _items = database;
            _configured = true;
        }

        void EnsureConfigured()
        {
            if (_configured) return;
            // Lazy default for production; tests always call Configure explicitly.
            _rootDir ??= Path.Combine(Application.persistentDataPath, "saves", "slot0");
            _configured = true;
        }

        // --- Pure capture/apply (no Unity lifecycle) -------------------------------------------

        /// <summary>Runtime -> model. Store item IDS, never references (guides/01, guides/03).</summary>
        public SaveGameV2 Capture(SalvageInventory inventory /*, loop, objectives, meters ... */)
        {
            var model = new SaveGameV2();
            if (inventory != null)
            {
                for (int i = 0; i < inventory.SlotCount; i++)
                {
                    var slot = inventory.GetSlot(i);
                    if (slot == null || slot.IsEmpty) continue;
                    model.inventorySlots.Add(new InventorySlotSave
                    {
                        itemId = slot.Item.id,          // <-- the stable id, NOT slot.Item
                        count = slot.Count,
                        durability = slot.Durability,
                    });
                }
            }
            model.metadata.savedAtIso = DateTime.UtcNow.ToString("o");
            model.metadata.appVersion = Application.version;
            return model;
        }

        /// <summary>Model -> runtime. Rehydrate ids via TryGetById; skip unknown ids (guides/03).</summary>
        public void Apply(SaveGameV2 model, SalvageInventory inventory)
        {
            if (model == null || inventory == null) return;
            foreach (var s in model.inventorySlots)
            {
                if (_items != null && _items.TryGetById(s.itemId, out var item) && item != null)
                {
                    inventory.Add(item, s.count);
                }
                else
                {
                    Debug.LogWarning($"[Drift.Save] Unknown item id '{s.itemId}' in save — skipped.");
                }
            }
            // loopPhase, completedObjectives, meters applied similarly...
        }

        // --- Serialization (swappable: JsonUtility default; Newtonsoft if needed) --------------

        public string Serialize(SaveGameV2 model) => JsonUtility.ToJson(model, prettyPrint: true);

        /// <summary>Reads schemaVersion first, runs the migration ladder, returns current shape.</summary>
        public SaveGameV2 Deserialize(string json)
        {
            int version = JsonUtility.FromJson<SaveEnvelope>(json).schemaVersion;
            return SaveMigrationRunner.Migrate(json, version);   // templates/save-migration.cs
        }

        // --- Atomic write (guides/05) ----------------------------------------------------------

        public void Save(SaveGameV2 model)
        {
            EnsureConfigured();
            Directory.CreateDirectory(_rootDir);
            string savePath = Path.Combine(_rootDir, SaveName);
            string tempPath = Path.Combine(_rootDir, TempName);
            string bakPath  = Path.Combine(_rootDir, BakName);

            File.WriteAllText(tempPath, Serialize(model));        // write + flush + close
            if (File.Exists(savePath))
                File.Copy(savePath, bakPath, overwrite: true);    // keep one .bak BEFORE overwrite

            // Atomic replace. delete-then-move is the cross-platform-safe shape; the .bak is
            // already in hand if we die between the two operations (guides/05).
            if (File.Exists(savePath)) File.Delete(savePath);
            File.Move(tempPath, savePath);
        }

        // --- Load fallback chain (guides/05) ---------------------------------------------------

        public SaveGameV2 Load()
        {
            EnsureConfigured();
            string savePath = Path.Combine(_rootDir, SaveName);
            string bakPath  = Path.Combine(_rootDir, BakName);

            if (TryLoadFile(savePath, out var primary)) return primary;
            Debug.LogWarning("[Drift.Save] Primary save unreadable — falling back to backup.");
            if (TryLoadFile(bakPath, out var backup))
            {
                Save(backup);                                     // re-promote backup to primary
                return backup;
            }
            Debug.LogWarning("[Drift.Save] No readable save — starting fresh.");
            return new SaveGameV2();                              // never throw to the player
        }

        bool TryLoadFile(string path, out SaveGameV2 model)
        {
            model = null;
            try
            {
                if (!File.Exists(path)) return false;
                string json = File.ReadAllText(path);
                int version = JsonUtility.FromJson<SaveEnvelope>(json).schemaVersion;
                if (version <= 0) return false;                   // parse sanity gate
                model = SaveMigrationRunner.Migrate(json, version);
                return model != null;
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[Drift.Save] Failed to load '{path}': {e.Message}");
                return false;
            }
        }
    }
}
