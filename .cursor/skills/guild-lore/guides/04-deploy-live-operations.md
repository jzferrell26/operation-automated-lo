# Pillar 4: Deploy & Live Operations

## CRITICAL DIRECTIVES

Before acting in this domain you MUST load these skills via the Skill tool:

- `devops-weapon`: owns Docker/Compose/GitHub Actions/Depot pipeline design for Node/Next.js/TypeScript stacks; the container-and-CI authority this pillar is built around.
- `release-deploy-weapon`: owns the live cloud cutover for Next.js + Supabase + Vercel apps: env/secret wiring (the NEXT_PUBLIC client vs server-only line), migration and Edge Function pushes, smoke verification, the 404-after-Ready debug technique, and the DEPLOY.md runbook.
- `live-latency-weapon`: owns wall-clock perceived-performance diagnosis of DEPLOYED apps: TTFB and header forensics, compute-vs-database region-mismatch detection, request fan-out capture, and a ranked fix menu re-verified against live headers after deploy.
- `terminal-bash-weapon`: owns the shell layer underneath every deploy operation: Bash/Zsh scripting, dotfiles, modern CLI tooling, tmux/Zellij.
- `status-page-weapon`: owns public status-page platform selection and incident communication templates for when live operations go wrong publicly.
- `runbook-writing-weapon`: owns operational runbook authorship: exact-command discipline, escalation paths, rollback procedures, game-day testing.
- `changelog-release-notes-weapon`: owns writing the public-facing record of what just shipped, immediately downstream of a deploy.
- `cursor-ide-weapon`: owns the IDE platform surface (rules, MCP registration, Cloud Agents) that operators use to drive deploy work.
- `ai-coding-tools-weapon`: owns choosing and configuring the AI coding tool itself (Cursor vs Claude Code vs Aider vs Devin) for the operator's workflow.

---

## What this pillar collectively knows

