# 02 — EditMode vs PlayMode

UTF runs tests on two platforms. Knowing which one a test belongs on is the first design decision for any new test.

## What each platform actually does

| | **EditMode** | **PlayMode** |
|---|---|---|
| Runs in | the editor's edit loop (no game running) | a temporary play session |
| Lifecycle methods | **NOT called** on script-added components (`Awake`/`Start`/`Update` do not fire) | called normally |
| Test form | `[Test]` (synchronous) | `[UnityTest]` (`IEnumerator`, can `yield return`) |
| Frame stepping | none — there is no frame | `yield return null` advances a frame; physics ticks |
| Speed | ~instant; whole suite in seconds | slower; spins up a play session |
| Headless cost | the smoke test — runs in batchmode fast (`AGENTS.md`: later runs ~6s) | heavier; needs the runtime fully live |
| asmdef platform | `includePlatforms: ["Editor"]` | typically no platform restriction (or its own asmdef) |

## DRIFT is EditMode-first by design

The entire Tier 0 spine is tested in EditMode. `ARCHITECTURE.md §7` and `AGENTS.md` both name the EditMode suite as **the headless smoke test** — there is no scene to build for Tier 0, so the EditMode tests *are* the runnable verification.

This is only possible because the spine was written to be EditMode-safe: deterministic `Tick`/`Step` methods, explicit `Configure(...)`, lazy-init (`guides/03-editmode-safe-design.md`). An `OxygenSystem` that only drained inside `Update` could not be tested in EditMode; an `OxygenSystem` that exposes `Tick(deltaSeconds)` can.

## When PlayMode is genuinely required

Reach for `[UnityTest]` only when the thing under test *cannot* be expressed as a deterministic step:

- **Real physics resolution** — you need `FixedUpdate` and the physics engine to actually move a `CharacterController` against colliders over frames. DRIFT's movement test sidesteps this by testing `ResolveMove` (the math) directly and trusting `CharacterController.Move` (Unity's code) — see `RuntimePlayerTests`.
- **Coroutine-driven timing** — a behavior that genuinely spans multiple frames with `yield`.
- **Trigger/collision callbacks** — `OnTriggerEnter` firing from real overlap. DRIFT instead calls the underlying method directly (e.g. `LifeSupportZone.ApplyLifeSupport(go, dt)` in `RuntimeOxygenTests`) rather than relying on a physics overlap to invoke it.
- **Scene-level integration** — the full assembled gray-box loop. This needs a scene (`unity-mcp-guardian` territory) and is co-owned.

If you can extract the logic into a pure method and call it from EditMode, **do that instead** — it's faster, deterministic, and headless-friendly. PlayMode must earn its cost (`SKILL.md` Hard Rule #13).

## Decision rule

```
Can the behavior be expressed as f(inputs) → outputs, callable in one method?
  └─ yes → EditMode [Test], drive the method directly      ← DRIFT default
  └─ no, it needs frames/physics/coroutine timing → PlayMode [UnityTest]
       └─ does it need a scene? → co-own with unity-mcp-guardian
```

## What this means for review

A PlayMode test where an EditMode test would do is a **should-refactor** finding: it's slower, flakier, and heavier in CI. Ask "what frame-dependent thing does this actually exercise?" If the answer is "nothing — I just wanted `Update` to run," the real fix is to extract a `Tick`/`Step` and move it to EditMode (`guides/03-editmode-safe-design.md`).

For PlayMode mechanics, see `guides/09-playmode-tests.md`.
