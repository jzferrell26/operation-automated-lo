# Neeson skill routing for Automated LO

Automated LO keeps a local Guild skill snapshot under `.cursor/skills`, but Jonathan's canonical personal skill library is the sibling `the-neeson` repository when present.

Use `../the-neeson/skills/<skill>/SKILL.md` first. Fall back to `.cursor/skills/<skill>/SKILL.md` when the sibling repository is unavailable.

## Default engineering stack

| Work | Primary skill | Closeout / companion skills |
| --- | --- | --- |
| TypeScript / Node implementation | `typescript-node-weapon` | `security-weapon`, `quality-weapon`, `code-review-pr-weapon` |
| React / Next.js product UI | `react-weapon` | `ux-ui-weapon`, `security-weapon`, `quality-weapon` |
| Postgres schema / migrations | `db-weapon` | `security-weapon`, `quality-weapon` |
| Supabase deploy / RLS wiring | `supabase-platform-weapon` | `db-weapon`, `security-weapon`, `quality-weapon` |
| Authentication / RBAC | `auth-weapon` | `db-weapon`, `security-weapon`, `quality-weapon` |
| Dependency changes / CVEs | `dependency-audit-weapon` | `security-weapon`, `quality-weapon` |
| CI / GitHub Actions / containers | `devops-weapon` | `security-weapon`, `quality-weapon` |
| Vercel / production cutover | `release-deploy-weapon` + `vercel-weapon` | `security-weapon`, smoke verification |
| Bug diagnosis | `bug-diagnosis-weapon` | owning implementation skill, then `quality-weapon` |
| Architectural simplification | `deep-modules-weapon` | owning implementation skill, then `quality-weapon` |
| Durable jobs / long-running workflows | `durable-workflows-weapon` | `typescript-node-weapon`, `security-weapon` |
| Observability / error tracking | `sentry-weapon` | `security-weapon`, `quality-weapon` |
| Data fetching / server state | `tanstack-weapon` | `react-weapon`, `quality-weapon` |
| Styling / utility CSS | `tailwind-weapon` | `ux-ui-weapon`, `react-weapon` |
| PR lifecycle | `code-review-pr-weapon` | use after security and quality closeout |
| Repository hygiene | `github-repo-health-weapon` | audit-only; hand CI depth to `devops-weapon` |

## Required ordering for completion work

1. Route to the narrowest implementation skill.
2. Implement and run the repo's deterministic tests/checks.
3. Run `security-weapon` before final QA.
4. Run `quality-weapon` against the source plan or acceptance criteria.
5. Use `code-review-pr-weapon` for the PR description and reviewer focus.
6. If dependencies changed, include `dependency-audit-weapon` before merge.
7. If deployment changes, include `devops-weapon` and/or `release-deploy-weapon`, then smoke-verify the real route.

## Scope discipline

Do not load every skill for every task. Progressive disclosure is the rule: read the owning `SKILL.md`, then only the guide/template files required for the current work. Neeson remains the canonical source; Automated LO should not fork or casually edit Neeson skills during product implementation.
