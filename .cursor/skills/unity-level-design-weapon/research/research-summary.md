# Research Summary — unity-level-design-weapon

> **RESEARCH MODE: DEGRADED — authored from model knowledge; Firecrawl/Exa unavailable in
> this environment; verify version-specific details against current Unity 6 / URP /
> Addressables docs and in-editor before relying on them.** Where a number, default, or
> version-specific behavior matters (occlusion bake parameters, probe densities, Addressables
> API shapes), the guides mark it for in-editor / live-docs verification rather than asserting
> it. Internal repo facts (`Tier0RuntimeSpawner.cs`, `Tier0GrayBoxSetup.cs`, `AGENTS.md`,
> `CLAUDE.md`) are authoritative and cited directly.

This synthesis answers the six backlog queries that scope `unity-level-design-weapon`. **Tier
note up front:** the Tier 0 world is built in code (`Tier0RuntimeSpawner` spawns primitives;
`Tier0GrayBoxSetup` bakes them to prefabs + a scene), `AGENTS.md` says there is no committed
`.unity` scene, and `CLAUDE.md §7` makes art/feel human-handled — so everything below is
**modular-scene DESIGN for the Tier-1 art phase**, not a build-now directive.

---

## 1. Modular kit workflow

DRIFT's "terrain" is **grid-snapped modular prefab kits**, not Unity Terrain or 2D tilemaps
(art direction confirmed: low-poly 3D, fixed angled top-down, URP). Practical shape:

- **Pick one grid unit and never drift** — a common choice is a power-of-two metric module
  (e.g. 1m or 2m floor tiles, 3m wall height). Every module's bounding footprint is a whole
  multiple of the grid so pieces snap edge-to-edge with no gaps.
- **Pivot/origin discipline is the whole game.** A floor tile's pivot sits at a grid corner (not
  its center) so vertex-snap (`V`) and grid-snap place it predictably. Wall pivots sit at the
  base on the wall line. Inconsistent pivots are the #1 cause of modular kits that "won't snap."
- **Build the kit as prefabs (prefab variants for trims/damage states).** Floor, wall, wall-with-
  doorway, corner, pillar, prop. One base prefab per module; variants for skins.
- **Naming + folder convention** so the kit is navigable: `Kit_Station/Floor_2x2`, `Wall_Straight`,
  `Wall_Door`, `Corner_Inner`, etc.
- **Gray-box with ProBuilder first** (query 6), then swap to art meshes preserving pivots.

Detail: `guides/01-modular-kit-workflow.md`, template `templates/modular-kit-spec.md`.

## 2. Scene composition & organization

- **Root containers** keep a scene readable: `--- Environment ---`, `--- Lighting ---`,
  `--- Gameplay ---`, `--- Spawns ---`, `--- Systems ---` empty-GameObject headers. Mirror the
  logical groups the code already creates (`Tier0RuntimeSpawner` makes `StationReturnPoint`,
  `PlanetDropPoint`, `O2Generator`, shuttle pads, salvage/tool-cache nodes, enemy, HUD).
- **Readability for the fixed top-down camera** drives set dressing: tall geometry can hide the
  player at the camera's angle, so wall heights and prop silhouettes are a gameplay decision, not
  just art. Keep the play-floor legible from the camera's pitch.
- **Static flags** are set deliberately per object (Contribute GI, Occluder/Occludee, Batching)
  — they feed lightmapping, occlusion, and batching downstream.
- **One concern per scene** once additive loading lands (query 3): a Station scene, a Surface
  scene, plus a persistent Systems scene.

Detail: `guides/02-scene-composition.md`, checklist `templates/scene-organization-checklist.md`.

## 3. Additive & streaming scenes

- **Additive loading** keeps a persistent scene (player, camera rig, session/HUD — DRIFT's
  `Tier0Session`, `TopDownFollowCamera`, `Tier0Hud`) alive while zone scenes load/unload around
  it: `SceneManager.LoadSceneAsync(zone, LoadSceneMode.Additive)` then set it active for correct
  lighting/instantiation; `UnloadSceneAsync` on exit.
