# 02 — JSON vs Unity serialization: the format decision

DRIFT needs to turn the save model (`guides/01-what-to-persist.md`) into bytes on disk and back. There are three realistic options in Unity 6. This guide states the trade-offs and the recommendation; the formal decision belongs in an ADR (`library/architecture/ADR-<n>-save-format.md`).

## The three candidates

### A. `UnityEngine.JsonUtility` (built-in JSON)

- **Pros:** zero dependencies (ships with Unity); fast; respects Unity's serialization rules so `[Serializable]` DTOs Just Work; human-readable output (`prettyPrint: true`) is gold for debugging a corrupt save.
- **Cons (the sharp edges):** serializes only what Unity's serializer sees — **no `Dictionary`**, **no polymorphism**, **no `null` vs default distinction**, no top-level arrays (wrap in an object), no properties (fields only). Private fields need `[SerializeField]`.
- **Verdict for DRIFT:** **the default pick.** The save model is fully under our control — we shape DTOs to the serializer's rules (lists of `{ id, count }` instead of a dictionary; everything a `[Serializable]` class of fields). The constraints are a feature here: they force the disciplined, flat, id-keyed model this Weapon already wants.

```csharp
string json = JsonUtility.ToJson(model, prettyPrint: true);
SaveGameV2 model = JsonUtility.FromJson<SaveGameV2>(json);
```

### B. Newtonsoft.Json (`com.unity.nuget.newtonsoft-json`)

- **Pros:** real `Dictionary` support, polymorphism, `null` handling, converters, `JObject` for hand-migrating unknown-shape JSON. The migration ladder (`guides/04-versioning-and-migration.md`) is *easier* with Newtonsoft when you must read an old shape you no longer have a class for.
- **Cons:** an added package dependency; slower than `JsonUtility`; more GC; more rope to hang yourself (e.g. `TypeNameHandling` is a known deserialization-security footgun — avoid it).
- **Verdict for DRIFT:** **the considered upgrade.** Adopt it in Tier 1 *if and when* the save model genuinely needs dictionaries or polymorphism, or if migrations get painful with `JsonUtility`. Not needed for the flat id-keyed model. Available as an official Unity package, so it's a clean add.

### C. Unity binary (`BinaryFormatter` / `BinaryWriter` over `FileStream`)

- **Pros:** compact; not casually editable by players (mild anti-tamper).
- **Cons:** **`BinaryFormatter` is deprecated and a known remote-code-execution vector — do not use it.** Hand-rolled `BinaryWriter` is brittle across schema changes (you maintain read/write order by hand) and unreadable when debugging a corrupt save. "Players can't edit it" is weak protection and not worth the cost for a single-player mobile game.
- **Verdict for DRIFT:** **rejected** for the default. If anti-tamper ever matters, layer a checksum/obfuscation over JSON rather than going binary (`guides/05-atomic-writes-and-corruption.md`), and treat real anti-cheat as a server concern → `db-guardian`.

## Decision matrix

| Need | JsonUtility | Newtonsoft | Binary |
|---|---|---|---|
| Zero dependency | ✅ | ❌ (pkg) | ✅ |
| Human-readable (debug a corrupt save) | ✅ | ✅ | ❌ |
| `[Serializable]` DTO support | ✅ | ✅ | manual |
| `Dictionary` / polymorphism | ❌ | ✅ | manual |
| Easy migration of unknown old shapes | ➖ | ✅ | ❌ |
| Safe (no RCE footgun) | ✅ | ✅ (avoid `TypeNameHandling`) | ❌ (`BinaryFormatter`) |
| Recommendation | **Default** | **Tier 1 upgrade if needed** | **Rejected** |

## The recommendation

**Start with `JsonUtility` and a flat, id-keyed, list-based save model.** It is dependency-free, debuggable, and its constraints push you toward exactly the disciplined model this Weapon mandates. Escalate to **Newtonsoft** only when a concrete need appears (dictionaries, polymorphic save fragments, or migration pain) — and record that switch as an ADR. **Never `BinaryFormatter`.**

> This whole decision is Tier 1 prep. Per `guides/09-tier-discipline-note.md`, you are choosing the format on paper, not adding a serializer dependency to the project mid-Tier-0.

## JsonUtility footguns to design around

- **No `Dictionary`.** Model `SalvageInventory._counts`-style data as `List<InventorySlotSave>` where each entry has a string `itemId`. (This also matches how inventory actually stores slots — `SalvageInventorySlot` is already `[Serializable]` with fields, `SalvageInventory.cs:284`.)
- **No top-level arrays.** Wrap everything in `SaveGameV2`.
- **No `null` round-trip for classes.** An empty slot serializes as a default object, not `null`; model "empty" with an explicit flag or a sentinel `itemId == ""` and handle it on apply.
- **Enums serialize as ints by default.** `Tier0LoopPhase` will save as its int value — fine, but pin the enum's integer values so reordering the enum later doesn't silently reinterpret old saves (a migration concern, `guides/04-versioning-and-migration.md`).
