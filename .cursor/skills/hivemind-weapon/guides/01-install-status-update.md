# 01 - Install, status, and update

Hivemind manages its own wiring into each assistant. Do NOT hand-edit a harness `hooks.json` or settings file to add memory; that fights the installer. Use the CLI.

## Check what is wired

```bash
hivemind status          # version, login state, and which assistants are wired
hivemind whoami          # current user org, workspace, API endpoint
```

`status` lists each detected assistant and its config directory (for example `claude C:\Users\<user>\.claude`).

## Install / wire up assistants

```bash
hivemind install                         # auto-detect every assistant and wire each
hivemind install --only claude,codex,cursor   # scope to specific assistants
hivemind install --skip-auth             # headless: wire without the consent prompt
hivemind install --token <value>         # or env HIVEMIND_TOKEN, for CI / scripted installs
```

Supported assistant keys: `claude`, `codex`, `claw`, `cursor`, `hermes`, `pi`.

Per-assistant control:

```bash
hivemind claude install | uninstall
hivemind codex  install | uninstall
hivemind cursor install | uninstall
```

## Login

```bash
hivemind login           # device-flow login, opens a browser
```

A TTY install shows a consent prompt; a headless install skips auth and prints a hint to run `hivemind login`.

## Update

```bash
hivemind update            # upgrade the CLI from npm and refresh every wired agent bundle
hivemind update --dry-run  # check for a newer @deeplake/hivemind without changing anything
```

One command upgrades the CLI and re-wires all detected agents, so run `hivemind update` rather than reinstalling piecemeal.

## Remove

```bash
hivemind uninstall                  # remove from every detected assistant
hivemind uninstall --only cursor    # scope the removal
```

`uninstall` is state-changing and stops memory capture for that assistant. Confirm with the user first.

## Current machine baseline (verify with `hivemind status`)

As wired on this machine: `claude`, `codex`, and `cursor` are all detected and logged in on hivemind 0.7.101. The usual task is to confirm or refresh that wiring with `hivemind status` then `hivemind update`, not to install from scratch.
