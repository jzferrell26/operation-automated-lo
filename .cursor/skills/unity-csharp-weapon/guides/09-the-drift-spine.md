# 09 — The Drift Spine

Where a new class lives, why there is exactly one spine, and how the pieces wire together. This is the map you consult before adding any file.

## One spine, under `Assets/Scripts/Drift/`

There is a single spine. A legacy parallel pure-C# spine (`Items/`, `Inventory/`, `Crafting/`, plus duplicate MonoBehaviours) was **removed during consolidation** and survives only in git history (`ARCHITECTURE.md` §2). The two-spine duplication is resolved. Do not reintroduce it. A new file that recreates a removed duplicate, or a second `*.asmdef`, is a **must-fix** (`03-asmdef-and-namespaces.md`).

## The layout (where a new class goes)

From `ARCHITECTURE.md` §2:

```
Assets/Scripts/Drift/
  Core/
    Combat/        Health
    Survival/      SurvivalMeter, OxygenSystem, SuitPowerSystem, LifeSupportZone
  Data/
    Items/         ItemDefinition, ItemDatabase, ItemCategory, CraftCostEntry, StatModifier
    Crafting/      RecipeDefinition, RecipeDatabase
  Gameplay/
    Player/        TopDownPlayerController
    Combat/        PlayerMeleeAttack
    AI/            MutatedCrewEnemy
    Inventory/     SalvageInventory
    Crafting/      SimpleCrafter
    Salvage/       SalvageNode
    Build/         Tier0BuildPlanner
    LifeSupport/   O2Generator, HullBreachEvent, Tier0RaiderAssault
    Objectives/    Tier0ObjectiveTracker
    Bootstrap/     Tier0Balance, Tier0LoopController, Tier0ShuttlePad,
                   Tier0RuntimeSpawner, Tier0Session, Tier0LoopPhase
    CameraRig/     TopDownFollowCamera
    UI/            Tier0Hud
    Visual/        GrayBoxVisuals
  Editor/          Tier0GrayBoxSetup   (Editor-only menu hooks)
```

**Placement decision tree** for a new class:

1. Is it a **content data SO** (item, recipe, structure, crew) or a data struct? → `Data/` (`Drift.Data.*`). See `02-scriptableobject-data.md`.
2. Is it a **reusable primitive** with no scene/gameplay assumptions (HP, a meter, a powered-volume rule)? → `Core/` (`Drift.Core.*`).
3. Is it a **scene-facing behaviour** that composes Core + Data into gameplay? → `Gameplay/<Area>/` (`Drift.Gameplay.*`).
4. Is it **editor tooling** (menu items, gizmo helpers, generators)? → `Editor/` (compiles into the Editor assembly, not the runtime build).

The namespace must match the folder (`03-asmdef-and-namespaces.md`). Dependencies flow inward: `Gameplay → Data → Core`.

## The spawner is the canonical wiring diagram

`Tier0RuntimeSpawner.Build()` (`Drift.Gameplay.Bootstrap`) assembles the whole gray-box and is the source of truth for how the pieces connect (`ARCHITECTURE.md` §4). When you add a system to the loop, you add it here. The composition it builds:

- **Player** — capsule + `CharacterController` + the eight-component stack.
- **O2 deck** — `LifeSupportZone` + `O2Generator` + `HullBreachEvent` + `Tier0ObjectiveTracker` + `Tier0RaiderAssault`.
- **Shuttle pads** — two `Tier0ShuttlePad`s (descend / extract), `Configure`-wired to `Tier0LoopController`.
- **Salvage** — 3 resource + 3 tool-gated `SalvageNode`s.
- **Enemy** — capsule + `Health` + `MutatedCrewEnemy`.
- **Glue** — `Tier0LoopController`, `Tier0Session` (holds the active `ItemDatabase`), `TopDownFollowCamera`, `Tier0Hud`.

The editor path (`Tier0GrayBoxSetup`, the `Drift` menu) and EditMode tests both reuse this wiring through the same `Configure` seams — that's the whole point of explicit injection over scene references (`ARCHITECTURE.md` §4, §7).

## The loop and its phases

The loop is a state machine — `Tier0LoopPhase` = `StationHub → PlanetSurface → RaidActive → StationHub`, owned by `Tier0LoopController` (`ARCHITECTURE.md` §5). New gameplay slots into a phase; it does not get its own ad-hoc update loop. The phases gate behaviour (O2 drains only on `PlanetSurface`; the raid runs in `RaidActive`).

## `Tier0Balance` is the tuning anchor

Every Tier 0 id and tuning number lives in one place: `Tier0Balance` (`Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0Balance.cs`) — item ids (`ScrapMetalId`, `WelderId`), node yields (`ScrapMetalNodeAmount = 14`), recipe costs (`WelderScrapCost = 3`), deck-plate cost. Gameplay code and tests both reference it, so a balance change happens in exactly one file (`ARCHITECTURE.md` §3).

Architecturally, your job is: **no magic numbers inline in gameplay logic.** A tuning constant hardcoded in a gameplay class instead of pulled from `Tier0Balance` (or a `[SerializeField]`) is a **should-refactor**. What the number *is* belongs to `game-balance-guardian`; that it *lives in `Tier0Balance`* belongs here.

## Known debt — don't build it yet

`ARCHITECTURE.md` §8 lists what's deliberately absent in Tier 0. Do not build any of it now (Hard Rule #1):

- **Durability degradation + workstation/blueprint gates** — Tier 1, rebuilt on `ItemDefinition`/`SalvageInventory`/`SimpleCrafter` (`02-scriptableobject-data.md`). Durability *stays* (Hard Rule #2) — flag for Tier 1, don't remove the data fields.
- **Persistence (save layer)** — Tier 1; hand to `save-load-guardian`.
- **NavMesh pathing** — `MutatedCrewEnemy` uses direct steering today; `com.unity.ai.navigation` swap is Tier 1 (`fsm-ai-guardian`).
- **Real UGUI/touch HUD** — `Tier0Hud` (IMGUI) is throwaway; Tier 1.

## Findings to raise

- **Must-fix:** a reintroduced second spine/asmdef; a class in the wrong layer (namespace ≠ folder ≠ dependency direction).
- **Should-refactor:** a new loop system not wired into `Tier0RuntimeSpawner.Build()`; a tuning magic number inline instead of in `Tier0Balance`/`[SerializeField]`; gameplay running its own update loop instead of slotting into a `Tier0LoopPhase`.
- **Flag (do not build):** any §8 known-debt item attempted in Tier 0 (tier violation, Hard Rule #1) — name the owning Guardian and stop.
