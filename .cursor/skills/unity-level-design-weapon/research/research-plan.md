# Research Plan — unity-level-design-weapon

**Depth tier:** deep
**Mode:** DEGRADED — authored from model knowledge. Firecrawl/Exa web-research tooling
was unavailable in this environment. Sources below are named by reference, not fetched;
verify version-specific details against the live Unity 6 / URP / Addressables docs and
in-editor before relying on them.

## Backlog queries

1. **Modular kit workflow** — grid-based modular level design in Unity: module sizing,
   pivot/origin and snapping discipline, vertex snapping (`V`) + grid snapping, naming
   conventions, the kit-bash / Synty-style low-poly modular approach, ProBuilder for
   gray-box modules, prefab variants for kit pieces.
2. **Scene composition & organization** — scene hierarchy conventions, root containers,
   set dressing, readability for a fixed angled top-down camera, lighting/static flags,
   sub-scene organization for a mobile project.
3. **Additive & streaming scenes** — `SceneManager.LoadSceneAsync(..., LoadSceneMode.Additive)`,
   active-scene management, unloading, `Addressables.LoadSceneAsync`, streaming boundaries
   for station ↔ descent ↔ surface, cross-scene references (and why to avoid them).
4. **Occlusion culling for top-down** — Unity occlusion culling (occluder/occludee static
   flags, baking, areas, portals), what a fixed angled top-down camera actually occludes,
   when occlusion culling is and isn't worth it vs frustum culling + LOD on mobile.
5. **Probes & lighting setup** — light probe groups for dynamic objects, reflection probe
   placement (baked vs realtime), mixed lighting + lightmap baking for static modular
   geometry, probe density and placement heuristics for a top-down scene.
6. **ProBuilder graybox → art** — ProBuilder gray-box authoring, the graybox→art pass,
   replacing primitives (`Tier0RuntimeSpawner`) with kit prefabs, ProGrids/grid snapping,
   export to mesh, the handoff to the human art pass (`CLAUDE.md §7`).

## Repo grounding (authoritative — read directly, not via web)

- `Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0RuntimeSpawner.cs` — station + planet zone
  coordinates, salvage/tool-cache/pad positions, lighting + floor setup.
- `Assets/Scripts/Drift/Editor/Tier0GrayBoxSetup.cs` — prefab + scene bake of the same layout.
- `AGENTS.md` — no committed `.unity` scene; gray-box assembled in-editor.
- `CLAUDE.md §3/§6/§7`, `space-survival-design-doc.md`, `ARCHITECTURE.md`, `TIER0.md`.

## Named sources to verify live

- Unity Manual: Occlusion Culling, Light Probes, Reflection Probes, Multi-Scene editing,
  `SceneManager`, lightmapping & static flags.
- Addressables docs: `LoadSceneAsync`, content catalogs, scene addressables.
- ProBuilder docs: gray-boxing, ProGrids/grid, vertex snapping, export.
- Modular level design talks (GDC / Unity) on grid sizing and kit construction (named, not fetched).
