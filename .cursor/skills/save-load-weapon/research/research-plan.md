# Research plan — save-load-weapon

The load-bearing claims in this Weapon's guides rest on Unity's own documentation and well-established persistence patterns. Sources are named, not linked with fabricated URLs — locate each by its title in the official Unity Manual / Scripting API (version: Unity 6 / `6000.0`, per `ProjectSettings/ProjectVersion.txt`) or the named package docs.

## Topics and the guide each supports

| # | Topic | Supports guide | Primary sources (by name) |
|---|---|---|---|
| 1 | Tier discipline — why save is deferred | `09-tier-discipline-note.md`, `00-principles.md` | Project docs: `CLAUDE.md` §3/§4/§7 + Hard Rule #1; `space-survival-design-doc.md` §3 (gray-box "no save system even"); `ARCHITECTURE.md` §3/§8; `TIER0.md` ("Not in Tier 0") |
| 2 | Save model vs runtime objects; capture/apply | `01-what-to-persist.md` | Unity Manual: "Script Serialization"; "ScriptableObject"; general DTO/persistence pattern (a save is a data model, not a live object) |
| 3 | JsonUtility capabilities + limits | `02-json-vs-unity-serialization.md` | Unity Scripting API: `JsonUtility.ToJson` / `JsonUtility.FromJson`; Unity Manual: "JSON Serialization" (notes: no Dictionary, fields only, no top-level arrays, no polymorphism) |
| 4 | Newtonsoft for Unity | `02-json-vs-unity-serialization.md` | Unity package: `com.unity.nuget.newtonsoft-json` ("Newtonsoft Json Unity Package") docs; Newtonsoft.Json docs (note: avoid `TypeNameHandling` — known deserialization RCE footgun) |
| 5 | BinaryFormatter deprecation / risk | `02-json-vs-unity-serialization.md` | .NET docs: `BinaryFormatter` security guidance / obsoletion (SYSLIB0011); rationale for not using it for saves |
| 6 | Stable content ids vs object references / InstanceID | `03-save-schema-and-ids.md` | Unity Scripting API: `Object.GetInstanceID` (per-session, not persistent); Unity Manual: "ScriptableObject" + asset GUID concept; project code: `ItemDefinition.id`, `ItemDatabase.TryGetById`, `Tier0Balance` id constants, `SalvageInventory` id-keyed counts |
| 7 | Schema versioning + ordered migration | `04-versioning-and-migration.md` | General schema-evolution practice (additive-first; version field; ordered migrations); Unity `ISerializationCallbackReceiver` (for in-object version fixups when relevant) |
| 8 | Atomic file write (temp + rename) | `05-atomic-writes-and-corruption.md` | .NET I/O: `File.WriteAllText`, `File.Move`, `File.Replace`, `File.Copy`; POSIX atomic-rename semantics; defensive-load (fallback chain) pattern |
| 9 | Corruption handling / backups / checksum | `05-atomic-writes-and-corruption.md` | .NET: `System.Security.Cryptography` (SHA-256) / CRC for integrity; try/catch defensive deserialize |
| 10 | Save slots + metadata header | `06-save-slots-and-metadata.md` | Pattern: sidecar metadata vs in-file header; Unity `Application.version` for the header |
| 11 | persistentDataPath + mobile platform paths | `07-persistentdatapath-and-platforms.md` | Unity Scripting API: `Application.persistentDataPath`, `Application.dataPath`, `Application.temporaryCachePath`; Unity Manual: per-platform path resolution (iOS Documents + iCloud backup, Android internal storage); iOS `NSURLIsExcludedFromBackupKey` |
| 12 | EditMode round-trip testing under the Awake-less rule | `08-testing-save-load.md` | Unity Test Framework docs (EditMode tests, NUnit); project conventions: `CLAUDE.md` Hard Rule #11, `ARCHITECTURE.md` §7, `AGENTS.md` (batchmode `-runTests -testPlatform EditMode`); `ScriptableObject.CreateInstance` requires the Unity runtime |
| 13 | Lifecycle hooks for save triggers | `05-atomic-writes-and-corruption.md` | Unity Scripting API: `MonoBehaviour.OnApplicationPause`, `OnApplicationQuit` (fire on mobile backgrounding) |

## Method

- **Project truth before web.** Every tier-discipline and code-grounding claim is verified against the actual repo files (`CLAUDE.md`, GDD, `ARCHITECTURE.md`, `TIER0.md`, `AGENTS.md`, and the real spine under `Assets/Scripts/Drift/`), not from memory.
- **Unity sources by name.** Manual/Scripting API pages are cited by their exact title so they can be found in the Unity 6 docs set without a guessed URL.
- **No fabricated URLs.** Where a guide says "Unity Manual: `JsonUtility`", that is the lookup key, not a link.

## Open questions for the human (Tier 1, when scope elevates)

- Anti-tamper appetite: is hand-editing a save a concern worth a checksum/obfuscation pass, or is it ignorable for a single-player mobile game? (Real anti-cheat → `db-guardian` / backend, Tier 2+.)
- Save cadence: checkpoint-only (loop phase transitions) vs autosave-on-pause vs both — and the main-thread cost budget (coordinate with `mobile-game-perf`).
- Newtonsoft adoption trigger: which concrete Tier 1 schema need (dictionaries / polymorphism / migration pain) justifies adding the package? Record as an ADR.
- iCloud backup: exclude the save dir on iOS, or accept default backup for a small save?
