# 08 — Handoff to Procgen & MCP

The two boundaries this Weapon must name in almost every response: **kit-vs-RNG**
(`procedural-generation-guardian`) and **spec-vs-drive** (`unity-mcp-guardian`).

## Boundary 1 — kit vs randomization (procedural-generation-guardian)

**Co-owned seam.** The split is clean:

| This Weapon owns | `procedural-generation-guardian` owns |
|---|---|
| The modular **kit** — the chunk modules, their grid, pivots, snap edges | The **algorithm** that arranges chunks into a layout |
| Handcrafted / authored composition (the station, the GDD-fixed locations) | Randomized scavenge-location layout (the Last Day on Earth model) |
| The set of legal modules + their connection rules (where a `Wall_Door` can sit) | The seeded RNG that picks which module goes where |
| Readability + camera-angle constraints the modules must satisfy | Loot/enemy/spawn distribution over the generated layout |

The contract between them is the **kit + connection rules**: this Weapon delivers a kit whose
modules tile deterministically on the grid (`01`), and procgen consumes it to generate layouts.
Never author layout RNG here; never let procgen redefine the kit's grid/pivots.

Procgen's own Weapon describes randomized scavenge-location layout **from modular chunks** and
seedable determinism — that's the consumer side; this is the producer side.

## Boundary 2 — design the spec vs drive the editor (unity-mcp-guardian)

**Spec, don't drive** (Rule #8). `unity-mcp-guardian` automates the Unity editor through MCP —
spawning GameObjects, wiring components, assembling scenes. This Weapon produces the **inputs** that
automation consumes:

| This Weapon produces | `unity-mcp-guardian` does with it |
|---|---|
| `templates/modular-kit-spec.md` (filled) | Builds/instantiates the kit prefabs in-editor |
| `templates/scene-organization-checklist.md` | Assembles the scene hierarchy per the checklist |
| The zone layouts (`07`) with coordinates | Places objects at those coordinates via MCP |
| The additive-loader design (`03`) | Wires the loader and Build Settings scene list |

The boundary is the **spec**: this Weapon decides *what* the scene is; the MCP Guardian makes the
editor *build* it. This Weapon does not call MCP tools or drive the editor.

## Other handoffs (named, not owned)

- **URP render config / lighting model** → `unity-rendering-guardian` (this Weapon places probes
  + lights; `05`).
- **Occlusion/draw-call PERF measurement** → `mobile-game-perf-guardian` (this Weapon authors
  occlusion; `04`).
- **Model/texture import (FBX scale, LODs, atlasing)** → `unity-art-pipeline-guardian` (this Weapon
  places the imported kit; `06`).
- **Prefab/component C#, asmdef** → `unity-csharp-guardian` (this Weapon owns scene/prefab structure
  + loader design).

## Output

When a request crosses one of these lines, name the sibling, state the boundary in one line, and
stop. Don't author the other Guardian's work.

## Severity

- **Must-fix:** authoring layout RNG (procgen's), or driving the editor / calling MCP (mcp's), here.
- **Should-refactor:** a kit spec too vague for procgen or MCP to consume.
- **Style:** spec formatting.
