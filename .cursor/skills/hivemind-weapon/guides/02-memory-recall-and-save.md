# 02 - The daily loop: recall before, persist after

This is the workflow the always-on `hivemind-memory` rule asks every Guardian to run.

## Recall (before non-trivial work)

Route the query to the right tier (see `00-principles.md`).

### Time-based ("last week", "since X", "what is recent")

```bash
cat ~/.deeplake/memory/index.md
```

Read the most-recent rows. Trust the `Last Updated` column over any `Started:` line in a summary body.

### Keyword / topic recall

```bash
grep -r "keyword" ~/.deeplake/memory/summaries/
```

Use the **Bash tool** for this. On this mount the Bash hook routes `grep -r` through hybrid lexical + semantic search, so synonyms and paraphrases match too. Then `cat` the top-matching summary to pull the answer.

### Raw transcript (fallback only)

```bash
grep -r "keyword" ~/.deeplake/memory/sessions/
```

Use sparingly. JSONL is verbose; only drill in for a specific quote or turn a summary is missing.

## Tool choice on the memory mount

- Use the **Bash tool** with `grep -r` / `cat` / `ls` / `head` / `tail`. Supported and fast.
- Do NOT use the built-in Grep tool on `~/.deeplake/memory/`; it is not supported there. Use Bash grep instead.
- Do NOT `grep` the memory root without a `summaries/` or `sessions/` suffix; it is too noisy and drowns the answer.
- Avoid bash brace expansion like `{1..10}` (not fully supported); spell out paths. Bash output is capped at 10 MB; avoid `for f in *.json; do cat $f` loops over the whole sessions dir.

## Resume a prior session ("pick up where I left off", "load that from hivemind")

The resume target is the most recent session summary for the CURRENT project.

1. `cat ~/.deeplake/memory/index.md` and take the newest rows whose `Project` matches this repo (or `ls -t ~/.deeplake/memory/summaries/<username>/` for the latest files).
2. `cat` the newest matching summary. If its `## Next Steps` (or older `## Open Questions / TODO`) is empty or says "none", move to the next-newest until you find real open work.
3. Load THAT summary as context, then RECONCILE with the current git state (branch, uncommitted changes) before acting; the summary can be stale.
4. Tell the user where they left off and confirm before continuing. Do not silently execute the next step.
5. Do not bulk-read `sessions/`; drill into raw JSONL only for a missing detail.

## Persist (after meaningful work)

Hivemind captures session content automatically on every wired assistant, so the durable way to "save to hivemind" is to make the fact explicit in the session: state the decision, the file touched, and the outcome in plain text so it lands in the summary. For machine-local, non-cloud notes, use the built-in harness memory instead (for example `~/.claude/` auto-memory).

When the user says "save this to hivemind" or "remember this", confirm the key facts back in one or two sentences (so they are captured cleanly), and note anything that should NOT be persisted for privacy.
