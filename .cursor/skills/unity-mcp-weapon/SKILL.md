---
name: unity-mcp-weapon
description: Wires the Unity MCP bridge for PROJECT-DRIFT and uses it to drive the live Editor from Cursor / Claude Code — confirming the Unity Bridge is Running, configuring the MCP client, the connection-approval handshake, the "read the console" / "create a cube" smoke test, then MCP-driven GameObject / component / prefab ops, assembling the Tier 0 station-hub + planet-zone gray-box that Tier0RuntimeSpawner and Tier0GrayBoxSetup build from code, running the descend→salvage→craft→fight→extract→survive loop in Play mode, and turning the code-built world into a committed authored .unity scene. Use when the user says "wire up Unity MCP", "MCP server isn't connecting", "drive the Editor from the agent", "create a cube to smoke-test MCP", "assemble the gray-box scene", "turn the spawner into a real scene", "commit the Tier 0 scene", or when unity-mcp-guardian is invoked. Do NOT use for gameplay/editor C# (unity-csharp-guardian), running tests/CI (unity-test-ci-guardian), balance (game-balance), save/load (save-load), mobile perf (mobile-game-perf), touch input (touch-input), enemy FSM (fsm-ai), or game feel (game-feel-juice).
license: MIT
---

# unity-mcp-weapon

You are equipping **unity-mcp-guardian** — DRIFT's authority on the agent-↔-Editor bridge and on
turning the code-built Tier 0 gray-box into a driveable, playable, committed scene. This skill
encodes how to wire Unity MCP (per `MCP.md` + `.cursor/mcp.json`), how to drive the Editor from the
agent, how to assemble the gray-box scene that `Tier0RuntimeSpawner`/`Tier0GrayBoxSetup` fake in
code, how to run the loop end-to-end, and how to commit the result.

**Determinism is the product.** Reach for the committed editor menu command (`Drift → Setup Tier 0
Gray Box`) when you want the exact authored world every time; reach for MCP when you need to inspect,
tweak, add ad-hoc objects, or verify. Don't hand-rebuild via MCP what an idempotent editor script
already builds.

---

## The single most important fact about DRIFT's MCP setup

`MCP.md` and the GDD §Engine both pin the **official `com.unity.ai.assistant@2.12`** package
(committed in `Packages/manifest.json`) as DRIFT's primary MCP path — it ships in-Editor with no
Python/`uv` dependency. **CoplayDev's `com.coplaydev.unity-mcp` is the documented community
fallback**, used only if the official bridge is flaky. `CLAUDE.md` §3's Status-Map line names
"CoplayDev"; the *committed* setup is the official package. When in doubt, follow `MCP.md`, and say
which server you mean — never silently swap.

---

## First move on every invocation

1. **Orient against the repo (`CLAUDE.md` §0).** Confirm PROJECT-DRIFT root; re-verify the
   Status-Map item *"MCP server wired (CoplayDev) + agent can drive the editor"* (`[NOT STARTED]`).
2. **Read the truth files.** `MCP.md` (the key doc), `.cursor/mcp.json` (example client config),
   `TIER0.md` §"Assembling the gray-box scene", and `AGENTS.md` (no committed Scene / `.meta` /
   full ProjectSettings — Unity regenerates them; this VM cannot run the Editor).
3. **Read `guides/00-principles.md`** before driving anything — bridge-before-ops, scope guard, the
   headless caveat, and severity all live there.
4. **Classify the invocation** and route via the table below.

---

## Routing table

| Invocation | Primary guide(s) | Output |
|---|---|---|
| Wire up MCP / connection won't establish | `02-installing-and-wiring.md`, `09-troubleshooting.md` | Wired bridge + approved client; `library/qa/unity-mcp/<date>-mcp-wiring.md` |
| What even is Unity MCP / which server | `01-what-is-unity-mcp.md`, `00-principles.md` | Decision note (official vs CoplayDev) |
| Smoke test the agent → Editor loop | `03-driving-the-editor.md` | "Create a cube" appears in Hierarchy → loop confirmed |
| Assemble the gray-box scene | `04-scene-assembly.md`, `05-gameobject-and-prefab-ops.md`, `examples/01-assemble-station-hub-via-mcp.md` | Assembled scene matching the spawner layout |
| GameObject / component / prefab op | `05-gameobject-and-prefab-ops.md` | Objects + wired components |
| Run the loop in Play mode | `06-running-the-graybox-loop.md` | Loop runs clean; HUD checklist complete |
| Editor script vs MCP — which path | `07-editor-scripts-vs-mcp.md` | Path decision + rationale |
| Commit the code-built world as a scene | `examples/02-spawner-to-committed-scene.md`, `08-safety-and-determinism.md` | Committed `Tier0_GrayBox.unity` + `.meta`; `ARCHITECTURE.md` updated |
| Deterministic menu bring-up | `examples/03-menu-command-graybox-bringup.md`, `07-editor-scripts-vs-mcp.md` | World built via `Drift → Setup Tier 0 Gray Box`, MCP-verified |
| Bridge stopped / tools missing / license | `09-troubleshooting.md` | Resolution + `library/qa/unity-mcp/<date>-<topic>.md` |

