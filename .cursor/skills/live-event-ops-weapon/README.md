# live-event-ops-weapon

The operate-and-verify runbook that lets `live-event-ops-guardian` take a Cuantico Live Event automation live on n8n end to end: a pre-flight go/no-go gate, an exact-command deploy sequence, a post-deploy verification loop against real execution data, and a deactivate-and-restore rollback path. It encodes the operate-only boundary so the Guardian runs the LIVE workflow but never edits structure (that hands off to `n8n-workflow-guardian`) or GHL field semantics (that hands off to `gohighlevel-guardian`). It was forged from the Command Brief at `ai-tools/command-briefs/live-event-ops-guardian-command-brief.md` and the source sweep summarized in `research/research-summary.md`.

See `SKILL.md` for the entry point and `guides/` for the per-phase runbook procedures.

Paired Guardian: [`ai-tools/agents/live-event-ops-guardian.md`](../../agents/live-event-ops-guardian.md).
