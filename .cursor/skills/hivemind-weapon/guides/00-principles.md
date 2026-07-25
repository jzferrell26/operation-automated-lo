# 00 - Principles: what hivemind is and how its memory is shaped

Hivemind (`@deeplake/hivemind`, repo `activeloopai/hivemind`) is "one brain for every agent on your team." It wires multiple AI assistants (Claude Code, Codex, Cursor, and others) into a single shared memory backed by Deeplake, so a session in one harness can recall what happened in another.

## Two memory sources, always check both

When asked to recall, remember, or look up anything, check BOTH:

1. **Built-in harness memory** (`~/.claude/`, and the equivalent per harness) - personal, per-project notes the assistant keeps locally.
2. **Hivemind / Deeplake global memory** (`~/.deeplake/memory/`) - shared across all sessions, users, and agents in the org.

## The three Deeplake memory tiers

Pick the right tier for the question. They live under `~/.deeplake/memory/`:

| Tier | Path | Size | Use it for |
|---|---|---|---|
| Index | `index.md` | ~5 KB | Auto-generated, top 50 most-recently-updated entries with `Created` + `Last Updated` + `Project` + `Description` columns. START HERE for "what is recent / who did X / since `<date>`" queries, and trust the `Last Updated` column over any `Started:` line in a summary body. |
| Summaries | `summaries/` | ~3 KB each | Condensed wiki summary per session. For keyword / topic recall, search these. |
| Sessions | `sessions/` | ~5 KB each | Raw full-dialogue JSONL. FALLBACK only, when summaries lack the exact quote or turn you need. |

## Privacy posture

Hivemind uploads session content to the Deeplake cloud (`https://api.deeplake.ai`). This account runs auto-recall and auto-save everywhere by deliberate choice. That convenience has a cost: anything in a session can leave the machine.

- Do not paste client PII, third-party secrets, or credentials into a session and expect them to stay local.
- For sensitive client work, prefer the built-in per-harness memory, or state plainly that a detail must not be persisted.
- `hivemind uninstall` and `embeddings uninstall --prune` are the off-switches; `org switch` changes where memory is read and written. Confirm before running any of these.

## Hard limits when reading memory (read these every time)

- Use only read-only shell tools (`cat`, `ls`, `grep`, `head`, `tail`, `jq`) against `~/.deeplake/memory/`. `python`, `node`, and `curl` are not available on that path.
- Do not spawn subagents to read Deeplake memory.
- If a file returns empty after two attempts, skip it and move on. Report what you found rather than exhaustively retrying.
- Treat recalled memory as background context that was true when written. If a memory names a file, flag, or command, verify it still exists before acting on it.