- **The DRIFT boundaries** map onto the existing loop: station hub ↔ shuttle descent ↔ planet
  surface. The descent (shuttle pad → loop controller) is the natural async-load seam — load the
  surface scene behind a transition, unload the station, swap active scene.
- **Addressables** (`Addressables.LoadSceneAsync`) is the Tier-1+ path for streaming zones from a
  content catalog and keeping the base build small for mobile — **not in `Packages/manifest.json`
  today; forward-frame it** and pair the decision with an ADR.
- **Avoid hard cross-scene references** — wire across scenes via a persistent registry/service or
  Addressables, not direct serialized links, which break when a scene is unloaded.

Detail: `guides/03-additive-and-streaming-scenes.md`, template `templates/additive-scene-loader.cs`.

## 4. Occlusion culling for top-down

- **The fixed angled top-down camera changes the calculus.** At a steep top-down pitch the camera
  sees most of a flat play-floor at once, so occlusion culling buys far less than it does for a
  first-person corridor. It pays off where the station has **interior walls / multiple rooms /
  vertical structure** that genuinely hide geometry from the camera angle.
- **Authoring** = mark static environment as Occluder Static + Occludee Static, bake occlusion,
  and (where the layout has rooms) use Occlusion Areas; portals are rarely worth it at this angle.
- **Measure before committing.** Whether occlusion beats plain frustum culling + LOD + good
  batching on a given scene is a **PERF measurement question owned by `mobile-game-perf-guardian`**
  — this Weapon designs the *authoring* (static flags, area placement); perf decides if it's worth
  the bake. Verify bake parameters in-editor.

Detail: `guides/04-occlusion-culling.md`, example `examples/03-occlusion-setup-top-down-zone.md`.

## 5. Probes & lighting setup (placement)

- **Light Probe Groups** light the *dynamic* objects (player, enemies, pickups) that baked
  lightmaps don't touch. Place a probe lattice through the play-volume, denser where lighting
  changes fast (doorways, light pools), sparser over uniform floor.
- **Reflection probes** are placed per room/zone for low-poly URP surfaces; baked is the mobile
  default, realtime only when a reflection must update. The fixed camera means you can place
  probes for the angle the player actually sees.
- **Mixed lighting + lightmap baking** for the static modular geometry; dynamic objects take GI
  from the probes. Probe **placement** is this Weapon's lane; the **URP lighting/render config**
  (renderer asset, shadow/quality settings) is `unity-rendering-guardian`. Verify probe densities
  and bake settings in-editor.

Detail: `guides/05-probes-and-lighting-setup.md`.

## 6. ProBuilder graybox → art

- **Gray-box in ProBuilder** on the grid (ProGrids / grid snapping) to block out the station and
  planet locations fast — this is the authored successor to `Tier0RuntimeSpawner`'s primitives.
- **The graybox→art pass** replaces ProBuilder blockout meshes with the modular kit prefabs (query
  1) **preserving pivots and grid footprint**, so the swap doesn't move gameplay. The gameplay
  positions are already fixed in `Tier0RuntimeSpawner` (salvage at `(-5,0.75,1)`, pads at
  `(-5,0.25,8)` / `(0,0.25,-13)`, O2 deck at `(0,0,8)`, etc.) — preserve them.
- **The final art pass is human-handled** (`CLAUDE.md §7`); this Weapon designs the workflow and
  the handoff, it doesn't author the final meshes.

Detail: `guides/06-graybox-to-art-probuilder.md`, `guides/07-station-and-planet-zones.md`.

---

## Cross-cutting conclusions

- **The deliverable is a migration path**, not a from-scratch level: code-built gray-box →
  authored gray-box (ProBuilder) → modular kit art → additive/streamed scenes. Each step
  preserves the gameplay coordinates already in `Tier0RuntimeSpawner`.
- **Lane hygiene matters here** more than in most Weapons: assembly→MCP, randomization→procgen,
  render config→rendering, perf measurement→perf. This Weapon owns design + kits + placement.
- **Everything is Tier-1 / art-phase design.** Lead from that, every time.
