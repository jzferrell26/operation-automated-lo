# 08 — Built-in → URP migration (incl. GrayBoxVisuals)

When URP is installed, **every Built-in material renders pink/magenta** until upgraded — including
the gray-box's `Standard` fallback. That's the migration, not a bug.

## The general material upgrade path

- Unity's converter: **Window → Rendering → Render Pipeline Converter** (or **Edit → Rendering →
  Materials → Convert … to URP Materials**) remaps Built-in **`Standard`** materials to URP
  **`Lit`**. **Verify the exact menu path in this Unity 6 version in-editor** — Unity moves it
  between versions.
- After conversion, audit: a `Standard` material that was really just a flat tint is better off as
  URP **`Simple Lit`** or **`Unlit`** than full `Lit` (`guides/06-shaders-and-materials.md`).
- Custom Built-in shaders **do not auto-convert** — they need a URP rewrite (rare in DRIFT today).

## The specific case: `GrayBoxVisuals`

`Assets/Scripts/Drift/Gameplay/Visual/GrayBoxVisuals.cs` is the gray-box material maker. Today:

```csharp
var shader = Shader.Find("Unlit/Color");
if (shader == null) shader = Shader.Find("Universal Render Pipeline/Unlit");
if (shader == null) shader = Shader.Find("Standard");
var material = new Material(shader);                 // per call
if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", color);
else if (material.HasProperty("_Color")) material.SetColor("_Color", color);
```

It **falls back to `Standard`** (Built-in) precisely because **URP isn't installed** — confirming
"no real render pipeline is configured yet."

**The migration (once URP lands):**
1. The real target shader becomes **`Universal Render Pipeline/Unlit`** (or `Simple Lit` if the
   gray-box should catch light) with **`_BaseColor`** — the existing `_BaseColor`-then-`_Color`
   probe already handles the property name; the fallback chain just stops resolving to `Standard`.
2. **`new Material(shader)` per call is a perf concern** — it allocates a material per tinted
   object and breaks the SRP batcher. The fix (shared material + **`MaterialPropertyBlock`**) is
   **co-owned with `mobile-game-perf-guardian`** (`guides/09`, and
   `mobile-game-perf-weapon/guides/04`). This Guardian picks the shader; perf owns the batching fix.
3. **The C# edit itself** (changing the shader resolution / swapping to a `MaterialPropertyBlock`
   helper) is co-owned with `unity-csharp-guardian` — keep it EditMode-safe per `ARCHITECTURE.md
   §7` (lazy-init / `Configure` / extracted step, no editor-time `new Material` surprises).

The worked version is `examples/03-replace-graybox-standard-fallback.md`.

## Tier discipline

`GrayBoxVisuals` is a **throwaway gray-box helper** — when art lands in Tier 1, real materials on
real meshes replace tinted primitives entirely (`unity-art-pipeline-guardian` imports them). Don't
over-engineer the gray-box tinter; the migration note is about **not leaving a `Standard` fallback
in the shipping pipeline**, not about polishing a placeholder.

## Verify-in-editor flags

- The exact Render Pipeline Converter menu path in Unity `6000.0.x` — **verify in-editor.**
- Whether `Shader.Find("Universal Render Pipeline/Unlit")` is the exact shader name string in this
  URP version — **verify in-editor** (the string must match exactly or it returns null → `Standard`).

Sources: Unity 6 Manual "Upgrade material assets to URP", "Render Pipeline Converter";
`Assets/Scripts/Drift/Gameplay/Visual/GrayBoxVisuals.cs`; `ARCHITECTURE.md §7`;
`mobile-game-perf-weapon/guides/04-sprite-atlasing-and-batching.md`.
