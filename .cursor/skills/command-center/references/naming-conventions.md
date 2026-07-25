# Naming Conventions for Guardians and Weapons

The Guardian/Weapon pair is the atomic unit of the roster. Their names are how the primary Cursor agent, the Dungeon Master routing skill, and the rest of the pipeline locate them. Bad names cause silent failures (the router can't find the Guardian) or drift (two Guardians with overlapping scope). Take naming seriously.

---

## Guardian (subagent) names

**Format rules:**

- All lowercase.
- Hyphens only as separators. No spaces, underscores, or camelCase.
- Must end in `-guardian`.
- Between 2 and 4 words before the `-guardian` suffix. `security-guardian` (good). `ultra-advanced-cloud-native-kubernetes-guardian` (too long — pick the domain, not the stack).

**Semantic rules:**

- Name the Guardian after the **domain** it owns, not the action it performs. `database-guardian`, not `query-writer-guardian`.
- Avoid adjectives that don't narrow the domain. `fast-security-guardian` vs. `security-guardian` — cut the "fast".
- If two candidate Guardians would legitimately overlap, pick the narrower scope for each and let Dungeon Master route based on the task.

**File location:**

```
ai-tools/agents/<guardian-name>.md
```

Example: `ai-tools/agents/security-guardian.md`.

---

## Weapon (skill) names

**Format rules:**

- All lowercase.
- Hyphens only.
- Must end in `-weapon`.
- Mirror the Guardian name: `security-guardian` → `security-weapon`. The suffix is the only differentiator.

**File location:**

```
ai-tools/skills/<weapon-name>/SKILL.md
```

Example: `ai-tools/skills/security-weapon/SKILL.md`.

---

## Command Brief file name

The Command Brief for each Guardian/Weapon pair lives in `ai-tools/command-briefs/` at the repo root and follows this format:

```
ai-tools/command-briefs/<guardian-name>-command-brief.md
```

Example: `ai-tools/command-briefs/security-guardian-command-brief.md`. The brief uses the Guardian name (with the `-guardian` suffix) because the brief is primarily about the Guardian; the Weapon inherits from it.

---

## Collision and edge cases

- **Existing name.** Before finalizing, check `ai-tools/agents/` for the proposed Guardian name and `ai-tools/skills/` for the proposed Weapon name. If either exists, either pick a different name or confirm with the user that you're intentionally overwriting.
- **Near-duplicates.** `security-guardian` and `security-audit-guardian` are too close. Force a disambiguation: perhaps `security-guardian` (broad scope) and `pentest-guardian` (narrower). Or collapse to one.
- **Legacy names.** If porting from another system, rename to fit the convention rather than preserving the old name. Consistency matters more than history here.

---

## Examples of good and bad names

| Guardian proposal | Verdict | Reason |
| --- | --- | --- |
| `security-guardian` | Good | Domain-scoped, correct suffix. |
| `ux-ui-guardian` | Good | Two-word domain is fine. |
| `fix-my-bugs-agent` | Bad | No `-guardian` suffix, vague action-based name. |
| `Security Guardian` | Bad | Capitalization and space. |
| `security_guardian` | Bad | Underscore. |
| `the-security-guardian` | Bad | Leading article adds no information. |
| `database-migration-guardian` | OK | Acceptable if the Guardian is specifically for migrations; otherwise prefer `database-guardian`. |

If in doubt, propose two or three names to the user and let them choose — the collaborative act of naming often clarifies scope on its own.
