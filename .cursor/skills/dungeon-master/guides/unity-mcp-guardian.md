# Unity MCP Guardian — Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `unity-mcp-guardian`. Use this guide to decide
whether a user request belongs to this Guardian.

**Guardian:** [`agents/unity-mcp-guardian.md`](../../../../agents/unity-mcp-guardian.md)
**Weapon:** [`.claude/skills/unity-mcp-weapon/`](../../unity-mcp-weapon/)
**Trigger policy:** on-demand (not proactive)

---

## Domain

`unity-mcp-guardian` is DRIFT's authority on the **agent-↔-Editor bridge** and on turning the
code-built Tier 0 gray-box into something you can drive, play, and commit. It owns one of the two
remaining Tier 0 blockers in `CLAUDE.md` §3 — *"MCP server wired (CoplayDev) + agent can drive the
editor"* (`[NOT STARTED]`) — and the assembly half of the *"is it fun?"* play test that depends on
it (`CLAUDE.md` §4).

Its remit: confirming the Unity Bridge is Running; configuring the MCP client (Cursor / Claude
Code); the connection-approval handshake; the smoke test (`read the console`, `create a cube`); and
then the real work — using MCP tools (or the committed editor menu commands) to instantiate
GameObjects, attach and configure components, build prefabs, lay out the station-hub + planet-zone
gray-box that `Tier0RuntimeSpawner` and `Tier0GrayBoxSetup` currently build from code, run the
descend→salvage→craft→fight→extract→survive loop in Play mode, and **save the result as a committed
`.unity` scene** so the build stops being regenerated from code on every open. The opinionation:
*official `com.unity.ai.assistant` package first, CoplayDev fallback; bridge before ops; the menu
command is deterministic, MCP is flexible; stay in Tier 0 scope.*

## Trigger phrases

Route to `unity-mcp-guardian` when the user says any of:

- "Wire up Unity MCP" / "set up the MCP server" / "connect Cursor to the Editor"
- "The MCP server isn't connecting" / "the bridge shows Stopped" / "Unity tools aren't listed"
- "Drive the Editor from the agent" / "can the agent control Unity"
- "Create a cube to smoke-test MCP" / "run the MCP smoke test"
- "Assemble the gray-box scene" / "build the station hub in the Editor" / "lay out the Tier 0 scene"
- "Turn the spawner into a real scene" / "commit the Tier 0 scene" / "stop spawning the world from code"
- "Run `Drift → Setup Tier 0 Gray Box`" / "menu-command bring-up"
- Anything touching the `[NOT STARTED]` Status-Map item *"MCP server wired + agent can drive the
  editor"*, or the gray-box assembly that `CLAUDE.md` §4 says is blocked on MCP

Or when the request implicitly involves wiring the Editor bridge, driving the Editor programmatically,
or assembling/committing the Tier 0 gray-box scene.

## Do NOT route when

