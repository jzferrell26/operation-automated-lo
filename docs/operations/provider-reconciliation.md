# Provider reconciliation runbook

**Execution status:** NOT EXECUTED

Use reconciliation after a partial failure, retry, timeout, rollback, or suspected state mismatch. Require a named operator, provider account and environment, bounded time window, internal correlation ID, idempotency keys, and approval before any corrective write.

Create a dry-run evidence skeleton:

```powershell
node tooling/scripts/release/create-operation-evidence.mjs --operation provider-reconciliation --environment staging --correlation-id corr_reconcile_check_001
```

Perform authorized read-only comparisons first. Record internal state, provider state, timestamps, immutable identifiers, discrepancies, and the proposed correction. Stop on ambiguous ownership, duplicate side effects, missing idempotency evidence, or any production write without separate approval. No provider command is included because provider-specific identity and authorization are not configured. This command does not reconcile state or prove consistency.
