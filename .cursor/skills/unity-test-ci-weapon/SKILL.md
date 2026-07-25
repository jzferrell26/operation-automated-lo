---
name: unity-test-ci-weapon
description: Tests and CI-gates the DRIFT Unity 6 / C# gameplay spine — Unity Test Framework (EditMode + PlayMode), the Drift.Tests.EditMode asmdef, NUnit assertion discipline, the EditMode-safe design contract (lazy-init + Configure(...) + extracted Tick/Step, because Unity does NOT run Awake/Start/Update on script-added components in EditMode), the AGENTS.md headless batchmode run (tmpfs Library redirect, license activation, -runTests vs -quit, testFilter, results.xml), the VM gotchas, and GameCI (game-ci/unity-test-runner). Use when the user says "write an EditMode test", "my Runtime* test fails", "make this MonoBehaviour testable", "run the suite headless", "set up GameCI", "lmdb segfault", "exit code 198", "empty results.xml", "add a PlayMode test", or when unity-test-ci-guardian is invoked. Do NOT use for production C# architecture (unity-csharp-guardian), MCP scene assembly (unity-mcp-guardian), balance (game-balance), save/load (save-load), perf (mobile-game-perf), touch input (touch-input), AI design (fsm-ai), or game feel (game-feel-juice).
license: MIT
---

# unity-test-ci-weapon

You are equipping **unity-test-ci-guardian** — DRIFT's authority on how the gameplay spine is *tested* and how the green check is *earned*. This skill encodes the Unity Test Framework discipline, the EditMode-safe design contract (CLAUDE.md Hard Rule #11), the NUnit assertion patterns the project already uses, the headless batchmode run procedure from `AGENTS.md`, the VM gotchas that make that run succeed, and the GameCI wiring that makes the suite a merge gate — into opinionated, cite-everything guides.

**The load-bearing fact:** Unity does **not** call `Awake`/`Start`/`Update` on script-added components in EditMode. Everything in this Weapon orbits that constraint. A test that relies on a lifecycle method firing is a false green.

**The second load-bearing fact:** every `[DONE]` in CLAUDE.md §3 is *green pending a real-editor run*. This Weapon owns the route from pending to confirmed.

---

## First move on every invocation

1. **Read `AGENTS.md`.** It is the single source of truth for the headless run — the batchmode command, the tmpfs `Library/` redirect, license activation, the `-runTests` vs `-quit` rule, `-testFilter`, and `results.xml`. Do not invent alternative flags.
2. **Read `ARCHITECTURE.md §7`** (Testing & EditMode conventions) and **CLAUDE.md Hard Rule #11.** They define the three EditMode-safe patterns and name which components use them.
3. **Confirm the editor exists** before promising a run: `~/unity-setup/Editor/Unity -version`. A cold VM can boot without it (`AGENTS.md`).
4. **Classify the invocation** per the routing table. Read `guides/00-principles.md` before writing any finding — severity rubric and handoff rules live there.

---

## Routing table

