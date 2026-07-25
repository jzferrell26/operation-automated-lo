# Research Plan — character-art-rig-weapon

Forge date: 2026-06-22

## Goal

Ground every active guide in `character-art-rig-weapon/guides/` against (a) authoritative Unity 6 documentation for the Animation system (Mecanim humanoid avatars, Animator controllers, blend trees, avatar masks, `SkinnedMeshRenderer`), (b) named community references for top-down locomotion, modular skinned-mesh equipment, and mobile character-animation budgets, and (c) the actual PROJECT-DRIFT code the guides cite (the gray-box capsule controllers and the tint helper). Every load-bearing rig/animation claim is paired with either a Unity doc, a named community reference, or a real repo `file:line`.

**No fabricated URLs.** Sources are named by document title and owner; the exact URL is resolved against the current Unity 6 (6000.x) documentation set at use time, since Unity's doc URLs are versioned and move between releases. This Weapon was forged in a headless environment with **no Unity editor** (`AGENTS.md`) and degraded web access — see the DEGRADED banner in `research-summary.md`. Claims that need an in-editor or on-device check are flagged in the guides, never asserted as verified.

## The 6 Command-Brief queries (the research spine)

1. `Unity humanoid rig Animator locomotion blend tree 2026`
2. `Unity modular character equipment swapping skinned mesh 2026`
3. `Unity character outfit customization system mobile 2026`
4. `Unity skinned mesh renderer attachment points 2026`
5. `Unity Mecanim avatar mask layered animation 2026`
6. `Unity mobile character animation optimization 2026`

## Authoritative anchor sources (named, not fabricated)

- **Unity Manual — "Animation System Overview" / "Mecanim"** — the Animator + avatar + retargeting model.
- **Unity Manual — "Creating the Avatar" / "Configuring the Avatar" / "Avatar Mask"** — humanoid avatar setup, muscle config, masks for layered animation.
- **Unity Manual — "Animator Controller" / "Blend Trees" (1D, 2D Simple/Freeform Directional)** — locomotion blend-tree authoring + parameters.
- **Unity Manual — "Animation parameters" / "Animation Layers" / "Animation State Machine Transitions"** — the parameter seam this Guardian maps `ResolveMove`/`IsSprinting`/`CurrentMoveSpeed` onto.
- **Unity Manual — "Root Motion — how it works" / "Animator.applyRootMotion"** — root-motion vs in-place (DRIFT moves via `CharacterController.Move`, so in-place).
- **Unity Scripting API — `SkinnedMeshRenderer` (`bones`, `rootBone`, `sharedMesh`)** — modular skinned-mesh equipment sharing one skeleton.
- **Unity Manual — "Animation Events"** — the seam handed to `game-feel-juice-guardian` (attack fires here → they own the feel).
- **Unity Manual — "Optimizing Animation" / "Performance and optimization" (Animation)** — `Animator.cullingMode`, update modes, skinning cost, bone-count budget, animation LOD.
- **Unity Manual — "Quality Settings — Blend Weights / Skin Weights"** + **`SkinQuality`** — per-vertex bone influence budget on mobile.
- **Named community references (no fabricated URLs; titles only):**
  - Unity Learn — "Character animation" / "Anatomy of a humanoid rig" tutorials.
  - The classic top-down "8-direction / strafe blend tree" pattern (2D Freeform Directional) as documented in Unity blend-tree material and community write-ups.
  - The "modular character via shared skeleton + `SkinnedMeshRenderer.bones` re-pointing" pattern (the standard Synty / modular-character approach), described in general terms — not attributed to a specific fabricated URL.

## Repo files cited by the guides (read during forge)

| File | Cited in | For |
|---|---|---|
| `Assets/Scripts/Drift/Gameplay/Player/TopDownPlayerController.cs` | `00`–`03`, `07`, example `01` | The Animator-parameter seam: `ResolveMove` (`:88`), `IsSprinting` (`:17`), `CurrentMoveSpeed` (`:18`); in-place `CharacterController.Move` (`:79`) → root-motion off |
| `Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs` | `02`, `06`, example `03` | The enemy state seam: `EnemyState` Idle/Chase/Attack/Return (`:6`), `Step` (`:100`), `Configure` (`:84`); attack hook (`:199`) → animation event seam |
| `Assets/Scripts/Drift/Gameplay/Visual/GrayBoxVisuals.cs` | `00`, `04`, `05`, `06` | The current primitive tint helper (`:33`) — what real skinned materials/outfit swaps replace |

## Topics → guides → sources

| # | Topic / query | Guide(s) | Primary sources |
|---|---|---|---|
| 1 | Humanoid rig + Mecanim avatar (Q1, Q5) | `01-humanoid-rig-and-avatar.md` | Unity "Creating/Configuring the Avatar", "Avatar Mask", "Mecanim" |
| 2 | Animator controller + locomotion blend trees (Q1) | `02-animator-and-blend-trees.md`, example `01` | Unity "Animator Controller", "Blend Trees (1D/2D)", "Animation parameters" |
| 3 | Top-down locomotion specifics (Q1) | `03-locomotion-topdown.md` | Unity blend-tree (2D Freeform Directional), "Root Motion", DRIFT `ResolveMove` |
| 4 | Modular equipment swapping (Q2, Q4) | `04-modular-equipment-swapping.md`, example `02` | Unity `SkinnedMeshRenderer` (`bones`/`sharedMesh`), attach-point pattern |
| 5 | Cosmetic customization system (Q3) + GDD flag | `05-cosmetic-customization.md` | GDD §2; Hard Rule #3/#7/#10; SO catalog pattern |
| 6 | Enemy character setup / archetypes | `06-enemy-character-setup.md`, example `03` | GDD §8/§13; DRIFT `MutatedCrewEnemy`; shared-avatar reuse |
| 7 | Animation events + feel handoff | `07-animation-events-and-feel-handoff.md` | Unity "Animation Events"; CLAUDE.md §7; game-feel-juice handoff |
| 8 | Mobile animation budget (Q6) | `08-mobile-animation-budget.md` | Unity "Optimizing Animation", `Animator.cullingMode`, `SkinQuality`/skin weights |
| 9 | Tier + human handoff | `09-tier-and-human-handoff.md` | CLAUDE.md §6 (#1, #7), TIER0.md, ARCHITECTURE.md §4/§7 |

## Open questions (carried forward)

- **Animation pipeline source** — Asset Store humanoid pack (Synty-style) vs Mixamo vs custom. GDD §15 says art is the real bottleneck; the rig design here is pack-agnostic (one Humanoid avatar, retargetable). Confirm the chosen pack's bone naming before authoring masks.
- **Animation system: Mecanim vs Playables/`AnimationStream`** — the guides default to Mecanim (Animator + blend trees) as the standard, lowest-friction path for a small team. The Playables API / `AnimationStream` is a Tier-later escalation if the project ever needs fully procedural animation; flagged in `02`, not built.
- **Top-down facing model** — does the character face the move direction (twin-stick) or an aim direction independent of movement? GDD §8 says "top-down twin-stick-lite." The blend-tree design in `03` supports both (movement-relative vs aim-relative 2D blend); the final choice is a human/game-feel call.
- **Skin weight budget on the target device** — `08` recommends 2 bones/vertex (`SkinQuality.Bone2`) as the mobile default; the exact ceiling is an on-device measurement co-owned with `mobile-game-perf-guardian`, not a number this Weapon can verify headless.
