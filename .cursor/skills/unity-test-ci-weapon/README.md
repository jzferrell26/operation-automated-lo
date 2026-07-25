# unity-test-ci-weapon

The procedural arsenal for `unity-test-ci-guardian`, DRIFT's Unity testing & CI specialist.

## What this weapon covers

- **Unity Test Framework** — EditMode + PlayMode, `[Test]`/`[UnityTest]`/`[SetUp]`/`[TearDown]`, the Test Runner window
- **EditMode-safe design** — CLAUDE.md Hard Rule #11: lazy-init + `Configure(...)` + extracted `Tick`/`Step`, because Unity does NOT run `Awake`/`Start`/`Update` on script-added components in EditMode
- **NUnit assertions** — float tolerance, `Assert.Less`/`Greater`, `CollectionAssert`, message discipline, asserting against `Tier0Balance` constants
- **The test asmdef** — `Drift.Tests.EditMode.asmdef` (Editor-only, `UNITY_INCLUDE_TESTS`, TestRunner + nunit references)
- **Headless batchmode runs** — the exact `AGENTS.md` command, tmpfs `Library/` redirect, `-runTests`/`-testPlatform`/`-testResults`/`-testFilter`, `results.xml`
- **The VM gotchas** — overlayfs/lmdb segfault (exit 139), Personal-license interactive activation (exit 198), the first-run import pass, the `-quit`+`-runTests` trap
- **GameCI** — `game-ci/unity-test-runner`, `UNITY_LICENSE` secret, `Library/` caching, EditMode/PlayMode matrix

## Reading order

1. Read `SKILL.md` — master index, hard rules, routing table, severity rubric, output paths
2. Read `guides/00-principles.md` — the non-negotiables, top of them: EditMode skips lifecycle methods
3. Read `AGENTS.md` (repo root) — the single source of truth for the headless run; do not invent flags
4. Open the guide matching your task (see the routing table in SKILL.md)
5. Reference `research/research-plan.md` if you need the sources behind a claim

## Key rule

**Unity does not call `Awake`/`Start`/`Update` on a component added via `AddComponent<T>()` in an EditMode test.** A test that relies on a lifecycle method firing is a *false green* — it passes silently by no-op. Every testable MonoBehaviour must lazy-init its state, accept dependencies through an explicit `Configure(...)`, and expose an extracted `Tick`/`Step` the test can drive directly. This is the reason ~9 of the `Runtime*` tests once failed (see `AGENTS.md` build history), and it is the spine of `guides/03-editmode-safe-design.md`.

## Second key rule

**`green` means `green in a real editor`.** Every `[DONE]` in CLAUDE.md §3 is *green pending a real-editor run*. This Weapon owns the route from pending to confirmed — and reports anything editor-unverified as pending, never as done.
