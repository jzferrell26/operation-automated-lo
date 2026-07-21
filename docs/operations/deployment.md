# Deployment runbook

**Execution status:** NOT EXECUTED

Use this runbook only after a named release owner approves an exact environment, commit, build ID, manifest, maintenance window, and rollback owner. Stop if any value is missing, if production traffic is enabled, or if the manifest and runtime identity differ.

Create a dry-run evidence skeleton:

```powershell
node tooling/scripts/release/create-operation-evidence.mjs --operation deployment --environment staging --correlation-id corr_deployment_check_001
```

Validate a prepared manifest read-only:

```powershell
node tooling/scripts/release/validate-release-manifest.mjs --manifest artifacts/release-manifest.json --expected-environment staging --expected-commit 0000000000000000000000000000000000000000 --expected-build-id build-approved-001
```

Required evidence includes the immutable artifact digest, commit, build ID, environment identity, approval, canonical verification, security review, quality review, deployment observation, readiness response, and rollback checkpoint. No provider deployment command is included because no provider target or authorization is configured here. These commands do not mutate cloud state or prove a deployment passed.
