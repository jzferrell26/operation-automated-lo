# 09 — Troubleshooting

Symptom → cause → fix, all grounded in `MCP.md` and `AGENTS.md`. Re-run the smoke test
(`guides/03-driving-the-editor.md`) after any fix to localize where the chain broke: a failing "create
a cube" means the problem is the bridge/connection, not your scene op.

## The bridge shows Stopped

- **Where:** Edit → Project Settings → AI → Unity MCP Server → Unity Bridge.
- **Fix:** click **Start**. It normally auto-starts when the Editor loads; if it didn't, start it
  manually. Source: `MCP.md` Step 1.

## The client doesn't list any Unity tools

- **Cause:** the relay isn't being launched, or the client config points at the wrong binary.
- **Fix:** re-run Unity's auto-config (**Integrations → Cursor → Configure**), which writes the
  correct relay path into the **global** `~/.cursor/mcp.json`. If you hand-edited a config, verify
  the `command` is the **absolute** per-OS relay path (the `~` may not expand) and that `args`
  includes `--mcp`. Source: `MCP.md` Step 2.
- **Do not** rely on the committed `.cursor/mcp.json` path — it's one machine's Windows home path
  (`C:\Users\jzfer\...`), wrong elsewhere. See `guides/02`.

## "Create a cube" never appears in the Hierarchy

- **Cause chain:** bridge not Running → connection not Allowed → wrong relay → no active scene.
- **Fix, in order:** (1) bridge Running? (2) **Project Settings → AI → Unity MCP Server → Pending
  Connections** — is the client there? Click **Allow** (`MCP.md` Step 3). (3) Is the relay path
  correct? (4) Is there an active scene to add to? Source: `MCP.md` Steps 1-4.

## The pending connection never appears

- **Cause:** the client never actually launched the relay (config/path problem), so nothing reached
  the bridge to request approval.
- **Fix:** confirm the client config (auto-config preferred), confirm `--mcp` is in `args`, restart
  the client. If multiple Unity projects are open, add `--project-path <ABSOLUTE_PATH_TO_THIS_REPO>`
  (or set `UNITY_PROJECT_PATH`) so the relay targets *this* Editor. Source: `MCP.md` Step 2.

## The `com.unity.ai.assistant` package is hidden in Package Manager

- **Cause:** it's a *pre-release* package (`2.12.0-pre.2`) and pre-releases are hidden by default.
- **Fix:** enable **Project Settings → Package Manager → Enable Pre-release Packages**. The explicit
  version pin in `Packages/manifest.json` resolves regardless, so the bridge still works even when
  the UI hides it. Source: `MCP.md` Prerequisites.

## Connection limits / "too many connections"

- **Cause:** Personal/Pro licenses gate how many simultaneous MCP connections are allowed.
- **Fix:** one Cursor connection is fine for solo dev; close extra clients. Source: `MCP.md` "Notes
  & alternatives".

## The official bridge is flaky

- **Fallback:** the documented community alternative is **CoplayDev's `com.coplaydev.unity-mcp`**
  (a Python/`uv` server). DRIFT starts with the official package precisely to avoid that dependency,
  so treat the switch as deliberate and say so. Source: `MCP.md` "Notes & alternatives", GDD §Engine.
  Do **not** invent CoplayDev install steps — defer to its own docs.

## The Editor won't even open / "No valid Unity Editor license found"

- **This is not an MCP problem** — it's license activation, and on this VM it's interactive.
- **Fix (this project's Personal license):** Unity discontinued manual `.alf`→`.ulf` activation for
  Personal; the working path is a **one-time interactive Desktop sign-in via Unity Hub** on the VNC
  display (`DISPLAY=:1 BROWSER=google-chrome unityhub --no-sandbox`), then **Get a free personal
  license**. Source: `AGENTS.md` "License activation". This is `unity-test-ci-guardian`'s territory
  for headless runs; for MCP you simply need a licensed *interactive* Editor.

## I'm on the headless VM and nothing works

- **Cause:** by design. The relay/bridge needs an interactive Editor; this VM has none (`AGENTS.md`).
- **Fix:** you cannot wire/drive MCP here. Verify logic via the EditMode suite
  (`unity-test-ci-guardian`), document the steps, and **flag the MCP/Play verification as pending a
  real-Editor run** (`guides/08`, Hard Rule #8). Don't claim wired/green on what you couldn't run.

## A scene op "succeeded" but the loop doesn't fire in Play

- **Cause:** silent wiring gaps — non-trigger collider, unwired `Configure(...)` reference, deck
  collider not removed, player still has its `CapsuleCollider` instead of `CharacterController`.
- **Fix:** walk the assembly checklist in `guides/04-scene-assembly.md` and the collider discipline
  in `guides/05-gameobject-and-prefab-ops.md`; read back each `Configure` target. These are the most
  common "looks right, behaves wrong" causes.
