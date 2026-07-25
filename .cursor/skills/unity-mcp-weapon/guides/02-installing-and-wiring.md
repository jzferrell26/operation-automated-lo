# 02 — Installing & Wiring the MCP Bridge

This is the DRIFT-specific cut of `MCP.md`. It is the canonical procedure; when this guide and
`MCP.md` ever diverge, **`MCP.md` wins** (it is the source of truth; this guide is the operator's
checklist).

## Prerequisites (already true for this repo)

- **Unity 6** (`6000.0.x`, pinned in `ProjectSettings/ProjectVersion.txt`). Unity MCP needs
  `6000.0` or later; DRIFT is on the right line. Source: `MCP.md` Prerequisites.
- **`com.unity.ai.assistant`** is committed in `Packages/manifest.json` (`2.12.0-pre.2`). Unity
  resolves it on first open — no manual Package Manager step. If Package Manager hides the
  pre-release, enable **Project Settings → Package Manager → Enable Pre-release Packages** (the
  explicit pin still resolves regardless). Source: `MCP.md` Prerequisites.
- An MCP client: **Cursor** (this repo's default) or Claude Code / Windsurf / Claude Desktop.

## Step 1 — Confirm the Unity Bridge is running

1. Open this repo as a Unity project; let Package Manager finish resolving.
2. **Edit → Project Settings → AI → Unity MCP Server.**
3. Under **Unity Bridge**, confirm **Running** (green). It auto-starts when the Editor loads; if it
   shows **Stopped**, click **Start**.
4. On first start, Unity installs the relay binary to `~/.unity/relay/`. AI clients launch this
   executable to talk to the Editor.

Source: `MCP.md` Step 1.

## Step 2 — Configure the client

**Recommended (auto):** in the same settings page, expand **Integrations**, pick **Cursor**, click
**Configure**. Unity writes the correct relay path into Cursor's MCP config for you. This is
preferred because the relay binary lives under the home dir and differs per-OS — let Unity fill it in
rather than hand-editing absolute paths. Source: `MCP.md` Step 2.

**Manual (only if auto-config fails):** add a server entry pointing at the relay binary for your
platform. Copy the exact JSON from **Integrations → Example Configuration** at the bottom of the
settings page; it bakes in your real home path. Template (see also `templates/mcp.json`):

```json
{
  "mcpServers": {
    "unity-mcp": {
      "command": "<HOME_ABSOLUTE_PATH>/.unity/relay/<RELAY_BINARY>",
      "args": ["--mcp", "--project-path", "<ABSOLUTE_PATH_TO_THIS_REPO>"]
    }
  }
}
```

Relay binary per platform (`~` may not be expanded by the client — use the absolute path):

| Platform | Relay executable |
|---|---|
| macOS (Apple Silicon) | `~/.unity/relay/relay_mac_arm64.app/Contents/MacOS/relay_mac_arm64` |
| macOS (Intel) | `~/.unity/relay/relay_mac_x64.app/Contents/MacOS/relay_mac_x64` |
| Windows | `%USERPROFILE%\.unity\relay\relay_win.exe` |
| Linux | `~/.unity/relay/relay_linux` |

- `--mcp` is required (it tells the relay to act as an MCP server).
- `--project-path` (or the `UNITY_PROJECT_PATH` env var) targets *this* Editor instance — useful
  when multiple Unity projects are open at once.

Source: `MCP.md` Step 2.

### What the committed `.cursor/mcp.json` actually is

The repo's `.cursor/mcp.json` is an **example**:

```json
{
  "mcpServers": {
    "unity-mcp": {
      "command": "C:\\Users\\jzfer\\.unity\\relay\\relay_win.exe",
      "args": ["--mcp"],
      "env": {}
    },
    "n8n-voyze": { "type": "http", "url": "https://n8n.voyze.ai/mcp-server/http" }
  }
}
```

Note three things:
1. The `command` path is **one machine's** Windows home path — wrong on every other machine.
2. Its `args` are just `["--mcp"]` (no `--project-path`) — fine for a single open project; add
   `--project-path` if you run several.
3. There's an unrelated `n8n-voyze` HTTP server alongside; leave it alone — it isn't the Unity
   bridge.

### The no-commit rule (Hard Rule #3)

`MCP.md` is explicit: *"We deliberately do not commit a repo-level `.cursor/mcp.json`: the relay
path is home-dir- and OS-specific, so a checked-in absolute path would be wrong on every other
machine and Cursor would spawn a missing binary. Use the auto-config (writes your global
`~/.cursor/mcp.json`) or the per-machine manual template above."*

So: prefer Unity's auto-config (it writes the **global** `~/.cursor/mcp.json`), or the manual
per-machine template. **Do not** treat the committed `.cursor/mcp.json` path as authoritative, and
**do not** commit a corrected relay path back into the repo. (This Guardian only writes under `agents/`
and `.claude/` — never under `.cursor/`.)

## Step 3 — Approve the connection (first time only)

When the client connects the first time, **Project Settings → AI → Unity MCP Server → Pending
Connections** shows the client. Click **Allow**. Approved clients reconnect automatically afterward.
Source: `MCP.md` Step 3.

## Step 4 — Smoke test (the gate)

Verify the client lists Unity tools, then run the design doc's Weeks 1-2 checks. Full detail in
`guides/03-driving-the-editor.md`. In short: read the console, then "create a cube" — if it appears
in the Hierarchy, the agent → Editor loop works. Source: `MCP.md` Step 4, GDD §14 milestone.

## Wiring done — what next

Bridge Running + client configured + connection Allowed + cube in Hierarchy = wired. Now the agent
can help stand up the Tier 0 gray-box: go to `guides/04-scene-assembly.md` (MCP-driven) or
`guides/07-editor-scripts-vs-mcp.md` (menu-command-driven, the deterministic path). If anything
above fails, see `guides/09-troubleshooting.md`.
