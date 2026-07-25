# Guide 07 — Wiki Sync Contract

Explains the relationship between a repository's `library/` folder and the suite-level `guild-wiki/` Obsidian vault.

---

## The core rule

**Per-repo `library/` is the source of truth. `guild-wiki/` is derived.**

Never edit files inside `guild-wiki/<repo>/library/`. They are overwritten by `guild-sync` on every run.

---

## How the sync works

`guild-sync` (at `guild-suite/scripts/guild-sync.ts`) mirrors markdown files from each repo's `library/` into a matching folder inside `guild-wiki/`:

```
<repo>/library/**/*.md  --[guild-sync]-->  guild-wiki/<repo>/library/**/*.md
```

Special cases:
- `guild-shim/`: root architecture `.md` files mirror to `guild-wiki/guild-shim/library/knowledge-base/architecture/`
- `guild-shared/standards/`: mirrors to `guild-wiki/guild-shared/library/standards/`

---

## v2 path mapping in the wiki

The wiki mirrors v2 paths exactly. No path transformation is needed: the wiki layout matches the repo layout.

```
<repo>/library/knowledge/public/overview/what-is-X.md
  -> guild-wiki/<repo>/library/knowledge/public/overview/what-is-X.md

<repo>/library/requirements/backlog/prd-007-user-export/prd-007-user-export-index.md
  -> guild-wiki/<repo>/library/requirements/backlog/prd-007-user-export/prd-007-user-export-index.md
```

---

## Injected frontmatter

Every mirrored file gets these fields prepended:

```yaml
---
# DO NOT EDIT — this file is synced from <repo>/library/path/to/file.md
source: "<repo>/library/..."
synced_at: "<ISO timestamp>"
---
```

---

## Running the sync

From `guild-suite/`:

```bash
pnpm guild-sync                 # incremental (only changed files)
pnpm guild-sync --full          # force re-copy everything
pnpm guild-sync --status        # health report (all repos should show OK)
pnpm guild-sync --watch         # file-watch mode (opt-in for dev sessions)
```

---

## What `library-guardian` does

- Writes to per-repo `library/` folders (the sources of truth).
- Never touches `guild-wiki/`.
- When a user asks to "update the wiki", interpret that as updating the source `library/` and instructing them to run `pnpm guild-sync`.

---

## Pre-commit hook

The pre-commit hook in `guild-suite` runs `pnpm guild-sync` automatically when any `**/library/**/*.md` is staged. This includes staging the updated wiki files in the same commit.

Bypass: `SKIP_LEGION_SYNC=1 git commit -m "..."`

---

## Wiki vs entity wiki

```
guild-wiki/<repo>/
  library/    <- library/ mirror (populated by guild-sync)
  wiki/       <- code entity extraction (populated by wiki-guardian, future)
```

`guild-sync` only touches `library/`. The `wiki/` subfolder is managed by `wiki-guardian` independently.

---

## Stale cleanup

`guild-sync` automatically removes wiki mirror files when the source file no longer exists. This handles migrations (e.g., when v1 paths were renamed to v2 — old wiki entries are pruned on next `--full` run).
