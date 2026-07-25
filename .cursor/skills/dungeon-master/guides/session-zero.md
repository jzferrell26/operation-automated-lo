# Big Bang Space: Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `session-zero`. Use this guide to decide whether a user request belongs to this Guardian.

**Guardian:** [`.cursor/agents/session-zero.md`](../../agents/session-zero.md)
**Weapon:** [`.cursor/skills/session-zero-weapon/`](../../skills/session-zero-weapon/)
**Trigger policy:** proactive

---

## Domain

`session-zero` is the front-of-the-pipeline Guardian for the Guild AI Tools Factory. It creates a brand new guardian proposal by appending a fully-formed entry to the proposed-guardians backlog and the matching row to the proposed-guardians queue. It is where a new domain enters the factory. It always reads the `session-zero-weapon` weapon first, which encodes the proposal rubric, the four-tier research depth model, and the model-routing logic. It mirrors `dms-hand` on the production side of the same queue: `session-zero` fills the queue, `dms-hand` drains it.

## Trigger phrases

Route to `session-zero` when the user says any of:

- "propose a new Guardian"
- "I want a new guardian for X"
- "add a Guardian that does Y"
- "queue up a new subagent proposal"
- "extend the roster with Z"

Or when the user hands over a domain (Stripe Connect, Datadog APM, Helm charts, and so on) and expects it to enter the factory pipeline.

## Do NOT route when

- The user wants to actually build the weapon, command brief, agent file, or registry row. Those are downstream phases: route to **dms-hand** (to run the pipeline) or the individual factory skills.
- The user wants to register an already-built Guardian. Route to **dm-registrar**.
- The request is a normal domain task rather than proposing a new specialist.

If a request straddles two Guardians, prefer the narrower-scoped Guardian and let the broader one act as backup.

## Inputs the Guardian needs

Before invoking, ensure the user has provided (or you can infer):

- The domain the new Guardian should own.
- Optional: the desired research depth tier and any specific scope boundaries.

If a required input is missing, do not invoke yet. Ask the user to supply it.

## Outputs the Guardian produces

- A new entry appended to the proposed-guardians backlog.
- A matching row appended to the proposed-guardians queue.

## Multi-Guardian sequences this Guardian participates in

- **Guild AI Tools Factory pipeline**: `session-zero` proposes and queues a new Guardian; `dms-hand` then drives one queued row through command-center, loremaster, weapon-forge, guardian-creator, and dm-registrar.

## Critical directives the orchestrator should respect

- Always read the `session-zero-weapon` weapon before authoring a proposal.
- Only propose and queue; never build the weapon, agent file, or registry row.
- Keep the backlog and queue entries consistent with each other.

(Full list lives in the Guardian file's instructions.)

---

*Part of Dungeon Master's roster. See [`.cursor/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
