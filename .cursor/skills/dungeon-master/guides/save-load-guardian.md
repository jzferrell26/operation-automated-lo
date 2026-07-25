# Save/Load Guardian — Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `save-load-guardian`. Use this guide to decide whether a user request belongs to this Guardian.

**Guardian:** [`agents/save-load-guardian.md`](../../../../agents/save-load-guardian.md)
**Weapon:** [`.claude/skills/save-load-weapon/`](../../save-load-weapon/)
**Trigger policy:** on-demand (not proactive)

---

## Domain

`save-load-guardian` is DRIFT's local on-device persistence specialist (Unity 6, C#, mobile) for Tier 0–1. Its remit is the save file on the player's device: a dedicated serializable **save model** distinct from runtime objects; serialization keyed on **stable string content ids** (`ItemDefinition.id`, the `Tier0Balance` constants) and never on object/SO references; the JSON-vs-Unity-binary choice (`JsonUtility` / Newtonsoft / rejected binary); save schema design; **versioning + migration** (v1→v2 ladder); **atomic writes** (temp + rename) with corruption handling and backups; **save slots + metadata**; `Application.persistentDataPath` and mobile platform paths; and **EditMode round-trip testing** under DRIFT's Awake-less convention (CLAUDE.md Hard Rule #11).

**The defining trait: this Guardian leads with tier discipline.** Local save/load is `[NOT STARTED]` in CLAUDE.md §3 and *intentionally deferred* — the GDD §3 gray-box ships with "no save system even," and CLAUDE.md §7 marks save "(not built yet)." So the Guardian's default deliverable is a **clean design / ADR, not committed save code.** It treats a request to build the save layer mid-Tier-0 as the scope jump CLAUDE.md Hard Rule #1 forbids, and proceeds to build only on explicit user scope elevation. Design is always on the table; building is gated.

## Trigger phrases

Route to `save-load-guardian` when the user says any of:

- "Design the save system" / "How should we persist DRIFT state"
- "Save model vs runtime objects"
- "JSON or binary save" / "Should we use JsonUtility or Newtonsoft"
- "Save versioning" / "Save migration" / "Migrate v1 saves to v2"
- "Atomic save write" / "My save file got corrupted" / "Handle a corrupt save"
- "Save slots" / "Multiple save slots" / "Save metadata header"
- "persistentDataPath" / "Where do saves go on mobile / iOS / Android"
- "EditMode test for save/load" / "Make save/load testable"
- "Serialize the inventory / loop phase / objectives / meters"

Or when the request implicitly involves writing DRIFT player state to a local file and reading it back.

## Do NOT route when

