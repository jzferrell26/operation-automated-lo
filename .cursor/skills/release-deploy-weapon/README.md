# release-deploy-weapon

The Weapon that equips `release-deploy-guardian` to take a Next.js + Supabase + Vercel app from sandbox to a verified live deployment: wiring Vercel env/secrets across the NEXT_PUBLIC vs server-only line, pushing Supabase migrations and Edge Functions to the cloud project, triggering and smoke-verifying the deploy, debugging the failures a green build hides, and running a staged, reversible sandbox-to-live cutover behind a DEPLOY.md runbook. It owns the cloud cutover only: it consumes the CI pipeline (devops-guardian), the Supabase platform code (supabase-platform-guardian), and the app feature code (the language Guardians) without re-owning them. It was forged from the Command Brief at `ai-tools/command-briefs/release-deploy-guardian-command-brief.md` and the research summarized in `research/research-summary.md`.

## Layout

- `SKILL.md` - the entry point and navigation layer the Guardian reads.
- `guides/` - one focused procedure per ACTION verb (env wiring, Supabase push, deploy + verify, debug, cutover, DEPLOY.md, host decision).
- `examples/` - one happy-path cutover and one debug (redirect-404) walkthrough.
- `templates/` - DEPLOY.md runbook, env-matrix, deploy-verification report, and a smoke-check script template.
- `reports/` - where deploy-verification reports accumulate over time.
- `research/` - the loremaster audit trail (read-only; do not modify).
