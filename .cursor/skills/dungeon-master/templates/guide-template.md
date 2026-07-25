# {{Guardian Display Name}} — Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `{{guardian-name}}`. Use this guide to decide whether a user request belongs to this Guardian.

**Guardian:** [`guild/.cursor/agents/{{guardian-name}}.md`](../../agents/{{guardian-name}}.md)
**Weapon:** [`guild/.cursor/skills/{{weapon-name}}/`](../../skills/{{weapon-name}}/)
**Command Brief:** [`guild/{{guardian-name}}-command-brief.md`](../../../{{guardian-name}}-command-brief.md)
**Trigger policy:** {{proactive | on-demand}}

---

## Domain

{{One paragraph: what single domain does this Guardian own? Lift from the Command Brief's IDENTITY & RESPONSIBILITY, tightened to 3–5 sentences.}}

## Trigger phrases

Route to `{{guardian-name}}` when the user says any of:

- "{{trigger phrase 1}}"
- "{{trigger phrase 2}}"
- "{{trigger phrase 3}}"

Or when the request implicitly involves {{the domain area}}.

## Do NOT route when

- {{negative trigger 1 — names the other Guardian that owns this}}
- {{negative trigger 2}}
- {{negative trigger 3}}

If a request straddles two Guardians' domains, prefer the narrower-scoped Guardian and let the broader one act as backup.

## Inputs the Guardian needs

Before invoking, ensure the user has provided (or you can infer):

- {{required input 1}}
- {{required input 2}}
- {{optional input — default behavior if absent}}

If a required input is missing, do not invoke yet — ask the user to supply it.

## Outputs the Guardian produces

- {{primary deliverable + location}}
- {{secondary deliverable, if any}}
- {{commit/audit trail produced}}

## Multi-Guardian sequences this Guardian participates in

- {{sequence name}} — {{this Guardian's position in the sequence and what hands off to it / from it}}

## Critical directives the orchestrator should respect

- {{directive 1 the user expects to be honored}}
- {{directive 2}}

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`guild/.cursor/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
