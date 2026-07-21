# Rollback runbook

**Execution status:** NOT EXECUTED

Declare the incident correlation ID, affected environment, last known good immutable artifact, database compatibility result, named operator, and approver. Stop if the old application cannot safely read the current schema or if the target artifact is not independently verified.

Create a dry-run evidence skeleton:

```powershell
node tooling/scripts/release/create-operation-evidence.mjs --operation rollback --environment staging --correlation-id corr_rollback_check_001
```

Capture the failed and target versions, trigger time, reason, approval, provider event IDs, database decision, readiness result, customer impact, and reconciliation outcome. No provider rollback command is included because no provider target or authorization is configured here. This command does not mutate cloud state or prove rollback recovery.