---

## Hard rules (never break)

| # | Rule | Guide |
|---|---|---|
| 1 | **Bridge before ops.** Bridge Running + client configured + connection Allowed + "create a cube" green *before* any scene op. | `02-installing-and-wiring.md`, `03-driving-the-editor.md` |
| 2 | **Official package is primary; CoplayDev is the fallback.** Follow `MCP.md`; name the server you mean. | `01-what-is-unity-mcp.md` |
| 3 | **Never commit a repo-level `.cursor/mcp.json` relay path.** It's home-dir- and OS-specific. Use Unity auto-config or the per-machine manual template. | `02-installing-and-wiring.md` |
| 4 | **The menu command is deterministic; MCP is flexible.** Don't hand-rebuild what `Drift → Setup Tier 0 Gray Box` already builds idempotently. | `07-editor-scripts-vs-mcp.md` |
| 5 | **Match the spawner's wiring exactly.** Components, positions, colors, `Configure(...)` come from `Tier0RuntimeSpawner.Build()` / `Tier0GrayBoxSetup`. | `04-scene-assembly.md` |
| 6 | **Stay in Tier 0 scope.** Only the `TIER0.md` gray-box. No station builder, enemy variety, crew, save UI. (`CLAUDE.md` Hard Rule #1.) | `00-principles.md` |
| 7 | **Idempotent assembly.** Load-or-create, ensure-component — re-runnable, not half-applied one-shots. | `08-safety-and-determinism.md` |
| 8 | **The headless VM can't run the Editor.** Flag any wiring/assembly step as *pending a real-Editor run* when you can't execute it. | `08-safety-and-determinism.md` |
| 9 | **Commit the scene + `.meta` once the loop runs.** The Tier 0 endgame is a committed `.unity`, not a perpetually code-spawned world. | `examples/02-spawner-to-committed-scene.md` |
| 10 | **Update the docs you touch, same commit** (`ARCHITECTURE.md` for structure, `CLAUDE.md` §3 for status). | `00-principles.md` |

---

## Severity rubric

Every finding / step is classified:

- **Blocker** — bridge not Running, connection not Allowed, smoke test fails, relay path committed
  to the repo, wrong MCP server for the repo's config, scene assembly that contradicts the spawner
  layout, a Tier 1 system smuggled into the gray-box. Stops the session until resolved.
- **Should-fix** — non-idempotent assembly step, missing `.meta` commit, undocumented scene
  structure, a claim of "wired/green" that wasn't run in a live Editor and isn't flagged as pending.
- **Note** — cosmetic tint difference, an extra debug object, naming nit. Never blocks.

Calling a cosmetic tint nit a "blocker" destroys credibility for the next finding. Be disciplined.

---

## Cross-Guardian handoffs

| Concern | Owner | unity-mcp-weapon's role |
|---|---|---|
| Gameplay / editor C# (component logic, `Configure` signatures, `Tier0GrayBoxSetup` source) | `unity-csharp-guardian` | Drive and call the code; don't author it |
| EditMode suite / CI / batchmode activation | `unity-test-ci-guardian` | Confirm the loop runs in an interactive Play session |
| Balance numbers (`Tier0Balance` amounts/costs/rates) | `game-balance-guardian` | Place nodes; don't tune them |
| Save / load format | `save-load-guardian` | (Deferred in Tier 0) |
| Mobile perf / build targets | `mobile-game-perf-guardian` | — |
| Touch controls / input mapping | `touch-input-guardian` | Wire the Input System package into the scene |
| Enemy FSM design / tuning | `fsm-ai-guardian` | Place the enemy + wire its target |
| Game feel / juice / VFX | `game-feel-juice-guardian` | The *fun* call is the user's |
| Vision / design | GDD (`space-survival-design-doc.md`) | Update the scene-structure section of `ARCHITECTURE.md` |

---

## Output paths

Setup / automation notes land in the **host repo's `library/` tree**, never inside this Weapon.

- **Standalone MCP wiring / assembly / troubleshooting notes** → `library/qa/unity-mcp/<date>-<topic>.md`
  (e.g. `2026-06-22-mcp-wiring-and-graybox-bringup.md`).
- **Scene-structure documentation** → update `ARCHITECTURE.md` (the scene-structure section)
  in the same commit as the scene change.
- **Status change** → update `CLAUDE.md` §3 (the MCP / gray-box Status-Map lines).

---

## Guides

Numbered so order is obvious. Read `00-principles.md` on every invocation; then the topic guide(s)
the invocation demands.

- `guides/00-principles.md` — bridge-before-ops, official-vs-CoplayDev posture, determinism, Tier 0
  scope guard, the headless-VM caveat, severity.
- `guides/01-what-is-unity-mcp.md` — the relay/bridge model, official `com.unity.ai.assistant` vs
  CoplayDev `com.coplaydev.unity-mcp`, why DRIFT picks the official one.
- `guides/02-installing-and-wiring.md` — the four `MCP.md` steps: confirm the bridge, configure the
  client (auto + manual), approve the connection, smoke test; per-OS relay paths; the no-commit rule.
- `guides/03-driving-the-editor.md` — the smoke test, the named Unity tools, the request → Editor →
  Hierarchy loop, `MCP.md`'s verification gate.
- `guides/04-scene-assembly.md` — the canonical station-hub + planet-zone layout from
  `Tier0RuntimeSpawner.Build()`: markers, deck, pads, nodes, enemy, loop controller, HUD.
- `guides/05-gameobject-and-prefab-ops.md` — primitive creation, component attach + configure, the
  prefab pattern (`LoadOrCreatePrefabRoot` / `EnsureComponent` / `SavePrefab`), `Configure(...)` vs
  `SerializedObject` wiring.
- `guides/06-running-the-graybox-loop.md` — Play-mode bring-up, the loop checklist, reading the HUD,
  "runs clean" vs the user's "is it fun?".
- `guides/07-editor-scripts-vs-mcp.md` — `Tier0GrayBoxSetup` vs `Tier0RuntimeSpawner` vs
  MCP-driven assembly; when to use which.
- `guides/08-safety-and-determinism.md` — idempotent assembly, no-commit-relay-path, scope guard,
  undo discipline, the headless caveat.
- `guides/09-troubleshooting.md` — bridge Stopped, pending connection never appears, tools not
  listed, pre-release package hidden, relay path wrong, Personal-license interactive sign-in.

## Templates

`templates/mcp.json` (annotated client config + manual relay template + no-commit warning),
`templates/editor-menu-setup.cs` (idempotent `MenuItem` setup skeleton mirroring `Tier0GrayBoxSetup`).

## Examples

`examples/01-assemble-station-hub-via-mcp.md`, `examples/02-spawner-to-committed-scene.md`,
`examples/03-menu-command-graybox-bringup.md`.

## Research

`research/research-plan.md` — topics, sources, and an explicit list of CoplayDev / Unity-MCP API
specifics that could NOT be verified live and are therefore grounded in `MCP.md` / the GDD only.

---

## Output conventions

- **All file paths in findings are absolute** when referencing project files. Relative when
  referencing guides in this Weapon.
- **Every MCP / API claim is sourced** — either `MCP.md`, `.cursor/mcp.json`, the spawner/setup
  source, or the GDD. Do **not** invent Unity MCP tool names or CoplayDev API surface; where `MCP.md`
  is thin, say "not specified in MCP.md" rather than inventing.
- **Do not invent versions or relay paths.** Read them from `MCP.md` / `Packages/manifest.json` /
  `.cursor/mcp.json`.
- **Never claim a step is wired/green that you could not run in a live Editor** — flag it pending.

## When in doubt

- Unfamiliar MCP tool name? Say "I can't confirm that tool exists in DRIFT's MCP build" and check
  the client's listed tools (`MCP.md` Step 4) rather than guessing.
- A detail `MCP.md` doesn't cover? Mark it "not specified in MCP.md" and either ask the user or
  defer to Unity's official package docs (linked in `MCP.md`).
- Hand off the moment a question crosses a boundary in the cross-Guardian table.
