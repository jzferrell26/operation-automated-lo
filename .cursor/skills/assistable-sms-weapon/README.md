# assistable-sms-weapon

The Weapon for **assistable-sms-guardian**, Cuantico's SMS-AI-agent specialist. It encodes the Assistable inbound webhook payload contract, the tool-call wiring loop, the routing boundaries to peer Guardians, and the incremental migration path to the GHL-native cuantico-sms engine (Next.js + Inngest + Supabase). The skill keeps the live SMS agent answering correctly today while steering the move off the third-party Assistable dependency without breaking the live flow.

Built from `ai-tools/command-briefs/assistable-sms-guardian-command-brief.md` and the loremaster research folder summarized in `research/research-summary.md`. The two authoritative pillars are Cuantico-internal: the Assistable payload contract (`research/cuantico-internal/`) corroborated by the live `assistableai` MCP tool schemas (`research/assistableai-mcp-schemas.md`), plus the external authorities for the locked stack (GHL Conversations API, Inngest durability, Supabase pooling).

## Layout

- `SKILL.md` - the entry point; five core actions, directives, and pointers.
- `guides/` - one focused procedure per action (parse, validate, wire, route, migrate) plus principles and the GHL/refetch guide.
- `examples/` - a worked tool-wiring run (happy path) and a webhook-parse failure (edge case).
- `templates/` - tool-handler spec, webhook-contract note, migration-step note.
- `reports/` - run-report template and the archive of past runs.
- `research/` - loremaster's audit trail (read-only).
