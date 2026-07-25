# unity-csharp-weapon

The procedural arsenal for `unity-csharp-guardian`, PROJECT-DRIFT's Unity 6 + C# architecture specialist. This is the foundational game Weapon — every other Drift game Guardian (tests, MCP, balance, save/load, perf, input, FSM, feel) builds on the C# architecture this one owns.

## What this weapon covers

- **MonoBehaviour lifecycle** — `Awake`/`OnEnable`/`Start`/`Update`/`OnDestroy` order, and crucially what does NOT run in EditMode
- **ScriptableObject-as-data discipline** — Hard Rule #3; items/recipes/structures/crew are SOs, content is data not hardcoded classes (`ItemDefinition`, `ItemDatabase`, `RecipeDefinition`)
- **asmdef structure & namespaces** — the single `Drift.Runtime` assembly, `Drift.Core` / `Drift.Gameplay` / `Drift.Data` split, the EditMode test asmdef
- **Component composition** — composition over inheritance, `RequireComponent`, `TryGetComponent`, `Configure(...)` injection
- **Serialization & inspector** — `[SerializeField] private` over public fields, `[Serializable]` plain classes, `OnValidate`
- **Events & messaging** — C# `event Action` over polling; the Drift event catalog (`Health.Changed`, `SurvivalMeter.Depleted`, `SalvageInventory.Changed`, `HullBreachEvent`)
- **Coroutines vs Update** — `Update` + extracted `Tick`/`Step` as the EditMode-testable default; when coroutines are right
- **Instantiation & prefabs** — `Instantiate`/`Destroy`, the play-mode-aware `DestroyObject` helper, runtime composition vs prefabs
- **The Drift spine** — where a new class lives, the single-spine rule, the spawner as canonical wiring diagram
- **EditMode-safe patterns** — Hard Rule #11: lazy-init + explicit `Configure(...)` + extracted `Tick`/`Step`
- **Common C# failure modes** — the recurring Unity mistakes, each with a Drift-grounded fix

## Reading order

1. Read `SKILL.md` — master index, routing table, hard rules, severity rubric, cross-Guardian handoffs, output paths
2. Read `guides/00-principles.md` — the non-negotiables and the first-move checklist (orient against `CLAUDE.md` + `ARCHITECTURE.md` every time)
3. Open the guide matching your task (see the routing table in `SKILL.md`)
4. Pull a skeleton from `templates/` when authoring; read `examples/` for the worked walkthroughs
5. Reference `research/research-plan.md` for the authoritative sources behind a claim

## Layout

```
unity-csharp-weapon/
  SKILL.md         Navigation, hard rules, severity rubric, routing table, output paths
  README.md        This overview
  guides/          12 numbered guides (00-principles → 11-common-failure-modes)
  templates/       3 copy-paste skeletons (EditMode-safe MonoBehaviour, SO database, runtime asmdef)
  examples/        4 worked examples tied to real Drift systems
  research/        Research plan — sources mapped to the guides they inform
```

## Key rule

**Before writing any finding, orient against the project contract.** `CLAUDE.md` (Hard Rules §6, Status Map §3 — we are mid-Tier-0) and `ARCHITECTURE.md` (§7 EditMode discipline, §8 known debt) are the source of truth. The GDD wins on *what/why*; ARCHITECTURE.md wins on *how*. Never approve Tier 1+ architecture while Tier 0 is incomplete, never hardcode content that should be a ScriptableObject, and never ship a MonoBehaviour that can't be driven from an EditMode test.

## Output convention

Reports are written into the **host repo's `library/` tree**, never inside this Weapon:

- **Standalone reviews / audits** → `library/qa/unity-csharp/<date>-<topic>.md`
- **ADRs** → `library/architecture/ADR-<n>-<topic>.md`

Cursor sees this Weapon at `.cursor/skills/unity-csharp-weapon/` once deployed.
