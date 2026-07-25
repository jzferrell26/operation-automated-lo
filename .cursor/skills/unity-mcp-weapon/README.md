# unity-mcp-weapon

The procedural arsenal for `unity-mcp-guardian`, DRIFT's agent-↔-Editor automation specialist. This
weapon encodes how to wire Unity MCP, drive the live Editor from Cursor / Claude Code, assemble the
Tier 0 gray-box, run the loop, and commit the result as an authored scene.

## What this weapon covers

- **Wiring the bridge** — confirming the Unity Bridge is Running, configuring the MCP client
  (Cursor auto-config + the manual relay template), the connection-approval handshake
- **The smoke test** — `read the console` and `create a cube`, the gate that proves the agent →
  Editor loop works
- **Driving the Editor** — MCP-driven GameObject creation, component attach + configure, prefab ops
- **Scene assembly** — building the station-hub + planet-zone gray-box that `Tier0RuntimeSpawner`
  and `Tier0GrayBoxSetup` currently fake in code
- **Running the loop** — descend → salvage → craft → fight → extract → survive, in Play mode
- **Editor scripts vs MCP** — when to use the deterministic `Drift → Setup Tier 0 Gray Box` menu
  command vs ad-hoc MCP-driven assembly
- **Committing the scene** — turning the code-built world into a committed `Tier0_GrayBox.unity` (+
  `.meta`) and updating `ARCHITECTURE.md`

## The one fact to internalize first

DRIFT's committed MCP setup is the **official `com.unity.ai.assistant@2.12`** package (in
`Packages/manifest.json`), per `MCP.md` and the GDD §Engine. **CoplayDev's `com.coplaydev.unity-mcp`
is the documented community fallback**, not the primary path. The `CLAUDE.md` §3 Status-Map line says
"CoplayDev"; the actual wiring follows `MCP.md` (official-first). Always name which server you mean.

## Reading order

1. Read `SKILL.md` — master index, routing table, hard rules, severity rubric, output paths
2. Read `guides/00-principles.md` — bridge-before-ops, the official-vs-CoplayDev posture, the
   Tier 0 scope guard, the headless-VM caveat
3. Open the guide matching your task (see the routing table in `SKILL.md`)
4. Reference `research/research-plan.md` for what is grounded in `MCP.md` vs what could not be
   verified live

## Key rule

**Establish the bridge before you drive it, and prove it with a cube.** Confirm the Unity Bridge is
Running, the client is configured, the connection is Allowed, and a "create a cube" appears in the
Hierarchy — *before* any scene assembly. Every MCP scene op fails opaquely if the relay isn't
connected; the cube is the cheapest possible proof the loop works (`MCP.md` Step 4).

## Source-of-truth files this weapon leans on

- `MCP.md` — DRIFT's MCP wiring (the key doc)
- `.cursor/mcp.json` — example client config (an example, **not** a committed source of truth)
- `TIER0.md` §"Assembling the gray-box scene" — the manual layout breakdown + the menu command
- `Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0RuntimeSpawner.cs` — the code-built world (layout
  source of truth)
- `Assets/Scripts/Drift/Editor/Tier0GrayBoxSetup.cs` — the `Drift → Setup Tier 0 Gray Box` menu
  command (deterministic authored-scene path)
- `AGENTS.md` — no committed Scene / `.meta` / full ProjectSettings; this VM cannot run the Editor
