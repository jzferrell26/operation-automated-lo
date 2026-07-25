# 00 — Principles

The non-negotiables for DRIFT's local save/load layer. Read on every invocation, alongside `09-tier-discipline-note.md`.

## The eight principles

### 1. Tier discipline first — save is deferred to Tier 1

Before any design or code, re-read CLAUDE.md §3 (Status Map: "Local save/load" `[NOT STARTED]`, *intentional*) and §4 (Current Objective). The GDD §3 gray-box says explicitly "no save system even," and CLAUDE.md §7 lists Save as "(not built yet)." The default deliverable is a **clean design / ADR, not committed save code**. Building save mid-Tier-0 is the scope jump CLAUDE.md Hard Rule #1 forbids. Elevation requires an explicit user instruction. Source: `guides/09-tier-discipline-note.md`, CLAUDE.md §3/§4/§7, GDD §3.

### 2. Serialize stable string IDs, never SO/object references

The save model stores `ItemDefinition.id` (the strings in `Tier0Balance` — `"scrap_metal"`, `"tool_welder"`, …), never a reference to the `ScriptableObject`, never `GetInstanceID()`, never an array index into `ItemDatabase`. On load, rehydrate by looking the id up: `ItemDatabase.TryGetById(...)` via `Tier0Session.ItemDatabase`. `SalvageInventory` already keys its `_counts` dictionary on `ItemDefinition.id` — the save format mirrors that, it does not fight it. Source: `guides/03-save-schema-and-ids.md`; `Assets/Scripts/Drift/Gameplay/Inventory/SalvageInventory.cs:13` (`Dictionary<string,int> _counts`), `:316` (`item.id == candidate.id`).

### 3. The save MODEL is distinct from runtime objects

Define plain `[Serializable]` DTO classes (`SaveGameV2`, `InventorySlotSave`, …) whose only job is to be written and read. Never serialize a `MonoBehaviour` or `ScriptableObject` directly. Save = capture runtime → model. Load = apply model → runtime. Source: `guides/01-what-to-persist.md`.

### 4. Every save is versioned

The top-level model carries an `int schemaVersion`. Load reads the version first and runs the ordered migration ladder (v1→v2→…) before applying to runtime. An unversioned save format is a **must-fix** — the first schema change after ship silently corrupts existing saves. Source: `guides/04-versioning-and-migration.md`.

### 5. Writes are atomic; corruption is expected

Write to `save.tmp`, flush to disk, then atomically rename over `save.json`; keep one `.bak`. A naive single-stream overwrite that can leave a truncated file is a **must-fix**. On load: try primary → fall back to `.bak` → fall back to a fresh save. Never hard-crash on a bad file. Mobile processes die mid-write (backgrounding, OOM). Source: `guides/05-atomic-writes-and-corruption.md`.

### 6. `Application.persistentDataPath` is the only save location

Never `Application.dataPath` (read-only on device), never a hardcoded path. `persistentDataPath` is the one writable, platform-correct, update-surviving location on iOS/Android. Source: `guides/07-persistentdatapath-and-platforms.md`; Unity Manual: `Application.persistentDataPath`.

### 7. Save/load must be EditMode-testable

Per CLAUDE.md Hard Rule #11 and `ARCHITECTURE.md` §7, Unity does not run `Awake`/`Start`/`Update` on script-added components in EditMode. The save service therefore uses lazy-init + explicit `Configure(...)` + a pure `Capture()`/`Apply()`/`Serialize()`/`Deserialize()` step, so a round-trip test runs headless against a temp file or in-memory sink. A save path that only works in Play mode has no headless smoke test — the only verification this VM can run (see `AGENTS.md`). Source: `guides/08-testing-save-load.md`.

### 8. Local files only; save is state, not content

This Guardian owns the on-device file. Cloud sync, Postgres, cross-device, the future Nakama backend (CLAUDE.md §7, Tier 2+) → hand off to `db-guardian`. And the save file is player *state* — items/recipes stay ScriptableObjects (CLAUDE.md Hard Rule #3); the save references them by id, it does not become a second content store. Source: `guides/03-save-schema-and-ids.md`.

---

## First-move checklist

Before writing findings or a design, confirm:

- [ ] CLAUDE.md §3/§4 read; tier gate evaluated (`09-tier-discipline-note.md`). Default = design-only.
- [ ] The runtime spine that would be persisted surveyed (`Tier0Session`, `SalvageInventory`, `Tier0LoopController`, `Tier0ObjectiveTracker`, `Core/Survival/*`, `Tier0Balance`).
- [ ] Invocation classified per the routing table in `SKILL.md`.
- [ ] Severity rubric in mind (must-fix / should-refactor / style).
- [ ] Cross-Guardian handoff lines clear — escalate at the boundary.

## Cross-Guardian boundaries

The full table lives in `SKILL.md`. The short version: surface concerns at the boundary; don't author work the other Guardian owns.

| Question | Owner |
|---|---|
| In-memory system architecture (inventory model, loop controller, meters) | `unity-csharp-guardian` |
| Postgres / cloud backend / cross-device sync | `db-guardian` |
| Test harness, batchmode/CI mechanics | `unity-test-ci-guardian` |
| Balance numbers (yields, costs, tuning) | `game-balance` |
| Mobile perf of save I/O | `mobile-game-perf` |
| Touch input / enemy FSM / game feel | `touch-input` / `fsm-ai` / `game-feel-juice` |
| PRD authoring | `library-guardian` |

## Severity rubric

| Severity | Examples | Blocks acceptance? |
|---|---|---|
| **Must-fix** | Serializing an SO/object ref / InstanceID / array index instead of a stable id; serializing a `MonoBehaviour`/`ScriptableObject` directly; unversioned save; non-atomic write; load path that hard-crashes on corrupt data; writing outside `persistentDataPath`; save/load that can't round-trip in an EditMode test | Yes |
| **Should-refactor** | No `.bak` backup; metadata requiring a full load; capture/apply logic inlined in `Awake`; in-place mutating migration; monolithic save when slots are coming | No — opens follow-up |
| **Style** | DTO field naming; file naming; pretty-print whitespace | Never |

And above all: **asking for save code while the objective is Tier 0 is itself a scope violation** — flag it (Rule #1), don't author it.

## Citation discipline

Every finding has two citations:

1. **Where in the user's codebase** — `Assets/Scripts/Drift/Gameplay/Inventory/SalvageInventory.cs:316`.
2. **Why it's a finding** — a guide section (`guides/03-save-schema-and-ids.md §2`) or a named Unity Manual page (e.g. Unity Manual: `JsonUtility`).

No citations means the finding is opinion, not enforcement. Never invent a URL — name the Unity Manual page instead.
