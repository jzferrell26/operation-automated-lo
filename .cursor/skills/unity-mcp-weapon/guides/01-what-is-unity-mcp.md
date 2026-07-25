# 01 — What Unity MCP Is (and which server DRIFT uses)

## The one-paragraph model

**Unity MCP** is the bridge that lets an AI client (Cursor / Claude Code / Windsurf / Claude
Desktop) drive the Unity Editor — instantiate prefabs, configure components, scaffold scenes, read
the console, run tests. In DRIFT it is the tool the design doc calls for to assemble the Tier 0
gray-box: *code is the solved part; scene assembly and feel are yours, and MCP is how the agent
helps with the in-Editor half* (`MCP.md` intro, `TIER0.md`). Source of truth for the official
package: Unity's "Get started with Unity MCP" docs, linked at the top of `MCP.md`.

## The relay / bridge model

Two pieces talk to each other:

1. **The Unity Bridge** — runs *inside* the Editor. It auto-starts when the Editor loads. You
   confirm it under **Edit → Project Settings → AI → Unity MCP Server → Unity Bridge** (it should
   read **Running**, green). Source: `MCP.md` Step 1.
2. **The relay binary** — a per-OS executable Unity installs to `~/.unity/relay/` on first start.
   The AI client launches this executable to talk to the Editor. Its path is home-dir- and
   OS-specific. Source: `MCP.md` Step 1 + Step 2.

The client (Cursor) spawns the relay; the relay talks to the in-Editor bridge; the bridge executes
Editor operations. So the chain is: **agent → MCP client → relay binary → Unity Bridge → Editor**.

## Which server: official vs CoplayDev

This is the single most important decision in this Weapon, and it's already decided for DRIFT:

| | Official `com.unity.ai.assistant` | CoplayDev `com.coplaydev.unity-mcp` |
|---|---|---|
| Status in DRIFT | **Primary** — committed in `Packages/manifest.json` (`2.12.0-pre.2`) | **Documented fallback** if the official bridge is flaky |
| Dependency | In-Editor; **no Python/`uv`** needed | Community server (the GDD calls it "battle-tested" with Cursor) |
| Where DRIFT says so | `MCP.md` "Notes & alternatives"; GDD §Engine | `MCP.md` "Notes & alternatives"; GDD §Engine |

`MCP.md` is explicit: *"We start with the official package because it ships in-Editor with no
Python/`uv` dependency; CoplayDev stays a fallback if the official bridge is flaky."*

### The naming trap

`CLAUDE.md` §3's Status-Map line reads *"MCP server wired (CoplayDev) + agent can drive the
editor."* That line names CoplayDev, but the *committed* repo setup (`Packages/manifest.json` +
`MCP.md` Steps 1-4) is the **official** package. Do not let the Status-Map wording push you onto the
CoplayDev path when the repo is configured for official. **Follow `MCP.md`. Name the server you
mean every time.** If the user explicitly wants CoplayDev, treat that as a deliberate switch to the
fallback and say so — it is a different install (Python/`uv` server), not the committed path.

## What "pre-release" means here

`com.unity.ai.assistant@2.12` is a *pre-release* package. Unity resolves the explicit version pin in
`Packages/manifest.json` regardless, but if Package Manager hides it in the UI, enable **Project
Settings → Package Manager → Enable Pre-release Packages**. Source: `MCP.md` Prerequisites.

## What MCP is NOT for in DRIFT

- It does **not** replace the headless EditMode test suite. The relay/bridge needs an interactive
  Editor session; the committed headless verification is `AGENTS.md` → "Run the EditMode tests."
  Source: `MCP.md` "Notes & alternatives".
- It does **not** let you skip a Unity license. The Editor still refuses to run unactivated
  (`AGENTS.md` "License activation").
- It does **not** belong on the headless VM — see `guides/08-safety-and-determinism.md`.

## Where this goes next

Once you understand the model, go to `guides/02-installing-and-wiring.md` to establish the bridge,
then `guides/03-driving-the-editor.md` for the smoke test that proves the loop works.
