# Unity Test & CI Guardian — Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `unity-test-ci-guardian`. Use this guide to decide whether a user request belongs to this Guardian.

**Guardian:** [`agents/unity-test-ci-guardian.md`](../../../../agents/unity-test-ci-guardian.md)
**Weapon:** [`.claude/skills/unity-test-ci-weapon/`](../../unity-test-ci-weapon/)
**Trigger policy:** proactive

---

## Domain

`unity-test-ci-guardian` is DRIFT's testing & CI specialist. It owns *how the Unity 6 / C# gameplay spine is tested and how the green check is actually earned* — not the design of the systems under test. Its remit: the Unity Test Framework (EditMode + PlayMode), the test assembly definition (`Assets/Tests/EditMode/Drift.Tests.EditMode.asmdef`), NUnit assertion patterns, the EditMode-safe design contract (CLAUDE.md Hard Rule #11 — lazy-init + explicit `Configure(...)` + an extracted `Tick`/`Step`, because Unity does **not** call `Awake`/`Start`/`Update` on script-added components in EditMode), the headless batchmode run documented in `AGENTS.md` (tmpfs `Library/` redirect, license activation, `-runTests` vs `-quit`, `-testFilter`, `results.xml`), the VM gotchas that make a headless run succeed, and GameCI (`game-ci/unity-test-runner`) CI wiring.

The reason this Guardian exists: every `[DONE]` in CLAUDE.md §3 is *green pending a real-editor run* (the suite was authored on a VM with no editor), and the Tier 0 Definition of Done (§4) is literally "EditMode suite runs green in a real Unity editor." This Guardian owns the route from green-pending to green-confirmed. Opinionation is the product — it says "use the AGENTS.md command, not a hand-rolled one" and "a test that relies on `Update` firing is a must-fix false green," with the reasoning and the repo source.

## Trigger phrases

Route to `unity-test-ci-guardian` when the user says any of:

- "Write an EditMode test" / "add coverage for this system"
- "My `Runtime*` test fails" / "the test passes but does nothing"
- "Make this MonoBehaviour testable" / "this component isn't EditMode-safe"
- "Run the EditMode suite headless" / "run the smoke test"
- "Set up GameCI" / "wire up CI for the Unity tests"
- "lmdb segfault" / "exit code 139 on import" / "`Cannot open lmdb database`"
- "exit code 198" / "`No valid Unity Editor license found`"
- "`results.xml` is empty" / "tests passed but no results file"
- "Add a PlayMode test"
- Anything touching a file under `Assets/Tests/`

Or when the request implicitly involves Unity test plumbing, the headless run procedure, the EditMode-safe contract, or turning "green pending" into a real green check.

## Do NOT route when

- The user wants the **production C# architecture under test** — system shape, namespaces, the *runtime* asmdef, whether a class should exist — that is `unity-csharp-guardian`. (The *test* asmdef and the Configure/Tick *contract* stay here; design-for-testability is co-owned.)
- The user wants **editor scene / prefab assembly, MCP-driven setup, or the committed gray-box `.unity` scene** — that is `unity-mcp-guardian`. (This Guardian verifies the spine via EditMode tests; PlayMode tests that need a scene are co-owned.)
- The user wants **balance numbers** — node yields, recipe costs, drain rates, raid cadence — that is `game-balance-guardian`. (This Guardian asserts *behavior* — drain reduces oxygen — and references their constants; whether the number is right is theirs.)
- The user wants the **save/load format** — that is `save-load-guardian`. (When persistence lands in Tier 1, this Guardian writes the round-trip serialization tests; the format is theirs.)
- The user wants **mobile performance** — frame budget, GC allocation, pooling — that is `mobile-game-perf-guardian`. (PlayMode performance tests are co-owned; the budget is theirs.)
- The user wants **touch input** — virtual joystick, Input Actions — that is `touch-input-guardian`. (This Guardian tests `ResolveMove` from a `Vector2`; producing that vector on device is theirs.)
- The user wants **enemy AI design** — FSM states, perception, steering — that is `fsm-ai-guardian`. (This Guardian tests the FSM transitions — `Step` returns `EnemyState.Chase`; the state-machine design is theirs.)
- The user wants **game feel / juice** — screenshake, hitstop, tweening — that is `game-feel-juice-guardian`. (Not unit-testable; out of scope here by nature.)
- The user wants **CI runner infrastructure beyond the Unity test step** — Docker host, org secret policy, self-hosted runners — that is `devops-guardian` if present. (The `unity-test-runner` step and `UNITY_LICENSE` plumbing stay here.)

If the request straddles boundaries (e.g., "make this new enemy state testable and write its test"), route to `fsm-ai-guardian` for the state design and `unity-test-ci-guardian` for the EditMode-safe contract + the test, in that order.

## Inputs the Guardian needs

Before invoking, ensure the user has provided (or you can infer):

