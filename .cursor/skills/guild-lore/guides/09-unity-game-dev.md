# Pillar 9: Unity Game Dev cohort (PROJECT-DRIFT)

## CRITICAL DIRECTIVES

Before acting in this domain you MUST load these skills via the Skill tool:

- `unity-csharp-weapon`: owns MonoBehaviour lifecycle, ScriptableObject-as-data discipline, and asmdef/namespace architecture; the C# foundation every other Unity weapon's code sits on top of.
- `unity-mcp-weapon`: owns the Unity MCP bridge that lets the agent drive the live Editor (console reads, GameObject creation, scene assembly).
- `unity-test-ci-weapon`: owns the Unity Test Framework (EditMode + PlayMode), the EditMode-safe design contract, and GameCI headless wiring.
- `unity-build-weapon`: owns the device build pipeline (Android IL2CPP/Gradle/AAB, iOS Xcode/fastlane, keystores, signing).
- `unity-rendering-weapon`: owns the URP Render Pipeline Asset, quality tiers, lighting model, and post-processing volumes.
- `unity-art-pipeline-weapon`: owns the art IMPORT pipeline: FBX import settings, LOD groups, texture atlasing, material variants.
- `unity-audio-weapon`: owns the AudioMixer routing, 3D spatial SFX, and zone-based ambient soundscapes.
- `unity-level-design-weapon`: owns modular 3D level authoring, scene composition for the fixed top-down camera, additive scene loading.
- `mobile-game-perf-weapon`: owns the frame budget, GC-allocation discipline, object pooling, and draw-call batching, always paired with a measurement method.
- `game-feel-juice-weapon`: owns the feedback/polish layer: hit feedback, screenshake, hitstop, camera feel; scaffolds the plumbing, the human owns the final feel call.
- `game-balance-weapon`: owns VALUES and CURVES as data: economy sinks/faucets, survival-meter pacing, salvage yields, enemy difficulty numbers.
- `fsm-ai-weapon`: owns enemy AI BEHAVIOR as finite state machines (idle-chase-attack-return and extensions), not the numbers behind it.
- `character-art-rig-weapon`: owns the humanoid Mecanim avatar/rig, locomotion blend trees, and modular cosmetic equipment swapping.
- `character-progression-weapon`: owns XP/leveling curves, skill/perk trees, and equipment-driven stat modifiers as ScriptableObject data.
- `procedural-generation-weapon`: owns procedural content ALGORITHMS: scavenge-location layout, weighted loot tables, seedable/deterministic generation.
- `save-load-weapon`: owns the on-device save/load layer: a dedicated serializable save model, versioning/migration, atomic writes.
- `touch-input-weapon`: owns the mobile touch-input layer: virtual joystick, tap-to-move, on-screen buttons, decoupled from gameplay logic via `IInputSource`.

---

## What this pillar collectively knows

This entire pillar is scoped to PROJECT-DRIFT, a Unity 6 top-down mobile space-survival game, and its conventions (the `Drift.Runtime` asmdef, `Tier0Balance` as the tuning surface, `TopDownPlayerController`, `MutatedCrewEnemy`) are load-bearing across nearly every weapon here — this is not a generic Unity cohort, it is a single project's full engineering surface. The organizing split is **engine foundation** (unity-csharp, unity-mcp, unity-test-ci, unity-build), **rendering and content pipeline** (unity-rendering, unity-art-pipeline, unity-audio, unity-level-design), **runtime systems and performance** (mobile-game-perf, game-feel-juice, game-balance, fsm-ai), and **gameplay-data systems** (character-art-rig, character-progression, procedural-generation, save-load, touch-input).

### Disambiguation table

| Situation | Weapon that owns it | Not this one |
|---|---|---|
| MonoBehaviour lifecycle, should this be a ScriptableObject, asmdef review | `unity-csharp-weapon` | `unity-test-ci-weapon` (testability of the code, not its architecture) |
| Driving the live Editor from the agent, reading the console | `unity-mcp-weapon` | none |
| Writing an EditMode test, headless batchmode CI run | `unity-test-ci-weapon` | `unity-csharp-weapon` (architecture that enables testability, not the tests themselves) |
| Android/iOS build chain, keystore, AAB vs APK | `unity-build-weapon` | `unity-test-ci-weapon` (CI test runs, not device builds) |
| URP asset config, Forward vs Forward+, baking lighting | `unity-rendering-weapon` | `mobile-game-perf-weapon` (shader/draw-call cost, co-owned but perf-guardian flags cost, rendering-guardian owns the pipeline config) |
| FBX import settings, LOD groups, texture atlasing | `unity-art-pipeline-weapon` | `unity-rendering-weapon` (pipeline config, not asset import) |
| AudioMixer routing, spatial SFX, ambient soundscapes | `unity-audio-weapon` | none |
| Modular prefab kits, scene composition, additive loading | `unity-level-design-weapon` | `unity-art-pipeline-weapon` (asset import, not level assembly) |
| Is this allocating per frame, object pooling, draw-call reduction | `mobile-game-perf-weapon` | `unity-csharp-weapon` (perf-guardian flags the cost, csharp-guardian owns the resulting pattern) |
| Screenshake, hitstop, camera feel, "does this feel good" | `game-feel-juice-weapon` | `mobile-game-perf-weapon` (co-owns the VFX/particle frame budget, but juice-guardian owns feel intent) |
| Oxygen tick pacing, salvage yield curves, durability decay economy | `game-balance-weapon` | `character-progression-weapon` (leveling/skill curves specifically, not general economy) |
| Enemy state transitions, aggro/leash logic, wave spawner | `fsm-ai-weapon` | `game-balance-weapon` (behavior, not the numeric difficulty tuning) |
| Humanoid rig, locomotion blend tree, outfit swapping | `character-art-rig-weapon` | `character-progression-weapon` (visual rig, not stat systems) |
| XP curves, skill trees, equipment stat modifiers | `character-progression-weapon` | `game-balance-weapon` (progression-specific, not general economy tuning) |
| Randomized scavenge layouts, weighted loot tables, seeded determinism | `procedural-generation-weapon` | `unity-level-design-weapon` (hand-authored composition, not algorithmic generation) |
| Save model design, versioning/migration, atomic writes | `save-load-weapon` | none |
| Virtual joystick, tap-to-move, swipe gestures | `touch-input-weapon` | `game-feel-juice-weapon` (touch-input owns the raw input, juice-weapon owns the feedback response to it) |

