# 05 — Serialization and the Inspector

How Drift exposes tunables to the inspector, what Unity will and won't serialize, and why `[SerializeField] private` beats `public`.

## `[SerializeField] private` over public fields

Every inspector-exposed tunable in the Drift spine is a `[SerializeField]` private field, not a public one:

```csharp
// OxygenSystem.cs
[SerializeField] float maxOxygen = 100f;
[SerializeField] float drainPerSecond = 1f;
[SerializeField] float suffocationDamagePerSecond = 8f;
[SerializeField] bool drainEnabled = true;

public bool DrainEnabled => drainEnabled;   // read-only window for external code
```

Why this, not `public float drainPerSecond`:

- **Encapsulation.** A public field lets *any* script silently mutate tuning. A `[SerializeField] private` field is editable in the inspector (and by the spawner via the serialized value) but not reachable as a mutable global.
- **Controlled external access.** When other code legitimately needs the value, expose a **read-only property** (`OxygenSystem.DrainEnabled`, `SuitPowerSystem.RechargePerSecond`, `LifeSupportZone.IsPowered`). When it needs to *change* it, expose an intentional method (`OxygenSystem.SetDrainEnabled(bool)`, `SuitPowerSystem.SetPower(float)`), not a writable field.
- **Clean API surface.** The public members of a Drift component are its *contract*; private serialized fields are its *configuration*. Mixing them as public fields blurs the two.

A `public float x;` used purely as an inspector tunable is a **should-refactor** → make it `[SerializeField] private` + a read-only property if needed.

## What Unity serializes

Unity's serializer (which drives the inspector, prefab data, and `.asset` files) persists:

- `public` fields, OR `private`/`protected` fields marked `[SerializeField]`.
- Of types it understands: primitives, `string`, `enum`, Unity types (`Vector3`, `Color`, `Object` references like `ItemDefinition`), arrays and `List<T>` of those, and `[Serializable]` plain classes/structs.

It does **not** serialize:

- Properties (auto or manual). `OxygenSystem.Normalized` is computed, never stored.
- `static`, `const`, or `readonly` fields.
- `Dictionary<,>` (no built-in support). `SalvageInventory` keeps a `readonly Dictionary<string,int> _counts` as a **runtime cache**, rebuilt from the serialized `List<SalvageInventorySlot> slots` via `RebuildCounts()` — the list is the serialized truth, the dictionary is derived (`SalvageInventory.cs:13`, `:257`).
- Generic or interface-typed fields (beyond `List<T>`).

When you need a non-serializable runtime structure, follow the `SalvageInventory` pattern: serialize the canonical list/array, derive the convenient structure at runtime.

## `[Serializable]` plain classes

Plain C# classes marked `[System.Serializable]` are inlined into the owning object's serialized data and show up in the inspector. Drift uses this for value-like state:

```csharp
[Serializable]
public class SurvivalMeter           // SurvivalMeter.cs:6
{
    [SerializeField] float max = 100f;
    [SerializeField] float current = 100f;
    public event Action Depleted;    // <-- events are NOT serialized; fine
}

[Serializable]
public class SalvageInventorySlot    // SalvageInventory.cs:284
{
    [SerializeField] ItemDefinition item;
    [SerializeField] int count;
    [SerializeField] int durability;
}
```

Note `SurvivalMeter` has an `event Action Depleted` — events/delegates aren't serialized, which is exactly what you want; the subscription is re-established at runtime when the owner re-subscribes in `EnsureInitialized`. A `[Serializable]` class with a constructor (like `SurvivalMeter(float, float)`) still serializes its fields; Unity uses the field values, not the constructor, when deserializing — so provide sane field defaults (`max = 100f`) too.

## `OnValidate` — keep serialized state coherent in the editor

`OnValidate` runs in the editor when a serialized value changes in the inspector. Use it to keep derived/clamped state correct. `SalvageInventory.OnValidate` re-sizes the slot list and rebuilds the count cache when `slotCount` is edited (`SalvageInventory.cs:50`):

```csharp
void OnValidate()
{
    EnsureSlots();      // resize slots to slotCount
    RebuildCounts();
}
```

Keep `OnValidate` cheap and side-effect-free beyond fixing *this object's* serialized data — it runs often and on selection. Don't spawn objects, log spam, or touch other scene objects from it.

## `[Header]`, `[Range]`, `[Min]`, `[Tooltip]`

Inspector ergonomics — use them; they cost nothing and help the human who tunes balance (`CLAUDE.md` §7):

- `[Header("Identity")]` groups fields (see `ItemDefinition`).
- `[Min(1)]` clamps at the inspector level (`SalvageInventory` uses `[SerializeField, Min(1)] int slotCount`).
- `[Range(a,b)]` gives a slider; `[Tooltip("...")]` documents intent.

These are presentation only; they don't change serialization.

## Findings to raise

- **Should-refactor:** public mutable field used as an inspector tunable (use `[SerializeField] private` + read-only property / intentional setter); a field expected to persist that Unity can't serialize (e.g. a bare `Dictionary` or interface field) with no derived-from-serialized backing.
- **Should-refactor:** `OnValidate` doing expensive or cross-object work.
- **Note:** balance VALUES of these fields are `game-balance-guardian`'s call; this Guardian owns that the field is *shaped* right (serialized, encapsulated, in the right place — ideally an id/constant in `Tier0Balance`).
