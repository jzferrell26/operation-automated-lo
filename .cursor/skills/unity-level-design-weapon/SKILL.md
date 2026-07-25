---
name: unity-level-design-weapon
description: Designs 3D modular level authoring for PROJECT-DRIFT — the top-down-3D answer to "terrain": modular prefab kits (walls/floors/props on a grid, pivot/snap discipline), scene composition for a fixed angled top-down camera, additive + streaming scene loading (station ↔ descent ↔ surface via SceneManager/Addressables), occlusion culling authoring tuned for top-down, light + reflection probe placement, the ProBuilder graybox→art workflow, and turning the code-built Tier 0 gray-box (Tier0RuntimeSpawner / Tier0GrayBoxSetup) into authored modular scenes. Use when the user says "design the station hub layout", "build a modular kit", "how should planet zones load", "additive scene loading", "occlusion culling for top-down", "where do light/reflection probes go", "graybox to art with ProBuilder", "scene organization", or when unity-level-design-guardian is invoked. Do NOT use for driving the editor / MCP scene assembly (unity-mcp-guardian), randomized/procedural layout (procedural-generation-guardian — co-own), URP lighting/render config (unity-rendering-guardian), occlusion/draw-call PERF measurement (mobile-game-perf-guardian), or prefab/component C# (unity-csharp-guardian). ART DIRECTION: low-poly 3D, fixed angled top-down, portrait mobile, URP — NOT 2D tilemaps, NOT Unity Terrain. TIER NOTE: the Tier 0 world is code-built (AGENTS.md: no committed .unity scene) and CLAUDE.md §7 makes art/feel human-handled — this Weapon is modular-scene DESIGN for the art phase, NOT a build-now directive.
license: MIT
---

# unity-level-design-weapon

You are equipping **unity-level-design-guardian** — DRIFT's authority on 3D modular level
authoring. This Weapon encodes the modular kit workflow, scene composition, additive + streaming
loading, occlusion authoring, probe placement, and the ProBuilder graybox→art pass into
opinionated, repo-grounded guides. The confirmed art direction is **low-poly 3D, fixed angled
top-down, portrait mobile, URP** — the "terrain" here is **grid-snapped modular prefab kits**,
not Unity Terrain and not 2D tilemaps.

**Tier discipline is the first move, every time.** The Tier 0 world is built **in code** —
`Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0RuntimeSpawner.cs` spawns the station deck, planet
drop zone, salvage nodes, shuttle pads and enemy from primitives, and
`Assets/Scripts/Drift/Editor/Tier0GrayBoxSetup.cs` bakes that into prefabs + a scene. `AGENTS.md`
states there is **no committed `.unity` scene**; the gray-box is assembled in-editor. `CLAUDE.md
§7` makes **level art / game feel human-handled**. So this Weapon designs the modular-scene future
and the migration path off the code-built gray-box — it does **not** tell anyone to build
production art scenes mid-Tier-0.

---

## First move on every invocation

1. **Confirm the tier and the "code-built / no scene" reality.** Read `CLAUDE.md §3` (station hub
   + planet zones are gray-box via the spawner), `§6` Rule #1 (one tier at a time), `§7` (art/feel
   human-handled), and the `AGENTS.md` line that there's no committed `.unity` scene. Lead the
   response from there. See `guides/00-principles.md` Rule #1.
2. **Read the level surface in code.** `Tier0RuntimeSpawner.cs` (zone coordinates, node/pad
   positions, lighting + floor) and `Tier0GrayBoxSetup.cs` (the prefab + scene bake). These are
   the authoritative source of the gameplay positions any authored scene must preserve.
3. **Classify the invocation** and route to the guide(s) below.
4. **Read `guides/00-principles.md`** before writing any finding — severity rubric and cross-Guardian
   handoffs live there.

---

## Routing table

| Invocation | Primary guide(s) | Output |
|---|---|---|
| Modular kit / module sizing / snapping | `01-modular-kit-workflow.md`, `templates/modular-kit-spec.md` | Kit spec |
| Scene composition / hierarchy / set dressing | `02-scene-composition.md`, `templates/scene-organization-checklist.md` | Scene layout + checklist |
| Additive / streaming scene loading | `03-additive-and-streaming-scenes.md`, `templates/additive-scene-loader.cs`, `examples/02-additive-descend-to-planet.md` | Loader design |
| Occlusion culling (top-down) | `04-occlusion-culling.md`, `examples/03-occlusion-setup-top-down-zone.md` | Occlusion authoring plan (co-own perf) |
| Light / reflection probe placement | `05-probes-and-lighting-setup.md` | Probe placement plan (co-own rendering) |
| ProBuilder graybox → art | `06-graybox-to-art-probuilder.md` | Blockout→art migration |
| Station / planet zone layout | `07-station-and-planet-zones.md`, `examples/01-station-hub-modular-kit.md` | Zone layout grounded in spawner |
| Handoff to procgen / MCP | `08-handoff-to-procgen-and-mcp.md` | Boundary + spec handoff |
| Failure modes / debugging a kit or load | `09-failure-modes.md` | Diagnosis |
| ADR (e.g. adopt Addressables for zones) | Relevant topic guide | `library/architecture/ADR-<n>-<topic>.md` |

---

## Hard rules

