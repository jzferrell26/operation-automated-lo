# 08 - Phase 4: dm-registrar

Step 9 of the Command Brief's ACTION list. After the Guardian file is written, invoke the `dm-registrar` skill to register the Guardian with Dungeon Master's roster.

## What `dm-registrar` does

`dm-registrar` is the Phase 4 (final pipeline phase) worker skill. It is documented at:

- `ai-tools/skills/dungeon-master-registrar/SKILL.md` (repo-local copy)
- `~/.cursor/skills-cursor/dm-registrar/SKILL.md` (global Cursor skills cache)

The skill performs exactly two atomic operations:

1. **Add a roster row** to the Roster table in `ai-tools/skills/dungeon-master/SKILL.md`. The row contains the Guardian name, a one-line domain summary, trigger keywords, and a link to the new Guardian's guide.
2. **Author a guide file** at `ai-tools/skills/dungeon-master/guides/<guardian-name>.md` from the template `ai-tools/skills/dungeon-master/templates/guide-template.md`. The guide is the orchestrator's reference for when to invoke the Guardian.

After Phase 4, the new Guardian is discoverable. The primary Cursor orchestrator can route to it by reading Dungeon Master's roster.

## Inputs `dms-hand` passes to `dm-registrar`

`dm-registrar` reads from disk; `dms-hand` tells it where:

- The Guardian name.
- The Weapon name.
- The Command Brief path: `ai-tools/command-briefs/<guardian-name>-command-brief.md`.
- The Guardian file path: `ai-tools/agents/<guardian-name>.md`.
- The Weapon folder path: `ai-tools/skills/<weapon-name>/`.

The skill discovers everything else by reading these inputs.

## Expected output

After `dm-registrar` completes, the following MUST exist:

1. A new row in the Roster table in `ai-tools/skills/dungeon-master/SKILL.md`. The row appears in alphabetical-by-Guardian-name order or appended to the bottom of the table (per `dm-registrar`'s own convention; check the skill's SKILL.md for the rule).
2. A new file at `ai-tools/skills/dungeon-master/guides/<guardian-name>.md` populated from the template.

`dms-hand` verifies:

1. Search `ai-tools/skills/dungeon-master/SKILL.md` for the new Guardian's name. There should be exactly one match (the new roster row).
2. Verify `ai-tools/skills/dungeon-master/guides/<guardian-name>.md` exists and is non-empty.
3. The guide file has all six standard sections from the template (Domain, Trigger phrases, Do NOT route when, Inputs the Guardian needs, Outputs the Guardian produces, Multi-Guardian sequences this Guardian participates in, Critical directives the orchestrator should respect).
4. The Dungeon Master SKILL.md's "N Guardians registered" count (in the footnote below the table) is incremented by 1.

If any check fails, STOP and route to `guides/10-failure-modes.md` under "dm-registrar failed."

## Roster row authoring rules

The roster table in `dungeon-master/SKILL.md` has four columns:

| Column | Content |
|---|---|
| Guardian | The `name:` frontmatter value of the Guardian, in backticks, e.g. `` `nextjs-guardian` `` |
| Domain | One sentence summarizing the Guardian's scope. Distilled from the Command Brief's IDENTITY & RESPONSIBILITY. |
| Trigger keywords | A semicolon-separated list of trigger phrases, each in double quotes, e.g. `"build a website", "scaffold a Next.js site"` |
| Guide | A markdown link to the guide file, e.g. `[guides/nextjs-guardian.md](guides/nextjs-guardian.md)` |

`dm-registrar` authors this row from the Command Brief and the Guardian file's `description` frontmatter field.

## Dungeon Master-side guide file authoring rules

The guide is authored from `ai-tools/skills/dungeon-master/templates/guide-template.md`. The template has placeholders that `dm-registrar` substitutes:

- `{{Guardian Display Name}}` -- the H1 display name from the Guardian file.
- `{{guardian-name}}` -- the kebab-case Guardian name.
- `{{weapon-name}}` -- the kebab-case Weapon name.
- `{{proactive | on-demand}}` -- the trigger policy from the Guardian file's frontmatter.
- The Domain paragraph -- distilled from IDENTITY & RESPONSIBILITY (3-5 sentences).
- The Trigger phrases bullet list -- 3 to 7 phrases the user might say to invoke the Guardian.
- The Do NOT route when section -- 2 to 4 anti-trigger phrases or competing Guardians.
- The Inputs / Outputs / Multi-Guardian sequences / Critical directives sections -- lifted from the Command Brief and Guardian file.

## Failure modes specific to this phase

- **Roster row appears twice.** Indicates a partial prior run wrote one row and the current run wrote another. Manual cleanup; remove the older one.
- **Guide file already exists.** Same diagnosis. Either the prior run partially completed, or there is a genuine name collision (which `guides/03-naming-contracts.md` should have caught). Surface for the caller.
- **The Roster table's "N Guardians registered" count is wrong.** Minor footnote error. Flag in the final report; manual fix is a one-line edit.

## Why this phase runs last

`dm-registrar` makes the Guardian discoverable by the orchestrator. Before this phase, the Guardian exists on disk but nothing routes to it. Once this phase completes, the next user request that matches the Guardian's domain will trigger it.

The pipeline ends here. `dms-hand`'s remaining work is administrative (close-out, report), not Guardian-forging.

## Implementation note for `dms-hand`

Like the prior phases, Phase 4 is a skill load. `dms-hand` reads `ai-tools/skills/dungeon-master-registrar/SKILL.md` and follows its instructions to add the roster row and author the guide.
