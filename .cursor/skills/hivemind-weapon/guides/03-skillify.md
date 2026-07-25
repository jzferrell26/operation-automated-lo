# 03 - Skillify: share and pull skills across the org

Skillify mines reusable skills from sessions and shares them across the org, then pulls them onto any machine. It is how the Guild's Weapons can travel between teammates.

## Inspect current state

```bash
hivemind skillify          # show scope, team, install location, and per-project state
```

Reports `scope` (me / team / org), `team` members, `install` location (project or global), and the projects tracked with their counters.

## Pull skills onto this machine

```bash
hivemind skillify pull                       # sync project skills from the org table to local FS
hivemind skillify pull --user <email>        # only skills authored by that user
hivemind skillify pull --users <a,b,c>       # only skills from those authors
hivemind skillify pull --all-users           # explicit "no author filter" (the default)
hivemind skillify pull --to <project|global> # install location: project = cwd/.claude/skills, global = ~/.claude/skills
hivemind skillify pull --dry-run             # preview without touching disk
hivemind skillify pull --force               # overwrite local files even if up-to-date (creates .bak)
hivemind skillify pull <skill-name>          # pull only that one skill (combines with --user)
```

## Remove pulled skills

```bash
hivemind skillify unpull                  # remove every skill previously installed by pull
hivemind skillify unpull --user <email>   # remove only that author's pulls
hivemind skillify unpull --not-mine       # remove all pulls except your own
hivemind skillify unpull --dry-run        # preview
```

## Configure sharing

```bash
hivemind skillify scope <me|team|org>        # sharing scope for newly mined skills
hivemind skillify install <project|global>   # default install location for new skills
hivemind skillify promote <skill-name>       # move a project skill to the global location
hivemind skillify team add|remove|list <name>
```

## Mine skills from local sessions

```bash
hivemind skillify mine-local             # one-shot: mine skills from local sessions (no auth needed)
hivemind skillify mine-local --n <num|all>   # how many sessions to mine (default 8)
hivemind skillify mine-local --force     # re-run even if the manifest sentinel exists
hivemind skillify mine-local --dry-run   # stop before calling the LLM gate
```

## Note for this account

Current scope is `me` and install is `project` (`<project>/.claude/skills/`). To share the Guild's Weapons with a teammate, set `scope team` (or `org`), add them with `skillify team add`, then they `skillify pull --user jonathan@highlevelautomations.com`.
