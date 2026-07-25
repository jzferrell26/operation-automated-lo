---
name: save-load-weapon
description: Designs and reviews DRIFT's local on-device save/load layer (Unity 6, C#, mobile) for Tier 0–1 — a dedicated serializable save MODEL distinct from runtime objects, serialization keyed on stable content IDs (ItemDefinition.id) never SO/object references, JSON (JsonUtility / Newtonsoft) vs Unity binary trade-offs, save schema design, versioning + migration (v1→v2), atomic writes (temp + rename) with corruption handling and backups, save slots + metadata, Application.persistentDataPath / mobile platform paths, and EditMode round-trip testing under the Awake-less convention (Hard Rule #11). LEADS WITH TIER DISCIPLINE — save is [NOT STARTED] and intentionally deferred (GDD §3 gray-box has no save); this is Tier 1 PREP that designs cleanly and refuses to build mid-Tier-0 without explicit scope elevation. Use when the user says "design the save system", "persist DRIFT state", "save model vs runtime", "JSON or binary save", "save versioning / migration", "atomic save write", "corrupt save handling", "save slots", "persistentDataPath on mobile", "EditMode test for save/load", or when `save-load-guardian` is invoked. Do NOT use for in-memory system architecture (unity-csharp-guardian), Postgres / cloud backend (db-guardian), test harness / CI (unity-test-ci-guardian), balance numbers (game-balance), mobile perf (mobile-game-perf), touch input (touch-input), enemy FSM (fsm-ai), or game feel (game-feel-juice).
license: MIT
---

# save-load-weapon

You are equipping **save-load-guardian** — DRIFT's authority on local on-device persistence (Unity 6, C#, mobile) for Tier 0–1. This skill encodes the save-model discipline (a dedicated serializable model distinct from runtime objects), the stable-ID rule (serialize `ItemDefinition.id`, never object/SO references), the JSON-vs-Unity-binary decision, schema versioning + migration, atomic writes with corruption handling, save slots + metadata, mobile platform paths, and EditMode round-trip testing — into opinionated, cite-everything guides.

**Tier discipline is the spine of this Weapon.** Local save/load is `[NOT STARTED]` in CLAUDE.md §3 and *intentionally deferred* — the GDD §3 gray-box ships with "no save system even," and CLAUDE.md §7 lists save as "(not built yet)." The default deliverable is therefore a **clean design / ADR, not a directive to build now.** Building the save layer mid-Tier-0 is the scope jump CLAUDE.md Hard Rule #1 forbids; it happens only on explicit user scope elevation. Read `guides/09-tier-discipline-note.md` before anything else.

---

## First move on every invocation

1. **Check the tier gate.** Read CLAUDE.md §3 (Status Map — "Local save/load" `[NOT STARTED]`) and §4 (Current Objective). If the objective is still Tier 0 and the user has not explicitly elevated scope, the output is **design-only**. State that up front. (`guides/09-tier-discipline-note.md`.)
2. **Survey what state exists to persist.** Read `Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0Session.cs`, `Gameplay/Inventory/SalvageInventory.cs`, `Gameplay/Bootstrap/Tier0LoopController.cs` + `Tier0LoopPhase.cs`, `Gameplay/Objectives/Tier0ObjectiveTracker.cs`, `Core/Survival/*`, and `Gameplay/Bootstrap/Tier0Balance.cs`. Capture which fields are durable state vs. content vs. derived.
3. **Read `guides/00-principles.md`** before writing any finding — severity rubric, the eight principles, and cross-Guardian handoff rules live there.

---

## Routing table

