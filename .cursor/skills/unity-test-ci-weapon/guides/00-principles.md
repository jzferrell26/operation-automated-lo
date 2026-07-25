# 00 — Principles

The non-negotiables. Read on every invocation.

## The principles

### 1. Read `AGENTS.md` first — always

`AGENTS.md` is the single source of truth for the headless test run: the exact batchmode command, the tmpfs `Library/` redirect, license activation, the `-runTests` vs `-quit` rule, `-testFilter`, and where `results.xml` lands. This VM's overlayfs + lmdb + Personal-license constraints make the "obvious" command fail; the documented path is the one that works. Do not improvise different flags. Then read `ARCHITECTURE.md §7` and CLAUDE.md Hard Rule #11 for the EditMode-safe design contract.

### 2. EditMode does not run lifecycle methods on script-added components

This is the load-bearing fact of the whole Weapon. When an EditMode test does `go.AddComponent<OxygenSystem>()`, Unity does **not** call `Awake`, `Start`, or `Update` on it. A test that assumes a meter was initialized in `Awake`, or that drain happened in `Update`, will silently no-op and pass — a *false green*. The remedy is the three patterns in `guides/03-editmode-safe-design.md`: lazy-init, explicit `Configure(...)`, and an extracted `Tick`/`Step`. This is why ~9 `Runtime*` tests once failed (`AGENTS.md` build history). Source: `ARCHITECTURE.md §7`, CLAUDE.md Rule #11.

### 3. Redirect `Library/` to tmpfs before the first editor invocation

The VM tree is a single overlayfs. Unity's asset DB (`Library/SourceAssetDB`) uses lmdb, which cannot get its mmap/file-lock on overlayfs: the editor prints `Cannot open lmdb database ... a lock` and segfaults (exit `139`). The fix (once per session) symlinks `Library/` onto tmpfs. `Library/` is ephemeral, so the symlink is safe. Source: `AGENTS.md` (PREREQUISITE section), `guides/07-the-vm-gotchas.md`.

### 4. Never pass `-quit` together with `-runTests`

`-quit` makes the editor exit on load *before* the test runner executes — you get exit `0` and **no** `results.xml`. `-runTests` quits on its own when finished. Reporting that exit-`0` as a pass is the #1 false positive in headless Unity CI. Source: `AGENTS.md` (Gotchas).

### 5. The first run on a clean checkout is an import pass

It rebuilds `Library/` and resolves `Packages/manifest.json` from scratch, then exits **without** running tests. Run the command a second time (Library now cached) to actually execute. Treating the import-pass exit as "tests passed" is a false green. Source: `AGENTS.md` (Gotchas).

### 6. License or bust — exit `198`

Unity refuses to compile/test/build without an activated license (`No valid Unity Editor license found`). Personal licenses on this VM require a one-time interactive Hub sign-in via the VM Desktop (Unity discontinued manual `.alf`→`.ulf` for Personal; a copied `.ulf` is rejected by `/etc/machine-id` binding). Pro/Plus seats activate headless via serial. Source: `AGENTS.md` (License activation).

### 7. `green` means `green in a real editor`

Every `[DONE]` in CLAUDE.md §3 is *green pending a real-editor run* — the suite was authored on a VM with no editor. A headless-authored, editor-unverified test is **pending**, not done. Report it that way until an editor has actually executed the suite (exit `0`, `results.xml` present and parsed). CLAUDE.md §4's Tier 0 DoD hinges on this distinction.

### 8. `DestroyImmediate` in `[TearDown]`, never `Destroy`

`Object.Destroy` is deferred and illegal at edit time. Every `Runtime*Tests` tracks created objects in a `List<Object>` and disposes them in `[TearDown]` with `Object.DestroyImmediate`. Production code that may run at edit time uses the play-mode-aware helper (`Tier0RuntimeSpawner.DestroyObject`). A leaked GameObject bleeds across tests. Source: `Assets/Tests/EditMode/RuntimeOxygenTests.cs:19`, `ARCHITECTURE.md §7`.