### Canonical multi-weapon sequences

1. **New gameplay system (canonical DRIFT build order):** `unity-csharp-weapon` establishes the architecture (MonoBehaviour vs ScriptableObject split) → `game-balance-weapon` or `character-progression-weapon` defines the data → `fsm-ai-weapon` or `touch-input-weapon` wires the behavior/input → `game-feel-juice-weapon` adds the feedback layer → `mobile-game-perf-weapon` audits the frame budget → `unity-test-ci-weapon` writes EditMode coverage → `unity-mcp-weapon` assembles/verifies the scene live in the Editor.
2. **Art-to-scene pipeline:** `unity-art-pipeline-weapon` sets FBX/texture import settings → `unity-level-design-weapon` composes the scene from the resulting prefab kit → `unity-rendering-weapon` configures URP lighting and post-processing over the composed scene.
3. **Release readiness:** `unity-test-ci-weapon` gates CI on the EditMode/PlayMode suite → `mobile-game-perf-weapon` verifies the frame budget on mid-tier hardware → `unity-build-weapon` produces the signed device build.
4. **Enemy encounter design:** `game-balance-weapon` sets the numeric difficulty (health, damage, spawn weight) → `fsm-ai-weapon` implements the behavior tree/FSM that consumes those numbers → `game-feel-juice-weapon` wires the hit feedback → `mobile-game-perf-weapon` co-owns the VFX budget for the encounter.

### Load-bearing hard rules and gotchas

- **All content is ScriptableObject DATA, never hardcoded** (Hard Rule referenced across `unity-csharp-weapon`, `game-balance-weapon`, `character-progression-weapon`, and `procedural-generation-weapon`) — items, recipes, structures, balance numbers, and progression curves are all SO assets, not inline constants.
- **AI and gameplay logic must be EditMode-testable without a device or a running Editor session**, per `unity-csharp-weapon`, `unity-test-ci-weapon`, `fsm-ai-weapon`, `save-load-weapon`, and `touch-input-weapon` alike — this is the single most repeated hard rule in this pillar. A pattern that requires PlayMode or a physical device to verify is treated as an architecture defect, not an acceptable design.
- **Never combine `-quit` with `-runTests`** in headless Unity CI batchmode per `unity-test-ci-weapon` — this is a documented footgun that silently produces false-green results.
- **Save data serializes stable content IDs (`ItemDefinition.id`), never ScriptableObject or object references directly** per `save-load-weapon` — a save file that references a live object risks breaking across content updates.
- **Input is decoupled from gameplay logic via an `IInputSource` abstraction and a `MoveIntent` struct** per `touch-input-weapon`, specifically so `TopDownPlayerController.ResolveMove(...)` can be driven from EditMode tests without a device.
- **Zero per-frame GC allocations in Tick/Update hot paths** per `mobile-game-perf-weapon` — no LINQ, no boxing, no `foreach` over a collection that allocates an enumerator, in any per-frame code path.
- **Root motion is OFF; facing is twin-stick-lite** per `character-art-rig-weapon` — do not introduce root-motion-driven locomotion into the top-down camera model.
- **Procedural generation must be seedable and deterministic** (`System.Random` or `Unity.Mathematics` seed to reproducible output) per `procedural-generation-weapon`, specifically so generation is EditMode-testable.
- **The human makes the final call on game feel and device-build flashing** (CLAUDE.md section 7, referenced by `game-feel-juice-weapon` and `unity-build-weapon`) — these weapons scaffold the plumbing and tunable knobs; they do not make the final subjective or physical-device decision.

---

## Cross-references to sibling pillars

- Security and quality close-out for shipped gameplay code still routes through **Pillar 3: Security, Quality & Code Review**, even though most security concerns there are web-stack-specific and may not apply directly to a Unity client.
- CI/CD wiring for GameCI headless runs pairs with **Pillar 4: Deploy & Live Operations** general CI discipline, though `unity-test-ci-weapon` owns the Unity-specific mechanics.
- App-store submission for the finished mobile build is **Pillar 6: Business, Growth & GTM** (`app-store-submission-weapon`), which picks up after `unity-build-weapon` produces the signed binary.
- Product-process methodology (sprints, retros, estimation) that paces PROJECT-DRIFT's development is **Pillar 7: Product Process & Documentation**.
