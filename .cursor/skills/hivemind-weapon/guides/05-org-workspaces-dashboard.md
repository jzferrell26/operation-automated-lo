# 05 - Org, workspaces, members, and the dashboard

## Identity

```bash
hivemind whoami     # current user org, workspace, and API endpoint
```

This account: org `jzferrell26's Organization`, workspace `default`, API `https://api.deeplake.ai`.

## Organization and workspace management

Each argument is SEPARATE. Do NOT quote a subcommand and its argument together.

```bash
hivemind org list                 # list organizations
hivemind org switch <name-or-id>  # switch organization (state-changing: confirm first)
hivemind workspaces               # list workspaces
hivemind workspace <id>           # switch workspace
hivemind members                  # list members
hivemind remove <user-id>         # remove a member (confirm first)
hivemind invite <email> <ADMIN|WRITE|READ>   # invite a member
```

ALWAYS ask the user which role (ADMIN / WRITE / READ) before running `invite`. `org switch` changes where all memory is read and written, so confirm before switching.

## Dashboard (per-repo KPIs + codebase graph)

```bash
hivemind dashboard                       # build the HTML dashboard for the current repo
hivemind dashboard --cwd <path>          # target a different repo
hivemind dashboard --out <path>          # write somewhere other than the default
hivemind dashboard --no-open             # do not launch a browser (headless / CI)
hivemind dashboard --serve --port <n>    # serve over loopback http://127.0.0.1:<port> (default 8123)
```

The dashboard combines KPI cards (tokens saved, skills created, memory recalls, sessions) with the codebase-graph visualization. By default it writes to `~/.hivemind/dashboards/<repo-key>/index.html` and opens it.

`--serve` is useful over SSH: VS Code and Cursor Remote-SSH auto-forward the port and open it in the integrated Simple Browser on click.

The same data is viewable in the Deeplake web UI. This account's codebase table lives at `https://deeplake.ai/jzferrell26s-organization/workspace/default/table/codebase`.

## Debugging

Set `HIVEMIND_DEBUG=1` to enable verbose logging to `~/.deeplake/hook-debug.log`.
