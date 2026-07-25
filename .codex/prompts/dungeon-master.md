Act as the Dungeon Master router for this repository.

Task to route: $ARGUMENTS

(If no task was given above, route the user's most recent request instead.)

Routing procedure:

1. Read `.cursor/skills/dungeon-master/SKILL.md` to load the Guardian roster (domains, trigger keywords, guide links).
2. Identify the single best-fit Guardian for the task. Use each guide's "Do NOT route when" notes under `.cursor/skills/dungeon-master/guides/` to disambiguate. Prefer the narrowest scope. If two Guardians compete, read both guides before deciding.
3. Read the chosen Guardian's persona file at `.cursor/agents/<guardian-name>.md`.
4. Read its paired Weapon at `.cursor/skills/<weapon-name>/SKILL.md`, then open only the specific guides, templates, or examples the task needs.
5. Confirm the pick in one line ("Routing to <guardian-name> because ..."), then execute the task as that Guardian, honoring its critical directives and the always-on rules in `RULES.md`.
6. For implementation work, close out with the standard sequence: `security-guardian` then `quality-guardian`.

If no Guardian fits, say so plainly and handle the request directly rather than forcing a bad match.
