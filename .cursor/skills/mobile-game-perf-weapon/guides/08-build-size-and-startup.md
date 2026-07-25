# 08 — Build Size & Startup Time

Two slow-regressing numbers that nobody watches until they hurt: how big the install is (affects store conversion and the "won't download on cellular" cliff) and how long cold start takes (affects retention — players bounce on a slow first launch).

## Build size

### The Build Report is the instrument
After a build, Unity writes a build report. Read it via **`Window → Analysis → Build Profiles`** (Unity 6) / the **Editor.log** "Build Report" section, or the **Build Report Inspector** tooling. It lists every asset by size and the per-category totals. The headline question: **what are the ten largest things, and do they need to be that big?**

### The usual largest contributors (in order)
1. **Textures** — almost always #1. If they're not ASTC (`guides/06`), that's the first win. Clamp Max Size, drop unused resolutions.
2. **Audio** — uncompressed/streamed wrong. Use Vorbis/compressed for music, ADPCM/compressed for SFX; set "Load Type" (streaming for music, decompress-on-load for short SFX); cut sample rate where it doesn't matter.
3. **Scenes & their dependencies** — an asset referenced anywhere in a built scene ships, even if unused at runtime. A stray reference can drag a whole dependency tree into the build.
4. **The engine/runtime itself** — IL2CPP + the included engine modules. Strip what you don't use (below).
5. **Fonts, meshes, shaders** — shader variants can balloon; strip variants you don't ship.

### Stripping & strategy
- **Managed code stripping** (Player Settings → "Managed Stripping Level" → High for release) removes unused IL — confirm nothing reflection-loaded breaks.
- **Engine module stripping** — disable modules DRIFT doesn't use.
- **Remove unused assets** — anything not referenced by a built scene or `Resources/`. Avoid dumping things in `Resources/` (it ships *everything* in the folder, uncompressed-by-reference); prefer direct scene references, and Addressables for streamed content (Tier 1+, `guides/10`).
- **Texture/audio import discipline** — the single biggest lever (`guides/06`).

DRIFT today is tiny — primitives, no art, no audio, no `Resources/` dumping (the `Tier0RuntimeSpawner` builds everything in code). The build is small *now*. The value is forward: when art and audio land (Tier 1), they go through the import discipline so the build doesn't silently triple. Establish the Build Report habit before that.

## Startup time

### The cold-start critical path
Cold start = process launch → engine init → first scene load → first interactive frame. What you control:

- **First-scene load cost** — how much is instantiated/deserialized before the player can act. DRIFT's `Tier0RuntimeSpawner.Build` (`Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0RuntimeSpawner.cs:46`) constructs the **entire** gray-box in one synchronous `Awake` → `Build()` pass: lighting, floor, player, camera, O2 deck, two pads, three salvage nodes, three tool caches, an enemy, the HUD, plus a runtime `ItemDatabase` of `ScriptableObject.CreateInstance` items and recipes (`CreateRuntimeDatabase`, `:90`). At gray-box scale this is milliseconds and fine. As a forward note: a one-shot synchronous spawner that builds *everything* before the first frame is exactly the pattern that becomes a startup-time problem when the world grows — at which point the answer is staged/async loading and Addressables (`guides/10`), not a bigger synchronous `Build()`.
- **Heavy `Awake`/`Start` work** — anything expensive on the critical path delays the first frame. Defer non-essential init off the first frame (a coroutine/async after the player can move).
- **Shader compilation/warmup** — first-use shader compilation can hitch; warm up critical shaders or use the shader variant collection.
- **Splash/init order** — keep mandatory init minimal; lazy-load the rest.

### Measure startup
- **`ProfilerMarker`s around the load phases** (engine ready, scene loaded, spawner done, first interactive frame) — read the spans in the Profiler.
- **`Time.realtimeSinceStartup`** logged at key milestones for a coarse on-device number.
- **On-device stopwatch** for the true cold-start feel (the human runs this).

## How to measure

1. **Build size:** read the Build Report; record the top-10 assets and the total. **Pass:** no uncompressed textures/audio; total within target; no surprise `Resources/` bloat.
2. **Startup:** instrument the load phases with `ProfilerMarker`s; record ms to first interactive frame on-device. **Pass:** cold start within the target (set one — e.g. < 3s to interactive on mid-tier); no single phase dominating unexpectedly.
3. **Track over time:** re-read both each milestone so regressions are caught early, not at submission.

Pass/fail: **Build Report shows compressed assets and a justified total; startup-to-interactive is within target with no single dominating synchronous phase.**

Source: Unity Manual — "Build Report" / "Reducing the file size of your build" / "Managed code stripping" / "Optimizing load times and build sizes" / audio import settings.
