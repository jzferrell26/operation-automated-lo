# Example 03 — SpriteAtlas + Batching for the Gray-Box Visuals

**Scenario:** every object built by `Tier0RuntimeSpawner` is tinted via `GrayBoxVisuals.Tint`, which does `new Material(shader)` per object (`Assets/Scripts/Drift/Gameplay/Visual/GrayBoxVisuals.cs:20`, `:33`). Each tinted object gets a **unique material instance** → batching breaks → up to one draw call per object, plus a leaked material per runtime-spawned object. This example shows the two-part fix (material discipline now, SpriteAtlas when art lands) and measures the draw-call delta in the Frame Debugger.

**Tier framing:** the `new Material` fix is **should-optimize now** (harmless at ~15 static gray-box objects, but a known landmine before runtime spawning). The SpriteAtlas half is **forward-guidance** — there are no sprites yet (`guides/10`).

---

## Part A (now) — kill `new Material`, tint with `MaterialPropertyBlock`

`GrayBoxVisuals.Tint` today:

```csharp
public static void Tint(GameObject target, Color color)
{
    var renderer = target.GetComponent<MeshRenderer>();
    if (renderer != null)
        renderer.sharedMaterial = CreateColorMaterial(color); // new Material per call → breaks batching, leaks
}
```

Replace with a **single shared material** + per-renderer color override:

```csharp
static readonly int BaseColorId = Shader.PropertyToID("_BaseColor");
static readonly int ColorId     = Shader.PropertyToID("_Color");
static Material _sharedMaterial;
static MaterialPropertyBlock _mpb;

static Material SharedMaterial()
{
    if (_sharedMaterial == null)
        _sharedMaterial = CreateColorMaterial(Color.white); // created ONCE for everything
    return _sharedMaterial;
}

public static void Tint(GameObject target, Color color)
{
    var renderer = target.GetComponent<MeshRenderer>();
    if (renderer == null) return;

    renderer.sharedMaterial = SharedMaterial();   // same instance for all → SRP-batcher-friendly
    _mpb ??= new MaterialPropertyBlock();
    renderer.GetPropertyBlock(_mpb);
    if (_sharedMaterial.HasProperty(BaseColorId)) _mpb.SetColor(BaseColorId, color);
    else if (_sharedMaterial.HasProperty(ColorId)) _mpb.SetColor(ColorId, color);
    renderer.SetPropertyBlock(_mpb);
}
```

Why this works (`guides/04`): a `MaterialPropertyBlock` overrides the color **without instancing a new material**, so the SRP batcher (or GPU instancing for identical meshes) keeps all the cubes/capsules/planes on one batch path. One material, created once → no leak under spawning. Hand the final code shape to `unity-csharp-guardian`.

---

## Part B (forward) — SpriteAtlas when real art replaces primitives

When Tier 1 swaps gray-box primitives for 2D sprite art:

1. Create a **SpriteAtlas** asset (`Assets → Create → 2D → Sprite Atlas`). Add the sprites that appear on screen together — player, enemy, salvage, props — so they share one texture page.
2. Set the atlas's platform settings to **ASTC** (`guides/06`); enable tight packing; keep max size ≤ 2048 on mid-tier.
3. Sprites drawn from the **same atlas + same material** batch automatically → few draw calls regardless of sprite count.
4. Group by context (an atlas per zone/screen), not one mega-atlas (wastes memory loading off-screen art) and not one-per-sprite (defeats batching).

Forward-guidance only: no sprites exist today. Design the grouping when art lands; do not build an atlas pipeline for primitives.

---

## How to measure the draw-call delta

1. **Game-view Stats overlay:** record **Batches** and **SetPass calls** with the current per-object-material `Tint`. With ~15 uniquely-tinted objects you'll see ~15 separate batches for them.
2. **Frame Debugger** (`Window → Analysis → Frame Debugger → Enable`): step through the frame. **Before:** each tinted object is its own draw call with the break reason "Objects have different materials." **After (Part A):** the objects sharing the shared material collapse into a single SRP batch (or an instanced draw).
3. **Record before vs after** the Batches/SetPass count. **Pass:** tinted objects batch instead of one draw call each; SetPass/Batches drops measurably.
4. **Memory Profiler** (under runtime spawning): material count plateaus at 1 shared instance instead of leaking one per spawn (cross-checks the `guides/03` pooling win).

**Pass/fail:** Frame Debugger shows the gray-box objects batching (single SRP batch / instanced call) rather than N draws; material count stays at 1 under spawning.

Source: `guides/04-sprite-atlasing-and-batching.md`, `guides/06-texture-import-and-compression.md`; Unity "SRP Batcher" / "MaterialPropertyBlock" / "Sprite Atlas" / Frame Debugger docs.
