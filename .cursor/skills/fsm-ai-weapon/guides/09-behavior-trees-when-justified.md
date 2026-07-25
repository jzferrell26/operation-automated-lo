# 09 — Behavior Trees, When Justified

The short version: **for DRIFT, almost never — and never in Tier 0.** This guide exists so that when someone asks "shouldn't this be a behavior tree?" you have a grounded, honest answer instead of a reflex.

## 1. The default answer

DRIFT's enemies are, by design, a "simple FSM (idle → detect → chase → attack → return) ... LDoE enemies aren't sophisticated; aggro + pathing is enough" (GDD §8). An FSM is the right tool for a small, mostly-linear set of states with clear transitions. A behavior tree (BT) is the right tool for *agents with many context-dependent priorities that recompose dynamically*. DRIFT's mutations and raiders are the former. Reach for an FSM and stop.

## 2. What a behavior tree actually buys you

Be fair to BTs — they have real strengths, just not ones DRIFT needs yet:

- **Reusable, composable nodes** — a "MoveTo," "IsTargetVisible," "Attack" leaf reused across many agent types via different tree shapes.
- **Priority via fallback/selector nodes** — "if can-heal then heal, else if can-flee then flee, else attack" expressed declaratively, re-evaluated each tick.
- **Designer-editable behavior** — visual graph tools (e.g. node-graph BT editors) let non-programmers reshape AI.

These pay off when you have *many* archetypes sharing *many* sub-behaviors with *shifting priorities* — a tactical-shooter squad, a sim with dozens of needs-driven NPCs. DRIFT has a melee swarm and a ranged raider. The FSM expresses both with parameter swaps and ≤2 added states (`guides/07`). The BT's reusability buys nothing you can't get from a shared state object (`guides/02`).

## 3. The honest cost of a BT in this project

Three costs, and the third is fatal for now:

1. **A whole new runtime + mental model** to maintain — tick traversal, node status (Running/Success/Failure), blackboards — for AI that four enum cases already handle.
2. **Tier violation.** Building a BT framework while Tier 0's fun is unproven is exactly the kind of build-ahead Hard Rule #1 forbids. It's infrastructure for variety that doesn't exist yet.
3. **EditMode-testability risk (Hard Rule #11).** The shipped FSM is trivially steppable: `Step(0.1f)` returns the state, and `RuntimeEnemyTests` asserts on it. A BT — especially a third-party/visual-graph one — typically ticks through its own scheduler tied to `Update`/coroutines, which **does not run in EditMode**. You would have to wrap the BT so the whole tree ticks from one extracted `Step(deltaSeconds)` with all leaves `Configure`-injected and physics behind seams (`guides/08`) — i.e. you'd rebuild the FSM's testability discipline on top of the BT, for no gain. If you can't tick the entire tree deterministically from a test, the BT is a non-starter here.

## 4. The genuine trigger (rare)

Consider a BT only when **all** of these are true, and even then write an ADR first:

- You have **5+ archetypes** sharing **many** sub-behaviors (`guides/07` deltas have stopped scaling — you're copy-pasting whole sub-trees of logic).
- Behaviors are **priority-driven and recompose at runtime** (the agent genuinely re-decides "heal vs flee vs attack" by changing conditions every tick, not a fixed transition table).
- You've already tried the cheaper escalation — **state objects / HFSM** (`guides/02`) — and it's not enough.
- You can **tick the whole tree from one deterministic `Step(deltaSeconds)`** with injected dependencies, preserving Hard Rule #11.
- It's **Tier 1+**, with Tier 0 proven fun.

That's a high bar, and DRIFT is unlikely to clear it for a long time — possibly ever, given its LDoE-simple enemy design.

## 5. The escalation ladder (where a BT sits)

When an FSM feels strained, walk *up* this ladder; the BT is the top rung and you rarely climb that high:

1. **Add a `case`** to the enum-switch (`guides/01 §6`). Most needs end here.
2. **Add hysteresis / a guard** if the strain is thrash, not missing behavior (`guides/10`).
3. **Promote to state objects** when states multiply and share entry/exit work (`guides/02 §2`).
4. **HFSM (superstates)** when several states share a guard (e.g. a "Combat" parent owning the leash). Still an FSM.
5. **Behavior tree** — only after §4's trigger is fully met, via ADR.

## 6. If you must — how to keep it testable

Should a BT ever be genuinely justified and approved by ADR:

- Wrap it so the **entire tree ticks from one `Step(float deltaSeconds)`** the FSM-style harness can call; never let the BT self-schedule from `Update` only.
- Inject all blackboard dependencies (target, anchors) via `Configure(...)` — no in-leaf tag/scene lookups.
- Put every physics leaf (LOS, avoidance) behind an injectable seam (`guides/08 §5`).
- Reproduce the `RuntimeEnemyTests` coverage bar: assert tree outcomes by stepping it deterministically.

If you can't meet all four, you don't have a BT that fits DRIFT — you have a testability regression. Stay on the FSM.

## 7. The answer to "shouldn't this be a behavior tree?"

> Probably not. DRIFT's enemies are LDoE-simple by design, the FSM already expresses both archetypes, and a BT would add a runtime, a Tier violation, and an EditMode-testability problem for reusability we don't need yet. If we ever have 5+ archetypes with runtime-recomposing priorities, we'll write an ADR and revisit — and even then only if the whole tree can tick from one deterministic `Step`.