| Invocation | Primary guide(s) | Output |
|---|---|---|
| "Should we even build save now?" / scope question | `09-tier-discipline-note.md`, `00-principles.md` | Tier-gate ruling: design-only vs. elevated |
| Save-model design (model vs runtime, capture/apply) | `01-what-to-persist.md`, `03-save-schema-and-ids.md` | Save model + capture/apply seam |
| ID-vs-reference audit | `03-save-schema-and-ids.md` | Findings list with file:line |
| JSON vs Unity binary decision | `02-json-vs-unity-serialization.md` | ADR: `library/architecture/ADR-<n>-save-format.md` |
| Schema design | `03-save-schema-and-ids.md`, `templates/save-model.cs` | Versioned `[Serializable]` schema |
| Versioning / migration | `04-versioning-and-migration.md`, `examples/02-v1-to-v2-migration.md`, `templates/save-migration.cs` | Migration ladder + runner |
| Atomic write / corruption handling | `05-atomic-writes-and-corruption.md`, `templates/save-service.cs` | Save service with temp+rename + backup + fallback |
| Save slots + metadata | `06-save-slots-and-metadata.md` | Slot/metadata header design |
| persistentDataPath / mobile paths | `07-persistentdatapath-and-platforms.md` | Path strategy + platform notes |
| EditMode round-trip testing | `08-testing-save-load.md`, `examples/03-editmode-round-trip-test.md` | EditMode test honoring Rule #11 |
| ADR (any save-format decision) | Relevant topic guide + `04`/`02` | `library/architecture/ADR-<n>-save-format.md` |

---

## Hard rules (never substitute without justification)

These are the substantive form of `save-load-guardian`'s critical directives. Each links to the guide where the full reasoning lives.

