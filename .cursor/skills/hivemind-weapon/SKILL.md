---
name: hivemind-weapon
description: Operate Activeloop hivemind (@deeplake/hivemind), the cross-session, cross-harness AI memory layer. Use when the user says "save this to hivemind", "recall what we did", "pick up where I left off", "load that from hivemind", "set up hivemind on this machine", "share this skill across the org", "turn on semantic search", "switch hivemind org/workspace", "build the hivemind dashboard", or when any Guardian needs to recall prior context before acting or persist findings after. Routes hivemind install/status/update, the three-tier memory recall+save workflow, skillify org skill-sharing, embeddings (semantic search), org/workspace management, and the per-repo dashboard. Do NOT use for product RAG/vector retrieval inside an app (mind-guardian), customer-facing knowledge bases (knowledge-base-help-center-guardian), or in-repo narrative docs (knowledge-guardian / library-guardian).
license: MIT
---

# Hivemind Weapon

Activeloop hivemind (`@deeplake/hivemind`, repo `activeloopai/hivemind`) is one shared brain for every AI agent on a team. It gives Claude Code, Codex, Cursor, and other assistants a single cross-session, cross-harness memory backed by Deeplake, plus org-wide skill sharing, semantic search, and a per-repo dashboard.

This Weapon is the procedural arsenal for `hivemind-guardian`. It covers the real CLI surface (verified against hivemind 0.7.101) and the file-based memory at `~/.deeplake/memory/`.

> Privacy posture: hivemind uploads session content to the Deeplake cloud (`https://api.deeplake.ai`). This account has chosen auto-recall and auto-save everywhere. Even so, never paste third-party secrets, client PII, or credentials into a session expecting them to stay local. See `guides/00-principles.md`.

---

## When to use this Weapon

Activate when the user (or another Guardian) wants to:

- Recall prior work: "what did we do on X", "pick up where I left off", "load that from hivemind", "continue where we stopped".
- Persist work: "save this to hivemind", "remember this decision", "write a session summary".
- Manage the install: "set up hivemind", "is hivemind wired into Cursor/Codex/Claude", "update hivemind".
- Share skills across the org: "share this skill", "pull the team's skills", "promote this skill globally".
- Turn on semantic search: "enable embeddings", "make memory search smarter".
- Manage org/workspace: "switch org", "which workspace am I in", "invite a teammate".
- See the picture: "build the hivemind dashboard", "show tokens saved / memory recalls".

Do NOT use for:
- Product-side RAG, vector DBs, or retrieval inside an application -> `mind-guardian`.
- Customer-facing help centers -> `knowledge-base-help-center-guardian`.
- In-repo narrative knowledge docs / PRDs -> `knowledge-guardian` / `library-guardian`.

---

## Playbook

| Task | Guide |
|---|---|
| Understand hivemind, the three memory tiers, and the privacy posture | `guides/00-principles.md` |
| Install, check status, update across assistants | `guides/01-install-status-update.md` |
| Recall prior context and save new memory (the daily loop) | `guides/02-memory-recall-and-save.md` |
| Share / pull / promote skills across the org (skillify) | `guides/03-skillify.md` |
| Turn semantic search on or off (embeddings) | `guides/04-embeddings.md` |
| Manage org, workspace, members, and build the dashboard | `guides/05-org-workspaces-dashboard.md` |

---

## The one rule every Guardian inherits

Recall before, persist after. Before non-trivial work, check hivemind memory for relevant prior context. After meaningful work, save a short summary so the next session (in any harness) starts warm. The always-on rule `hivemind-memory` enforces this; this Weapon is how it gets done. See `guides/02-memory-recall-and-save.md`.

---

## Critical safety directives

- Only ever use read-only shell tools (`cat`, `ls`, `grep`, `head`, `tail`) against `~/.deeplake/memory/`. Never run `python`, `node`, or `curl` against that path; they are not available there.
- Do not spawn subagents to read deeplake memory. If a file returns empty twice, skip it and move on.
- Treat recalled memory as background context that was true when written. If a memory names a file, flag, or command, verify it still exists before acting on it.
- `hivemind uninstall`, `embeddings uninstall --prune`, and `org switch` are state-changing. Confirm with the user before running them.
