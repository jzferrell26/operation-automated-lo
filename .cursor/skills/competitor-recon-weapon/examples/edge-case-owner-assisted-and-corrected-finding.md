# Example: edge case (owner-assisted capture + corrected finding + MIT-fork flag)

Two edge cases the happy path does not cover: capture when tooling is unavailable (Hard Rule 3), the corrected-finding discipline (Hard Rule 4), and an MIT-fork license flag (Hard Rule 6).

## Edge case A: owner-assisted capture (guide 02, tier 3)

### Scenario

A surface sits behind a plan tier the operator will not provision on a throwaway account, and no browser-automation tool can reach it lawfully.

### What to do

1. Do NOT fabricate the surface or silently skip it.
2. Ask the operator to log into their own authorized account and capture the specific screens, with a precise shot list (which surface, which states: empty, populated, each relevant role).
3. Receive the handed-over screenshots, file them into the corpus with provenance noting "owner-assisted capture" and the date.
4. In the gap table, findings from these captures carry the same verification-state discipline; if only one account state was captured, mark `single-state`, not `confirmed`.

### Rule demonstrated

3 (owner-assisted fallback). The coverage gap is closed by a human, and the provenance is explicit.

## Edge case B: the corrected finding (guide 05)

### Scenario

A settings tab looked absent on the first capture.

### The arc (record all of it)

1. First capture (trial account): tab ABSENT. Provisional finding, `verification-state: single-state`.
2. Second capture (re-billed/differently-provisioned account): tab PRESENT. Finding corrected; do not leave the stale "absent" claim in the report.
3. Public docs (`platform/subaccount-wallet.mdx`-style page): gate is MEMBERSHIP, not a bespoke flag. Finding refined; `verification-state: docs-resolved` (and `corrected`).

### Why it matters

Recording the first read as final would have produced a wrong gap ("competitor lacks billing") that misleads the PRD author and the strategy verdict. The corrected-findings log is a feature of the report, not an embarrassment to hide.

### Rule demonstrated

4 (verify across account states). This is the canonical Assistable billing-tab lesson.

## Edge case C: MIT-fork license flag (guide 06)

### Scenario

While mining the client bundle, you find the widget is an open-source fork under `github.com/competitor/chatwidget`, labeled MIT.

### What to do

1. Read the actual `LICENSE` copyright line: it names a THIRD party (e.g., "Rowy"), not the competitor.
2. Notice the README/branding describes an unrelated upstream product (e.g., "BuildShip"), while `package.json` names it `@competitor/chat-widget`. Three origins in one repo.
3. Flag this as a FACT in the report: "repo LICENSE names {third party}; README describes {unrelated upstream}; confirm reuse terms against the true upstream, not the fork's label."
4. Do NOT rule on whether reuse is lawful, and do NOT accuse. If it becomes a legal/forensic question, route to code-forensics-guardian (Hard Rule 7).

### Rule demonstrated

6 (license scope is per-artifact), 7 (route, do not render). This is the Assistable chat-widget fork worked example.
