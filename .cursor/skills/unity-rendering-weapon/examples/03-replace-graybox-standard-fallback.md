# Example 03 — Replace the GrayBoxVisuals Standard fallback with a URP material

**Scenario:** "Migrate `GrayBoxVisuals` off the `Standard` fallback now that we're going URP."

**Open with tier discipline:** URP isn't installed yet, and `GrayBoxVisuals` is a **throwaway
gray-box tinter** that real art replaces in Tier 1 (`unity-art-pipeline-guardian` imports the
meshes/textures). The point of this migration is **not to leave a Built-in `Standard` fallback in
the shipping pipeline** — not to polish a placeholder. The C# edit is co-owned with
`unity-csharp-guardian`; the batching fix is co-owned with `mobile-game-perf-guardian`.

## The current code (`Assets/Scripts/Drift/Gameplay/Visual/GrayBoxVisuals.cs`)

```csharp
var shader = Shader.Find("Unlit/Color");
if (shader == null) shader = Shader.Find("Universal Render Pipeline/Unlit");
if (shader == null) shader = Shader.Find("Standard");
var material = new Material(shader);                 // allocates per call
if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", color);
else if (material.HasProperty("_Color")) material.SetColor("_Color", color);
```

**Two findings:**
1. It **falls back to `Standard`** — proof no real pipeline is configured (URP absent).
2. **`new Material(shader)` per call** allocates a material per tinted object and breaks the SRP
   batcher (a perf seam).

## The migration (once URP lands)

### Finding 1 — shader (this Guardian's call)

The real target shader is **`Universal Render Pipeline/Unlit`** (or `Simple Lit` if the gray-box
should catch the baked/realtime light — `guides/06`). With URP installed, the
`Shader.Find("Universal Render Pipeline/Unlit")` branch resolves and the `Standard` fallback never
fires. The **`_BaseColor` property is already handled** by the existing probe. **Verify the exact
shader-name string in-editor** — a typo returns null and silently falls back to `Standard` → pink
(`guides/10`).

**Severity:** **should-fix once URP is installed** (a `Standard` fallback in a URP project is wrong,
but it's a placeholder helper — not a Tier 0 blocker).

### Finding 2 — `new Material` per call (co-owned with perf)

Tinting many objects should use **one shared material + `MaterialPropertyBlock`** rather than a
`new Material` per object — this keeps the SRP batcher intact and stops per-object material leaks.

- **This Guardian** specifies: shared URP `Unlit`/`Simple Lit` material + `MaterialPropertyBlock`
  carrying `_BaseColor`.
- **`mobile-game-perf-guardian`** owns the batching verification (Frame Debugger draw-call delta)
  and the alloc check (`guides/09`, `mobile-game-perf-weapon/guides/04`).
- **`unity-csharp-guardian`** owns keeping the C# EditMode-safe (`ARCHITECTURE.md §7`) — no
  editor-time `new Material` surprises; lazy-init the shared material.

## Output

A note to `library/qa/unity-rendering/<date>-graybox-urp-migration.md`: the two findings with
file:line (`GrayBoxVisuals.cs:9` for the fallback, `:20` for `new Material`), the shader target,
the shared-material + `MaterialPropertyBlock` plan, and the explicit perf + C# hand-offs. Note that
this is moot once real art replaces the gray-box entirely.
