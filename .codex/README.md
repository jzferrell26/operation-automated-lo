# Codex layer

Codex does not auto-load skills by description the way Cursor and Claude Code do. This repo gives Codex two hooks so the Dungeon Master system still works:

## 1. `AGENTS.md` (automatic)

Codex reads [`AGENTS.md`](../AGENTS.md) at the repo root on every session in this directory. Its "Operating instructions" section tells Codex how to route: open the roster, match a Guardian, load its Weapon, execute. Nothing to install. This works as soon as you run Codex inside this repo.

## 2. `/dungeon-master` slash prompt (one-time install)

Codex reads custom prompts from your global prompts directory, not from the repo. To enable the `/dungeon-master` command, copy the prompt there once:

```bash
# macOS / Linux
mkdir -p ~/.codex/prompts
cp .codex/prompts/dungeon-master.md ~/.codex/prompts/
```

```powershell
# Windows (PowerShell)
New-Item -ItemType Directory -Force "$env:USERPROFILE\.codex\prompts" | Out-Null
Copy-Item ".codex\prompts\dungeon-master.md" "$env:USERPROFILE\.codex\prompts\"
```

Then in Codex: `/dungeon-master <describe your task>`. It routes the task through the roster and runs the matching Guardian.

## How this maps to the other harnesses

| Harness | Routing entry point | Install |
|---|---|---|
| **Cursor** | `.cursor/skills/dungeon-master/` (auto-discovered skill) + `.cursor/agents/` | Drop the repo in; Cursor reads `.cursor/` |
| **Claude Code** | `.claude/skills/dungeon-master/` + `.claude/agents/` | Claude Code reads `.claude/` |
| **Codex** | `AGENTS.md` (auto) + `/dungeon-master` prompt | Copy the prompt once, as above |
| **Cowork** | `.cowork/skills/*.skill` packages | Install the `.skill` files you want |
