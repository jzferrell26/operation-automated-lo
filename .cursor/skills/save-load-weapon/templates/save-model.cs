// templates/save-model.cs
//
// Tier 1 PREP template — the serializable save MODEL for DRIFT.
// This is a DESIGN artifact (see guides/09-tier-discipline-note.md): the Tier 0 gray-box
// deliberately ships with no save (GDD §3). Do not drop this into the project mid-Tier-0;
// it documents the shape the Tier 1 save grows into.
//
// Rules this template encodes:
//   - The save is a dedicated [Serializable] MODEL, NOT a MonoBehaviour/ScriptableObject (guides/01).
//   - Content is referenced by STABLE STRING ID (ItemDefinition.id), never by SO/object
//     reference, InstanceID, or array index (guides/03).
//   - Every save is VERSIONED; schemaVersion is the first field (guides/04).
//   - Shaped for UnityEngine.JsonUtility: flat, fields-only, lists not dictionaries,
//     wrapped in a top-level object (guides/02).

using System;
using System.Collections.Generic;

namespace Drift.Persistence
{
    /// <summary>
    /// Top-level save model. Bump <see cref="CurrentVersion"/> and add a migration
    /// (templates/save-migration.cs) whenever the schema changes.
    /// </summary>
    [Serializable]
    public class SaveGameV2
    {
        public const int CurrentVersion = 2;

        // ALWAYS first. Read before any other field on load (guides/04).
        public int schemaVersion = CurrentVersion;

        public SaveMetadata metadata = new();

        // Inventory as a LIST of slots keyed by string id (JsonUtility has no Dictionary; guides/02).
        public List<InventorySlotSave> inventorySlots = new();

        // (int)Drift.Gameplay.Bootstrap.Tier0LoopPhase. Pin enum integer values so a reorder
        // doesn't silently reinterpret old saves (guides/02 footgun, guides/04).
        public int loopPhase;

        // Stable objective keys, not indices.
        public List<string> completedObjectives = new();

        public List<MeterSave> meters = new();
    }

    /// <summary>
    /// Lightweight header for the "continue / load game" screen — primitives only,
    /// readable without rehydrating content by id (guides/06).
    /// </summary>
    [Serializable]
    public class SaveMetadata
    {
        public string savedAtIso;     // DateTime.UtcNow.ToString("o")
        public int inGameDay;         // GDD: raiders assault every 24h
        public float playtimeSeconds;
        public int loopPhase;         // duplicated here so the list screen needs no body
        public string appVersion;     // Application.version — for support/repro
    }

    [Serializable]
    public class InventorySlotSave
    {
        public string itemId;         // ItemDefinition.id — e.g. "scrap_metal". NEVER a reference.
        public int count;
        public int durability;        // Tier 1 durability economy (CLAUDE.md Hard Rule #2).
    }

    [Serializable]
    public class MeterSave
    {
        public string meterId;        // "oxygen" | "suit_power"
        public float current;
        public float max;
    }

    // ---------------------------------------------------------------------------------------------
    // Legacy shape kept ONLY so migrations can read it (guides/04, examples/02). Do not extend.
    // ---------------------------------------------------------------------------------------------
    [Serializable]
    public class SaveGameV1
    {
        public int schemaVersion = 1;
        public string[] itemIds;      // parallel arrays — reshaped into inventorySlots in v2
        public int[] counts;
        public int loopPhase;
    }

    /// <summary>Tiny probe used to read schemaVersion before committing to a full shape.</summary>
    [Serializable]
    public class SaveEnvelope
    {
        public int schemaVersion;
    }
}