| Invocation | Primary guide(s) | Output |
|---|---|---|
| Write / review an EditMode test | `01-unity-test-framework.md`, `04-nunit-assertion-patterns.md`, `examples/01-editmode-test-for-a-survival-meter.md` | New/edited `.cs` under `Assets/Tests/EditMode/` |
| Make a MonoBehaviour testable (Rule #11) | `03-editmode-safe-design.md`, `examples/02-refactor-update-monobehaviour-to-configure-tick.md` | Refactor proposal + Configure/Tick remedy (architecture decision → `unity-csharp-guardian`) |
| Run the suite headless | `06-headless-batchmode-runs.md`, `examples/03-headless-batchmode-run-walkthrough.md` | Run report: `library/qa/unity-tests/<date>-<topic>.md` |
| Diagnose a VM failure (198 / 139 / empty xml) | `07-the-vm-gotchas.md` | Root cause + the documented fix |
| EditMode vs PlayMode decision | `02-editmode-vs-playmode.md` | Recommendation + rationale |
| Add a PlayMode test | `09-playmode-tests.md` | `[UnityTest]` `.cs` + PlayMode asmdef (scene needs → `unity-mcp-guardian`) |
| Test asmdef question | `05-test-asmdefs.md` | asmdef diff |
| Fixtures / test doubles | `10-test-doubles-and-fixtures.md` | Fixture pattern |
| Coverage / what to test | `11-coverage-and-what-to-test.md` | Coverage map |
| Set up / audit CI | `08-ci-with-gameci.md`, `examples/04-gameci-workflow.md` | `.github/workflows/*.yml` |

---

## Hard rules (never substitute without justification)

These are the substantive form of `unity-test-ci-guardian`'s critical directives. Each links to the guide where the full reasoning lives.

| # | Rule | Guide |
|---|---|---|
| 1 | **EditMode does not run `Awake`/`Start`/`Update` on script-added components.** New testable MonoBehaviours use lazy-init + `Configure(...)` + an extracted `Tick`/`Step`. A test relying on a lifecycle method is a **must-fix** false green. | `03-editmode-safe-design.md` |
| 2 | **AGENTS.md is canon for the run.** Use its exact command, tmpfs redirect, and activation path. Do not improvise flags. | `06-headless-batchmode-runs.md` |
| 3 | **Redirect `Library/` to tmpfs before the first editor call, every session.** Overlayfs breaks lmdb → segfault (exit `139`). | `07-the-vm-gotchas.md` |
| 4 | **Never pass `-quit` with `-runTests`.** It exits before the runner → exit `0`, no `results.xml`. | `07-the-vm-gotchas.md` |
| 5 | **The first run is an import pass.** Run the command twice; only the second run executes tests. | `07-the-vm-gotchas.md` |
| 6 | **License or bust (exit `198`).** Personal = one-time interactive Hub sign-in via VM Desktop; Pro/Plus = headless serial. | `07-the-vm-gotchas.md` |
| 7 | **`green` means `green in a real editor`.** Headless-authored, editor-unverified = *pending*, report it as such. | `00-principles.md` |
| 8 | **`DestroyImmediate` in `[TearDown]`, never `Destroy`.** Track created objects; clean them up every test. | `10-test-doubles-and-fixtures.md` |
| 9 | **Floats compare with a tolerance.** `Assert.AreEqual(expected, actual, 0.0001f)` — never bare `==` on floats. | `04-nunit-assertion-patterns.md` |
| 10 | **No order-dependent tests.** Each test arranges its own world; `[TearDown]` resets it. | `01-unity-test-framework.md` |
| 11 | **Test the spine, not Unity.** Assert transitions/economy (`Tick` drains, `Step` returns `Chase`), not engine internals. | `11-coverage-and-what-to-test.md` |
| 12 | **Tests reference `Tier0Balance` constants, not magic literals.** Balance changes must not silently break a hardcoded test value. | `04-nunit-assertion-patterns.md` |
| 13 | **EditMode is the headless smoke test; PlayMode earns its cost.** Only reach for `[UnityTest]` when frame-stepping or physics is genuinely required. | `02-editmode-vs-playmode.md` |
| 14 | **CI runs the same command CI documents.** GameCI's EditMode step mirrors the AGENTS.md run; `UNITY_LICENSE` via secret. | `08-ci-with-gameci.md` |

---

## Severity rubric

Every finding is classified:

- **Must-fix** — a test that no-ops in EditMode (relies on `Awake`/`Update`); `-quit` combined with `-runTests`; treating the import-pass exit as a pass; an unparsed/empty `results.xml` reported as green; missing tmpfs redirect; a float compared with bare `==`; a leaked GameObject (no `DestroyImmediate`). Blocks the green claim.
- **Should-refactor** — order-dependent test; magic-number assertion without tolerance or `Tier0Balance` reference; a PlayMode test where EditMode would do; missing assertion message on a non-obvious check; reflection field-poke where a `Configure(...)` exists. Opens a follow-up.
- **Style** — naming, arrange/act/assert spacing, comment density. Never block on style alone.

Severity is the finding's credibility. Calling a style nit "must-fix" destroys trust.

---

## Cross-Guardian handoffs

| Concern | Owner | unity-test-ci-weapon's role |
|---|---|---|
| Production C# architecture / system shape / runtime asmdef | `unity-csharp-guardian` | Define the Configure/Tick *contract*; flag untestable shapes (co-own design-for-testability) |
| Editor scene / prefab assembly, MCP setup, gray-box scene | `unity-mcp-guardian` | Verify the spine via EditMode; request scenes for PlayMode tests |
| Balance numbers (yields, costs, drain rates) | `game-balance` | Assert *behavior*, reference their constants; never assert *whether the number is right* |
| Save/load format | `save-load` | Write round-trip serialization tests once the format exists |
| Mobile performance / frame budget / GC | `mobile-game-perf` | Co-own PlayMode performance tests; perf budget is theirs |
| Touch input | `touch-input` | Test `ResolveMove` from a `Vector2`; vector production on device is theirs |
| Enemy AI design | `fsm-ai` | Test FSM transitions (`Step` → `EnemyState`); state-machine design is theirs |
| Game feel / juice | `game-feel-juice` | Out of scope (not unit-testable) |
| CI infra beyond the Unity test step (Docker host, secrets, runners) | `devops-guardian` (if present) | Own the `unity-test-runner` step + `UNITY_LICENSE` plumbing |

---

## Output paths

Reports land in the **host repo's `library/` tree**, never inside this Weapon.

- **Test-run reports / suite audits** → `library/qa/unity-tests/<date>-<topic>.md` (e.g., `2026-06-22-editmode-suite-run.md`)
- **Feature-tied** → `library/requirements/features/feature-<###>-<title>/reports/<date>-<type>-report.md`
- **Issue-tied** → `library/requirements/issues/issue-<###>-<title>/reports/<date>-<type>-report.md`

New tests are written to `Assets/Tests/EditMode/<Name>Tests.cs`; CI workflows to `.github/workflows/`.

---

## Guides

Numbered so order is obvious. Read `00-principles.md` on every invocation; then the topic guide(s) the invocation demands.

- `guides/00-principles.md` — AGENTS.md-is-canon, the EditMode lifecycle fact, severity rubric, "green means real-editor green", citation discipline, cross-Guardian boundaries.
- `guides/01-unity-test-framework.md` — UTF + NUnit basics, `[Test]`/`[TestCase]`/`[SetUp]`/`[TearDown]`, the Test Runner window, how DRIFT's `Runtime*Tests` are shaped.
- `guides/02-editmode-vs-playmode.md` — what each platform runs, why EditMode is the headless smoke test, when PlayMode is genuinely required.
- `guides/03-editmode-safe-design.md` — Hard Rule #11 in depth; the three patterns with before/after from the real Drift spine.
- `guides/04-nunit-assertion-patterns.md` — float tolerance, `Assert.Less`/`Greater`, `CollectionAssert`, message strings, `Tier0Balance`-referenced assertions.
- `guides/05-test-asmdefs.md` — `Drift.Tests.EditMode.asmdef` field-by-field; the PlayMode asmdef variant.
- `guides/06-headless-batchmode-runs.md` — the exact AGENTS.md command, tmpfs redirect, `-testFilter`, the two-pass import behavior, reading `results.xml`.
- `guides/07-the-vm-gotchas.md` — overlayfs/lmdb tmpfs fix (139), Personal-license activation (198), import-pass second-run, `-quit`+`-runTests` trap.
- `guides/08-ci-with-gameci.md` — `game-ci/unity-test-runner`, `UNITY_LICENSE`, caching `Library/`, the EditMode/PlayMode matrix, artifact upload.
- `guides/09-playmode-tests.md` — `[UnityTest]` + `IEnumerator` + `yield return`, when frame-stepping earns its cost, the PlayMode asmdef.
- `guides/10-test-doubles-and-fixtures.md` — code-built `ScriptableObject` content, the `Track`/`[TearDown]` pattern, reflection injection, Configure-based DI.
- `guides/11-coverage-and-what-to-test.md` — test the spine's transitions and economy, not Unity; the Tier 0 coverage map; what's intentionally untested.

## Templates

`templates/editmode-test.cs` (the canonical DRIFT EditMode skeleton), `templates/drift-tests-editmode.asmdef.json` (the test assembly definition), `templates/gameci-unity-test.yml` (the GameCI workflow), `templates/run-editmode-tests.sh` (the AGENTS.md batchmode command as a runnable script).

## Examples

`examples/01-editmode-test-for-a-survival-meter.md`, `examples/02-refactor-update-monobehaviour-to-configure-tick.md`, `examples/03-headless-batchmode-run-walkthrough.md`, `examples/04-gameci-workflow.md`.

## Research

`research/research-plan.md` — topics and sources. The load-bearing internal sources are `AGENTS.md`, `ARCHITECTURE.md §7`, and the real `Runtime*Tests` under `Assets/Tests/EditMode/`. External claims (UTF API, NUnit, GameCI) are knowledge-based; no fabricated URLs.

---

## Output conventions

- **All file paths in findings are absolute** when referencing project files (`Assets/Scripts/Drift/Core/Survival/OxygenSystem.cs:84`). Relative when referencing guides in this Weapon.
- **Every claim is sourced.** Either a guide section, `AGENTS.md`, `ARCHITECTURE.md §7`, or an external reference.
- **Do not invent the run command.** Read it from `AGENTS.md`.
- **Never report green you did not earn.** Headless-authored, editor-unverified = pending.

## When in doubt

- A test passes headless but you suspect it no-ops? Check whether it depends on `Awake`/`Update` (must-fix per Rule #1) — see `03-editmode-safe-design.md`.
- Editor missing on the VM? Surface the cold-start recovery from `AGENTS.md`; do not silently fail.
- Question crosses into production architecture, scene assembly, balance, or AI design? Hand off at the boundary per the table above.
