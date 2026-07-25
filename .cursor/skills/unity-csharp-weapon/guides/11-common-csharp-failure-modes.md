# 11 — Common Unity C# Failure Modes

The recurring mistakes this Guardian catches, each with the Drift-grounded fix and its severity. Use this as the review checklist after the principles.

## 1. Logic trapped in `Update` (un-extracted)

**Symptom:** gameplay/economy logic written directly in `Update`, so an EditMode test can't drive it.
**Why it's a problem:** Unity doesn't run `Update` in EditMode; the logic is uncovered (`10-editmode-safe-patterns.md`).
**Fix:** extract a public `Tick(float deltaSeconds)`/`Step(float)`; make `Update` a one-line forwarder (`OxygenSystem.Update` → `Tick`).
**Severity:** must-fix (for coverage-needing components).

## 2. Dependencies resolved only in `Awake`/`Start`

**Symptom:** a component reaches out via `FindObjectOfType`/`GetComponent` only in `Awake`/`Start`, no `Configure`.
**Why:** those callbacks don't run in EditMode; the object can't be wired in a test (`04-component-composition.md`).
**Fix:** add `Configure(...)` injection (`MutatedCrewEnemy.Configure`); keep any `Start` lookup as a fallback only.
**Severity:** must-fix.

## 3. `Object.Destroy` in edit-mode-reachable code

**Symptom:** `Destroy(obj)` in a method a test or editor tool can reach.
**Why:** `Object.Destroy` throws in edit mode (`ARCHITECTURE.md` §7).
**Fix:** route through a play-mode-aware helper (`Tier0RuntimeSpawner.DestroyObject`: `Destroy` in Play, `DestroyImmediate` otherwise).
**Severity:** must-fix.

## 4. Content hardcoded instead of a ScriptableObject

**Symptom:** a new item/recipe/structure/crew added as a C# class with baked-in stats.
**Why:** violates Hard Rule #3 — content is data (`02-scriptableobject-data.md`).
**Fix:** author an `ItemDefinition`/`RecipeDefinition` asset; reference it via `ItemDatabase`/`Tier0Balance`.
**Severity:** must-fix.

## 5. `FindObjectOfType` / `GameObject.Find` in a hot path

**Symptom:** a scene-wide search called every frame or as primary wiring.
**Why:** scans the scene (slow), doesn't survive renames, untestable.
**Fix:** `Configure`-inject the reference, or `TryGetComponent` a sibling; cache it.
**Severity:** should-refactor (also a perf concern → `mobile-game-perf-guardian`).

## 6. Public mutable fields as tunables

**Symptom:** `public float drainPerSecond;` exposed purely for the inspector.
**Why:** any script can silently mutate tuning; clutters the API (`05-serialization-and-inspector.md`).
**Fix:** `[SerializeField] float drainPerSecond;` + a read-only property (`DrainEnabled`) or an intentional setter (`SetDrainEnabled`).
**Severity:** should-refactor.

## 7. Event subscriptions that leak

**Symptom:** `evt += Handler` with no matching `-=` in `OnDestroy`/`OnDisable`.
**Why:** the destroyed subscriber's handler fires later → `MissingReferenceException`; memory leak (`06-events-and-messaging.md`).
**Fix:** unsubscribe symmetrically, null-guarded (`OxygenSystem.OnDestroy`).
**Severity:** must-fix.

## 8. Raising an event without `?.Invoke`

**Symptom:** `Changed.Invoke(...)` instead of `Changed?.Invoke(...)`.
**Why:** `NullReferenceException` when there are zero subscribers.
**Fix:** always null-conditional (`Health.Changed?.Invoke`).
**Severity:** must-fix.

## 9. Polling where an event exists

**Symptom:** per-frame `if (health.Current < last)` instead of subscribing to `Health.Changed`.
**Why:** ordering bugs, wasted frames, the loop is event-driven by design (`ARCHITECTURE.md` §5).
**Fix:** subscribe to the existing Drift event; react on the edge.
**Severity:** should-refactor.

## 10. Deep MonoBehaviour inheritance

**Symptom:** `Enemy : Character : Entity : MonoBehaviour`.
**Why:** fights Unity's component model; brittle EditMode setup (`04-component-composition.md`).
**Fix:** make the shared behaviour a component (`Health`) every entity composes.
**Severity:** should-refactor.

## 11. Logic creeping into a data ScriptableObject

**Symptom:** `ItemDefinition.Use()`, a coroutine on a recipe SO, mutable runtime state on an `.asset`.
**Why:** data SOs are nouns; behaviour and runtime state belong on MonoBehaviours / `[Serializable]` classes (`02-scriptableobject-data.md`, `05-serialization-and-inspector.md`).
**Fix:** move the verb to the consuming component; runtime state to a session object (→ `save-load-guardian` if it must persist).
**Severity:** should-refactor (must-fix if it's shared mutable global state).

## 12. `async`/`Task` inside MonoBehaviours for gameplay timing

**Symptom:** `async void Update`, `await Task.Delay` for gameplay sequencing.
**Why:** `async void` swallows exceptions, doesn't respect Unity's frame loop or object destruction, and is invisible to EditMode tests. Gameplay timing belongs in the extracted `Tick`/`Step` or (for presentation) a coroutine (`07-coroutines-vs-update.md`).
**Fix:** use the extracted-step pattern for logic; a coroutine for presentation timing.
**Severity:** should-refactor (must-fix if `async void` is on a gameplay-critical path).

## 13. Magic numbers inline in gameplay logic

**Symptom:** `if (count >= 4)` in a crafter instead of `Tier0Balance.CutterScrapCost`.
**Why:** tuning scattered across files; balance changes touch many places (`09-the-drift-spine.md`).
**Fix:** pull the constant into `Tier0Balance` or a `[SerializeField]`. (What the number *is* → `game-balance-guardian`.)
**Severity:** should-refactor.

## 14. Second asmdef / wrong-layer placement

**Symptom:** a new `*.asmdef` under `Assets/Scripts/Drift/`, or a `Core` file `using Drift.Gameplay`.
**Why:** reopens the two-spine debt; inverts dependency direction (`03-asmdef-and-namespaces.md`).
**Fix:** one `Drift.Runtime` assembly; keep dependencies flowing `Gameplay → Data → Core`.
**Severity:** must-fix (second asmdef) / should-refactor (inverted dependency).

## 15. Tier violation

**Symptom:** building durability degradation, the save layer, NavMesh, grid inventory, or a real HUD now.
**Why:** Tier 0 is incomplete; Hard Rule #1 forbids building ahead.
**Fix:** flag it, name the owning Guardian/Tier, and stop (Hard Rule #10 — flag, don't freelance).
**Severity:** must-fix (do not merge ahead-of-tier work).

---

**Review flow:** walk `00-principles.md` first move → classify → check content-is-data (#4) → check EditMode safety (#1, #2, #3, #7, #8) → check composition/events/serialization (#6, #9, #10, #11) → check spine placement and tier (#13, #14, #15). Cite every finding with `Assets/Scripts/Drift/...cs:LN` + the governing guide/Hard Rule.