This pillar covers what happens after code is correct and secure (Pillar 3's job) but before and during it running live: the pipeline that builds it (`devops-weapon`), the cutover that ships it (`release-deploy-weapon`), the diagnosis of how it actually feels once live (`live-latency-weapon`), the terminal and tooling operators use to drive that work, the documentation that survives an incident, and the communication layer when something breaks in production. The pipeline/cutover split matters: `devops-weapon` designs the CI/CD topology, while `release-deploy-weapon` performs and verifies the live deploy itself.

### Disambiguation table

| Situation | Weapon that owns it | Not this one |
|---|---|---|
| Dockerfile hygiene, GitHub Actions architecture, Depot acceleration | `devops-weapon` | `github-repo-health-weapon` (see Pillar 3, repo settings not pipeline design) |
| Deploying to Vercel, pushing Supabase migrations to cloud, the deploy is Ready but 404s | `release-deploy-weapon` | `devops-weapon` (pipeline design, not the live cutover) or `supabase-platform-weapon` (Pillar 2, function internals not the cutover) |
| The live site feels slow despite good Lighthouse scores, region mismatch, blocking vs streaming | `live-latency-weapon` | `lighthouse-pagespeed-weapon` (Pillar 1, lab scores and CI budgets, not live wall-clock diagnosis) |
| Shell scripting quality, dotfile architecture, modern CLI tool choice | `terminal-bash-weapon` | `devops-weapon` (pipeline-level, not interactive terminal use) |
| Public incident communication, subscriber notifications, maintenance windows | `status-page-weapon` | `runbook-writing-weapon` (internal procedure, not public comms) |
| Writing the exact-command procedure for an on-call alert | `runbook-writing-weapon` | `status-page-weapon` (external audience) |
| Writing what shipped for users to read | `changelog-release-notes-weapon` | `status-page-weapon` (incident-specific, not routine release) |
| Cursor project rules, MCP server registration, Cloud Agents | `cursor-ide-weapon` | `ai-coding-tools-weapon` (tool selection, not configuring the chosen tool) |
| Choosing between Cursor, Claude Code, Aider, Devin | `ai-coding-tools-weapon` | `cursor-ide-weapon` (assumes Cursor already chosen) |

### Canonical multi-weapon sequences

1. **Build-and-ship:** `devops-weapon` designs the Dockerfile and CI pipeline → `release-deploy-weapon` performs the cutover (env wiring, migration push, smoke verification against a real route that exercises app + DB) → `runbook-writing-weapon`'s rollback procedure is the fallback if verification fails → `changelog-release-notes-weapon` writes the public record once verification passes.
2. **Incident response:** an alert fires → `runbook-writing-weapon`'s pre-written procedure is followed exactly (no implied context, exact commands) → if the incident is customer-visible, `status-page-weapon`'s communication templates go out in parallel → after resolution, the postmortem feeds back into `runbook-writing-weapon` to update the procedure (postmortem-to-runbook linkage).
3. **Post-deploy performance loop:** `release-deploy-weapon` verifies the deploy is functionally live → if the app then "feels slow" despite passing lab scores, `live-latency-weapon` runs its fixed live-only diagnostic sequence and produces the ranked effort/impact fix menu → fixes route to the owning domain weapon (DB tuning to Pillar 2's `db-weapon`, lab-score work to Pillar 1's `lighthouse-pagespeed-weapon`, CDN/CI topology back to `devops-weapon`) → `live-latency-weapon` re-verifies against live headers after the fix deploys.
4. **Operator tooling setup:** `ai-coding-tools-weapon` decides which AI coding tool fits the team's autonomy/budget/language needs → `cursor-ide-weapon` configures it in depth if Cursor was chosen → `terminal-bash-weapon` rounds out the surrounding shell environment.

### Load-bearing hard rules and gotchas

- **Runbooks follow the no-implied-context rule**: a runbook must work for someone with zero prior context on the incident, per `runbook-writing-weapon`. A step that assumes the reader "just knows" the right database or environment is a defect in the runbook, not an acceptable shortcut.
- **Runbook-as-test (game day) is the verification method** — a runbook that has never been executed end to end against a real (or simulated) incident is unverified, not merely untested.
- **Changelog copy is impact-first and honest about scope**, including what did NOT ship, per `changelog-release-notes-weapon` — omitting known gaps to make a release look more complete is treated as a craft failure, not a marketing choice.
- **`devops-weapon`'s CI security posture includes least-privilege `GITHUB_TOKEN` and pinning actions to SHA**, not just tag, to prevent supply-chain compromise via a mutable Action tag.
- **Never skip a HEALTHCHECK in a production Dockerfile** per `devops-weapon` — an unhealthy container that still reports "running" is a common source of silent outages.
- **"Ready" is not "working"** per `release-deploy-weapon` — a Vercel deploy that reports Ready must still be smoke-verified against a real route that exercises the app and the database. A 404 after Ready is debugged by following the redirect chain (a 307/302 means middleware, not a config 404).
- **`live-latency-weapon` diagnoses only against the LIVE deployment**, never lab scores — a good Lighthouse score is explicitly not evidence against a wall-clock latency complaint, and every fix it recommends is re-verified against live headers and requests after deploy.
- **`release-deploy-weapon` mutates production state and is on-demand only** — invoke it explicitly or via a peer hand-off, never as a silent default step.

---

## Cross-references to sibling pillars

- What gets deployed (schema, API, edge functions) is designed in **Pillar 2: Backend, Data & APIs**; this pillar only ships it. `release-deploy-weapon` pushes migrations that `db-weapon` authored and functions whose internals `supabase-platform-weapon` owns.
- Lab-score performance work (Lighthouse CI, budgets) that `live-latency-weapon` explicitly routes away is **Pillar 1: Frontend & Design Systems** (`lighthouse-pagespeed-weapon`); live DB query tuning it surfaces routes to **Pillar 2** (`db-weapon`).
- Security posture of the pipeline itself (secret leakage in CI, OIDC federation correctness) is verified via **Pillar 3: Security, Quality & Code Review**.
- Live-event-specific deploy runbooks for Cuantico's GHL/n8n stack are a distinct, more specific operating surface documented in **Pillar 8: Cuantico Operator**; use this pillar's `runbook-writing-weapon` for the general template craft, but route actual Cuantico live-event execution to Pillar 8.
- The factory pipeline that builds new Guardians/Weapons has its own orchestration discipline in **Pillar 10: Factory & Orchestration** and does not route through this pillar's deploy mechanics.
