# Agents

> What agents are, how they work, and how they map across Cursor, Claude Code, Claude Cowork, and Codex.

## Operating instructions (Codex and any orchestrator without a skill auto-loader)

If you are Codex (or any agent that does not auto-load skills by description), follow this routing procedure before doing domain work. Cursor and Claude Code do this automatically through their skill systems; Codex does it by reading files.

0. **Read the terrain.** Open [`.cursor/rules/core/the-map.mdc`](./.cursor/rules/core/the-map.mdc) and the [canonical project map](./library/knowledge/private/product/project-map.md). Do not invent live HighLevel / Meta / Stripe evidence or reopen G1/G4/G8.
1. **Open the roster.** Read [`.cursor/skills/dungeon-master/SKILL.md`](./.cursor/skills/dungeon-master/SKILL.md). It is the Dungeon Master router: a table of every Guardian, its domain, its trigger keywords, and a link to its guide.
2. **Match the request to one Guardian.** Use the trigger keywords and the "Do NOT route when" notes in each guide under `.cursor/skills/dungeon-master/guides/`. Prefer the narrowest-scoped Guardian. If two compete, read both guides before choosing.
3. **Load the Guardian persona.** Read [`.cursor/agents/<guardian-name>.md`](./.cursor/agents/) for its identity, guardrails, and escalation rules.
4. **Load the paired Weapon.** Read `.cursor/skills/<weapon-name>/SKILL.md`, then open only the specific `guides/`, `templates/`, or `examples/` files that the task needs (progressive disclosure: do not read the whole folder up front).
5. **Execute as that Guardian,** honoring its critical directives and the always-on rules in [RULES.md](./RULES.md).
6. **Close out** per the multi-Guardian sequences in the router (for implementation work, that ends with `security-guardian` then `quality-guardian`).

You can also invoke routing explicitly with the `/dungeon-master` prompt (see [`.codex/prompts/dungeon-master.md`](./.codex/prompts/dungeon-master.md) and `.codex/README.md` for install).

The paths above use `.cursor/` because that is the source of truth in this repo. The identical trees exist at `.claude/` for Claude Code; pick whichever your harness reads.

## What an agent is

An agent (also called a subagent) is a focused AI persona with a narrow job, its own instructions, and its own guardrails. Instead of one general assistant trying to do everything, you give each domain its own specialist. A primary orchestrator reads the request, decides which agent owns it, and hands the work off. The agent runs with a clean, purpose-built brief and returns its result.

In this repo, agents are called **Guardians**. Each Guardian owns exactly one domain (Git, auth, databases, SEO, payments, and so on) and is paired with exactly one **Weapon** (a skill, see [SKILLS.md](./SKILLS.md)). The Guardian is the persona and the judgment. The Weapon is the procedural arsenal it reads from. Routing across the whole roster is handled by a skill called `dungeon-master`, which keeps an index of every Guardian, its trigger phrases, and when NOT to use it.

The agents live in [`.cursor/agents/`](./.cursor/agents/) (and a mirror in [`.claude/agents/`](./.claude/agents/)).

## Anatomy of an agent file

An agent is a single Markdown file with YAML frontmatter on top and instructions below:

```markdown
---
name: git-guardian
description: When to use this agent and what it owns. The orchestrator reads
  this to decide routing, so it is specific about trigger phrases and scope.
proactive: true
---

# Git Guardian

Identity, responsibilities, hard rules, and the workflow the agent follows.
```

- **name** is the handle the orchestrator invokes.
- **description** is the routing contract. Good descriptions say what the agent does, the phrases that should trigger it, and what it explicitly does NOT handle.
- **proactive** (optional) marks an agent that may volunteer when it sees relevant work, versus one that only runs when explicitly called.

## How agents map across harnesses

| Harness | Where agents live | Notes |
|---|---|---|
| **Cursor** | `.cursor/agents/*.md` | Custom agents the Cursor orchestrator routes to. This is the source of truth in this repo. |
| **Claude Code** | `.claude/agents/*.md` | Subagents. Same Markdown + frontmatter shape, so the files port directly. Frontmatter may also carry `tools` and `model`. |
| **Claude Cowork** | runs on the Claude Agent SDK | Cowork is built on the same engine as Claude Code, so it executes subagents through its Agent and Task tooling. Cowork's primary distributable unit is the skill, so most cross-harness sharing happens at the skill layer. |

The short version: agents are a first-class concept in Cursor and Claude Code, and they share a file format, so the same agent definition works in both. Cowork leans on skills as the portable unit, while still running agent-style delegation under the hood.

## The orchestration model in this repo

This is not a loose pile of agents. It is a factory with a chain of command:

- **Dungeon Master** (`.cursor/skills/dungeon-master/`) is the router. It holds the roster and decides which Guardian owns a request.
- **Guardians** (`.cursor/agents/*-guardian.md` and a few specials) are the domain specialists.
- **Weapons** (`.cursor/skills/*-weapon/`) are the skills each Guardian reads from.
- **The factory line** (`command-center`, `loremaster`, `weapon-forge`, `guardian-creator`, `dm-registrar`) is how new Guardian + Weapon pairs get created, researched, written, and registered. `dms-hand` and `session-zero` drive that queue.

To see every Guardian and its paired Weapon with direct links, check the catalog in the main [README](./README.md).

## Related

- [SKILLS.md](./SKILLS.md) — the Weapons that Guardians wield
- [HOOKS.md](./HOOKS.md) — event-driven automation
- [RULES.md](./RULES.md) — always-on guidance that constrains every agent
