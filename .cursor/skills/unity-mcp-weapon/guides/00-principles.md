# 00 — Principles

The non-negotiables for driving the Unity Editor from the agent in DRIFT. Read on every invocation.

## The eight principles

### 1. Orient against the repo, not assumptions

Per `CLAUDE.md` §0, confirm you're in the PROJECT-DRIFT root and **re-verify the Status-Map MCP
line** — *"MCP server wired (CoplayDev) + agent can drive the editor"* is tagged `[NOT STARTED]`,
and the gray-box assembly + "is it fun?" play test depend on it (`CLAUDE.md` §4). Read `MCP.md`,
`.cursor/mcp.json`, `TIER0.md`, and `AGENTS.md` before driving anything. Source: `CLAUDE.md` §0/§3/§4.

### 2. Bridge before ops — always

No scene op until the bridge is **Running**, the client is configured, the connection is **Allowed**,
and the "create a cube" smoke test is green. Every MCP scene op fails opaquely if the relay isn't
connected. The cube appearing in the Hierarchy is the gate. Source: `MCP.md` Steps 1-4,
`guides/02-installing-and-wiring.md`, `guides/03-driving-the-editor.md`.

### 3. Official package is primary; CoplayDev is the documented fallback

`MCP.md` and the GDD §Engine pin the **official `com.unity.ai.assistant@2.12`** (committed in
`Packages/manifest.json`) as DRIFT's primary path — it ships in-Editor with no Python/`uv`
dependency. **CoplayDev's `com.coplaydev.unity-mcp` is the community fallback** if the official
bridge is flaky. The `CLAUDE.md` §3 line says "CoplayDev"; the *committed* setup is official. Follow
`MCP.md` and **name the server you mean** — never silently swap. Source: `MCP.md` "Notes &
alternatives", GDD §Engine.

### 4. The menu command is deterministic; MCP is flexible

`Drift → Setup Tier 0 Gray Box` (`Tier0GrayBoxSetup.SetupTier0GrayBox`) authors data assets,
prefabs, and a saved scene the same way every time. Reach for MCP when you need to inspect, tweak,
add ad-hoc objects, or verify — not to hand-rebuild what an idempotent editor script already builds.
Source: `Tier0GrayBoxSetup.cs`, `guides/07-editor-scripts-vs-mcp.md`.

### 5. Match the spawner's wiring exactly

Component sets, positions, colors, and `Configure(...)` calls live in `Tier0RuntimeSpawner.Build()`
and `Tier0GrayBoxSetup`. When assembling via MCP, mirror them — don't invent a different layout. The
gray-box is a scope guard; drifting the layout invalidates the "is it fun?" comparison. Source:
`Tier0RuntimeSpawner.cs`, `guides/04-scene-assembly.md`.

### 6. Stay in Tier 0 scope

Assemble only the gray-box `TIER0.md` describes: station deck + O2/life-support, two shuttle pads,
3 resource nodes + 3 tool caches, one mutation, the loop controller, the HUD. No station builder,
enemy variety, crew, equipment tiers, or save UI — those are Tier 1+. MCP makes over-building easy;
the scope guard is the point. Source: `CLAUDE.md` Hard Rule #1, `TIER0.md` §"Not in Tier 0".

### 7. The headless VM cannot run the Editor

Per `AGENTS.md`, this VM has no interactive Editor; the relay/bridge needs one. The committed
headless verification is the EditMode suite, not MCP. **Flag any wiring/assembly step as *pending a
real-Editor run* when you can't execute it** — claiming green on an un-runnable step mirrors the
exact trap `CLAUDE.md` §3 warns about (every `[DONE]` is "pending a real-editor run"). Source:
`AGENTS.md`, `CLAUDE.md` §3.

### 8. Determinism over cleverness; commit the result

Idempotent, re-runnable assembly (load-or-create, ensure-component) beats one-shot scripts that fail
half-applied. Once the loop runs, **save the scene + its `.meta` files and commit** — the Tier 0
endgame is a committed `Tier0_GrayBox.unity`, not a perpetually code-spawned world. Update
`ARCHITECTURE.md` and `CLAUDE.md` §3 in the same commit. Source: `guides/08-safety-and-determinism.md`,
`AGENTS.md` (".meta should be committed"), `CLAUDE.md` Hard Rule #8.

---

## First-move checklist

Before driving the Editor, confirm:

- [ ] `MCP.md`, `.cursor/mcp.json`, `TIER0.md`, `AGENTS.md` read; the MCP Status-Map line re-verified.
- [ ] Which MCP server is in play (official vs CoplayDev) named explicitly.
- [ ] Invocation classified per the routing table in `SKILL.md`.
- [ ] Severity rubric in mind (blocker / should-fix / note).
- [ ] If you can't run a live Editor here, you're flagging steps as *pending a real-Editor run*.

## Cross-Guardian boundaries

The full table lives in `SKILL.md`. Short version: drive the Editor; don't author the code, tune the
balance, or make the fun call.

| Question | Owner |
|---|---|
| Gameplay / editor C# (component logic, `Configure` signatures, setup-script source) | `unity-csharp-guardian` |
| EditMode suite / CI / batchmode activation | `unity-test-ci-guardian` |
| Balance numbers (`Tier0Balance`) | `game-balance-guardian` |
| Save / load format | `save-load-guardian` |
| Mobile perf / build targets | `mobile-game-perf-guardian` |
| Touch controls / input mapping | `touch-input-guardian` |
| Enemy FSM design / tuning | `fsm-ai-guardian` |
| Game feel / juice / VFX | `game-feel-juice-guardian` |

## Severity rubric

| Severity | Examples | Stops the session? |
|---|---|---|
| **Blocker** | Bridge not Running; connection not Allowed; smoke test fails; relay path committed to repo; wrong MCP server for the repo; assembly contradicting the spawner layout; Tier 1 system in the gray-box | Yes |
| **Should-fix** | Non-idempotent assembly; missing `.meta` commit; undocumented scene structure; "wired/green" claimed but not run in a live Editor and not flagged pending | No — opens follow-up |
| **Note** | Cosmetic tint diff; extra debug object; naming nit | Never |

Calling a cosmetic tint nit a "blocker" destroys your credibility for the next finding. Be disciplined.

## Citation discipline

Every claim cites either a DRIFT file (`MCP.md`, `.cursor/mcp.json`, `Tier0RuntimeSpawner.cs`,
`Tier0GrayBoxSetup.cs`, the GDD) or — where DRIFT files are thin — Unity's official package docs
linked in `MCP.md`. **Do not invent Unity MCP tool names or CoplayDev API surface.** Where `MCP.md`
is silent, say "not specified in MCP.md."