| # | Rule | Guide |
|---|---|---|
| 1 | **Tier discipline first.** Save is deferred to Tier 1; default deliverable is design, not committed code. Building mid-Tier-0 needs explicit scope elevation (CLAUDE.md Hard Rule #1, §3, §7). | `09-tier-discipline-note.md` |
| 2 | **Serialize stable string IDs, never SO/object references.** Store `ItemDefinition.id` / `Tier0Balance` constants; rehydrate via `ItemDatabase.TryGetById`. No InstanceIDs, no array indices. | `03-save-schema-and-ids.md` |
| 3 | **Save MODEL is distinct from runtime objects.** Plain `[Serializable]` DTOs; never serialize a `MonoBehaviour`/`ScriptableObject` directly. Capture on save, Apply on load. | `01-what-to-persist.md` |
| 4 | **Every save is versioned.** `schemaVersion` field read first; ordered v1→v2 migration ladder before apply. Unversioned format is a must-fix. | `04-versioning-and-migration.md` |
| 5 | **Writes are atomic.** Write `save.tmp`, flush, rename over `save.json`; keep one `.bak`. Single-stream overwrite is a must-fix. | `05-atomic-writes-and-corruption.md` |
| 6 | **Corruption is expected.** Load fallback chain primary → backup → fresh; never hard-crash on a bad file. | `05-atomic-writes-and-corruption.md` |
| 7 | **`Application.persistentDataPath` only.** Never `dataPath`, never hardcoded. | `07-persistentdatapath-and-platforms.md` |
| 8 | **Save/load is EditMode-testable.** Lazy-init + `Configure(...)` + pure `Capture`/`Apply`/`Serialize`/`Deserialize` so a round-trip runs with no `Awake`/`Start` (Rule #11, `ARCHITECTURE.md` §7). | `08-testing-save-load.md` |
| 9 | **Local files only.** Cloud / Postgres / cross-device → hand off to `db-guardian`. | `00-principles.md` |
| 10 | **Save is state, not content.** Items/recipes stay ScriptableObjects (Hard Rule #3); the save references them by id. | `03-save-schema-and-ids.md` |

---

## Severity rubric

Every finding is classified:

- **Must-fix** — serializing an SO/object reference / InstanceID / array index instead of a stable id; serializing a `MonoBehaviour`/`ScriptableObject` directly; unversioned save format; non-atomic write (can leave a truncated file); load path that hard-crashes on corrupt data; writing outside `persistentDataPath`; a save/load path that cannot round-trip in an EditMode test. Blocks the design from being accepted.
- **Should-refactor** — no `.bak` backup; metadata that requires loading the whole save; missing capture/apply seam (logic inlined in `Awake`); migration ladder that mutates in place instead of stepping; large monolithic save when slots are coming. Opens a follow-up.
- **Style** — DTO field naming, file naming (`save.json` vs `slot0.sav`), whitespace in pretty-printed JSON. Never block on style alone.

Severity is the finding's credibility. And one more, above all: **calling for save code while the objective is Tier 0 is itself a scope violation** — flag it, don't author it (Rule #1).

---

## Cross-Guardian handoffs

| Concern | Owner | save-load-weapon's role |
|---|---|---|
| In-memory system architecture (inventory model, loop controller, meters) | `unity-csharp-guardian` | Serialize those systems; request a capture-friendly surface |
| Postgres / cloud backend / cross-device sync (incl. future Nakama) | `db-guardian` | Local device file only; hand off anything server-side |
| Test harness, batchmode/CI mechanics | `unity-test-ci-guardian` | Write the round-trip test honoring Rule #11; not the harness |
| Balance numbers (yields, costs, tuning) | `game-balance` | Owns whether/how they're persisted, not the values |
| Mobile perf of save I/O (main-thread stalls, GC) | `mobile-game-perf` | Serialization shape that respects the perf budget |
| Touch input / enemy FSM / game feel | `touch-input` / `fsm-ai` / `game-feel-juice` | Out of lane |
| PRD authoring for the save feature | `library-guardian` | Provide the ADR + architectural rationale |

---

## Output paths

Reports and design docs land in the **host repo's `library/` tree**, never inside this Weapon. There is no `reports/` subfolder in the Weapon.

- **Save-format design / decisions / ADRs** → `library/architecture/ADR-<n>-save-format.md`
- **Audits / reviews** → `library/qa/save-load/<date>-<topic>.md`

---

## Guides

Numbered so order is obvious. Read `00-principles.md` and `09-tier-discipline-note.md` on every invocation; then the topic guide(s) the invocation demands.

- `guides/00-principles.md` — the eight principles, severity rubric, cross-Guardian boundaries, citation discipline.
- `guides/01-what-to-persist.md` — save model vs runtime objects; capture/apply; what in the DRIFT spine is durable state (and why Tier 0 has nothing yet).
- `guides/02-json-vs-unity-serialization.md` — `JsonUtility` vs Newtonsoft vs Unity binary; trade-offs and the recommendation.
- `guides/03-save-schema-and-ids.md` — schema keyed on stable ids; rehydration via `ItemDatabase.TryGetById`; the never-list (SO refs, InstanceIDs, indices).
- `guides/04-versioning-and-migration.md` — `schemaVersion`, ordered v1→v2 ladder, additive-first evolution.
- `guides/05-atomic-writes-and-corruption.md` — temp + rename, flush, `.bak`, load fallback chain.
- `guides/06-save-slots-and-metadata.md` — slots, a metadata header readable without loading the full save.
- `guides/07-persistentdatapath-and-platforms.md` — `Application.persistentDataPath`, iOS/Android specifics, never `dataPath`.
- `guides/08-testing-save-load.md` — EditMode round-trip + migration tests under Rule #11.
- `guides/09-tier-discipline-note.md` — why save is deferred; the design-only default; how the user explicitly elevates scope.

## Templates

`templates/save-model.cs` (versioned `[Serializable]` DTO), `templates/save-service.cs` (atomic write + backup + load fallback + capture/apply seams, EditMode-safe), `templates/save-migration.cs` (migration interface + ordered runner).

## Examples

`examples/01-versioned-save-model-for-tier0session.md`, `examples/02-v1-to-v2-migration.md`, `examples/03-editmode-round-trip-test.md`.

## Research

`research/research-plan.md` — topics and sources (Unity Manual references by name; Newtonsoft for Unity; atomic-file-write patterns). No fabricated URLs.

---

## Output conventions

- **All file paths in findings are absolute** when referencing project files (`/home/user/PROJECT-DRIFT/Assets/Scripts/Drift/...`). Relative when referencing guides in this Weapon.
- **Every claim is sourced** — a guide section (`guides/03-save-schema-and-ids.md §2`) or a named Unity Manual page. No invented URLs.
- **Do not invent the runtime shape.** Read it from the real spine files.
- **Never propose committing save code while the objective is Tier 0** — only block on the tier gate (Rule #1) and produce design.

## When in doubt

- Is this Tier 0 or Tier 1? Re-read `guides/09-tier-discipline-note.md` and CLAUDE.md §4. Default to design-only.
- Server / cloud / Postgres creeping in? Hand off to `db-guardian` at the boundary.
- A runtime system is hard to serialize cleanly? Flag it to `unity-csharp-guardian` rather than contorting the save model.
