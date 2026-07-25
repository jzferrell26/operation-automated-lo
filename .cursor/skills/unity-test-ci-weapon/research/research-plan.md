# Research Plan — unity-test-ci-weapon

Topics and sources consulted while forging this Weapon. The load-bearing claims are grounded in **internal repo files** (verifiable, not fabricated); external claims are knowledge-based (UTF/NUnit/GameCI are stable, well-documented APIs). **No fabricated URLs** — where an external doc is the canonical reference, it is named, not linked to an invented address.

## Primary internal sources (the ground truth)

These are the documents and code this Weapon cites; every Hard Rule traces to one of them.

| Source | What it grounds |
|---|---|
| `AGENTS.md` | The entire headless run procedure: tmpfs `Library/` redirect (overlayfs/lmdb, exit 139), license activation (Personal interactive vs Pro serial, exit 198), the two-pass import behavior, the `-quit`+`-runTests` trap, `-testFilter`, `results.xml`, the build history (~9 tests failed on the EditMode-lifecycle issue) |
| `ARCHITECTURE.md §7` | The three EditMode-safe patterns (lazy-init / `Configure(...)` / extracted `Tick`/`Step`) and which components use each; the `DestroyImmediate`-not-`Destroy` rule |
| `CLAUDE.md` §3, §4, §6 (Rule #11, #3, #1) | "Green pending a real-editor run" caveat; the Tier 0 DoD; the EditMode-test discipline rule; data-over-code; one-tier-at-a-time |
| `Assets/Tests/EditMode/Drift.Tests.EditMode.asmdef` | The test assembly field-by-field |
| `Assets/Tests/EditMode/Runtime*Tests.cs` (all 10) | The actual assertion patterns, the `Track`/`[TearDown]` fixture, code-built ScriptableObject content, `Configure`-based DI, reflection `SetPrivate`, the spawner contract test |
| `Assets/Scripts/Drift/Core/Survival/OxygenSystem.cs` | The canonical before/after for Rule #11 (lazy-init + `Tick` + `Update`-forwarder) |
| `Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0RuntimeSpawner.cs` | The `Configure(...)` wiring convention, `CreateInstance` content, the play-mode-aware `DestroyObject` helper |
| `Packages/manifest.json` (per `ARCHITECTURE.md §1`) | `com.unity.test-framework` present |
| `ProjectSettings/ProjectVersion.txt` (per `AGENTS.md`/`TIER0.md`) | Unity `6000.0.23f1` pin; CI `unityVersion` |

## External topics (knowledge-based; canonical references named)

| Topic | Canonical reference (named, not fabricated) | Used in |
|---|---|---|
| Unity Test Framework — EditMode vs PlayMode, `[Test]`/`[UnityTest]`/`[SetUp]`/`[TearDown]`, Test Runner window | Unity Manual: "Unity Test Framework" package docs (`com.unity.test-framework`) | `01`, `02`, `09` |
| EditMode does not run lifecycle methods on script-added components | Unity Test Framework EditMode behavior (corroborated internally by `AGENTS.md` build history + `ARCHITECTURE.md §7`) | `03` (the spine of the Weapon) |
| NUnit assertion model — `Assert.AreEqual` with tolerance, `Assert.Less`/`Greater`, `CollectionAssert`, constraint vs classic model | NUnit documentation (the version vendored as `nunit.framework.dll`) | `04` |
| Assembly definitions, platform restriction, `defineConstraints`, precompiled references | Unity Manual: "Assembly Definitions" | `05` |
| Batchmode CLI — `-batchmode`/`-nographics`/`-runTests`/`-testPlatform`/`-testResults`/`-testFilter`/`-quit` | Unity Manual: "Command line arguments" + UTF "Running tests from the command line" (the DRIFT-specific flags/order come from `AGENTS.md`, which is canon here) | `06`, `07` |
| `results.xml` NUnit 3 XML schema (`<test-run>`/`<test-suite>`/`<test-case>`/`<failure>`) | NUnit 3 XML format docs | `06`, `examples/03` |
| Unity licensing — Personal vs Plus/Pro activation, machine binding | Unity licensing docs (DRIFT specifics — Personal manual-activation discontinuation, `/etc/machine-id` binding — come from `AGENTS.md`) | `07`, `08` |
| GameCI — `game-ci/unity-test-runner`, `UNITY_LICENSE`/serial secrets, `unityci/editor` images, `testMode`, `Library` caching | GameCI documentation (game.ci) | `08`, `examples/04` |
| overlayfs / lmdb mmap-lock incompatibility | general lmdb + overlay filesystem behavior (symptom + fix documented in `AGENTS.md`) | `07` |

## Research questions answered

1. **Why do EditMode tests skip `Awake`/`Start`/`Update`, and how does Drift cope?** → `guides/03`. Grounded in `ARCHITECTURE.md §7` + the real `OxygenSystem`/`MutatedCrewEnemy` shapes + `AGENTS.md`'s "~9 tests failed" history.
2. **What is the exact, working headless run on this VM?** → `guides/06`/`07`, lifted from `AGENTS.md` verbatim (the "obvious" command fails on overlayfs/license).
3. **What are the false-green traps?** → import pass, `-quit`+`-runTests`, empty `results.xml` reported green. All from `AGENTS.md` Gotchas.
4. **How does this become a permanent green check?** → GameCI (`guides/08`), gated on the Personal-license-in-CI problem, surfaced honestly.
5. **What should and shouldn't be tested at Tier 0?** → `guides/11`, derived from the actual ten-suite coverage map and `ARCHITECTURE.md §8`'s "intentionally untested" list.

## Deliberately out of scope (handed off)

- Production C# architecture decisions → `unity-csharp-guardian` (design-for-testability co-owned).
- Scene/prefab assembly, the committed `.unity` scene → `unity-mcp-guardian`.
- Balance numbers behind the assertions → `game-balance`.
- Save/load format (Tier 1) → `save-load` (this Guardian writes the round-trip tests when it lands).
- Mobile perf, touch input, FSM design, game feel → respective sibling Guardians.

## Verification posture

This Weapon is unusual in that its highest-value claims are **internally verifiable**: a reader can open `AGENTS.md`, `ARCHITECTURE.md §7`, and any `Runtime*Tests.cs` and confirm every command, pattern, and assertion cited. That is the intended grounding — the external UTF/NUnit/GameCI knowledge is stable and well-trodden; the project-specific run procedure is the part that's easy to get wrong, and it is pinned to the canonical `AGENTS.md`.
