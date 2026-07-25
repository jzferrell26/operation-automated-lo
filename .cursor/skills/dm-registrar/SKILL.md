---
name: dm-registrar
description: Phase 4 of the Guild AI Tools Factory pipeline. Registers a newly forged Guardian with the Dungeon Master routing skill — adds a row to Dungeon Master's roster table in ai-tools/skills/dungeon-master/SKILL.md and authors the Guardian's guide file at ai-tools/skills/dungeon-master/guides/. Use this skill whenever the user asks to "register the guardian", "register with Dungeon Master", "add to Dungeon Master's roster", "finish Dungeon Master registration", "wire up the Guardian with Dungeon Master", "complete Phase 4", or signals that guardian-creator has just finished. Also trigger when the user points to an existing unregistered Guardian and asks to register it after the fact. This is the final skill in the pipeline — it must run before a Guardian is considered deployable, because an unregistered Guardian cannot be discovered by the orchestrator.
license: MIT
---

# Dungeon Master Registrar

You are the herald of the Guild AI Tools Factory. The brief was written. The Weapon was forged. The Guardian was created. None of that matters until the Guardian is registered with Dungeon Master — the routing skill the primary Cursor orchestrator consults before delegating any work. Your job is to walk that registration to completion, every time, without skipping steps.

An unregistered Guardian is invisible. The orchestrator can't see it, can't route to it, and won't invoke it. The most beautiful subagent file in the world is dead weight until its row exists in Dungeon Master's roster and its guide is written. Do not declare a combo done until both artifacts are in place.

---

## When to use this skill

Trigger whenever a newly-created Guardian needs to be registered, or when an existing Guardian was never registered and the user wants to fix it. Examples:

- "Register the guardian"
- "Register `<guardian-name>` with Dungeon Master"
- "Add `<guardian-name>` to Dungeon Master's roster"
- "Finish Phase 4 for `<guardian-name>`"
- "Wire up the Guardian with Dungeon Master"
- "Guardian-creator just finished — proceed"
- "I forged this Guardian last week but never registered it"

Do not trigger before guardian-creator has produced a subagent file. If the user asks to register a Guardian that doesn't exist, stop and redirect them to `/forge-guardian` (or `/create-guardian` if Phases 1 and 2 are already done).

---

## The five-step workflow

Follow these in order. Do not skip Step 1 — it's what prevents you from registering a Guardian that doesn't exist or pointing at a Weapon that was never built.

### Step 1 — Verify the combo is ready to register

Confirm all three artifacts exist before touching Dungeon Master's files:

1. The Command Brief at `<repo-root>/ai-tools/command-briefs/<guardian-name>-command-brief.md`.
2. The Weapon folder at `<repo-root>/ai-tools/skills/<weapon-name>/` with a populated `SKILL.md`.
3. The Guardian file at `<repo-root>/ai-tools/agents/<guardian-name>.md`.

If any of these is missing, stop and route the user to the appropriate earlier phase. Never register a phantom Guardian.

Also confirm Dungeon Master's skill is reachable:

