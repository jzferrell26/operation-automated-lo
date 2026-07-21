# Data export runbook

**Execution status:** NOT EXECUTED

Require an authenticated request, authorization proof, export scope, legal basis, tenant boundary, named operator, approver, expiration, and secure delivery destination. Stop if identity, scope, residency, or tenant ownership cannot be proven.

Create a dry-run evidence skeleton:

```powershell
node tooling/scripts/release/create-operation-evidence.mjs --operation export --environment staging --correlation-id corr_export_check_001
```

Record only non-sensitive metadata: request ID, scope, record counts, checksums, timestamps, encryption state, expiration, delivery confirmation, and deletion confirmation. Do not store exported customer content in operational evidence. No export command is included because an authorized subject and data target are absent. This command does not access or export data.
