# 08 — Safety & Determinism

The discipline that keeps MCP-driven Editor automation from creating messes you can't see until you
Play. These rules turn "the agent drove the Editor" from a liability into a reproducible build step.

## 1. Idempotent assembly (Hard Rule #7)

Every op must be safe to run twice. Mirror `Tier0GrayBoxSetup`'s patterns:

- **Prefabs:** load-or-create (`LoadOrCreatePrefabRoot`) — never blind-create a duplicate.
- **Components:** ensure-component (`GetComponent<T>() ?? AddComponent<T>()`) — never double-add.
- **Scenes:** rebuild from a known empty scene + prefab instantiation, so a re-run yields the same
  world.

When driving via MCP, check existence before adding and read back after (`guides/03`). A
half-applied, non-idempotent op is invisible until Play and harder to debug than a clean re-run.

## 2. Never commit a relay path (Hard Rule #3)

The relay binary path in `.cursor/mcp.json` is home-dir- and OS-specific. A committed absolute path
is wrong on every other machine and makes the client spawn a missing binary (`MCP.md`). Use Unity's
auto-config (writes the **global** `~/.cursor/mcp.json`) or the per-machine manual template. This
Guardian writes only under `agents/` and `.claude/` — **never under `.cursor/`** — so it never touches
the client config in the repo anyway.

## 3. Stay in Tier 0 scope (Hard Rule #6 / `CLAUDE.md` Hard Rule #1)

MCP makes it trivial to add objects — which makes it trivial to over-build. Assemble only the
`TIER0.md` gray-box: station deck + O2/life-support, two shuttle pads, 3 resource nodes + 3 tool
caches, one mutation, loop controller, HUD. **No** station builder, enemy variety, crew, equipment
tiers, or save UI — those are Tier 1+. If a request implies a Tier 1 system, stop and flag it
(`CLAUDE.md` Hard Rule #10); don't freelance it just because MCP makes it easy.

## 4. The headless-VM caveat (Hard Rule #8)

Per `AGENTS.md`, this VM has **no interactive Editor**; the relay/bridge needs one, and this VM also
can't activate a Personal license without an interactive Desktop sign-in. Consequences:

- You generally **cannot** run the bridge, the smoke test, or Play mode here.
- The committed headless verification is the **EditMode suite** (`unity-test-ci-guardian`), not MCP.
- **Flag every wiring/assembly/Play step you couldn't execute as *pending a real-Editor run*.**
  Claiming "wired" or "runs clean" on an un-runnable step mirrors the exact trap `CLAUDE.md` §3
  warns about ("treat green as pending a real-editor run").

This is a **should-fix → blocker** in the severity rubric: an unflagged un-runnable claim is a
should-fix; presenting it as verified truth is a blocker.

## 5. Undo / scene-edit discipline

- **Don't blindly edit a scene you didn't build.** Read the Hierarchy first; understand what's
  present before adding/removing. A scene op that contradicts the canonical layout
  (`guides/04-scene-assembly.md`) is a blocker.
- **Prefer additive, reversible ops.** Creating an object is easy to undo; deleting wired objects
  can break `Configure(...)` references silently.
- **`ApplyModifiedPropertiesWithoutUndo` in editor scripts skips the undo stack** (as
  `Tier0GrayBoxSetup` does for asset authoring) — fine for deterministic asset setup, but it means
  you can't Ctrl-Z those changes. Know which ops are undoable before you run a batch.

## 6. Verify, don't assume

After any drive session:

- Console clean (no new errors/warnings from your ops).
- Objects exist with the values you set (read back).
- `Configure(...)` references are wired (the loop controller, pads, planner, crafter, enemy target).
- The layout matches the spawner.

A scene that "looks assembled" but has an unwired `Tier0LoopController` or a non-trigger node
collider will fail silently in Play. Read-back is cheap; a mystery non-firing loop is not.

## 7. Determinism beats cleverness

Given a choice between a clever one-shot MCP script and an idempotent, re-runnable sequence (or the
committed menu command), choose the deterministic one. The gray-box is a scope-guarded, comparison
artifact — its value is in being *the same world every time* so the "is it fun?" judgment is about
the design, not about which objects happened to spawn this run.