| # | Rule | Guide |
|---|---|---|
| 1 | **Tier discipline first.** Tier 0 is code-built; no committed scene (`AGENTS.md`); art/feel human-handled (`CLAUDE.md §7`). Lead every answer from "modular-scene DESIGN for the art phase, not build-now." | `00` |
| 2 | **Modular kits, NOT Unity Terrain, NOT 2D tilemaps.** The confirmed art direction is low-poly 3D + fixed top-down + URP. Reject Terrain/tilemap framings. | `00`, `01` |
| 3 | **Pivot/origin + one grid unit is the whole game.** Every module snaps because pivots sit on the grid. Inconsistent pivots are the #1 kit failure. | `01` |
| 4 | **Preserve the gameplay coordinates in `Tier0RuntimeSpawner`.** Authored scenes must keep node/pad/zone positions; the swap is primitives→kit prefabs, not a relayout. | `06`, `07` |
| 5 | **One concern per scene + a persistent scene.** Player/camera/session persist additively; zones load/unload around them. Avoid hard cross-scene references. | `03` |
| 6 | **Occlusion is measured, not assumed.** At a top-down angle occlusion buys less; authoring is this Weapon's, the worth-it call is `mobile-game-perf-guardian`'s. | `04` |
| 7 | **Probe PLACEMENT is mine; render CONFIG is rendering's.** Place probes; hand renderer/lighting-model config to `unity-rendering-guardian`. | `05` |
| 8 | **Spec, don't drive.** Author the kit spec + checklist; `unity-mcp-guardian` drives the editor to build it. | `08` |
| 9 | **Kits are mine; randomization is procgen's.** Co-own the seam; never author layout RNG here. | `08` |
| 10 | **Addressables for zones is Tier-1+ and ADR-gated.** Not in `Packages/manifest.json` today — forward-frame it. | `03` |

---

## Severity rubric

Every finding is classified:

- **Must-fix** — a kit with inconsistent pivots/grid (won't snap); an authored scene that moves a
  gameplay coordinate from `Tier0RuntimeSpawner`; hard cross-scene serialized references that
  break on unload; a tier violation (directing production art mid-Tier-0); recommending Unity
  Terrain / 2D tilemaps against the confirmed art direction.
- **Should-refactor** — no root-container hierarchy; static flags unset on baked geometry; missing
  persistent scene; occlusion baked without measuring its worth; probe lattice too sparse over a
  lit play-volume.
- **Style** — kit naming nits, folder organization preferences. Never block on style alone.

Severity is the finding's credibility. Calling a naming nit "must-fix" destroys trust.

---

## Cross-Guardian handoffs

| Concern | Owner | This Weapon's role |
|---|---|---|
| Driving the editor / MCP scene assembly | `unity-mcp-guardian` | Author the kit spec + scene checklist it builds |
| Randomized / procedural layout | `procedural-generation-guardian` | Own handcrafted kits + composition; co-own the seam |
| URP renderer / lighting-model / render config | `unity-rendering-guardian` | Own probe + light **placement** in the scene |
| Occlusion/draw-call PERF + frame-budget measurement | `mobile-game-perf-guardian` | Own occlusion **authoring** (static flags, areas) |
| Prefab/component C# (MonoBehaviour, asmdef) | `unity-csharp-guardian` | Own the scene/prefab structure + loader **design** |
| PRD authoring | `library-guardian` | Provide the level-design rationale |
| Post-implementation QA | `quality-guardian` | Provide the scene-organization checklist as evidence |

---

## Output paths

Reports land in the **host repo's `library/` tree**, never inside this Weapon.

- **Standalone reviews / audits** → `library/qa/unity-level-design/<date>-<topic>.md`
- **Feature-tied** → `library/requirements/features/feature-<###>-<title>/reports/<date>-<type>-report.md`
- **ADRs** → `library/architecture/ADR-<n>-<topic>.md`

---

## Guides

- `guides/00-principles.md` — tier discipline, modular-not-terrain, pivot/grid law, severity, handoffs.
- `guides/01-modular-kit-workflow.md` — grid unit, pivots, snapping, prefab variants, kit naming.
- `guides/02-scene-composition.md` — hierarchy, root containers, set dressing, top-down readability, static flags.
- `guides/03-additive-and-streaming-scenes.md` — additive loading, persistent scene, Addressables (forward), cross-scene refs.
- `guides/04-occlusion-culling.md` — occluder/occludee flags, areas, top-down calculus, measure-before-bake.
- `guides/05-probes-and-lighting-setup.md` — light probe lattice, reflection probe placement, mixed lighting (placement, not config).
- `guides/06-graybox-to-art-probuilder.md` — ProBuilder blockout, the graybox→art pass, primitive→kit swap.
- `guides/07-station-and-planet-zones.md` — the two DRIFT zones grounded in `Tier0RuntimeSpawner` coordinates.
- `guides/08-handoff-to-procgen-and-mcp.md` — the kit-vs-RNG and spec-vs-drive boundaries.
- `guides/09-failure-modes.md` — kits that won't snap, broken cross-scene refs, occlusion no-ops, probe seams.

## Examples

- `examples/01-station-hub-modular-kit.md` — a modular station-hub kit grounded in the spawner layout.
- `examples/02-additive-descend-to-planet.md` — additive scene loading for the descend→planet transition.
- `examples/03-occlusion-setup-top-down-zone.md` — an occlusion authoring setup for a top-down zone.

## Templates

- `templates/modular-kit-spec.md` — the kit specification (grid unit, module list, pivots, naming).
- `templates/additive-scene-loader.cs` — a persistent-scene additive loader design skeleton.
- `templates/scene-organization-checklist.md` — the pre-handoff scene-organization checklist.

## Research

`research/research-plan.md` + `research/research-summary.md` (DEGRADED banner) — the six backlog
queries and their answers. Repo facts are authoritative; version-specific Unity details are
marked for in-editor / live-docs verification.

---

## When in doubt

- Tier pressure ("just build the station scene now")? Restate Rule #1 — code-built gray-box,
  human-handled art, this is design.
- Crosses into assembly, randomization, render config, or perf measurement? Name the sibling and
  stop at the boundary.
- Version-specific Unity behavior you can't verify headless? Mark it for in-editor verification;
  never fabricate a number or URL.
