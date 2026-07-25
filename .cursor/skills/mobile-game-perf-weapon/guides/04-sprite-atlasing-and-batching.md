# 04 — Sprite Atlasing & Draw-Call Batching

On mobile, **draw calls are a primary CPU cost** (render-thread submission + driver overhead). Two sprites that share a texture and material can be drawn together; two that don't can't. Atlasing and material discipline are how you keep the draw-call count low.

## The cost model

Each unique (mesh + material + texture + shader-pass) combination is at least one **draw call** (and a **SetPass** when render state changes). On a mid-tier mobile GPU, hundreds of draw calls per frame is a real render-thread bill — and it's the easiest cost to accidentally explode by giving every object its own material.

DRIFT is top-down with simple geometry, so triangles are cheap; the risk is **draw-call count** and **overdraw** (`guides/05`), not vertex load.

## The `GrayBoxVisuals.Tint` landmine

`GrayBoxVisuals.CreateColorMaterial` does `new Material(shader)` and `GrayBoxVisuals.Tint` assigns it as `sharedMaterial` (`Assets/Scripts/Drift/Gameplay/Visual/GrayBoxVisuals.cs:20`, `:33`). Every tinted object in `Tier0RuntimeSpawner` — floor, player, deck, every salvage node, every tool cache, every enemy, the pads — gets a **brand-new, unique material instance**.

Consequences:
1. **Batching is broken.** Two objects with distinct material instances cannot batch, even if the color is identical. N tinted objects → up to N extra draw calls.
2. **Memory leak under churn.** A material created in code and never `Destroy`ed leaks. Pooling/spawning enemies (`guides/03`) multiplies this — each spawn leaks a material.
3. **Acceptable for a gray-box of ~15 static objects.** This is **should-optimize**, not must-fix, *at Tier 0 scale*. It becomes must-fix the moment objects spawn at runtime or the object count climbs.

## The fix: shared material + `MaterialPropertyBlock`

To tint many objects different colors **without** breaking the SRP batcher, use **one shared material** and override the color per-renderer with a `MaterialPropertyBlock`:

```csharp
static readonly int BaseColorId = Shader.PropertyToID("_BaseColor");
static MaterialPropertyBlock _mpb;

public static void Tint(GameObject target, Color color)
{
    var renderer = target.GetComponent<MeshRenderer>();
    if (renderer == null) return;
    _mpb ??= new MaterialPropertyBlock();
    renderer.GetPropertyBlock(_mpb);
    _mpb.SetColor(BaseColorId, color);
    renderer.SetPropertyBlock(_mpb);
}
```

A `MaterialPropertyBlock` changes the color **without instancing a new material**, so the SRP batcher (or GPU instancing) keeps the objects on one code path — no per-object material, no leak. The shared material is created once and reused. This is the change `examples/03-spriteatlas-and-batching-setup.md` walks through. Hand the final code shape to `unity-csharp-guardian`; this Weapon owns the cost rationale and the measurement.

## The three batching mechanisms (know which applies)

1. **SRP Batcher** (URP/HDRP) — batches draw calls that share the **same shader variant**, even with different material *instances*, by caching material properties on the GPU. It's the default win in URP. It is **broken by** material property layouts that differ; `MaterialPropertyBlock` is SRP-batcher-friendly. Enable it in the URP asset and confirm in the Frame Debugger (batches show "SRP Batch").
2. **GPU Instancing** — many copies of the **same mesh + material** drawn in one call, per-instance data (like color) supplied via `MaterialPropertyBlock`. Ideal for waves of identical enemies (Tier 1). Enable "GPU Instancing" on the material.
3. **Static / Dynamic batching** — static batching combines non-moving objects sharing a material (the floor, deck — costs memory, set the Static flag); dynamic batching auto-combines small moving meshes sharing a material (limited, legacy, mostly superseded by the SRP batcher).

For a 2D sprite game, the equivalent is: **one SpriteAtlas + one material → the sprite renderer batches automatically.**

## SpriteAtlas (forward guidance — when art lands)

When real 2D art replaces the gray-box primitives (Tier 1):

- Pack related sprites (player frames, enemy frames, props, UI icons) into a **SpriteAtlas** asset so they share one texture page.
- Sprites drawn from the **same atlas + same material** batch into one (or few) draw calls automatically.
- Group atlases by *what's on screen together* — an atlas per scene/context, not one mega-atlas (which wastes memory loading off-screen art) and not one-atlas-per-sprite (which defeats the purpose).
- Set the atlas to use ASTC on mobile (`guides/06`).
- Watch atlas **padding** and **max size** (keep ≤ 2048 on mid-tier for safety).

This is forward-guidance: DRIFT is gray-box primitives today, no sprites to atlas yet. Design the atlas grouping when art arrives; do not build an atlas pipeline for primitives.

## How to measure

1. **Game-view Stats overlay:** read **Batches** and **SetPass calls** — the headline number. Lower is better.
2. **Frame Debugger** (`Window → Analysis → Frame Debugger` → Enable): step through every draw call for one frame. You see exactly what batched and what didn't, and *why* a batch broke ("Objects have different materials" is the `new Material` smell). This is the definitive instrument.
3. **Baseline vs after:** count draw calls with the current `Tint` (each object its own material) vs after the `MaterialPropertyBlock` change. **Pass:** objects sharing a shader collapse from N draw calls toward a single SRP batch / instanced call.

Pass/fail: **Frame Debugger shows tinted objects batching instead of one draw call each; SetPass/Batches count drops measurably.**

Source: Unity Manual — "Optimizing draw calls" / "SRP Batcher" / "GPU instancing" / "Sprite Atlas" / "MaterialPropertyBlock"; Frame Debugger docs.