- The user wants the **gameplay or editor C# itself** — component logic, `Configure(...)`
  signatures, `Tier0GrayBoxSetup` / `Tier0RuntimeSpawner` source changes, EditMode-safety refactors.
  That is `unity-csharp-guardian`. (This Guardian *drives and calls* that code; it doesn't author it.)
- The user wants to **run the EditMode suite, set up CI, or do batchmode activation** — that is
  `unity-test-ci-guardian`. (This Guardian confirms the loop runs in an interactive Play session; the
  headless green-check is theirs.)
- The user wants to **tune balance numbers** — node amounts, costs, meter rates in `Tier0Balance` —
  that is `game-balance-guardian`. (This Guardian places nodes; it doesn't tune them.)
- The user wants the **save / load format** — that is `save-load-guardian`. (Deferred in Tier 0.)
- The user wants **mobile performance or build targets** — that is `mobile-game-perf-guardian`.
- The user wants **touch controls / input mapping** — that is `touch-input-guardian`. (This Guardian
  wires the Input System package into the scene; the control scheme is theirs.)
- The user wants **enemy FSM design or behavior tuning** — that is `fsm-ai-guardian`. (This Guardian
  places the enemy and wires its target; the behavior is theirs.)
- The user wants **game feel / juice / screenshake / VFX** — that is `game-feel-juice-guardian`.
  (The *fun* call is the user's; polish is this sibling's.)

If the request straddles boundaries (e.g., "assemble the gray-box and tune it until it's fun"),
prefer routing to `unity-mcp-guardian` first to wire + assemble + run the loop *clean*, then chain to
`game-balance-guardian` / `game-feel-juice-guardian` for the tuning and feel.

## Inputs the Guardian needs

Before invoking, ensure the user has provided (or you can infer):

- Whether they're on a machine with an **interactive Unity Editor** or the headless VM (`AGENTS.md`
  — the bridge needs an interactive Editor; the VM cannot run it).
- Which MCP client (Cursor is the repo default) and whether the bridge has ever been wired before.
- Access to `MCP.md`, `.cursor/mcp.json`, `TIER0.md`, `AGENTS.md`, and the two code files the Guardian
  drives (`Tier0RuntimeSpawner.cs`, `Tier0GrayBoxSetup.cs`).
- Optional: specific focus (wire the bridge, smoke-test, assemble the scene, run the loop, commit the
  scene).

If the request needs a live Editor and the user is on the headless VM, say so up front — the Guardian
can document/plan but cannot wire or Play there, and will flag those steps *pending a real-Editor run*.

## Outputs the Guardian produces

- **Setup / wiring / assembly / troubleshooting notes** → `library/qa/unity-mcp/<date>-<topic>.md`
  (e.g., `2026-06-22-mcp-wiring-and-graybox-bringup.md`).
- **Scene-structure documentation** → updates to `ARCHITECTURE.md`'s scene-structure section, in the
  same commit as a scene change (`CLAUDE.md` Hard Rule #8).
- **Status updates** → `CLAUDE.md` §3 (the MCP / gray-box Status-Map lines).
- **A committed authored scene** → `Assets/Scenes/Tier0_GrayBox.unity` (+ `.meta`) once the loop runs.

Every recommendation cites a DRIFT file (`MCP.md`, `.cursor/mcp.json`, the spawner/setup source, the
GDD) — and where `MCP.md` is thin, says "not specified in MCP.md" rather than inventing Unity MCP
tool names or CoplayDev API surface.

## Multi-Guardian sequences this Guardian participates in

- **Unblock Tier 0 bring-up** — `unity-mcp-guardian` wires the bridge + assembles + runs the loop
  clean; `unity-test-ci-guardian` confirms the EditMode suite is green in a real Editor; the user
  makes the "is it fun?" call (`CLAUDE.md` §4).
- **Commit the gray-box scene** — `unity-mcp-guardian` produces the committed `Tier0_GrayBox.unity`;
  `unity-csharp-guardian` owns any source changes to the setup/spawner; `unity-test-ci-guardian`
  re-verifies green.
- **Assemble → tune → polish** — `unity-mcp-guardian` assembles + runs clean; `game-balance-guardian`
  tunes the numbers; `game-feel-juice-guardian` adds feel; `fsm-ai-guardian` refines the enemy.
- **Touch-control bring-up in the scene** — `unity-mcp-guardian` wires the Input System package into
  the scene objects; `touch-input-guardian` designs the control scheme.

## Critical directives the orchestrator should respect

- **Bridge before ops, always.** The Guardian will not assemble a scene until the bridge is Running,
  the client is configured, the connection is Allowed, and "create a cube" appears in the Hierarchy.
- **Official package primary; CoplayDev fallback.** DRIFT's committed setup is the official
  `com.unity.ai.assistant@2.12` (`Packages/manifest.json` + `MCP.md`); the Status-Map line names
  "CoplayDev" but the repo follows `MCP.md`. The Guardian names which server it means and never silently
  swaps.
- **Never commits a relay path.** The relay path in `.cursor/mcp.json` is home-dir- and OS-specific;
  the Guardian uses Unity auto-config or the per-machine manual template, and writes only under
  `agents/` and `.claude/` — never under `.cursor/`.
- **The menu command is deterministic; MCP is flexible.** The Guardian won't hand-rebuild via MCP what
  `Drift → Setup Tier 0 Gray Box` already builds idempotently; it uses MCP to inspect/tweak/verify.
- **Stays in Tier 0 scope.** Only the `TIER0.md` gray-box — no station builder, enemy variety, crew,
  or save UI (`CLAUDE.md` Hard Rule #1). MCP makes over-building easy; the Guardian flags scope jumps.
- **The headless VM can't run the Editor.** The Guardian flags any wiring/assembly/Play step it could
  not execute as *pending a real-Editor run* (`AGENTS.md`, `CLAUDE.md` §3) rather than claiming green.
- **Updates the docs it touches.** Structure → `ARCHITECTURE.md`; status → `CLAUDE.md` §3; same
  commit (`CLAUDE.md` Hard Rule #8).

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`ai-tools/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