### 9. Floats compare with a tolerance

`Assert.AreEqual(expected, actual, 0.0001f)` — never a bare `==` or tolerance-less `AreEqual` on a float. `RuntimePlayerTests` compares move magnitude with `0.0001f`; balance the tolerance to the math. Source: `Assets/Tests/EditMode/RuntimePlayerTests.cs:41`.

### 10. Test the spine, not Unity

Assert the gameplay transition or economy — drain reduces oxygen, `Step` returns `EnemyState.Chase`, `ConsumeIngredients` is atomic — not engine internals like collider math or `Time.deltaTime`. Source: `guides/11-coverage-and-what-to-test.md`.

---

## First-move checklist

Before writing findings, confirm:

- [ ] `AGENTS.md` read; the run command and gotchas captured.
- [ ] `ARCHITECTURE.md §7` + CLAUDE.md Rule #11 read; the three EditMode-safe patterns in mind.
- [ ] Editor existence checked (`~/unity-setup/Editor/Unity -version`) before promising a run.
- [ ] Invocation classified per the routing table in `SKILL.md`.
- [ ] Severity rubric in mind (must-fix / should-refactor / style).
- [ ] Cross-Guardian handoff lines clear — escalate at the boundary.

## Cross-Guardian boundaries

The full table lives in `SKILL.md`. The short version: own *how it's tested and run*; hand off the rest.

| Question | Owner |
|---|---|
| Production C# architecture / system shape | `unity-csharp-guardian` (design-for-testability co-owned) |
| Editor scene / prefab assembly, MCP setup | `unity-mcp-guardian` |
| Balance numbers (yields, costs, drain rates) | `game-balance` |
| Save/load format | `save-load` |
| Mobile perf / frame budget / GC | `mobile-game-perf` |
| Touch input | `touch-input` |
| Enemy AI design | `fsm-ai` |
| Game feel / juice | `game-feel-juice` |
| CI infra beyond the Unity test step | `devops-guardian` (if present) |

## Severity rubric

| Severity | Examples | Blocks the green claim? |
|---|---|---|
| **Must-fix** | Test relies on `Awake`/`Update` firing (no-ops in EditMode); `-quit` + `-runTests`; import-pass exit reported as pass; empty/unparsed `results.xml` called green; missing tmpfs redirect; bare `==` on floats; leaked GameObject | Yes |
| **Should-refactor** | Order-dependent test; magic-number assertion (no tolerance, no `Tier0Balance` ref); PlayMode test where EditMode would do; missing assertion message; reflection field-poke where `Configure(...)` exists | No — opens follow-up |
| **Style** | Naming nit; arrange/act/assert spacing; comment density | Never |

Calling a style nit "must-fix" destroys your credibility for the next finding. Be disciplined.

## Citation discipline

Every finding has two citations:

1. **Where in the codebase** — `Assets/Scripts/Drift/Core/Survival/OxygenSystem.cs:84`.
2. **Why it's a finding** — a guide section (`guides/03-editmode-safe-design.md §2`), `AGENTS.md`, or `ARCHITECTURE.md §7`.

No citations means the finding is opinion, not enforcement.

## Scope explicitly excluded

- **Production architecture decisions.** Whether a class should exist, how the runtime asmdef is shaped → `unity-csharp-guardian`. This Weapon defines the *testability contract* and the *test* asmdef.
- **Scene assembly.** The runnable gray-box scene → `unity-mcp-guardian`. This Weapon verifies the spine headless.
- **Balance.** Whether a number is right → `game-balance`. This Weapon asserts *behavior*, referencing their constants.
- **Tier 1+ systems.** Do not write tests for durability or workstation crafting before they are rebuilt (CLAUDE.md Rule #1, §6). Flag and stop.

When in doubt, escalate.
