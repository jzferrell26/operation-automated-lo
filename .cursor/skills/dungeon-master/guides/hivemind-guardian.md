# hivemind-guardian - Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `hivemind-guardian`.

**Guardian:** [`.cursor/agents/hivemind-guardian.md`](../../../.cursor/agents/hivemind-guardian.md)
**Weapon:** [`.cursor/skills/hivemind-weapon/`](../../hivemind-weapon/)
**Trigger policy:** proactive (it is the standing recall-before / persist-after memory step)

---

## Domain

`hivemind-guardian` owns Activeloop hivemind (`@deeplake/hivemind`), the team's shared cross-session, cross-harness AI memory backed by Deeplake at `~/.deeplake/memory/`. It recalls prior context, persists new work, manages the install across Claude Code / Codex / Cursor, shares skills across the org (skillify), runs semantic search (embeddings), administers org and workspace, and builds the per-repo dashboard. It is the memory backbone the rest of the Guild leans on.

## Trigger phrases

Route to `hivemind-guardian` when the user says any of:

- "save this to hivemind", "remember this"
- "recall what we did on X", "pick up where I left off", "load that from hivemind", "continue where we stopped"
- "set up hivemind", "update hivemind", "is hivemind wired into Cursor / Codex / Claude"
- "share this skill across the org", "skillify", "pull the team's skills"
- "turn on semantic search", "enable embeddings"
- "switch hivemind org / workspace", "invite a teammate to hivemind"
- "build the hivemind dashboard", "show tokens saved / memory recalls"

Also fires proactively as the recall step before another Guardian starts non-trivial work, and the persist step after.

## Do NOT route when

- The request is product-side RAG, vector DB, or LLM retrieval inside an application -> `mind-guardian`.
- The request is a customer-facing knowledge base or help center -> `knowledge-base-help-center-guardian`.
- The request is in-repo narrative knowledge docs, PRDs, or IRDs -> `knowledge-guardian` / `library-guardian`.

`mind-guardian` owns memory INSIDE a product; `hivemind-guardian` owns the developer-team memory ACROSS sessions and harnesses. When in doubt about which, ask whether the memory serves end users (mind) or the agents/team (hivemind).

## Inputs the Guardian needs

- For recall: a topic, project name, or time window.
- For install / admin: which assistants or which org / workspace.
- For skillify: the skill name and the target scope (me / team / org).

If a required input is missing, ask before running state-changing commands.

## Outputs the Guardian produces

- Recalled context summarized back to the user (with the source tier noted).
- A confirmed persist of key facts into the session summary.
- CLI actions (`hivemind status / install / update / skillify / embeddings / dashboard`) with their results reported.

## Multi-Guardian sequences this Guardian participates in

- Recall-before / persist-after - runs at the start and end of most other Guardians' work as the memory bookend.
- Any sequence resuming prior work ("pick up where I left off") starts here, then hands the loaded context to the owning domain Guardian.

## Critical directives the orchestrator should respect

- Read `~/.deeplake/memory/` only with read-only shell tools; no `python` / `node` / `curl` there; no subagents reading memory.
- Privacy: hivemind uploads session content to the cloud. Never persist client PII, secrets, or credentials.
- Confirm before `hivemind uninstall`, `embeddings uninstall --prune`, `org switch`, member `remove`, or `invite` (ask the role first).

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of the Dungeon Master's roster. See [`.cursor/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
