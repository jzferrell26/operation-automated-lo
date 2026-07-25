# 03 — Driving the Editor from the Agent

Once the bridge is wired (`guides/02-installing-and-wiring.md`), this is how the agent actually
makes things happen in the Editor — and how you prove the loop works before trusting it with the
gray-box.

## The smoke test (do this first, every fresh session)

`MCP.md` Step 4 defines two checks lifted from the design doc's Weeks 1-2 milestone. Run both:

1. **Console read** — ask the agent:
   > Read the Unity console messages and summarize any warnings or errors.

   A clean summary proves the client can *read* Editor state.

2. **"Create a cube"** (GDD §14 / §recommended-path Weeks 1-2 milestone) — ask the agent:
   > Add a cube to the active scene.

   If the cube appears in the Hierarchy, the agent → Editor *write* loop works.

**This is the gate.** Do not attempt gray-box assembly until both pass. A cube in the Hierarchy is
the cheapest possible proof that the whole chain (agent → client → relay → bridge → Editor) is live.
The GDD itself frames this as the Weeks 1-2 deliverable: *"create a cube" smoke test. Confirm the
agent loop works.*

## The tools the client should list

`MCP.md` Step 4 names example Unity tools the client should expose once connected:

- `Unity_ManageScene`
- `Unity_ManageGameObject`
- `Unity_ReadConsole`

> **Grounding note:** these three are the tool names `MCP.md` cites. The official package exposes
> more, but `MCP.md` does not enumerate the full set. **Do not invent additional tool names.** If
> you need a capability you can't see in the client's listed tools, say so and check the listing
> rather than guessing a name. Where a needed operation isn't covered by a listed tool, fall back to
> a committed editor menu command (`guides/07-editor-scripts-vs-mcp.md`).

## The request → Editor → Hierarchy loop

The agent doesn't manipulate Unity objects directly; it issues tool calls that the bridge executes
inside the Editor. The mental model for every op:

1. **State the intent in Editor terms** — "create a cube named `SalvageNode` at (−5, 0.75, 1),
   scale 1.4, collider as trigger." Editor-native nouns (GameObject, component, collider, transform)
   map cleanly to the manage-* tools.
2. **The bridge applies it** in the active scene.
3. **Verify it landed** — read it back (e.g. via the console or by re-listing the Hierarchy). Never
   assume a write succeeded; confirm the object/component exists with the values you set.

This read-back discipline matters more here than in pure code, because a half-applied scene op is
invisible until you Play.

## What to drive vs what to call

- **Ad-hoc objects, inspection, tweaks, verification** → drive directly via MCP tools.
- **The whole gray-box world** → prefer calling the committed menu command `Drift → Setup Tier 0
  Gray Box` (`Tier0GrayBoxSetup`) which builds it deterministically, then use MCP to verify/tweak.
  See `guides/07-editor-scripts-vs-mcp.md`.

Driving the entire world object-by-object via MCP is possible but slower and easier to drift from
the canonical layout. Use MCP where it's flexible; use the editor script where it's deterministic.

## Verification mindset

The agent's job here is *runs-clean*, not *is-fun*. After any drive session:

- Console is clean (no new errors/warnings from your ops).
- The objects you created exist with the values you set.
- If you're heading toward Play, the player, deck, pads, nodes, enemy, loop controller, and HUD are
  all present (see `guides/04-scene-assembly.md` for the checklist).

The "is it fun?" call belongs to the user (`guides/06-running-the-graybox-loop.md`).

## If a drive op fails

Bridge dropped, tool not listed, connection un-approved, or an op silently no-ops → go to
`guides/09-troubleshooting.md`. Re-run the smoke test to localize the failure: if the cube test
fails, the problem is the bridge/connection, not your scene op.
