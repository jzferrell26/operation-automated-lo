# Deployment runbook

**Execution status:** NOT EXECUTED

Use this runbook only after a named release owner approves an exact environment, commit, build ID, manifest, maintenance window, and rollback owner. Stop if any value is missing, if production traffic is enabled, or if the manifest and runtime identity differ.

The registered PDF and Meta workers require an explicit runtime bootstrap that installs a
database-backed delivery guard plus production render and provider ports. They deliberately
abort when those bindings are absent and never fall back to the in-memory fixture ports.

Create a dry-run evidence skeleton:

```powershell
node tooling/scripts/release/create-operation-evidence.mjs --operation deployment --environment staging --correlation-id corr_deployment_check_001
```

Validate synthetic prior and candidate runtime manifests before a prepared release manifest. This is
deterministic compatibility evidence only. It exercises declared web/task contract read
compatibility alongside expand or contract migration support. It does not run a migration or
prove a deployed environment used either runtime version:

```powershell
node tooling/scripts/release/validate-migration-compatibility.mjs --prior-web-manifest artifacts/prior-web-runtime.json --prior-tasks-manifest artifacts/prior-tasks-runtime.json --candidate-web-manifest artifacts/candidate-web-runtime.json --candidate-tasks-manifest artifacts/candidate-tasks-runtime.json | Set-Content artifacts/migration-compatibility.json
```

Validate a prepared manifest read-only, bound to that compatibility evidence:

```powershell
node tooling/scripts/release/validate-release-manifest.mjs --manifest artifacts/release-manifest.json --expected-environment staging --expected-commit 0000000000000000000000000000000000000000 --expected-build-id build-approved-001 --migration-compatibility artifacts/migration-compatibility.json
```

Required evidence includes the immutable artifact digest, commit, build ID, environment identity, approval, canonical verification, security review, quality review, deployment observation, readiness response, and rollback checkpoint. No provider deployment command is included because no provider target or authorization is configured here. These commands do not mutate cloud state or prove a deployment passed.

## Database runtime role

Application transactions activate `app_runtime` / `support_runtime` via `SET LOCAL ROLE` before setting tenant context. See [`database-runtime-role.md`](./database-runtime-role.md). Confirm the pooled login grant path before any production cutover that depends on RLS.
