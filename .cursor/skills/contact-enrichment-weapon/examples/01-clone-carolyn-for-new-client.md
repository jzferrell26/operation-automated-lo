# Example 01 - Clone Carolyn's Enrichment for a New Client (Happy Path)

Demonstrates the full canonical pipeline and all seven critical directives. Illustrates `guides/00-principles.md`, `guides/01-batched-loop.md`, `guides/02-rate-limit-throttle.md`, `guides/03-waterfall-design.md`, `guides/04-normalize-merge.md`, `guides/05-ghl-typed-writeback.md`, and `guides/06-idempotency-dedupe.md`.

## Input (what the Guardian receives)

> "Clone Carolyn's enrichment workflow for a new client, Acme Co. Source is a GHL list of ~4,000 contacts. Providers, in order: ProviderA, then ProviderB, then ProviderC. GHL location is `loc_acme`. Target fields: `company_size` (SINGLE_OPTIONS), `last_funding_date` (DATE), `linkedin_url` (text). One-off run for now, but they will want it quarterly later."

## Design walkthrough (what the Guardian produces)

### Step 0 - Confirm inputs and route unknowns

Field types are given. The fieldKeys for `company_size`, `last_funding_date`, `linkedin_url` and the exact SINGLE_OPTIONS option values for `company_size` are NOT given. Hand those to gohighlevel-guardian before building (`guides/05-ghl-typed-writeback.md`). Note the future quarterly cadence so idempotency is built in now (`guides/06-idempotency-dedupe.md`).

### Step 1 - Dedupe gate, then batched loop

- Dedupe the 4,000 contacts on the GHL contact id and skip any already flagged enriched (`guides/06`). This is the "already enriched" gate.
- Lay the Loop Over Items node. Provider calls + waterfall + normalize hang off the `loop` output; GHL write-back off the `done` output (`guides/01`).
- Batch Size: ProviderA caps at 60 requests/min and GHL is more tolerant, so ProviderA is the stricter limit. Start Batch Size at 50 with a Wait, tune on 429 (`guides/02`).

### Step 2 - Throttle

After each provider call, add a Wait node ("Resume -> After Time Interval") back to the loop. Document the 429 rule in the workflow notes: "on 429, increase Wait or reduce Batch Size" (`guides/02`).

### Step 3 - Three-provider waterfall

- Call ProviderA. IF a field is filled with confidence, keep it and tag `_source = ProviderA`. Route ONLY the misses to ProviderB (`guides/03`).
- ProviderB fills more; tag `_source = ProviderB`. Route remaining misses to ProviderC.
- Stop on first confident hit per field; no later provider overwrites an earlier confident value.
- Three providers sits in the 82-88% coverage band, inside the three-to-four sweet spot. Do not add a fourth without a coverage reason.
- Add the email-verify gate after the waterfall, before write-back.

### Step 4 - Normalize and merge

- Set node on both branches: lowercase + trim the GHL contact id used as the match key (`guides/04`).
- Merge: Combine -> Matching Fields -> Enrich Input 1 (base contact = Input 1).
- Map `company_size` provider output (e.g. `"51-200"`) onto the exact GHL option value confirmed by gohighlevel-guardian.

### Step 5 - Conditional overwrite, then typed write-back

- IF the GHL field is blank OR new `_confidence` is higher -> write; else skip (`guides/06`).
- Format `last_funding_date` to MM-DD-YYYY, no time, no `Z` (`guides/05`).
- Write `company_size` as the exact SINGLE_OPTIONS option value.
- Write `linkedin_url` as plain trimmed text.
- Write `_source`, `_enriched_at`, `_confidence` companion fields.

### Step 6 - Quarterly cadence

Because they will want it quarterly, the idempotency gates make the scheduled re-run safe: data decays ~22.5-30%/yr, so a quarterly audit flagging records older than six months is the right cadence (`guides/06`).

### Step 7 - If edited via MCP, rebind

If any of this was applied through the n8n MCP, re-bind credentials on every touched node and verify in the UI (`guides/07`).

## Outcome

A cloned, batched, throttled, three-provider waterfall with normalized merge, conditional typed write-back, full provenance, and a re-run-safe gate ready for the quarterly schedule. No directive skipped.
