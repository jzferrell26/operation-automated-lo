# 00 — Principles

The non-negotiables for Unity 6 + C# architecture in PROJECT-DRIFT. Read on every invocation.

## The ten principles

### 1. Orient against the project contract — always

Before any finding, read in this order (it is the order `CLAUDE.md` §0 mandates):

- `CLAUDE.md` — Hard Rules §6 and the Status Map §3. Confirm the current tier (mid-Tier-0) and current objective (§4).
- `ARCHITECTURE.md` — §2 source layout, §4 runtime composition, §5 loop/event flow, §7 EditMode discipline, §8 known debt.
- `space-survival-design-doc.md` (the GDD) for *what/why* when the question is design-shaped.

The GDD wins on vision; `ARCHITECTURE.md` wins on implementation; `CLAUDE.md` wins on process. A recommendation that contradicts one of these is wrong advice until you flag the contradiction. Source: `CLAUDE.md` §0, §2.

### 2. Tier discipline is law

We are mid-Tier-0 (`CLAUDE.md` §3). Do NOT design or approve Tier 1+ architecture — full grid inventory, the durability economy, workstation/blueprint crafting gates, the save layer, NavMesh pathing, UGUI/touch HUD — while Tier 0 is incomplete. Build one verified slice before the next. Source: `CLAUDE.md` §6 #1, #4; `09-the-drift-spine.md`.

### 3. Content is data, not code

Items, recipes, structures, crew are **ScriptableObjects**. The canonical pattern is `ItemDefinition` (`Assets/Scripts/Drift/Data/Items/ItemDefinition.cs`) with a `[CreateAssetMenu]` attribute and an `ItemDatabase` lookup. Adding content as a hardcoded C# class is a **must-fix**. Source: `CLAUDE.md` §6 #3; `02-scriptableobject-data.md`.

### 4. EditMode-safe by construction

Unity does **not** run `Awake`/`Start`/`Update` on script-added components in EditMode. Any MonoBehaviour that needs test coverage uses three patterns together (`ARCHITECTURE.md` §7):

1. **Lazy-init** — initialize state in an `EnsureInitialized()`/`EnsureMeter()` guard, called from `Awake` AND every public entry point (see `OxygenSystem.EnsureInitialized`, `Health.EnsureInitialized`).
2. **Explicit `Configure(...)`** — inject dependencies, don't only resolve them in `Awake`/`Start` (see `MutatedCrewEnemy.Configure`, `Tier0ObjectiveTracker.Configure`).
3. **Extracted `Tick`/`Step`** — pull frame logic out of `Update` into a public method taking `deltaSeconds`; `Update` just forwards `Time.deltaTime` (see `OxygenSystem.Tick`, `MutatedCrewEnemy.Step`, `TopDownPlayerController.ResolveMove`).

Source: `CLAUDE.md` §6 #11; `10-editmode-safe-patterns.md`.

### 5. Events over polling

State changes broadcast via C# `event Action`. The loop is event-driven by design (`ARCHITECTURE.md` §5): `Health.Changed`/`Died`, `SurvivalMeter.Depleted`, `SalvageInventory.Changed`, `HullBreachEvent.BreachActivated`/`BreachSealed`, `Tier0RaiderAssault.AssaultCompleted`. Subscribers wire up in `Configure`, unsubscribe in `OnDestroy`. Polling a value every frame when an event exists is a **should-refactor**. Source: `ARCHITECTURE.md` §5; `06-events-and-messaging.md`.

### 6. Single spine, single assembly

Everything lives under `Assets/Scripts/Drift/`, compiling into one `Drift.Runtime` assembly (root namespace `Drift`), split across `Drift.Core` / `Drift.Gameplay` / `Drift.Data`. The legacy parallel pure-C# spine was removed during consolidation. Do not reintroduce a second spine or a stray second asmdef. Source: `ARCHITECTURE.md` §2; `03-asmdef-and-namespaces.md`.

### 7. `[SerializeField] private` over public fields

Inspector-exposed tunables are `[SerializeField] float x` with a public **read-only property** if external code needs the value (`OxygenSystem.DrainEnabled`, `SuitPowerSystem.RechargePerSecond`). Public mutable fields are a **should-refactor**: they let any script silently mutate tuning and clutter the inspector. Source: `05-serialization-and-inspector.md`.

### 8. Composition over inheritance

