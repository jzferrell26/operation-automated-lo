# {target} parity gap analysis ({YYYY-MM-DD})

> Fill every placeholder. Delete this callout when done. No em dashes anywhere.

## Provenance

- **Target:** {competitor/reference product name + URL}
- **Compared against:** {our product name + URL}
- **Accounts/sessions:** {which accounts, which roles, which states}
- **Capture date:** {YYYY-MM-DD}
- **Capture method:** {interactive browser MCP / scripted Playwright + storageState / owner-assisted}
- **Supersedes:** {prior doc or spec this replaces as the parity bar, if any}
- **Reference corpus:** {path to the paired screenshot corpus}

## Part 1: Cross-cutting findings (optional)

Issues affecting every surface (e.g., perceived performance). Each with hard evidence and an impact/scope tag.

- **{finding}** ({CRITICAL/HIGH/MEDIUM}, {one-line-fix / architectural}): {behavior in your own words}. Evidence: {header value / request count / artifact}.

## Part 2: Per-surface gap tables

Repeat one table per surface. Use the six-column schema.

### {Surface name}

| surface | present-in-target | present-in-ours | severity | evidence-source | verification-state |
|---|---|---|---|---|---|
| {element} | {competitor behavior, your words} | {ours today} | {score/tier} | {live UI / openapi.json path / bundle flag / docs file} | {confirmed / single-state / docs-resolved / corrected / not-inspected} |

### Not inspected this pass (coverage-honesty ledger)

- {surfaces deliberately not captured; capture before building against them}

## Part 3: Phased build-order recommendation

Ranked by (impact x exposure) / effort. This is a RECOMMENDATION; the build decision routes to white-council-guardian and the PRD to library-guardian.

1. **P0 (immediate, cheap, high-impact):** {gaps}
2. **P1:** {gaps}
3. **Pn:** {gaps}

## Routing

- Strategy verdict (ship/iterate/watch/kill): white-council-guardian
- PRD authorship for a phase: library-guardian
- Any legal/forensic question surfaced: code-forensics-guardian
