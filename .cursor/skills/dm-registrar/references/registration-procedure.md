# Registration Procedure — long form

This is the careful, edge-case-aware version of Steps 2–4 of dm-registrar's SKILL.md. Read it when the simple flow doesn't apply — duplicate names, missing templates, malformed roster tables, or registrations that require touching the orchestration section.

---

## Reading Dungeon Master's SKILL.md

Dungeon Master's SKILL.md is the source of truth for the roster. Read it end to end before editing; don't pattern-match on a fragment.

Look for these landmarks in order:

1. The YAML frontmatter — confirms you're editing the correct skill.
2. A heading named **Roster** (or close variants like "## The Roster", "## The Roster — N Active Guardians", "## Active Guardians"). The first markdown table after that heading is the roster.
3. A heading named **Multi-Guardian orchestration** (or variants like "## Orchestration sequences", "## Known sequences"). The content under it lists ordered Guardian sequences.
4. A heading named **How to use this skill** or **Adding a new Guardian**. These document the conventions the file expects you to follow — read them before editing.

If Dungeon Master's SKILL.md is missing any of these landmarks, do not try to invent them. Stop and ask the user how to proceed — the host's Dungeon Master skill may be a different version than this registrar assumes.

---

## Identifying the roster table

The roster table is markdown with these typical columns:

- **Guardian** — the guardian name as inline code.
- **Domain** — a short prose summary.
- **Trigger keywords** OR **Proactive?** OR **Key handoffs** — varies by version.
- **Guide** — a relative link to `guides/<guardian>.md`.

If the column count or names differ from what's shown in this registrar's SKILL.md, match the file's actual structure. Do not reformat the table to match this registrar's assumptions — preserve the host's conventions.

---

## Adding the new row safely

Use the Edit tool to add a single new row. The safest pattern is:

1. Find the last existing row in the roster table (by reading the file).
2. Edit by replacing that last row with itself plus the new row appended.
3. Re-read the file and confirm the table renders correctly.

If the rows look sorted alphabetically, insert in alphabetical order instead of appending. If they look sorted by registration date (oldest first), append. If you can't tell, append.

Never use `replace_all` for table edits — it's too easy to clobber unrelated rows that happen to share a prefix.

---

## Authoring the guide file

The guide is created by reading `ai-tools/skills/dungeon-master/templates/guide-template.md` and substituting every `{{placeholder}}` with content derived from the three source artifacts (Command Brief, Weapon SKILL.md, Guardian file).

### Sourcing each placeholder

- **`{{Guardian Display Name}}`** — Title Case the guardian name with the suffix capitalized normally: `seo-guardian` → `SEO Guardian`, `ux-ui-guardian` → `UX/UI Guardian`. If unsure, ask the user.
- **`{{guardian-name}}`** — the slug as it appears in the guardian file's frontmatter.
- **`{{weapon-name}}`** — the slug of the paired weapon folder.
- **Domain paragraph** — pull from the Command Brief's IDENTITY & RESPONSIBILITY section, tighten to 3–5 sentences. Drop any meta-commentary; the orchestrator needs only what the Guardian owns.
- **Trigger phrases** — extract 3–5 from the Guardian file's `description` frontmatter field. Each should be a phrase a user would actually say.
- **Do NOT route when** — look for "Do not invoke for X" in the Guardian description, plus any negative scope statements in the Command Brief's IDENTITY & RESPONSIBILITY ("It does not write content, pick keywords, …"). State the competing Guardian by name where possible.
- **Inputs the Guardian needs** — restate the Command Brief's EXPECTED INPUT bullets, with "if absent, …" notes for optional ones.
- **Outputs the Guardian produces** — restate EXPECTED OUTPUT, naming format + destination.
- **Multi-Guardian sequences** — only fill if the Guardian file's procedure or critical directives names other Guardians, or if the Command Brief explicitly mentions handoffs. Otherwise write "None yet — this Guardian currently runs standalone."
- **Critical directives** — top 2–3 from the Guardian file. Don't duplicate the full list; link to the Guardian file for the rest.
- **Trigger policy** — copy the Guardian file's `proactive:` frontmatter value.

### Path normalization

If Dungeon Master's template still uses `guild/.cursor/` notation, normalize when filling in:

- `guild/.cursor/agents/<guardian>.md` → `ai-tools/agents/<guardian>.md`
- `guild/.cursor/skills/<weapon>/` → `ai-tools/skills/<weapon>/`
- `guild/<guardian>-command-brief.md` → `ai-tools/command-briefs/<guardian>-command-brief.md`

Relative links inside the guide (which lives at `ai-tools/skills/dungeon-master/guides/<guardian>.md`):

- to the Guardian file: `../../agents/<guardian>.md`
- to the Weapon folder: `../../skills/<weapon>/`
- to the Command Brief: `../../../command-briefs/<guardian>-command-brief.md`

---

## Updating Multi-Guardian orchestration

Default: leave it alone. Multi-Guardian sequences are domain decisions the user should be involved in.

Update only when at least one of these is true:

1. The Command Brief's IDEAS, SUGGESTIONS, QUESTIONS or NOTES section explicitly names the sequence.
2. The Guardian file's Procedure or Critical directives section names upstream or downstream Guardians (e.g., "after this Guardian runs, hand off to `quality-guardian`").
3. The user has told you which sequence to add the Guardian to.

When updating, preserve the existing sequence structure. Add the Guardian as a new numbered step, or extend an existing list. Never reorder existing sequences without asking.

---

## Edge cases

### The Guardian was already registered

If a roster row exists with a guide file behind it, the Guardian is already in the system. Tell the user:

> "`<guardian-name>` is already registered in Dungeon Master's roster — guide at `ai-tools/skills/dungeon-master/guides/<guardian-name>.md`. No action taken. If you want to refresh the guide (e.g., the Guardian's description or directives changed), confirm and I'll rewrite it."

Wait for explicit confirmation before re-authoring.

### A guide exists but no roster row points at it

This usually means a prior registration was half-finished. Show the user the orphan guide and ask whether to add a roster row, delete the guide, or rewrite from scratch.

### The Guardian file references a Weapon that doesn't exist

Stop. Don't register. Tell the user the Weapon folder is missing and route them to `/forge-weapon`.

### The Dungeon Master template is missing or empty

Tell the user Dungeon Master's `templates/guide-template.md` is missing or empty, and ask whether they'd like to author it first or proceed with a built-in fallback structure. Do not silently invent a guide structure.

### The roster table is missing or malformed

Stop. Tell the user the Roster table can't be parsed and offer to either fix it manually first or proceed with adding a section that this registrar can extend. Do not append rows to a broken table.

---

## Verification

After every edit, re-read the modified file and confirm:

- The new content is in the right location.
- Surrounding content was not accidentally altered.
- Markdown syntax is intact (table pipes, link brackets, code fences).

The done checklist in `done-checklist.md` is the full validation pass.
