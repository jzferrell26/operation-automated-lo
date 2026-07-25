// templates/save-migration.cs
//
// Tier 1 PREP template — the save migration interface + ordered runner for DRIFT.
// DESIGN artifact (guides/09-tier-discipline-note.md): save is deferred to Tier 1.
//
// Encodes:
//   - schemaVersion read FIRST; runner steps version-by-version, no skipping (guides/04).
//   - Each migration is a small, individually testable unit (guides/04, examples/02).
//   - Content-id renames live in migrations — possible only because saves store ids,
//     not references (guides/03).

using UnityEngine;

namespace Drift.Persistence
{
    /// <summary>
    /// One ordered step. With JsonUtility, migrate on deserialized DTOs (keep the old DTO class,
    /// e.g. SaveGameV1). If the ladder grows long or shapes get unknowable, switch the runner to
    /// Newtonsoft and migrate on a JObject (guides/02, guides/04).
    /// </summary>
    public interface ISaveMigration
    {
        int FromVersion { get; }
        int ToVersion { get; }
    }

    /// <summary>v1 -> v2 (see examples/02): reshape parallel arrays into slots,
    /// add per-slot durability, remap a renamed content id.</summary>
    public sealed class Migration_1_to_2 : ISaveMigration
    {
        public int FromVersion => 1;
        public int ToVersion => 2;

        public SaveGameV2 Apply(SaveGameV1 v1)
        {
            var v2 = new SaveGameV2 { schemaVersion = 2, loopPhase = v1.loopPhase };
            int n = v1.itemIds?.Length ?? 0;
            for (int i = 0; i < n; i++)
            {
                v2.inventorySlots.Add(new InventorySlotSave
                {
                    itemId = RemapId(v1.itemIds[i]),                                   // id rename
                    count = (v1.counts != null && i < v1.counts.Length) ? v1.counts[i] : 0,
                    durability = 0,                                                    // new field default
                });
            }
            return v2;
        }

        static string RemapId(string oldId) => oldId switch
        {
            "tool_cutter" => "cutter",
            _ => oldId,
        };
    }

    // Future steps register here as they are written:
    // public sealed class Migration_2_to_3 : ISaveMigration { ... }

    /// <summary>
    /// Ordered migration runner. Reads the version, steps up one at a time to CurrentVersion.
    /// Unknown/newer versions return a fresh save rather than crashing (guides/05).
    /// </summary>
    public static class SaveMigrationRunner
    {
        public static SaveGameV2 Migrate(string json, int version)
        {
            switch (version)
            {
                case 1:
                {
                    var v1 = JsonUtility.FromJson<SaveGameV1>(json);
                    var v2 = new Migration_1_to_2().Apply(v1);
                    // When Migration_2_to_3 exists, chain it here: v2 -> v3 -> ...
                    return v2;
                }
                case 2:
                    return JsonUtility.FromJson<SaveGameV2>(json);

                default:
                    Debug.LogWarning(
                        $"[Drift.Save] Unknown schemaVersion {version} — starting fresh.");
                    return new SaveGameV2();
            }
        }
    }
}
