# Research Summary: live-event-ops-weapon

Authored by loremaster (Phase 1.5). Handoff target: weapon-forge.

## Depth tier consumed
**normal** (confirmed from both the Command Brief YAML `research_depth: normal` and backlog entry 2). Budget target ~100 pages triaged to the authoritative core; 11 source files filed.

## Time window covered
2026-06-29 back to ~2025-12-29 (6 months). Not extended past 12 months. All sources are 2026-dated or living official docs current as of retrieval. Window was NOT capped short -- substantive material was available inside 6 months.

## Tooling used
- **WebSearch** (6 searches: 5 brief queries + 1 expansion for export/import/activate). Firecrawl and Exa are NOT connected in this workspace, as the dispatch noted.
- **WebFetch** for primary sources. The n8n docs HTML returns 404 to the fetcher (JS-rendered), so I used the documented docs query interface (`https://docs.n8n.io/<path>.md?ask=<question>`), which returns verbatim content plus the canonical `.md` URL. This is why source URLs in the files are the canonical doc pages.
- **Live n8n MCP server** (server id d228d0ab) for the authoritative `search_executions` / `get_execution` / `get_sdk_reference` tool schemas. I captured the schemas from the loaded tool definitions; I did NOT invoke them against the live instance (no client execution data was read -- not needed for research).

## Files written (11 sources, flat folder; under 10-per-topic so no subfolders needed)
- Official n8n docs (7): export/import, CLI commands, public REST API activate/deactivate, webhook test-vs-production URL, executions view/inspect/retry, Error Trigger/error-workflows, failed-run triage.
- n8n MCP tool reference (1): execution-monitoring tool shapes.
- Practitioner blogs (3): HatchWorks production best-practices/rollback, DEV 6-dimension production-readiness checklist, SRE School operational-runbook structure.

## Query coverage (all 5 brief queries hit, plus 2 expansions)
1. "n8n production deployment runbook operate verify rollback 2026" -> HatchWorks + DEV checklist + SRE School.
2. "live event automation workflow pre-flight checklist n8n 2026" -> DEV 6-dimension checklist (mapped to pre-flight).
3. "n8n workflow execution monitoring failed run triage 2026" -> executions doc + MCP tools + troubleshooting/triage + Error Trigger.
4. "operational runbook exact-command discipline escalation path 2026" -> SRE School runbook structure.
5. "n8n webhook trigger live event intake verification 2026" -> webhook test-vs-production-URL doc.
- Expansion A (rollback snapshot mechanics): export/import docs + CLI commands.
- Expansion B (activate/deactivate, non-deprecated): public REST API activate/deactivate (closed the CLI-deprecation gap).

## The 5 most influential sources (for weapon-forge)
1. **n8n public REST API activate/deactivate** (`2026-06-29-n8n-public-rest-api-activate-deactivate.md`) -- the clean, non-deprecated, headless `POST /api/v1/workflows/{id}/deactivate` is the rollback "stop intake" command. Matters because the CLI equivalent is deprecated in n8n 2.0 and a managed instance has no shell. This is the operate-only deactivate the brief's rollback needs.
2. **n8n export/import workflows** (`2026-06-29-n8n-export-import-workflows-docs.md`) -- defines the export-before-deploy snapshot AND corrects the credential myth (export carries credential names/ids, not secret values). Load-bearing for the rollback known-good and for a security pre-flight note.
3. **n8n webhook test-vs-production URL** (`2026-06-29-n8n-webhook-test-vs-production-url.md`) -- the test-URL-vs-production-URL distinction + "production payloads don't show in the editor, check Executions" is the core of the verification loop and a real live-event trap. The 120s test-listener auto-close is a footgun to encode.
4. **n8n MCP execution-monitoring tools** (`2026-06-29-n8n-mcp-execution-monitoring-tools.md`) -- the exact `search_executions` (status enum incl. crashed/error/waiting) and `get_execution` (includeData/nodeNames/truncateData) schemas make the verification loop fully scriptable and headless, and mark the SDK/mutation tools as out-of-scope for this operate-only Guardian.
5. **SRE School operational-runbook structure** (`2026-06-29-sreschool-operational-runbook-structure.md`) -- the form template: exact commands + expected output + wait condition per step, the Trigger/Scope/Pre-checks/Mitigation/Escalation/Exit skeleton, and "exit criteria name a time window." This is how weapon-forge should shape the runbook.

## Open questions that survived the research (for the USER to resolve, not weapon-forge to invent)
1. **n8n instance type and version.** Is Cuantico's live n8n self-hosted (CLI + shell available) or managed/cloud (REST/MCP only), and is it pre- or post-2.0? This decides whether the runbook leads with CLI `export:workflow`/`import:workflow` or with the REST API + UI. The research provides BOTH paths; the user should confirm which is primary so weapon-forge can order them correctly. (Best default given the evidence: lead with REST API + MCP + UI, treat CLI as the self-hosted-only alternative.)
2. **Where the export snapshot is stored.** The brief says "instance-agnostic, does not rely on paid n8n history" -- but it does not say WHERE the export JSON lives (local file, the cuantico repo/git, a secure bucket). HatchWorks recommends git; the user should confirm the snapshot destination, and weapon-forge should add the "no hardcoded secrets before committing the snapshot" pre-flight check regardless.
3. **Controlled-test cleanup policy.** Firing a controlled test against the production intake creates a real (test) record/tag/notification. What is the cleanup expectation for that test artifact during a live client event (delete it, tag it test-only, leave it)? Needs an operator decision so the verification guide can specify cleanup.
4. **Watch-window length.** SRE + HatchWorks say "name a time window" / "don't walk away" but the concrete dwell time for a Cuantico live event (first N executions? first M minutes?) is an operator call. weapon-forge needs a number to put in the exit criteria.

## Sources weapon-forge should re-fetch with deeper context (optional, only if needed)
- The full n8n public API reference (`https://docs.n8n.io/api/`) for the exact request/response shape of `GET /executions` and `GET /workflows/{id}` if the runbook ends up scripting against REST instead of the MCP server.
- `get_sdk_reference` (n8n MCP) is the BUILD surface -- weapon-forge should NOT need it for this operate-only weapon, but it is available if a boundary example is wanted to show what this Guardian does NOT do.

## Notes for weapon-forge boundaries (reinforced by the research)
- This is an OPERATE-and-verify weapon. Every source that touches editing (Debug-in-editor, get_sdk_reference, workflow-mutation MCP tools) is annotated as a HAND-OFF to n8n-workflow-guardian, not an in-scope action. Keep that boundary crisp in SKILL.md.
- Internal Cuantico prior art (Live Event Deployment + Intake workflows, the existing Slack error-handler pattern, dev client bill_rookstool, slot field keys, dormant-email safeguard, form-placeholder mis-route gotcha) is authoritative and was NOT re-derived from the web -- weapon-forge should pull it from the operator's encoded knowledge / memory, and the web sources here are the external scaffolding around it.
