# Estimation Guardian: Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `estimation-guardian`. Use this guide to decide whether a user request belongs to this Guardian.

**Guardian:** [`.cursor/agents/estimation-guardian.md`](../../agents/estimation-guardian.md)
**Weapon:** [`.cursor/skills/estimation-weapon/`](../../skills/estimation-weapon/)
**Trigger policy:** proactive

---

## Domain

`estimation-guardian` owns software estimation and forecasting. It covers relative-sizing frameworks (Fibonacci story points, T-shirt sizing, Planning Poker), the NoEstimates movement and its evidence base, the planning-fallacy literature that explains why estimates are systematically wrong, and cycle-time and throughput-based probabilistic forecasting (Monte Carlo simulation, percentile-based delivery dates such as P50/P85/P95). It separates relative sizing from probabilistic forecasting and keeps estimates from being misused as commitments.

## Trigger phrases

Route to `estimation-guardian` when the user says any of:

- "our story points mean nothing"
- "should we use NoEstimates?"
- "T-shirt size the roadmap"
- "90% confidence delivery date"
- "Monte Carlo for forecasting"
- "why are our estimates always wrong?"
- "how do I forecast this backlog?"

Or when the request implicitly involves sizing work or forecasting a delivery date.

## Do NOT route when

- The request is Jira or Linear velocity configuration or sprint ceremony design. Route to **agile-scrum-guardian** or **kanban-flow-guardian**.
- The request is roadmap prioritization rather than sizing. Route to **product-feedback-roadmap-guardian**.
- The request is sprint planning mechanics. Route to **agile-scrum-guardian**.

If a request straddles two Guardians, prefer the narrower-scoped Guardian and let the broader one act as backup.

## Inputs the Guardian needs

Before invoking, ensure the user has provided (or you can infer):

- The estimation or forecasting question.
- Whether reliable cycle-time or throughput history exists (required before recommending NoEstimates or Monte Carlo).
- Optional: the current sizing method and where it is failing.

If a required input is missing, do not invoke yet. Ask the user to supply it.

## Outputs the Guardian produces

- A sizing or forecasting recommendation matched to the team's data maturity.
- A probabilistic delivery forecast with confidence percentiles when history exists.
- An explanation of the planning fallacy grounded in the literature.

## Multi-Guardian sequences this Guardian participates in

- **Delivery planning**: `estimation-guardian` produces the forecast; `agile-scrum-guardian` or `kanban-flow-guardian` runs the ceremonies that feed it cycle-time data.

## Critical directives the orchestrator should respect

- Never frame estimates as commitments without explicit stakeholder negotiation.
- Always distinguish relative sizing from probabilistic forecasting.
- When recommending NoEstimates, always state the prerequisite of reliable cycle-time history.
- Cite the planning-fallacy literature when explaining why estimates are wrong.
- Escalate velocity configuration and sprint ceremony questions to the relevant Guardian.

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`.cursor/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