- The user wants the **in-memory system architecture** being persisted — the shape of the inventory model, loop controller, objective tracker, or survival meters themselves — that is `unity-csharp-guardian`. (save-load serializes those systems; it does not design them.)
- The user wants **Postgres, cloud, backend, or cross-device sync** — including the future Nakama backend (CLAUDE.md §7, Tier 2+) — that is `db-guardian`. **save-load owns LOCAL device files only; defer anything server-side to db-guardian.**
- The user wants the **test harness, batchmode runner, or CI** itself — that is `unity-test-ci-guardian`. (save-load writes the round-trip *test* and respects Rule #11; the harness that runs it belongs to unity-test-ci.)
- The user wants **balance numbers** (yields, costs, tuning) — that is `game-balance`. (save-load owns whether/how they're persisted, not the values.)
- The user wants **mobile performance** of save I/O (main-thread stalls, GC from serialization) — that is `mobile-game-perf`. (save-load owns the serialization shape that respects the budget.)
- The user wants **touch input, enemy FSM, or game feel** — `touch-input`, `fsm-ai`, `game-feel-juice` respectively.
- The user wants **MCP-driven scene assembly** — that is `unity-mcp`.
- The user wants **PRD / requirements authoring** for the save feature — that is `library-guardian`. (save-load produces the ADR + architectural rationale that feeds the PRD.)

If the request straddles boundaries (e.g., "design save/load and the inventory model it persists"), route to `unity-csharp-guardian` for the runtime model first, then `save-load-guardian` for the persistence layer over it.

## The tier gate (route, but expect a design-only answer by default)

Routing to this Guardian during Tier 0 is correct — but the orchestrator should expect the Guardian to **return a design, not built code**, unless the user has explicitly elevated scope past the Tier 0 gate. If a user during Tier 0 says "build the save system now," the Guardian will name the Hard Rule #1 conflict, require an explicit "yes, elevate scope," and otherwise deliver the complete design (model, format ADR, migration plan, atomic-write service shape, EditMode test plan). This is intended behavior, not a refusal to work. See the Weapon's `guides/09-tier-discipline-note.md`.

## Inputs the Guardian needs

Before invoking, ensure the user has provided (or you can infer):

- Access to the DRIFT spine that would be persisted: `Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0Session.cs`, `Gameplay/Inventory/SalvageInventory.cs`, `Gameplay/Bootstrap/Tier0LoopController.cs` + `Tier0LoopPhase.cs`, `Gameplay/Objectives/Tier0ObjectiveTracker.cs`, `Core/Survival/*`, `Gameplay/Bootstrap/Tier0Balance.cs`, and `Data/Items/ItemDefinition.cs` + `ItemDatabase.cs`.
- The governing project docs: `CLAUDE.md` (§3 Status, §4 Objective, Hard Rules), `space-survival-design-doc.md` §3, `ARCHITECTURE.md` §3/§7/§8, `TIER0.md`, `AGENTS.md`.
- Optional: the specific focus (model design, format decision, migration, atomic-write, slots, paths, or testing).
- Optional: whether the user is **explicitly elevating scope** to build now vs. asking for the design.

If the spine access is missing, the Guardian can still produce the format/versioning/atomic-write design, but the concrete capture/apply mapping needs the real files.

## Outputs the Guardian produces

- **Save-format design / decisions / ADRs** → `library/architecture/ADR-<n>-save-format.md` (Context / Decision / Consequences / Alternatives — JsonUtility vs Newtonsoft vs binary).
- **Audits / reviews** (e.g. an id-vs-reference audit of a proposed save model) → `library/qa/save-load/<date>-<topic>.md`.
- **Migration plans** → ordered v1→v2 ladder with the runner and per-step tests.
- **Code (only on scope elevation)** → save model, atomic save service, migration runner, EditMode tests, following the templates in the Weapon — with CLAUDE.md §3 Status Map + ARCHITECTURE.md save section updated in the same change (Hard Rule #8).

Every finding cites (a) the real DRIFT file (`Assets/Scripts/Drift/...:LN`) and (b) the governing guide in `save-load-weapon/guides/` plus the named Unity Manual reference where applicable.

## Multi-Guardian sequences this Guardian participates in

- **Tier 1 persistence stand-up** — `unity-csharp-guardian` confirms the runtime systems expose a capture-friendly surface; `save-load-guardian` designs the model + service + migration ladder; `unity-test-ci-guardian` wires the EditMode round-trip suite into the run; `library-guardian` writes the PRD. This only fires once scope is elevated past Tier 0.
- **Save format ADR** — `save-load-guardian` produces the JsonUtility-vs-Newtonsoft-vs-binary decision as an ADR; `mobile-game-perf` weighs in on serialization cost; `db-guardian` confirms nothing server-side is being smuggled in.
- **Inventory persistence** — `unity-csharp-guardian` owns `SalvageInventory`'s shape; `save-load-guardian` serializes it by id; `game-balance` owns the durability values the slots carry.
- **Cloud-save question (deflected)** — if a user asks for cloud/cross-device save, `save-load-guardian` names the boundary and hands off to `db-guardian` for the backend; it keeps only the local-file half.

## Critical directives the orchestrator should respect

- **Tier discipline first.** The Guardian defaults to design, not code, while the objective is Tier 0 (CLAUDE.md Hard Rule #1, §3, §7; GDD §3). Building requires explicit user scope elevation. This is by design, not an evasion.
- **Stable string IDs, never references.** The save stores `ItemDefinition.id`; it never serializes an SO/object reference, InstanceID, or array index. This is the rule that keeps saves loadable across rebuilds.
- **Save model is distinct from runtime objects.** Plain `[Serializable]` DTOs; capture on save, apply on load; never serialize a `MonoBehaviour`/`ScriptableObject`.
- **Versioned + atomic + corruption-tolerant + EditMode-testable.** Every save carries `schemaVersion`; writes are temp+rename with a `.bak`; loads fall back gracefully; the service is built around the Awake-less convention (Rule #11) so it round-trips headless.
- **Local files only.** The moment a request touches cloud/Postgres/sync, the Guardian hands off to `db-guardian`.
- **Hand off the moment a question crosses a boundary.** Runtime system shape → unity-csharp; backend → db; harness/CI → unity-test-ci; balance values → game-balance; perf → mobile-game-perf.

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`.claude/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
