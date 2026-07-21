# Database restore evidence runbook

**Execution status:** NOT EXECUTED

Restores require a named database owner, approver, exact isolated target, backup identifier, restore point, encryption confirmation, maintenance window, and written proof that the target is not production unless production restoration is explicitly authorized. Stop if the backup, target, or recovery objective is ambiguous.

Create a dry-run evidence skeleton:

```powershell
node tooling/scripts/release/create-operation-evidence.mjs --operation database-restore --environment staging --correlation-id corr_restore_check_001
```

Record backup metadata, target identity, start and completion times, provider operation ID, schema version, integrity checks, row-count or checksum comparisons, access test, application readiness, and cleanup decision. Keep customer data out of evidence. No restore command is included because provider credentials and a target are intentionally absent. This command does not restore data or prove recoverability.