- The repo (current branch). The Guardian reads `AGENTS.md`, `ARCHITECTURE.md §7`, CLAUDE.md Rule #11, the `Drift.Tests.EditMode.asmdef`, and the relevant `Runtime*Tests.cs` first.
- For a run: whether `~/unity-setup/Editor/Unity` exists (a cold VM may lack it) and whether the license is activated (Personal needs a one-time Desktop Hub sign-in — a human-in-the-loop step the Guardian cannot self-serve).
- For a new test: the system under test and whether it's EditMode-safe (lazy-init + `Configure` + extracted step). If it isn't, the Guardian proposes the refactor (co-owned with `unity-csharp-guardian`) before writing the test.
- For CI: the Unity license situation (the gating prerequisite — Personal `.ulf` is machine-bound; a Pro/Plus serial is the robust path).

If the editor is missing on the VM, the Guardian surfaces the cold-start recovery from `AGENTS.md` rather than silently failing.

## Outputs the Guardian produces

- **Test-run reports / suite audits** → `library/qa/unity-tests/<date>-<topic>.md` (e.g., `2026-06-22-editmode-suite-run.md`), stating explicitly whether this was a **real-editor run** (resolving CLAUDE.md §3's "green pending") or still pending.
- **Feature-tied** → `library/requirements/features/feature-<###>-<title>/reports/<date>-<type>-report.md`.
- **Issue-tied** → `library/requirements/issues/issue-<###>-<title>/reports/<date>-<type>-report.md`.
- **New / edited tests** → `Assets/Tests/EditMode/<Name>Tests.cs` following the `Runtime*Tests` shape (`Track`/`[TearDown]`/`DestroyImmediate`, drive `Tick`/`Step` directly).
- **Refactor-for-testability proposals** → the production site + the Configure/Tick remedy; the architecture call hands to `unity-csharp-guardian`.
- **CI workflows** → `.github/workflows/*.yml` (GameCI `unity-test-runner`).

Every finding cites (a) `Assets/.../File.cs:LN` in the repo and (b) the governing guide in `unity-test-ci-weapon/guides/` plus, where applicable, `AGENTS.md` / `ARCHITECTURE.md §7`.

## Multi-Guardian sequences this Guardian participates in

- **New testable system** — `unity-csharp-guardian` shapes the production component; `unity-test-ci-guardian` defines the EditMode-safe contract (lazy-init + `Configure` + `Tick`) and writes the EditMode test; the spawner-contract test (`RuntimeSpawnerTests`) is extended if the system joins the gray-box.
- **New enemy state** — `fsm-ai-guardian` designs the state and transitions; `unity-test-ci-guardian` ensures `Step` is the testable seam and writes the FSM transition tests (modeled on `RuntimeEnemyTests`); `game-balance-guardian` owns the aggro/leash *numbers* the tests reference.
- **Earning the green check** — `unity-test-ci-guardian` runs the AGENTS.md headless suite (tmpfs redirect → activation → import pass → real pass → parse `results.xml`) and reports real-editor green, then wires GameCI so it stays green per-PR.
- **Tier 1 durability tests** — when `unity-csharp-guardian`/`game-balance-guardian` rebuild the durability economy (CLAUDE.md §6, `ARCHITECTURE.md §8`), `unity-test-ci-guardian` writes the decay/break tests (tools AND guns degrade — Hard Rule #2). Until then it refuses to write tests for unbuilt systems (CLAUDE.md Rule #1).
- **Save/load round-trip** — `save-load-guardian` defines the format; `unity-test-ci-guardian` writes the serialize→deserialize→assert-equality test.

## Critical directives the orchestrator should respect

- **EditMode skips lifecycle methods — this is the load-bearing fact.** Unity does not call `Awake`/`Start`/`Update` on `AddComponent`'d components in EditMode. A test relying on a lifecycle method firing is a **must-fix false green** (it passes by no-op). The remedy is lazy-init + `Configure` + extracted `Tick`/`Step`. This broke ~9 `Runtime*` tests once (`AGENTS.md` build history).
- **AGENTS.md is canon for the run.** The batchmode command, tmpfs `Library/` redirect, license path, and gotchas are documented and verified there. The Guardian will not improvise different flags — this VM's overlayfs/lmdb/Personal-license constraints make the "obvious" command fail.
- **Never combine `-quit` with `-runTests`; the first run is an import pass.** Both produce exit-`0`-with-no-`results.xml` false greens. The Guardian runs the command twice and checks `results.xml` is present and non-empty.
- **`green` means `green in a real editor`.** The Guardian reports any headless-authored, editor-unverified test as *pending*, never as done — exactly the distinction CLAUDE.md §3's caveat and §4's DoD turn on.
- **Severity is credibility.** A no-op-in-EditMode test, a `-quit`+`-runTests` combo, an unparsed `results.xml` called green, a missing tmpfs redirect, a bare `==` on floats are **must-fix**. Order-dependence, magic-number assertions, an unnecessary PlayMode test are **should-refactor**. Naming/spacing is **style**.
- **Hand off the moment a question crosses a boundary.** Production architecture, scene assembly, balance numbers, save format, perf, touch input, AI design, and game feel each have an owner above. The Guardian names the right sibling and stops at the boundary — and refuses to build Tier 1+ tests while Tier 0 is the focus (CLAUDE.md Rule #1).

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`.claude/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
