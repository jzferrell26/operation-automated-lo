---
source_url: https://vercel.com/docs/cli/env
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: env
weapon: release-deploy-weapon
---

# Vercel CLI: `vercel env` command (official docs, last_updated 2026-04-24)

## Summary
The authoritative reference for wiring Vercel env/secrets from the CLI, which is exactly the Guardian's mechanic for setting NEXT_PUBLIC vs server-only vars per environment. Confirms the env-via-stdin pattern (set a secret value without exposing it on the command line / in shell history) and documents a major 2026 change: `vercel env add` now defaults new production and preview variables to the `sensitive` type, which cannot be read back in the dashboard or via `vercel env ls`.

## Key quotations / statistics
- Add a var per environment: `vercel env add [name] [environment]` where environment is `production`, `preview`, or `development`. With no environment it adds to all.
- Env-via-stdin (the secret-safe pattern): `vercel env add [name] [environment] < [file]` uses a local file's content as the value. Also `echo [value] | vercel env add [name] [environment]` but the docs warn: "this will save the value in bash history, so this is not recommend for secrets." (Prefer the `< file` form or `printf` piping for secrets.)
- Update from stdin: `cat ~/.npmrc | vercel env update NPM_RC preview`.
- Pull for local dev: `vercel env pull [file]` exports vars to a local `.env` file; `vercel env pull --environment=preview` pulls preview vars. "After updating environment variables on Vercel ... you will have to run `vercel env pull <file>` again to get the updated values."
- Run a command with cloud env without writing to disk: `vercel env run -e production -- next build`.
- 2026 SENSITIVE DEFAULT: "When you add an Environment Variable with `vercel env add`, Vercel defaults to `sensitive` for production, preview, and custom environments. Sensitive values are stored securely by Vercel and cannot be viewed later in the dashboard or with `vercel env ls`. Sensitive values are still available to builds run within the Vercel build container and at runtime."
- Development targets are `encrypted`, not sensitive ("the Vercel API does not allow sensitive Environment Variables in development").
- "If you select development with production or preview in the same command, `vercel env add` returns an error. Add development variables in a separate command."
- `--force` overwrites an existing var of the same target without prompting. `--no-sensitive` opts a prod/preview var out of sensitive (team policy may block this).

## Annotations for weapon-forge
- This is the command reference for the env-wiring guide and the DEPLOY.md env-matrix section. Pair the `< file` stdin form with the Cuantico prior-art note (`printf '%s' "$VAL" | vercel env add NAME production`, value via stdin not flag).
- Flag the 2026 sensitive-by-default behavior as a gotcha: after `vercel env add`, you cannot read the value back; if the operator needs to verify a secret was set correctly, they must check at runtime, not via `vercel env ls`. This changes the verification step.
- The dev-cannot-be-combined-with-prod/preview rule is a real CLI error operators will hit; note it in the runbook.
- Note the distinction: `vercel env pull` (for local dev tooling) vs `vercel pull` (writes `.vercel/project.json` incl. rootDirectory, used by `vercel build`/`vercel dev`). The Cuantico note uses `vercel pull --yes` to read monorepo rootDirectory.