Behaviour is assembled from small single-purpose components on a GameObject. The player capsule carries `TopDownPlayerController` + `OxygenSystem` + `SuitPowerSystem` + `Health` + `SalvageInventory` + `PlayerMeleeAttack` + `SimpleCrafter` + `Tier0BuildPlanner` (`ARCHITECTURE.md` §4). Components find each other via `TryGetComponent`/`GetComponent` or receive deps via `Configure`. Deep MonoBehaviour inheritance trees are a finding. Source: `04-component-composition.md`.

### 9. Oxygen is the signature meter

`OxygenSystem` drains while outside the powered `LifeSupportZone` and damages `Health` on depletion (`OxygenSystem.Tick`). Architecture changes must not quietly drop the O2 drain or its suffocation link. Source: `CLAUDE.md` §6 #6; GDD §3.

### 10. Update the docs you touch

A structural change (new system, moved namespace, new event, new SO type) updates `ARCHITECTURE.md` and, when status changes, `CLAUDE.md` §3 — in the **same commit**. ARCHITECTURE.md is the as-built source of truth; drift makes it lie. Source: `CLAUDE.md` §6 #8.

---

## First-move checklist

Before writing findings, confirm:

- [ ] `CLAUDE.md` Hard Rules + Status Map read; current tier confirmed (Tier 0).
- [ ] `ARCHITECTURE.md` §2/§4/§7 read; the file's place in the spine understood.
- [ ] `Assets/Scripts/Drift.Runtime.asmdef` + the file's namespace confirmed.
- [ ] Invocation classified per the routing table in `SKILL.md`.
- [ ] Severity rubric in mind (must-fix / should-refactor / style).
- [ ] Cross-Guardian handoff lines clear — escalate at the boundary, don't author work another Guardian owns.

## Cross-Guardian boundaries

The full table lives in `SKILL.md`. The short version: surface concerns at the boundary; don't author work the other Guardian owns.

| Question | Owner |
|---|---|
| Writing / running EditMode & PlayMode tests, CI, batchmode | `unity-test-ci-guardian` |
| Editor automation, scene assembly, MCP editing | `unity-mcp-guardian` |
| Performance — GC, draw calls, pooling, frame budget | `mobile-game-perf-guardian` |
| Input — Input System actions, touch controls | `touch-input-guardian` |
| Enemy AI / FSM behaviour, NavMesh | `fsm-ai-guardian` |
| Tuning balance VALUES (yields, costs, damage) | `game-balance-guardian` |
| Save / load format, disk serialization | `save-load-guardian` |
| Feel / juice — shake, hit-stop, tweens, VFX/SFX | `game-feel-juice-guardian` |

## Severity rubric

| Severity | Examples | Blocks merge? |
|---|---|---|
| **Must-fix** | Won't compile or breaks EditMode tests; content hardcoded instead of a SO; `Object.Destroy` in code that may run in edit mode; deps resolved only in `Awake`; frame logic trapped in `Update` with no extracted step; a second asmdef / wrong assembly; event subscription never unsubscribed; dropping O2 drain/suffocation | Yes |
| **Should-refactor** | Polling where a Drift event exists; public mutable field where `[SerializeField] private` fits; deep MonoBehaviour inheritance; `FindObjectOfType` where `Configure`/`TryGetComponent` fits; logic in a data SO; tuning constants scattered instead of in `Tier0Balance` | No — opens follow-up |
| **Style** | Field ordering; `var` vs explicit type; region usage; brace style | Never — don't block |

Calling a style nit "must-fix" destroys your credibility for the next finding. Be disciplined.

## Citation discipline

Every finding has two citations:

1. **Where in the repo** — `Assets/Scripts/Drift/Core/Survival/OxygenSystem.cs:84`.
2. **Why it's a finding** — a guide section (`guides/10-editmode-safe-patterns.md §2`), a governing Hard Rule (`CLAUDE.md §6 #11`), or an `ARCHITECTURE.md` section.

No citations means the finding is opinion, not enforcement.

## Scope explicitly excluded

- **Test authoring.** This Weapon makes code EditMode-*safe* (lifecycle shape); writing/running the NUnit suites belongs to `unity-test-ci-guardian`.
- **Editor/MCP automation.** Component and SO *shape* is here; driving the editor to place and wire them is `unity-mcp-guardian`.
- **Balance values, input, AI behaviour, save format, perf, feel.** Each has its own Guardian — see the boundary table. This Guardian owns the C# architecture they build on.

When in doubt, escalate.