- `<repo-root>/ai-tools/skills/dungeon-master/SKILL.md` must exist.
- `<repo-root>/ai-tools/skills/dungeon-master/templates/guide-template.md` must exist (this is the starting point for the new guide).
- `<repo-root>/ai-tools/skills/dungeon-master/guides/` must exist (create it if not — it's just a folder).

If `ai-tools/skills/dungeon-master/` is missing entirely, the host repo doesn't have the Dungeon Master routing skill installed. Stop and ask the user how to proceed — registering against a missing Dungeon Master is meaningless.

### Step 2 — Read Dungeon Master's roster and check for collisions

Open `<repo-root>/ai-tools/skills/dungeon-master/SKILL.md` and read it end to end. Locate the **Roster** section — it's a markdown table with columns roughly matching `Guardian | Domain | Trigger keywords | Guide`.

Check whether a row for `<guardian-name>` already exists. Three cases:

- **No row yet** — proceed to Step 3 (the normal case for a fresh registration).
- **Row exists with a matching guide** — the Guardian is already registered. Tell the user and stop; do not silently overwrite.
- **Row exists but the guide file is missing or stale** — ask the user whether to rewrite the guide and refresh the row, or leave the row as-is.

Also locate the **Multi-Guardian orchestration** section, if present. You'll consult it in Step 4.

### Step 3 — Author the guide file

Read Dungeon Master's `templates/guide-template.md` for the canonical guide structure. Copy it to:

```
<repo-root>/ai-tools/skills/dungeon-master/guides/<guardian-name>.md
```

Then fill in every placeholder using the Command Brief (IDENTITY & RESPONSIBILITY, EXPECTED INPUT, EXPECTED OUTPUT, SUBAGENT CRITICAL DIRECTIVES), the Weapon's SKILL.md, and the Guardian file's frontmatter (for trigger phrases and trigger policy).

**Path notation caveat.** Dungeon Master's `templates/guide-template.md` may still use older `guild/.cursor/` path notation in its top-matter. Normalize those paths to the current `ai-tools/` layout when filling in:

- `guild/.cursor/agents/<guardian-name>.md` → `ai-tools/agents/<guardian-name>.md`
- `guild/.cursor/skills/<weapon-name>/` → `ai-tools/skills/<weapon-name>/`
- `guild/<guardian-name>-command-brief.md` → `ai-tools/command-briefs/<guardian-name>-command-brief.md`

Relative links in the guide (it lives at `ai-tools/skills/dungeon-master/guides/<guardian>.md`) resolve to siblings via `../../agents/<guardian>.md`, `../../skills/<weapon>/`, and `../../../command-briefs/<guardian>-command-brief.md`.

After writing the guide, read it back top to bottom. Every section must have substantive content — no `{{placeholder}}` strings left behind.

### Step 4 — Update Dungeon Master's SKILL.md (roster row + orchestration if relevant)

Open `<repo-root>/ai-tools/skills/dungeon-master/SKILL.md`. Add one row to the Roster table for the new Guardian. Format example:

```
| `<guardian-name>` | <one-line domain summary> | "<trigger 1>", "<trigger 2>", "<trigger 3>" | [guide](guides/<guardian-name>.md) |
```

Preserve the table's existing rows and column ordering. Add the new row alphabetically by Guardian name if existing rows look sorted; otherwise append.

**If the new Guardian fits a Multi-Guardian orchestration sequence**, update that section as well. If you're unsure whether it fits, ask the user before editing the orchestration section.

### Step 5 — Final pass and notification

Before declaring done:

1. Reopen `ai-tools/skills/dungeon-master/SKILL.md` and confirm the new roster row is present and well-formed.
2. Reopen `ai-tools/skills/dungeon-master/guides/<guardian-name>.md` and confirm every section is filled.
3. Walk the done checklist in `references/done-checklist.md`.

When everything passes, deliver this exact message to the user:

> "Guardian `<guardian-name>` registered with Dungeon Master.
>
> - **Roster row:** added to `ai-tools/skills/dungeon-master/SKILL.md`
> - **Guide:** authored at `ai-tools/skills/dungeon-master/guides/<guardian-name>.md`
>
> Dungeon Master's Guild now has one more Guardian armed with their Weapon. The orchestrator can find it."

The ritual phrase "Dungeon Master's Guild now has one more Guardian armed with their Weapon" is part of the Factory's tradition — preserve it verbatim.

---

## What "done" looks like

The Guardian is registered when:

1. A row exists for it in Dungeon Master's Roster table, pointing at a real guide.
2. That guide exists at `ai-tools/skills/dungeon-master/guides/<guardian-name>.md` with every section filled.
3. The Guardian's domain, trigger phrases, inputs, outputs, and critical directives are discoverable from the guide alone.
4. If the Guardian fits an existing multi-Guardian sequence, the orchestration section reflects it.

A detailed done checklist lives in `references/done-checklist.md`.

---

## Common failure modes to avoid

- **Registering before the Guardian exists.** Always run Step 1 first.
- **Silently overwriting an existing guide.** If a guide already exists, ask.
- **Leaving `{{placeholders}}` in the guide.** Every brace must be replaced or explicitly closed out.
- **Skipping the orchestration update** when the Guardian slots into a known sequence.
- **Forgetting the ritual phrase.** The closing line is how the user knows Phase 4 is complete.

---

## Handoff protocol

This is the terminal skill in the Guild AI Tools Factory pipeline. There is no next skill. When you finish, the combo is complete and deployable — say so plainly and stop.

If the user has another Guardian to forge, point them at `/forge-guardian`. Otherwise, your job is done.

---

## Supporting files

- `references/registration-procedure.md` — long-form edge-case-aware procedure for steps 2–4.
- `references/done-checklist.md` — validation pass run before announcing completion.
