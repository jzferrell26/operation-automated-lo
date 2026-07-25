# Research Summary: contact-enrichment-weapon

- **Depth tier consumed:** normal
- **Time window covered:** 2026-06-29 back to ~2026-01 (6 months) for practitioner content; n8n and GoHighLevel canonical docs treated as version-current/evergreen. Window NOT extended beyond 12 months.
- **Files written:** 11 total in `research/` (8 per-source notes + research-plan.md + index.md + this summary). All eight per-source notes sit flat in `research/` (count under the ~10 subfolder threshold).
- **Tools used:** WebSearch + WebFetch only. Firecrawl and Exa were not connected for this run. The live n8n MCP server was available but not needed (the official docs supplied the node mechanics). The official n8n docs HTML 404s the fetcher; the documented `<path>.md?ask=...` interface was used successfully for the rate-limits page.

## Query coverage
All five Command-Brief queries are covered, plus two loremaster refining queries (rate-limit/Merge focus, and the GHL DATE no-`Z` grounding). See index.md for the query-to-file map.

## The 5 most influential sources
1. **Waterfall Enrichment (Unify)** - `2026-06-29-waterfall-enrichment-unify.md`. The authoritative design of the provider-fallback waterfall: stop-on-first-confident-match, only-pass-misses-downstream, per-field source attribution, email-verify gate, 3-4 provider sweet spot. Directly drives the weapon's waterfall guide and the provenance directive. weapon-forge should treat this as the spine of `guides/waterfall-design.md`.
2. **n8n Split in Batches node (official)** - `2026-06-29-n8n-splitinbatches-node.md`. The batched-loop primitive: Batch Size, loop/done outputs, `noItemsLeft`/`currentRunIndex`, the infinite-loop caveat. Skeleton for the entire workflow; provider+waterfall+normalize hang off the loop output, write-back off the done output.
3. **GHL DATE-type field format (official support)** - `2026-06-29-ghl-date-field-format.md`. Grounds the brief's #1 critical directive: DATE fields take MM-DD-YYYY or DD-MMM-YYYY, no time/timezone, no trailing `Z`. The external backing for the typed-write-back guide's DATE section.
4. **Lead enrichment workflow / idempotency (Bitscale)** - `2026-06-29-idempotency-dedupe-bitscale.md`. Dedupe-before-enrich, conditional overwrite ("blank OR higher confidence"), enrichment-metadata companion fields, re-enrichment cadence. The spine of the idempotency/re-run-safety guide.
5. **n8n Merge node (official)** - `2026-06-29-n8n-merge-node.md`. "Combine -> Matching Fields -> Enrich Input 1" is the normalize/merge recipe; the doc's silence on key normalization makes the normalize-before-merge step a thing the weapon must teach, not assume.

## Open questions that survived the research (for the USER / design-time, not for weapon-forge to invent)
1. **Exact SINGLE_OPTIONS write behavior is not confirmed by public GHL docs.** The brief asserts a written value must exactly match a configured option value or it writes blank/errors. GHL's public support and API docs confirm the field types exist but do NOT document the exact-match/value-vs-label rule. This is asserted by the Command Brief + Cuantico prior art only. RESOLVE via gohighlevel-guardian at design time (per the brief's lane boundary).
2. **The exact GHL Custom Fields V2 API request-body JSON shape** (field key vs fieldId, the customFields array element shape for DATE and SINGLE_OPTIONS) was not extractable: the marketplace docs page is JS-rendered and returned only its intro to the fetcher. This is gohighlevel-guardian's lane; the weapon should reference it, not re-derive it.
3. **Idempotency key choice remains per-workflow** (GHL contact id vs email/domain vs a Data-Table dedupe gate). The brief defaults to GHL contact id + a Data-Table "already enriched" gate; practitioner sources default to email+domain. Confirm per engagement.
4. **Specific enrichment providers and their waterfall order are per-client** (deliberately left provider-agnostic by the brief). Not a research gap - a design-time input.

## Sources weapon-forge should re-fetch with deeper context
- **GHL Custom Fields V2 API** (`marketplace.gohighlevel.com/docs/ghl/custom-fields/custom-fields-v-2-api` and its sub-pages): re-fetch with a JS-capable tool or via gohighlevel-guardian to capture the exact request-body JSON and the SINGLE_OPTIONS option-value rule. This is the one materially incomplete primary source.
- The **Cuantico internal prior art** (Grant LaViale n8n workflow `O736werRK9B8cPNa`, plus the Carolyn / Cuantico enrichment clones) is the authoritative internal reference for the silent-blank DATE/SINGLE_OPTIONS failure mode and the credential-rebind-after-MCP-update gotcha. It lives in the n8n instance, not on the public web, so it was not fetched here; weapon-forge should pull it from the live instance (or via n8n-workflow-guardian / gohighlevel-guardian) when building the guides.

## Note on the credential-rebind directive
Command Brief ACTION step 6 / CRITICAL DIRECTIVE 4 (the n8n MCP strips credential bindings on update; re-bind and verify after any MCP edit) is an internal Cuantico operational gotcha, not a topic with public 2026 literature. No external source addresses it. It is owned by n8n-workflow-guardian per the brief and documented in the user's MEMORY (reference_n8n_mcp_strips_credentials). weapon-forge should source it from that internal reference, not the web.
