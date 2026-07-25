# contact-enrichment-weapon

The Weapon wielded by `contact-enrichment-guardian` to design, clone, and audit n8n contact-enrichment workflows for the Cuantico stack (the Carolyn / Grant / Cuantico clones). It encodes the full enrichment backbone: a batched SplitInBatches loop with a rate-limit throttle, a waterfall provider-fallback that stops on the first confident hit and tags each field with its source, a Normalize/Merge reconciliation step, a typed GoHighLevel custom-field write-back (the DATE no-`Z` gotcha and the SINGLE_OPTIONS exact-value rule), and re-run idempotency so a re-enrichment never overwrites good data with an empty result. It owns the enrichment PATTERN and routes raw GHL fieldKey resolution to gohighlevel-guardian and n8n node/SDK mechanics to n8n-workflow-guardian.

Sources: built from the Command Brief at `ai-tools/command-briefs/contact-enrichment-guardian-command-brief.md` and the research synthesized in `research/research-summary.md`.

## Layout

- `SKILL.md` - the navigation layer and procedure the Guardian reads first.
- `guides/` - one numbered guide per pipeline stage (principles, batched loop, throttle, waterfall, normalize/merge, typed write-back, idempotency, credential rebind).
- `examples/` - a worked clone (happy path) and a worked silent-blank-DATE audit (edge case).
- `templates/` - the enrichment design spec and the audit report.
- `reports/` - accumulates audit / design reports from past runs.
- `research/` - the loremaster audit trail (read-only; do not modify).
