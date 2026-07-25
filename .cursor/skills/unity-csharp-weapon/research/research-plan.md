# Research Plan — unity-csharp-weapon

Forge date: 2026-06-22

## Goal

Ground every guide in `unity-csharp-weapon/guides/` against (a) the **real PROJECT-DRIFT codebase** under `Assets/Scripts/Drift/` (the authoritative source — this is the as-built spine the Guardian reviews), (b) the project's own contract documents (`CLAUDE.md`, `ARCHITECTURE.md`, `AGENTS.md`, `TIER0.md`, the GDD), and (c) established Unity 6 / C# architecture knowledge. The codebase + project docs are load-bearing and were read directly. External Unity docs are named as concepts, not fabricated URLs.

## Primary sources read directly (the load-bearing ones)

These are the real repo files every guide cites; they are the ground truth for the Drift conventions:

- `CLAUDE.md` — Hard Rules §6 (tier discipline #1, durability #2, data-over-code #3, oxygen #6, docs #8, flag-don't-freelance #10, EditMode discipline #11), Status Map §3, current objective §4.
- `ARCHITECTURE.md` — §1 assemblies, §2 source layout / single spine, §3 data model, §4 runtime composition / spawner, §5 loop + event flow, §6 survival meters, §7 testing & EditMode conventions, §8 known debt.
- `AGENTS.md` — headless batchmode reality, the `CS0234`/`CS0246` compile history, the ~9 EditMode-test failures root-caused to Awake-less components, the InputSystem reference fix.
- `TIER0.md` — Tier 0 scope guard, what's in/out of the box.
- `space-survival-design-doc.md` (GDD) — vision, §3/§4/§8/§13 referenced for what/why.
- The code itself, read for every citation:
  - `Data/Items/ItemDefinition.cs`, `ItemDatabase.cs` — the ScriptableObject-as-data pattern (guide 02).
  - `Data/Crafting/RecipeDefinition.cs` — recipe SO shape.
  - `Core/Survival/OxygenSystem.cs`, `SurvivalMeter.cs`, `SuitPowerSystem.cs`, `LifeSupportZone.cs` — lazy-init, extracted `Tick`, events, the O2→Health link (guides 01, 06, 07, 10; example 04).
  - `Core/Combat/Health.cs` — `Changed`/`Died` events, lazy-init (guides 06, 01).
  - `Gameplay/Player/TopDownPlayerController.cs` — `EnsureDependencies`, extracted `ResolveMove` (guides 01, 04, 10).
  - `Gameplay/AI/MutatedCrewEnemy.cs` — `Configure`, extracted `Step`, `Destroy` from death event (guides 04, 08, 10).
  - `Gameplay/Inventory/SalvageInventory.cs` — serialized list + derived dict cache, `OnValidate`, `[Serializable]` slot (guide 05).
  - `Gameplay/Bootstrap/Tier0Balance.cs` — the single tuning surface (guide 09).
  - `Assets/Scripts/Drift.Runtime.asmdef` — the single assembly (guide 03; template).

## Concepts / external knowledge consulted (named, not fabricated URLs)

Established Unity 6 + C# architecture knowledge underpinning the guides. Where a guide makes a Unity-engine claim, it rests on these well-documented concepts (Unity Manual + Scripting API are the canonical references):

| # | Concept | Guides informed |
|---|---|---|
| 1 | MonoBehaviour execution order — Awake / OnEnable / Start / Update / OnDestroy, and that script-added components get no lifecycle callbacks in EditMode | `01`, `10` |
| 2 | ScriptableObject architecture — data containers as `.asset`, `[CreateAssetMenu]`, "data not code" (the Schell/Hipple "ScriptableObject-driven" pattern) | `02` |
| 3 | Assembly definitions (asmdef) — compilation units, references, platform inclusion, dependency direction, why over-splitting hurts | `03` |
| 4 | Composition over inheritance in Unity's component model — `RequireComponent`, `GetComponent`/`TryGetComponent`, dependency injection over `FindObjectOfType` | `04` |
| 5 | Unity serialization rules — `[SerializeField]`, `[Serializable]`, what serializes (no Dictionary, no properties), `OnValidate` | `05` |
| 6 | C# events/delegates vs polling; `?.Invoke`; subscribe/unsubscribe symmetry; avoiding `SendMessage` | `06` |
| 7 | Coroutines vs Update vs FixedUpdate/LateUpdate; `Time.deltaTime` hygiene; why coroutines aren't EditMode-friendly | `07` |
| 8 | Instantiate/Destroy; `DestroyImmediate` in edit mode; object pooling as a perf pattern; prefabs & variants | `08` |
| 9 | Unity Test Framework EditMode constraints (no play loop) — the architectural reason for the lazy-init/Configure/Tick contract | `01`, `10` |

## How claims are sourced in the guides

Every guide finding cites **(a)** a real `Assets/Scripts/Drift/...cs:LN` and **(b)** a governing Hard Rule, `ARCHITECTURE.md` section, or guide section. The repo is the primary authority; the engine concepts above are the secondary, well-established backing. No external URLs are invented — where a guide leans on Unity-engine behaviour, it names the concept and points to the real Drift code that demonstrates it.

## Open questions (carried forward)

- **Real-editor green-check still owed.** The EditMode-safe spine was authored headless; the suite has not been run in a real Unity editor (`CLAUDE.md` §3 caveat, `AGENTS.md`). The guides treat "EditMode-safe" as *shaped correctly, pending verification* — the verification itself is `unity-test-ci-guardian`'s deliverable.
- **Assembly split timing (Tier 1).** When do compile times or platform needs justify splitting `Drift.Runtime` into per-layer asmdefs? Left as a future ADR trigger, not promoted now (guide 03).
- **Prefab/pooling pipeline (Tier 1).** The move from the code spawner to authored prefabs + pooling is flagged for Tier 1, co-owned with `unity-mcp-guardian` (scenes) and `mobile-game-perf-guardian` (pooling) (guide 08).
- **Durability rebuild (Tier 1).** Durability data fields exist; the degradation economy rebuilds on the same `ItemDefinition`/`SalvageInventory` shape in Tier 1 (Hard Rule #2). The architecture seam is documented (guide 02); the economy is `game-balance-guardian`'s.
