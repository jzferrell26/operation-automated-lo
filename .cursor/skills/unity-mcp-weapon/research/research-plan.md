# Research Plan — unity-mcp-weapon

This Weapon is grounded **primarily in DRIFT's own repo files** — `MCP.md`, `.cursor/mcp.json`,
`TIER0.md`, `AGENTS.md`, the GDD, and the two code files it drives (`Tier0RuntimeSpawner.cs`,
`Tier0GrayBoxSetup.cs`). Unity MCP is a young, fast-moving surface; rather than risk fabricating API
details, **every load-bearing MCP claim cites `MCP.md` or a repo file.** This plan records the
topics, the sources used, and — critically — an explicit list of things that could **not** be
verified live and are therefore stated only as far as `MCP.md` goes.

## Primary sources (in-repo, authoritative for DRIFT)

| Source | What it establishes |
|---|---|
| `MCP.md` | The key doc. Official `com.unity.ai.assistant@2.12` as primary; 4-step wiring (bridge, configure client, approve, smoke test); per-OS relay paths; the no-commit-`.cursor/mcp.json` rule; example Unity tool names; CoplayDev as fallback; connection limits; headless caveat. |
| `.cursor/mcp.json` | The committed *example* client config (one machine's Windows relay path + an unrelated n8n HTTP server). Demonstrates the no-commit rule in the negative. |
| `TIER0.md` | The gray-box loop definition, the manual assembly breakdown, the controls, the menu command, the Tier 0 scope guard. |
| `AGENTS.md` | No committed Scene / `.meta` / full ProjectSettings; `.meta` should be committed once generated; the headless VM cannot run an interactive Editor; Personal-license interactive sign-in; EditMode suite is the headless verification. |
| `space-survival-design-doc.md` (GDD) | §Engine: Unity 6 + MCP (official requires Unity 6; CoplayDev community route with Cursor). §recommended-path Weeks 1-2: "create a cube" smoke test milestone. |
| `Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0RuntimeSpawner.cs` | The canonical gray-box layout: every object's position, components, tint, and `Configure(...)` wiring. Layout source of truth. |
| `Assets/Scripts/Drift/Editor/Tier0GrayBoxSetup.cs` | The deterministic menu commands (`Drift → Setup Tier 0 Gray Box`, `Create Bootstrap Scene (quick)`); the idempotent prefab/scene authoring patterns. |
| `CLAUDE.md` | Hard Rules (tier discipline, docs-you-touch, EditMode-test discipline), Status-Map MCP item `[NOT STARTED]`, the current objective. |
| `ARCHITECTURE.md` | §7 EditMode-safe contract (lazy-init + Configure + extracted Tick/Step) referenced by the wiring style. |

## Topics covered, mapped to guides

1. **What Unity MCP is / which server** (`01`) — relay/bridge model, official vs CoplayDev. Source:
   `MCP.md`, GDD §Engine.
2. **Installing & wiring** (`02`) — the 4 MCP.md steps, per-OS relay paths, auto vs manual config,
   the no-commit rule. Source: `MCP.md`, `.cursor/mcp.json`.
3. **Driving the Editor / smoke test** (`03`) — console read + "create a cube"; example tool names.
   Source: `MCP.md` Step 4, GDD §14/Weeks 1-2.
4. **Scene assembly** (`04`) — canonical layout. Source: `Tier0RuntimeSpawner.cs`, `Tier0GrayBoxSetup.cs`.
5. **GameObject/prefab ops** (`05`) — primitives, collider discipline, Configure vs SerializedObject,
   the idempotent prefab pattern. Source: both code files, `CLAUDE.md` Hard Rule #11.
6. **Running the loop** (`06`) — loop beats + controls. Source: `TIER0.md`, spawner debug log.
7. **Editor scripts vs MCP** (`07`) — the three paths + decision rule. Source: both code files,
   `MCP.md`, `TIER0.md`.
8. **Safety & determinism** (`08`) — idempotency, no-commit, scope guard, headless caveat. Source:
   `MCP.md`, `AGENTS.md`, `CLAUDE.md`.
9. **Troubleshooting** (`09`) — bridge/connection/package/license symptoms. Source: `MCP.md`, `AGENTS.md`.

## Explicitly NOT verified live (flagged, not fabricated)

Unity MCP / CoplayDev specifics this Weapon deliberately does **not** assert beyond what `MCP.md`
states. Where a guide needs one of these, it says "not specified in MCP.md" and points to the
official package docs linked in `MCP.md`.

- **The full Unity MCP tool catalog.** `MCP.md` cites only `Unity_ManageScene`,
  `Unity_ManageGameObject`, `Unity_ReadConsole` as examples. The complete tool set, exact parameter
  schemas, and return shapes are **not** enumerated in the repo and are **not invented here**
  (`guides/03` says so explicitly). Verify against the client's listed tools in a live session.
- **CoplayDev `com.coplaydev.unity-mcp` install/run steps.** Named as the fallback only; its Python/
  `uv` setup, server commands, and tool surface are **not** documented in DRIFT and **not invented**.
  Defer to CoplayDev's own docs if the fallback is ever taken.
- **The official package's exact menu/UI labels** beyond what `MCP.md` names (Project Settings → AI →
  Unity MCP Server → Unity Bridge / Integrations / Pending Connections). Used as `MCP.md` states; not
  embellished.
- **Relay binary filenames** are taken verbatim from `MCP.md`'s table; not independently confirmed
  against a live `~/.unity/relay/` here (this VM has no Editor — `AGENTS.md`).
- **Live verification of the wiring/Play steps.** This Weapon was authored on a headless VM that
  cannot run the Editor (`AGENTS.md`). Every wiring/assembly/Play instruction is therefore *pending a
  real-Editor run*, exactly as the guides instruct the Guardian to flag.

## Secondary source (for the curious; not relied on for claims)

- Unity's official "Get started with Unity MCP" (`com.unity.ai.assistant@2.12`), linked at the top
  of `MCP.md`. Treated as the upstream authority for anything `MCP.md` defers to. No URLs are
  invented; the only external link used is the one `MCP.md` already provides.

## Confidence note

High confidence on everything sourced from the repo (it's read directly). Lower confidence on the
broader Unity MCP API surface — which is why this Weapon's discipline is "drive via the tools the
client actually lists, prefer the committed menu command, and flag anything un-runnable." If the
official package's API is later documented in-repo, revisit `guides/03` and `guides/05` to name real
tools and parameters.
